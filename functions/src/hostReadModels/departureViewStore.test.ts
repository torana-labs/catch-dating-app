import assert from "node:assert/strict";
import test from "node:test";
import {randomUUID} from "node:crypto";
import {readFileSync} from "node:fs";
import {contractValidator} from "../shared/contractTestValidators";
import {departureRosterHarness} from
  "../eventSuccess/operations/departureRosterTestFixtures";
import {progressFixtureManager as manager} from
  "../eventSuccess/operations/groupProgressTestFixtures";
import {EventCheckpointStore} from
  "../eventSuccess/operations/checkpointStore";
import {CHECKPOINTS, checkpointIdentity} from
  "../eventSuccess/operations/checkpointRecords";
import {DEPARTURE_ROSTERS} from
  "../eventSuccess/operations/departureRosterSource";
import {GROUP_PROGRESS} from
  "../eventSuccess/operations/groupProgressReader";
import {progressIdentity} from
  "../eventSuccess/operations/groupProgressSource";
import {reconcileDepartureView} from "./departureViewStore";
import {departureViewsCollection} from "./movementViewSupport";
import {allowDeletes, documentsOf, viewDeps} from "./movementViewTestFixtures";

const validate = contractValidator("HostEventDepartureViewDocument");

async function harness(id?: string) {
  const h = await departureRosterHarness(undefined, id);
  allowDeletes(h.fake);
  const checkpoints = new EventCheckpointStore(h.db, () => h.clock.now);
  const rosterIds = () => [...documentsOf(h.fake, DEPARTURE_ROSTERS).keys()];
  const reconcileAll = async () => {
    for (const id of rosterIds()) {
      await reconcileDepartureView(h.db, id, viewDeps(h.clock));
    }
  };
  const views = () => documentsOf(h.fake, departureViewsCollection);
  async function depart(ids: string[], request = false) {
    const input = await h.command(ids);
    const result = await h.progress.confirmDeparture(manager, {...input,
      command: {...input.command, payload: {...input.command.payload,
        ...(request ? {checkpointRequest: {responsibleOperatorId: manager,
          dueAt: h.clock.now + 30_000}} : {})}}});
    return result.view.progress!.departureRosterId!;
  }
  return {...h, checkpoints, rosterIds, reconcileAll, views, depart};
}

test("each roster's view is its history row; the Dart fixture is built " +
  "from them", async () => {
  const h = await harness("departure-history-native");
  const first = await h.depart([h.attendeeId], true);
  h.clock.now++;
  await h.depart([]);
  await h.reconcileAll();
  const views = [...h.views().values()].sort((a, b) =>
    Number(b.progressRevision) - Number(a.progressRevision));
  for (const doc of views) {
    assert.ok(validate(doc), JSON.stringify(validate.errors));
    assert.equal(doc.organizerId, h.scope.context.organizerId);
    assert.equal(doc.sourceCoverage, "complete");
  }
  // test/event_success/fixtures/departure_history.json is the page the
  // phone assembles from these rows (newest first) and the group's view.
  const fixture = JSON.parse(readFileSync(
    "../test/event_success/fixtures/departure_history.json", "utf8"));
  assert.deepEqual(views.map((doc) => doc.view), fixture.rosters);
  assert.equal(views[0].progressRevision, fixture.progressRevision);
  assert.deepEqual((h.views().get(first)!.view as {checkpoint: unknown})
    .checkpoint, {checkpointId: "one", reportStatus: "unreported",
    reportRevision: 0, accountedForCount: 0,
    originalRequestedDueAt: 1_030_000});
  assert.ok(!JSON.stringify(views).includes(h.attendeeId),
    "the history row names no guest");
});

test("a report changes the checkpoint summary of its roster", async () => {
  const h = await harness();
  const rosterId = await h.depart([h.attendeeId], true);
  const scope = {...h.scope, checkpointId: "one", progressRevision: 2};
  const view = (await h.checkpoints.get(manager, scope)).view;
  await h.checkpoints.record(manager, {expectedSourceHash: view.sourceHash,
    command: {kind: "recordCheckpoint", context: h.scope.context,
      eventId: h.scope.context.eventId, operationId: randomUUID(), payload: {
        groupId: scope.groupId, checkpointId: scope.checkpointId,
        expectedProgressRevision: 2, expectedCheckpointRevision: 0,
        accountedFor: [h.attendeeId], correctionReason: null}}});
  await reconcileDepartureView(h.db, rosterId, viewDeps(h.clock));
  assert.deepEqual((h.views().get(rosterId)!.view as {checkpoint: unknown})
    .checkpoint, {checkpointId: "one", reportStatus: "complete",
    reportRevision: 1, accountedForCount: 1,
    originalRequestedDueAt: 1_030_000});
});

test("fixed places have no checkpoint; a legacy roster records no " +
  "destination", async () => {
  const h = await harness();
  const input = await h.command([]);
  const view = (await h.progress.get(manager, h.scope)).view;
  input.command.payload.destination = view.destinations.find((d) =>
    d.target.kind === "fixedPlace")!.target;
  const result = await h.progress.confirmDeparture(manager, input);
  const fixed = result.view.progress!.departureRosterId!;
  await reconcileDepartureView(h.db, fixed, viewDeps(h.clock));
  const row = h.views().get(fixed)!.view as {checkpoint: unknown;
    sourceState: string};
  assert.equal(row.checkpoint, null);
  assert.equal(row.sourceState, "current");
  const legacy = await h.depart([]);
  const path = DEPARTURE_ROSTERS + "/" + legacy;
  const {destination: _destination, ...withoutDestination} =
    await h.read(path) as Record<string, unknown>;
  void _destination;
  await h.put(path, withoutDestination);
  await reconcileDepartureView(h.db, legacy, viewDeps(h.clock));
  const old = h.views().get(legacy)!.view as Record<string, unknown>;
  assert.deepEqual([old.destination, old.label, old.checkpoint,
    old.sourceState], [null, null, null, "destinationNotRecorded"]);
});

test("malformed rosters and a missing progress row fail closed", async () => {
  const h = await harness();
  const rosterId = await h.depart([h.attendeeId]);
  await reconcileDepartureView(h.db, rosterId, viewDeps(h.clock));
  const path = DEPARTURE_ROSTERS + "/" + rosterId;
  const original = await h.read(path) as Record<string, unknown>;
  for (const patch of [{confirmedAt: h.clock.now + 1},
    {members: [{attendeeId: "invented"}]}, {confirmedBy: "other"}]) {
    await h.put(path, {...original, ...patch});
    const outcome = await reconcileDepartureView(h.db, rosterId,
      viewDeps(h.clock));
    assert.equal(outcome.kind, "invalidSource", JSON.stringify(patch));
    assert.ok(h.views().get(rosterId)!.view, "the previous row is kept");
  }
  await h.put(path, original);
  assert.equal((await reconcileDepartureView(h.db, rosterId,
    viewDeps(h.clock))).kind, "complete");
  h.fake.remove(GROUP_PROGRESS + "/" +
    progressIdentity(h.scope.context, h.scope.groupId));
  const missing = await reconcileDepartureView(h.db, rosterId,
    viewDeps(h.clock));
  assert.deepEqual([missing.kind, h.views().get(rosterId)!.incompleteSource],
    ["invalidSource", GROUP_PROGRESS]);
});

test("a setup change marks earlier rosters and clears their labels",
  async () => {
    const h = await harness();
    const rosterId = await h.depart([h.attendeeId]);
    await reconcileDepartureView(h.db, rosterId, viewDeps(h.clock));
    assert.equal((h.views().get(rosterId)!.view as {label: string}).label,
      "Stop one");
    const event = await h.read("events/" + h.scope.context.eventId) as
      {itinerary: Array<{title: string}>};
    event.itinerary[0].title = "Renamed stop";
    await h.put("events/" + h.scope.context.eventId, event);
    const outcome = await reconcileDepartureView(h.db, rosterId,
      viewDeps(h.clock));
    assert.equal(outcome.kind, "complete");
    const row = h.views().get(rosterId)!.view as {sourceState: string;
      label: string | null};
    assert.equal(row.sourceState, "setupChanged");
    assert.equal(row.label, null);
    assert.equal((row as {rosterSize?: number}).rosterSize, 1);
  });

test("a gone roster, event or group deletes the view", async () => {
  const h = await harness();
  const rosterId = await h.depart([h.attendeeId]);
  await reconcileDepartureView(h.db, rosterId, viewDeps(h.clock));
  h.fake.remove(DEPARTURE_ROSTERS + "/" + rosterId);
  assert.deepEqual(await reconcileDepartureView(h.db, rosterId,
    viewDeps(h.clock)), {kind: "removed", existed: true});
  assert.equal(h.views().size, 0);
  const second = await h.depart([h.attendeeId]);
  await reconcileDepartureView(h.db, second, viewDeps(h.clock));
  const event = await h.read("events/" + h.scope.context.eventId);
  h.fake.remove("events/" + h.scope.context.eventId);
  assert.equal((await reconcileDepartureView(h.db, second,
    viewDeps(h.clock))).kind, "removed");
  await h.put("events/" + h.scope.context.eventId, event!);
  await reconcileDepartureView(h.db, second, viewDeps(h.clock));
  assert.equal(h.views().size, 1);
  await h.put("events/" + h.scope.context.eventId, {...event,
    organizerId: "another-organizer"});
  assert.equal((await reconcileDepartureView(h.db, second,
    viewDeps(h.clock))).kind, "removed");
});

test("an invalid report is recorded and keeps the previous row", async () => {
  const h = await harness();
  const rosterId = await h.depart([h.attendeeId], true);
  await reconcileDepartureView(h.db, rosterId, viewDeps(h.clock));
  const before = h.views().get(rosterId)!;
  const scope = {...h.scope, checkpointId: "one", progressRevision: 2};
  await h.put(CHECKPOINTS + "/" + checkpointIdentity(scope),
    {schemaVersion: 1, reportId: "broken"});
  const outcome = await reconcileDepartureView(h.db, rosterId,
    viewDeps(h.clock));
  assert.equal(outcome.kind, "invalidSource");
  const doc = h.views().get(rosterId)!;
  assert.ok(validate(doc), JSON.stringify(validate.errors));
  assert.equal(doc.incompleteSource, "eventAssistanceCheckpoints");
  assert.deepEqual(doc.view, before.view);
  assert.equal(doc.revision, 2);
  assert.equal((await reconcileDepartureView(h.db, rosterId,
    viewDeps(h.clock))).kind, "invalidSource");
  assert.equal(h.views().get(rosterId)!.revision, 2, "no rewrite when equal");
});
