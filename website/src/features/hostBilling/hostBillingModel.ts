import type {
  GetOrganizerBillingStatusCallableResponse,
  ListOrganizerBillsCallableResponse,
  ManageOrganizerBillingPlanCallableResponse,
} from "./contracts";

/**
 * The host billing portal's data, parsed from the owner callables:
 * getOrganizerBillingStatus (trial and plan), manageOrganizerBillingPlan
 * (prices and the tools-only purchase) and listOrganizerBills (bills). The
 * types come from the generated contracts in functions/src/shared/generated,
 * so a contract change fails the website typecheck. Parsing stays defensive:
 * a reply is read field by field (keyed by the contract) so an older or
 * newer server degrades to "unavailable" instead of breaking.
 */
type RawTrial = GetOrganizerBillingStatusCallableResponse["trial"];
type RawPlanView = ManageOrganizerBillingPlanCallableResponse;
type RawBill = ListOrganizerBillsCallableResponse["bills"][number];

export type TrialState = RawTrial["state"];
export type TrialStatus = Pick<RawTrial, "state" | "startsAtMillis" | "endsAtMillis" | "daysLeft">;
export type PlanStatus = GetOrganizerBillingStatusCallableResponse["plan"];
export type PlanPrices = NonNullable<RawPlanView["prices"]>;
export type PlanView = Omit<RawPlanView, "organizerId">;
export type BillStatus = RawBill["status"];

/** One bill as the portal shows it, derived from a listOrganizerBills row. */
export interface Bill {
  billId: RawBill["billId"];
  month: RawBill["month"];
  periodKind: RawBill["periodKind"];
  /** Null when an older server sent no period. */
  periodStartMillis: RawBill["periodStartMillis"] | null;
  periodEndMillis: RawBill["periodEndMillis"] | null;
  toolsOnly: boolean;
  status: BillStatus;
  /** Gross sales less refunds. */
  salesMinor: number;
  commissionMinor: RawBill["commission"]["amountMinor"];
  capped: RawBill["commission"]["capped"];
  gstMinor: RawBill["gst"]["amountMinor"];
  totalMinor: RawBill["totalMinor"];
  invoiceNumber: RawBill["invoiceNumber"];
  dueAtMillis: RawBill["dueAtMillis"];
  /** Only for an unpaid bill, and only an https URL. */
  paymentUrl: RawBill["paymentUrl"];
  paidAtMillis: RawBill["paidAtMillis"];
}

/** A reply not yet trusted: only the contract's keys, every value unknown. */
type Untrusted<T> = {[K in keyof T]?: unknown};

const record = <T,>(value: unknown): Untrusted<T> | null =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? value as Untrusted<T> : null;
const millis = (value: unknown): number | null =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
const minor = (value: unknown): number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : 0;
const httpsUrl = (value: unknown): string | null =>
  typeof value === "string" && value.startsWith("https://") ? value : null;
/** Every value of a contract enum; the Record makes a new contract value a type error here. */
const members = <T extends string>(all: Record<T, true>): readonly T[] => Object.keys(all) as T[];
const oneOf = <T extends string>(values: readonly T[], value: unknown): T | undefined =>
  values.find((item) => item === value);

const trialStates = members<TrialState>({notStarted: true, scheduled: true, active: true, ended: true, none: true,
  unconfigured: true});
const planStatuses = members<PlanStatus["status"]>({none: true, pendingPayment: true, active: true, ended: true});
const billStatuses = members<BillStatus>({sent: true, paid: true, writtenOff: true, free: true});

export function parseTrial(value: unknown): TrialStatus {
  const raw = record<RawTrial>(value);
  return {state: oneOf(trialStates, raw?.state) ?? "unconfigured", startsAtMillis: millis(raw?.startsAtMillis),
    endsAtMillis: millis(raw?.endsAtMillis), daysLeft: millis(raw?.daysLeft)};
}

export function parsePlanStatus(value: unknown): PlanStatus {
  const raw = record<PlanStatus>(value);
  return {plan: raw?.plan === "toolsOnly" ? "toolsOnly" : "ticketing",
    status: oneOf(planStatuses, raw?.status) ?? "none",
    startsAtMillis: millis(raw?.startsAtMillis), endsAtMillis: millis(raw?.endsAtMillis)};
}

export function parsePlanView(value: unknown): PlanView {
  const raw = record<RawPlanView>(value);
  const prices = record<PlanPrices>(raw?.prices);
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
  const bills = record<ListOrganizerBillsCallableResponse>(value)?.bills;
  if (!Array.isArray(bills)) return [];
  return bills.flatMap((item: unknown): Bill[] => {
    const raw = record<RawBill>(item);
    const status = oneOf(billStatuses, raw?.status);
    if (!raw || typeof raw.billId !== "string" || typeof raw.month !== "string" || !status) return [];
    const sales = record<RawBill["sales"]>(raw.sales);
    const commission = record<RawBill["commission"]>(raw.commission);
    return [{billId: raw.billId, month: raw.month,
      periodKind: raw.periodKind === "cycle" ? "cycle" : "calendarMonth",
      periodStartMillis: millis(raw.periodStartMillis), periodEndMillis: millis(raw.periodEndMillis),
      toolsOnly: raw.plan === "toolsOnly", status,
      salesMinor: Math.max(0, minor(sales?.grossMinor) - minor(sales?.refundedMinor)),
      commissionMinor: minor(commission?.amountMinor), capped: commission?.capped === true,
      gstMinor: minor(record<RawBill["gst"]>(raw.gst)?.amountMinor), totalMinor: minor(raw.totalMinor),
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
