import {getEmulatorFirestore} from "../../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import test from "node:test";
import {randomUUID} from "node:crypto";
import {deleteApp, initializeApp} from "firebase-admin/app";
import {Firestore, Timestamp} from "firebase-admin/firestore";
import type {CallableRequest} from "firebase-functions/v2/https";
import {operationCollections} from "../../operations/collections";
import type {EventAssistanceHostGuestsCallableResponse as Response} from
  "../../shared/generated/eventAssistanceHostGuestsCallableResponse";
import {EventAssistanceHostGuestsStore} from "./hostGuestsStore";
import {getEventAssistanceHostGuestsHandler} from "./hostGuestsHandlers";
import {guestCollections, guestIdentity} from "./guestRecords";
import {LiveAssistanceWorkStore} from "./liveWorkStore";
import {LiveAssistanceWorkRunner} from "./liveWorkRunner";
import {liveWorkIds} from "./liveWorkRecords";
import {setup} from "./liveLateJoinTestHarness";
import {configureRuntime} from "./runtimeConfigTestHarness";
import {start} from "./whatsappTestHarness";

const manager = "host-1";
async function harness(db?: Firestore) {
  const h = await setup(db);
  const store = new EventAssistanceHostGuestsStore(h.db, () => h.clock.now);
  const work = new LiveAssistanceWorkStore(h.db, () => h.clock.now);
  const runner = new LiveAssistanceWorkRunner(h.db, () => h.clock.now);
  const input = {context: h.context, attendeeIds: [h.scope.attendeeId]};
  const configuration = {options: h.options, expiresAt: start + 3_600_000,
    maxEvaluations: 100};
  const initialize = async (bound = true) => {
    const runtime = bound ? await configureRuntime(h, configuration) : null;
    await work.start({scope: h.scope, ...configuration,
      ...(runtime ? {runtimeBinding: runtime.binding} : {})});
    return runtime;
  };
  const get = () => store.get(manager, input);
  const row = async () => {
    const result = (await get()).guests[0];
    assert.ok(result.kind === "current");
    return result;
  };
  const ids = liveWorkIds(h.scope);
  return {...h, store, work, runner, input, get, row, initialize, ids,
    guestPath: guestCollections.guests + "/" +
      guestIdentity(h.context, h.scope.attendeeId)};
}

test("Host reads selected current guests without enrolling or leaking contacts",
  async () => {
    const h = await harness();
    const before = h.fake.entries();
    const result = await h.get();
    assert.equal(result.coverage, "selectedAttendees");
    assert.equal(result.workflow, "lateJoin");
    assert.equal(result.serverTime, start);
    assert.equal(result.runtimeStatus, "unconfigured");
    const row = await h.row();
    assert.equal(row.checkedIn, false);
    assert.deepEqual(row.participation, {state: "active", resumeAtUnit: null});
    assert.deepEqual(row.work, {kind: "notEnrolled"});
    assert.deepEqual(Object.keys(row).sort(), ["attendeeId", "checkedIn",
      "episodeId", "intention", "kind", "participation", "work"]);
    const serialized = JSON.stringify(result);
    for (const hidden of [h.actor.phone, "phoneE164", "senderId",
      "secretVersionResource", "linkId", "deliveryStatus", "token"]) {
      assert.ok(!serialized.includes(hidden), hidden);
    }
    assert.deepEqual(h.fake.entries(), before);
  });

test("manager authorization precedes reads of roster and assistance records",
  async () => {
    const h = await harness();
    for (const uid of [h.actor.uid, "checkin-staff", "foreign-manager"]) {
      const reads: string[] = [];
      h.fake.beforeRead = (path) => reads.push(path);
      await assert.rejects(h.store.get(uid, h.input),
        {code: "permission-denied"});
      assert.deepEqual(reads, ["organizers/" + h.context.organizerId]);
    }
    h.fake.beforeRead = undefined;
    h.fake.remove("organizers/" + h.context.organizerId);
    await assert.rejects(h.get(), {code: "permission-denied"});
  });

test("invalid scopes and unbounded selections fail before source reads",
  async () => {
    const h = await harness();
    const reads: string[] = [];
    h.fake.beforeRead = (path) => reads.push(path);
    for (const input of [
      {...h.input, attendeeIds: []},
      {...h.input, attendeeIds: Array.from({length: 51}, (_, i) => "a-" + i)},
      {...h.input, attendeeIds: [h.scope.attendeeId, h.scope.attendeeId]},
      {...h.input, attendeeIds: ["foreign/path"]},
      {...h.input, context: {...h.context, mode: "rehearsal"}},
      {...h.input, cursor: "invented"},
    ]) {
      await assert.rejects(h.store.get(manager, input),
        {code: "invalid-argument"});
    }
    assert.deepEqual(reads, []);
    const before = h.fake.entries();
    const input = {...h.input, attendeeIds:
      Array.from({length: 50}, (_, i) => "missing-" + i)};
    const result = await h.store.get(manager, input);
    assert.deepEqual(result.guests.map((r) => r.attendeeId), input.attendeeIds);
    assert.ok(result.guests.every((r) => r.kind === "unavailable"));
    assert.equal(reads.length, 104);
    assert.deepEqual(h.fake.entries(), before);
  });

test("foreign and deleted roster rows expose the same unavailable result",
  async () => {
    const h = await harness();
    for (const replacement of [null,
      {...h.fake.read(h.attendeePath), eventId: "another"},
      {...h.fake.read(h.attendeePath), organizerId: "another"},
    ]) {
      if (replacement) await h.write(h.attendeePath, replacement);
      else h.fake.remove(h.attendeePath);
      assert.deepEqual((await h.get()).guests,
        [{kind: "unavailable", attendeeId: h.scope.attendeeId}]);
    }
    await assert.rejects(h.store.get(manager, {...h.input,
      context: {...h.context, eventId: "foreign-event"}}));
  });

test("uninitialized, ineligible and replaced guests do not reuse work",
  async () => {
    for (const kind of [
      "uninitialized", "ineligible", "sourceChanged",
    ] as const) {
      const h = await harness();
      await h.initialize();
      if (kind === "uninitialized") h.fake.remove(h.guestPath);
      if (kind === "ineligible") {
        await h.write(h.attendeePath,
          {...h.fake.read(h.attendeePath), status: "waitlisted"});
      }
      if (kind === "sourceChanged") {
        await h.write(h.attendeePath, {...h.fake.read(h.attendeePath),
          createdAt: Timestamp.fromMillis(start + 1)});
      }
      const before = h.fake.entries();
      const result = (await h.get()).guests[0];
      assert.equal(result.kind, kind);
      assert.ok(!("work" in result));
      assert.ok(!("intention" in result));
      assert.deepEqual(h.fake.entries(), before);
    }
  });

test("new participation episode cannot inherit an older episode's work",
  async () => {
    const h = await harness();
    await h.initialize();
    await h.write(h.guestPath,
      {...h.fake.read(h.guestPath), episodeId: "new-episode", revision: 2});
    const result = await h.row();
    assert.equal(result.episodeId, "new-episode");
    assert.deepEqual(result.work, {kind: "notEnrolled"});
  });

test("reported participation does not manufacture physical check-in",
  async () => {
    const h = await harness();
    await h.write(h.guestPath, {...h.fake.read(h.guestPath),
      participation: {state: "temporaryBreak", resumeAtUnit: "itinerary:two"},
      intention: {kind: "notComing"}});
    let row = await h.row();
    assert.equal(row.checkedIn, false);
    assert.equal(row.participation.state, "temporaryBreak");
    assert.equal(row.intention.kind, "notComing");
    await h.write(h.attendeePath, {...h.fake.read(h.attendeePath),
      status: "checkedIn", checkedInAt: Timestamp.fromMillis(start),
      checkedInBy: manager, attendanceRevision: 1});
    row = await h.row();
    assert.equal(row.checkedIn, true);
    assert.equal(row.participation.state, "temporaryBreak");
    assert.equal(row.intention.kind, "notComing");
  });

test("queued work and configuration are distinct from completed evaluation",
  async () => {
    const h = await harness();
    await h.initialize();
    const before = h.fake.entries();
    const result = await h.get();
    assert.equal(result.runtimeStatus, "configured");
    const row = await h.row();
    assert.ok(row.work.kind === "recorded");
    assert.equal(row.work.runStatus, "running");
    assert.equal(row.work.configurationBinding, "current");
    assert.equal(row.work.lastEvaluation, null);
    assert.equal(row.work.nextEvaluationAt, start);
    assert.equal(row.work.publishedIntentCount, 0);
    assert.deepEqual(h.fake.entries(), before);
  });

test("recorded publication is historical evidence, never delivery proof",
  async () => {
    const h = await harness();
    await h.initialize();
    await h.runner.process(h.ids.workItemId, {kind: "evaluate"});
    const record = await h.work.get(h.ids.workItemId);
    assert.ok(record.payload.checkpoint.publication);
    const before = h.fake.entries();
    const row = await h.row();
    assert.ok(row.work.kind === "recorded");
    assert.equal(row.work.publishedIntentCount, 1);
    assert.deepEqual(row.work.lastEvaluation, {at: start,
      observation: record.payload.checkpoint.observation});
    assert.ok(!("delivery" in row.work));
    assert.ok(!("messageId" in row.work));
    h.clock.now += 2000;
    assert.deepEqual((await h.row()).work, row.work,
      "a read does not invent a fresh evaluation");
    assert.deepEqual(h.fake.entries(), before);
  });

test("expiry is recorded as terminal work without implying that anyone joined",
  async () => {
    const h = await harness();
    await h.initialize();
    h.clock.now = start + 3_600_000;
    await h.runner.process(h.ids.workItemId, {kind: "evaluate"});
    assert.equal((await h.get()).runtimeStatus, "eventClosed");
    const row = await h.row();
    assert.equal(row.checkedIn, false);
    assert.ok(row.work.kind === "recorded");
    assert.equal(row.work.runStatus, "completed");
    assert.equal(row.work.nextEvaluationAt, null);
    assert.equal(row.work.publishedIntentCount, 0);
    assert.deepEqual(row.work.lastEvaluation, {at: h.clock.now,
      observation: {kind: "workExpired"}});
  });

test("unbound and changed runtime authority never appear currently bound",
  async () => {
    const unbound = await harness();
    await unbound.initialize(false);
    let row = await unbound.row();
    assert.ok(row.work.kind === "recorded");
    assert.equal(row.work.configurationBinding, "unbound");
    const h = await harness();
    const runtime = await h.initialize();
    assert.ok(runtime);
    const view = (await runtime.store.get(manager, {context: h.context})).view;
    await runtime.store.set(manager, {context: h.context,
      requestId: "pause", expectedRevision: view.revision,
      expectedSourceHash: view.sourceHash, command: {kind: "pause"}});
    assert.equal((await h.get()).runtimeStatus, "paused");
    row = await h.row();
    assert.ok(row.work.kind === "recorded");
    assert.equal(row.work.configurationBinding, "configurationChanged");
    assert.equal(row.work.runStatus, "running",
      "configuration pause and stored worker status are separate facts");
  });

test("malformed or partially missing work fails instead of showing no work",
  async () => {
    for (const variant of ["missingRun", "missingItem", "wrongGuest", "future",
      "invalidRoster"] as const) {
      const h = await harness();
      await h.initialize();
      if (variant === "missingRun") {
        h.fake.remove(operationCollections.runs + "/" + h.ids.runId);
      }
      if (variant === "missingItem") {
        h.fake.remove(operationCollections.workItems + "/" + h.ids.workItemId);
      }
      if (variant === "wrongGuest") {
        await h.write(h.guestPath,
          {...h.fake.read(h.guestPath), attendeeId: "foreign"});
      }
      if (variant === "future") {
        await h.write(h.guestPath,
          {...h.fake.read(h.guestPath), updatedAt: start + 1000});
      }
      if (variant === "invalidRoster") {
        await h.write(h.attendeePath,
          {...h.fake.read(h.attendeePath), attendanceRevision: -1});
      }
      const before = h.fake.entries();
      await assert.rejects(h.get(), variant);
      assert.deepEqual(h.fake.entries(), before);
    }
  });

test("Host assistance handler authenticates and limits before store access",
  async () => {
    const calls: string[] = [];
    const deps = {db: () => ({}) as Firestore,
      rateLimit: async () => {
        calls.push("limit");
      },
      store: () => ({get: async (uid: string, input: unknown) => {
        calls.push("get");
        assert.equal(uid, manager);
        assert.deepEqual(input, {scope: "fixture"});
        return {} as Response;
      }})};
    await assert.rejects(getEventAssistanceHostGuestsHandler(
      {data: {}} as CallableRequest, deps), {code: "unauthenticated"});
    assert.deepEqual(calls, []);
    const request = {data: {scope: "fixture"}, auth: {uid: manager}} as
      CallableRequest;
    await getEventAssistanceHostGuestsHandler(request, deps);
    assert.deepEqual(calls, ["limit", "get"]);
    calls.length = 0;
    await assert.rejects(getEventAssistanceHostGuestsHandler(request, {
      ...deps, rateLimit: async () => {
        throw new Error("rate limited");
      },
    }), /rate limited/);
    assert.deepEqual(calls, []);
  });

test("Firestore projection fences recreated rows and revoked managers", {
  skip: !process.env.FIRESTORE_EMULATOR_HOST, timeout: 60_000,
}, async () => {
  assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? "",
    /^(127\.0\.0\.1|localhost|\[::1\]):\d+$/);
  const app = initializeApp({projectId: "demo-catch-rules"}, randomUUID());
  const db = getEmulatorFirestore(app);
  try {
    const h = await harness(db);
    await h.initialize();
    assert.equal((await h.row()).work.kind, "recorded");
    const attendee = (await db.doc(h.attendeePath).get()).data()!;
    await db.doc(h.attendeePath).delete();
    await db.doc(h.attendeePath).set(attendee);
    assert.equal((await h.get()).guests[0].kind, "sourceChanged");
    await db.collection("organizers").doc(h.context.organizerId).delete();
    await assert.rejects(h.get(), {code: "permission-denied"});
  } finally {
    await db.terminate();
    await deleteApp(app);
  }
});
