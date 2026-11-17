// Fixture world for the deck-era purge. Each pair covers one rule; the
// counters are built from the facts exactly as recordParticipantSignalFacts
// would have incremented them.
import {fakeTimestamp as ts} from "./fake_firestore.mjs";

export const BEFORE_CUTOFF = "2026-10-20T10:00:00.000Z";
export const AFTER_CUTOFF = "2026-11-14T10:00:00.000Z";

export function deckEraPurgeWorld() {
  const docs = {};
  const facts = [];

  const decision = (swiperId, targetId, eventId, data) => {
    docs[`profileDecisions/${swiperId}/outgoing/${targetId}`] = {
      swiperId, targetId, eventId, ...data,
    };
  };
  const likeFacts = (swiperId, targetId, eventId, at, {privateInterest = false} = {}) => {
    const sourceId = `swipe_${swiperId}_${targetId}_${eventId}`;
    const add = (type, uid, peerUid, direction) => facts.push({
      id: [type, uid, sourceId].join("__"),
      data: {uid, type, source: "swipe", direction, value: 1, visibility: "adminOnly",
        eventId, peerUid, occurredAt: ts(at), createdAt: ts(at)},
    });
    add("outgoing_like", swiperId, targetId, "sent");
    add("incoming_like", targetId, swiperId, "received");
    if (privateInterest) {
      add("private_interest_sent", swiperId, targetId, "sent");
      add("private_interest_received", targetId, swiperId, "received");
    }
  };
  const chat = (matchId, user1Id, user2Id, {status = "active", conversationType = "match",
    at = BEFORE_CUTOFF, messages = {}} = {}) => {
    docs[`matches/${matchId}`] = {
      user1Id, user2Id, participantIds: [user1Id, user2Id], eventIds: ["event-1"],
      createdAt: ts(at), status, conversationType, unreadCounts: {[user1Id]: 0, [user2Id]: 0},
    };
    for (const [messageId, data] of Object.entries(messages)) {
      docs[`matches/${matchId}/messages/${messageId}`] = {sentAt: ts(at), ...data};
    }
    if (conversationType !== "match") return;
    for (const [uid, peerUid] of [[user1Id, user2Id], [user2Id, user1Id]]) {
      docs[`notifications/${uid}/items/match_${matchId}`] = {
        type: "match", matchId, actorUid: peerUid, title: "You picked each other",
      };
      facts.push({
        id: `match_created__${uid}__${matchId}`,
        data: {uid, type: "match_created", source: "match", direction: "received", value: 1,
          eventId: "event-1", matchId, peerUid, occurredAt: ts(at), createdAt: ts(at)},
      });
    }
    for (const data of Object.values(messages)) {
      if (!data.senderId) continue;
      const peerUid = data.senderId === user1Id ? user2Id : user1Id;
      facts.push({
        id: `chat_message_sent__${data.senderId}__${matchId}_${facts.length}`,
        data: {uid: data.senderId, type: "chat_message_sent", source: "chat", direction: "sent",
          value: 1, matchId, peerUid, occurredAt: ts(at), createdAt: ts(at)},
      });
      facts.push({
        id: `chat_message_received__${peerUid}__${matchId}_${facts.length}`,
        data: {uid: peerUid, type: "chat_message_received", source: "chat",
          direction: "received", value: 1, matchId, peerUid: data.senderId,
          occurredAt: ts(at), createdAt: ts(at)},
      });
    }
  };

  // 1. Both likes deck-era, with reactions and comments: the chat goes.
  decision("ana", "ben", "event-1", {direction: "like", reactionTargetId: "heroPhoto",
    reactionTargetType: "heroPhoto", reactionTargetLabel: "Main photo",
    comment: "Great finish-line photo.", createdAt: ts(BEFORE_CUTOFF)});
  decision("ben", "ana", "event-1", {direction: "like", reactionTargetId: "prompt-1",
    reactionTargetType: "profilePrompt", createdAt: ts(BEFORE_CUTOFF)});
  likeFacts("ana", "ben", "event-1", BEFORE_CUTOFF);
  likeFacts("ben", "ana", "event-1", BEFORE_CUTOFF);
  chat("ana_ben", "ana", "ben", {messages: {
    "profileReaction_ana_ben": {senderId: "ana", text: "Great finish-line photo.\n\nAbout Main photo"},
    "m1": {senderId: "ben", text: "Thanks!"},
    "m2": {senderId: "ana", text: "", imageUrl: "https://example.test/chat.jpg"},
  }});

  // 2. A plain deck like (caught only by the timestamp) and a current pick:
  //    the chat exists only because of the deck like, so it goes.
  decision("cal", "dee", "event-1", {direction: "like", createdAt: ts(BEFORE_CUTOFF)});
  decision("dee", "cal", "event-2", {direction: "like", createdAt: ts(AFTER_CUTOFF)});
  likeFacts("cal", "dee", "event-1", BEFORE_CUTOFF);
  likeFacts("dee", "cal", "event-2", AFTER_CUTOFF);
  chat("cal_dee", "cal", "dee", {at: AFTER_CUTOFF, messages: {
    "m1": {senderId: "dee", text: "Hi from the trivia night"},
  }});

  // 3. Two current picks: the chat stays; a stray profileReaction message goes.
  decision("eve", "fin", "event-2", {direction: "like", createdAt: ts(AFTER_CUTOFF)});
  decision("fin", "eve", "event-2", {direction: "like", createdAt: ts(AFTER_CUTOFF)});
  likeFacts("eve", "fin", "event-2", AFTER_CUTOFF);
  likeFacts("fin", "eve", "event-2", AFTER_CUTOFF);
  chat("eve_fin", "eve", "fin", {at: AFTER_CUTOFF, messages: {
    "profileReaction_eve_fin": {senderId: "eve", text: "Left over from the deck"},
    "m1": {senderId: "fin", text: "See you Saturday"},
  }});

  // 4. An old build's pass and reaction like after the cutoff: no chat.
  decision("gia", "hal", "event-2", {direction: "pass", createdAt: ts(AFTER_CUTOFF)});
  decision("hal", "gia", "event-2", {direction: "like", reactionTargetId: "heroPhoto",
    reactionTargetType: "heroPhoto", reactionTargetLabel: "Private crush",
    createdAt: ts(AFTER_CUTOFF)});
  likeFacts("hal", "gia", "event-2", AFTER_CUTOFF, {privateInterest: true});

  // 5. Mutual deck likes whose chat is blocked: kept for safety review.
  decision("ivy", "jon", "event-1", {direction: "like", createdAt: ts(BEFORE_CUTOFF)});
  decision("jon", "ivy", "event-1", {direction: "like", createdAt: ts(BEFORE_CUTOFF)});
  likeFacts("ivy", "jon", "event-1", BEFORE_CUTOFF);
  likeFacts("jon", "ivy", "event-1", BEFORE_CUTOFF);
  chat("ivy_jon", "ivy", "jon", {status: "blocked", messages: {
    "m1": {senderId: "ivy", text: "Reported message"},
  }});

  // 6. A one-way current pick: kept.
  decision("kim", "lee", "event-2", {direction: "like", createdAt: ts(AFTER_CUTOFF)});
  likeFacts("kim", "lee", "event-2", AFTER_CUTOFF);

  // 7. Facts whose decision is gone: deck-era by time, or unresolved.
  likeFacts("old", "gone", "event-0", BEFORE_CUTOFF);
  likeFacts("max", "ned", "event-2", AFTER_CUTOFF);

  // 8. Another conversation type between deck-era people: never touched.
  chat("plan_ana_cal", "ana", "cal", {conversationType: "crossPathsEventPlan",
    messages: {"m1": {senderId: "ana", text: "Meet at the gate"}}});

  for (const fact of facts) docs[`participantSignalFacts/${fact.id}`] = fact.data;
  const counters = {};
  for (const {data} of facts) {
    const entry = counters[data.uid] ??= {uid: data.uid, counters: {}, lastSeenByType: {}};
    entry.counters[data.type] = (entry.counters[data.type] ?? 0) + data.value;
    entry.lastSeenByType[data.type] = data.occurredAt;
  }
  for (const [uid, entry] of Object.entries(counters)) {
    docs[`participantMetricCounters/${uid}`] = entry;
  }
  // An unrelated counter that must stay exactly as it is.
  docs["participantMetricCounters/ana"].counters.event_attended = 3;
  return docs;
}
