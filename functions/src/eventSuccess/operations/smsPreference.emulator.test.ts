import {getEmulatorFirestore} from "../../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import test from "node:test";
import {randomUUID} from "node:crypto";
import {deleteApp, initializeApp} from "firebase-admin/app";
import {Firestore, Timestamp} from "firebase-admin/firestore";
import type {CallableRequest} from "firebase-functions/v2/https";
import {ProgressFirestore} from "./groupProgressTestFixtures";
import type {SetEventAssistanceSmsPreferenceCallablePayload as Submission} from
  "../../shared/generated/setEventAssistanceSmsPreferenceCallablePayload";
import {
  CATCH_EVENT_SMS_SENDER_ID, SMS_CONSENT_HASH, SMS_CONSENT_RECEIPTS,
  SMS_CONSENT_TEXT, SMS_CONSENT_VERSION, parseSmsConsentReceipt,
  smsPermissionHasReceipt,
} from "./smsConsent";
import {parseSmsPermission, smsCollections, smsPermissionId} from
  "./smsDispatchStore";
import {SmsPreferenceStore, SmsPreferenceActor} from "./smsPreferenceStore";
import {
  getEventAssistanceSmsPreferenceHandler,
  setEventAssistanceSmsPreferenceHandler,
} from "./smsPreferenceHandlers";

const start = Date.parse("2026-09-07T12:00:00Z");

test("a reviewed grant cannot move to a changed verified number", async () => {
  const h = await harness();
  const before = (await h.store.get(h.actor, h.scope)).view;
  const actor = {...h.actor, phone: "+918888889999"};
  await h.write(h.attendeePath,
    {...await h.read(h.attendeePath), phoneE164: actor.phone});
  const after = (await h.store.get(actor, h.scope)).view;
  assert.equal(after.revision, before.revision);
  assert.equal(after.phoneLastFour, before.phoneLastFour);
  assert.notEqual(after.reviewHash, before.reviewHash);
  const result = await h.store.set(actor, h.grant);
  assert.equal(result.outcome, "conflict");
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
  const scope = {eventId: context.eventId, attendeeId: "attendee-" + key};
  const eventPath = "events/" + context.eventId;
  const attendeePath = "eventAttendees/" + scope.attendeeId;
  const senderPath = smsCollections.senders + "/" + CATCH_EVENT_SMS_SENDER_ID;
  await write(eventPath, {organizerId: context.organizerId, status: "active",
    name: "Test event", endTime: {seconds: (start + 3_600_000) / 1000,
      nanoseconds: 0}});
  await write(attendeePath, {organizerId: context.organizerId,
    eventId: context.eventId, linkedUid: actor.uid, phoneE164: actor.phone,
    status: "registered", createdAt: {seconds: start / 1000, nanoseconds: 5}});
  await write(senderPath, {schemaVersion: 1,
    senderId: CATCH_EVENT_SMS_SENDER_ID,
    revision: 1, provider: "gupshup", senderIdentity: "catchPlatform",
    country: "IN", status: "ready", mask: "CATCHS", principalEntityId: "12345",
    credentialVersion: "projects/catchdates-dev/secrets/EVENT_SMS/versions/1",
    activation: {useCaseApprovalId: "fixture-approval", senderApprovalId:
      "fixture-header", approvedAt: start - 1000,
    validUntil: start + 86_400_000},
    maxSegments: 3, quote: {revision: 1, currency: "INR",
      maxMicrosPerSegment: 500_000, validUntil: start + 86_400_000},
    templates: [{templateId: "fixture", revision: 1, purpose: "joiningUpdate",
      dltTemplateId: "123456", status: "approved", parts: [
        {kind: "variable", name: "instruction", maxCharacters: 150},
        {kind: "literal", text: " Reply: "},
        {kind: "variable", name: "responseUrl", maxCharacters: 160},
      ]}]});
  const permissionId = smsPermissionId(context, scope.attendeeId,
    CATCH_EVENT_SMS_SENDER_ID);
  const permissionPath = smsCollections.permissions + "/" + permissionId;
  const store = new SmsPreferenceStore(db, () => clock.now);
  const initial = (await store.get(actor, scope)).view;
  const grant: Submission = {...scope, requestId: "grant-1",
    expectedRevision: null, expectedReviewHash: initial.reviewHash,
    decision: {kind: "grant", copyVersion: SMS_CONSENT_VERSION}};
  const stop = async (
    currentActor: SmsPreferenceActor = actor,
  ): Promise<Submission> => {
    const view = (await store.get(currentActor, scope)).view;
    return {...scope, requestId: "stop-1", expectedRevision: view.revision,
      expectedReviewHash: view.reviewHash, decision: {kind: "revoke"}};
  };
  return {db, fake, store, clock, actor, context, scope, grant, stop,
    permissionPath, senderPath, attendeePath, eventPath, read, write, paths};
}

test("event edits and replacement source rows require a new consent review",
  async () => {
    for (const change of ["eventName", "eventEnd", "sourceGeneration"]) {
      const h = await harness();
      if (change === "eventName") {
        await h.write(h.eventPath, {...await h.read(h.eventPath),
          name: "A different event"});
      } else if (change === "eventEnd") {
        // Preserve precision even when the millisecond view cannot differ.
        await h.write(h.eventPath, {...await h.read(h.eventPath),
          endTime: {seconds: (start + 3_600_000) / 1000, nanoseconds: 1}});
      } else h.fake.generation = Timestamp.fromMillis(2);
      const current = (await h.store.get(h.actor, h.scope)).view;
      assert.equal(current.revision, null, change);
      assert.equal(current.canEnable, true, change);
      const result = await h.store.set(h.actor, h.grant);
      assert.equal(result.outcome, "conflict", change);
      assert.equal(await h.read(h.permissionPath), undefined, change);
    }
  });

test("ordinary time and check-in progress preserve the reviewed consent",
  async () => {
    const h = await harness();
    h.clock.now += 1000;
    await h.write(h.attendeePath, {...await h.read(h.attendeePath),
      status: "checkedIn"});
    const current = (await h.store.get(h.actor, h.scope)).view;
    assert.equal(current.reviewHash, h.grant.expectedReviewHash);
    assert.equal((await h.store.set(h.actor, h.grant)).outcome, "applied");
  });

test("old withdrawal cannot change consent for a corrected phone number",
  async () => {
    const h = await harness();
    await h.store.set(h.actor, h.grant);
    const stop = await h.stop();
    const before = await h.read(h.permissionPath);
    const actor = {...h.actor, phone: "+918888889999"};
    await h.write(h.attendeePath, {...await h.read(h.attendeePath),
      phoneE164: actor.phone});
    assert.equal((await h.store.set(actor, stop)).outcome, "conflict");
    assert.deepEqual(await h.read(h.permissionPath), before);
    const replay = await h.store.set(actor, h.grant);
    assert.equal(replay.outcome, "replayed");
    assert.equal(replay.view.preference, "notSet");
    assert.deepEqual(await h.read(h.permissionPath), before);
    const fresh = await h.store.set(actor, await h.stop(actor));
    assert.equal(fresh.outcome, "applied");
    assert.equal(fresh.view.preference, "notSet");
    const withdrawn = await h.read(h.permissionPath);
    assert.equal(withdrawn!.status, "revoked");
    assert.equal(withdrawn!.phoneE164, before!.phoneE164);
    assert.deepEqual(withdrawn!.recipientBinding, before!.recipientBinding);
    assert.deepEqual(withdrawn!.evidence, before!.evidence);
  });

test("changed consent proof invalidates a review without a revision bump",
  async () => {
    const h = await harness();
    await h.store.set(h.actor, h.grant);
    const stop = await h.stop();
    const permission = parseSmsPermission(await h.read(h.permissionPath));
    const receiptPath = SMS_CONSENT_RECEIPTS + "/" +
      permission.currentReceiptId;
    await h.write(receiptPath, {...await h.read(receiptPath),
      permissionHash: "a".repeat(64)});
    const result = await h.store.set(h.actor, stop);
    assert.equal(result.outcome, "conflict");
    assert.equal(result.view.revision, permission.revision);
    assert.equal(result.view.preference, "notSet");
    assert.deepEqual(await h.read(h.permissionPath), permission);
  });

test("verified opt-in records exact consent without changing the roster",
  async () => {
    const h = await harness();
    const roster = await h.read(h.attendeePath);
    const before = await h.store.get(h.actor, h.scope);
    assert.equal(before.view.preference, "notSet");
    assert.equal(before.view.canEnable, true);
    assert.equal(before.view.consent.text, SMS_CONSENT_TEXT);
    const result = await h.store.set(h.actor, h.grant);
    assert.equal(result.outcome, "applied");
    assert.equal(result.view.preference, "enabled");
    assert.equal(result.view.phoneLastFour, "9999");
    assert.equal(result.view.expiresAt, start + 3_600_000 + 86_400_000);
    assert.equal(JSON.stringify(result).includes(h.actor.phone), false);
    const permission = parseSmsPermission(await h.read(h.permissionPath));
    const receipt = parseSmsConsentReceipt(await h.read(SMS_CONSENT_RECEIPTS +
      "/" + permission.currentReceiptId));
    assert.equal(receipt.copyHash, SMS_CONSENT_HASH);
    assert.equal(smsPermissionHasReceipt(permission, receipt), true);
    assert.deepEqual(await h.read(h.attendeePath), roster);
    assert.equal(h.fake.entries().some(([path]) => path.startsWith("users/")),
      false);
  });

test("replayed grants cannot undo withdrawal or change request meaning",
  async () => {
    const h = await harness();
    await h.store.set(h.actor, h.grant);
    const stopped = await h.store.set(h.actor, await h.stop());
    assert.equal(stopped.view.preference, "disabled");
    const replay = await h.store.set(h.actor, h.grant);
    assert.equal(replay.outcome, "replayed");
    assert.equal(replay.view.revision, 2);
    assert.equal(replay.view.preference, "disabled");
    await assert.rejects(h.store.set(h.actor,
      {...(await h.stop()), requestId: "grant-1"}),
    /new preference request/);
    await assert.rejects(h.store.set(h.actor, {...h.grant,
      expectedReviewHash: stopped.view.reviewHash}), /new preference request/);
    assert.equal(h.fake.entries().filter(([path]) =>
      path.startsWith(SMS_CONSENT_RECEIPTS + "/")).length, 2);
  });

test("an initial withdrawal creates a tombstone that fences an older grant",
  async () => {
    const h = await harness();
    await h.store.set(h.actor, {...(await h.stop()), expectedRevision: null});
    const stored = parseSmsPermission(await h.read(h.permissionPath));
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
          {...(await h.read(h.senderPath)), status: "paused"});
      }
      if (changed === "event") {
        await h.write(h.eventPath,
          {...(await h.read(h.eventPath)), status: "cancelled"});
      }
      if (changed === "expired") h.clock.now += 2 * 86_400_000;
      const actor = changed === "phone" ? {...h.actor, phone: null} : h.actor;
      const before = await h.store.get(actor, h.scope);
      assert.equal(before.view.canEnable, false, changed);
      const result = await h.store.set(actor, await h.stop(actor));
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

test("withdrawal receipts preserve the original registration identity",
  async () => {
    const h = await harness();
    await h.store.set(h.actor, h.grant);
    const granted = parseSmsPermission(await h.read(h.permissionPath));
    await h.write(h.attendeePath, {...await h.read(h.attendeePath),
      createdAt: {seconds: start / 1000, nanoseconds: 6}});
    const result = await h.store.set(h.actor, await h.stop());
    assert.equal(result.outcome, "applied");
    assert.equal(result.view.preference, "notSet");
    const revoked = parseSmsPermission(await h.read(h.permissionPath));
    const receipt = parseSmsConsentReceipt(await h.read(
      SMS_CONSENT_RECEIPTS + "/" + revoked.currentReceiptId));
    assert.equal(revoked.attendeeGeneration, granted.attendeeGeneration);
    assert.equal(receipt.attendeeGeneration, granted.attendeeGeneration);
    assert.deepEqual(revoked.recipientBinding, granted.recipientBinding);
    assert.deepEqual(revoked.evidence, granted.evidence);
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
      path.startsWith(SMS_CONSENT_RECEIPTS + "/")), false);
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
    await assert.rejects(getEventAssistanceSmsPreferenceHandler(
      {data: h.scope} as
      CallableRequest<unknown>, deps), /signed in/);
    await assert.rejects(setEventAssistanceSmsPreferenceHandler(request({
      ...h.grant, phoneE164: "+918888888888",
    }), deps), /additional properties/);
    for (const expectedReviewHash of [undefined, null, "", "old-review"]) {
      await assert.rejects(setEventAssistanceSmsPreferenceHandler(request({
        ...h.grant, expectedReviewHash,
      }), deps), {code: "invalid-argument"});
    }
    const result = await setEventAssistanceSmsPreferenceHandler(
      request(h.grant), deps);
    assert.equal(result.view.preference, "enabled");
    await getEventAssistanceSmsPreferenceHandler(request(h.scope), deps);
    assert.deepEqual(calls, [h.actor.uid + ":setEventAssistanceSmsPreference",
      h.actor.uid + ":getEventAssistanceSmsPreference"]);
  });

test("Firestore persists one grant across competing participant requests", {
  skip: !process.env.FIRESTORE_EMULATOR_HOST, timeout: 60_000,
}, async () => {
  assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? "",
    /^(127\.0\.0\.1|localhost|\[::1\]):\d+$/);
  const key = randomUUID();
  const app = initializeApp({projectId: "demo-catch-rules"},
    "sms-consent-" + key);
  try {
    const h = await harness(getEmulatorFirestore(app), key);
    const actor = {...h.actor, phone: "+918888889999"};
    await h.write(h.attendeePath, {...await h.read(h.attendeePath),
      phoneE164: actor.phone});
    const stale = await h.store.set(actor, h.grant);
    assert.equal(stale.outcome, "conflict");
    assert.equal(await h.read(h.permissionPath), undefined);
    const grant = {...h.grant, expectedReviewHash: stale.view.reviewHash};
    const results = await Promise.all(Array.from({length: 8}, () =>
      h.store.set(actor, grant)));
    assert.equal(results.filter((r) => r.outcome === "applied").length, 1);
    assert.equal(results.filter((r) => r.outcome === "replayed").length, 7);
    const permission = parseSmsPermission(await h.read(h.permissionPath));
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
    const stop = await h.stop();
    h.clock.now -= 1;
    await assert.rejects(h.store.get(h.actor, h.scope), /clock is behind/);
    await assert.rejects(h.store.set(h.actor, stop), /clock is behind/);
    assert.deepEqual(await h.read(h.permissionPath), before);
  });


test("private SMS review is read-only and requires a new origin review",
  async () => {
    const h = await harness();
    await h.write(h.attendeePath, {...await h.read(h.attendeePath),
      phoneE164: null});
    const before = await h.read(h.attendeePath);
    const {view} = await h.store.get(h.actor, h.scope);
    assert.equal(view.canEnable, true);
    assert.equal(view.phoneLastFour, "9999");
    assert.equal(view.preference, "notSet");
    assert.equal(await h.read(h.permissionPath), undefined);
    assert.equal((await h.store.set(h.actor, h.grant)).outcome, "conflict");
    assert.equal(await h.read(h.permissionPath), undefined);
    const result = await h.store.set(h.actor, {...h.grant,
      requestId: "private-reviewed", expectedReviewHash: view.reviewHash});
    assert.equal(result.view.preference, "enabled");
    const permission = parseSmsPermission(await h.read(h.permissionPath));
    assert.equal(permission.recipientBinding?.kind, "privateVerifiedPhone");
    assert.deepEqual(await h.read(h.attendeePath), before);
  });
