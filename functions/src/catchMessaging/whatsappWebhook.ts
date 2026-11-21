import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {defineSecret, defineString} from "firebase-functions/params";
import {onRequest} from "firebase-functions/v2/https";
import {handleCatchWhatsappWebhook, WEBHOOK_RETENTION_MILLIS} from
  "./whatsappWebhookProtocol";
import type {CatchWebhookEvent} from "./whatsappWebhookProtocol";
import {validateCatchWhatsappWebhookEventDocument} from
  "../shared/generated/validators/catchWhatsappWebhookEventDocument";

import {CATCH_RECEIPTS, isCatchStopReceipt} from
  "./whatsappEndpointStops";
import {CatchIngressDeniedError, persistCatchVerifiedIngressEvent} from
  "./whatsappIngressStore";

export const CATCH_WEBHOOK_COLLECTION = CATCH_RECEIPTS;
const appSecret = defineSecret("CATCH_WHATSAPP_APP_SECRET");
const verifyToken = defineSecret("CATCH_WHATSAPP_WEBHOOK_VERIFY_TOKEN");
const wabaId = defineString("CATCH_WHATSAPP_WABA_ID", {default: ""});
const phoneNumberId = defineString("CATCH_WHATSAPP_PHONE_NUMBER_ID",
  {default: ""});

/**
 * Resolves with the number of events whose denial was committed (evidence row
 * "blocked"). Those are acknowledged: Meta retries anything that is not a 200
 * for seven days, and a retry can only repeat the same committed denial, so a
 * 503 would hold the callback in a week-long loop and starve the events
 * behind it. Any other failure still rejects, so Meta retries it.
 */
export async function persistCatchWhatsappWebhookEvents(
  db: FirebaseFirestore.Firestore, events: CatchWebhookEvent[],
  nowMillis = Date.now()
): Promise<number> {
  const expiresAt = admin.firestore.Timestamp.fromMillis(
    nowMillis + WEBHOOK_RETENTION_MILLIS);
  if (events.length === 0) return 0;
  for (const event of events) {
    if (!validateCatchWhatsappWebhookEventDocument({...event,
      receivedAtMillis: nowMillis, expiresAt: {
        _seconds: expiresAt.seconds, _nanoseconds: expiresAt.nanoseconds,
      }})) throw new Error("Invalid Catch webhook receipt.");
  }
  let denied = 0;
  const persist = async (event: CatchWebhookEvent) => {
    try {
      await persistCatchVerifiedIngressEvent(db, event, nowMillis);
    } catch (error) {
      if (!(error instanceof CatchIngressDeniedError)) throw error;
      denied++;
    }
  };
  // Validate the whole batch above before writing. STOP and its immutable
  // receipt commit together, before any other same-batch receipt can become
  // eligible for a reply. A conflict still durably suppresses the signed STOP,
  // and must not prevent later STOPs in this batch from being attempted.
  let stopFailure: {error: unknown} | undefined;
  for (const event of events.filter(isCatchStopReceipt)) {
    try {
      await persist(event);
    } catch (error) {
      stopFailure ??= {error};
    }
  }
  if (stopFailure) throw stopFailure.error;
  for (const event of events.filter((event) => !isCatchStopReceipt(event))) {
    // Canonical evidence and the immutable receipt share a transaction; a
    // duplicate receipt alone cannot establish eligibility or renew its TTL.
    await persist(event);
  }
  return denied;
}

export const catchWhatsappWebhook = onRequest({
  secrets: [appSecret, verifyToken], maxInstances: 2, concurrency: 10,
  invoker: "public",
}, async (request, response) => {
  const result = await handleCatchWhatsappWebhook({
    method: request.method, query: request.query,
    rawBody: request.rawBody,
    signature: request.header("x-hub-signature-256"),
  }, {wabaId: wabaId.value().trim(),
    phoneNumberId: phoneNumberId.value().trim(), appSecret: appSecret.value(),
    verifyToken: verifyToken.value()}, async (events) => {
    const denied = await persistCatchWhatsappWebhookEvents(admin.firestore(),
      events);
    if (denied > 0) {
      // Counts only: never log message content, senders or secrets.
      logger.warn("Catch WhatsApp webhook recorded blocked ingress",
        {denied, events: events.length});
    }
  });
  if (result.status >= 400 && request.method === "POST") {
    // The body is a fixed reason ("Webhook not configured.", "Webhook storage
    // unavailable.", "Invalid webhook." ...) and carries no request data.
    logger.warn("Catch WhatsApp webhook refused a delivery",
      {status: result.status, reason: result.body});
  } else if (result.status === 503) {
    logger.warn("Catch WhatsApp webhook unavailable", {status: result.status});
  }
  response.type("text/plain").status(result.status).send(result.body);
});
