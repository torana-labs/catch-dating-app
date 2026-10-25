/* eslint-disable max-len */
import crypto from "node:crypto";
import path from "node:path";
import {pathToFileURL} from "node:url";
import * as admin from "firebase-admin";
import {CallableRequest, HttpsError} from "firebase-functions/v2/https";
import type {ExternalEventDocument} from "../../shared/generated/externalEventDocument";
import type {ExternalEventPublicationReceiptDocument} from "../../shared/generated/externalEventPublicationReceiptDocument";
import {validateExternalEventDocument} from "../../shared/generated/validators/externalEventDocument";
import {marketForIdOrAlias} from "../../locations/marketConfig";
import {verifiedOrganizerSupplyCapabilities} from "../../shared/organizerSupplyCapabilities";
import {
  assertExternalEventOrganizerAuthority,
  assertMatchingPublicationReceipt,
  publicationInputHash,
  publicationReceiptId,
} from "../../admin/externalEventPublicationPolicy";
import {assertAcceptedExternalEventWaivers} from "../../admin/externalEventBlockerAuthority";
import {setAdminAuditLogInTransaction} from "../../admin/adminAudit";
import type {AdminContext} from "../../admin/adminAuth";
import {validateOperationWorkItem} from "../validation";
import {supplyIntakeCollections} from "./worker";

// Publishes events Supply Intake imported for an approved organizer listing
// as read-only, outbound-only externalEvents. Staff publish them through
// adminPublishListingEvents; the event publication policy publishes the ones
// that pass every automated check when a listing is approved. Both run the
// Supply Intake import plan (event-import.mjs) and review rules
// (event-publication.mjs) from the packaged Operations runtime, then write
// through the same checks as any external event: contract validation, the
// organizer's market, capability and visibility ceiling, accepted waivers and
// an idempotency receipt per event.

export interface ListingEventFacts {
  listingId: string;
  eventKey: string;
  platform: string;
  title: string | null;
  description: string | null;
  startAt: string;
  endAt: string | null;
  venue: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  sourceUrl: string;
  organizerName: string | null;
  organizerUrl: string | null;
  [key: string]: unknown;
}

export interface ListingEventReview {
  reviewerUid: string;
  decidedAt: string;
  note: string | null;
  ownerSafeCopyReviewed: boolean;
  importPolicyAcknowledged: boolean;
  blockerResolutions: Array<{blockerCode: string; outcome: string; policyGapDecisionId: string | null; note: string}>;
}

export interface ListingEventPlan {
  eventId: string;
  workItemId: string;
  status: "write_ready" | "blocked";
  blockers: string[];
  document: ExternalEventDocument | null;
}

export interface AutomatedFinding {
  check: "dating_framing" | "organizer_attribution" | "price_missing";
  field: string;
  match: string;
}

export interface EventPublicationPolicy {
  policyVersion: string;
  mode: "staff_review" | "auto_publish_approved_organizers";
}

interface PackagedEventPublication {
  planListingEventImport: (input: Record<string, unknown>) => ListingEventPlan;
  loadEventPublicationPolicy: () => Promise<EventPublicationPolicy>;
  automatedEventReview: (input: Record<string, unknown>) => {
    eligible: boolean; findings: AutomatedFinding[]; review: ListingEventReview};
  staffEventReview: (input: Record<string, unknown>) => ListingEventReview;
  AUTO_PUBLISH_ACTOR: string;
  AUTO_PUBLISH_MODE: string;
  GOVERNED_BLOCKERS: readonly string[];
}

const modules = [
  "workflows/supply-intake/event-import.mjs",
  "workflows/supply-intake/event-publication.mjs",
] as const;

let packaged: Promise<PackagedEventPublication> | null = null;

/** Loads the copied Operations modules once per instance. */
export function packagedEventPublication(): Promise<PackagedEventPublication> {
  packaged ??= (async () => {
    const root = path.resolve(__dirname, "../..", "operations", "src");
    const loaded = await Promise.all(modules.map((relative) =>
      import(pathToFileURL(path.join(root, relative)).href)));
    return Object.assign({}, ...loaded) as PackagedEventPublication;
  })().catch((error: unknown) => {
    packaged = null;
    throw error;
  });
  return packaged;
}

export interface StaffChecklist {
  outboundLinksReviewed: boolean;
  noCatchBookingPaymentsWaitlist: boolean;
  ownerSafeCopyReviewed: boolean;
}

export type ListingEventActor =
  | {kind: "staff"; adminContext: AdminContext; checklist: StaffChecklist; note: string;
      blockerResolutions: Map<string, ListingEventReview["blockerResolutions"]>; request?: CallableRequest<unknown>}
  | {kind: "policy"};

export type ListingEventOutcome =
  | "published" | "would_publish" | "already_published" | "withdrawn" | "blocked" | "awaiting_staff";

export interface ListingEventResult {
  eventWorkItemId: string;
  eventId: string | null;
  outcome: ListingEventOutcome;
  blockers: string[];
  receiptPath: string | null;
  idempotent: boolean;
}

export interface ListingEventPublicationDeps {
  firestore: () => FirebaseFirestore.Firestore;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  now: () => Date;
}

export const defaultListingEventPublicationDeps: ListingEventPublicationDeps = {
  firestore: () => admin.firestore(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  now: () => new Date(),
};

/** What a listing's approved organizer contributes to every plan. */
export interface ApprovedListingOrganizer {
  organizerId: string;
  organizer: Record<string, unknown>;
  citySlug: string | null;
  attribution: {name: string | null; links: string[]};
  blockers: string[];
}

/**
 * Publishes (or dry-runs) the chosen events of one approved listing, each in
 * its own transaction so one blocked event never holds back the rest. Under
 * the policy actor an event is written only when the policy auto-publishes and
 * it passes every automated check and the plan; otherwise it awaits staff.
 */
export async function publishListingEvents(input: {
  intakeRequestId: string;
  eventWorkItemIds: string[];
  actor: ListingEventActor;
  executionMode: "dry_run" | "apply";
  idempotencyKey: string;
}, deps: ListingEventPublicationDeps = defaultListingEventPublicationDeps): Promise<{
  organizerId: string | null; results: ListingEventResult[]; policy: EventPublicationPolicy;
}> {
  const runtime = await packagedEventPublication();
  const policy = await runtime.loadEventPublicationPolicy();
  const db = deps.firestore();
  const results: ListingEventResult[] = [];
  let organizerId: string | null = null;
  for (const eventWorkItemId of input.eventWorkItemIds) {
    const result = await db.runTransaction(async (tx) => {
      const listing = await approvedListingInTransaction(tx, db, input.intakeRequestId);
      organizerId = listing.organizerId ?? organizerId;
      if (!listing.eventWorkItemIds.includes(eventWorkItemId)) {
        throw new HttpsError("invalid-argument", `${eventWorkItemId} is not an event of this listing.`);
      }
      const event = listingEventFromWorkItem((await tx.get(db.collection("operationWorkItems")
        .doc(eventWorkItemId))).data(), eventWorkItemId, listing.listingId);
      if (!listing.organizer) {
        return blocked(eventWorkItemId, null, ["organizer_listing_pending"]);
      }
      const owner = listing.organizer;
      const now = deps.now().toISOString();
      const automated = runtime.automatedEventReview({event, organizer: owner.attribution, policy, now});
      const review = input.actor.kind === "policy" ? automated.review : runtime.staffEventReview({
        reviewerUid: input.actor.adminContext.uid, decidedAt: now, note: input.actor.note,
        checklist: input.actor.checklist,
        blockerResolutions: input.actor.blockerResolutions.get(eventWorkItemId) ?? [],
      });
      const capabilities = verifiedOrganizerSupplyCapabilities(owner.organizer);
      const plan = runtime.planListingEventImport({event, workItemId: eventWorkItemId, citySlug: owner.citySlug, now,
        review, duplicates: [], organizer: {organizerId: owner.organizerId, claimable: capabilities.claimable,
          appVisibility: owner.organizer.appVisibility === "discoverable" ? "discoverable" : "hidden"}});
      // A replay (same key) and an event that already exists answer before
      // anything that may have changed since: the clock, the policy, the copy.
      const actorUid = input.actor.kind === "policy" ? runtime.AUTO_PUBLISH_ACTOR : input.actor.adminContext.uid;
      const idempotencyKey = `${input.idempotencyKey}:${shortHash(eventWorkItemId)}`;
      const receiptRef = db.collection("externalEventPublicationReceipts")
        .doc(publicationReceiptId(actorUid, "publish", idempotencyKey));
      const eventRef = db.collection("externalEvents").doc(plan.eventId);
      const inputHash = publicationInputHash({intakeRequestId: input.intakeRequestId, eventWorkItemId,
        executionMode: input.executionMode, actor: input.actor.kind === "policy" ? policy.policyVersion :
          {checklist: input.actor.checklist, note: input.actor.note, resolutions: review.blockerResolutions}});
      const [receiptSnap, eventSnap] = await Promise.all([tx.get(receiptRef), tx.get(eventRef)]);
      if (receiptSnap.exists) {
        const receipt = receiptSnap.data() ?? {};
        assertMatchingPublicationReceipt(receipt, {action: "publish", inputHash, idempotencyKey});
        return {eventWorkItemId, eventId: plan.eventId, outcome: receipt.outcome as ListingEventOutcome,
          blockers: [], receiptPath: receiptRef.path, idempotent: true};
      }
      if (eventSnap.exists) {
        // A re-import never overwrites a published event or brings back one staff withdrew.
        const published = eventSnap.data()?.publicationStatus === "public";
        return {eventWorkItemId, eventId: plan.eventId, outcome: published ? "already_published" as const :
          "withdrawn" as const, blockers: [], receiptPath: null, idempotent: false};
      }
      const blockers = [...owner.blockers, ...plan.blockers];
      if (input.actor.kind === "policy" && !automated.eligible) {
        return {eventWorkItemId, eventId: plan.eventId, outcome: "awaiting_staff" as const, receiptPath: null,
          idempotent: false, blockers: unique([...blockers, ...automated.findings.map((finding) => finding.check),
            ...(policy.mode === runtime.AUTO_PUBLISH_MODE ? [] : ["staff_review_policy"])])};
      }
      if (blockers.length > 0 || plan.status !== "write_ready" || !plan.document) {
        return blocked(eventWorkItemId, plan.eventId, blockers.length > 0 ? blockers : ["import_plan_incomplete"]);
      }
      const document = {...plan.document, organizerCapabilities: capabilities} as ExternalEventDocument;
      const contractBlocker = documentBlocker(document, owner);
      if (contractBlocker) return blocked(eventWorkItemId, plan.eventId, [contractBlocker]);
      await assertAcceptedExternalEventWaivers(tx, db, document.review.blockerResolutions);
      const outcome = input.executionMode === "apply" ? "published" as const : "would_publish" as const;
      if (input.executionMode === "apply") tx.create(eventRef, firestoreDocument(document));
      const receipt: ExternalEventPublicationReceiptDocument = {
        schemaVersion: 1, receiptId: receiptRef.id, idempotencyKey, inputHash, action: "publish",
        executionMode: input.executionMode, outcome, eventId: plan.eventId, targetPath: eventRef.path,
        sourceActionId: eventWorkItemId, externalLinkCount: document.booking.externalLinks.length,
        reviewNote: review.note ?? "Published.", actorUid, createdAt: deps.serverTimestamp() as never,
      };
      tx.create(receiptRef, receipt);
      if (input.actor.kind === "staff") {
        setAdminAuditLogInTransaction(tx, db, input.actor.adminContext, {
          action: "adminPublishListingEvents", targetPath: eventRef.path, request: input.actor.request,
          before: {}, after: {eventId: plan.eventId, eventWorkItemId, intakeRequestId: input.intakeRequestId,
            organizerId: owner.organizerId, executionMode: input.executionMode, receiptId: receiptRef.id, effect: outcome},
          note: input.actor.note, serverTimestamp: deps.serverTimestamp,
        });
      }
      return {eventWorkItemId, eventId: plan.eventId, outcome, blockers: [], receiptPath: receiptRef.path,
        idempotent: false};
    });
    results.push(result);
  }
  return {organizerId, results, policy};
}

/**
 * The approved listing behind an intake request: its events, and the
 * organizer approval created, when that organizer still has a published page.
 */
export async function approvedListingInTransaction(
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  intakeRequestId: string
): Promise<{listingId: string; eventWorkItemIds: string[]; organizerId: string | null;
  organizer: ApprovedListingOrganizer | null}> {
  const requestSnap = await tx.get(db.collection(supplyIntakeCollections.requests).doc(intakeRequestId));
  const stored = recordValue(requestSnap.data());
  const result = recordValue(stored?.result);
  if (!requestSnap.exists || !result || typeof result.listingId !== "string") {
    throw new HttpsError("not-found", "This intake request has no listing.");
  }
  const eventWorkItemIds = Array.isArray(result.eventWorkItemIds) ?
    result.eventWorkItemIds.filter((id): id is string => typeof id === "string") : [];
  const approval = recordValue(stored?.approval);
  const organizerId = typeof approval?.organizerId === "string" ? approval.organizerId : null;
  if (!organizerId) return {listingId: result.listingId, eventWorkItemIds, organizerId: null, organizer: null};
  const organizerSnap = await tx.get(db.collection("organizers").doc(organizerId));
  return {listingId: result.listingId, eventWorkItemIds, organizerId,
    organizer: organizerSnap.exists ? approvedOrganizer(organizerId, organizerSnap.data() ?? {}) : null};
}

/** Pure: what an organizer document contributes to its events' plans. */
export function approvedOrganizer(organizerId: string, organizer: Record<string, unknown>): ApprovedListingOrganizer {
  const page = recordValue(organizer.publicPage);
  const market = marketForIdOrAlias(stringValue(organizer.locationMarketId) || stringValue(organizer.location));
  const blockers: string[] = [];
  if (page?.publishStatus !== "published" || organizer.archived === true || organizer.status !== "active") {
    blockers.push("organizer_page_unpublished");
  }
  if (!market) blockers.push("organizer_market_unknown");
  const links = (Array.isArray(organizer.publicSources) ? organizer.publicSources : []).flatMap((source) => {
    const href = recordValue(source)?.href;
    return typeof href === "string" ? [href] : [];
  });
  return {organizerId, organizer, citySlug: market?.slug ?? null, blockers,
    attribution: {name: stringValue(organizer.name) || null, links}};
}

/** Pure: the reviewed facts of one listing_event_candidate work item. */
export function listingEventFromWorkItem(value: unknown, workItemId: string, listingId: string): ListingEventFacts {
  const validated = validateOperationWorkItem(value);
  if (!validated.ok || validated.value.workItemId !== workItemId) {
    throw new HttpsError("failed-precondition", `Work item ${workItemId} failed contract validation.`);
  }
  const intake = recordValue(validated.value.normalizedPayload.intake);
  const event = recordValue(intake?.event);
  if (validated.value.workflowId !== "supply-intake" || validated.value.entityKind !== "event" ||
      intake?.recordType !== "listing_event_candidate" || !event || event.listingId !== listingId) {
    throw new HttpsError("failed-precondition", `Work item ${workItemId} is not an event of this listing.`);
  }
  return event as ListingEventFacts;
}

function documentBlocker(document: ExternalEventDocument, owner: ApprovedListingOrganizer): string | null {
  if (!validateExternalEventDocument(document)) return "external_event_contract_invalid";
  try {
    assertExternalEventOrganizerAuthority(document.eventId, document, owner.organizerId, owner.organizer);
  } catch (error) {
    if (error instanceof HttpsError) return "organizer_authority_mismatch";
    throw error;
  }
  return null;
}

function blocked(eventWorkItemId: string, eventId: string | null, blockers: string[]): ListingEventResult {
  return {eventWorkItemId, eventId, outcome: "blocked", blockers: unique(blockers), receiptPath: null,
    idempotent: false};
}

/** Serialized fixture timestamps become Firestore Timestamps. */
function firestoreDocument(document: ExternalEventDocument): Record<string, unknown> {
  const timestamp = (value: {_seconds: number; _nanoseconds: number}) =>
    new admin.firestore.Timestamp(value._seconds, value._nanoseconds);
  return {...document, startTime: timestamp(document.startTime),
    endTime: document.endTime ? timestamp(document.endTime) : null,
    createdAt: timestamp(document.createdAt), updatedAt: timestamp(document.updatedAt)};
}

function shortHash(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function unique(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function recordValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
