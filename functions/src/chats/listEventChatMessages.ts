import {HttpsError, onCall, type CallableRequest} from
  "firebase-functions/v2/https";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptionsWithLimits} from "../shared/callableOptions";
import {requireDoc, validateCallableWithAjv} from "../shared/validation";
import {eventChatMembershipId, readEventChatAccess,
  requireEventChatMember} from "./eventChatAccess";
import {chatIdentityReader, emptyReactionCounts, eventChatReactionId,
  messageDefaults, readableChatMessage, type EventChatMessageDeps} from
  "./eventChatMessageShared";
import type {EventChatMessageDocument as Message,
  EventChatReactionDocument as Reaction, EventChatPresenceDocument as Presence}
  from "../shared/generated/firestoreAdminTypes";
import {validateListEventChatMessagesCallablePayload} from
  "../shared/generated/validators/listEventChatMessagesInput";
import type {ListEventChatMessagesCallableResponse as Result} from
  "../shared/generated/listEventChatMessagesCallableResponse";

export async function listEventChatMessagesHandler(
  request: CallableRequest<unknown>,
  deps: EventChatMessageDeps = messageDefaults
): Promise<Result> {
  const uid = requireAuth(request);
  const data = validateCallableWithAjv(request,
    validateListEventChatMessagesCallablePayload);
  const db = deps.db();
  await deps.rateLimit(db, uid, "listEventChatMessages", {
    maxRequests: 120, windowMs: 60 * 1000,
  });
  return db.runTransaction(async (tx) => {
    const access = await requireEventChatMember(db, tx, data.eventId, uid);
    const now = deps.now();
    let query = db.collection("eventChatMessages")
      .where("eventId", "==", data.eventId).orderBy("sequence", "desc");
    if (data.beforeSequence !== null) {
      query = query.startAfter(data.beforeSequence);
    }
    const [rows, activePresence, ownPresence] = await Promise.all([
      tx.get(query.limit(data.limit + 1)),
      tx.get(db.collection("eventChatPresence")
        .where("eventId", "==", data.eventId).where("expiresAt", ">", now)
        .orderBy("expiresAt", "desc").limit(11)),
      tx.get(db.collection("eventChatPresence")
        .doc(eventChatMembershipId(data.eventId, uid))),
    ]);
    const identity = chatIdentityReader(db, tx, uid);
    const messages: Result["messages"] = [];
    for (const row of rows.docs.slice(0, data.limit)) {
      const message = requireDoc<Message>(row, "EventChatMessageDocument");
      const readable = await readableChatMessage(message, data.eventId,
        access.view.organizerId, identity);
      const view: Result["messages"][number] = {
        messageId: row.id, sequence: message.sequence,
        sentAtMillis: message.createdAt.toMillis(), senderUid: null,
        senderName: null, available: false,
        kind: "text", text: null, reply: null,
        reactionCounts: emptyReactionCounts(), myReaction: null,
        myReactionRevision: 0,
      };
      if (readable) {
        view.senderUid = message.uid;
        view.senderName = readable.name;
        view.available = true;
        view.kind = message.kind ?? "text";
        view.text = message.text;
        view.reactionCounts = message.reactionCounts;
        const reactionSnap = await tx.get(db.collection("eventChatReactions")
          .doc(eventChatReactionId(row.id, uid)));
        if (reactionSnap.exists) {
          const reaction = requireDoc<Reaction>(reactionSnap,
            "EventChatReactionDocument");
          if (reaction.eventId === data.eventId && reaction.uid === uid &&
              reaction.messageId === row.id) {
            view.myReaction = reaction.reaction;
            view.myReactionRevision = reaction.revision;
          }
        }
        if (message.replyToMessageId) {
          const parentSnap = await tx.get(db.collection("eventChatMessages")
            .doc(message.replyToMessageId));
          const parent = parentSnap.exists ? requireDoc<Message>(parentSnap,
            "EventChatMessageDocument") : null;
          const readableParent = await readableChatMessage(parent,
            data.eventId, access.view.organizerId, identity);
          view.reply = {messageId: message.replyToMessageId,
            senderUid: readableParent?.message.uid ?? null,
            senderName: readableParent?.name ?? null,
            available: readableParent !== null,
            text: readableParent?.message.text ?? null};
        }
      }
      messages.push(view);
    }
    const typing: Result["typing"] = [];
    for (const row of activePresence.docs) {
      const presence = requireDoc<Presence>(row, "EventChatPresenceDocument");
      if (presence.uid === uid || presence.eventId !== data.eventId ||
          row.id !== eventChatMembershipId(data.eventId, presence.uid)) {
        continue;
      }
      const displayName = await identity(presence.uid);
      if (!displayName) continue;
      try {
        const current = await readEventChatAccess(db, tx, data.eventId,
          presence.uid);
        if (!current.view.canReadMessages) continue;
      } catch (error) {
        if (error instanceof HttpsError &&
            ["permission-denied", "not-found"].includes(error.code)) continue;
        throw error;
      }
      typing.push({uid: presence.uid, displayName,
        expiresAtMillis: presence.expiresAt.toMillis()});
    }
    const own = ownPresence.exists ? requireDoc<Presence>(ownPresence,
      "EventChatPresenceDocument") : null;
    return {messages, nextBeforeSequence: rows.size > data.limit ?
      messages.at(-1)!.sequence : null, typing: typing.slice(0, 10),
    typingHasMore: typing.length > 10,
    ownTypingRevision: own?.uid === uid && own.eventId === data.eventId ?
      own.revision : 0, serverTimeMillis: now.toMillis()};
  });
}
export const listEventChatMessages = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 30, maxInstances: 20}),
  (request) => listEventChatMessagesHandler(request));
