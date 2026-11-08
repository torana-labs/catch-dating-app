import assert from "node:assert/strict";
import test from "node:test";
import {HttpsError} from "firebase-functions/v2/https";
import {AudienceTestStore} from
  "../organizers/organizerAudienceTestStore";
import {
  changeEventCrawlStopHandler,
  crawlBroadcastRequestId,
  withCrawlStopChange,
} from "./crawlStop";

const code = (expected: string) => (error: unknown) =>
  error instanceof HttpsError && error.code === expected;

test("a stop changes once, by id", () => {
  const first = {stopId: "stop-3", title: "Bonobo", address: null,
    changedAtMs: 1};
  const second = {...first, title: "The Daily", changedAtMs: 2};
  assert.deepEqual(withCrawlStopChange([first], second), [second]);
});

test("changeEventCrawlStop records the stop and sends one message",
  async () => {
    const stamp = {_seconds: 1, _nanoseconds: 0};
    const store = new AudienceTestStore({
      "events/event-1": {organizerId: "org-1", itinerary: [
        {id: "stop-1", kind: "stop", offsetMinutes: 0, title: "Bonobo"},
        {id: "stop-2", kind: "stop", offsetMinutes: 45, title: "Toto's"},
      ]},
      "organizers/org-1": {hostUserId: "host-1", hostUserIds: [],
        hostProfiles: []},
      "eventSuccessPlans/event-1": {eventId: "event-1",
        organizerId: "org-1", status: "live", liveControlRevision: 6},
    });
    const broadcasts: unknown[] = [];
    const deps = {firestore: () => store.asFirestore(),
      serverTimestamp: () => stamp, timestampFromMillis: () => stamp,
      nowMillis: () => 5000, checkRateLimit: async () => {},
      broadcast: async (request: {data: unknown}) => {
        broadcasts.push(request.data);
        return {recipientCount: 12};
      }};
    const data = {eventId: "event-1", requestId: "crawl-stop-0001",
      expectedLiveControlRevision: 6, stopId: "stop-2",
      stop: {title: "The Daily", address: " Bandra West "},
      message: "Stop 2 changed: The Daily, Bandra West."};

    const first = await changeEventCrawlStopHandler(
      {auth: {uid: "host-1"}, data} as never, deps as never);
    assert.deepEqual(first, {eventId: "event-1", liveControlRevision: 7,
      replayed: false, recipientCount: 12});
    assert.deepEqual(store.docs["eventSuccessPlans/event-1"].crawlStopChanges,
      [{stopId: "stop-2", title: "The Daily", address: "Bandra West",
        changedAtMs: 5000}]);
    assert.deepEqual(broadcasts, [{
      requestId: crawlBroadcastRequestId("crawl-stop-0001"),
      eventId: "event-1", audience: "booked", body: data.message}]);

    const replay = await changeEventCrawlStopHandler(
      {auth: {uid: "host-1"}, data} as never, deps as never);
    assert.equal(replay.replayed, true);
    assert.equal(replay.liveControlRevision, 7);
    assert.equal(broadcasts.length, 2, "the replay replays the broadcast");
    assert.equal(
      (broadcasts[1] as {requestId: string}).requestId,
      (broadcasts[0] as {requestId: string}).requestId);

    await assert.rejects(changeEventCrawlStopHandler({auth: {uid: "host-1"},
      data: {...data, requestId: "crawl-stop-0002"}} as never,
    deps as never), code("aborted"));
    await assert.rejects(changeEventCrawlStopHandler({auth: {uid: "host-1"},
      data: {...data, requestId: "crawl-stop-0003", stopId: "gone"}} as never,
    deps as never), code("not-found"));

    const quiet = await changeEventCrawlStopHandler({auth: {uid: "host-1"},
      data: {...data, requestId: "crawl-stop-0004",
        expectedLiveControlRevision: 7, message: null}} as never,
    deps as never);
    assert.equal(quiet.recipientCount, null);
    assert.equal(broadcasts.length, 2);
  });
