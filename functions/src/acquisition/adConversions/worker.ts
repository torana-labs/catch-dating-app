import * as admin from "firebase-admin";
import {getApp} from "firebase-admin/app";
import {Timestamp} from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import {defineString} from "firebase-functions/params";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {SecretManagerServiceClient} from "@google-cloud/secret-manager";
import {GoogleAuth, Impersonated} from "google-auth-library";
import {
  AD_CONVERSION_DELIVERIES,
  type Delivery,
  type SendOutcome,
  afterAttempt,
  enqueueHostConversions,
  optedOutCancellation,
} from "./deliveries";
import {isAdMatchingOptedOut} from "../adMatching/optOuts";
import {newHostConversions} from "./hostConversions";
import {sendGoogle, sendMeta} from "./platforms";

/**
 * Delivery is off unless this environment says otherwise. `validate` sends
 * Meta test events (with a test code) and Google validate-only requests and
 * leaves every record pending; `live` records real conversions.
 */
export const adConversionsMode = defineString("AD_CONVERSIONS_MODE",
  {default: "off"});
/** Pinned Secret Manager version of the Meta system-user token. */
export const adConversionsMetaTokenVersion = defineString(
  "AD_CONVERSIONS_META_TOKEN_VERSION", {default: ""});
export const adConversionsMetaTestEventCode = defineString(
  "AD_CONVERSIONS_META_TEST_EVENT_CODE", {default: ""});
/** The ads service account the worker acts as for Google uploads. */
export const adConversionsGoogleServiceAccount = defineString(
  "AD_CONVERSIONS_GOOGLE_SERVICE_ACCOUNT", {default: ""});

export type DeliveryMode = "off" | "validate" | "live";
export function deliveryMode(value: string): DeliveryMode {
  return value === "validate" || value === "live" ? value : "off";
}

const BATCH = 50;

export interface WorkerDeps {
  db: FirebaseFirestore.Firestore;
  mode: DeliveryMode;
  now: () => number;
  metaToken: () => Promise<string>;
  metaTestEventCode: string;
  googleToken: () => Promise<string>;
  quotaProject: string;
  send?: {meta: typeof sendMeta; google: typeof sendGoogle};
}

/**
 * Whether the record may still be sent: the owner's account exists and is
 * not deleted, the event is within the platforms' window, and neither the
 * record's phone or email nor its attached lead's is opted out of ad
 * matching. An opted-out record is dropped whole, never sent without the
 * opted-out key.
 * @param {WorkerDeps} deps Worker dependencies.
 * @param {Delivery} delivery Queue record.
 * @return {Promise<string|null>} A cancellation code, or null to send.
 */
async function cancellation(deps: WorkerDeps, delivery: Delivery):
  Promise<string | null> {
  if (delivery.expiresAt.toMillis() <= deps.now()) return "expired";
  const owner = (await deps.db.collection("users").doc(delivery.uid).get())
    .data();
  if (!owner || owner.deletedAt) return "account_deleted";
  if (await isAdMatchingOptedOut(deps.db, delivery.matching)) {
    return "opted_out";
  }
  if (delivery.metaLeadId) {
    const lead = (await deps.db.collection("metaLeadgenEvents")
      .doc(delivery.metaLeadId).get()).data();
    if (lead && await isAdMatchingOptedOut(deps.db, lead)) return "opted_out";
  }
  return null;
}

/** A lease older than this was interrupted mid-send; both platforms
 * deduplicate by event ID, so sending it again is safe. */
const STALE_LEASE_MILLIS = 10 * 60_000;

async function reclaimStaleLeases(deps: WorkerDeps): Promise<void> {
  const leased = await deps.db.collection(AD_CONVERSION_DELIVERIES)
    .where("status", "==", "sending").limit(BATCH).get();
  for (const doc of leased.docs) {
    const delivery = doc.data() as Delivery;
    if (deps.now() - delivery.updatedAt.toMillis() < STALE_LEASE_MILLIS) {
      continue;
    }
    await doc.ref.update(afterAttempt(delivery,
      {kind: "retry", code: "interrupted"}, deps.now()));
  }
}

/**
 * One worker pass over due records. In `validate` mode nothing changes
 * state except `lastOutcome`; in `live` mode each record is leased, sent once
 * and moved to its next state.
 * @param {WorkerDeps} deps Worker dependencies.
 * @return {Promise<number>} Records attempted.
 */
export async function runAdConversionWorker(deps: WorkerDeps):
  Promise<number> {
  if (deps.mode === "off") return 0;
  const send = deps.send ?? {meta: sendMeta, google: sendGoogle};
  await reclaimStaleLeases(deps);
  // Equality only, so no composite index; due time is checked in code.
  const snap = await deps.db.collection(AD_CONVERSION_DELIVERIES)
    .where("status", "==", "pending").limit(BATCH * 4).get();
  const now = deps.now();
  const due = snap.docs.filter((doc) =>
    (doc.data() as Delivery).nextAttemptAt.toMillis() <= now).slice(0, BATCH);
  let attempted = 0;
  for (const doc of due) {
    const delivery = doc.data() as Delivery;
    const cancelled = await cancellation(deps, delivery);
    if (cancelled === "opted_out") {
      await doc.ref.update(optedOutCancellation(delivery, deps.now()));
      logger.info("Ad conversion opted out", {deliveryId: delivery.deliveryId});
      continue;
    }
    if (cancelled) {
      await doc.ref.update({status: "cancelled", lastOutcome: cancelled,
        updatedAt: Timestamp.fromMillis(deps.now())});
      continue;
    }
    if (deps.mode === "live") {
      const leased = await deps.db.runTransaction(async (tx) => {
        const fresh = (await tx.get(doc.ref)).data() as Delivery | undefined;
        if (fresh?.status !== "pending") return false;
        tx.update(doc.ref, {status: "sending",
          updatedAt: Timestamp.fromMillis(deps.now())});
        return true;
      });
      if (!leased) continue;
    }
    // Without a test code a Meta request would record a real event.
    if (deps.mode === "validate" && delivery.destination === "meta" &&
        !deps.metaTestEventCode) {
      await doc.ref.update({lastOutcome: "meta_test_code_missing",
        updatedAt: Timestamp.fromMillis(deps.now())});
      continue;
    }
    let outcome: SendOutcome;
    try {
      outcome = delivery.destination === "meta" ?
        await send.meta({delivery, token: await deps.metaToken(),
          ...(deps.mode === "validate" ?
            {testEventCode: deps.metaTestEventCode} : {})}) :
        await send.google({delivery, accessToken: await deps.googleToken(),
          validateOnly: deps.mode === "validate",
          quotaProject: deps.quotaProject});
    } catch {
      outcome = {kind: "retry", code: `${delivery.destination}_credential`};
    }
    attempted += 1;
    if (deps.mode === "validate") {
      await doc.ref.update({lastOutcome: outcome.kind === "accepted" ?
        "validated" : outcome.code,
      updatedAt: Timestamp.fromMillis(deps.now())});
    } else {
      await doc.ref.update(afterAttempt(delivery, outcome, deps.now()));
    }
    logger.info("Ad conversion attempt", {deliveryId: delivery.deliveryId,
      mode: deps.mode, outcome: outcome.kind,
      code: outcome.kind === "accepted" ? null : outcome.code});
  }
  return attempted;
}

/**
 * Reads a pinned Secret Manager version in this project. The host
 * customer-list job reads the same CatchAds token through it.
 * @param {string} version Full secret version name.
 * @return {Promise<string>} Secret value.
 */
export async function readPinnedSecret(version: string): Promise<string> {
  const project = getApp().options.projectId || process.env.GCLOUD_PROJECT;
  if (!project || !version.startsWith(`projects/${project}/secrets/`)) {
    throw new Error("Ad conversion credential project mismatch");
  }
  const [value] = await new SecretManagerServiceClient()
    .accessSecretVersion({name: version});
  const data = value.payload?.data;
  if (!data) throw new Error("Ad conversion credential unavailable");
  return (typeof data === "string" ? data :
    Buffer.from(data).toString("utf8")).trim();
}

async function googleAccessToken(serviceAccount: string): Promise<string> {
  if (!/^[a-z][a-z0-9-]{4,28}@[a-z0-9-]+\.iam\.gserviceaccount\.com$/u
    .test(serviceAccount)) {
    throw new Error("Ad conversion Google identity is misconfigured.");
  }
  const sourceClient = await new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  }).getClient();
  const client = new Impersonated({sourceClient, targetPrincipal:
    serviceAccount, targetScopes:
    ["https://www.googleapis.com/auth/datamanager"], lifetime: 600});
  const {token} = await client.getAccessToken();
  if (!token) throw new Error("Ad conversion Google token unavailable");
  return token;
}

/** Enqueues host conversions from growth milestones, only where delivery is
 * on, so dev and staging never hold advertising records. */
export const onAdConversionGrowthFactsWritten = onDocumentWritten({
  document: "organizerGrowthFacts/{organizerId}",
}, async (event) => {
  if (deliveryMode(adConversionsMode.value()) === "off") return;
  const conversions = newHostConversions(event.data?.before.data(),
    event.data?.after.data(), Date.now());
  await enqueueHostConversions({db: admin.firestore(),
    organizerId: event.params.organizerId, conversions,
    nowMillis: Date.now()});
});

export const sendAdConversions = onSchedule({
  schedule: "every 5 minutes",
  timeoutSeconds: 120,
}, async () => {
  const mode = deliveryMode(adConversionsMode.value());
  if (mode === "off") return;
  let metaToken: string | null = null;
  let googleToken: string | null = null;
  await runAdConversionWorker({
    db: admin.firestore(),
    mode,
    now: Date.now,
    metaToken: async () => metaToken ??= await readPinnedSecret(
      adConversionsMetaTokenVersion.value().trim()),
    metaTestEventCode: adConversionsMetaTestEventCode.value().trim(),
    googleToken: async () => googleToken ??= await googleAccessToken(
      adConversionsGoogleServiceAccount.value().trim()),
    quotaProject: getApp().options.projectId ||
      process.env.GCLOUD_PROJECT || "",
  });
});
