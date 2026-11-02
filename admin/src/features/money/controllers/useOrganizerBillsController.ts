import {useQuery} from "@tanstack/react-query";
import {loadOrganizerBills, type Bill} from "../api/moneyRepository";

export interface OrganizerMoneySummary {
  /** Ticket sales after refunds, every bill together. */
  salesMinor: number;
  paymentCount: number;
  /** What the organizer has paid Catch. */
  earnedMinor: number;
}

/** One month as the organizer lived it: sales, what was taken, what they kept. */
export interface OrganizerMonthBreakdown {
  month: string;
  salesMinor: number;
  refundedMinor: number;
  providerFeeMinor: number;
  billMinor: number;
  keptMinor: number;
}

export interface OrganizerBillsController {
  /** Newest month first. */
  bills: Bill[];
  summary: OrganizerMoneySummary;
  latest: OrganizerMonthBreakdown | null;
  loadState: "loading" | "error" | "ready";
  loadError: string | null;
}

export function organizerMoneySummary(bills: readonly Bill[]): OrganizerMoneySummary {
  return bills.reduce<OrganizerMoneySummary>((total, bill) => ({
    salesMinor: total.salesMinor + bill.sales.baseMinor,
    paymentCount: total.paymentCount + bill.sales.paymentCount,
    earnedMinor: total.earnedMinor + (bill.status === "paid" ? bill.totalMinor : 0),
  }), {salesMinor: 0, paymentCount: 0, earnedMinor: 0});
}

/** The provider's fee already includes its tax. A written-off bill still shows what was billed. */
export function organizerMonthBreakdown(bill: Bill): OrganizerMonthBreakdown {
  return {
    month: bill.month,
    salesMinor: bill.sales.baseMinor,
    refundedMinor: bill.sales.refundedMinor,
    providerFeeMinor: bill.sales.providerFeeMinor,
    billMinor: bill.totalMinor,
    keptMinor: bill.sales.baseMinor - bill.sales.providerFeeMinor - bill.totalMinor,
  };
}

/** One organizer's bills for the Money tab of its page. */
export function useOrganizerBillsController(organizerId: string): OrganizerBillsController {
  const query = useQuery({
    queryKey: ["admin", "money", "organizer-bills", organizerId] as const,
    queryFn: () => loadOrganizerBills(organizerId),
    retry: false,
  });
  const bills = query.data?.bills ?? [];
  return {
    bills,
    summary: organizerMoneySummary(bills),
    latest: bills[0] ? organizerMonthBreakdown(bills[0]) : null,
    loadState: query.isError ? "error" : query.data ? "ready" : "loading",
    loadError: query.error instanceof Error ? query.error.message : null,
  };
}
