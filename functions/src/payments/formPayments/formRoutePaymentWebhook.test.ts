import assert from "node:assert/strict";
import test from "node:test";
import {createHmac} from "node:crypto";
import {createFormPaymentFixture} from "./formPaymentTestStore";
import {recordFormRoutePaymentWebhook, processFormRoutePaymentWebhook,
  formRouteWebhookConfigurationVersion} from "./formRoutePaymentWebhook";
import type {OrganizerFormPaymentDocument as Payment} from
  "../../shared/generated/firestoreAdminTypes";
import {validateOrganizerFormPaymentWebhookDocument} from
  "../../shared/generated/validators/organizerFormPaymentWebhookDocument";

const version = "projects/catch-test/secrets/PLATFORM/versions/1";
async function fixture() {
  const h = createFormPaymentFixture();
  const reserved = await h.reserve();
  const payment: Payment = {...reserved.payment, connectionId: null,
    accountId: "acc_platform", providerOrderId: "order_one",
    status: "checkoutReady", routing: {
      version: 1, organizerId: "org", purpose: "formFee",
      amountMinor: 10000, transferAmountMinor: 9750, settlementHold: false,
      selection: {route: "razorpayRoute", mode: "test", currency: "INR",
        merchantCountry: "IN"}, policySource: "app", appRevision: 1,
      organizerRevision: 0, bindingId: "host_razorpay",
      merchantAccountId: "acc_platform", destinationAccountId: "acc_host",
      checkoutKey: "rzp_test_platform", configurationVersion: version,
    }};
  h.store.records.set(`organizerFormPayments/${reserved.paymentId}`,
    {...payment});
  let reconciled = 0;
  const deps = {db: h.db, configurationVersion: version, now: () => 1000,
    profile: {schema: "catch.razorpay-platform-payments/v1", mode: "test",
      platformAccountId: "acc_platform", keyId: "rzp_test_platform",
      keySecret: "key-secret", webhookSecret: "webhook-secret"},
    provider: {
      fetchPayment: async () => ({id: "pay_one", orderId: "order_one",
        amount: 10000, currency: "INR", status: "captured", captured: true,
        amountRefunded: 0}),
      fetchOrder: async () => ({id: "order_one", amount: 10000, currency: "INR",
        receipt: payment.receipt, status: "paid"}),
    }, processor: {reconcile: async (id: string, providerId?: string) => {
      assert.equal(id, reserved.paymentId);
      assert.equal(providerId, "pay_one"); reconciled++;
      return payment;
    }}} as unknown as Parameters<typeof recordFormRoutePaymentWebhook>[1];
  const rawBody = Buffer.from(JSON.stringify({entity: "event",
    account_id: "acc_platform", event: "payment.captured",
    payload: {payment: {entity: {entity: "payment", id: "pay_one",
      order_id: "order_one"}}}}));
  const input = {rawBody, providerEventId: "event_one", signature:
    createHmac("sha256", "webhook-secret").update(rawBody).digest("hex")};
  return {...h, ...reserved, payment, deps, input,
    reconciled: () => reconciled};
}

test("Route receipt requires signature, account and durable persistence",
  async () => {
    const h = await fixture();
    for (const input of [{...h.input, signature: "0".repeat(64)},
      {...h.input, rawBody: Buffer.from("{}")}]) {
      await assert.rejects(recordFormRoutePaymentWebhook(input, h.deps));
    }
    h.store.failNextCommit = true;
    await assert.rejects(recordFormRoutePaymentWebhook(h.input, h.deps));
    const id = await recordFormRoutePaymentWebhook(h.input, h.deps);
    assert.equal(await recordFormRoutePaymentWebhook({...h.input,
      providerEventId: "other-unsigned-header"}, h.deps), id);
    const receipt = h.store.records.get(`organizerFormPaymentWebhooks/${id}`)!;
    assert.ok(validateOrganizerFormPaymentWebhookDocument(receipt));
    assert.equal(receipt.connectionId, null);
    assert.equal(JSON.stringify(receipt).includes("webhook-secret"), false);
    assert.equal(JSON.stringify(receipt).includes("payload"), false);
    await processFormRoutePaymentWebhook(id, h.deps);
    await processFormRoutePaymentWebhook(id, h.deps);
    assert.equal(h.reconciled(), 1);
    assert.equal(h.store.records.get(`organizerFormPaymentWebhooks/${id}`)
      ?.status, "processed");
  });

test("foreign ledger or profile cannot cause a Route mutation", async () => {
  for (const patch of [{accountId: "acc_other"}, {amountPaise: 20000},
    {mode: "live"}, {connectionId: "connection"},
    {providerOrderId: "order_other"}]) {
    const h = await fixture();
    const id = await recordFormRoutePaymentWebhook(h.input, h.deps);
    h.store.records.set(`organizerFormPayments/${h.paymentId}`,
      {...h.payment, ...patch});
    await assert.rejects(processFormRoutePaymentWebhook(id, h.deps));
    assert.equal(h.reconciled(), 0);
    assert.equal(h.store.records.get(`organizerFormPaymentWebhooks/${id}`)
      ?.status, "pending");
  }
});

test("interrupted Route reconciliation remains retryable", async () => {
  const h = await fixture();
  const id = await recordFormRoutePaymentWebhook(h.input, h.deps);
  const reconcile = h.deps.processor.reconcile;
  h.deps.processor.reconcile = async () => {
    throw new Error("Outage");
  };
  await assert.rejects(processFormRoutePaymentWebhook(id, h.deps));
  assert.equal(h.store.records.get(`organizerFormPaymentWebhooks/${id}`)
    ?.status, "pending");
  h.deps.processor.reconcile = reconcile;
  await processFormRoutePaymentWebhook(id, h.deps);
  assert.equal(h.reconciled(), 1);
});

test("public webhook profile selector cannot choose a secret or alias", () => {
  assert.equal(formRouteWebhookConfigurationVersion("1", version),
    version);
  for (const value of ["latest", "0", "2", "../2", "1/other",
    "99999999999999999"]) {
    assert.throws(() => formRouteWebhookConfigurationVersion(value, version));
  }
  assert.throws(() => formRouteWebhookConfigurationVersion("1", ""));
});
