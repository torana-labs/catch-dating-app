import * as admin from "firebase-admin";
import {getApp} from "firebase-admin/app";
import {Timestamp} from "firebase-admin/firestore";
import {defineString} from "firebase-functions/params";
import {onRequest} from "firebase-functions/v2/https";
import {SecretManagerServiceClient} from "@google-cloud/secret-manager";
import {timingSafeEqual} from "node:crypto";
import {verifyCatchWebhookSignature} from
  "../../catchMessaging/whatsappWebhookProtocol";
import {type LeadgenChange, leadgenChanges} from "./protocol";

export const META_LEADGEN_EVENTS = "metaLeadgenEvents";
const MAX_BODY_BYTES = 1024 * 1024;
const RETENTION_MILLIS = 180 * 24 * 60 * 60 * 1000;

/**
 * Pinned version of CATCH_META_LEADGEN_WEBHOOK, a JSON secret holding the
 * Meta app secret and the webhook verify token. Blank keeps the webhook
 * closed (503).
 */
export const metaLeadgenCredentialVersion = defineString(
  "META_LEADGEN_CREDENTIAL_VERSION", {default: ""});

interface WebhookCredential {appSecret: string; verifyToken: string}

/** Parses the webhook secret; both values must be present and long. */
export function parseWebhookCredential(raw: string): WebhookCredential {
  const value = JSON.parse(raw) as Partial<WebhookCredential>;
  if (typeof value.appSecret !== "string" || value.appSecret.length < 16 ||
      typeof value.verifyToken !== "string" || value.verifyToken.length < 32) {
    throw new Error("Lead-form webhook credential is malformed.");
  }
  return {appSecret: value.appSecret, verifyToken: value.verifyToken};
}

const cache = new Map<string, Promise<WebhookCredential>>();
function webhookCredential(version: string): Promise<WebhookCredential> {
  const project = getApp().options.projectId || process.env.GCLOUD_PROJECT;
  if (!project || !version.startsWith(
    `projects/${project}/secrets/CATCH_META_LEADGEN_WEBHOOK/versions/`)) {
    return Promise.reject(new Error("Lead-form credential is misconfigured."));
  }
  let value = cache.get(version);
  if (!value) {
    value = new SecretManagerServiceClient()
      .accessSecretVersion({name: version}).then(([result]) => {
        const data = result.payload?.data;
        if (!data) throw new Error("Lead-form credential unavailable.");
        return parseWebhookCredential(typeof data === "string" ? data :
          Buffer.from(data).toString("utf8"));
      });
    value.catch(() => cache.delete(version));
    cache.set(version, value);
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
  const version = metaLeadgenCredentialVersion.value().trim();
  if (!version) {
    response.status(503).send("Lead forms are not configured.");
    return;
  }
  if (request.method === "GET") {
    const {verifyToken} = await webhookCredential(version);
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
  const {appSecret} = await webhookCredential(version);
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
