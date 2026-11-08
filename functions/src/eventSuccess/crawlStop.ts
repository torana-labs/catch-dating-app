import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import type {ChangeEventCrawlStopCallablePayload} from
  "../shared/generated/changeEventCrawlStopCallablePayload";
import type {ChangeEventCrawlStopCallableResponse} from
  "../shared/generated/changeEventCrawlStopCallableResponse";
import {validateChangeEventCrawlStopCallablePayload} from
  "../shared/generated/validators/changeEventCrawlStopInput";
import {validateChangeEventCrawlStopCallableResponse} from
  "../shared/generated/validators/changeEventCrawlStopOutput";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptionsWithLimits} from "../shared/callableOptions";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import {sendEventBroadcastHandler} from "../events/sendEventBroadcast";
import {nextRevision, requireEventManager} from "./liveControl";
import {
  buildLiveCommandReceipt,
  liveCommandReceiptId,
  liveCommandReceiptRef,
  liveCommandRequestHash,
  matchingLiveCommandReceipt,
} from "./liveCommandReceipts";

/**
 * The crawl move's single command: change one stop of tonight's route and
 * tell everyone booked, under one requestId. The change is recorded on the
 * plan as `crawlStopChanges` (keyed by itinerary item id, the published
 * itinerary untouched) with a replay receipt; the message is one event
 * broadcast whose own request id derives from this one, so a retry replays
 * both. The event-assistance runtime config holds late-join automation,
 * not the route, so it is not involved.
 */

type Broadcast = (
  request: CallableRequest<unknown>
) => Promise<{recipientCount: number}>;

interface CrawlStopDeps {
  firestore: () => FirebaseFirestore.Firestore;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  timestampFromMillis: (millis: number) => FirebaseFirestore.Timestamp;
  nowMillis: () => number;
  checkRateLimit?: typeof defaultCheckRateLimit;
  broadcast: Broadcast;
}

const defaultDeps: CrawlStopDeps = {
  firestore: () => admin.firestore(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  timestampFromMillis: (millis) => admin.firestore.Timestamp.fromMillis(millis),
  nowMillis: () => Date.now(),
  checkRateLimit: defaultCheckRateLimit,
  broadcast: (request) => sendEventBroadcastHandler(request),
};

interface CrawlStopChange {
  stopId: string;
  title: string;
  address: string | null;
  changedAtMs: number;
}

/** The broadcast's request id for one crawl change. */
export function crawlBroadcastRequestId(requestId: string): string {
  return `${requestId}-crawl`;
}

/** The plan's stop changes after [change], one entry per stop. */
export function withCrawlStopChange(
  current: CrawlStopChange[],
  change: CrawlStopChange
): CrawlStopChange[] {
  return [
    ...current.filter((existing) => existing.stopId !== change.stopId),
    change,
  ];
}

/** Handles one revision-fenced, replay-safe crawl stop change. */
export async function changeEventCrawlStopHandler(
  request: CallableRequest<unknown>,
  deps: CrawlStopDeps = defaultDeps
): Promise<ChangeEventCrawlStopCallableResponse> {
  const uid = requireAuth(request);
  const payload =
    validateCallableWithAjv<ChangeEventCrawlStopCallablePayload>(
      request,
      validateChangeEventCrawlStopCallablePayload
    );
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, uid, "changeEventCrawlStop", {
    maxRequests: 20, windowMs: 60 * 1000,
  });
  const event = await requireEventManager(db, payload.eventId, uid);
  const stops = Array.isArray(event.itinerary) ? event.itinerary : [];
  if (!stops.some((stop) => stop.id === payload.stopId)) {
    throw new HttpsError("not-found", "That stop is not on tonight's route.");
  }
  const planRef = db.collection("eventSuccessPlans").doc(payload.eventId);
  const receiptId = liveCommandReceiptId("changeEventCrawlStop", uid,
    payload.eventId, payload.requestId);
  const receiptRef = liveCommandReceiptRef(db, receiptId);
  const command: Record<string, unknown> = {...payload};
  delete command.requestId;
  const requestHash = liveCommandRequestHash("changeEventCrawlStop", command);
  const broadcastRequestId = payload.message === null ? undefined :
    crawlBroadcastRequestId(payload.requestId);

  const applied = await db.runTransaction(async (transaction) => {
    const [planSnap, receiptSnap] = await Promise.all([
      transaction.get(planRef),
      transaction.get(receiptRef),
    ]);
    const receipt = matchingLiveCommandReceipt(receiptSnap.data(), {
      receiptId, command: "changeEventCrawlStop", eventId: payload.eventId,
      actorUid: uid, requestHash,
    });
    if (receipt) return {revision: receipt.appliedRevision, replayed: true};
    if (!planSnap.exists) {
      throw new HttpsError("failed-precondition",
        "Event-success setup has not been saved.");
    }
    const plan = planSnap.data() as Record<string, unknown>;
    if (plan.status === "complete") {
      throw new HttpsError("failed-precondition",
        "The night is already over.");
    }
    const revision = Number.isInteger(plan.liveControlRevision) &&
      (plan.liveControlRevision as number) >= 0 ?
      plan.liveControlRevision as number : 0;
    if (revision !== payload.expectedLiveControlRevision) {
      throw new HttpsError("aborted",
        "The night changed on another device. Refresh and retry.",
        {reason: "staleLiveControlRevision"});
    }
    const appliedRevision = nextRevision(revision);
    const now = deps.nowMillis();
    const current = Array.isArray(plan.crawlStopChanges) ?
      plan.crawlStopChanges as CrawlStopChange[] : [];
    transaction.update(planRef, {
      crawlStopChanges: withCrawlStopChange(current, {
        stopId: payload.stopId,
        title: payload.stop.title.trim(),
        address: payload.stop.address?.trim() || null,
        changedAtMs: now,
      }),
      liveControlRevision: appliedRevision,
      updatedAt: deps.serverTimestamp(),
    });
    transaction.create(receiptRef, buildLiveCommandReceipt({
      receiptId, command: "changeEventCrawlStop", eventId: payload.eventId,
      actorUid: uid, requestHash, appliedRevision,
      result: broadcastRequestId ? {broadcastRequestId} : undefined,
      nowMillis: now, timestampFromMillis: deps.timestampFromMillis,
    }));
    return {revision: appliedRevision, replayed: false};
  });

  // The broadcast is idempotent on its own request id, so a replay of
  // this command replays (or finishes) the same message.
  const sent = payload.message === null ? null : await deps.broadcast({
    ...request,
    data: {requestId: broadcastRequestId, eventId: payload.eventId,
      audience: "booked", body: payload.message},
  } as CallableRequest<unknown>);
  const response = {
    eventId: payload.eventId,
    liveControlRevision: applied.revision,
    replayed: applied.replayed,
    recipientCount: sent?.recipientCount ?? null,
  };
  if (!validateChangeEventCrawlStopCallableResponse(response)) {
    throw new HttpsError("internal", "Crawl stop response is invalid.");
  }
  return response;
}

export const changeEventCrawlStop = onCall(
  appCheckCallableOptionsWithLimits({
    concurrency: 2,
    maxInstances: 5,
    timeoutSeconds: 120,
  }),
  (request) => changeEventCrawlStopHandler(request)
);
