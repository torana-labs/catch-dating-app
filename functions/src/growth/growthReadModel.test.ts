import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import type {
  NominatorCreditDocument,
  OrganizerBillDocument,
  OrganizerGrowthFactsDocument,
} from "../shared/generated/firestoreAdminTypes";
import {monthWindow} from "../money/billComputation";
import {buildGrowth, median, rangeStart} from "./growthReadModel";

const day = 86_400_000;
const now = monthWindow("2026-11").startMillis + 5 * day;
const at = (ms: number | null) => ms === null ? null : Timestamp.fromMillis(ms);
const sep = monthWindow("2026-09").startMillis;

function facts(id: string, channel: OrganizerGrowthFactsDocument["channel"],
  steps: {listed: number; claimed?: number; event?: number},
  nominator: OrganizerGrowthFactsDocument["nominator"] = null):
  OrganizerGrowthFactsDocument {
  return {schemaVersion: 1, organizerId: id, marketId: "mumbai", channel,
    channelSource: {kind: "supply_intake", requestId: null, originKind: null,
      campaign: null}, nominator,
    milestones: {listedAt: at(steps.listed),
      claimRequestedAt: null, claimedAt: at(steps.claimed ?? null),
      firstEventAt: at(steps.event ?? null), firstPaidBookingAt: null},
    firstEventId: null, createdAt: Timestamp.fromMillis(steps.listed),
    updatedAt: Timestamp.fromMillis(steps.listed)};
}

function bill(organizerId: string, month: string, salesMinor: number,
  status: OrganizerBillDocument["status"]): OrganizerBillDocument {
  const window = monthWindow(month);
  const total = status === "free" ? 0 : Math.floor(salesMinor / 20);
  return {schemaVersion: 1, billId: `${organizerId}_${month}`, organizerId,
    organizerName: organizerId.toUpperCase(), month,
    periodStartMillis: window.startMillis, periodEndMillis: window.endMillis,
    revision: 1, status,
    sales: {paymentCount: 1, eventCount: 2, grossMinor: salesMinor,
      refundedMinor: 0, baseMinor: salesMinor, providerFeeMinor: 0,
      providerTaxMinor: 0, unsnapshottedCount: 0},
    commission: {rateBasisPoints: 500, uncappedMinor: total,
      capMinor: 1_000_000, capped: false,
      trialWaivedMinor: status === "free" ? salesMinor / 20 : 0,
      amountMinor: total},
    trialEndsAtMillis: null,
    terms: {platformRevision: 1, organizerRevision: 0, ownTerms: false},
    gst: {registered: false, rateBasisPoints: 0, amountMinor: 0},
    totalMinor: total, invoiceNumber: null, dueAtMillis: null,
    paymentLink: null, sentAtMillis: null, reminders: [],
    paidAtMillis: status === "paid" ? window.endMillis : null,
    paidMinor: status === "paid" ? total : null,
    paidVia: status === "paid" ? "manual" : null, writtenOffAtMillis: null,
    history: [], generatedAtMillis: 1, updatedAtMillis: 1};
}

const neha = {uid: "neha", role: "partner" as const,
  nominatedAt: Timestamp.fromMillis(sep)};
const input = {
  range: "12m" as const, nowMillis: now,
  facts: [
    facts("afterfly", "partner", {listed: sep + day, claimed: sep + 5 * day,
      event: sep + 20 * day}, neha),
    facts("harbor", "imported", {listed: sep + 2 * day}),
    facts("lantern", "sales_associate", {listed: monthWindow("2026-10")
      .startMillis, claimed: monthWindow("2026-10").startMillis + 9 * day},
    {uid: "riya", role: "associate", nominatedAt: Timestamp.fromMillis(sep)}),
  ],
  bills: [bill("afterfly", "2026-09", 100_000, "free"),
    bill("afterfly", "2026-10", 200_000, "paid")],
  credits: [{creditId: "afterfly_2026-10", billId: "afterfly_2026-10",
    organizerId: "afterfly", nominatorUid: "neha", nominatorRole: "partner",
    creditMinor: 1_000, status: "owed", monthIndex: 1} as
      NominatorCreditDocument],
  costs: [],
  organizerNames: new Map([["lantern", "Lantern Lane Social"]]),
  personNames: new Map([["neha", "Neha Kulkarni"], ["riya", "Riya Sharma"]]),
};

test("medians and ranges", () => {
  assert.equal(median([]), null);
  assert.equal(median([1, 9, 4]), 4);
  assert.equal(median([1, 2]), 1.5);
  assert.equal(rangeStart("all", now), 0);
  assert.equal(rangeStart("12m", now), monthWindow("2025-12").startMillis);
});

test("cohorts count claims and first events from the listing day", () => {
  const growth = buildGrowth(input);
  assert.deepEqual(growth.summary, {listed: 3, claimed: 2,
    claimMedianDays: 6.5, ranEvent: 1, ranEventMedianDays: 19, paying: 1,
    sinceMonth: "2026-09"});
  assert.deepEqual(growth.cohorts.map((row) => [row.month, row.listed,
    row.claimed, row.ranEvent, row.tooEarly]), [
    ["2026-09", 2, 1, 1, false], ["2026-10", 1, 1, 0, true]]);
  assert.deepEqual(growth.claimDays.map((row) => row.count), [0, 1, 1, 0, 0]);
  assert.deepEqual(growth.salesByMonthOnCatch, [{month: "2026-09",
    organizers: 1, salesPerOrganizerMinor: [100_000, 200_000, null, null,
      null, null]}]);
});

test("channels, nominators and best organizers", () => {
  const growth = buildGrowth(input);
  const partner = growth.channels.find((row) => row.channel === "partner");
  assert.deepEqual(partner, {channel: "partner", listed: 1, claimed: 1,
    paying: 1, earnedMinor: 10_000, costMinor: 1_000, costKind: "credit",
    detail: "1 community partners"});
  assert.equal(growth.channels.find((row) =>
    row.channel === "sales_associate")?.detail, "Riya Sharma");
  const [first] = growth.nominators;
  assert.equal(first.name, "Neha Kulkarni");
  assert.equal(first.creditOwedMinor, 1_000);
  assert.equal(first.organizers[0].latestBill?.creditMinor, 1_000);
  assert.equal(growth.nominators[1].organizers[0].name,
    "Lantern Lane Social");
  assert.deepEqual(growth.best.map((row) => [row.organizerId, row.salesMinor,
    row.earnedMinor, row.payingSinceMonth, row.inTrial]),
  [["afterfly", 300_000, 10_000, "2026-10", false]]);
});
