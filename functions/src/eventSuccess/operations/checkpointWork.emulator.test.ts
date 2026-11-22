import {getEmulatorFirestore} from "../../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import test from "node:test";
import {randomUUID} from "node:crypto";
import {deleteApp, initializeApp} from "firebase-admin/app";
import {Firestore, Timestamp} from "firebase-admin/firestore";
import {accountabilityResolutionFields} from
  "../../domain/bookings/attendeeAccountability";
import {operationCollections} from "../../operations/collections";
import {operationResourceLeaseId} from
  "../../operations/firestoreLeaseRepository";
import {eventStaffGrantId} from "../../shared/eventOperatorAuthority";
import {AssistanceCheckpointWorkStore} from "./checkpointWorkStore";
import {checkpointWorkIds, readCheckpointWorkRecords} from
  "./checkpointWorkRecords";
import {EventCheckpointStore} from "./checkpointStore";
import {checkpointIdentity} from "./checkpointRecords";
import {departureRosterHarness} from "./departureRosterTestFixtures";
import {progressFixtureManager as manager} from "./groupProgressTestFixtures";
import {AssistanceSourceWorkStore} from "./sourceWorkStore";
import {enqueueAssistanceSourceChange, sourceWakeScopes} from
  "./sourceWorkSignals";
import {evaluateDueAssistanceWork, processChangedAssistanceWork} from
  "./liveWorkTriggers";
import {AssistanceDeliveryWorkStore} from "./deliveryWorkStore";
import {AssistanceRosterWorkStore} from "./rosterWorkStore";
import {LiveAssistanceWorkRunner} from "./liveWorkRunner";

async function setup(real?: Firestore, reporter = manager) {
  const h = await departureRosterHarness(real);
  if (reporter !== manager) await h.grant(reporter, h.scope.groupId, "sweep");
  const input = await h.command();
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
  const source = new AssistanceSourceWorkStore(h.db, () => h.clock.now);
  const report = async (ids: string[],
    correctionReason: string | null = null) => {
    const view = (await reports.get(manager, scope)).view;
    return reports.record(manager, {expectedSourceHash: view.sourceHash,
      command: {kind: "recordCheckpoint", context: scope.context,
        eventId: scope.context.eventId, operationId: randomUUID(), payload: {
          groupId: scope.groupId, checkpointId: scope.checkpointId,
          expectedProgressRevision: scope.progressRevision,
          expectedCheckpointRevision: view.revision, accountedFor: ids,
          correctionReason}}});
  };
  const current = () => work.get(id);
  const changeMember = async (change: Record<string, unknown> | null,
    eventId = randomUUID()) => {
    const before = (await readMember())!;
    if (change) await h.put(h.attendeePath, {...before, ...change});
    else await h.db.doc(h.attendeePath).delete();
    return {source: {collection: "eventAttendees" as const,
      documentId: h.attendeeId, eventId, occurredAt: h.clock.now},
    before: {generation: 1, value: before},
    after: change ? {generation: 1, value: (await readMember())!} : null};
  };
  const readMember = () => h.read(h.attendeePath);
  return {...h, request, departure, checkpointScope: scope,
    reportId, id, reports, work, source, report, current, changeMember};
}

function observed(value: Awaited<ReturnType<
  AssistanceCheckpointWorkStore["get"]>>) {
  const o = value.payload.checkpoint.observation;
  assert.equal(o?.kind, "observed");
  if (o?.kind !== "observed") throw new Error("Expected observed request");
  return o;
}

test("explicit departure enrolls one request and unrecorded departures do not",
  async () => {
    const h = await departureRosterHarness();
    assert.ok(!h.fake.entries().some(([path]) =>
      path.startsWith(operationCollections.workItems + "/")));
    const input = await h.command();
    const request = {responsibleOperatorId: manager, dueAt: h.clock.now + 1000};
    const withRequest = {...input, command: {...input.command,
      payload: {...input.command.payload, checkpointRequest: request}}};
    const before = h.fake.entries();
    h.fake.failNextCommit = true;
    await assert.rejects(h.progress.confirmDeparture(manager, withRequest),
      /interruption/);
    assert.deepEqual(h.fake.entries(), before);
    const result = await h.progress.confirmDeparture(manager, withRequest);
    const records = h.fake.entries().filter(([path]) =>
      path.startsWith(operationCollections.workItems + "/"));
    assert.equal(records.length, 1);
    const work = new AssistanceCheckpointWorkStore(h.db, () => h.clock.now);
    const saved = await work.get(records[0][1].workItemId as string);
    assert.deepEqual(saved.payload.request, request);
    assert.equal(saved.payload.scope.progressRevision, result.view.revision);
    assert.equal(saved.item.expiresAt, null);
    assert.equal(saved.item.primaryStage, "report_requested");
    assert.deepEqual(saved.item.taskFlags, ["operator_action_required"]);
    await h.progress.confirmDeparture(manager, withRequest);
    assert.equal(h.fake.entries().filter(([p]) =>
      p.startsWith(operationCollections.workItems + "/")).length, 1);
    await h.progress.confirmDeparture(manager, await h.command());
    assert.equal(h.fake.entries().filter(([p]) =>
      p.startsWith(operationCollections.workItems + "/")).length, 1);
  });

test("deadline processing raises overdue follow-up once without domain effects",
  async () => {
    const h = await setup();
    const before = await h.read(h.attendeePath);
    assert.deepEqual(await h.work.listDue(10), [h.id]);
    await h.work.process(h.id);
    const waiting = await h.current();
    assert.equal(observed(waiting).request.state, "awaitingReport");
    assert.equal(waiting.payload.checkpoint.dueAt, h.request.dueAt);
    assert.deepEqual(await h.work.listDue(10), []);
    assert.equal((await h.work.process(h.id)).kind, "idle");
    h.clock.now = h.request.dueAt;
    assert.deepEqual(await h.work.listDue(10), [h.id]);
    await h.work.process(h.id);
    const overdue = await h.current();
    assert.equal(observed(overdue).request.state, "overdue");
    assert.equal(overdue.payload.checkpoint.dueAt, null);
    assert.deepEqual(overdue.item.blockerCodes, ["overdue"]);
    assert.deepEqual(overdue.item.taskFlags, ["human_review_required"]);
    assert.equal((await h.work.process(h.id)).kind, "idle");
    assert.deepEqual(await h.read(h.attendeePath), before);
    assert.equal((await h.reports.get(manager, h.checkpointScope)).view.report,
      null);
    assert.ok(h.fake.entries().every(([path]) =>
      !path.startsWith("eventAssistanceMessages/")));
  });

test("corrections reopen completed work; old wakes never reapply",
  async () => {
    const h = await setup();
    await h.work.process(h.id);
    await h.report([h.attendeeId]);
    await h.work.processReport(h.reportId, "complete-signal");
    const complete = await h.current();
    assert.equal(observed(complete).request.state, "complete");
    assert.equal(complete.item.primaryStage, "report_complete");
    assert.equal(complete.payload.checkpoint.dueAt, null);
    assert.deepEqual(complete.item.taskFlags, []);
    assert.equal(complete.run.status, "running");
    assert.equal(complete.item.lifecycleStatus, "waiting");
    await h.report([], "Correction after counting the wrong person");
    await h.work.processReport(h.reportId, "correction-signal");
    const reopened = await h.current();
    assert.equal(observed(reopened).request.state, "discrepancy");
    assert.equal(observed(reopened).reportRevision, 2);
    assert.equal(reopened.item.primaryStage, "host_review");
    assert.equal((await h.work.processReport(h.reportId,
      "complete-signal")).kind, "idle");
    assert.deepEqual(await h.current(), reopened);
    await h.report([h.attendeeId]);
    await h.work.processReport(h.reportId, "new-complete-signal");
    assert.equal(observed(await h.current()).reportRevision, 3);
    assert.equal(observed(await h.current()).request.state, "complete");
  });

test("staff revocation wakes the owner obligation through bounded fanout",
  async () => {
    const h = await setup(undefined, "sweep");
    await h.work.process(h.id);
    const path = "eventStaffGrants/" +
      eventStaffGrantId(h.scope.context.eventId, "sweep");
    const staff = (await h.read(path))!;
    h.fake.remove(path);
    const change = {source: {collection: "eventStaffGrants" as const,
      documentId: path.split("/")[1], eventId: "staff-revoked",
      occurredAt: h.clock.now}, before: {value: staff, generation: 1},
    after: null};
    assert.deepEqual(sourceWakeScopes(change),
      [{context: h.scope.context, attendeeId: null}]);
    const jobs = await enqueueAssistanceSourceChange(h.source, change);
    assert.equal(jobs.length, 1);
    await h.source.process(jobs[0]);
    const waiting = await h.current();
    assert.equal(observed(waiting).request.ownerAvailability,
      "needsReassignment");
    assert.equal(observed(waiting).request.responsibleOperatorId, "sweep");
    assert.deepEqual(waiting.item.blockerCodes, ["reporter_unavailable"]);
    assert.equal((await h.source.get(jobs[0])).run.status, "completed");
    const previous = waiting.item.revision;
    await h.source.process(jobs[0]);
    assert.equal((await h.current()).item.revision, previous);
    assert.equal(await h.source.hasTargets({context: h.scope.context,
      attendeeId: h.attendeeId}), false);
  });

test("owner expiry has a due wake; event completion cannot erase follow-up",
  async () => {
    const h = await setup(undefined, "sweep");
    await h.work.process(h.id);
    h.clock.now = h.request.dueAt;
    await h.work.process(h.id);
    const overdue = await h.current();
    assert.equal(overdue.payload.checkpoint.dueAt, 1_100_000);
    h.clock.now = overdue.payload.checkpoint.dueAt!;
    await h.work.process(h.id);
    assert.equal(observed(await h.current()).request.ownerAvailability,
      "needsReassignment");
    h.clock.now = 3_000_001;
    await h.put("events/" + h.scope.context.eventId,
      {...h.seed.event, status: "cancelled"});
    await h.work.process(h.id, {kind: "wake", signalId: "event-ended"});
    assert.equal(observed(await h.current()).request.state, "overdue");
    await h.report([h.attendeeId]);
    await h.work.processReport(h.reportId, "late-observation");
    assert.equal(observed(await h.current()).request.state, "complete");
  });

test("event source pages resume across all saved checkpoint requests",
  async () => {
    const h = await setup();
    for (let i = 1; i < 25; i++) {
      const input = await h.command();
      await h.progress.confirmDeparture(manager, {...input,
        command: {...input.command, payload: {...input.command.payload,
          checkpointRequest: h.request}}});
    }
    const changed = {...h.seed.event, status: "cancelled"};
    await h.put("events/" + h.scope.context.eventId, changed);
    const jobs = await enqueueAssistanceSourceChange(h.source, {
      source: {collection: "events", documentId: h.scope.context.eventId,
        eventId: "event-cancelled", occurredAt: h.clock.now},
      before: {value: h.seed.event, generation: 1},
      after: {value: changed, generation: 1}});
    assert.equal(jobs.length, 1);
    await h.source.process(jobs[0]);
    assert.equal((await h.source.get(jobs[0])).payload.checkpoint.visited, 20);
    await h.source.process(jobs[0]);
    const finished = await h.source.get(jobs[0]);
    assert.equal(finished.run.status, "completed");
    assert.equal(finished.payload.checkpoint.visited, 25);
    const requests = h.fake.entries().filter(([path, value]) =>
      path.startsWith(operationCollections.workItems + "/") &&
      value.entityKind === "checkpoint_report");
    assert.equal(requests.length, 25);
    assert.ok(requests.every(([, value]) => value.revision === 1));
  });

test("disposition corrections wake original requests without claiming arrival",
  async () => {
    const h = await setup();
    await h.work.process(h.id);
    for (const disposition of ["departed", "unresolved"] as const) {
      const change = await h.changeMember(accountabilityResolutionFields(
        (await h.read(h.attendeePath))! as typeof h.attendee,
        disposition, manager, Timestamp.fromMillis(h.clock.now)));
      const jobs = await enqueueAssistanceSourceChange(h.source, change, {
        enqueueCurrent: async () => {
          throw new Error("A disposition must not enroll guests");
        }});
      assert.equal(jobs.length, 1);
      const job = await h.source.get(jobs[0]);
      assert.ok("kind" in job.payload.scope &&
        job.payload.scope.kind === "checkpointMember");
      const previous = (await h.current()).item.revision;
      await h.source.process(jobs[0]);
      const current = await h.current();
      assert.equal(current.item.revision, previous + 1);
      assert.equal(observed(current).request.state, "awaitingReport");
      assert.equal((await h.source.get(jobs[0])).item.outcome, "complete");
      assert.deepEqual(await enqueueAssistanceSourceChange(h.source, change),
        jobs);
      await h.source.process(jobs[0]);
      assert.deepEqual(await h.current(), current);
    }
    assert.equal((await h.reports.get(manager, h.checkpointScope))
      .view.report, null);
    assert.equal((await h.read(h.attendeePath))!.attendanceRevision, 7);
    assert.ok(h.fake.entries().every(([path]) =>
      !path.startsWith("eventAssistanceMessages/") &&
      !path.startsWith("eventAssistanceGuests/")));
  });

test("member discovery advances bounded pages and skips unrelated rosters",
  async () => {
    const h = await setup();
    const selected = new Set([h.id]);
    for (let i = 1; i < 25; i++) {
      const included = i % 3 === 0;
      const input = await h.command(included ? [h.attendeeId] : []);
      const result = await h.progress.confirmDeparture(manager, {...input,
        command: {...input.command, payload: {...input.command.payload,
          checkpointRequest: h.request}}});
      if (included) {
        selected.add(checkpointWorkIds(checkpointIdentity({
          ...h.checkpointScope, progressRevision: result.view.revision}))
          .workItemId);
      }
    }
    const change = await h.changeMember({attendanceRevision: 8});
    const jobs = await enqueueAssistanceSourceChange(h.source, change);
    assert.equal(jobs.length, 1, "No guest work or enrollment is inferred");
    const original = (await h.current()).payload;
    await h.source.process(jobs[0]);
    assert.equal((await h.source.get(jobs[0])).payload.checkpoint.visited, 20);
    await h.source.process(jobs[0]);
    const finished = await h.source.get(jobs[0]);
    assert.equal(finished.payload.checkpoint.visited, 25);
    assert.equal(finished.item.outcome, "complete");
    for (const [, value] of h.fake.entries().filter(([, v]) =>
      v.entityKind === "checkpoint_report")) {
      assert.equal(value.revision, selected.has(value.workItemId as string) ?
        1 : 0);
    }
    assert.deepEqual((await h.current()).payload.request, original.request);
    assert.equal((await h.current()).payload.rosterHash, original.rosterHash);
    assert.equal(await h.work.includesDepartureMember(h.id, "other"), false);
    assert.equal(await h.source.hasTargets({kind: "checkpointMember",
      context: {...h.scope.context, organizerId: "foreign"},
      attendeeId: h.attendeeId}), false);
    const view = (await h.reports.get(manager, h.checkpointScope)).view;
    assert.equal(view.availability.kind, "ready");
    if (view.availability.kind === "ready") {
      assert.deepEqual(view.availability.members[0].visit,
        {kind: "unavailable", reason: "visitChanged"});
    }
  });

test("unreadable original rosters remain in bounded retry",
  async () => {
    const h = await setup();
    const change = await h.changeMember({accountabilityRevision: 1});
    const jobs = await enqueueAssistanceSourceChange(h.source, change);
    const path = "eventAssistanceDepartureRosters/" +
      (await h.current()).payload.rosterId;
    const original = (await h.read(path))!;
    await h.put(path, {...original, members: []});
    await h.source.process(jobs[0]);
    let job = (await h.source.get(jobs[0])).payload;
    assert.equal(job.checkpoint.phase, "retry");
    assert.deepEqual(job.checkpoint.failures,
      [{workItemId: h.id, reason: "unavailable"}]);
    assert.equal((await h.current()).item.revision, 0);
    await h.put(path, original);
    h.clock.now = job.checkpoint.dueAt!;
    await h.source.process(jobs[0]);
    job = (await h.source.get(jobs[0])).payload;
    assert.equal(job.checkpoint.phase, "complete");
    assert.equal((await h.current()).item.revision, 1);
  });

test("Firestore member deletion refreshes the original departure only once", {
  skip: !process.env.FIRESTORE_EMULATOR_HOST, timeout: 60_000,
}, async () => {
  const app = initializeApp({projectId: "demo-catch-rules"},
    "checkpoint-member-" + randomUUID());
  try {
    const h = await setup(getEmulatorFirestore(app));
    await h.work.process(h.id);
    const change = await h.changeMember(null);
    const [one, two] = await Promise.all([
      enqueueAssistanceSourceChange(h.source, change),
      enqueueAssistanceSourceChange(h.source, change)]);
    assert.deepEqual(one, two);
    assert.equal(one.length, 1);
    const previous = (await h.current()).item.revision;
    await h.source.process(one[0]);
    assert.equal((await h.current()).item.revision, previous + 1);
    await h.source.process(one[0]);
    assert.equal((await h.current()).item.revision, previous + 1);
    const view = (await h.reports.get(manager, h.checkpointScope)).view;
    assert.equal(view.availability.kind, "ready");
    if (view.availability.kind === "ready") {
      assert.deepEqual(view.availability.members[0].visit,
        {kind: "unavailable", reason: "registrationMissing"});
    }
    assert.equal(view.report, null);
  } finally {
    await deleteApp(app);
  }
});

test("unreadable facts have five retries and recover from a fresh wake",
  async () => {
    const h = await setup();
    h.fake.beforeRead = (path) => {
      if (path.startsWith("eventAssistanceDepartureRosters/")) {
        throw new Error("temporary source outage");
      }
    };
    for (let i = 1; i <= 5; i++) {
      await h.work.process(h.id);
      const current = await h.current();
      assert.equal(current.payload.checkpoint.failures, i);
      assert.equal(current.payload.checkpoint.observation?.kind, "unavailable");
      assert.deepEqual(current.item.blockerCodes, ["facts_unavailable"]);
      if (i < 5) h.clock.now = current.payload.checkpoint.dueAt!;
      else assert.equal(current.payload.checkpoint.dueAt, null);
    }
    assert.equal((await h.work.process(h.id)).kind, "idle");
    h.fake.beforeRead = undefined;
    await h.work.process(h.id, {kind: "wake", signalId: "source-restored"});
    const current = await h.current();
    assert.equal(current.payload.checkpoint.failures, 0);
    assert.equal(observed(current).request.state, "overdue");
  });

test("interrupted checkpoints roll back; duplicate wake receipts apply once",
  async () => {
    const h = await setup();
    const original = await h.current();
    const prepare = h.work.operations.prepareWorkItemAction.bind(
      h.work.operations);
    h.work.operations.prepareWorkItemAction = async (...args) => {
      const result = await prepare(...args);
      h.fake.failNextCommit = true;
      return result;
    };
    await assert.rejects(h.work.process(h.id), /interruption/);
    assert.deepEqual(await h.current(), original);
    h.work.operations.prepareWorkItemAction = prepare;
    await h.work.process(h.id, {kind: "wake", signalId: "same-signal"});
    const saved = await h.current();
    const receipts = h.fake.entries().filter(([path]) =>
      path.startsWith(operationCollections.actionReceipts + "/"));
    assert.equal(receipts.length, 1);
    await h.work.process(h.id, {kind: "wake", signalId: "same-signal"});
    assert.deepEqual(await h.current(), saved);
    assert.equal(h.fake.entries().filter(([path]) =>
      path.startsWith(operationCollections.actionReceipts + "/")).length, 1);
  });

test("expired leases cannot publish a read and do not spin on busy work",
  async () => {
    const h = await setup();
    const original = await h.current();
    const lease = await h.work.operations.acquireLease({
      leaseId: operationResourceLeaseId("work_item", h.id),
      resourceType: "work_item", resourceId: h.id, ownerId: "other-worker",
      idempotencyKey: "other-claim", acquiredAt: new Date(h.clock.now)
        .toISOString(), expiresAt: new Date(h.clock.now + 1000).toISOString()});
    assert.equal((await h.work.process(h.id)).kind, "busy");
    await h.work.operations.releaseLease({...lease,
      releasedAt: new Date(h.clock.now).toISOString()});
    h.fake.beforeRead = (path) => {
      if (path.startsWith("eventAssistanceDepartureRosters/")) {
        h.clock.now += 60_001;
      }
    };
    await assert.rejects(h.work.process(h.id), {code: "lease_expired"});
    h.fake.beforeRead = undefined;
    assert.deepEqual(await h.current(), original);
  });

test("work and event identity drift never creates an inferred completion",
  async () => {
    const h = await setup();
    const initial = await h.current();
    for (const field of ["priority", "expiresAt", "primaryStage"] as const) {
      assert.throws(() => readCheckpointWorkRecords(initial.run,
        {...initial.item, [field]: field === "priority" ? 999 : "wrong"},
        h.id, h.clock.now));
    }
    assert.throws(() => readCheckpointWorkRecords({...initial.run,
      status: "completed"}, initial.item, h.id, h.clock.now));
    const rosterPath = "eventAssistanceDepartureRosters/" +
      initial.payload.rosterId;
    const roster = (await h.read(rosterPath))!;
    await h.put(rosterPath, {...roster, checkpointRequest: {...h.request,
      responsibleOperatorId: "other"}});
    await h.work.process(h.id);
    assert.equal((await h.current()).payload.checkpoint.observation?.kind,
      "unavailable");
    await h.put(rosterPath, roster);
    await h.put("events/" + h.scope.context.eventId,
      {...h.seed.event, itinerary: []});
    await h.work.process(h.id, {kind: "wake", signalId: "setup-changed"});
    assert.equal(observed(await h.current()).request.state,
      "sourceUnavailable");
    assert.equal((await h.work.processReport(
      "checkpoint:" + "a".repeat(64), "missing")).kind, "idle");
  });

test("work enqueue reads cannot overrun deadline or event authority",
  async () => {
    const h = await departureRosterHarness();
    const input = await h.command();
    const deadline = h.clock.now + 1000;
    const before = h.fake.entries();
    h.fake.beforeRead = (path) => {
      if (path.startsWith(operationCollections.workItems + "/")) {
        h.clock.now = deadline + 1;
      }
    };
    await assert.rejects(h.progress.confirmDeparture(manager, {...input,
      command: {...input.command, payload: {...input.command.payload,
        checkpointRequest: {responsibleOperatorId: manager,
          dueAt: deadline}}}}), {code: "failed-precondition"});
    assert.deepEqual(h.fake.entries(), before);
  });

test("due orchestration and work changes select checkpoint jobs explicitly",
  async () => {
    const h = await setup();
    const ports = {checkpoint: h.work, source: h.source,
      delivery: new AssistanceDeliveryWorkStore(h.db, () => h.clock.now),
      roster: new AssistanceRosterWorkStore(h.db, () => h.clock.now),
      guest: new LiveAssistanceWorkRunner(h.db, () => h.clock.now)};
    await processChangedAssistanceWork(h.id, (await h.current()).item, ports,
      h.clock.now);
    assert.equal((await h.current()).item.revision, 1);
    h.clock.now = h.request.dueAt;
    const tick = await evaluateDueAssistanceWork(ports);
    assert.equal(tick.checkpointItems, 1);
    assert.equal(observed(await h.current()).request.state, "overdue");
    assert.equal((await evaluateDueAssistanceWork(ports)).checkpointItems, 0);
  });

test("Firestore arbitrates checkpoint work and reopens a corrected report", {
  skip: !process.env.FIRESTORE_EMULATOR_HOST, timeout: 60_000,
}, async () => {
  const app = initializeApp({projectId: "demo-catch-rules"},
    "checkpoint-work-" + randomUUID());
  try {
    const h = await setup(getEmulatorFirestore(app));
    assert.ok((await h.work.listDue(100)).includes(h.id));
    const results = await Promise.all(Array.from({length: 6}, () =>
      h.work.process(h.id, {kind: "wake", signalId: "concurrent"})));
    assert.equal(results.filter((r) => r.kind === "committed").length, 1);
    const first = await h.current();
    assert.equal(first.item.revision, 1);
    await h.report([h.attendeeId]);
    await h.work.processReport(h.reportId, "complete");
    assert.equal(observed(await h.current()).request.state, "complete");
    await h.report([], "Corrected report");
    await h.work.processReport(h.reportId, "correct");
    assert.equal(observed(await h.current()).request.state, "discrepancy");
    assert.equal((await h.read(h.attendeePath))!.attendanceRevision, 7);
  } finally {
    await deleteApp(app);
  }
});
