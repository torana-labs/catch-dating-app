import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {
  commercialTermsRecords,
  testCommercialTerms,
} from "../commercialTerms/testFixture";
import type {OrganizerBillDocument} from
  "../shared/generated/firestoreAdminTypes";
import {FakeFirestore, type FakeData} from "../shared/testing/programFirestore";
import {
  applyRefundCredit,
  computeBill,
  type BillablePayment,
} from "./billComputation";
import {invoiceLineName} from "./billInvoices";
import {refundCreditLines} from "./billNotices";
import {refundCreditOwed} from "./billRefundCredits";
import {dayMillis} from "./hostTrial";
import {ownBillView} from "./organizerOwnBills";
import {
  generateCycleBills,
  regenerateToSendCycleBills,
} from "./organizerCycleBills";

const ist = (5 * 60 + 30) * 60 * 1000;
// First event 10 Oct 2026, 12:00 IST; the 30-day trial ends 9 Nov, 12:00 IST.
const firstEvent = Date.UTC(2026, 9, 10, 12) - ist;
const trialEnd = firstEvent + 30 * dayMillis;
const cycle = 30 * dayMillis;
const cycleEnd = (n: number) => trialEnd + n * cycle;

let paymentCount = 0;
function payment(atMillis: number, amountPaise: number,
  refundedAmountPaise = 0): [string, FakeData] {
  paymentCount++;
  return [`guestPayments/p${paymentCount}`, {
    purpose: "publicEvent", organizerId: "org",
    eventId: "ev1", capturedAt: Timestamp.fromMillis(atMillis), amountPaise,
    refundedAmountPaise, routing: {selection: {route: "razorpayOAuth"}}}];
}

function seed(...payments: [string, FakeData][]): FakeFirestore {
  return new FakeFirestore({
    ...commercialTermsRecords(),
    "organizers/org": {name: "Lantern Lane", ownerUserId: "owner"},
    "organizerGrowthFacts/org": {organizerId: "org", milestones: {
      firstEventAt: Timestamp.fromMillis(firstEvent),
      firstPaidBookingAt: null}},
    ...Object.fromEntries(payments),
  });
}

const deps = (db: FakeFirestore, nowMillis: number) => ({
  db: () => db as unknown as FirebaseFirestore.Firestore,
  now: () => nowMillis,
});

function bill(db: FakeFirestore, cycleNumber: number):
  OrganizerBillDocument | undefined {
  return [...db.docs].filter(([path]) => path.startsWith("organizerBills/"))
    .map(([, data]) => data as unknown as OrganizerBillDocument)
    .find((item) => item.cycleNumber === cycleNumber);
}

/** Staff send the bill (as the send action would record it). */
function send(db: FakeFirestore, cycleNumber: number, invoice: number,
  status: "sent" | "paid" | "writtenOff" = "sent") {
  const current = bill(db, cycleNumber);
  assert.ok(current);
  db.setDoc(`organizerBills/${current.billId}`, {...current, status,
    sentAtMillis: cycleEnd(cycleNumber) + dayMillis,
    invoiceNumber: `2026-27/${String(invoice).padStart(3, "0")}`,
    revision: current.revision + 1} as unknown as FakeData);
}

function refund(db: FakeFirestore, path: string, refundedAmountPaise: number) {
  db.setDoc(path, {...db.getDoc(path), refundedAmountPaise});
}

test("credit comes off before GST, oldest first, never below zero", () => {
  const sources = [
    {billId: "a", cycleNumber: 1, invoiceNumber: null, refundedMinor: 1,
      creditMinor: 3_000},
    {billId: "b", cycleNumber: 2, invoiceNumber: null, refundedMinor: 1,
      creditMinor: 4_000},
  ];
  assert.deepEqual(applyRefundCredit(5_000, sources), {availableMinor: 7_000,
    appliedMinor: 5_000, carriedForwardMinor: 2_000, lines: [
      {...sources[0], appliedMinor: 3_000},
      {...sources[1], appliedMinor: 2_000}]});
  assert.equal(applyRefundCredit(0, sources)?.appliedMinor, 0);
  assert.equal(applyRefundCredit(5_000, []), null);
});

const terms = testCommercialTerms();
const credit = (creditMinor: number, billId = "a") => ({billId,
  cycleNumber: 1, invoiceNumber: null, refundedMinor: 1, creditMinor});

test("a tools-only bill stays a flat fee, less the credit, with GST on the " +
  "rest", () => {
  const figures = computeBill({payments: [], terms, trialEndsAtMillis: null,
    gstRegistered: true, gstRateBasisPoints: 1800,
    plan: {kind: "toolsOnly", feeMinor: 500_000}, credit: [credit(2_500)]});
  assert.equal(figures.commission.amountMinor, 0);
  assert.equal(figures.plan.kind, "toolsOnly");
  assert.equal(figures.refundCredit?.appliedMinor, 2_500);
  assert.equal(figures.gst.amountMinor, Math.round(497_500 * 0.18));
  assert.equal(figures.totalMinor, 497_500 + Math.round(497_500 * 0.18));
});

function sentBill(extra: Partial<OrganizerBillDocument>):
  OrganizerBillDocument {
  const figures = computeBill({payments: [], terms,
    trialEndsAtMillis: trialEnd, gstRegistered: false, gstRateBasisPoints: 0});
  return {schemaVersion: 1, billId: "org_c2026-11-09", organizerId: "org",
    organizerName: "Lantern Lane", month: "2026-12", periodKind: "cycle",
    cycleNumber: 1, countFromMillis: trialEnd, periodStartMillis: trialEnd,
    periodEndMillis: cycleEnd(1), revision: 2, status: "sent", ...figures,
    terms: {platformRevision: 1, organizerRevision: 0, ownTerms: false},
    invoiceNumber: "2026-27/031", dueAtMillis: null, paymentLink: null,
    sentAtMillis: cycleEnd(1) + dayMillis, reminders: [], paidAtMillis: null,
    paidMinor: null, paidVia: null, writtenOffAtMillis: null, history: [],
    generatedAtMillis: cycleEnd(1), updatedAtMillis: cycleEnd(1), ...extra};
}

function billable(amountMinor: number, refundedMinor: number):
  BillablePayment {
  return {purpose: "eventAdmission", moneyFlow: "hostCollected", amountMinor,
    refundedMinor, capturedAtMillis: trialEnd + dayMillis, eventId: "ev1",
    providerFeeMinor: 0, providerTaxMinor: 0, snapshot: null};
}

test("a capped cycle owes credit only once refunds bring it under its cap",
  () => {
    // ₹3,00,000 sold: 5% is ₹15,000, capped at ₹10,000.
    const original = computeBill({payments: [billable(30_000_000, 0)], terms,
      trialEndsAtMillis: trialEnd, gstRegistered: false,
      gstRateBasisPoints: 0});
    assert.equal(original.commission.amountMinor, 1_000_000);
    const bill = sentBill({...original});
    const now = cycleEnd(2);
    // ₹60,000 refunded: 5% of ₹2,40,000 is ₹12,000, still over the cap.
    assert.deepEqual(refundCreditOwed(bill, [billable(30_000_000, 6_000_000)],
      terms, now), {refundedMinor: 6_000_000, creditMinor: 0});
    // ₹1,40,000 refunded: 5% of ₹1,60,000 is ₹8,000, ₹2,000 under the cap.
    assert.deepEqual(refundCreditOwed(bill,
      [billable(30_000_000, 14_000_000)], terms, now),
    {refundedMinor: 14_000_000, creditMinor: 200_000});
    // A tools-only, written-off, unsent or too old bill owes nothing.
    const refunded = [billable(30_000_000, 14_000_000)];
    for (const other of [
      {plan: {kind: "toolsOnly" as const, toolsOnlyFeeMinor: 500_000}},
      {status: "writtenOff" as const}, {status: "toSend" as const},
      {periodKind: "calendarMonth" as const}]) {
      assert.equal(refundCreditOwed({...bill, ...other}, refunded, terms, now)
        .creditMinor, 0);
    }
    assert.equal(refundCreditOwed(bill, refunded, terms,
      cycleEnd(1) + 241 * dayMillis).creditMinor, 0);
  });

test("a refund after a bill is sent is credited on the next bill, by hand " +
  "calculation", async () => {
  const [p1, d1] = payment(cycleEnd(0) + dayMillis, 100_000);
  const [p2, d2] = payment(cycleEnd(0) + 10 * dayMillis, 50_000, 10_000);
  const db = seed([p1, d1], [p2, d2],
    payment(cycleEnd(1) + dayMillis, 100_000));
  assert.equal(await generateCycleBills(deps(db, cycleEnd(1) + dayMillis),
    null), 1);
  // ₹1,000 and ₹500 with ₹100 refunded: base ₹1,400, 5% = ₹70.
  assert.equal(bill(db, 1)?.totalMinor, 7_000);
  assert.equal(bill(db, 1)?.refundCredit, null);
  send(db, 1, 31);
  // After it was sent, ₹500 of the ₹1,000 sale is refunded: base ₹900,
  // commission ₹45, so ₹25 is owed back.
  refund(db, p1, 50_000);
  assert.equal(await generateCycleBills(deps(db, cycleEnd(2) + dayMillis),
    null), 1);
  const second = bill(db, 2);
  assert.ok(second);
  // Cycle 2 sold ₹1,000: ₹50 commission, less the ₹25 credit.
  assert.equal(second.commission.amountMinor, 5_000);
  assert.deepEqual(second.refundCredit, {availableMinor: 2_500,
    appliedMinor: 2_500, carriedForwardMinor: 0, lines: [{
      billId: bill(db, 1)?.billId, cycleNumber: 1,
      invoiceNumber: "2026-27/031", refundedMinor: 50_000,
      creditMinor: 2_500, appliedMinor: 2_500}]});
  assert.equal(second.totalMinor, 2_500);
  assert.equal(second.status, "toSend");
  // The sent bill keeps its figures.
  assert.equal(bill(db, 1)?.totalMinor, 7_000);
  // Recomputing the unsent bill gives the same credit, not twice.
  assert.equal(await regenerateToSendCycleBills(deps(db,
    cycleEnd(2) + 2 * dayMillis), "operator"), 1);
  assert.equal(bill(db, 2)?.refundCredit?.appliedMinor, 2_500);
  assert.equal(bill(db, 2)?.totalMinor, 2_500);
  // Once the second bill is sent, the third owes nothing more for cycle 1.
  send(db, 2, 32);
  db.setDoc(...payment(cycleEnd(2) + dayMillis, 100_000));
  await generateCycleBills(deps(db, cycleEnd(3) + dayMillis), null);
  assert.equal(bill(db, 3)?.refundCredit, null);
  assert.equal(bill(db, 3)?.totalMinor, 5_000);
});

test("credit larger than the next bill makes it free and carries the rest",
  async () => {
    const [p1, d1] = payment(cycleEnd(0) + dayMillis, 1_000_000);
    const db = seed([p1, d1], payment(cycleEnd(1) + dayMillis, 100_000),
      payment(cycleEnd(2) + dayMillis, 400_000));
    await generateCycleBills(deps(db, cycleEnd(1) + dayMillis), null);
    // ₹10,000 sold: ₹500.
    assert.equal(bill(db, 1)?.totalMinor, 50_000);
    send(db, 1, 31, "paid");
    // All of it refunded after payment: ₹500 owed back.
    refund(db, p1, 1_000_000);
    await generateCycleBills(deps(db, cycleEnd(2) + dayMillis), null);
    const second = bill(db, 2);
    // Cycle 2's ₹50 is covered; ₹450 carries forward.
    assert.equal(second?.status, "free");
    assert.equal(second?.totalMinor, 0);
    assert.deepEqual([second?.refundCredit?.availableMinor,
      second?.refundCredit?.appliedMinor,
      second?.refundCredit?.carriedForwardMinor], [50_000, 5_000, 45_000]);
    assert.equal(ownBillView(second!)?.refundCredit?.carriedForwardMinor,
      45_000);
    await generateCycleBills(deps(db, cycleEnd(3) + dayMillis), null);
    const third = bill(db, 3);
    // Cycle 3's ₹200 takes ₹200 of the ₹450 left; ₹250 still carries.
    assert.deepEqual([third?.refundCredit?.availableMinor,
      third?.refundCredit?.appliedMinor,
      third?.refundCredit?.carriedForwardMinor], [45_000, 20_000, 25_000]);
    assert.equal(third?.totalMinor, 0);
  });

test("a refund before a bill is sent is in the bill itself, not a credit; " +
  "a written-off bill owes no credit", async () => {
  const [p1, d1] = payment(cycleEnd(0) + dayMillis, 100_000);
  const db = seed([p1, d1], payment(cycleEnd(1) + dayMillis, 100_000));
  await generateCycleBills(deps(db, cycleEnd(1) + dayMillis), null);
  refund(db, p1, 50_000);
  await regenerateToSendCycleBills(deps(db, cycleEnd(1) + 2 * dayMillis),
    "operator");
  assert.equal(bill(db, 1)?.totalMinor, 2_500);
  send(db, 1, 31, "writtenOff");
  refund(db, p1, 100_000);
  await generateCycleBills(deps(db, cycleEnd(2) + dayMillis), null);
  assert.equal(bill(db, 2)?.refundCredit, null);
  assert.equal(bill(db, 2)?.totalMinor, 5_000);
});

test("the bill email and invoice line say when a credit came off", () => {
  const withCredit = sentBill({refundCredit: {availableMinor: 5_000,
    appliedMinor: 2_500, carriedForwardMinor: 2_500, lines: []}});
  assert.deepEqual(refundCreditLines(withCredit), [
    "Less a refund credit of ₹25 for refunds made after earlier bills were " +
      "sent",
    "A further refund credit of ₹25 goes to your next bill"]);
  assert.deepEqual(refundCreditLines(sentBill({})), []);
  assert.equal(invoiceLineName(withCredit),
    "Catch ticketing commission, billing cycle 1, less refund credit");
  assert.equal(invoiceLineName(sentBill({})),
    "Catch ticketing commission, billing cycle 1");
});
