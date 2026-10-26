import {onCall, CallableRequest, HttpsError} from
  "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import type {
  EventDocument,
  EventAttendeeDocument,
  EventParticipationDocument,
  EventRuntimeParticipantDocument,
} from "../shared/generated/firestoreAdminTypes";
import {requireAuth} from "../shared/auth";
import type {StartEventSuccessFirstHelloMissionCallablePayload} from
  "../shared/generated/startEventSuccessFirstHelloMissionCallablePayload";
import type {CompleteEventSuccessFirstHelloMissionCallablePayload} from
  "../shared/generated/completeEventSuccessFirstHelloMissionCallablePayload";
import {
  validateStartEventSuccessFirstHelloMissionCallablePayload,
} from
  "../shared/generated/validators/startEventSuccessFirstHelloMissionInput";
import {
  validateCompleteEventSuccessFirstHelloMissionCallablePayload,
} from
  "../shared/generated/validators/completeEventSuccessFirstHelloMissionInput";
import {validateCallableWithAjv, requireDoc} from "../shared/validation";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {
  appCheckCallableOptions,
  appCheckCallableOptionsWithSecrets,
} from "../shared/callableOptions";
import {normalizeEventIdPayload} from "../events/eventPayloadNormalization";
import {blockDocId} from "../safety/blocking";
import {
  eventParticipationId,
  eventParticipationPatch,
} from "../shared/relationshipDocuments";
import {
  EVENT_SELF_CHECK_IN_WINDOW_AFTER_MINUTES,
  EVENT_SELF_CHECK_IN_WINDOW_BEFORE_MINUTES,
} from "../shared/businessRules";
import {buildAttendanceSignalFact} from "../marketplace/signalBuilders";
import {
  ParticipantSignalFactInput,
  recordParticipantSignalFactsBestEffort,
} from "../marketplace/participantSignals";
import {
  EventSuccessRosterParticipant,
  loadEventSuccessRoster,
  loadEventSuccessRosterParticipant,
} from "./eventSuccessRoster";
import {eventRuntimeParticipantId} from "./eventRuntime";
import {
  eventVenueSessionRedemptionDocument,
  eventVenueSessionRedemptionId,
  eventVenueSessionSigningKey,
  rejectVenueSessionReplay,
  requireEventVenueSessionDocument,
  verifyEventVenueSessionToken,
} from "../events/venueSessions";

const FIRST_HELLO_MODULE_ID = "first_hello_check_in";

interface FirstHelloDeps {
  firestore: () => FirebaseFirestore.Firestore;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  nowMillis: () => number;
  verifyVenueSessionToken?: typeof verifyEventVenueSessionToken;
  checkRateLimit?: typeof defaultCheckRateLimit;
  recordSignalFacts?: (
    db: FirebaseFirestore.Firestore,
    facts: ParticipantSignalFactInput[]
  ) => Promise<void>;
}

interface EventSuccessPlanDocument {
  eventId?: string;
  clubId?: string;
  selectedModuleIds?: unknown;
}

interface FirstHelloAnswerOption {
  id: string;
  label: string;
}

interface FirstHelloMissionDocument {
  eventId: string;
  clubId: string;
  organizerId: string;
  observerUid: string;
  targetUid: string;
  targetDisplayName: string;
  targetContext: string;
  question: string;
  answerOptions: FirstHelloAnswerOption[];
  status: "active" | "completed" | "skipped";
  selectedAnswerId?: string;
  venueSessionId: string;
  venueSessionRedemptionId: string;
  createdAt?: unknown;
  updatedAt?: unknown;
  completedAt?: unknown;
}

type FirstHelloCandidate = EventSuccessRosterParticipant;

const defaultDeps: FirstHelloDeps = {
  firestore: () => admin.firestore(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  nowMillis: () => Date.now(),
  checkRateLimit: defaultCheckRateLimit,
  recordSignalFacts: recordParticipantSignalFactsBestEffort,
  verifyVenueSessionToken: verifyEventVenueSessionToken,
};

const firstHelloAnswerOptions: FirstHelloAnswerOption[] = [
  {id: "people", label: "The people"},
  {id: "activity", label: "The activity"},
  {id: "venue", label: "The venue"},
  {id: "friend", label: "A friend"},
];

/**
 * Starts a server-owned First Hello arrival mission for the caller.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {FirstHelloDeps} deps Injectable dependencies for tests.
 * @return {Promise<object>} Mission id and optional attended flag.
 */
export async function startEventSuccessFirstHelloMissionHandler(
  request: CallableRequest<unknown>,
  deps: FirstHelloDeps = defaultDeps
): Promise<{missionId: string; attended?: boolean}> {
  const observerUid = requireAuth(request);
  const data = validateCallableWithAjv<
    StartEventSuccessFirstHelloMissionCallablePayload
  >(
    request,
    validateStartEventSuccessFirstHelloMissionCallablePayload,
    normalizeFirstHelloPayload
  );

  const db = deps.firestore();
  await deps.checkRateLimit?.(
    db,
    observerUid,
    "startEventSuccessFirstHelloMission",
    {maxRequests: 30, windowMs: 60 * 1000}
  );

  const eventRef = db.collection("events").doc(data.eventId);
  const planRef = db.collection("eventSuccessPlans").doc(data.eventId);
  const missionRef = db
    .collection("eventSuccessArrivalMissions")
    .doc(firstHelloMissionId(data.eventId, observerUid));

  const [
    eventSnap,
    planSnap,
    existingMissionSnap,
  ] = await Promise.all([
    eventRef.get(),
    planRef.get(),
    missionRef.get(),
  ]);

  const event = requireFirstHelloEvent(eventSnap);
  requireFirstHelloPlan(planSnap, data.eventId, event.clubId);
  const viewer = await loadEventSuccessRosterParticipant(
    db,
    data.eventId,
    observerUid
  );
  if (!viewer) {
    throw new HttpsError(
      "failed-precondition",
      "Join this event before using First Hello."
    );
  }
  if (viewer.status === "attended") {
    return {missionId: missionRef.id, attended: true};
  }
  requireCheckInWindow(event, deps.nowMillis());

  if (existingMissionSnap.exists) {
    const existing = requireDoc<FirstHelloMissionDocument>(
      existingMissionSnap,
      "EventSuccessArrivalMissionDocument"
    );
    if (
      existing.eventId === data.eventId &&
      existing.observerUid === observerUid &&
      existing.status === "active"
    ) {
      return {missionId: missionRef.id};
    }
  }

  const nowMillis = deps.nowMillis();
  const claims = (deps.verifyVenueSessionToken ??
    verifyEventVenueSessionToken)({
    token: data.venueSessionToken,
    eventId: data.eventId,
    nowMillis,
  });
  const sessionRef = db.collection("eventVenueSessions")
    .doc(claims.sessionId);
  const redemptionId = eventVenueSessionRedemptionId({
    eventId: data.eventId,
    sessionId: claims.sessionId,
    uid: observerUid,
  });
  const redemptionRef = db.collection("eventVenueSessionRedemptions")
    .doc(redemptionId);

  const target = await chooseFirstHelloTarget({
    db,
    eventId: data.eventId,
    observerUid,
    viewer,
  });
  const now = deps.serverTimestamp();
  const mission = buildFirstHelloMission({
    eventId: data.eventId,
    clubId: event.clubId,

    organizerId: event.organizerId ?? event.clubId,
    observerUid,
    target,
    venueSessionId: claims.sessionId,
    venueSessionRedemptionId: redemptionId,
    now,
  });

  await db.runTransaction(async (tx) => {
    const [currentMissionSnap, sessionSnap, redemptionSnap] =
      await Promise.all([
        tx.get(missionRef),
        tx.get(sessionRef),
        tx.get(redemptionRef),
      ]);
    if (currentMissionSnap.exists) {
      const currentMission = requireDoc<FirstHelloMissionDocument>(
        currentMissionSnap,
        "EventSuccessArrivalMissionDocument"
      );
      if (
        currentMission.eventId === data.eventId &&
        currentMission.observerUid === observerUid &&
        currentMission.status === "active"
      ) return;
    }
    rejectVenueSessionReplay(redemptionSnap);
    requireEventVenueSessionDocument(sessionSnap, claims, nowMillis);
    tx.create(redemptionRef, eventVenueSessionRedemptionDocument({
      claims,
      uid: observerUid,
      purpose: "firstHello",
      now,
      retentionBaseMillis: nowMillis,
    }));
    tx.set(missionRef, mission);
  });

  logger.info(
    "[event-success] First Hello mission started",
    {eventId: data.eventId, observerUid, targetUid: target.uid}
  );

  return {missionId: missionRef.id};
}

/**
 * Completes the caller's First Hello mission and marks attendance.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {FirstHelloDeps} deps Injectable dependencies for tests.
 * @return {Promise<{attended: boolean}>} Result.
 */
export async function completeEventSuccessFirstHelloMissionHandler(
  request: CallableRequest<unknown>,
  deps: FirstHelloDeps = defaultDeps
): Promise<{attended: boolean}> {
  const observerUid = requireAuth(request);
  const data = validateCallableWithAjv<
    CompleteEventSuccessFirstHelloMissionCallablePayload
  >(
    request,
    validateCompleteEventSuccessFirstHelloMissionCallablePayload,
    normalizeFirstHelloPayload
  );

  const db = deps.firestore();
  await deps.checkRateLimit?.(
    db,
    observerUid,
    "completeEventSuccessFirstHelloMission",
    {maxRequests: 30, windowMs: 60 * 1000}
  );

  const eventRef = db.collection("events").doc(data.eventId);
  const planRef = db.collection("eventSuccessPlans").doc(data.eventId);
  const participationRef = db
    .collection("eventParticipations")
    .doc(eventParticipationId(data.eventId, observerUid));
  const runtimeParticipantRef = db
    .collection("eventRuntimeParticipants")
    .doc(eventRuntimeParticipantId(data.eventId, observerUid));
  const missionRef = db
    .collection("eventSuccessArrivalMissions")
    .doc(firstHelloMissionId(data.eventId, observerUid));

  let signalClubId: string | null = null;
  let wasMarkedAttended = false;

  await db.runTransaction(async (tx) => {
    const [
      eventSnap,
      planSnap,
      participationSnap,
      runtimeParticipantSnap,
      missionSnap,
    ] = await Promise.all([
      tx.get(eventRef),
      tx.get(planRef),
      tx.get(participationRef),
      tx.get(runtimeParticipantRef),
      tx.get(missionRef),
    ]);

    const event = requireFirstHelloEvent(eventSnap);
    requireFirstHelloPlan(planSnap, data.eventId, event.clubId);
    const participation = participationSnap.exists ?
      requireSignedUpParticipant(participationSnap, observerUid) : null;
    const runtimeParticipant = participation ? null :
      requireReadyRuntimeParticipant(
        runtimeParticipantSnap,
        data.eventId,
        observerUid
      );
    const runtimeAttendeeRef = runtimeParticipant ? db
      .collection("eventAttendees")
      .doc(runtimeParticipant.eventAttendeeId!) : null;
    const runtimeAttendeeSnap = runtimeAttendeeRef ?
      await tx.get(runtimeAttendeeRef) : null;
    const runtimeAttendee = runtimeAttendeeSnap ? requireRuntimeAttendee(
      runtimeAttendeeSnap,
      data.eventId,
      observerUid,
      ["registered", "checkedIn"]
    ) : null;
    signalClubId = event.clubId;

    if (participation?.status === "attended" ||
        runtimeAttendee?.status === "checkedIn") {
      wasMarkedAttended = false;
      return;
    }

    requireCheckInWindow(event, deps.nowMillis());

    if (!missionSnap.exists) {
      throw new HttpsError(
        "failed-precondition",
        "Start First Hello before completing check-in."
      );
    }
    const mission = requireDoc<FirstHelloMissionDocument>(
      missionSnap,
      "EventSuccessArrivalMissionDocument"
    );
    requireOwnedActiveMission(
      mission,
      data.eventId,
      observerUid,
      data.answerId
    );
    const redemptionRef = db.collection("eventVenueSessionRedemptions")
      .doc(mission.venueSessionRedemptionId);
    const redemptionSnap = await tx.get(redemptionRef);
    requireFirstHelloVenueRedemption(
      redemptionSnap,
      mission,
      data.eventId,
      observerUid
    );

    const targetParticipationRef = db
      .collection("eventParticipations")
      .doc(eventParticipationId(data.eventId, mission.targetUid));
    const targetRuntimeParticipantRef = db
      .collection("eventRuntimeParticipants")
      .doc(eventRuntimeParticipantId(data.eventId, mission.targetUid));
    const observerBlocksTargetRef = db
      .collection("blocks")
      .doc(blockDocId(observerUid, mission.targetUid));
    const targetBlocksObserverRef = db
      .collection("blocks")
      .doc(blockDocId(mission.targetUid, observerUid));

    const [
      targetParticipationSnap,
      targetRuntimeParticipantSnap,
      observerBlocksTargetSnap,
      targetBlocksObserverSnap,
    ] = await Promise.all([
      tx.get(targetParticipationRef),
      tx.get(targetRuntimeParticipantRef),
      tx.get(observerBlocksTargetRef),
      tx.get(targetBlocksObserverRef),
    ]);

    if (targetParticipationSnap.exists) {
      requireAttendedTarget(targetParticipationSnap, mission.targetUid);
    } else {
      const targetRuntime = requireReadyRuntimeParticipant(
        targetRuntimeParticipantSnap,
        data.eventId,
        mission.targetUid
      );
      const targetAttendeeSnap = await tx.get(db
        .collection("eventAttendees")
        .doc(targetRuntime.eventAttendeeId!));
      requireRuntimeAttendee(
        targetAttendeeSnap,
        data.eventId,
        mission.targetUid,
        ["checkedIn"]
      );
    }
    if (observerBlocksTargetSnap.exists || targetBlocksObserverSnap.exists) {
      throw new HttpsError(
        "failed-precondition",
        "First Hello is not available for this attendee."
      );
    }

    const now = deps.serverTimestamp();
    tx.update(eventRef, {
      checkedInCount: admin.firestore.FieldValue.increment(1),
    });
    if (participation) {
      tx.set(participationRef, eventParticipationPatch({
        exists: participationSnap.exists,
        eventId: data.eventId,
        clubId: event.clubId,
        organizerId: event.organizerId ?? event.clubId,
        uid: observerUid,
        status: "attended",
        genderAtSignup: participation.genderAtSignup ?? undefined,
        cohortAtSignup: participation.cohortAtSignup ?? undefined,
        paymentId: participation.paymentId ?? undefined,
      }), {merge: true});
    } else {
      tx.update(runtimeAttendeeRef!, {
        status: "checkedIn",
        checkedInAt: now,
        checkedInBy: observerUid,
        attendanceRevision: (runtimeAttendee!.attendanceRevision ?? 0) + 1,
        preCheckInStatus: runtimeAttendee!.status,
        updatedAt: now,
      });
    }
    tx.set(missionRef, {
      ...mission,
      status: "completed",
      selectedAnswerId: data.answerId,
      completedAt: now,
      updatedAt: now,
    });
    tx.update(redemptionRef, {consumedAt: now});
    wasMarkedAttended = true;
  });

  if (wasMarkedAttended && signalClubId != null) {
    await deps.recordSignalFacts?.(db, [
      buildAttendanceSignalFact({
        eventId: data.eventId,
        clubId: signalClubId,
        uid: observerUid,
        attended: true,
        sourceId: `first_hello_${data.eventId}_${observerUid}`,
      }),
    ]);
  }

  logger.info(
    "[event-success] First Hello mission completed",
    {eventId: data.eventId, observerUid, wasMarkedAttended}
  );

  return {attended: true};
}

export const startEventSuccessFirstHelloMission = onCall(
  appCheckCallableOptionsWithSecrets([eventVenueSessionSigningKey]),
  (request) => startEventSuccessFirstHelloMissionHandler(request)
);

export const completeEventSuccessFirstHelloMission = onCall(
  appCheckCallableOptions,
  (request) => completeEventSuccessFirstHelloMissionHandler(request)
);

/**
 * Picks an attended, compatible, non-blocked First Hello target.
 * @param {object} params Target selection inputs.
 * @param {FirebaseFirestore.Firestore} params.db Firestore instance.
 * @param {string} params.eventId Event id.
 * @param {string} params.observerUid Caller user id.
 * @param {EventSuccessRosterParticipant} params.viewer Caller profile.
 * @return {Promise<FirstHelloCandidate>} Selected target.
 */
async function chooseFirstHelloTarget(params: {
  db: FirebaseFirestore.Firestore;
  eventId: string;
  observerUid: string;
  viewer: EventSuccessRosterParticipant;
}): Promise<FirstHelloCandidate> {
  const {db, eventId, observerUid, viewer} = params;
  const roster = await loadEventSuccessRoster(db, eventId);
  const blockedUids = await fetchUidsBlockedWithViewer(db, observerUid);
  const candidates = roster
    .filter((candidate) => isEligibleFirstHelloCandidate({
      viewer,
      observerUid,
      candidate,
      blockedUids,
    }))
    .sort((a, b) => {
      const preferenceDifference = firstHelloPreferenceRank(viewer, a) -
        firstHelloPreferenceRank(viewer, b);
      if (preferenceDifference !== 0) return preferenceDifference;
      return stableMissionRank({eventId, observerUid, targetUid: a.uid}) -
        stableMissionRank({eventId, observerUid, targetUid: b.uid});
    });

  if (candidates.length > 0) return candidates[0];

  throw new HttpsError(
    "failed-precondition",
    "No First Hello partner is ready yet. Use normal check-in or ask the host."
  );
}

/**
 * Loads every uid on either side of a block edge with the observer.
 * @param {FirebaseFirestore.Firestore} db Firestore instance.
 * @param {string} observerUid Caller user id.
 * @return {Promise<Set<string>>} Blocked or blocking user ids.
 */
async function fetchUidsBlockedWithViewer(
  db: FirebaseFirestore.Firestore,
  observerUid: string
): Promise<Set<string>> {
  const [outgoing, incoming] = await Promise.all([
    db.collection("blocks").where("blockerUserId", "==", observerUid).get(),
    db.collection("blocks").where("blockedUserId", "==", observerUid).get(),
  ]);
  const blocked = new Set<string>();
  for (const doc of outgoing.docs) {
    const blockedUserId = doc.data()?.blockedUserId;
    if (typeof blockedUserId === "string") blocked.add(blockedUserId);
  }
  for (const doc of incoming.docs) {
    const blockerUserId = doc.data()?.blockerUserId;
    if (typeof blockerUserId === "string") blocked.add(blockerUserId);
  }
  return blocked;
}

/**
 * Checks whether a checked-in participant can be assigned.
 * @param {object} params Eligibility inputs.
 * @param {EventSuccessRosterParticipant} params.viewer Caller profile.
 * @param {string} params.observerUid Caller user id.
 * @param {EventSuccessRosterParticipant} params.candidate Candidate edge.
 * @param {Set<string>} params.blockedUids Blocked user ids.
 * @return {boolean} True when assignable.
 */
function isEligibleFirstHelloCandidate(params: {
  viewer: EventSuccessRosterParticipant;
  observerUid: string;
  candidate: EventSuccessRosterParticipant;
  blockedUids: Set<string>;
}): boolean {
  const candidate = params.candidate;
  if (
    candidate.uid === params.observerUid ||
    candidate.status !== "attended" ||
    params.blockedUids.has(candidate.uid)
  ) {
    return false;
  }
  return true;
}

function firstHelloPreferenceRank(
  viewer: EventSuccessRosterParticipant,
  candidate: EventSuccessRosterParticipant
): number {
  if (!viewer.gender || !candidate.gender ||
      viewer.interestedInGenders.length === 0 ||
      candidate.interestedInGenders.length === 0) return 1;
  return viewer.interestedInGenders.includes(candidate.gender) &&
      candidate.interestedInGenders.includes(viewer.gender) ? 0 : 2;
}

/**
 * Builds a persisted First Hello mission.
 * @param {object} params Mission inputs.
 * @param {string} params.eventId Event id.
 * @param {string} params.clubId Club id.
 * @param {string} params.observerUid Caller user id.
 * @param {FirstHelloCandidate} params.target Selected target.
 * @param {FirebaseFirestore.FieldValue} params.now Server timestamp.
 * @return {FirstHelloMissionDocument} Mission document.
 */
function buildFirstHelloMission(params: {
  eventId: string;
  clubId: string;
  organizerId?: string;
  observerUid: string;
  target: FirstHelloCandidate;
  venueSessionId: string;
  venueSessionRedemptionId: string;
  now: FirebaseFirestore.FieldValue;
}): FirstHelloMissionDocument {
  return {
    eventId: params.eventId,
    clubId: params.clubId,
    organizerId: params.organizerId ?? params.clubId,
    observerUid: params.observerUid,
    venueSessionId: params.venueSessionId,
    venueSessionRedemptionId: params.venueSessionRedemptionId,
    targetUid: params.target.uid,
    targetDisplayName: params.target.displayName,
    targetContext: "They are checked in and ready for the same room.",
    question: "Ask them: what made this event sound fun?",
    answerOptions: firstHelloAnswerOptions,
    status: "active",
    createdAt: params.now,
    updatedAt: params.now,
  };
}

/**
 * Requires an active event document.
 * @param {FirebaseFirestore.DocumentSnapshot} snap Event snapshot.
 * @return {EventDocument} Event document.
 */
function requireFirstHelloEvent(snap: FirebaseFirestore.DocumentSnapshot):
  EventDocument {
  if (!snap.exists) {
    throw new HttpsError("not-found", "Event not found.");
  }
  const event = requireDoc<EventDocument>(
    snap,
    "EventDocument"
  );
  if (event.status === "cancelled") {
    throw new HttpsError("failed-precondition", "This event is cancelled.");
  }
  return event;
}

/**
 * Requires a saved event-success plan with First Hello enabled.
 * @param {FirebaseFirestore.DocumentSnapshot} snap Plan snapshot.
 * @param {string} eventId Event id.
 * @param {string} clubId Club id.
 */
function requireFirstHelloPlan(
  snap: FirebaseFirestore.DocumentSnapshot,
  eventId: string,
  clubId: string
) {
  if (!snap.exists) {
    throw new HttpsError(
      "failed-precondition",
      "The host has not enabled live guidance for this event."
    );
  }
  const plan = requireDoc<EventSuccessPlanDocument>(
    snap,
    "EventSuccessPlanDocument"
  );
  if (
    (plan.eventId !== undefined && plan.eventId !== eventId) ||
    (plan.clubId !== undefined && plan.clubId !== clubId) ||
    !moduleSelected(plan.selectedModuleIds, FIRST_HELLO_MODULE_ID)
  ) {
    throw new HttpsError(
      "failed-precondition",
      "First Hello is not enabled for this event."
    );
  }
}

/**
 * Requires a signed-up or already-attended participant.
 * @param {FirebaseFirestore.DocumentSnapshot} snap Participation snapshot.
 * @param {string} uid Expected uid.
 * @return {EventParticipationDocument} Participation document.
 */
function requireSignedUpParticipant(
  snap: FirebaseFirestore.DocumentSnapshot,
  uid: string
): EventParticipationDocument {
  if (!snap.exists) {
    throw new HttpsError(
      "failed-precondition",
      "You must be signed up for this event to use First Hello."
    );
  }
  const participation = requireDoc<EventParticipationDocument>(
    snap,
    "EventParticipationDocument"
  );
  if (
    participation.uid !== uid ||
    (participation.status !== "signedUp" &&
      participation.status !== "attended")
  ) {
    throw new HttpsError(
      "failed-precondition",
      "You must be signed up for this event to use First Hello."
    );
  }
  return participation;
}

function requireReadyRuntimeParticipant(
  snap: FirebaseFirestore.DocumentSnapshot,
  eventId: string,
  uid: string
): EventRuntimeParticipantDocument {
  if (!snap.exists) {
    throw new HttpsError(
      "failed-precondition",
      "Join this event before using First Hello."
    );
  }
  const participant = requireDoc<EventRuntimeParticipantDocument>(
    snap,
    "EventRuntimeParticipantDocument"
  );
  if (
    participant.eventId !== eventId ||
    participant.uid !== uid ||
    participant.accessStatus !== "ready" ||
    !participant.eventAttendeeId
  ) {
    throw new HttpsError(
      "failed-precondition",
      "Join this event before using First Hello."
    );
  }
  return participant;
}

function requireRuntimeAttendee(
  snap: FirebaseFirestore.DocumentSnapshot,
  eventId: string,
  uid: string,
  statuses: EventAttendeeDocument["status"][]
): EventAttendeeDocument {
  if (!snap.exists) {
    throw new HttpsError(
      "failed-precondition",
      "This event runtime attendee is no longer active."
    );
  }
  const attendee = requireDoc<EventAttendeeDocument>(
    snap,
    "EventAttendeeDocument"
  );
  if (
    attendee.eventId !== eventId ||
    attendee.linkedUid !== uid ||
    !statuses.includes(attendee.status)
  ) {
    throw new HttpsError(
      "failed-precondition",
      "This event runtime attendee is no longer active."
    );
  }
  return attendee;
}

/**
 * Requires the mission target to still be checked in.
 * @param {FirebaseFirestore.DocumentSnapshot} snap Target participation snap.
 * @param {string} uid Expected target user id.
 */
function requireAttendedTarget(
  snap: FirebaseFirestore.DocumentSnapshot,
  uid: string
) {
  if (!snap.exists) {
    throw new HttpsError(
      "failed-precondition",
      "This First Hello partner is no longer available."
    );
  }
  const participation = requireDoc<EventParticipationDocument>(
    snap,
    "EventParticipationDocument"
  );
  if (participation.uid !== uid || participation.status !== "attended") {
    throw new HttpsError(
      "failed-precondition",
      "This First Hello partner is no longer available."
    );
  }
}

/**
 * Validates mission ownership, active state, and answer option.
 * @param {FirstHelloMissionDocument} mission Mission document.
 * @param {string} eventId Expected event id.
 * @param {string} observerUid Expected observer uid.
 * @param {string} answerId Selected answer id.
 */
function requireOwnedActiveMission(
  mission: FirstHelloMissionDocument,
  eventId: string,
  observerUid: string,
  answerId: string
) {
  if (
    mission.eventId !== eventId ||
    mission.observerUid !== observerUid ||
    mission.status !== "active"
  ) {
    throw new HttpsError(
      "failed-precondition",
      "This First Hello mission is not active."
    );
  }
  if (!mission.answerOptions.some((option) => option.id === answerId)) {
    throw new HttpsError(
      "invalid-argument",
      "Choose one of the First Hello answer options."
    );
  }
}

function requireFirstHelloVenueRedemption(
  snapshot: FirebaseFirestore.DocumentSnapshot,
  mission: FirstHelloMissionDocument,
  eventId: string,
  observerUid: string
): void {
  if (!snapshot.exists) {
    throw new HttpsError(
      "failed-precondition",
      "First Hello has no valid venue-presence proof. Scan the live Host QR."
    );
  }
  const redemption = snapshot.data() as {
    eventId?: string;
    sessionId?: string;
    uid?: string;
    purpose?: string;
    consumedAt?: unknown;
  };
  if (
    redemption.eventId !== eventId ||
    redemption.sessionId !== mission.venueSessionId ||
    redemption.uid !== observerUid ||
    redemption.purpose !== "firstHello" ||
    redemption.consumedAt != null
  ) {
    throw new HttpsError(
      "failed-precondition",
      "This First Hello venue-presence proof is no longer valid."
    );
  }
}

/**
 * Enforces the shared event check-in time window.
 * @param {EventDocument} event Event document.
 * @param {number} nowMillis Current epoch millis.
 */
function requireCheckInWindow(event: EventDocument, nowMillis: number) {
  const startMillis = event.startTime.toMillis();
  const windowStartMillis = startMillis -
    EVENT_SELF_CHECK_IN_WINDOW_BEFORE_MINUTES * 60 * 1000;
  const windowEndMillis = startMillis +
    EVENT_SELF_CHECK_IN_WINDOW_AFTER_MINUTES * 60 * 1000;
  if (nowMillis < windowStartMillis) {
    throw new HttpsError(
      "failed-precondition",
      `Check-in opens ${EVENT_SELF_CHECK_IN_WINDOW_BEFORE_MINUTES} min ` +
      "before the event starts."
    );
  }
  if (nowMillis > windowEndMillis) {
    throw new HttpsError(
      "failed-precondition",
      "Check-in closed. Contact the host."
    );
  }
}

/**
 * Checks whether a plan includes a module.
 * @param {unknown} selectedModuleIds Persisted module ids.
 * @param {string} moduleId Module id.
 * @return {boolean} True when selected.
 */
function moduleSelected(selectedModuleIds: unknown, moduleId: string): boolean {
  return Array.isArray(selectedModuleIds) &&
    selectedModuleIds.includes(moduleId);
}

/**
 * Builds the deterministic First Hello mission document id.
 * @param {string} eventId Event id.
 * @param {string} uid Observer user id.
 * @return {string} Mission document id.
 */
function firstHelloMissionId(eventId: string, uid: string): string {
  return `${eventId}_${uid}`;
}

/**
 * Builds a deterministic but distributed target ranking.
 * @param {object} params Rank inputs.
 * @param {string} params.eventId Event id.
 * @param {string} params.observerUid Observer user id.
 * @param {string} params.targetUid Candidate user id.
 * @return {number} Stable unsigned rank.
 */
function stableMissionRank(params: {
  eventId: string;
  observerUid: string;
  targetUid: string;
}): number {
  const key = `${params.eventId}:${params.observerUid}:${params.targetUid}`;
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Normalizes First Hello callable string payload fields.
 * @param {unknown} data Raw callable payload.
 * @return {unknown} Normalized payload.
 */
function normalizeFirstHelloPayload(data: unknown): unknown {
  const normalized = normalizeEventIdPayload(data);
  if (
    typeof normalized !== "object" ||
    normalized === null ||
    Array.isArray(normalized)
  ) {
    return normalized;
  }
  const payload = {...normalized} as Record<string, unknown>;
  if (typeof payload.answerId === "string") {
    payload.answerId = payload.answerId.trim();
  }
  return payload;
}
