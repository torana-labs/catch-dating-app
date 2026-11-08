import assert from "node:assert/strict";
import test from "node:test";
import {HttpsError} from "firebase-functions/v2/https";
import {AudienceTestStore} from
  "../organizers/organizerAudienceTestStore";
import {
  setEventCloseOutHandler,
  thankYouMomentId,
  thankYouSendAtMillis,
} from "./closeOut";

// 2026-11-14 22:30 Asia/Kolkata.
const END = Date.UTC(2026, 10, 14, 17, 0);
const code = (expected: string) => (error: unknown) =>
  error instanceof HttpsError && error.code === expected;

test("the thank-you goes the next morning, or the same morning", () => {
  assert.equal(thankYouSendAtMillis(END, "10:00", END),
    Date.UTC(2026, 10, 15, 4, 30));
  // Ends at 01:30 local: 10 AM the same day.
  const late = Date.UTC(2026, 10, 14, 20, 0);
  assert.equal(thankYouSendAtMillis(late, "10:00", late),
    Date.UTC(2026, 10, 15, 4, 30));
  // A time already past sends a minute from now.
  const now = Date.UTC(2026, 10, 16, 0, 0);
  assert.equal(thankYouSendAtMillis(END, "10:00", now), now + 60_000);
});

test("setEventCloseOut arms, pauses and replays", async () => {
  const stamp = {_seconds: 1, _nanoseconds: 0};
  const store = new AudienceTestStore({
    "events/event-1": {organizerId: "org-1",
      endTime: {toMillis: () => END}},
    "organizers/org-1": {hostUserId: "host-1", hostUserIds: [],
      hostProfiles: []},
  });
  const replans: string[] = [];
  const deps = {firestore: () => store.asFirestore(), nowMillis: () => END,
    timestampFromMillis: () => stamp, checkRateLimit: async () => {},
    replan: async (_db: unknown, moment: {status: string}) => {
      replans.push(moment.status);
    }};
  const data = {organizerId: "org-1", eventId: "event-1",
    requestId: "close-out-0001", expectedRevision: 0,
    thankYou: {sendAtLocal: "10:00"}, openStayInTouchPicks: true,
    noShowNote: false};

  const first = await setEventCloseOutHandler(
    {auth: {uid: "host-1"}, data} as never, deps as never);
  assert.deepEqual(first, {eventId: "event-1", revision: 1, replayed: false});
  const moment = store.docs[`organizerMoments/${thankYouMomentId("event-1")}`];
  assert.equal(moment.status, "armed");
  assert.deepEqual(moment.initiation,
    {kind: "scheduled", atMillis: Date.UTC(2026, 10, 15, 4, 30)});
  const closeOut = store.docs["eventCloseOuts/event-1"];
  assert.equal(closeOut.openStayInTouchPicks, true);
  assert.equal((closeOut.thankYou as {sendAtLocal: string}).sendAtLocal,
    "10:00");

  const replay = await setEventCloseOutHandler(
    {auth: {uid: "host-1"}, data} as never, deps as never);
  assert.deepEqual(replay, {...first, replayed: true});
  await assert.rejects(setEventCloseOutHandler({auth: {uid: "host-1"},
    data: {...data, requestId: "close-out-0002"}} as never, deps as never),
  code("aborted"));

  const off = await setEventCloseOutHandler({auth: {uid: "host-1"},
    data: {...data, requestId: "close-out-0003", expectedRevision: 1,
      thankYou: null}} as never, deps as never);
  assert.equal(off.revision, 2);
  assert.equal(store.docs[`organizerMoments/${
    thankYouMomentId("event-1")}`].status, "paused");
  assert.equal(store.docs["eventCloseOuts/event-1"].thankYou, null);
  assert.deepEqual(replans, ["armed", "paused"]);

  await assert.rejects(setEventCloseOutHandler({auth: {uid: "guest-1"},
    data: {...data, requestId: "close-out-0004"}} as never, deps as never),
  code("permission-denied"));
});
