import {GUEST_PAYMENTS} from "../../payments/guestPayments";
import {createHash} from "node:crypto";
import {Timestamp} from "firebase-admin/firestore";
import type {OrganizerPaymentConnectionDocument as Connection,
  OrganizerFormPaymentDocument as Payment,
  OrganizerFormPaymentWebhookDocument as Receipt} from
  "../../shared/generated/firestoreAdminTypes";
import {requireDoc} from "../../shared/validation";
import {verifyRazorpayWebhookSignature} from "../razorpay";
import {formWebhookEvents, type RazorpayFormProvider} from
  "./razorpayFormProvider";
import type {RazorpayCredentialVault} from "./razorpayCredentialVault";
import type {FormPaymentProcessor} from "./formPaymentProcessor";
import type {FormPaymentCredentials} from "./formPaymentCredentials";

import {processVerifiedEventPaymentOrder} from
  "../eventCheckout/eventPaymentWebhookDispatch";

interface WebhookDeps {
  db: FirebaseFirestore.Firestore;
  vault: Pick<RazorpayCredentialVault, "access">;
  provider: Pick<RazorpayFormProvider, "fetchPayment" | "fetchOrder">;
  processor: Pick<FormPaymentProcessor, "reconcile">;
  credentials?: Pick<FormPaymentCredentials, "access">;
  now?: () => number;
}

export class InvalidFormPaymentWebhook extends Error {}

/** Accepts exact signed bytes, then stores a minimal retryable receipt. */
export async function recordFormPaymentWebhook(input: {
  connectionId: string; rawBody: Buffer; signature: string | undefined;
  providerEventId: string | undefined;
}, deps: WebhookDeps): Promise<string> {
  if (!/^rpc_[a-f0-9]{32}$/u.test(input.connectionId) ||
      input.rawBody.length > 64 * 1024 || input.rawBody.length === 0) invalid();
  const snap = await deps.db.collection("organizerPaymentConnections")
    .doc(input.connectionId).get();
  if (!snap.exists) invalid();
  const connection = requireDoc<Connection>(snap,
    "OrganizerPaymentConnectionDocument");
  if (!connection.accountId || !connection.secretVersionResource) invalid();
  const credential = await deps.vault.access(connection.secretVersionResource, {
    connectionId: input.connectionId, organizerId: connection.organizerId,
    accountId: connection.accountId, mode: connection.mode,
  });
  const event = parseVerifiedFormWebhook(input.rawBody, input.signature,
    credential.webhookSecret, connection.accountId);
  // Header ids are useful for provider support, but the signed body is the
  // deduplication authority. Changing an unsigned header cannot create work.
  const digest = createHash("sha256").update(input.connectionId)
    .update("\0").update(input.rawBody).digest("hex");
  const receiptId = `fpwh_${digest}`;
  const now = Timestamp.fromMillis((deps.now ?? Date.now)());
  const receipt: Receipt = {connectionId: input.connectionId,
    accountId: connection.accountId,
    providerEventId: input.providerEventId &&
      /^[A-Za-z0-9_-]{1,200}$/u.test(input.providerEventId) ?
      input.providerEventId : digest,
    event: event.event, providerOrderId: event.orderId,
    providerPaymentId: event.paymentId,
    status: event.supported ? "pending" : "ignored",
    createdAt: now, processedAt: event.supported ? null : now,
    nextAttemptAt: now,
    expiresAt: Timestamp.fromMillis(now.toMillis() + 45 * 86400_000),
  };
  await deps.db.runTransaction(async (tx) => {
    const ref = deps.db.collection("organizerFormPaymentWebhooks")
      .doc(receiptId);
    if (!(await tx.get(ref)).exists) tx.create(ref, receipt);
  });
  return receiptId;
}

/** Shared by the HTTP handler, receipt trigger and scheduled recovery. */
export async function processFormPaymentWebhook(receiptId: string,
  deps: WebhookDeps): Promise<void> {
  if (!/^fpwh_[a-f0-9]{64}$/u.test(receiptId)) invalid();
  const ref = deps.db.collection("organizerFormPaymentWebhooks")
    .doc(receiptId);
  const receipt = requireDoc<Receipt>(await ref.get(),
    "OrganizerFormPaymentWebhookDocument");
  if (receipt.status !== "pending") return;
  if (!receipt.connectionId || receipt.platformConfigurationVersion) invalid();
  const connection = requireDoc<Connection>(await deps.db
    .collection("organizerPaymentConnections").doc(receipt.connectionId).get(),
  "OrganizerPaymentConnectionDocument");
  if (connection.accountId !== receipt.accountId ||
      !connection.secretVersionResource) invalid();
  const binding = {
    connectionId: receipt.connectionId, organizerId: connection.organizerId,
    accountId: receipt.accountId, mode: connection.mode,
  };
  const credential = deps.credentials ? await deps.credentials.access(binding) :
    await deps.vault.access(connection.secretVersionResource, binding);
  if (!receipt.providerPaymentId) invalid();
  const providerPayment = await deps.provider.fetchPayment(
    credential.token.accessToken, receipt.providerPaymentId);
  if (!providerPayment.orderId) {
    await deps.db.runTransaction(async (tx) => {
      const current = requireDoc<Receipt>(await tx.get(ref),
        "OrganizerFormPaymentWebhookDocument");
      if (current.status !== "pending") return;
      tx.update(ref, {status: "ignored",
        processedAt: Timestamp.fromMillis((deps.now ?? Date.now)())});
    });
    return;
  }
  if (receipt.providerOrderId &&
      receipt.providerOrderId !== providerPayment.orderId) invalid();
  const order = await deps.provider.fetchOrder(credential.token.accessToken,
    providerPayment.orderId);
  const offerProcessed = await processVerifiedEventPaymentOrder({db: deps.db,
    order, providerPaymentId: receipt.providerPaymentId,
    accountId: receipt.accountId, mode: connection.mode,
    route: "razorpayOAuth", connectionId: receipt.connectionId,
    organizerId: connection.organizerId});
  const candidates = await deps.db.collection(GUEST_PAYMENTS)
    .where("purpose", "==", "form")
    .where("connectionId", "==", receipt.connectionId)
    .where("receipt", "==", order.receipt).limit(2).get();
  if (candidates.docs.length > 1) {
    throw new Error("More than one ledger matches a form payment receipt.");
  }
  const candidate = candidates.docs[0];
  if (candidate) {
    const payment = requireDoc<Payment>(candidate,
      "OrganizerFormPaymentDocument");
    if (payment.accountId !== receipt.accountId ||
        payment.organizerId !== connection.organizerId ||
        payment.amountPaise !== order.amount ||
          payment.currency !== order.currency ||
        payment.providerOrderId &&
          payment.providerOrderId !== order.id) invalid();
    const updated = await deps.processor.reconcile(candidate.id,
      receipt.providerPaymentId);
    if (!updated.providerOrderId ||
        ["orderUnknown", "creatingOrder"].includes(updated.status)) {
      // The webhook may arrive while order creation still owns its lease.
      // Keep the receipt pending instead of acknowledging lost work.
      throw new Error("Form payment order recovery is still pending.");
    }
  }
  await deps.db.runTransaction(async (tx) => {
    const current = requireDoc<Receipt>(await tx.get(ref),
      "OrganizerFormPaymentWebhookDocument");
    if (current.status !== "pending") return;
    tx.update(ref, {
      status: candidate || offerProcessed ? "processed" : "ignored",
      processedAt: Timestamp.fromMillis((deps.now ?? Date.now)())});
  });
}

export function parseVerifiedFormWebhook(rawBody: Buffer,
  signature: string | undefined, secret: string, accountId: string): {
  event: string; supported: boolean; orderId: string | null;
  paymentId: string | null;
} {
  if (rawBody.length > 64 * 1024 ||
      !verifyRazorpayWebhookSignature(rawBody, signature, secret)) invalid();
  let body: unknown;
  try {
    body = JSON.parse(rawBody.toString("utf8"));
  } catch {
    invalid();
  }
  if (!record(body) || body.entity !== "event" ||
    body.account_id !== accountId ||
      typeof body.event !== "string" ||
      !/^[a-z_.]{1,80}$/u.test(body.event)) invalid();
  const supported = (formWebhookEvents as readonly string[])
    .includes(body.event);
  if (!supported) {
    return {event: body.event, supported, orderId: null,
      paymentId: null};
  }
  if (!record(body.payload)) invalid();
  const wrapper = body.payload[body.event.startsWith("refund.") ?
    "refund" : "payment"];
  if (!record(wrapper) || !record(wrapper.entity)) invalid();
  const entity = wrapper.entity;
  const refund = body.event.startsWith("refund.");
  const paymentId = refund ? entity.payment_id : entity.id;
  const orderId = refund ? null : entity.order_id;
  if (entity.entity !== (refund ? "refund" : "payment") ||
      typeof paymentId !== "string" || !/^pay_[A-Za-z0-9]+$/u.test(paymentId) ||
      !refund && orderId !== null && (typeof orderId !== "string" ||
        !/^order_[A-Za-z0-9]+$/u.test(orderId))) invalid();
  return {event: body.event, supported: refund || orderId !== null, paymentId,
    orderId: typeof orderId === "string" ? orderId : null};
}

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function invalid(): never {
  throw new InvalidFormPaymentWebhook("Invalid form payment webhook.");
}
