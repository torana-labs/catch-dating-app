import {createHash} from "node:crypto";
import type {Firestore} from "firebase-admin/firestore";
import {operationContentHash} from "../operations/durableActions";
import {validateOrganizerMessagingWebhookEventDocument} from
  "../shared/generated/validators/organizerMessagingWebhookEventDocument";
import {validateOrganizerCampaignWebhookReceiptDocument} from
  "../shared/generated/validators/organizerCampaignWebhookReceiptDocument";
import {validateProgramWhatsappDispatchDocument} from
  "../shared/generated/validators/programWhatsappDispatchDocument";
import {FirestoreDeliveryOutbox} from "../delivery/firestoreDeliveryOutbox";
import type {WhatsappDeliveryResult} from
  "../eventSuccess/operations/whatsappDeliveryStore";
import {whatsappAttemptFromStatus, whatsappStatusCorrelation} from
  "../eventSuccess/operations/whatsappDeliveryProtocol";
import {normalizeWhatsappDeliveryStatus} from
  "../eventSuccess/operations/whatsappDeliveryStatus";
import {programDeliveryAdapter} from "./programDelivery";
import {PROGRAM_WHATSAPP_DISPATCHES} from "./programDeliveryWorker";
import type {ProgramDeliveryOutbox} from "./programDeliveryWorker";
import {recordProgramServiceReceipt} from "./programWhatsapp/replies";

export type {WhatsappDeliveryResult};

/**
 * Program-side half of the WhatsApp status corridor. The ingress queue and
 * signed receipt pair are shared with event assistance; this store verifies
 * the queued event against the claim-time program dispatch record, then
 * merges the normalized receipt into the program delivery outbox. It grants
 * no send authority and never performs provider I/O.
 */
export class ProgramWhatsappDeliveryStore {
  private readonly outbox: ProgramDeliveryOutbox;

  constructor(private readonly db: Firestore,
    private readonly clock: () => number = Date.now) {
    this.outbox = new FirestoreDeliveryOutbox(db, programDeliveryAdapter,
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
    const dispatch = (await this.db.collection(PROGRAM_WHATSAPP_DISPATCHES)
      .doc(attemptId).get()).data();
    const now = this.clock();
    if (!Number.isSafeInteger(now) || now < 0) {
      throw new Error("Invalid WhatsApp delivery clock");
    }
    if (!validateProgramWhatsappDispatchDocument(dispatch) ||
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
    if (dispatch.kind === "service") {
      // A free-text reply inside the window has no outbox record; its
      // status moves the programme WhatsApp message forward instead.
      const disposition = await recordProgramServiceReceipt(this.db,
        dispatch, {providerMessageId: queued.providerMessageId,
          deliveryStatus: queued.deliveryStatus}, now);
      return {kind: "recorded", messageId: dispatch.messageId, disposition};
    }
    const record = await this.outbox.get(dispatch.messageId);
    const attempt = record?.attempts.find((a) => a.attemptId === attemptId);
    if (!record || record.intent.context.mode !== "live" ||
        record.intent.context.programId !== dispatch.context.programId ||
        record.intent.context.organizerId !== dispatch.context.organizerId ||
        !attempt || attempt.mode !== "live" ||
        attempt.binding.routeId !== "organizerProgramWhatsapp" ||
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
