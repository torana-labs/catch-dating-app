import {Timestamp} from "firebase-admin/firestore";
import type {
  SupportConversationDocument,
  SupportConversationMessageDocument,
} from "../shared/generated/firestoreAdminTypes";
import {
  SUPPORT_CONVERSATIONS,
  accountFor,
  maskedContactLabel,
  normalizeContactAddress,
  preview,
  supportConversationId,
  type SupportInboxDeps,
} from "./conversations";
import {SupportReplyRefused} from "./whatsappReplies";

// Approved WhatsApp template messages sent from Catch's number, as Support
// conversation state. Unlike a free-form reply, a template may go out when
// the person has never written or their 24-hour window has closed, so the
// send can start the conversation. As with replies, the message is created as
// "sending" before WhatsApp is called and its id stands for the one send, so
// a retry finds it and never sends twice; completeSupportWhatsappReply and
// endSupportWhatsappReply settle it, and WhatsApp's statuses move it on.

type Conversation = SupportConversationDocument;
type Message = SupportConversationMessageDocument;

/** Only messages this recent are read for a sender's own rules. */
export const TEMPLATE_RECENT_SCAN_LIMIT = 200;

export interface SupportTemplateClaim {
  /** The WhatsApp number, E.164. */
  contactAddress: string;
  /** A name to show when the send starts the conversation. */
  displayName: string | null;
  messageId: string;
  bodyHash: string;
  text: string;
  /** The conversation's subject when the send starts it. */
  subject: string;
  /** Staff who sent it; null for Catch's own automatic send. */
  authorUid: string | null;
}

export interface SupportTemplateFacts {
  conversation: Conversation | null;
  stopped: boolean;
  nowMillis: number;
  /** Messages in the conversation at or after recentSinceMillis. */
  recent: Message[];
}

/**
 * Creates the "sending" message for one template send, starting the
 * conversation when the person has none, or returns the earlier outcome of
 * the same message id. The sender's own rules (STOP, its window and repeat
 * rules) run as check, inside the same transaction, and throw to refuse.
 * @param {SupportInboxDeps} deps Firestore, clock and account lookup.
 * @param {SupportTemplateClaim} claim The send.
 * @param {object} context STOP document, the rule check, how far back to
 *     read recent messages, and a hook for writes that commit with it.
 * @return {Promise<object>} The claim's conversation, or the replay.
 */
export async function claimSupportWhatsappTemplate(
  deps: SupportInboxDeps,
  claim: SupportTemplateClaim,
  context: {
    stopRef: (contactAddress: string) => FirebaseFirestore.DocumentReference;
    recentSinceMillis: number;
    check: (facts: SupportTemplateFacts) => void;
    onClaim?: (tx: FirebaseFirestore.Transaction,
      claimed: {conversationId: string; now: Timestamp}) => void;
  }
): Promise<{kind: "claimed"; conversationId: string} |
  {kind: "replay"; conversationId: string; message: Message}> {
  const db = deps.firestore();
  const address = normalizeContactAddress("whatsapp", claim.contactAddress);
  const conversationId = supportConversationId("whatsapp", address);
  const conversationRef = db.collection(SUPPORT_CONVERSATIONS)
    .doc(conversationId);
  const messages = db.collection(
    `${SUPPORT_CONVERSATIONS}/${conversationId}/messages`);
  const messageRef = messages.doc(claim.messageId);
  const existing = await conversationRef.get();
  const account = existing.exists ? null :
    await accountFor(deps, "whatsapp", address);
  return db.runTransaction(async (tx) => {
    const [conversationSnap, messageSnap, stop] = await Promise.all([
      tx.get(conversationRef), tx.get(messageRef),
      tx.get(context.stopRef(address)),
    ]);
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
      return {kind: "replay" as const, conversationId, message};
    }
    const now = deps.now();
    const current = conversationSnap.data() as Conversation | undefined;
    const recent = current ? (await tx.get(messages
      .where("at", ">=", Timestamp.fromMillis(context.recentSinceMillis))
      .limit(TEMPLATE_RECENT_SCAN_LIMIT))).docs
      .map((doc) => doc.data() as Message) : [];
    context.check({conversation: current ?? null, stopped: stop.exists,
      nowMillis: now.toMillis(), recent});
    const text = claim.text.trim().slice(0, 4000);
    if (current) {
      tx.update(conversationRef, {messageCount: current.messageCount + 1,
        updatedAt: now});
    } else {
      // A thread Catch started has nobody waiting on Catch.
      tx.set(conversationRef, {
        schemaVersion: 1,
        conversationId,
        channel: "whatsapp",
        contactAddress: address,
        contactLabel: maskedContactLabel("whatsapp", address),
        displayName: claim.displayName ?? account?.displayName ?? null,
        uid: account?.uid ?? null,
        audience: account?.audience ?? "unknown",
        organizerId: account?.organizerId ?? null,
        subject: preview(claim.subject),
        status: "waitingOnThem",
        ownerUid: null,
        waitingSince: null,
        lastInboundAt: null,
        lastOutboundAt: null,
        lastMessageAt: now,
        lastMessagePreview: preview(text),
        messageCount: 1,
        links: [],
        createdAt: now,
        updatedAt: now,
      } satisfies Conversation);
    }
    tx.create(messageRef, {
      schemaVersion: 1,
      messageId: claim.messageId,
      conversationId,
      direction: "outbound",
      text,
      authorUid: claim.authorUid,
      sourceEventId: null,
      savedReplyId: null,
      deliveryState: "sending",
      at: now,
      providerMessageId: null,
      bodyHash: claim.bodyHash,
      deliveryErrorCode: null,
    } satisfies Message);
    context.onClaim?.(tx, {conversationId, now});
    return {kind: "claimed" as const, conversationId};
  });
}

