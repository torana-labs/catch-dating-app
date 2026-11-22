import {getEmulatorFirestore} from "../../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import test from "node:test";
import {deleteApp, initializeApp} from "firebase-admin/app";
import {Firestore} from "firebase-admin/firestore";
import type {CallableRequest} from "firebase-functions/v2/https";
import {rcsHarness} from "./rcsDispatchTestHarness";
import {RcsPreferenceStore} from "./rcsPreferenceStore";
import {RcsPreferenceOptionsStore} from "./rcsPreferenceOptionsStore";
import {listEventRcsPreferencesHandler} from "./rcsPreferenceOptionsHandlers";
import {EventAssistanceRuntimeConfigStore} from "./runtimeConfigStore";
import {rcsConsentCollections} from "./rcsConsent";
import {validateListEventRcsPreferencesCallablePayload} from
  "../../shared/generated/validators/listEventRcsPreferencesInput";
import {validateListEventRcsPreferencesCallableResponse} from
  "../../shared/generated/validators/listEventRcsPreferencesOutput";

async function fixture(db?: Firestore) {
  const h = await rcsHarness(db, randomUUID(), ["catchEventRcs"]);
  const scope = {eventId: h.context.eventId, attendeeId: h.scope.attendeeId,
    cursor: null};
  const store = new RcsPreferenceOptionsStore(h.db, () => h.clock.now);
  const runtime = new EventAssistanceRuntimeConfigStore(h.db,
    () => h.clock.now);
  const configure = async (senderId = h.rcsConfig.senderId) => {
    const {view} = await runtime.get("host-1", {context: h.context});
    return runtime.set("host-1", {context: h.context, requestId: randomUUID(),
      expectedRevision: view.revision, expectedSourceHash: view.sourceHash,
      command: {kind: "configure", configuration: {
        expiresAt: h.clock.now + 3_600_000, maxEvaluations: 100,
        options: {routes: [{routeId: "catchEventRcs", senderId}],
          responseDeadline: null, deliveryPolicy: {maxAttempts: 3,
            maxAttemptsPerRoute: 1, minimumRetrySeconds: 1}}}}});
  };
  return {...h, scope, store, runtime, configure,
    list: (cursor: string | null = null) => store.list(h.actor.uid,
      {...scope, cursor})};
}

test("discovery separates the configured sender from saved preferences",
  async () => {
    const h = await fixture();
    const previous = await h.list();
    assert.equal(previous.configuredSenderId, null);
    assert.deepEqual(previous.previousSenderIds, [h.rcsConfig.senderId]);
    await h.configure();
    const before = h.fake.entries();
    const result = await h.list();
    assert.equal(validateListEventRcsPreferencesCallableResponse(result), true);
    assert.equal(result.configuredSenderId, h.rcsConfig.senderId);
    assert.deepEqual(result.previousSenderIds, []);
    assert.equal(result.nextCursor, null);
    assert.deepEqual(h.fake.entries(), before);
    assert.equal(h.requests.length, 0);
    for (const secret of [h.actor.phone, h.actor.uid, h.rcsConfig.agentId,
      h.rcsConfig.credentialVersion, "consent", "budget", "accessToken"]) {
      assert.equal(JSON.stringify(result).includes(secret), false, secret);
    }
  });

test("pausing runtime or sender does not remove the configured preference",
  async () => {
    const h = await fixture();
    await h.configure();
    const {view} = await h.runtime.get("host-1", {context: h.context});
    await h.runtime.set("host-1", {context: h.context, requestId: randomUUID(),
      expectedRevision: view.revision, expectedSourceHash: view.sourceHash,
      command: {kind: "pause"}});
    await h.write(h.rcsSenderPath, {...h.rcsConfig, status: "paused"});
    assert.equal((await h.list()).configuredSenderId, h.rcsConfig.senderId);
    const preference = await new RcsPreferenceStore(h.db, () => h.clock.now)
      .get(h.actor, {...h.scope, senderId: h.rcsConfig.senderId});
    assert.equal(preference.view.canEnable, false);
    assert.equal(preference.view.preference, "enabled");
  });

test("changing senders preserves the earlier preference for separate review",
  async () => {
    const h = await fixture();
    await h.write(rcsConsentCollections.senders + "/replacement",
      {...h.rcsConfig, senderId: "replacement"});
    await h.configure("replacement");
    h.fake.remove(rcsConsentCollections.senders + "/replacement");
    const result = await h.list();
    assert.equal(result.configuredSenderId, "replacement");
    assert.deepEqual(result.previousSenderIds, [h.rcsConfig.senderId]);
    const unavailable = await new RcsPreferenceStore(h.db, () => h.clock.now)
      .get(h.actor, {...h.scope, senderId: result.configuredSenderId!});
    assert.equal(unavailable.view.canEnable, false);
    assert.equal(unavailable.view.availability, "senderUnavailable");
  });

test("changed source withholds the old default without inventing readiness",
  async () => {
    const h = await fixture();
    await h.configure();
    const eventPath = "events/" + h.context.eventId;
    const event = await h.read(eventPath);
    await h.write(eventPath, {...event, endTime: {
      _seconds: (h.clock.now + 7_200_000) / 1000, _nanoseconds: 0}});
    assert.equal((await h.list()).configuredSenderId, null);
    assert.deepEqual((await h.list()).previousSenderIds,
      [h.rcsConfig.senderId]);
    const permission = await h.permission();
    await h.write(h.rcsPermissionPath, {...permission,
      sourceGeneration: "a".repeat(64),
      recipientBinding: {...permission.recipientBinding!,
        sourceGeneration: "a".repeat(64)}});
    assert.deepEqual((await h.list()).previousSenderIds, []);
  });

test("discovery checks participant identity before private preference reads",
  async () => {
    const h = await fixture();
    const paths: string[] = [];
    h.fake.beforeRead = (path) => paths.push(path);
    await assert.rejects(h.store.list("foreign-uid", h.scope),
      /preferences unavailable/);
    assert.ok(paths.every((p) => p.startsWith("events/") ||
      p.startsWith("eventAttendees/")));
    await assert.rejects(h.store.list(h.actor.uid, {...h.scope,
      eventId: "other-event"}), /preferences unavailable/);
  });

test("a relinked participant cannot discover the earlier participant's senders",
  async () => {
    const h = await fixture();
    const attendee = await h.read(h.attendeePath);
    await h.write(h.attendeePath, {...attendee, linkedUid: "replacement-uid"});
    const replacement = await h.store.list("replacement-uid", h.scope);
    assert.deepEqual(replacement.previousSenderIds, []);
    assert.equal(replacement.configuredSenderId, null);
    await assert.rejects(h.list(), /preferences unavailable/);
  });

test("corrupt or future-dated preference evidence cannot become an empty list",
  async () => {
    const h = await fixture();
    const permission = await h.permission();
    for (const patch of [{updatedAt: h.clock.now + 1},
      {permissionId: "rcs-permission:" + "f".repeat(64)}]) {
      await h.write(h.rcsPermissionPath, {...permission, ...patch});
      await assert.rejects(h.list());
    }
    await h.write(h.rcsPermissionPath, permission);
    let ticks = 0;
    await assert.rejects(new RcsPreferenceOptionsStore(h.db,
      () => h.clock.now - ticks++).list(h.actor.uid, h.scope), /clock/);
  });

async function pagination(db?: Firestore) {
  const h = await fixture(db);
  await h.configure();
  const preferences = new RcsPreferenceStore(h.db, () => h.clock.now);
  const expected = new Set<string>();
  for (let i = 0; i < 53; i++) {
    const senderId = "previous-" + i;
    expected.add(senderId);
    await h.write(rcsConsentCollections.senders + "/" + senderId,
      {...h.rcsConfig, senderId});
    await preferences.set(h.actor, {eventId: h.scope.eventId,
      attendeeId: h.scope.attendeeId, senderId,
      requestId: "initial-withdrawal", expectedRevision: null,
      decision: {kind: "revoke"}});
  }
  const first = await h.list();
  assert.ok(first.previousSenderIds.length <= 50);
  assert.ok(first.nextCursor);
  // Cursors remain valid when the original row is removed between pages.
  if (!db) {
    h.fake.remove(rcsConsentCollections.permissions + "/" +
    first.nextCursor);
  }
  const second = await h.list(first.nextCursor);
  assert.equal(second.nextCursor, null);
  const all = [...first.previousSenderIds, ...second.previousSenderIds];
  assert.equal(all.length, expected.size);
  assert.deepEqual(new Set(all), expected);
  assert.equal(h.requests.length, 0);
}

test("permission discovery advances bounded pages past deleted cursors",
  async () => pagination());

test("discovery contracts reject caller-owned identity or consent",
  () => {
    const scope = {eventId: "event-1", attendeeId: "guest-1", cursor: null};
    assert.equal(validateListEventRcsPreferencesCallablePayload(scope), true);
    for (const extra of [{uid: "foreign"}, {senderId: "chosen"},
      {mode: "rehearsal"}, {limit: 10000}, {cursor: "../foreign"}]) {
      assert.equal(validateListEventRcsPreferencesCallablePayload(
        {...scope, ...extra}), false);
    }
    assert.equal(validateListEventRcsPreferencesCallableResponse({
      eventId: scope.eventId, attendeeId: scope.attendeeId, serverTime: 1,
      configuredSenderId: null, previousSenderIds: ["same", "same"],
      nextCursor: null}), false);
  });

test("callable requires auth and rate limit before exposing saved senders",
  async () => {
    const h = await fixture();
    let opened = 0;
    const deps = {firestore: () => {
      opened++; return h.db;
    },
    checkRateLimit: async () => {
      throw new Error("rate-limited");
    },
    now: () => h.clock.now};
    await assert.rejects(listEventRcsPreferencesHandler({data: h.scope} as
      CallableRequest<unknown>, deps), /authenticat|sign/i);
    assert.equal(opened, 0);
    await assert.rejects(listEventRcsPreferencesHandler({data: h.scope,
      auth: {uid: h.actor.uid, token: {}}} as CallableRequest<unknown>, deps),
    /rate-limited/);
  });

test("Firestore returns only the participant's bounded preference pages", {
  skip: !process.env.FIRESTORE_EMULATOR_HOST, timeout: 120_000,
}, async () => {
  assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? "",
    /^(127\.0\.0\.1|localhost|\[::1\]):\d+$/);
  const id = randomUUID();
  const projectId = "demo-rcs-prefs-" + id.slice(0, 8);
  const app = initializeApp({projectId}, id);
  try {
    await pagination(getEmulatorFirestore(app));
  } finally {
    await deleteApp(app);
  }
});
