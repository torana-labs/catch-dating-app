import assert from "node:assert/strict";
import test from "node:test";
import {HttpsError, type CallableRequest} from "firebase-functions/v2/https";
import {managePublicEventCheckoutHandler as handle} from "./callables";
import {processorFixture} from "./processorTestFixture";
import {uid, phone, eventId, now} from "./testFixture";
import {CHECKOUT_HOLD_MILLIS} from "../seatAuthority/seatAuthority";
import {reconcileVerifiedEventOrder} from
  "../../payments/eventCheckout/eventPaymentWebhook";
import {publicPaymentLedger} from "./paymentLedger";

const request = (
  data: unknown,
  user = uid,
  verifiedPhone: unknown = phone,
) =>
  ({
    data,
    auth: {uid: user, token: {phone_number: verifiedPhone}},
  }) as CallableRequest<unknown>;
async function ready() {
  const h = await processorFixture();
  const quoted = await handle(
    request({action: "quote", eventId}),
    h.deps,
  );
  const prepare = {
    action: "prepare",
    eventId,
    requestId: "public_checkout_1",
    displayName: "Ada Guest",
    reviewedQuote: quoted.quote,
    inviteToken: null,
  };
  return {...h, prepare};
}

test("public checkout requires phone auth and strict payloads", async () => {
  const h = await ready();
  for (const r of [
    request(h.prepare, uid, null),
    {data: h.prepare} as CallableRequest<unknown>,
    request({...h.prepare, recipientUid: uid}),
    request({...h.prepare, amountPaise: 1}),
  ]) {
    await assert.rejects(handle(r, h.deps));
  }
  assert.equal(h.calls.orders, 0);
});

test("public capture and frozen attempt recovery", async () => {
  const h = await ready();
  const first = await handle(request(h.prepare), h.deps);
  assert.equal(first.payment?.status, "checkoutReady");
  assert.ok(first.payment.checkout);
  assert.equal(first.admission, null);
  h.observe({captured: false, status: "authorized"});
  const callback = {
    action: "status",
    paymentId: first.payment.paymentId,
    callback: {paymentId: "pay_one", signature: "b".repeat(64)},
  };
  const admitted = await handle(request(callback), h.deps);
  assert.equal(admitted.payment?.status, "admitted");
  assert.equal(admitted.admission?.status, "registered");
  assert.equal(admitted.payment?.checkout, null);
  const replay = await handle(request(h.prepare), h.deps);
  assert.equal(replay.payment?.paymentId, first.payment.paymentId);
  assert.equal(h.calls.orders, 1);
  assert.equal(h.calls.routes, 1);
  const found = await handle(request({action: "find", eventId}), h.deps);
  assert.equal(found.payment?.paymentId, first.payment.paymentId);
  const before = h.calls.executions;
  await assert.rejects(handle(request(callback, "other"), h.deps));
  assert.equal(h.calls.executions, before);
});

test("lost order response recovers without a second POST", async () => {
  const h = await ready();
  h.loseOrder();
  await assert.rejects(
    handle(request(h.prepare), h.deps),
    /Payment setup is being checked/u,
  );
  const resumed = await handle(request(h.prepare), h.deps);
  assert.equal(resumed.payment?.status, "checkoutReady");
  assert.equal(h.calls.orders, 1);
  assert.equal(h.calls.routes, 1);
});

test("late public capture refunds with a stable retry key", async () => {
  const h = await ready();
  const first = await handle(request(h.prepare), h.deps);
  h.advance(now + 20 + CHECKOUT_HOLD_MILLIS);
  h.observe();
  h.loseRefund();
  const status = request({
    action: "status",
    paymentId: first.payment!.paymentId,
    callback: null,
  });
  await assert.rejects(handle(status, h.deps), /Lost refund/u);
  const refunded = await handle(status, h.deps);
  assert.equal(refunded.payment?.status, "refunded");
  assert.equal(refunded.admission, null);
  assert.deepEqual(
    h.calls.refunds,
    Array(2).fill(`public_refund_${first.payment!.paymentId}`),
  );
  assert.equal(h.store.get(`eventSeatLedgers/${eventId}`)?.occupied, 0);
});

test("public webhook requires its frozen merchant and amount", async () => {
  const h = await ready();
  const first = await handle(request(h.prepare), h.deps);
  h.observe();
  const input = {
    db: h.db,
    order: {
      id: "order_one",
      receipt: first.payment!.paymentId,
      amount: 10000,
      currency: "INR" as const,
      status: "paid" as const,
    },
    providerPaymentId: "pay_one",
    accountId: "acc_platform",
    mode: "test" as const,
    route: "razorpayRoute" as const,
  };
  const deps = {
    ledger: publicPaymentLedger,
    pattern: /^pp_[a-f0-9]{32}$/u,
    execution: h.execution,
  };
  for (const patch of [
    {accountId: "acc_other"},
    {mode: "live" as const},
    {order: {...input.order, amount: 1}},
  ]) {
    await assert.rejects(
      reconcileVerifiedEventOrder({...input, ...patch}, deps),
    );
  }
  assert.equal(await reconcileVerifiedEventOrder(input, deps), true);
  assert.equal(h.store.get(`eventSeatLedgers/${eventId}`)?.occupied, 1);
});

test("definite order rejection promptly frees capacity for a new attempt",
  async () => {
    const h = await ready(); h.rejectOrder();
    await assert.rejects(handle(request(h.prepare), h.deps));
    assert.equal(h.store.get(`eventSeatLedgers/${eventId}`)?.checkoutHeld, 0);
    const old = await handle(request(h.prepare), h.deps);
    assert.equal(old.payment?.status, "expired");
    assert.equal(h.calls.orders, 1);
    const next = await handle(request({...h.prepare,
      requestId: "replacement_checkout"}), h.deps);
    assert.equal(next.payment?.status, "checkoutReady");
    assert.equal(h.calls.orders, 2);
    assert.equal(h.store.get(`eventSeatLedgers/${eventId}`)?.checkoutHeld, 1);
  });

test("an organizer without a ready payment account cannot be quoted",
  async () => {
    const h = await processorFixture();
    let readyChecks = 0;
    const deps = {...h.deps, collectionReady: async (input: {
      organizerId: string;
    }) => {
      readyChecks++;
      assert.equal(typeof input.organizerId, "string");
      return false;
    }};
    await assert.rejects(handle(request({action: "quote", eventId}), deps),
      (error: {code?: string; details?: unknown}) => {
        assert.equal(error.code, "failed-precondition");
        assert.deepEqual(error.details, {reason: "organizerPaymentsNotReady"});
        return true;
      });
    assert.equal(readyChecks, 1);
    assert.equal(h.calls.routes, 0);
    assert.equal(h.calls.orders, 0);
  });

test("a routing refusal at prepare reports the same reason, without an order",
  async () => {
    const h = await ready();
    const deps = {...h.deps, prepareRouting: async () => {
      throw new HttpsError("failed-precondition",
        "The selected payment collection route is not ready.");
    }};
    await assert.rejects(handle(request(h.prepare), deps),
      (error: {code?: string; details?: unknown}) => {
        assert.equal(error.code, "failed-precondition");
        assert.deepEqual(error.details, {reason: "organizerPaymentsNotReady"});
        return true;
      });
    assert.equal(h.calls.orders, 0);
    assert.equal(h.calls.executions, 0);
    // A routing change mid-review is not a readiness failure.
    const changed = {...h.deps, prepareRouting: async () => {
      throw new HttpsError("aborted", "Payment routing changed.");
    }};
    await assert.rejects(handle(request(h.prepare), changed),
      (error: {code?: string; details?: unknown}) => {
        assert.equal(error.code, "aborted");
        assert.equal(error.details, undefined);
        return true;
      });
  });
