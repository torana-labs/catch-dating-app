import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import type {CallableRequest} from "firebase-functions/v2/https";
import {
  commercialTermsRecords,
  organizerTermsDocument,
} from "../commercialTerms/testFixture";
import {organizerCommercialTermsId} from "../commercialTerms/terms";
import type {
  OrganizerBillDocument,
  OrganizerBillingPlanDocument,
} from "../shared/generated/firestoreAdminTypes";
import {FakeFirestore, type FakeData} from "../shared/testing/programFirestore";
import type {BillPaymentLinkClient} from "./billPaymentLinks";
import {dayMillis} from "./hostTrial";
import {
  manageOrganizerBillingPlanHandler,
  markToolsOnlyPaidFromLink,
  type PlanDeps,
} from "./organizerBillingPlan";
import {getOrganizerBillingStatusHandler} from "./organizerBillingStatus";
import {
  generateCycleBills,
  regenerateToSendCycleBills,
} from "./organizerCycleBills";

const ist = (5 * 60 + 30) * 60 * 1000;
const firstEvent = Date.UTC(2026, 10, 10, 12) - ist;
const trialEnd = firstEvent + 30 * dayMillis;
const cycle = 30 * dayMillis;

class FakeLinks implements BillPaymentLinkClient {
  links = new Map<string, {amount: number; paid: number; status: string;
    planOrganizerId: string | null; project: string}>();
  cancelled: string[] = [];
  async create(): Promise<{linkId: string; url: string}> {
    throw new Error("not used");
  }
  async createForPlan(input: {organizerId: string; amountMinor: number}) {
    const linkId = `plink_tools${this.links.size + 1}`;
    this.links.set(linkId, {amount: input.amountMinor, paid: 0,
      status: "created", planOrganizerId: input.organizerId,
      project: "catch-test"});
    return {linkId, url: `https://rzp.io/l/${linkId}`};
  }
  async fetch(linkId: string) {
    const link = this.links.get(linkId)!;
    return {status: link.status, amountPaid: link.paid, billId: null,
      planOrganizerId: link.planOrganizerId, project: link.project};
  }
  async cancel(linkId: string) {
    this.cancelled.push(linkId);
  }
  pay(linkId: string, amount?: number) {
    const link = this.links.get(linkId)!;
    link.paid = amount ?? link.amount;
    link.status = "paid";
  }
}

function setup(extra: Record<string, FakeData> = {}) {
  const db = new FakeFirestore({
    ...commercialTermsRecords(),
    "organizers/org": {name: "Lantern Lane", ownerUserId: "owner",
      hostUserIds: ["owner", "manager"]},
    "organizerGrowthFacts/org": {organizerId: "org", milestones: {
      firstEventAt: Timestamp.fromMillis(firstEvent),
      firstPaidBookingAt: null}},
    ...extra,
  });
  const links = new FakeLinks();
  let now = firstEvent + dayMillis;
  const deps: PlanDeps = {
    db: () => db as unknown as FirebaseFirestore.Firestore,
    now: () => now,
    links: () => links,
    checkRateLimit: async () => undefined,
  };
  const call = (action: string, expectedRevision: number | null, uid =
  "owner") => manageOrganizerBillingPlanHandler({auth: {uid},
    data: {organizerId: "org", action, expectedRevision}} as unknown as
    CallableRequest<unknown>, deps);
  return {db, links, deps, call, setNow: (millis: number) => {
    now = millis;
  }};
}

const plan = (db: FakeFirestore) => db.getDoc("organizerBillingPlans/org") as
  unknown as OrganizerBillingPlanDocument;
const bills = (db: FakeFirestore) => [...(db as unknown as {
  docs: Map<string, FakeData>}).docs]
  .filter(([path]) => path.startsWith("organizerBills/"))
  .map(([, data]) => data as unknown as OrganizerBillDocument)
  .sort((a, b) => a.periodStartMillis - b.periodStartMillis);

test("the website reads ticketing with Catch's prices before any change",
  async () => {
    const {call} = setup();
    const result = await call("read", null);
    assert.deepEqual(result.plan, {plan: "ticketing", status: "none",
      startsAtMillis: null, endsAtMillis: null});
    assert.equal(result.revision, 0);
    assert.deepEqual(result.prices, {toolsOnlyFeeMinor: 500_000,
      commissionRateBasisPoints: 500, commissionCapMinor: 1_000_000,
      cycleDays: 30, gstRegistered: false, gstRateBasisPoints: 1800});
  });

test("buying in the trial starts tools-only with the first cycle and waits " +
  "for payment", async () => {
  const {db, links, call} = setup();
  const result = await call("buyToolsOnly", 0);
  assert.equal(result.plan.status, "pendingPayment");
  assert.equal(result.plan.startsAtMillis, trialEnd);
  assert.equal(result.amountDueMinor, 500_000);
  assert.equal(result.paymentUrl, "https://rzp.io/l/plink_tools1");
  assert.equal(links.links.get("plink_tools1")?.planOrganizerId, "org");
  // Buying again returns the same link instead of making another.
  const again = await call("buyToolsOnly", 1);
  assert.equal(again.paymentUrl, result.paymentUrl);
  assert.equal(links.links.size, 1);
  assert.equal(plan(db).revision, 1);
});

test("buying mid-cycle never changes the cycle under way", async () => {
  const {call, setNow} = setup();
  setNow(trialEnd + 10 * dayMillis);
  const result = await call("buyToolsOnly", 0);
  assert.equal(result.plan.startsAtMillis, trialEnd + cycle);
});

test("tools-only waits for the trial to start", async () => {
  const {db, call} = setup();
  db.setDoc("organizerGrowthFacts/org", {organizerId: "org",
    milestones: {firstEventAt: null, firstPaidBookingAt: null}});
  await assert.rejects(call("buyToolsOnly", 0), {code: "failed-precondition"});
});

test("only the owner can buy, and a stale revision is refused", async () => {
  const {call} = setup();
  await assert.rejects(call("buyToolsOnly", 0, "manager"),
    {code: "permission-denied"});
  await assert.rejects(call("buyToolsOnly", 3), {code: "aborted"});
});

test("the paid link activates the plan; other projects and short payments " +
  "do not", async () => {
  const {db, links, deps, call} = setup();
  await call("buyToolsOnly", 0);
  links.pay("plink_tools1", 100);
  assert.equal(await markToolsOnlyPaidFromLink(deps, "plink_tools1",
    "catch-test"), false);
  links.pay("plink_tools1");
  assert.equal(await markToolsOnlyPaidFromLink(deps, "plink_tools1",
    "other-project"), false);
  assert.equal(await markToolsOnlyPaidFromLink(deps, "plink_tools1",
    "catch-test"), true);
  assert.equal(plan(db).status, "active");
  assert.equal(plan(db).purchase?.paidMinor, 500_000);
  // A replayed webhook changes nothing.
  assert.equal(await markToolsOnlyPaidFromLink(deps, "plink_tools1",
    "catch-test"), false);
});

test("tools-only cycles bill the flat fee, never commission, and the first " +
  "is prepaid", async () => {
  const {db, links, deps, call} = setup({
    "publicEventPayments/p1": {organizerId: "org", eventId: "ev1",
      capturedAt: Timestamp.fromMillis(trialEnd + dayMillis),
      amountPaise: 30_000_000, refundedAmountPaise: 0,
      routing: {selection: {route: "razorpayOAuth"}}},
  });
  await call("buyToolsOnly", 0);
  links.pay("plink_tools1");
  await markToolsOnlyPaidFromLink(deps, "plink_tools1", "catch-test");
  await generateCycleBills({db: deps.db,
    now: () => trialEnd + 2 * cycle + 1}, null);
  const [first, second] = bills(db);
  assert.equal(first.plan?.kind, "toolsOnly");
  assert.equal(first.commission.amountMinor, 0);
  assert.equal(first.sales.grossMinor, 30_000_000);
  assert.equal(first.totalMinor, 500_000);
  assert.equal(first.status, "paid");
  assert.equal(first.paidVia, "planPurchase");
  assert.equal(plan(db).prepaidBillId, first.billId);
  // The next tools-only cycle is billed in arrears like any other.
  assert.equal(second.plan?.kind, "toolsOnly");
  assert.equal(second.totalMinor, 500_000);
  assert.equal(second.status, "toSend");
});

test("cancelling ends tools-only when the cycle under way closes, never " +
  "before the prepaid cycle", async () => {
  const {db, links, deps, call, setNow} = setup();
  await call("buyToolsOnly", 0);
  links.pay("plink_tools1");
  await markToolsOnlyPaidFromLink(deps, "plink_tools1", "catch-test");
  // Still in the trial: the prepaid first cycle is kept.
  const cancelled = await call("cancelToolsOnly", 2);
  assert.equal(cancelled.plan.endsAtMillis, trialEnd + cycle);
  await generateCycleBills({db: deps.db,
    now: () => trialEnd + 2 * cycle + 1}, null);
  // The first cycle was tools-only (prepaid); the second is ticketing again
  // and had nothing to bill.
  const made = bills(db);
  assert.equal(made.length, 1);
  assert.equal(made[0].plan?.kind, "toolsOnly");
  setNow(trialEnd + 3 * cycle);
  assert.equal((await call("read", null)).plan.endsAtMillis,
    trialEnd + cycle);
});

test("cancelling an unpaid purchase drops it and cancels its link",
  async () => {
    const {db, links, call} = setup();
    await call("buyToolsOnly", 0);
    const result = await call("cancelToolsOnly", 1);
    assert.deepEqual(links.cancelled, ["plink_tools1"]);
    assert.equal(result.plan.plan, "ticketing");
    assert.equal(result.plan.status, "ended");
    assert.equal(result.paymentUrl, null);
    assert.equal(plan(db).revision, 2);
  });

test("the Host app's status shows the plan with no price", async () => {
  const {db, links, deps, call} = setup();
  await call("buyToolsOnly", 0);
  links.pay("plink_tools1");
  await markToolsOnlyPaidFromLink(deps, "plink_tools1", "catch-test");
  const status = await getOrganizerBillingStatusHandler({auth: {uid: "owner"},
    data: {organizerId: "org"}} as unknown as CallableRequest<unknown>,
  {db: deps.db, now: deps.now, checkRateLimit: async () => undefined});
  assert.deepEqual(status.plan, {plan: "toolsOnly", status: "active",
    startsAtMillis: trialEnd, endsAtMillis: null});
  assert.ok(!JSON.stringify(status).includes("Minor"));
  assert.ok(db.getDoc("organizerBillingPlans/org"));
});

test("a purchase paid after its first cycle began buys the next cycle " +
  "instead, and is never lost", async () => {
  const {db, links, deps, call} = setup();
  await call("buyToolsOnly", 0);
  // The first cycle closes while the purchase is unpaid: no tools-only.
  await generateCycleBills({db: deps.db, now: () => trialEnd + cycle + 1},
    null);
  links.pay("plink_tools1");
  const late = {...deps, now: () => trialEnd + cycle + 2 * 3_600_000};
  assert.equal(await markToolsOnlyPaidFromLink(late, "plink_tools1",
    "catch-test"), true);
  assert.equal(plan(db).startsAtMillis, trialEnd + 2 * cycle);
  await generateCycleBills({db: deps.db, now: () => trialEnd + 3 * cycle + 1},
    null);
  const [prepaid] = bills(db);
  assert.equal(prepaid.periodStartMillis, trialEnd + 2 * cycle);
  assert.equal(prepaid.plan?.kind, "toolsOnly");
  assert.equal(prepaid.status, "paid");
  assert.equal(plan(db).prepaidBillId, prepaid.billId);
});

test("the prepaid cycle is paid at the fee it was bought at, even after the " +
  "fee rises", async () => {
  const {db, links, deps, call} = setup();
  await call("buyToolsOnly", 0);
  links.pay("plink_tools1");
  await markToolsOnlyPaidFromLink(deps, "plink_tools1", "catch-test");
  db.setDoc(`commercialTerms/${organizerCommercialTermsId("org")}`,
    organizerTermsDocument("org", {toolsOnly: {feeMinor: 600_000}}) as
      unknown as FakeData);
  await generateCycleBills({db: deps.db, now: () => trialEnd + 2 * cycle + 1},
    null);
  const [first, second] = bills(db);
  assert.equal(first.totalMinor, 500_000);
  assert.equal(first.status, "paid");
  assert.equal(second.totalMinor, 600_000);
  assert.equal(second.status, "toSend");
});

test("a new purchase waits until the last tools-only window is billed",
  async () => {
    const {links, deps, call, setNow} = setup();
    await call("buyToolsOnly", 0);
    links.pay("plink_tools1");
    await markToolsOnlyPaidFromLink(deps, "plink_tools1", "catch-test");
    await call("cancelToolsOnly", 2);
    // The plan ended at the first cycle's close, which is not yet billed.
    setNow(trialEnd + cycle + 60_000);
    await assert.rejects(call("buyToolsOnly", 3), {code: "failed-precondition"});
    await generateCycleBills({db: deps.db, now: () => trialEnd + cycle + 1},
      null);
    const again = await call("buyToolsOnly", 4);
    assert.equal(again.plan.status, "pendingPayment");
    assert.equal(again.plan.startsAtMillis, trialEnd + 2 * cycle);
  });

test("recomputing an unsent bill keeps the plan it was made on", async () => {
  const {db, links, deps, call} = setup();
  await call("buyToolsOnly", 0);
  links.pay("plink_tools1");
  await markToolsOnlyPaidFromLink(deps, "plink_tools1", "catch-test");
  await generateCycleBills({db: deps.db, now: () => trialEnd + 2 * cycle + 1},
    null);
  // The plan document changes (as on a later purchase); the bill does not.
  db.setDoc("organizerBillingPlans/org", {...plan(db), plan: "ticketing",
    status: "ended"} as unknown as FakeData);
  await regenerateToSendCycleBills({db: deps.db,
    now: () => trialEnd + 2 * cycle + 5}, "staff");
  const [, second] = bills(db);
  assert.equal(second.plan?.kind, "toolsOnly");
  assert.equal(second.totalMinor, 500_000);
  assert.equal(second.commission.amountMinor, 0);
});

test("paying a link the plan no longer tracks is flagged, not applied",
  async () => {
    const {db, links, deps, call} = setup();
    await call("buyToolsOnly", 0);
    await call("cancelToolsOnly", 1);
    await call("buyToolsOnly", 2);
    links.pay("plink_tools1");
    assert.equal(await markToolsOnlyPaidFromLink(deps, "plink_tools1",
      "catch-test"), false);
    assert.equal(plan(db).status, "pendingPayment");
    assert.equal(plan(db).purchase?.linkId, "plink_tools2");
  });
