import {getEmulatorFirestore} from "../../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import test from "node:test";
import {randomUUID} from "node:crypto";
import {deleteApp, initializeApp} from "firebase-admin/app";
import {Firestore} from "firebase-admin/firestore";
import {eventStaffGrantId} from "../../shared/eventOperatorAuthority";
import {EventCheckpointStore} from "./checkpointStore";
import {DEPARTURE_ROSTERS} from "./departureRosterSource";
import {departureRosterHarness} from "./departureRosterTestFixtures";
import {progressFixtureManager as manager} from "./groupProgressTestFixtures";
import type {Response} from "./checkpointRecords";

async function harness(real?: Firestore) {
  const h = await departureRosterHarness(real);
  const checkpoints = new EventCheckpointStore(h.db, () => h.clock.now);
  const request = {responsibleOperatorId: manager, dueAt: h.clock.now + 30_000};
  async function departure(owner = manager, actor = manager,
    groupId = h.scope.groupId, ids = [h.attendeeId], dueAt = request.dueAt) {
    const input = await h.command(ids, actor, groupId);
    return {...input, command: {...input.command, payload: {
      ...input.command.payload, checkpointRequest: {
        responsibleOperatorId: owner, dueAt}}}};
  }
  async function start(input?: Awaited<ReturnType<typeof h.command>>,
    actor = manager) {
    input ??= await departure();
    const result = await h.progress.confirmDeparture(actor, input);
    const scope = {context: h.scope.context,
      groupId: input.command.payload.groupId, checkpointId: "one",
      progressRevision: result.view.revision};
    const path = DEPARTURE_ROSTERS + "/" +
      result.view.progress!.departureRosterId;
    return {input, scope, path, result,
      view: async () => (await checkpoints.get(manager, scope)).view};
  }
  return {...h, checkpoints, request, departure, start};
}
function report(view: Response["view"], accountedFor: string[],
  correctionReason: string | null = null) {
  return {expectedSourceHash: view.sourceHash, command: {
    kind: "recordCheckpoint", context: view.context,
    eventId: view.context.eventId, operationId: randomUUID(), payload: {
      groupId: view.groupId, checkpointId: view.checkpointId,
      expectedProgressRevision: view.progressRevision,
      expectedCheckpointRevision: view.revision, accountedFor,
      correctionReason}}};
}

test("departure saves an explicit reporter and deadline atomically and once",
  async () => {
    const h = await harness();
    const input = await h.departure();
    const before = h.fake.entries();
    h.fake.failNextCommit = true;
    await assert.rejects(h.progress.confirmDeparture(manager, input),
      /interruption/);
    assert.deepEqual(h.fake.entries(), before);
    const started = await h.start(input);
    assert.deepEqual((await h.read(started.path))!.checkpointRequest,
      h.request);
    assert.deepEqual((await started.view()).request, {...h.request,
      state: "awaitingReport", ownerAvailability: "current"});
    const saved = h.fake.entries();
    h.clock.now = h.request.dueAt;
    assert.equal((await h.progress.confirmDeparture(manager, input)).outcome,
      "replayed");
    assert.deepEqual(h.fake.entries(), saved);
    await assert.rejects(h.progress.confirmDeparture(manager, {...input,
      command: {...input.command, payload: {...input.command.payload,
        checkpointRequest: {...h.request, dueAt: h.request.dueAt + 1}}}}),
    {code: "aborted"});
  });

test("deadlines produce overdue work without inventing a report or attendance",
  async () => {
    const h = await harness();
    const s = await h.start();
    const attendee = await h.read(h.attendeePath);
    const initial = await s.view();
    const saved = h.fake.entries();
    h.clock.now = h.request.dueAt;
    const overdue = await s.view();
    assert.equal(overdue.request?.state, "overdue");
    assert.equal(overdue.report, null);
    assert.equal(overdue.sourceHash, initial.sourceHash);
    assert.deepEqual(h.fake.entries(), saved);
    const partial = await h.checkpoints.record(manager, report(overdue, []));
    assert.equal(partial.view.request?.state, "discrepancy");
    const complete = await h.checkpoints.record(manager,
      report(partial.view, [h.attendeeId]));
    assert.equal(complete.view.request?.state, "complete");
    assert.equal(complete.view.request?.ownerAvailability, "notRequired");
    const corrected = await h.checkpoints.record(manager,
      report(complete.view, [], "Wrong headcount"));
    assert.equal(corrected.view.request?.state, "discrepancy");
    assert.equal(corrected.view.request?.ownerAvailability, "current");
    assert.deepEqual(await h.read(h.attendeePath), attendee);
  });

test("managers can delegate to a current reporter; permission is not granted",
  async () => {
    const h = await harness();
    await h.grant("sweep", h.scope.groupId, "sweep");
    const staffPath = "eventStaffGrants/" +
      eventStaffGrantId(h.scope.context.eventId, "sweep");
    const staff = await h.read(staffPath);
    const s = await h.start(await h.departure("sweep"));
    assert.equal((await s.view()).request?.responsibleOperatorId, "sweep");
    assert.deepEqual(await h.read(staffPath), staff);
    await h.grant("sweep", h.scope.groupId, "sweep", h.clock.now + 1000);
    assert.equal((await s.view()).request?.ownerAvailability,
      "needsReassignment");
    h.fake.remove(staffPath);
    const lost = await s.view();
    assert.equal(lost.request?.state, "awaitingReport");
    assert.equal(lost.request?.ownerAvailability, "needsReassignment");
    await assert.rejects(h.checkpoints.get("sweep", s.scope),
      {code: "permission-denied"});
    // Another authorized observer can settle the report.
    const complete = await h.checkpoints.record(manager,
      report(lost, [h.attendeeId]));
    assert.equal(complete.view.request?.state, "complete");
    assert.equal(complete.view.request?.responsibleOperatorId, "sweep");
    assert.equal(complete.view.report?.reportedBy, manager);
    assert.equal(complete.view.request?.ownerAvailability, "notRequired");
  });

test("a group operator can take responsibility but cannot delegate it",
  async () => {
    const h = await harness();
    await h.groups();
    await h.place("easy");
    await h.grant("pacer", "easy", "pacer");
    await h.grant("sweep", "easy", "sweep");
    await h.grant("other", "fast", "sweep");
    const before = h.fake.entries();
    await assert.rejects(h.progress.confirmDeparture("pacer",
      await h.departure("sweep", "pacer", "easy")),
    {code: "permission-denied"});
    await assert.rejects(h.progress.confirmDeparture(manager,
      await h.departure("other", manager, "easy")),
    {code: "permission-denied"});
    assert.deepEqual(h.fake.entries(), before);
    const s = await h.start(await h.departure("pacer", "pacer", "easy"),
      "pacer");
    assert.equal((await s.view()).request?.ownerAvailability, "current");
    h.clock.now = 1_100_000;
    assert.equal((await s.view()).request?.ownerAvailability,
      "needsReassignment");
    // Receipt replay still requires the caller's current authority.
    await assert.rejects(h.progress.confirmDeparture("pacer", s.input),
      {code: "permission-denied"});
  });

test("requests require a roster, checkpoint and valid deadline",
  async () => {
    const h = await harness();
    await h.grant("sweep", h.scope.groupId, "sweep", h.request.dueAt);
    for (const due of [h.clock.now - 1, 3_000_000 + 14_400_001,
      Number.MAX_SAFE_INTEGER]) {
      const input = await h.departure(manager, manager, h.scope.groupId,
        [h.attendeeId], due);
      const before = h.fake.entries();
      await assert.rejects(h.progress.confirmDeparture(manager, input),
        {code: "failed-precondition"});
      assert.deepEqual(h.fake.entries(), before);
    }
    await assert.rejects(h.progress.confirmDeparture(manager,
      await h.departure("sweep")), {code: "failed-precondition"});
    await assert.rejects(h.progress.confirmDeparture(manager,
      await h.departure("missing")), {code: "permission-denied"});
    const input = await h.departure();
    const {departureRoster, ...withoutRoster} = input.command.payload;
    void departureRoster;
    await assert.rejects(h.progress.confirmDeparture(manager, {...input,
      command: {...input.command, payload: withoutRoster}}),
    {code: "failed-precondition"});
    const fixed = (await h.progress.get(manager, h.scope)).view.destinations
      .find((d) => d.target.kind === "fixedPlace")!.target;
    await assert.rejects(h.progress.confirmDeparture(manager, {...input,
      command: {...input.command, payload: {...input.command.payload,
        destination: fixed}}}), {code: "failed-precondition"});
    await assert.rejects(h.progress.confirmDeparture(manager, {...input,
      command: {...input.command, payload: {...input.command.payload,
        checkpointRequest: {...h.request, responsibleOperatorId: "bad/uid"}}}}),
    {code: "invalid-argument"});
  });

test("late owner reads are fenced and overdue work survives event closure",
  async () => {
    const h = await harness();
    await h.grant("sweep", h.scope.groupId, "sweep");
    const input = await h.departure("sweep");
    const before = h.fake.entries();
    h.fake.beforeRead = (path) => {
      if (path.startsWith("eventStaffGrants/")) {
        h.clock.now = h.request.dueAt + 1;
      }
    };
    await assert.rejects(h.progress.confirmDeparture(manager, input),
      {code: "failed-precondition"});
    assert.deepEqual(h.fake.entries(), before);
    h.fake.beforeRead = undefined;
    const s = await h.start(await h.departure("sweep", manager,
      h.scope.groupId, [h.attendeeId], h.clock.now + 1000));
    h.clock.now = 3_000_001;
    await h.put("events/" + h.scope.context.eventId,
      {...h.seed.event, status: "cancelled"});
    const view = await s.view();
    assert.equal(view.request?.state, "overdue");
    assert.equal(view.request?.ownerAvailability, "needsReassignment");
    assert.equal((await h.checkpoints.record(manager,
      report(view, [h.attendeeId]))).view.request?.state, "complete");
  });

test("requests bind the original checkpoint and preserve completion",
  async () => {
    const h = await harness();
    const s = await h.start();
    const wrong = await h.checkpoints.get(manager,
      {...s.scope, checkpointId: "two"});
    assert.equal(wrong.view.request, null);
    const nextInput = await h.command();
    await h.progress.confirmDeparture(manager, nextInput);
    assert.equal((await s.view()).request?.responsibleOperatorId, manager);
    await h.put("events/" + h.scope.context.eventId, {...h.seed.event,
      name: "Renamed", itinerary: h.seed.event.itinerary.map(
        (stop: {title: string}) => ({...stop,
          title: stop.title + " revised"}))});
    assert.equal((await s.view()).request?.state, "sourceUnavailable");
    await h.put("events/" + h.scope.context.eventId, h.seed.event);
    await h.checkpoints.record(manager, report(await s.view(), [h.attendeeId]));
    await h.put("events/" + h.scope.context.eventId,
      {...h.seed.event, itinerary: []});
    assert.equal((await s.view()).request?.state, "complete");
  });

test("legacy rosters invent no owner; empty rosters need an explicit report",
  async () => {
    const h = await harness();
    const s = await h.start(await h.command());
    assert.equal((await s.view()).request, null);
    const empty = await h.start(await h.departure(manager, manager,
      h.scope.groupId, []));
    assert.equal((await empty.view()).request?.state, "awaitingReport");
    assert.equal((await h.checkpoints.record(manager,
      report(await empty.view(), []))).view.request?.state, "complete");
  });

test("owner source failures propagate and corrupt saved requests are rejected",
  async () => {
    const h = await harness();
    await h.grant("sweep", h.scope.groupId, "sweep");
    const s = await h.start(await h.departure("sweep"));
    h.fake.beforeRead = (path) => {
      if (path.startsWith("eventStaffGrants/")) throw new Error("read failed");
    };
    await assert.rejects(s.view(), /read failed/);
    h.fake.beforeRead = undefined;
    const saved = (await h.read(s.path))!;
    await h.put(s.path, {...saved,
      checkpointRequest: {...h.request, dueAt: h.clock.now - 1}});
    await assert.rejects(s.view(),
      /Event operating information is unavailable/);
  });

test("Firestore concurrent departure requests preserve one immutable owner", {
  skip: !process.env.FIRESTORE_EMULATOR_HOST,
}, async () => {
  const app = initializeApp({projectId: "demo-catch-rules"},
    "checkpoint-owner-" + randomUUID());
  try {
    const h = await harness(getEmulatorFirestore(app));
    const input = await h.departure();
    const results = await Promise.all(Array.from({length: 6}, () =>
      h.progress.confirmDeparture(manager, input)));
    assert.equal(results.filter((r) => r.outcome === "applied").length, 1);
    assert.equal(results.filter((r) => r.outcome === "replayed").length, 5);
    const first = results[0];
    const view = (await h.checkpoints.get(manager, {
      context: h.scope.context, groupId: h.scope.groupId,
      checkpointId: "one", progressRevision: first.view.revision})).view;
    assert.equal(view.request?.responsibleOperatorId, manager);
    assert.equal(view.request?.state, "awaitingReport");
    assert.equal((await h.read(h.attendeePath))!.attendanceRevision, 7);
  } finally {
    await deleteApp(app);
  }
});
