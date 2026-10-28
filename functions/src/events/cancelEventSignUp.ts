import {isBookingReadyUserProfile} from "../shared/profileReadiness";
import {eventAgeEligibility} from "../profiles/eventProfileRequirements";
import {hasEventCommunityMembership} from
  "../memberships/communityMembershipAuthority";
import {onCall, HttpsError, CallableRequest} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import type {
  EventDocument,
  PaymentDocument,
  UserProfileDocument,
} from "../shared/generated/firestoreAdminTypes";
import {hasBlockingRelationshipInTransaction} from "../safety/blocking";
import {requireAuth} from "../shared/auth";
import type {
  EventIdCallablePayload,
} from "../shared/generated/eventIdCallablePayload";
import {
  validateEventIdCallablePayload,
} from "../shared/generated/validators/eventIdInput";
import {validateCallableWithAjv, requireDoc} from "../shared/validation";
import {
  appCheckCallableOptionsWithSecrets,
} from "../shared/callableOptions";
import {
  razorpayKeySecret,
} from "../payments/razorpay";
import {
  participantUids,
  eventParticipationId,
  eventWaitlistOfferId,
  eventParticipationPatch,
  eventParticipationsByStatusInTransaction,
  waitlistedEventParticipationsInTransaction,
} from "../shared/relationshipDocuments";
import {checkRateLimit} from "../shared/rateLimit";
import {
  allowsPushPreference,
  activityNotificationId,
  eventActivityNotificationCopy,
  sendFcmNotification,
  setActivityNotificationInTransaction,
} from "../shared/notifications";
import {
  prepareUserEventScheduleClaimInTransaction,
  releaseUserEventScheduleInTransaction,
} from "./scheduleConflicts";
import {isPublicPaymentBooking} from
  "./publicRegistration/catchBookingBridge";
import {readSeatMigrationWriterFence} from "./seatMigrationPaged";
import {FirestoreSeatIdentityAuthority,
  prepareCatchUidSeatIdentity} from "./seatIdentityAuthority";
import {applyFirestoreSeatBatch, FirestoreSeatBatchPreparation,
  FirestoreSeatTransaction, prepareFirestoreSeatBatch} from
  "./seatAuthority/firestoreAdapter";
import {normalizeEventIdPayload} from "./eventPayloadNormalization";
import {
  assertPolicyAllowsSignup,
  cohortIdForUser,
  decrementCount,
  eventPolicyFromEvent,
  incrementCount,
  quoteAttendeeCancellation,
  quotePriceInPaise,
  rosterFromEvent,
} from "./eventPolicy";
import {eventDiscoveryProjection} from "./eventDiscoveryProjection";
import {requireEventTimeRange} from "./configuredEvent";
import {isEventPubliclyAccessible} from "./eventPublicationAccess";
import {stripeSecretKey} from "../payments/stripe";
import {planLegacyCancellationRefund,
  type LegacyRazorpayRefundAuthorization} from
  "../payments/legacyRefunds/intent";
import {processLegacyCancellationRefund} from
  "../payments/legacyRefunds/processor";
import {NativeCancellationRefundProvider} from
  "../payments/legacyRefunds/provider";

interface PromotionPush {
  token: string;
  title: string;
  body: string;
  eventId: string;
  clubId: string;
  organizerId?: string;
}

interface CancelEventSignUpDeps {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit: typeof checkRateLimit;
  nowMillis: () => number;
  loadCurrentAuthPhone: (uid: string) => Promise<string | null>;
  processRefund: (db: FirebaseFirestore.Firestore, paymentId: string) =>
    Promise<void>;
  authorizeRazorpayRefund: (payment: PaymentDocument) =>
    Promise<LegacyRazorpayRefundAuthorization>;
  sendNotification: (push: PromotionPush) => Promise<void>;
}

const defaultDeps: CancelEventSignUpDeps = {
  firestore: () => admin.firestore(),
  checkRateLimit,
  nowMillis: () => Date.now(),
  loadCurrentAuthPhone: async (uid) =>
    (await admin.auth().getUser(uid)).phoneNumber ?? null,
  processRefund: async (db, paymentId) =>
    processLegacyCancellationRefund({db, paymentId,
      provider: new NativeCancellationRefundProvider()}),
  authorizeRazorpayRefund: async (payment) =>
    new NativeCancellationRefundProvider().authorizeRazorpayRefund(payment),
  sendNotification: async (push) => {
    await sendFcmNotification({
      token: push.token,
      title: push.title,
      body: push.body,
      type: "waitlistPromotion",
      eventId: push.eventId,
      clubId: push.clubId,
    });
  },
};

/**
 * Atomically cancels a user's sign-up for an event.
 *
 * - Marks the user's eventParticipation edge cancelled.
 * - Promotes the first eligible waitlist user into the freed spot.
 * - Applies the configured cancellation policy to any completed payment.
 * - Idempotent — calling it when the user is already not signed up is a
 *   no-op.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {CancelEventSignUpDeps} deps Injectable dependencies.
 * @return {Promise<{cancelled: boolean}>} Operation result.
 */
export async function cancelEventSignUpHandler(
  request: CallableRequest<unknown>,
  deps: CancelEventSignUpDeps = defaultDeps
): Promise<{cancelled: boolean}> {
  const userId = requireAuth(request);
  const {eventId} = validateCallableWithAjv<EventIdCallablePayload>(
    request,
    validateEventIdCallablePayload,
    normalizeEventIdPayload
  );

  const db = deps.firestore();
  await deps.checkRateLimit(db, userId, "cancelEventSignUp", {
    maxRequests: 10, windowMs: 60 * 1000,
  });

  const refundPreflight = await cancellationRefundPreflight({db, userId,
    eventId, authorizeRazorpayRefund: deps.authorizeRazorpayRefund});

  const eventRef = db.collection("events").doc(eventId);
  const userRef = db.collection("users").doc(userId);
  const participationRef = db
    .collection("eventParticipations")
    .doc(eventParticipationId(eventId, userId));

  const committed = await db.runTransaction(async (tx) => {
    const promotionPushes: PromotionPush[] = [];
    let refundPaymentId: string | null = null;
    const [
      eventSnap,
      userSnap,
      participationSnap,
      activeParticipations,
      waitlistedParticipations,
      payments,
    ] = await Promise.all([
      tx.get(eventRef),
      tx.get(userRef),
      tx.get(participationRef),
      eventParticipationsByStatusInTransaction(tx, db, eventId, [
        "signedUp",
        "attended",
      ]),
      waitlistedEventParticipationsInTransaction(tx, db, eventId),
      tx.get(db.collection("payments").where("userId", "==", userId)
        .where("eventId", "==", eventId).where("status", "==", "completed")
        .limit(2)),
    ]);

    if (!eventSnap.exists) {
      throw new HttpsError("not-found", "Event not found.");
    }
    if (!userSnap.exists) {
      throw new HttpsError("not-found", "User profile not found.");
    }

    const event = requireDoc<EventDocument>(

      eventSnap,

      "EventDocument"

    );
    const seatMode = await readSeatMigrationWriterFence({db, tx, eventId});
    const user = requireDoc<UserProfileDocument>(
      userSnap,
      "UserProfileDocument"
    );
    const participation = participationSnap.exists ?
        participationSnap.data() as {status?: string; cohortAtSignup?: string;
          paymentId?: string | null} :
      null;
    // An organizer-routed paid booking is refunded from the organizer's
    // account under its frozen terms; Catch's native refund cannot release it.
    if (participation?.status === "signedUp" &&
        isPublicPaymentBooking(participation.paymentId)) {
      throw new HttpsError("failed-precondition",
        "Cancel this paid booking from its payment details.");
    }

    if (payments.docs.length > 1) {
      throw new HttpsError("failed-precondition",
        "Multiple payments need reconciliation before cancellation.");
    }
    const paymentDoc = payments.docs[0];
    const payment = paymentDoc ? requireDoc<PaymentDocument>(paymentDoc,
      "PaymentDocument") : null;
    const needsRazorpayAuthorization = payment &&
      (participation?.status === "signedUp" ||
        payment.cancellationRefund?.state === "pending");
    if (needsRazorpayAuthorization &&
        (payment.provider ?? "razorpay") === "razorpay" &&
        (!refundPreflight || refundPreflight.paymentDocumentId !==
          paymentDoc.id || refundPreflight.serializedPayment !==
          JSON.stringify(payment) || !refundPreflight.authorization)) {
      throw new HttpsError("failed-precondition",
        "This payment needs ownership reconciliation.");
    }
    // A replay resumes the saved refund without re-pricing the cancellation.
    if (participation?.status !== "signedUp") {
      refundPaymentId = participation?.status === "cancelled" &&
        payment?.cancellationRefund?.state === "pending" ?
        paymentDoc.id : null;
      return {cancelled: false, promotionPushes, refundPaymentId};
    }
    const scheduledEvent = requireEventTimeRange(event);

    const cancellerGender = user.gender;
    const cancellerCohort =
        participation?.cohortAtSignup ?? cohortIdForUser(user);
    const policy = eventPolicyFromEvent(event);
    const refundIntent = payment ? planLegacyCancellationRefund({payment,
      reason: event.status === "cancelled" ?
        "eventCancelled" : "guestCancelled",
      targetAmountMinor: event.status === "cancelled" ? payment.amount :
        quoteAttendeeCancellation({policy, paidAmountInPaise: payment.amount,
          startTimeMillis: event.startTime.toMillis(),
          nowMillis: deps.nowMillis()}).refundAmountInPaise,
      nowMillis: deps.nowMillis(),
      razorpayAuthorization: refundPreflight?.authorization}) : null;
    if (refundIntent?.state === "pending") refundPaymentId = paymentDoc.id;

    const seatTransaction = seatMode === "ready" ?
      new FirestoreSeatTransaction(db, tx) : null;
    const seatLedger = seatTransaction ?
      await seatTransaction.ledger(eventId) : null;
    let retainedGuestSeat = false;
    if (seatMode === "ready") {
      const currentAuthPhone = await deps.loadCurrentAuthPhone(userId);
      const preparedIdentity = await prepareCatchUidSeatIdentity({db, tx,
        eventId, organizerId: event.organizerId ?? event.clubId, uid: userId,
        currentAuthPhoneNumber: currentAuthPhone});
      const guests = await tx.get(db.collection("eventAttendees")
        .where("eventId", "==", eventId)
        .where("linkedUid", "==", userId).limit(2));
      const independentGuests = guests.docs.filter((guest) => {
        const row = guest.data();
        return ["hostImport", "hostManual", "providerSync"]
          .includes(row.source) &&
          ["registered", "checkedIn"].includes(row.status);
      });
      if (guests.docs.length > 1 || independentGuests.length > 1) {
        throw new HttpsError("failed-precondition",
          "Linked guest seat needs reconciliation.");
      }
      if (independentGuests.length === 1) {
        const guestIdentity = await new FirestoreSeatIdentityAuthority()
          .resolve({db, tx, eventId,
            organizerId: event.organizerId ?? event.clubId,
            subject: {kind: "importAttendee",
              attendeeId: independentGuests[0].id}});
        if (!guestIdentity || guestIdentity.key !==
            preparedIdentity.identity.key ||
            guestIdentity.revision !== preparedIdentity.identity.revision) {
          throw new HttpsError("failed-precondition",
            "Linked guest seat needs reconciliation.");
        }
        const reservation = await seatTransaction!.reservation(eventId,
          guestIdentity.key);
        if (!reservation?.active) {
          throw new HttpsError("failed-precondition",
            "Linked guest reservation is unavailable.");
        }
        retainedGuestSeat = true;
      }
    }
    const currentSignedUpCount = seatLedger?.occupied ??
      event.bookedCount ??
        activeParticipations.filter((edge) =>
          edge.data.status === "signedUp").length;
    const currentWaitlistedCount = event.waitlistedCount ??
        waitlistedParticipations.length;
    let nextBookedCount = Math.max(0,
      currentSignedUpCount - (retainedGuestSeat ? 0 : 1));
    let nextWaitlistedCount = currentWaitlistedCount;
    const newGenderCounts = {...event.genderCounts};
    if (cancellerGender) {
      newGenderCounts[cancellerGender] =
        Math.max(0, (newGenderCounts[cancellerGender] ?? 1) - 1);
    }
    let newCohortCounts = decrementCount(
      event.cohortCounts ?? {},
      cancellerCohort
    );
    let newWaitlistedCohortCounts = {
      ...(event.waitlistedCohortCounts ?? {}),
    };
    let promotedParticipationRef:
        FirebaseFirestore.DocumentReference | null = null;
    let promotedParticipationPatch: Record<string, unknown> | null = null;
    let promotedOfferRef:
        FirebaseFirestore.DocumentReference | null = null;
    let promotedOfferPatch: Record<string, unknown> | null = null;
    let promotedNotification:
        {uid: string; token?: string; title: string; body: string} | null =
        null;
    let promotedUid: string | null = null;
    let promotedScheduleClaim: {apply: () => void} | null = null;

    // Revalidate current profile and policy before promoting a waitlist user.
    const activePeerIds = participantUids(activeParticipations, userId);
    for (const waitlistedParticipation of !retainedGuestSeat &&
      isEventPubliclyAccessible(event) ?
      waitlistedParticipations : []) {
      const waitlistUserId = waitlistedParticipation.data.uid;
      const waitlistUserSnap =
          await tx.get(db.collection("users").doc(waitlistUserId));
      if (!waitlistUserSnap.exists) continue;

      if (await hasBlockingRelationshipInTransaction(
        tx,
        db,
        waitlistUserId,
        activePeerIds
      )) {
        continue;
      }

      const waitlistUser = requireDoc<UserProfileDocument>(
        waitlistUserSnap, "UserProfileDocument (waitlist)"
      );
      if (!isBookingReadyUserProfile(waitlistUser, event) ||
          eventAgeEligibility(event, waitlistUser,
            new Date(deps.nowMillis()))?.eligible === false) continue;
      const wGender = waitlistUser.gender;
      const wCohort = waitlistedParticipation.data.cohortAtSignup ??
          cohortIdForUser(waitlistUser);
      const nextRoster = {
        ...rosterFromEvent({...event, cohortCounts: newCohortCounts}),
        totalBooked: nextBookedCount,
      };

      try {
        assertPolicyAllowsSignup({
          policy,
          cohortId: wCohort,
          roster: nextRoster,
          hasActiveCommunityMembership: await hasEventCommunityMembership({
            db, tx, organizerId: event.organizerId ?? event.clubId,
            uid: waitlistUserId, policy,
          }),
        });
        const quotedAmountInPaise = quotePriceInPaise({
          policy,
          cohortId: wCohort,
          roster: nextRoster,
        });
        if (quotedAmountInPaise > 0) {
          continue;
        }
        promotedScheduleClaim =
          await prepareUserEventScheduleClaimInTransaction(tx, db, {
            uid: waitlistUserId,
            eventId,
            clubId: event.clubId,

            organizerId: event.organizerId ?? event.clubId,
            startTimeMillis: event.startTime.toMillis(),
            endTimeMillis: scheduledEvent.endTime.toMillis(),
          });
      } catch (error) {
        if (error instanceof HttpsError &&
              error.code === "failed-precondition") {
          continue;
        }
        throw error;
      }

      // Promote this user.
      promotedUid = waitlistUserId;
      const promotedOfferId = eventWaitlistOfferId(eventId, waitlistUserId);
      const promotionTimestamp =
          admin.firestore.Timestamp.fromMillis(deps.nowMillis());
      nextBookedCount += 1;
      nextWaitlistedCount = Math.max(0, nextWaitlistedCount - 1);
      if (wGender) {
        newGenderCounts[wGender] = (newGenderCounts[wGender] ?? 0) + 1;
      }
      newCohortCounts = incrementCount(newCohortCounts, wCohort);
      newWaitlistedCohortCounts = decrementCount(
        newWaitlistedCohortCounts,
        wCohort
      );
      promotedParticipationRef = waitlistedParticipation.ref;
      promotedParticipationPatch = eventParticipationPatch({
        exists: true,
        eventId,
        clubId: event.clubId,

        organizerId: event.organizerId ?? event.clubId,
        uid: waitlistUserId,
        status: "signedUp",
        genderAtSignup: wGender,
        cohortAtSignup: wCohort,
      });
      promotedParticipationPatch.waitlistOfferStatus = "accepted";
      promotedParticipationPatch.waitlistOfferedAt = promotionTimestamp;
      promotedParticipationPatch.waitlistOfferExpiresAt = promotionTimestamp;
      promotedParticipationPatch.waitlistOfferAcceptedAt = promotionTimestamp;
      promotedParticipationPatch.waitlistOfferId = promotedOfferId;
      promotedOfferRef = db
        .collection("eventWaitlistOffers")
        .doc(promotedOfferId);
      promotedOfferPatch = {
        eventId,
        clubId: event.clubId,

        organizerId: event.organizerId ?? event.clubId,
        uid: waitlistUserId,
        cohortAtOffer: wCohort,
        status: "accepted",
        source: "cancellation",
        offeredBy: null,
        offeredAt: promotionTimestamp,
        expiresAt: promotionTimestamp,
        decidedAt: promotionTimestamp,
        expiringNotifiedAt: null,
        inviteLinkId: typeof (
          waitlistedParticipation.data as Record<string, unknown>
        ).inviteLinkId === "string" ?
          (waitlistedParticipation.data as Record<string, unknown>)
            .inviteLinkId :
          null,
        createdAt: promotionTimestamp,
        updatedAt: promotionTimestamp,
      };
      const notificationCopy = eventActivityNotificationCopy(
        "waitlistPromotion",
        event
      );
      promotedNotification = {
        uid: waitlistUserId,
        token: allowsPushPreference(waitlistUser, "eventStatusUpdates") ?
          waitlistUser.fcmToken :
          undefined,
        title: notificationCopy.title,
        body: notificationCopy.body,
      };
      break;
    }

    let seatPreparation: FirestoreSeatBatchPreparation | null = null;
    let applySeatIdentities: Array<() => void> = [];
    if (seatMode === "ready" && !retainedGuestSeat) {
      if (!seatLedger || !seatTransaction) {
        throw new HttpsError("failed-precondition",
          "Event seat authority is unavailable.");
      }
      const organizerId = event.organizerId ?? event.clubId;
      const uids = promotedUid ? [userId, promotedUid] : [userId];
      const preparedIdentities = await Promise.all(uids.map(async (uid) =>
        prepareCatchUidSeatIdentity({db, tx, eventId, organizerId, uid,
          currentAuthPhoneNumber: await deps.loadCurrentAuthPhone(uid)})));
      const identities = preparedIdentities.map((row) => row.identity);
      applySeatIdentities = preparedIdentities.map((row) => row.apply);
      const reservations = await Promise.all(identities.map((identity) =>
        seatTransaction.reservation(eventId, identity.key)));
      const releaseRevision = reservations[0]?.revision ?? 0;
      seatPreparation = await prepareFirestoreSeatBatch({db, tx,
        identityAuthority: {resolve: async ({subject}) => {
          const index = uids.indexOf(subject.uid);
          return index < 0 ? null : identities[index];
        }},
        command: {eventId,
          batchId: `cancel_${userId}_${releaseRevision}`,
          expectedLedgerRevision: seatLedger.revision,
          expectedCapacityRevision: seatLedger.capacityRevision,
          expectedMigrationRevision: seatLedger.migrationRevision,
          nowMillis: deps.nowMillis(),
          operations: uids.map((uid, index) => ({
            subject: {kind: "verifiedUid" as const, uid},
            operation: index === 0 ? "release" as const : "reserve" as const,
            requestId: index === 0 ?
              `cancel_${uid}_${releaseRevision}` :
              `promote_${uid}_${reservations[index]?.revision ?? 0}`,
            expectedReservationRevision: reservations[index]?.revision ?? 0,
          }))}});
    }

    // Financial intent and released admission commit together, including a
    // zero-refund policy which can later be upgraded by host cancellation.
    if (refundIntent) {
      tx.update(paymentDoc.ref,
        {cancellationRefund: refundIntent});
    }
    if (seatPreparation) applyFirestoreSeatBatch(seatPreparation);
    for (const applyIdentity of applySeatIdentities) applyIdentity();
    promotedScheduleClaim?.apply();
    tx.update(eventRef, {
      bookedCount: nextBookedCount,
      waitlistedCount: nextWaitlistedCount,
      genderCounts: newGenderCounts,
      cohortCounts: newCohortCounts,
      waitlistedCohortCounts: newWaitlistedCohortCounts,
      ...eventDiscoveryProjection({
        event,
        clubLocation: event.discoveryCityName,
        clubLocationMarketId: event.discoveryMarketId,
        bookedCount: nextBookedCount,
      }),
    });
    tx.set(participationRef, eventParticipationPatch({
      exists: participationSnap.exists,
      eventId,
      clubId: event.clubId,

      organizerId: event.organizerId ?? event.clubId,
      uid: userId,
      status: "cancelled",
      genderAtSignup: cancellerGender,
      cohortAtSignup: cancellerCohort,
    }), {merge: true});
    releaseUserEventScheduleInTransaction(tx, db, {
      uid: userId,
      eventId,
      startTimeMillis: event.startTime.toMillis(),
      endTimeMillis: scheduledEvent.endTime.toMillis(),
    });
    if (promotedParticipationRef && promotedParticipationPatch) {
      tx.set(promotedParticipationRef, promotedParticipationPatch, {
        merge: true,
      });
    }
    if (promotedOfferRef && promotedOfferPatch) {
      tx.set(promotedOfferRef, promotedOfferPatch, {merge: true});
    }
    if (promotedNotification) {
      setActivityNotificationInTransaction(tx, db, {
        id: activityNotificationId("waitlistPromotion", eventId),
        uid: promotedNotification.uid,
        type: "waitlistPromotion",
        title: promotedNotification.title,
        body: promotedNotification.body,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        eventId,
        clubId: event.clubId,

        organizerId: event.organizerId ?? event.clubId,
      });
      if (promotedNotification.token) {
        promotionPushes.push({
          token: promotedNotification.token,
          title: promotedNotification.title,
          body: promotedNotification.body,
          eventId,
          clubId: event.clubId,

          organizerId: event.organizerId ?? event.clubId,
        });
      }
    }
    return {cancelled: true, promotionPushes, refundPaymentId};
  });

  for (const promotionPush of committed.promotionPushes) {
    try {
      await deps.sendNotification(promotionPush);
    } catch (notificationError) {
      // The cancellation and waitlist promotion are already committed. Push
      // delivery is best-effort and must not prevent the independent refund
      // side effect below from running.
      logger.error("Failed to send waitlist promotion notification", {
        eventId,
        clubId: promotionPush.clubId,
        error: notificationError,
        reasonMessage: notificationError instanceof Error ?
          notificationError.message :
          String(notificationError),
      });
    }
  }

  if (committed.refundPaymentId) {
    try {
      await deps.processRefund(db, committed.refundPaymentId);
    } catch {
      // The durable intent stays pending/reviewRequired for recovery. Never
      // equate a sent provider request with a completed cash refund.
      logger.error("Native cancellation refund requires recovery", {
        eventId, paymentId: committed.refundPaymentId});
    }
  }
  return {cancelled: committed.cancelled};
}

interface CancellationRefundPreflight {
  paymentDocumentId: string;
  serializedPayment: string;
  authorization?: LegacyRazorpayRefundAuthorization;
}

/** Provider I/O stays outside Firestore retries. The mutation transaction
 * later rebinds this proof to the exact payment serialization it rereads.
 */
async function cancellationRefundPreflight(input: {
  db: FirebaseFirestore.Firestore;
  userId: string;
  eventId: string;
  authorizeRazorpayRefund: (payment: PaymentDocument) =>
    Promise<LegacyRazorpayRefundAuthorization>;
}): Promise<CancellationRefundPreflight | null> {
  const payments = await input.db.collection("payments")
    .where("userId", "==", input.userId)
    .where("eventId", "==", input.eventId)
    .where("status", "==", "completed")
    .limit(2).get();
  if (payments.docs.length > 1) {
    throw new HttpsError("failed-precondition",
      "Multiple payments need reconciliation before cancellation.");
  }
  const snapshot = payments.docs[0];
  if (!snapshot) return null;
  const payment = requireDoc<PaymentDocument>(snapshot, "PaymentDocument");
  const participation = await input.db.collection("eventParticipations")
    .doc(eventParticipationId(input.eventId, input.userId)).get();
  const needsAuthorization = participation.data()?.status === "signedUp" ||
    payment.cancellationRefund?.state === "pending";
  const authorization = needsAuthorization &&
      (payment.provider ?? "razorpay") === "razorpay" ?
    await input.authorizeRazorpayRefund(payment) : undefined;
  return {paymentDocumentId: snapshot.id,
    serializedPayment: JSON.stringify(payment),
    ...(authorization ? {authorization} : {})};
}

export const cancelEventSignUp = onCall(
  appCheckCallableOptionsWithSecrets([razorpayKeySecret, stripeSecretKey]),
  async (request) => cancelEventSignUpHandler(request)
);
