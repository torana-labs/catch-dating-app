import {Timestamp} from "firebase-admin/firestore";
import type {
  SupportConversationDocument,
  SupportConversationMessageDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {AdminGetSupportConversationCallableResponse} from
  "../shared/generated/adminGetSupportConversationCallableResponse";
import {SUPPORT_CONVERSATIONS} from "./conversations";

// WhatsApp replies sent from Catch's number to a Support conversation, as
// conversation state: the 24-hour customer-service window, the message that
// stands for one send (it is created as "sending" before WhatsApp is called,
// so a retried request never sends twice), and the delivery statuses
// WhatsApp reports afterwards. The provider call itself lives in
// catchMessaging/supportConversationReply.ts.

type Conversation = SupportConversationDocument;
type Message = SupportConversationMessageDocument;
export type SupportReplyState = NonNullable<
  AdminGetSupportConversationCallableResponse["conversation"]["reply"]>;
export type SupportDeliveryState = Message["deliveryState"];

/**
 * WhatsApp allows a free-form reply only within 24 hours of the person's
 * last message. Outside it, only an approved template message may be sent:
 * that is the seam for templates ("windowClosed" below).
 */
export const WHATSAPP_REPLY_WINDOW_MS = 24 * 60 * 60 * 1000;
/** Stop a minute early so a reply never reaches WhatsApp after it closes. */
export const WHATSAPP_REPLY_WINDOW_MARGIN_MS = 60 * 1000;

/**
 * How staff can reply to a conversation now.
 * @param {Conversation} conversation The conversation.
 * @param {object} facts Whether sending is on, STOP, and the clock.
 * @return {SupportReplyState} Reply mode and why sending is blocked.
 */
export function supportReplyState(
  conversation: Pick<Conversation, "channel" | "lastInboundAt">,
  facts: {sendingOn: boolean; stopped: boolean; nowMillis: number}
): SupportReplyState {
  if (conversation.channel !== "whatsapp") {
    return {mode: "record", canSend: false, blockedReason: null,
      windowClosesAtMillis: null};
  }
  const last = conversation.lastInboundAt?.toMillis() ?? null;
  const windowClosesAtMillis = last === null ? null :
    last + WHATSAPP_REPLY_WINDOW_MS;
  if (!facts.sendingOn) {
    return {mode: "record", canSend: false, blockedReason: "switchedOff",
      windowClosesAtMillis};
  }
  const blockedReason = facts.stopped ? "stopped" as const :
    windowClosesAtMillis === null ? "noInboundMessage" as const :
      facts.nowMillis >= windowClosesAtMillis -
        WHATSAPP_REPLY_WINDOW_MARGIN_MS ? "windowClosed" as const : null;
  return {mode: "send", canSend: blockedReason === null, blockedReason,
    windowClosesAtMillis};
}

function preview(text: string): string {
  const flat = text.replace(/\s+/gu, " ").trim();
  return flat.length > 160 ? `${flat.slice(0, 157)}...` : flat;
}

const messagePath = (conversationId: string, messageId: string) =>
  `${SUPPORT_CONVERSATIONS}/${conversationId}/messages/${messageId}`;

export class SupportReplyRefused extends Error {
  constructor(
    readonly reason: "notFound" | "notWhatsapp" | "conflict" | "sending" |
      "failed" | "unknown" | Exclude<SupportReplyState["blockedReason"], null>,
    readonly deliveryErrorCode: number | null = null
  ) {
    super(reason);
    this.name = "SupportReplyRefused";
  }
}

export interface SupportReplyClaim {
  conversationId: string;
  messageId: string;
  bodyHash: string;
  text: string;
  authorUid: string;
  savedReplyId: string | null;
}

/**
 * Creates the "sending" message for one staff reply, or returns the earlier
 * outcome of the same request. Refuses outside the window, after STOP, or
 * when the request id was used for different text.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {SupportReplyClaim} claim The reply.
 * @param {object} context Clock, STOP document and a hook for the audit row.
 * @return {Promise<object>} The new claim's address, or the replayed message.
 */
export async function claimSupportWhatsappReply(
  db: FirebaseFirestore.Firestore,
  claim: SupportReplyClaim,
  context: {
    now: () => Timestamp;
    stopRef: (contactAddress: string) => FirebaseFirestore.DocumentReference;
    onClaim?: (tx: FirebaseFirestore.Transaction) => void;
  }
): Promise<{kind: "claimed"; contactAddress: string} |
  {kind: "replay"; message: Message}> {
  const conversationRef = db.collection(SUPPORT_CONVERSATIONS)
    .doc(claim.conversationId);
  const messageRef = db.doc(messagePath(claim.conversationId,
    claim.messageId));
  return db.runTransaction(async (tx) => {
    const [conversationSnap, messageSnap] = await Promise.all([
      tx.get(conversationRef), tx.get(messageRef),
    ]);
    const conversation = conversationSnap.data() as Conversation | undefined;
    if (!conversation) throw new SupportReplyRefused("notFound");
    if (conversation.channel !== "whatsapp") {
      throw new SupportReplyRefused("notWhatsapp");
    }
    if (messageSnap.exists) {
      const message = messageSnap.data() as Message;
      if (message.bodyHash !== claim.bodyHash ||
          message.direction !== "outbound") {
        throw new SupportReplyRefused("conflict");
      }
      if (message.deliveryState === "sending") {
        throw new SupportReplyRefused("sending");
      }
      if (message.deliveryState === "failed") {
        throw new SupportReplyRefused("failed",
          message.deliveryErrorCode ?? null);
      }
      if (message.deliveryState === "unknown" || !message.providerMessageId) {
        throw new SupportReplyRefused("unknown");
      }
      return {kind: "replay" as const, message};
    }
    const stop = await tx.get(context.stopRef(conversation.contactAddress));
    const now = context.now();
    const state = supportReplyState(conversation, {sendingOn: true,
      stopped: stop.exists, nowMillis: now.toMillis()});
    if (state.blockedReason) throw new SupportReplyRefused(state.blockedReason);
    tx.update(conversationRef, {
      messageCount: conversation.messageCount + 1,
      updatedAt: now,
    });
    tx.create(messageRef, {
      schemaVersion: 1,
      messageId: claim.messageId,
      conversationId: claim.conversationId,
      direction: "outbound",
      text: claim.text,
      authorUid: claim.authorUid,
      sourceEventId: null,
      savedReplyId: claim.savedReplyId,
      deliveryState: "sending",
      at: now,
      providerMessageId: null,
      bodyHash: claim.bodyHash,
      deliveryErrorCode: null,
    } satisfies Message);
    context.onClaim?.(tx);
    return {kind: "claimed" as const,
      contactAddress: conversation.contactAddress};
  });
}

/**
 * Saves WhatsApp's message id on a claimed reply. The conversation then
 * waits on them, as it does after a recorded reply.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {object} input The claimed reply and WhatsApp's message id.
 * @return {Promise<Message>} The saved message.
 */
export async function completeSupportWhatsappReply(
  db: FirebaseFirestore.Firestore,
  input: {conversationId: string; messageId: string; bodyHash: string;
    providerMessageId: string; now: Timestamp}
): Promise<Message> {
  const conversationRef = db.collection(SUPPORT_CONVERSATIONS)
    .doc(input.conversationId);
  const messageRef = db.doc(messagePath(input.conversationId,
    input.messageId));
  return db.runTransaction(async (tx) => {
    const [conversationSnap, messageSnap] = await Promise.all([
      tx.get(conversationRef), tx.get(messageRef),
    ]);
    const conversation = conversationSnap.data() as Conversation | undefined;
    const message = messageSnap.data() as Message | undefined;
    if (!conversation || !message || message.bodyHash !== input.bodyHash ||
        message.deliveryState !== "sending") {
      throw new Error("Support reply claim changed.");
    }
    const saved: Message = {...message, deliveryState: "accepted",
      providerMessageId: input.providerMessageId};
    tx.update(messageRef, {deliveryState: saved.deliveryState,
      providerMessageId: saved.providerMessageId});
    tx.update(conversationRef, {
      lastOutboundAt: input.now,
      waitingSince: null,
      status: "waitingOnThem",
      lastMessageAt: input.now,
      lastMessagePreview: preview(message.text),
      updatedAt: input.now,
    });
    return saved;
  });
}

/**
 * Marks a claimed reply that WhatsApp refused ("failed") or whose outcome
 * Catch could not learn ("unknown"). Neither is ever sent again.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {object} input The claimed reply and its end state.
 * @return {Promise<void>} Done.
 */
export async function endSupportWhatsappReply(
  db: FirebaseFirestore.Firestore,
  input: {conversationId: string; messageId: string; bodyHash: string;
    state: "failed" | "unknown"; deliveryErrorCode: number | null}
): Promise<void> {
  const messageRef = db.doc(messagePath(input.conversationId,
    input.messageId));
  await db.runTransaction(async (tx) => {
    const message = (await tx.get(messageRef)).data() as Message | undefined;
    if (!message || message.bodyHash !== input.bodyHash ||
        message.deliveryState !== "sending") return;
    tx.update(messageRef, {deliveryState: input.state,
      deliveryErrorCode: input.deliveryErrorCode});
  });
}

const deliveryRank: Partial<Record<SupportDeliveryState, number>> = {
  accepted: 1, sent: 2, failed: 3, delivered: 4, read: 5,
};

/**
 * Positive delivery or read proof outranks failure; failure outranks sent.
 * @param {SupportDeliveryState} current The saved state.
 * @param {string} proposed The reported status.
 * @return {SupportDeliveryState} The state to keep.
 */
export function advanceSupportDelivery(current: SupportDeliveryState,
  proposed: "sent" | "delivered" | "read" | "failed"): SupportDeliveryState {
  const now = deliveryRank[current];
  if (now === undefined) return current;
  return (deliveryRank[proposed] ?? 0) > now ? proposed : current;
}

/**
 * Applies one WhatsApp delivery status to the Support message it belongs to.
 * The conversation is the recipient's, so the lookup is one equality query
 * inside it.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {object} status The status receipt's facts.
 * @return {Promise<string>} applied, unchanged or unmatched.
 */
export async function applySupportWhatsappStatus(
  db: FirebaseFirestore.Firestore,
  status: {conversationId: string; providerMessageId: string;
    deliveryStatus: "sent" | "delivered" | "read" | "failed";
    errorCode: number | null}
): Promise<"applied" | "unchanged" | "unmatched"> {
  const matches = await db
    .collection(`${SUPPORT_CONVERSATIONS}/${status.conversationId}/messages`)
    .where("providerMessageId", "==", status.providerMessageId)
    .limit(2).get();
  if (matches.docs.length !== 1) return "unmatched";
  const ref = db.doc(messagePath(status.conversationId,
    matches.docs[0].id));
  return db.runTransaction(async (tx) => {
    const message = (await tx.get(ref)).data() as Message | undefined;
    if (!message || message.providerMessageId !== status.providerMessageId) {
      return "unmatched" as const;
    }
    const next = advanceSupportDelivery(message.deliveryState,
      status.deliveryStatus);
    if (next === message.deliveryState) return "unchanged" as const;
    tx.update(ref, {deliveryState: next,
      deliveryErrorCode: next === "failed" ? status.errorCode : null});
    return "applied" as const;
  });
}
