import * as admin from "firebase-admin";
import {getApp} from "firebase-admin/app";
import {Timestamp} from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import {defineString} from "firebase-functions/params";
import {onDocumentCreated} from "firebase-functions/v2/firestore";
import {SecretManagerServiceClient} from "@google-cloud/secret-manager";
import {adConversionsMetaTokenVersion} from "../adConversions/worker";
import {
  type LeadgenChange,
  allowedPages,
  leadContact,
  metaLeadIntent,
  parseMetaLead,
} from "./protocol";
import {META_LEADGEN_EVENTS} from "./webhook";

const SALES_INBOUND_INTENTS = "salesInboundIntents";
const GRAPH = "https://graph.facebook.com/v26.0";
const MAX_ATTEMPTS = 10;

/** Facebook page IDs whose lead forms Catch takes, comma-separated. */
export const metaLeadgenPageIds = defineString("META_LEADGEN_PAGE_IDS",
  {default: ""});

/** The CatchAds system-user token, from the ad conversions pinned version. */
async function adsToken(version: string): Promise<string> {
  const project = getApp().options.projectId || process.env.GCLOUD_PROJECT;
  if (!project || !version.startsWith(
    `projects/${project}/secrets/CATCH_META_ADS_TOKEN/versions/`)) {
    throw new Error("Lead-form token is misconfigured.");
  }
  const [result] = await new SecretManagerServiceClient()
    .accessSecretVersion({name: version});
  const data = result.payload?.data;
  if (!data) throw new Error("Lead-form token unavailable.");
  return (typeof data === "string" ? data :
    Buffer.from(data).toString("utf8")).trim();
}

export interface LeadProcessDeps {
  db: FirebaseFirestore.Firestore;
  pages: Set<string>;
  token: () => Promise<string>;
  now: () => number;
  fetch?: typeof fetch;
}

/**
 * Fetches one filed lead and creates its sales intent. Returns the outcome
 * code; throws only for a retryable failure so the trigger retries.
 * @param {LeadProcessDeps} deps Dependencies.
 * @param {LeadgenChange} change The receipt.
 * @param {number} attempts Attempts before this one.
 * @return {Promise<string>} Outcome code.
 */
export async function processLeadgenReceipt(deps: LeadProcessDeps,
  change: LeadgenChange, attempts: number): Promise<string> {
  const ref = deps.db.collection(META_LEADGEN_EVENTS).doc(change.leadgenId);
  const finish = (status: string, lastOutcome: string,
    extra: Record<string, unknown> = {}) => ref.update({status, lastOutcome,
    attempts: Math.min(attempts + 1, MAX_ATTEMPTS),
    updatedAt: Timestamp.fromMillis(deps.now()), ...extra});
  if (!deps.pages.has(change.pageId)) {
    await finish("ignored", "page_not_allowed");
    return "page_not_allowed";
  }
  let response: Response;
  try {
    response = await (deps.fetch ?? fetch)(`${GRAPH}/${change.leadgenId}?` +
      "fields=created_time,field_data,form_id,ad_id,campaign_id",
    {headers: {Authorization: `Bearer ${await deps.token()}`},
      redirect: "error", signal: AbortSignal.timeout(10_000)});
  } catch {
    return retryOrFail(finish, attempts, "fetch_transport");
  }
  const text = await response.text().catch(() => "");
  if (!response.ok || text.length > 65_536) {
    // 4xx other than throttling will not fix itself.
    if (response.status >= 400 && response.status < 500 &&
        response.status !== 429) {
      await finish("failed", `fetch_${response.status}`);
      return `fetch_${response.status}`;
    }
    return retryOrFail(finish, attempts, "fetch_uncertain");
  }
  let lead;
  try {
    lead = parseMetaLead(JSON.parse(text));
  } catch {
    lead = null;
  }
  if (!lead) {
    await finish("failed", "lead_unreadable");
    return "lead_unreadable";
  }
  const intent = metaLeadIntent({change, lead, nowMillis: deps.now(),
    timestamp: (millis) => Timestamp.fromMillis(millis)});
  if (!intent) {
    await finish("ignored", "no_contact");
    return "no_contact";
  }
  try {
    await deps.db.collection(SALES_INBOUND_INTENTS).doc(intent.intentId)
      .create(intent);
  } catch (error) {
    if ((error as {code?: unknown}).code !== 6) throw error;
  }
  const contact = leadContact(lead);
  await finish("processed", "intent_created", {intentId: intent.intentId,
    phoneSha256: contact.phoneSha256, emailSha256: contact.emailSha256});
  return "intent_created";
}

async function retryOrFail(finish: (status: string, outcome: string) =>
  Promise<unknown>, attempts: number, code: string): Promise<string> {
  if (attempts + 1 >= MAX_ATTEMPTS) {
    await finish("failed", code);
    return code;
  }
  await finish("pending", code);
  throw new Error(`Lead fetch will be retried: ${code}`);
}

export const onMetaLeadgenEventCreated = onDocumentCreated({
  document: `${META_LEADGEN_EVENTS}/{leadgenId}`,
  retry: true,
}, async (event) => {
  const data = event.data?.data();
  if (!data || data.status !== "pending") return;
  const fresh = (await event.data!.ref.get()).data();
  if (!fresh || fresh.status !== "pending") return;
  const outcome = await processLeadgenReceipt({
    db: admin.firestore(),
    pages: allowedPages(metaLeadgenPageIds.value()),
    token: () => adsToken(adConversionsMetaTokenVersion.value().trim()),
    now: Date.now,
  }, {leadgenId: fresh.leadgenId, pageId: fresh.pageId,
    formId: fresh.formId, adId: fresh.adId}, Number(fresh.attempts) || 0);
  logger.info("Meta lead processed", {leadgenId: fresh.leadgenId, outcome});
});
