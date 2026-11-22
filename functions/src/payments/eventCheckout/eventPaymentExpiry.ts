import {Timestamp} from "firebase-admin/firestore";
import {HttpsError} from "firebase-functions/v2/https";
import {FirestoreSeatTransaction} from
  "../../events/seatAuthority/firestoreAdapter";
import {prepareCheckoutHold, applyCheckoutHold} from
  "../../events/seatAuthority/checkoutSeatHold";
import type {EventPaymentLedger, EventSeatPaymentState} from
  "./eventPaymentState";

/** Releasing inventory is not cancellation of the provider order. The saved
 * payment remains recoverable; any late capture must enter refund processing.
 * Source withdrawal/account deletion must not prevent release of its own hold.
 */
export async function releaseEventPaymentHold<P extends EventSeatPaymentState>(
  params: {
  ledger: EventPaymentLedger<P>;
  db: FirebaseFirestore.Firestore; paymentId: string;
  reason: "expired" | "fulfillmentFailed"; nowMillis: number;
}): Promise<string> {
  const {db, paymentId, nowMillis, reason} = params;
  if (!Number.isSafeInteger(nowMillis) || nowMillis <= 0 ||
      !["expired", "fulfillmentFailed"].includes(reason)) unavailable();
  return db.runTransaction(async (tx) => {
    const ref = db.collection(params.ledger.collection).doc(paymentId);
    const payment = params.ledger.parse((await tx.get(ref)).data(), paymentId);
    if (payment.admissionReceiptId) return "admitted";
    if (payment.reservationReleased) return payment.status;
    const rejectedOrder = payment.status === "failed" &&
      payment.lastErrorCode === "orderRejected" && !payment.providerOrderId &&
      !payment.providerPaymentId && !payment.capturedAt;
    if (reason === "expired" && !rejectedOrder &&
        nowMillis < payment.checkoutExpiresAt.toMillis()) return payment.status;
    if (reason === "fulfillmentFailed" &&
        (payment.status !== "captured" || !payment.capturedAt ||
          !payment.providerPaymentId)) unavailable();
    const seatTx = new FirestoreSeatTransaction(db, tx);
    const [ledger, reservation] = await Promise.all([
      seatTx.ledger(payment.eventId),
      seatTx.reservation(payment.eventId, payment.canonicalSeatKey),
    ]);
    if (!ledger || !reservation ||
        ledger.migrationRevision !== payment.migrationRevision ||
        reservation.identityRevision !== payment.identityRevision ||
        reservation.checkoutHold?.paymentId !== paymentId ||
        reservation.checkoutHold.expiresAtMillis !==
          payment.checkoutExpiresAt.toMillis()) unavailable();
    const identity = {key: payment.canonicalSeatKey,
      revision: payment.identityRevision};
    const release = await prepareCheckoutHold({tx: seatTx, command: {
      eventId: payment.eventId, subject: identity, paymentId,
      operation: "releaseCheckoutHold", requestId: `release_${paymentId}`,
      expectedLedgerRevision: ledger.revision,
      expectedCapacityRevision: ledger.capacityRevision,
      expectedMigrationRevision: ledger.migrationRevision,
      expectedReservationRevision: reservation.revision, nowMillis,
    }, resolveIdentity: async () => identity});
    const captured = payment.capturedAt !== null &&
      payment.providerPaymentId !== null;
    applyCheckoutHold(seatTx, release);
    const status = payment.status === "reviewRequired" ||
        payment.refundedAmountPaise > 0 &&
        payment.refundedAmountPaise < payment.amountPaise ? "reviewRequired" :
      payment.refundedAmountPaise === payment.amountPaise ? "refunded" :
        captured ? "refundPending" : "expired";
    tx.update(ref, {reservationReleased: true, status,
      updatedAt: Timestamp.fromMillis(nowMillis),
      lastErrorCode: reason === "fulfillmentFailed" ?
        "admissionUnavailable" : payment.lastErrorCode});
    return status;
  });
}
function unavailable(): never {
  throw new HttpsError("failed-precondition",
    "Payment inventory needs reconciliation.");
}
