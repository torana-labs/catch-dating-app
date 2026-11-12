import assert from "node:assert/strict";
import {Timestamp} from "firebase-admin/firestore";
import test from "node:test";
import {setup, uid, phone, now} from "./offerPaymentTestFixture";
import {eventId, offerId} from
  "../../organizerFormAdmission/admissionTestFixture";
import {CHECKOUT_HOLD_MILLIS} from
  "../../events/seatAuthority/seatAuthority";
import {OfferPaymentProcessor, type OfferPaymentProcessorDeps} from
  "./offerPaymentProcessor";
import type {FormProviderPayment, FormPaymentOrder} from
  "../formPayments/razorpayPaymentProvider";

import {cancelPaidOfferForCancelledEvent} from "./offerPaymentCancellation";

async function processorFixture() {
  const h = await setup();
  const {paymentId} = await h.reserve();
  let time = now + 10;
  let order: FormPaymentOrder | null = null;
  let lostOrderResponse = false;
  let lostRefundResponse = false;
  let offline = false;
  let observations: FormProviderPayment[] = [];
  const calls = {create: 0, find: 0, capture: 0, refund: [] as string[],
    ready: 0, fetchRefund: 0};
  const provider: OfferPaymentProcessorDeps["provider"] = {
    createOrder: async (_token, input) => {
      calls.create++;
      order = {id: "order_one", ...input, currency: "INR", status: "created"};
      if (lostOrderResponse) throw new Error("Lost response");
      return order;
    },
    findOrderByReceipt: async () => {
      calls.find++; return order;
    },
    fetchOrder: async () => {
      if (offline) throw new Error("Provider offline");
      assert.ok(order); return order;
    },
    fetchOrderPayments: async () => observations,
    fetchPayment: async (_token, id) => {
      const payment = observations.find((item) => item.id === id);
      assert.ok(payment); return payment;
    },
    capturePayment: async (_token, id) => {
      calls.capture++;
      const payment = observations.find((item) => item.id === id);
      assert.ok(payment);
      Object.assign(payment, {captured: true, status: "captured"});
      return payment;
    },
    refundPayment: async (_token, input) => {
      calls.refund.push(input.idempotencyKey);
      if (lostRefundResponse) {
        lostRefundResponse = false;
        throw new Error("Lost refund response");
      }
      return {id: "rfnd_one", paymentId: input.paymentId,
        amount: input.amount, status: "processed"};
    },
    fetchRefund: async () => {
      calls.fetchRefund++;
      return {id: "rfnd_one", paymentId: "pay_one", amount: 10000,
        status: "processed"};
    },
    verifyCheckout: (input) => input.signature === "valid",
  };
  const processor = new OfferPaymentProcessor({db: h.store.db(), paymentId,
    routing: h.routing, provider, now: () => time,
    loadCurrentAuthUser: async () => ({uid, phoneNumber: phone}),
    authority: {resolve: async () => ({accountId: "acc_platform", mode: "test",
      authorizationHandle: "key", checkoutKey: "key",
      expiresAtMillis: Number.MAX_SAFE_INTEGER}),
    assertReady: async () => {
      calls.ready++;
    }}});
  const observe = (patch: Partial<FormProviderPayment> = {}) => {
    observations = [{id: "pay_one", orderId: "order_one", amount: 10000,
      currency: "INR", status: "captured", captured: true, amountRefunded: 0,
      ...patch}];
  };
  return {...h, paymentId, processor, calls, observe,
    advance: (at: number) => {
      time = at;
    },
    loseOrder: () => {
      lostOrderResponse = true;
    },
    loseRefund: () => {
      lostRefundResponse = true;
    },
    offline: () => {
      offline = true;
    }};
}

test("uncertain order is recovered by receipt and never posted twice",
  async () => {
    const h = await processorFixture();
    h.loseOrder();
    await assert.rejects(h.processor.ensureOrder());
    assert.equal((await h.processor.read()).status, "orderUnknown");
    const recovered = await h.processor.ensureOrder();
    assert.equal(recovered.providerOrderId, "order_one");
    assert.equal(h.calls.create, 1);
    assert.equal(h.calls.find, 1);
    assert.equal(h.calls.ready, 1);
  });

test("host cancellation refunds an admitted payment without re-admission",
  async () => {
    const h = await processorFixture();
    await h.processor.ensureOrder();
    h.observe();
    const admitted = await h.processor.reconcile();
    h.store.get(`events/${eventId}`)!.status = "cancelled";
    h.loseRefund();
    await assert.rejects(h.processor.reconcile(), /Lost refund response/u);
    assert.equal((await h.processor.read()).status, "refundPending");
    const result = await h.processor.reconcile();
    assert.equal(result.status, "refunded");
    assert.equal(result.settlement?.state, "reversed");
    assert.equal(result.admissionReceiptId, admitted.admissionReceiptId);
    assert.equal(h.store.get(`eventSeatLedgers/${eventId}`)!.occupied, 0);
    await h.processor.reconcile();
    assert.equal((await h.processor.read()).status, "refunded");
    assert.equal(h.store.get(`eventSeatLedgers/${eventId}`)!.occupied, 0);
    assert.deepEqual(h.calls.refund, Array(2).fill(
      `offer_refund_${h.paymentId}`));
  });

test("host refund waits for an in-flight settlement or another refund lease",
  async () => {
    for (const settlementLease of [true, false]) {
      const h = await processorFixture();
      await h.processor.ensureOrder();
      h.observe();
      const admitted = await h.processor.reconcile();
      h.store.get(`events/${eventId}`)!.status = "cancelled";
      const ledger = h.store.get("guestPayments/" +
        h.paymentId)!;
      if (settlementLease) {
        ledger.settlement = {...admitted.settlement,
          leaseId: "a".repeat(32), leaseUntilMillis: now + 1000};
      } else {
        ledger.leaseUntil = Timestamp.fromMillis(now + 1000);
      }
      assert.equal((await h.processor.reconcile()).status, "refundPending");
      assert.equal(h.calls.refund.length, 0);
      h.advance(now + 1001);
      assert.equal((await h.processor.reconcile()).status, "refunded");
      assert.equal(h.calls.refund.length, 1);
    }
  });

test("expired attempt never creates order and releases inventory offline",
  async () => {
    const h = await processorFixture();
    h.advance(now + CHECKOUT_HOLD_MILLIS);
    const expired = await h.processor.reconcile();
    assert.equal(expired.status, "expired");
    assert.equal(expired.reservationReleased, true);
    assert.equal(h.calls.create, 0);
    const pending = await processorFixture();
    await pending.processor.ensureOrder();
    pending.advance(now + CHECKOUT_HOLD_MILLIS);
    pending.offline();
    await assert.rejects(pending.processor.reconcile());
    assert.equal((await pending.processor.read()).reservationReleased, true);
    assert.equal(pending.store.get(`eventSeatLedgers/${eventId}`)!
      .checkoutHeld, 0);
  });

test("verified capture admits once and duplicate callback cannot refund",
  async () => {
    const h = await processorFixture();
    await h.processor.ensureOrder();
    h.observe({status: "authorized", captured: false});
    const admitted = await h.processor.verifyClientCallback({uid,
      providerPaymentId: "pay_one", signature: "valid"});
    assert.equal(admitted.status, "admitted");
    assert.equal(h.calls.capture, 1);
    h.advance(now + CHECKOUT_HOLD_MILLIS);
    h.store.get(`organizerEventOffers/${offerId}`)!.status = "withdrawn";
    await h.processor.reconcile();
    assert.equal(h.store.get(`eventSeatLedgers/${eventId}`)!.occupied, 1);
    assert.equal(h.calls.capture, 1);
    assert.equal(h.calls.refund.length, 0);
  });

test("signature alone and unrelated provider payments cannot admit",
  async () => {
    const h = await processorFixture();
    await h.processor.ensureOrder();
    await assert.rejects(h.processor.verifyClientCallback({uid: "other",
      providerPaymentId: "pay_one", signature: "valid"}));
    await assert.rejects(h.processor.verifyClientCallback({uid,
      providerPaymentId: "pay_one", signature: "invalid"}));
    h.observe({orderId: "order_other", status: "authorized", captured: false});
    await assert.rejects(h.processor.reconcile());
    assert.equal(h.calls.capture, 0);
    assert.equal(h.store.get(`eventSeatLedgers/${eventId}`)!.occupied, 0);
  });

test("late capture refunds on a stable key after an uncertain refund",
  async () => {
    const h = await processorFixture();
    await h.processor.ensureOrder();
    h.advance(now + CHECKOUT_HOLD_MILLIS);
    h.observe();
    h.loseRefund();
    await assert.rejects(h.processor.reconcile(), /Lost refund response/u);
    assert.equal((await h.processor.read()).status, "refundPending");
    const refunded = await h.processor.reconcile();
    assert.equal(refunded.status, "refunded");
    assert.equal(refunded.refundedAmountPaise, 10000);
    assert.deepEqual(h.calls.refund, Array(2).fill(
      `offer_refund_${h.paymentId}`));
    assert.equal(h.store.get(`eventSeatLedgers/${eventId}`)!.occupied, 0);
    assert.equal(h.store.get(`eventSeatLedgers/${eventId}`)!.checkoutHeld, 0);
  });

test("revoked source refunds capture and duplicate capture requires review",
  async () => {
    const revoked = await processorFixture();
    await revoked.processor.ensureOrder();
    revoked.observe();
    revoked.store.get(`organizerEventOffers/${offerId}`)!.status = "withdrawn";
    assert.equal((await revoked.processor.reconcile()).status, "refunded");
    const h = await processorFixture();
    await h.processor.ensureOrder();
    h.observe();
    await h.processor.reconcile();
    h.observe({id: "pay_duplicate"});
    const review = await h.processor.reconcile();
    assert.equal(review.status, "reviewRequired");
    assert.equal(review.providerPaymentId, "pay_one");
    assert.equal(h.calls.refund.length, 0);
  });

for (const amount of [0, 10000]) {
  test(`guest ${amount} refund survives provider replay without readmission`,
    async () => {
      const h = await processorFixture();
      await h.processor.ensureOrder(); h.observe();
      await h.processor.reconcile();
    h.store.get("guestPayments/" +
      h.paymentId)!.cancellationPolicy = {
        refundDeadlineMillis: amount ? 3000 : 2000, eventStartsAtMillis:
        5_000_000};
    await cancelPaidOfferForCancelledEvent({db: h.store.db(), paymentId:
      h.paymentId,
    nowMillis: 3000, guest: {uid, expectedRefundAmountPaise: amount}});
    h.advance(3001);
    assert.equal((await h.processor.reconcile()).status, amount ? "refunded" :
      "cancelled");
    await h.processor.reconcile();
    assert.equal(h.calls.refund.length, amount ? 1 : 0);
    assert.equal(h.store.get(`eventSeatLedgers/${eventId}`)!.occupied, 0);
    if (!amount) {
      h.observe({amountRefunded: 10000, status: "refunded"});
      assert.equal((await h.processor.reconcile()).status, "reviewRequired");
    }
    });
}
