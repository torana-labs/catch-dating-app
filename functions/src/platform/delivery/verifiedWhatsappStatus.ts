import {createHash} from "node:crypto";
import type {Firestore} from "firebase-admin/firestore";
import {validateOrganizerMessagingWebhookEventDocument} from
  "../../shared/generated/validators/organizerMessagingWebhookEventDocument";
import {validateOrganizerCampaignWebhookReceiptDocument} from
  "../../shared/generated/validators/organizerCampaignWebhookReceiptDocument";
import {
  whatsappAttemptFromStatus,
  whatsappStatusCorrelation,
} from "./whatsappDeliveryProtocol";

interface DispatchProof {
  attemptId: string;
  messageId: string;
  payloadHash: string;
  senderId: string;
  context: {organizerId: string};
  providerAccountId: string;
  providerPhoneNumberId: string;
  endpointHash: string;
  recipientEndpointId: string;
  createdAt: number;
}
/** Verify the shared signed ingress and source-specific immutable dispatch.
 * No send authority is granted by this read-only receipt corridor. */
export async function readVerifiedWhatsappStatus<D extends DispatchProof>(
  db: Firestore,
  eventId: string,
  dispatchCollection: string,
  validateDispatch: (value: unknown) => value is D,
  clock: () => number,
) {
  if (!/^omwe_[a-f0-9]{48}$/.test(eventId) || eventId.length !== 53) {
    return {kind: "rejected" as const};
  }
  const [queuedSnap, receiptSnap] = await Promise.all([
    db.collection("organizerMessagingWebhookEvents").doc(eventId).get(),
    db.collection("organizerCampaignWebhookReceipts").doc(eventId).get(),
  ]);
  const queued = queuedSnap.data();
  const receipt = receiptSnap.data();
  if (
    !validateOrganizerMessagingWebhookEventDocument(queued) ||
    !validateOrganizerCampaignWebhookReceiptDocument(receipt)
  ) {
    return {kind: "rejected" as const};
  }
  const attemptId = whatsappAttemptFromStatus(queued.callbackData);
  if (!attemptId) return {kind: "ignored" as const};
  const dispatch = (
    await db.collection(dispatchCollection).doc(attemptId).get()
  ).data();
  const now = clock();
  if (!Number.isSafeInteger(now) || now < 0) {
    throw new Error("Invalid WhatsApp delivery clock");
  }
  if (
    !validateDispatch(dispatch) ||
    dispatch.attemptId !== attemptId ||
    queued.callbackData !==
      whatsappStatusCorrelation(attemptId, dispatch.payloadHash) ||
    queued.eventKind !== "status" ||
    receipt.eventKind !== "status" ||
    queued.connectionId !== dispatch.senderId ||
    receipt.connectionId !== dispatch.senderId ||
    queued.organizerId !== dispatch.context.organizerId ||
    receipt.organizerId !== dispatch.context.organizerId ||
    queued.providerAccountId !== dispatch.providerAccountId ||
    queued.providerPhoneNumberId !== dispatch.providerPhoneNumberId ||
    queued.endpointHash !== dispatch.endpointHash ||
    dispatch.recipientEndpointId !== "whatsapp:" + dispatch.endpointHash ||
    !queued.providerMessageId ||
    queued.providerMessageId.length > 512 ||
    /\s/.test(queued.providerMessageId) ||
    !queued.providerOccurredAt ||
    !queued.deliveryStatus ||
    queued.hasReply ||
    queued.isStop ||
    queued.inboundReply ||
    queued.inboundBody ||
    queued.contextProviderMessageId ||
    queued.providerEventId !==
      "status:" +
        queued.providerMessageId +
        ":" +
        queued.deliveryStatus +
        ":" +
        millis(queued.providerOccurredAt) ||
    receipt.providerEventId !== queued.providerEventId ||
    eventId !==
      "omwe_" +
        createHash("sha256")
          .update(queued.providerEventId)
          .digest("hex")
          .slice(0, 48) ||
    millis(queued.createdAt) !== millis(receipt.createdAt) ||
    millis(queued.createdAt) < dispatch.createdAt ||
    millis(queued.createdAt) > now ||
    millis(queued.expiresAt) <= now ||
    millis(receipt.expiresAt) <= now ||
    millis(queued.providerOccurredAt) < dispatch.createdAt - 300_000 ||
    millis(queued.providerOccurredAt) > millis(queued.createdAt) + 300_000
  ) {
    return {kind: "rejected" as const};
  }
  return {
    kind: "verified" as const,
    queued,
    receipt,
    dispatch,
    attemptId,
    now,
  };
}

function millis(value: {_seconds: number; _nanoseconds: number}): number {
  return value._seconds * 1000 + value._nanoseconds / 1_000_000;
}
