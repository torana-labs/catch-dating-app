import type {CommercialTerms, CommercialTermsSnapshot} from
  "../commercialTerms/terms";
import type {MoneySettingsDocument, OrganizerBillDocument} from
  "../shared/generated/firestoreAdminTypes";

/**
 * Pure rules for organizer bills: India-time calendar months, financial
 * years and invoice numbers, and what one organizer owes for one month.
 */
export type MoneySettings = MoneySettingsDocument["settings"];

// The owner's decisions of 1 Nov 2026: not GST registered, 10% nominator
// credit for 12 months from the first paid bill, lapsing after 90 days with
// no claim, paid on the 10th over ₹500, never to sales associates.
export const defaultMoneySettings: MoneySettings = {
  gstRegistered: false,
  gstRateBasisPoints: 1800,
  billDueDayOfMonth: 15,
  nominatorCredit: {rateBasisPoints: 1000, months: 12, lapseDays: 90,
    minimumPayoutMinor: 50_000, payoutDayOfMonth: 10,
    earningRoles: ["partner", "guest", "organizer"]},
};

const istOffsetMillis = (5 * 60 + 30) * 60 * 1000;
const monthPattern = /^([0-9]{4})-(0[1-9]|1[0-2])$/u;

/**
 * The first and last instant of a calendar month in India time.
 * @param {string} month YYYY-MM.
 * @return {object} Start (inclusive) and end (exclusive) epoch millis.
 */
export function monthWindow(month: string):
  {startMillis: number; endMillis: number} {
  const match = monthPattern.exec(month);
  if (!match) throw new RangeError(`Invalid month ${month}`);
  const year = Number(match[1]);
  const index = Number(match[2]) - 1;
  return {startMillis: Date.UTC(year, index, 1) - istOffsetMillis,
    endMillis: Date.UTC(year, index + 1, 1) - istOffsetMillis};
}

/**
 * The India-time calendar month an instant falls in.
 * @param {number} millis Epoch millis.
 * @return {string} YYYY-MM.
 */
export function monthOf(millis: number): string {
  const ist = new Date(millis + istOffsetMillis);
  return `${ist.getUTCFullYear()}-` +
    String(ist.getUTCMonth() + 1).padStart(2, "0");
}

/**
 * The month before a month.
 * @param {string} month YYYY-MM.
 * @return {string} YYYY-MM.
 */
export function previousMonth(month: string): string {
  return monthOf(monthWindow(month).startMillis - 1);
}

/**
 * Whole months from one month to another (0 for the same month).
 * @param {string} from YYYY-MM.
 * @param {string} to YYYY-MM.
 * @return {number} Months between.
 */
export function monthsBetween(from: string, to: string): number {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm);
}

/**
 * The Indian financial year (April to March) an instant falls in.
 * @param {number} millis Epoch millis.
 * @return {string} As 2026-27.
 */
export function financialYearOf(millis: number): string {
  const ist = new Date(millis + istOffsetMillis);
  const start = ist.getUTCMonth() >= 3 ? ist.getUTCFullYear() :
    ist.getUTCFullYear() - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

/**
 * An invoice number in a financial year's sequence.
 * @param {string} financialYear As 2026-27.
 * @param {number} number Position in the sequence, from 1.
 * @return {string} As 2026-27/031.
 */
export function invoiceNumber(financialYear: string, number: number): string {
  return `${financialYear}/${String(number).padStart(3, "0")}`;
}

/**
 * When a month's bill falls due: the end of the due day of the next month,
 * India time.
 * @param {string} month Billed month.
 * @param {number} dueDay Day of the next month.
 * @return {number} Epoch millis.
 */
export function dueAtMillis(month: string, dueDay: number): number {
  const next = monthWindow(month).endMillis;
  return next + dueDay * 24 * 60 * 60 * 1000 - 1;
}

/** One payment into the organizer's own account that may carry commission. */
export interface BillablePayment {
  purpose: CommercialTermsSnapshot["purpose"];
  moneyFlow: "hostCollected" | "platformSplit" | null;
  amountMinor: number;
  refundedMinor: number;
  capturedAtMillis: number;
  eventId: string | null;
  providerFeeMinor: number;
  providerTaxMinor: number;
  snapshot: CommercialTermsSnapshot | null;
}

export interface BillInput {
  payments: BillablePayment[];
  terms: CommercialTerms;
  trialEndsAtMillis: number | null;
  gstRegistered: boolean;
  gstRateBasisPoints: number;
}

export type BillFigures = Pick<OrganizerBillDocument, "sales" | "commission" |
  "gst" | "totalMinor" | "trialEndsAtMillis">;

/**
 * What one organizer owes Catch for one month. Only hostCollected payments
 * are billed: a platformSplit payment already had Catch's fee taken at
 * source. Each payment uses its frozen terms, or the current terms when it
 * froze none; payments before the trial ends are free; the month's total is
 * capped by the current terms; GST applies only while registered.
 * @param {BillInput} input Payments, terms, trial end and tax setting.
 * @return {BillFigures} The bill's figures.
 */
export function computeBill(input: BillInput): BillFigures {
  const {terms} = input;
  const billed = input.payments.filter((payment) =>
    payment.moneyFlow === "hostCollected");
  let grossMinor = 0;
  let refundedMinor = 0;
  let baseMinor = 0;
  let uncappedMinor = 0;
  let trialWaivedMinor = 0;
  let providerFeeMinor = 0;
  let providerTaxMinor = 0;
  let unsnapshottedCount = 0;
  const events = new Set<string>();
  for (const payment of billed) {
    const frozen = payment.snapshot;
    if (!frozen) unsnapshottedCount++;
    const counts = frozen ? frozen.purposeTerms.countsTowardCommission :
      terms.purposes[payment.purpose].countsTowardCommission;
    grossMinor += payment.amountMinor;
    refundedMinor += payment.refundedMinor;
    providerFeeMinor += payment.providerFeeMinor;
    providerTaxMinor += payment.providerTaxMinor;
    if (payment.eventId) events.add(payment.eventId);
    if (!counts) continue;
    const commission = frozen?.commission ?? terms.commission;
    const base = commission.base === "gross" ? payment.amountMinor :
      Math.max(0, payment.amountMinor - payment.refundedMinor);
    baseMinor += base;
    const fee = Math.floor(base * commission.rateBasisPoints / 10_000);
    if (input.trialEndsAtMillis !== null &&
        payment.capturedAtMillis < input.trialEndsAtMillis) {
      trialWaivedMinor += fee;
    } else {
      uncappedMinor += fee;
    }
  }
  const capMinor = terms.commission.capMinor;
  const amountMinor = capMinor === null ? uncappedMinor :
    Math.min(uncappedMinor, capMinor);
  const rate = input.gstRegistered ? input.gstRateBasisPoints : 0;
  const exclusive = terms.commission.taxTreatment === "exclusive";
  const gstMinor = !rate ? 0 : exclusive ?
    Math.round(amountMinor * rate / 10_000) :
    amountMinor - Math.round(amountMinor * 10_000 / (10_000 + rate));
  return {
    sales: {paymentCount: billed.length, eventCount: events.size, grossMinor,
      refundedMinor, baseMinor, providerFeeMinor, providerTaxMinor,
      unsnapshottedCount},
    commission: {rateBasisPoints: terms.commission.rateBasisPoints,
      uncappedMinor, capMinor, capped: amountMinor < uncappedMinor,
      trialWaivedMinor, amountMinor},
    gst: {registered: input.gstRegistered, rateBasisPoints: rate,
      amountMinor: gstMinor},
    totalMinor: exclusive ? amountMinor + gstMinor : amountMinor,
    trialEndsAtMillis: input.trialEndsAtMillis,
  };
}

/**
 * What the organizer paid Catch before GST, the base for nominator credit.
 * Whether GST was added on top or included, the total less its GST is the
 * part before GST; a part payment counts in proportion.
 * @param {OrganizerBillDocument} bill A paid bill.
 * @return {number} Minor units.
 */
export function billPaidBeforeGst(bill: OrganizerBillDocument): number {
  const beforeGst = bill.totalMinor - bill.gst.amountMinor;
  const paid = bill.paidMinor ?? bill.totalMinor;
  if (bill.totalMinor <= 0) return 0;
  return Math.floor(beforeGst * Math.min(paid, bill.totalMinor) /
    bill.totalMinor);
}
