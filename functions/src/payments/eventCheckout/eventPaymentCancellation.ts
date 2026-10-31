import {eventGuestCancellationQuote} from "./eventCancellationPolicy";
import type {EventPaymentLedger, EventSeatPaymentState,
  EventPaymentAdmissionReader} from "./eventPaymentState";
import {Timestamp} from "firebase-admin/firestore";
import type {EventDocument} from
  "../../shared/generated/firestoreAdminTypes";
import {HttpsError} from "firebase-functions/v2/https";
import {validateEventAttendeeDocument} from
  "../../shared/generated/validators/eventAttendeeDocument";
import {eventParticipationId} from "../../shared/relationshipDocuments";
import {FirestoreSeatIdentityAuthority, SeatIdentityAuthorityError} from
  "../../events/seatIdentityAuthority";
import {readSeatMigrationWriterFence} from "../../events/seatMigrationPaged";
import {FirestoreSeatTransaction, assertCurrentReadySeatSnapshot} from
  "../../events/seatAuthority/firestoreAdapter";
import {prepareSeatCommand, applySeatPlan, SeatAuthorityError} from
  "../../events/seatAuthority/seatAuthority";
import {catchBookingCancellation, isPublicPaymentBooking} from
  "../../events/publicRegistration/catchBookingBridge";
function unavailable(): never {
  throw new HttpsError("failed-precondition",
    "Paid cancellation needs reconciliation.");
}

/** Host-event cancellation consumer and authenticated guest cancellation.
 * The event is reread in the same
 * transaction as seat release and refund intent; it does not cancel an event
 * itself. The immutable admission receipt remains historical financial proof.
 * A live settlement lease is preserved for refund coordination, not bypassed.
 */
export async function cancelPaidEventAdmission<P extends EventSeatPaymentState>(
  input: {
  ledger: EventPaymentLedger<P>;
  readAdmission: EventPaymentAdmissionReader<P>;
  db: FirebaseFirestore.Firestore; paymentId: string; nowMillis: number;
  guest?: {uid: string; expectedRefundAmountPaise: number};
}): Promise<boolean> {
  const {db, paymentId, nowMillis} = input;
  if (!Number.isSafeInteger(nowMillis) || nowMillis <= 0) unavailable();
  return db.runTransaction(async (tx) => {
    const ref = db.collection(input.ledger.collection).doc(paymentId);
    const payment = input.ledger.parse((await tx.get(ref)).data(), paymentId);
    if (input.guest && payment.recipientUid !== input.guest.uid) {
      throw new HttpsError("permission-denied", "Admission unavailable.");
    }
    if (payment.cancellation) {
      if (input.guest && (payment.cancellation.reason !== "guestCancelled" ||
          payment.cancellation.refundAmountPaise !==
            input.guest.expectedRefundAmountPaise)) unavailable();
      // A later host cancellation restores a full refund even when a guest
      // previously accepted no refund. The seat was already released.
      if (!input.guest && payment.status === "cancelled" &&
          payment.cancellation.reason === "guestCancelled" &&
          payment.cancellation.refundAmountPaise === 0) {
        const event = (await tx.get(db.collection("events")
          .doc(payment.eventId))).data();
        if (event?.status !== "cancelled") return false;
        if ((event.organizerId) !== payment.organizerId) {
          unavailable();
        }
        await input.readAdmission({db, tx, payment, paymentId});
        tx.update(ref, {status: "refundPending",
          cancellation: {...payment.cancellation,
            reason: "eventCancelled", refundAmountPaise: payment.amountPaise,
            requestedAtMillis: nowMillis},
          updatedAt: Timestamp.fromMillis(nowMillis)});
      }
      return true;
    }
    if (!payment.admissionReceiptId || payment.status !== "admitted") {
      return false;
    }
    const {eventId, organizerId, recipientUid} = payment;
    const eventRef = db.collection("events").doc(eventId);
    const event = (await tx.get(eventRef)).data();
    const quote = input.guest ? eventGuestCancellationQuote(payment,
      nowMillis) : {refundAmountPaise: payment.amountPaise};
    if (input.guest) {
      const startsAt = event?.startTime?.toMillis?.();
      if (!quote || quote.refundAmountPaise !==
          input.guest.expectedRefundAmountPaise || event?.status !== "active" ||
          !Number.isSafeInteger(startsAt) || startsAt <= nowMillis) {
        throw new HttpsError("failed-precondition",
          "Cancellation terms changed. Refresh before confirming.");
      }
    } else if (event?.status !== "cancelled") return false;
    if (!quote) unavailable();
    const [receipt, participationSnap] = await Promise.all([
      input.readAdmission({db, tx, payment, paymentId}),
      tx.get(db.collection("eventParticipations")
        .doc(eventParticipationId(eventId, recipientUid))),
    ]);
    if ((event.organizerId) !== organizerId ||
        payment.refundedAmountPaise !== 0 || !payment.providerPaymentId ||
        !payment.providerOrderId) unavailable();
    const attendeeRef = db.collection("eventAttendees").doc(receipt.attendeeId);
    const attendee = (await tx.get(attendeeRef)).data();
    if (!validateEventAttendeeDocument(attendee) ||
        attendee.eventId !== eventId || attendee.organizerId !== organizerId ||
        attendee.linkedUid !== recipientUid ||
        !(input.guest ? ["registered"] : ["registered", "checkedIn"])
          .includes(attendee.status) ||
        attendee.revenueOrderReference !== payment.providerOrderId ||
        attendee.revenueAmountMinor !== payment.amountPaise) {
      unavailable();
    }
    const fenceMode = await readSeatMigrationWriterFence({db, tx, eventId})
      .catch(async (error) => {
        if (error instanceof HttpsError &&
            error.code === "failed-precondition") {
          const fence = (await tx.get(db.collection("eventSeatMigrationFences")
            .doc(eventId))).data();
          if (fence?.eventId === eventId && fence.state === "locked") {
            throw new HttpsError("unavailable",
              "Paid cancellation is waiting for seat migration.");
          }
        }
        throw error;
      });
    if (fenceMode !== "ready") unavailable();
    const identity = await new FirestoreSeatIdentityAuthority().resolve({
      db, tx, eventId, organizerId,
      subject: {kind: "importAttendee", attendeeId: receipt.attendeeId}});
    if (!identity || identity.key !== payment.canonicalSeatKey) unavailable();
    const seatTx = new FirestoreSeatTransaction(db, tx);
    const [ledger, reservation] = await Promise.all([
      seatTx.ledger(eventId), seatTx.reservation(eventId, identity.key),
    ]);
    assertCurrentReadySeatSnapshot({event, eventId, organizerId, identity,
      ledger, reservation, expectedActive: true});
    if (!ledger || !reservation || reservation.checkoutHold ||
        reservation.temporaryHold) unavailable();
    const participation = participationSnap.data();
    const participationActive = !!participation &&
      ["signedUp", "attended"].includes(participation.status);
    // A Consumer edge created by this admission shares its seat and money; an
    // independent Catch booking keeps the seat and owns its own cancellation.
    const bridgedBooking = participationActive &&
      isPublicPaymentBooking(participation?.paymentId, paymentId);
    const seatRetained = participationActive && !bridgedBooking;
    if (seatRetained && (participation?.eventId !== eventId ||
        participation?.uid !== recipientUid ||
        (participation?.organizerId) !==
          organizerId)) {
      unavailable();
    }
    const release = seatRetained ? null : await prepareSeatCommand({
      tx: seatTx, command: {eventId, subject: identity, operation: "release",
        requestId: `cancel_paid_${paymentId}`,
        expectedLedgerRevision: ledger.revision,
        expectedCapacityRevision: ledger.capacityRevision,
        expectedMigrationRevision: ledger.migrationRevision,
        expectedReservationRevision: reservation.revision, nowMillis},
      resolveIdentity: async () => identity});
    const now = Timestamp.fromMillis(nowMillis);
    if (bridgedBooking && (participation?.eventId !== eventId ||
        participation?.uid !== recipientUid ||
        (participation?.organizerId) !==
          organizerId)) {
      unavailable();
    }
    const bridgedCounts = bridgedBooking && input.guest ?
      catchBookingCancellation({tx, participationRef: db
        .collection("eventParticipations")
        .doc(eventParticipationId(eventId, recipientUid)),
      participation: participation!, event: event as EventDocument,
      eventId, uid: recipientUid}) : {};
    if (release) {
      applySeatPlan(seatTx, release);
      tx.update(eventRef, {bookedCount: ledger.occupied - 1,
        ...bridgedCounts});
    }
    tx.update(attendeeRef, {status: "cancelled", cancelledAt: now,
      preCheckInStatus: null, updatedAt: now});
    tx.update(ref, {status: quote.refundAmountPaise > 0 ?
      "refundPending" : "cancelled", reservationReleased: true,
    cancellation: {reason: input.guest ? "guestCancelled" : "eventCancelled",
      requestedAtMillis: nowMillis,
      attendeeId: receipt.attendeeId, refundAmountPaise:
        quote.refundAmountPaise,
      seatRetained},
    updatedAt: now, lastErrorCode: null});
    return true;
  }).catch((error) => {
    if (error instanceof SeatAuthorityError ||
        error instanceof SeatIdentityAuthorityError) unavailable();
    throw error;
  });
}
