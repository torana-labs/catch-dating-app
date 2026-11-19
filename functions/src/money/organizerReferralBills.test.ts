import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import type {CallableRequest} from "firebase-functions/v2/https";
import {
  commercialTermsRecords,
  organizerTermsDocument,
} from "../commercialTerms/testFixture";
import type {
  OrganizerBillDocument,
  OrganizerBillingCycleDocument,
  OrganizerReferralDocument,
} from "../shared/generated/firestoreAdminTypes";
import {FakeFirestore, type FakeData} from "../shared/testing/programFirestore";
import {validateOrganizerBillDocument} from
  "../shared/generated/validators/organizerBillDocument";
import {dayMillis} from "./hostTrial";
import {
  adminManageOrganizerBillsHandler,
  type BillDeps,
} from "./organizerBills";
import {
  generateCycleBills,
  regenerateToSendCycleBills,
} from "./organizerCycleBills";

const ist = (5 * 60 + 30) * 60 * 1000;
// First events 10 Nov 2026, 12:00 IST: after the move to rolling cycles.
const firstEvent = Date.UTC(2026, 10, 10, 12) - ist;
const cycle = 30 * dayMillis;
// The referrer's 30-day trial ends 10 Dec; its cycles follow.
const referrerTrialEnd = firstEvent + 30 * dayMillis;

function referralDoc(status: "pending" | "earned" | "applied",
  extra: Partial<OrganizerReferralDocument["reward"]> = {}):
  OrganizerReferralDocument {
  return {schemaVersion: 1, referredOrganizerId: "referred",
    referredOrganizerName: "Kestrel Supper Club",
    referrerOrganizerId: "referrer-org", referrerUid: "referrer",
    sourceIntentId: "lead-1", recordedAtMillis: firstEvent - 20 * dayMillis,
    attachedAtMillis: firstEvent - 10 * dayMillis, source: "ownershipTrigger",
    trialDays: 60, commercialTerms: null,
    reward: {status, earnedAtMillis: status === "pending" ? null : firstEvent,
      earnedByBillId: status === "pending" ? null : "referred_c2027-01-09",
      appliedAtMillis: null, appliedBillId: null, ...extra},
    updatedAtMillis: firstEvent};
}

function facts(organizerId: string, extra: Record<string, unknown> = {}):
  FakeData {
  return {organizerId, milestones: {
    firstEventAt: Timestamp.fromMillis(firstEvent), firstPaidBookingAt: null,
    claimedAt: Timestamp.fromMillis(firstEvent - 5 * dayMillis)},
  ...extra} as FakeData;
}

let paymentCount = 0;
function payment(organizerId: string, atMillis: number, amountPaise: number,
  refundedAmountPaise = 0): Record<string, FakeData> {
  paymentCount++;
  return {[`guestPayments/rp${paymentCount}`]: {
    purpose: "publicEvent", organizerId, eventId: `${organizerId}-ev`,
    capturedAt: Timestamp.fromMillis(atMillis), amountPaise,
    refundedAmountPaise, routing: {selection: {route: "razorpayOAuth"}}}};
}

function seed(extra: Record<string, FakeData | undefined> = {}):
  FakeFirestore {
  return new FakeFirestore({
    ...commercialTermsRecords(),
    "organizers/referrer-org": {name: "Lantern Lane Runners",
      ownerUserId: "referrer"},
    "organizerGrowthFacts/referrer-org": facts("referrer-org"),
    "organizers/referred": {name: "Kestrel Supper Club",
      ownerUserId: "referred-owner"},
    ...extra,
  });
}

const deps = (db: FakeFirestore, nowMillis: number) => ({
  db: () => db as unknown as FirebaseFirestore.Firestore,
  now: () => nowMillis,
});

function bills(db: FakeFirestore, organizerId: string):
  OrganizerBillDocument[] {
  return [...(db as unknown as {docs: Map<string, FakeData>}).docs]
    .filter(([path]) => path.startsWith(`organizerBills/${organizerId}_`))
    .map(([, data]) => data as unknown as OrganizerBillDocument)
    .sort((a, b) => a.periodStartMillis - b.periodStartMillis);
}

function referral(db: FakeFirestore): OrganizerReferralDocument {
  return db.getDoc("organizerReferrals/referred") as unknown as
    OrganizerReferralDocument;
}

test("a referred host's 60-day trial anchors its first billing cycle",
  async () => {
    const trialEnd = firstEvent + 60 * dayMillis;
    const db = seed({
      ...commercialTermsRecords({organizers: [
        organizerTermsDocument("referred", {trial: {days: 60}})]}),
      "organizerGrowthFacts/referred": facts("referred"),
      "organizerReferrals/referred": referralDoc("pending") as
        unknown as FakeData,
      // Day 40: free under the referral trial, billed under the standard one.
      ...payment("referred", firstEvent + 40 * dayMillis, 1_000_000),
      // After the 60 days: ₹2,000, so ₹100 at 5%.
      ...payment("referred", trialEnd + dayMillis, 200_000),
    });
    // Day 70 would be a closed cycle under a 30-day trial: nothing yet.
    assert.equal(await generateCycleBills(deps(db, firstEvent +
      70 * dayMillis), null), 0);
    assert.equal(db.getDoc("organizerBillingCycles/referred"), undefined);
    await generateCycleBills(deps(db, trialEnd + cycle + dayMillis), null);
    const pointer = db.getDoc("organizerBillingCycles/referred") as unknown as
      OrganizerBillingCycleDocument;
    assert.equal(pointer.trialEndsAtMillis, trialEnd);
    const [bill] = bills(db, "referred");
    assert.deepEqual([bill.periodStartMillis, bill.totalMinor, bill.status],
      [trialEnd, 10_000, "toSend"]);
    assert.equal(bill.referralReward, undefined);
  });

test("the referrer's next cycle bill is free, and the one after is billed",
  async () => {
    const db = seed({
      "organizerReferrals/referred": referralDoc("earned") as
        unknown as FakeData,
      // ₹10,000 in cycle 1 (₹500 at 5%), ₹4,000 in cycle 2 (₹200).
      ...payment("referrer-org", referrerTrialEnd + dayMillis, 1_000_000),
      ...payment("referrer-org", referrerTrialEnd + cycle + dayMillis,
        400_000),
    });
    const at = referrerTrialEnd + 2 * cycle + dayMillis;
    assert.equal(await generateCycleBills(deps(db, at), null), 2);
    const [free, billed] = bills(db, "referrer-org");
    assert.equal(validateOrganizerBillDocument(free), true);
    assert.deepEqual([free.status, free.totalMinor,
      free.commission.amountMinor, free.gst.amountMinor,
      free.autoSendAtMillis], ["free", 0, 0, 0, null]);
    assert.deepEqual(free.referralReward,
      {referredOrganizerId: "referred", waivedMinor: 50_000});
    assert.match(String(free.history[0].note),
      /host referral reward for Kestrel Supper Club/u);
    assert.deepEqual([billed.status, billed.totalMinor], ["toSend", 20_000]);
    assert.equal(billed.referralReward, undefined);
    const stored = referral(db);
    assert.deepEqual([stored.reward.status, stored.reward.appliedBillId,
      stored.reward.appliedAtMillis], ["applied", free.billId, at]);
  });

test("a cycle with nothing to bill leaves the reward for a later cycle",
  async () => {
    const db = seed({
      "organizerReferrals/referred": referralDoc("earned") as
        unknown as FakeData,
      ...payment("referrer-org", referrerTrialEnd + cycle + dayMillis,
        400_000),
    });
    await generateCycleBills(deps(db, referrerTrialEnd + cycle + dayMillis),
      null);
    assert.deepEqual(bills(db, "referrer-org"), []);
    assert.equal(referral(db).reward.status, "earned");
    await generateCycleBills(deps(db, referrerTrialEnd + 2 * cycle +
      dayMillis), null);
    const [bill] = bills(db, "referrer-org");
    assert.deepEqual([bill.status, bill.referralReward?.waivedMinor],
      ["free", 20_000]);
    assert.equal(referral(db).reward.appliedBillId, bill.billId);
  });

test("a reward not yet earned leaves the referrer's bills alone", async () => {
  const db = seed({
    "organizerReferrals/referred": referralDoc("pending") as
      unknown as FakeData,
    ...payment("referrer-org", referrerTrialEnd + dayMillis, 1_000_000),
  });
  await generateCycleBills(deps(db, referrerTrialEnd + cycle + dayMillis),
    null);
  const [bill] = bills(db, "referrer-org");
  assert.deepEqual([bill.status, bill.totalMinor], ["toSend", 50_000]);
  assert.equal(referral(db).reward.status, "pending");
});

test("a recomputed free month stays free, and is given back with nothing " +
  "left to waive", async () => {
  const paymentDocs = payment("referrer-org", referrerTrialEnd + dayMillis,
    1_000_000);
  const db = seed({
    "organizerReferrals/referred": referralDoc("earned") as
      unknown as FakeData,
    ...paymentDocs,
  });
  const at = referrerTrialEnd + cycle + dayMillis;
  await generateCycleBills(deps(db, at), null);
  await regenerateToSendCycleBills(deps(db, at + dayMillis), null);
  let [bill] = bills(db, "referrer-org");
  assert.deepEqual([bill.status, bill.revision,
    bill.referralReward?.waivedMinor], ["free", 2, 50_000]);
  assert.equal(referral(db).reward.status, "applied");
  // The whole payment is refunded before the bill is sent: nothing to waive.
  const [paymentPath] = Object.keys(paymentDocs);
  db.setDoc(paymentPath, {...paymentDocs[paymentPath] as object,
    refundedAmountPaise: 1_000_000} as FakeData);
  await regenerateToSendCycleBills(deps(db, at + 2 * dayMillis), null);
  [bill] = bills(db, "referrer-org");
  assert.deepEqual([bill.status, bill.totalMinor, bill.referralReward],
    ["free", 0, null]);
  assert.equal(validateOrganizerBillDocument(bill), true);
  assert.deepEqual([referral(db).reward.status,
    referral(db).reward.appliedBillId], ["earned", null]);
});

const sentBill = (billId: string, extra: Partial<OrganizerBillDocument> =
{}): OrganizerBillDocument => ({schemaVersion: 1, billId,
  organizerId: "referred", organizerName: "Kestrel Supper Club",
  month: "2027-02", periodStartMillis: firstEvent + 60 * dayMillis,
  periodEndMillis: firstEvent + 90 * dayMillis, periodKind: "cycle",
  cycleNumber: 1, countFromMillis: firstEvent + 60 * dayMillis,
  plan: {kind: "ticketing", toolsOnlyFeeMinor: null}, revision: 1,
  status: "sent", autoSendAtMillis: null,
  sales: {paymentCount: 1, eventCount: 1, grossMinor: 200_000,
    refundedMinor: 0, baseMinor: 200_000, providerFeeMinor: 0,
    providerTaxMinor: 0, unsnapshottedCount: 0},
  commission: {rateBasisPoints: 500, uncappedMinor: 10_000,
    capMinor: 1_000_000, capped: false, trialWaivedMinor: 0,
    amountMinor: 10_000},
  trialEndsAtMillis: firstEvent + 60 * dayMillis,
  terms: {platformRevision: 1, organizerRevision: 1, ownTerms: true},
  gst: {registered: false, rateBasisPoints: 0, amountMinor: 0},
  totalMinor: 10_000, invoiceNumber: "2026-27/001",
  dueAtMillis: firstEvent + 105 * dayMillis, paymentLink: null,
  sentAtMillis: firstEvent + 91 * dayMillis, reminders: [],
  paidAtMillis: null, paidMinor: null, paidVia: null,
  writtenOffAtMillis: null, history: [],
  generatedAtMillis: firstEvent + 90 * dayMillis,
  updatedAtMillis: firstEvent + 91 * dayMillis, ...extra});

async function markPaid(db: FakeFirestore, billId: string, atMillis: number) {
  const billDeps = {...deps(db, atMillis),
    links: () => {
      throw new Error("No links in this test.");
    },
    invoices: () => {
      throw new Error("No invoices in this test.");
    }} as unknown as BillDeps;
  await adminManageOrganizerBillsHandler({auth: {uid: "operator",
    token: {adminOwner: true}}, data: {action: "markPaid", month: null,
    organizerId: null, billId, expectedRevision: 1, note: null}} as
    unknown as CallableRequest<unknown>, billDeps);
}

test("the referred host's first paid bill earns the reward, exactly once, " +
  "and no cash credit", async () => {
  const nominator = {uid: "referrer", role: "guest",
    nominatedAt: Timestamp.fromMillis(firstEvent - 20 * dayMillis)};
  const db = seed({
    "organizerGrowthFacts/referred": facts("referred", {nominator}),
    "organizerReferrals/referred": referralDoc("pending") as
      unknown as FakeData,
    "organizerBills/referred_c2027-01-09": sentBill("referred_c2027-01-09") as
      unknown as FakeData,
    "organizerBills/referred_c2027-02-08": sentBill("referred_c2027-02-08", {
      month: "2027-03"}) as unknown as FakeData,
  });
  const first = firstEvent + 95 * dayMillis;
  await markPaid(db, "referred_c2027-01-09", first);
  assert.deepEqual([referral(db).reward.status,
    referral(db).reward.earnedByBillId, referral(db).reward.earnedAtMillis],
  ["earned", "referred_c2027-01-09", first]);
  await markPaid(db, "referred_c2027-02-08", first + cycle);
  assert.deepEqual([referral(db).reward.earnedByBillId,
    referral(db).reward.earnedAtMillis], ["referred_c2027-01-09", first]);
  // The referrer's free month replaces the nominator's cash credit.
  assert.equal(db.getDoc("nominatorCredits/referred_c2027-01-09"), undefined);
  assert.equal(db.getDoc("nominatorCredits/referred_c2027-02-08"), undefined);

  // Without a host referral the same nominator still earns credit.
  const plain = seed({
    "organizerGrowthFacts/referred": facts("referred", {nominator}),
    "organizerBills/referred_c2027-01-09": sentBill("referred_c2027-01-09") as
      unknown as FakeData,
  });
  await markPaid(plain, "referred_c2027-01-09", first);
  assert.ok(plain.getDoc("nominatorCredits/referred_c2027-01-09"));
  assert.equal(plain.getDoc("organizerReferrals/referred"), undefined);
});
