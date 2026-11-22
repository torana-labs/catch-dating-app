import {getEmulatorFirestore} from "../../shared/testing/emulatorFirestore";
import {AssistanceCheckpointWorkStore} from "./checkpointWorkStore";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import test from "node:test";
import {deleteApp, initializeApp} from "firebase-admin/app";
import {Firestore, Timestamp} from "firebase-admin/firestore";
import {operationCollections} from "../../operations/collections";
import {operationContentHash} from "../../operations/durableActions";
import {setupRuntimePublication} from "./runtimeConfigTestHarness";
import {keys, worker} from "./whatsappTestHarness";
import {guestCollections, threadIdentity} from "./guestRecords";
import {EventMessageWorker} from "./messageWorker";
import {LiveMessageDispatcher, deliveryGrantOperation} from
  "./liveMessageDispatcher";
import {AssistanceDeliveryWorkStore} from "./deliveryWorkStore";
import {deliveryWorkIds, newDeliveryWorkRecords, readDeliveryWorkRecords} from
  "./deliveryWorkRecords";
import {nextDeliveryCheckpoint} from "./deliveryWorkPolicy";
import type {VerifiedDeliveryReceipt} from "./deliveryReceipts";
import {assistanceMessageId, MessageRecord} from "./messageOutbox";
import {newLiveWorkRecords} from "./liveWorkRecords";
import {processChangedAssistanceWork} from "./liveWorkTriggers";
import {AssistanceRosterWorkStore} from "./rosterWorkStore";
import {AssistanceSourceWorkStore} from "./sourceWorkStore";
import {LiveAssistanceWorkRunner} from "./liveWorkRunner";
import {isEventSourceScope, sourceWorkIds} from "./sourceWorkRecords";
import {enqueueAssistanceSourceChange, AssistanceSourceChange} from
  "./sourceWorkSignals";
import {whatsappPermissionId, WHATSAPP_PERMISSIONS} from
  "./whatsappPermissionRecords";
import {whatsappEndpointHash} from "./whatsappReplyProtocol";
import {whatsappStopId, WHATSAPP_ENDPOINT_STOPS} from
  "../../shared/organizerWhatsappStops";

async function setup(db?: Firestore) {
  const h = await setupRuntimePublication(db);
  const requests: string[] = [];
  const behavior = {unknown: false, keyUnavailable: false, keyReads: 0,
    beforeKeys: async () => undefined as void,
    beforeCredentials: async () => undefined as void};
  const whatsapp = worker({...h, scope: {eventId: h.context.eventId,
    attendeeId: h.scope.attendeeId, senderId: h.options.routes[0].senderId}},
  async (_, init) => {
    requests.push(init!.body as string);
    if (behavior.unknown) throw new Error("provider outcome lost");
    return Response.json({messages: [{id: "wamid.delivery"}]});
  }, async () => {
    await behavior.beforeCredentials();
    return "fixture-token";
  });
  const service = new EventMessageWorker(h.db, {whatsapp}, () => h.clock.now);
  const dispatcher = new LiveMessageDispatcher(h.db, () => h.clock.now,
    {access: async () => {
      behavior.keyReads++;
      await behavior.beforeKeys();
      if (behavior.keyUnavailable) throw new Error("private-key-error");
      return keys;
    }}, () => service);
  const store = new AssistanceDeliveryWorkStore(h.db, () => h.clock.now,
    dispatcher);
  const published = await h.publishReady();
  const id = deliveryWorkIds(published.messageId).workItemId;
  const record = async () => (await h.outbox.get(published.messageId))!;
  const receipt = async (state: VerifiedDeliveryReceipt["state"]) => {
    const attempt = (await record()).attempts.at(-1)!;
    assert.ok(attempt.mode === "live");
    return h.outbox.recordReceipt(published.messageId, {
      ...attempt.binding, attemptId: attempt.attemptId,
      providerEventId: randomUUID(), receivedAt: h.clock.now, state});
  };
  return {...h, requests, behavior, service, dispatcher, store, published, id,
    record, receipt};
}

test("publication and delivery work commit atomically", async () => {
  const h = await setupRuntimePublication();
  const before = h.fake.entries();
  h.fake.failNextCommit = true;
  await assert.rejects(h.publishReady(), /injected transaction interruption/);
  assert.deepEqual(h.fake.entries(), before);
  const a = await h.publishReady();
  const b = await h.publishReady();
  assert.equal(b.messageId, a.messageId);
  const store = new AssistanceDeliveryWorkStore(h.db, () => h.clock.now);
  const id = deliveryWorkIds(a.messageId).workItemId;
  const work = await store.get(id);
  assert.equal(work.payload.messageId, a.messageId);
  assert.equal(work.payload.checkpoint.phase, "queued");
  assert.equal(work.item.revision, 0);
  assert.deepEqual(await store.listDue(100), [id]);
  assert.equal((await store.processMessage(h.messageId)).kind, "idle",
    "a trusted explicit message cannot enroll automatic delivery");
});

async function recoverConsent(h: Awaited<ReturnType<typeof setup>>) {
  const permissionId = whatsappPermissionId(h.context, h.scope.attendeeId,
    h.grant.senderId);
  const path = WHATSAPP_PERMISSIONS + "/" + permissionId;
  await h.preferences.set(h.actor, {...h.grant, requestId: "withdraw",
    expectedRevision: 1, decision: {kind: "revoke"}});
  await h.store.process(h.id);
  const review = await h.store.get(h.id);
  assert.equal(review.payload.checkpoint.phase, "review");
  assert.equal(review.payload.checkpoint.reason, "noEligibleRoute");
  assert.equal(h.behavior.keyReads, 0);
  assert.equal(h.requests.length, 0);
  const before = (await h.read(path))!;
  h.clock.now += 1000;
  await h.preferences.set(h.actor, {...h.grant, requestId: "grant-again",
    expectedRevision: 2});
  assert.equal((await h.store.process(h.id)).kind, "idle",
    "the outbox revision and expiry did not change");
  const source = new AssistanceSourceWorkStore(h.db, () => h.clock.now,
    undefined, h.store);
  const ids = await enqueueAssistanceSourceChange(source, {
    source: {eventId: randomUUID(), collection: WHATSAPP_PERMISSIONS,
      documentId: permissionId, occurredAt: h.clock.now},
    before: {generation: 1, value: before},
    after: {generation: 1, value: (await h.read(path))!},
  });
  assert.equal(ids.length, 1, "delivery-only scopes still have wake targets");
  await Promise.all([source.process(ids[0]), source.process(ids[0])]);
  assert.equal((await source.get(ids[0])).payload.checkpoint.phase,
    "complete");
  assert.equal(h.requests.length, 1);
  assert.equal((await h.store.get(h.id)).payload.checkpoint.phase, "receipt");
  const signalId = (await source.get(ids[0])).payload.signalId;
  const prior = await h.store.get(h.id);
  assert.equal((await h.store.process(h.id,
    {kind: "wake", signalId})).kind, "idle");
  assert.deepEqual(await h.store.get(h.id), prior);
  return {source, sourceId: ids[0]};
}

test("fresh consent wakes a held delivery without creating a new message",
  async () => {
    await recoverConsent(await setup());
  });

type Repair = "sender" | "template" | "policy" | "budget" | "suppression";
async function recoverReadiness(h: Awaited<ReturnType<typeof setup>>,
  repair: Repair) {
  const path = repair === "sender" ? h.senderPath :
    repair === "template" ? h.templatePath :
      repair === "policy" ? h.policyPath :
        repair === "budget" ? h.budgetPaths[1] :
          "organizerContactChannelStates/repair";
  const current = (await h.read(path)) ?? {organizerId: h.context.organizerId,
    contactId: "repair", channel: "whatsapp", endpointHash:
      whatsappEndpointHash(h.actor.phone), suppressionStatus: "none",
    suppressionSource: null, adminSuppressed: false, campaignAcceptedCount: 0,
    lastCampaignAcceptedAt: null, lastInboundAt: null, lastReplyAt: null,
    createdAt: (await h.read(h.senderPath))!.createdAt,
    updatedAt: (await h.read(h.senderPath))!.updatedAt};
  const held = {...current, ...(repair === "budget" ? {limitMicros: 0} :
    repair === "suppression" ? {adminSuppressed: true} :
      {status: repair === "sender" ? "disconnected" :
        repair === "template" ? "PAUSED" : "paused"})};
  await h.write(path, held);
  await h.store.process(h.id);
  assert.equal((await h.store.get(h.id)).payload.checkpoint.phase, "review");
  assert.equal(h.requests.length, 0);
  h.clock.now += 1000;
  await h.write(path, current);
  const [collection, documentId] = path.split("/");
  const change: AssistanceSourceChange = {source: {eventId: randomUUID(),
    collection: collection as AssistanceSourceChange["source"]["collection"],
    documentId, occurredAt: h.clock.now}, before: {generation: 1, value: held},
  after: {generation: 1, value: current}};
  const source = new AssistanceSourceWorkStore(h.db, () => h.clock.now,
    undefined, h.store);
  const ids = await enqueueAssistanceSourceChange(source, change);
  assert.equal(ids.length, 1);
  for (const id of ids) {
    const parent = await source.get(id);
    await source.process(id);
    if (!isEventSourceScope(parent.payload.scope)) {
      const child = sourceWorkIds({source: change.source, scope: {
        context: h.context, attendeeId: parent.payload.scope.kind === "sender" ?
          null : h.scope.attendeeId}});
      await source.process(child.workItemId);
    }
  }
  assert.equal(h.requests.length, 1);
  const sent = await h.store.get(h.id);
  assert.equal(sent.payload.checkpoint.phase, "receipt");
  for (const id of await enqueueAssistanceSourceChange(source, change)) {
    await source.process(id);
  }
  assert.deepEqual(await h.store.get(h.id), sent);
}

for (const repair of ["sender", "template", "policy", "budget",
  "suppression"] as const) {
  test(repair + " recovery wakes the same message through current authority",
    async () => recoverReadiness(await setup(), repair));
}

test("provider STOP wakes the affected guest but does not grant consent",
  async () => {
    const h = await setup();
    h.clock.now += 1000;
    await h.stop(h.clock.now);
    const endpointHash = whatsappEndpointHash(h.actor.phone)!;
    const documentId = whatsappStopId(h.context.organizerId, endpointHash);
    const after = (await h.read(WHATSAPP_ENDPOINT_STOPS + "/" + documentId))!;
    const source = new AssistanceSourceWorkStore(h.db, () => h.clock.now,
      undefined, h.store);
    const change: AssistanceSourceChange = {source: {
      eventId: randomUUID(), collection: WHATSAPP_ENDPOINT_STOPS, documentId,
      occurredAt: h.clock.now}, before: null,
    after: {generation: 1, value: after}};
    const ids = await enqueueAssistanceSourceChange(source, change);
    assert.equal(ids.length, 1);
    await source.process(ids[0]);
    const child = sourceWorkIds({source: change.source, scope: {
      context: h.context, attendeeId: h.scope.attendeeId}});
    await source.process(child.workItemId);
    assert.equal(h.requests.length, 0);
    assert.equal((await h.store.get(h.id)).payload.checkpoint.phase, "review");
  });

test("Firestore sender and endpoint recovery preserve submission identity", {
  skip: !process.env.FIRESTORE_EMULATOR_HOST, timeout: 120_000,
}, async () => {
  assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? "",
    /^(127\.0\.0\.1|localhost|\[::1\]):\d+$/);
  const app = initializeApp({projectId: "demo-catch-rules"}, randomUUID());
  try {
    await recoverReadiness(await setup(getEmulatorFirestore(app)), "sender");
    await recoverReadiness(
      await setup(getEmulatorFirestore(app)), "suppression");
  } finally {
    await deleteApp(app);
  }
});

test("source wakes preserve provider receipt waits and pending review",
  async () => {
    const h = await setup();
    h.behavior.unknown = true;
    await h.store.process(h.id);
    const wait = (await h.store.get(h.id)).payload.checkpoint;
    h.clock.now += 1000;
    await h.store.process(h.id, {kind: "wake", signalId: "sender-changed"});
    const early = (await h.store.get(h.id)).payload.checkpoint;
    assert.equal(early.phase, "receipt");
    assert.equal(early.dueAt, wait.dueAt);
    h.clock.now = wait.dueAt!;
    await h.store.process(h.id);
    await h.store.process(h.id, {kind: "wake", signalId: "budget-changed"});
    const review = (await h.store.get(h.id)).payload.checkpoint;
    assert.equal(review.phase, "review");
    assert.equal(review.reason, "providerPending");
    assert.equal(review.dueAt, h.published.intent.expiresAt);
    assert.equal(h.requests.length, 1);
    assert.equal(h.behavior.keyReads, 1);
    await h.receipt({kind: "delivered", at: h.clock.now,
      providerMessageId: "wamid.delivery"});
    await h.store.process(h.id);
    const completed = await h.store.get(h.id);
    await h.store.process(h.id, {kind: "wake", signalId: "another-change"});
    assert.deepEqual(await h.store.get(h.id), completed);
  });

test("lost source checkpoint replays delivery wake receipts after restart",
  async () => {
    const h = await setup();
    let interrupt = true;
    const source = new AssistanceSourceWorkStore(h.db, () => h.clock.now,
      undefined, {process: async (...args) => {
        const result = await h.store.process(...args);
        if (interrupt) {
          interrupt = false;
          h.fake.failNextCommit = true;
        }
        return result;
      }});
    const input = {scope: {context: h.context, attendeeId: h.scope.attendeeId},
      source: {eventId: randomUUID(), collection: "events" as const,
        documentId: h.context.eventId, occurredAt: h.clock.now}};
    const id = (await source.enqueue(input)).item.workItemId;
    await assert.rejects(source.process(id), /interruption/);
    const sent = await h.store.get(h.id);
    const restarted = new AssistanceSourceWorkStore(h.db, () => h.clock.now,
      undefined, h.store);
    await restarted.process(id);
    assert.equal((await restarted.get(id)).run.status, "completed");
    assert.deepEqual(await h.store.get(h.id), sent);
    assert.equal(h.requests.length, 1);
    assert.equal(await restarted.hasTargets({...input.scope,
      attendeeId: "other-guest"}), false);
    assert.equal(await restarted.hasTargets({...input.scope,
      context: {...h.context, organizerId: "other-organizer"}}), false);
  });

test("delivery wakes reject corrupt receipts and respect their parent deadline",
  async () => {
    const h = await setup();
    const wake = {kind: "wake" as const, signalId: "consent-changed"};
    assert.equal((await h.store.process(h.id, wake, h.clock.now)).kind,
      "busy");
    assert.equal(h.behavior.keyReads, 0);
    await h.store.process(h.id, wake);
    const receipt = h.fake.entries().find(([path, value]) =>
      path.startsWith(operationCollections.actionReceipts + "/") &&
        value.operation === "message_delivery_wake")!;
    h.fake.write(receipt[0], {...receipt[1], inputHash: "a".repeat(64)});
    await assert.rejects(h.store.process(h.id, wake));
    assert.equal(h.requests.length, 1);
  });

test("source pages merge guest and delivery work without dropping targets",
  async () => {
    const h = await setup();
    const message = await h.record();
    const guest = newLiveWorkRecords({schemaVersion: 1, kind: "liveLateJoin",
      scope: h.scope, ...h.runtime.configuration,
      runtimeBinding: h.runtime.binding,
      checkpoint: {dueAt: h.clock.now + 60_000, evaluatedAt: null,
        evaluations: 0, observation: null, sourceHash: null,
        publication: null}}, h.clock.now);
    await h.write(operationCollections.runs + "/" + guest.run.runId,
      guest.run);
    await h.write(operationCollections.workItems + "/" + guest.item.workItemId,
      guest.item);
    for (let n = 0; n < 22; n++) {
      const intent = {...message.intent, intentId: "page-" + n};
      const record = newDeliveryWorkRecords({...message, intent,
        messageId: assistanceMessageId(intent)}, h.clock.now);
      await h.write(operationCollections.runs + "/" + record.run.runId,
        record.run);
      await h.write(operationCollections.workItems + "/" +
        record.item.workItemId, record.item);
    }
    const visited: string[] = [];
    const source = new AssistanceSourceWorkStore(h.db, () => h.clock.now,
      undefined, {process: async (id) => {
        visited.push(id);
        return {kind: "idle", records: await h.store.get(id)};
      }});
    const id = (await source.enqueue({scope: {context: h.context,
      attendeeId: null}, source: {eventId: randomUUID(), collection: "events",
      documentId: h.context.eventId, occurredAt: h.clock.now}}))
      .item.workItemId;
    await source.process(id);
    assert.equal((await source.get(id)).payload.checkpoint.visited, 20);
    assert.equal(visited.length, 19);
    await source.process(id);
    const done = await source.get(id);
    assert.equal(done.payload.checkpoint.visited, 24);
    assert.equal(done.payload.checkpoint.phase, "complete");
    assert.equal(visited.length, 23);
    assert.equal(new Set(visited).size, 23);
    const guestWork = await new LiveAssistanceWorkRunner(h.db,
      () => h.clock.now).store.get(guest.item.workItemId);
    assert.equal(guestWork.item.revision, 1);
  });

test("Firestore consent fanout resumes held delivery and deduplicates wakes", {
  skip: !process.env.FIRESTORE_EMULATOR_HOST, timeout: 60_000,
}, async () => {
  assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? "",
    /^(127\.0\.0\.1|localhost|\[::1\]):\d+$/);
  const app = initializeApp({projectId: "demo-catch-rules"}, randomUUID());
  try {
    await recoverConsent(await setup(getEmulatorFirestore(app)));
  } finally {
    await deleteApp(app);
  }
});

test("concurrent restarts share one grant and submission", async () => {
  const h = await setup();
  await Promise.all(Array.from({length: 8}, () => h.store.process(h.id)));
  assert.equal(h.requests.length, 1);
  const work = await h.store.get(h.id);
  assert.equal(work.payload.checkpoint.phase, "receipt");
  assert.equal(work.run.counters.published, 0,
    "a delivery checkpoint is not publication or delivery evidence");
  const link = await h.guests.issueLink(h.published.thread.threadId,
    deliveryGrantOperation(h.published.messageId), keys);
  assert.ok(h.requests[0].includes(link.linkId));
  const restarted = new AssistanceDeliveryWorkStore(h.db, () => h.clock.now,
    h.dispatcher);
  assert.equal((await restarted.process(h.id)).kind, "idle");
  assert.equal(h.requests.length, 1);
  const grants = h.fake.entries().filter(([p, v]) =>
    p.startsWith(guestCollections.grants + "/") &&
    v.threadId === h.published.thread.threadId);
  assert.equal(grants.length, 1);
  assert.ok(!JSON.stringify(h.fake.entries()).includes(link.secret));
});

test("unknown submission never becomes fallback when keys or sender disappear",
  async () => {
    const h = await setup();
    h.behavior.unknown = true;
    await h.store.process(h.id);
    h.behavior.keyUnavailable = true;
    await h.write(h.senderPath, {...await h.read(h.senderPath),
      status: "disconnected"});
    const waiting = await h.store.get(h.id);
    h.clock.now = waiting.payload.checkpoint.dueAt!;
    await h.store.process(h.id);
    const review = await h.store.get(h.id);
    assert.equal(review.payload.checkpoint.phase, "review");
    assert.equal(review.payload.checkpoint.reason, "providerPending");
    assert.equal(review.payload.checkpoint.dueAt, h.published.intent.expiresAt);
    assert.equal(h.requests.length, 1);
    assert.equal(h.behavior.keyReads, 1);
    assert.equal((await h.record()).attempts[0].state.kind, "unknown");
    await h.receipt({kind: "delivered", at: h.clock.now,
      providerMessageId: "wamid.delivery"});
    await h.store.processMessage(h.published.messageId);
    assert.equal((await h.store.get(h.id)).payload.checkpoint.reason,
      "delivered");
  });

test("receipt changes wake saved work without waiting for its due time",
  async () => {
    const h = await setup();
    await h.store.process(h.id);
    await h.receipt({kind: "delivered", providerMessageId: "wamid.delivery",
      at: h.clock.now});
    await h.store.processMessage(h.published.messageId);
    const done = await h.store.get(h.id);
    assert.equal(done.payload.checkpoint.phase, "complete");
    assert.equal(done.payload.checkpoint.reason, "delivered");
    assert.equal(h.requests.length, 1);
    assert.ok(!(await h.store.listDue(100)).includes(h.id));
    await h.receipt({kind: "failed", providerMessageId: "wamid.delivery",
      at: h.clock.now, classification: "technical",
      evidenceId: "contradiction"});
    await h.store.processMessage(h.published.messageId);
    assert.equal((await h.record()).deliveryConflict, true);
    assert.equal((await h.store.get(h.id)).item.revision, done.item.revision,
      "late evidence cannot reopen completed Operations work");
    assert.equal(h.requests.length, 1);
  });

test("confirmed technical failure resumes through the same bounded worker",
  async () => {
    const h = await setup();
    await h.store.process(h.id);
    await h.receipt({kind: "failed", providerMessageId: "wamid.delivery",
      at: h.clock.now, classification: "technical", evidenceId: "confirmed"});
    await h.store.processMessage(h.published.messageId);
    const retry = await h.store.get(h.id);
    assert.equal(retry.payload.checkpoint.reason, "retryBackoff");
    assert.equal(h.requests.length, 1);
    h.clock.now = retry.payload.checkpoint.dueAt!;
    await h.store.process(h.id);
    assert.equal(h.requests.length, 2);
    assert.equal((await h.record()).attempts.length, 2);
    const body = (value: string) => JSON.parse(value).template.components
      .find((c: {type: string}) => c.type === "body");
    assert.deepEqual(body(h.requests[0]), body(h.requests[1]));
  });

test("a lost checkpoint after provider submission cannot submit again",
  async () => {
    const h = await setup();
    const interrupted = new AssistanceDeliveryWorkStore(h.db,
      () => h.clock.now, {dispatch: async (...args) => {
        const result = await h.dispatcher.dispatch(...args);
        h.fake.failNextCommit = true;
        return result;
      }});
    await assert.rejects(interrupted.process(h.id),
      /injected transaction interruption/);
    assert.equal((await h.store.get(h.id)).item.revision, 0);
    assert.equal((await h.record()).attempts[0].state.kind, "accepted");
    await h.store.process(h.id);
    assert.equal(h.requests.length, 1);
    assert.equal((await h.store.get(h.id)).payload.checkpoint.phase, "receipt");
  });

test("lease expiry fences the checkpoint after submission", async () => {
  const h = await setup();
  const interrupted = new AssistanceDeliveryWorkStore(h.db, () => h.clock.now,
    {dispatch: async (...args) => {
      const result = await h.dispatcher.dispatch(...args);
      h.clock.now += 61_000;
      return result;
    }});
  await assert.rejects(interrupted.process(h.id));
  assert.equal((await h.store.get(h.id)).item.revision, 0);
  await h.store.process(h.id);
  assert.equal(h.requests.length, 1);
});

test("missing keys have bounded retries and keep credentials out of receipts",
  async () => {
    const h = await setup();
    h.behavior.keyUnavailable = true;
    for (let i = 0; i < 5; i++) {
      await h.store.process(h.id);
      h.clock.now = (await h.store.get(h.id)).payload.checkpoint.dueAt!;
      if (i < 4) assert.ok(h.clock.now < h.published.intent.expiresAt);
    }
    const work = await h.store.get(h.id);
    assert.equal(work.payload.checkpoint.phase, "review");
    assert.equal(work.payload.checkpoint.failures, 5);
    assert.equal(h.requests.length, 0);
    assert.ok(!JSON.stringify(h.fake.entries()).includes("private-key-error"));
    await h.store.process(h.id);
    assert.equal((await h.store.get(h.id)).payload.checkpoint.reason,
      "expired");
    assert.equal(h.behavior.keyReads, 5);
  });

test("missing event facts stop after bounded repair attempts", async () => {
  const h = await setup();
  h.fake.remove("events/" + h.context.eventId);
  for (let i = 0; i < 5; i++) {
    await h.store.process(h.id);
    h.clock.now = (await h.store.get(h.id)).payload.checkpoint.dueAt!;
  }
  assert.equal((await h.store.get(h.id)).payload.checkpoint.reason,
    "eventFactsStale");
  assert.equal(h.behavior.keyReads, 0);
  assert.equal(h.requests.length, 0);
});

test("slow credentials cannot start I/O after the work deadline", async () => {
  const h = await setup();
  h.behavior.beforeCredentials = async () => {
    h.clock.now += 61_000;
  };
  await assert.rejects(h.store.process(h.id));
  assert.equal(h.requests.length, 0);
  assert.equal((await h.record()).attempts.length, 0);
  assert.equal((await h.store.get(h.id)).item.revision, 0);
});

test("arrival and pause stop sends before secret access", async () => {
  for (const action of ["arrival", "pause"] as const) {
    const h = await setup();
    if (action === "arrival") {
      await h.write(h.attendeePath, {...await h.read(h.attendeePath),
        status: "checkedIn", checkedInAt: Timestamp.fromMillis(h.clock.now),
        checkedInBy: "host-1", attendanceRevision: 1});
    } else {
      const view = (await h.runtime.store.get("host-1",
        {context: h.context})).view;
      await h.runtime.store.set("host-1", {context: h.context,
        requestId: randomUUID(), expectedRevision: view.revision,
        expectedSourceHash: view.sourceHash, command: {kind: "pause"}});
    }
    await h.store.process(h.id);
    assert.equal(h.behavior.keyReads, 0);
    assert.equal(h.requests.length, 0);
    assert.equal((await h.store.get(h.id)).payload.checkpoint.phase,
      "complete");
  }
});

test("authority is rechecked after signing-key access", async () => {
  const h = await setup();
  h.behavior.beforeKeys = async () => {
    await h.write(h.attendeePath, {...await h.read(h.attendeePath),
      status: "checkedIn", checkedInAt: Timestamp.fromMillis(h.clock.now),
      checkedInBy: "host-1", attendanceRevision: 1});
  };
  await h.store.process(h.id);
  assert.equal(h.requests.length, 0);
  assert.equal((await h.store.get(h.id)).payload.checkpoint.reason,
    "guestPresent");
});

test("revoked delivery grant cannot be replaced to regain send authority",
  async () => {
    const h = await setup();
    const link = await h.guests.issueLink(h.published.thread.threadId,
      deliveryGrantOperation(h.published.messageId), keys);
    await h.guests.revokeLink(link.linkId);
    await h.store.process(h.id);
    assert.equal(h.requests.length, 0);
    assert.equal((await h.store.get(h.id)).payload.checkpoint.failures, 1);
  });

test("delivery records reject forged scope and projections", async () => {
  const h = await setup();
  const original = await h.store.get(h.id);
  for (const mutation of [
    {...original.item, entityKind: "guest_episode"},
    {...original.item, candidateHash: "0".repeat(64)},
    {...original.item, lifecycleStatus: "terminal"},
    {...original.item, normalizedPayload: {...original.payload,
      checkpoint: {...original.payload.checkpoint, phase: "complete"}}},
  ]) {
    assert.throws(() => readDeliveryWorkRecords(original.run, mutation,
      h.id, h.clock.now));
  }
  await h.write(operationCollections.workItems + "/" + h.id,
    {...original.item, normalizedPayload: {...original.payload,
      scope: {...original.payload.scope, attendeeId: "another"}}});
  await assert.rejects(h.store.process(h.id));
  assert.equal(h.requests.length, 0);
});

test("expired and exhausted work cannot dispatch or spin on reservations",
  async () => {
    const h = await setup();
    const work = await h.store.get(h.id);
    const message = await h.record();
    const expired = nextDeliveryCheckpoint(work.payload, message,
      {kind: "hostDecision", reason: "noEligibleRoute"}, null,
      message.intent.expiresAt);
    assert.equal(expired.phase, "complete");
    assert.equal(expired.reason, "expired");
    const limit = nextDeliveryCheckpoint({...work.payload, checkpoint:
      {...work.payload.checkpoint, phase: "retry", reason: "retryBackoff",
        dueAt: h.clock.now, evaluations: 100}}, message,
    {kind: "hostDecision", reason: "noEligibleRoute"}, null, h.clock.now);
    assert.equal(limit.phase, "review");
    assert.equal(limit.reason, "recoveryLimit");
    assert.equal(limit.dueAt, message.intent.expiresAt);
  });

test("work trigger routes saved delivery work", async () => {
  const h = await setup();
  const work = await h.store.get(h.id);
  const ports = {delivery: h.store,
    checkpoint: new AssistanceCheckpointWorkStore(h.db, () => h.clock.now),
    roster: new AssistanceRosterWorkStore(h.db, () => h.clock.now),
    source: new AssistanceSourceWorkStore(h.db, () => h.clock.now),
    guest: new LiveAssistanceWorkRunner(h.db, () => h.clock.now)};
  await processChangedAssistanceWork(h.id, work.item, ports, h.clock.now);
  assert.equal(h.requests.length, 1);
});

test("new guidance waits for policy cooldown before delivery", async () => {
  const h = await setup();
  await h.store.process(h.id);
  await h.progress.confirm("two");
  const next = await h.publishReady();
  assert.ok(next.evaluation.decision.kind === "update");
  assert.equal(next.evaluation.decision.shouldSend, false);
  const id = deliveryWorkIds(next.messageId).workItemId;
  await h.store.process(id);
  const waiting = await h.store.get(id);
  assert.equal(waiting.payload.checkpoint.phase, "retry");
  assert.equal(waiting.payload.checkpoint.dueAt,
    next.evaluation.decision.nextEvaluationAt);
  assert.equal(h.requests.length, 1);
  h.clock.now = waiting.payload.checkpoint.dueAt!;
  assert.equal((await h.publishReady()).messageId, next.messageId);
  await h.store.process(id);
  assert.equal(h.requests.length, 2);
  assert.equal((await h.store.get(id)).payload.checkpoint.phase, "receipt");
});

test("unreachable routes retain review work without loading keys", async () => {
  const h = await setup();
  await h.write(h.senderPath, {...await h.read(h.senderPath),
    status: "disconnected"});
  await h.store.process(h.id);
  const current = await h.store.get(h.id);
  assert.equal(current.payload.checkpoint.phase, "review");
  assert.equal(current.payload.checkpoint.reason, "noEligibleRoute");
  assert.equal(current.run.status, "running");
  assert.equal(h.behavior.keyReads, 0);
  assert.equal(h.requests.length, 0);
});

test("Firestore arbitrates publication and delivery", {
  skip: !process.env.FIRESTORE_EMULATOR_HOST, timeout: 60_000,
}, async () => {
  assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? "",
    /^(127\.0\.0\.1|localhost|\[::1\]):\d+$/);
  const app = initializeApp({projectId: "demo-catch-rules"}, randomUUID());
  try {
    const h = await setup(getEmulatorFirestore(app));
    const before = await h.store.get(h.id);
    assert.equal(before.payload.intentHash,
      operationContentHash(h.published.intent));
    assert.ok((await h.store.listDue(100)).includes(h.id));
    await Promise.all(Array.from({length: 8}, () => h.store.process(h.id)));
    assert.equal(h.requests.length, 1);
    const message: MessageRecord = await h.record();
    assert.equal(message.attempts.length, 1);
    assert.equal((await h.store.get(h.id)).payload.checkpoint.phase, "receipt");
    await h.receipt({kind: "delivered", providerMessageId: "wamid.delivery",
      at: h.clock.now});
    await h.store.processMessage(h.published.messageId);
    assert.equal((await h.store.get(h.id)).payload.checkpoint.reason,
      "delivered");
    assert.equal(threadIdentity(message.intent), h.published.thread.threadId);
  } finally {
    await deleteApp(app);
  }
});
