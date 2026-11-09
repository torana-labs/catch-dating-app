import {createHash} from "node:crypto";
import type {Firestore} from "firebase-admin/firestore";
import {operationContentHash} from "../operations/durableActions";
import {validateOrganizerMessagingWebhookEventDocument} from
  "../shared/generated/validators/organizerMessagingWebhookEventDocument";
import {validateOrganizerCampaignWebhookReceiptDocument} from
  "../shared/generated/validators/organizerCampaignWebhookReceiptDocument";
import {validateCampaignWhatsappDispatchDocument} from
  "../shared/generated/validators/campaignWhatsappDispatchDocument";
import {FirestoreDeliveryOutbox} from "../delivery/firestoreDeliveryOutbox";
import type {WhatsappDeliveryResult} from
  "../eventSuccess/operations/whatsappDeliveryStore";
import {whatsappAttemptFromStatus, whatsappStatusCorrelation} from
  "../eventSuccess/operations/whatsappDeliveryProtocol";
import {normalizeWhatsappDeliveryStatus} from
  "../eventSuccess/operations/whatsappDeliveryStatus";
import {campaignDeliveryAdapter} from "./campaignDelivery";
import {CAMPAIGN_WHATSAPP_DISPATCHES} from "./campaignDeliveryWorker";
import type {CampaignDeliveryOutbox} from "./campaignDeliveryWorker";

export type {WhatsappDeliveryResult};

/**
 * Campaign-side half of the WhatsApp status corridor. The ingress queue and
 * signed receipt pair are shared with event assistance and programs; this
 * store verifies the queued event against the claim-time campaign dispatch
 * record, then merges the normalized receipt into the campaign delivery
 * outbox. It grants no send authority and never performs provider I/O. The
 * CRM recipient mirror keeps its own providerMessageId correlation in the
 * ingress consumer — this store is the durable delivery history only.
 */
export class CampaignWhatsappDeliveryStore {
  private readonly outbox: CampaignDeliveryOutbox;

  constructor(private readonly db: Firestore,
    private readonly clock: () => number = Date.now) {
    this.outbox = new FirestoreDeliveryOutbox(db, campaignDeliveryAdapter,
      async () => {
        throw new Error("WhatsApp delivery cannot authorize dispatch");
      }, clock);
  }

  async consumeQueued(eventId: string): Promise<WhatsappDeliveryResult> {
    if (!/^omwe_[a-f0-9]{48}$/.test(eventId) || eventId.length !== 53) {
      return {kind: "rejected"};
    }
    const [queuedSnap, receiptSnap] = await Promise.all([
      this.db.collection("organizerMessagingWebhookEvents").doc(eventId).get(),
      this.db.collection("organizerCampaignWebhookReceipts").doc(eventId)
        .get(),
    ]);
    const queued = queuedSnap.data();
    const receipt = receiptSnap.data();
    if (!validateOrganizerMessagingWebhookEventDocument(queued) ||
        !validateOrganizerCampaignWebhookReceiptDocument(receipt)) {
      return {kind: "rejected"};
    }
    const attemptId = whatsappAttemptFromStatus(queued.callbackData);
    if (!attemptId) return {kind: "ignored"};
    const dispatch = (await this.db.collection(CAMPAIGN_WHATSAPP_DISPATCHES)
      .doc(attemptId).get()).data();
    const now = this.clock();
    if (!Number.isSafeInteger(now) || now < 0) {
      throw new Error("Invalid WhatsApp delivery clock");
    }
    if (!validateCampaignWhatsappDispatchDocument(dispatch) ||
        dispatch.attemptId !== attemptId ||
        queued.callbackData !== whatsappStatusCorrelation(attemptId,
          dispatch.payloadHash) || queued.eventKind !== "status" ||
        receipt.eventKind !== "status" ||
        queued.connectionId !== dispatch.senderId ||
        receipt.connectionId !== dispatch.senderId ||
        queued.organizerId !== dispatch.context.organizerId ||
        receipt.organizerId !== dispatch.context.organizerId ||
        queued.providerAccountId !== dispatch.providerAccountId ||
        queued.providerPhoneNumberId !== dispatch.providerPhoneNumberId ||
        queued.endpointHash !== dispatch.endpointHash ||
        dispatch.recipientEndpointId !== "whatsapp:" + dispatch.endpointHash ||
        !queued.providerMessageId || queued.providerMessageId.length > 512 ||
        /\s/.test(queued.providerMessageId) || !queued.providerOccurredAt ||
        !queued.deliveryStatus || queued.hasReply || queued.isStop ||
        queued.inboundReply || queued.inboundBody ||
        queued.contextProviderMessageId ||
        queued.providerEventId !== "status:" + queued.providerMessageId +
          ":" + queued.deliveryStatus + ":" +
          millis(queued.providerOccurredAt) ||
        receipt.providerEventId !== queued.providerEventId ||
        eventId !== "omwe_" + createHash("sha256")
          .update(queued.providerEventId).digest("hex").slice(0, 48) ||
        millis(queued.createdAt) !== millis(receipt.createdAt) ||
        millis(queued.createdAt) < dispatch.createdAt ||
        millis(queued.createdAt) > now ||
        millis(queued.expiresAt) <= now || millis(receipt.expiresAt) <= now ||
        millis(queued.providerOccurredAt) < dispatch.createdAt - 300_000 ||
        millis(queued.providerOccurredAt) >
          millis(queued.createdAt) + 300_000) {
      return {kind: "rejected"};
    }
    const record = await this.outbox.get(dispatch.messageId);
    const attempt = record?.attempts.find((a) => a.attemptId === attemptId);
    if (!record || record.intent.context.mode !== "live" ||
        record.intent.context.campaignId !== dispatch.context.campaignId ||
        record.intent.context.recipientId !==
          dispatch.context.recipientId ||
        record.intent.context.organizerId !== dispatch.context.organizerId ||
        !attempt || attempt.mode !== "live" ||
        (attempt.binding.routeId !== "organizerWhatsappCampaign" &&
          attempt.binding.routeId !== "organizerFollowerWhatsapp") ||
        attempt.binding.senderId !== dispatch.senderId ||
        attempt.binding.bindingRevision !== dispatch.bindingRevision ||
        attempt.binding.recipientEndpointId !==
          dispatch.recipientEndpointId ||
        attempt.binding.fallbackOwner !== "catch" ||
        dispatch.createdAt < attempt.createdAt || now < record.updatedAt ||
        attempt.state.kind === "reserved") return {kind: "rejected"};
    const knownId = "providerMessageId" in attempt.state ?
      attempt.state.providerMessageId : null;
    if (knownId && knownId !== queued.providerMessageId) {
      return {kind: "rejected"};
    }
    const evidenceId = "wa-status:" + operationContentHash([
      attemptId, queued.providerEventId, receipt.payloadHash,
    ]);
    const state = normalizeWhatsappDeliveryStatus(queued, now, evidenceId);
    if (!state) {
      return {kind: "unconfirmed", messageId: record.messageId};
    }
    const result = await this.outbox.recordReceipt(record.messageId, {
      attemptId, ...attempt.binding, providerEventId: evidenceId,
      receivedAt: now, state,
    });
    return {kind: "recorded", messageId: record.messageId,
      disposition: result.disposition};
  }
}

function millis(value: {_seconds: number; _nanoseconds: number}): number {
  return value._seconds * 1000 + value._nanoseconds / 1_000_000;
}
