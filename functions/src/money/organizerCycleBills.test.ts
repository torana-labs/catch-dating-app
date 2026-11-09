import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {
  commercialTermsRecords,
  organizerTermsDocument,
} from "../commercialTerms/testFixture";
import {organizerCommercialTermsId} from "../commercialTerms/terms";
import type {
  OrganizerBillDocument,
  OrganizerBillingCycleDocument,
} from "../shared/generated/firestoreAdminTypes";
import {FakeFirestore, type FakeData} from "../shared/testing/programFirestore";
import {cycleBillingEpochMillis} from "./billCycles";
import {dayMillis} from "./hostTrial";
import {
  generateCycleBills,
  legacyBilledThroughMillis,
  regenerateToSendCycleBills,
} from "./organizerCycleBills";

const ist = (5 * 60 + 30) * 60 * 1000;
// First event 10 Oct 2026, 12:00 IST; the 30-day trial ends 9 Nov, 12:00 IST.
const firstEvent = Date.UTC(2026, 9, 10, 12) - ist;
const trialEnd = firstEvent + 30 * dayMillis;
const cycle = 30 * dayMillis;

function seed(extra: Record<string, FakeData> = {}): FakeFirestore {
  return new FakeFirestore({
    ...commercialTermsRecords(),
    "organizers/org": {name: "Lantern Lane", ownerUserId: "owner"},
    "organizerGrowthFacts/org": {organizerId: "org", milestones: {
      firstEventAt: Timestamp.fromMillis(firstEvent),
      firstPaidBookingAt: null}},
    ...extra,
  });
}

let paymentCount = 0;
function payment(atMillis: number, amountPaise: number,
  refundedAmountPaise = 0): Record<string, FakeData> {
  paymentCount++;
  return {[`publicEventPayments/p${paymentCount}`]: {organizerId: "org",
    eventId: "ev1", capturedAt: Timestamp.fromMillis(atMillis), amountPaise,
    refundedAmountPaise,
    routing: {selection: {route: "razorpayOAuth"}}}};
}

const deps = (db: FakeFirestore, nowMillis: number) => ({
  db: () => db as unknown as FirebaseFirestore.Firestore,
  now: () => nowMillis,
});

function bills(db: FakeFirestore): OrganizerBillDocument[] {
  return [...(db as unknown as {docs: Map<string, FakeData>}).docs]
    .filter(([path]) => path.startsWith("organizerBills/"))
    .map(([, data]) => data as unknown as OrganizerBillDocument)
    .sort((a, b) => a.periodStartMillis - b.periodStartMillis);
}

function pointer(db: FakeFirestore): OrganizerBillingCycleDocument {
  return db.getDoc("organizerBillingCycles/org") as unknown as
    OrganizerBillingCycleDocument;
}

test("a closed cycle is billed in arrears and matches a hand calculation",
  async () => {
    const db = seed({
      // In the trial: free, and before the first cycle anyway.
      ...payment(trialEnd - dayMillis, 5_000_000),
      // ₹1,000 and ₹500 with ₹100 refunded: base ₹1,400, 5% = ₹70.
      ...payment(trialEnd + dayMillis, 100_000),
      ...payment(trialEnd + 10 * dayMillis, 50_000, 10_000),
      // In the next, still open cycle.
      ...payment(trialEnd + cycle + dayMillis, 999_999),
    });
    assert.equal(await generateCycleBills(deps(db, trialEnd + cycle + 2 *
      dayMillis), null), 1);
    const [bill] = bills(db);
    assert.equal(bill.billId, "org_c2026-11-09");
    assert.equal(bill.periodKind, "cycle");
    assert.equal(bill.cycleNumber, 1);
    assert.equal(bill.periodStartMillis, trialEnd);
    assert.equal(bill.periodEndMillis, trialEnd + cycle);
    assert.equal(bill.month, "2026-12");
    assert.equal(bill.status, "toSend");
    assert.equal(bill.sales.paymentCount, 2);
    assert.equal(bill.sales.grossMinor, 150_000);
    assert.equal(bill.sales.refundedMinor, 10_000);
    assert.equal(bill.sales.baseMinor, 140_000);
    assert.equal(bill.commission.amountMinor, 7_000);
    assert.equal(bill.totalMinor, 7_000);
    assert.equal(bill.gst.amountMinor, 0);
    assert.deepEqual(bill.plan, {kind: "ticketing", toolsOnlyFeeMinor: null});
    assert.equal(pointer(db).nextCycleNumber, 2);
    assert.equal(pointer(db).nextCycleStartMillis, trialEnd + cycle);
  });

test("the cap applies to each cycle separately", async () => {
  const db = seed({
    // ₹3,00,000 in each cycle: 5% is ₹15,000, capped at ₹10,000 per cycle.
    ...payment(trialEnd + dayMillis, 30_000_000),
    ...payment(trialEnd + cycle + dayMillis, 30_000_000),
  });
  await generateCycleBills(deps(db, trialEnd + 2 * cycle + 1), null);
  const [first, second] = bills(db);
  for (const bill of [first, second]) {
    assert.equal(bill.commission.uncappedMinor, 1_500_000);
    assert.equal(bill.commission.amountMinor, 1_000_000);
    assert.equal(bill.commission.capped, true);
  }
  assert.equal(second.cycleNumber, 2);
});

test("running again bills nothing twice", async () => {
  const db = seed(payment(trialEnd + dayMillis, 100_000));
  const now = trialEnd + cycle + 1;
  assert.equal(await generateCycleBills(deps(db, now), null), 1);
  assert.equal(await generateCycleBills(deps(db, now), null), 0);
  assert.equal(await generateCycleBills(deps(db, now + dayMillis), null), 0);
  assert.equal(bills(db).length, 1);
});

test("a cycle with nothing to bill advances the pointer without a bill",
  async () => {
    const db = seed(payment(trialEnd + cycle + dayMillis, 100_000));
    assert.equal(await generateCycleBills(deps(db, trialEnd + cycle + 1),
      null), 0);
    assert.equal(bills(db).length, 0);
    assert.equal(pointer(db).nextCycleNumber, 2);
    assert.equal(await generateCycleBills(deps(db, trialEnd + 2 * cycle + 1),
      null), 1);
    assert.equal(bills(db)[0].cycleNumber, 2);
  });

test("no cycle runs before the trial ends", async () => {
  const db = seed(payment(trialEnd - dayMillis, 100_000));
  assert.equal(await generateCycleBills(deps(db, trialEnd - 1), null), 0);
  assert.equal(db.getDoc("organizerBillingCycles/org"), undefined);
});

test("the move from monthly bills never bills a payment twice", async () => {
  // The trial ended 20 Sep; October was billed as a calendar month.
  const ended = Date.UTC(2026, 8, 20, 12) - ist;
  const octoberStart = Date.UTC(2026, 9, 1) - ist;
  const db = new FakeFirestore({
    ...commercialTermsRecords(),
    "organizers/org": {name: "Lantern Lane"},
    "organizerGrowthFacts/org": {organizerId: "org", milestones: {
      firstEventAt: Timestamp.fromMillis(ended - 30 * dayMillis),
      firstPaidBookingAt: null}},
    "organizerBills/org_2026-10": {organizerId: "org", month: "2026-10",
      periodStartMillis: octoberStart,
      periodEndMillis: cycleBillingEpochMillis, status: "sent"},
    // Already on October's bill.
    ...payment(Date.UTC(2026, 9, 25), 10_000_000),
    // After the move: counted.
    ...payment(Date.UTC(2026, 10, 5), 100_000),
  });
  assert.equal(await legacyBilledThroughMillis(
    db as unknown as FirebaseFirestore.Firestore, "org"),
  cycleBillingEpochMillis);
  // Cycles run 20 Sep, 20 Oct, 19 Nov: the 20 Oct cycle straddles 1 Nov.
  await generateCycleBills(deps(db, ended + 2 * cycle + 1), null);
  const cycleBills = bills(db).filter((bill) => bill.periodKind === "cycle");
  assert.equal(cycleBills.length, 1);
  const [bill] = cycleBills;
  assert.equal(bill.cycleNumber, 2);
  assert.equal(bill.periodStartMillis, ended + cycle);
  assert.equal(bill.countFromMillis, cycleBillingEpochMillis);
  assert.equal(bill.sales.paymentCount, 1);
  assert.equal(bill.commission.amountMinor, 5_000);
  // The cap shrinks to the share of the cycle after 1 Nov.
  const billedShare = (ended + 2 * cycle - cycleBillingEpochMillis) / cycle;
  assert.equal(bill.commission.capMinor, Math.floor(1_000_000 * billedShare));
});

test("a later cycleDays change shortens only cycles not yet billed",
  async () => {
    const db = seed({
      ...payment(trialEnd + dayMillis, 100_000),
      ...payment(trialEnd + cycle + dayMillis, 100_000),
    });
    await generateCycleBills(deps(db, trialEnd + cycle + 1), null);
    db.setDoc(`commercialTerms/${organizerCommercialTermsId("org")}`,
      organizerTermsDocument("org", {commission: {cycleDays: 15}}) as
        unknown as FakeData);
    await generateCycleBills(deps(db, trialEnd + cycle + 15 * dayMillis + 1),
      null);
    const [first, second] = bills(db);
    assert.equal(first.periodEndMillis - first.periodStartMillis, cycle);
    assert.equal(second.periodStartMillis, first.periodEndMillis);
    assert.equal(second.periodEndMillis - second.periodStartMillis,
      15 * dayMillis);
  });

test("a bill not yet sent picks up refunds made after its cycle closed",
  async () => {
    const db = seed(payment(trialEnd + dayMillis, 100_000));
    await generateCycleBills(deps(db, trialEnd + cycle + 1), null);
    const path = "publicEventPayments/" + [...(db as unknown as {
      docs: Map<string, FakeData>}).docs.keys()]
      .find((key) => key.startsWith("publicEventPayments/"))!.split("/")[1];
    db.setDoc(path, {...db.getDoc(path)!, refundedAmountPaise: 40_000});
    assert.equal(await regenerateToSendCycleBills(deps(db,
      trialEnd + cycle + dayMillis), "staff"), 1);
    const [bill] = bills(db);
    assert.equal(bill.commission.amountMinor, 3_000);
    assert.equal(bill.revision, 2);
    assert.equal(bill.history.at(-1)?.action, "regenerated");
  });
