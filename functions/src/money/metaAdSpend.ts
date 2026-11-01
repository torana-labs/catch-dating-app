import type {PlatformCostDocument} from
  "../shared/generated/firestoreAdminTypes";
import {monthWindow} from "./billComputation";
import {platformCostsCollection} from "./platformCosts";

/**
 * Meta ad spend for Finance and Growth, read from the Marketing API's ad
 * account insights. Nothing schedules this yet: it needs a Marketing API
 * token Catch does not hold, and adding a secret to a deployed Function
 * needs the owner's grant first. Once the token is granted, a daily
 * schedule binds it and calls syncMetaAdSpend for the current month.
 */
const graphVersion = "v21.0";

export interface MetaAdSpendRow {
  campaignName: string;
  spendMinor: number;
}

/**
 * The month's spend per campaign, in minor units of the ad account's
 * currency (Catch's account bills in INR).
 * @param {object} input Token, account, month and fetch.
 * @return {Promise<MetaAdSpendRow[]>} Spend per campaign.
 */
export async function fetchMetaAdSpend(input: {
  accessToken: string; adAccountId: string; month: string;
  fetchImpl?: typeof fetch;
}): Promise<MetaAdSpendRow[]> {
  if (!/^act_[0-9]{1,30}$/u.test(input.adAccountId)) {
    throw new Error("Meta ad account id must look like act_123.");
  }
  const {startMillis, endMillis} = monthWindow(input.month);
  const day = (millis: number) =>
    new Date(millis + 330 * 60 * 1000).toISOString().slice(0, 10);
  const params = new URLSearchParams({level: "campaign",
    fields: "campaign_name,spend", limit: "500",
    time_range: JSON.stringify({since: day(startMillis),
      until: day(endMillis - 1)})});
  const response = await (input.fetchImpl ?? fetch)(
    `https://graph.facebook.com/${graphVersion}/${input.adAccountId}` +
    `/insights?${params}`, {headers: {
      Authorization: `Bearer ${input.accessToken}`}, redirect: "error",
    signal: AbortSignal.timeout(20_000)});
  if (!response.ok) {
    await response.body?.cancel().catch(() => undefined);
    throw new Error(`Meta insights request failed (${response.status}).`);
  }
  const body = await response.json() as {data?: unknown};
  if (!Array.isArray(body.data)) throw new Error("Meta insights malformed.");
  return body.data.map((raw) => {
    const row = raw as Record<string, unknown>;
    const spend = Number(row.spend);
    if (!Number.isFinite(spend) || spend < 0) {
      throw new Error("Meta insights spend malformed.");
    }
    return {campaignName: String(row.campaign_name ?? "Campaign")
      .slice(0, 120), spendMinor: Math.round(spend * 100)};
  });
}

/**
 * Stores a month's Meta spend as its ads_meta cost.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {string} month YYYY-MM.
 * @param {MetaAdSpendRow[]} rows Spend per campaign.
 * @param {number} nowMillis Now.
 * @return {Promise<PlatformCostDocument>} The stored cost.
 */
export async function recordMetaAdSpend(db: FirebaseFirestore.Firestore,
  month: string, rows: MetaAdSpendRow[], nowMillis: number):
  Promise<PlatformCostDocument> {
  const cost: PlatformCostDocument = {schemaVersion: 1,
    costId: `${month}_ads_meta`, month, category: "ads_meta",
    amountMinor: rows.reduce((sum, row) => sum + row.spendMinor, 0),
    source: "meta_api", note: `${rows.length} campaigns`.slice(0, 500),
    updatedAtMillis: nowMillis, updatedByUid: null};
  await db.collection(platformCostsCollection).doc(cost.costId).set(cost);
  return cost;
}

/**
 * Reads and stores a month's Meta spend.
 * @param {object} input Firestore, token, account, month and time.
 * @return {Promise<PlatformCostDocument>} The stored cost.
 */
export async function syncMetaAdSpend(input: {
  db: FirebaseFirestore.Firestore; accessToken: string; adAccountId: string;
  month: string; nowMillis: number; fetchImpl?: typeof fetch;
}): Promise<PlatformCostDocument> {
  const rows = await fetchMetaAdSpend(input);
  return recordMetaAdSpend(input.db, input.month, rows, input.nowMillis);
}
