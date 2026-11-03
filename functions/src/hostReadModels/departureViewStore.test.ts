import assert from "node:assert/strict";
import test from "node:test";
import {randomUUID} from "node:crypto";
import {contractValidator} from "../shared/contractTestValidators";
import {departureRosterHarness} from
  "../eventSuccess/operations/departureRosterTestFixtures";
import {progressFixtureManager as manager} from
  "../eventSuccess/operations/groupProgressTestFixtures";
import {EventDepartureHistoryStore} from
  "../eventSuccess/operations/departureHistoryStore";
import {EventCheckpointStore} from
  "../eventSuccess/operations/checkpointStore";
import {CHECKPOINTS, checkpointIdentity} from
  "../eventSuccess/operations/checkpointRecords";
import {DEPARTURE_ROSTERS} from
  "../eventSuccess/operations/departureRosterSource";
import {reconcileDepartureView} from "./departureViewStore";
import {departureViewsCollection} from "./movementViewSupport";
import {allowDeletes, documentsOf, viewDeps} from "./movementViewTestFixtures";

const validate = contractValidator("HostEventDepartureViewDocument");

async function harness() {
  const h = await departureRosterHarness();
  allowDeletes(h.fake);
  const history = new EventDepartureHistoryStore(h.db, () => h.clock.now);
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
  return {...h, history, checkpoints, rosterIds, reconcileAll, views, depart};
}

test("each roster's view is the history row a manager listed", async () => {
  const h = await harness();
  const first = await h.depart([h.attendeeId], true);
  const scope = {...h.scope, checkpointId: "one", progressRevision: 2};
  const view = (await h.checkpoints.get(manager, scope)).view;
  await h.checkpoints.record(manager, {expectedSourceHash: view.sourceHash,
    command: {kind: "recordCheckpoint", context: h.scope.context,
      eventId: h.scope.context.eventId, operationId: randomUUID(), payload: {
        groupId: scope.groupId, checkpointId: scope.checkpointId,
        expectedProgressRevision: 2, expectedCheckpointRevision: 0,
        accountedFor: [h.attendeeId], correctionReason: null}}});
  h.clock.now++;
  await h.depart([]);
  await h.reconcileAll();
  const page = await h.history.list(manager, h.scope);
  const views = h.views();
  assert.equal(views.size, page.rosters.length);
  for (const row of page.rosters) {
    const doc = [...views.values()].find((v) =>
      v.progressRevision === row.progressRevision)!;
    assert.ok(validate(doc), JSON.stringify(validate.errors));
    assert.deepEqual(doc.view, row);
    assert.equal(doc.organizerId, h.scope.context.organizerId);
    assert.equal(doc.sourceCoverage, "complete");
  }
  const reported = views.get(first)!;
  assert.deepEqual((reported.view as {checkpoint: unknown}).checkpoint, {
    checkpointId: "one", reportStatus: "complete", reportRevision: 1,
    accountedForCount: 1, originalRequestedDueAt: 1_030_000});
  assert.ok(!JSON.stringify([...views.values()]).includes(h.attendeeId),
    "the history row names no guest");
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
    assert.deepEqual(row, (await h.history.list(manager, h.scope)).rosters
      .find((r) => r.progressRevision === 2));
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
