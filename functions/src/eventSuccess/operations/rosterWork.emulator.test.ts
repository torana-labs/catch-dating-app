import {getEmulatorFirestore} from "../../shared/testing/emulatorFirestore";
import {AssistanceCheckpointWorkStore} from "./checkpointWorkStore";
import {AssistanceDeliveryWorkStore} from "./deliveryWorkStore";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import test from "node:test";
import {deleteApp, initializeApp} from "firebase-admin/app";
import {Timestamp} from "firebase-admin/firestore";
import {operationCollections} from "../../operations/collections";
import {guestCollections, guestIdentity, parseGuest} from "./guestRecords";
import {AssistanceRosterWorkStore} from "./rosterWorkStore";
import {readRosterWorkRecords} from "./rosterWorkRecords";
import {liveWorkIds} from "./liveWorkRecords";
import {configureRuntime} from "./runtimeConfigTestHarness";
import {rosterHarness} from "./rosterWorkTestHarness";
import {AssistanceSourceChange, enqueueAssistanceSourceChange,
  rosterEnrollmentRequests} from "./sourceWorkSignals";
import {evaluateDueAssistanceWork, processChangedAssistanceWork} from
  "./liveWorkTriggers";
import {start} from "./whatsappTestHarness";

test("roster scan resumes after 20 guests and never creates duplicate work",
  async () => {
    const h = await rosterHarness(23);
    const created = await h.enqueue();
    assert.equal((await h.enqueue()).replayed, true);
    const triggerReplay = await h.enqueue({...h.input, source: {
      ...h.input.source, eventId: randomUUID(), occurredAt: start + 1}});
    assert.equal(triggerReplay.item.workItemId, created.item.workItemId);
    assert.equal(triggerReplay.replayed, true,
      "configuration trigger deliveries reuse the command's saved roster job");
    await h.roster.process(created.item.workItemId);
    const first = await h.roster.get(created.item.workItemId);
    assert.equal(first.payload.checkpoint.visited, 20);
    assert.equal(first.payload.checkpoint.phase, "scan");
    const restarted = new AssistanceRosterWorkStore(h.db, () => h.clock.now);
    const done = await h.scan(created.item.workItemId, restarted);
    assert.equal(done.payload.checkpoint.phase, "complete");
    assert.equal(done.payload.checkpoint.visited, 23);
    for (const id of h.ids) {
      const work = await h.currentWork(id);
      assert.deepEqual(work.payload.runtimeBinding, h.runtime.binding);
      assert.equal(work.payload.checkpoint.evaluations, 0);
    }
    const before = h.fake.entries();
    assert.equal((await restarted.process(created.item.workItemId)).kind,
      "idle");
    assert.deepEqual(h.fake.entries(), before);
    assert.deepEqual(await h.roster.listDue(10), []);
  });

test("new registrations behind a saved cursor get their own enrollment work",
  async () => {
    const h = await rosterHarness(23);
    const created = await h.enqueue();
    await h.roster.process(created.item.workItemId);
    const id = "0-late-registration";
    await h.write("eventAttendees/" + id, h.row);
    const queued = await enqueueAssistanceSourceChange(h.source, {
      source: {collection: "eventAttendees", documentId: id,
        eventId: randomUUID(), occurredAt: start},
      before: null, after: {generation: 1, value: h.row},
    }, h.roster);
    assert.equal(queued.length, 1);
    await h.scan(created.item.workItemId);
    assert.equal((await h.roster.get(created.item.workItemId))
      .payload.checkpoint.visited, 23);
    await h.roster.process(queued[0]);
    assert.equal((await h.currentWork(id)).payload.scope.attendeeId, id);
  });

test("runtime replacement updates existing work without resetting consumption",
  async () => {
    const h = await rosterHarness(2);
    await h.scan((await h.enqueue()).item.workItemId);
    const first = await h.currentWork(h.scope.attendeeId);
    await h.runner.process(first.item.workItemId, {kind: "evaluate"});
    const evaluated = await h.runner.store.get(first.item.workItemId);
    const runtime = await configureRuntime(h, {...h.runtime.configuration,
      maxEvaluations: 2});
    const request = await h.enqueue();
    assert.deepEqual(request.payload.runtimeBinding, runtime.binding);
    await h.scan(request.item.workItemId);
    const updated = await h.currentWork(h.scope.attendeeId);
    assert.deepEqual(updated.payload.runtimeBinding, runtime.binding);
    assert.equal(updated.payload.scope.episodeId,
      evaluated.payload.scope.episodeId);
    assert.equal(updated.payload.checkpoint.evaluations, 1);
    assert.deepEqual(updated.run.counters, evaluated.run.counters);
    assert.deepEqual(updated.payload.checkpoint.publication,
      evaluated.payload.checkpoint.publication);
  });

test("busy roster targets retry across bounded pages in document-id order",
  async () => {
    const h = await rosterHarness(23);
    await h.scan((await h.enqueue()).item.workItemId);
    await configureRuntime(h);
    let busy = true;
    let calls = 0;
    const store = new AssistanceRosterWorkStore(h.db, () => h.clock.now, {
      process: (id, action) => {
        calls += 1;
        return busy ? Promise.resolve({kind: "busy"}) :
          h.runner.process(id, action);
      },
    });
    const created = await h.enqueue(h.input, store);
    await h.scan(created.item.workItemId, store);
    const pending = (await store.get(created.item.workItemId))
      .payload.checkpoint;
    assert.equal(pending.failures.length, 23);
    assert.equal(pending.phase, "retry");
    h.clock.now = pending.dueAt!;
    calls = 0;
    await store.process(created.item.workItemId);
    assert.equal(calls, 20);
    assert.equal((await store.get(created.item.workItemId))
      .payload.checkpoint.retries, 0);
    busy = false;
    calls = 0;
    await store.process(created.item.workItemId);
    assert.equal(calls, 3);
    const round = (await store.get(created.item.workItemId)).payload.checkpoint;
    assert.equal(round.failures.length, 20);
    h.clock.now = round.dueAt!;
    await store.process(created.item.workItemId);
    assert.equal((await store.get(created.item.workItemId))
      .payload.checkpoint.phase, "complete");
    for (const id of h.ids) {
      assert.equal((await h.currentWork(id)).payload.runtimeBinding!.revision,
        2);
    }
  });

test("lost roster checkpoints replay enrollment and rebind effects safely",
  async () => {
    const h = await rosterHarness();
    await h.scan((await h.enqueue()).item.workItemId);
    await configureRuntime(h);
    let interrupt = true;
    const store = new AssistanceRosterWorkStore(h.db, () => h.clock.now, {
      process: async (id, action) => {
        const result = await h.runner.process(id, action);
        if (interrupt) {
          h.fake.failNextCommit = true;
          interrupt = false;
        }
        return result;
      },
    });
    const created = await h.enqueue(h.input, store);
    await assert.rejects(store.process(created.item.workItemId),
      /interruption/);
    assert.equal((await store.get(created.item.workItemId)).item.revision, 0);
    const rebound = await h.currentWork(h.scope.attendeeId);
    assert.equal(rebound.item.revision, 1);
    await store.process(created.item.workItemId);
    assert.deepEqual(await h.currentWork(h.scope.attendeeId), rebound);
    assert.equal((await store.get(created.item.workItemId)).run.status,
      "completed");
  });

test("a lost initial scan checkpoint cannot duplicate newly enrolled work",
  async () => {
    const h = await rosterHarness();
    const created = await h.enqueue();
    const targetId = liveWorkIds(h.scope).workItemId;
    h.fake.beforeRead = (path) => {
      if (path === operationCollections.workItems + "/" +
          created.item.workItemId &&
          h.fake.read(operationCollections.workItems + "/" + targetId)) {
        h.fake.beforeRead = undefined;
        h.fake.failNextCommit = true;
      }
    };
    await assert.rejects(h.roster.process(created.item.workItemId),
      /interruption/);
    const enrolled = await h.currentWork(h.scope.attendeeId);
    assert.equal((await h.roster.get(created.item.workItemId)).item.revision,
      0);
    await h.roster.process(created.item.workItemId);
    assert.deepEqual(await h.currentWork(h.scope.attendeeId), enrolled);
  });

test("expired leases cannot checkpoint and expired runtime stops enrollment",
  async () => {
    const h = await rosterHarness();
    await h.scan((await h.enqueue()).item.workItemId);
    await configureRuntime(h);
    const expiredLease = new AssistanceRosterWorkStore(h.db, () => h.clock.now,
      {process: async () => {
        h.clock.now += 60_000;
        return {kind: "busy"};
      }});
    const created = await h.enqueue(h.input, expiredLease);
    await assert.rejects(expiredLease.process(created.item.workItemId),
      {code: "lease_expired"});
    assert.equal((await h.roster.get(created.item.workItemId)).item.revision,
      0);
    const short = await configureRuntime(h, {...h.runtime.configuration,
      expiresAt: h.clock.now + 1000});
    const pending = await h.enqueue();
    h.clock.now = short.configuration.expiresAt;
    await h.roster.process(pending.item.workItemId);
    assert.equal((await h.roster.get(pending.item.workItemId))
      .payload.checkpoint.stopReason, "expired");
    h.clock.now = created.payload.expiresAt;
    await h.roster.process(created.item.workItemId);
    assert.equal((await h.roster.get(created.item.workItemId)).item.outcome,
      "expired");
  });

test("revoked or obsolete runtime permission stops unfinished roster scans",
  async () => {
    for (const change of ["pause", "replace", "source", "close"] as const) {
      const h = await rosterHarness();
      const created = await h.enqueue();
      if (change === "pause") await h.pause();
      if (change === "replace") await configureRuntime(h);
      if (change === "source" || change === "close") {
        const event = {...await h.read("events/" + h.context.eventId)};
        if (change === "source") event.startTime = Timestamp.fromMillis(start);
        else event.status = "cancelled";
        await h.write("events/" + h.context.eventId, event);
      }
      const before = h.fake.entries().filter(([p]) =>
        !p.startsWith("operation"));
      await h.roster.process(created.item.workItemId);
      const stopped = await h.roster.get(created.item.workItemId);
      assert.equal(stopped.payload.checkpoint.phase, "stopped");
      assert.equal(stopped.payload.checkpoint.visited, 0);
      assert.equal(stopped.payload.checkpoint.stopReason,
        change === "pause" ? "paused" : change === "replace" ?
          "configurationChanged" : change === "source" ? "sourceChanged" :
            "eventClosed");
      assert.deepEqual(h.fake.entries().filter(([p]) =>
        !p.startsWith("operation")), before);
    }
  });

test("mid-page pause is recorded and prevents the remaining guest rebinds",
  async () => {
    const h = await rosterHarness(2);
    await h.scan((await h.enqueue()).item.workItemId);
    await configureRuntime(h);
    let calls = 0;
    const store = new AssistanceRosterWorkStore(h.db, () => h.clock.now, {
      process: async (id, action) => {
        calls += 1;
        const result = await h.runner.process(id, action);
        await h.pause();
        return result;
      },
    });
    const created = await h.enqueue(h.input, store);
    await store.process(created.item.workItemId);
    assert.equal(calls, 1);
    const checkpoint = (await store.get(created.item.workItemId))
      .payload.checkpoint;
    assert.equal(checkpoint.phase, "stopped");
    assert.equal(checkpoint.stopReason, "paused");
    const bindings = await Promise.all(h.ids.map(async (id) =>
      (await h.currentWork(id)).payload.runtimeBinding!.revision));
    assert.deepEqual(bindings.sort(), [1, 2]);
  });

test("ineligible guests do not enroll and malformed guests retain retries",
  async () => {
    const h = await rosterHarness(3);
    await h.write("eventAttendees/" + h.ids[1],
      {...h.row, status: "waitlisted"});
    await h.write("eventAttendees/" + h.ids[2], {...h.row, eventId: "foreign"});
    const created = await h.enqueue();
    await h.scan(created.item.workItemId);
    assert.equal((await h.roster.get(created.item.workItemId))
      .payload.checkpoint.visited, 2);
    assert.ok(await h.currentWork(h.ids[0]));
    assert.equal(await h.read(guestCollections.guests + "/" +
      guestIdentity(h.context, h.ids[1])), undefined);
    await h.write("eventAttendees/" + h.ids[1], {...h.row, status: "invented"});
    const bad = await h.enqueue({scope: {...h.input.scope,
      attendeeId: h.ids[1]}, source: {collection: "eventAttendees",
      documentId: h.ids[1], occurredAt: start, eventId: randomUUID()}});
    await h.scan(bad.item.workItemId);
    const held = await h.roster.get(bad.item.workItemId);
    assert.deepEqual(held.payload.checkpoint.failures,
      [{attendeeId: h.ids[1], reason: "unavailable"}]);
  });

test("enrollment signals ignore replies and enroll explicit re-entry episodes",
  async () => {
    const h = await rosterHarness();
    await h.scan((await h.enqueue()).item.workItemId);
    const path = guestCollections.guests + "/" +
      guestIdentity(h.context, h.scope.attendeeId);
    const before = parseGuest(await h.read(path));
    const change: AssistanceSourceChange = {
      source: {collection: "eventAssistanceGuests", documentId: before.guestId,
        eventId: randomUUID(), occurredAt: start},
      before: {generation: 1, value: {...before}},
      after: {generation: 1, value: {...before, revision: 1,
        intention: {kind: "notComing"}}}};
    assert.deepEqual(rosterEnrollmentRequests(change), []);
    const next = await h.guests.startEpisode(h.context, h.scope.attendeeId,
      "re-entry", before.revision);
    const requests = rosterEnrollmentRequests({...change,
      after: {generation: 1, value: {...next}}});
    assert.equal(requests.length, 1);
    await h.roster.process((await h.enqueue(requests[0])).item.workItemId);
    assert.equal((await h.currentWork(h.scope.attendeeId))
      .payload.scope.episodeId,
    next.episodeId);
    assert.deepEqual(rosterEnrollmentRequests({...change, after: null}), []);
  });

test("due orchestration advances roster work and ignores unrelated payloads",
  async () => {
    const h = await rosterHarness();
    const created = await h.enqueue();
    const ports = {roster: h.roster, source: h.source, guest: h.runner,
      checkpoint: new AssistanceCheckpointWorkStore(h.db, () => h.clock.now),
      delivery: new AssistanceDeliveryWorkStore(h.db, () => h.clock.now)};
    await processChangedAssistanceWork(created.item.workItemId,
      created.item, ports, start);
    assert.equal((await h.roster.get(created.item.workItemId)).run.status,
      "completed");
    const tick = await evaluateDueAssistanceWork(ports);
    assert.equal(tick.rosterItems, 0);
    assert.equal(tick.guestItems, 1);
    assert.equal((await h.currentWork(h.scope.attendeeId))
      .payload.checkpoint.evaluations, 1);
    assert.throws(() => readRosterWorkRecords({...created.run, mode: "shadow"},
      created.item, created.item.workItemId, start));
    const corrupted = {...created.item, normalizedPayload: {...created.payload,
      checkpoint: {...created.payload.checkpoint, stopReason: "paused"}}};
    assert.throws(() => readRosterWorkRecords(created.run, corrupted,
      corrupted.workItemId, start));
  });

test("Firestore arbitrates roster scans and preserves exact event scope", {
  skip: !process.env.FIRESTORE_EMULATOR_HOST, timeout: 60_000,
}, async () => {
  assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? "",
    /^(127\.0\.0\.1|localhost|\[::1\]):\d+$/);
  const app = initializeApp({projectId: "demo-catch-rules"}, randomUUID());
  try {
    const h = await rosterHarness(2, getEmulatorFirestore(app));
    const created = await Promise.all([h.enqueue(), h.enqueue()]);
    assert.equal(created.filter((r) => r.replayed).length, 2,
      "the configuration transaction already saved the single roster job");
    const id = created[0].item.workItemId;
    const results = await Promise.all([h.roster.process(id),
      h.roster.process(id)]);
    assert.equal(results.filter((r) => r.kind === "committed").length, 1);
    assert.equal((await h.roster.get(id)).payload.checkpoint.visited, 2);
    assert.equal((await h.roster.get(id)).payload.checkpoint.cursor,
      [...h.ids].sort().at(-1));
    const work = await h.currentWork(h.scope.attendeeId);
    assert.deepEqual(work.payload.runtimeBinding, h.runtime.binding);
    const receipts = await h.db.collection(operationCollections.actionReceipts)
      .where("workItemId", "==", id).get();
    assert.equal(receipts.size, 1);
    assert.ok(!(await h.roster.listDue(100)).includes(id));
    const request = {scope: {...h.input.scope, attendeeId: h.scope.attendeeId},
      source: {collection: "eventAttendees" as const,
        documentId: h.scope.attendeeId, occurredAt: start,
        eventId: randomUUID()}};
    const perGuest = await Promise.all([
      h.enqueue(request), h.enqueue(request)]);
    assert.equal(perGuest.filter((r) => r.replayed).length, 1);
  } finally {
    await deleteApp(app);
  }
});
