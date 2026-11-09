/**
 * The host billing portal's data, parsed from the owner callables:
 * getOrganizerBillingStatus (trial and plan), manageOrganizerBillingPlan
 * (prices and the tools-only purchase) and listOrganizerBills (bills). The
 * shapes mirror their contracts in contracts/callable_responses; parsing is
 * defensive so an older server degrades to "unavailable" instead of breaking.
 */
export type TrialState = "notStarted" | "scheduled" | "active" | "ended" | "none" | "unconfigured";

export interface TrialStatus {
  state: TrialState;
  startsAtMillis: number | null;
  endsAtMillis: number | null;
  daysLeft: number | null;
}

export interface PlanStatus {
  plan: "ticketing" | "toolsOnly";
  status: "none" | "pendingPayment" | "active" | "ended";
  startsAtMillis: number | null;
  endsAtMillis: number | null;
}

export interface PlanPrices {
  toolsOnlyFeeMinor: number;
  commissionRateBasisPoints: number;
  commissionCapMinor: number | null;
  cycleDays: number;
  gstRegistered: boolean;
  gstRateBasisPoints: number;
}

export interface PlanView {
  plan: PlanStatus;
  revision: number;
  paymentUrl: string | null;
  amountDueMinor: number | null;
  prices: PlanPrices | null;
}

export type BillStatus = "sent" | "paid" | "writtenOff" | "free";

export interface Bill {
  billId: string;
  month: string;
  periodKind: "calendarMonth" | "cycle";
  periodStartMillis: number | null;
  periodEndMillis: number | null;
  toolsOnly: boolean;
  status: BillStatus;
  salesMinor: number;
  commissionMinor: number;
  capped: boolean;
  gstMinor: number;
  totalMinor: number;
  invoiceNumber: string | null;
  dueAtMillis: number | null;
  paymentUrl: string | null;
  paidAtMillis: number | null;
}

type Raw = Record<string, unknown>;

const record = (value: unknown): Raw | null =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? value as Raw : null;
const millis = (value: unknown): number | null =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
const minor = (value: unknown): number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : 0;
const httpsUrl = (value: unknown): string | null =>
  typeof value === "string" && value.startsWith("https://") ? value : null;

const trialStates: readonly TrialState[] = ["notStarted", "scheduled", "active", "ended", "none", "unconfigured"];

export function parseTrial(value: unknown): TrialStatus {
  const raw = record(value);
  const state = trialStates.find((item) => item === raw?.state) ?? "unconfigured";
  return {state, startsAtMillis: millis(raw?.startsAtMillis), endsAtMillis: millis(raw?.endsAtMillis),
    daysLeft: millis(raw?.daysLeft)};
}

export function parsePlanStatus(value: unknown): PlanStatus {
  const raw = record(value);
  const statuses = ["none", "pendingPayment", "active", "ended"] as const;
  return {plan: raw?.plan === "toolsOnly" ? "toolsOnly" : "ticketing",
    status: statuses.find((item) => item === raw?.status) ?? "none",
    startsAtMillis: millis(raw?.startsAtMillis), endsAtMillis: millis(raw?.endsAtMillis)};
}

export function parsePlanView(value: unknown): PlanView {
  const raw = record(value);
  const prices = record(raw?.prices);
  return {plan: parsePlanStatus(raw?.plan), revision: minor(raw?.revision),
    paymentUrl: httpsUrl(raw?.paymentUrl),
    amountDueMinor: raw?.amountDueMinor === null || raw?.amountDueMinor === undefined ? null : minor(raw.amountDueMinor),
    prices: prices ? {toolsOnlyFeeMinor: minor(prices.toolsOnlyFeeMinor),
      commissionRateBasisPoints: minor(prices.commissionRateBasisPoints),
      commissionCapMinor: prices.commissionCapMinor === null ? null : minor(prices.commissionCapMinor),
      cycleDays: minor(prices.cycleDays) || 30, gstRegistered: prices.gstRegistered === true,
      gstRateBasisPoints: minor(prices.gstRateBasisPoints)} : null};
}

export function parseBills(value: unknown): Bill[] {
  const bills = record(value)?.bills;
  if (!Array.isArray(bills)) return [];
  const statuses: readonly BillStatus[] = ["sent", "paid", "writtenOff", "free"];
  return bills.flatMap((item): Bill[] => {
    const raw = record(item);
    const status = statuses.find((entry) => entry === raw?.status);
    if (!raw || typeof raw.billId !== "string" || typeof raw.month !== "string" || !status) return [];
    const sales = record(raw.sales);
    const commission = record(raw.commission);
    return [{billId: raw.billId, month: raw.month,
      periodKind: raw.periodKind === "cycle" ? "cycle" : "calendarMonth",
      periodStartMillis: millis(raw.periodStartMillis), periodEndMillis: millis(raw.periodEndMillis),
      toolsOnly: raw.plan === "toolsOnly", status,
      salesMinor: Math.max(0, minor(sales?.grossMinor) - minor(sales?.refundedMinor)),
      commissionMinor: minor(commission?.amountMinor), capped: commission?.capped === true,
      gstMinor: minor(record(raw.gst)?.amountMinor), totalMinor: minor(raw.totalMinor),
      invoiceNumber: typeof raw.invoiceNumber === "string" ? raw.invoiceNumber : null,
      dueAtMillis: millis(raw.dueAtMillis), paymentUrl: status === "sent" ? httpsUrl(raw.paymentUrl) : null,
      paidAtMillis: millis(raw.paidAtMillis)}];
  });
}

const india = "Asia/Kolkata";
const dayFormat = new Intl.DateTimeFormat("en-IN", {day: "numeric", month: "short", year: "numeric", timeZone: india});
const dayNoYear = new Intl.DateTimeFormat("en-IN", {day: "numeric", month: "short", timeZone: india});

/** A date in India time: 19 Nov 2026. */
export function dayLabel(atMillis: number): string {
  return dayFormat.format(atMillis);
}

/** Paise as rupees, Indian grouping: ₹10,000, or ₹1,500.50 with paise. */
export function rupees(minorUnits: number): string {
  const whole = minorUnits % 100 === 0;
  return `₹${(minorUnits / 100).toLocaleString("en-IN", {minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2})}`;
}

/** A rate in basis points: 500 → 5%. */
export function percent(basisPoints: number): string {
  return `${(basisPoints / 100).toLocaleString("en-IN", {maximumFractionDigits: 2})}%`;
}

/** A bill's period: 9 Nov – 8 Dec 2026 for a cycle, October 2026 for a month. */
export function billPeriod(bill: Bill): string {
  if (bill.periodKind === "cycle" && bill.periodStartMillis !== null && bill.periodEndMillis !== null) {
    return `${dayNoYear.format(bill.periodStartMillis)} – ${dayFormat.format(bill.periodEndMillis - 1)}`;
  }
  const [year, month] = bill.month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", {month: "long", year: "numeric", timeZone: "UTC"})
    .format(Date.UTC(year, (month || 1) - 1, 15));
}

export function isOverdue(bill: Bill, nowMillis: number): boolean {
  return bill.status === "sent" && bill.dueAtMillis !== null && bill.dueAtMillis < nowMillis;
}

/** What the owner may do with the plan now. */
export function planActions(view: PlanView, nowMillis: number):
  {canBuy: boolean; canPay: boolean; canCancel: boolean} {
  const {plan} = view;
  const activeToolsOnly = plan.plan === "toolsOnly" && plan.status === "active" &&
    (plan.endsAtMillis === null || plan.endsAtMillis > nowMillis);
  return {
    canBuy: view.prices !== null && !activeToolsOnly && plan.status !== "pendingPayment",
    canPay: plan.status === "pendingPayment" && view.paymentUrl !== null,
    canCancel: plan.plan === "toolsOnly" && (plan.status === "pendingPayment" ||
      activeToolsOnly && plan.endsAtMillis === null),
  };
}
