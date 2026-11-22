import {getEmulatorFirestore} from "../../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import test from "node:test";
import {deleteApp, initializeApp} from "firebase-admin/app";
import {Firestore} from "firebase-admin/firestore";
import type {CallableRequest} from "firebase-functions/v2/https";
import {harness} from "./whatsappTestHarness";
import {rcsTestConfig} from "./rcsTestFixtures";
import {operationContentHash} from "../../operations/durableActions";
import {whatsappTemplateSnapshot} from "./whatsappTemplate";
import {WhatsappPreferenceOptionsStore} from "./whatsappPreferenceOptionsStore";
import {listEventWhatsappPreferencesHandler} from
  "./whatsappPreferenceOptionsHandlers";
import {WHATSAPP_PERMISSIONS, whatsappPermissionId} from
  "./whatsappPermissionRecords";
import {EventAssistanceRuntimeConfigStore} from "./runtimeConfigStore";
import {validateListEventWhatsappPreferencesCallablePayload} from
  "../../shared/generated/validators/listEventWhatsappPreferencesInput";
import {validateListEventWhatsappPreferencesCallableResponse} from
  "../../shared/generated/validators/listEventWhatsappPreferencesOutput";

async function fixture(db?: Firestore) {
  const h = await harness(db, randomUUID());
  const rcs = rcsTestConfig();
  await h.write("eventAssistanceRcsSenders/rcs-sender", {...rcs,
    senderId: "rcs-sender", activation: {...rcs.activation,
      approvedAt: h.clock.now - 1000, validUntil: h.clock.now + 3_600_000},
    quote: {...rcs.quote, validUntil: h.clock.now + 3_600_000}});
  const scope = {eventId: h.context.eventId, attendeeId: h.scope.attendeeId,
    cursor: null};
  const store = new WhatsappPreferenceOptionsStore(h.db, () => h.clock.now);
  const runtime = new EventAssistanceRuntimeConfigStore(h.db,
    () => h.clock.now);
  const configure = async (senderId = h.scope.senderId) => {
    const {view} = await runtime.get("host-1", {context: h.context});
    return runtime.set("host-1", {context: h.context, requestId: randomUUID(),
      expectedRevision: view.revision, expectedSourceHash: view.sourceHash,
      command: {kind: "configure", configuration: {
        expiresAt: h.clock.now + 3_600_000, maxEvaluations: 100,
        options: {routes: [{routeId: "catchEventRcs", senderId: "rcs-sender"},
          {routeId: "organizerEventWhatsapp", senderId}],
        responseDeadline: null, deliveryPolicy: {maxAttempts: 3,
          maxAttemptsPerRoute: 1, minimumRetrySeconds: 1}}}}});
  };
  const permissionPath = WHATSAPP_PERMISSIONS + "/" +
    whatsappPermissionId(h.context, h.scope.attendeeId, h.scope.senderId);
  const addSender = async (senderId: string, decision: "grant" | "revoke") => {
    await h.write("organizerSenderConnections/" + senderId,
      (await h.read(h.senderPath))!);
    const templateId = "template-" + senderId;
    const template = {...await h.read(h.templatePath), connectionId: senderId};
    await h.write("organizerMessageTemplates/" + templateId, template);
    await h.write("eventAssistanceWhatsappPolicies/" + senderId,
      {...h.expected.policy, senderId, templates: h.expected.policy.templates
        .map((t) => ({...t, templateDocumentId: templateId,
          templateHash: operationContentHash(
            whatsappTemplateSnapshot(template)),
        }))});
    const nextScope = {...h.scope, senderId};
    const {view} = await h.preferences.get(h.actor, nextScope);
    await h.preferences.set(h.actor, {...nextScope,
      expectedRevision: null, requestId: randomUUID(), decision:
        decision === "revoke" ? {kind: "revoke"} : {kind: "grant",
          copyVersion: view.consent.version,
          reviewHash: view.reviewHash,
          senderHash: view.sender!.bindingHash,
          stopRecordHash: view.stopRecordHash}});
  };
  return {...h, scope, runtime, store, configure, permissionPath, addSender,
    list: (cursor: string | null = null) => store.list(h.actor.uid,
      {...scope, cursor})};
}

test("WhatsApp discovery separates sender selection from consent", async () => {
  const h = await fixture();
  assert.deepEqual((await h.list()).previousSenderIds, [h.grant.senderId]);
  await h.configure();
  const before = h.fake.entries();
  const result = await h.list();
  assert.equal(result.configuredSenderId, h.grant.senderId);
  assert.equal(validateListEventWhatsappPreferencesCallableResponse(result),
    true);
  assert.deepEqual(result.previousSenderIds, []);
  assert.deepEqual(h.fake.entries(), before);
  for (const privateValue of [h.actor.phone, h.actor.uid,
    h.expected.connection.phoneNumberId,
    h.expected.connection.secretVersionResource, "consent", "accessToken"]) {
    assert.equal(JSON.stringify(result).includes(privateValue!), false);
  }
});

test("paused execution and sender retain selection", async () => {
  const h = await fixture(); await h.configure();
  const {view} = await h.runtime.get("host-1", {context: h.context});
  await h.runtime.set("host-1", {context: h.context, requestId: randomUUID(),
    expectedRevision: view.revision, expectedSourceHash: view.sourceHash,
    command: {kind: "pause"}});
  await h.write(h.senderPath, {...await h.read(h.senderPath),
    status: "disconnected"});
  assert.equal((await h.list()).configuredSenderId, h.grant.senderId);
  assert.equal((await h.preferences.get(h.actor, h.grant)).view.canEnable,
    false);
});

test("new sender selection preserves revoked history without inventing a grant",
  async () => {
    const h = await fixture();
    await h.addSender("replacement", "revoke");
    await h.configure("replacement");
    h.fake.remove("organizerSenderConnections/replacement");
    await h.preferences.set(h.actor, {...h.grant, requestId: "withdraw",
      expectedRevision: 1, decision: {kind: "revoke"}});
    await h.addSender("never-granted", "revoke");
    const result = await h.list();
    assert.equal(result.configuredSenderId, "replacement");
    assert.deepEqual(result.previousSenderIds, [h.grant.senderId]);
    assert.equal((await h.preferences.get(h.actor, {...h.grant,
      senderId: "replacement"})).view.canEnable, false);
  });

test("changed runtime and recipient sources withhold stale choices",
  async () => {
    const h = await fixture(); await h.configure();
    const eventPath = "events/" + h.context.eventId;
    await h.write(eventPath, {...await h.read(eventPath), endTime: {
      _seconds: (h.clock.now + 7_200_000) / 1000, _nanoseconds: 0}});
    assert.equal((await h.list()).configuredSenderId, null);
    assert.deepEqual((await h.list()).previousSenderIds, [h.grant.senderId]);
    const attendee = (await h.read(h.attendeePath))!;
    for (const patch of [{phoneE164: "+918888888888"},
      {createdAt: {_seconds: h.clock.now / 1000, _nanoseconds: 123}}]) {
      await h.write(h.attendeePath, {...attendee, ...patch});
      assert.deepEqual((await h.list()).previousSenderIds, []);
    }
  });

test("foreign participants cannot discover earlier senders",
  async () => {
    const h = await fixture(); const reads: string[] = [];
    h.fake.beforeRead = (path) => reads.push(path);
    await assert.rejects(h.store.list("foreign", h.scope),
      /preferences unavailable/);
    assert.ok(reads.every((p) => p.startsWith("events/") ||
      p.startsWith("eventAttendees/")));
    await assert.rejects(h.store.list(h.actor.uid, {...h.scope,
      eventId: "foreign-event"}));
    await h.write(h.attendeePath, {...await h.read(h.attendeePath),
      linkedUid: "replacement"});
    assert.deepEqual((await h.store.list("replacement", h.scope))
      .previousSenderIds, []);
    await assert.rejects(h.list());
  });

test("malformed evidence and backward clocks cannot hide history",
  async () => {
    const h = await fixture();
    const permission = (await h.read(h.permissionPath))!;
    for (const patch of [{updatedAt: h.clock.now + 1},
      {permissionId: "wa-permission:" + "a".repeat(64)}]) {
      await h.write(h.permissionPath, {...permission, ...patch});
      await assert.rejects(h.list());
    }
    await h.write(h.permissionPath, permission);
    let count = 0;
    await assert.rejects(new WhatsappPreferenceOptionsStore(h.db,
      () => h.clock.now - count++).list(h.actor.uid, h.scope), /clock/);
    await assert.rejects(new WhatsappPreferenceOptionsStore(h.db,
      () => NaN).list(h.actor.uid, h.scope), /clock/);
  });

async function pagination(db?: Firestore) {
  const h = await fixture(db); await h.configure();
  const expected = new Set<string>();
  for (let i = 0; i < 53; i++) {
    const id = "previous-" + i;
    expected.add(id); await h.addSender(id, "grant");
  }
  const first = await h.list();
  assert.ok(first.previousSenderIds.length <= 50); assert.ok(first.nextCursor);
  const cursorPath = WHATSAPP_PERMISSIONS + "/" + first.nextCursor;
  if (db) await db.doc(cursorPath).delete();
  else h.fake.remove(cursorPath);
  const second = await h.list(first.nextCursor);
  assert.equal(second.nextCursor, null);
  const all = [...first.previousSenderIds, ...second.previousSenderIds];
  assert.equal(all.length, expected.size);
  assert.deepEqual(new Set(all), expected);
}

test("history pages survive deleted cursors", async () => pagination());

test("callable requires auth and strict discovery input", async () => {
  const scope = {eventId: "event", attendeeId: "guest", cursor: null};
  assert.equal(validateListEventWhatsappPreferencesCallablePayload(scope),
    true);
  for (const patch of [{uid: "foreign"}, {senderId: "chosen"}, {limit: 1000},
    {cursor: "rcs-permission:" + "a".repeat(64)}, {mode: "rehearsal"}]) {
    assert.equal(validateListEventWhatsappPreferencesCallablePayload(
      {...scope, ...patch}), false);
  }
  assert.equal(validateListEventWhatsappPreferencesCallableResponse({
    eventId: scope.eventId, attendeeId: scope.attendeeId,
    serverTime: 1, configuredSenderId: null,
    previousSenderIds: ["same", "same"], nextCursor: null}), false);
  const h = await fixture(); let opened = 0;
  const deps = {firestore: () => {
    opened++; return h.db;
  },
  now: () => h.clock.now, checkRateLimit: async () => {
    throw new Error("rate-limited");
  }};
  await assert.rejects(listEventWhatsappPreferencesHandler({data: scope} as
    CallableRequest<unknown>, deps), /authenticat|sign/i);
  assert.equal(opened, 0);
  await assert.rejects(listEventWhatsappPreferencesHandler({data: h.scope,
    auth: {uid: h.actor.uid, token: {}}} as CallableRequest<unknown>, deps),
  /rate-limited/);
});

test("Firestore pages only participant-owned WhatsApp history", {
  skip: !process.env.FIRESTORE_EMULATOR_HOST, timeout: 120_000,
}, async () => {
  assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? "",
    /^(127\.0\.0\.1|localhost|\[::1\]):\d+$/);
  const id = randomUUID(); const projectId = "demo-wa-prefs-" + id.slice(0, 8);
  const app = initializeApp({projectId}, id);
  try {
    await pagination(getEmulatorFirestore(app));
  } finally {
    await deleteApp(app);
  }
});
