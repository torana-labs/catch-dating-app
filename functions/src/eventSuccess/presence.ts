import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import type {EventDocument} from "../shared/generated/firestoreAdminTypes";
import type {HeartbeatEventSuccessPresenceCallablePayload} from
  "../shared/generated/heartbeatEventSuccessPresenceCallablePayload";
import type {HeartbeatEventSuccessPresenceCallableResponse} from
  "../shared/generated/heartbeatEventSuccessPresenceCallableResponse";
import {
  validateHeartbeatEventSuccessPresenceCallablePayload,
} from
  "../shared/generated/validators/heartbeatEventSuccessPresenceInput";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {requireDoc, validateCallableWithAjv} from "../shared/validation";
import {loadEventSuccessRosterParticipant} from "./eventSuccessRoster";
import {eventSuccessPresencePolicyCatalog} from "./presencePolicy";

export type EventSuccessPresenceState =
  "present" | "idle" | "likelyDeparted";

export interface EventSuccessPresencePolicy {
  heartbeatIntervalSeconds: number;
  presentWindowSeconds: number;
  likelyDepartedAfterSeconds: number;
}

interface EventSuccessPresenceDeps {
  firestore: () => FirebaseFirestore.Firestore;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  nowMillis: () => number;
  checkRateLimit?: typeof defaultCheckRateLimit;
}

const defaultDeps: EventSuccessPresenceDeps = {
  firestore: () => admin.firestore(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  nowMillis: () => Date.now(),
  checkRateLimit: defaultCheckRateLimit,
};

/**
 * The presence timing every surface shares: the heartbeat callable returns
 * it, rotation generation and late placement apply it on the server clock,
 * and the manager's phone applies the same catalog to its own clock.
 */
export function eventSuccessPresencePolicy(): EventSuccessPresencePolicy {
  return {...eventSuccessPresencePolicyCatalog};
}

/** Derives liveness from a clock; no stale state enum is persisted. */
export function deriveEventSuccessPresenceState(params: {
  heartbeatAtMillis: number;
  nowMillis: number;
  policy: EventSuccessPresencePolicy;
}): EventSuccessPresenceState {
  const elapsedMillis = Math.max(
    0,
    params.nowMillis - params.heartbeatAtMillis
  );
  if (elapsedMillis <= params.policy.presentWindowSeconds * 1000) {
    return "present";
  }
  if (elapsedMillis <= params.policy.likelyDepartedAfterSeconds * 1000) {
    return "idle";
  }
  return "likelyDeparted";
}

/** Returns only monitored eligible attendees whose heartbeat has expired. */
export async function loadLikelyDepartedEventSuccessUids(params: {
  db: FirebaseFirestore.Firestore;
  eventId: string;
  eligibleUids: ReadonlySet<string>;
  nowMillis: number;
  policy?: EventSuccessPresencePolicy;
}): Promise<Set<string>> {
  if (params.eligibleUids.size === 0) return new Set();
  const snapshot = await params.db.collection("eventSuccessPresence")
    .where("eventId", "==", params.eventId)
    .limit(200)
    .get();
  const policy = params.policy ?? eventSuccessPresencePolicy();
  return new Set(snapshot.docs.flatMap((doc) => {
    const data = doc.data();
    const heartbeatAtMillis = timestampMillis(data.heartbeatAt);
    return data.eventId === params.eventId &&
      typeof data.uid === "string" &&
      params.eligibleUids.has(data.uid) &&
      heartbeatAtMillis !== null &&
      deriveEventSuccessPresenceState({
        heartbeatAtMillis,
        nowMillis: params.nowMillis,
        policy,
      }) === "likelyDeparted" ? [data.uid] : [];
  }));
}

/** Records one authenticated checked-in attendee heartbeat. */
export async function heartbeatEventSuccessPresenceHandler(
  request: CallableRequest<unknown>,
  deps: EventSuccessPresenceDeps = defaultDeps
): Promise<HeartbeatEventSuccessPresenceCallableResponse> {
  const uid = requireAuth(request);
  const payload =
    validateCallableWithAjv<HeartbeatEventSuccessPresenceCallablePayload>(
      request,
      validateHeartbeatEventSuccessPresenceCallablePayload
    );
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, uid, "heartbeatEventSuccessPresence", {
    maxRequests: 6, windowMs: 60 * 1000,
  });
  const [eventSnap, participant] = await Promise.all([
    db.collection("events").doc(payload.eventId).get(),
    loadEventSuccessRosterParticipant(db, payload.eventId, uid),
  ]);
  if (!eventSnap.exists) {
    throw new HttpsError("not-found", "Event not found.");
  }
  const event = requireDoc<EventDocument>(eventSnap, "EventDocument");
  if (event.status === "cancelled") {
    throw new HttpsError("failed-precondition", "This event was cancelled.");
  }
  if (participant?.status !== "attended") {
    throw new HttpsError(
      "failed-precondition",
      "Presence starts after this attendee is checked in."
    );
  }
  const now = deps.serverTimestamp();
  const presenceRef = db.collection("eventSuccessPresence")
    .doc(eventSuccessPresenceId(payload.eventId, uid));
  await db.runTransaction(async (transaction) => {
    const current = await transaction.get(presenceRef);
    transaction.set(presenceRef, {
      eventId: payload.eventId,
      organizerId: event.organizerId,
      uid,
      surface: payload.surface,
      heartbeatAt: now,
      createdAt: current.exists ? current.data()!.createdAt : now,
      updatedAt: now,
    });
  });
  const policy = eventSuccessPresencePolicy();
  return {
    presenceState: "present",
    serverTimeMillis: deps.nowMillis(),
    ...policy,
  };
}

export const heartbeatEventSuccessPresence = onCall(
  appCheckCallableOptions,
  (request) => heartbeatEventSuccessPresenceHandler(request)
);

export function eventSuccessPresenceId(eventId: string, uid: string): string {
  return `${eventId}_${uid}`;
}

function timestampMillis(value: unknown): number | null {
  if (
    value !== null &&
    typeof value === "object" &&
    "toMillis" in value &&
    typeof value.toMillis === "function"
  ) {
    const millis = value.toMillis();
    return Number.isFinite(millis) && millis >= 0 ? millis : null;
  }
  return null;
}
