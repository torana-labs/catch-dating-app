/* eslint-disable max-len */
import {HttpsError} from "firebase-functions/v2/https";
import {logger} from "firebase-functions";
import {
  approveListing,
  openMarket,
  type ListingApprovalDeps,
  type ListingDecisionChecklist,
} from "../admin/organizerListingApproval";
import {publicSlugFor} from "../admin/organizerListingReviewQueue";
import {marketForIdOrAlias} from "../locations/marketConfig";
import {validateOperationWorkItem} from "../operations/validation";
import {supplyIntakeCollections} from "../operations/supplyIntake/worker";
import {INSTANT_DRAFT_ACTOR, record, storedInstantDraft, type StoredInstantDraft} from "./model";

// When Supply Intake finishes reading an instant draft's link, the draft is
// saved as a private organizer the submitter can claim. It goes through the
// listing approval transaction, which saves any instant draft listing
// unpublished (publicPage draft, noindex, hidden, unclaimed, a held review
// decision), so this step cannot publish anything. The listing's events stay
// work items: their import is blocked until the claimed owner publishes the
// page. Anything this step cannot decide on its own waits for staff, who
// reply on WhatsApp from the Admin Inbox.

export type InstantDraftState =
  | {state: "building"}
  | {state: "draft_ready"; organizerId: string}
  | {state: "needs_staff"; reasons: string[]}
  | {state: "not_an_instant_draft"};

// Nobody reviewed identity, impersonation, media or the claim target: the
// draft is private and the claim flow proves ownership. Only the checks the
// code enforces (private, uncrawled, in an open market) are recorded as done.
const DRAFT_CHECKLIST: ListingDecisionChecklist = {
  identityReviewed: false, surfaceInventoryReviewed: false, ownerSafeCopyReviewed: false,
  marketScopeReviewed: true, mediaRightsReviewed: false, crawlDisabledReviewed: true,
  claimTargetReviewed: false, takedownPathReviewed: true, impersonationReviewed: false,
};
// Every new listing is a community until its organizer says otherwise.
const DRAFT_ORGANIZER_TYPE = "community";

interface StoredRequest {
  status?: unknown;
  approval?: {organizerId?: unknown} | null;
  instantDraft?: unknown;
  request?: {market?: unknown};
  result?: {listingWorkItemId?: unknown; listingContentHash?: unknown; eventCount?: unknown;
    duplicateCheck?: {verdict?: unknown} | null} | null;
}

/**
 * Saves a finished instant draft as a private, claimable organizer draft, or
 * records why a person must follow up. Safe to call repeatedly and
 * concurrently: the approval replays, and a recorded outcome is final.
 */
export async function materializeInstantDraft(deps: ListingApprovalDeps, requestId: string): Promise<InstantDraftState> {
  const db = deps.firestore();
  const ref = db.collection(supplyIntakeCollections.requests).doc(requestId);
  const stored = (await ref.get()).data() as StoredRequest | undefined;
  const draft = storedInstantDraft(stored?.instantDraft);
  if (!stored || !draft) return {state: "not_an_instant_draft"};
  const decided = currentState(stored, draft);
  if (decided) return decided;

  const reasons = eligibilityReasons(stored, draft);
  const market = openMarket(marketForIdOrAlias(String(stored.request?.market ?? ""))?.marketId ?? "");
  let listing: {workItemId: string; name: string; contentHash: string} | null = null;
  if (reasons.length === 0) {
    listing = await draftListing(db, String(stored.result?.listingWorkItemId));
    if (!listing) reasons.push("listing_unreadable");
    else if (!listing.name) reasons.push("organizer_name_missing");
    else if (listing.contentHash !== stored.result?.listingContentHash) reasons.push("listing_changed");
  }
  if (reasons.length > 0 || !listing || !market) return recordOutcome(deps, requestId, {state: "needs_staff", reasons});

  try {
    const approved = await approveListing(deps, {
      adminContext: {uid: INSTANT_DRAFT_ACTOR, roles: []}, auditAction: "saveInstantDraft",
      checklist: DRAFT_CHECKLIST, activityLead: "Draft saved", salesRecords: false,
    }, {
      listingWorkItemId: listing.workItemId, contentHash: listing.contentHash, name: listing.name,
      publicSlug: publicSlugFor(listing.name), marketId: market.marketId, organizerType: DRAFT_ORGANIZER_TYPE,
      note: "Saved from the website's instant draft tool as a private draft. Nothing is published until its organizer claims it.",
    });
    if (approved.publishStatus !== "draft") {
      // approveListing reads the stored draft state itself; this cannot happen.
      throw new Error(`Instant draft ${requestId} was not saved as a draft.`);
    }
    logger.info("Instant draft saved.", {requestId, organizerId: approved.organizerId, created: approved.created});
    return recordOutcome(deps, requestId, {state: "draft_ready", organizerId: approved.organizerId});
  } catch (error) {
    // A taken name, a rebuilt listing or a staff decision that got there first.
    if (!(error instanceof HttpsError)) throw error;
    logger.info("Instant draft left for staff.", {requestId, code: error.code});
    return recordOutcome(deps, requestId, {state: "needs_staff", reasons: [`approval_refused:${error.code}`]});
  }
}

/** What a request already says, without deciding anything new. */
export function currentState(stored: StoredRequest, draft: StoredInstantDraft): InstantDraftState | null {
  const organizerId = typeof stored.approval?.organizerId === "string" ? stored.approval.organizerId : null;
  if (organizerId) return {state: "draft_ready", organizerId};
  if (draft.outcome?.state === "needs_staff") return {state: "needs_staff", reasons: [...draft.outcome.reasons]};
  if (stored.status === "failed") return {state: "needs_staff", reasons: ["intake_failed"]};
  if (stored.status !== "completed") return {state: "building"};
  return null;
}

/** Pure: why a finished build cannot become a draft by itself. */
export function eligibilityReasons(stored: StoredRequest, draft: StoredInstantDraft): string[] {
  const reasons: string[] = [];
  // Form definitions are imported in slice 2; a form link waits for a person.
  if (draft.requestKind !== "event_link") reasons.push("form_import_not_available");
  const result = stored.result;
  if (!result || typeof result.listingWorkItemId !== "string") reasons.push("listing_missing");
  if (typeof result?.eventCount !== "number" || result.eventCount < 1) reasons.push("no_upcoming_events");
  // A likely match means Catch may already list this organizer; staff point
  // the submitter at that page instead of saving a second one.
  if (result?.duplicateCheck?.verdict !== "none") reasons.push("duplicate_check_not_clear");
  const market = marketForIdOrAlias(String(stored.request?.market ?? ""));
  if (!market || !openMarket(market.marketId)) reasons.push("market_not_open");
  return reasons;
}

async function draftListing(db: FirebaseFirestore.Firestore, workItemId: string):
  Promise<{workItemId: string; name: string; contentHash: string} | null> {
  const validated = validateOperationWorkItem((await db.collection("operationWorkItems").doc(workItemId).get()).data());
  if (!validated.ok) return null;
  const listing = record(record(validated.value.normalizedPayload.intake)?.listing);
  const organizer = record(listing?.organizer);
  if (!listing || typeof listing.contentHash !== "string") return null;
  const name = typeof organizer?.name === "string" ? organizer.name.trim().slice(0, 120) : "";
  return {workItemId: validated.value.workItemId, name, contentHash: listing.contentHash};
}

/** Records the outcome once; a later call reads it instead of deciding again. */
async function recordOutcome(deps: ListingApprovalDeps, requestId: string,
  outcome: {state: "draft_ready"; organizerId: string} | {state: "needs_staff"; reasons: string[]}): Promise<InstantDraftState> {
  const db = deps.firestore();
  const ref = db.collection(supplyIntakeCollections.requests).doc(requestId);
  const at = deps.now().toISOString();
  const reasons = outcome.state === "needs_staff" ? [...new Set(outcome.reasons)].sort().slice(0, 20) : [];
  return db.runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    const current = snapshot.data() as StoredRequest | undefined;
    const latest = storedInstantDraft(current?.instantDraft);
    if (!current || !latest) return {state: "not_an_instant_draft"} as const;
    // Staff may have approved it in the meantime; the approval wins.
    const approvedOrganizer = typeof current.approval?.organizerId === "string" ? current.approval.organizerId : null;
    if (latest.outcome !== null) return currentState(current, latest) ?? {state: "building"} as const;
    const state = approvedOrganizer ? "draft_ready" as const : outcome.state;
    tx.update(ref, {instantDraft: {...latest, outcome: {state, reasons: state === "draft_ready" ? [] : reasons, at}},
      updatedAt: at});
    return approvedOrganizer ? {state: "draft_ready" as const, organizerId: approvedOrganizer} :
      outcome.state === "draft_ready" ? outcome : {state: "needs_staff" as const, reasons};
  });
}
