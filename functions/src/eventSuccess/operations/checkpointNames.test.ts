import assert from "node:assert/strict";
import test from "node:test";
import {randomUUID} from "node:crypto";
import {readFileSync, writeFileSync} from "node:fs";
import {Timestamp} from "firebase-admin/firestore";
import {departureRosterHarness} from "./departureRosterTestFixtures";
import {progressFixtureManager as manager} from "./groupProgressTestFixtures";
import {EventCheckpointStore} from "./checkpointStore";
import type {Response} from "./checkpointRecords";
import {historyPageFromViews} from
  "../../hostReadModels/movementViewTestFixtures";

async function harness(id?: string) {
  const h = await departureRosterHarness(undefined, id);
  await h.put(h.attendeePath, {...h.attendee, displayName: "Alex Morgan"});
  await h.put("eventAttendees/guest-b", {...h.attendee,
    displayName: "Priya Sharma"});
  await h.progress.confirmDeparture(manager,
    await h.command([h.attendeeId, "guest-b"]));
  const scope = {...h.scope, checkpointId: "one", progressRevision: 2};
  const store = new EventCheckpointStore(h.db, () => h.clock.now);
  const read = () => store.get(manager, scope);
  return {...h, store, scope, readCheckpoint: read};
}
function ready(response: Response) {
  const value = response.view.availability;
  assert.equal(value.kind, "ready");
  if (value.kind !== "ready") throw new Error("Expected roster");
  return value;
}
function command(view: Response["view"], ids: string[],
  correctionReason: string | null = null) {
  return {expectedSourceHash: view.sourceHash, command: {
    kind: "recordCheckpoint", context: view.context,
    eventId: view.context.eventId, operationId: randomUUID(), payload: {
      groupId: view.groupId, checkpointId: view.checkpointId,
      expectedProgressRevision: view.progressRevision,
      expectedCheckpointRevision: view.revision,
      accountedFor: ids, correctionReason}}};
}

test("checkpoint names belong to the original registration, not a reused id",
  async () => {
    const h = await harness();
    const original = await h.readCheckpoint();
    assert.equal(ready(original).members[0].displayName, "Alex Morgan");
    await h.put(h.attendeePath, {...h.attendee, displayName: "Replacement",
      createdAt: Timestamp.fromMillis(99)});
    const changed = await h.readCheckpoint();
    assert.equal(ready(changed).members[0].displayName, null);
    assert.equal(ready(changed).members[0].visit.kind, "unavailable");
    assert.equal(ready(changed).members.length, 2);
    assert.ok(!JSON.stringify(changed).includes("Replacement"));
    h.fake.remove(h.attendeePath);
    const deleted = await h.readCheckpoint();
    assert.equal(ready(deleted).members[0].displayName, null);
    assert.equal(ready(deleted).members.length, 2);
  });

test("same-registration attendance changes preserve names and prior evidence",
  async () => {
    const h = await harness();
    await h.store.record(manager,
      command((await h.readCheckpoint()).view, [h.attendeeId]));
    await h.put(h.attendeePath, {...h.attendee, displayName: "Alex Morgan",
      status: "cancelled"});
    const current = await h.readCheckpoint();
    assert.equal(ready(current).members[0].displayName, "Alex Morgan");
    assert.equal(ready(current).members[0].observation, "accountedFor");
    assert.equal(ready(current).members[0].visit.kind, "unavailable");
  });

test("renaming a registration invalidates a stale human review", async () => {
  const h = await harness();
  const before = await h.readCheckpoint();
  const input = command(before.view, [h.attendeeId]);
  await h.put(h.attendeePath, {...h.attendee, displayName: "Alex M."});
  const renamed = await h.readCheckpoint();
  assert.notEqual(renamed.view.sourceHash, before.view.sourceHash);
  await assert.rejects(h.store.record(manager, input), {code: "aborted"});
  assert.equal(ready(renamed).members[0].displayName, "Alex M.");
});

test("native checkpoint fixture carries server-verified display names",
  async () => {
    const h = await harness("checkpoint-native");
    // History pages are assembled from the departure views, as the phone does.
    const history = () => historyPageFromViews(h.fake,
      {context: h.scope.context, groupId: h.scope.groupId}, manager, h.clock);
    const initial = await h.readCheckpoint();
    const historyInitial = await history();
    h.clock.now++;
    const partial = await h.store.record(manager,
      command(initial.view, [h.attendeeId]));
    const historyPartial = await history();
    h.clock.now++;
    const corrected = await h.store.record(manager,
      command(partial.view, [], "Selected the wrong guest."));
    const historyCorrected = await history();
    const samples = {initial, partial, corrected,
      historyInitial, historyPartial, historyCorrected};
    const path = "../test/event_success/fixtures/checkpoint_reviews.json";
    if (process.env.UPDATE_CHECKPOINT_UI_FIXTURE === "1") {
      writeFileSync(path, JSON.stringify(samples, null, 2) + "\n");
    }
    assert.deepEqual(JSON.parse(readFileSync(path, "utf8")), samples);
  });
