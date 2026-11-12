import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {createFormPaymentFixture} from "./formPaymentTestStore";
import {FormPaymentProcessor} from "./formPaymentProcessor";
import type {FormProviderPayment} from "./razorpayFormProvider";
import {expireFormPaymentReservation} from "./formPaymentSubmission";

async function harness() {
  const h = createFormPaymentFixture();
  const {paymentId, payment: ledger} = await h.reserve();
  let now = 1000;
  let createCalls = 0;
  let captured = false;
  let finalizations = 0;
  const refundKeys: string[] = [];
  const order = {id: "order_one", amount: ledger.amountPaise,
    currency: "INR" as const, receipt: ledger.receipt,
    status: "created" as const};
  let payment: FormProviderPayment = {id: "pay_one", orderId: order.id,
    amount: order.amount, currency: "INR", status: "authorized",
    captured: false,
    amountRefunded: 0};
  const provider = {
    createOrder: async () => {
      createCalls++; return order;
    },
    findOrderByReceipt: async () => createCalls ? order : null,
    fetchOrder: async () => order,
    fetchOrderPayments: async () => [payment],
    fetchPayment: async () => payment,
    capturePayment: async () => {
      captured = true;
      payment = {...payment, status: "captured", captured: true};
      return payment;
    },
    refundPayment: async (_token: string, input: {idempotencyKey: string}) => {
      refundKeys.push(input.idempotencyKey);
      return {id: "rfnd_one", paymentId: payment.id, amount: payment.amount,
        status: "processed" as const};
    },
    fetchRefund: async () => ({id: "rfnd_one", paymentId: payment.id,
      amount: payment.amount, status: "processed" as const}),
    verifyCheckout: () => true,
  };
  const processor = new FormPaymentProcessor({db: h.db, provider,
    vault: {access: async (_version, binding) => ({...binding,
      token: {accountId: "acc_merchant", accessToken: "private",
        refreshToken: "refresh", publicToken: "rzp_test_oauth_public",
        expiresAt: 100_000_000}, webhookSecret: "s".repeat(43)})},
    now: () => now});
  // Count actual durable responses, not method calls.
  const responseCount = () => {
    finalizations = [...h.store.records.keys()].filter((path) =>
      path.startsWith("organizerFormResponses/")).length;
    return finalizations;
  };
  return {...h, ledger, paymentId, processor, provider, refundKeys,
    responseCount,
    createCalls: () => createCalls, captured: () => captured,
    setPayment: (value: Partial<FormProviderPayment>) => {
      payment = {...payment, ...value};
    }, setNow: (value: number) => {
      now = value;
    }};
}

test("provider reconciliation captures and submits without a browser callback",
  async () => {
    const h = await harness();
    const payment = await h.processor.reconcile(h.paymentId);
    assert.equal(payment.status, "submitted");
    assert.equal(h.captured(), true);
    assert.equal(h.responseCount(), 1);
    await h.processor.reconcile(h.paymentId);
    assert.equal(h.createCalls(), 1);
    assert.equal(h.responseCount(), 1);
  });

test("uncertain order creation recovers by receipt without a second POST",
  async () => {
    const h = await harness();
    const original = h.provider.createOrder;
    h.provider.createOrder = async () => {
      await original();
      throw new Error("Lost provider reply");
    };
    await assert.rejects(h.processor.ensureOrder(h.paymentId),
      /being checked/u);
    assert.equal((await h.processor.read(h.paymentId)).status, "orderUnknown");
    assert.equal((await h.processor.ensureOrder(h.paymentId)).providerOrderId,
      "order_one");
    assert.equal(h.createCalls(), 1);
  });

test("simultaneous checkout preparation has one provider order owner",
  async () => {
    const h = await harness();
    await Promise.all([h.processor.ensureOrder(h.paymentId),
      h.processor.ensureOrder(h.paymentId)]);
    assert.equal(h.createCalls(), 1);
  });

test("foreign order, amount or caller cannot cause capture or submission",
  async () => {
    for (const patch of [{orderId: "order_other"}, {amount: 20000},
      {currency: "USD"}]) {
      const h = await harness();
      h.setPayment(patch);
      await assert.rejects(h.processor.reconcile(h.paymentId),
        /does not match/u);
      assert.equal(h.captured(), false);
      assert.equal(h.responseCount(), 0);
    }
    const h = await harness();
    await h.processor.ensureOrder(h.paymentId);
    await assert.rejects(h.processor.verifyClientCallback({
      paymentId: h.paymentId,
      respondentUid: "other", providerPaymentId: "pay_one", signature: "any"}));
    h.provider.verifyCheckout = () => false;
    await assert.rejects(h.processor.verifyClientCallback({
      paymentId: h.paymentId,
      respondentUid: "person", providerPaymentId: "pay_one",
      signature: "bad"}));
    assert.equal(h.captured(), false);
  });

test("released reservation refunds a late capture and creates no application",
  async () => {
    const h = await harness();
    await h.processor.ensureOrder(h.paymentId);
    h.setNow(h.ledger.checkoutExpiresAt.toMillis());
    await expireFormPaymentReservation({db: h.db, paymentId: h.paymentId,
      now: h.ledger.checkoutExpiresAt});
    h.setPayment({status: "captured", captured: true});
    assert.equal((await h.processor.reconcile(h.paymentId)).status, "refunded");
    assert.equal(h.responseCount(), 0);
    assert.deepEqual(h.refundKeys, [`form_refund_${h.paymentId}`]);
    assert.equal(
      h.store.records.get("organizerForms/form")?.pendingPaymentCount,
      0);
  });

test("uncertain refunds replay the same key and amount", async () => {
  const h = await harness();
  await h.processor.ensureOrder(h.paymentId);
  h.setPayment({status: "captured", captured: true});
  // A missing frozen submission must be refunded even while its slot is held.
  h.store.records.delete("organizerFormResponseDrafts/draft");
  const original = h.provider.refundPayment;
  let loseReply = true;
  h.provider.refundPayment = async (token, input) => {
    const result = await original(token, input);
    if (loseReply) {
      loseReply = false; throw new Error("Lost refund response");
    }
    return result;
  };
  await assert.rejects(h.processor.reconcile(h.paymentId), /Lost refund/u);
  assert.equal((await h.processor.reconcile(h.paymentId)).status, "refunded");
  assert.equal(h.refundKeys.length, 2);
  assert.equal(h.refundKeys[0], h.refundKeys[1]);
  assert.equal(h.responseCount(), 0);
});

test("stale authorization does not regress a completed response", async () => {
  const h = await harness();
  await h.processor.reconcile(h.paymentId);
  h.setPayment({status: "failed", captured: false});
  h.setNow(Timestamp.fromMillis(2000).toMillis());
  assert.equal((await h.processor.reconcile(h.paymentId)).status, "submitted");
  assert.equal(h.responseCount(), 1);
});

test("reviewed checkouts do not capture or refund on provider replay",
  async () => {
    const h = await harness();
    await h.processor.ensureOrder(h.paymentId);
    const key = `guestPayments/${h.paymentId}`;
    h.store.records.set(key, {...h.store.records.get(key),
      status: "reviewRequired"});
    assert.equal((await h.processor.reconcile(h.paymentId)).status,
      "reviewRequired");
    assert.equal(h.captured(), false);
    h.setNow(h.ledger.checkoutExpiresAt.toMillis() + 1);
    h.setPayment({status: "captured", captured: true});
    assert.equal((await h.processor.reconcile(h.paymentId)).status,
      "reviewRequired");
    assert.equal(h.responseCount(), 0);
    assert.deepEqual(h.refundKeys, []);
  });

test("duplicate-capture review survives original payment reconciliation",
  async () => {
    const h = await harness();
    const original = await h.processor.reconcile(h.paymentId);
    h.setPayment({id: "pay_duplicate"});
    assert.equal((await h.processor.reconcile(h.paymentId)).status,
      "reviewRequired");
    h.setPayment({id: "pay_one"});
    const replayed = await h.processor.reconcile(h.paymentId);
    assert.equal(replayed.status, "reviewRequired");
    assert.equal(replayed.providerPaymentId, "pay_one");
    assert.equal(replayed.responseId, original.responseId);
    assert.equal(h.responseCount(), 1);
    assert.deepEqual(h.refundKeys, []);
  });
