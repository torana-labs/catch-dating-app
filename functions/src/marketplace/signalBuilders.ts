import type {
  ChatMessageDocument,
  MatchDocument,
  SwipeDocument,
} from "../shared/generated/firestoreAdminTypes";
import {
  ParticipantSignalFactInput,
  participantSignalFactId,
} from "./participantSignals";

interface EventSuccessFeedbackLike {
  eventId: string;
  organizerId: string;
  uid: string;
  safetyConcern?: boolean;
  createdAt?: FirebaseFirestore.Timestamp;
}

/**
 * Builds participant facts for a profile decision.
 * @param {string} swiperId User who made the decision.
 * @param {string} targetId Profile target.
 * @param {SwipeDocument} swipeData Swipe document.
 * @return {ParticipantSignalFactInput[]} Facts for both sides of the signal.
 */
export function buildSwipeSignalFacts(
  swiperId: string,
  targetId: string,
  swipeData: SwipeDocument
): ParticipantSignalFactInput[] {
  if (swipeData.direction !== "like") return [];

  const eventId = swipeData.eventId;
  const sourceId = `swipe_${swiperId}_${targetId}_${eventId}`;
  const facts: ParticipantSignalFactInput[] = [
    {
      id: participantSignalFactId("outgoing_like", swiperId, sourceId),
      uid: swiperId,
      type: "outgoing_like",
      source: "swipe",
      direction: "sent",
      eventId,
      peerUid: targetId,
      occurredAt: swipeData.createdAt,
    },
    {
      id: participantSignalFactId("incoming_like", targetId, sourceId),
      uid: targetId,
      type: "incoming_like",
      source: "swipe",
      direction: "received",
      eventId,
      peerUid: swiperId,
      occurredAt: swipeData.createdAt,
    },
  ];

  if (isPrivateInterest(swipeData)) {
    facts.push(
      {
        id: participantSignalFactId(
          "private_interest_sent",
          swiperId,
          sourceId
        ),
        uid: swiperId,
        type: "private_interest_sent",
        source: "swipe",
        direction: "sent",
        eventId,
        peerUid: targetId,
        occurredAt: swipeData.createdAt,
        metadata: {
          reactionTargetType: swipeData.reactionTargetType,
          reactionTargetLabel: swipeData.reactionTargetLabel,
        },
      },
      {
        id: participantSignalFactId(
          "private_interest_received",
          targetId,
          sourceId
        ),
        uid: targetId,
        type: "private_interest_received",
        source: "swipe",
        direction: "received",
        eventId,
        peerUid: swiperId,
        occurredAt: swipeData.createdAt,
        metadata: {
          reactionTargetType: swipeData.reactionTargetType,
          reactionTargetLabel: swipeData.reactionTargetLabel,
        },
      }
    );
  }

  return facts;
}

/**
 * Builds participant facts for a newly created match.
 * @param {string} matchId Match document id.
 * @param {MatchDocument} match Match document.
 * @return {ParticipantSignalFactInput[]} Facts for both participants.
 */
export function buildMatchSignalFacts(
  matchId: string,
  match: MatchDocument
): ParticipantSignalFactInput[] {
  const latestEventId = match.eventIds?.at(-1);
  return [
    {
      id: participantSignalFactId("match_created", match.user1Id, matchId),
      uid: match.user1Id,
      type: "match_created",
      source: "match",
      direction: "received",
      eventId: latestEventId,
      matchId,
      peerUid: match.user2Id,
      occurredAt: match.createdAt,
    },
    {
      id: participantSignalFactId("match_created", match.user2Id, matchId),
      uid: match.user2Id,
      type: "match_created",
      source: "match",
      direction: "received",
      eventId: latestEventId,
      matchId,
      peerUid: match.user1Id,
      occurredAt: match.createdAt,
    },
  ];
}

/**
 * Builds participant facts for a chat message.
 * @param {object} params Message context.
 * @return {ParticipantSignalFactInput[]} Chat facts.
 */
export function buildChatSignalFacts(params: {
  matchId: string;
  messageId: string;
  message: ChatMessageDocument;
  recipientId: string;
  isFirstMessage: boolean;
}): ParticipantSignalFactInput[] {
  const {matchId, messageId, message, recipientId, isFirstMessage} = params;
  const sourceId = `chat_${matchId}_${messageId}`;
  const facts: ParticipantSignalFactInput[] = [
    {
      id: participantSignalFactId(
        "chat_message_sent",
        message.senderId,
        sourceId
      ),
      uid: message.senderId,
      type: "chat_message_sent",
      source: "chat",
      direction: "sent",
      matchId,
      peerUid: recipientId,
      occurredAt: message.sentAt ?? undefined,
    },
    {
      id: participantSignalFactId(
        "chat_message_received",
        recipientId,
        sourceId
      ),
      uid: recipientId,
      type: "chat_message_received",
      source: "chat",
      direction: "received",
      matchId,
      peerUid: message.senderId,
      occurredAt: message.sentAt ?? undefined,
    },
  ];

  if (isFirstMessage) {
    facts.push(
      {
        id: participantSignalFactId(
          "chat_started",
          message.senderId,
          sourceId
        ),
        uid: message.senderId,
        type: "chat_started",
        source: "chat",
        direction: "sent",
        matchId,
        peerUid: recipientId,
        occurredAt: message.sentAt ?? undefined,
      },
      {
        id: participantSignalFactId("chat_started", recipientId, sourceId),
        uid: recipientId,
        type: "chat_started",
        source: "chat",
        direction: "received",
        matchId,
        peerUid: message.senderId,
        occurredAt: message.sentAt ?? undefined,
      }
    );
  }

  return facts;
}

/**
 * Builds a participant attendance fact.
 * @param {object} params Attendance context.
 * @return {ParticipantSignalFactInput} Attendance fact.
 */
export function buildAttendanceSignalFact(params: {
  eventId: string;
  organizerId: string;
  uid: string;
  attended: boolean;
  sourceId: string;
}): ParticipantSignalFactInput {
  const {eventId, organizerId, uid, attended, sourceId} = params;
  const type = attended ? "event_attended" : "event_attendance_removed";
  return {
    id: participantSignalFactId(type, uid, sourceId),
    uid,
    type,
    source: "attendance",
    direction: "self",
    eventId,
    organizerId: organizerId,
    visibility: "aggregateSafe",
  };
}

/**
 * Builds a participant fact for post-event feedback.
 * @param {string} feedbackId Feedback document id.
 * @param {EventSuccessFeedbackLike} feedback Feedback document.
 * @return {ParticipantSignalFactInput} Feedback fact.
 */
export function buildFeedbackSignalFact(
  feedbackId: string,
  feedback: EventSuccessFeedbackLike
): ParticipantSignalFactInput {
  return {
    id: participantSignalFactId(
      "event_feedback_submitted",
      feedback.uid,
      feedbackId
    ),
    uid: feedback.uid,
    type: "event_feedback_submitted",
    source: "event_feedback",
    direction: "self",
    eventId: feedback.eventId,
    organizerId: feedback.organizerId,
    visibility: "aggregateSafe",
    occurredAt: feedback.createdAt,
    metadata: {
      safetyConcern: feedback.safetyConcern,
    },
  };
}

/**
 * Detects private-crush profile decisions from reaction metadata.
 * @param {SwipeDocument} swipeData Profile decision document.
 * @return {boolean} Whether the decision is private interest.
 */
/**
 * Detects the post-event private-interest reaction used by companion flows.
 * @param {SwipeDocument} swipeData Swipe document.
 * @return {boolean} True when this swipe carries private-interest context.
 */
function isPrivateInterest(swipeData: SwipeDocument): boolean {
  return (
    swipeData.reactionTargetLabel === "Private crush" ||
    swipeData.reactionTargetPreview === "Private post-event interest"
  );
}
