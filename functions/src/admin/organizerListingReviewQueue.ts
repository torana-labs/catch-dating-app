/* eslint-disable max-len */
import * as admin from "firebase-admin";
import {CallableRequest, HttpsError} from "firebase-functions/v2/https";
import type {AdminGetOrganizerListingReviewCallablePayload} from "../shared/generated/adminGetOrganizerListingReviewCallablePayload";
import type {AdminGetOrganizerListingReviewCallableResponse} from "../shared/generated/adminGetOrganizerListingReviewCallableResponse";
import {validateAdminGetOrganizerListingReviewCallablePayload} from "../shared/generated/validators/adminGetOrganizerListingReviewInput";
import {validateOperationWorkItem} from "../operations/validation";
import {supplyIntakeCollections} from "../operations/supplyIntake/worker";
import {marketForIdOrAlias} from "../locations/marketConfig";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {listingApprovalRoles} from "./organizerListingApproval";
import {publicSlugFor} from "../organizers/organizerIdentity";
import {
  callable,
  type CallableContext,
  type CallableSpec,
  runCallable,
} from "../platform/callables/callable";
import {adminRoles} from "../platform/callables/policies";
import type {AdminContext} from "../platform/adminAuth";

// Anyone who reviews organizer intake can read the queue; approving it is
// narrower (see adminApproveOrganizerListing).
const reviewRoles = ["admin", "adminOwner", "support"] as const;

type Row = AdminGetOrganizerListingReviewCallableResponse["review"];

interface ListingReviewDeps {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit?: typeof defaultCheckRateLimit;
}

const defaultDeps: ListingReviewDeps = {
  firestore: () => admin.firestore(),
  checkRateLimit: defaultCheckRateLimit,
};

/**
 * One listing awaiting approval, for the inbox item that names its request. A
 * request already approved, not finished or unreadable has nothing to review.
 * Policy: reviewRoles (STR-10).
 * @param {ListingReviewDeps} deps Dependencies.
 * @return {CallableSpec} The callable.
 */
export function adminGetOrganizerListingReviewSpec(
  deps: ListingReviewDeps = defaultDeps):
  CallableSpec<
    AdminGetOrganizerListingReviewCallablePayload,
    AdminContext,
    AdminGetOrganizerListingReviewCallableResponse> {
  return {
    name: "adminGetOrganizerListingReview",
    policy: adminRoles(reviewRoles),
    input: validateAdminGetOrganizerListingReviewCallablePayload,
    handle: (context) => adminGetOrganizerListingReviewWork(context, deps),
  };
}

/** The deployed path of adminGetOrganizerListingReview, for tests. */
export function adminGetOrganizerListingReviewHandler(
  request: CallableRequest<unknown>, deps: ListingReviewDeps = defaultDeps):
  Promise<AdminGetOrganizerListingReviewCallableResponse> {
  return runCallable(adminGetOrganizerListingReviewSpec(deps), request);
}

async function adminGetOrganizerListingReviewWork(
  {data, actor: adminContext}:
    CallableContext<
      AdminGetOrganizerListingReviewCallablePayload,
      AdminContext>,
  deps: ListingReviewDeps):
  Promise<AdminGetOrganizerListingReviewCallableResponse> {
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, adminContext.uid, "adminGetOrganizerListingReview",
    {maxRequests: 120, windowMs: 60 * 1000});
  const snap = await db.collection(supplyIntakeCollections.requests).doc(data.requestId).get();
  const stored = snap.data();
  if (!stored || stored.status !== "completed" || stored.approval !== null) {
    throw new HttpsError("failed-precondition", "This listing is not waiting for approval.");
  }
  const review = await reviewRow(db, snap.id, stored);
  if (!review) throw new HttpsError("failed-precondition", "This listing could not be read.");
  return {review, canApprove: adminContext.roles.some((role) => (listingApprovalRoles as readonly string[]).includes(role))};
}

export const adminGetOrganizerListingReview = callable(
  adminGetOrganizerListingReviewSpec());

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
    // The review contract lists the staff-facing front doors; any other origin reads as none.
    origin: reviewOrigin(origin?.kind),
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

const reviewOrigins: ReadonlyArray<Row["origin"]> =
  ["admin_nomination", "sales_inbound_intent", "message_nomination", "discovery_run"];

function reviewOrigin(kind: unknown): Row["origin"] {
  return reviewOrigins.find((origin) => origin === kind) ?? "none";
}
