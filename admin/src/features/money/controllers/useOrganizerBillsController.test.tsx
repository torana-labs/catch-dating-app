import {readFileSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {renderHook, waitFor} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import {createQueryHarness} from "../../../shared/test/queryHarness";
import type {Bill} from "../api/moneyRepository";
import {sampleManageOrganizerBills} from "../api/moneySamples";
import {
  organizerMonthBreakdown,
  organizerMoneySummary,
  useOrganizerBillsController,
} from "./useOrganizerBillsController";

const bills = sampleManageOrganizerBills({action: "list", month: "2026-10", organizerId: null,
  billId: null, expectedRevision: null, note: null}).bills;

/** The host app's test reads the same file, so the two surfaces can't drift apart on money. */
function sharedMonths() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return JSON.parse(readFileSync(path.join(
    here, "../../../../../test/contexts/payments/fixtures/organizer_kept_months.json",
  ), "utf8")) as {months: {
    name: string;
    bill: Bill;
    expected: {salesMinor: number; billMinor: number; keptMinor: number};
  }[]};
}

describe("useOrganizerBillsController", () => {
  it("reads one organizer's bills through its record id", async () => {
    const {wrapper} = createQueryHarness();
    const {result} = renderHook(() => useOrganizerBillsController("mumbai-padel-social"), {wrapper});
    await waitFor(() => expect(result.current.loadState).toBe("ready"));
    expect(result.current.bills.map((bill) => bill.organizerName)).toEqual(["Mumbai Padel Social"]);
    expect(result.current.latest?.month).toBe("2026-10");
  });

  it("has no bills for an organizer Catch has not billed", async () => {
    const {wrapper} = createQueryHarness();
    const {result} = renderHook(() => useOrganizerBillsController("bandra-runners"), {wrapper});
    await waitFor(() => expect(result.current.loadState).toBe("ready"));
    expect(result.current.bills).toEqual([]);
    expect(result.current.latest).toBeNull();
    expect(result.current.summary).toEqual({salesMinor: 0, paymentCount: 0, earnedMinor: 0});
  });
});

describe("organizer money figures", () => {
  it("counts only paid bills as earned", () => {
    const paid = bills.filter((bill) => bill.status === "paid");
    const summary = organizerMoneySummary(bills);
    expect(summary.earnedMinor).toBe(paid.reduce((sum, bill) => sum + bill.totalMinor, 0));
    expect(summary.salesMinor).toBe(bills.reduce((sum, bill) =>
      sum + bill.sales.grossMinor - bill.sales.refundedMinor, 0));
  });

  it("marks a written-off month so its empty bill is not read as no bill", () => {
    const {months} = sharedMonths();
    const writtenOff = months.find((month) => month.bill.status === "writtenOff")!;
    const sent = months.find((month) => month.bill.status === "sent")!;
    expect(organizerMonthBreakdown(writtenOff.bill).writtenOff).toBe(true);
    expect(organizerMonthBreakdown(sent.bill).writtenOff).toBe(false);
  });
});

describe("the figures Admin shares with the host app", () => {
  for (const {name, bill, expected} of sharedMonths().months) {
    it(`gives the same answer for ${name}`, () => {
      const {salesMinor, billMinor, keptMinor} = organizerMonthBreakdown(bill);
      expect({salesMinor, billMinor, keptMinor}).toEqual(expected);
    });
  }
});
