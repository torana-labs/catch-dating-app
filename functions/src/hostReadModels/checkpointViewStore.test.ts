import assert from "node:assert/strict";
import test from "node:test";
import {contractValidator} from "../shared/contractTestValidators";
import {departureRosterHarness} from
  "../eventSuccess/operations/departureRosterTestFixtures";
import {progressFixtureManager as manager} from
  "../eventSuccess/operations/groupProgressTestFixtures";
import {EventCheckpointStore} from
  "../eventSuccess/operations/checkpointStore";
import {EventAccountabilityStore} from
  "../eventSuccess/operations/accountabilityStore";
import {checkpointIdentity} from
  "../eventSuccess/operations/checkpointRecords";
import {DEPARTURE_ROSTERS} from
  "../eventSuccess/operations/departureRosterSource";
import {guestCollections, guestIdentity} from
  "../eventSuccess/operations/guestRecords";
import {reconcileCheckpointView} from "./checkpointViewStore";
import {checkpointViewsCollection} from "./movementViewSupport";
import {allowDeletes, documentsOf, viewDeps, withoutServerTime} from
  "./movementViewTestFixtures";

const validate = contractValidator("HostEventCheckpointViewDocument");
const end = 3_000_000;
type Data = Record<string, unknown>;

async function harness(pace = false) {
  const h = await departureRosterHarness();
  allowDeletes(h.fake);
  const groupId = pace ? "easy" : "event:whole";
  const ids = [h.attendeeId];
  if (pace) {
    await h.groups();
    await h.place(groupId);
  } else {
    ids.push("guest-1");
    await h.put("eventAttendees/guest-1", h.attendee);
  }
  const dueAt = h.clock.now + 30_000;
  await h.grant("sweep", groupId, "sweep", dueAt + 100);
  const input = await h.command(ids, manager, groupId);
  const departure = await h.progress.confirmDeparture(manager, {...input,
    command: {...input.command, payload: {...input.command.payload,
      checkpointRequest: {responsibleOperatorId: manager, dueAt}}}});
  const rosterId = departure.view.progress!.departureRosterId!;
  const checkpointScope = {context: h.scope.context, groupId,
    checkpointId: "one", progressRevision: departure.view.revision};
  const checkpoints = new EventCheckpointStore(h.db, () => h.clock.now);
  const accountability = new EventAccountabilityStore(h.db,
    () => h.clock.now);
  const reconcile = () => reconcileCheckpointView(h.db, rosterId,
    viewDeps(h.clock));
  const doc = () => documentsOf(h.fake, checkpointViewsCollection)
    .get(checkpointIdentity(checkpointScope)) as Data | undefined;
  return {...h, groupId, ids, dueAt, rosterId, checkpointScope, checkpoints,
    accountability, reconcile, doc};
}

async function assertParity(h: Awaited<ReturnType<typeof harness>>) {
  const doc = h.doc()!;
  assert.ok(validate(doc), JSON.stringify(validate.errors));
  const read = await h.checkpoints.get(manager, h.checkpointScope);
  const {actorUid: _actor, validUntil: _until, ...options} =
    read.view.reporterOptions!;
  void _actor;
  void _until;
  assert.deepEqual(doc.view, {...withoutServerTime(read.view),
    reporterOptions: options});
  const entries = doc.accountability as Array<{attendeeId: string;
    view: Data}>;
  assert.deepEqual(entries.map((e) => e.attendeeId), [...h.ids].sort());
  for (const entry of entries) {
    const view = (await h.accountability.get(manager, {
      context: h.scope.context, groupId: h.groupId,
      attendeeId: entry.attendeeId, checkpoint: {checkpointId: "one",
        progressRevision: h.checkpointScope.progressRevision}})).view;
    assert.deepEqual(entry.view, {sourceHash: view.sourceHash,
      revision: view.revision, episodeId: view.episodeId,
      disposition: view.disposition, availability: view.availability});
  }
}

test("the view is the manager read, with each member's accountability",
  async () => {
    const h = await harness();
    assert.equal((await h.reconcile()).kind, "complete");
    await assertParity(h);
    const doc = h.doc()!;
    assert.equal(doc.rosterId, h.rosterId);
    assert.deepEqual(doc.memberAttendeeIds, [...h.ids].sort());
    assert.equal(doc.eventEndAtMillis, end);
    assert.equal(doc.ownerValidUntilMillis, Number.MAX_SAFE_INTEGER);
    const view = doc.view as {request: {state: string};
      reporterOptions: {reporters: Array<{operatorId: string}>}};
    assert.equal(view.request.state, "awaitingReport");
    assert.deepEqual(view.reporterOptions.reporters.map((r) => r.operatorId)
      .sort(), [manager, "sweep"].sort());
    assert.equal((await h.reconcile()).kind, "unchanged");
  });

test("pace-group accountability hashes include the accepted membership",
  async () => {
    const h = await harness(true);
    await h.reconcile();
    await assertParity(h);
  });

test("a resolution and a grant change are reflected", async () => {
  const h = await harness();
  await h.reconcile();
  const entry = (h.doc()!.accountability as Array<{attendeeId: string;
    view: {sourceHash: string; episodeId: string | null}}>)[0];
  await h.accountability.resolve(manager, {groupId: h.groupId,
    checkpoint: {checkpointId: "one",
      progressRevision: h.checkpointScope.progressRevision},
    expectedSourceHash: entry.view.sourceHash, command: {
      kind: "resolveAccountability", context: h.scope.context,
      eventId: h.scope.context.eventId, operationId: "resolve-one",
      payload: {attendeeId: entry.attendeeId, episodeId: entry.view.episodeId,
        disposition: "departed"}}});
  assert.equal((await h.reconcile()).kind, "complete");
  await assertParity(h);
  await h.grant("sweep", h.groupId, "sweep", h.dueAt - 1);
  await h.reconcile();
  await assertParity(h);
  const reporters = (h.doc()!.view as {reporterOptions: {reporters:
    Array<{operatorId: string}>}}).reporterOptions.reporters;
  assert.ok(!reporters.some((r) => r.operatorId === "sweep"));
});

test("views freeze a day after the event ends", async () => {
  const h = await harness();
  await h.reconcile();
  const before = h.doc();
  h.clock.now = end + 24 * 60 * 60 * 1000;
  await h.put("eventAttendees/guest-1", {...h.attendee, displayName: "New"});
  assert.deepEqual(await h.reconcile(), {kind: "frozen"});
  assert.deepEqual(h.doc(), before);
});

test("rosters without a checkpoint have no view; a gone event deletes it",
  async () => {
    const h = await harness();
    const view = (await h.progress.get(manager, h.scope)).view;
    const fixed = view.destinations.find((d) =>
      d.target.kind === "fixedPlace")!;
    const input = await h.command([h.attendeeId]);
    const result = await h.progress.confirmDeparture(manager, {...input,
      command: {...input.command, payload: {...input.command.payload,
        destination: fixed.target}}});
    assert.deepEqual(await reconcileCheckpointView(h.db,
      result.view.progress!.departureRosterId!, viewDeps(h.clock)),
    {kind: "noCheckpoint"});
    await h.reconcile();
    assert.ok(h.doc());
    h.fake.remove("events/" + h.scope.context.eventId);
    assert.deepEqual(await h.reconcile(), {kind: "removed", existed: true});
    assert.equal(h.doc(), undefined);
    h.fake.remove(DEPARTURE_ROSTERS + "/" + h.rosterId);
    assert.deepEqual(await h.reconcile(), {kind: "removed", existed: false});
  });

test("an invalid guest row nulls that member only; an invalid report keeps " +
  "the previous view", async () => {
  const h = await harness();
  await h.reconcile();
  const before = h.doc()!;
  const guestPath = guestCollections.guests + "/" +
    guestIdentity(h.scope.context, "guest-1");
  await h.put(guestPath, {broken: true});
  assert.equal((await h.reconcile()).kind, "complete");
  const entries = h.doc()!.accountability as Array<{attendeeId: string;
    view: unknown}>;
  assert.equal(entries.find((e) => e.attendeeId === "guest-1")!.view, null);
  assert.ok(entries.find((e) => e.attendeeId === h.attendeeId)!.view);
  h.fake.remove(guestPath);
  await h.reconcile();
  await h.put("eventAssistanceCheckpoints/" +
    checkpointIdentity(h.checkpointScope),
  {broken: true});
  const outcome = await h.reconcile();
  assert.equal(outcome.kind, "invalidSource");
  const doc = h.doc()!;
  assert.ok(validate(doc), JSON.stringify(validate.errors));
  assert.equal(doc.sourceCoverage, "invalidSource");
  assert.equal(doc.incompleteSource, "eventAssistanceCheckpoints");
  assert.deepEqual(doc.view, before.view);
});
