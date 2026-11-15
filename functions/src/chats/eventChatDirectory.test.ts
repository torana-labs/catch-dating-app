import assert from "node:assert/strict";
import test from "node:test";
import {eventChatDirectoryPairs} from "./eventChatDirectory";

test("a booking or membership write rebuilds its own row", () => {
  assert.deepEqual(eventChatDirectoryPairs(undefined,
    {eventId: "event-1", uid: "guest-1", status: "signedUp"}, "uid",
    ["status"]), [["event-1", "guest-1"]]);
  assert.deepEqual(eventChatDirectoryPairs(
    {eventId: "event-1", uid: "guest-1", status: "signedUp"}, undefined,
    "uid", ["status"]), [["event-1", "guest-1"]]);
});

test("an unrelated field change rebuilds nothing", () => {
  assert.deepEqual(eventChatDirectoryPairs(
    {eventId: "event-1", uid: "guest-1", status: "signedUp", note: "a"},
    {eventId: "event-1", uid: "guest-1", status: "signedUp", note: "b"},
    "uid", ["status"]), []);
});

test("a roster row relinked to another person rebuilds both rows", () => {
  assert.deepEqual(eventChatDirectoryPairs(
    {eventId: "event-1", linkedUid: "guest-1", status: "registered"},
    {eventId: "event-1", linkedUid: "guest-2", status: "registered"},
    "linkedUid", ["status"]),
  [["event-1", "guest-1"], ["event-1", "guest-2"]]);
  assert.deepEqual(eventChatDirectoryPairs(undefined,
    {eventId: "event-1", linkedUid: null, status: "registered"},
    "linkedUid", ["status"]), []);
  assert.deepEqual(eventChatDirectoryPairs(undefined,
    {eventId: "bad/path", uid: "guest-1"}, "uid", []), []);
});
