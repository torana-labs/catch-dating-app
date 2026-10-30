import {assertPublicEventAge} from "../../profiles/eventProfileRequirements";
import {createHash} from "node:crypto";
import {Timestamp} from "firebase-admin/firestore";
import {HttpsError} from "firebase-functions/v2/https";
import type {PublicEventPaymentDocument as Payment} from
  "../../shared/generated/firestoreAdminTypes";
import type {LoadRecipientAuth} from
  "../../organizerEventOfferRecipients/recipientGrant";
import type {PaymentRoutingSnapshot} from "../../payments/paymentRouting";
import {assertRazorpayCollectionRoutingCurrent} from
  "../../payments/razorpayCollectionRouting";
import {assertPaymentRouteSnapshot} from "../../payments/paymentRouting";
import {canonicalJson} from "../eventSetupPreferences/resolve";
import {readSeatMigrationWriterFence} from "../seatMigrationPaged";
import {
  FirestoreSeatTransaction,
  assertCurrentReadySeatSnapshot,
} from "../seatAuthority/firestoreAdapter";
import {
  CHECKOUT_HOLD_MILLIS,
  heldSeatCount,
} from "../seatAuthority/seatAuthority";
import {
  prepareCheckoutHold,
  applyCheckoutHold,
} from "../seatAuthority/checkoutSeatHold";
import {rosterWithReservedWaitlistOffersInTransaction} from "../eventPolicy";
import {
  assertCurrentPublicGuest,
  readPublicEventSource,
  publicGuestMembership,
} from "./authority";
import {preparePublicGuestIdentity} from "./identity";
import {
  publicCheckoutQuote,
  assertReviewedPublicQuote,
  registrationUnavailable,
  type PublicCheckoutQuote,
} from "./policy";
import {
  PUBLIC_PAYMENT_COLLECTION,
  publicPaymentId,
  parsePublicPayment,
} from "./paymentLedger";
import {publicHostMembershipQuoteTerms} from
  "../../hostMemberships/publicCheckout";

export async function reservePublicPayment(input: {
  db: FirebaseFirestore.Firestore;
  eventId: string;
  uid: string;
  phoneE164: string;
  displayName: string;
  requestId: string;
  reviewedQuote: PublicCheckoutQuote;
  routing: PaymentRoutingSnapshot;
  inviteLinkId: string | null;
  nowMillis?: () => number;
  loadCurrentAuthUser?: LoadRecipientAuth;
}): Promise<
  | { paymentId: string; payment: Payment; replayed: boolean }
  | {
      admission: {
        eventId: string;
        attendeeId: string;
        status: "registered" | "checkedIn";
      };
    }
> {
  const {
    db,
    eventId,
    uid,
    phoneE164,
    requestId,
    routing,
    reviewedQuote,
    inviteLinkId,
  } = input;
  const displayName = input.displayName.trim().replace(/\s+/gu, " ");
  if (!displayName || displayName.length > 120) registrationUnavailable();
  const paymentId = publicPaymentId(eventId, uid, requestId);
  const requestHash = createHash("sha256")
    .update(
      canonicalJson({
        eventId,
        uid,
        phoneE164,
        displayName,
        requestId,
        reviewedQuote,
        inviteLinkId,
      }),
    )
    .digest("hex");
  return db.runTransaction(async (tx) => {
    await assertCurrentPublicGuest({...input, tx});
    const paymentRef = db
      .collection(PUBLIC_PAYMENT_COLLECTION)
      .doc(paymentId);
    const prior = await tx.get(paymentRef);
    if (prior.exists) {
      const payment = parsePublicPayment(prior.data(), paymentId);
      if (payment.requestHash !== requestHash) {
        throw new HttpsError(
          "already-exists",
          "Checkout request was reused.",
        );
      }
      return {paymentId, payment, replayed: true};
    }
    const nowMillis = (input.nowMillis ?? Date.now)();
    const {event, organizer} = await readPublicEventSource({
      db,
      tx,
      eventId,
    });
    await assertPublicEventAge({db, tx, uid, event, nowMillis});
    const quote = publicCheckoutQuote(eventId, event, organizer, nowMillis,
      await publicGuestMembership({db, tx, event, uid, nowMillis}),
      await publicHostMembershipQuoteTerms({db, tx, eventId, event, uid,
        nowMillis}));
    assertReviewedPublicQuote(reviewedQuote, quote);
    const organizerId = event.organizerId!;
    if (
      nowMillis + CHECKOUT_HOLD_MILLIS >= quote.startTimeMillis ||
      (await readSeatMigrationWriterFence({db, tx, eventId})) !== "ready"
    ) {
      registrationUnavailable("Checkout is closed for this event.");
    }
    const identity = await preparePublicGuestIdentity({
      db,
      tx,
      eventId,
      organizerId,
      uid,
      phoneE164,
      nowMillis,
    });
    const seats = new FirestoreSeatTransaction(db, tx);
    const [ledger, reservation] = await Promise.all([
      seats.ledger(eventId),
      seats.reservation(eventId, identity.identity.key),
    ]);
    assertCurrentReadySeatSnapshot({
      event,
      eventId,
      organizerId,
      identity: identity.identity,
      ledger,
      reservation,
    });
    if (!ledger) registrationUnavailable();
    const existingStatus = identity.existing?.status;
    if (existingStatus === "registered" || existingStatus === "checkedIn") {
      if (!reservation?.active || reservation.checkoutHold ||
          reservation.temporaryHold) {
        registrationUnavailable();
      }
      identity.apply();
      return {
        admission: {
          eventId,
          attendeeId: identity.attendeeId,
          status: existingStatus,
        },
      };
    }
    if (reservation?.active || reservation?.checkoutHold ||
        reservation?.temporaryHold) {
      registrationUnavailable(
        "Finish your current checkout before retrying.",
      );
    }
    assertPaymentRouteSnapshot(routing, {
      organizerId,
      purpose: "eventAdmission",
      currency: quote.currency,
      amountMinor: quote.amountPaise,
    });
    await assertRazorpayCollectionRoutingCurrent({
      db,
      tx,
      snapshot: routing,
      nowMillis,
    });
    const roster = await rosterWithReservedWaitlistOffersInTransaction(
      tx,
      db,
      eventId,
      {
        bookedCountsByCohort: {},
        waitlistedCountsByCohort: {},
        totalBooked: ledger.occupied + heldSeatCount(ledger),
      },
      {nowMillis},
    );
    if (roster.totalBooked >= ledger.capacity) {
      registrationUnavailable("This event is now full.");
    }
    const hold = await prepareCheckoutHold({
      tx: seats,
      command: {
        eventId,
        subject: identity.identity,
        operation: "checkoutHold",
        paymentId,
        requestId: `hold_${paymentId}`,
        expectedLedgerRevision: ledger.revision,
        expectedCapacityRevision: ledger.capacityRevision,
        expectedMigrationRevision: ledger.migrationRevision,
        expectedReservationRevision: reservation?.revision ?? 0,
        nowMillis,
      },
      resolveIdentity: async () => identity.identity,
    });
    const now = Timestamp.fromMillis(nowMillis);
    const payment: Payment = {
      eventId,
      organizerId,
      recipientUid: uid,
      phoneE164,
      displayName,
      requestId,
      requestHash,
      inviteLinkId,
      attendeeId: identity.attendeeId,
      eventName: quote.eventName,
      registrationRevision: quote.registrationRevision,
      canonicalSeatKey: identity.identity.key,
      identityRevision: identity.identity.revision,
      migrationRevision: ledger.migrationRevision,
      routing,
      cancellationPolicy: quote.cancellationPolicy,
      amountPaise: quote.amountPaise,
      currency: quote.currency,
      receipt: paymentId,
      status: "creatingOrder",
      providerOrderId: null,
      providerPaymentId: null,
      providerRefundId: null,
      refundedAmountPaise: 0,
      admissionReceiptId: null,
      reservationReleased: false,
      leaseUntil: null,
      createdAt: now,
      updatedAt: now,
      capturedAt: null,
      admittedAt: null,
      checkoutExpiresAt: Timestamp.fromMillis(
        nowMillis + CHECKOUT_HOLD_MILLIS,
      ),
      lastErrorCode: null,
    };
    parsePublicPayment(payment, paymentId);
    identity.apply();
    applyCheckoutHold(seats, hold);
    tx.create(paymentRef, payment);
    return {paymentId, payment, replayed: false};
  });
}
