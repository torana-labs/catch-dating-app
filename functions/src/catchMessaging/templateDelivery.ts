import {Timestamp, type Firestore} from "firebase-admin/firestore";
import {MetaProviderError} from
  "../platform/delivery/organizerWhatsappProvider";
import type {SupportInboxDeps} from "../supportInbox/conversations";
import {
  SupportReplyRefused,
  completeSupportWhatsappReply,
  endSupportWhatsappReply,
} from "../supportInbox/whatsappReplies";
import {
  claimSupportWhatsappTemplate,
  type SupportTemplateFacts,
} from "../supportInbox/whatsappTemplates";
import type {CatchTemplateSender} from "./catchSender";
import {CATCH_TEMPLATES, type CatchTemplateName} from "./catchTemplates";
import {reconcileEarlyStatuses} from "./supportConversationReply";
import {CATCH_ENDPOINT_STOPS} from "./whatsappEndpointStops";
import {catchEndpointHash, catchReplyHash, catchStopId} from
  "./whatsappReply";

// The send half of an approved-template message from Catch's number, once
// its Support message is claimed (supportInbox/whatsappTemplates.ts): call
// WhatsApp, then settle the message. An answer from WhatsApp that refuses it
// marks it failed; no answer marks it unknown, because it may still have been
// sent. Neither is ever retried.

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


/** Catch's WhatsApp account and number, and whether this send is on. */
export interface AutomaticTemplateScope {
  enabled: boolean;
  wabaId: string;
  phoneNumberId: string;
}

export type AutomaticTemplateResult = {kind: "unavailable"} |
  {kind: "stopped"} | {kind: "replayed"} |
  {kind: "delivered"; outcome: TemplateDeliveryOutcome};

/**
 * One automatic template from Catch's number, the way every automatic send
 * goes: the number's ids and a sender credential must be present; the
 * Support message is claimed first (never after STOP, and a message id that
 * already exists is a replay, not a second send), together with the
 * caller's own record of the attempt (onClaim); then WhatsApp is called and
 * the message settled. The caller records skips and the settled outcome on
 * its own document, so this module writes no other context's collection.
 * @param {object} input The send and its hooks.
 * @return {Promise<AutomaticTemplateResult>} What happened.
 */
export async function sendAutomaticTemplate(input: {
  db: Firestore;
  scope: AutomaticTemplateScope;
  nowMillis: () => number;
  sender: (scope: AutomaticTemplateScope) =>
    Promise<CatchTemplateSender | null>;
  findUidByPhone: SupportInboxDeps["findUidByPhone"];
  toE164: string;
  displayName: string | null;
  template: CatchTemplateName;
  variables: Record<string, string>;
  messageId: string;
  /** Messages at or after this time are given to check. */
  recentSinceMillis?: number;
  /** The caller's own rule, read inside the claim; throw to refuse. */
  check?: (facts: SupportTemplateFacts) => void;
  onClaim: (tx: FirebaseFirestore.Transaction,
    claimed: {conversationId: string; now: Timestamp}) => void;
}): Promise<AutomaticTemplateResult> {
  const {db, scope} = input;
  if (!/^[0-9]{1,32}$/u.test(scope.wabaId) ||
      !/^[0-9]{1,32}$/u.test(scope.phoneNumberId)) {
    return {kind: "unavailable"};
  }
  let send: CatchTemplateSender | null;
  try {
    send = await input.sender(scope);
  } catch {
    send = null;
  }
  if (!send) return {kind: "unavailable"};

  const template = CATCH_TEMPLATES[input.template];
  const text = template.text(input.variables);
  const bodyHash = catchReplyHash(["template/v1", template.name, text]);
  let claimed: Awaited<ReturnType<typeof claimSupportWhatsappTemplate>>;
  try {
    claimed = await claimSupportWhatsappTemplate({firestore: () => db,
      now: () => Timestamp.fromMillis(input.nowMillis()),
      findUidByPhone: input.findUidByPhone}, {
      contactAddress: input.toE164, displayName: input.displayName,
      messageId: input.messageId, bodyHash, text, subject: template.subject,
      authorUid: null,
    }, {
      stopRef: (address) => db.collection(CATCH_ENDPOINT_STOPS).doc(
        catchStopId(scope, catchEndpointHash(address))),
      recentSinceMillis: input.recentSinceMillis ?? input.nowMillis(),
      check: (facts) => {
        if (facts.stopped) throw new SupportReplyRefused("stopped");
        input.check?.(facts);
      },
      onClaim: input.onClaim,
    });
  } catch (error) {
    if (error instanceof SupportReplyRefused && error.reason === "stopped") {
      return {kind: "stopped"};
    }
    // The same message id already exists (sending, settled or in conflict).
    if (error instanceof SupportReplyRefused) return {kind: "replayed"};
    throw error;
  }
  if (claimed.kind === "replay") return {kind: "replayed"};
  const outcome = await deliverClaimedTemplate(db, {
    scope, conversationId: claimed.conversationId,
    messageId: input.messageId, bodyHash, toE164: input.toE164,
    template: template.name, variables: input.variables, send,
    automatic: true, nowMillis: input.nowMillis,
  });
  return {kind: "delivered", outcome};
}
