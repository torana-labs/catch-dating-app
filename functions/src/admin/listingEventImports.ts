/* eslint-disable max-len */
import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from "firebase-functions/v2/https";
import {appCheckCallableOptions} from "../shared/callableOptions";
import type {AdminListListingEventImportsCallablePayload} from "../shared/generated/adminListListingEventImportsCallablePayload";
import type {AdminListListingEventImportsCallableResponse} from "../shared/generated/adminListListingEventImportsCallableResponse";
import type {AdminPublishListingEventsCallablePayload} from "../shared/generated/adminPublishListingEventsCallablePayload";
import type {AdminPublishListingEventsCallableResponse} from "../shared/generated/adminPublishListingEventsCallableResponse";
import {validateAdminListListingEventImportsCallablePayload} from "../shared/generated/validators/adminListListingEventImportsInput";
import {validateAdminPublishListingEventsCallablePayload} from "../shared/generated/validators/adminPublishListingEventsInput";
import {validateCallableWithAjv} from "../shared/validation";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {supplyIntakeCollections} from "../operations/supplyIntake/worker";
import {
  approvedOrganizer,
  defaultListingEventPublicationDeps,
  listingEventFromWorkItem,
  packagedEventPublication,
  publishListingEvents,
  type ListingEventPublicationDeps,
  type ListingEventReview,
} from "../operations/supplyIntake/eventPublication";
import {requireAdminRole} from "./adminAuth";

// Reviewing and publishing imported events share the external-event roles.
const listingEventRoles = ["admin", "adminOwner", "support"] as const;

type ListResponse = AdminListListingEventImportsCallableResponse;
type ListRow = ListResponse["rows"][number];
type EventRow = ListRow["events"][number];

interface ListingEventImportDeps extends ListingEventPublicationDeps {
  checkRateLimit?: typeof defaultCheckRateLimit;
}

const defaultDeps: ListingEventImportDeps = {
  ...defaultListingEventPublicationDeps,
  checkRateLimit: defaultCheckRateLimit,
};

/**
 * One page of approved listings, most recently approved first, each with the
 * events Supply Intake imported and where each stands: published by the
 * policy or staff, withdrawn, ready for staff, needing a resolution or
 * waiver, or blocked. A listing whose organizer is gone is counted, not shown.
 */
export async function adminListListingEventImportsHandler(
  request: CallableRequest<unknown>,
  deps: ListingEventImportDeps = defaultDeps
): Promise<ListResponse> {
  const adminContext = requireAdminRole(request, listingEventRoles);
  const data = validateCallableWithAjv<AdminListListingEventImportsCallablePayload>(request,
    validateAdminListListingEventImportsCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit?.(
    db,
    adminContext.uid,
    "adminListListingEventImports",
    {maxRequests: 60, windowMs: 60 * 1000}
  );
  const runtime = await packagedEventPublication();
  const policy = await runtime.loadEventPublicationPolicy();
  const requests = db.collection(supplyIntakeCollections.requests);
  // Only approved requests carry approval.approvedAt (an ISO string, so it sorts by time).
  /* firestore-index: supplyIntakeRequests (
    approval.approvedAt:DESCENDING, __name__:DESCENDING
  ) */
  let query = requests.orderBy("approval.approvedAt", "desc")
    .orderBy(admin.firestore.FieldPath.documentId(), "desc")
    .limit(data.limit + 1);
  if (data.cursor) {
    const cursor = decodeCursor(data.cursor);
    query = query.startAfter(cursor.approvedAt, cursor.requestId);
  }
  const snapshot = await query.get();
  const page = snapshot.docs.slice(0, data.limit);
  const now = deps.now().toISOString();
  const rows: ListRow[] = [];
  let unavailableCount = 0;
  for (const doc of page) {
    const row = await importRow(db, runtime, doc.id, doc.data(), adminContext.uid, now);
    if (row) rows.push(row);
    else unavailableCount += 1;
  }
  const last = page.at(-1);
  return {
    policy: {mode: policy.mode, policyVersion: policy.policyVersion},
    rows,
    nextCursor: snapshot.docs.length > data.limit && last ?
      encodeCursor({approvedAt: String(last.data().approval?.approvedAt), requestId: last.id}) : null,
    unavailableCount,
  };
}

async function importRow(
  db: FirebaseFirestore.Firestore,
  runtime: Awaited<ReturnType<typeof packagedEventPublication>>,
  intakeRequestId: string,
  stored: FirebaseFirestore.DocumentData,
  reviewerUid: string,
  now: string
): Promise<ListRow | null> {
  const approval = recordValue(stored.approval);
  const result = recordValue(stored.result);
  const organizerId = typeof approval?.organizerId === "string" ? approval.organizerId : null;
  if (!organizerId || typeof result?.listingId !== "string" || typeof approval?.approvedAt !== "string") return null;
  const listingId = result.listingId;
  const organizerSnap = await db.collection("organizers").doc(organizerId).get();
  if (!organizerSnap.exists) return null;
  const organizer = organizerSnap.data() ?? {};
  const owner = approvedOrganizer(organizerId, organizer);
  const page = recordValue(organizer.publicPage);
  const eventWorkItemIds = (Array.isArray(result.eventWorkItemIds) ? result.eventWorkItemIds : [])
    .filter((id): id is string => typeof id === "string").slice(0, 60);
  const workItems = await Promise.all(eventWorkItemIds.map((id) => db.collection("operationWorkItems").doc(id).get()));
  // What a staff member who ticks the checklist would get: the remaining
  // blockers are the ones they must resolve, waive, or cannot clear.
  const staffReview: ListingEventReview = {reviewerUid, decidedAt: now, note: null, ownerSafeCopyReviewed: true,
    importPolicyAcknowledged: true, blockerResolutions: []};
  const capabilities = recordValue(organizer.supplyCapabilities);
  const planned = workItems.flatMap((snap) => {
    let event;
    try {
      event = listingEventFromWorkItem(snap.data(), snap.id, listingId);
    } catch {
      return [];
    }
    const plan = runtime.planListingEventImport({event, workItemId: snap.id, citySlug: owner.citySlug, now,
      review: staffReview, duplicates: [], organizer: {organizerId, claimable: capabilities?.claimable !== false,
        appVisibility: organizer.appVisibility === "discoverable" ? "discoverable" : "hidden"}});
    const automated = runtime.automatedEventReview({event, organizer: owner.attribution,
      policy: {mode: runtime.AUTO_PUBLISH_MODE}, now});
    return [{event, plan, findings: automated.findings}];
  });
  const published = await Promise.all(planned.map(({plan}) => db.collection("externalEvents").doc(plan.eventId).get()));
  const events: EventRow[] = planned.map(({event, plan, findings}, index) => {
    const live = published[index];
    const blockers = [...new Set([...owner.blockers, ...plan.blockers])].sort();
    const resolvable = blockers.filter((code) => runtime.GOVERNED_BLOCKERS.includes(code));
    const hard = blockers.filter((code) => !runtime.GOVERNED_BLOCKERS.includes(code));
    let state: EventRow["state"] = hard.length > 0 ? "blocked" : resolvable.length > 0 ? "needs_resolution" : "ready";
    let publishedBy: EventRow["publishedBy"] = null;
    const liveData = live?.exists ? live.data() ?? {} : null;
    if (liveData) {
      state = liveData.publicationStatus === "public" ? "published" : "withdrawn";
      publishedBy = recordValue(liveData.review)?.reviewer === runtime.AUTO_PUBLISH_ACTOR ? "policy" : "staff";
    }
    return {
      eventWorkItemId: plan.workItemId,
      eventId: plan.eventId,
      title: event.title,
      startAt: event.startAt,
      endAt: event.endAt,
      venue: event.venue,
      address: event.address,
      platform: event.platform,
      sourceUrl: event.sourceUrl,
      priceLabel: plan.document?.price.displayText ?? null,
      state,
      publishedBy,
      blockers: live?.exists ? [] : blockers.slice(0, 20),
      resolvableBlockers: live?.exists ? [] : resolvable as EventRow["resolvableBlockers"],
      automatedFindings: live?.exists ? [] : findings.slice(0, 20)
        .map((finding) => ({...finding, match: finding.match.slice(0, 500)})),
    };
  }).sort((left, right) => left.startAt.localeCompare(right.startAt));
  return {
    intakeRequestId,
    listingId,
    approvedAt: approval.approvedAt,
    organizer: {organizerId, name: typeof organizer.name === "string" ? organizer.name.slice(0, 240) : null,
      canonicalPath: typeof page?.canonicalPath === "string" ? page.canonicalPath : null,
      appVisibility: organizer.appVisibility === "discoverable" ? "discoverable" : "hidden",
      pagePublished: !owner.blockers.includes("organizer_page_unpublished")},
    events,
  };
}

export const adminListListingEventImports = onCall(appCheckCallableOptions,
  (request) => adminListListingEventImportsHandler(request));

/**
 * A staff member publishes (or dry-runs) chosen events of one approved
 * listing. Every checklist gate must be confirmed; resolutions name the event
 * they belong to. Each event is planned and written on its own, so the
 * response reports blocked events beside published ones.
 */
export async function adminPublishListingEventsHandler(
  request: CallableRequest<unknown>,
  deps: ListingEventImportDeps = defaultDeps
): Promise<AdminPublishListingEventsCallableResponse> {
  const adminContext = requireAdminRole(request, listingEventRoles);
  const data = validateCallableWithAjv<AdminPublishListingEventsCallablePayload>(request,
    validateAdminPublishListingEventsCallablePayload, normalizePublishPayload);
  const {checklist} = data;
  if (!checklist.outboundLinksReviewed || !checklist.noCatchBookingPaymentsWaitlist ||
      !checklist.ownerSafeCopyReviewed) {
    throw new HttpsError("failed-precondition",
      "Confirm the outbound links, that Catch takes no booking, payment or waitlist, and the copy before publishing.");
  }
  const chosen = new Set(data.eventWorkItemIds);
  const resolutions = new Map<string, ListingEventReview["blockerResolutions"]>();
  for (const {eventWorkItemId, ...resolution} of data.blockerResolutions) {
    if (!chosen.has(eventWorkItemId)) {
      throw new HttpsError("invalid-argument", `A resolution names ${eventWorkItemId}, which is not being published.`);
    }
    resolutions.set(eventWorkItemId, [...resolutions.get(eventWorkItemId) ?? [], resolution]);
  }
  const db = deps.firestore();
  await deps.checkRateLimit?.(
    db,
    adminContext.uid,
    "adminPublishListingEvents",
    {maxRequests: 10, windowMs: 60 * 1000}
  );
  const {organizerId, results} = await publishListingEvents({
    intakeRequestId: data.intakeRequestId,
    eventWorkItemIds: data.eventWorkItemIds,
    actor: {kind: "staff", adminContext, checklist, note: data.reviewNote, blockerResolutions: resolutions, request},
    executionMode: data.executionMode,
    idempotencyKey: data.idempotencyKey,
  }, deps);
  const count = (outcome: string) => results.filter((entry) => entry.outcome === outcome).length;
  return {
    intakeRequestId: data.intakeRequestId,
    organizerId,
    executionMode: data.executionMode,
    results,
    counts: {published: count("published"), wouldPublish: count("would_publish"),
      alreadyPublished: count("already_published"), withdrawn: count("withdrawn"), blocked: count("blocked")},
  };
}

export const adminPublishListingEvents = onCall(appCheckCallableOptions,
  (request) => adminPublishListingEventsHandler(request));

function normalizePublishPayload(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const data = value as Record<string, unknown>;
  const trimmed = (entry: unknown) => typeof entry === "string" ? entry.trim() : entry;
  return {...data, intakeRequestId: trimmed(data.intakeRequestId), idempotencyKey: trimmed(data.idempotencyKey),
    reviewNote: trimmed(data.reviewNote)};
}

function encodeCursor(cursor: {approvedAt: string; requestId: string}): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function decodeCursor(value: string): {approvedAt: string; requestId: string} {
  try {
    const cursor = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Record<string, unknown>;
    if (typeof cursor.approvedAt === "string" && typeof cursor.requestId === "string") {
      return {approvedAt: cursor.approvedAt, requestId: cursor.requestId};
    }
  } catch {
    // Falls through to the refusal below.
  }
  throw new HttpsError("invalid-argument", "This page cursor is invalid; reload the list.");
}

function recordValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
