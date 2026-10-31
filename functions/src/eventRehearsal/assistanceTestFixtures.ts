import type {Firestore} from "firebase-admin/firestore";
import {practiceMovementSource} from "./movementSource";
import {parsePracticeMovement, practiceMovementId, rehearsalMovements} from
  "./movementRecords";
import {Timestamp} from "firebase-admin/firestore";
import type {EventRehearsalDocument as Session} from
  "../shared/generated/firestoreAdminTypes";
import type {PracticePlan} from "./assistanceRuntime";

export function practiceSession(now = Date.now()): Session {
  const time = Timestamp.fromMillis(now);
  return {organizerId: "organizer-1", ownerUid: "host-1",
    sourceEventId: null, sourceEventRevision: null,
    publicRehearsalId: "practicepublic1234567890",
    viewerTokenHash: "a".repeat(64),
    scenarioId: "lateAndNoShow", seed: 1, actorCount: 2, actionCount: 0,
    status: "running", setup: {title: "Practice",
      locationName: "Practice venue",
      durationMinutes: 120, hostGoal: "Learn", attendeePrompt: "Say hello",
      moduleIds: ["arrival"], movementSimulation: {routePlan: null,
        livePositions: [], lateArrivalGuidance: null,
        itinerary: ["first", "second", "bar", "water"].map((id, i) => ({
          id, title: id, kind: "stop", offsetMinutes: i * 15,
          location: {name: id, latitude: 22.7, longitude: 75.8}}))}},
    setupRevision: 0, runtimeRevision: 1,
    activeStepIndex: 1, virtualStartedAt: time, virtualNow: time,
    faultId: "none", faultConsumed: false, createdAt: time, updatedAt: time,
    expiresAt: Timestamp.fromMillis(now + 86400000), completedAt: null};
}
export function practicePlan(now: number): PracticePlan {
  return {policy: {destination: {kind: "fixedPlace", placeId: "meeting",
    lateEntry: "allowed"}, cutoff: {kind: "eventEnd"}, maxMessagesPerEpisode: 4,
  minimumMinutesBetweenMessages: 5, updateOn: "materialGuidanceChange",
  unanswered: "keepUnknownUntilCutoff"}, guidance: {revision: 1,
    destination: {kind: "fixedPlace", placeId: "meeting", lateEntry: "allowed"},
    materialKey: "venue-1", text: "Meet us at the practice venue.",
    validUntil: now + 7200000}, departureConfirmed: true,
  responseDeadline: null, routes: ["organizerEventWhatsapp", "catchEventSms"],
  deliveryPolicy: {maxAttempts: 3, maxAttemptsPerRoute: 2,
    minimumRetrySeconds: 1}};
}

/** Explicit saved movement fixtures, independent of client-authored plans. */
export function practiceDeparture(session: Session, sessionId: string,
  stopId = "meeting", groupId = "event:whole", revision = 1) {
  const source = practiceMovementSource(sessionId, session, groupId);
  const destination = source.destinations.find(({target: t}) =>
    (t.kind === "fixedPlace" ? t.placeId : t.kind === "itineraryStop" ?
      t.stopId : t.checkpointId) === stopId);
  if (!destination) throw new Error("Test departure is not configured");
  const record = parsePracticeMovement({sessionId,
    clockId: source.context.clockId, groupId, progressRevision: revision,
    departure: {sourceHash: source.sourceHash,
      destination: destination.target, confirmedAt: source.now,
      confirmedBy: "host-1", operationId: "fixture-departure-" + revision,
      roster: null, checkpointRequest: null}, report: null}, source);
  return {record, path: rehearsalMovements + "/" +
    practiceMovementId(source, revision)};
}
export async function savePracticeDeparture(db: Firestore, session: Session,
  sessionId: string, stopId = "meeting", groupId = "event:whole",
  revision = 1) {
  const {record, path} = practiceDeparture(session, sessionId, stopId,
    groupId, revision);
  await db.doc(path).set(record);
  return record;
}
