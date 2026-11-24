/** Participant self-check-in backed by a live, signed Host venue session. */

import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {prepareMarkBookingAttended} from
  "../domain/bookings/bookingAttendance";
import * as logger from "firebase-functions/logger";
import {requireAuth} from "../shared/auth";
import type {SelfCheckInAttendanceCallablePayload} from
  "../shared/generated/selfCheckInAttendanceCallablePayload";
import {
  validateSelfCheckInAttendanceCallablePayload,
} from "../shared/generated/validators/selfCheckInAttendanceInput";
import {validateCallableWithAjv} from "../shared/validation";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import type {EventDocument} from "../shared/generated/firestoreAdminTypes";
import {appCheckCallableOptionsWithSecrets} from
  "../shared/callableOptions";
import {eventParticipationId} from "../shared/relationshipDocuments";
import {normalizeEventIdPayload} from "./eventPayloadNormalization";
import {buildAttendanceSignalFact} from "../marketplace/signalBuilders";
import {recordParticipantSignalFactsBestEffort} from
  "../marketplace/participantSignals";
import {incrementInviteLinkCounterBestEffort} from "./inviteLinks";
import {
  assertEventCheckInWindow,
  eventVenueSessionRedemptionDocument,
  eventVenueSessionRedemptionId,
  eventVenueSessionSigningKey,
  rejectVenueSessionReplay,
  requireEventVenueSessionDocument,
  verifyEventVenueSessionToken,
} from "./venueSessions";

interface SelfCheckInDeps {
  firestore: () => FirebaseFirestore.Firestore;
  now: () => FirebaseFirestore.Timestamp;
  checkRateLimit?: typeof defaultCheckRateLimit;
  verifyToken?: typeof verifyEventVenueSessionToken;
  recordSignalFacts?: typeof recordParticipantSignalFactsBestEffort;
  incrementInviteLink?: typeof incrementInviteLinkCounterBestEffort;
}

const defaultDeps: SelfCheckInDeps = {
  firestore: () => admin.firestore(),
  now: () => admin.firestore.Timestamp.now(),
  checkRateLimit: defaultCheckRateLimit,
  verifyToken: verifyEventVenueSessionToken,
  recordSignalFacts: recordParticipantSignalFactsBestEffort,
  incrementInviteLink: incrementInviteLinkCounterBestEffort,
};

/** Redeems a live Host venue session and marks a Consumer booking attended. */
export async function selfCheckInAttendanceHandler(
  request: CallableRequest<unknown>,
  deps: SelfCheckInDeps = defaultDeps
): Promise<{userId: string; attended: true}> {
  const userId = requireAuth(request);
  const {eventId, venueSessionToken} = validateCallableWithAjv<
    SelfCheckInAttendanceCallablePayload
  >(
    request,
    validateSelfCheckInAttendanceCallablePayload,
    normalizeEventIdPayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, userId, "selfCheckInAttendance", {
    maxRequests: 5, windowMs: 60 * 1000,
  });
  const now = deps.now();
  const claims = deps.verifyToken!({
    token: venueSessionToken,
    eventId,
    nowMillis: now.toMillis(),
  });
  const eventRef = db.collection("events").doc(eventId);
  const participationRef = db.collection("eventBookings")
    .doc(eventParticipationId(eventId, userId));
  const sessionRef = db.collection("eventVenueSessions")
    .doc(claims.sessionId);
  const redemptionId = eventVenueSessionRedemptionId({
    eventId,
    sessionId: claims.sessionId,
    uid: userId,
  });
  const redemptionRef = db.collection("eventVenueSessionRedemptions")
    .doc(redemptionId);

  let inviteLinkId: string | null | undefined;
  let signalOrganizerId: string | null = null;
  let changed = false;
  await db.runTransaction(async (tx) => {
    const [eventSnap, participationSnap, sessionSnap, redemptionSnap,
      attendance] = await Promise.all([
      tx.get(eventRef),
      tx.get(participationRef),
      tx.get(sessionRef),
      tx.get(redemptionRef),
      prepareMarkBookingAttended({db, tx, eventId, uid: userId}),
    ]);
    if (!eventSnap.exists) {
      throw new HttpsError("not-found", "Event not found.");
    }
    const event = eventSnap.data() as EventDocument;
    if (event.status === "cancelled") {
      throw new HttpsError(
        "failed-precondition",
        "This event has been cancelled."
      );
    }
    const participation = participationSnap.exists ?
      participationSnap.data() as {
        status?: string;
        inviteLinkId?: string | null;
      } : null;
    if (
      participation?.status !== "signedUp" &&
      participation?.status !== "attended"
    ) {
      throw new HttpsError(
        "failed-precondition",
        "You must be signed up for this event to check in."
      );
    }
    inviteLinkId = participation.inviteLinkId;
    rejectVenueSessionReplay(redemptionSnap);
    if (participation.status === "attended") return;
    assertEventCheckInWindow(event, now.toMillis());
    requireEventVenueSessionDocument(sessionSnap, claims, now.toMillis());
    tx.create(redemptionRef, eventVenueSessionRedemptionDocument({
      claims,
      uid: userId,
      purpose: "attendance",
      now,
      retentionBaseMillis: now.toMillis(),
    }));
    attendance.apply({bookingSnap: participationSnap,
      organizerId: event.organizerId});
    signalOrganizerId = event.organizerId;
    changed = true;
  });

  if (changed && signalOrganizerId != null) {
    await deps.incrementInviteLink?.({
      db,
      inviteLinkId,
      field: "checkedInCount",
    });
    await deps.recordSignalFacts?.(db, [
      buildAttendanceSignalFact({
        eventId,
        organizerId: signalOrganizerId,
        uid: userId,
        attended: true,
        sourceId: `self_check_in_${eventId}_${userId}`,
      }),
    ]);
  }
  logger.info("[attendance] Signed venue check-in", {eventId, userId});
  return {userId, attended: true};
}

export const selfCheckInAttendance = onCall(
  appCheckCallableOptionsWithSecrets([eventVenueSessionSigningKey]),
  (request) => selfCheckInAttendanceHandler(request)
);
