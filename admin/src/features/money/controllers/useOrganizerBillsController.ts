import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {
  actOnOrganizerBills,
  loadOrganizerBills,
  type Bill,
  type BillsMonth,
  type OrganizerBillsAction,
} from "../api/moneyRepository";

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
  /** What the organizer pays Catch for the month; nothing once written off. */
  billMinor: number;
  writtenOff: boolean;
  keptMinor: number;
}

export interface OrganizerBillsController {
  /** Newest month first. */
  bills: Bill[];
  summary: OrganizerMoneySummary;
  latest: OrganizerMonthBreakdown | null;
  /** The organizer's free trial, computed by the server. */
  trial: BillsMonth["trial"];
  /** The organizer's Catch plan: ticketing or tools-only. */
  billingPlan: BillsMonth["billingPlan"];
  /** How its cycle bills go out: staff review, automatic, or held. */
  billReview: BillsMonth["billReview"];
  loadState: "loading" | "error" | "ready";
  loadError: string | null;
  isActing: boolean;
  actionError: string | null;
  /** Holds or releases automatic sending for every bill of the organizer. */
  setHold: (action: OrganizerBillsAction, note: string | null) => Promise<boolean>;
}

/** Ticket sales after refunds. Commission may be charged on another base. */
export function organizerSalesMinor(bill: Bill): number {
  return bill.sales.grossMinor - bill.sales.refundedMinor;
}

function organizerBillMinor(bill: Bill): number {
  switch (bill.status) {
  case "paid": return bill.paidMinor ?? bill.totalMinor;
  case "writtenOff":
  case "free": return 0;
  default: return bill.totalMinor;
  }
}

export function organizerMoneySummary(bills: readonly Bill[]): OrganizerMoneySummary {
  return bills.reduce<OrganizerMoneySummary>((total, bill) => ({
    salesMinor: total.salesMinor + organizerSalesMinor(bill),
    paymentCount: total.paymentCount + bill.sales.paymentCount,
    earnedMinor: total.earnedMinor + (bill.status === "paid" ? bill.totalMinor : 0),
  }), {salesMinor: 0, paymentCount: 0, earnedMinor: 0});
}

/**
 * The same figures the organizer reads in the host app. The provider's fee already includes its
 * tax. test/contexts/payments/fixtures/organizer_kept_months.json holds the two to one answer.
 */
export function organizerMonthBreakdown(bill: Bill): OrganizerMonthBreakdown {
  const salesMinor = organizerSalesMinor(bill);
  const billMinor = organizerBillMinor(bill);
  return {
    month: bill.month,
    salesMinor,
    refundedMinor: bill.sales.refundedMinor,
    providerFeeMinor: bill.sales.providerFeeMinor,
    billMinor,
    writtenOff: bill.status === "writtenOff",
    keptMinor: salesMinor - bill.sales.providerFeeMinor - billMinor,
  };
}

/** One organizer's bills for the Money tab of its page. */
export function useOrganizerBillsController(organizerId: string): OrganizerBillsController {
  const client = useQueryClient();
  const key = ["admin", "money", "organizer-bills", organizerId] as const;
  const query = useQuery({
    queryKey: key,
    queryFn: () => loadOrganizerBills(organizerId),
    retry: false,
  });
  const hold = useMutation({
    mutationFn: (input: {action: OrganizerBillsAction; note: string | null}) =>
      actOnOrganizerBills(organizerId, input.action, input.note),
    onSuccess: (data) => client.setQueryData(key, data),
  });
  const bills = query.data?.bills ?? [];
  return {
    bills,
    summary: organizerMoneySummary(bills),
    latest: bills[0] ? organizerMonthBreakdown(bills[0]) : null,
    trial: query.data?.trial ?? null,
    billingPlan: query.data?.billingPlan ?? null,
    billReview: query.data?.billReview ?? null,
    loadState: query.isError ? "error" : query.data ? "ready" : "loading",
    loadError: query.error instanceof Error ? query.error.message : null,
    isActing: hold.isPending,
    actionError: hold.error instanceof Error ? hold.error.message : null,
    setHold: async (action, note) => {
      try {
        await hold.mutateAsync({action, note});
        return true;
      } catch {
        return false;
      }
    },
  };
}
