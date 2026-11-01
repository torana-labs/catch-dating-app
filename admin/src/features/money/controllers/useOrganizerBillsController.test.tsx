import {renderHook, waitFor} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import {createQueryHarness} from "../../../shared/test/queryHarness";
import {sampleManageOrganizerBills} from "../api/moneySamples";
import {
  organizerMonthBreakdown,
  organizerMoneySummary,
  useOrganizerBillsController,
} from "./useOrganizerBillsController";

const bills = sampleManageOrganizerBills({action: "list", month: "2026-10", organizerId: null,
  billId: null, expectedRevision: null, note: null}).bills;

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
    expect(summary.salesMinor).toBe(bills.reduce((sum, bill) => sum + bill.sales.baseMinor, 0));
  });

  it("keeps what is left after the provider's fee and Catch's bill", () => {
    const bill = bills[0]!;
    const month = organizerMonthBreakdown(bill);
    expect(month.keptMinor).toBe(bill.sales.baseMinor - bill.sales.providerFeeMinor - bill.totalMinor);
  });
});
