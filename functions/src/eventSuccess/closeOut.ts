import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {logger} from "firebase-functions";
import type {Firestore} from "firebase-admin/firestore";
import type {SetEventCloseOutCallablePayload} from
  "../shared/generated/setEventCloseOutCallablePayload";
import type {SetEventCloseOutCallableResponse} from
  "../shared/generated/setEventCloseOutCallableResponse";
import {validateSetEventCloseOutCallablePayload} from
  "../shared/generated/validators/setEventCloseOutInput";
import {validateSetEventCloseOutCallableResponse} from
  "../shared/generated/validators/setEventCloseOutOutput";
import {validateEventCloseOutDocument} from
  "../shared/generated/validators/eventCloseOutDocument";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import {
  MOMENTS_COLLECTION,
  momentFromDocument,
  momentToDocument,
} from "../moments/momentDocuments";
import {
  armMoment,
  pauseMoment,
  reviseMoment,
  validateMomentDefinition,
  type LifecycleResult,
  type MomentDefinition,
} from "../moments/momentModel";
import {DEFAULT_SCOPE_TIMEZONE} from "../moments/momentPlanning";
import {replanMoment} from "../moments/momentRunner";
import {requireEventManager} from "./liveControl";
import {
  buildLiveCommandReceipt,
  liveCommandReceiptId,
  liveCommandReceiptRef,
  liveCommandRequestHash,
  matchingLiveCommandReceipt,
} from "./liveCommandReceipts";

/**
 * Close-out: the host's after-the-night choices, saved on
 * `eventCloseOuts/{eventId}`. The thank-you is an event-scope moment (a
 * scheduled push to everyone booked), armed when chosen and paused when
 * not; no new scheduler. Stay-in-touch picks and the no-show note are
 * recorded only: nothing reads them yet (no picks backend, no no-show
 * moment audience).
 *
 * The moment changes run before the close-out transaction, and are
 * idempotent, so a retry with the same requestId converges.
 */

export const EVENT_CLOSE_OUTS = "eventCloseOuts";
const SYSTEM_DAY_BREAK_HOUR = 5;

interface CloseOutDeps {
  firestore: () => Firestore;
  nowMillis: () => number;
  timestampFromMillis: (millis: number) => FirebaseFirestore.Timestamp;
  checkRateLimit?: typeof defaultCheckRateLimit;
  replan?: (db: Firestore, moment: MomentDefinition, now: number) =>
    Promise<unknown>;
}

const defaultDeps: CloseOutDeps = {
  firestore: () => admin.firestore(),
  nowMillis: () => Date.now(),
  timestampFromMillis: (millis) => admin.firestore.Timestamp.fromMillis(millis),
  checkRateLimit: defaultCheckRateLimit,
  replan: replanMoment,
};

/** The thank-you moment's id for an event. */
export function thankYouMomentId(eventId: string): string {
  return `${eventId}_close_out_thank_you`;
}

/**
 * When the thank-you goes: [sendAtLocal] on the morning after the night
 * ends, or the same day when it ends before 5 AM, in [timeZone]; never in
 * the past.
 */
export function thankYouSendAtMillis(
  eventEndMillis: number,
  sendAtLocal: string,
  nowMillis: number,
  timeZone: string = DEFAULT_SCOPE_TIMEZONE
): number {
  const [hour, minute] = sendAtLocal.split(":").map(Number);
  const end = civilParts(eventEndMillis, timeZone);
  const sameDay = end.hour < SYSTEM_DAY_BREAK_HOUR &&
    end.hour * 60 + end.minute < hour * 60 + minute;
  const localAsUtc = Date.UTC(end.year, end.month - 1,
    end.day + (sameDay ? 0 : 1), hour, minute);
  const target = localAsUtc - zoneOffsetMillis(localAsUtc, timeZone);
  return Math.max(target, nowMillis + 60_000);
}

/** The thank-you moment, armed under [actorUid]'s approval. */
export function thankYouMoment(
  eventId: string,
  atMillis: number
): MomentDefinition {
  return {
    momentId: thankYouMomentId(eventId),
    scope: {kind: "event", eventId},
    name: "Thanks for coming",
    initiation: {kind: "scheduled", atMillis},
    sense: "individual",
    audience: {kind: "eventParticipants", statuses: ["signedUp"]},
    action: {
      kind: "push",
      notificationType: "eventFeedback",
      preferenceKey: "eventReminders",
    },
    status: "draft",
    approval: null,
    origin: "organizer",
    revision: 1,
  };
}

/** The local time the thank-you goes when a default arms it; the close-out
 * screen offers the same time.
 */
export const DEFAULT_THANK_YOU_AT_LOCAL = "10:00";

/**
 * Arms the thank-you the morning after the event, unless the event already
 * has one (armed, paused or sent), so a later close-out choice is never
 * overridden. Publishing calls it when the organizer's defaults ask for the
 * thank-you. Returns whether it armed one.
 */
export async function armDefaultThankYou(params: {
  db: Firestore;
  eventId: string;
  actorUid: string;
  eventEndMillis: number;
  nowMillis: number;
  replan?: CloseOutDeps["replan"];
}): Promise<boolean> {
  const {db, eventId, actorUid, eventEndMillis, nowMillis} = params;
  const ref = db.collection(MOMENTS_COLLECTION).doc(thankYouMomentId(eventId));
  if ((await ref.get()).exists) return false;
  await applyThankYouMoment(db, {...defaultDeps, firestore: () => db,
    replan: params.replan ?? defaultDeps.replan}, eventId, actorUid,
  thankYouSendAtMillis(eventEndMillis, DEFAULT_THANK_YOU_AT_LOCAL,
    nowMillis), nowMillis);
  return true;
}

/** Handles one revision-fenced, replay-safe close-out save. */
export async function setEventCloseOutHandler(
  request: CallableRequest<unknown>,
  deps: CloseOutDeps = defaultDeps
): Promise<SetEventCloseOutCallableResponse> {
  const uid = requireAuth(request);
  const payload = validateCallableWithAjv<SetEventCloseOutCallablePayload>(
    request,
    validateSetEventCloseOutCallablePayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, uid, "setEventCloseOut", {
    maxRequests: 20, windowMs: 60 * 1000,
  });
  const event = await requireEventManager(db, payload.eventId, uid);
  if (event.organizerId !== payload.organizerId) {
    throw new HttpsError("permission-denied",
      "This event belongs to another organizer.");
  }
  const closeOutRef = db.collection(EVENT_CLOSE_OUTS).doc(payload.eventId);
  const receiptId = liveCommandReceiptId("setEventCloseOut", uid,
    payload.eventId, payload.requestId);
  const receiptRef = liveCommandReceiptRef(db, receiptId);
  const command: Record<string, unknown> = {...payload};
  delete command.requestId;
  const requestHash = liveCommandRequestHash("setEventCloseOut", command);
  const expected = {receiptId, command: "setEventCloseOut" as const,
    eventId: payload.eventId, actorUid: uid, requestHash};

  // Replays and stale saves stop before any moment changes.
  const [receiptSnap, currentSnap] = await db.getAll(receiptRef, closeOutRef);
  const prior = matchingLiveCommandReceipt(receiptSnap.data(), expected);
  if (prior) return replayResponse(payload.eventId, prior.appliedRevision);
  requireCloseOutRevision(currentSnap.data(), payload.expectedRevision);

  const now = deps.nowMillis();
  const endMillis = timestampMillis(event.endTime) ??
    timestampMillis(event.startTime) ?? now;
  const sendAtMs = payload.thankYou === null ? null :
    thankYouSendAtMillis(endMillis, payload.thankYou.sendAtLocal, now);
  await applyThankYouMoment(db, deps, payload.eventId, uid, sendAtMs, now);

  const response = await db.runTransaction(async (transaction) => {
    const [receipt, current] = await Promise.all([
      transaction.get(receiptRef),
      transaction.get(closeOutRef),
    ]);
    const replay = matchingLiveCommandReceipt(receipt.data(), expected);
    if (replay) return replayResponse(payload.eventId, replay.appliedRevision);
    const revision = requireCloseOutRevision(current.data(),
      payload.expectedRevision) + 1;
    const doc = {
      eventId: payload.eventId,
      organizerId: payload.organizerId,
      revision,
      thankYou: payload.thankYou === null || sendAtMs === null ? null : {
        sendAtLocal: payload.thankYou.sendAtLocal,
        sendAtMs,
        momentId: thankYouMomentId(payload.eventId),
      },
      openStayInTouchPicks: payload.openStayInTouchPicks,
      noShowNote: payload.noShowNote,
      updatedByUid: uid,
      updatedAtMs: now,
    };
    if (!validateEventCloseOutDocument(doc)) {
      throw new HttpsError("internal", "Close-out record is invalid.");
    }
    transaction.set(closeOutRef, doc);
    transaction.create(receiptRef, buildLiveCommandReceipt({
      ...expected, appliedRevision: revision, nowMillis: now,
      timestampFromMillis: deps.timestampFromMillis,
    }));
    return {eventId: payload.eventId, revision, replayed: false};
  });
  if (!validateSetEventCloseOutCallableResponse(response)) {
    throw new HttpsError("internal", "Close-out response is invalid.");
  }
  return response;
}

export const setEventCloseOut = onCall(
  appCheckCallableOptions,
  (request) => setEventCloseOutHandler(request)
);

/**
 * Arms the thank-you at [sendAtMs], or pauses it when [sendAtMs] is null.
 * An armed moment already at that time is left alone.
 */
async function applyThankYouMoment(
  db: Firestore,
  deps: CloseOutDeps,
  eventId: string,
  actorUid: string,
  sendAtMs: number | null,
  now: number
): Promise<void> {
  const ref = db.collection(MOMENTS_COLLECTION).doc(thankYouMomentId(eventId));
  const snap = await ref.get();
  const current = snap.exists ?
    momentFromDocument(snap.data() as Record<string, unknown>) : null;
  if (snap.exists && current === null) {
    throw new HttpsError("failed-precondition",
      "The stored thank-you message is unreadable.");
  }
  let next: MomentDefinition | null = null;
  if (sendAtMs === null) {
    if (current?.status !== "armed") return;
    next = lifecycle(pauseMoment(current));
  } else {
    const wanted = thankYouMoment(eventId, sendAtMs);
    const approval = {approvedByUid: actorUid, approvedAtMillis: now};
    if (current === null) {
      next = lifecycle(armMoment(wanted, approval));
    } else if (current.status === "done") {
      throw new HttpsError("failed-precondition",
        "The thank-you has already been sent.");
    } else if (
      current.status === "armed" &&
      current.initiation.kind === "scheduled" &&
      current.initiation.atMillis === sendAtMs
    ) {
      return;
    } else {
      const revised = lifecycle(reviseMoment(current, {
        name: wanted.name, initiation: wanted.initiation,
        sense: wanted.sense, audience: wanted.audience,
        action: wanted.action,
      }));
      next = lifecycle(armMoment(revised, approval));
    }
  }
  if (validateMomentDefinition(next).length > 0) {
    throw new HttpsError("internal", "Thank-you message is invalid.");
  }
  await ref.set(momentToDocument(next, now, current === null),
    {merge: true});
  try {
    await deps.replan?.(db, next, now);
  } catch (error) {
    // The moments sweep converges whatever this call misses.
    logger.warn("Thank-you replan deferred to sweep", {eventId, error});
  }
}

function lifecycle(result: LifecycleResult): MomentDefinition {
  if (result.kind === "rejected") {
    throw new HttpsError("failed-precondition",
      `The thank-you message cannot change: ${result.reason}.`);
  }
  return result.moment;
}

function requireCloseOutRevision(data: unknown, expected: number): number {
  const stored = data as {revision?: unknown} | undefined;
  const revision = Number.isSafeInteger(stored?.revision) ?
    stored!.revision as number : 0;
  if (revision !== expected) {
    throw new HttpsError("aborted",
      "Close-out changed on another device. Refresh and retry.",
      {reason: "staleCloseOutRevision"});
  }
  return revision;
}

function replayResponse(
  eventId: string,
  revision: number
): SetEventCloseOutCallableResponse {
  return {eventId, revision, replayed: true};
}

function timestampMillis(value: unknown): number | null {
  const stamp = value as {toMillis?: () => number} | null | undefined;
  return typeof stamp?.toMillis === "function" ? stamp.toMillis() : null;
}

interface CivilParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

function civilParts(epochMs: number, timeZone: string): CivilParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, hourCycle: "h23", year: "numeric", month: "2-digit",
    day: "2-digit", hour: "2-digit", minute: "2-digit",
  }).formatToParts(new Date(epochMs));
  const read = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  return {year: read("year"), month: read("month"), day: read("day"),
    hour: read("hour"), minute: read("minute")};
}

function zoneOffsetMillis(utcMillis: number, timeZone: string): number {
  const local = civilParts(utcMillis, timeZone);
  const asUtc = Date.UTC(local.year, local.month - 1, local.day,
    local.hour, local.minute);
  return asUtc - Math.floor(utcMillis / 60_000) * 60_000;
}
