import assert from "node:assert/strict";
import test from "node:test";
import {HostMembershipProviderError} from "./billingProvider";
import {RazorpaySubscriptionProvider} from "./razorpaySubscriptionProvider";
import {
  rawSubscription,
  signedWebhook,
  subscription,
  testConfig,
  webhookBody,
  webhookSecret,
  now,
} from "./testFixture";

type Call = {url: string; method: string; body: unknown;
  authorization: string | null};

function provider(responses: unknown[], calls: Call[] = []) {
  const fetchImpl = (async (url: string, init: RequestInit) => {
    calls.push({url, method: String(init.method),
      body: init.body ? JSON.parse(String(init.body)) : undefined,
      authorization: new Headers(init.headers).get("Authorization")});
    const next = responses.shift();
    if (next instanceof Response) return next;
    return new Response(JSON.stringify(next), {status: 200});
  }) as unknown as typeof fetch;
  return new RazorpaySubscriptionProvider({keyId: testConfig.keyId,
    keySecret: testConfig.keySecret, webhookSecret, mode: "test"}, fetchImpl);
}

test("creates an immutable provider plan per interval", async () => {
  const calls: Call[] = [];
  const result = await provider([{id: "plan_Created1", entity: "plan",
    item: {amount: 499900, currency: "INR"}}], calls).createPrice({
    catchPlanId: "hmp_AbCdEfGhIjKlMnOpQrSt", organizerId: "organizer-1",
    name: "Sunday Runners", interval: "annual", amountPaise: 499900,
    revision: 2, catchProject: "catch-test"});
  assert.equal(result.providerPriceId, "plan_Created1");
  assert.equal(calls[0].url, "https://api.razorpay.com/v1/plans");
  assert.deepEqual(calls[0].body, {period: "yearly", interval: 1,
    item: {name: "Sunday Runners", amount: 499900, currency: "INR"},
    notes: {catchProject: "catch-test",
      catchPlanId: "hmp_AbCdEfGhIjKlMnOpQrSt", organizerId: "organizer-1",
      interval: "annual", priceRevision: "2"}});
  assert.equal(calls[0].authorization, "Basic " + Buffer.from(
    `${testConfig.keyId}:${testConfig.keySecret}`).toString("base64"));
});

test("creates subscriptions with notes and a hosted link", async () => {
  const calls: Call[] = [];
  const snapshot = subscription({status: "created"});
  const created = await provider([rawSubscription(snapshot)], calls)
    .createSubscription({providerPriceId: "plan_TestMonthly1",
      interval: "monthly", startAtMillis: now + 7_000, notes:
        snapshot.notes});
  assert.equal(created.providerSubscriptionId, "sub_TestSub1");
  assert.equal(created.authorizationUrl, "https://rzp.io/i/test");
  assert.deepEqual(calls[0].body, {plan_id: "plan_TestMonthly1",
    total_count: 120, quantity: 1, customer_notify: 1,
    start_at: Math.floor((now + 7_000) / 1000), notes: snapshot.notes});
});

test("pause, resume and cancel post the documented actions", async () => {
  const calls: Call[] = [];
  const raw = rawSubscription(subscription());
  const rzp = provider([raw, raw, raw, raw], calls);
  await rzp.pause("sub_TestSub1");
  await rzp.resume("sub_TestSub1");
  await rzp.cancelAtPeriodEnd("sub_TestSub1");
  await rzp.cancelImmediately("sub_TestSub1");
  assert.deepEqual(calls.map((call) => [call.url.split("/v1/")[1],
    call.body]), [
    ["subscriptions/sub_TestSub1/pause", {pause_at: "now"}],
    ["subscriptions/sub_TestSub1/resume", {resume_at: "now"}],
    ["subscriptions/sub_TestSub1/cancel", {cancel_at_cycle_end: 1}],
    ["subscriptions/sub_TestSub1/cancel", {cancel_at_cycle_end: 0}],
  ]);
});

test("rejects a subscription response for another id", async () => {
  await assert.rejects(provider([rawSubscription(subscription({
    id: "sub_Other1"}))]).fetchSubscription("sub_TestSub1"),
  HostMembershipProviderError);
});

test("splits a charge with a payment-level Route transfer", async () => {
  const calls: Call[] = [];
  const rzp = provider([{entity: "collection", count: 1, items: [{
    id: "trf_Test1", recipient: "acc_HostRoute1", amount: 44910}]}], calls);
  const transfer = await rzp.splitCharge({paymentId: "pay_Test1",
    destinationAccountId: "acc_HostRoute1", amountPaise: 44910,
    chargeId: "pay_Test1"});
  assert.equal(transfer.transferId, "trf_Test1");
  assert.equal(calls[0].url,
    "https://api.razorpay.com/v1/payments/pay_Test1/transfers");
  assert.deepEqual(calls[0].body, {transfers: [{account: "acc_HostRoute1",
    amount: 44910, currency: "INR", on_hold: 0,
    notes: {catchMembershipChargeId: "pay_Test1"}}]});
  await assert.rejects(rzp.splitCharge({paymentId: "pay_Test1",
    destinationAccountId: "acc_HostRoute1", amountPaise: 50,
    chargeId: "pay_Test1"}), HostMembershipProviderError);
});

test("a 5xx is an unknown outcome and a 4xx a rejection", async () => {
  await assert.rejects(provider([new Response("{}", {status: 502})])
    .fetchSubscription("sub_TestSub1"), (error: HostMembershipProviderError) =>
    error.disposition === "outcomeUnknown");
  await assert.rejects(provider([new Response("{}", {status: 400})])
    .fetchSubscription("sub_TestSub1"), (error: HostMembershipProviderError) =>
    error.disposition === "rejected");
});

test("verifies webhook signatures over the raw body", () => {
  const rzp = provider([]);
  const {rawBody, signature} = signedWebhook(webhookBody(
    "subscription.activated", subscription(), now));
  assert.equal(rzp.verifyWebhook(rawBody, signature), true);
  assert.equal(rzp.verifyWebhook(Buffer.concat([rawBody, Buffer.from(" ")]),
    signature), false);
  assert.equal(rzp.verifyWebhook(rawBody, "00" + signature.slice(2)), false);
  const parsed = rzp.parseWebhook(rawBody, "evt_1");
  assert.equal(parsed?.type, "subscription.activated");
  assert.equal(parsed?.subscription?.id, "sub_TestSub1");
  assert.equal(parsed?.createdAtMillis, Math.floor(now / 1000) * 1000);
  assert.equal(rzp.parseWebhook(Buffer.from("not json"), null), null);
});

function merchant(responses: unknown[], calls: Call[] = []) {
  const fetchImpl = (async (url: string, init: RequestInit) => {
    calls.push({url, method: String(init.method),
      body: init.body ? JSON.parse(String(init.body)) : undefined,
      authorization: new Headers(init.headers).get("Authorization")});
    const next = responses.shift();
    if (next instanceof Response) return next;
    return new Response(JSON.stringify(next), {status: 200});
  }) as unknown as typeof fetch;
  return new RazorpaySubscriptionProvider({accessToken: "merchant-token",
    accountId: "acc_HostMerchant1", webhookSecret, mode: "test"}, fetchImpl);
}

const merchantWebhookUrl =
  "https://example.test/hostMembershipRazorpayWebhook?connectionId=rpc_1";

test("hostCollected calls the merchant account with its OAuth token",
  async () => {
    const calls: Call[] = [];
    await merchant([{id: "plan_Created1", entity: "plan",
      item: {amount: 49900, currency: "INR"}}], calls).createPrice({
      catchPlanId: "hmp_AbCdEfGhIjKlMnOpQrSt", organizerId: "organizer-1",
      name: "Sunday Runners", interval: "monthly", amountPaise: 49900,
      revision: 1, catchProject: "catch-test"});
    assert.equal(calls[0].url, "https://api.razorpay.com/v1/plans");
    assert.equal(calls[0].authorization, "Bearer merchant-token");
  });

test("a Subscriptions probe tells a disabled product from an outage",
  async () => {
    assert.equal(await merchant([{entity: "collection", count: 0,
      items: []}]).probeSubscriptions(), "enabled");
    assert.equal(await merchant([new Response("{}", {status: 400})])
      .probeSubscriptions(), "notEnabled");
    // An expired token and a provider outage are not "not enabled".
    await assert.rejects(merchant([new Response("{}", {status: 401})])
      .probeSubscriptions(), (error: HostMembershipProviderError) =>
      error.httpStatus === 401);
    await assert.rejects(merchant([new Response("{}", {status: 503})])
      .probeSubscriptions(), (error: HostMembershipProviderError) =>
      error.disposition === "outcomeUnknown");
  });

test("the merchant webhook is reused when present, created otherwise",
  async () => {
    const webhook = {id: "HK890egfiItP3H", entity: "webhook", active: true,
      secret_exists: true, owner_id: "HostMerchant1", owner_type: "merchant",
      url: merchantWebhookUrl, events: [
        "subscription.authenticated", "subscription.activated",
        "subscription.charged", "subscription.pending",
        "subscription.halted", "subscription.paused",
        "subscription.resumed", "subscription.cancelled",
        "subscription.completed", "subscription.updated"]};
    const reuseCalls: Call[] = [];
    assert.deepEqual(await merchant([{entity: "collection", count: 1,
      items: [webhook]}], reuseCalls).ensureMerchantWebhook({
      url: merchantWebhookUrl}), {webhookId: "HK890egfiItP3H"});
    assert.deepEqual(reuseCalls.map((call) => call.method), ["GET"]);

    const calls: Call[] = [];
    assert.deepEqual(await merchant([{entity: "collection", count: 1,
      items: [{...webhook, url: "https://example.test/other"}]},
    {...webhook, id: "JebiXkKGYwua5L"}], calls).ensureMerchantWebhook({
      url: merchantWebhookUrl}), {webhookId: "JebiXkKGYwua5L"});
    assert.equal(calls[1].url,
      "https://api.razorpay.com/v2/accounts/acc_HostMerchant1/webhooks");
    assert.deepEqual(calls[1].body, {url: merchantWebhookUrl,
      secret: webhookSecret, events: webhook.events});
    // A created webhook missing subscription events is not accepted.
    await assert.rejects(merchant([{entity: "collection", count: 0,
      items: []}, {...webhook, events: ["payment.captured"]}])
      .ensureMerchantWebhook({url: merchantWebhookUrl}),
    HostMembershipProviderError);
    // The platform account never registers merchant webhooks.
    await assert.rejects(provider([]).ensureMerchantWebhook({
      url: merchantWebhookUrl}), HostMembershipProviderError);
  });
