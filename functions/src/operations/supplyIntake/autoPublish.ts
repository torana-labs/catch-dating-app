/* eslint-disable max-len */
import {HttpsError} from "firebase-functions/v2/https";
import {logger} from "firebase-functions";
import {
  approveListing,
  openMarket,
  type ListingApprovalDeps,
  type ListingDecisionChecklist,
} from "../../admin/organizerListingApproval";
import {publicSlugFor} from "../../admin/organizerListingReviewQueue";
import {CATCH_RECEIPTS} from "../../catchMessaging/whatsappEndpointStops";
import {catchEndpointHash} from "../../catchMessaging/whatsappReply";
import {validateOperationWorkItem} from "../validation";
import {resolveWhatsappNominator, type NominatorDeps} from "./nominators";
import {intakeMarket} from "./requests";
import {marketForIdOrAlias} from "../../locations/marketConfig";

// The owner's 30 Oct decision: a listing a registered associate nominated by
// WhatsApp, which the adapters filled completely, publishes without staff
// review, through the same transaction staff approval uses: noindex,
// claimable and hidden in the app. Staff withdraw one with a suppress
// decision. Anything short of a complete listing keeps waiting for review.

/** The approver recorded on an auto-published listing. */
export const AUTO_PUBLISH_ACTOR = "supply-auto-publish";
// Every new listing is a community until staff say otherwise; the claim flow
// lets the organizer correct it.
const AUTO_PUBLISH_ORGANIZER_TYPE = "community";
// Listing images never reach the public page, so a missing one is no gap.
const IGNORED_GAPS = new Set(["image_missing"]);

// The checks the code itself makes are recorded as done. Identity and
// impersonation are vouched for by the nominator, not reviewed by staff, so
// they stay false: an indexing or app decision later needs a staff review.
const AUTO_PUBLISH_CHECKLIST: ListingDecisionChecklist = {
  identityReviewed: false, surfaceInventoryReviewed: true, ownerSafeCopyReviewed: true,
  marketScopeReviewed: true, mediaRightsReviewed: true, crawlDisabledReviewed: true,
  claimTargetReviewed: true, takedownPathReviewed: true, impersonationReviewed: false,
};

export type AutoPublishOutcome =
  | {outcome: "published"; organizerId: string; canonicalPath: string}
  | {outcome: "needs_review"; reasons: string[]};

export type AutoPublishDeps = ListingApprovalDeps & Pick<NominatorDeps, "getUser">;

interface RequestState {
  status?: unknown;
  approval?: unknown;
  request?: {kind?: unknown; market?: unknown; origin?: {kind?: unknown; id?: unknown} | null;
    submittedBy?: {role?: unknown; uid?: unknown} | null};
  result?: {listingWorkItemId?: unknown; listingContentHash?: unknown; gaps?: unknown;
    researchNeeded?: unknown; eventCount?: unknown;
    duplicateCheck?: {verdict?: unknown; inventory?: {truncated?: unknown}} | null} | null;
}

/**
 * Publishes a finished WhatsApp nomination when every condition holds, and
 * otherwise says why it waits for staff. A request staff already approved,
 * or one this already published, is left alone.
 */
export async function autoPublishNominatedListing(deps: AutoPublishDeps, requestId: string,
  state: RequestState): Promise<AutoPublishOutcome> {
  const reasons: string[] = [];
  const {request, result} = state;
  if (state.status !== "completed" || state.approval !== null || !request || !result) reasons.push("not_awaiting_approval");
  if (request?.kind !== "nomination" || request.origin?.kind !== "message_nomination") reasons.push("not_a_message_nomination");
  if (request?.submittedBy?.role !== "associate" || typeof request.submittedBy.uid !== "string") reasons.push("not_an_associate");
  const gaps = Array.isArray(result?.gaps) ? result.gaps.filter((gap) => !IGNORED_GAPS.has(String(gap))) : ["gaps_unknown"];
  reasons.push(...gaps.map((gap) => `gap:${String(gap)}`));
  if (result?.researchNeeded !== false) reasons.push("research_needed");
  // Compared with every organizer in the market, and nothing alike.
  if (result?.duplicateCheck?.verdict !== "none" || result.duplicateCheck.inventory?.truncated !== false) {
    reasons.push("duplicate_check_not_clear");
  }
  const market = openMarket(intakeMarketId(request?.market));
  if (!market) reasons.push("market_not_open");
  if (reasons.length > 0 || !request || !result || !market) return {outcome: "needs_review", reasons};

  const db = deps.firestore();
  const workItem = validateOperationWorkItem((await db.collection("operationWorkItems").doc(String(result.listingWorkItemId)).get()).data());
  const listing = workItem.ok ? record(record(workItem.value.normalizedPayload.intake)?.listing) : null;
  const name = typeof record(listing?.organizer)?.name === "string" ? String(record(listing?.organizer)?.name).trim().slice(0, 120) : "";
  if (!workItem.ok || !listing || listing.contentHash !== result.listingContentHash) return {outcome: "needs_review", reasons: ["listing_changed"]};
  if (!name) return {outcome: "needs_review", reasons: ["gap:organizer_name_missing"]};

  // The nominator must still be registered and still an associate now, not
  // only when the message arrived.
  const participantId = (await db.collection(CATCH_RECEIPTS).doc(String(request.origin?.id)).get()).data()?.participantId;
  if (typeof participantId !== "string" || !/^[1-9][0-9]{6,14}$/u.test(participantId)) {
    return {outcome: "needs_review", reasons: ["message_expired"]};
  }
  const endpointHash = catchEndpointHash("+" + participantId);
  const nominator = await db.runTransaction((tx) => resolveWhatsappNominator(tx, db, deps, endpointHash, deps.now()));
  if (!nominator || nominator.role !== "associate" || nominator.uid !== request.submittedBy?.uid) {
    return {outcome: "needs_review", reasons: ["nominator_not_current"]};
  }

  const publicSlug = publicSlugFor(name);
  try {
    const approved = await approveListing(deps, {
      adminContext: {uid: AUTO_PUBLISH_ACTOR, roles: []}, auditAction: "autoPublishOrganizerListing",
      checklist: AUTO_PUBLISH_CHECKLIST, activityLead: "Listing auto-published",
    }, {
      listingWorkItemId: workItem.value.workItemId, contentHash: String(result.listingContentHash), name, publicSlug,
      marketId: market.marketId, organizerType: AUTO_PUBLISH_ORGANIZER_TYPE,
      note: `Auto-published: registered associate ${nominator.nominatorId} nominated it by WhatsApp and the adapters filled every field. Identity was vouched for by the nominator, not reviewed by staff.`,
    });
    logger.info("Nominated listing auto-published.", {requestId, organizerId: approved.organizerId, created: approved.created});
    return {outcome: "published", organizerId: approved.organizerId, canonicalPath: `/organizers/${publicSlug}/`};
  } catch (error) {
    // A taken slug, a rebuilt listing or a staff approval that got there
    // first: staff review it as usual.
    if (!(error instanceof HttpsError)) throw error;
    logger.info("Nominated listing left for review.", {requestId, code: error.code, message: error.message});
    return {outcome: "needs_review", reasons: [`approval_refused:${error.code}`]};
  }
}

/** The request stores the market's slug or alias; publishing needs its id. */
function intakeMarketId(slug: unknown): string {
  return marketForIdOrAlias(typeof slug === "string" ? slug : intakeMarket(null))?.marketId ?? "";
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
