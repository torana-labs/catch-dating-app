import {httpsCallable} from "firebase/functions";
import {loadAdminCallableValidators} from
  "../../../generated/validators/adminCallableValidators";
import type {AdminExportMoneyLedgerCallablePayload} from
  "../../../generated/contracts/adminExportMoneyLedgerCallablePayload";
import type {AdminExportMoneyLedgerCallableResponse} from
  "../../../generated/contracts/adminExportMoneyLedgerCallableResponse";
import type {AdminGetFinanceMonthCallablePayload} from
  "../../../generated/contracts/adminGetFinanceMonthCallablePayload";
import type {AdminGetFinanceMonthCallableResponse} from
  "../../../generated/contracts/adminGetFinanceMonthCallableResponse";
import type {AdminManagePlatformCostsCallablePayload} from
  "../../../generated/contracts/adminManagePlatformCostsCallablePayload";
import type {AdminManagePlatformCostsCallableResponse} from
  "../../../generated/contracts/adminManagePlatformCostsCallableResponse";
import {dataMode} from "../../../shared/api/dataMode";
import {functions} from "../../../shared/api/firebaseFunctions";

export type FinanceMonth = AdminGetFinanceMonthCallableResponse;
export type MonthCosts = AdminManagePlatformCostsCallableResponse;
export type CostCategory = NonNullable<
  AdminManagePlatformCostsCallablePayload["category"]>;
export type LedgerExport = AdminExportMoneyLedgerCallableResponse;

async function call<Request, Response>(name: string, payload: Request,
  sample: (payload: Request) => Response): Promise<Response> {
  if (dataMode() === "sample") {
    await new Promise((resolve) => window.setTimeout(resolve, 120));
    return sample(payload);
  }
  const {validateAdminCallableRequest, validateAdminCallableResponse} =
    await loadAdminCallableValidators(name);
  validateAdminCallableRequest(name, payload);
  const response = await httpsCallable<Request, Response>(functions,
    name)(payload);
  validateAdminCallableResponse(name, response.data);
  return response.data;
}

/** One month of Finance, line by line. */
export function loadFinanceMonth(month: string): Promise<FinanceMonth> {
  return call<AdminGetFinanceMonthCallablePayload, FinanceMonth>(
    "adminGetFinanceMonth", {month}, sampleFinanceMonth);
}

/** Enters one kind of cost for a month by hand, or clears it. */
export function setCost(month: string, category: CostCategory,
  amountMinor: number | null, note: string | null): Promise<MonthCosts> {
  return call<AdminManagePlatformCostsCallablePayload, MonthCosts>(
    "adminManagePlatformCosts", {action: amountMinor === null ? "clear" :
      "set", month, category, amountMinor, note: note?.trim() || null},
    sampleCosts);
}

/** The month's ledger as CSV for the accountant. */
export function exportLedger(month: string): Promise<LedgerExport> {
  return call<AdminExportMoneyLedgerCallablePayload, LedgerExport>(
    "adminExportMoneyLedger", {month}, sampleLedger);
}

// Sample mode: October 2026 as drawn on the AdminFinance board.
const sampleCostRows: MonthCosts["costs"] = [
  {schemaVersion: 1, costId: "2026-10_ai", month: "2026-10", category: "ai",
    amountMinor: 790_000, source: "manual",
    note: "Listings, replies and research", updatedAtMillis: 1,
    updatedByUid: "sample-owner"},
  {schemaVersion: 1, costId: "2026-10_cloud", month: "2026-10",
    category: "cloud", amountMinor: 460_000, source: "manual",
    note: "Firebase and Google Cloud", updatedAtMillis: 1,
    updatedByUid: "sample-owner"},
  {schemaVersion: 1, costId: "2026-10_sms", month: "2026-10",
    category: "sms", amountMinor: 260_000, source: "manual",
    note: "Sign-in codes", updatedAtMillis: 1, updatedByUid: "sample-owner"},
  {schemaVersion: 1, costId: "2026-10_ads_meta", month: "2026-10",
    category: "ads_meta", amountMinor: 4_820_000, source: "manual",
    note: "Entered from the Meta invoice", updatedAtMillis: 1,
    updatedByUid: "sample-owner"},
];
let costRows = sampleCostRows;

function sampleCosts(payload: AdminManagePlatformCostsCallablePayload):
  MonthCosts {
  if (payload.action !== "list" && payload.category) {
    const costId = `${payload.month}_${payload.category}`;
    costRows = costRows.filter((cost) => cost.costId !== costId);
    if (payload.action === "set" && payload.amountMinor !== null) {
      costRows = [...costRows, {schemaVersion: 1, costId,
        month: payload.month, category: payload.category,
        amountMinor: payload.amountMinor, source: "manual",
        note: payload.note, updatedAtMillis: Date.now(),
        updatedByUid: "sample-owner"}];
    }
  }
  const costs = costRows.filter((cost) => cost.month === payload.month);
  const whatsapp = {estimateMinor: payload.month === "2026-10" ?
    1_480_000 : 0, messageCount: payload.month === "2026-10" ? 38_200 : 0,
  usesEstimate: !costs.some((cost) => cost.category === "whatsapp")};
  return {month: payload.month, costs, whatsapp,
    totalMinor: costs.reduce((sum, cost) => sum + cost.amountMinor, 0) +
      (whatsapp.usesEstimate ? whatsapp.estimateMinor : 0),
    adSpend: {metaConnected: false, googleConnected: false}};
}

export function sampleFinanceMonth(payload: AdminGetFinanceMonthCallablePayload):
  FinanceMonth {
  const costs = sampleCosts({action: "list", month: payload.month,
    category: null, amountMinor: null, note: null});
  const october = payload.month === "2026-10";
  const lines: FinanceMonth["costs"]["lines"] = costs.costs.map((cost) => ({
    category: cost.category, amountMinor: cost.amountMinor,
    source: cost.source, note: cost.note}));
  if (costs.whatsapp.usesEstimate && costs.whatsapp.estimateMinor) {
    lines.push({category: "whatsapp", amountMinor: costs.whatsapp
      .estimateMinor, source: "estimate",
    note: `${costs.whatsapp.messageCount} messages`});
  }
  const billed = october ? 9_830_000 : 0;
  return {month: payload.month,
    sales: october ? {grossMinor: 184_200_000, refundedMinor: 3_850_000,
      netMinor: 180_350_000, events: 186, organizers: 34, payments: 6_120} :
      {grossMinor: 0, refundedMinor: 0, netMinor: 0, events: 0,
        organizers: 0, payments: 0},
    earned: {uncappedMinor: october ? 10_520_000 : 0,
      capsAndTermsMinor: october ? 690_000 : 0, trialWaivedMinor: october ?
        310_000 : 0, billedMinor: billed, billedOrganizers: october ? 31 : 0,
      cappedOrganizers: october ? 1 : 0, ownTermsOrganizers: october ? 1 : 0,
      freeOrganizers: october ? 3 : 0, paidMinor: october ? 5_190_000 : 0,
      writtenOffMinor: 0},
    costs: {lines, nominatorCreditPaidMinor: october ? 126_000 : 0,
      totalMinor: costs.totalMinor + (october ? 126_000 : 0),
      whatsappIsEstimate: costs.whatsapp.usesEstimate,
      whatsappMessages: costs.whatsapp.messageCount},
    notCatch: {providerFeeMinor: october ? 4_310_000 : 0,
      providerTaxMinor: october ? 657_000 : 0, gstRegistered: false,
      gstMinor: 0},
    leftOverMinor: billed - costs.totalMinor - (october ? 126_000 : 0),
    series: [["2026-05", 0, 0], ["2026-06", 30_000_000, 1_200_000],
      ["2026-07", 60_000_000, 3_100_000], ["2026-08", 100_000_000, 5_800_000],
      ["2026-09", 140_000_000, 7_900_000],
      ["2026-10", 180_350_000, 9_830_000]].map(([month, salesMinor,
      earnedMinor]) => ({month: String(month), salesMinor: Number(salesMinor),
      earnedMinor: Number(earnedMinor), partial: false}))};
}

function sampleLedger(payload: AdminExportMoneyLedgerCallablePayload):
  LedgerExport {
  const csv = "Date,Type,Reference,Party,Description,Amount (INR)," +
    "GST (INR),Status\n2026-11-01,Invoice,2026-27/031,Lantern Lane Social," +
    "Commission for 2026-10,6400.00,0.00,sent\n";
  return {month: payload.month, fileName: `catch-ledger-${payload.month}.csv`,
    csv, rowCount: 1};
}
