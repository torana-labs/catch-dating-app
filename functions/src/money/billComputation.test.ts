import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import type {CommercialTerms} from "../commercialTerms/terms";
import type {
  OrganizerBillDocument,
  OrganizerGrowthFactsDocument,
} from "../shared/generated/firestoreAdminTypes";
import {
  billPaidBeforeGst,
  computeBill,
  defaultMoneySettings,
  dueAtMillis,
  financialYearOf,
  invoiceNumber,
  monthOf,
  monthWindow,
  monthsBetween,
  previousMonth,
  type BillablePayment,
} from "./billComputation";
import {checkoutBillable, membershipBillable} from "./billSources";
import {billLinkReference} from "./billPaymentLinks";
import {creditForPaidBill, nominatorTotals} from "./nominatorCredits";

const terms: CommercialTerms = {
  currency: "INR",
  commission: {rateBasisPoints: 500, capMinor: 1_000_000, cycleDays: 30,
    cycleAnchor: "trialEnd", base: "netOfRefunds", taxTreatment: "exclusive"},
  trial: {days: 30, anchor: "firstEvent"},
  toolsOnly: {feeMinor: 500_000},
  gatewayFeeBearer: "host",
  purposes: {
    eventAdmission: {countsTowardCommission: true, atSourceFeeBasisPoints: 0},
    formFee: {countsTowardCommission: false, atSourceFeeBasisPoints: 0},
    hostMembership: {countsTowardCommission: true, atSourceFeeBasisPoints: 0},
  },
};
const october = monthWindow("2026-10");
const payment = (overrides: Partial<BillablePayment> = {}):
  BillablePayment => ({
  purpose: "eventAdmission", moneyFlow: "hostCollected", amountMinor: 100_000,
  refundedMinor: 0, capturedAtMillis: october.startMillis + 1_000,
  eventId: "ev1", providerFeeMinor: 2_360, providerTaxMinor: 360,
  snapshot: null, ...overrides});
const bill = (payments: BillablePayment[], extra: Partial<Parameters<
  typeof computeBill>[0]> = {}) => computeBill({payments, terms,
  trialEndsAtMillis: null, gstRegistered: false, gstRateBasisPoints: 1800,
  ...extra});

test("months and financial years run on India time", () => {
  // 1 Oct 2026 00:00 IST is 30 Sep 18:30 UTC.
  assert.equal(new Date(october.startMillis).toISOString(),
    "2026-09-30T18:30:00.000Z");
  assert.equal(monthOf(october.startMillis), "2026-10");
  assert.equal(monthOf(october.startMillis - 1), "2026-09");
  assert.equal(previousMonth("2026-01"), "2025-12");
  assert.equal(monthsBetween("2026-10", "2027-09"), 11);
  assert.equal(financialYearOf(Date.UTC(2026, 2, 31, 12)), "2025-26");
  assert.equal(financialYearOf(Date.UTC(2026, 3, 1, 12)), "2026-27");
  assert.equal(financialYearOf(Date.UTC(2099, 11, 1)), "2099-00");
  assert.equal(invoiceNumber("2026-27", 31), "2026-27/031");
  assert.equal(invoiceNumber("2026-27", 1204), "2026-27/1204");
  assert.equal(new Date(dueAtMillis("2026-10", 15)).toISOString(),
    "2026-11-15T18:29:59.999Z");
  assert.throws(() => monthWindow("2026-13"));
});

test("commission is 5% of ticket sales net of refunds, no GST", () => {
  const figures = bill([payment(), payment({refundedMinor: 20_000,
    eventId: "ev2"})]);
  assert.deepEqual(figures.sales, {paymentCount: 2, eventCount: 2,
    grossMinor: 200_000, refundedMinor: 20_000, baseMinor: 180_000,
    providerFeeMinor: 4_720, providerTaxMinor: 720, unsnapshottedCount: 2});
  assert.equal(figures.commission.amountMinor, 9_000);
  assert.equal(figures.gst.amountMinor, 0);
  assert.equal(figures.totalMinor, 9_000);
});

test("the monthly cap, the free trial and own terms all apply", () => {
  const big = bill([payment({amountMinor: 30_000_000})]);
  assert.equal(big.commission.uncappedMinor, 1_500_000);
  assert.equal(big.commission.amountMinor, 1_000_000);
  assert.equal(big.commission.capped, true);
  const trial = bill([payment(), payment({capturedAtMillis:
    october.startMillis + 10 * 86_400_000})],
  {trialEndsAtMillis: october.startMillis + 5 * 86_400_000});
  assert.equal(trial.commission.trialWaivedMinor, 5_000);
  assert.equal(trial.commission.amountMinor, 5_000);
  // A payment that froze 4% pilot terms keeps them.
  const pilot = bill([payment({snapshot: {version: 1,
    purpose: "eventAdmission", organizerId: "org", platformRevision: 1,
    organizerRevision: 1, moneyFlow: "hostCollected", merchantOfRecord: "host",
    currency: "INR", commission: {...terms.commission, rateBasisPoints: 400},
    trial: terms.trial, toolsOnly: terms.toolsOnly, gatewayFeeBearer: "host",
    purposeTerms: terms.purposes.eventAdmission, resolvedAtMillis: 1}})]);
  assert.equal(pilot.commission.amountMinor, 4_000);
  assert.equal(pilot.sales.unsnapshottedCount, 0);
});

test("platform-split payments, uncounted purposes and GST", () => {
  const figures = bill([payment({moneyFlow: "platformSplit"}),
    payment({purpose: "formFee"}), payment({purpose: "hostMembership"})]);
  assert.equal(figures.sales.paymentCount, 2);
  assert.equal(figures.commission.amountMinor, 5_000);
  const gst = bill([payment()], {gstRegistered: true});
  assert.equal(gst.gst.amountMinor, 900);
  assert.equal(gst.totalMinor, 5_900);
  const inclusive = computeBill({payments: [payment()], terms: {...terms,
    commission: {...terms.commission, taxTreatment: "inclusive"}},
  trialEndsAtMillis: null, gstRegistered: true, gstRateBasisPoints: 1800});
  assert.equal(inclusive.totalMinor, 5_000);
  assert.equal(inclusive.gst.amountMinor, 763);
});

test("payment records map into billable payments", () => {
  const captured = Timestamp.fromMillis(october.startMillis + 5);
  const mapped = checkoutBillable({organizerId: "org", capturedAt: captured,
    amountPaise: 150_000, refundedAmountPaise: 0, eventId: "ev",
    providerFees: {feePaise: 3_540, taxPaise: 540},
    routing: {selection: {route: "razorpayOAuth"}}}, "eventAdmission");
  assert.equal(mapped?.organizerId, "org");
  assert.equal(mapped?.payment.moneyFlow, "hostCollected");
  assert.equal(mapped?.payment.providerFeeMinor, 3_540);
  assert.equal(checkoutBillable({organizerId: "org", capturedAt: null},
    "eventAdmission"), null);
  assert.equal(checkoutBillable({organizerId: "org", capturedAt: captured,
    connectionId: "conn"}, "formFee")?.payment.moneyFlow, "hostCollected");
  assert.equal(membershipBillable({organizerId: "org", createdAtMillis: 5,
    amountPaise: 50_000, moneyFlow: "platformSplit"})?.payment.moneyFlow,
  "platformSplit");
});

const paidBill = (overrides: Partial<OrganizerBillDocument> = {}):
  OrganizerBillDocument => ({schemaVersion: 1, billId: "org_2026-10",
  organizerId: "org", organizerName: "Afterfly", month: "2026-10",
  periodStartMillis: october.startMillis, periodEndMillis: october.endMillis,
  revision: 3, status: "paid", ...bill([payment({amountMinor: 200_000})]),
  terms: {platformRevision: 1, organizerRevision: 0, ownTerms: false},
  invoiceNumber: "2026-27/001", dueAtMillis: 1, paymentLink: null,
  sentAtMillis: 1, reminders: [], paidAtMillis: 2, paidMinor: 10_000,
  paidVia: "manual", writtenOffAtMillis: null, history: [],
  generatedAtMillis: 1, updatedAtMillis: 2, ...overrides});
const day = 86_400_000;
const facts = (role: "partner" | "associate", claimedAfterDays: number):
  OrganizerGrowthFactsDocument => ({schemaVersion: 1, organizerId: "org",
  marketId: "mumbai", channel: role === "partner" ? "partner" :
    "sales_associate",
  channelSource: {kind: "supply_intake", requestId: "r", originKind: null,
    campaign: null},
  nominator: {uid: "neha", role, nominatedAt: Timestamp.fromMillis(day)},
  milestones: {listedAt: null, claimRequestedAt: null,
    claimedAt: Timestamp.fromMillis(day + claimedAfterDays * day),
    firstEventAt: null, firstPaidBookingAt: null},
  firstEventId: null, createdAt: Timestamp.fromMillis(1),
  updatedAt: Timestamp.fromMillis(1)});

test("a paid bill credits its first nominator 10% before GST", () => {
  const rule = defaultMoneySettings.nominatorCredit;
  const credit = creditForPaidBill({bill: paidBill(), facts: facts("partner",
    10), firstPaidMonth: "2026-10", rule, nowMillis: 9});
  assert.equal(credit?.creditMinor, 1_000);
  assert.equal(credit?.monthIndex, 1);
  assert.equal(credit?.status, "owed");
  const gst = paidBill({...bill([payment({amountMinor: 200_000})],
    {gstRegistered: true}), paidMinor: 11_800});
  assert.equal(billPaidBeforeGst(gst), 10_000);
  // Sales associates, late claims and month 13 earn nothing.
  assert.equal(creditForPaidBill({bill: paidBill(), facts: facts("associate",
    10), firstPaidMonth: "2026-10", rule, nowMillis: 9}), null);
  assert.equal(creditForPaidBill({bill: paidBill(), facts: facts("partner",
    91), firstPaidMonth: "2026-10", rule, nowMillis: 9}), null);
  assert.equal(creditForPaidBill({bill: paidBill(), facts: facts("partner",
    10), firstPaidMonth: "2025-10", rule, nowMillis: 9}), null);
  assert.equal(creditForPaidBill({bill: paidBill(), facts: undefined,
    firstPaidMonth: "2026-10", rule, nowMillis: 9}), null);
});

test("credit under the minimum rolls over; totals per nominator", () => {
  const base = creditForPaidBill({bill: paidBill(), facts: facts("partner",
    1), firstPaidMonth: "2026-10",
  rule: defaultMoneySettings.nominatorCredit, nowMillis: 9})!;
  const totals = nominatorTotals([base, {...base, creditId: "x",
    organizerId: "other", creditMinor: 60_000, status: "approved"}], 50_000);
  assert.deepEqual(totals, [{nominatorUid: "neha", nominatorRole: "partner",
    owedMinor: 1_000, approvedMinor: 60_000, paidMinor: 0, payable: false,
    organizerCount: 2}]);
});

test("payment link references stay within 40 characters per project", () => {
  const dev = billLinkReference("2026-27/031", "catchdates-dev");
  assert.match(dev, /^2026-27\/031-[a-f0-9]{6}$/u);
  assert.notEqual(dev, billLinkReference("2026-27/031", "catchdates-staging"));
  assert.ok(billLinkReference("2026-27/123456789012345678901234567890",
    "p").length <= 40);
});
