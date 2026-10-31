import {communityMembershipId, requiresCommunityMembership,
  readCommunityMembership} from
  "../memberships/communityMembershipAuthority";
import {prepareNativePaidBooking, NativePaidBooking} from
  "../payments/nativeBooking";
import {preparePairSeatTransition} from "../crossPaths/pairSeatAuthority";
import {heldSeatCount} from "./seatAuthority/seatAuthority";
import * as admin from "firebase-admin";
import {HttpsError} from "firebase-functions/v2/https";
import type {
  CrossPathsPairHoldDocument,
  EventDocument,
  UserProfileDocument,
} from "../shared/generated/firestoreAdminTypes";
import {crossPathsEventPlanId} from "../crossPaths/identifiers";
import {assertNoBlockingRelationshipInTransaction} from "../safety/blocking";
import {computeAge} from "../shared/dates";
import {assertBookingReadyUserProfile} from "../shared/profileReadiness";
import {assertRunPreferencesReadyForEvent} from
  "../shared/runPreferencesReadiness";
import {requireDoc} from "../shared/validation";
import {
  participantUids,
  eventParticipationId,
  eventParticipationPatch,
  eventParticipationsByStatusInTransaction,
} from "../shared/relationshipDocuments";
import {
  activityNotificationId,
  eventActivityNotificationCopy,
  setActivityNotificationInTransaction,
} from "../shared/notifications";
import {prepareUserEventScheduleClaimInTransaction} from
  "./scheduleConflicts";
import {readSeatMigrationWriterFence} from "./seatMigrationPaged";
import {prepareCatchUidSeatIdentity,
  prepareVerifiedUidGuestSeatLink, seatIdentityAliasId} from
  "./seatIdentityAuthority";
import {applyFirestoreSeat, FirestoreSeatPreparation,
  FirestoreSeatTransaction, prepareFirestoreSeat} from
  "./seatAuthority/firestoreAdapter";
import {
  assertPolicyAllowsSignup,
  cohortIdForUser,
  decrementCount,
  eventPolicyFromEvent,
  hasHostApprovedJoinRequest,
  incrementCount,
  rosterFromEvent,
  rosterWithReservedWaitlistOffersInTransaction,
} from "./eventPolicy";
import {eventDiscoveryProjection} from "./eventDiscoveryProjection";
import {requireCatchBookingAuthority} from "./eventOrigin";
import {requirePublicConfiguredEvent} from "./configuredEvent";
import {
  incrementInviteLinkCounterInTransaction,
  inviteAttributionWriteFields,
  InviteAttribution,
} from "./inviteLinks";

/**
 * Core sign-up business logic — shared by verifyRazorpayPayment (paid events)
 * and signUpForFreeEvent (free events).
 *
 * Uses a transaction to atomically:
 *   1. Read the event and the user's profile.
 *   2. Enforce eligibility constraints (age range, gender caps).
 *   3. Check overall capacity.
 *   4. Write the user's eventParticipation edge.
 *   5. Update aggregate count projections on the event.
 *   6. Preserve invite-only validation made by the caller.
 *
 * Enforces blocks against signed-up and attended participation edges inside
 * this transaction. The error remains generic so callers cannot infer
 * who blocked whom.
 *
 * Idempotent — calling it twice for the same user/event is safe.
 * @param {FirebaseFirestore.Firestore} db Firestore instance.
 * @param {string} eventId Event to sign the user up for.
 * @param {string} userId User being signed up.
 * @param {string=} paymentId Optional payment document linked to the signup.
 * @param {object=} options Admission context already verified by caller.
 * @return {Promise<void>} Resolves when the transaction completes.
 */
export async function signUpUserForEvent(
  db: FirebaseFirestore.Firestore,
  eventId: string,
  userId: string,
  paymentId?: string,
  options: {
    paidBooking?: NativePaidBooking;
    hasValidInvite?: boolean;
    /** Caller hint only; the write transaction rechecks persisted review. */
    hasHostApproval?: boolean;
    inviteAttribution?: InviteAttribution | null;
    crossPathsPairHoldId?: string | null;
    /** Server-only test seam; production reads current Admin Auth identity. */
    loadCurrentAuthPhone?: (uid: string) => Promise<string | null>;
  } = {}
): Promise<void> {
  const eventRef = db.collection("events").doc(eventId);
  const userRef = db.collection("users").doc(userId);
  const participationRef = db
    .collection("eventParticipations")
    .doc(eventParticipationId(eventId, userId));
  const pairHoldRef = options.crossPathsPairHoldId ?
    db.collection("crossPathsPairHolds").doc(options.crossPathsPairHoldId) :
    null;

  await db.runTransaction(async (tx) => {
    const [
      eventSnap,
      userSnap,
      participationSnap,
      activeParticipations,
      deletionGuard,
    ] = await Promise.all([
      tx.get(eventRef),
      tx.get(userRef),
      tx.get(participationRef),
      eventParticipationsByStatusInTransaction(tx, db, eventId, [
        "signedUp",
        "attended",
      ]),
      tx.get(db.collection("deletedUsers").doc(userId)),
    ]);

    const applyPayment = options.paidBooking ?
      await prepareNativePaidBooking({db, tx, booking: options.paidBooking,
        eventId, userId, paymentId}) : null;

    if (!eventSnap.exists) {
      throw new HttpsError("not-found", "Event not found.");
    }
    if (deletionGuard.exists) {
      throw new HttpsError("failed-precondition", "Account is unavailable.");
    }
    if (!userSnap.exists) {
      throw new HttpsError("not-found", "User profile not found.");
    }

    const event = requireDoc<EventDocument>(

      eventSnap,

      "EventDocument"

    );
    const seatMode = await readSeatMigrationWriterFence({db, tx, eventId});
    const pairHoldSnap = pairHoldRef ? await tx.get(pairHoldRef) : null;
    const pairHold = pairHoldSnap?.exists ?
      requireDoc<CrossPathsPairHoldDocument>(
        pairHoldSnap,
        "CrossPathsPairHoldDocument (booking)"
      ) : null;
    if (options.crossPathsPairHoldId && !pairHold) {
      throw new HttpsError(
        "failed-precondition",
        "This Cross Paths hold is no longer available."
      );
    }
    if (event.status === "cancelled") {
      throw new HttpsError(
        "failed-precondition",
        "This event has been cancelled."
      );
    }
    requireCatchBookingAuthority(event);
    const configuredEvent = requirePublicConfiguredEvent(event);
    const user = requireDoc<UserProfileDocument>(
      userSnap,
      "UserProfileDocument"
    );
    assertBookingReadyUserProfile(user, event);
    assertRunPreferencesReadyForEvent(user, event);
    const existingParticipation = participationSnap.exists ?
      participationSnap.data() as {
        status?: string;
        paymentId?: string;
        communityMembershipAtSignup?: unknown;
        inviteLinkId?: string | null;
        inviteSource?: string | null;
      } :
      null;

    if (
      existingParticipation?.status === "signedUp" ||
      existingParticipation?.status === "attended"
    ) {
      if (options.paidBooking &&
          existingParticipation.paymentId !== paymentId) {
        throw new HttpsError("already-exists",
          "Another booking already owns this seat.");
      }
      if (!pairHold) {
        applyPayment?.();
        return;
      }
      if (
        pairHold.eventId === eventId &&
        pairHold.requesterUid === userId &&
        pairHold.status === "confirmed" &&
        pairHold.requesterBookingStatus === "confirmed"
      ) {
        applyPayment?.();
        return;
      }
      throw new HttpsError(
        "failed-precondition",
        "This Cross Paths hold does not match the confirmed booking."
      );
    }

    let pairConversationId: string | null = null;
    let pairPlanRef: FirebaseFirestore.DocumentReference | null = null;

    if (pairHold) {
      if (
        pairHold.eventId !== eventId ||
        pairHold.requesterUid !== userId ||
        pairHold.status !== "active" ||
        pairHold.requesterBookingStatus !== "held" ||
        pairHold.expiresAt.toMillis() <= Date.now() ||
        !activeParticipations.some((row) =>
          row.data.uid === pairHold.attendeeUid &&
          (row.data.status === "signedUp" || row.data.status === "attended"))
      ) {
        throw new HttpsError(
          "failed-precondition",
          "This Cross Paths hold is no longer available."
        );
      }
      const attendeeDeletion = await tx.get(db.collection("deletedUsers")
        .doc(pairHold.attendeeUid));
      if (attendeeDeletion.exists) {
        throw new HttpsError("failed-precondition",
          "This Cross Paths hold is no longer available.");
      }
      const invitationSnap = await tx.get(
        db.collection("crossPathsInvitations").doc(pairHold.invitationId)
      );
      if (
        !invitationSnap.exists ||
        invitationSnap.data()?.status !== "accepted" ||
        invitationSnap.data()?.pairHoldId !== pairHoldSnap?.id
      ) {
        throw new HttpsError(
          "failed-precondition",
          "This Cross Paths hold is no longer available."
        );
      }
      pairConversationId = crossPathsEventPlanId(
        eventId,
        pairHold.requesterUid,
        pairHold.attendeeUid
      );
      pairPlanRef = db.collection("matches").doc(pairConversationId);
      const pairPlanSnap = await tx.get(pairPlanRef);
      if (pairPlanSnap.exists) {
        throw new HttpsError(
          "failed-precondition",
          "This Cross Paths event plan already exists."
        );
      }
    }

    const activeParticipantIds = participantUids(activeParticipations);
    await assertNoBlockingRelationshipInTransaction(
      tx,
      db,
      userId,
      activeParticipantIds
    );

    const constraints = event.constraints ?? {minAge: 0, maxAge: 99};

    // Age check.
    if (constraints.minAge > 0 || constraints.maxAge < 99) {
      const age = computeAge(
        (user.dateOfBirth as FirebaseFirestore.Timestamp).toDate()
      );
      if (age < constraints.minAge) {
        throw new HttpsError(
          "failed-precondition",
          `You must be at least ${constraints.minAge} ` +
            "years old to join this event."
        );
      }
      if (age > constraints.maxAge) {
        throw new HttpsError(
          "failed-precondition",
          `You must be ${constraints.maxAge} ` +
            "or younger to join this event."
        );
      }
    }

    const gender = user.gender;
    const policy = eventPolicyFromEvent(event);
    const cohortId = cohortIdForUser(user);
    const signedUpCount = activeParticipations
      .filter((participation) => participation.data.status === "signedUp")
      .length;
    const seatTransaction = seatMode === "ready" ?
      new FirestoreSeatTransaction(db, tx) : null;
    const seatLedger = seatTransaction ?
      await seatTransaction.ledger(eventId) : null;
    let currentAuthPhone: string | null = null;
    let guestLink: Awaited<ReturnType<
      typeof prepareVerifiedUidGuestSeatLink>> | null = null;
    if (seatMode === "ready") {
      currentAuthPhone = options.loadCurrentAuthPhone ?
        await options.loadCurrentAuthPhone(userId) :
        (await admin.auth().getUser(userId)).phoneNumber ?? null;
      if (currentAuthPhone) {
        const uidAliasRef = db.collection("eventSeatIdentityAliases")
          .doc(seatIdentityAliasId(eventId, "uid", userId));
        const phoneAliasRef = db.collection("eventSeatIdentityAliases")
          .doc(seatIdentityAliasId(eventId, "phone", currentAuthPhone));
        const [uidAliasSnap, phoneAliasSnap] = await Promise.all([
          tx.get(uidAliasRef), tx.get(phoneAliasRef),
        ]);
        if (phoneAliasSnap.exists && (!uidAliasSnap.exists ||
            String(phoneAliasSnap.data()?.canonicalKey)
              .startsWith("guest_"))) {
          if (pairHold) {
            throw new HttpsError("failed-precondition",
              "A guest seat cannot consume a separate pair hold.");
          }
          const matchingAttendees = await tx.get(db
            .collection("eventAttendees")
            .where("eventId", "==", eventId)
            .where("phoneE164", "==", currentAuthPhone).limit(2));
          if (matchingAttendees.docs.length !== 1) {
            throw new HttpsError("failed-precondition",
              "Guest seat identity needs reconciliation.");
          }
          guestLink = await prepareVerifiedUidGuestSeatLink({db, tx,
            eventId, organizerId: event.organizerId,
            attendeeId: matchingAttendees.docs[0].id,
            uid: userId, authTokenPhoneNumber: currentAuthPhone,
            now: admin.firestore.Timestamp.now()});
        }
      }
    }
    const currentBookedCount = seatLedger?.occupied ??
      event.bookedCount ?? signedUpCount;
    const baseRoster = {
      ...rosterFromEvent(event),
      totalBooked: currentBookedCount +
        (seatLedger ? heldSeatCount(seatLedger) :
          Math.max(0, event.crossPathsPairHeldCount ?? 0)),
    };
    const reservedRoster = await rosterWithReservedWaitlistOffersInTransaction(
      tx,
      db,
      eventId,
      baseRoster,
      {excludeUid: userId}
    );
    const admissionRoster = pairHold || guestLink ? {
      ...reservedRoster,
      totalBooked: Math.max(0, reservedRoster.totalBooked - 1),
      bookedCountsByCohort: pairHold ? decrementCount(
        reservedRoster.bookedCountsByCohort,
        pairHold.requesterCohortId
      ) : reservedRoster.bookedCountsByCohort,
      crossPathsPairHeldCount: pairHold ? Math.max(
        0,
        (reservedRoster.crossPathsPairHeldCount ?? 0) - 1
      ) : reservedRoster.crossPathsPairHeldCount,
    } : reservedRoster;
    const membership = requiresCommunityMembership(policy) ?
      await readCommunityMembership({db, tx,
        organizerId: event.organizerId, uid: userId}) : null;
    assertPolicyAllowsSignup({
      policy,
      cohortId,
      roster: admissionRoster,
      hasValidInvite: options.hasValidInvite,
      hasHostApproval: hasHostApprovedJoinRequest(participationSnap.data()),
      admissionMode: pairHold ? "crossPathsPair" : "general",
      hasActiveCommunityMembership: membership?.state === "active",
    });

    const scheduleClaim = await prepareUserEventScheduleClaimInTransaction(
      tx, db, {
        uid: userId,
        eventId,
        organizerId: event.organizerId,
        startTimeMillis: event.startTime.toMillis(),
        endTimeMillis: configuredEvent.endTime.toMillis(),
      });

    let seatPreparation: FirestoreSeatPreparation | null = null;
    let applySeatIdentity: (() => void) | null = null;
    const pairSeat = pairHold ? await preparePairSeatTransition({db, tx,
      event, eventId, organizerId: event.organizerId,
      requesterUid: userId, holdId: options.crossPathsPairHoldId!,
      expiresAtMillis: pairHold.expiresAt.toMillis(), nowMillis: Date.now(),
      operation: "confirmTemporaryHold",
      loadCurrentAuthPhone: async () => currentAuthPhone}) : null;
    if (seatMode === "ready" && !guestLink && !pairHold) {
      if (!seatLedger || !seatTransaction) {
        throw new HttpsError("failed-precondition",
          "Event seat authority is unavailable.");
      }
      const subject = {kind: "verifiedUid" as const, uid: userId};
      const preparedIdentity = await prepareCatchUidSeatIdentity({db, tx,
        eventId, organizerId: event.organizerId,
        uid: userId, currentAuthPhoneNumber: currentAuthPhone});
      const identity = preparedIdentity.identity;
      applySeatIdentity = preparedIdentity.apply;
      const reservation = await seatTransaction.reservation(eventId,
        identity.key);
      seatPreparation = await prepareFirestoreSeat({db, tx,
        identityAuthority: {resolve: async () => identity},
        command: {eventId, subject,
          operation: "reserve",
          requestId: `signup_${userId}_${reservation?.revision ?? 0}`,
          expectedLedgerRevision: seatLedger.revision,
          expectedCapacityRevision: seatLedger.capacityRevision,
          expectedMigrationRevision: seatLedger.migrationRevision,
          expectedReservationRevision: reservation?.revision ?? 0,
          nowMillis: Date.now()}});
    }

    const wasWaitlisted = existingParticipation?.status === "waitlisted";
    const nextBookedCount = currentBookedCount + (guestLink ? 0 : 1);
    const notificationType = wasWaitlisted ?
      "waitlistPromotion" :
      "eventSignup";
    const notificationCopy =
      eventActivityNotificationCopy(notificationType, event);
    const eventUpdate: Record<string, unknown> = {
      bookedCount: seatMode === "ready" ? nextBookedCount :
        admin.firestore.FieldValue.increment(1),
      ...(gender ? {
        [`genderCounts.${gender}`]: admin.firestore.FieldValue.increment(1),
      } : {}),
      cohortCounts: incrementCount(event.cohortCounts ?? {}, cohortId),
      ...eventDiscoveryProjection({
        event,
        organizerLocation: event.discoveryCityName,
        organizerLocationMarketId: event.discoveryMarketId,
        bookedCount: nextBookedCount,
      }),
    };
    if (wasWaitlisted) {
      eventUpdate.waitlistedCount = admin.firestore.FieldValue.increment(-1);
      eventUpdate.waitlistedCohortCounts = decrementCount(
        event.waitlistedCohortCounts ?? {},
        cohortId
      );
    }
    if (pairHold) {
      eventUpdate.crossPathsPairHeldCount =
        admin.firestore.FieldValue.increment(-1);
      eventUpdate.crossPathsPairConfirmedCount =
        admin.firestore.FieldValue.increment(1);
      eventUpdate.crossPathsPairHeldCohortCounts = decrementCount(
        event.crossPathsPairHeldCohortCounts ?? {},
        pairHold.requesterCohortId
      );
    }

    applyPayment?.();
    if (seatPreparation) applyFirestoreSeat(seatPreparation);
    pairSeat?.apply();
    guestLink?.apply();
    applySeatIdentity?.();
    scheduleClaim.apply();
    tx.update(eventRef, eventUpdate);
    const attribution = attributionForSignup({
      existingParticipation,
      candidate: options.inviteAttribution,
    });
    tx.set(participationRef, {
      ...eventParticipationPatch({
        exists: participationSnap.exists,
        eventId,
        organizerId: event.organizerId,
        uid: userId,
        status: "signedUp",
        genderAtSignup: gender,
        cohortAtSignup: cohortId,
        paymentId,
      }),
      ...(membership ? {communityMembershipAtSignup: {
        membershipId: communityMembershipId(event.organizerId,
          userId), revision: membership.revision,
        decisionId: membership.lastDecisionId,
      }} : existingParticipation?.communityMembershipAtSignup ? {
        communityMembershipAtSignup: admin.firestore.FieldValue.delete(),
      } : {}),
      ...inviteAttributionWriteFields(attribution.write),
    }, {merge: true});
    incrementInviteLinkCounterInTransaction({
      tx,
      db,
      attribution: attribution.counter,
      field: "confirmedCount",
    });
    setActivityNotificationInTransaction(tx, db, {
      id: activityNotificationId(notificationType, eventId),
      uid: userId,
      type: notificationType,
      title: notificationCopy.title,
      body: notificationCopy.body,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      eventId,
      organizerId: event.organizerId,
    });
    if (
      pairHold &&
      pairHoldRef &&
      pairPlanRef &&
      pairConversationId
    ) {
      const now = admin.firestore.Timestamp.now();
      tx.create(pairPlanRef, {
        user1Id: pairHold.requesterUid,
        user2Id: pairHold.attendeeUid,
        eventIds: [eventId],
        createdAt: now,
        lastMessageAt: null,
        lastMessagePreview: null,
        lastMessageSenderId: null,
        unreadCounts: {
          [pairHold.requesterUid]: 0,
          [pairHold.attendeeUid]: 0,
        },
        status: "active",
        blockedBy: null,
        blockedAt: null,
        participantIds: [pairHold.requesterUid, pairHold.attendeeUid],
        conversationType: "crossPathsEventPlan",
        crossPathsInvitationId: pairHold.invitationId,
        eventPlanExpiresAt: admin.firestore.Timestamp.fromMillis(
          configuredEvent.endTime.toMillis() + 24 * 60 * 60 * 1000
        ),
        closedAt: null,
      });
      tx.update(pairHoldRef, {
        status: "confirmed",
        requesterBookingStatus: "confirmed",
        updatedAt: now,
        confirmedAt: now,
        paymentId: paymentId ?? null,
        conversationId: pairConversationId,
      });
      tx.update(
        db.collection("crossPathsInvitations").doc(pairHold.invitationId),
        {updatedAt: now, conversationId: pairConversationId}
      );
      setActivityNotificationInTransaction(tx, db, {
        id: activityNotificationId(
          "crossPathsInvitationAccepted",
          pairHold.invitationId
        ),
        uid: pairHold.attendeeUid,
        type: "crossPathsInvitationAccepted",
        title: "Your event plan is ready",
        body: "Both spots are confirmed. Open your Cross Paths event plan.",
        createdAt: now,
        eventId,
        matchId: pairConversationId,
        invitationId: pairHold.invitationId,
        actorUid: pairHold.requesterUid,
      });
    }
  });
}

/**
 * Chooses whether a signup should write or count invite attribution.
 * @param {object} params Existing participation and candidate attribution.
 * @return {object} Attribution write fields and counter attribution.
 */
function attributionForSignup(params: {
  existingParticipation: {
    status?: string;
    inviteLinkId?: string | null;
    inviteSource?: string | null;
  } | null;
  candidate: InviteAttribution | null | undefined;
}): {
  write: InviteAttribution | null;
  counter: InviteAttribution | null;
} {
  const existingLinkId = params.existingParticipation?.inviteLinkId;
  const existingSource = params.existingParticipation?.inviteSource;
  if (typeof existingLinkId === "string" && existingLinkId.length > 0) {
    const existing = {
      inviteLinkId: existingLinkId,
      inviteSource: typeof existingSource === "string" &&
        existingSource.length > 0 ? existingSource : null,
    };
    const status = params.existingParticipation?.status;
    if (status !== "cancelled" && status !== "deleted") {
      return {write: null, counter: existing};
    }
  }
  if (!params.candidate) return {write: null, counter: null};
  const status = params.existingParticipation?.status;
  if (
    typeof existingLinkId === "string" &&
    existingLinkId.length > 0 &&
    status !== "cancelled" &&
    status !== "deleted"
  ) {
    return {write: null, counter: null};
  }
  return {write: params.candidate, counter: params.candidate};
}
