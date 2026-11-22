import {getEmulatorFirestore} from "../../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import test from "node:test";
import {createHmac, randomUUID} from "node:crypto";
import {deleteApp, initializeApp} from "firebase-admin/app";
import {Firestore, Timestamp} from "firebase-admin/firestore";
import type {CallableRequest} from "firebase-functions/v2/https";
import type {SetEventRcsPreferenceCallablePayload as Submission} from
  "../../shared/generated/setEventRcsPreferenceInput";
import {validateEventRcsPreferenceCallableResponse} from
  "../../shared/generated/validators/eventRcsPreferenceOutput";
import {ProgressFirestore} from "./groupProgressTestFixtures";
import {RcsPreferenceStore} from "./rcsPreferenceStore";
import {readRcsMessagePermission} from "./rcsPermissionReader";
import {RCS_CONSENT_VERSION, RCS_CONSENT_HASH, rcsConsentCollections,
  rcsPermissionId, parseRcsPermission, parseRcsConsentReceipt,
  rcsPermissionHasReceipt, rcsPermissionClearsStop} from "./rcsConsent";
import {rcsTestConfig, rcsTestNow as at} from "./rcsTestFixtures";
import {rcsPhoneHash} from "./rcsProtocol";
import {RcsCallbackStore} from "./rcsCallbackStore";
import {VerifiedRcsCallback} from "./rcsWebhookProtocol";
import {RCS_SUBSCRIPTIONS, rcsSubscriptionId} from "./rcsSubscriptions";
import {getEventRcsPreferenceHandler, setEventRcsPreferenceHandler} from
  "./rcsPreferenceHandlers";

async function harness(real?: Firestore) {
  const fake = new ProgressFirestore();
  const db = real ?? fake as unknown as Firestore;
  const clock = {now: at};
  const write = async (path: string, value: object) => real ?
    db.doc(path).set(value) :
    fake.write(path, value as Record<string, unknown>);
  const read = async (path: string) => real ?
    (await db.doc(path).get()).data() : fake.read(path);
  const config = rcsTestConfig();
  const context = {mode: "live" as const, organizerId: "organizer-1",
    eventId: "event-1"};
  const actor = {uid: "guest-1", phone: "+919999999999"};
  const scope = {eventId: context.eventId, attendeeId: "attendee-1",
    senderId: config.senderId};
  const eventPath = "events/" + context.eventId;
  const attendeePath = "eventAttendees/" + scope.attendeeId;
  const senderPath = rcsConsentCollections.senders + "/" + config.senderId;
  const permissionPath = rcsConsentCollections.permissions + "/" +
    rcsPermissionId(context, scope.attendeeId, config.senderId);
  const subscriptionPath = RCS_SUBSCRIPTIONS + "/" +
    rcsSubscriptionId(config.agentId, rcsPhoneHash(actor.phone)!);
  await write(eventPath, {organizerId: context.organizerId, status: "active",
    name: "Friday social", endTime: {seconds: (at + 3_600_000) / 1000,
      nanoseconds: 0}});
  await write(attendeePath, {organizerId: context.organizerId,
    eventId: context.eventId, linkedUid: actor.uid, phoneE164: actor.phone,
    status: "registered", createdAt: {seconds: at / 1000, nanoseconds: 1}});
  await write(senderPath, config);
  const store = new RcsPreferenceStore(db, () => clock.now);
  const grant = async (requestId = "grant-1"): Promise<Submission> => {
    const {view} = await store.get(actor, scope);
    return {...scope, requestId, expectedRevision: view.revision,
      decision: {kind: "grant", copyVersion: RCS_CONSENT_VERSION,
        reviewHash: view.reviewHash}};
  };
  const revoke = (expectedRevision: number | null = 1): Submission =>
    ({...scope, requestId: "revoke-1", expectedRevision,
      decision: {kind: "revoke"}});
  const permission = async () => parseRcsPermission(await read(permissionPath));
  const allowed = (sender = config) => db.runTransaction((tx) =>
    readRcsMessagePermission(db, tx, {...scope, context}, sender, clock.now));
  const callback = async (eventType = "UNSUBSCRIBE", id = "stop-1") => {
    const payload = Buffer.from(JSON.stringify({agentId: config.agentId,
      senderPhoneNumber: actor.phone, eventType, eventId: id}));
    const token = "fixture-only-rcs-token-12345678901234567890";
    const parsed = VerifiedRcsCallback.receive({
      rawBody: Buffer.from(JSON.stringify({message: {
        data: payload.toString("base64"),
      }})), signature: createHmac("sha512", token).update(payload)
        .digest("base64"), clientToken: token,
      expectedAgentId: config.agentId, receivedAt: clock.now});
    assert.equal(parsed.kind, "verified");
    if (parsed.kind !== "verified") throw new Error("Invalid fixture");
    await new RcsCallbackStore(db, () => clock.now).enqueue(parsed.callback);
  };
  return {fake, db, clock, config, actor, scope, context, store, write, read,
    eventPath, attendeePath, senderPath, permissionPath, subscriptionPath,
    grant, revoke, permission, allowed, callback};
}

test("reviewed RCS consent records an exact independent grant", async () => {
  const h = await harness();
  const roster = await h.read(h.attendeePath);
  assert.equal((await h.allowed()).kind, "blocked");
  const input = await h.grant();
  const result = await h.store.set(h.actor, input);
  assert.equal(validateEventRcsPreferenceCallableResponse(result), true);
  assert.equal(result.outcome, "applied");
  assert.equal(result.view.preference, "enabled");
  assert.equal(result.view.expiresAt, at + 3_600_000 + 86_400_000);
  assert.equal(result.view.sender?.displayName, h.config.displayName);
  const permission = await h.permission();
  const receipt = parseRcsConsentReceipt(await h.read(
    rcsConsentCollections.receipts + "/" + permission.currentReceiptId));
  assert.equal(receipt.copyHash, RCS_CONSENT_HASH);
  assert.equal(rcsPermissionHasReceipt(permission, receipt), true);
  assert.equal((await h.allowed()).kind, "allowed");
  assert.deepEqual(await h.read(h.attendeePath), roster);
  for (const hidden of [h.actor.phone, h.config.agentId,
    h.config.credentialVersion, "requestId", "decision"]) {
    assert.equal(JSON.stringify(result).includes(hidden), false, hidden);
  }
  assert.ok(h.fake.entries().every(([path]) =>
    ["events", "eventAttendees", ...Object.values(rcsConsentCollections)]
      .some((collection) => path.startsWith(collection + "/"))));
});

test("old grants and changed request meaning cannot reverse withdrawal",
  async () => {
    const h = await harness();
    const input = await h.grant();
    await h.store.set(h.actor, input);
    assert.equal((await h.store.set(h.actor, h.revoke())).view.preference,
      "disabled");
    const replay = await h.store.set(h.actor, input);
    assert.equal(replay.outcome, "replayed");
    assert.equal(replay.view.preference, "disabled");
    assert.equal(replay.view.revision, 2);
    assert.equal((await h.allowed()).kind, "blocked");
    await assert.rejects(h.store.set(h.actor,
      {...h.revoke(), requestId: input.requestId}), /new RCS request/);
    assert.equal(h.fake.entries().filter(([path]) =>
      path.startsWith(rcsConsentCollections.receipts + "/")).length, 2);
  });

test("canonical RCS proof rejects foreign or malformed authority", async () => {
  const h = await harness();
  await h.store.set(h.actor, await h.grant());
  const permission = await h.permission();
  const receipt = parseRcsConsentReceipt(await h.read(
    rcsConsentCollections.receipts + "/" + permission.currentReceiptId));
  assert.equal(rcsPermissionHasReceipt(permission,
    {...receipt, copyHash: "0".repeat(64)} as typeof receipt), false);
  assert.throws(() => parseRcsConsentReceipt({...receipt, copyHash: null}));
  for (const patch of [{evidence: null}, {routeId: "catchEventSms"},
    {phoneE164: h.actor.phone + "\n"},
    {context: {...permission.context, mode: "rehearsal"}}]) {
    assert.throws(() => parseRcsPermission({...permission, ...patch}));
  }
  h.clock.now++;
  await h.callback("SUBSCRIBE", "start");
  const facts = await h.allowed();
  assert.equal(facts.kind, "allowed");
  if (facts.kind !== "allowed" || !facts.subscription) {
    throw new Error("Expected subscription facts");
  }
  assert.equal(rcsPermissionClearsStop(permission, {...facts.subscription,
    agentId: "foreign-agent"}), false);
});

test("an initial opt-out fences a concurrently reviewed grant", async () => {
  const h = await harness();
  const input = await h.grant();
  await h.store.set(h.actor, h.revoke(null));
  assert.equal((await h.permission()).evidence, null);
  assert.equal((await h.store.set(h.actor, input)).outcome, "conflict");
  assert.equal((await h.permission()).status, "revoked");
});

test("grant requires the linked UID, signed phone and admitted status",
  async () => {
    const h = await harness();
    const input = await h.grant();
    await assert.rejects(h.store.get({...h.actor, uid: "host"}, h.scope),
      /unavailable/);
    for (const phone of [null, "+918888888888", h.actor.phone + "\n"]) {
      await assert.rejects(h.store.set({...h.actor, phone}, input), /Review/);
    }
    for (const status of ["invited", "waitlisted", "cancelled"]) {
      await h.write(h.attendeePath,
        {...await h.read(h.attendeePath), status});
      await assert.rejects(h.store.set(h.actor, input), /Review/);
    }
    assert.equal(await h.read(h.permissionPath), undefined);
  });

test("a reviewed event or sender cannot be silently replaced", async () => {
  for (const change of ["agent", "name", "eventTitle", "end", "roster",
    "source", "phone", "prefix", "approval", "pause"]) {
    const h = await harness();
    const input = await h.grant();
    if (["agent", "name", "prefix", "approval", "pause"].includes(change)) {
      const config = {...h.config};
      if (change === "agent") config.agentId = "other-agent";
      if (change === "name") config.displayName = "Other sender";
      if (change === "prefix") config.recipientPrefixes = ["+1"];
      if (change === "approval") config.activation.validUntil = at;
      if (change === "pause") config.status = "paused";
      await h.write(h.senderPath, config);
    }
    if (change === "eventTitle") {
      await h.write(h.eventPath,
        {...await h.read(h.eventPath), name: "Different event"});
    }
    if (change === "end") {
      await h.write(h.eventPath,
        {...await h.read(h.eventPath), endTime: {
          seconds: (at + 7_200_000) / 1000, nanoseconds: 0,
        }});
    }
    if (change === "roster") {
      await h.write(h.attendeePath,
        {...await h.read(h.attendeePath), createdAt: {
          seconds: at / 1000, nanoseconds: 2,
        }});
    }
    if (change === "source") h.fake.generation = Timestamp.fromMillis(2);
    if (change === "phone") {
      h.actor.phone = "+919999999998";
      await h.write(h.attendeePath,
        {...await h.read(h.attendeePath), phoneE164: h.actor.phone});
    }
    await assert.rejects(h.store.set(h.actor, input), /Review/, change);
    assert.equal(await h.read(h.permissionPath), undefined);
  }
});

test("credential rotation preserves reviewed consent", async () => {
  const h = await harness();
  const input = await h.grant();
  const config = {...h.config, revision: 2,
    credentialVersion: "projects/fixture/secrets/rcs/versions/2"};
  await h.write(h.senderPath, config);
  assert.equal((await h.store.set(h.actor, input)).view.preference, "enabled");
  assert.equal((await h.allowed(config)).kind, "allowed");
  assert.equal((await h.allowed({...config, displayName: "Updated name"})).kind,
    "allowed");
  assert.equal((await h.allowed({...config, agentId: "different-agent"})).kind,
    "blocked");
});

test("STOP fences existing and in-flight consent until a fresh review",
  async () => {
    const h = await harness();
    const original = await h.grant();
    await h.store.set(h.actor, original);
    const stale = await h.grant("stale-grant");
    h.clock.now++;
    await h.callback();
    h.clock.now++;
    assert.equal((await h.store.get(h.actor, h.scope)).view.preference,
      "disabled");
    assert.deepEqual(await h.allowed(),
      {kind: "blocked", reason: "suppressed"});
    await assert.rejects(h.store.set(h.actor, stale), /Review/);
    const fresh = await h.grant("fresh-grant");
    await h.store.set(h.actor, fresh);
    assert.equal((await h.allowed()).kind, "allowed");
    const beforeStart = (await h.store.get(h.actor, h.scope)).view.reviewHash;
    h.clock.now++;
    await h.callback("SUBSCRIBE", "start-1");
    assert.equal((await h.allowed()).kind, "allowed");
    assert.equal((await h.store.get(h.actor, h.scope)).view.reviewHash,
      beforeStart);
    h.clock.now++;
    await h.callback("UNSUBSCRIBE", "stop-2");
    const replay = await h.store.set(h.actor, fresh);
    assert.equal(replay.outcome, "replayed");
    assert.equal(replay.view.preference, "disabled");
    assert.equal((await h.allowed()).kind, "blocked");
  });

test("a stopped private RCS number permits a fresh verified-number review",
  async () => {
    const h = await harness();
    await h.write(h.attendeePath, {...await h.read(h.attendeePath),
      phoneE164: null});
    await h.store.set(h.actor, await h.grant());
    const changed = {...h.actor, phone: "+918888887777"};
    assert.equal((await h.store.get(changed, h.scope)).view.canEnable, false);
    h.clock.now++;
    await h.callback();
    h.clock.now++;
    const {view} = await h.store.get(changed, h.scope);
    assert.equal(view.preference, "notSet");
    assert.equal(view.phoneLastFour, "7777");
    assert.equal(view.canEnable, true);
    const result = await h.store.set(changed, {...h.scope,
      requestId: "new-private-number", expectedRevision: view.revision,
      decision: {kind: "grant", copyVersion: RCS_CONSENT_VERSION,
        reviewHash: view.reviewHash}});
    assert.equal(result.view.preference, "enabled");
    assert.equal((await h.permission()).phoneE164, changed.phone);
    assert.equal((await h.read(h.attendeePath))!.phoneE164, null);
  });

test("a replacement RCS sender does not pin the previous private number",
  async () => {
    const h = await harness();
    await h.write(h.attendeePath, {...await h.read(h.attendeePath),
      phoneE164: null});
    await h.store.set(h.actor, await h.grant());
    await h.write(h.senderPath, {...h.config, agentId: "new-agent"});
    const {view} = await h.store.get({...h.actor, phone: "+918888887777"},
      h.scope);
    assert.equal(view.preference, "notSet");
    assert.equal(view.phoneLastFour, "7777");
    assert.equal(view.canEnable, true);
  });

test("same-clock or broken subscription proof cannot enable consent",
  async () => {
    const h = await harness();
    await h.callback();
    const view = (await h.store.get(h.actor, h.scope)).view;
    assert.equal(view.availability, "subscriptionUnavailable");
    await assert.rejects(h.store.set(h.actor, await h.grant()), /Review/);
    h.clock.now++;
    await h.store.set(h.actor, await h.grant());
    h.fake.remove(h.subscriptionPath);
    assert.equal((await h.allowed()).kind, "blocked");
    assert.equal((await h.store.get(h.actor, h.scope)).view.canEnable, false);
    // Withdrawal does not require reconstructing the damaged STOP proof.
    assert.equal((await h.store.set(h.actor, h.revoke())).outcome, "applied");
    assert.equal((await h.permission()).status, "revoked");
  });

test("withdrawal retains original phone, sender and generation evidence",
  async () => {
    for (const change of ["phone", "sender", "roster", "source", "closed",
      "expired", "receipt"]) {
      const h = await harness();
      await h.store.set(h.actor, await h.grant());
      const before = await h.permission();
      if (change === "phone") {
        await h.write(h.attendeePath,
          {...await h.read(h.attendeePath), phoneE164: "+919999999998"});
      }
      if (change === "sender") await h.write(h.senderPath, {broken: true});
      if (change === "roster") {
        await h.write(h.attendeePath,
          {...await h.read(h.attendeePath), createdAt: {
            seconds: at / 1000, nanoseconds: 2,
          }});
      }
      if (change === "source") h.fake.generation = Timestamp.fromMillis(2);
      if (change === "closed") {
        await h.write(h.eventPath,
          {...await h.read(h.eventPath), status: "cancelled"});
      }
      if (change === "expired") h.clock.now += 2 * 86_400_000;
      if (change === "receipt") {
        await h.write(rcsConsentCollections.receipts +
        "/" + before.currentReceiptId, {broken: true});
      }
      await h.store.set({...h.actor, phone: null}, h.revoke());
      const after = await h.permission();
      assert.deepEqual(after, {...before, status: "revoked", revision: 2,
        currentReceiptId: after.currentReceiptId, updatedAt: h.clock.now},
      change);
    }
  });

test("permission readers reject stale identities, lifetime and altered proof",
  async () => {
    for (const change of ["uid", "phone", "roster", "source", "expiry",
      "eventEnd", "permission", "receipt"]) {
      const h = await harness();
      await h.store.set(h.actor, await h.grant());
      const before = await h.permission();
      if (change === "uid") {
        await h.write(h.attendeePath,
          {...await h.read(h.attendeePath), linkedUid: "another-person"});
      }
      if (change === "phone") {
        await h.write(h.attendeePath,
          {...await h.read(h.attendeePath), phoneE164: "+919999999998"});
      }
      if (change === "roster") {
        await h.write(h.attendeePath,
          {...await h.read(h.attendeePath), createdAt: {
            seconds: at / 1000, nanoseconds: 2,
          }});
      }
      if (change === "source") h.fake.generation = Timestamp.fromMillis(2);
      if (change === "expiry") h.clock.now = before.expiresAt;
      if (change === "eventEnd") {
        await h.write(h.eventPath,
          {...await h.read(h.eventPath), endTime: {
            seconds: (at - 86_400_000) / 1000, nanoseconds: 0,
          }});
      }
      if (change === "permission") {
        await h.write(h.permissionPath,
          {...before, expiresAt: before.expiresAt + 1000});
      }
      if (change === "receipt") {
        h.fake.remove(rcsConsentCollections.receipts +
        "/" + before.currentReceiptId);
      }
      assert.equal((await h.allowed()).kind, "blocked", change);
    }
  });

test("failed or backwards-clock decisions cannot mutate consent", async () => {
  const h = await harness();
  const input = await h.grant();
  h.fake.failNextCommit = true;
  await assert.rejects(h.store.set(h.actor, input));
  assert.equal(await h.read(h.permissionPath), undefined);
  assert.equal(h.fake.entries().filter(([path]) =>
    path.startsWith(rcsConsentCollections.receipts + "/")).length, 0);
  await h.store.set(h.actor, input);
  const before = h.fake.entries();
  h.clock.now--;
  await assert.rejects(h.store.set(h.actor, h.revoke()), /clock is behind/);
  assert.deepEqual(h.fake.entries(), before);
});

test("RCS callables validate before private reads", async () => {
  const h = await harness();
  const calls: string[] = [];
  const deps = {firestore: () => h.db, now: () => h.clock.now,
    checkRateLimit: async (_db: unknown, uid: string, action: string) => {
      calls.push(uid + ":" + action);
    }};
  const request = (data: unknown) => ({data,
    auth: {uid: h.actor.uid, token: {phone_number: h.actor.phone}},
  } as unknown as CallableRequest<unknown>);
  const input = await h.grant();
  await assert.rejects(getEventRcsPreferenceHandler({data: h.scope} as
    CallableRequest<unknown>, deps), /signed in/);
  for (const extra of [{phoneE164: h.actor.phone}, {agentId: h.config.agentId},
    {acceptedAt: at}, {sourceGeneration: "a".repeat(64)},
    {mode: "rehearsal"}]) {
    await assert.rejects(setEventRcsPreferenceHandler(
      request({...input, ...extra}), deps), /additional properties/);
  }
  assert.deepEqual(calls, []);
  const initial = await getEventRcsPreferenceHandler(request(h.scope), deps);
  assert.equal(validateEventRcsPreferenceCallableResponse(initial), true);
  const result = await setEventRcsPreferenceHandler(request(input), deps);
  assert.equal(result.view.preference, "enabled");
  assert.equal(validateEventRcsPreferenceCallableResponse(result), true);
  assert.deepEqual(calls, [h.actor.uid + ":getEventRcsPreference",
    h.actor.uid + ":setEventRcsPreference"]);
});

test("Firestore consent retries and STOP races retain current authority", {
  skip: !process.env.FIRESTORE_EMULATOR_HOST, timeout: 60_000,
}, async () => {
  assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? "",
    /^(127\.0\.0\.1|localhost|\[::1\]):\d+$/);
  const key = randomUUID();
  const app = initializeApp({projectId: "demo-rcs-consent-" + key.slice(0, 8)},
    "rcs-consent-" + key);
  const db = getEmulatorFirestore(app);
  try {
    const h = await harness(db);
    const input = await h.grant();
    const results = await Promise.all(Array.from({length: 4}, () =>
      h.store.set(h.actor, input)));
    assert.equal(results.filter((r) => r.outcome === "applied").length, 1);
    assert.equal(results.filter((r) => r.outcome === "replayed").length, 3);
    const pending = await h.grant("competing-enable");
    h.clock.now++;
    // The enable either precedes STOP or loses its reviewed snapshot. In
    // either serialization, STOP is present and the final reader blocks.
    await Promise.all([h.callback(), h.store.set(h.actor, pending)
      .catch((e) => {
        assert.equal(e.code, "failed-precondition");
      })]);
    assert.equal((await h.allowed()).kind, "blocked");
  } finally {
    for (const name of ["events", "eventAttendees", ...Object.values(
      rcsConsentCollections), RCS_SUBSCRIPTIONS, "eventAssistanceRcsCallbacks",
    "eventAssistanceRcsCallbackIdentities"]) {
      const docs = await db.collection(name).get();
      await Promise.all(docs.docs.map((doc) => doc.ref.delete()));
    }
    await deleteApp(app);
  }
});
