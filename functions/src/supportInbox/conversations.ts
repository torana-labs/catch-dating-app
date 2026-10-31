import {createHash, randomUUID} from "node:crypto";
import * as admin from "firebase-admin";
import {Timestamp} from "firebase-admin/firestore";
import type {
  SupportConversationDocument,
  SupportConversationMessageDocument,
} from "../shared/generated/firestoreAdminTypes";

export const SUPPORT_CONVERSATIONS = "supportConversations";
export const SUPPORT_SAVED_REPLIES = "supportSavedReplies";

export type SupportChannel = SupportConversationDocument["channel"];
type Conversation = SupportConversationDocument;
type Message = SupportConversationMessageDocument;

export interface SupportInboxDeps {
  firestore: () => FirebaseFirestore.Firestore;
  now: () => Timestamp;
  /** Finds the Catch account behind a phone number, if any. */
  findUidByPhone: (phoneE164: string) => Promise<string | null>;
}

export const defaultSupportInboxDeps: SupportInboxDeps = {
  firestore: () => admin.firestore(),
  now: () => Timestamp.now(),
  findUidByPhone: async (phoneE164) => {
    try {
      return (await admin.auth().getUserByPhoneNumber(phoneE164)).uid;
    } catch (error) {
      if ((error as {code?: string}).code === "auth/user-not-found") {
        return null;
      }
      throw error;
    }
  },
};

/**
 * Normalizes a contact address per channel.
 * @param {SupportChannel} channel Channel.
 * @param {string} address Raw address.
 * @return {string} Normalized address.
 */
export function normalizeContactAddress(
  channel: SupportChannel,
  address: string
): string {
  const trimmed = address.trim();
  if (channel === "whatsapp") {
    const digits = trimmed.replace(/[^0-9]/gu, "");
    return `+${digits}`;
  }
  if (channel === "email") return trimmed.toLowerCase();
  return trimmed.startsWith("ig:") ? trimmed : `ig:${trimmed}`;
}

/**
 * One conversation per person per channel.
 * @param {SupportChannel} channel Channel.
 * @param {string} address Normalized address.
 * @return {string} Conversation id.
 */
export function supportConversationId(
  channel: SupportChannel,
  address: string
): string {
  return `${channel}-${createHash("sha256")
    .update(`${channel}:${address}`).digest("hex")}`;
}

/**
 * A masked address for lists: the last digits of a number, the first
 * letter and domain of an email.
 * @param {SupportChannel} channel Channel.
 * @param {string} address Normalized address.
 * @return {string} Label.
 */
export function maskedContactLabel(
  channel: SupportChannel,
  address: string
): string {
  if (channel === "whatsapp") {
    return `${address.slice(0, 3)} ••••• ${address.slice(-5)}`;
  }
  if (channel === "email") {
    const [name, domain] = address.split("@");
    return `${name.slice(0, 1)}•••@${domain ?? ""}`.slice(0, 120);
  }
  return "Instagram";
}

function preview(text: string): string {
  const flat = text.replace(/\s+/gu, " ").trim();
  return flat.length > 160 ? `${flat.slice(0, 157)}...` : flat;
}

async function accountFor(
  deps: SupportInboxDeps,
  channel: SupportChannel,
  address: string
): Promise<{uid: string | null; displayName: string | null;
  audience: Conversation["audience"]; organizerId: string | null}> {
  const uid = channel === "whatsapp" ?
    await deps.findUidByPhone(address) : null;
  if (!uid) {
    return {uid: null, displayName: null, audience: "unknown",
      organizerId: null};
  }
  const db = deps.firestore();
  const [user, managed] = await Promise.all([
    db.collection("users").doc(uid).get(),
    db.collection("organizers").where("hostUserIds", "array-contains", uid)
      .limit(1).get(),
  ]);
  const name = user.data()?.displayName;
  return {
    uid,
    displayName: typeof name === "string" && name.trim() ?
      name.trim().slice(0, 120) : null,
    audience: managed.empty ? "guest" : "organizer",
    organizerId: managed.docs[0]?.id ?? null,
  };
}

export interface RecordMessageInput {
  channel: SupportChannel;
  contactAddress: string;
  displayName: string | null;
  direction: Message["direction"];
  text: string;
  authorUid: string | null;
  sourceEventId: string | null;
  savedReplyId: string | null;
  deliveryState: Message["deliveryState"];
}

/**
 * Appends a message to the person's conversation, creating it when it is
 * new. Inbound messages reopen a closed conversation and start the waiting
 * clock if it is not already running; a recorded reply stops it. Replaying
 * the same source event is a no-op.
 * @param {SupportInboxDeps} deps Dependencies.
 * @param {RecordMessageInput} input Message.
 * @return {Promise<{conversationId: string; messageId: string}>} Ids.
 */
export async function recordSupportMessage(
  deps: SupportInboxDeps,
  input: RecordMessageInput
): Promise<{conversationId: string; messageId: string}> {
  const db = deps.firestore();
  const address = normalizeContactAddress(input.channel, input.contactAddress);
  const conversationId = supportConversationId(input.channel, address);
  const conversationRef = db.collection(SUPPORT_CONVERSATIONS)
    .doc(conversationId);
  const messageId = input.sourceEventId ?
    `src-${createHash("sha256").update(input.sourceEventId).digest("hex")}` :
    `msg-${deps.now().toMillis()}-${randomUUID().slice(0, 12)}`;
  const messageRef = db.doc(
    `${SUPPORT_CONVERSATIONS}/${conversationId}/messages/${messageId}`);
  const existing = await conversationRef.get();
  const account = existing.exists ? null :
    await accountFor(deps, input.channel, address);
  const text = input.text.trim().slice(0, 4000);
  await db.runTransaction(async (tx) => {
    const [conversationSnap, messageSnap] = await Promise.all([
      tx.get(conversationRef),
      tx.get(messageRef),
    ]);
    if (messageSnap.exists) return;
    const now = deps.now();
    const current = conversationSnap.data() as Conversation | undefined;
    const inbound = input.direction === "inbound";
    const outbound = input.direction === "outbound";
    const base: Conversation = current ?? {
      schemaVersion: 1,
      conversationId,
      channel: input.channel,
      contactAddress: address,
      contactLabel: maskedContactLabel(input.channel, address),
      displayName: input.displayName ?? account?.displayName ?? null,
      uid: account?.uid ?? null,
      audience: account?.audience ?? "unknown",
      organizerId: account?.organizerId ?? null,
      subject: preview(text),
      status: "open",
      ownerUid: null,
      waitingSince: null,
      lastInboundAt: null,
      lastOutboundAt: null,
      lastMessageAt: now,
      lastMessagePreview: preview(text),
      messageCount: 0,
      links: [],
      createdAt: now,
      updatedAt: now,
    };
    const next: Conversation = {
      ...base,
      displayName: base.displayName ?? input.displayName,
      messageCount: base.messageCount + 1,
      updatedAt: now,
    };
    if (input.direction !== "note") {
      next.lastMessageAt = now;
      next.lastMessagePreview = preview(text);
    }
    if (inbound) {
      next.lastInboundAt = now;
      next.waitingSince = base.waitingSince ?? now;
      next.status = "open";
    }
    if (outbound) {
      next.lastOutboundAt = now;
      next.waitingSince = null;
      next.status = "waitingOnThem";
    }
    tx.set(conversationRef, next);
    tx.create(messageRef, {
      schemaVersion: 1,
      messageId,
      conversationId,
      direction: input.direction,
      text,
      authorUid: input.authorUid,
      sourceEventId: input.sourceEventId,
      savedReplyId: input.savedReplyId,
      deliveryState: input.deliveryState,
      at: now,
    } satisfies Message);
  });
  return {conversationId, messageId};
}

/**
 * Records a WhatsApp or Instagram message that was not a nomination.
 * @param {SupportInboxDeps} deps Dependencies.
 * @param {object} input Inbound message.
 * @return {Promise<void>} Done.
 */
export async function recordSupportInbound(
  deps: SupportInboxDeps,
  input: {
    channel: "whatsapp" | "instagram";
    contactAddress: string;
    text: string;
    sourceEventId: string;
  }
): Promise<void> {
  if (!input.text.trim()) return;
  await recordSupportMessage(deps, {
    channel: input.channel,
    contactAddress: input.contactAddress,
    displayName: null,
    direction: "inbound",
    text: input.text,
    authorUid: null,
    sourceEventId: input.sourceEventId,
    savedReplyId: null,
    deliveryState: "received",
  });
}

/**
 * Records an inbound WhatsApp text in the person's support conversation.
 * @param {SupportInboxDeps} deps Dependencies.
 * @param {object} receipt Inbound WhatsApp receipt.
 * @return {Promise<void>} Done.
 */
export async function recordWhatsappSupportReceipt(
  deps: SupportInboxDeps,
  receipt: {
    eventId: string;
    eventKind: string;
    messageType?: string | null;
    participantId: string;
    text?: string | null;
  }
): Promise<void> {
  if (receipt.eventKind !== "inbound" || receipt.messageType !== "text" ||
      typeof receipt.text !== "string" ||
      !/^[1-9][0-9]{6,14}$/u.test(receipt.participantId)) {
    return;
  }
  await recordSupportInbound(deps, {
    channel: "whatsapp",
    contactAddress: `+${receipt.participantId}`,
    text: receipt.text,
    sourceEventId: receipt.eventId,
  });
}
