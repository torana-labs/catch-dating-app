import {getEmulatorFirestore} from "../../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import {createHmac, randomUUID} from "node:crypto";
import {readFileSync} from "node:fs";
import test from "node:test";
import {deleteApp, initializeApp} from "firebase-admin/app";
import {Firestore, Timestamp} from "firebase-admin/firestore";
import type {Request} from "firebase-functions/v2/https";
import {rcsHarness, rcsHttpResponse} from "./rcsDispatchTestHarness";
import {keys, start} from "./whatsappTestHarness";
import {EventAssistanceSettingsStore} from "./policySettingsStore";
import {suggestedTemplate} from "./policySettings";
import {EventAssistanceRuntimeConfigStore} from "./runtimeConfigStore";
import {LiveLateJoinPublisher} from "./liveLateJoinPublication";
import {LiveMessageDispatcher, createLiveMessageWorker} from
  "./liveMessageDispatcher";
import {eventAssistanceRcsWebhookHandler} from "./rcsDeliveryWebhook";
import {RcsCallbackStore} from "./rcsCallbackStore";
import {rcsCallbackId} from "./rcsCallbackRecords";
import {RcsCallbackConsumer} from "./rcsCallbackConsumer";
import {parseRcsBudget} from "./rcsDispatchRecords";

async function fixture(db?: Firestore) {
  const h = await rcsHarness(db, randomUUID(), ["catchEventRcs"]);
  await h.write(h.attendeePath, {...JSON.parse(readFileSync(
    "../contracts/fixtures/valid/event_attendee_doc.json", "utf8")),
  ...await h.read(h.attendeePath), organizerId: h.context.organizerId,
  checkedInAt: null, checkedInBy: null, attendanceRevision: 0,
  updatedAt: Timestamp.fromMillis(start)});
  const settings = new EventAssistanceSettingsStore(h.db, () => h.clock.now);
  const scope = {context: h.context, groupId: "event:whole",
    workflowKind: "lateJoin"};
  const template = suggestedTemplate("lateJoin")!;
  template.setting = {kind: "enabled", authority: "executeWithinPolicy"};
  const settingsView = (await settings.get("host-1", scope)).view;
  await settings.set("host-1", {...scope, requestId: randomUUID(),
    expectedRevision: settingsView.ownRevision,
    expectedSourceHash: settingsView.sourceHash,
    preference: {kind: "configured", template}});
  const runtime = new EventAssistanceRuntimeConfigStore(h.db,
    () => h.clock.now);
  const view = (await runtime.get("host-1", {context: h.context})).view;
  const options = {routes: [{routeId: "catchEventRcs" as const,
    senderId: h.rcsConfig.senderId}], responseDeadline: null,
  deliveryPolicy: {maxAttempts: 3, maxAttemptsPerRoute: 1,
    minimumRetrySeconds: 1}};
  const saved = await runtime.set("host-1", {context: h.context,
    requestId: randomUUID(), expectedRevision: view.revision,
    expectedSourceHash: view.sourceHash, command: {kind: "configure",
      configuration: {options, expiresAt: start + 3_600_000,
        maxEvaluations: 100}}});
  const runtimeBinding = {runtimeId: saved.view.runtime!.runtimeId,
    revision: saved.view.revision};
  const published = await new LiveLateJoinPublisher(h.db, () => h.clock.now)
    .publish({context: h.context, attendeeId: h.scope.attendeeId,
      episodeId: h.intent.episodeId}, {...options, runtimeBinding});
  assert.ok(published.kind === "published", JSON.stringify(published));
  const record = () => h.outbox.get(published.messageId);
  const control = {enabled: true, credentialReads: 0, foreign: false};
  const dispatcher = new LiveMessageDispatcher(h.db, () => h.clock.now,
    {access: async () => keys},
    (message, signingKeys) => createLiveMessageWorker(
      h.db, message, signingKeys, () => h.clock.now, {
        rcsEnabled: () => control.enabled, whatsappEnabled: () => false,
        rcsCredentials: {access: async (config) => {
          control.credentialReads++;
          assert.equal(config.senderId, h.rcsConfig.senderId);
          return {...h.credentials, agentId: control.foreign ?
            "foreign-agent" : h.credentials.agentId};
        }}, rcsProvider: h.rcsProvider}));
  const dispatch = async () => dispatcher.dispatch((await record())!,
    h.clock.now + 60_000);
  return {...h, published, record, control, dispatch};
}

test("automatic RCS uses the configured live factory and rechecks enablement",
  async () => {
    const h = await fixture();
    h.control.enabled = false;
    assert.equal((await h.dispatch()).kind, "waiting");
    assert.equal(h.control.credentialReads, 0);
    assert.equal(h.requests.length, 0);
    assert.equal((await h.record())!.attempts.length, 0);
    h.control.enabled = true;
    h.control.foreign = true;
    assert.equal((await h.dispatch()).kind, "waiting");
    assert.equal(h.requests.length, 0);
    assert.equal((await h.record())!.attempts.length, 0);
    h.control.foreign = false;
    const sent = await h.dispatch();
    assert.equal(sent.kind, "submitted");
    const message = (await h.record())!;
    assert.equal(message.attempts.length, 1);
    assert.equal(message.attempts[0].state.kind, "accepted");
    assert.equal(h.requests.filter((r) => r.method === "POST").length, 1);
    for (const path of h.rcsBudgetPaths) {
      assert.equal(parseRcsBudget(await h.read(path)).chargedMicros,
        h.rcsConfig.quote.maxMicrosPerMessage);
    }
    await h.dispatch();
    assert.equal(h.requests.filter((r) => r.method === "POST").length, 1);
  });

async function callbackAfterPause(db?: Firestore) {
  const h = await fixture(db);
  await h.dispatch();
  h.control.enabled = false;
  await h.write(h.rcsSenderPath, {...h.rcsConfig, status: "paused"});
  const sent = (await h.record())!;
  const attempt = sent.attempts[0];
  assert.ok(attempt.state.kind === "accepted");
  h.clock.now++;
  const data = Buffer.from(JSON.stringify({agentId: h.rcsConfig.agentId,
    senderPhoneNumber: h.actor.phone, eventType: "DELIVERED",
    eventId: "receipt-after-pause",
    messageId: attempt.state.providerMessageId}));
  const clientToken = "fixture-only-webhook-token-12345678901234567890";
  const request = {path: "/retained", method: "POST",
    rawBody: Buffer.from(JSON.stringify({message: {
      data: data.toString("base64")}})), headers: {
      "x-goog-webhook-type": "message_callback",
      "x-goog-signature": createHmac("sha512", clientToken)
        .update(data).digest("base64")}} as unknown as Request;
  const inbox = new RcsCallbackStore(h.db, () => h.clock.now);
  let callbackId = "";
  const http = rcsHttpResponse();
  const deps = {enabled: () => true, clock: () => h.clock.now,
    keys: {access: async (endpointId: string) => {
      assert.equal(endpointId, "retained");
      return {endpointId, agentId: h.rcsConfig.agentId, clientToken};
    }}, inbox: {enqueue: async (
      callback: Parameters<typeof inbox.enqueue>[0]) => {
      callbackId = rcsCallbackId(callback.evidence);
      return inbox.enqueue(callback);
    }}, failed: () => assert.fail("Authenticated receipt must be accepted")};
  await eventAssistanceRcsWebhookHandler(request, http.response, deps);
  assert.deepEqual(http.replies, [{status: 200, body: "ok"}]);
  const consumer = new RcsCallbackConsumer(h.db, () => h.clock.now);
  await consumer.consume(callbackId);
  assert.equal((await h.record())!.attempts[0].state.kind, "delivered");
  const after = await h.record();
  await eventAssistanceRcsWebhookHandler(request, rcsHttpResponse().response,
    deps);
  await consumer.consume(callbackId);
  assert.deepEqual(await h.record(), after);
  assert.equal(h.requests.filter((r) => r.method === "POST").length, 1);
}

test("inbound delivery survives an outbound pause and replays atomically",
  async () => {
    await callbackAfterPause();
  });

test("Firestore connects RCS publication, dispatch and webhook receipt", {
  skip: !process.env.FIRESTORE_EMULATOR_HOST, timeout: 120_000,
}, async () => {
  assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? "",
    /^(127\.0\.0\.1|localhost|\[::1\]):\d+$/);
  const id = randomUUID();
  const app = initializeApp({projectId: "demo-rcs-live-" + id.slice(0, 8)}, id);
  try {
    await callbackAfterPause(getEmulatorFirestore(app));
  } finally {
    await deleteApp(app);
  }
});
