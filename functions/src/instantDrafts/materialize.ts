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
import {inferDraftMarket, openDraftMarket, openDraftMarkets, type DraftEventLocation} from "./market";
import {
  INSTANT_DRAFT_ACTOR,
  record,
  storedInstantDraft,
  type DraftMarketOption,
  type DraftMarketSource,
  type StoredInstantDraft,
} from "./model";

// When Supply Intake finishes reading an instant draft's link, the draft is
// saved as a private organizer the submitter can claim. It goes through the
// listing approval transaction, which saves any instant draft listing
// unpublished (publicPage draft, noindex, hidden, unclaimed, a held review
// decision), so this step cannot publish anything. The listing's events stay
// work items: their import is blocked until the claimed owner publishes the
// page. Its market is the city the submitter gave, else the one its imported
// events happen in; when neither says, the submitter picks one (needs_city)
// instead of waiting for staff. Anything else this step cannot decide on its
// own waits for staff, who reply on WhatsApp from the Admin Inbox.

export type InstantDraftState =
  | {state: "building"}
  | {state: "draft_ready"; organizerId: string}
  | {state: "needs_city"; markets: DraftMarketOption[]}
  | {state: "needs_staff"; reasons: string[]}
  | {state: "expired"}
  | {state: "not_an_instant_draft"};

/** At most this many imported events are read to tell the draft's city. */
const LOCATION_EVENTS = 20;

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

export interface StoredRequest {
  status?: unknown;
  approval?: {organizerId?: unknown} | null;
  instantDraft?: unknown;
  request?: {market?: unknown};
  result?: {listingWorkItemId?: unknown; listingContentHash?: unknown; eventCount?: unknown;
    eventWorkItemIds?: unknown; duplicateCheck?: {verdict?: unknown} | null} | null;
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
  let listing: DraftListing | null = null;
  if (reasons.length === 0) {
    listing = await draftListing(db, String(stored.result?.listingWorkItemId));
    if (!listing) reasons.push("listing_unreadable");
    else if (!listing.name) reasons.push("organizer_name_missing");
    else if (listing.contentHash !== stored.result?.listingContentHash) reasons.push("listing_changed");
  }
  if (reasons.length > 0 || !listing) return recordOutcome(deps, requestId, {state: "needs_staff", reasons});
  const resolved = await resolveDraftMarket(db, stored, draft, listing.locality);
  if (resolved.kind === "not_open") return recordOutcome(deps, requestId, {state: "needs_staff", reasons: ["market_not_open"]});
  if (resolved.kind === "needs_city") return recordOutcome(deps, requestId, {state: "needs_city"});
  const market = openMarket(resolved.marketId);
  if (!market) return recordOutcome(deps, requestId, {state: "needs_staff", reasons: ["market_not_open"]});

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
    logger.info("Instant draft saved.", {requestId, organizerId: approved.organizerId, created: approved.created,
      marketId: market.marketId, marketSource: resolved.source});
    return recordOutcome(deps, requestId, {state: "draft_ready", organizerId: approved.organizerId},
      {marketId: market.marketId, source: resolved.source});
  } catch (error) {
    // A taken name, a rebuilt listing or a staff decision that got there first.
    if (!(error instanceof HttpsError)) throw error;
    logger.info("Instant draft left for staff.", {requestId, code: error.code});
    return recordOutcome(deps, requestId, {state: "needs_staff", reasons: [`approval_refused:${error.code}`]});
  }
}

/** What a request already says, without deciding anything new. */
export function currentState(stored: StoredRequest, draft: StoredInstantDraft): InstantDraftState | null {
  if (draft.outcome?.state === "expired") return {state: "expired"};
  const organizerId = typeof stored.approval?.organizerId === "string" ? stored.approval.organizerId : null;
  if (organizerId) return {state: "draft_ready", organizerId};
  if (draft.outcome?.state === "needs_staff") return {state: "needs_staff", reasons: [...draft.outcome.reasons]};
  // A city the submitter picked continues the same draft; until then it waits for them.
  if (draft.outcome?.state === "needs_city" && draft.market?.source !== "chosen") {
    return {state: "needs_city", markets: openDraftMarkets()};
  }
  if (stored.status === "failed") return {state: "needs_staff", reasons: ["intake_failed"]};
  if (stored.status !== "completed") return {state: "building"};
  return null;
}

/**
 * Pure: why a finished build cannot become a draft by itself, apart from its
 * market, which resolveDraftMarket decides once the build is otherwise ready.
 */
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
  return reasons;
}

export type ResolvedDraftMarket =
  | {kind: "open"; marketId: string; source: DraftMarketSource}
  | {kind: "not_open"}
  | {kind: "needs_city"};

/**
 * The draft's market: the one already recorded (a city the submitter picked),
 * else the submitted city, else the one its imported events happen in. A
 * known market Catch has not opened waits for staff; no market at all, or
 * events in several, asks the submitter.
 */
export async function resolveDraftMarket(db: FirebaseFirestore.Firestore, stored: StoredRequest,
  draft: StoredInstantDraft, organizerLocality: unknown = null): Promise<ResolvedDraftMarket> {
  const recorded = draft.market ? openDraftMarket(draft.market.marketId) : null;
  if (draft.market && recorded) return {kind: "open", marketId: recorded.marketId, source: draft.market.source};
  const submitted = marketForIdOrAlias(String(stored.request?.market ?? ""));
  if (submitted) return submitted.hostCreatable ? {kind: "open", marketId: submitted.marketId, source: "submitted"} : {kind: "not_open"};
  const ids = Array.isArray(stored.result?.eventWorkItemIds) ?
    stored.result.eventWorkItemIds.filter((id): id is string => typeof id === "string").slice(0, LOCATION_EVENTS) : [];
  const items = await Promise.all(ids.map((id) => db.collection("operationWorkItems").doc(id).get()));
  const events = items.flatMap((snapshot) => {
    const event = record(record(record(snapshot.data())?.normalizedPayload)?.intake)?.event;
    return record(event) ? [record(event) as DraftEventLocation] : [];
  });
  const inferred = inferDraftMarket(events, organizerLocality);
  if (inferred.kind !== "market") return {kind: "needs_city"};
  return inferred.market.hostCreatable ? {kind: "open", marketId: inferred.market.marketId, source: "event_location"} :
    {kind: "not_open"};
}

/**
 * Records the open market the submitter picked after a needs_city answer, so
 * the next materialize continues the same draft in it. Repeating the same
 * choice is a no-op; any other draft refuses.
 */
export async function chooseDraftCity(deps: Pick<ListingApprovalDeps, "firestore" | "now">, requestId: string,
  city: string): Promise<void> {
  const market = openDraftMarket(city);
  if (!market) throw new HttpsError("invalid-argument", "Choose one of the open cities.");
  const db = deps.firestore();
  const ref = db.collection(supplyIntakeCollections.requests).doc(requestId);
  await db.runTransaction(async (tx) => {
    const stored = (await tx.get(ref)).data() as StoredRequest | undefined;
    const draft = storedInstantDraft(stored?.instantDraft);
    if (!stored || !draft) throw new HttpsError("not-found", "This draft link is not valid.");
    if (draft.market?.source === "chosen" && draft.market.marketId === market.marketId) return;
    if (draft.outcome?.state !== "needs_city" || draft.market?.source === "chosen") {
      throw new HttpsError("failed-precondition", "This draft is not waiting for a city.");
    }
    const at = deps.now().toISOString();
    tx.update(ref, {instantDraft: {...draft, market: {marketId: market.marketId, source: "chosen", at}}, updatedAt: at});
  });
}

interface DraftListing {
  workItemId: string;
  name: string;
  contentHash: string;
  locality: string | null;
}

async function draftListing(db: FirebaseFirestore.Firestore, workItemId: string): Promise<DraftListing | null> {
  const validated = validateOperationWorkItem((await db.collection("operationWorkItems").doc(workItemId).get()).data());
  if (!validated.ok) return null;
  const listing = record(record(validated.value.normalizedPayload.intake)?.listing);
  const organizer = record(listing?.organizer);
  if (!listing || typeof listing.contentHash !== "string") return null;
  const name = typeof organizer?.name === "string" ? organizer.name.trim().slice(0, 120) : "";
  return {workItemId: validated.value.workItemId, name, contentHash: listing.contentHash,
    locality: typeof organizer?.locality === "string" ? organizer.locality : null};
}

type DecidedOutcome =
  | {state: "draft_ready"; organizerId: string}
  | {state: "needs_staff"; reasons: string[]}
  | {state: "needs_city"};

/**
 * Records the outcome once; a later call reads it instead of deciding again.
 * Only needs_city gives way, to the outcome of the city the submitter picked.
 */
async function recordOutcome(deps: ListingApprovalDeps, requestId: string, outcome: DecidedOutcome,
  market: {marketId: string; source: DraftMarketSource} | null = null): Promise<InstantDraftState> {
  const db = deps.firestore();
  const ref = db.collection(supplyIntakeCollections.requests).doc(requestId);
  const at = deps.now().toISOString();
  const reasons = outcome.state === "needs_staff" ? [...new Set(outcome.reasons)].sort().slice(0, 20) :
    outcome.state === "needs_city" ? ["city_not_inferred"] : [];
  return db.runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    const current = snapshot.data() as StoredRequest | undefined;
    const latest = storedInstantDraft(current?.instantDraft);
    if (!current || !latest) return {state: "not_an_instant_draft"} as const;
    // Staff may have approved it in the meantime; the approval wins.
    const approvedOrganizer = typeof current.approval?.organizerId === "string" ? current.approval.organizerId : null;
    if (latest.outcome !== null && latest.outcome.state !== "needs_city") {
      return currentState(current, latest) ?? {state: "building"} as const;
    }
    const state = approvedOrganizer ? "draft_ready" as const : outcome.state;
    const recordedMarket = latest.market ?? (state === "draft_ready" && market ? {...market, at} : null);
    tx.update(ref, {instantDraft: {...latest, market: recordedMarket,
      outcome: {state, reasons: state === "draft_ready" ? [] : reasons, at}}, updatedAt: at});
    if (approvedOrganizer) return {state: "draft_ready" as const, organizerId: approvedOrganizer};
    if (outcome.state === "needs_city") return {state: "needs_city" as const, markets: openDraftMarkets()};
    return outcome.state === "draft_ready" ? outcome : {state: "needs_staff" as const, reasons};
  });
}
