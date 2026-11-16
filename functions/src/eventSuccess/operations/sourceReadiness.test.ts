import {getEmulatorFirestore} from "../../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {readFileSync} from "node:fs";
import test from "node:test";
import {deleteApp, initializeApp} from "firebase-admin/app";
import {Firestore} from "firebase-admin/firestore";
import {operationCollections} from "../../operations/collections";
import {setupRuntimePublication} from "./runtimeConfigTestHarness";
import {newLiveWorkRecords} from "./liveWorkRecords";
import {LiveAssistanceWorkRunner} from "./liveWorkRunner";
import {RUNTIME_CONFIGS, runtimeConfigId} from "./runtimeConfigRecords";
import {AssistanceSourceWorkStore} from "./sourceWorkStore";
import {sourceWakeScopes, AssistanceSourceChange} from "./sourceWorkSignals";
import {ReadinessSourceScope, isEventSourceScope, sourceFailureId,
  sourceWorkIds} from
  "./sourceWorkRecords";
import type {SourceWorkInput} from "./sourceWorkRecords";
import {parseReadinessTargetKey, SourceReadinessTargets} from
  "./sourceReadinessTargets";

async function fixture(db?: Firestore) {
  const h = await setupRuntimePublication(db);
  const source = new AssistanceSourceWorkStore(h.db, () => h.clock.now);
  const scope: ReadinessSourceScope = {kind: "sender",
    routeId: "organizerEventWhatsapp", senderId: h.grant.senderId};
  const input = {scope, source: {
    collection: "organizerSenderConnections" as const,
    eventId: randomUUID(), documentId: h.grant.senderId,
    occurredAt: h.clock.now}};
  return {...h, source, input, lookup:
    new SourceReadinessTargets(h.db, () => h.clock.now)};
}

test("readiness filtering ignores debits and inbox counters but wakes repairs",
  () => {
    const change = (collection: AssistanceSourceChange["source"]["collection"],
      before: Record<string, unknown>, after: Record<string, unknown>) =>
      sourceWakeScopes({source: {collection, eventId: "cloud-event",
        documentId: "sender", occurredAt: 100}, before: {generation: 1,
        value: before}, after: {generation: 1, value: after}});
    const budget = {scope: {kind: "senderDay", day: "2026-09-07"},
      senderId: "sender", limitMicros: 1000, chargedMicros: 300, revision: 1};
    // One budgets collection for every channel; `channel` picks the route.
    const routes = {sms: "catchEventSms", rcs: "catchEventRcs",
      whatsapp: "organizerEventWhatsapp"} as const;
    for (const channel of ["sms", "rcs", "whatsapp"] as const) {
      const collection = "eventAssistanceBudgets" as const;
      const own = {...budget, channel};
      assert.deepEqual(change(collection, own, {...own,
        chargedMicros: 600, revision: 2, updatedAt: 101}), []);
      assert.deepEqual(change(collection, own, {...own,
        chargedMicros: 200, revision: 2}), [{kind: "sender",
        routeId: routes[channel], senderId: "sender"}]);
      assert.equal(change(collection, own, {...own,
        limitMicros: 2000, revision: 2}).length, 1);
      assert.equal(change(collection, own, {...own,
        status: "paused"}).length, 1);
    }
    // A budget without a known channel names no route.
    assert.deepEqual(change("eventAssistanceBudgets", budget, {...budget,
      status: "paused"}), []);
    const state = {organizerId: "organizer", channel: "whatsapp",
      endpointHash: "a".repeat(64), suppressionStatus: "none"};
    assert.deepEqual(change("organizerContactChannelStates", state,
      {...state, campaignAcceptedCount: 5, lastReplyAt: 102}), []);
    assert.equal(change("organizerContactChannelStates", state,
      {...state, adminSuppressed: true}).length, 1);
    assert.equal(change("organizerContactChannelStates", state,
      {...state, endpointHash: "b".repeat(64)}).length, 2);
    assert.equal(change("organizerMessageTemplates", {connectionId: "one"},
      {connectionId: "two"}).length, 2);
    assert.equal(change("organizerSenderConnections", {channel: "whatsapp",
      testStatus: "failed"}, {channel: "whatsapp",
      testStatus: "delivered"}).length, 1);
  });

async function paginatedDiscovery(db?: Firestore) {
  const h = await fixture(db);
  const children: Array<{sourceId: string; guestId: string}> = [];
  for (let i = 0; i < 24; i++) {
    const context = {...h.context, eventId: "discovery-" + i + randomUUID()};
    const runtimeId = runtimeConfigId(context);
    const configuration = {...h.runtime.configuration,
      expiresAt: h.clock.now + 1000 * (30 - i)};
    await h.write(RUNTIME_CONFIGS + "/" + runtimeId,
      {...h.runtime.saved.view.runtime!, runtimeId, context, configuration});
    const records = newLiveWorkRecords({schemaVersion: 1, kind: "liveLateJoin",
      scope: {context, attendeeId: "guest", episodeId: "episode"},
      ...configuration, runtimeBinding: {runtimeId, revision: 1},
      checkpoint: {dueAt: configuration.expiresAt, evaluatedAt: null,
        evaluations: 0, observation: null, sourceHash: null,
        publication: null}}, h.clock.now);
    await h.write(operationCollections.runs + "/" + records.run.runId,
      records.run);
    await h.write(operationCollections.workItems + "/" +
      records.item.workItemId,
    records.item);
    children.push({sourceId: sourceWorkIds({scope: {context, attendeeId: null},
      source: h.input.source}).workItemId, guestId: records.item.workItemId});
  }
  const parent = await h.source.enqueue(h.input);
  await h.source.process(parent.item.workItemId);
  const first = await h.source.get(parent.item.workItemId);
  assert.equal(first.payload.checkpoint.visited, 20);
  const cursor = first.payload.checkpoint.cursor!;
  const [, lastId] = parseReadinessTargetKey(cursor, h.input.scope);
  if (db) await db.collection(RUNTIME_CONFIGS).doc(lastId).delete();
  else h.fake.remove(RUNTIME_CONFIGS + "/" + lastId);
  await h.source.process(parent.item.workItemId);
  const completed = await h.source.get(parent.item.workItemId);
  assert.equal(completed.payload.checkpoint.phase, "complete");
  assert.equal(completed.payload.checkpoint.visited, 25,
    "the original configured event is also discovered");
  assert.equal((await h.source.process(parent.item.workItemId)).kind, "idle");
  const guest = new LiveAssistanceWorkRunner(h.db, () => h.clock.now);
  for (const {sourceId, guestId} of children) {
    const item = await h.source.get(sourceId);
    assert.ok(isEventSourceScope(item.payload.scope));
    await h.source.process(sourceId);
    const record = await guest.store.get(guestId);
    assert.equal(record.item.revision, 1);
    assert.equal(record.payload.checkpoint.dueAt, h.clock.now);
  }
  const absent = sourceWorkIds({scope: {context: h.context, attendeeId: null},
    source: h.input.source}).workItemId;
  assert.equal((await h.db.collection(operationCollections.workItems)
    .doc(absent).get()).exists, false,
  "discovery cannot enroll work for the original empty event");
  return h;
}

test("sender discovery resumes stable cursors after a document is deleted",
  async () => {
    await paginatedDiscovery();
  });

test("sender lookups exclude expired and unrelated routes",
  async () => {
    const h = await fixture();
    const keys = await h.lookup.list(h.input.scope, h.clock.now, null, 21);
    assert.equal(keys.length, 1);
    assert.deepEqual(await h.lookup.resolve(
      h.input.scope, keys[0], h.clock.now),
    {context: h.context, attendeeId: null});
    assert.deepEqual(await h.lookup.list({...h.input.scope, senderId: "other"},
      h.clock.now, null, 21), []);
    const path = RUNTIME_CONFIGS + "/" + h.runtime.binding.runtimeId;
    await h.write(path, {...await h.read(path), configuration:
      {...h.runtime.configuration, expiresAt: h.clock.now}});
    assert.deepEqual(await h.lookup.list(h.input.scope, h.clock.now, null, 21),
      []);
    assert.equal(await h.lookup.resolve(h.input.scope, keys[0], h.clock.now),
      null);
    assert.throws(() => parseReadinessTargetKey(keys[0], {
      kind: "whatsappEndpoint", organizerId: h.context.organizerId,
      recipientEndpointId: "whatsapp:" + "a".repeat(64)}));
  });

test("SMS selection is separate from WhatsApp and both queries have indexes",
  async () => {
    const h = await fixture();
    const path = RUNTIME_CONFIGS + "/" + h.runtime.binding.runtimeId;
    await h.write(path, {...await h.read(path), configuration:
      {...h.runtime.configuration, options: {...h.runtime.configuration.options,
        routes: [{routeId: "catchEventSms", senderId: "sms-sender"}]}}});
    const sms: ReadinessSourceScope = {kind: "sender",
      routeId: "catchEventSms", senderId: "sms-sender"};
    const keys = await h.lookup.list(sms, h.clock.now, null, 21);
    assert.equal(keys.length, 1);
    assert.deepEqual(await h.lookup.list(h.input.scope, h.clock.now, null, 21),
      []);
    assert.deepEqual(await h.lookup.resolve(sms, keys[0], h.clock.now),
      {context: h.context, attendeeId: null});
    await assert.rejects(h.lookup.list(sms, h.clock.now, null, 22));
    const indexes = JSON.parse(readFileSync(
      "../firestore.indexes.json", "utf8"))
      .indexes as Array<{collectionGroup: string; fields: unknown[]}>;
    assert.ok(indexes.some((i) => i.collectionGroup === RUNTIME_CONFIGS &&
      JSON.stringify(i.fields) === JSON.stringify([
        {fieldPath: "configuration.options.routes", arrayConfig: "CONTAINS"},
        {fieldPath: "configuration.expiresAt", order: "ASCENDING"},
        {fieldPath: "__name__", order: "ASCENDING"}])));
    assert.ok(indexes.some((i) =>
      i.collectionGroup === "eventAssistancePermissions" &&
      JSON.stringify(i.fields) === JSON.stringify([
        {fieldPath: "channel", order: "ASCENDING"},
        {fieldPath: "context.organizerId", order: "ASCENDING"},
        {fieldPath: "recipientEndpointId", order: "ASCENDING"},
        {fieldPath: "expiresAt", order: "ASCENDING"},
        {fieldPath: "__name__", order: "ASCENDING"}])));
  });

test("a lost discovery checkpoint does not duplicate its event wake job",
  async () => {
    const h = await fixture();
    await h.publishReady();
    let interrupt = true;
    class InterruptedSource extends AssistanceSourceWorkStore {
      async enqueue(input: SourceWorkInput) {
        const result = await super.enqueue(input);
        if (isEventSourceScope(input.scope) && interrupt) {
          interrupt = false;
          h.fake.failNextCommit = true;
        }
        return result;
      }
    }
    const source = new InterruptedSource(h.db, () => h.clock.now);
    const id = (await source.enqueue(h.input)).item.workItemId;
    await assert.rejects(source.process(id), /interruption/);
    assert.equal((await source.get(id)).item.revision, 0);
    await new AssistanceSourceWorkStore(h.db, () => h.clock.now).process(id);
    const children = h.fake.entries().filter(([path, value]) =>
      path.startsWith(operationCollections.workItems + "/") &&
      (value.normalizedPayload as {source?: {eventId?: string}})
        ?.source?.eventId === h.input.source.eventId);
    assert.equal(children.length, 2, "one parent and one event child");
  });

test("malformed discovery records retain typed failures",
  async () => {
    const h = await fixture();
    const path = RUNTIME_CONFIGS + "/" + h.runtime.binding.runtimeId;
    await h.write(path, {...await h.read(path), sourceHash: "corrupt"});
    const id = (await h.source.enqueue(h.input)).item.workItemId;
    await h.source.process(id);
    const failed = (await h.source.get(id)).payload.checkpoint;
    assert.equal(failed.phase, "retry");
    assert.ok("targetKey" in failed.failures[0]);
    assert.equal(parseReadinessTargetKey(
      sourceFailureId(failed.failures[0]),
      h.input.scope)[1], h.runtime.binding.runtimeId);
    for (let n = 0; n < 5; n++) {
      h.clock.now = (await h.source.get(id)).payload.checkpoint.dueAt!;
      await h.source.process(id);
    }
    assert.equal((await h.source.get(id)).payload.checkpoint.phase, "review");
  });

test("Firestore arbitrates multi-event readiness and stable cursors", {
  skip: !process.env.FIRESTORE_EMULATOR_HOST, timeout: 120_000,
}, async () => {
  assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? "",
    /^(127\.0\.0\.1|localhost|\[::1\]):\d+$/);
  const app = initializeApp({projectId: "demo-catch-rules"}, randomUUID());
  try {
    await paginatedDiscovery(getEmulatorFirestore(app));
  } finally {
    await deleteApp(app);
  }
});
