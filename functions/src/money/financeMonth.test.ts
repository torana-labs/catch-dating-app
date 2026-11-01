import assert from "node:assert/strict";
import test from "node:test";
import type {OrganizerBillDocument} from
  "../shared/generated/firestoreAdminTypes";
import {buildFinanceMonth} from "./financeMonth";
import {monthWindow} from "./billComputation";

function bill(id: string, month: string, gross: number, total: number,
  status: OrganizerBillDocument["status"], capped = false):
  OrganizerBillDocument {
  const window = monthWindow(month);
  return {schemaVersion: 1, billId: `${id}_${month}`, organizerId: id,
    organizerName: id, month, periodStartMillis: window.startMillis,
    periodEndMillis: window.endMillis, revision: 1, status,
    sales: {paymentCount: 3, eventCount: 2, grossMinor: gross,
      refundedMinor: 1_000, baseMinor: gross - 1_000, providerFeeMinor: 500,
      providerTaxMinor: 90, unsnapshottedCount: 0},
    commission: {rateBasisPoints: 500,
      uncappedMinor: capped ? total * 2 : total, capMinor: 1_000_000, capped,
      trialWaivedMinor: status === "free" ? 4_000 : 0, amountMinor: total},
    trialEndsAtMillis: null,
    terms: {platformRevision: 1, organizerRevision: 0, ownTerms: false},
    gst: {registered: false, rateBasisPoints: 0, amountMinor: 0},
    totalMinor: total, invoiceNumber: null, dueAtMillis: null,
    paymentLink: null, sentAtMillis: null, reminders: [], paidAtMillis: null,
    paidMinor: status === "paid" ? total : null, paidVia: null,
    writtenOffAtMillis: null, history: [], generatedAtMillis: 1,
    updatedAtMillis: 1};
}

test("a month of Finance, line by line", () => {
  const result = buildFinanceMonth({month: "2026-10",
    nowMillis: monthWindow("2026-11").startMillis + 1,
    billsByMonth: new Map([["2026-10", [
      bill("a", "2026-10", 200_000, 10_000, "paid", true),
      bill("b", "2026-10", 100_000, 5_000, "sent"),
      bill("c", "2026-10", 80_000, 0, "free")]],
    ["2026-09", [bill("a", "2026-09", 50_000, 2_500, "paid")]]]),
    seriesMonths: ["2026-09", "2026-10", "2026-11"],
    costs: {month: "2026-10", costs: [{schemaVersion: 1,
      costId: "2026-10_ai", month: "2026-10", category: "ai",
      amountMinor: 7_900, source: "manual", note: "Claude", updatedAtMillis: 1,
      updatedByUid: "o"}], whatsapp: {estimateMinor: 1_480,
      messageCount: 38, usesEstimate: true}, totalMinor: 9_380,
    adSpend: {metaConnected: false, googleConnected: false}},
    creditsPaid: [], gstRegistered: false});
  assert.deepEqual(result.sales, {grossMinor: 380_000, refundedMinor: 3_000,
    netMinor: 377_000, events: 6, organizers: 3, payments: 9});
  assert.equal(result.earned.billedMinor, 15_000);
  assert.equal(result.earned.capsAndTermsMinor, 10_000);
  assert.equal(result.earned.cappedOrganizers, 1);
  assert.equal(result.earned.freeOrganizers, 1);
  assert.equal(result.earned.paidMinor, 10_000);
  assert.deepEqual(result.costs.lines.map((line) => [line.category,
    line.source]), [["ai", "manual"], ["whatsapp", "estimate"]]);
  assert.equal(result.leftOverMinor, 15_000 - 9_380);
  assert.equal(result.notCatch.providerFeeMinor, 1_500);
  assert.deepEqual(result.series.map((row) => [row.month, row.earnedMinor,
    row.partial]), [["2026-09", 2_500, false], ["2026-10", 15_000, false],
    ["2026-11", 0, true]]);
});
