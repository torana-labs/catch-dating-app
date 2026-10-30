import * as logger from "firebase-functions/logger";
import {onRequest, type Request} from "firebase-functions/v2/https";
import type {Response} from "express";
import type {HostMembershipWebhookReceiptDocument} from
  "../shared/generated/firestoreAdminTypes";
import {validateOrganizerPaymentConnectionDocument} from
  "../shared/generated/validators/organizerPaymentConnectionDocument";
import type {HostMembershipBillingProvider} from "./billingProvider";
import {recordMembershipCharge, settleMembershipCharge} from "./charges";
import {hostMembershipWebhookReceiptId} from "./ids";
import {applySubscriptionSnapshot, collections} from "./membershipStore";
import {hostMembershipWebhookEvents as subscribedEvents} from
  "./razorpaySubscriptionProvider";
import {
  defaultHostMembershipRuntime,
  type HostMembershipRuntime,
  type MembershipPaymentBinding,
} from "./runtime";

export const hostMembershipWebhookEvents: ReadonlySet<string> =
  new Set(subscribedEvents);

export type HostMembershipWebhookResult =
  | "invalid" | "foreign" | "duplicate" | "ignored" | "applied" | "stale";

interface DeliveringAccount {
  provider: HostMembershipBillingProvider;
  accountId: string;
  deliveredBy: Pick<MembershipPaymentBinding, "moneyFlow" | "bindingId">;
  receiptKey: string;
}

/**
 * A delivery names its account by URL: the organizer merchant webhook Catch
 * registered carries its connection id; Catch's platform webhook carries
 * none. Either way the signature is checked with that account's secret.
 */
async function deliveringAccount(connectionId: string | undefined,
  runtime: HostMembershipRuntime): Promise<DeliveringAccount | null> {
  if (connectionId === undefined) {
    const config = await runtime.platformConfig();
    return {provider: await runtime.platformProvider(),
      accountId: config.platformAccountId,
      deliveredBy: {moneyFlow: "platformSplit", bindingId: ""},
      receiptKey: ""};
  }
  if (!/^rpc_[a-f0-9]{32}$/u.test(connectionId)) return null;
  const snap = await runtime.db().collection("organizerPaymentConnections")
    .doc(connectionId).get();
  const connection = snap.data();
  if (!snap.exists ||
      !validateOrganizerPaymentConnectionDocument(connection) ||
      !connection.accountId || !connection.secretVersionResource) return null;
  // A disconnected merchant still reports renewals of existing members.
  return {provider: await runtime.merchantProvider({
    organizerId: connection.organizerId, connectionId,
    accountId: connection.accountId, mode: connection.mode}),
  accountId: connection.accountId,
  deliveredBy: {moneyFlow: "hostCollected", bindingId: connectionId},
  receiptKey: `${connectionId}\0`};
}

/**
 * Verified provider evidence is the only source of membership status. A
 * foreign or unrecognized delivery writes nothing; a duplicate is dropped by
 * its create-once receipt. Errors propagate so the provider retries.
 */
export async function processHostMembershipWebhook(input: {
  rawBody: Buffer;
  signature: string | undefined;
  providerEventId: string | undefined;
  connectionId?: string;
}, runtime: HostMembershipRuntime = defaultHostMembershipRuntime):
  Promise<HostMembershipWebhookResult> {
  const account = await deliveringAccount(input.connectionId, runtime);
  if (!account) return "invalid";
  const {provider} = account;
  if (typeof input.signature !== "string" ||
      !provider.verifyWebhook(input.rawBody, input.signature)) {
    return "invalid";
  }
  const eventId = typeof input.providerEventId === "string" &&
    /^[A-Za-z0-9_-]{1,120}$/u.test(input.providerEventId) ?
    input.providerEventId : null;
  const event = provider.parseWebhook(input.rawBody, eventId);
  const catchProject = runtime.catchProject();
  if (!event || event.accountId !== account.accountId ||
      !hostMembershipWebhookEvents.has(event.type) || !event.subscription ||
      event.subscription.notes.catchProject !== catchProject) {
    return "foreign";
  }
  const db = runtime.db();
  const nowMillis = runtime.nowMillis();
  const receiptRef = db.collection(collections.receipts).doc(
    hostMembershipWebhookReceiptId(account.receiptKey + (eventId ??
      input.rawBody.toString("base64"))));
  if ((await receiptRef.get()).exists) return "duplicate";

  const applied = await applySubscriptionSnapshot({db,
    snapshot: event.subscription, observedAtMillis: event.createdAtMillis,
    nowMillis, catchProject, deliveredBy: account.deliveredBy});
  let chargeId: string | null = null;
  if (event.type === "subscription.charged" && event.payment &&
      applied.membershipId && applied.outcome !== "ignored") {
    chargeId = await recordMembershipCharge({db, payment: event.payment,
      snapshot: event.subscription, nowMillis});
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
  if (chargeId && account.deliveredBy.moneyFlow === "platformSplit") {
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
  const connectionId = request.query.connectionId;
  if (!Buffer.isBuffer(request.rawBody) ||
      request.rawBody.length > 64 * 1024 ||
      connectionId !== undefined && typeof connectionId !== "string") {
    response.status(400).send("Invalid webhook."); return;
  }
  try {
    const result = await processHostMembershipWebhook({
      rawBody: request.rawBody,
      signature: request.get("x-razorpay-signature"),
      providerEventId: request.get("x-razorpay-event-id"),
      ...(typeof connectionId === "string" ? {connectionId} : {}),
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
