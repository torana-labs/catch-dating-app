import type {PlatformCostDocument} from
  "../shared/generated/firestoreAdminTypes";
import {monthWindow} from "./billComputation";

/**
 * What the ad spend imports share: one campaign's spend, the error both
 * fetchers throw, the days a month's import asks for, and the
 * `platformCosts` row a month's spend becomes. Catch's ad accounts bill in
 * INR, so spend is stored in paise.
 */
export type AdPlatform = "meta" | "google";

export interface AdSpendRow {
  campaignName: string;
  spendMinor: number;
}

/**
 * A failed import, named by a short code. The code is all that is logged:
 * never a token, a response body or a provider message.
 */
export class AdSpendError extends Error {
  constructor(readonly code: string) {
    super(`Ad spend import failed: ${code}`);
    this.name = "AdSpendError";
  }
}

const istOffsetMillis = 330 * 60 * 1000;

/**
 * The India-time calendar day an instant falls in.
 * @param {number} millis Epoch millis.
 * @return {string} YYYY-MM-DD.
 */
export function istDay(millis: number): string {
  return new Date(millis + istOffsetMillis).toISOString().slice(0, 10);
}

/**
 * The days to ask an ad platform about for a month: its first day to its
 * last, or to today while the month is still running. Both platforms report
 * in India time (the accounts' time zone).
 * @param {string} month YYYY-MM.
 * @param {number} nowMillis Now.
 * @return {object|null} First and last day, or null for a future month.
 */
export function spendDays(month: string, nowMillis: number):
  {since: string; until: string} | null {
  const {startMillis, endMillis} = monthWindow(month);
  if (nowMillis < startMillis) return null;
  return {since: istDay(startMillis),
    until: istDay(Math.min(endMillis - 1, nowMillis))};
}

const categories: Record<AdPlatform, PlatformCostDocument["category"]> =
  {meta: "ads_meta", google: "ads_google"};
const sources: Record<AdPlatform, PlatformCostDocument["source"]> =
  {meta: "meta_api", google: "google_ads_api"};

/**
 * The cost id a platform's month is stored under.
 * @param {AdPlatform} platform Ad platform.
 * @param {string} month YYYY-MM.
 * @return {string} platformCosts document id.
 */
export function adSpendCostId(platform: AdPlatform, month: string): string {
  return `${month}_${categories[platform]}`;
}

/**
 * Whether a stored cost came from this platform's import.
 * @param {AdPlatform} platform Ad platform.
 * @param {PlatformCostDocument|undefined} cost Stored cost.
 * @return {boolean} True for an imported row.
 */
export function isImported(platform: AdPlatform,
  cost: Pick<PlatformCostDocument, "source"> | undefined): boolean {
  return cost?.source === sources[platform];
}

/**
 * A month's spend as its `platformCosts` row: the campaigns summed, with
 * their count as the note.
 * @param {object} input Platform, month, campaign rows and time.
 * @return {PlatformCostDocument} The row to store.
 */
export function adSpendCost(input: {platform: AdPlatform; month: string;
  rows: AdSpendRow[]; nowMillis: number}): PlatformCostDocument {
  const amountMinor = input.rows.reduce((sum, row) => sum + row.spendMinor, 0);
  const count = input.rows.length;
  return {schemaVersion: 1, costId: adSpendCostId(input.platform, input.month),
    month: input.month, category: categories[input.platform], amountMinor,
    source: sources[input.platform],
    note: `${count} ${count === 1 ? "campaign" : "campaigns"}`,
    updatedAtMillis: input.nowMillis, updatedByUid: null};
}
