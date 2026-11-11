import {describe, expect, it} from "vitest";
import type {
  ListOrganizerBillsCallableResponse,
  ManageOrganizerBillingPlanCallableResponse,
} from "./contracts";
import {
  billPeriod,
  isOverdue,
  parseBills,
  parsePlanView,
  parseTrial,
  percent,
  planActions,
  rupees,
} from "./hostBillingModel";

const start = Date.parse("2026-11-09T00:00:00+05:30");
const day = 24 * 60 * 60 * 1000;

describe("host billing model", () => {
  it("formats money, rates and cycle periods in India time", () => {
    expect(rupees(1_000_000)).toBe("₹10,000");
    expect(rupees(150_050)).toBe("₹1,500.50");
    expect(percent(500)).toBe("5%");
    const [cycle, month] = parseBills({bills: [
      {billId: "o_c2026-11-09", month: "2026-12", periodKind: "cycle", periodStartMillis: start,
        periodEndMillis: start + 30 * day, plan: "ticketing", status: "sent", sales: {grossMinor: 150_000,
          refundedMinor: 10_000}, commission: {amountMinor: 7_000, capped: false}, gst: {amountMinor: 0},
        totalMinor: 7_000, invoiceNumber: "2026-27/031", dueAtMillis: start + 45 * day,
        paymentUrl: "https://rzp.io/i/abc", paidAtMillis: null},
      {billId: "o_2026-10", month: "2026-10", status: "free", sales: {grossMinor: 0, refundedMinor: 0},
        commission: {amountMinor: 0, capped: false}, gst: {amountMinor: 0}, totalMinor: 0, invoiceNumber: null,
        dueAtMillis: null, paymentUrl: null, paidAtMillis: null},
    ]});
    expect(billPeriod(cycle!)).toBe("9 Nov – 8 Dec 2026");
    expect(billPeriod(month!)).toBe("October 2026");
    expect(cycle!.salesMinor).toBe(140_000);
    expect(month!.periodKind).toBe("calendarMonth");
  });

  it("reads a bill's refund credit, and none from an older server", () => {
    const [credited, older] = parseBills({bills: [
      {billId: "a", month: "2026-12", status: "sent", totalMinor: 2_500,
        refundCredit: {appliedMinor: 2_500, carriedForwardMinor: 500}},
      {billId: "b", month: "2026-12", status: "sent", totalMinor: 5_000},
    ]});
    expect([credited!.refundCreditMinor, credited!.refundCreditCarriedMinor]).toEqual([2_500, 500]);
    expect([older!.refundCreditMinor, older!.refundCreditCarriedMinor]).toEqual([0, 0]);
  });

  it("offers Pay only for an unpaid bill with an https invoice", () => {
    const [paid, sentHttp] = parseBills({bills: [
      {billId: "a_2026-10", month: "2026-10", status: "paid", totalMinor: 10, paymentUrl: "https://x"},
      {billId: "b_2026-10", month: "2026-10", status: "sent", totalMinor: 10, paymentUrl: "http://insecure"},
    ]});
    expect(paid!.paymentUrl).toBeNull();
    expect(sentHttp!.paymentUrl).toBeNull();
    expect(parseBills({bills: [{billId: 1}]})).toEqual([]);
    expect(parseBills(null)).toEqual([]);
  });

  it("knows an overdue bill", () => {
    const [bill] = parseBills({bills: [{billId: "a", month: "2026-10", status: "sent", dueAtMillis: 1000}]});
    expect(isOverdue(bill!, 999)).toBe(false);
    expect(isOverdue(bill!, 1001)).toBe(true);
  });

  it("reads an unknown trial as unconfigured", () => {
    expect(parseTrial({state: "weird"}).state).toBe("unconfigured");
    expect(parseTrial({state: "active", daysLeft: 12, endsAtMillis: start}).daysLeft).toBe(12);
  });

  it("decides the plan actions", () => {
    const prices = {toolsOnlyFeeMinor: 500_000, commissionRateBasisPoints: 500, commissionCapMinor: 1_000_000,
      cycleDays: 30, gstRegistered: false, gstRateBasisPoints: 1800};
    const ticketing = parsePlanView({plan: {plan: "ticketing", status: "none"}, revision: 0, prices});
    expect(planActions(ticketing, start)).toEqual({canBuy: true, canPay: false, canCancel: false});
    const pending = parsePlanView({plan: {plan: "toolsOnly", status: "pendingPayment"}, revision: 1,
      paymentUrl: "https://rzp.io/l/x", amountDueMinor: 500_000, prices});
    expect(planActions(pending, start)).toEqual({canBuy: false, canPay: true, canCancel: true});
    const active = parsePlanView({plan: {plan: "toolsOnly", status: "active", startsAtMillis: start,
      endsAtMillis: null}, revision: 2, prices});
    expect(planActions(active, start)).toEqual({canBuy: false, canPay: false, canCancel: true});
    const ending = parsePlanView({plan: {plan: "toolsOnly", status: "active", startsAtMillis: start,
      endsAtMillis: start + day}, revision: 3, prices});
    expect(planActions(ending, start)).toEqual({canBuy: false, canPay: false, canCancel: false});
    // After a cancelled plan ends, tools-only can be bought again.
    expect(planActions(ending, start + 2 * day).canBuy).toBe(true);
    // Without prices (terms unset) nothing can be bought.
    expect(planActions(parsePlanView({plan: {}, revision: 0, prices: null}), start).canBuy).toBe(false);
  });

  it("parses a reply typed exactly as the generated contracts", () => {
    const reply: ListOrganizerBillsCallableResponse = {bills: [{billId: "o_c2026-11-09", month: "2026-12",
      periodKind: "cycle", periodStartMillis: start, periodEndMillis: start + 30 * day, plan: "toolsOnly",
      status: "sent", sales: {paymentCount: 3, eventCount: 1, grossMinor: 90_000, refundedMinor: 0,
        providerFeeMinor: 1_800}, commission: {amountMinor: 0, capMinor: null, capped: false, trialWaivedMinor: 0},
      gst: {registered: false, amountMinor: 0}, totalMinor: 500_000, invoiceNumber: "2026-27/040",
      dueAtMillis: start + 45 * day, paymentUrl: "https://rzp.io/i/tools", paidAtMillis: null, paidMinor: null}]};
    expect(parseBills(reply)).toEqual([{billId: "o_c2026-11-09", month: "2026-12", periodKind: "cycle",
      periodStartMillis: start, periodEndMillis: start + 30 * day, toolsOnly: true, status: "sent",
      salesMinor: 90_000, commissionMinor: 0, capped: false, gstMinor: 0, totalMinor: 500_000,
      refundCreditMinor: 0, refundCreditCarriedMinor: 0, invoiceNumber: "2026-27/040", dueAtMillis: start + 45 * day, paymentUrl: "https://rzp.io/i/tools",
      paidAtMillis: null}]);
    const plan: ManageOrganizerBillingPlanCallableResponse = {organizerId: "o", revision: 4, paymentUrl: null,
      amountDueMinor: null, prices: null,
      plan: {plan: "toolsOnly", status: "ended", startsAtMillis: start, endsAtMillis: start + day}};
    const {organizerId: _organizerId, ...view} = plan;
    expect(parsePlanView(plan)).toEqual(view);
  });
});
