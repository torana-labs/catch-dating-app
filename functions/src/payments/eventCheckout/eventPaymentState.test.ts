import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import type {PaymentRoutingSnapshot} from "../paymentRouting";
import {
  markEventPaymentAdmitted,
  markEventPaymentRefundPending,
} from "./eventPaymentState";

function recordingTx() {
  const updates: Array<{ref: unknown; data: Record<string, unknown>}> = [];
  return {updates, tx: {update(ref: unknown, data: Record<string, unknown>) {
    updates.push({ref, data});
  }} as unknown as FirebaseFirestore.Transaction};
}
const ref = {path: "guestPayments/pp_one"} as
  unknown as FirebaseFirestore.DocumentReference;
const routing = (route: string) =>
  ({selection: {route}} as unknown as PaymentRoutingSnapshot);

test("admission on a Razorpay Route payment starts its settlement", () => {
  const {tx, updates} = recordingTx();
  markEventPaymentAdmitted(tx, ref, {routing: routing("razorpayRoute"),
    admissionReceiptId: "public_paid_pp_one", nowMillis: 5_000});
  assert.equal(updates.length, 1);
  assert.equal(updates[0].ref, ref);
  assert.deepEqual(updates[0].data, {
    status: "admitted",
    admissionReceiptId: "public_paid_pp_one",
    admittedAt: Timestamp.fromMillis(5_000),
    updatedAt: Timestamp.fromMillis(5_000),
    lastErrorCode: null,
    settlement: {state: "waiting", transferId: null,
      nextAttemptAtMillis: 5_000, leaseUntilMillis: 0, leaseId: null,
      authorizedAtMillis: null, completedAtMillis: null,
      releasedAtMillis: null, settledAtMillis: null},
  });
});

test("admission on a direct payment has nothing to settle", () => {
  const {tx, updates} = recordingTx();
  markEventPaymentAdmitted(tx, ref, {routing: routing("razorpayStandard"),
    admissionReceiptId: "receipt", nowMillis: 7});
  assert.equal("settlement" in updates[0].data, false);
  assert.equal(updates[0].data.status, "admitted");
});

test("a released hold leaves the captured payment waiting for a refund", () => {
  const {tx, updates} = recordingTx();
  markEventPaymentRefundPending(tx, ref, 9);
  assert.deepEqual(updates[0].data, {status: "refundPending",
    updatedAt: Timestamp.fromMillis(9)});
});
