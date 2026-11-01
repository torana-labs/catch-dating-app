import * as admin from "firebase-admin";
import {onCall, HttpsError, type CallableRequest} from
  "firebase-functions/v2/https";
import {requireAdminRole} from "../admin/adminAuth";
import {appCheckCallableOptionsWithLimits} from "../shared/callableOptions";
import {checkRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import type {
  NominatorCreditDocument,
  OrganizerBillDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {AdminExportMoneyLedgerCallablePayload as Payload} from
  "../shared/generated/adminExportMoneyLedgerCallablePayload";
import type {AdminExportMoneyLedgerCallableResponse as Result} from
  "../shared/generated/adminExportMoneyLedgerCallableResponse";
import {validateAdminExportMoneyLedgerCallablePayload} from
  "../shared/generated/validators/adminExportMoneyLedgerInput";
import {validateAdminExportMoneyLedgerCallableResponse} from
  "../shared/generated/validators/adminExportMoneyLedgerOutput";
import {monthWindow} from "./billComputation";
import {moneyRoles} from "./moneySettings";
import {nominatorCreditsCollection} from "./nominatorCredits";
import {organizerBillsCollection} from "./organizerBills";
import {listMonthCosts} from "./platformCosts";

/**
 * Catch's ledger for one month, for the accountant's Zoho Books import:
 * bills issued (by the month billed), bill payments received, nominator
 * credit paid out, and costs. Ticket sales are the organizers' money and
 * stay out.
 */
export interface LedgerRow {
  date: string;
  type: "Invoice" | "Payment received" | "Nominator credit paid" | "Cost";
  reference: string;
  party: string;
  description: string;
  amountMinor: number;
  gstMinor: number;
  status: string;
}

const header = ["Date", "Type", "Reference", "Party", "Description",
  "Amount (INR)", "GST (INR)", "Status"];

/**
 * India-time calendar date of an instant.
 * @param {number} millis Epoch millis.
 * @return {string} YYYY-MM-DD.
 */
export function istDate(millis: number): string {
  return new Date(millis + 330 * 60 * 1000).toISOString().slice(0, 10);
}

const rupees = (minor: number) => (minor / 100).toFixed(2);

/**
 * One CSV field, quoted when it holds a separator, quote or newline, and
 * defused when a spreadsheet would read it as a formula.
 * @param {string} value Field text.
 * @return {string} CSV field.
 */
export function csvField(value: string): string {
  const safe = /^[=+\-@\t\r]/u.test(value) && !/^-?[0-9.]+$/u.test(value) ?
    `'${value}` : value;
  return /[",\n\r]/u.test(safe) ? `"${safe.replace(/"/gu, "\"\"")}"` : safe;
}

/**
 * Renders ledger rows as CSV, oldest first.
 * @param {LedgerRow[]} rows Ledger rows.
 * @return {string} CSV text with a header row.
 */
export function ledgerCsv(rows: LedgerRow[]): string {
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date) ||
    a.type.localeCompare(b.type) || a.reference.localeCompare(b.reference));
  return [header, ...sorted.map((row) => [row.date, row.type, row.reference,
    row.party, row.description, rupees(row.amountMinor), rupees(row.gstMinor),
    row.status])].map((fields) => fields.map(csvField).join(",")).join("\n") +
    "\n";
}

/**
 * The ledger rows for one month.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {string} month YYYY-MM.
 * @return {Promise<LedgerRow[]>} Rows.
 */
export async function monthLedgerRows(db: FirebaseFirestore.Firestore,
  month: string): Promise<LedgerRow[]> {
  const {startMillis, endMillis} = monthWindow(month);
  const [billed, paid, credits, costs] = await Promise.all([
    db.collection(organizerBillsCollection).where("month", "==", month)
      .limit(2000).get(),
    db.collection(organizerBillsCollection)
      .where("paidAtMillis", ">=", startMillis)
      .where("paidAtMillis", "<", endMillis).limit(2000).get(),
    db.collection(nominatorCreditsCollection)
      .where("paidAtMillis", ">=", startMillis)
      .where("paidAtMillis", "<", endMillis).limit(5000).get(),
    listMonthCosts(db, month),
  ]);
  const rows: LedgerRow[] = [];
  for (const doc of billed.docs) {
    const bill = doc.data() as OrganizerBillDocument;
    if (!bill.invoiceNumber || bill.sentAtMillis === null) continue;
    rows.push({date: istDate(bill.sentAtMillis), type: "Invoice",
      reference: bill.invoiceNumber, party: bill.organizerName,
      description: `Commission for ${bill.month}` +
        (bill.commission.capped ? " (capped)" : ""),
      amountMinor: bill.totalMinor, gstMinor: bill.gst.amountMinor,
      status: bill.status});
  }
  for (const doc of paid.docs) {
    const bill = doc.data() as OrganizerBillDocument;
    if (bill.paidAtMillis === null) continue;
    rows.push({date: istDate(bill.paidAtMillis), type: "Payment received",
      reference: bill.invoiceNumber ?? bill.billId, party: bill.organizerName,
      description: bill.paidVia === "paymentLink" ?
        "Paid by Razorpay payment link" : "Marked paid by Catch",
      amountMinor: bill.paidMinor ?? bill.totalMinor, gstMinor: 0,
      status: "paid"});
  }
  for (const doc of credits.docs) {
    const credit = doc.data() as NominatorCreditDocument;
    rows.push({date: istDate(credit.paidAtMillis ?? startMillis),
      type: "Nominator credit paid", reference: credit.creditId,
      party: credit.nominatorUid,
      description: `${credit.nominatorRole} credit for ${
        credit.organizerName}, ${credit.billMonth}`,
      amountMinor: credit.creditMinor, gstMinor: 0, status: "paid"});
  }
  const lastDay = istDate(endMillis - 1);
  for (const cost of costs.costs) {
    rows.push({date: lastDay, type: "Cost", reference: cost.costId,
      party: cost.category, description: cost.note ?? cost.category,
      amountMinor: cost.amountMinor, gstMinor: 0, status: cost.source});
  }
  if (costs.whatsapp.usesEstimate && costs.whatsapp.estimateMinor > 0) {
    rows.push({date: lastDay, type: "Cost", reference: `${month}_whatsapp`,
      party: "whatsapp", description: `Estimate: ${
        costs.whatsapp.messageCount} messages, no invoice entered`,
      amountMinor: costs.whatsapp.estimateMinor, gstMinor: 0,
      status: "estimate"});
  }
  return rows;
}

/**
 * The owner downloads a month's ledger as CSV.
 * @param {CallableRequest<unknown>} request Callable request.
 * @return {Promise<Result>} CSV with its file name.
 */
export async function adminExportMoneyLedgerHandler(
  request: CallableRequest<unknown>): Promise<Result> {
  const actor = requireAdminRole(request, moneyRoles);
  const data = validateCallableWithAjv<Payload>(request,
    validateAdminExportMoneyLedgerCallablePayload);
  const db = admin.firestore();
  await checkRateLimit(db, actor.uid, "adminExportMoneyLedger",
    {maxRequests: 10, windowMs: 60 * 1000});
  const rows = await monthLedgerRows(db, data.month);
  const result: Result = {month: data.month,
    fileName: `catch-ledger-${data.month}.csv`, csv: ledgerCsv(rows),
    rowCount: rows.length};
  if (!validateAdminExportMoneyLedgerCallableResponse(result)) {
    throw new HttpsError("internal", "The ledger is too large to export.");
  }
  return result;
}

export const adminExportMoneyLedger = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 120, maxInstances: 3}),
  (request) => adminExportMoneyLedgerHandler(request));
