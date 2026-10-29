/* eslint-disable max-len */
import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from "firebase-functions/v2/https";
import {appCheckCallableOptions} from "../shared/callableOptions";
import type {AdminListOrganizerListingReviewsCallablePayload} from "../shared/generated/adminListOrganizerListingReviewsCallablePayload";
import type {AdminListOrganizerListingReviewsCallableResponse} from "../shared/generated/adminListOrganizerListingReviewsCallableResponse";
import {validateAdminListOrganizerListingReviewsCallablePayload} from "../shared/generated/validators/adminListOrganizerListingReviewsInput";
import {validateCallableWithAjv} from "../shared/validation";
import {validateOperationWorkItem} from "../operations/validation";
import {supplyIntakeCollections} from "../operations/supplyIntake/worker";
import {marketForIdOrAlias} from "../locations/marketConfig";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {requireAdminRole} from "./adminAuth";
import {listingApprovalRoles} from "./organizerListingApproval";

// Anyone who reviews organizer intake can read the queue; approving it is
// narrower (see adminApproveOrganizerListing).
const reviewRoles = ["admin", "adminOwner", "support"] as const;

type Response = AdminListOrganizerListingReviewsCallableResponse;
type Row = Response["rows"][number];

interface ListingReviewDeps {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit?: typeof defaultCheckRateLimit;
}

const defaultDeps: ListingReviewDeps = {
  firestore: () => admin.firestore(),
  checkRateLimit: defaultCheckRateLimit,
};

/**
 * One page of listings Supply Intake built that staff have not approved yet,
 * newest first, each with what a reviewer needs to approve it: the listing's
 * evidence-backed fields and links, its gaps, how many pages were read, how
 * it compares with the organizers Catch already lists, and the content hash
 * approval must quote. A request whose listing cannot be read is counted, not
 * shown.
 */
export async function adminListOrganizerListingReviewsHandler(
  request: CallableRequest<unknown>,
  deps: ListingReviewDeps = defaultDeps
): Promise<Response> {
  const adminContext = requireAdminRole(request, reviewRoles);
  const data = validateCallableWithAjv<AdminListOrganizerListingReviewsCallablePayload>(request,
    validateAdminListOrganizerListingReviewsCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit?.(
    db,
    adminContext.uid,
    "adminListOrganizerListingReviews",
    {maxRequests: 60, windowMs: 60 * 1000}
  );
  let query = db.collection(supplyIntakeCollections.requests)
    .where("status", "==", "completed")
    .where("approval", "==", null)
    .orderBy("updatedAt", "desc")
    .orderBy(admin.firestore.FieldPath.documentId(), "desc")
    .limit(data.limit + 1);
  if (data.cursor) {
    const cursor = decodeCursor(data.cursor);
    query = query.startAfter(cursor.updatedAt, cursor.requestId);
  }
  const snapshot = await query.get();
  const page = snapshot.docs.slice(0, data.limit);
  const rows: Row[] = [];
  let unavailableCount = 0;
  for (const doc of page) {
    const row = await reviewRow(db, doc.id, doc.data());
    if (row) rows.push(row);
    else unavailableCount += 1;
  }
  const last = page.at(-1);
  return {
    rows,
    nextCursor: snapshot.docs.length > data.limit && last ?
      encodeCursor({updatedAt: String(last.data().updatedAt), requestId: last.id}) : null,
    unavailableCount,
    canApprove: adminContext.roles.some((role) => (listingApprovalRoles as readonly string[]).includes(role)),
  };
}

export const adminListOrganizerListingReviews = onCall(appCheckCallableOptions,
  (request) => adminListOrganizerListingReviewsHandler(request));

async function reviewRow(db: FirebaseFirestore.Firestore, requestId: string,
  stored: FirebaseFirestore.DocumentData): Promise<Row | null> {
  const intakeRequest = recordValue(stored.request);
  const result = recordValue(stored.result);
  const submittedBy = recordValue(intakeRequest?.submittedBy);
  if (!intakeRequest || !submittedBy || typeof result?.listingWorkItemId !== "string") return null;
  const workItemSnap = await db.collection("operationWorkItems").doc(result.listingWorkItemId).get();
  const validated = validateOperationWorkItem(workItemSnap.data());
  if (!validated.ok) return null;
  const intake = recordValue(validated.value.normalizedPayload.intake);
  const listing = recordValue(intake?.listing);
  const organizer = recordValue(listing?.organizer);
  if (intake?.recordType !== "organizer_listing_draft" || !listing || !organizer ||
      listing.requestId !== requestId || typeof listing.contentHash !== "string") return null;
  const seed = recordValue(intakeRequest.seed);
  const slug = typeof intakeRequest.market === "string" ? intakeRequest.market : "unassigned";
  const market = marketForIdOrAlias(slug);
  const pages = Array.isArray(listing.pages) ? listing.pages.map(recordValue) : [];
  const name = text(organizer.name, 500);
  const origin = recordValue(intakeRequest.origin);
  return {
    requestId,
    listingWorkItemId: result.listingWorkItemId,
    kind: intakeRequest.kind as Row["kind"],
    submittedByRole: submittedBy.role as Row["submittedByRole"],
    submittedAt: String(intakeRequest.submittedAt),
    origin: (typeof origin?.kind === "string" ? origin.kind : "none") as Row["origin"],
    market: {slug, marketId: market?.marketId ?? null, label: market?.label ?? null,
      open: market?.hostCreatable === true},
    suggestedSlug: publicSlugFor(name ?? text(seed?.name, 500) ?? listing.listingId as string),
    listing: {
      name,
      description: text(organizer.description, 2000),
      categories: strings(organizer.categories, 12, 80),
      links: (Array.isArray(organizer.links) ? organizer.links : []).flatMap((entry) => {
        const link = recordValue(entry);
        return link && typeof link.platform === "string" && typeof link.url === "string" ?
          [{platform: link.platform.slice(0, 80), url: link.url.slice(0, 2000)}] : [];
      }).slice(0, 20),
      gaps: strings(listing.gaps, 40, 120),
      eventCount: nonNegative(listing.eventCount),
      researchNeeded: listing.researchNeeded === true,
      contentHash: listing.contentHash,
      pageCount: pages.length,
      fetchedPageCount: pages.filter((page) => page?.outcome === "fetched").length,
    },
    // Only the check recorded with this very build: a request's result and its
    // listing work item agree on the contentHash the reviewer will approve.
    duplicateCheck: result.listingContentHash === listing.contentHash ? duplicateCheckRow(result.duplicateCheck) : null,
  };
}

const VERDICTS = new Set(["match", "ambiguous", "none"]);
const BANDS = new Set(["match", "probable", "review", "low"]);

function duplicateCheckRow(value: unknown): Row["duplicateCheck"] {
  const check = recordValue(value);
  const inventory = recordValue(check?.inventory);
  if (!check || !inventory || !VERDICTS.has(String(check.verdict)) || !Array.isArray(check.candidates)) return null;
  return {
    verdict: check.verdict as NonNullable<Row["duplicateCheck"]>["verdict"],
    organizersCompared: nonNegative(check.organizersCompared),
    citySlug: text(inventory.citySlug, 80),
    truncated: inventory.truncated === true,
    candidates: check.candidates.flatMap((entry) => {
      const candidate = recordValue(entry);
      const score = Number(candidate?.score);
      if (!candidate || typeof candidate.organizerId !== "string" || !candidate.organizerId ||
          !Number.isFinite(score) || score < 0 || score > 1 || !BANDS.has(String(candidate.band))) return [];
      return [{organizerId: candidate.organizerId.slice(0, 200), name: text(candidate.name, 500), score,
        band: candidate.band as NonNullable<Row["duplicateCheck"]>["candidates"][number]["band"],
        rationale: typeof candidate.rationale === "string" ? candidate.rationale.slice(0, 2000) : ""}];
    }).slice(0, 12),
  };
}

/** A route-safe slug the reviewer can accept or edit. */
export function publicSlugFor(value: string): string {
  const slug = value.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "").slice(0, 64).replace(/-+$/u, "");
  return slug.length >= 3 ? slug : `organizer-${slug || "listing"}`.slice(0, 64);
}

function encodeCursor(cursor: {updatedAt: string; requestId: string}): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function decodeCursor(value: string): {updatedAt: string; requestId: string} {
  try {
    const cursor = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Record<string, unknown>;
    if (typeof cursor.updatedAt === "string" && typeof cursor.requestId === "string") {
      return {updatedAt: cursor.updatedAt, requestId: cursor.requestId};
    }
  } catch {
    // Falls through to the refusal below.
  }
  throw new HttpsError("invalid-argument", "This page cursor is invalid; reload the queue.");
}

function recordValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function text(value: unknown, maxLength: number): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, maxLength) : null;
}

function strings(value: unknown, maxItems: number, maxLength: number): string[] {
  return Array.isArray(value) ?
    value.filter((entry): entry is string => typeof entry === "string").map((entry) => entry.slice(0, maxLength))
      .slice(0, maxItems) : [];
}

function nonNegative(value: unknown): number {
  return Number.isSafeInteger(value) && (value as number) >= 0 ? value as number : 0;
}
