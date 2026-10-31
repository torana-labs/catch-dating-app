import {onDocumentCreated} from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import type {
  UserProfileDocument,
  ChatMessageDocument,
  MatchDocument,
  PublicProfileDocument,
  OrganizerDocument,
  HostProfileDocument,
} from "../shared/generated/firestoreAdminTypes";
import {
  allowsPushPreference,
  sendFcmNotification,
  notificationProfileAvatar,
} from "../shared/notifications";
import {
  ConversationPushRole,
  resolveConversationPushTokens,
} from "../shared/conversationPushTargets";
import {organizerManagerUserIds} from "../shared/organizerHosts";
import {buildChatSignalFacts} from "../marketplace/signalBuilders";
import {
  recordParticipantSignalFactsBestEffort,
} from "../marketplace/participantSignals";
import {
  refreshEventSuccessScorecard,
} from "../marketplace/eventSuccessScorecards";
import {moderateText} from "../moderation/textFilter";

interface MessageCreatedEvent {
  id?: string;
  params: {
    matchId: string;
    messageId: string;
  };
  data?: {
    data(): FirebaseFirestore.DocumentData | undefined;
  };
}

interface MessageCreatedDeps {
  firestore: () => FirebaseFirestore.Firestore;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  sendNotification: typeof sendFcmNotification;
  resolvePushTokens?: typeof resolveConversationPushTokens;
  recordSignalFacts?: typeof recordParticipantSignalFactsBestEffort;
  refreshScorecard?: typeof refreshEventSuccessScorecard;
}

const defaultDeps: MessageCreatedDeps = {
  firestore: () => admin.firestore(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  sendNotification: sendFcmNotification,
  recordSignalFacts: recordParticipantSignalFactsBestEffort,
  refreshScorecard: refreshEventSuccessScorecard,
};

/**
 * Applies server-owned match metadata for a newly created chat message.
 * @param {MessageCreatedEvent} event Firestore message-created event.
 * @param {MessageCreatedDeps} deps Injectable dependencies for tests.
 */
export async function onMessageCreatedHandler(
  event: MessageCreatedEvent,
  deps: MessageCreatedDeps = defaultDeps
): Promise<void> {
  const {matchId, messageId} = event.params;
  const message = event.data?.data() as ChatMessageDocument | undefined;
  if (!message) return;

  // Never surface blocked content through the push or the denormalized
  // lastMessagePreview. moderateChatMessage redacts the stored message on a
  // separate (racing) trigger, so the push/preview must redact independently.
  const displayMessage =
    message.text && moderateText(message.text).action === "block" ?
      {...message, text: "[message removed for review]"} :
      message;

  const db = deps.firestore();
  const eventId = event.id ?? `${matchId}_${messageId}`;
  const matchRef = db.collection("matches").doc(matchId);
  const receiptRef = db
    .collection("functionEventReceipts")
    .doc(`onMessageCreated_${eventId}`);

  let recipientId: string | null = null;
  let shouldNotify = false;
  let isFirstMessage = false;
  let notificationTitle = "New message";
  let notificationBody = buildMessageBody(displayMessage);
  let scorecardEventIds: string[] = [];
  let isDatingConversation = false;
  const pushContext: {role: ConversationPushRole; allowed: boolean} = {
    role: "consumer", allowed: true,
  };
  let actorAvatarUrl: string | undefined;

  await db.runTransaction(async (tx) => {
    // Firestore may retry this callback. Only its final attempt may dispatch.
    shouldNotify = false;
    pushContext.role = "consumer";
    pushContext.allowed = true;
    const senderProfileRef = db.collection("publicProfiles").doc(
      message.senderId
    );
    const [receiptSnap, matchDoc, senderProfileDoc] = await Promise.all([
      tx.get(receiptRef),
      tx.get(matchRef),
      tx.get(senderProfileRef),
    ]);

    if (receiptSnap.exists || !matchDoc.exists) {
      return;
    }

    const match = matchDoc.data() as MatchDocument;
    if (match.status === "blocked" || match.status === "closed" ||
        ![match.user1Id, match.user2Id].includes(message.senderId)) {
      logger.info("Skipping notification for blocked match", {matchId});
      return;
    }
    isDatingConversation =
      match.conversationType == null || match.conversationType === "match";
    scorecardEventIds = isDatingConversation && Array.isArray(match.eventIds) ?
      match.eventIds : [];
    recipientId =
      match.user1Id === message.senderId ? match.user2Id : match.user1Id;
    const deletedRecipient = await tx.get(
      db.collection("deletedUsers").doc(recipientId)
    );
    if (deletedRecipient.exists) return;
    isFirstMessage = match.lastMessageAt == null;
    const senderProfile = senderProfileDoc.data() as
      PublicProfileDocument | undefined;
    let senderName = senderProfile?.name ?? "New message";
    actorAvatarUrl = notificationProfileAvatar(senderProfile);
    if (match.conversationType === "organizerHostInquiry") {
      const organizerId = match.organizerId;
      // Never guess Host identity from lexically sorted participant ids.
      const organizerSnap = organizerId ? await tx.get(
        db.collection("organizers").doc(organizerId)
      ) : undefined;
      const managers = organizerSnap?.exists ? organizerManagerUserIds(
        organizerSnap.data() as OrganizerDocument
      ) : [];
      if (managers.includes(recipientId)) pushContext.role = "host";
      else if (!managers.includes(message.senderId)) {
        pushContext.allowed = false;
      }
      // Missing/stale organizer membership suppresses delivery, not the
      // independent server-owned preview/unread update for a stored message.
      if (managers.includes(message.senderId)) {
        const hostSnap = await tx.get(
          db.collection("hostProfiles").doc(message.senderId)
        );
        const host = hostSnap.data() as HostProfileDocument | undefined;
        // Professional replies must not expose the sender's dating identity.
        senderName = host?.displayName ?? "Catch Host";
        actorAvatarUrl = host?.avatarUrl ?? undefined;
      }
    }
    notificationTitle = senderName;
    notificationBody = buildMessageBody(displayMessage);
    const messageSentAt = message.sentAt ?? deps.serverTimestamp();

    // Keep match-list metadata server-owned. The client writes only the
    // message. The receipt makes this increment idempotent across retries.
    tx.update(matchRef, {
      lastMessageAt: messageSentAt,
      lastMessagePreview: buildMessagePreview(displayMessage),
      lastMessageSenderId: message.senderId,
      [`unreadCounts.${message.senderId}`]: 0,
      [`unreadCounts.${recipientId}`]: 1,
    });

    tx.create(receiptRef, {
      handler: "onMessageCreated",
      eventId,
      matchId,
      messageId,
      createdAt: deps.serverTimestamp(),
    });

    shouldNotify = pushContext.allowed;
  });

  await refreshScorecardsForEvents(scorecardEventIds, deps);

  if (!shouldNotify || !recipientId) {
    return;
  }

  if (isDatingConversation && deps.recordSignalFacts) {
    await deps.recordSignalFacts(
      db,
      buildChatSignalFacts({
        matchId,
        messageId,
        message,
        recipientId,
        isFirstMessage,
      })
    );
  }

  const recipientUserDoc = await db.collection("users").doc(recipientId).get();
  const recipientUser = recipientUserDoc.data() as
    | UserProfileDocument
    | undefined;
  // A Host-only account need not have a Consumer dating-profile document.
  const pushEnabled = pushContext.role === "host" ?
    recipientUser?.prefsMessages !== false :
    allowsPushPreference(recipientUser, "messages");
  if (!pushEnabled) return;
  const resolveTokens = deps.resolvePushTokens ?? resolveConversationPushTokens;
  const tokens = await resolveTokens(
    db, recipientId, pushContext.role, recipientUser
  );

  logger.info("Sending message notification", {matchId, recipientId});

  await Promise.allSettled(tokens.map((token) => deps.sendNotification({
    token,
    title: notificationTitle,
    body: notificationBody,
    type: "message",
    matchId,
    messageId,
    notificationId: `message_${matchId}_${messageId}`,
    recipientUid: recipientId!,
    appRole: pushContext.role,
    actorName: notificationTitle,
    actorAvatarUrl,
  })));
}

/**
 * Refreshes host scorecards touched by a chat message.
 * @param {string[]} eventIds Event ids attached to the match.
 * @param {MessageCreatedDeps} deps Injectable dependencies.
 */
async function refreshScorecardsForEvents(
  eventIds: string[],
  deps: MessageCreatedDeps
): Promise<void> {
  const refreshScorecard = deps.refreshScorecard;
  if (!refreshScorecard || eventIds.length === 0) return;
  await Promise.all(eventIds.map((eventId) => refreshScorecard(eventId)));
}

export const onMessageCreated = onDocumentCreated(
  "matches/{matchId}/messages/{messageId}",
  (event) => onMessageCreatedHandler(event)
);

/**
 * Builds the match-list preview for the latest chat message.
 *
 * @param {ChatMessageDocument} message Chat message document data.
 * @return {string} Preview text for the match list.
 */
function buildMessagePreview(message: ChatMessageDocument): string {
  if (message.imageUrl) {
    return "Image";
  }

  const text = message.text.trim();
  return text.length > 80 ? text.slice(0, 80) + "…" : text;
}

/**
 * Builds the user-facing body for message push and activity notifications.
 * @param {ChatMessageDocument} message Chat message document data.
 * @return {string} Notification body text.
 */
function buildMessageBody(message: ChatMessageDocument): string {
  if (message.imageUrl) return "Sent a photo";

  const text = message.text.trim();
  return text.length > 100 ? text.slice(0, 100) + "…" : text;
}
