import {getEmulatorFirestore} from "../../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import test from "node:test";
import {deleteApp, initializeApp} from "firebase-admin/app";
import {Timestamp} from "firebase-admin/firestore";
import {EventAssistanceRuntimeConfigStore} from "./runtimeConfigStore";
import {configureRuntime} from "./runtimeConfigTestHarness";
import {setup} from "./liveLateJoinTestHarness";
import {LiveAssistanceWorkRunner} from "./liveWorkRunner";
import {prepareLiveLateJoinPublication} from "./liveLateJoinPublication";
import {RUNTIME_CONFIGS, readRuntimeConfigAuthority} from
  "./runtimeConfigRecords";
import {start} from "./whatsappTestHarness";

test("runtime setup reads without enrollment and only managers can write",
  async () => {
    const h = await setup();
    const store = new EventAssistanceRuntimeConfigStore(h.db,
      () => h.clock.now);
    const before = h.fake.entries();
    const initial = await store.get("host-1", {context: h.context});
    assert.equal(initial.view.status, "unconfigured");
    assert.equal(initial.view.canConfigure, true);
    assert.deepEqual(h.fake.entries(), before);
    for (const actor of [h.actor.uid, "check-in-staff", "another-host"]) {
      await assert.rejects(store.get(actor, {context: h.context}),
        {code: "permission-denied"});
      await assert.rejects(store.set(actor, {context: h.context,
        requestId: randomUUID(), expectedRevision: 0,
        expectedSourceHash: initial.view.sourceHash,
        command: {kind: "pause"}}), {code: "permission-denied"});
    }
    const configured = await configureRuntime(h);
    assert.equal(configured.saved.view.status, "configured");
    const changed = h.fake.entries().filter(([p]) =>
      !before.some(([old]) => p === old));
    assert.equal(changed.length, 4,
      "runtime, request receipt and roster run/item commit together");
    assert.deepEqual(changed.map(([p]) => p.split("/")[0]).sort(),
      ["commandReceipts", "eventAssistanceRuntimeConfigs", "operationRuns",
        "operationWorkItems"]);
  });

test("configuration commits atomically and old retries retain current pause",
  async () => {
    const h = await setup();
    const r = await configureRuntime(h);
    const configureAgain = {...r.input, requestId: randomUUID(),
      expectedRevision: r.saved.view.revision};
    const before = h.fake.entries();
    h.fake.failNextCommit = true;
    await assert.rejects(r.store.set("host-1", configureAgain), /interruption/);
    assert.deepEqual(h.fake.entries(), before);
    const input = {...r.input, requestId: randomUUID(),
      expectedRevision: 1, command: {kind: "pause"}};
    const paused = await r.store.set("host-1", input);
    assert.equal(paused.view.status, "paused");
    assert.equal(paused.view.revision, 2);
    const replay = await r.store.set("host-1", r.input);
    assert.equal(replay.outcome, "replayed");
    assert.equal(replay.operationRevision, 1);
    assert.equal(replay.view.status, "paused");
    await assert.rejects(r.store.set("host-1", {...input,
      command: r.input.command}), {code: "aborted"});
    await assert.rejects(r.store.set(h.actor.uid, r.input),
      {code: "permission-denied"});
  });

test("runtime configuration rejects invalid scope, stale review and bad limits",
  async () => {
    const h = await setup();
    const r = await configureRuntime(h);
    const base = {...r.input, expectedRevision: 1};
    const configurations = [
      {...r.configuration, expiresAt: start},
      {...r.configuration, expiresAt: r.configuration.expiresAt + 1},
      {...r.configuration, maxEvaluations: 0},
      {...r.configuration, options: {...h.options, responseDeadline:
        r.configuration.expiresAt + 1}},
      {...r.configuration, options: {...h.options,
        routes: [...h.options.routes, {...h.options.routes[0],
          senderId: "different"}]}},
    ];
    for (const configuration of configurations) {
      const before = h.fake.entries();
      await assert.rejects(r.store.set("host-1", {...base,
        requestId: randomUUID(), command: {kind: "configure", configuration}}));
      assert.deepEqual(h.fake.entries(), before);
    }
    await assert.rejects(r.store.set("host-1", {...base,
      requestId: randomUUID(), expectedRevision: 0}), {code: "aborted"});
    await assert.rejects(r.store.set("host-1", {...base,
      requestId: randomUUID(), expectedSourceHash: "a".repeat(64)}),
    {code: "aborted"});
    await assert.rejects(r.store.get("host-1", {context: {
      mode: "rehearsal", rehearsalId: "r", virtualEventId: "v",
      clockId: "clock"}}), {code: "invalid-argument"});
    await assert.rejects(r.store.set("host-1", {...base,
      requestId: randomUUID(), command: {kind: "pause", enabled: true}}),
    {code: "invalid-argument"});
  });

test("event edits require fresh review and closing blocks new configuration",
  async () => {
    const h = await setup();
    const r = await configureRuntime(h);
    const path = "events/" + h.context.eventId;
    const event = await h.read(path);
    await h.write(path, {...event,
      startTime: Timestamp.fromMillis(start - 120_000)});
    let view = (await r.store.get("host-1", {context: h.context})).view;
    assert.equal(view.status, "sourceChanged");
    await assert.rejects(r.store.set("host-1", {...r.input,
      requestId: randomUUID(), expectedRevision: view.revision}),
    {code: "aborted"});
    await h.write(path, {...event, status: "cancelled"});
    view = (await r.store.get("host-1", {context: h.context})).view;
    assert.equal(view.status, "eventClosed");
    assert.equal(view.canConfigure, false);
    await assert.rejects(r.store.set("host-1", {...r.input,
      requestId: randomUUID(), expectedRevision: view.revision,
      expectedSourceHash: view.sourceHash}), {code: "failed-precondition"});
    const paused = await r.store.set("host-1", {...r.input,
      requestId: randomUUID(), expectedRevision: view.revision,
      expectedSourceHash: view.sourceHash, command: {kind: "pause"}});
    assert.equal(paused.view.status, "paused");
  });

test("runtime binding controls worker enrollment and publication options",
  async () => {
    const h = await setup();
    const r = await configureRuntime(h);
    const runner = new LiveAssistanceWorkRunner(h.db, () => h.clock.now);
    const input = {scope: h.scope, ...r.configuration,
      runtimeBinding: r.binding};
    await assert.rejects(runner.store.start({...input, maxEvaluations: 1}),
      {code: "work_configuration_conflict"});
    const started = await runner.store.start(input);
    const result = await runner.process(started.item.workItemId,
      {kind: "evaluate"});
    assert.equal(result.kind, "finished");
    const current = await runner.store.get(started.item.workItemId);
    assert.ok(current.payload.checkpoint.publication);
    const message = await h.read("eventAssistanceMessages/" +
      current.payload.checkpoint.publication.messageId);
    assert.deepEqual(message!.intent.automation.runtimeBinding, r.binding);
    const held = await h.publisher.publish(h.scope, {...h.options,
      runtimeBinding: r.binding,
      deliveryPolicy: {...h.options.deliveryPolicy, maxAttempts: 2}});
    assert.equal(held.kind, "held");
    if (held.kind === "held") {
      assert.deepEqual(held.evaluation,
        {kind: "runtimeUnavailable", reason: "configurationChanged"});
    }
    const legacy = await setup();
    const legacyRunner = new LiveAssistanceWorkRunner(legacy.db,
      () => legacy.clock.now);
    const unbound = await legacyRunner.store.start({scope: legacy.scope,
      options: legacy.options, expiresAt: start + 3_600_000,
      maxEvaluations: 100});
    await assert.rejects(legacyRunner.process(unbound.item.workItemId,
      {kind: "evaluate"}), /Invalid or inconsistent/);
    legacy.clock.now = unbound.payload.expiresAt;
    await legacyRunner.process(unbound.item.workItemId, {kind: "evaluate"});
    assert.equal((await legacyRunner.store.get(unbound.item.workItemId))
      .run.status, "completed", "expiry cleanup cannot publish messages");
  });

test("pausing or replacing runtime permission stops a reserved provider send",
  async () => {
    for (const action of ["pause", "configure"] as const) {
      const h = await setup();
      const r = await configureRuntime(h);
      const published = await h.publisher.publish(h.scope,
        {...h.options, runtimeBinding: r.binding});
      assert.ok(published.kind === "published");
      const delivery = await h.delivery(published);
      const reserved = await delivery.reserve();
      assert.equal(reserved.decision.kind, "dispatch");
      await r.store.set("host-1", {...r.input, requestId: randomUUID(),
        expectedRevision: 1, command: action === "pause" ?
          {kind: "pause"} : r.input.command});
      const claimed = await delivery.claim();
      assert.notEqual(claimed.kind, "claimed");
      const again = await h.publisher.publish(h.scope,
        {...h.options, runtimeBinding: r.binding});
      assert.ok(again.kind === "held");
      assert.deepEqual(again.evaluation, {kind: "runtimeUnavailable",
        reason: action === "pause" ? "paused" : "configurationChanged"});
    }
  });

test("runtime expiry is rechecked after publication preparation",
  async () => {
    const h = await setup();
    const r = await configureRuntime(h);
    const saved = await r.store.set("host-1", {...r.input,
      requestId: randomUUID(), expectedRevision: 1, command: {kind: "configure",
        configuration: {...r.configuration, expiresAt: start + 1000}}});
    const binding = {...r.binding, revision: saved.view.revision};
    const before = h.fake.entries();
    await assert.rejects(h.db.runTransaction(async (tx) => {
      const prepared = await prepareLiveLateJoinPublication(h.db, tx, h.scope,
        {...h.options, runtimeBinding: binding}, () => h.clock.now);
      assert.ok(prepared.kind === "prepared");
      h.clock.now += 1000;
      prepared.commit();
    }), /snapshot expired/);
    assert.deepEqual(h.fake.entries(), before);
    const authority = await h.db.runTransaction((tx) =>
      readRuntimeConfigAuthority(h.db, tx, h.context, binding, h.clock.now));
    assert.deepEqual(authority, {kind: "unavailable", reason: "expired"});
    h.fake.remove(RUNTIME_CONFIGS + "/" + binding.runtimeId);
    assert.deepEqual(await h.db.runTransaction((tx) =>
      readRuntimeConfigAuthority(h.db, tx, h.context, binding, h.clock.now)),
    {kind: "unavailable", reason: "missing"});
  });

test("automatic messages without runtime permission cannot claim dispatch",
  async () => {
    const h = await setup();
    const published = await h.publishReady();
    const d = await h.delivery(published);
    const reserved = await d.reserve();
    assert.equal(reserved.decision.kind, "stop");
    assert.equal(reserved.record.attempts.length, 0);
    for (const path of h.budgetPaths) {
      assert.equal((await h.read(path))?.chargedMicros, 0);
    }
  });

test("Firestore serializes runtime edits and replays exact requests", {
  skip: !process.env.FIRESTORE_EMULATOR_HOST, timeout: 60_000,
}, async () => {
  assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? "",
    /^(127\.0\.0\.1|localhost|\[::1\]):\d+$/);
  const app = initializeApp({projectId: "demo-catch-rules"}, randomUUID());
  try {
    const h = await setup(getEmulatorFirestore(app));
    const r = await configureRuntime(h);
    const next = {...r.input, requestId: randomUUID(), expectedRevision: 1,
      command: {kind: "pause"}};
    const edits = await Promise.allSettled([
      r.store.set("host-1", next), r.store.set("host-1", {...next,
        requestId: randomUUID(), command: r.input.command}),
    ]);
    assert.equal(edits.filter((e) => e.status === "fulfilled").length, 1);
    const replay = await r.store.set("host-1", r.input);
    assert.equal(replay.operationRevision, 1);
    assert.equal(replay.view.revision, 2);
  } finally {
    await deleteApp(app);
  }
});
