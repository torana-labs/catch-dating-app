import {GUEST_PAYMENTS} from "../../payments/guestPayments";
import {offerCancellationPolicy, assertReviewedCancellationPolicy,
  type OfferCancellationPolicy} from "./offerCancellationPolicy";
import {assertUnpartitionedAdmission} from
  "../../organizerFormAdmission/admissionEligibility";
import {createHash} from "node:crypto";
import {Timestamp} from "firebase-admin/firestore";
import {HttpsError} from "firebase-functions/v2/https";
import type {OrganizerEventOfferPaymentDocument as Payment} from
  "../../shared/generated/firestoreAdminTypes";
import {validateOrganizerEventOfferPaymentDocument} from
  "../../shared/generated/validators/organizerEventOfferPaymentDocument";
import {readVerifiedOfferRecipient, type LoadRecipientAuth} from
  "../../organizerEventOfferRecipients/recipientGrant";
import {prepareCrmOriginSeatIdentity} from
  "../../events/seatIdentityAuthority";
import {readSeatMigrationWriterFence} from "../../events/seatMigrationPaged";
import {FirestoreSeatTransaction, assertCurrentReadySeatSnapshot} from
  "../../events/seatAuthority/firestoreAdapter";
import {CHECKOUT_HOLD_MILLIS, heldSeatCount} from
  "../../events/seatAuthority/seatAuthority";
import {prepareCheckoutHold, applyCheckoutHold} from
  "../../events/seatAuthority/checkoutSeatHold";
import {rosterWithReservedWaitlistOffersInTransaction} from
  "../../events/eventPolicy";
import {formAdmissionOwnershipId} from
  "../../organizerFormAdmission/admissionService";
import {formConversionReceiptId} from
  "../../organizers/organizerFormAdmissionIdentity";
import {assertPaymentRouteSnapshot, type PaymentRoutingSnapshot} from
  "../paymentRouting";
import {assertRazorpayCollectionRoutingCurrent} from
  "../razorpayCollectionRouting";

export const OFFER_PAYMENT_COLLECTION = GUEST_PAYMENTS;
export function offerPaymentId(grantId: string, uid: string,
  requestId: string): string {
  if (!/^[a-f0-9]{64}$/u.test(grantId) ||
      !/^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/u.test(uid) ||
      !/^[A-Za-z0-9][A-Za-z0-9_-]{7,119}$/u.test(requestId)) unavailable();
  return "ep_" + createHash("sha256").update(JSON.stringify([
    grantId, uid, requestId])).digest("hex").slice(0, 32);
}
function unavailable(): never {
  throw new HttpsError("failed-precondition", "Offer checkout is unavailable.");
}
export function parseOfferPayment(raw: unknown, paymentId: string): Payment {
  if (!validateOrganizerEventOfferPaymentDocument(raw)) unavailable();
  const payment = raw as unknown as Payment;
  if (offerPaymentId(payment.grantId, payment.recipientUid,
    payment.requestId) !== paymentId || payment.receipt !== paymentId ||
      payment.refundedAmountPaise > payment.amountPaise ||
      payment.checkoutExpiresAt.toMillis() - payment.createdAt.toMillis() !==
        CHECKOUT_HOLD_MILLIS ||
      payment.paymentSnapshot.collectionMode !== "catchCheckout" ||
      payment.paymentSnapshot.expectedAmountMinor !== payment.amountPaise ||
      payment.paymentSnapshot.currency !== payment.currency ||
      payment.paymentSnapshot.expiresAtMillis <
        payment.checkoutExpiresAt.toMillis()) unavailable();
  if (payment.cancellationPolicy &&
    payment.cancellationPolicy.refundDeadlineMillis >
      payment.cancellationPolicy.eventStartsAtMillis ||
      payment.status === "cancelled" && !payment.cancellation ||
      payment.cancellation?.reason === "guestCancelled" &&
        !payment.cancellationPolicy) unavailable();
  if (payment.cancellation && (!payment.admissionReceiptId ||
      !payment.reservationReleased ||
      ![0,
        payment.amountPaise].includes(payment.cancellation.refundAmountPaise) ||
      payment.cancellation.reason === "eventCancelled" &&
        payment.cancellation.refundAmountPaise !== payment.amountPaise ||
      payment.cancellation.refundAmountPaise === 0 &&
        payment.status !== "cancelled" && payment.status !== "reviewRequired" ||
      payment.status === "cancelled" &&
        payment.cancellation.refundAmountPaise !== 0 ||
      !["cancelled", "refundPending", "refunded", "reviewRequired"]
        .includes(payment.status))) {
    unavailable();
  }
  assertPaymentRouteSnapshot(payment.routing, {
    organizerId: payment.organizerId, purpose: "eventAdmission",
    currency: payment.currency, amountMinor: payment.amountPaise});
  return payment;
}

/** Freeze the attempt and hold in one TX before any provider I/O.
 * Preparation of routing/provider readiness occurs on the server before this
 * method. A retry returns its saved attempt; it cannot renew the hold or select
 * new routing. Caller must resume that saved route when creating/recovering an
 * order and may only admit after server-verified capture.
 */
export async function reserveOfferPayment(params: {
  db: FirebaseFirestore.Firestore; grantId: string; uid: string;
  requestId: string; routing: PaymentRoutingSnapshot;
  cancellationPolicy?: OfferCancellationPolicy;
  nowMillis?: () => number; loadCurrentAuthUser?: LoadRecipientAuth;
}): Promise<{paymentId: string; payment: Payment; replayed: boolean}> {
  const {db, grantId, uid, requestId, routing} = params;
  const paymentId = offerPaymentId(grantId, uid, requestId);
  return db.runTransaction(async (tx) => {
    const ref = db.collection(OFFER_PAYMENT_COLLECTION).doc(paymentId);
    const prior = await tx.get(ref);
    if (prior.exists) {
      return {paymentId, payment: parseOfferPayment(prior.data(), paymentId),
        replayed: true};
    }
    const nowMillis = (params.nowMillis ?? Date.now)();
    const {grant, source} = await readVerifiedOfferRecipient({db, tx,
      grantId, uid, nowMillis,
      loadCurrentAuthUser: params.loadCurrentAuthUser});
    const {organizerId, eventId, responseId, originId, contactId} = grant;
    const paymentTerms = source.offer.paymentSnapshot;
    if (paymentTerms.collectionMode !== "catchCheckout" ||
        paymentTerms.currency !== "INR" ||
        source.offer.manualPayment.status !== "none" ||
        paymentTerms.expectedAmountMinor === null ||
        paymentTerms.expectedAmountMinor < 100 ||
        nowMillis + CHECKOUT_HOLD_MILLIS > grant.expiresAtMillis) unavailable();
    assertPaymentRouteSnapshot(routing, {organizerId, purpose: "eventAdmission",
      currency: "INR", amountMinor: paymentTerms.expectedAmountMinor});
    await assertRazorpayCollectionRoutingCurrent({db, tx, snapshot: routing,
      nowMillis});
    // These event policies use different eligibility/quota authorities. Never
    // let an approved form bypass them while that shared integration is absent.
    const event = source.event;
    assertUnpartitionedAdmission(event);
    const cancellationPolicy = offerCancellationPolicy(event);
    assertReviewedCancellationPolicy(params.cancellationPolicy,
      cancellationPolicy);
    const [ownership, legacyAdmission] = await Promise.all([
      tx.get(db.collection("organizerFormAdmissions").doc(
        formAdmissionOwnershipId(organizerId, eventId, responseId))),
      tx.get(db.collection("organizerFormConversionReceipts").doc(
        formConversionReceiptId(responseId, "eventAttendeeProposal", eventId))),
    ]);
    if (ownership.exists || legacyAdmission.exists) unavailable();
    if (await readSeatMigrationWriterFence({db, tx, eventId}) !== "ready") {
      unavailable();
    }
    const identity = await prepareCrmOriginSeatIdentity({db, tx, eventId,
      organizerId, originId, responseId,
      verifiedOfferRecipient: {grantId, uid,
        now: Timestamp.fromMillis(nowMillis),
        loadCurrentAuthUser: params.loadCurrentAuthUser}});
    if (identity.seatAlreadyOccupied) unavailable();
    const seatTx = new FirestoreSeatTransaction(db, tx);
    const [ledger, reservation] = await Promise.all([
      seatTx.ledger(eventId),
      seatTx.reservation(eventId, identity.identity.key),
    ]);
    assertCurrentReadySeatSnapshot({event, eventId, organizerId,
      identity: identity.identity, ledger, reservation});
    if (!ledger || reservation?.checkoutHold ||
        reservation?.temporaryHold) unavailable();
    const withOffers = await rosterWithReservedWaitlistOffersInTransaction(
      tx, db, eventId, {bookedCountsByCohort: {},
        waitlistedCountsByCohort: {},
        totalBooked: ledger.occupied + heldSeatCount(ledger)}, {nowMillis});
    if (withOffers.totalBooked >= ledger.capacity) unavailable();
    const hold = await prepareCheckoutHold({tx: seatTx,
      command: {eventId, subject: identity.identity,
        operation: "checkoutHold", paymentId, requestId: `hold_${paymentId}`,
        expectedLedgerRevision: ledger.revision,
        expectedCapacityRevision: ledger.capacityRevision,
        expectedMigrationRevision: ledger.migrationRevision,
        expectedReservationRevision: reservation?.revision ?? 0, nowMillis},
      resolveIdentity: async () => identity.identity});
    const now = Timestamp.fromMillis(nowMillis);
    const payment: Payment = {purpose: "offer", organizerId, eventId,
      responseId, originId,
      contactId, offerId: grant.offerId, grantId, recipientUid: uid, requestId,
      offerGeneration: grant.offerGeneration,
      offerRevision: grant.offerRevision,
      canonicalSeatKey: identity.identity.key,
      identityRevision: identity.identity.revision,
      migrationRevision: ledger.migrationRevision, routing, cancellationPolicy,
      paymentSnapshot: {...paymentTerms,
        expectedAmountMinor: paymentTerms.expectedAmountMinor},
      amountPaise: paymentTerms.expectedAmountMinor,
      currency: "INR", receipt: paymentId, status: "creatingOrder",
      providerOrderId: null, providerPaymentId: null, providerRefundId: null,
      refundedAmountPaise: 0, admissionReceiptId: null,
      reservationReleased: false, leaseUntil: null,
      createdAt: now, updatedAt: now, capturedAt: null, admittedAt: null,
      checkoutExpiresAt: Timestamp.fromMillis(nowMillis + CHECKOUT_HOLD_MILLIS),
      lastErrorCode: null};
    parseOfferPayment(payment, paymentId);
    identity.apply();
    applyCheckoutHold(seatTx, hold);
    tx.create(ref, payment);
    return {paymentId, payment, replayed: false};
  });
}
