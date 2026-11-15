import {Timestamp} from "firebase-admin/firestore";
import {HttpsError} from "firebase-functions/v2/https";
import type {PaymentDocument} from "../shared/generated/firestoreAdminTypes";
import {validatePaymentDocument} from
  "../shared/generated/validators/paymentDocument";
import {incrementInviteLinkCounterInTransaction} from "../events/inviteLinks";
import {planLegacyCancellationRefund,
  type LegacyRazorpayRefundAuthorization} from
  "./legacyRefunds/intent";
import {getCatchBooking} from "../shared/relationshipDocuments";

/** Server-verified captured payment; committed in the admission transaction. */
export type NativePaidBooking = Omit<PaymentDocument,
  "createdAt" | "completedAt" | "updatedAt" | "status" | "signUpFailed" |
  "cancellationRefund">;

function paymentRecord(booking: NativePaidBooking,
  existing: FirebaseFirestore.DocumentData | undefined): PaymentDocument {
  const now = Timestamp.now();
  const payment = {...existing, ...booking, status: "completed" as const,
    signUpFailed: false, createdAt: existing?.createdAt ?? now,
    completedAt: now, updatedAt: now};
  if (!validatePaymentDocument(payment)) {
    throw new HttpsError("failed-precondition",
      "Payment needs reconciliation.");
  }
  for (const key of ["userId", "eventId", "orderId", "paymentId", "amount",
    "amountMinor", "currency", "provider", "checkoutSessionId",
    "providerPaymentId", "stripeAccountId", "applicationFeeAmount"] as const) {
    if (existing?.[key] != null && existing[key] !== payment[key]) {
      throw new HttpsError("failed-precondition", "Payment authority changed.");
    }
  }
  if (existing?.razorpayOwnership !== undefined &&
      (existing.razorpayOwnership.projectId !==
        payment.razorpayOwnership?.projectId ||
       existing.razorpayOwnership.schema !==
        payment.razorpayOwnership?.schema)) {
    throw new HttpsError("failed-precondition", "Payment authority changed.");
  }
  return payment;
}

export async function prepareNativePaidBooking(input: {
  db: FirebaseFirestore.Firestore; tx: FirebaseFirestore.Transaction;
  booking: NativePaidBooking; eventId: string; userId: string;
  paymentId: string | undefined;
}): Promise<() => void> {
  const {db, tx, booking, eventId, userId, paymentId} = input;
  if (booking.eventId !== eventId || booking.userId !== userId ||
      booking.paymentId !== paymentId) {
    throw new HttpsError("failed-precondition",
      "Payment does not match admission.");
  }
  const ref = db.collection("payments").doc(booking.paymentId);
  const existing = (await tx.get(ref)).data();
  if (existing?.cancellationRefund || existing?.signUpFailed ||
      ["refunded", "refundFailed"].includes(existing?.status)) {
    throw new HttpsError("failed-precondition",
      "This payment cannot admit again.");
  }
  const payment = paymentRecord(booking, existing);
  if (existing?.status === "completed") {
    throw new HttpsError("already-exists", "Payment is already finalized.");
  }
  return () => {
    tx.set(ref, payment);
    if (booking.inviteLinkId) {
      incrementInviteLinkCounterInTransaction({db, tx,
        attribution: {inviteLinkId: booking.inviteLinkId,
          inviteSource: booking.inviteSource ?? null}, field: "paidCount"});
    }
  };
}

/** Serializes rejection with admission using the same payment and participation
 * reads. An uncertain successful signup must never become a refund request.
 * Provider work is handled by the durable payment trigger/scheduled recovery.
 */
export async function stageRejectedNativeBooking(input: {
  db: FirebaseFirestore.Firestore; booking: NativePaidBooking;
  razorpayAuthorization?: LegacyRazorpayRefundAuthorization;
}): Promise<"admitted" | "refund"> {
  const {db, booking} = input;
  const ref = db.collection("payments").doc(booking.paymentId);
  return db.runTransaction(async (tx) => {
    const [snapshot, participation] = await Promise.all([tx.get(ref),
      getCatchBooking(db, booking.eventId, booking.userId, tx)]);
    const existing = snapshot.data();
    if (existing?.status === "completed" && !existing.signUpFailed) {
      return "admitted";
    }
    if (existing?.cancellationRefund ||
        ["refunded", "refundFailed"].includes(existing?.status)) {
      return "refund";
    }
    const payment = paymentRecord(booking, existing);
    if (participation.data()?.paymentId === booking.paymentId) {
      // Pre-upgrade interrupted completion: preserve its admission even when
      // the participation was subsequently cancelled. Never re-admit it here.
      tx.set(ref, payment);
      return "admitted";
    }
    const captured = {...payment};
    delete captured.completedAt;
    const failed = {...captured, status: "refundFailed" as const,
      signUpFailed: true};
    const cancellationRefund = planLegacyCancellationRefund({payment: failed,
      reason: "bookingFailed", targetAmountMinor: failed.amount,
      nowMillis: Date.now(),
      razorpayAuthorization: input.razorpayAuthorization});
    tx.set(ref, {...failed, cancellationRefund});
    return "refund";
  });
}
