import {getEmulatorFirestore} from "../../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import test from "node:test";
import {randomUUID} from "node:crypto";
import {deleteApp, initializeApp} from "firebase-admin/app";
import {Firestore, Timestamp} from "firebase-admin/firestore";
import type {CallableRequest} from "firebase-functions/v2/https";
import {ProgressFirestore} from "./groupProgressTestFixtures";
import type {SetEventWhatsappPreferenceCallablePayload as Submission} from
  "../../shared/generated/setEventWhatsappPreferenceCallablePayload";
import {
  WHATSAPP_CONSENT_HASH, WHATSAPP_CONSENT_RECEIPTS,
  WHATSAPP_CONSENT_TEXT, WHATSAPP_CONSENT_VERSION, parseWhatsappConsentReceipt,
  whatsappPermissionHasReceipt,
} from "./whatsappConsent";
import {parseWhatsappPermission, WHATSAPP_PERMISSIONS,
  whatsappPermissionId} from "./whatsappPermissionRecords";
import {WHATSAPP_POLICIES} from "./whatsappTemplate";
import {WhatsappPreferenceStore} from "./whatsappPreferenceStore";
import {
  getEventWhatsappPreferenceHandler,
  setEventWhatsappPreferenceHandler,
} from "./whatsappPreferenceHandlers";

const start = Date.parse("2026-09-07T12:00:00Z");

test("a reviewed WhatsApp grant cannot move to a changed verified number",
  async () => {
    const h = await harness();
    const before = (await h.store.get(h.actor, h.scope)).view;
    const actor = {...h.actor, phone: "+918888889999"};
    await h.write(h.attendeePath, {...await h.read(h.attendeePath),
      phoneE164: actor.phone});
    const after = (await h.store.get(actor, h.scope)).view;
    assert.equal(after.revision, before.revision);
    assert.equal(after.phoneLastFour, before.phoneLastFour);
    assert.equal(after.sender!.bindingHash, before.sender!.bindingHash);
    assert.equal(after.stopRecordHash, before.stopRecordHash);
    assert.notEqual(after.reviewHash, before.reviewHash);
    await assert.rejects(h.store.set(actor, h.grant), /cannot be enabled/);
    assert.equal(await h.read(h.permissionPath), undefined);
  });

async function harness(realDb?: Firestore, key = "one") {
  const fake = new ProgressFirestore();
  const db = realDb ?? fake as unknown as Firestore;
  const clock = {now: start};
  const paths = new Set<string>();
  const write = async (path: string, value: object) => {
    paths.add(path);
    if (realDb) await realDb.doc(path).set(value);
    else fake.write(path, value as Record<string, unknown>);
  };
  const read = async (path: string) => realDb ?
    (await realDb.doc(path).get()).data() : fake.read(path);
  const context = {mode: "live" as const, organizerId: "organizer-" + key,
    eventId: "event-" + key};
  const actor = {uid: "guest-" + key, phone: "+919999999999"};
  const scope = {eventId: context.eventId, attendeeId: "attendee-" + key,
    senderId: "sender-" + key};
  const eventPath = "events/" + context.eventId;
  const attendeePath = "eventAttendees/" + scope.attendeeId;
  const senderPath = "organizerSenderConnections/" + scope.senderId;
  const policyPath = WHATSAPP_POLICIES + "/" + scope.senderId;
  await write(eventPath, {organizerId: context.organizerId, status: "active",
    name: "Test event", endTime: {seconds: (start + 3_600_000) / 1000,
      nanoseconds: 0}});
  await write(attendeePath, {organizerId: context.organizerId,
    eventId: context.eventId, linkedUid: actor.uid, phoneE164: actor.phone,
    status: "registered", createdAt: {seconds: start / 1000, nanoseconds: 5}});
  await write(senderPath, {organizerId: context.organizerId,
    channel: "whatsapp",
    provider: "metaCloudApi", status: "active", wabaId: "700123",
    phoneNumberId: "800123", businessId: "900123",
    displayPhoneNumber: "+918888888888", verifiedName: "Fixture organizer",
    secretVersionResource: "projects/demo/secrets/FIXTURE_WA/versions/1",
    qualityRating: "GREEN", messagingLimitTier: null,
    templateSyncStatus: "current", webhookStatus: "subscribed",
    testStatus: "delivered", testProviderMessageId: "wamid.fixture-test",
    testRecipientHash: null, connectedByUid: "manager-1", revision: 1,
    createdAt: {_seconds: start / 1000, _nanoseconds: 0},
    updatedAt: {_seconds: start / 1000, _nanoseconds: 0},
    disconnectedAt: null});
  await write(policyPath, {schemaVersion: 1, senderId: scope.senderId,
    organizerId: context.organizerId, revision: 1, status: "ready",
    providerAccountId: "700123", providerPhoneNumberId: "800123",
    maxTemplateAgeSeconds: 900, activation: {approvalId: "fixture-review",
      approvedAt: start - 1000, validUntil: start + 86_400_000},
    quote: {revision: 1, currency: "INR", recipientPrefixes: ["+91", "+44"],
      maxMicrosPerMessage: 500_000, validUntil: start + 1_800_000},
    templates: [{templateDocumentId: "fixture-template",
      purpose: "joiningUpdate",
      templateHash: "a".repeat(64), variables: [
        {providerName: "instruction", source: "instruction",
          maxCharacters: 500},
        {providerName: "responseUrl", source: "responseUrl",
          maxCharacters: 160},
      ], quickReplies: []}]});
  const permissionId = whatsappPermissionId(context, scope.attendeeId,
    scope.senderId);
  const permissionPath = WHATSAPP_PERMISSIONS + "/" + permissionId;
  const store = new WhatsappPreferenceStore(db, () => clock.now);
  const initial = (await store.get(actor, scope)).view;
  const grant = {...scope, requestId: "grant-1", expectedRevision:
    null, decision: {kind: "grant", copyVersion: WHATSAPP_CONSENT_VERSION,
    stopRecordHash: null, reviewHash: initial.reviewHash,
    senderHash: initial.sender!.bindingHash}} satisfies Submission;
  const stop: Submission = {...scope, requestId: "stop-1", expectedRevision:
    1, decision: {kind: "revoke"}};
  return {db, fake, store, clock, actor, context, scope, grant, stop,
    permissionPath, senderPath, policyPath, attendeePath, eventPath,
    read, write, paths};
}

test("replacement source records and changed event terms need fresh review",
  async () => {
    for (const change of ["name", "end", "generation"]) {
      const h = await harness();
      if (change === "generation") {
        h.fake.generation = Timestamp.fromMillis(2);
      } else {
        await h.write(h.eventPath, {...await h.read(h.eventPath),
          ...(change === "name" ? {name: "A renamed event"} : {
            endTime: {seconds: (start + 7_200_000) / 1000, nanoseconds: 0}})});
      }
      await assert.rejects(h.store.set(h.actor, h.grant),
        /cannot be enabled/, change);
      assert.equal(await h.read(h.permissionPath), undefined, change);
      const view = (await h.store.get(h.actor, h.scope)).view;
      const result = await h.store.set(h.actor, {...h.grant,
        decision: {...h.grant.decision, reviewHash: view.reviewHash}});
      assert.equal(result.outcome, "applied", change);
    }
  });

test("ordinary time, check-in and credential rotation preserve consent terms",
  async () => {
    const h = await harness();
    h.clock.now += 1000;
    await h.write(h.attendeePath, {...await h.read(h.attendeePath),
      status: "checkedIn"});
    await h.write(h.senderPath, {...await h.read(h.senderPath), revision: 2,
      secretVersionResource: "projects/demo/secrets/FIXTURE_WA/versions/2"});
    assert.equal((await h.store.get(h.actor, h.scope)).view.reviewHash,
      h.grant.decision.reviewHash);
    assert.equal((await h.store.set(h.actor, h.grant)).outcome, "applied");
  });

test("verified opt-in records exact consent without changing the roster",
  async () => {
    const h = await harness();
    const roster = await h.read(h.attendeePath);
    const before = await h.store.get(h.actor, h.scope);
    assert.equal(before.view.preference, "notSet");
    assert.equal(before.view.canEnable, true);
    assert.equal(before.view.consent.text, WHATSAPP_CONSENT_TEXT);
    const result = await h.store.set(h.actor, h.grant);
    assert.equal(result.outcome, "applied");
    assert.equal(result.view.preference, "enabled");
    assert.equal(result.view.phoneLastFour, "9999");
    assert.equal(result.view.expiresAt, start + 3_600_000 + 86_400_000);
    assert.equal(JSON.stringify(result).includes(h.actor.phone), false);
    const permission = parseWhatsappPermission(await h.read(h.permissionPath));
    const receipt = parseWhatsappConsentReceipt(await h.read(
      WHATSAPP_CONSENT_RECEIPTS + "/" + permission.currentReceiptId));
    assert.equal(receipt.copyHash, WHATSAPP_CONSENT_HASH);
    assert.equal(whatsappPermissionHasReceipt(permission, receipt), true);
    assert.deepEqual(await h.read(h.attendeePath), roster);
    assert.equal(h.fake.entries().some(([path]) => path.startsWith("users/")),
      false);
  });

test("replayed grants cannot undo withdrawal or change request meaning",
  async () => {
    const h = await harness();
    await h.store.set(h.actor, h.grant);
    const stopped = await h.store.set(h.actor, h.stop);
    assert.equal(stopped.view.preference, "disabled");
    const replay = await h.store.set(h.actor, h.grant);
    assert.equal(replay.outcome, "replayed");
    assert.equal(replay.view.revision, 2);
    assert.equal(replay.view.preference, "disabled");
    await assert.rejects(h.store.set(h.actor,
      {...h.stop, requestId: "grant-1"}),
    /new preference request/);
    assert.equal(h.fake.entries().filter(([path]) =>
      path.startsWith(WHATSAPP_CONSENT_RECEIPTS + "/")).length, 2);
  });

test("an initial withdrawal creates a tombstone that fences an older grant",
  async () => {
    const h = await harness();
    await h.store.set(h.actor, {...h.stop, expectedRevision: null});
    const stored = parseWhatsappPermission(await h.read(h.permissionPath));
    assert.equal(stored.status, "revoked");
    assert.equal(stored.evidence, null);
    const result = await h.store.set(h.actor, h.grant);
    assert.equal(result.outcome, "conflict");
    assert.equal(result.view.preference, "disabled");
  });

test("withdrawal needs no active sender, event or current phone claim",
  async () => {
    for (const changed of ["sender", "event", "phone", "expired"]) {
      const h = await harness();
      await h.store.set(h.actor, h.grant);
      if (changed === "sender") {
        await h.write(h.senderPath,
          {...(await h.read(h.senderPath)), status: "blocked"});
      }
      if (changed === "event") {
        await h.write(h.eventPath,
          {...(await h.read(h.eventPath)), status: "cancelled"});
      }
      if (changed === "expired") h.clock.now += 2 * 86_400_000;
      const actor = changed === "phone" ? {...h.actor, phone: null} : h.actor;
      const before = await h.store.get(actor, h.scope);
      assert.equal(before.view.canEnable, false, changed);
      const result = await h.store.set(actor, h.stop);
      assert.equal(result.view.preference, "disabled", changed);
    }
  });

test("grant requires linked UID, matching verified phone and admission",
  async () => {
    const h = await harness();
    await assert.rejects(h.store.get({...h.actor, uid: "host"}, h.scope),
      /unavailable/);
    await assert.rejects(h.store.set({...h.actor, phone: "+918888888888"},
      h.grant), /cannot be enabled/);
    await assert.rejects(h.store.set({...h.actor, phone: null}, h.grant),
      /cannot be enabled/);
    for (const status of ["invited", "waitlisted", "cancelled"]) {
      await h.write(h.attendeePath,
        {...(await h.read(h.attendeePath)), status});
      await assert.rejects(h.store.set(h.actor, h.grant), /cannot be enabled/);
    }
    assert.equal(await h.read(h.permissionPath), undefined);
  });

test("recreated rosters and tampered grants cannot inherit consent",
  async () => {
    const h = await harness();
    await h.store.set(h.actor, h.grant);
    const granted = await h.read(h.permissionPath);
    await h.write(h.permissionPath, {...granted,
      expiresAt: Number(granted!.expiresAt) + 1000});
    assert.equal((await h.store.get(h.actor, h.scope)).view.preference,
      "notSet");
    await h.write(h.permissionPath, granted!);
    await h.write(h.attendeePath, {...(await h.read(h.attendeePath)),
      createdAt: {seconds: start / 1000, nanoseconds: 6}});
    assert.equal((await h.store.get(h.actor, h.scope)).view.preference,
      "notSet");
  });

test("failed transactions leave neither permission nor receipt",
  async () => {
    const h = await harness();
    h.fake.failNextCommit = true;
    await assert.rejects(h.store.set(h.actor, h.grant), /interruption/);
    assert.equal(await h.read(h.permissionPath), undefined);
    assert.equal(h.fake.entries().some(([path]) =>
      path.startsWith(WHATSAPP_CONSENT_RECEIPTS + "/")), false);
    assert.equal((await h.store.set(h.actor, h.grant)).outcome, "applied");
  });

test("preference callables authenticate, validate and rate-limit before writes",
  async () => {
    const h = await harness();
    const calls: string[] = [];
    const deps = {firestore: () => h.db, now: () => h.clock.now,
      checkRateLimit: async (_db: unknown, uid: string, action: string) => {
        calls.push(uid + ":" + action);
      }};
    const request = (data: unknown) => ({data,
      auth: {uid: h.actor.uid, token: {phone_number: h.actor.phone}},
    } as unknown as CallableRequest<unknown>);
    await assert.rejects(getEventWhatsappPreferenceHandler(
      {data: h.scope} as
      CallableRequest<unknown>, deps), /signed in/);
    await assert.rejects(setEventWhatsappPreferenceHandler(request({
      ...h.grant, phoneE164: "+917777777777",
    }), deps), /additional properties/);
    for (const reviewHash of [undefined, null, "", "old-review"]) {
      await assert.rejects(setEventWhatsappPreferenceHandler(request({
        ...h.grant, decision: {...h.grant.decision, reviewHash},
      }), deps), {code: "invalid-argument"});
    }
    const result = await setEventWhatsappPreferenceHandler(
      request(h.grant), deps);
    assert.equal(result.view.preference, "enabled");
    await getEventWhatsappPreferenceHandler(request(h.scope), deps);
    assert.deepEqual(calls, [h.actor.uid + ":setEventWhatsappPreference",
      h.actor.uid + ":getEventWhatsappPreference"]);
  });

test("Firestore persists one grant across competing participant requests", {
  skip: !process.env.FIRESTORE_EMULATOR_HOST, timeout: 60_000,
}, async () => {
  assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? "",
    /^(127\.0\.0\.1|localhost|\[::1\]):\d+$/);
  const key = randomUUID();
  const app = initializeApp({projectId: "demo-catch-rules"},
    "whatsapp-consent-" + key);
  try {
    const h = await harness(getEmulatorFirestore(app), key);
    const actor = {...h.actor, phone: "+918888889999"};
    await h.write(h.attendeePath, {...await h.read(h.attendeePath),
      phoneE164: actor.phone});
    await assert.rejects(h.store.set(actor, h.grant), /cannot be enabled/);
    const view = (await h.store.get(actor, h.scope)).view;
    const grant = {...h.grant,
      decision: {...h.grant.decision, reviewHash: view.reviewHash}};
    const results = await Promise.all(Array.from({length: 8}, () =>
      h.store.set(actor, grant)));
    assert.equal(results.filter((r) => r.outcome === "applied").length, 1);
    assert.equal(results.filter((r) => r.outcome === "replayed").length, 7);
    const permission = parseWhatsappPermission(await h.read(h.permissionPath));
    assert.equal(permission.revision, 1);
    assert.equal(permission.phoneE164, actor.phone);
  } finally {
    await deleteApp(app);
  }
});

test("a backwards clock cannot publish stale consent or mutate its revision",
  async () => {
    const h = await harness();
    await h.store.set(h.actor, h.grant);
    const before = await h.read(h.permissionPath);
    h.clock.now -= 1;
    await assert.rejects(h.store.get(h.actor, h.scope), /clock is behind/);
    await assert.rejects(h.store.set(h.actor, h.stop), /clock is behind/);
    assert.deepEqual(await h.read(h.permissionPath), before);
  });

test("credentials can rotate but new provider identity needs fresh consent",
  async () => {
    const h = await harness();
    await h.store.set(h.actor, h.grant);
    const original = await h.read(h.permissionPath);
    await h.write(h.senderPath, {...(await h.read(h.senderPath)), revision: 9,
      secretVersionResource: "projects/demo/secrets/FIXTURE_WA/versions/2"});
    assert.equal((await h.store.get(h.actor, h.scope)).view.preference,
      "enabled");
    await h.write(h.senderPath, {...(await h.read(h.senderPath)),
      phoneNumberId: "800124"});
    await h.write(h.policyPath, {...(await h.read(h.policyPath)),
      providerPhoneNumberId: "800124"});
    const changed = await h.store.get(h.actor, h.scope);
    assert.equal(changed.view.preference, "notSet");
    assert.equal(changed.view.canEnable, true);
    await assert.rejects(h.store.set(h.actor, {...h.grant, requestId: "new",
      expectedRevision: 1}), /cannot be enabled/);
    assert.deepEqual(await h.read(h.permissionPath), original);
    const fresh = await h.store.set(h.actor, {...h.grant, requestId: "fresh",
      expectedRevision: 1, decision: {kind: "grant",
        copyVersion: WHATSAPP_CONSENT_VERSION,
        reviewHash: changed.view.reviewHash,
        stopRecordHash: null,
        senderHash: changed.view.sender!.bindingHash}});
    assert.equal(fresh.view.preference, "enabled");
    assert.equal(fresh.view.revision, 2);
  });

test("display changes fence unseen consent but do not erase earlier permission",
  async () => {
    const h = await harness();
    await h.store.set(h.actor, h.grant);
    const original = await h.read(h.permissionPath);
    await h.write(h.senderPath, {...(await h.read(h.senderPath)),
      verifiedName: "Renamed organizer"});
    const changed = await h.store.get(h.actor, h.scope);
    assert.equal(changed.view.preference, "enabled");
    assert.equal(changed.view.sender!.displayName, "Renamed organizer");
    await assert.rejects(h.store.set(h.actor, {...h.grant,
      requestId: "unseen", expectedRevision: 1}), /cannot be enabled/);
    assert.deepEqual(await h.read(h.permissionPath), original);
  });

test("invalid or missing provisioning cannot obstruct an existing withdrawal",
  async () => {
    for (const changed of ["policy", "connection", "deleted", "foreign"]) {
      const h = await harness();
      await h.store.set(h.actor, h.grant);
      const original = parseWhatsappPermission(
        await h.read(h.permissionPath));
      if (changed === "policy") await h.write(h.policyPath, {invalid: true});
      if (changed === "connection") {
        await h.write(h.senderPath, {invalid: true});
      }
      if (changed === "deleted") {
        h.fake.remove(h.senderPath);
        h.fake.remove(h.policyPath);
      }
      if (changed === "foreign") {
        await h.write(h.senderPath, {...(await h.read(h.senderPath)),
          organizerId: "other-organizer",
          verifiedName: "Private other sender"});
      }
      const before = await h.store.get(h.actor, h.scope);
      assert.equal(before.view.canEnable, false, changed);
      assert.equal(before.view.sender!.displayName,
        original.sender.displayName);
      assert.equal((await h.store.set(h.actor, h.stop)).view.preference,
        "disabled", changed);
    }
  });

test("explicit sender selection never inherits another sender's permission",
  async () => {
    const h = await harness();
    await h.store.set(h.actor, h.grant);
    const scope = {...h.scope, senderId: "second-sender"};
    await h.write("organizerSenderConnections/" + scope.senderId,
      {...(await h.read(h.senderPath)), updatedAt:
        {_seconds: start / 1000 + 1, _nanoseconds: 0}});
    await h.write(WHATSAPP_POLICIES + "/" + scope.senderId,
      {...(await h.read(h.policyPath)), senderId: scope.senderId});
    const second = await h.store.get(h.actor, scope);
    assert.equal(second.view.preference, "notSet");
    assert.equal(second.view.revision, null);
    assert.equal((await h.store.get(h.actor, h.scope)).view.preference,
      "enabled");
    // A second sender can use the same UI request id without colliding.
    const applied = await h.store.set(h.actor, {...h.grant, ...scope,
      decision: {kind: "grant", copyVersion: WHATSAPP_CONSENT_VERSION,
        reviewHash: second.view.reviewHash,
        stopRecordHash: null,
        senderHash: second.view.sender!.bindingHash}});
    assert.equal(applied.outcome, "applied");
  });

test("a changed recipient needs fresh consent; withdrawal keeps old evidence",
  async () => {
    const h = await harness();
    await h.store.set(h.actor, h.grant);
    const original = parseWhatsappPermission(
      await h.read(h.permissionPath));
    const actor = {...h.actor, phone: "+447700900123"};
    await h.write(h.attendeePath, {...(await h.read(h.attendeePath)),
      phoneE164: actor.phone});
    const changed = await h.store.get(actor, h.scope);
    assert.equal(changed.view.preference, "notSet");
    assert.equal(changed.view.canEnable, true);
    const replay = await h.store.set(actor, h.grant);
    assert.equal(replay.outcome, "replayed");
    assert.equal(replay.view.preference, "notSet");
    assert.deepEqual(await h.read(h.permissionPath), original);
    await h.store.set(actor, h.stop);
    const withdrawn = parseWhatsappPermission(await h.read(h.permissionPath));
    assert.equal(withdrawn.status, "revoked");
    assert.equal(withdrawn.phoneE164, original.phoneE164);
    assert.deepEqual(withdrawn.evidence, original.evidence);
    const fresh = await h.store.set(actor, {...h.grant, requestId: "new-phone",
      decision: {...h.grant.decision,
        reviewHash: (await h.store.get(actor, h.scope)).view.reviewHash},
      expectedRevision: 2});
    assert.equal(fresh.view.preference, "enabled");
    assert.equal(parseWhatsappPermission(await h.read(h.permissionPath))
      .phoneE164, actor.phone);
  });

test("organizer marketing consent cannot substitute for event-service consent",
  async () => {
    const h = await harness();
    const path = "organizerCommunicationPreferences/" +
      h.context.organizerId + "_" + h.actor.uid;
    await h.write(path, {whatsappOptIn: true, smsOptIn: true});
    const before = await h.read(path);
    assert.equal((await h.store.get(h.actor, h.scope)).view.preference,
      "notSet");
    await h.store.set(h.actor, h.grant);
    await h.store.set(h.actor, h.stop);
    assert.deepEqual(await h.read(path), before);
  });
