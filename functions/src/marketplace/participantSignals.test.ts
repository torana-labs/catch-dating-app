import assert from "node:assert/strict";
import test from "node:test";
import type {
  SwipeDocument,
} from "../shared/generated/firestoreAdminTypes";
import {
  buildAttendanceSignalFact,
  buildChatSignalFacts,
  buildMatchSignalFacts,
  buildSwipeSignalFacts,
} from "./signalBuilders";
import {
  participantCounterPatch,
  participantSignalFactData,
  participantSignalFactId,
} from "./participantSignals";

test("participantSignalFactId builds Firestore-safe stable ids", () => {
  assert.equal(
    participantSignalFactId("incoming_like", "user/a", "event:1"),
    "incoming_like__user_a__event_1"
  );
});

test(
  "participantSignalFactData compacts metadata and optionals",
  () => {
    const data = participantSignalFactData(
      {
        id: "fact-1",
        uid: "user-1",
        type: "event_feedback_submitted",
        source: "event_feedback",
        direction: "self",
        eventId: "event-1",
        metadata: {
          safetyConcern: false,
          unused: undefined,
        },
      },
      "SERVER_TIMESTAMP" as never
    );

    assert.deepEqual(data, {
      uid: "user-1",
      type: "event_feedback_submitted",
      source: "event_feedback",
      direction: "self",
      value: 1,
      visibility: "adminOnly",
      occurredAt: "SERVER_TIMESTAMP",
      createdAt: "SERVER_TIMESTAMP",
      eventId: "event-1",
      metadata: {safetyConcern: false},
    });
  }
);

test("participantCounterPatch increments only the emitted signal type", () => {
  const patch = participantCounterPatch(
    {
      id: "fact-1",
      uid: "user-1",
      type: "match_created",
      source: "match",
      direction: "received",
      value: 2,
    },
    "SERVER_TIMESTAMP" as never,
    (value) => ({increment: value} as never)
  );

  assert.deepEqual(patch, {
    uid: "user-1",
    updatedAt: "SERVER_TIMESTAMP",
    counters: {match_created: {increment: 2}},
    lastSeenByType: {match_created: "SERVER_TIMESTAMP"},
  });
});

test("buildSwipeSignalFacts emits demand and private-interest facts", () => {
  const facts = buildSwipeSignalFacts(
    "swiper-1",
    "target-1",
    swipe("swiper-1", "target-1", {
      reactionTargetLabel: "Private crush",
      reactionTargetPreview: "Private post-event interest",
    })
  );

  assert.deepEqual(
    facts.map((fact) => [fact.uid, fact.type, fact.peerUid]),
    [
      ["swiper-1", "outgoing_like", "target-1"],
      ["target-1", "incoming_like", "swiper-1"],
      ["swiper-1", "private_interest_sent", "target-1"],
      ["target-1", "private_interest_received", "swiper-1"],
    ]
  );
});

test("buildMatchSignalFacts emits one match fact per participant", () => {
  const facts = buildMatchSignalFacts("match-1", {
    user1Id: "user-1",
    user2Id: "user-2",
    participantIds: ["user-1", "user-2"],
    eventIds: ["event-1"],
    createdAt: "CREATED_AT" as never,
    status: "active",
    unreadCounts: {},
    conversationType: "match",
  });

  assert.deepEqual(
    facts.map((fact) => [fact.uid, fact.type, fact.eventId, fact.peerUid]),
    [
      ["user-1", "match_created", "event-1", "user-2"],
      ["user-2", "match_created", "event-1", "user-1"],
    ]
  );
});

test("buildChatSignalFacts emits chat start facts for first message", () => {
  const facts = buildChatSignalFacts({
    matchId: "match-1",
    messageId: "message-1",
    message: {
      senderId: "user-1",
      text: "Hi",
      sentAt: "SENT_AT" as never,
    },
    recipientId: "user-2",
    isFirstMessage: true,
  });

  assert.deepEqual(
    facts.map((fact) => [fact.uid, fact.type, fact.direction]),
    [
      ["user-1", "chat_message_sent", "sent"],
      ["user-2", "chat_message_received", "received"],
      ["user-1", "chat_started", "sent"],
      ["user-2", "chat_started", "received"],
    ]
  );
});

test("buildAttendanceSignalFact distinguishes attend and removal", () => {
  assert.equal(
    buildAttendanceSignalFact({
      eventId: "event-1",
      organizerId: "club-1",
      uid: "user-1",
      attended: true,
      sourceId: "attendance-1",
    }).type,
    "event_attended"
  );
  assert.equal(
    buildAttendanceSignalFact({
      eventId: "event-1",
      organizerId: "club-1",
      uid: "user-1",
      attended: false,
      sourceId: "attendance-2",
    }).type,
    "event_attendance_removed"
  );
});

function swipe(
  swiperId: string,
  targetId: string,
  overrides: Partial<SwipeDocument> = {}
): SwipeDocument {
  return {
    swiperId,
    targetId,
    eventId: "event-1",
    direction: "like",
    createdAt: "CREATED_AT" as never,
    ...overrides,
  };
}
