import * as logger from "firebase-functions/logger";
import {onRequest, type Request} from "firebase-functions/v2/https";
import type {Response} from "express";
import type {HostMembershipWebhookReceiptDocument} from
  "../shared/generated/firestoreAdminTypes";
import {recordMembershipCharge, settleMembershipCharge} from "./charges";
import {hostMembershipWebhookReceiptId} from "./ids";
import {applySubscriptionSnapshot, collections} from "./membershipStore";
import {
  defaultHostMembershipRuntime,
  hostMembershipFeeBasisPoints,
  type HostMembershipRuntime,
} from "./runtime";

export const hostMembershipWebhookEvents = new Set([
  "subscription.authenticated",
  "subscription.activated",
  "subscription.charged",
  "subscription.pending",
  "subscription.halted",
  "subscription.paused",
  "subscription.resumed",
  "subscription.cancelled",
  "subscription.completed",
  "subscription.updated",
]);

export type HostMembershipWebhookResult =
  | "invalid" | "foreign" | "duplicate" | "ignored" | "applied" | "stale";

/**
 * Verified provider evidence is the only source of membership status. A
 * foreign or unrecognized delivery writes nothing; a duplicate is dropped by
 * its create-once receipt. Errors propagate so the provider retries.
 */
export async function processHostMembershipWebhook(input: {
  rawBody: Buffer;
  signature: string | undefined;
  providerEventId: string | undefined;
}, runtime: HostMembershipRuntime = defaultHostMembershipRuntime):
  Promise<HostMembershipWebhookResult> {
  const config = await runtime.config();
  const provider = runtime.provider(config);
  if (typeof input.signature !== "string" ||
      !provider.verifyWebhook(input.rawBody, input.signature)) {
    return "invalid";
  }
  const eventId = typeof input.providerEventId === "string" &&
    /^[A-Za-z0-9_-]{1,120}$/u.test(input.providerEventId) ?
    input.providerEventId : null;
  const event = provider.parseWebhook(input.rawBody, eventId);
  const catchProject = runtime.catchProject();
  if (!event || event.accountId !== config.platformAccountId ||
      !hostMembershipWebhookEvents.has(event.type) || !event.subscription ||
      event.subscription.notes.catchProject !== catchProject) {
    return "foreign";
  }
  const db = runtime.db();
  const nowMillis = runtime.nowMillis();
  const receiptRef = db.collection(collections.receipts).doc(
    hostMembershipWebhookReceiptId(eventId ??
      input.rawBody.toString("base64")));
  if ((await receiptRef.get()).exists) return "duplicate";

  const applied = await applySubscriptionSnapshot({db,
    snapshot: event.subscription, observedAtMillis: event.createdAtMillis,
    nowMillis, catchProject});
  let chargeId: string | null = null;
  if (event.type === "subscription.charged" && event.payment &&
      applied.membershipId) {
    chargeId = await recordMembershipCharge({db, payment: event.payment,
      snapshot: event.subscription,
      feeBasisPoints: hostMembershipFeeBasisPoints(config), mode: config.mode,
      nowMillis});
  }
  const receipt: HostMembershipWebhookReceiptDocument = {
    schemaVersion: 1, provider: "razorpay", providerEventId: eventId,
    eventType: event.type, subscriptionId: event.subscription.id,
    paymentId: event.payment?.id ?? null, outcome: applied.outcome,
    receivedAtMillis: nowMillis,
  };
  try {
    await receiptRef.create(receipt);
  } catch {
    // A concurrent delivery recorded first; both applied the same snapshot.
    return "duplicate";
  }
  if (chargeId) {
    // Best effort; the reconcile schedule retries any pending transfer.
    await settleMembershipCharge({db, provider, runtime, chargeId,
      nowMillis}).catch(() => undefined);
  }
  return applied.outcome;
}

export async function hostMembershipRazorpayWebhookHandler(
  request: Request, response: Response,
  runtime: HostMembershipRuntime = defaultHostMembershipRuntime):
  Promise<void> {
  response.set("Cache-Control", "no-store");
  if (request.method !== "POST") {
    response.status(405).send("Method not allowed."); return;
  }
  if (!Buffer.isBuffer(request.rawBody) ||
      request.rawBody.length > 64 * 1024) {
    response.status(400).send("Invalid webhook."); return;
  }
  try {
    const result = await processHostMembershipWebhook({
      rawBody: request.rawBody,
      signature: request.get("x-razorpay-signature"),
      providerEventId: request.get("x-razorpay-event-id"),
    }, runtime);
    if (result === "invalid") {
      response.status(400).send("Invalid webhook."); return;
    }
    response.status(200).send("Recorded.");
  } catch {
    // Never log payloads; they carry member and payment identifiers.
    logger.warn("Host membership webhook processing unavailable");
    response.status(503).send("Please retry.");
  }
}

export const hostMembershipRazorpayWebhook = onRequest(
  {timeoutSeconds: 60, maxInstances: 10, invoker: "public"},
  (request, response) => hostMembershipRazorpayWebhookHandler(request,
    response));
