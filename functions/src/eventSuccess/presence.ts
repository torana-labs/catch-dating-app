import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import type {EventDocument} from "../shared/generated/firestoreAdminTypes";
import type {EventIdCallablePayload} from
  "../shared/generated/eventIdCallablePayload";
import type {GetEventSuccessPresenceSummaryCallableResponse} from
  "../shared/generated/getEventSuccessPresenceSummaryCallableResponse";
import type {HeartbeatEventSuccessPresenceCallablePayload} from
  "../shared/generated/heartbeatEventSuccessPresenceCallablePayload";
import type {HeartbeatEventSuccessPresenceCallableResponse} from
  "../shared/generated/heartbeatEventSuccessPresenceCallableResponse";
import {
  validateEventIdCallablePayload,
} from "../shared/generated/validators/eventIdInput";
import {
  validateHeartbeatEventSuccessPresenceCallablePayload,
} from
  "../shared/generated/validators/heartbeatEventSuccessPresenceInput";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {
  eventOrganizerRef,
  isEventOrganizerManager,
  requireEventOrganizer,
} from "../shared/eventOrganizers";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {requireDoc, validateCallableWithAjv} from "../shared/validation";
import {
  EventSuccessRosterParticipant,
  loadEventSuccessRoster,
  loadEventSuccessRosterParticipant,
} from "./eventSuccessRoster";

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
  environment: NodeJS.ProcessEnv;
  checkRateLimit?: typeof defaultCheckRateLimit;
}

const DEFAULT_PRESENCE_POLICY: EventSuccessPresencePolicy = {
  heartbeatIntervalSeconds: 30,
  presentWindowSeconds: 90,
  likelyDepartedAfterSeconds: 300,
};

const defaultDeps: EventSuccessPresenceDeps = {
  firestore: () => admin.firestore(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  nowMillis: () => Date.now(),
  environment: process.env,
  checkRateLimit: defaultCheckRateLimit,
};

/** Resolves bounded deployment configuration or the reviewed defaults. */
export function eventSuccessPresencePolicy(
  environment: NodeJS.ProcessEnv = process.env
): EventSuccessPresencePolicy {
  const candidate = {
    heartbeatIntervalSeconds: boundedInteger(
      environment.EVENT_SUCCESS_HEARTBEAT_INTERVAL_SECONDS,
      10,
      300,
      DEFAULT_PRESENCE_POLICY.heartbeatIntervalSeconds
    ),
    presentWindowSeconds: boundedInteger(
      environment.EVENT_SUCCESS_PRESENCE_PRESENT_SECONDS,
      30,
      900,
      DEFAULT_PRESENCE_POLICY.presentWindowSeconds
    ),
    likelyDepartedAfterSeconds: boundedInteger(
      environment.EVENT_SUCCESS_PRESENCE_LIKELY_DEPARTED_SECONDS,
      60,
      3600,
      DEFAULT_PRESENCE_POLICY.likelyDepartedAfterSeconds
    ),
  };
  if (
    candidate.heartbeatIntervalSeconds > candidate.presentWindowSeconds ||
    candidate.presentWindowSeconds >= candidate.likelyDepartedAfterSeconds
  ) {
    return {...DEFAULT_PRESENCE_POLICY};
  }
  return candidate;
}

/** Derives liveness from the server clock; no stale state enum is persisted. */
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
      clubId: event.clubId,
      organizerId: event.organizerId ?? event.clubId,
      uid,
      surface: payload.surface,
      heartbeatAt: now,
      createdAt: current.exists ? current.data()!.createdAt : now,
      updatedAt: now,
    });
  });
  const policy = eventSuccessPresencePolicy(deps.environment);
  return {
    presenceState: "present",
    serverTimeMillis: deps.nowMillis(),
    ...policy,
  };
}

/** Returns a Host-only, server-clock-derived presence and late-arrival view. */
export async function getEventSuccessPresenceSummaryHandler(
  request: CallableRequest<unknown>,
  deps: EventSuccessPresenceDeps = defaultDeps
): Promise<GetEventSuccessPresenceSummaryCallableResponse> {
  const hostUid = requireAuth(request);
  const payload = validateCallableWithAjv<EventIdCallablePayload>(
    request,
    validateEventIdCallablePayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit?.(
    db,
    hostUid,
    "getEventSuccessPresenceSummary",
    {maxRequests: 6, windowMs: 60 * 1000}
  );
  const [eventSnap, planSnap] = await Promise.all([
    db.collection("events").doc(payload.eventId).get(),
    db.collection("eventSuccessPlans").doc(payload.eventId).get(),
  ]);
  if (!eventSnap.exists) {
    throw new HttpsError("not-found", "Event not found.");
  }
  if (!planSnap.exists) {
    throw new HttpsError(
      "failed-precondition",
      "Event-success setup has not been saved."
    );
  }
  const event = requireDoc<EventDocument>(eventSnap, "EventDocument");
  const organizerSnap = await eventOrganizerRef(db, event).get();
  const organizer = requireEventOrganizer(organizerSnap, event);
  if (!isEventOrganizerManager(organizer, event, hostUid)) {
    throw new HttpsError(
      "permission-denied",
      "Only an organizer manager can review event presence."
    );
  }
  const plan = planSnap.data()!;
  const publishedRoundIndex = integerOr(
    plan.publishedRotationRoundIndex,
    -1
  );
  if (publishedRoundIndex >= 100) {
    throw new HttpsError(
      "failed-precondition",
      "The rotation schedule has no later round to prepare."
    );
  }
  const nextRoundIndex = publishedRoundIndex + 1;
  const [roster, presenceSnap, draftSnap, resolutionSnap] = await Promise.all([
    loadEventSuccessRoster(db, payload.eventId),
    db.collection("eventSuccessPresence")
      .where("eventId", "==", payload.eventId)
      .limit(200)
      .get(),
    db.collection("eventSuccessAssignmentDrafts")
      .where("eventId", "==", payload.eventId)
      .limit(200)
      .get(),
    db.collection("eventSuccessLateArrivals")
      .where("eventId", "==", payload.eventId)
      .limit(200)
      .get(),
  ]);
  const nowMillis = deps.nowMillis();
  const policy = eventSuccessPresencePolicy(deps.environment);
  const checkedInByUid = new Map(
    roster
      .filter((participant) => participant.status === "attended")
      .map((participant) => [participant.uid, participant])
  );
  const entries = presenceSnap.docs.flatMap((doc) => {
    const data = doc.data();
    const participant = typeof data.uid === "string" ?
      checkedInByUid.get(data.uid) : undefined;
    const heartbeatAtMillis = timestampMillis(data.heartbeatAt);
    if (
      data.eventId !== payload.eventId ||
      participant === undefined ||
      heartbeatAtMillis === null
    ) return [];
    return [{
      uid: participant.uid,
      displayName: boundedDisplayName(participant),
      presenceState: deriveEventSuccessPresenceState({
        heartbeatAtMillis,
        nowMillis,
        policy,
      }),
      heartbeatAtMillis,
    }];
  }).sort((left, right) => left.uid.localeCompare(right.uid));
  const draftedUids = new Set(draftSnap.docs.flatMap((doc) => {
    const data = doc.data();
    const assignment = recordValue(data.assignment);
    return data.roundIndex === nextRoundIndex &&
      data.baseAssignmentRevision === integerOr(
        plan.assignmentDraftRevision,
        0
      ) &&
      typeof assignment?.uid === "string" ? [assignment.uid] : [];
  }));
  const resolvedUids = new Set(resolutionSnap.docs.flatMap((doc) => {
    const data = doc.data();
    return data.targetRoundIndex === nextRoundIndex &&
      typeof data.uid === "string" ? [data.uid] : [];
  }));
  const eventStartMillis = event.startTime.toMillis();
  const lateArrivals = roster
    .filter((participant) =>
      participant.status === "attended" &&
      participant.attendedAtMillis !== undefined &&
      participant.attendedAtMillis > eventStartMillis &&
      !draftedUids.has(participant.uid) &&
      !resolvedUids.has(participant.uid)
    )
    .map((participant) => ({
      uid: participant.uid,
      displayName: boundedDisplayName(participant),
      checkedInAtMillis: participant.attendedAtMillis!,
    }))
    .sort((left, right) =>
      left.checkedInAtMillis - right.checkedInAtMillis ||
      left.uid.localeCompare(right.uid)
    );
  return {
    serverTimeMillis: nowMillis,
    liveControlRevision: nonNegativeInteger(plan.liveControlRevision),
    nextRoundIndex,
    policy,
    entries,
    lateArrivals,
  };
}

export const heartbeatEventSuccessPresence = onCall(
  appCheckCallableOptions,
  (request) => heartbeatEventSuccessPresenceHandler(request)
);

export const getEventSuccessPresenceSummary = onCall(
  appCheckCallableOptions,
  (request) => getEventSuccessPresenceSummaryHandler(request)
);

export function eventSuccessPresenceId(eventId: string, uid: string): string {
  return `${eventId}_${uid}`;
}

function boundedInteger(
  value: string | undefined,
  minimum: number,
  maximum: number,
  fallback: number
): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum ?
    parsed : fallback;
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

function boundedDisplayName(participant: EventSuccessRosterParticipant):
  string {
  const displayName = participant.displayName.trim() || "Guest";
  return displayName.slice(0, 120);
}

function nonNegativeInteger(value: unknown): number {
  return Number.isInteger(value) && (value as number) >= 0 ?
    value as number : 0;
}

function integerOr(value: unknown, fallback: number): number {
  return Number.isInteger(value) ? value as number : fallback;
}

function recordValue(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ?
    value as Record<string, unknown> : null;
}
