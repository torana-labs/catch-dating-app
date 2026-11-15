import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import type {PaymentDocument} from "../../shared/generated/firestoreAdminTypes";
import {planLegacyCancellationRefund,
  type LegacyRazorpayRefundAuthorization} from "./intent";
import {LegacyRefundReviewRequired} from "./errors";
import {NativeCancellationRefundProvider} from "./provider";
import {razorpayOwnershipNotes, resolveRazorpayOrderOwnership} from
  "../razorpayOrderOwnership";

process.env.GCLOUD_PROJECT = "catchdates-dev";
process.env.GCLOUDPROJECT = "catchdates-dev";

function ownedAuthorization(payment: PaymentDocument):
  LegacyRazorpayRefundAuthorization {
  const runtimeProjectId = "catchdates-dev";
  const ownership = resolveRazorpayOrderOwnership({runtimeProjectId,
    order: {id: payment.orderId,
      notes: razorpayOwnershipNotes(runtimeProjectId)},
    frozenContexts: [payment.razorpayOwnership]});
  if (ownership.kind !== "owned") throw new Error("Expected owned order.");
  return {evidence: ownership.evidence, runtimeProjectId};
}

function setup(provider: "stripe" | "razorpay" = "stripe") {
  const payment: PaymentDocument = {purpose: "booking", userId: "user1",
    eventId: "event1",
    orderId: "order_one", paymentId: "pay_one", providerPaymentId: "pi_one",
    provider, stripeAccountId: "acct_original", applicationFeeAmount: 100,
    amount: 1000, currency: "INR", status: "completed", signUpFailed: false,
    createdAt: Timestamp.fromMillis(1), ...(provider === "razorpay" ?
      {razorpayOwnership: {projectId: "catchdates-dev" as const,
        schema: "1" as const}} : {})};
  const intent = planLegacyCancellationRefund({payment,
    reason: "eventCancelled", targetAmountMinor: 1000, nowMillis: 1,
    razorpayAuthorization: provider === "razorpay" ?
      ownedAuthorization(payment) : undefined});
  const attempt = {amountMinor: 1000, idempotencyKey: "refund_stable_key",
    state: "pending" as const, providerRefundId: null, startedAtMillis: 1};
  intent.attempts = [attempt];
  const calls: Array<{url: string; init: RequestInit}> = [];
  let response: unknown = {};
  let responseStatus = 200;
  let responseFor: ((url: string, init: RequestInit) =>
    {body: unknown; status?: number}) | undefined;
  const client = new NativeCancellationRefundProvider({
    razorpayCredentials: () => ({keyId: "rzp_test", secret: "rzp_secret"}),
    stripeSecret: () => "stripe_secret",
    fetchImpl: async (url, init) => {
      calls.push({url: String(url), init: init!});
      const selected = responseFor?.(String(url), init!) ??
        {body: response, status: responseStatus};
      return new Response(JSON.stringify(selected.body),
        {status: selected.status ?? 200});
    },
  });
  return {payment, intent, attempt, client, calls,
    respond: (value: unknown, status = 200) => {
      response = value; responseStatus = status; responseFor = undefined;
    },
    respondWith: (next: typeof responseFor) => {
      responseFor = next;
    }};
}

function stripePayment() {
  return {object: "payment_intent", id: "pi_one", status: "succeeded",
    amount: 1000, amount_received: 1000, currency: "inr",
    transfer_data: {destination: "acct_original"},
    on_behalf_of: "acct_original", application_fee_amount: 100};
}
function stripeRefund() {
  return {object: "refund", id: "re_one", payment_intent: "pi_one",
    amount: 1000, currency: "inr", status: "succeeded",
    transfer_reversal: "trr_one"};
}
function razorpayOrder() {
  return {entity: "order", id: "order_one", amount: 1000, currency: "INR",
    notes: {eventId: "event1", userId: "user1",
      catchBookingProject: "catchdates-dev", catchBookingSchema: "1"}};
}
function razorpayPayment() {
  return {entity: "payment", id: "pay_one", order_id: "order_one",
    amount: 1000, currency: "INR", captured: true, status: "captured",
    amount_refunded: 0};
}

test("Stripe pins destination, amount, fee and charge", async () => {
  const h = setup(); h.respond(stripePayment());
  await h.client.verifyPayment(h.payment, h.intent);
  for (const patch of [{amount_received: 900}, {application_fee_amount: 0},
    {transfer_data: {destination: "acct_changed"}},
    {on_behalf_of: "acct_other"},
    {id: "pi_other"}, {currency: "usd"}]) {
    h.respond({...stripePayment(), ...patch});
    await assert.rejects(h.client.verifyPayment(h.payment, h.intent),
      /reconciliation/);
  }
});

test("Stripe refund retries retain key and reverse transfer/application fee",
  async () => {
    const h = setup(); h.respond(stripeRefund());
    const result = await h.client.createRefund(h.intent, h.attempt);
    assert.equal(result.state, "processed");
    const request = h.calls[0];
    assert.equal(request.url, "https://api.stripe.com/v1/refunds");
    const headers = request.init.headers as Record<string, string>;
    assert.equal(headers["Idempotency-Key"], "refund_stable_key");
    const body = request.init.body as URLSearchParams;
    assert.equal(body.get("payment_intent"), "pi_one");
    assert.equal(body.get("amount"), "1000");
    assert.equal(body.get("reverse_transfer"), "true");
    assert.equal(body.get("refund_application_fee"), "true");
    h.respond({...stripeRefund(), transfer_reversal: null});
    await assert.rejects(h.client.createRefund(h.intent, h.attempt),
      /reconciliation/);
  });

test("Stripe pending/action-required results never claim success", async () => {
  const h = setup();
  for (const status of ["pending", "requires_action", "failed", "canceled"]) {
    h.respond({...stripeRefund(), status, transfer_reversal: null});
    assert.notEqual((await h.client.fetchRefund(h.intent,
      {...h.attempt, providerRefundId: "re_one"})).state, "processed");
    assert.equal(h.calls.at(-1)!.init.method, "GET");
  }
});

test("Razorpay pins platform credentials and captured order", async () => {
  const h = setup("razorpay");
  h.respondWith((url, init) => ({body: url.includes("/orders/") ?
    razorpayOrder() : init.method === "POST" ?
      {entity: "refund", id: "rfnd_one", payment_id: "pay_one",
        amount: 1000, currency: "INR", status: "pending"} :
      razorpayPayment()}));
  const authorization = await h.client.verifyPayment(h.payment, h.intent);
  assert.equal((await h.client.createRefund(h.intent, h.attempt,
    authorization)).state,
  "pending");
  const headers = h.calls.at(-1)!.init.headers as Record<string, string>;
  assert.equal(headers["X-Refund-Idempotency"], "refund_stable_key");
  assert.equal(headers.Authorization,
    `Basic ${Buffer.from("rzp_test:rzp_secret").toString("base64")}`);
});

test("Razorpay reclassifies ownership after claim and before refund POST",
  async () => {
    const h = setup("razorpay");
    let orderReads = 0;
    let refundPosts = 0;
    h.respondWith((url, init) => {
      if (url.includes("/orders/")) {
        orderReads++;
        return {body: orderReads === 1 ? razorpayOrder() : {
          ...razorpayOrder(), notes: {
            ...razorpayOrder().notes,
            catchBookingProject: "catch-dating-app-64e51",
          },
        }};
      }
      if (init.method === "POST") {
        refundPosts++;
        return {body: {entity: "refund", id: "rfnd_one",
          payment_id: "pay_one", amount: 1000, currency: "INR",
          status: "pending"}};
      }
      return {body: razorpayPayment()};
    });

    const authorization = await h.client.verifyPayment(h.payment, h.intent);
    await assert.rejects(h.client.createRefund(h.intent, h.attempt,
      authorization), LegacyRefundReviewRequired);
    assert.equal(orderReads, 2);
    assert.equal(refundPosts, 0);
  });

test("Razorpay blocks unexplained cumulative refund drift before POST",
  async () => {
    const h = setup("razorpay");
    const attempt = {...h.attempt, amountMinor: 300};
    const intent = {...h.intent, reason: "guestCancelled" as const,
      targetAmountMinor: 300, attempts: [attempt]};
    let paymentReads = 0;
    let refundPosts = 0;
    h.respondWith((url, init) => {
      if (url.includes("/orders/")) return {body: razorpayOrder()};
      if (init.method === "POST") {
        refundPosts++;
        return {body: {entity: "refund", id: "rfnd_one",
          payment_id: "pay_one", amount: 300, currency: "INR",
          status: "processed"}};
      }
      paymentReads++;
      return {body: {...razorpayPayment(), amount_refunded:
        paymentReads === 1 ? 0 : 100}};
    });

    const authorization = await h.client.verifyPayment(h.payment, intent);
    await assert.rejects(h.client.createRefund(intent, attempt,
      authorization), LegacyRefundReviewRequired);
    assert.equal(paymentReads, 2);
    assert.equal(refundPosts, 0);
  });

test("Razorpay cannot explain fresh equal drift with a new claim attempt",
  async () => {
    const h = setup("razorpay");
    const attempt = {...h.attempt, amountMinor: 300};
    const preflightIntent = {...h.intent, reason: "guestCancelled" as const,
      targetAmountMinor: 300, attempts: []};
    const claimedIntent = {...preflightIntent, attempts: [attempt]};
    let paymentReads = 0;
    let refundPosts = 0;
    h.respondWith((url, init) => {
      if (url.includes("/orders/")) return {body: razorpayOrder()};
      if (init.method === "POST") {
        refundPosts++;
        return {body: {entity: "refund", id: "rfnd_one",
          payment_id: "pay_one", amount: 300, currency: "INR",
          status: "processed"}};
      }
      paymentReads++;
      return {body: {...razorpayPayment(), amount_refunded:
        paymentReads === 1 ? 0 : 300}};
    });

    const authorization = await h.client.verifyPayment(h.payment,
      preflightIntent);
    await assert.rejects(h.client.createRefund(claimedIntent, attempt,
      authorization), LegacyRefundReviewRequired);
    assert.equal(paymentReads, 2);
    assert.equal(refundPosts, 0);
  });

test("Razorpay preserves same-key recovery for an explained cumulative refund",
  async () => {
    const h = setup("razorpay");
    let refundPosts = 0;
    h.respondWith((url, init) => {
      if (url.includes("/orders/")) return {body: razorpayOrder()};
      if (init.method === "POST") {
        refundPosts++;
        return {body: {entity: "refund", id: "rfnd_one",
          payment_id: "pay_one", amount: 1000, currency: "INR",
          status: "processed"}};
      }
      return {body: {...razorpayPayment(), status: "refunded",
        amount_refunded: 1000}};
    });

    const authorization = await h.client.verifyPayment(h.payment, h.intent);
    assert.equal((await h.client.createRefund(h.intent, h.attempt,
      authorization)).state, "processed");
    assert.equal(refundPosts, 1);
  });


test("definite provider rejection needs review while outages remain retryable",
  async () => {
    for (const provider of ["stripe", "razorpay"] as const) {
      const h = setup(provider);
      const authorization = provider === "razorpay" ? await (async () => {
        h.respondWith((url) => ({body: url.includes("/orders/") ?
          razorpayOrder() : razorpayPayment()}));
        return h.client.verifyPayment(h.payment, h.intent);
      })() : undefined;
      for (const status of [400, 401, 403, 404, 422]) {
        if (provider === "razorpay") {
          h.respondWith((url) => url.includes("/orders/") ?
            {body: razorpayOrder()} : {body: {}, status});
        } else {
          h.respond({}, status);
        }
        await assert.rejects(h.client.createRefund(h.intent, h.attempt,
          authorization),
        LegacyRefundReviewRequired);
      }
      for (const status of [408, 409, 429, 500, 503]) {
        if (provider === "razorpay") {
          h.respondWith((url) => url.includes("/orders/") ?
            {body: razorpayOrder()} : {body: {}, status});
        } else {
          h.respond({}, status);
        }
        await assert.rejects(h.client.createRefund(h.intent, h.attempt,
          authorization),
        (error: unknown) => !(error instanceof LegacyRefundReviewRequired));
      }
    }
  });

// Append to legacyRefunds/provider.test.ts. NOT EXECUTED.
// Entire verify-then-dispatch sequence is faked; no provider requests occur.
test("ownership: persisted foreign refund intent cannot reach provider POST",
  async () => {
    const h = setup("razorpay");
    const methods: string[] = [];
    const client = new NativeCancellationRefundProvider({
      razorpayCredentials: () => ({keyId: "fake_review_key", secret: "fake"}),
      stripeSecret: () => "unused_fake",
      fetchImpl: async (url, init) => {
        methods.push(init?.method ?? "GET");
        const path = new URL(String(url)).pathname;
        const response = path.includes("/orders/") ? {
          entity: "order", id: "order_one", amount: 1000, currency: "INR",
          notes: {eventId: "event1", userId: "user1",
            catchBookingProject: "catch-dating-app-64e51",
            catchBookingSchema: "1"},
        } : init?.method === "POST" ? {
          entity: "refund", id: "rfnd_one", payment_id: "pay_one",
          amount: 1000, currency: "INR", status: "processed",
        } : {
          entity: "payment", id: "pay_one", order_id: "order_one",
          amount: 1000, currency: "INR", captured: true, status: "captured",
          amount_refunded: 0,
        };
        return new Response(JSON.stringify(response), {status: 200});
      },
    });
    const previous = process.env.GCLOUD_PROJECT;
    const previousLegacy = process.env.GCLOUDPROJECT;
    process.env.GCLOUD_PROJECT = "catchdates-dev";
    process.env.GCLOUDPROJECT = "catchdates-dev";
    try {
      await assert.rejects(async () => {
        await client.verifyPayment(h.payment, h.intent);
        await client.createRefund(h.intent, h.attempt);
      }, LegacyRefundReviewRequired);
      assert.equal(methods.filter((method) => method === "POST").length, 0);
    } finally {
      if (previous === undefined) delete process.env.GCLOUD_PROJECT;
      else process.env.GCLOUD_PROJECT = previous;
      if (previousLegacy === undefined) delete process.env.GCLOUDPROJECT;
      else process.env.GCLOUDPROJECT = previousLegacy;
    }
  });
