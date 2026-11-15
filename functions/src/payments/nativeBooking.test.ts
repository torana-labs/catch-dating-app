import assert from "node:assert/strict";
import test from "node:test";
import {Store} from "../organizerFormAdmission/admissionTestFixture";
import {prepareNativePaidBooking, stageRejectedNativeBooking,
  NativePaidBooking} from "./nativeBooking";
import {processLegacyCancellationRefund, LegacyRefundProvider} from
  "./legacyRefunds/processor";
import type {PaymentDocument} from "../shared/generated/firestoreAdminTypes";
import {type LegacyRazorpayRefundAuthorization} from
  "./legacyRefunds/intent";
import {razorpayOwnershipNotes, resolveRazorpayOrderOwnership} from
  "./razorpayOrderOwnership";

const booking: NativePaidBooking = {userId: "user1", eventId: "event1",
  orderId: "order_one", paymentId: "pay_one", amount: 1000,
  amountMinor: 1000, currency: "INR", provider: "razorpay",
  razorpayOwnership: {projectId: "catchdates-dev", schema: "1"}};
const paymentPath = "guestPayments/pay_one";
const participationPath = "eventParticipations/event1_user1";
function admit(store: Store) {
  return store.db().runTransaction(async (tx) => {
    const apply = await prepareNativePaidBooking({db: store.db(), tx, booking,
      eventId: booking.eventId, userId: booking.userId,
      paymentId: booking.paymentId});
    apply();
    tx.set(store.db().collection("eventParticipations").doc("event1_user1"),
      {paymentId: booking.paymentId,
        status: "signedUp"});
  });
}
function fixture() {
  const store = new Store();
  return store;
}
function ownedAuthorization(): LegacyRazorpayRefundAuthorization {
  const runtimeProjectId = "catchdates-dev";
  const ownership = resolveRazorpayOrderOwnership({runtimeProjectId,
    order: {id: booking.orderId,
      notes: razorpayOwnershipNotes(runtimeProjectId)},
    frozenContexts: [booking.razorpayOwnership]});
  if (ownership.kind !== "owned") throw new Error("Expected owned order.");
  return {evidence: ownership.evidence, runtimeProjectId};
}
function reject(store: Store) {
  return stageRejectedNativeBooking({db: store.db(), booking,
    razorpayAuthorization: ownedAuthorization()});
}

test("admission and payment commit together", async () => {
  const store = fixture(); store.failNextCommit = true;
  await assert.rejects(admit(store), /Interrupted commit/);
  assert.equal(store.get(paymentPath), undefined);
  assert.equal(store.get(participationPath), undefined);
  await admit(store);
  assert.equal(store.get(paymentPath)?.status, "completed");
  assert.equal(store.get(participationPath)?.status, "signedUp");
  assert.equal(await stageRejectedNativeBooking({db: store.db(), booking}),
    "admitted");
  assert.equal(store.get(paymentPath)?.cancellationRefund, undefined);
});

test("persisted rejection fences admission and survives replay", async () => {
  const store = fixture();
  assert.equal(await reject(store), "refund");
  const original = store.get(paymentPath);
  await reject(store);
  assert.deepEqual(store.get(paymentPath), original);
  await assert.rejects(admit(store), /cannot admit again/);
  assert.equal(store.get(participationPath), undefined);
});

test("a retry cannot re-admit a cancelled booking", async () => {
  const store = fixture(); await admit(store);
  store.put(participationPath, {paymentId: booking.paymentId,
    status: "cancelled"});
  await assert.rejects(admit(store), /already finalized/);
  assert.equal(store.get(participationPath)?.status, "cancelled");
});

test("failed booking observes pending refunds and retries one key",
  async () => {
    const store = fixture();
    await reject(store);
    let now = Date.now() + 1; let requests = 0; let polls = 0;
    const keys: string[] = [];
    const provider: LegacyRefundProvider = {
      verifyPayment: async () => undefined,
      createRefund: async (intent, attempt) => {
        requests++; keys.push(attempt.idempotencyKey);
        if (requests === 1) throw new Error("Lost POST response");
        return {id: "rfnd_one", paymentId: intent.providerPaymentId,
          amountMinor: 1000, currency: "INR", state: "pending"};
      },
      fetchRefund: async (intent) => {
        polls++;
        return {id: "rfnd_one", paymentId: intent.providerPaymentId,
          amountMinor: 1000, currency: "INR", state: "processed"};
      },
    };
    const run = () => processLegacyCancellationRefund({db: store.db(),
      paymentId: booking.paymentId, provider, clock: () => now});
    await assert.rejects(run(), /Lost POST response/);
    now += 120_001; await run();
    assert.equal(store.get(paymentPath)?.status, "refundFailed");
    now += 120_001; await run();
    assert.equal(store.get(paymentPath)?.status, "refunded");
    assert.equal(new Set(keys).size, 1); assert.equal(polls, 1);
    assert.equal((store.get(paymentPath) as unknown as PaymentDocument)
      .cancellationRefund?.confirmedAmountMinor, 1000);
    await assert.rejects(admit(store), /cannot admit again/);
  });
