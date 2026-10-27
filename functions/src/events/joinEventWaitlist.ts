import {eventAgeEligibility} from "../profiles/eventProfileRequirements";
import {hasEventCommunityMembership} from
  "../memberships/communityMembershipAuthority";
import {onCall, HttpsError, CallableRequest} from
  "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import type {
  EventDocument,
  UserProfileDocument,
} from "../shared/generated/firestoreAdminTypes";
import {requireAuth} from "../shared/auth";
import {assertNoBlockingRelationshipInTransaction} from "../safety/blocking";
import {appCheckCallableOptions} from "../shared/callableOptions";
import type {
  EventIdCallablePayload,
} from "../shared/generated/eventIdCallablePayload";
import {
  validateEventIdCallablePayload,
} from "../shared/generated/validators/eventIdInput";
import {validateCallableWithAjv} from "../shared/validation";
import {
  participantUids,
  eventParticipationId,
  eventWaitlistOfferId,
  eventParticipationPatch,
  eventParticipationsByStatusInTransaction,
} from "../shared/relationshipDocuments";
import {checkRateLimit} from "../shared/rateLimit";
import {
  claimUserEventScheduleInTransaction,
  releaseUserEventScheduleInTransaction,
} from "./scheduleConflicts";
import {normalizeEventIdPayload} from "./eventPayloadNormalization";
import {requireCatchBookingAuthority} from "./eventOrigin";
import {requirePublicConfiguredEvent, requireEventTimeRange} from
  "./configuredEvent";
import {readSeatMigrationWriterFence} from "./seatMigrationPaged";
import {
  cohortIdForUser,
  eventPolicyFromEvent,
  incrementCount,
  decrementCount,
  normalizeInviteCode,
  assertPolicyAllowsMembership,
} from "./eventPolicy";
import {assertBookingReadyUserProfile} from "../shared/profileReadiness";
import {assertRunPreferencesReadyForEvent} from
  "../shared/runPreferencesReadiness";
import {
  incrementInviteLinkCounterInTransaction,
  inviteAttributionWriteFields,
  resolveInviteAttribution,
  InviteAttribution,
} from "./inviteLinks";

interface WaitlistDeps {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit: typeof checkRateLimit;
  resolveInviteAttribution: (params: {db: FirebaseFirestore.Firestore;
    eventId: string; inviteLinkId?: string | null}) =>
    Promise<InviteAttribution | null>;
}

const defaultDeps: WaitlistDeps = {
  firestore: () => admin.firestore(), checkRateLimit,
  resolveInviteAttribution,
};

/**
 * Adds a user to an event waitlist after applying the same block boundary as
 * booking. Kept server-side so block state is not exposed through rules.
 */
export async function joinEventWaitlistHandler(
  request: CallableRequest<unknown>, deps: WaitlistDeps = defaultDeps
): Promise<{waitlisted: boolean}> {
  const userId = requireAuth(request);
  const {eventId, inviteCode, inviteLinkId} =
    validateCallableWithAjv<EventIdCallablePayload>(
      request,
      validateEventIdCallablePayload,
      normalizeEventIdPayload
    );

  const db = deps.firestore();
  await deps.checkRateLimit(db, userId, "joinEventWaitlist", {
    maxRequests: 10, windowMs: 60 * 1000,
  });
  const inviteAttribution = await deps.resolveInviteAttribution({
    db,
    eventId,
    inviteLinkId,
  });

  const eventRef = db.collection("events").doc(eventId);
  const participationRef = db
    .collection("eventParticipations")
    .doc(eventParticipationId(eventId, userId));

  await db.runTransaction(async (tx) => {
    const [
      eventSnap,
      userSnap,
      participationSnap,
      activeParticipations,
      privateAccessSnap,
    ] =
      await Promise.all([
        tx.get(eventRef),
        tx.get(db.collection("users").doc(userId)),
        tx.get(participationRef),
        eventParticipationsByStatusInTransaction(tx, db, eventId, [
          "signedUp",
          "attended",
        ]),
        tx.get(db.collection("eventPrivateAccess").doc(eventId)),
      ]);
    if (!eventSnap.exists) {
      throw new HttpsError("not-found", "Event not found.");
    }
    if (!userSnap.exists) {
      throw new HttpsError("not-found", "User profile not found.");
    }
    await readSeatMigrationWriterFence({db, tx, eventId});

    const event = eventSnap.data() as EventDocument;
    const user = userSnap.data() as UserProfileDocument;
    if (event.status === "cancelled") {
      throw new HttpsError(
        "failed-precondition",
        "This event has been cancelled."
      );
    }
    requireCatchBookingAuthority(event);
    const configuredEvent = requirePublicConfiguredEvent(event);
    const existingParticipation = participationSnap.exists ?
      participationSnap.data() as {status?: string} :
      null;
    if (
      existingParticipation?.status === "signedUp" ||
      existingParticipation?.status === "attended"
    ) {
      throw new HttpsError(
        "already-exists",
        "You are already booked for this event."
      );
    }

    assertBookingReadyUserProfile(user, event);
    if (eventAgeEligibility(event, user, new Date())?.eligible === false) {
      throw new HttpsError("failed-precondition",
        "Your age does not meet this event's requirements.");
    }
    assertRunPreferencesReadyForEvent(user, event);

    if (existingParticipation?.status === "waitlisted") {
      return;
    }

    await assertNoBlockingRelationshipInTransaction(
      tx,
      db,
      userId,
      participantUids(activeParticipations)
    );

    const policy = eventPolicyFromEvent(event);
    const submittedInviteCode = normalizeInviteCode(inviteCode);
    const storedInviteCode = normalizeInviteCode(
      privateAccessSnap.data()?.inviteCode
    );
    const hasValidInvite =
      storedInviteCode !== null &&
      submittedInviteCode !== null &&
      storedInviteCode.toLowerCase() === submittedInviteCode.toLowerCase();
    if (policy.admission.inviteRequired && !hasValidInvite) {
      throw new HttpsError(
        "failed-precondition",
        "Enter a valid invite code to join the waitlist."
      );
    }

    assertPolicyAllowsMembership({policy,
      hasActiveCommunityMembership: await hasEventCommunityMembership({
        db, tx, organizerId: event.organizerId ?? event.clubId, uid: userId,
        policy,
      }),
    });
    const cohortAtSignup = cohortIdForUser(user);
    await claimUserEventScheduleInTransaction(tx, db, {
      uid: userId,
      eventId,
      clubId: event.clubId,

      organizerId: event.organizerId ?? event.clubId,
      startTimeMillis: event.startTime.toMillis(),
      endTimeMillis: configuredEvent.endTime.toMillis(),
    });

    tx.update(eventRef, {
      waitlistedCount: admin.firestore.FieldValue.increment(1),
      waitlistedCohortCounts: incrementCount(
        event.waitlistedCohortCounts ?? {},
        cohortAtSignup
      ),
    });
    tx.set(participationRef, {
      ...eventParticipationPatch({
        exists: participationSnap.exists,
        eventId,
        clubId: event.clubId,

        organizerId: event.organizerId ?? event.clubId,
        uid: userId,
        status: "waitlisted",
        genderAtSignup: user.gender,
        cohortAtSignup,
      }),
      ...inviteAttributionWriteFields(inviteAttribution),
    }, {merge: true});
    incrementInviteLinkCounterInTransaction({
      tx,
      db,
      attribution: inviteAttribution,
      field: "requestCount",
    });
    tx.set(participationRef, {
      waitlistOfferStatus: admin.firestore.FieldValue.delete(),
      waitlistOfferedAt: admin.firestore.FieldValue.delete(),
      waitlistOfferExpiresAt: admin.firestore.FieldValue.delete(),
      waitlistOfferAcceptedAt: admin.firestore.FieldValue.delete(),
      waitlistOfferId: admin.firestore.FieldValue.delete(),
      ...(policy.admission.manualApprovalRequired ? {
        hostApprovalStatus: "pending",
        hostApprovalDecidedAt: null,
        hostApprovalDecidedBy: null,
      } : {
        hostApprovalStatus: admin.firestore.FieldValue.delete(),
        hostApprovalDecidedAt: admin.firestore.FieldValue.delete(),
        hostApprovalDecidedBy: admin.firestore.FieldValue.delete(),
      }),
    }, {merge: true});
  });

  return {waitlisted: true};
}

export const joinEventWaitlist = onCall(appCheckCallableOptions,
  (request) => joinEventWaitlistHandler(request));

/**
 * Removes the caller from an event waitlist through the same callable boundary
 * as joining, so clients never update the canonical event document directly.
 */
export async function leaveEventWaitlistHandler(
  request: CallableRequest<unknown>, deps: WaitlistDeps = defaultDeps
): Promise<{waitlisted: boolean}> {
  const userId = requireAuth(request);
  const {eventId} = validateCallableWithAjv<EventIdCallablePayload>(
    request,
    validateEventIdCallablePayload,
    normalizeEventIdPayload
  );

  const db = deps.firestore();
  await deps.checkRateLimit(db, userId, "leaveEventWaitlist", {
    maxRequests: 10, windowMs: 60 * 1000,
  });

  const eventRef = db.collection("events").doc(eventId);
  const participationRef = db
    .collection("eventParticipations")
    .doc(eventParticipationId(eventId, userId));
  const offerRef = db
    .collection("eventWaitlistOffers")
    .doc(eventWaitlistOfferId(eventId, userId));

  await db.runTransaction(async (tx) => {
    const [eventSnap, participationSnap, offerSnap] = await Promise.all([
      tx.get(eventRef),
      tx.get(participationRef),
      tx.get(offerRef),
    ]);
    if (!eventSnap.exists) {
      throw new HttpsError("not-found", "Event not found.");
    }
    await readSeatMigrationWriterFence({db, tx, eventId});

    const event = eventSnap.data() as EventDocument;
    const existingParticipation = participationSnap.exists ?
      participationSnap.data() as {status?: string} :
      null;
    const isWaitlisted = existingParticipation?.status === "waitlisted";

    if (!isWaitlisted) {
      return;
    }
    const scheduledEvent = requireEventTimeRange(event);

    const cohortAtSignup =
      (existingParticipation as {cohortAtSignup?: string} | null)
        ?.cohortAtSignup;
    const currentWaitlistedCount =
      event.waitlistedCount ?? 1;
    tx.update(eventRef, {
      waitlistedCount: Math.max(0, currentWaitlistedCount - 1),
      ...(cohortAtSignup ?
        {
          waitlistedCohortCounts: decrementCount(
            event.waitlistedCohortCounts ?? {},
            cohortAtSignup
          ),
        } :
        {}),
    });
    releaseUserEventScheduleInTransaction(tx, db, {
      uid: userId,
      eventId,
      startTimeMillis: event.startTime.toMillis(),
      endTimeMillis: scheduledEvent.endTime.toMillis(),
    });
    tx.set(participationRef, eventParticipationPatch({
      exists: participationSnap.exists,
      eventId,
      clubId: event.clubId,

      organizerId: event.organizerId ?? event.clubId,
      uid: userId,
      status: "cancelled",
    }), {merge: true});
    const offerStatus = offerSnap.data()?.status;
    if (offerStatus === "active" || offerStatus === "accepted") {
      tx.set(offerRef, {
        status: "cancelled",
        decidedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, {merge: true});
    }
  });

  return {waitlisted: false};
}

export const leaveEventWaitlist = onCall(appCheckCallableOptions,
  (request) => leaveEventWaitlistHandler(request));
