import assert from "node:assert/strict";
import test from "node:test";
import {bumpEventChatSignal, eventChatSignalEventIds} from
  "./eventChatSignals";

test("message, presence and membership writes signal their event chat",
  () => {
    assert.deepEqual(eventChatSignalEventIds("eventChatMessages", "m1",
      undefined, {eventId: "event-1", text: "hi"}), ["event-1"]);
    assert.deepEqual(eventChatSignalEventIds("eventChatPresence", "p1",
      {eventId: "event-1"}, undefined), ["event-1"]);
    assert.deepEqual(eventChatSignalEventIds("eventChatMemberships", "x",
      {eventId: "event-1"}, {eventId: "event-2"}), ["event-1", "event-2"]);
    assert.deepEqual(eventChatSignalEventIds("eventChatMessages", "m1",
      undefined, {text: "no event"}), []);
  });

test("a room signals access only when its revision moves", () => {
  assert.deepEqual(eventChatSignalEventIds("eventChatRooms", "event-1",
    {revision: 2, lastMessageSequence: 4},
    {revision: 2, lastMessageSequence: 5}), []);
  assert.deepEqual(eventChatSignalEventIds("eventChatRooms", "event-1",
    {revision: 2}, {revision: 3}), ["event-1"]);
  assert.deepEqual(eventChatSignalEventIds("eventChatRooms", "event-1",
    undefined, {revision: 1}), ["event-1"]);
});

test("a bump moves one counter and carries no chat content", async () => {
  const writes: Array<{id: string; data: Record<string, unknown>;
    options: unknown}> = [];
  const db = {collection: (name: string) => {
    assert.equal(name, "eventChatSignals");
    return {doc: (id: string) => ({set: async (data: Record<string, unknown>,
      options: unknown) => {
      writes.push({id, data, options});
    }})};
  }} as unknown as FirebaseFirestore.Firestore;
  await bumpEventChatSignal(db, "event-1", "typing");
  assert.equal(writes.length, 1);
  assert.equal(writes[0].id, "event-1");
  assert.deepEqual(Object.keys(writes[0].data).sort(),
    ["eventId", "typingRevision", "updatedAt"]);
  assert.deepEqual(writes[0].options, {merge: true});
});
