import {Timestamp} from "firebase-admin/firestore";
import {HttpsError} from "firebase-functions/v2/https";
import type {OrganizerFormAdmissionReceiptDocument as Receipt} from
  "../../shared/generated/organizerFormAdmissionReceiptDocument";
import {validateOrganizerFormAdmissionReceiptDocument} from
  "../../shared/generated/validators/organizerFormAdmissionReceiptDocument";
import {validateOrganizerFormAdmissionDocument} from
  "../../shared/generated/validators/organizerFormAdmissionDocument";
import {validateEventAttendeeDocument} from
  "../../shared/generated/validators/eventAttendeeDocument";
import {readVerifiedOfferRecipient, type LoadRecipientAuth} from
  "../../organizerEventOfferRecipients/recipientGrant";
import {OfferDomainError} from "../../organizerEventOffers/eventOfferDomain";
import {canonicalJson} from "../../events/eventSetupPreferences/resolve";
import {prepareCrmOriginSeatIdentity, SeatIdentityAuthorityError,
  seatIdentityAliasId, seatIdentityValueHash} from
  "../../events/seatIdentityAuthority";
import {eventAttendeeId} from "../../events/eventAttendees";
import {readSeatMigrationWriterFence} from "../../events/seatMigrationPaged";
import {FirestoreSeatTransaction, assertCurrentReadySeatSnapshot} from
  "../../events/seatAuthority/firestoreAdapter";
import {SeatAuthorityError} from "../../events/seatAuthority/seatAuthority";
import {prepareCheckoutHold, applyCheckoutHold} from
  "../../events/seatAuthority/checkoutSeatHold";
import {formAdmissionOwnershipId, formAdmissionReceiptId} from
  "../../organizerFormAdmission/admissionService";
import {admissionRequestHash, AdmissionPolicyError} from
  "../../organizerFormAdmission/admissionPolicy";
import {newFormAttendee} from "../../organizerFormAdmission/admissionRoster";
import {assertUnpartitionedAdmission} from
  "../../organizerFormAdmission/admissionEligibility";
import {formConversionReceiptId} from
  "../../organizers/organizerFormAdmissionIdentity";
import {OFFER_PAYMENT_COLLECTION, parseOfferPayment} from
  "./offerPaymentReservation";
import {releaseOfferPaymentHold} from "./offerPaymentExpiry";
import {markEventPaymentAdmitted, markEventPaymentRefundPending} from
  "../eventCheckout/eventPaymentState";

import {assertPaidOfferAdmission} from "./offerPaymentAdmissionProof";

type Result = "admitted" | "refundPending" | "unchanged";
function unavailable(): never {
  throw new HttpsError("failed-precondition", "Paid admission is unavailable.");
}

/** Trusted capture consumer, never a recipient substitute for a manager call.
 * The provider processor records captured state only after verifying the order,
 * amount, account and provider payment. This transaction then converts only its
 * own live hold and writes roster, ownership, immutable receipt and payment
 * completion together. Source/hold rejection releases inventory for refund;
 * transient transport errors leave the captured attempt recoverable.
 */
export async function finalizeCapturedOfferPayment(params: {
  db: FirebaseFirestore.Firestore; paymentId: string; nowMillis: number;
  loadCurrentAuthUser?: LoadRecipientAuth;
}): Promise<Result> {
  const {db, paymentId, nowMillis} = params;
  if (!/^ep_[a-f0-9]{32}$/u.test(paymentId) ||
      !Number.isSafeInteger(nowMillis) || nowMillis <= 0) unavailable();
  let refundEligible = false;
  try {
    return await db.runTransaction(async (tx): Promise<Result> => {
      refundEligible = false;
      const paymentRef = db.collection(OFFER_PAYMENT_COLLECTION).doc(paymentId);
      const payment = parseOfferPayment((await tx.get(paymentRef)).data(),
        paymentId);
      const {organizerId, eventId, responseId, recipientUid: uid} = payment;
      const requestId = `paid_${paymentId}`;
      const receiptId = formAdmissionReceiptId(organizerId, requestId);
      const receiptRef = db.collection("organizerFormAdmissionReceipts")
        .doc(receiptId);
      const ownershipRef = db.collection("organizerFormAdmissions")
        .doc(formAdmissionOwnershipId(organizerId, eventId, responseId));
      const [receiptSnap, ownershipSnap] = await Promise.all([
        tx.get(receiptRef), tx.get(ownershipRef),
      ]);
      if (payment.admissionReceiptId) {
        const receipt = receiptSnap.data();
        const ownership = ownershipSnap.data();
        assertPaidOfferAdmission({payment, paymentId, receipt, ownership});
        return "admitted";
      }
      if (payment.status !== "captured") return "unchanged";
      if (!payment.providerOrderId || !payment.providerPaymentId ||
          !payment.capturedAt || payment.refundedAmountPaise !== 0 ||
          payment.capturedAt.toMillis() < payment.createdAt.toMillis() ||
          payment.capturedAt.toMillis() > nowMillis) unavailable();
      refundEligible = true;
      if (receiptSnap.exists || ownershipSnap.exists) unavailable();
      if (payment.reservationReleased) {
        markEventPaymentRefundPending(tx, paymentRef, nowMillis);
        return "refundPending";
      }
      const {grant, source} = await readVerifiedOfferRecipient({db, tx,
        grantId: payment.grantId, uid, nowMillis,
        loadCurrentAuthUser: params.loadCurrentAuthUser});
      if (grant.organizerId !== organizerId || grant.eventId !== eventId ||
          grant.responseId !== responseId ||
          grant.offerId !== payment.offerId ||
          grant.contactId !== payment.contactId ||
          grant.originId !== payment.originId ||
          grant.offerRevision !== payment.offerRevision ||
          grant.offerGeneration !== payment.offerGeneration ||
          canonicalJson(source.offer.paymentSnapshot) !==
            canonicalJson(payment.paymentSnapshot) ||
          source.offer.manualPayment.status !== "none") unavailable();
      assertUnpartitionedAdmission(source.event);
      const legacy = await tx.get(db
        .collection("organizerFormConversionReceipts")
        .doc(formConversionReceiptId(responseId, "eventAttendeeProposal",
          eventId)));
      if (legacy.exists || await readSeatMigrationWriterFence({db, tx,
        eventId}) !== "ready") unavailable();
      const identity = await prepareCrmOriginSeatIdentity({db, tx, eventId,
        organizerId, originId: payment.originId, responseId,
        verifiedOfferRecipient: {grantId: payment.grantId, uid,
          now: Timestamp.fromMillis(nowMillis),
          loadCurrentAuthUser: params.loadCurrentAuthUser}});
      if (identity.identity.key !== payment.canonicalSeatKey ||
          identity.identity.revision !== payment.identityRevision ||
          identity.seatAlreadyOccupied) unavailable();
      const seatTx = new FirestoreSeatTransaction(db, tx);
      const [ledger, reservation] = await Promise.all([
        seatTx.ledger(eventId),
        seatTx.reservation(eventId, payment.canonicalSeatKey),
      ]);
      assertCurrentReadySeatSnapshot({event: source.event, eventId,
        organizerId, identity: identity.identity, ledger, reservation});
      if (!ledger || !reservation ||
          ledger.migrationRevision !== payment.migrationRevision ||
          reservation.checkoutHold?.paymentId !== paymentId ||
          reservation.checkoutHold.expiresAtMillis !==
            payment.checkoutExpiresAt.toMillis()) unavailable();
      const confirm = await prepareCheckoutHold({tx: seatTx,
        command: {eventId, subject: identity.identity, paymentId,
          operation: "confirmCheckoutHold", requestId: `confirm_${paymentId}`,
          expectedLedgerRevision: ledger.revision,
          expectedCapacityRevision: ledger.capacityRevision,
          expectedMigrationRevision: ledger.migrationRevision,
          expectedReservationRevision: reservation.revision, nowMillis},
        resolveIdentity: async () => identity.identity});
      const attendeeId = eventAttendeeId(eventId,
        `external:form-admission:${responseId}`);
      const attendeeRef = db.collection("eventAttendees").doc(attendeeId);
      const externalKey = responseId.trim().toLowerCase();
      const aliases = [
        {kind: "attendee" as const, value: attendeeId},
        {kind: "external" as const, value: externalKey},
      ].map((alias) => ({...alias,
        ref: db.collection("eventSeatIdentityAliases").doc(
          seatIdentityAliasId(eventId, alias.kind, alias.value))}));
      const occupied = await Promise.all([tx.get(attendeeRef),
        ...aliases.map((alias) => tx.get(alias.ref))]);
      if (occupied.some((snap) => snap.exists)) unavailable();
      const now = Timestamp.fromMillis(nowMillis);
      const attendee = {...newFormAttendee(eventId, organizerId, responseId,
        source.contact, source.response, source.phoneE164, now),
      linkedUid: uid, linkedAt: now,
      revenueAmountMinor: payment.amountPaise, revenueCurrency: "INR",
      revenueSource: "providerOrder", revenueAllocation: "perAttendee",
      revenueOrderReference: payment.providerOrderId,
      revenueOrderAmountMinor: payment.amountPaise};
      const command = {organizerId, eventId, responseId, requestId,
        actorUid: uid, contactId: payment.contactId, offerId: payment.offerId,
        expectedOfferRevision: payment.offerRevision,
        expectedOfferGeneration: payment.offerGeneration,
        expectedLedgerRevision: ledger.revision};
      const receipt: Receipt = {...command, receiptId, attendeeId,
        requestHash: admissionRequestHash(command),
        canonicalSeatKey: payment.canonicalSeatKey,
        resultingLedgerRevision: confirm.receipt.appliedLedgerRevision,
        admittedAtMillis: nowMillis, seatAlreadyOccupied: false,
        paymentSnapshot: payment.paymentSnapshot,
        manualPayment: source.offer.manualPayment,
        applicationApproval: source.applicationApproval,
        providerPayment: {paymentId, providerOrderId: payment.providerOrderId,
          providerPaymentId: payment.providerPaymentId, recipientUid: uid,
          grantId: payment.grantId,
          capturedAtMillis: payment.capturedAt.toMillis(),
          routing: payment.routing}};
      const ownership = {organizerId, eventId, responseId,
        receiptId, attendeeId,
        canonicalSeatKey: payment.canonicalSeatKey, offerId: payment.offerId,
        offerRevision: payment.offerRevision,
        offerGeneration: payment.offerGeneration};
      if (!validateEventAttendeeDocument(attendee) ||
          !validateOrganizerFormAdmissionDocument(ownership) ||
          !validateOrganizerFormAdmissionReceiptDocument(receipt)) {
        unavailable();
      }
      identity.apply();
      applyCheckoutHold(seatTx, confirm);
      tx.update(db.collection("events").doc(eventId),
        {bookedCount: ledger.occupied + 1});
      tx.create(attendeeRef, attendee);
      for (const alias of aliases) {
        tx.create(alias.ref, {eventId, organizerId, kind: alias.kind,
          valueHash: seatIdentityValueHash(alias.kind, alias.value),
          canonicalKey: payment.canonicalSeatKey,
          identityRevision: payment.identityRevision,
          migrationRevision: payment.migrationRevision, state: "ready"});
      }
      tx.create(receiptRef, receipt);
      tx.create(ownershipRef, ownership);
      markEventPaymentAdmitted(tx, paymentRef, {routing: payment.routing,
        admissionReceiptId: receiptId, nowMillis});
      return "admitted";
    });
  } catch (error) {
    const rejected = error instanceof HttpsError &&
      ["failed-precondition", "permission-denied"].includes(error.code) ||
      error instanceof SeatAuthorityError ||
      error instanceof SeatIdentityAuthorityError ||
      error instanceof AdmissionPolicyError ||
      error instanceof OfferDomainError;
    if (!rejected || !refundEligible) throw error;
    const status = await releaseOfferPaymentHold({db, paymentId, nowMillis,
      reason: "fulfillmentFailed"});
    return status === "admitted" || status === "refundPending" ?
      status : "unchanged";
  }
}
