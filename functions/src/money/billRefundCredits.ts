import type {CommercialTerms} from "../commercialTerms/terms";
import type {OrganizerBillDocument} from
  "../shared/generated/firestoreAdminTypes";
import {
  computeBill,
  type BillablePayment,
  type RefundCreditSource,
} from "./billComputation";
import {dayMillis} from "./hostTrial";

/**
 * Refunds after a bill is sent (owner, 9 Nov 2026): when a refund on a
 * commissionable payment is recorded after its cycle's bill was sent or
 * paid, the commission that refund removes is credited on the organizer's
 * next cycle bill. The sent bill itself never changes.
 *
 * A source bill's credit is its commission less the commission it would
 * have with today's refunds: the same payments, their frozen rates, the
 * bill's trial end and the bill's own per-cycle cap, so a capped cycle owes
 * credit only once refunds bring it under the cap. A tools-only cycle billed
 * a flat fee, never commission (#1126: never both), so it owes none. Credit
 * already taken by other bills is subtracted, so it is never given twice; a
 * bill not yet sent recomputes its own share whenever it is recomputed.
 */
type Bill = OrganizerBillDocument;

/**
 * How far back a sent bill can still owe credit. Razorpay takes refunds for
 * about six months after a payment; this leaves room for a cycle's length
 * and the next bill.
 */
export const refundCreditLookbackDays = 240;

/** Sent or paid: the host was asked for this bill's figures. */
const issuedStatuses: readonly Bill["status"][] = ["sent", "paid"];

/**
 * Whether a bill can owe refund credit: a ticketing cycle bill that was
 * sent or paid, recent enough for its payments to be refunded.
 * @param {Bill} bill A bill.
 * @param {number} nowMillis Now.
 * @return {boolean} Whether it can owe credit.
 */
export function canOweRefundCredit(bill: Bill, nowMillis: number): boolean {
  return bill.periodKind === "cycle" && issuedStatuses.includes(bill.status) &&
    bill.plan?.kind !== "toolsOnly" && bill.commission.amountMinor > 0 &&
    bill.periodEndMillis >= nowMillis - refundCreditLookbackDays * dayMillis;
}

/**
 * The first instant whose payments a credit check needs: the earliest
 * count-from of the bills that can owe credit to a bill starting then.
 * @param {Bill[]} bills The organizer's bills.
 * @param {number} periodStartMillis Start of the bill being made.
 * @param {number} nowMillis Now.
 * @return {number|null} Earliest instant, or null when none can owe credit.
 */
export function refundCreditWindowStart(bills: Bill[],
  periodStartMillis: number, nowMillis: number): number | null {
  const starts = bills.filter((bill) => canOweRefundCredit(bill, nowMillis) &&
    bill.periodEndMillis <= periodStartMillis)
    .map((bill) => bill.countFromMillis ?? bill.periodStartMillis);
  return starts.length === 0 ? null : Math.min(...starts);
}

/**
 * What one sent or paid cycle bill owes back for refunds recorded since it
 * was made.
 * @param {Bill} bill The sent or paid bill.
 * @param {BillablePayment[]} payments The organizer's payments, covering the
 * bill's period.
 * @param {CommercialTerms} terms Current terms, for payments that froze none.
 * @param {number} nowMillis Now.
 * @return {object} New refunds and the commission they remove.
 */
export function refundCreditOwed(bill: Bill, payments: BillablePayment[],
  terms: CommercialTerms, nowMillis: number):
  {refundedMinor: number; creditMinor: number} {
  const none = {refundedMinor: 0, creditMinor: 0};
  if (!canOweRefundCredit(bill, nowMillis)) return none;
  const from = bill.countFromMillis ?? bill.periodStartMillis;
  const inPeriod = payments.filter((payment) =>
    payment.capturedAtMillis >= from &&
    payment.capturedAtMillis < bill.periodEndMillis);
  const now = computeBill({payments: inPeriod, terms,
    trialEndsAtMillis: bill.trialEndsAtMillis,
    capMinor: bill.commission.capMinor, plan: {kind: "ticketing"},
    gstRegistered: false, gstRateBasisPoints: 0});
  const refundedMinor = now.sales.refundedMinor - bill.sales.refundedMinor;
  // Only a new refund owes credit, never a change of terms or a late sale.
  if (refundedMinor <= 0) return none;
  return {refundedMinor,
    creditMinor: Math.max(0, bill.commission.amountMinor -
      now.commission.amountMinor)};
}

/**
 * The refund credit owed to a bill being made, oldest first: each earlier
 * sent or paid cycle bill's credit, less what every other bill already took
 * from it.
 * @param {object} input The bill being made, the organizer's bills (read in
 * the same transaction), its payments, current terms and now.
 * @return {RefundCreditSource[]} Credit still owed, by source bill.
 */
export function refundCreditSources(input: {
  billId: string; periodStartMillis: number; bills: Bill[];
  payments: BillablePayment[]; terms: CommercialTerms; nowMillis: number;
}): RefundCreditSource[] {
  const taken = new Map<string, number>();
  for (const bill of input.bills) {
    if (bill.billId === input.billId) continue;
    for (const line of bill.refundCredit?.lines ?? []) {
      taken.set(line.billId, (taken.get(line.billId) ?? 0) +
        line.appliedMinor);
    }
  }
  return input.bills
    .filter((bill) => bill.billId !== input.billId &&
      bill.periodEndMillis <= input.periodStartMillis)
    .sort((a, b) => a.periodStartMillis - b.periodStartMillis)
    .flatMap((bill): RefundCreditSource[] => {
      const owed = refundCreditOwed(bill, input.payments, input.terms,
        input.nowMillis);
      const creditMinor = Math.max(0, owed.creditMinor -
        (taken.get(bill.billId) ?? 0));
      return creditMinor > 0 ? [{billId: bill.billId,
        cycleNumber: bill.cycleNumber ?? null,
        invoiceNumber: bill.invoiceNumber, refundedMinor: owed.refundedMinor,
        creditMinor}] : [];
    });
}
