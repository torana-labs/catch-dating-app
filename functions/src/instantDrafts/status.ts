/* eslint-disable max-len */
import {CallableRequest, HttpsError, onCall} from "firebase-functions/v2/https";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {defaultListingApprovalDeps, type ListingApprovalDeps} from "../admin/organizerListingApproval";
import {supplyIntakeCollections} from "../operations/supplyIntake/worker";
import {materializeInstantDraft, type InstantDraftState} from "./materialize";
import {clientAddress} from "./request";
import {
  DRAFT_POLL_MS,
  limiterKey,
  parseGetInstantDraftPayload,
  record,
  STAFF_REPLY,
  storedInstantDraft,
  tokenMatches,
  type DraftPreviewEvent,
  type GetInstantDraftResponse,
} from "./model";

// The draft page polls this with the id and the private token from its URL
// fragment. A finished build that has not been saved yet is saved here as
// well as by the worker, so the page never waits on a lost trigger. A wrong
// id or token answers not-found, so a draft's existence never leaks.

export type GetInstantDraftDeps = ListingApprovalDeps & {checkRateLimit: typeof defaultCheckRateLimit};

const defaultDeps: GetInstantDraftDeps = {...defaultListingApprovalDeps, checkRateLimit: defaultCheckRateLimit};

const TEN_MINUTES = 10 * 60 * 1000;
const PREVIEW_EVENTS = 10;

export async function getInstantDraftHandler(request: CallableRequest<unknown>,
  deps: GetInstantDraftDeps = defaultDeps): Promise<GetInstantDraftResponse> {
  const data = parseGetInstantDraftPayload(request.data);
  const db = deps.firestore();
  await deps.checkRateLimit(db, limiterKey("ip", clientAddress(request)), "getInstantDraftAddress",
    {maxRequests: 600, windowMs: TEN_MINUTES});
  await deps.checkRateLimit(db, limiterKey("draft", data.draftId), "getInstantDraft",
    {maxRequests: 300, windowMs: TEN_MINUTES});
  const ref = db.collection(supplyIntakeCollections.requests).doc(data.draftId);
  const before = (await ref.get()).data();
  const draft = storedInstantDraft(before?.instantDraft);
  if (!draft || !tokenMatches(data.accessToken, draft.accessTokenHash)) {
    throw new HttpsError("not-found", "This draft link is not valid.");
  }
  const state = await materializeInstantDraft(deps, data.draftId);
  const after = (await ref.get()).data() ?? {};
  const link = {provider: draft.link.provider, support: draft.link.support, reason: draft.link.reason};
  const base = {draftId: data.draftId, requestKind: draft.requestKind, link, followUp: STAFF_REPLY};
  return respond(base, state, await preview(db, state, after));
}

export const getInstantDraft = onCall({...appCheckCallableOptions, maxInstances: 10},
  (request) => getInstantDraftHandler(request));

function respond(base: Pick<GetInstantDraftResponse, "draftId" | "requestKind" | "link" | "followUp">,
  state: InstantDraftState, draft: GetInstantDraftResponse["draft"]): GetInstantDraftResponse {
  switch (state.state) {
  case "building":
    // A form link waits for a person; its build only gives staff context.
    return base.requestKind === "form_link" ?
      {...base, status: "staff_follow_up", draft: null, reasons: ["form_import_not_available"], pollAfterMs: null} :
      {...base, status: "building", draft: null, reasons: [], pollAfterMs: DRAFT_POLL_MS};
  case "draft_ready":
    return draft ? {...base, status: "draft_ready", draft, reasons: [], pollAfterMs: null} :
      {...base, status: "staff_follow_up", draft: null, reasons: ["draft_unavailable"], pollAfterMs: null};
  case "needs_staff":
    return {...base, status: "staff_follow_up", draft: null, reasons: state.reasons.slice(0, 20), pollAfterMs: null};
  default:
    throw new HttpsError("not-found", "This draft link is not valid.");
  }
}

/** The saved draft as its page shows it: the organizer and up to ten imported events. */
async function preview(db: FirebaseFirestore.Firestore, state: InstantDraftState,
  stored: Record<string, unknown>): Promise<GetInstantDraftResponse["draft"]> {
  if (state.state !== "draft_ready") return null;
  const organizer = (await db.collection("organizers").doc(state.organizerId).get()).data();
  if (!organizer) return null;
  const result = record(stored.result);
  const eventWorkItemIds = Array.isArray(result?.eventWorkItemIds) ?
    result.eventWorkItemIds.filter((id): id is string => typeof id === "string") : [];
  const items = await Promise.all(eventWorkItemIds.slice(0, PREVIEW_EVENTS).map((id) =>
    db.collection("operationWorkItems").doc(id).get()));
  const events = items.flatMap((snapshot) => {
    const event = record(record(record(record(snapshot.data())?.normalizedPayload)?.intake)?.event);
    return event && typeof event.startAt === "string" && typeof event.sourceUrl === "string" ? [previewEvent(event)] : [];
  }).sort((left, right) => left.startAt.localeCompare(right.startAt));
  const page = record(organizer.publicPage);
  const claim = record(organizer.claim);
  const claimState = claim?.state === "unclaimed" || claim?.state === "claimPending" || claim?.state === "claimed" ?
    claim.state : claim?.state === "verified" ? "claimed" : "unavailable";
  return {
    organizerId: state.organizerId,
    name: text(organizer.name, 160) ?? "Your organizer page",
    description: text(organizer.description, 2000),
    visibility: page?.publishStatus === "published" ? "published" :
      claimState === "claimed" ? "claimed_unpublished" : "private_until_claimed",
    claimState,
    eventCount: Math.min(60, typeof result?.eventCount === "number" ? result.eventCount : eventWorkItemIds.length),
    events,
  };
}

function previewEvent(event: Record<string, unknown>): DraftPreviewEvent {
  return {title: text(event.title, 300), startAt: String(event.startAt).slice(0, 40),
    endAt: text(event.endAt, 40), venue: text(event.venue, 300), sourceUrl: String(event.sourceUrl).slice(0, 2000)};
}

function text(value: unknown, maxLength: number): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, maxLength) : null;
}
