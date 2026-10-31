import {assertPublicEventAge} from "../../profiles/eventProfileRequirements";
import {Timestamp} from "firebase-admin/firestore";
import {HttpsError} from "firebase-functions/v2/https";
import type {EventAttendeeDocument} from
  "../../shared/generated/firestoreAdminTypes";
import type {PublicEventAdmissionReceiptDocument as Receipt} from
  "../../shared/generated/publicEventAdmissionReceiptDocument";
import type {LoadRecipientAuth} from
  "../../organizerEventOfferRecipients/recipientGrant";
import {validatePublicEventAdmissionReceiptDocument} from
  "../../shared/generated/validators/publicEventAdmissionReceiptDocument";
import {validateEventAttendeeDocument} from
  "../../shared/generated/validators/eventAttendeeDocument";
import {SeatIdentityAuthorityError} from "../seatIdentityAuthority";
import {SeatAuthorityError} from "../seatAuthority/seatAuthority";
import {
  FirestoreSeatTransaction,
  assertCurrentReadySeatSnapshot,
} from "../seatAuthority/firestoreAdapter";
import {readSeatMigrationWriterFence} from "../seatMigrationPaged";
import {
  prepareCheckoutHold,
  applyCheckoutHold,
} from "../seatAuthority/checkoutSeatHold";
import {releaseEventPaymentHold} from
  "../../payments/eventCheckout/eventPaymentExpiry";
import {onboardingDraftSeed} from "../eventAttendees";
import {
  assertCurrentPublicGuest,
  readPublicEventSource,
  publicGuestMembership,
} from "./authority";
import {preparePublicGuestIdentity} from "./identity";
import {
  assertPublicRegistrationPolicy,
  registrationUnavailable,
} from "./policy";
import {
  parsePublicPayment,
  publicPaymentLedger,
  PUBLIC_PAYMENT_COLLECTION,
  PUBLIC_ADMISSION_COLLECTION,
  publicAdmissionId,
} from "./paymentLedger";
import {assertPublicPaidAdmission} from "./admissionProof";
import {prepareCatchBookingAdmission} from "./catchBookingBridge";
import {recordPublicMemberBenefitUse} from
  "../../hostMemberships/publicCheckout";

type Result = "admitted" | "refundPending" | "unchanged";
/** Only the provider processor may establish captured state. Its current,
 * unexpired hold becomes a roster row and immutable receipt atomically. An
 * organizer closing NEW registration does not revoke a guest's existing hold.
 * Unpublication, cancellation, changed start or lost eligibility does.
 */
export async function finalizePublicPayment(input: {
  db: FirebaseFirestore.Firestore;
  paymentId: string;
  nowMillis: number;
  loadCurrentAuthUser?: LoadRecipientAuth;
}): Promise<Result> {
  const {db, paymentId, nowMillis} = input;
  if (!Number.isSafeInteger(nowMillis) || nowMillis <= 0) {
    registrationUnavailable();
  }
  let refundEligible = false;
  try {
    const finalized = await db.runTransaction(async (tx): Promise<Result> => {
      refundEligible = false;
      const paymentRef = db
        .collection(PUBLIC_PAYMENT_COLLECTION)
        .doc(paymentId);
      const p = parsePublicPayment(
        (await tx.get(paymentRef)).data(),
        paymentId,
      );
      const receiptId = publicAdmissionId(paymentId);
      const receiptRef = db
        .collection(PUBLIC_ADMISSION_COLLECTION)
        .doc(receiptId);
      const receiptSnap = await tx.get(receiptRef);
      if (p.admissionReceiptId) {
        assertPublicPaidAdmission(p, paymentId, receiptSnap.data());
        return p.status === "admitted" ? "admitted" : "unchanged";
      }
      if (p.status !== "captured") return "unchanged";
      if (
        !p.providerOrderId ||
        !p.providerPaymentId ||
        !p.capturedAt ||
        p.refundedAmountPaise !== 0 ||
        p.capturedAt.toMillis() < p.createdAt.toMillis() ||
        p.capturedAt.toMillis() > nowMillis
      ) {
        registrationUnavailable();
      }
      refundEligible = true;
      if (receiptSnap.exists) registrationUnavailable();
      if (p.reservationReleased) {
        tx.update(paymentRef, {
          status: "refundPending",
          updatedAt: Timestamp.fromMillis(nowMillis),
        });
        return "refundPending";
      }
      const {eventId, organizerId, recipientUid: uid} = p;
      await assertCurrentPublicGuest({
        db,
        tx,
        uid,
        phoneE164: p.phoneE164,
        loadCurrentAuthUser: input.loadCurrentAuthUser,
      });
      const {event, organizer} = await readPublicEventSource({
        db,
        tx,
        eventId,
      });
      await assertPublicEventAge({db, tx, uid, event, nowMillis});
      assertPublicRegistrationPolicy(event, organizer, "paid", nowMillis,
        await publicGuestMembership({db, tx, event, uid, nowMillis}));
      if (
        event.organizerId !== organizerId ||
        event.startTime.toMillis() !==
          p.cancellationPolicy.eventStartsAtMillis ||
        (await readSeatMigrationWriterFence({db, tx, eventId})) !==
          "ready"
      ) {
        registrationUnavailable();
      }
      const guest = await preparePublicGuestIdentity({
        db,
        tx,
        eventId,
        organizerId,
        uid,
        phoneE164: p.phoneE164,
        nowMillis,
      });
      if (
        guest.attendeeId !== p.attendeeId ||
        guest.identity.key !== p.canonicalSeatKey ||
        guest.identity.revision !== p.identityRevision ||
        ["registered", "checkedIn"].includes(guest.existing?.status ?? "")
      ) {
        registrationUnavailable();
      }
      const seats = new FirestoreSeatTransaction(db, tx);
      const [ledger, reservation, draft] = await Promise.all([
        seats.ledger(eventId),
        seats.reservation(eventId, p.canonicalSeatKey),
        tx.get(db.collection("onboarding_drafts").doc(uid)),
      ]);
      assertCurrentReadySeatSnapshot({
        event,
        eventId,
        organizerId,
        identity: guest.identity,
        ledger,
        reservation,
        expectedActive: false,
      });
      if (
        !ledger ||
        !reservation ||
        ledger.migrationRevision !== p.migrationRevision ||
        reservation.checkoutHold?.paymentId !== paymentId ||
        reservation.checkoutHold.expiresAtMillis !==
          p.checkoutExpiresAt.toMillis()
      ) {
        registrationUnavailable();
      }
      const confirm = await prepareCheckoutHold({
        tx: seats,
        command: {
          eventId,
          subject: guest.identity,
          paymentId,
          operation: "confirmCheckoutHold",
          requestId: `confirm_${paymentId}`,
          expectedLedgerRevision: ledger.revision,
          expectedCapacityRevision: ledger.capacityRevision,
          expectedMigrationRevision: ledger.migrationRevision,
          expectedReservationRevision: reservation.revision,
          nowMillis,
        },
        resolveIdentity: async () => guest.identity,
      });
      // Reads before the first write: a Catch user's paid admission is also
      // the Consumer booking edge, so the app shows and cancels this seat.
      const catchBooking = await prepareCatchBookingAdmission({
        db,
        tx,
        eventId,
        uid,
        paymentId,
      });
      const now = Timestamp.fromMillis(nowMillis);
      const existing = guest.existing;
      const displayName = existing?.displayName ?? p.displayName;
      const attendee: EventAttendeeDocument = {
        ...existing,
        eventId,
        organizerId,
        displayName,
        searchName: displayName.toLocaleLowerCase("en"),
        source: existing?.source ?? "webOtp",
        status: "registered",
        linkedUid: uid,
        phoneE164: p.phoneE164,
        email: existing?.email ?? null,
        externalReference: existing?.externalReference ?? null,
        arrivalGroup: existing?.arrivalGroup ?? null,
        ticketType: existing?.ticketType ?? null,
        importId: existing?.importId ?? null,
        sourceRowId: existing?.sourceRowId ?? null,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        registeredAt: now,
        waitlistedAt: existing?.waitlistedAt ?? null,
        checkedInAt: null,
        cancelledAt: null,
        checkedInBy: null,
        linkedAt: existing?.linkedAt ?? now,
        inviteLinkId: existing?.inviteLinkId ?? p.inviteLinkId,
        inviteCapturedAt:
          existing?.inviteCapturedAt ?? (p.inviteLinkId ? now : null),
        attendanceRevision: existing?.attendanceRevision ?? 0,
        preCheckInStatus: null,
        revenueAmountMinor: p.amountPaise,
        revenueCurrency: "INR",
        revenueSource: "providerOrder",
        revenueAllocation: "perAttendee",
        revenueOrderReference: p.providerOrderId,
        revenueOrderAmountMinor: p.amountPaise,
      };
      const receipt: Receipt = {
        organizerId,
        eventId,
        recipientUid: uid,
        attendeeId: p.attendeeId,
        canonicalSeatKey: p.canonicalSeatKey,
        identityRevision: p.identityRevision,
        migrationRevision: p.migrationRevision,
        registrationRevision: p.registrationRevision,
        amountPaise: p.amountPaise,
        currency: p.currency,
        routing: p.routing,
        paymentId,
        providerOrderId: p.providerOrderId,
        providerPaymentId: p.providerPaymentId,
        admittedAtMillis: nowMillis,
        resultingLedgerRevision: confirm.receipt.appliedLedgerRevision,
      };
      if (
        !validateEventAttendeeDocument(attendee) ||
        !validatePublicEventAdmissionReceiptDocument(receipt)
      ) {
        registrationUnavailable();
      }
      guest.apply();
      guest.createAttendeeAlias(ledger.migrationRevision);
      applyCheckoutHold(seats, confirm);
      tx.set(guest.attendeeRef, attendee);
      tx.update(db.collection("events").doc(eventId), {
        bookedCount: ledger.occupied + 1,
        ...catchBooking?.eventCounts(event),
      });
      if (!draft.exists) {
        tx.create(
          db.collection("onboarding_drafts").doc(uid),
          onboardingDraftSeed({displayName, phoneE164: p.phoneE164}),
        );
      }
      tx.create(receiptRef, receipt);
      catchBooking?.apply(event);
      tx.update(paymentRef, {
        status: "admitted",
        admissionReceiptId: receiptId,
        admittedAt: now,
        updatedAt: now,
        lastErrorCode: null,
        ...(p.routing.selection.route === "razorpayRoute" ?
          {
            settlement: {
              state: "waiting",
              transferId: null,
              nextAttemptAtMillis: nowMillis,
              leaseUntilMillis: 0,
              leaseId: null,
              authorizedAtMillis: null,
              completedAtMillis: null,
              releasedAtMillis: null,
              settledAtMillis: null,
            },
          } :
          {}),
      });
      return "admitted";
    });
    if (finalized === "admitted") {
      await recordAdmittedMemberBenefitUse(db, paymentId, nowMillis);
    }
    return finalized;
  } catch (error) {
    const rejected =
      (error instanceof HttpsError &&
        ["failed-precondition", "permission-denied", "not-found"].includes(
          error.code,
        )) ||
      error instanceof SeatAuthorityError ||
      error instanceof SeatIdentityAuthorityError;
    if (!refundEligible || !rejected) throw error;
    const result = await releaseEventPaymentHold({
      ledger: publicPaymentLedger,
      db,
      paymentId,
      nowMillis,
      reason: "fulfillmentFailed",
    });
    return result === "admitted" || result === "refundPending" ?
      result :
      "unchanged";
  }
}

/** Membership savings never change admission; failures are dropped. */
async function recordAdmittedMemberBenefitUse(
  db: FirebaseFirestore.Firestore, paymentId: string, nowMillis: number,
): Promise<void> {
  try {
    const payment = parsePublicPayment((await db
      .collection(PUBLIC_PAYMENT_COLLECTION).doc(paymentId).get()).data(),
    paymentId);
    await recordPublicMemberBenefitUse({db, eventId: payment.eventId,
      uid: payment.recipientUid, paidAmountPaise: payment.amountPaise,
      nowMillis});
  } catch {
    return;
  }
}
