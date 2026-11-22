import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {CHECKOUT_HOLD_MILLIS} from "./checkoutHold";
import {publicFixture, now} from "../../events/publicRegistration/testFixture";
import {
  openPublicEventPayment,
  PUBLIC_PAYMENT_COLLECTION,
  type PublicEventPaymentFacts,
} from "./publicEventPayments";

function recordingTx() {
  const creates: Array<{path: string; data: unknown}> = [];
  return {creates, tx: {create(ref: {path: string}, data: unknown) {
    creates.push({path: ref.path, data});
  }} as unknown as FirebaseFirestore.Transaction};
}

test("a booking opens the same payment the reservation stores", async () => {
  const h = await publicFixture();
  const result = await h.reserve();
  assert.ok("payment" in result);
  const {paymentId, payment: stored} = result;
  const facts = {...stored} as Record<string, unknown>;
  for (const key of ["purpose", "receipt", "status", "providerOrderId",
    "providerPaymentId", "providerRefundId", "refundedAmountPaise",
    "admissionReceiptId", "reservationReleased", "leaseUntil", "createdAt",
    "updatedAt", "capturedAt", "admittedAt", "checkoutExpiresAt",
    "lastErrorCode"]) delete facts[key];
  const {tx, creates} = recordingTx();
  const ref = h.store.db().collection(PUBLIC_PAYMENT_COLLECTION).doc(paymentId);
  const opened = openPublicEventPayment(tx,
    ref as unknown as FirebaseFirestore.DocumentReference,
    facts as unknown as PublicEventPaymentFacts, now);
  assert.equal(creates.length, 1);
  assert.equal(creates[0].path, `${PUBLIC_PAYMENT_COLLECTION}/${paymentId}`);
  assert.deepEqual(opened, stored);
  assert.equal(opened.status, "creatingOrder");
  assert.equal(opened.receipt, paymentId);
  assert.deepEqual(opened.checkoutExpiresAt,
    Timestamp.fromMillis(now + CHECKOUT_HOLD_MILLIS));
});

test("an invalid payment is refused before anything is written", async () => {
  const h = await publicFixture();
  const result = await h.reserve();
  assert.ok("payment" in result);
  const {tx, creates} = recordingTx();
  const ref = h.store.db().collection(PUBLIC_PAYMENT_COLLECTION)
    .doc(result.paymentId);
  assert.throws(() => openPublicEventPayment(tx,
    ref as unknown as FirebaseFirestore.DocumentReference,
    {...result.payment, amountPaise: -1} as PublicEventPaymentFacts, now));
  assert.equal(creates.length, 0);
});
