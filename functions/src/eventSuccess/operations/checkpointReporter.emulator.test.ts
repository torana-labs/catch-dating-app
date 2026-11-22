import {getEmulatorFirestore} from "../../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import test from "node:test";
import {randomUUID} from "node:crypto";
import {deleteApp, initializeApp} from "firebase-admin/app";
import {Firestore} from "firebase-admin/firestore";
import type {CallableRequest} from "firebase-functions/v2/https";
import {operationCollections} from "../../operations/collections";
import {eventStaffGrantId} from "../../shared/eventOperatorAuthority";
import {CheckpointReporterStore} from "./checkpointReporterStore";
import {reassignEventAssistanceCheckpointReporterHandler as handler} from
  "./checkpointReporterHandlers";
import {AssistanceCheckpointWorkStore} from "./checkpointWorkStore";
import {checkpointWorkIds} from "./checkpointWorkRecords";
import {EventCheckpointStore} from "./checkpointStore";
import {checkpointIdentity, Response} from "./checkpointRecords";
import {departureRosterHarness} from "./departureRosterTestFixtures";
import {progressFixtureManager as manager} from "./groupProgressTestFixtures";

async function setup(real?: Firestore) {
  const h = await departureRosterHarness(real);
  await h.grant("first", h.scope.groupId, "sweep");
  await h.grant("second", h.scope.groupId, "sweep");
  const input = await h.command();
  const request = {responsibleOperatorId: manager,
    dueAt: h.clock.now + 30_000};
  const departure = await h.progress.confirmDeparture(manager, {...input,
    command: {...input.command, payload: {...input.command.payload,
      checkpointRequest: request}}});
  const scope = {context: h.scope.context, groupId: h.scope.groupId,
    checkpointId: "one", progressRevision: departure.view.revision};
  const reportId = checkpointIdentity(scope);
  const id = checkpointWorkIds(reportId).workItemId;
  const reports = new EventCheckpointStore(h.db, () => h.clock.now);
  const work = new AssistanceCheckpointWorkStore(h.db, () => h.clock.now);
  const owners = new CheckpointReporterStore(h.db, () => h.clock.now);
  const view = async () => (await reports.get(manager, scope)).view;
  const assign = async (operator = "first") => command(await view(), operator);
  const report = async (ids: string[], reason: string | null = null) => {
    const v = await view();
    return reports.record(manager, {expectedSourceHash: v.sourceHash,
      command: {kind: "recordCheckpoint", context: scope.context,
        eventId: scope.context.eventId, operationId: randomUUID(), payload: {
          groupId: scope.groupId, checkpointId: scope.checkpointId,
          expectedProgressRevision: scope.progressRevision,
          expectedCheckpointRevision: v.revision, accountedFor: ids,
          correctionReason: reason}}});
  };
  return {...h, request, departure, checkpointScope: scope, reportId, id,
    reports, work, owners, view, assign, report};
}
function command(view: Response["view"], operator: string) {
  assert.ok(view.assignment);
  return {expectedSourceHash: view.assignment.sourceHash, command: {
    kind: "reassignCheckpointReporter", context: view.context,
    eventId: view.context.eventId, operationId: randomUUID(), payload: {
      groupId: view.groupId, checkpointId: view.checkpointId,
      expectedProgressRevision: view.progressRevision,
      expectedAssignmentRevision: view.assignment.revision,
      responsibleOperatorId: operator, reason: "Shift handover"}}};
}
function domain(h: Awaited<ReturnType<typeof setup>>) {
  return h.fake.entries().filter(([p]) =>
    !p.startsWith(operationCollections.leases + "/"));
}

test("reassignment preserves departure, deadline, report and permissions",
  async () => {
    const h = await setup();
    const before = domain(h).filter(([p]) => !p.startsWith("operation"));
    const original = await h.view();
    const oldReport = {expectedSourceHash: original.sourceHash, command: {
      kind: "recordCheckpoint", context: original.context,
      eventId: original.context.eventId, operationId: randomUUID(), payload: {
        groupId: original.groupId, checkpointId: original.checkpointId,
        expectedProgressRevision: original.progressRevision,
        expectedCheckpointRevision: original.revision,
        accountedFor: [h.attendeeId], correctionReason: null}}};
    const result = await h.owners.reassign(manager, await h.assign());
    assert.equal(result.outcome, "applied");
    assert.equal(result.operationRevision, 1);
    assert.equal(result.view.assignment?.change?.assignedBy, manager);
    assert.equal(result.view.assignment?.change?.previousResponsibleOperatorId,
      manager);
    assert.equal(result.view.request?.responsibleOperatorId, "first");
    assert.equal(result.view.request?.dueAt, h.request.dueAt);
    assert.equal(result.view.sourceHash, original.sourceHash);
    for (const [path, saved] of before) {
      assert.deepEqual(await h.read(path), saved);
    }
    assert.equal((await h.reports.record(manager, oldReport)).view.request
      ?.state, "complete");
    await h.work.processReport(h.reportId, "complete");
    assert.equal((await h.work.get(h.id)).item.primaryStage, "report_complete");
    await h.report([], "Corrected count");
    await h.work.processReport(h.reportId, "correction");
    const reopened = await h.work.get(h.id);
    assert.equal(reopened.item.primaryStage, "host_review");
    assert.equal(reopened.payload.reassignment?.responsibleOperatorId, "first");
    assert.equal((await h.view()).request?.state, "discrepancy");
  });

test("independent ownership revisions tolerate workers and replay old changes",
  async () => {
    const h = await setup();
    const first = await h.assign();
    await h.work.process(h.id);
    const a = await h.owners.reassign(manager, first);
    const second = await h.assign("second");
    h.clock.now++;
    await h.work.processReport(h.reportId, "background");
    await h.owners.reassign(manager, second);
    const saved = domain(h);
    const replay = await h.owners.reassign(manager, first);
    assert.equal(replay.outcome, "replayed");
    assert.equal(replay.operationRevision, 1);
    assert.equal(replay.view.assignment?.revision, 2);
    assert.equal(replay.view.request?.responsibleOperatorId, "second");
    assert.deepEqual(domain(h), saved);
    assert.notEqual(a.view.assignment?.sourceHash,
      replay.view.assignment?.sourceHash);
    await assert.rejects(h.owners.reassign(manager, {...first,
      command: {...first.command, payload: {...first.command.payload,
        reason: "Different request"}}}), {code: "aborted"});
  });

test("stale reviews cannot overwrite assignments or complete reports",
  async () => {
    const h = await setup();
    const first = await h.assign();
    const second = await h.assign("second");
    await h.owners.reassign(manager, first);
    await assert.rejects(h.owners.reassign(manager, second), {code: "aborted"});
    const prior = await h.assign("second");
    await h.report([h.attendeeId]);
    await assert.rejects(h.owners.reassign(manager, prior), {code: "aborted"});
    await assert.rejects(h.owners.reassign(manager, await h.assign("second")),
      {code: "failed-precondition"});
    const replay = await h.owners.reassign(manager, first);
    assert.equal(replay.view.request?.state, "complete");
    await h.report([], "Count correction");
    assert.equal((await h.owners.reassign(manager, await h.assign("second")))
      .view.request?.responsibleOperatorId, "second");
  });

test("manager authority precedes guest reads and target access is required",
  async () => {
    const h = await setup();
    const input = await h.assign();
    h.fake.beforeRead = (p) => {
      if (p.startsWith("eventAssistanceDepartureRosters/")) {
        throw new Error("unauthorized roster read");
      }
    };
    for (const actor of ["unknown", "first"]) {
      await assert.rejects(h.owners.reassign(actor, input),
        {code: "permission-denied"});
    }
    h.fake.beforeRead = undefined;
    await assert.rejects(h.owners.reassign(manager, await h.assign("missing")),
      {code: "permission-denied"});
    await assert.rejects(h.owners.reassign(manager, await h.assign(manager)),
      {code: "failed-precondition"});
    await h.grant("first", h.scope.groupId, "sweep", h.request.dueAt);
    await assert.rejects(h.owners.reassign(manager, await h.assign()),
      {code: "failed-precondition"});
    await h.groups();
    await h.grant("outsider", "fast", "sweep");
    await assert.rejects(h.owners.reassign(manager, await h.assign("outsider")),
      {code: "failed-precondition"}); // Original departure setup changed.
  });

test("overdue reassignment keeps lateness and uses the new owner's expiry",
  async () => {
    const h = await setup();
    await h.owners.reassign(manager, await h.assign());
    h.clock.now = h.request.dueAt + 1000;
    const result = await h.owners.reassign(manager, await h.assign("second"));
    assert.equal(result.view.request?.state, "overdue");
    assert.equal(result.view.request?.dueAt, h.request.dueAt);
    const work = await h.work.get(h.id);
    assert.equal(work.payload.checkpoint.dueAt, 1_100_000);
    h.clock.now = 1_100_000;
    await h.work.process(h.id);
    assert.equal((await h.view()).request?.ownerAvailability,
      "needsReassignment");
    h.clock.now = 3_000_001;
    await h.put("events/" + h.scope.context.eventId,
      {...h.seed.event, status: "cancelled"});
    const closed = await h.owners.reassign(manager, await h.assign(manager));
    assert.equal(closed.view.request?.state, "overdue");
    assert.equal(closed.view.request?.ownerAvailability, "current");
  });

test("late expiry and interrupted commits cannot partially transfer ownership",
  async () => {
    for (const failure of ["expiry", "commit"] as const) {
      const h = await setup();
      await h.grant("first", h.scope.groupId, "sweep", 1_040_000);
      const input = await h.assign();
      const before = domain(h);
      const staffPath = "eventStaffGrants/" +
        eventStaffGrantId(h.scope.context.eventId, "first");
      let targetRead = false;
      h.fake.beforeRead = (path) => {
        if (path === staffPath) targetRead = true;
        if (targetRead && path.startsWith(operationCollections.leases + "/")) {
          if (failure === "expiry") h.clock.now = 1_040_000;
          else h.fake.failNextCommit = true;
        }
      };
      await assert.rejects(h.owners.reassign(manager, input),
        failure === "expiry" ? {code: "failed-precondition"} : /interruption/);
      h.fake.beforeRead = undefined;
      assert.deepEqual(domain(h), before);
    }
  });

test("reassignment requires intact domain and Operations receipt evidence",
  async () => {
    for (const missing of ["domain", "operation"]) {
      const h = await setup();
      const input = await h.assign();
      const result = await h.owners.reassign(manager, input);
      const id = result.view.assignment!.change!.receiptId;
      if (missing === "domain") {
        h.fake.remove(
          "eventAssistanceCheckpointReceipts/" + id);
      } else {
        const receipt = h.fake.entries().find(([path, v]) =>
          path.startsWith(operationCollections.actionReceipts + "/") &&
          v.operation === "checkpoint_report_reassign")!;
        h.fake.remove(receipt[0]);
      }
      await assert.rejects(h.view(),
        /Invalid or inconsistent live assistance work/);
      await assert.rejects(h.owners.reassign(manager, input),
        /Invalid or inconsistent live assistance work/);
      await h.work.processReport(h.reportId, "missing-evidence");
      const c = (await h.work.get(h.id)).payload.checkpoint;
      assert.equal(c.observation?.kind, "unavailable");
    }
  });

test("callable authenticates before limiting and rejects invalid live commands",
  async () => {
    const calls: string[] = [];
    const deps = {db: () => ({}) as Firestore, rateLimit: async () => {
      calls.push("limit");
    }, store: () => ({reassign: async () => {
      calls.push("write"); return {} as Response;
    }})};
    await assert.rejects(handler({data: {}} as CallableRequest, deps),
      {code: "unauthenticated"});
    assert.deepEqual(calls, []);
    await handler({auth: {uid: manager}, data: {}} as CallableRequest, deps);
    assert.deepEqual(calls, ["limit", "write"]);
    const h = await setup();
    const input = await h.assign();
    for (const command of [
      {...input.command, eventId: "other"},
      {...input.command, payload: {...input.command.payload, reason: "   "}},
      {...input.command, payload: {...input.command.payload,
        responsibleOperatorId: "bad/uid"}},
      {...input.command, context: {mode: "rehearsal", rehearsalId: "r",
        virtualEventId: "v", clockId: "c"}},
    ]) {
      await assert.rejects(h.owners.reassign(manager, {...input, command}),
        {code: "invalid-argument"});
    }
  });

test("Firestore competing assignments have one winner and retry safely", {
  skip: !process.env.FIRESTORE_EMULATOR_HOST,
}, async () => {
  const app = initializeApp({projectId: "demo-catch-rules"},
    "checkpoint-reassignment-" + randomUUID());
  try {
    const h = await setup(getEmulatorFirestore(app));
    const input = await h.assign();
    const results = await Promise.allSettled(Array.from({length: 6}, () =>
      h.owners.reassign(manager, input)));
    const applied = results.filter((r) => r.status === "fulfilled" &&
      r.value.outcome === "applied");
    assert.equal(applied.length, 1);
    for (const r of results) {
      if (r.status === "rejected") assert.equal(r.reason.code, "aborted");
    }
    const replay = await h.owners.reassign(manager, input);
    assert.equal(replay.outcome, "replayed");
    assert.equal(replay.view.assignment?.revision, 1);
    assert.equal(replay.view.request?.responsibleOperatorId, "first");
    assert.equal((await h.read(h.attendeePath))!.attendanceRevision, 7);
    await h.work.processReport(h.reportId, "after-assignment");
    assert.equal((await h.view()).request?.responsibleOperatorId, "first");
  } finally {
    await deleteApp(app);
  }
});
