import * as admin from "firebase-admin";
import {getApp} from "firebase-admin/app";
import {Timestamp} from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import {defineString} from "firebase-functions/params";
import {onDocumentCreated} from "firebase-functions/v2/firestore";
import {onRequest} from "firebase-functions/v2/https";
import {SecretManagerServiceClient} from "@google-cloud/secret-manager";
import {timingSafeEqual} from "node:crypto";
import {verifyCatchWebhookSignature} from
  "../../catchMessaging/whatsappWebhookProtocol";
import {adConversionsMetaTokenVersion} from "../adConversions/worker";
import {
  type LeadgenChange,
  allowedPages,
  leadContact,
  leadgenChanges,
  metaLeadIntent,
  parseMetaLead,
} from "./protocol";

export const META_LEADGEN_EVENTS = "metaLeadgenEvents";
const SALES_INBOUND_INTENTS = "salesInboundIntents";
const GRAPH = "https://graph.facebook.com/v26.0";
const MAX_BODY_BYTES = 1024 * 1024;
const MAX_ATTEMPTS = 10;
const RETENTION_MILLIS = 180 * 24 * 60 * 60 * 1000;

/** Pinned Secret Manager versions; blank keeps the webhook closed (503). */
export const metaLeadgenAppSecretVersion = defineString(
  "META_LEADGEN_APP_SECRET_VERSION", {default: ""});
export const metaLeadgenVerifyTokenVersion = defineString(
  "META_LEADGEN_VERIFY_TOKEN_VERSION", {default: ""});
/** Facebook page IDs whose lead forms Catch takes, comma-separated. */
export const metaLeadgenPageIds = defineString("META_LEADGEN_PAGE_IDS",
  {default: ""});

const secretCache = new Map<string, Promise<string>>();
function readPinnedSecret(version: string, secret: string): Promise<string> {
  const project = getApp().options.projectId || process.env.GCLOUD_PROJECT;
  if (!project ||
      !version.startsWith(`projects/${project}/secrets/${secret}/versions/`)) {
    return Promise.reject(new Error("Lead-form credential is misconfigured."));
  }
  let value = secretCache.get(version);
  if (!value) {
    value = new SecretManagerServiceClient()
      .accessSecretVersion({name: version}).then(([result]) => {
        const data = result.payload?.data;
        if (!data) throw new Error("Lead-form credential unavailable.");
        return (typeof data === "string" ? data :
          Buffer.from(data).toString("utf8")).trim();
      });
    value.catch(() => secretCache.delete(version));
    secretCache.set(version, value);
  }
  return value;
}

const equal = (actual: unknown, expected: string) => {
  if (typeof actual !== "string" || !expected || actual.length > 1024) {
    return false;
  }
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};

/**
 * Files one verified change as a receipt. Creating by lead ID makes Meta's
 * redeliveries no-ops; the processing trigger runs once per receipt.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {LeadgenChange} change Lead to file.
 * @param {number} nowMillis Receipt time.
 * @return {Promise<boolean>} Whether a new receipt was created.
 */
export async function fileLeadgenReceipt(db: FirebaseFirestore.Firestore,
  change: LeadgenChange, nowMillis: number): Promise<boolean> {
  const now = Timestamp.fromMillis(nowMillis);
  try {
    await db.collection(META_LEADGEN_EVENTS).doc(change.leadgenId).create({
      schemaVersion: 1, leadgenId: change.leadgenId, pageId: change.pageId,
      formId: change.formId, adId: change.adId, receivedAt: now,
      status: "pending", attempts: 0, lastOutcome: null, intentId: null,
      phoneSha256: null, emailSha256: null, updatedAt: now,
      expiresAt: Timestamp.fromMillis(nowMillis + RETENTION_MILLIS),
    });
    return true;
  } catch (error) {
    if ((error as {code?: unknown}).code === 6) return false;
    throw error;
  }
}

export const metaLeadgenWebhook = onRequest({
  maxInstances: 2, concurrency: 10, invoker: "public",
}, async (request, response) => {
  const tokenVersion = metaLeadgenVerifyTokenVersion.value().trim();
  const secretVersion = metaLeadgenAppSecretVersion.value().trim();
  if (!tokenVersion || !secretVersion) {
    response.status(503).send("Lead forms are not configured.");
    return;
  }
  if (request.method === "GET") {
    const verifyToken = await readPinnedSecret(tokenVersion,
      "CATCH_META_LEADGEN_VERIFY_TOKEN");
    const challenge = request.query["hub.challenge"];
    if (request.query["hub.mode"] === "subscribe" &&
        equal(request.query["hub.verify_token"], verifyToken) &&
        typeof challenge === "string" && challenge.length <= 1024) {
      response.status(200).type("text/plain").send(challenge);
    } else {
      response.status(403).send("Forbidden");
    }
    return;
  }
  if (request.method !== "POST") {
    response.status(405).send("Method not allowed");
    return;
  }
  const raw = request.rawBody;
  if (!raw || raw.length > MAX_BODY_BYTES) {
    response.status(413).send("Too large");
    return;
  }
  const appSecret = await readPinnedSecret(secretVersion,
    "CATCH_META_LEADGEN_APP_SECRET");
  if (!verifyCatchWebhookSignature(raw,
    request.header("x-hub-signature-256"), appSecret)) {
    response.status(401).send("Bad signature");
    return;
  }
  let body: unknown;
  try {
    body = JSON.parse(raw.toString("utf8"));
  } catch {
    response.status(400).send("Bad request");
    return;
  }
  const db = admin.firestore();
  const changes = leadgenChanges(body);
  for (const change of changes) {
    await fileLeadgenReceipt(db, change, Date.now());
  }
  response.status(200).send("ok");
});

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
    token: () => readPinnedSecret(adConversionsMetaTokenVersion.value().trim(),
      "CATCH_META_ADS_TOKEN"),
    now: Date.now,
  }, {leadgenId: fresh.leadgenId, pageId: fresh.pageId,
    formId: fresh.formId, adId: fresh.adId}, Number(fresh.attempts) || 0);
  logger.info("Meta lead processed", {leadgenId: fresh.leadgenId, outcome});
});
