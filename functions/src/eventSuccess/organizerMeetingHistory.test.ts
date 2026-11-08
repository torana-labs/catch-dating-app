import assert from "node:assert/strict";
import test from "node:test";
import {
  historyInputFromDocuments,
  meetingsFromPublishedAssignments,
  MEETING_HISTORY_WINDOW_DAYS,
  organizerMeetingHistoryId,
} from "./organizerMeetingHistory";

const DAY = 24 * 60 * 60 * 1000;

test("only published rounds count, and doubles meet partner and opponents",
  () => {
    const meetings = meetingsFromPublishedAssignments([
      {uid: "a", rotationSlots: [
        {roundIndex: 0, peerUid: "b", partnerUid: "b",
          opponentUids: ["c", "d"]},
        {roundIndex: 1, peerUid: "c"},
        {roundIndex: 2, peerUid: "e"}, // not published yet
      ]},
      {uid: "z", rotationSlots: "not a list"},
    ], 1);

    const a = meetings.get("a");
    assert.ok(a);
    assert.deepEqual(a.peers.get("b"), {meetings: 1, partnerships: 1});
    assert.deepEqual(a.peers.get("c"), {meetings: 2, partnerships: 0});
    assert.deepEqual(a.peers.get("d"), {meetings: 1, partnerships: 0});
    assert.equal(a.peers.has("e"), false);
    assert.equal(meetings.has("z"), false);
  });

test("history keeps meetings from the last 90 days between people here",
  () => {
    const now = 200 * DAY;
    const history = historyInputFromDocuments([
      {uid: "a", peers: {
        b: {meetings: 2, partnerships: 1, lastMetAtMs: now - 7 * DAY},
        c: {meetings: 1, lastMetAtMs:
          now - (MEETING_HISTORY_WINDOW_DAYS + 1) * DAY},
        away: {meetings: 5, lastMetAtMs: now - DAY},
      }},
      {uid: "b", peers: {a: {meetings: 1, lastMetAtMs: now - 7 * DAY}}},
      {uid: "not-here", peers: {a: {meetings: 9, lastMetAtMs: now}}},
    ], new Set(["a", "b", "c"]), now);

    assert.deepEqual(history, {
      pairMeetingCounts: {a__b: 2},
      partnerCounts: {a__b: 1},
    });
  });

test("no history when nobody here has met before", () => {
  assert.equal(historyInputFromDocuments([], new Set(["a", "b"]), 1),
    undefined);
});

test("documents are keyed by organizer and guest", () => {
  assert.equal(organizerMeetingHistoryId("org-1", "guest-1"),
    "org-1_guest-1");
});
