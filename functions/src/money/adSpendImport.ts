import * as admin from "firebase-admin";
import {getApp} from "firebase-admin/app";
import * as logger from "firebase-functions/logger";
import {defineString} from "firebase-functions/params";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {SecretManagerServiceClient} from "@google-cloud/secret-manager";
import {GoogleAuth, Impersonated} from "google-auth-library";
import type {PlatformCostDocument} from
  "../shared/generated/firestoreAdminTypes";
import {
  AdSpendError,
  adSpendCost,
  adSpendCostId,
  istDay,
  isImported,
  type AdPlatform,
  type AdSpendRow,
} from "./adSpend";
import {monthOf, previousMonth} from "./billComputation";
import {fetchGoogleAdSpend} from "./googleAdSpend";
import {fetchMetaAdSpend} from "./metaAdSpend";
import {platformCostsCollection} from "./platformCosts";

/**
 * The daily ad spend import: each morning, Meta's and Google's spend for the
 * month so far becomes that month's `ads_meta` and `ads_google` rows in
 * `platformCosts`, which Finance and Growth read. Off unless this
 * environment's `AD_SPEND_IMPORT_MODE` is `live`.
 */
export const adSpendImportMode = defineString("AD_SPEND_IMPORT_MODE",
  {default: "off"});
// The same pinned CatchAds token and ads service account the conversion
// queue uses (functions/src/acquisition/adConversions/worker.ts).
const metaTokenVersion = defineString("AD_CONVERSIONS_META_TOKEN_VERSION",
  {default: ""});
const googleServiceAccount = defineString(
  "AD_CONVERSIONS_GOOGLE_SERVICE_ACCOUNT", {default: ""});

/** Catch's Meta ad account (`tool/ads/meta_campaigns.json`). */
export const META_AD_ACCOUNT = "act_3245368689001899";
/** Catch's Google Ads customer (`tool/ads/google_campaigns.json`). */
export const GOOGLE_ADS_CUSTOMER = "1016806229";
/** Through this day of a month the month before is read again, so spend
 * the platforms settle late still lands in the closed month. */
const settleDays = 3;

export type AdSpendImportMode = "off" | "live";
export function adSpendMode(value: string): AdSpendImportMode {
  return value === "live" ? "live" : "off";
}

export interface AdSpendImportDeps {
  db: FirebaseFirestore.Firestore;
  mode: AdSpendImportMode;
  now: () => number;
  metaToken: () => Promise<string>;
  googleToken: () => Promise<string>;
  fetchImpl?: typeof fetch;
}

export interface AdSpendImportOutcome {
  platform: AdPlatform;
  month: string;
  outcome: "imported" | "imported_today" | "failed";
  amountMinor: number | null;
  campaigns: number | null;
  replacedManual: boolean;
  code: string | null;
}

/**
 * The months to import for a platform: the current month, and the month
 * before while it may still settle or while it has no imported row yet.
 * @param {object} input Firestore, platform and now.
 * @return {Promise<string[]>} Months, newest first.
 */
async function monthsToImport(input: {db: FirebaseFirestore.Firestore;
  platform: AdPlatform; nowMillis: number}): Promise<string[]> {
  const current = monthOf(input.nowMillis);
  const previous = previousMonth(current);
  if (Number(istDay(input.nowMillis).slice(8, 10)) <= settleDays) {
    return [current, previous];
  }
  const stored = (await input.db.collection(platformCostsCollection)
    .doc(adSpendCostId(input.platform, previous)).get()).data() as
    PlatformCostDocument | undefined;
  return isImported(input.platform, stored) ? [current] : [current, previous];
}

/**
 * Imports one platform's month, at most once per India-time day: a row this
 * import already wrote today is left as it is, so a rerun or retry the same
 * day makes no second request and changes nothing. Otherwise the month's
 * row is replaced whole, including a total someone entered by hand.
 * @param {AdSpendImportDeps} deps Dependencies.
 * @param {AdPlatform} platform Ad platform.
 * @param {string} month YYYY-MM.
 * @param {Function} fetchRows Reads the month's campaign rows.
 * @return {Promise<AdSpendImportOutcome>} What happened.
 */
async function importMonth(deps: AdSpendImportDeps, platform: AdPlatform,
  month: string, fetchRows: () => Promise<AdSpendRow[]>):
  Promise<AdSpendImportOutcome> {
  const ref = deps.db.collection(platformCostsCollection)
    .doc(adSpendCostId(platform, month));
  const importedToday = (cost: PlatformCostDocument | undefined) =>
    isImported(platform, cost) &&
    istDay(cost!.updatedAtMillis) === istDay(deps.now());
  const before = (await ref.get()).data() as PlatformCostDocument | undefined;
  const skipped = (cost: PlatformCostDocument): AdSpendImportOutcome => ({
    platform, month, outcome: "imported_today", amountMinor: cost.amountMinor,
    campaigns: null, replacedManual: false, code: null});
  if (importedToday(before)) return skipped(before!);
  const rows = await fetchRows();
  const cost = adSpendCost({platform, month, rows, nowMillis: deps.now()});
  return deps.db.runTransaction(async (tx) => {
    const current = (await tx.get(ref)).data() as PlatformCostDocument |
      undefined;
    if (importedToday(current)) return skipped(current!);
    tx.set(ref, cost);
    return {platform, month, outcome: "imported",
      amountMinor: cost.amountMinor, campaigns: rows.length,
      replacedManual: current?.source === "manual", code: null};
  });
}

/**
 * One import run over both platforms. A platform that fails is logged by
 * its code and the other still imports; nothing is thrown.
 * @param {AdSpendImportDeps} deps Dependencies.
 * @return {Promise<AdSpendImportOutcome[]>} One outcome per platform month.
 */
export async function runAdSpendImport(deps: AdSpendImportDeps):
  Promise<AdSpendImportOutcome[]> {
  if (deps.mode === "off") return [];
  const nowMillis = deps.now();
  const fetchRows = (platform: AdPlatform, accessToken: string,
    month: string): Promise<AdSpendRow[]> => platform === "meta" ?
    fetchMetaAdSpend({accessToken, adAccountId: META_AD_ACCOUNT, month,
      nowMillis, fetchImpl: deps.fetchImpl}) :
    fetchGoogleAdSpend({accessToken, customerId: GOOGLE_ADS_CUSTOMER, month,
      nowMillis, fetchImpl: deps.fetchImpl});
  const tokens: Record<AdPlatform, () => Promise<string>> =
    {meta: deps.metaToken, google: deps.googleToken};
  const outcomes: AdSpendImportOutcome[] = [];
  for (const platform of ["meta", "google"] as const) {
    let token: Promise<string> | null = null;
    const credential = () => token ??= tokens[platform]().catch(() => {
      throw new AdSpendError(`${platform}_credential_unavailable`);
    });
    const months = await monthsToImport({db: deps.db, platform, nowMillis});
    for (const month of months) {
      try {
        outcomes.push(await importMonth(deps, platform, month,
          async () => fetchRows(platform, await credential(), month)));
      } catch (error) {
        const code = error instanceof AdSpendError ? error.code :
          `${platform}_unexpected`;
        outcomes.push({platform, month, outcome: "failed", amountMinor: null,
          campaigns: null, replacedManual: false, code});
        logger.error("Ad spend import failed", {platform, month, code});
      }
    }
  }
  logger.info("Ad spend import", {outcomes});
  return outcomes;
}

/**
 * Reads the pinned CatchAds token. Only a version of CATCH_META_ADS_TOKEN in
 * this project is accepted.
 * @param {string} version Full secret version name.
 * @return {Promise<string>} Token.
 */
async function readMetaToken(version: string): Promise<string> {
  const project = getApp().options.projectId || process.env.GCLOUD_PROJECT;
  if (!project || !version.startsWith(
    `projects/${project}/secrets/CATCH_META_ADS_TOKEN/versions/`)) {
    throw new AdSpendError("meta_credential_misconfigured");
  }
  const [value] = await new SecretManagerServiceClient()
    .accessSecretVersion({name: version});
  const data = value.payload?.data;
  if (!data) throw new AdSpendError("meta_credential_unavailable");
  return (typeof data === "string" ? data :
    Buffer.from(data).toString("utf8")).trim();
}

/**
 * A short-lived Google Ads token: the runtime acts as the keyless ads
 * service account with the `adwords` scope.
 * @param {string} serviceAccount Ads service account email.
 * @return {Promise<string>} Access token.
 */
async function googleAdsToken(serviceAccount: string): Promise<string> {
  if (!/^[a-z][a-z0-9-]{4,28}@[a-z0-9-]+\.iam\.gserviceaccount\.com$/u
    .test(serviceAccount)) {
    throw new AdSpendError("google_credential_misconfigured");
  }
  const sourceClient = await new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  }).getClient();
  const client = new Impersonated({sourceClient,
    targetPrincipal: serviceAccount,
    targetScopes: ["https://www.googleapis.com/auth/adwords"], lifetime: 600});
  const {token} = await client.getAccessToken();
  if (!token) throw new AdSpendError("google_credential_unavailable");
  return token;
}

/** Daily at 05:30 India time, once the platforms have closed yesterday. */
export const importAdSpendDaily = onSchedule({
  schedule: "30 5 * * *",
  timeZone: "Asia/Kolkata",
  timeoutSeconds: 120,
}, async () => {
  const mode = adSpendMode(adSpendImportMode.value().trim());
  if (mode === "off") return;
  await runAdSpendImport({
    db: admin.firestore(),
    mode,
    now: Date.now,
    metaToken: () => readMetaToken(metaTokenVersion.value().trim()),
    googleToken: () => googleAdsToken(googleServiceAccount.value().trim()),
  });
});
