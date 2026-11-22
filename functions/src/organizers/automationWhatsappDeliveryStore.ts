import {readVerifiedWhatsappStatus} from
  "../platform/delivery/verifiedWhatsappStatus";
import type {Firestore} from "firebase-admin/firestore";
import {operationContentHash} from "../operations/durableActions";
import {validateAutomationWhatsappDispatchDocument} from
  "../shared/generated/validators/automationWhatsappDispatchDocument";
import {FirestoreDeliveryOutbox} from "../delivery/firestoreDeliveryOutbox";
import {
  normalizeWhatsappDeliveryStatus,
  type WhatsappDeliveryResult,
} from "../platform/delivery/whatsappDeliveryStatus";
import {automationDeliveryAdapter} from "./automationDelivery";
import {AUTOMATION_WHATSAPP_DISPATCHES} from "./automationDeliveryWorker";
import type {AutomationDeliveryOutbox} from "./automationDeliveryWorker";

export type {WhatsappDeliveryResult};

/**
 * Automation-side half of the WhatsApp status corridor. The ingress queue
 * and signed receipt pair are shared with event assistance, programs, and
 * campaigns; this store verifies the queued event against the claim-time
 * automation dispatch record, then merges the normalized receipt into the
 * automation delivery outbox. It grants no send authority and never
 * performs provider I/O — reconciliation continues even after the
 * companion moment run has completed.
 */
export class AutomationWhatsappDeliveryStore {
  private readonly outbox: AutomationDeliveryOutbox;

  constructor(
    private readonly db: Firestore,
    private readonly clock: () => number = Date.now,
  ) {
    this.outbox = new FirestoreDeliveryOutbox(
      db,
      automationDeliveryAdapter,
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
      AUTOMATION_WHATSAPP_DISPATCHES,
      validateAutomationWhatsappDispatchDocument,
      this.clock,
    );
    if (verified.kind !== "verified") return verified;
    const {queued, receipt, dispatch, attemptId, now} = verified;
    const record = await this.outbox.get(dispatch.messageId);
    const attempt = record?.attempts.find((a) => a.attemptId === attemptId);
    if (
      !record ||
      record.intent.context.mode !== "live" ||
      record.intent.context.ruleId !== dispatch.context.ruleId ||
      record.intent.context.actionId !== dispatch.context.actionId ||
      record.intent.context.contactId !== dispatch.context.contactId ||
      record.intent.context.organizerId !== dispatch.context.organizerId ||
      !attempt ||
      attempt.mode !== "live" ||
      attempt.binding.routeId !== "organizerWhatsappAutomation" ||
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
