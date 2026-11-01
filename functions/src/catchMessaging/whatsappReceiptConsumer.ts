import {defaultSupportInboxDeps, recordWhatsappSupportReceipt} from
  "../supportInbox/conversations";
import {getFirestore} from "firebase-admin/firestore";
import {defineBoolean, defineString} from "firebase-functions/params";
import {onDocumentCreated, onDocumentWritten} from
  "firebase-functions/v2/firestore";
import type {Firestore} from "firebase-admin/firestore";
import {runAssistanceTransaction as transact} from
  "../eventSuccess/operations/transactionCallback";
import {catchEndpointHash, safeMillis} from "./whatsappReply";
import type {CatchReplyOperation} from "./whatsappReply";
import {CATCH_REPLY_OPERATIONS, readCatchOperation} from "./whatsappReplyStore";
import {CATCH_RECEIPTS, readCatchReceipt, isCatchStopReceipt,
  persistCatchStopReceipt} from "./whatsappEndpointStops";
import type {CatchReceipt} from "./whatsappEndpointStops";
import {routeCatchWhatsappInbound} from "./inboundRouter";
import {inboundRouterDeps, messageNominationsEnabled} from
  "./inboundRouterRuntime";

export interface CatchReceiptScope {wabaId: string; phoneNumberId: string}
function inScope(scope: CatchReceiptScope,
  value: CatchReceiptScope): boolean {
  return /^[0-9]{1,32}$/u.test(scope.wabaId) &&
    /^[0-9]{1,32}$/u.test(scope.phoneNumberId) &&
    scope.wabaId === value.wabaId &&
    scope.phoneNumberId === value.phoneNumberId;
}

/**
 * Receipt-created dispatcher; no provider I/O or send claims. routeInbound,
 * when supplied, receives each in-scope inbound non-STOP receipt (Supply
 * Intake reads nominations out of them); it never sees STOPs or statuses.
 */
export async function processCatchWhatsappReceipt(db: Firestore,
  eventId: string, scope: CatchReceiptScope, nowMillis: number,
  routeInbound?: (receipt: CatchReceipt) => Promise<unknown>):
  Promise<"applied" | "unchanged" | "unmatched" | "deferred"> {
  if (!/^cwhe_[a-f0-9]{64}$/u.test(eventId) || !safeMillis(nowMillis)) {
    throw new Error("Invalid Catch receipt identity");
  }
  const snapshot = await db.collection(CATCH_RECEIPTS).doc(eventId).get();
  if (!snapshot.exists) return "unmatched";
  const event = readCatchReceipt(snapshot.data());
  if (event.eventId !== eventId || !inScope(scope, event)) return "unmatched";
  if (isCatchStopReceipt(event)) {
    // Idempotent repair also supports explicitly replayed retained receipts.
    // This does not prove completeness of history lost to TTL.
    await persistCatchStopReceipt(db, event, nowMillis);
    return "applied";
  }
  if (event.eventKind !== "status") {
    if (event.eventKind === "inbound" && routeInbound) {
      await routeInbound(event);
    }
    return "unchanged";
  }
  const candidates = await db.collection(CATCH_REPLY_OPERATIONS)
    .where("wabaId", "==", event.wabaId)
    .where("phoneNumberId", "==", event.phoneNumberId)
    .where("endpointHash", "==", catchEndpointHash("+" + event.participantId))
    .where("providerMessageId", "==", event.messageId).limit(2).get();
  if (candidates.empty || candidates.docs.length === 0) return "deferred";
  if (candidates.docs.length !== 1) {
    throw new Error("Ambiguous Catch status correlation");
  }
  return consumeCatchReplyStatus(db, candidates.docs[0].id, eventId, nowMillis);
}

/**
 * Operation-completed companion for statuses arriving before result save.
 * Either the receipt-created reader sees the saved operation or this reader
 * sees the already committed receipt. Both revalidate immutable correlation.
 * No mutable processed flag, receipt TTL extension, or unbounded query.
 */
export async function reconcileCatchReplyStatuses(db: Firestore,
  operationId: string, scope: CatchReceiptScope, nowMillis: number):
  Promise<number> {
  if (!/^cwreply_[a-f0-9]{64}$/u.test(operationId) || !safeMillis(nowMillis)) {
    throw new Error("Invalid Catch operation identity");
  }
  const snapshot = await db.collection(CATCH_REPLY_OPERATIONS)
    .doc(operationId).get();
  if (!snapshot.exists) return 0;
  const operation = readCatchOperation(snapshot.data());
  if (operation.operationId !== operationId || !inScope(scope, operation) ||
      operation.state !== "completed" || !operation.providerMessageId) return 0;
  const receipts = await db.collection(CATCH_RECEIPTS)
    .where("wabaId", "==", operation.wabaId)
    .where("phoneNumberId", "==", operation.phoneNumberId)
    .where("eventKind", "==", "status")
    .where("messageId", "==", operation.providerMessageId).limit(51).get();
  if (receipts.docs.length > 50) {
    throw new Error("Catch status reconciliation exceeds bounded scope");
  }
  let applied = 0;
  for (const receipt of receipts.docs) {
    if (await consumeCatchReplyStatus(db, operationId, receipt.id,
      nowMillis) ===
        "applied") applied++;
  }
  return applied;
}

/**
 * Bounded trusted-worker boundary. Reads the immutable receipt itself, never
 * a caller-supplied status. Workers supply an exact operation ID after
 * bounded, sender-scoped correlation.
 * Early receipts stay untouched and return deferred until message ID is saved.
 */
export async function consumeCatchReplyStatus(db: Firestore,
  operationId: string, eventId: string, nowMillis: number):
  Promise<"applied" | "unchanged" | "unmatched" | "deferred"> {
  if (!/^cwreply_[a-f0-9]{64}$/u.test(operationId) ||
      !/^cwhe_[a-f0-9]{64}$/u.test(eventId) || !safeMillis(nowMillis)) {
    throw new Error("Invalid Catch status identity");
  }
  return transact(db, async (tx) => {
    const ref = db.collection(CATCH_REPLY_OPERATIONS).doc(operationId);
    const [operationSnap, eventSnap] = await Promise.all([
      tx.get(ref), tx.get(db.collection(CATCH_RECEIPTS).doc(eventId)),
    ]);
    if (!operationSnap.exists || !eventSnap.exists) return "unmatched";
    const operation = readCatchOperation(operationSnap.data());
    const event = readCatchReceipt(eventSnap.data());
    const at = Number(event.providerTimestampSeconds) * 1000;
    if (operation.operationId !== operationId || event.eventId !== eventId ||
        event.eventKind !== "status" ||
        (event.deliveryStatus !== "failed" && event.errorCodes.length > 0) ||
        event.wabaId !== operation.wabaId ||
        event.phoneNumberId !== operation.phoneNumberId ||
        catchEndpointHash("+" + event.participantId) !==
          operation.endpointHash ||
        !safeMillis(at) || at > event.receivedAtMillis ||
        // Meta has second precision; allow the attempt's containing second.
        at < Math.floor(operation.createdAtMillis / 1000) * 1000 ||
        event.receivedAtMillis > nowMillis || event.expiresAt.toMillis() <=
          nowMillis) return "unmatched";
    if (operation.providerMessageId === null) return "deferred";
    if (operation.providerMessageId !== event.messageId) return "unmatched";
    const nextStatus = advanceCatchDelivery(operation.deliveryStatus,
      event.deliveryStatus!);
    if (nextStatus === operation.deliveryStatus) return "unchanged";
    const next = readCatchOperation({...operation, deliveryStatus: nextStatus,
      deliveryEventId: eventId, deliveryAtMillis: at,
      updatedAtMillis: Math.max(nowMillis, operation.updatedAtMillis)});
    tx.update(ref, {deliveryStatus: next.deliveryStatus,
      deliveryEventId: next.deliveryEventId,
      deliveryAtMillis: next.deliveryAtMillis,
      updatedAtMillis: next.updatedAtMillis});
    return "applied";
  });
}

/**
 * Positive delivery/read proof dominates failure; otherwise failure dominates
 * sent/accepted. All contradictory observations remain immutable receipts.
 * Status never releases claims or grants retry, consent or billing authority.
 */
export function advanceCatchDelivery(current: CatchReplyOperation[
  "deliveryStatus"], proposed: "sent" | "delivered" | "read" | "failed"):
  CatchReplyOperation["deliveryStatus"] {
  const rank = {pending: 0, accepted: 1, sent: 2, failed: 3,
    delivered: 4, read: 5};
  return rank[proposed] > rank[current] ? proposed : current;
}

// This gate enables receipt projection only. It grants no sending authority.
const consumersEnabled = defineBoolean(
  "CATCH_WHATSAPP_RECEIPT_CONSUMERS_ENABLED", {default: false});
const consumerWaba = defineString("CATCH_WHATSAPP_WABA_ID", {default: ""});
const consumerPhone = defineString("CATCH_WHATSAPP_PHONE_NUMBER_ID",
  {default: ""});
export function configuredConsumerScope(): CatchReceiptScope | null {
  if (!consumersEnabled.value()) return null;
  const scope = {wabaId: consumerWaba.value().trim(),
    phoneNumberId: consumerPhone.value().trim()};
  if (!inScope(scope, scope)) throw new Error("Invalid Catch consumer scope");
  return scope;
}

/** Only newly saved provider identity needs the early-receipt companion. */
export function needsCatchStatusReconciliation(
  before: Record<string, unknown> | undefined,
  after: Record<string, unknown> | undefined): boolean {
  return after?.state === "completed" &&
    typeof after.providerMessageId === "string" &&
    after.providerMessageId.length > 0 &&
    (before?.state !== "completed" ||
      before.providerMessageId !== after.providerMessageId);
}

export const onCatchWhatsappWebhookEventCreated = onDocumentCreated({
  document: CATCH_RECEIPTS + "/{eventId}",
  maxInstances: 2, concurrency: 10, retry: true,
}, async (event) => {
  const scope = configuredConsumerScope();
  if (!scope || !event.data) return;
  const db = getFirestore();
  const nominations = messageNominationsEnabled.value();
  // Messages that are not nominations (or anything, while nominations are
  // off) land in the Support inbox for the team.
  const routeInbound = async (receipt: CatchReceipt) => {
    const outcome = nominations ?
      await routeCatchWhatsappInbound(inboundRouterDeps(db, scope), receipt) :
      "support";
    if (outcome === "support" || outcome === "clarify") {
      await recordWhatsappSupportReceipt(defaultSupportInboxDeps, receipt);
    }
  };
  await processCatchWhatsappReceipt(db, event.params.eventId, scope,
    Date.now(), routeInbound);
});

export const onCatchWhatsappReplyOperationWritten = onDocumentWritten({
  document: CATCH_REPLY_OPERATIONS + "/{operationId}",
  maxInstances: 2, concurrency: 10, retry: true,
}, async (event) => {
  const scope = configuredConsumerScope();
  if (!scope || !event.data || !needsCatchStatusReconciliation(
    event.data.before.data(), event.data.after.data())) return;
  await reconcileCatchReplyStatuses(getFirestore(), event.params.operationId,
    scope, Date.now());
});
