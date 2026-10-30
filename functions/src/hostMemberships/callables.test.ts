import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {advanceHostBillingPause} from "./billingPause";
import {manageHostMembershipCheckoutHandler} from "./checkout";
import {manageEventMembershipRulesHandler} from "./eventRules";
import {hostMembershipId} from "./ids";
import {manageHostMembershipPlansHandler} from "./plans";
import {manageHostMembershipProgramHandler} from "./program";
import {manageMyHostMembershipHandler} from "./selfServe";
import {applySubscriptionSnapshot} from "./membershipStore";
import {
  FakeBillingProvider,
  callable,
  catchProject,
  connectionId,
  dayMillis,
  hostCollectedPayment,
  membershipRouting,
  merchantAccountId,
  readyConnection,
  seedPlatformSplitStore,
  now,
  organizerId,
  plan,
  planId,
  program,
  seedStore,
  subscription,
  testDeps,
} from "./testFixture";

const membershipId = hostMembershipId(organizerId, "member-1");

async function join(db: ReturnType<typeof seedStore>,
  provider = new FakeBillingProvider()) {
  const deps = testDeps(db, provider);
  const prepared = await manageHostMembershipCheckoutHandler(
    callable("member-1", {action: "prepare", organizerId, planId,
      interval: "monthly"}), deps);
  provider.next = subscription({notes: {catchProject,
    catchCheckoutId: prepared.checkoutId, organizerId, planId,
    uid: "member-1"}});
  const refreshed = await manageHostMembershipCheckoutHandler(
    callable("member-1", {action: "refresh",
      checkoutId: prepared.checkoutId}), deps);
  return {prepared, refreshed, deps, provider};
}

test("checkout returns the hosted link, then refresh activates", async () => {
  const db = seedStore();
  const {prepared, refreshed, provider} = await join(db);
  assert.equal(prepared.state, "open");
  assert.equal(prepared.authorizationUrl, "https://rzp.io/i/test");
  const created = provider.calls.find((call) =>
    call.method === "createSubscription")?.input as {notes: unknown};
  assert.deepEqual(created.notes, {catchProject,
    catchCheckoutId: prepared.checkoutId, organizerId, planId,
    uid: "member-1"});
  assert.equal(refreshed.state, "authorized");
  assert.equal(refreshed.membershipId, membershipId);
  assert.equal(refreshed.membershipStatus, "active");
  // A current member cannot buy a second membership with the organizer.
  await assert.rejects(manageHostMembershipCheckoutHandler(callable(
    "member-1", {action: "prepare", organizerId, planId,
      interval: "monthly"}), testDeps(db)), /already have a membership/);
});

test("checkout refuses full plans, paused programs and drafts", async () => {
  const full = seedStore({[`hostMembershipPlans/${planId}`]: plan({
    memberCap: 1, activeMemberCount: 1}) as unknown as
    Record<string, unknown>});
  await assert.rejects(manageHostMembershipCheckoutHandler(callable(
    "member-1", {action: "prepare", organizerId, planId,
      interval: "monthly"}), testDeps(full)), /plan is full/);
  const paused = seedStore({[`hostMembershipPrograms/${organizerId}`]:
    program({billingPause: {state: "paused", requestedAtMillis: now,
      requestedBy: "host-1", processedCount: 0, cursor: null}}) as unknown as
    Record<string, unknown>});
  await assert.rejects(manageHostMembershipCheckoutHandler(callable(
    "member-1", {action: "prepare", organizerId, planId,
      interval: "monthly"}), testDeps(paused)), /not taking new members/);
  await assert.rejects(manageHostMembershipCheckoutHandler(callable(
    "member-1", {action: "prepare", organizerId, planId,
      interval: "annual"}), testDeps(seedStore())), /not available/);
});

test("open checkouts reserve the last seat of a capped plan", async () => {
  const db = seedStore({[`hostMembershipPlans/${planId}`]: plan({
    memberCap: 1}) as unknown as Record<string, unknown>});
  await manageHostMembershipCheckoutHandler(callable("member-1", {
    action: "prepare", organizerId, planId, interval: "monthly"}),
  testDeps(db));
  await assert.rejects(manageHostMembershipCheckoutHandler(callable(
    "member-2", {action: "prepare", organizerId, planId,
      interval: "monthly"}), testDeps(db)), /plan is full/);
});

test("members pause, resume and cancel at period end", async () => {
  const db = seedStore();
  const {deps, provider} = await join(db);
  const pause = await manageMyHostMembershipHandler(callable("member-1",
    {action: "pause", membershipId}), deps);
  assert.equal(pause.status, "paused");
  assert.equal((db.getDoc(`hostMemberships/${membershipId}`)!.pause as
    {initiator: string}).initiator, "member");
  const resume = await manageMyHostMembershipHandler(callable("member-1",
    {action: "resume", membershipId}), deps);
  assert.equal(resume.status, "active");
  const cancel = await manageMyHostMembershipHandler(callable("member-1",
    {action: "cancelAtPeriodEnd", membershipId}), deps);
  assert.equal(cancel.status, "canceling");
  assert.equal(cancel.cancelAtPeriodEnd, true);
  assert.deepEqual(provider.calls.map((call) => call.method).slice(-3),
    ["pause", "resume", "cancelAtPeriodEnd"]);
  await assert.rejects(manageMyHostMembershipHandler(callable("member-2",
    {action: "pause", membershipId}), deps), /not found/);
});

test("a host billing pause pauses members and resumes only its own",
  async () => {
    const db = seedStore();
    const {deps} = await join(db);
    await manageHostMembershipProgramHandler(callable("host-1",
      {action: "pauseBilling", organizerId}), deps);
    assert.equal(await advanceHostBillingPause(organizerId, deps), "done");
    const paused = db.getDoc(`hostMemberships/${membershipId}`)!;
    assert.equal(paused.status, "paused");
    assert.deepEqual((paused.pause as {initiator: string}).initiator, "host");
    assert.equal((db.getDoc(`hostMembershipPrograms/${organizerId}`)!
      .billingPause as {state: string}).state, "paused");
    // Members cannot restart billing during the host's pause.
    await assert.rejects(manageMyHostMembershipHandler(callable("member-1",
      {action: "resume", membershipId}), deps), /paused billing/);
    await manageHostMembershipProgramHandler(callable("host-1",
      {action: "resumeBilling", organizerId}), deps);
    await advanceHostBillingPause(organizerId, deps);
    assert.equal(db.getDoc(`hostMemberships/${membershipId}`)!.status,
      "active");
  });

test("program readiness fails closed with a host-facing reason",
  async () => {
    const get = async (db: ReturnType<typeof seedStore>,
      deps = testDeps(db)) => manageHostMembershipProgramHandler(
      callable("host-1", {action: "get", organizerId}), deps);
    const enable = (db: ReturnType<typeof seedStore>, deps = testDeps(db)) =>
      manageHostMembershipProgramHandler(callable("host-1",
        {action: "enable", organizerId}), deps);
    const fresh = (extra: Record<string, Record<string, unknown>> = {}) => {
      const db = seedStore(extra);
      db.deleteDoc(`hostMembershipPrograms/${organizerId}`);
      return db;
    };

    // Catch has not offered memberships: no membership route.
    const notOffered = fresh();
    notOffered.deleteDoc("paymentRoutingPolicies/app");
    const off = await get(notOffered);
    assert.deepEqual([off.program, off.paymentMode, off.unavailableReason],
      [null, null, "notOffered"]);
    await assert.rejects(enable(notOffered),
      /hasn't turned on memberships/);

    // hostCollected without a connected Razorpay account.
    const unconnected = fresh();
    unconnected.deleteDoc(`organizerPaymentConnections/${connectionId}`);
    const noAccount = await get(unconnected);
    assert.deepEqual([noAccount.paymentMode, noAccount.routeAccountReady,
      noAccount.unavailableReason],
    ["hostCollected", false, "razorpayNotConnected"]);
    await assert.rejects(enable(unconnected), /Connect your Razorpay/);
    const stale = fresh(readyConnection({status: "needsAttention"}));
    assert.equal((await get(stale)).unavailableReason,
      "razorpayNeedsAttention");

    // Catch's commercial terms are not configured yet.
    const noTerms = fresh();
    noTerms.deleteDoc("commercialTerms/platform");
    const termsMissing = await get(noTerms);
    assert.deepEqual([termsMissing.routeAccountReady,
      termsMissing.feeConfigured, termsMissing.unavailableReason],
    [true, false, "termsNotConfigured"]);
    await assert.rejects(enable(noTerms), /finishing your terms/);

    // The host's Razorpay account has not enabled Subscriptions.
    const disabled = new FakeBillingProvider();
    disabled.subscriptionsEnabled = false;
    const db = fresh();
    await assert.rejects(enable(db, testDeps(db, disabled)),
      /Turn on Subscriptions/);
    assert.equal(db.getDoc(`hostMembershipPrograms/${organizerId}`),
      undefined);

    // Ready: the program binds the host's own account and its webhook.
    const provider = new FakeBillingProvider();
    const enabled = await enable(db, testDeps(db, provider));
    assert.deepEqual([enabled.program?.state, enabled.paymentMode,
      enabled.unavailableReason], ["enabled", "hostCollected", null]);
    assert.deepEqual(db.getDoc(`hostMembershipPrograms/${organizerId}`)!
      .payment, {...hostCollectedPayment, webhookId: "wh_membership"});
    assert.deepEqual(provider.calls.map((call) => call.method).slice(0, 2),
      ["probeSubscriptions", "ensureMerchantWebhook"]);
    assert.deepEqual(provider.calls[1].input, {url:
      "https://example.test/hostMembershipRazorpayWebhook?connectionId=" +
      connectionId});

    // platformSplit stays available behind its own route and payout account.
    const split = seedPlatformSplitStore();
    const notReady = testDeps(split, new FakeBillingProvider(), {
      readyRouteAccount: (async () => {
        throw new Error("not ready");
      }) as never});
    assert.deepEqual([(await get(split, notReady)).paymentMode,
      (await get(split, notReady)).unavailableReason],
    ["platformSplit", "payoutAccountNotReady"]);
    assert.equal((await get(split)).unavailableReason, null);

    await assert.rejects(manageHostMembershipProgramHandler(callable(
      "member-1", {action: "get", organizerId}), testDeps(db)),
    /permission-denied/);
  });

test("checkout fails closed when the bound mode can no longer run",
  async () => {
    const prepare = (db: ReturnType<typeof seedStore>) =>
      manageHostMembershipCheckoutHandler(callable("member-1", {
        action: "prepare", organizerId, planId, interval: "monthly"}),
      testDeps(db));
    const ok = seedStore();
    const opened = await prepare(ok);
    assert.deepEqual(ok.getDoc(
      `hostMembershipCheckouts/${opened.checkoutId}`)!.payment,
    hostCollectedPayment);

    const disconnected = seedStore(readyConnection({status: "disconnected",
      disconnectedAt: Timestamp.fromMillis(now)}));
    await assert.rejects(prepare(disconnected), /Connect your Razorpay/);
    const noTerms = seedStore();
    noTerms.deleteDoc("commercialTerms/platform");
    await assert.rejects(prepare(noTerms), /finishing your terms/);
    // Catch switched the organizer to another money flow: re-enable first.
    await assert.rejects(prepare(seedStore(membershipRouting(
      "razorpayRoute"))), /not taking new members/);
    // A provider plan made on another account cannot be bought here.
    await assert.rejects(prepare(seedStore({[`hostMembershipPlans/${planId}`]:
      plan({prices: {monthly: {amountPaise: 49900,
        providerPriceIds: {razorpay: "plan_TestMonthly1"},
        providerAccountId: "acc_Elsewhere1", revision: 1}}}) as unknown as
      Record<string, unknown>})), /not available/);
  });

test("plans save as drafts and publish with provider prices", async () => {
  const db = seedStore();
  db.deleteDoc(`hostMembershipPlans/${planId}`);
  const provider = new FakeBillingProvider();
  const deps = testDeps(db, provider);
  const draft = {name: "  Regulars ", description: "",
    prices: {monthly: {amountPaise: 29900}, annual: {amountPaise: 299900}},
    memberCap: null, trialDays: 0,
    benefits: [{type: "eventDiscount", percentOff: 20}],
    perks: [" Free coffee "], limits: {maxUpcomingMemberPricedBookings: 2},
    sortOrder: 0};
  const saved = await manageHostMembershipPlansHandler(callable("host-1",
    {action: "save", organizerId, planId: null, plan: draft,
      expectedRevision: null}), deps);
  assert.equal(saved.plans.length, 1);
  const created = saved.plans[0];
  assert.deepEqual([created.name, created.status, created.perks],
    ["Regulars", "draft", ["Free coffee"]]);
  assert.equal(provider.calls.length, 0);
  await manageHostMembershipPlansHandler(callable("host-1", {
    action: "publish", organizerId, planId: created.planId}), deps);
  const stored = db.getDoc(`hostMembershipPlans/${created.planId}`)!;
  assert.equal(stored.status, "published");
  // Provider plans are created on the organizer's own Razorpay account.
  assert.deepEqual(stored.prices, {
    monthly: {amountPaise: 29900,
      providerPriceIds: {razorpay: "plan_Createdmonthly"},
      providerAccountId: merchantAccountId, revision: 1},
    annual: {amountPaise: 299900,
      providerPriceIds: {razorpay: "plan_Createdannual"},
      providerAccountId: merchantAccountId, revision: 1}});
  // A price edit makes a new provider price; the old one is untouched.
  await manageHostMembershipPlansHandler(callable("host-1", {
    action: "save", organizerId, planId: created.planId,
    expectedRevision: stored.revision,
    plan: {...draft, prices: {monthly: {amountPaise: 34900},
      annual: {amountPaise: 299900}}}}), deps);
  const edited = db.getDoc(`hostMembershipPlans/${created.planId}`)!;
  assert.equal((edited.prices as Record<string, {revision: number}>)
    .monthly.revision, 2);
  assert.equal(provider.calls.filter((call) =>
    call.method === "createPrice").length, 3);
  await assert.rejects(manageHostMembershipPlansHandler(callable("host-1", {
    action: "save", organizerId, planId: created.planId,
    expectedRevision: 1, plan: draft}), deps), /changed/);
  await assert.rejects(manageHostMembershipPlansHandler(callable("host-1", {
    action: "save", organizerId, planId: null, expectedRevision: null,
    plan: {...draft, benefits: [{type: "earlyAccess"},
      {type: "earlyAccess"}]}}), deps), /once/);
});

test("event rules validate plans and anchor early access", async () => {
  const start = now + 10 * dayMillis;
  const db = seedStore({"events/event-1": {organizerId, clubId: organizerId,
    startTime: Timestamp.fromMillis(start)}});
  const deps = testDeps(db);
  const save = (extra: Record<string, unknown>) =>
    manageEventMembershipRulesHandler(callable("host-1", {action: "save",
      eventId: "event-1", memberPriceOverrides: [], earlyAccessHours: null,
      membersOnly: false, ...extra}), deps);
  await assert.rejects(save({expectedRevision: null, membersOnly: true}),
    /members-only access/);
  await assert.rejects(save({expectedRevision: null, memberPriceOverrides:
    [{planId: "hmp_ZZZZZZZZZZZZZZZZZZZZ", priceInPaise: 0}]}),
  /this organizer's plans/);
  db.updateDoc(`hostMembershipPlans/${planId}`, {benefits: [
    {type: "eventDiscount", percentOff: 100}, {type: "earlyAccess"}]});
  const first = await save({expectedRevision: null, earlyAccessHours: 48,
    memberPriceOverrides: [{planId, priceInPaise: 0}]});
  const anchor = first.rules!.generalSaleOpensAtMillis! - 48 * 3600_000;
  const second = await save({expectedRevision: 1, earlyAccessHours: 24,
    memberPriceOverrides: [{planId, priceInPaise: 0}]});
  assert.equal(second.rules!.generalSaleOpensAtMillis,
    anchor + 24 * 3600_000);
  // The event starts in ten days, so a week of early access still fits but
  // general sale can never open after the start.
  await save({expectedRevision: 2, earlyAccessHours: 168});
  db.updateDoc("events/event-1", {startTime: Timestamp.fromMillis(
    anchor + 100 * 3600_000)});
  await assert.rejects(save({expectedRevision: 3, earlyAccessHours: 120}),
    /before the event/);
  assert.equal(first.plans[0].planId, planId);
});

test("snapshots for another project are ignored", async () => {
  const db = seedStore();
  const result = await applySubscriptionSnapshot({
    db: db as unknown as FirebaseFirestore.Firestore,
    snapshot: subscription(), observedAtMillis: now, nowMillis: now,
    catchProject: "another-project"});
  assert.equal(result.outcome, "ignored");
});
