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
import type {AdminGetFinanceMonthCallablePayload as Payload} from
  "../shared/generated/adminGetFinanceMonthCallablePayload";
import type {AdminGetFinanceMonthCallableResponse as Result} from
  "../shared/generated/adminGetFinanceMonthCallableResponse";
import type {AdminManagePlatformCostsCallableResponse as Costs} from
  "../shared/generated/adminManagePlatformCostsCallableResponse";
import {validateAdminGetFinanceMonthCallablePayload} from
  "../shared/generated/validators/adminGetFinanceMonthInput";
import {validateAdminGetFinanceMonthCallableResponse} from
  "../shared/generated/validators/adminGetFinanceMonthOutput";
import {monthOf, monthWindow} from "./billComputation";
import {moneyRoles, readMoneySettings} from "./moneySettings";
import {nominatorCreditsCollection} from "./nominatorCredits";
import {organizerBillsCollection} from "./organizerBills";
import {listMonthCosts} from "./platformCosts";

/**
 * Finance for one month, line by line, from the month's bills, its costs
 * and the nominator credit paid in it. Ticket sales are the organizers'
 * money; Catch earned what the bills came to.
 */
const billedStatuses = new Set(["toSend", "sent", "paid", "writtenOff"]);

/**
 * Builds the month.
 * @param {object} input Month, bills by month, costs, credit and GST setting.
 * @return {Result} Finance month.
 */
export function buildFinanceMonth(input: {
  month: string; nowMillis: number;
  billsByMonth: Map<string, OrganizerBillDocument[]>; seriesMonths: string[];
  costs: Costs; creditsPaid: NominatorCreditDocument[];
  gstRegistered: boolean;
}): Result {
  const bills = input.billsByMonth.get(input.month) ?? [];
  const billed = bills.filter((bill) => billedStatuses.has(bill.status));
  const sum = (list: OrganizerBillDocument[],
    pick: (bill: OrganizerBillDocument) => number) =>
    list.reduce((total, bill) => total + pick(bill), 0);
  const grossMinor = sum(bills, (bill) => bill.sales.grossMinor);
  const refundedMinor = sum(bills, (bill) => bill.sales.refundedMinor);
  const uncappedMinor = sum(bills, (bill) => bill.commission.uncappedMinor);
  const commissionMinor = sum(bills, (bill) => bill.commission.amountMinor);
  const billedMinor = sum(billed, (bill) => bill.totalMinor);
  const gstMinor = sum(billed, (bill) => bill.gst.amountMinor);
  const lines: Result["costs"]["lines"] = input.costs.costs.map((cost) => ({
    category: cost.category, amountMinor: cost.amountMinor,
    source: cost.source, note: cost.note}));
  if (input.costs.whatsapp.usesEstimate &&
      input.costs.whatsapp.estimateMinor > 0) {
    lines.push({category: "whatsapp",
      amountMinor: input.costs.whatsapp.estimateMinor, source: "estimate",
      note: `${input.costs.whatsapp.messageCount} messages`});
  }
  const creditPaid = input.creditsPaid.reduce((total, credit) =>
    total + credit.creditMinor, 0);
  const costsTotal = input.costs.totalMinor + creditPaid;
  const earnedBeforeGst = billedMinor - gstMinor;
  const current = monthOf(input.nowMillis);
  return {
    month: input.month,
    sales: {grossMinor, refundedMinor, netMinor: grossMinor - refundedMinor,
      events: sum(bills, (bill) => bill.sales.eventCount),
      organizers: bills.length,
      payments: sum(bills, (bill) => bill.sales.paymentCount)},
    earned: {uncappedMinor,
      capsAndTermsMinor: Math.max(0, uncappedMinor - commissionMinor),
      trialWaivedMinor: sum(bills, (bill) => bill.commission.trialWaivedMinor),
      billedMinor, billedOrganizers: billed.length,
      cappedOrganizers: bills.filter((bill) => bill.commission.capped).length,
      ownTermsOrganizers: bills.filter((bill) => bill.terms.ownTerms).length,
      freeOrganizers: bills.filter((bill) => bill.status === "free").length,
      paidMinor: sum(bills, (bill) => bill.paidMinor ?? 0),
      writtenOffMinor: sum(bills.filter((bill) =>
        bill.status === "writtenOff"), (bill) => bill.totalMinor)},
    costs: {lines, nominatorCreditPaidMinor: creditPaid,
      totalMinor: costsTotal,
      whatsappIsEstimate: input.costs.whatsapp.usesEstimate,
      whatsappMessages: input.costs.whatsapp.messageCount},
    notCatch: {providerFeeMinor: sum(bills, (bill) =>
      bill.sales.providerFeeMinor),
    providerTaxMinor: sum(bills, (bill) => bill.sales.providerTaxMinor),
    gstRegistered: input.gstRegistered, gstMinor},
    leftOverMinor: earnedBeforeGst - costsTotal,
    series: input.seriesMonths.map((month) => {
      const list = input.billsByMonth.get(month) ?? [];
      return {month, salesMinor: sum(list, (bill) =>
        bill.sales.grossMinor - bill.sales.refundedMinor),
      earnedMinor: sum(list.filter((bill) => billedStatuses.has(bill.status)),
        (bill) => bill.totalMinor - bill.gst.amountMinor),
      partial: month >= current};
    }),
  };
}

/**
 * The owner reads one month of Finance.
 * @param {CallableRequest<unknown>} request Callable request.
 * @return {Promise<Result>} Finance month.
 */
export async function adminGetFinanceMonthHandler(
  request: CallableRequest<unknown>): Promise<Result> {
  const actor = requireAdminRole(request, moneyRoles);
  const data = validateCallableWithAjv<Payload>(request,
    validateAdminGetFinanceMonthCallablePayload);
  const db = admin.firestore();
  await checkRateLimit(db, actor.uid, "adminGetFinanceMonth",
    {maxRequests: 30, windowMs: 60 * 1000});
  const seriesMonths = [data.month];
  while (seriesMonths.length < 6) {
    seriesMonths.unshift(monthOf(monthWindow(seriesMonths[0]).startMillis - 1));
  }
  const {startMillis, endMillis} = monthWindow(data.month);
  const [billsSnap, costs, creditsSnap, {settings}] = await Promise.all([
    db.collection(organizerBillsCollection)
      .where("month", "in", seriesMonths).limit(6000).get(),
    listMonthCosts(db, data.month),
    db.collection(nominatorCreditsCollection)
      .where("paidAtMillis", ">=", startMillis)
      .where("paidAtMillis", "<", endMillis).limit(5000).get(),
    readMoneySettings(db),
  ]);
  const billsByMonth = new Map<string, OrganizerBillDocument[]>();
  for (const doc of billsSnap.docs) {
    const bill = doc.data() as OrganizerBillDocument;
    billsByMonth.set(bill.month, [...(billsByMonth.get(bill.month) ?? []),
      bill]);
  }
  const result = buildFinanceMonth({month: data.month, nowMillis: Date.now(),
    billsByMonth, seriesMonths, costs, gstRegistered: settings.gstRegistered,
    creditsPaid: creditsSnap.docs.map((doc) =>
      doc.data() as NominatorCreditDocument)});
  if (!validateAdminGetFinanceMonthCallableResponse(result)) {
    throw new HttpsError("internal", "Finance could not be read.");
  }
  return result;
}

export const adminGetFinanceMonth = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 60, maxInstances: 5}),
  (request) => adminGetFinanceMonthHandler(request));
