import {readVerifiedWhatsappStatus} from
  "../../platform/delivery/verifiedWhatsappStatus";
import type {Firestore} from "firebase-admin/firestore";
import {operationContentHash} from "../../operations/durableActions";
import {validateEventApprovalNotificationDispatchDocument} from
  "../../shared/generated/validators/eventApprovalNotificationDispatchDocument";
import {FirestoreDeliveryOutbox} from "../../delivery/firestoreDeliveryOutbox";
import {
  normalizeWhatsappDeliveryStatus,
  type WhatsappDeliveryResult,
} from "../../platform/delivery/whatsappDeliveryStatus";
import {adapter} from "./model";
import {dispatches} from "./worker";
import type {Outbox} from "./worker";

export type {WhatsappDeliveryResult};

/** Approval-specific correlation of the shared signature-verified ingress.
 * Provider receipts cannot authorize a send or change application status. */
export class ApprovalWhatsappReceipts {
  private readonly outbox: Outbox;

  constructor(
    private readonly db: Firestore,
    private readonly clock: () => number = Date.now,
  ) {
    this.outbox = new FirestoreDeliveryOutbox(
      db,
      adapter,
      async () => {
        throw new Error("WhatsApp delivery cannot authorize dispatch");
      },
      clock,
    );
  }

  async consumeQueued(eventId: string): Promise<WhatsappDeliveryResult> {
    const verified = await readVerifiedWhatsappStatus(
      this.db,
      eventId,
      dispatches,
      validateEventApprovalNotificationDispatchDocument,
      this.clock,
    );
    if (verified.kind !== "verified") return verified;
    const {queued, receipt, dispatch, attemptId, now} = verified;
    const record = await this.outbox.get(dispatch.messageId);
    const attempt = record?.attempts.find((a) => a.attemptId === attemptId);
    if (
      !record ||
      record.intent.context.mode !== "live" ||
      operationContentHash(record.intent.context) !==
        operationContentHash(dispatch.context) ||
      record.intent.context.organizerId !== dispatch.context.organizerId ||
      !attempt ||
      attempt.mode !== "live" ||
      attempt.binding.routeId !== "approvalWhatsapp" ||
      attempt.binding.senderId !== dispatch.senderId ||
      attempt.binding.bindingRevision !== dispatch.bindingRevision ||
      attempt.binding.recipientEndpointId !==
        dispatch.recipientEndpointId ||
      attempt.binding.fallbackOwner !== "catch" ||
      dispatch.createdAt < attempt.createdAt ||
      now < record.updatedAt ||
      attempt.state.kind === "reserved"
    ) {
      return {kind: "rejected"};
    }
    const knownId =
      "providerMessageId" in attempt.state ?
        attempt.state.providerMessageId :
        null;
    if (knownId && knownId !== queued.providerMessageId) {
      return {kind: "rejected"};
    }
    const evidenceId =
      "wa-status:" +
      operationContentHash([
        attemptId,
        queued.providerEventId,
        receipt.payloadHash,
      ]);
    const state = normalizeWhatsappDeliveryStatus(queued, now, evidenceId);
    if (!state) {
      return {kind: "unconfirmed", messageId: record.messageId};
    }
    const result = await this.outbox.recordReceipt(record.messageId, {
      attemptId,
      ...attempt.binding,
      providerEventId: evidenceId,
      receivedAt: now,
      state,
    });
    return {
      kind: "recorded",
      messageId: record.messageId,
      disposition: result.disposition,
    };
  }
}
