import {GUEST_PAYMENTS} from "../../payments/guestPayments";
import * as admin from "firebase-admin";
import {createHash} from "node:crypto";
import {Timestamp} from "firebase-admin/firestore";
import type {OrganizerFormPaymentDocument as Payment,
  OrganizerFormPaymentWebhookDocument as Receipt} from
  "../../shared/generated/firestoreAdminTypes";
import {requireDoc} from "../../shared/validation";
import {razorpayPlatformPaymentConfigVersion} from
  "../razorpayPlatformPaymentConfig";
import {assertPaymentRouteSnapshot} from "../paymentRouting";
import {RazorpayPaymentProvider} from "./razorpayPaymentProvider";
import {loadFormPlatformProfile, routedFormPaymentProcessor} from
  "./formPaymentRoutingRuntime";
import {InvalidFormPaymentWebhook, parseVerifiedFormWebhook,
  processFormPaymentWebhook} from "./formPaymentWebhook";
import {formPaymentRuntime} from "./formPaymentRuntime";
import type {FormPaymentProcessor} from "./formPaymentProcessor";

import {processVerifiedEventPaymentOrder} from
  "../eventCheckout/eventPaymentWebhookDispatch";

/** The public URL must name the current configured profile version. */
export function formRouteWebhookConfigurationVersion(version: string,
  configured = razorpayPlatformPaymentConfigVersion.value().trim()): string {
  if (!/^[1-9][0-9]{0,15}$/u.test(version) ||
      !/^projects\/[a-z][\w-]+\/secrets\/[\w-]+\/versions\/[1-9][0-9]*$/u
        .test(configured)) invalid();
  // Public requests cannot probe arbitrary historic Secret Manager versions.
  // Persisted receipts retain their original profile for background retries.
  if (configured.split("/").at(-1) !== version) invalid();
  return configured;
}

export async function formRouteWebhookRuntime(configurationVersion: string) {
  const profile = await loadFormPlatformProfile(configurationVersion);
  const db = admin.firestore();
  // This transport only locates an existing ledger. Money mutations must use
  // the bound Route processor, which verifies the transfer allocation.
  const provider = new RazorpayPaymentProvider({
    signatureSecret: profile.keySecret,
    authorization: (handle) => {
      if (handle !== profile.keyId) invalid();
      return "Basic " + Buffer.from(`${profile.keyId}:${profile.keySecret}`)
        .toString("base64");
    }});
  return {db, profile, configurationVersion, provider,
    processor: routedFormPaymentProcessor(db), now: Date.now};
}
type RouteWebhookDeps = Awaited<ReturnType<typeof formRouteWebhookRuntime>>;

export async function recordFormRoutePaymentWebhook(input: {
  rawBody: Buffer; signature: string | undefined;
  providerEventId: string | undefined;
}, deps: RouteWebhookDeps): Promise<string> {
  const event = parseVerifiedFormWebhook(input.rawBody, input.signature,
    deps.profile.webhookSecret, deps.profile.platformAccountId);
  const digest = createHash("sha256").update(deps.configurationVersion)
    .update("\0").update(input.rawBody).digest("hex");
  const receiptId = `fpwh_${digest}`;
  const now = Timestamp.fromMillis(deps.now());
  const receipt: Receipt = {connectionId: null,
    platformConfigurationVersion: deps.configurationVersion,
    accountId: deps.profile.platformAccountId,
    providerEventId: input.providerEventId &&
      /^[A-Za-z0-9_-]{1,200}$/u.test(input.providerEventId) ?
      input.providerEventId : digest,
    event: event.event, providerOrderId: event.orderId,
    providerPaymentId: event.paymentId,
    status: event.supported ? "pending" : "ignored",
    createdAt: now, processedAt: event.supported ? null : now,
    nextAttemptAt: now,
    expiresAt: Timestamp.fromMillis(now.toMillis() + 45 * 86400_000)};
  await deps.db.runTransaction(async (tx) => {
    const ref = deps.db.collection("organizerFormPaymentWebhooks")
      .doc(receiptId);
    if (!(await tx.get(ref)).exists) tx.create(ref, receipt);
  });
  return receiptId;
}

export async function processFormRoutePaymentWebhook(receiptId: string,
  deps: RouteWebhookDeps): Promise<void> {
  if (!/^fpwh_[a-f0-9]{64}$/u.test(receiptId)) invalid();
  const ref = deps.db.collection("organizerFormPaymentWebhooks")
    .doc(receiptId);
  const receipt = requireDoc<Receipt>(await ref.get(),
    "OrganizerFormPaymentWebhookDocument");
  if (receipt.status !== "pending") return;
  if (receipt.connectionId !== null ||
      receipt.platformConfigurationVersion !== deps.configurationVersion ||
      receipt.accountId !== deps.profile.platformAccountId ||
      !receipt.providerPaymentId) invalid();
  const providerPayment = await deps.provider.fetchPayment(deps.profile.keyId,
    receipt.providerPaymentId);
  let processed = false;
  if (providerPayment.orderId) {
    if (receipt.providerOrderId &&
        receipt.providerOrderId !== providerPayment.orderId) invalid();
    const order = await deps.provider.fetchOrder(deps.profile.keyId,
      providerPayment.orderId);
    processed = await processVerifiedEventPaymentOrder({db: deps.db, order,
      providerPaymentId: receipt.providerPaymentId,
      accountId: receipt.accountId, mode: deps.profile.mode,
      route: "razorpayRoute"});
    if (/^cfp_[a-f0-9]{32}$/u.test(order.receipt)) {
      const candidates = await deps.db.collection(GUEST_PAYMENTS)
        .where("purpose", "==", "form")
        .where("receipt", "==", order.receipt).limit(2).get();
      if (candidates.docs.length > 1) invalid();
      const candidate = candidates.docs[0];
      if (candidate) {
        const payment = requireDoc<Payment>(candidate,
          "OrganizerFormPaymentDocument");
        if (!payment.routing) invalid();
        assertPaymentRouteSnapshot(payment.routing, {
          organizerId: payment.organizerId, purpose: "formFee",
          currency: payment.currency, amountMinor: payment.amountPaise});
        if (payment.routing.selection.route !== "razorpayRoute" ||
            payment.connectionId !== null ||
            payment.accountId !== receipt.accountId ||
            payment.routing.merchantAccountId !== receipt.accountId ||
            payment.mode !== deps.profile.mode ||
            payment.amountPaise !== order.amount ||
            payment.currency !== order.currency ||
            payment.providerOrderId && payment.providerOrderId !== order.id) {
          invalid();
        }
        const updated = await deps.processor.reconcile(candidate.id,
          receipt.providerPaymentId);
        if (!updated.providerOrderId ||
            ["orderUnknown", "creatingOrder"].includes(updated.status)) {
          throw new Error("Form payment order recovery is still pending.");
        }
        processed = true;
      }
    }
  }
  await deps.db.runTransaction(async (tx) => {
    const current = requireDoc<Receipt>(await tx.get(ref),
      "OrganizerFormPaymentWebhookDocument");
    if (current.status !== "pending") return;
    tx.update(ref, {status: processed ? "processed" : "ignored",
      processedAt: Timestamp.fromMillis(deps.now())});
  });
}

/** Receipt routing is independent of payment defaults and OAuth setup. */
export async function processRecordedFormPaymentWebhook(receiptId: string,
  context: {db: FirebaseFirestore.Firestore;
    processor: Pick<FormPaymentProcessor, "reconcile">}): Promise<void> {
  const receipt = requireDoc<Receipt>(await context.db
    .collection("organizerFormPaymentWebhooks").doc(receiptId).get(),
  "OrganizerFormPaymentWebhookDocument");
  if (receipt.status !== "pending") return;
  if (receipt.platformConfigurationVersion) {
    const runtime = await formRouteWebhookRuntime(
      receipt.platformConfigurationVersion);
    await processFormRoutePaymentWebhook(receiptId, {...runtime, ...context});
  } else {
    const runtime = await formPaymentRuntime();
    await processFormPaymentWebhook(receiptId, {...runtime, ...context});
  }
}

function invalid(): never {
  throw new InvalidFormPaymentWebhook("Invalid platform form payment webhook.");
}
