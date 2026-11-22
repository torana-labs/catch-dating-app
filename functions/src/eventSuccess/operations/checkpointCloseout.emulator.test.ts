import {getEmulatorFirestore} from "../../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import test from "node:test";
import {randomUUID} from "node:crypto";
import {deleteApp, initializeApp} from "firebase-admin/app";
import {Firestore} from "firebase-admin/firestore";
import type {CallableRequest} from "firebase-functions/v2/https";
import {operationCollections} from "../../operations/collections";
import {CheckpointCloseoutStore} from "./checkpointCloseoutStore";
import {setEventAssistanceCheckpointCloseoutHandler as handler} from
  "./checkpointCloseoutHandlers";
import {EventAccountabilityStore} from "./accountabilityStore";
import {CheckpointReporterStore} from "./checkpointReporterStore";
import {AssistanceCheckpointWorkStore} from "./checkpointWorkStore";
import {checkpointWorkIds} from "./checkpointWorkRecords";
import {EventCheckpointStore} from "./checkpointStore";
import {CHECKPOINT_RECEIPTS, checkpointIdentity, Response} from
  "./checkpointRecords";
import {departureRosterHarness} from "./departureRosterTestFixtures";
import {progressFixtureManager as manager} from "./groupProgressTestFixtures";
import {AssistanceSourceWorkStore} from "./sourceWorkStore";
import {enqueueAssistanceSourceChange} from "./sourceWorkSignals";

async function setup(real?: Firestore, reporter = manager, count = 1) {
  const h = await departureRosterHarness(real);
  await h.grant("first", h.scope.groupId, "sweep");
  await h.grant("second", h.scope.groupId, "sweep");
  const attendeeIds = [h.attendeeId];
  for (let i = 1; i < count; i++) {
    const id = h.attendeeId + "-" + i;
    await h.put("eventAttendees/" + id, h.attendee);
    attendeeIds.push(id);
  }
  const input = await h.command(attendeeIds);
  const request = {responsibleOperatorId: reporter,
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
  const closeouts = new CheckpointCloseoutStore(h.db, () => h.clock.now);
  const accounts = new EventAccountabilityStore(h.db, () => h.clock.now);
  const source = new AssistanceSourceWorkStore(h.db, () => h.clock.now);
  const view = async () => (await reports.get(manager, scope)).view;
  const report = async (ids: string[]) => {
    const v = await view();
    return reports.record(manager, {expectedSourceHash: v.sourceHash,
      command: {kind: "recordCheckpoint", context: scope.context,
        eventId: scope.context.eventId, operationId: randomUUID(), payload: {
          groupId: scope.groupId, checkpointId: scope.checkpointId,
          expectedProgressRevision: scope.progressRevision,
          expectedCheckpointRevision: v.revision, accountedFor: ids,
          correctionReason: v.report ? "Corrected count" : null}}});
  };
  const resolve = async (disposition: "returned" | "departed" | "unresolved",
    attendeeId = h.attendeeId) => {
    const v = (await accounts.get(manager, {context: scope.context,
      groupId: scope.groupId, attendeeId, checkpoint: {
        checkpointId: scope.checkpointId,
        progressRevision: scope.progressRevision}})).view;
    return accounts.resolve(manager, {groupId: scope.groupId,
      checkpoint: v.checkpoint, expectedSourceHash: v.sourceHash, command: {
        kind: "resolveAccountability", context: scope.context,
        eventId: scope.context.eventId, operationId: randomUUID(), payload: {
          attendeeId, episodeId: v.episodeId, disposition}}});
  };
  const ready = async () => {
    await report([]);
    await resolve("departed");
    return command(await view());
  };
  return {...h, attendeeIds, request, departure,
    checkpointScope: scope, reportId, id,
    reports, work, closeouts, source, view, report, resolve, ready};
}
function command(view: Response["view"],
  decision: "close" | "reopen" = "close") {
  assert.ok(view.closeout);
  return {expectedSourceHash: view.closeout.sourceHash, command: {
    kind: "setCheckpointCloseout", context: view.context,
    eventId: view.context.eventId, operationId: randomUUID(), payload: {
      groupId: view.groupId, checkpointId: view.checkpointId,
      expectedProgressRevision: view.progressRevision,
      expectedCloseoutRevision: view.closeout.revision,
      decision, reason: "Reviewed the original departure"}}};
}
function domain(h: Awaited<ReturnType<typeof setup>>) {
  return h.fake.entries().filter(([p]) =>
    !p.startsWith(operationCollections.leases + "/"));
}

test("closeout records full evidence without inventing checkpoint arrival",
  async () => {
    const h = await setup();
    const input = await h.ready();
    const original = await h.view();
    const records = await h.work.get(h.id);
    const before = domain(h).filter(([p]) => !p.startsWith("operation"));
    const result = await h.closeouts.set(manager, input);
    assert.equal(result.outcome, "applied");
    assert.equal(result.operationRevision, 1);
    assert.equal(result.view.request?.state, "closedOut");
    assert.equal(result.view.request?.ownerAvailability, "notRequired");
    assert.equal(result.view.closeout?.state.kind, "closedOut");
    assert.deepEqual(result.view.report, original.report);
    assert.equal(result.view.sourceHash, original.sourceHash);
    for (const [path, saved] of before) {
      assert.deepEqual(await h.read(path), saved);
    }
    const c = result.view.closeout!.change!;
    assert.equal(c.decision.kind, "close");
    if (c.decision.kind === "close") {
      assert.deepEqual(c.decision.report, original.report);
      assert.equal(c.decision.dispositions[0].attendeeId, h.attendeeId);
      assert.equal(c.decision.dispositions[0].disposition, "departed");
    }
    const next = await h.work.get(h.id);
    assert.equal(next.item.primaryStage, "report_closed_out");
    assert.deepEqual(next.item.taskFlags, []);
    assert.equal(next.payload.checkpoint.dueAt, null);
    assert.equal(next.item.candidateHash, records.item.candidateHash);
    assert.deepEqual(next.payload.request, records.payload.request);
    assert.equal(next.payload.rosterHash, records.payload.rosterHash);
    const saved = domain(h);
    assert.equal((await h.closeouts.set(manager, input)).outcome, "replayed");
    assert.deepEqual(domain(h), saved);
  });

test("closeout requires a report and a disposition for each unconfirmed guest",
  async () => {
    const h = await setup();
    assert.equal((await h.view()).closeout?.eligibility.kind, "unavailable");
    await assert.rejects(h.closeouts.set(manager, command(await h.view())),
      {code: "failed-precondition"});
    await h.report([]);
    assert.deepEqual((await h.view()).closeout?.eligibility,
      {kind: "unavailable", reason: "unresolvedMembers",
        attendeeIds: [h.attendeeId]});
    await assert.rejects(h.closeouts.set(manager, command(await h.view())),
      {code: "failed-precondition"});
    await h.report([h.attendeeId]);
    assert.deepEqual((await h.view()).closeout?.eligibility,
      {kind: "unavailable", reason: "reportComplete", attendeeIds: []});
    await assert.rejects(h.closeouts.set(manager, command(await h.view())),
      {code: "failed-precondition"});
    const empty = await departureRosterHarness();
    const departure = await empty.progress.confirmDeparture(manager,
      await empty.command());
    const v = (await new EventCheckpointStore(empty.db, () => empty.clock.now)
      .get(manager, {...empty.scope, checkpointId: "one",
        progressRevision: departure.view.revision})).view;
    assert.equal(v.closeout, null);
  });

test("mixed rosters require an explanation for each unconfirmed member",
  async () => {
    const h = await setup(undefined, manager, 3);
    const [arrived, returned, departed] = h.attendeeIds;
    await h.report([arrived]);
    await h.resolve("returned", returned);
    assert.deepEqual((await h.view()).closeout?.eligibility,
      {kind: "unavailable", reason: "unresolvedMembers",
        attendeeIds: [departed]});
    await assert.rejects(h.closeouts.set(manager, command(await h.view())),
      {code: "failed-precondition"});
    await h.resolve("departed", departed);
    const closed = await h.closeouts.set(manager, command(await h.view()));
    const proof = closed.view.closeout!.change!.decision;
    assert.equal(proof.kind, "close");
    if (proof.kind !== "close") throw new Error("Expected closeout evidence");
    assert.deepEqual(proof.report.accountedFor, [arrived]);
    assert.deepEqual(proof.dispositions.map((d) =>
      [d.attendeeId, d.disposition]),
    [[returned, "returned"], [departed, "departed"]]);
    await h.resolve("unresolved", arrived);
    assert.equal((await h.view()).closeout?.state.kind, "closedOut");
    await h.report([]);
    assert.deepEqual((await h.view()).closeout?.eligibility,
      {kind: "unavailable", reason: "unresolvedMembers",
        attendeeIds: [arrived]});
    await assert.rejects(h.closeouts.set(manager, command(await h.view())),
      {code: "failed-precondition"});
  });

test("review fences cover report and disposition changes but not worker ticks",
  async () => {
    const h = await setup();
    const original = await h.ready();
    await h.resolve("returned");
    await assert.rejects(h.closeouts.set(manager, original), {code: "aborted"});
    const revised = command(await h.view());
    await h.report([]);
    await assert.rejects(h.closeouts.set(manager, revised), {code: "aborted"});
    const current = command(await h.view());
    await h.work.process(h.id);
    h.clock.now++;
    await h.work.processReport(h.reportId, "background");
    assert.equal((await h.closeouts.set(manager, current)).outcome, "applied");
    await assert.rejects(h.closeouts.set(manager, command(await h.view())),
      {code: "failed-precondition"});
  });

test("disposition corrections reopen work and old retries retain current state",
  async () => {
    const h = await setup();
    const input = await h.ready();
    const closed = await h.closeouts.set(manager, input);
    const receiptPath = CHECKPOINT_RECEIPTS + "/" +
      closed.view.closeout!.change!.receiptId;
    const history = await h.read(receiptPath);
    const before = (await h.read(h.attendeePath))!;
    await h.resolve("unresolved");
    const jobs = await enqueueAssistanceSourceChange(h.source, {
      source: {collection: "eventAttendees", documentId: h.attendeeId,
        eventId: "corrected", occurredAt: h.clock.now},
      before: {generation: 1, value: before},
      after: {generation: 1, value: (await h.read(h.attendeePath))!}});
    for (const job of jobs) await h.source.process(job);
    assert.deepEqual((await h.view()).closeout?.state,
      {kind: "needsReview", reason: "dispositionChanged"});
    assert.equal((await h.work.get(h.id)).item.primaryStage, "host_review");
    assert.equal((await h.view()).request?.state, "discrepancy");
    assert.deepEqual(await h.read(receiptPath), history);
    const replay = await h.closeouts.set(manager, input);
    assert.equal(replay.outcome, "replayed");
    assert.equal(replay.view.closeout?.state.kind, "needsReview");
    await h.resolve("returned");
    const again = await h.closeouts.set(manager, command(await h.view()));
    assert.equal(again.operationRevision, 2);
    const reopened = await h.closeouts.set(manager,
      command(await h.view(), "reopen"));
    assert.equal(reopened.operationRevision, 3);
    assert.equal(reopened.view.closeout?.state.kind, "reopened");
    assert.equal(reopened.view.request?.state, "discrepancy");
    assert.equal((await h.closeouts.set(manager, input)).operationRevision, 1);
    assert.equal((await h.view()).closeout?.revision, 3);
    await assert.rejects(h.closeouts.set(manager,
      command(await h.view(), "reopen")), {code: "failed-precondition"});
  });

test("report corrections and changed visits retain history and require review",
  async () => {
    const h = await setup();
    const closed = await h.closeouts.set(manager, await h.ready());
    const history = closed.view.closeout!.change;
    await h.report([h.attendeeId]);
    await h.work.processReport(h.reportId, "complete");
    assert.equal((await h.view()).closeout?.state.kind, "superseded");
    assert.equal((await h.work.get(h.id)).item.primaryStage, "report_complete");
    await assert.rejects(h.closeouts.set(manager,
      command(await h.view(), "reopen")), {code: "failed-precondition"});
    await h.report([]);
    await h.work.processReport(h.reportId, "correct");
    assert.deepEqual((await h.view()).closeout?.state,
      {kind: "needsReview", reason: "reportChanged"});
    await h.closeouts.set(manager, command(await h.view()));
    const attendee = (await h.read(h.attendeePath))!;
    await h.put(h.attendeePath, {...attendee, attendanceRevision: 8});
    assert.equal((await h.view()).closeout?.state.kind, "needsReview");
    await assert.rejects(h.closeouts.set(manager, command(await h.view())),
      {code: "failed-precondition"});
    assert.deepEqual((await h.read(CHECKPOINT_RECEIPTS + "/" +
      history!.receiptId))!.closeout, history);
  });

test("current reporter or manager authority gates closeout and retries",
  async () => {
    const h = await setup(undefined, "first");
    const input = await h.ready();
    h.fake.beforeRead = (p) => {
      if (p.startsWith("eventAttendees/")) throw new Error("Unauthorized read");
    };
    await assert.rejects(h.closeouts.set("unknown", input),
      {code: "permission-denied"});
    h.fake.beforeRead = undefined;
    await assert.rejects(h.closeouts.set("second", input),
      {code: "permission-denied"});
    await h.closeouts.set("first", input);
    h.clock.now = 1_100_000;
    await assert.rejects(h.closeouts.set("first", input),
      {code: "permission-denied"});
    await h.put("events/" + h.scope.context.eventId,
      {...h.seed.event, status: "cancelled"});
    const result = await h.closeouts.set(manager,
      command(await h.view(), "reopen"));
    assert.equal(result.view.request?.ownerAvailability, "needsReassignment");
    const v = await h.view();
    const owners = new CheckpointReporterStore(h.db, () => h.clock.now);
    await owners.reassign(manager, {
      expectedSourceHash: v.assignment!.sourceHash,
      command: {kind: "reassignCheckpointReporter", context: v.context,
        eventId: v.context.eventId, operationId: randomUUID(), payload: {
          groupId: v.groupId, checkpointId: v.checkpointId,
          expectedProgressRevision: v.progressRevision,
          expectedAssignmentRevision: v.assignment!.revision,
          responsibleOperatorId: manager, reason: "Manager takeover"}}});
    await h.closeouts.set(manager, command(await h.view()));
  });

test("late expiry and interrupted commits cannot partially close a request",
  async () => {
    for (const failure of ["expiry", "commit"] as const) {
      const h = await setup(undefined, "first");
      const input = await h.ready();
      const before = domain(h);
      const prepare = h.closeouts.operations.prepareWorkItemAction.bind(
        h.closeouts.operations);
      h.closeouts.operations.prepareWorkItemAction = async (...args) => {
        const prepared = await prepare(...args);
        if (failure === "expiry") h.clock.now = 1_100_000;
        else h.fake.failNextCommit = true;
        return prepared;
      };
      await assert.rejects(h.closeouts.set("first", input),
        failure === "expiry" ? {code: "permission-denied"} : /interruption/);
      assert.deepEqual(domain(h), before);
    }
  });

test("closeout history is bound to its Operations receipt even after reopening",
  async () => {
    const h = await setup();
    const input = await h.ready();
    const closed = await h.closeouts.set(manager, input);
    const path = CHECKPOINT_RECEIPTS + "/" +
      closed.view.closeout!.change!.receiptId;
    const saved = (await h.read(path))!;
    await h.closeouts.set(manager, command(await h.view(), "reopen"));
    await h.put(path, {...saved, closeout: {...saved.closeout as object,
      reason: "Tampered historical evidence"}});
    await assert.rejects(h.closeouts.set(manager, input),
      /Invalid or inconsistent live assistance work/);
    await h.put(path, saved);
    assert.equal((await h.closeouts.set(manager, input)).outcome, "replayed");
    const current = (await h.view()).closeout!.change!;
    h.fake.remove(CHECKPOINT_RECEIPTS + "/" + current.receiptId);
    await assert.rejects(h.view(),
      /Invalid or inconsistent live assistance work/);
    await h.work.processReport(h.reportId, "missing-history");
    assert.equal((await h.work.get(h.id)).payload.checkpoint.observation?.kind,
      "unavailable");
  });

test("closeout callable authenticates first and rejects invalid commands",
  async () => {
    const calls: string[] = [];
    const deps = {db: () => ({}) as Firestore, rateLimit: async () => {
      calls.push("limit");
    }, store: () => ({set: async () => {
      calls.push("write"); return {} as Response;
    }})};
    await assert.rejects(handler({data: {}} as CallableRequest, deps),
      {code: "unauthenticated"});
    assert.deepEqual(calls, []);
    await handler({auth: {uid: manager}, data: {}} as CallableRequest, deps);
    assert.deepEqual(calls, ["limit", "write"]);
    const h = await setup();
    const input = await h.ready();
    for (const command of [
      {...input.command, eventId: "other"},
      {...input.command, payload: {...input.command.payload, reason: "   "}},
      {...input.command, payload: {...input.command.payload, accountedFor: []}},
      {...input.command, context: {mode: "rehearsal", rehearsalId: "r",
        virtualEventId: "v", clockId: "c"}},
    ]) {
      await assert.rejects(h.closeouts.set(manager, {...input, command}),
        {code: "invalid-argument"});
    }
  });

test("Firestore arbitrates closeouts and reopens corrected evidence", {
  skip: !process.env.FIRESTORE_EMULATOR_HOST, timeout: 60_000,
}, async () => {
  const app = initializeApp({projectId: "demo-catch-rules"},
    "checkpoint-closeout-" + randomUUID());
  try {
    const h = await setup(getEmulatorFirestore(app));
    const input = await h.ready();
    const results = await Promise.allSettled(Array.from({length: 6}, () =>
      h.closeouts.set(manager, input)));
    assert.equal(results.filter((r) => r.status === "fulfilled" &&
      r.value.outcome === "applied").length, 1);
    for (const r of results) {
      if (r.status === "rejected") assert.equal(r.reason.code, "aborted");
    }
    assert.equal((await h.closeouts.set(manager, input)).outcome, "replayed");
    assert.equal((await h.work.get(h.id)).item.primaryStage,
      "report_closed_out");
    await h.resolve("unresolved");
    await h.work.processReport(h.reportId, "corrected");
    assert.equal((await h.work.get(h.id)).item.primaryStage, "host_review");
    assert.equal((await h.view()).closeout?.state.kind, "needsReview");
    assert.deepEqual((await h.view()).report?.accountedFor, []);
    assert.equal((await h.read(h.attendeePath))!.attendanceRevision, 7);
  } finally {
    await deleteApp(app);
  }
});
