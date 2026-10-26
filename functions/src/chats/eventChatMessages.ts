import {Timestamp} from "firebase-admin/firestore";
import {HttpsError, onCall, type CallableRequest} from
  "firebase-functions/v2/https";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptionsWithLimits} from "../shared/callableOptions";
import {requireDoc, validateCallableWithAjv} from "../shared/validation";
import {moderateText} from "../moderation/textFilter";
import {dispatchEventChatNotificationCandidates} from
  "./eventChatNotificationPolicy";
import {eventChatMembershipId, requireEventChatMember,
  readEventChatAccount, requireEventChatActor} from "./eventChatAccess";
import {chatHash, chatIdentityReader, emptyReactionCounts, eventChatReactionId,
  messageDefaults, messageUnavailable, nextChatRevision, readableChatMessage,
  type EventChatMessageDeps} from "./eventChatMessageShared";
import type {EventChatMessageDocument as Message,
  EventChatReactionDocument as Reaction, EventChatPresenceDocument as Presence,
  EventChatAccessReceiptDocument as Receipt, ModerationFlagDocument} from
  "../shared/generated/firestoreAdminTypes";
import {validateSendEventChatMessageCallablePayload} from
  "../shared/generated/validators/sendEventChatMessageInput";
import {validateSetEventChatReactionCallablePayload} from
  "../shared/generated/validators/setEventChatReactionInput";
import {validateSetEventChatTypingCallablePayload} from
  "../shared/generated/validators/setEventChatTypingInput";
import type {SendEventChatMessageCallableResponse} from
  "../shared/generated/sendEventChatMessageCallableResponse";
import type {SetEventChatReactionCallableResponse} from
  "../shared/generated/setEventChatReactionCallableResponse";
import type {SetEventChatTypingCallableResponse} from
  "../shared/generated/setEventChatTypingCallableResponse";

export async function sendEventChatMessageHandler(
  request: CallableRequest<unknown>,
  deps: EventChatMessageDeps = messageDefaults
): Promise<SendEventChatMessageCallableResponse> {
  const uid = requireAuth(request);
  const data = validateCallableWithAjv(request,
    validateSendEventChatMessageCallablePayload);
  requireEventChatActor(uid, data.expectedUid);
  const text = data.text.trim();
  if (!text) throw new HttpsError("invalid-argument", "Write a message first.");
  const moderation = moderateText(text);
  if (moderation.action === "block") {
    throw new HttpsError("invalid-argument",
      "Please revise this message before sending.");
  }
  const db = deps.db();
  await deps.rateLimit(db, uid, "sendEventChatMessage", {
    maxRequests: 30, windowMs: 60 * 1000,
  });
  const messageRef = db.collection("eventChatMessages")
    .doc(chatHash([data.eventId, uid, data.requestId]));
  const kind = data.kind ?? "text";
  const payloadHash = chatHash(kind === "text" ?
    [text, data.replyToMessageId] : [text, data.replyToMessageId, kind]);
  const result = await db.runTransaction(async (tx) => {
    const access = await requireEventChatMember(db, tx, data.eventId, uid,
      deps.now().toMillis());
    if (!access.view.canPostMessages ||
        (kind === "announcement" && !access.view.canManage) ||
        (access.view.room.status === "announcementsOnly" &&
          kind !== "announcement")) throw messageUnavailable();
    const existing = await tx.get(messageRef);
    if (existing.exists) {
      const message = requireDoc<Message>(existing, "EventChatMessageDocument");
      if (message.uid !== uid || message.eventId !== data.eventId ||
          message.organizerId !== access.view.organizerId ||
          message.payloadHash !== payloadHash) {
        throw new HttpsError("already-exists",
          "This request was already used.");
      }
      return {messageId: existing.id, sequence: message.sequence,
        replayed: true};
    }
    if (data.replyToMessageId !== null) {
      const parent = await tx.get(db.collection("eventChatMessages")
        .doc(data.replyToMessageId));
      const message = parent.exists ? requireDoc<Message>(parent,
        "EventChatMessageDocument") : null;
      if (!await readableChatMessage(message, data.eventId,
        access.view.organizerId, chatIdentityReader(db, tx, uid))) {
        throw messageUnavailable();
      }
    }
    const last = access.room?.lastMessageSequence ?? 0;
    const sequence = nextChatRevision(last, last);
    const now = deps.now();
    tx.create(messageRef, {eventId: data.eventId,
      organizerId: access.view.organizerId, uid, sequence, text,
      kind,
      replyToMessageId: data.replyToMessageId, status: "visible", payloadHash,
      reactionCounts: emptyReactionCounts(), createdAt: now, removedAt: null,
    } satisfies Message);
    tx.update(db.collection("eventChatRooms").doc(data.eventId), {
      lastMessageSequence: sequence,
    });
    if (moderation.action === "flag") {
      tx.create(db.collection("moderationFlags").doc(), {
        targetUserId: uid, flagType: "banned_text", source: "chat_message",
        status: "pending", createdAt: now, contextId: messageRef.id,
        context: `Event room ${data.eventId}`,
      } satisfies ModerationFlagDocument);
    }
    return {messageId: messageRef.id, sequence, replayed: false};
  });
  if (!result.replayed) {
    try {
      await (deps.notificationDispatch ??
        dispatchEventChatNotificationCandidates)({eventId: data.eventId,
        messageId: result.messageId});
    } catch {
      // Optional notification delivery cannot undo a committed room message.
    }
  }
  return result;
}

export async function setEventChatReactionHandler(
  request: CallableRequest<unknown>,
  deps: EventChatMessageDeps = messageDefaults
): Promise<SetEventChatReactionCallableResponse> {
  const uid = requireAuth(request);
  const data = validateCallableWithAjv(request,
    validateSetEventChatReactionCallablePayload);
  requireEventChatActor(uid, data.expectedUid);
  const db = deps.db();
  await deps.rateLimit(db, uid, "setEventChatReaction", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  const receiptRef = db.collection("eventChatAccessReceipts").doc(chatHash([
    "reaction", uid, data.eventId, data.messageId, data.requestId]));
  const payloadHash = chatHash([data.reaction, data.expectedRevision]);
  const messageRef = db.collection("eventChatMessages").doc(data.messageId);
  const reactionRef = db.collection("eventChatReactions")
    .doc(eventChatReactionId(data.messageId, uid));
  return db.runTransaction(async (tx) => {
    const access = await requireEventChatMember(db, tx, data.eventId, uid);
    if (!access.view.canPostMessages) throw messageUnavailable();
    const receiptSnap = await tx.get(receiptRef);
    if (receiptSnap.exists) {
      const receipt = requireDoc<Receipt>(receiptSnap,
        "EventChatAccessReceiptDocument");
      if (receipt.uid !== uid || receipt.eventId !== data.eventId ||
          receipt.payloadHash !== payloadHash) {
        throw new HttpsError("already-exists",
          "This request was already used.");
      }
      return {revision: receipt.revision, replayed: true};
    }
    const [messageSnap, reactionSnap] = await Promise.all([
      tx.get(messageRef), tx.get(reactionRef),
    ]);
    const message = messageSnap.exists ? requireDoc<Message>(messageSnap,
      "EventChatMessageDocument") : null;
    if (!message || !await readableChatMessage(message, data.eventId,
      access.view.organizerId, chatIdentityReader(db, tx, uid))) {
      throw messageUnavailable();
    }
    const previous = reactionSnap.exists ? requireDoc<Reaction>(reactionSnap,
      "EventChatReactionDocument") : null;
    if (previous && (previous.uid !== uid ||
        previous.eventId !== data.eventId ||
        previous.messageId !== data.messageId)) throw messageUnavailable();
    const revision = nextChatRevision(previous?.revision ?? 0,
      data.expectedRevision);
    const counts = {...message.reactionCounts};
    if (previous?.reaction) counts[previous.reaction]--;
    if (data.reaction) counts[data.reaction]++;
    if (Object.values(counts).some((n) => !Number.isSafeInteger(n) || n < 0)) {
      throw messageUnavailable();
    }
    const now = deps.now();
    tx.set(reactionRef, {eventId: data.eventId, messageId: data.messageId, uid,
      reaction: data.reaction, revision, updatedAt: now} satisfies Reaction);
    tx.update(messageRef, {reactionCounts: counts});
    tx.create(receiptRef, {eventId: data.eventId, uid, payloadHash, revision,
      createdAt: now} satisfies Receipt);
    return {revision, replayed: false};
  });
}

export const eventChatTypingLifetimeMs = 10_000;
export async function setEventChatTypingHandler(
  request: CallableRequest<unknown>,
  deps: EventChatMessageDeps = messageDefaults
): Promise<SetEventChatTypingCallableResponse> {
  const uid = requireAuth(request);
  const data = validateCallableWithAjv(request,
    validateSetEventChatTypingCallablePayload);
  requireEventChatActor(uid, data.expectedUid);
  const db = deps.db();
  await deps.rateLimit(db, uid, "setEventChatTyping", {
    maxRequests: 30, windowMs: 60 * 1000,
  });
  const presenceRef = db.collection("eventChatPresence")
    .doc(eventChatMembershipId(data.eventId, uid));
  return db.runTransaction(async (tx) => {
    // Withdrawal can clear one's own indicator even after admission is revoked.
    if (data.isTyping) {
      const access = await requireEventChatMember(db, tx, data.eventId, uid);
      if (!access.view.canPostMessages) throw messageUnavailable();
    } else {
      await readEventChatAccount(db, tx, uid);
    }
    const snap = await tx.get(presenceRef);
    const previous = snap.exists ? requireDoc<Presence>(snap,
      "EventChatPresenceDocument") : null;
    if (previous && (previous.uid !== uid ||
        previous.eventId !== data.eventId)) throw messageUnavailable();
    if (!data.isTyping && !previous) {
      if (data.expectedRevision !== 0) throw messageUnavailable();
      return {revision: 0, expiresAtMillis: 0};
    }
    const revision = nextChatRevision(previous?.revision ?? 0,
      data.expectedRevision);
    const now = deps.now();
    const expiresAtMillis = data.isTyping ?
      now.toMillis() + eventChatTypingLifetimeMs : now.toMillis();
    tx.set(presenceRef, {eventId: data.eventId, uid, revision,
      expiresAt: Timestamp.fromMillis(expiresAtMillis), updatedAt: now,
    } satisfies Presence);
    return {revision, expiresAtMillis};
  });
}

export const sendEventChatMessage = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 30, maxInstances: 20}),
  (request) => sendEventChatMessageHandler(request));
export const setEventChatReaction = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 30, maxInstances: 20}),
  (request) => setEventChatReactionHandler(request));
export const setEventChatTyping = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 30, maxInstances: 20}),
  (request) => setEventChatTypingHandler(request));
