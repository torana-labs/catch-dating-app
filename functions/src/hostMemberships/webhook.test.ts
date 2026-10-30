import assert from "node:assert/strict";
import test from "node:test";
import {processHostMembershipWebhook} from "./webhook";
import {hostMembershipId} from "./ids";
import {
  FakeBillingProvider,
  catchProject,
  now,
  organizerId,
  planId,
  seedStore,
  signedWebhook,
  subscription,
  testDeps,
  webhookBody,
} from "./testFixture";

const membershipPath = `hostMemberships/${hostMembershipId(organizerId,
  "member-1")}`;
const checkoutPath = "hostMembershipCheckouts/hmc_AbCdEfGhIjKlMnOpQrSt";

function storeWithCheckout() {
  return seedStore({[checkoutPath]: {schemaVersion: 1, organizerId, planId,
    uid: "member-1", interval: "monthly", priceInPaise: 49900, state: "open",
    provider: "razorpay", providerSubscriptionId: "sub_TestSub1",
    authorizationUrl: "https://rzp.io/i/test", expiresAtMillis: now + 1,
    createdAtMillis: now, updatedAtMillis: now}});
}

async function deliver(db: ReturnType<typeof seedStore>, body: unknown,
  eventId: string, provider = new FakeBillingProvider()) {
  const {rawBody, signature} = signedWebhook(body);
  return processHostMembershipWebhook({rawBody, signature,
    providerEventId: eventId}, testDeps(db, provider));
}

test("rejects unsigned and foreign deliveries without writes", async () => {
  const db = storeWithCheckout();
  const before = new Map(db.docs);
  const body = webhookBody("subscription.activated", subscription(), now);
  const {rawBody} = signedWebhook(body);
  assert.equal(await processHostMembershipWebhook({rawBody,
    signature: "deadbeef", providerEventId: "evt_1"}, testDeps(db)),
  "invalid");
  assert.equal(await deliver(db, {...body, account_id: "acc_Foreign"},
    "evt_2"), "foreign");
  assert.equal(await deliver(db, webhookBody("subscription.activated",
    subscription({notes: {...subscription().notes,
      catchProject: "other-project"}}), now), "evt_3"), "foreign");
  assert.equal(await deliver(db, webhookBody("payment.captured",
    subscription(), now), "evt_4"), "foreign");
  assert.deepEqual(new Map(db.docs), before);
});

test("activation creates the membership and counts it once", async () => {
  const db = storeWithCheckout();
  const body = webhookBody("subscription.activated", subscription(), now);
  assert.equal(await deliver(db, body, "evt_1"), "applied");
  assert.equal(await deliver(db, body, "evt_1"), "duplicate");
  const membership = db.getDoc(membershipPath)!;
  assert.equal(membership.status, "active");
  assert.equal(membership.planName, "Sunday Runners");
  assert.equal(db.getDoc(`hostMembershipPlans/${planId}`)!
    .activeMemberCount, 1);
  assert.equal(db.getDoc(`hostMembershipPrograms/${organizerId}`)!
    .memberCount, 1);
  assert.equal(db.getDoc(checkoutPath)!.state, "authorized");
  assert.equal([...db.docs.keys()].filter((key) =>
    key.startsWith("hostMembershipWebhookReceipts/")).length, 1);
  assert.equal(catchProject, "catch-test");
});

test("each charge is recorded and split minus the platform fee", async () => {
  const db = storeWithCheckout();
  const provider = new FakeBillingProvider();
  await deliver(db, webhookBody("subscription.charged", subscription(), now,
    {id: "pay_Charge1", amount: 49900}), "evt_1", provider);
  const charge = db.getDoc("hostMembershipCharges/pay_Charge1")!;
  assert.equal(charge.feePaise, 4990);
  assert.equal(charge.transferAmountPaise, 44910);
  assert.deepEqual(charge.transfer, {state: "created",
    transferId: "trf_Test1", attempts: 1, lastError: null});
  assert.deepEqual(provider.calls.find((call) =>
    call.method === "splitCharge")?.input, {paymentId: "pay_Charge1",
    destinationAccountId: "acc_HostRoute1", amountPaise: 44910,
    chargeId: "pay_Charge1"});
  // A renewal delivered twice never transfers twice.
  await deliver(db, webhookBody("subscription.charged", subscription(), now,
    {id: "pay_Charge1", amount: 49900}), "evt_2", provider);
  assert.equal(provider.calls.filter((call) =>
    call.method === "splitCharge").length, 1);
});

test("failed renewals move past due, then cancellation expires", async () => {
  const db = storeWithCheckout();
  await deliver(db, webhookBody("subscription.activated", subscription(),
    now), "evt_1");
  await deliver(db, webhookBody("subscription.pending",
    subscription({status: "pending"}), now + 2000), "evt_2");
  assert.equal(db.getDoc(membershipPath)!.status, "past_due");
  // Out-of-order older evidence is recorded but does not apply.
  assert.equal(await deliver(db, webhookBody("subscription.charged",
    subscription(), now + 1000), "evt_3"), "stale");
  assert.equal(db.getDoc(membershipPath)!.status, "past_due");
  await deliver(db, webhookBody("subscription.cancelled",
    subscription({status: "cancelled"}), now + 3000), "evt_4");
  assert.equal(db.getDoc(membershipPath)!.status, "expired");
  assert.equal(db.getDoc(`hostMembershipPlans/${planId}`)!
    .activeMemberCount, 0);
});

test("a subscription without a known checkout writes only a receipt",
  async () => {
    const db = seedStore();
    assert.equal(await deliver(db, webhookBody("subscription.activated",
      subscription(), now), "evt_1"), "ignored");
    assert.equal(db.getDoc(membershipPath), undefined);
  });
