import {Timestamp, type Firestore} from "firebase-admin/firestore";
import {HttpsError} from "firebase-functions/v2/https";
import {runAssistanceTransaction as transact} from
  "../platform/transactionCallback";
import {isWhatsappStopCommand} from "../organizers/organizerCampaignModel";
import {validateCatchWhatsappWebhookEventDocument} from
  "../shared/generated/validators/catchWhatsappWebhookEventDocument";
import {WEBHOOK_RETENTION_MILLIS, type CatchWebhookEvent} from
  "./whatsappWebhookProtocol";
import {catchEndpointHash, catchStopId, safeMillis} from "./whatsappReply";
import type {CatchEndpointStop} from "./whatsappReply";
import {validateCatchWhatsappEndpointStopDocument} from
  "../shared/generated/validators/catchWhatsappEndpointStopDocument";

export const CATCH_ENDPOINT_STOPS = "catchWhatsappEndpointStops";
export const CATCH_RECEIPTS = "catchWhatsappWebhookEvents";
export type CatchReceipt = CatchWebhookEvent & {
  receivedAtMillis: number; expiresAt: Timestamp;
};

export function readCatchReceipt(value: unknown): CatchReceipt {
  const data = value as CatchReceipt | undefined;
  if (!data || !(data.expiresAt instanceof Timestamp) ||
      !validateCatchWhatsappWebhookEventDocument({...data, expiresAt: {
        _seconds: data.expiresAt.seconds,
        _nanoseconds: data.expiresAt.nanoseconds,
      }})) {
    throw new HttpsError("failed-precondition", "Invalid Catch receipt.");
  }
  return data;
}

export function readCatchStop(value: unknown): CatchEndpointStop {
  if (!validateCatchWhatsappEndpointStopDocument(value) ||
      value.stopId !== catchStopId(value, value.endpointHash)) {
    throw new HttpsError("failed-precondition", "Invalid Catch suppression.");
  }
  return value;
}

/** Never classify truncated text or interactive display labels as STOP. */
export function isCatchStopReceipt(event: CatchWebhookEvent): boolean {
  return event.eventKind === "inbound" && event.messageType === "text" &&
    !event.textTruncated && typeof event.text === "string" &&
    /^[1-9][0-9]{6,14}$/u.test(event.participantId) &&
    isWhatsappStopCommand(event.text);
}

/**
 * Called by Catch ingress AFTER signature and exact configured sender checks.
 * Existing receipt bytes/TTL never change. Suppression has no TTL/reset.
 * Historical receipt-only STOPs still require explicit reconciliation proof
 * before outbound activation; an empty retained-receipt query is not proof.
 */
export async function persistCatchStopReceipt(db: Firestore,
  event: CatchWebhookEvent, nowMillis: number): Promise<void> {
  if (!safeMillis(nowMillis) || !isCatchStopReceipt(event)) {
    throw new Error("Expected a verified Catch text STOP");
  }
  const incoming = readCatchReceipt({...event, receivedAtMillis: nowMillis,
    expiresAt: Timestamp.fromMillis(nowMillis + WEBHOOK_RETENTION_MILLIS)});
  await transact(db, async (tx) => {
    const ref = db.collection(CATCH_RECEIPTS).doc(event.eventId);
    const previous = await tx.get(ref);
    const receipt = previous.exists ? readCatchReceipt(previous.data()) :
      incoming;
    if (!isCatchStopReceipt(receipt) || receipt.eventId !== event.eventId ||
        receipt.wabaId !== event.wabaId ||
        receipt.phoneNumberId !== event.phoneNumberId ||
        receipt.participantId !== event.participantId ||
        receipt.messageId !== event.messageId || receipt.text !== event.text ||
        receipt.providerTimestampSeconds !== event.providerTimestampSeconds) {
      throw new Error("Catch STOP receipt identity conflict");
    }
    const endpointHash = catchEndpointHash("+" + receipt.participantId);
    const stopId = catchStopId(receipt, endpointHash);
    const stopRef = db.collection(CATCH_ENDPOINT_STOPS).doc(stopId);
    const stop = await tx.get(stopRef);
    if (stop.exists) {
      if (readCatchStop(stop.data()).stopId !== stopId) {
        throw new Error("Catch suppression identity conflict");
      }
    } else {
      tx.create(stopRef, readCatchStop({schemaVersion: 1, stopId,
        wabaId: receipt.wabaId, phoneNumberId: receipt.phoneNumberId,
        endpointHash, sourceEventId: receipt.eventId,
        sourceMessageId: receipt.messageId, payloadHash: receipt.payloadHash,
        observedAtMillis: receipt.receivedAtMillis}));
    }
    if (!previous.exists) tx.create(ref, incoming);
  });
}
