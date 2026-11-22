import {getEmulatorFirestore} from "../../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import test from "node:test";
import {deleteApp, initializeApp} from "firebase-admin/app";
import {Firestore} from "firebase-admin/firestore";
import type {CallableRequest} from "firebase-functions/v2/https";
import {rcsHarness} from "./rcsDispatchTestHarness";
import {SmsPreferenceStore} from "./smsPreferenceStore";
import {SmsPreferenceOptionsStore} from "./smsPreferenceOptionsStore";
import {listEventSmsPreferencesHandler} from "./smsPreferenceOptionsHandlers";
import {getEventAssistanceSmsPreferenceHandler,
  setEventAssistanceSmsPreferenceHandler} from "./smsPreferenceHandlers";
import {smsCollections, smsPermissionId} from "./smsPermissionRecords";
import {EventAssistanceRuntimeConfigStore} from "./runtimeConfigStore";
import {validateListEventSmsPreferencesCallablePayload} from
  "../../shared/generated/validators/listEventSmsPreferencesInput";
import {validateListEventSmsPreferencesCallableResponse} from
  "../../shared/generated/validators/listEventSmsPreferencesOutput";

async function fixture(db?: Firestore, privateRecipient = false) {
  const id = randomUUID();
  const h = await rcsHarness(db, id, undefined, undefined, privateRecipient);
  const senderId = "sms-" + id;
  const senderPath = smsCollections.senders + "/" + senderId;
  const grant = {eventId: h.context.eventId,
    attendeeId: h.scope.attendeeId, senderId};
  const preferences = new SmsPreferenceStore(h.db, () => h.clock.now,
    senderId);
  const scope = {eventId: grant.eventId, attendeeId: grant.attendeeId,
    cursor: null};
  const store = new SmsPreferenceOptionsStore(h.db, () => h.clock.now);
  const runtime = new EventAssistanceRuntimeConfigStore(h.db,
    () => h.clock.now);
  const configure = async (chosen = senderId) => {
    const {view} = await runtime.get("host-1", {context: h.context});
    return runtime.set("host-1", {context: h.context, requestId: randomUUID(),
      expectedRevision: view.revision, expectedSourceHash: view.sourceHash,
      command: {kind: "configure", configuration: {
        expiresAt: h.clock.now + 3_600_000, maxEvaluations: 100,
        options: {routes: [{routeId: "catchEventSms", senderId: chosen}],
          responseDeadline: null, deliveryPolicy: {maxAttempts: 3,
            maxAttemptsPerRoute: 1, minimumRetrySeconds: 1}}}}});
  };
  const permissionPath = smsCollections.permissions + "/" +
    smsPermissionId(h.context, grant.attendeeId, senderId);
  const addSender = async (nextId: string, decision: "grant" | "revoke") => {
    await h.write(smsCollections.senders + "/" + nextId,
      {...await h.read(senderPath), senderId: nextId});
    const selected = new SmsPreferenceStore(h.db, () => h.clock.now, nextId);
    const nextScope = {...grant, senderId: nextId};
    const {view} = await selected.get(h.actor, nextScope);
    await selected.set(h.actor, {...nextScope, requestId: randomUUID(),
      expectedRevision: view.revision, expectedReviewHash: view.reviewHash,
      decision: decision === "revoke" ? {kind: "revoke"} : {kind: "grant",
        copyVersion: view.consent.version}});
  };
  return {...h, grant, senderPath, preferences, scope, runtime, store,
    configure, permissionPath, addSender,
    list: (cursor: string | null = null) => store.list(h.actor.uid,
      {...scope, cursor})};
}

test("SMS discovery separates sender selection from consent", async () => {
  const h = await fixture();
  assert.deepEqual((await h.list()).previousSenderIds, [h.grant.senderId]);
  await h.configure();
  const before = h.fake.entries();
  const result = await h.list();
  assert.equal(result.configuredSenderId, h.grant.senderId);
  assert.equal(validateListEventSmsPreferencesCallableResponse(result),
    true);
  assert.deepEqual(result.previousSenderIds, []);
  assert.deepEqual(h.fake.entries(), before);
  for (const privateValue of [h.actor.phone, h.actor.uid,
    "credentialVersion", "principalEntityId", "consent", "accessToken"]) {
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
    status: "paused"});
  assert.equal((await h.list()).configuredSenderId, h.grant.senderId);
  assert.equal((await h.preferences.get(h.actor, h.grant)).view.canEnable,
    false);
});

test("new sender selection preserves revoked history without inventing a grant",
  async () => {
    const h = await fixture();
    await h.addSender("replacement", "revoke");
    await h.configure("replacement");
    h.fake.remove(smsCollections.senders + "/replacement");
    await h.preferences.set(h.actor, {...h.grant, requestId: "withdraw",
      expectedRevision: 1, expectedReviewHash:
        (await h.preferences.get(h.actor, h.grant)).view.reviewHash,
      decision: {kind: "revoke"}});
    await h.addSender("never-granted", "revoke");
    const result = await h.list();
    assert.equal(result.configuredSenderId, "replacement");
    assert.deepEqual(result.previousSenderIds, [h.grant.senderId]);
    assert.equal((await new SmsPreferenceStore(h.db, () => h.clock.now,
      "replacement").get(h.actor, {...h.grant,
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

test("private SMS history retains withdrawal without adopting phones",
  async () => {
    const h = await fixture(undefined, true);
    const before = await h.read(h.attendeePath);
    const result = await h.list();
    assert.deepEqual(result.previousSenderIds, [h.grant.senderId]);
    assert.equal(JSON.stringify(result).includes(h.actor.phone!), false);
    assert.deepEqual(await h.read(h.attendeePath), before);
    await h.write(h.attendeePath, {...before, phoneE164: h.actor.phone});
    assert.deepEqual((await h.list()).previousSenderIds, []);
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
      {permissionId: "sms-permission:" + "a".repeat(64)}]) {
      await h.write(h.permissionPath, {...permission, ...patch});
      await assert.rejects(h.list());
    }
    await h.write(h.permissionPath, permission);
    let count = 0;
    await assert.rejects(new SmsPreferenceOptionsStore(h.db,
      () => h.clock.now - count++).list(h.actor.uid, h.scope), /clock/);
    await assert.rejects(new SmsPreferenceOptionsStore(h.db,
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
  const cursorPath = smsCollections.permissions + "/" + first.nextCursor;
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
  assert.equal(validateListEventSmsPreferencesCallablePayload(scope),
    true);
  for (const patch of [{uid: "foreign"}, {senderId: "chosen"}, {limit: 1000},
    {cursor: "rcs-permission:" + "a".repeat(64)}, {mode: "rehearsal"}]) {
    assert.equal(validateListEventSmsPreferencesCallablePayload(
      {...scope, ...patch}), false);
  }
  assert.equal(validateListEventSmsPreferencesCallableResponse({
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
  await assert.rejects(listEventSmsPreferencesHandler({data: scope} as
    CallableRequest<unknown>, deps), /authenticat|sign/i);
  assert.equal(opened, 0);
  await assert.rejects(listEventSmsPreferencesHandler({data: h.scope,
    auth: {uid: h.actor.uid, token: {}}} as CallableRequest<unknown>, deps),
  /rate-limited/);
});

test("Firestore pages only participant-owned SMS history", {
  skip: !process.env.FIRESTORE_EMULATOR_HOST, timeout: 120_000,
}, async () => {
  assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? "",
    /^(127\.0\.0\.1|localhost|\[::1\]):\d+$/);
  const id = randomUUID(); const projectId = "demo-sms-prefs-" + id.slice(0, 8);
  const app = initializeApp({projectId}, id);
  try {
    await pagination(getEmulatorFirestore(app));
  } finally {
    await deleteApp(app);
  }
});


test("public SMS commands bind the selected sender and preserve legacy retries",
  async () => {
    const h = await fixture();
    await h.addSender("catch-event-sms", "revoke");
    const deps = {firestore: () => h.db, now: () => h.clock.now,
      checkRateLimit: async () => undefined};
    const request = (data: unknown) => ({data, auth: {uid: h.actor.uid,
      token: {phone_number: h.actor.phone}}}) as CallableRequest<unknown>;
    const legacy = {eventId: h.grant.eventId,
      attendeeId: h.grant.attendeeId};
    const defaultView = (await getEventAssistanceSmsPreferenceHandler(
      request(legacy), deps)).view;
    assert.equal(defaultView.senderId, "catch-event-sms");
    const command = {...legacy, requestId: "same-request",
      expectedRevision: defaultView.revision,
      expectedReviewHash: defaultView.reviewHash,
      decision: {kind: "grant", copyVersion: defaultView.consent.version}};
    assert.equal((await setEventAssistanceSmsPreferenceHandler(
      request(command), deps)).outcome, "applied");
    assert.equal((await setEventAssistanceSmsPreferenceHandler(
      request(command), deps)).outcome, "replayed");
    const selected = (await getEventAssistanceSmsPreferenceHandler(
      request(h.grant), deps)).view;
    assert.equal(selected.senderId, h.grant.senderId);
    const withdrawal = {...h.grant, requestId: "same-request",
      expectedRevision: selected.revision,
      expectedReviewHash: selected.reviewHash, decision: {kind: "revoke"}};
    assert.equal((await setEventAssistanceSmsPreferenceHandler(
      request(withdrawal), deps)).outcome, "applied");
    assert.equal((await getEventAssistanceSmsPreferenceHandler(
      request(legacy), deps)).view.preference, "enabled");
    assert.equal((await setEventAssistanceSmsPreferenceHandler(
      request(withdrawal), deps)).outcome, "replayed");
    await assert.rejects(h.preferences.get(h.actor,
      {...h.grant, senderId: "catch-event-sms"}), /sender/i);
  });
