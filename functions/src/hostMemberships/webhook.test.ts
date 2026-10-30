import assert from "node:assert/strict";
import test from "node:test";
import {listHostMembershipChargesForStatement} from "./charges";
import {processHostMembershipWebhook} from "./webhook";
import {hostMembershipId} from "./ids";
import {
  FakeBillingProvider,
  catchProject,
  connectionId,
  hostCollectedPayment,
  legacyPlatformPayment,
  merchantAccountId,
  now,
  organizerId,
  planId,
  seedPlatformSplitStore,
  seedStore,
  signedWebhook,
  subscription,
  testConfig,
  testDeps,
  webhookBody,
} from "./testFixture";

const membershipPath = `hostMemberships/${hostMembershipId(organizerId,
  "member-1")}`;
const checkoutPath = "hostMembershipCheckouts/hmc_AbCdEfGhIjKlMnOpQrSt";

function checkout(payment: Record<string, unknown> | null) {
  return {[checkoutPath]: {schemaVersion: 1, organizerId, planId,
    uid: "member-1", interval: "monthly", priceInPaise: 49900, state: "open",
    provider: "razorpay", providerSubscriptionId: "sub_TestSub1",
    ...(payment ? {payment} : {}),
    authorizationUrl: "https://rzp.io/i/test", expiresAtMillis: now + 1,
    createdAtMillis: now, updatedAtMillis: now}};
}

function storeWithCheckout() {
  return seedStore(checkout(hostCollectedPayment));
}

/** The default delivery is the organizer's own merchant webhook. */
async function deliver(db: ReturnType<typeof seedStore>, body: unknown,
  eventId: string, provider = new FakeBillingProvider(),
  via: string | null = connectionId) {
  const {rawBody, signature} = signedWebhook(body);
  return processHostMembershipWebhook({rawBody, signature,
    providerEventId: eventId, ...(via ? {connectionId: via} : {})},
  testDeps(db, provider));
}

test("rejects unsigned and foreign deliveries without writes", async () => {
  const db = storeWithCheckout();
  const before = new Map(db.docs);
  const body = webhookBody("subscription.activated", subscription(), now);
  const {rawBody} = signedWebhook(body);
  assert.equal(await processHostMembershipWebhook({rawBody,
    signature: "deadbeef", providerEventId: "evt_1", connectionId},
  testDeps(db)), "invalid");
  // An unknown or malformed connection id is not a delivering account.
  assert.equal(await deliver(db, body, "evt_1", undefined,
    "rpc_" + "d".repeat(32)), "invalid");
  assert.equal(await deliver(db, body, "evt_1", undefined, "../x"),
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
  assert.deepEqual(membership.payment, hostCollectedPayment);
  assert.equal(db.getDoc(`hostMembershipPlans/${planId}`)!
    .activeMemberCount, 1);
  assert.equal(db.getDoc(`hostMembershipPrograms/${organizerId}`)!
    .memberCount, 1);
  assert.equal(db.getDoc(checkoutPath)!.state, "authorized");
  assert.equal([...db.docs.keys()].filter((key) =>
    key.startsWith("hostMembershipWebhookReceipts/")).length, 1);
  assert.equal(catchProject, "catch-test");
});

test("hostCollected charges stay with the host and freeze the terms",
  async () => {
    const db = storeWithCheckout();
    const provider = new FakeBillingProvider();
    await deliver(db, webhookBody("subscription.charged", subscription(), now,
      {id: "pay_Charge1", amount: 49900}), "evt_1", provider);
    const charge = db.getDoc("hostMembershipCharges/pay_Charge1")!;
    assert.equal(charge.moneyFlow, "hostCollected");
    assert.equal(charge.providerAccountId, merchantAccountId);
    assert.equal(charge.feePaise, 0);
    assert.equal(charge.transferAmountPaise, 0);
    assert.deepEqual(charge.transfer, {state: "notRequired",
      transferId: null, attempts: 0, lastError: null});
    const terms = charge.commercialTerms as Record<string, unknown>;
    assert.equal(terms.moneyFlow, "hostCollected");
    assert.equal(terms.merchantOfRecord, "host");
    assert.equal(terms.purpose, "hostMembership");
    assert.deepEqual(terms.commission, {rateBasisPoints: 500,
      capMinor: 1_000_000, cycleDays: 30, cycleAnchor: "trialEnd",
      base: "netOfRefunds", taxTreatment: "exclusive"});
    assert.equal(provider.calls.some((call) =>
      call.method === "splitCharge"), false);
    // A later terms edit never rewrites the recorded charge.
    db.updateDoc("commercialTerms/platform", {revision: 2});
    assert.deepEqual(db.getDoc("hostMembershipCharges/pay_Charge1")!
      .commercialTerms, terms);
    // The commission statement reads the organizer's charges by window.
    const rows = await listHostMembershipChargesForStatement({
      db: db as unknown as FirebaseFirestore.Firestore, organizerId,
      afterMillis: now - 1, throughMillis: now + 60_000});
    assert.deepEqual(rows.map((row) => row.chargeId), ["pay_Charge1"]);
  });

test("a merchant account cannot write a checkout bound elsewhere",
  async () => {
    // The checkout was created on Catch's platform account; a delivery from
    // the organizer's merchant webhook must not apply to it.
    const db = seedStore(checkout({...legacyPlatformPayment,
      moneyFlow: "platformSplit"}));
    assert.equal(await deliver(db, webhookBody("subscription.activated",
      subscription(), now), "evt_1"), "ignored");
    assert.equal(db.getDoc(membershipPath), undefined);
  });

test("platformSplit charges are split minus the at-source fee", async () => {
  const db = seedPlatformSplitStore(checkout({...legacyPlatformPayment,
    moneyFlow: "platformSplit"}));
  const provider = new FakeBillingProvider();
  const body = (payment: {id: string; amount: number}) =>
    webhookBody("subscription.charged", subscription(), now, payment,
      testConfig.platformAccountId);
  await deliver(db, body({id: "pay_Charge1", amount: 49900}), "evt_1",
    provider, null);
  const charge = db.getDoc("hostMembershipCharges/pay_Charge1")!;
  assert.equal(charge.moneyFlow, "platformSplit");
  assert.equal(charge.feePaise, 4990);
  assert.equal(charge.transferAmountPaise, 44910);
  assert.equal((charge.commercialTerms as {merchantOfRecord: string})
    .merchantOfRecord, "platform");
  assert.deepEqual(charge.transfer, {state: "created",
    transferId: "trf_Test1", attempts: 1, lastError: null});
  assert.deepEqual(provider.calls.find((call) =>
    call.method === "splitCharge")?.input, {paymentId: "pay_Charge1",
    destinationAccountId: "acc_HostRoute1", amountPaise: 44910,
    chargeId: "pay_Charge1"});
  // A renewal delivered twice never transfers twice.
  await deliver(db, body({id: "pay_Charge1", amount: 49900}), "evt_2",
    provider, null);
  assert.equal(provider.calls.filter((call) =>
    call.method === "splitCharge").length, 1);
});

test("legacy platform checkouts without a binding still apply", async () => {
  const db = seedPlatformSplitStore(checkout(null));
  assert.equal(await deliver(db, webhookBody("subscription.activated",
    subscription(), now, undefined, testConfig.platformAccountId), "evt_1",
  undefined, null), "applied");
  assert.equal(db.getDoc(membershipPath)!.status, "active");
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
