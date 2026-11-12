import assert from "node:assert/strict";
import {createHmac} from "node:crypto";
import test from "node:test";
import {parseVerifiedFormWebhook, processFormPaymentWebhook,
  recordFormPaymentWebhook} from "./formPaymentWebhook";
import {createFormPaymentFixture} from "./formPaymentTestStore";

const secret = "w".repeat(43);
const connectionId = `rpc_${"a".repeat(32)}`;
const paymentEvent = {entity: "event", account_id: "acc_merchant",
  event: "payment.captured", payload: {payment: {entity: {
    entity: "payment", id: "pay_one", order_id: "order_one",
  }}}};
function signed(body: unknown) {
  const rawBody = Buffer.from(JSON.stringify(body));
  return {rawBody, signature: createHmac("sha256", secret)
    .update(rawBody).digest("hex")};
}

test("webhook signature binds exact bytes and expected merchant", () => {
  const {rawBody, signature} = signed(paymentEvent);
  assert.deepEqual(parseVerifiedFormWebhook(rawBody, signature, secret,
    "acc_merchant"), {event: "payment.captured", supported: true,
    orderId: "order_one", paymentId: "pay_one"});
  for (const account of ["acc_other", ""]) {
    assert.throws(() => parseVerifiedFormWebhook(rawBody, signature, secret,
      account), /Invalid/u);
  }
  assert.throws(() => parseVerifiedFormWebhook(Buffer.concat([rawBody,
    Buffer.from(" ")]), signature, secret, "acc_merchant"));
  assert.throws(() => parseVerifiedFormWebhook(rawBody, undefined, secret,
    "acc_merchant"));
  const large = signed({...paymentEvent, padding: "x".repeat(65537)});
  assert.throws(() => parseVerifiedFormWebhook(large.rawBody, large.signature,
    secret, "acc_merchant"));
});

test("refund receipts resolve payment identity; non-order events are ignored",
  () => {
    const refund = signed({...paymentEvent, event: "refund.processed",
      payload: {refund: {entity: {entity: "refund", id: "rfnd_one",
        payment_id: "pay_one"}}}});
    assert.deepEqual(parseVerifiedFormWebhook(refund.rawBody, refund.signature,
      secret, "acc_merchant"), {event: "refund.processed", supported: true,
      orderId: null, paymentId: "pay_one"});
    const other = signed({...paymentEvent, payload: {payment: {entity: {
      ...paymentEvent.payload.payment.entity, order_id: null}}}});
    assert.equal(parseVerifiedFormWebhook(other.rawBody, other.signature,
      secret, "acc_merchant").supported, false);
    const malformed = signed({...paymentEvent, payload: {}});
    assert.throws(() => parseVerifiedFormWebhook(malformed.rawBody,
      malformed.signature, secret, "acc_merchant"));
  });

async function harness() {
  const h = createFormPaymentFixture();
  const {paymentId, payment} = await h.reserve();
  const connection = h.store.records.get(
    "organizerPaymentConnections/connection");
  h.store.records.set(`organizerPaymentConnections/${connectionId}`,
    {...connection});
  h.store.records.set(`guestPayments/${paymentId}`,
    {...payment, connectionId});
  const calls: string[] = [];
  let fail = false;
  const deps = {db: h.db,
    vault: {access: async (_version: string, binding: {
      connectionId: string; organizerId: string; accountId: string;
      mode: "test" | "live";
    }) => ({...binding, webhookSecret: secret, token: {
      accountId: binding.accountId, accessToken: "access",
      refreshToken: "refresh", publicToken: "rzp_test_oauth_public",
      expiresAt: 10_000_000}})},
    provider: {
      fetchPayment: async () => ({id: "pay_one", orderId: "order_one",
        amount: 10000, currency: "INR", status: "captured" as const,
        captured: true, amountRefunded: 0}),
      fetchOrder: async () => ({id: "order_one", amount: 10000,
        currency: "INR" as const, receipt: payment.receipt,
        status: "paid" as const}),
    },
    processor: {reconcile: async (id: string) => {
      calls.push(id);
      if (fail) throw new Error("Provider unavailable");
      return {...payment, providerOrderId: "order_one",
        status: "submitted" as const};
    }}, now: () => 1000};
  return {...h, deps, calls, paymentId, setFail: (value: boolean) => {
    fail = value;
  }};
}

test("signed receipt is durable and retries after processing failure",
  async () => {
    const h = await harness();
    const input = {connectionId, ...signed(paymentEvent),
      providerEventId: "event1"};
    const receiptId = await recordFormPaymentWebhook(input, h.deps);
    assert.equal(await recordFormPaymentWebhook({...input,
      providerEventId: "differentUnsignedHeader"}, h.deps), receiptId);
    const path = `organizerFormPaymentWebhooks/${receiptId}`;
    const receipt = h.store.records.get(path);
    assert.equal(receipt?.status, "pending");
    assert.equal("rawBody" in receipt!, false);
    h.setFail(true);
    await assert.rejects(processFormPaymentWebhook(receiptId, h.deps),
      /Provider unavailable/u);
    assert.equal(h.store.records.get(path)?.status, "pending");
    h.setFail(false);
    await processFormPaymentWebhook(receiptId, h.deps);
    assert.equal(h.store.records.get(path)?.status, "processed");
    await processFormPaymentWebhook(receiptId, h.deps);
    assert.deepEqual(h.calls, [h.paymentId, h.paymentId]);
  });

test("another merchant's or unrelated order cannot finalize a form",
  async () => {
    const h = await harness();
    await assert.rejects(recordFormPaymentWebhook({connectionId,
      ...signed({...paymentEvent, account_id: "acc_other"}),
      providerEventId: "event1"}, h.deps));
    const input = {connectionId, ...signed(paymentEvent),
      providerEventId: "event1"};
    const receiptId = await recordFormPaymentWebhook(input, h.deps);
    const original = h.deps.provider.fetchOrder;
    h.deps.provider.fetchOrder = async () => ({...await original(),
      receipt: "not-a-catch-form"});
    await processFormPaymentWebhook(receiptId, h.deps);
    assert.equal(h.store.records.get(
      `organizerFormPaymentWebhooks/${receiptId}`)?.status, "ignored");
    assert.equal(h.calls.length, 0);
  });
