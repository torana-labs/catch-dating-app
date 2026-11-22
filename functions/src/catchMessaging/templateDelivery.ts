import {Timestamp, type Firestore} from "firebase-admin/firestore";
import {MetaProviderError} from
  "../platform/delivery/organizerWhatsappProvider";
import type {SalesInboundIntentsDocument} from
  "../shared/generated/firestoreAdminTypes";
import {
  completeSupportWhatsappReply,
  endSupportWhatsappReply,
} from "../supportInbox/whatsappReplies";
import type {CatchTemplateSender} from "./catchSender";
import type {CatchTemplateName} from "./catchTemplates";
import {reconcileEarlyStatuses} from "./supportConversationReply";

// The send half of an approved-template message from Catch's number, once
// its Support message is claimed (supportInbox/whatsappTemplates.ts): call
// WhatsApp, then settle the message. An answer from WhatsApp that refuses it
// marks it failed; no answer marks it unknown, because it may still have been
// sent. Neither is ever retried. The lead's own record of the send is kept on
// its salesInboundIntents document.

export type TemplateSendRecord = NonNullable<
  SalesInboundIntentsDocument["appLinkWhatsapp"]>;

export interface TemplateDeliveryOutcome {
  state: "accepted" | "failed" | "unknown";
  providerMessageId: string | null;
  deliveryErrorCode: number | null;
  /** The Support message's delivery state after settling. */
  deliveryState: string;
}

/**
 * Sends one claimed template and settles its Support message.
 * @param {Firestore} db Firestore.
 * @param {object} input The claimed message and how to send it.
 * @return {Promise<TemplateDeliveryOutcome>} What happened.
 */
export async function deliverClaimedTemplate(db: Firestore, input: {
  scope: {enabled: boolean; wabaId: string; phoneNumberId: string};
  conversationId: string;
  messageId: string;
  bodyHash: string;
  toE164: string;
  template: CatchTemplateName;
  variables: Record<string, string>;
  send: CatchTemplateSender;
  automatic: boolean;
  nowMillis: () => number;
}): Promise<TemplateDeliveryOutcome> {
  const claimed = {conversationId: input.conversationId,
    messageId: input.messageId, bodyHash: input.bodyHash};
  let providerMessageId: string;
  try {
    providerMessageId = await input.send(input.toE164, input.template,
      input.variables);
  } catch (error) {
    const refused = error instanceof MetaProviderError &&
      (error.httpStatus !== null || error.disposition === "requestNotSent");
    const code = refused ? (error as MetaProviderError).providerCode : null;
    const state = refused ? "failed" as const : "unknown" as const;
    await endSupportWhatsappReply(db, {...claimed, state,
      deliveryErrorCode: code}).catch(() => undefined);
    return {state, providerMessageId: null, deliveryErrorCode: code,
      deliveryState: state};
  }
  try {
    const saved = await completeSupportWhatsappReply(db, {...claimed,
      providerMessageId, now: Timestamp.fromMillis(input.nowMillis()),
      automatic: input.automatic});
    await reconcileEarlyStatuses(db, input.scope, input.conversationId,
      providerMessageId).catch(() => undefined);
    return {state: "accepted", providerMessageId, deliveryErrorCode: null,
      deliveryState: saved.deliveryState};
  } catch {
    // It was sent; the bookkeeping failed, so it reads as unconfirmed.
    await endSupportWhatsappReply(db, {...claimed, state: "unknown",
      deliveryErrorCode: null}).catch(() => undefined);
    return {state: "unknown", providerMessageId, deliveryErrorCode: null,
      deliveryState: "unknown"};
  }
}

/**
 * The fields that settle a lead's record of a send, as dotted updates.
 * @param {string} field appLinkWhatsapp or followUpWhatsapp.
 * @param {TemplateDeliveryOutcome} outcome What happened.
 * @return {object} Update fields.
 */
export function settledRecordUpdate(
  field: "appLinkWhatsapp" | "followUpWhatsapp",
  outcome: TemplateDeliveryOutcome): Record<string, unknown> {
  return {
    [`${field}.state`]: outcome.state,
    [`${field}.providerMessageId`]: outcome.providerMessageId,
    [`${field}.deliveryErrorCode`]: outcome.deliveryErrorCode,
  };
}
