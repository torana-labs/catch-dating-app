import {getEmulatorFirestore} from "../../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import test from "node:test";
import {randomUUID} from "node:crypto";
import {readFileSync} from "node:fs";
import {deleteApp, initializeApp} from "firebase-admin/app";
import {Timestamp} from "firebase-admin/firestore";
import {harness, start} from "./whatsappTestHarness";
import {parseMessageRecord, newMessageRecord, MessageRecord} from
  "./messageOutbox";
import {prepareDeliveryAttempt} from "./messageProtocol";
import {EVENT_ASSISTANCE_MESSAGES} from "./firestoreMessageOutbox";
import {projectLateJoinMessageHistory, readLateJoinMessageHistory,
  MAX_LATE_JOIN_HISTORY} from "./lateJoinMessageHistory";
import {readEventMessageContactability, EventMessageRouteSelection} from
  "./messageContactability";
import {SmsPreferenceStore} from "./smsPreferenceStore";
import {smsCollections, smsPermissionId, parseSmsPermission} from
  "./smsPermissionRecords";
import {SMS_CONSENT_RECEIPTS, SMS_CONSENT_VERSION} from "./smsConsent";
import {whatsappEndpointHash} from "./whatsappReplyProtocol";
import {WHATSAPP_PERMISSIONS, whatsappPermissionId} from
  "./whatsappPermissionRecords";
import type {SmsConfig} from "./smsProtocol";
import {readLiveLateJoinEvaluation} from "./liveLateJoinEvaluation";
import {EventAssistanceSettingsStore} from "./policySettingsStore";
import {suggestedTemplate} from "./policySettings";

const context = {mode: "live" as const, organizerId: "o", eventId: "e"};
const historyScope = {context, attendeeId: "a", episodeId: "episode"};
type Attempt = MessageRecord["attempts"][number];
function record(id = "one", createdAt = 100, materialKey = id): MessageRecord {
  return newMessageRecord({schemaVersion: 1, intentId: id, revision: 1,
    ...historyScope, eventId: context.eventId,
    workflow: {kind: "lateJoin", occurrenceId: id},
    createdAt, expiresAt: 100_000, permittedRoutes: ["catchEventSms"],
    deliveryPolicy: {maxAttempts: 3, maxAttemptsPerRoute: 3,
      minimumRetrySeconds: 1}, kind: "joiningUpdate",
    guidance: {revision: 1, destination: {kind: "fixedPlace",
      placeId: "meeting", lateEntry: "allowed"}, materialKey,
    text: "Meet here", validUntil: 100_000},
    choices: [{choiceId: "way", label: "On my way", value: {kind: "joinIntent",
      intention: {kind: "onMyWay", claimedEta: null}}}]}, createdAt);
}
function attempt(r: MessageRecord, state?: Attempt["state"]): Attempt {
  const now = r.createdAt;
  const value = prepareDeliveryAttempt({intent: r.intent,
    lifecycle: r.lifecycle, attempts: [], now,
    gate: {kind: "allow", checkedAt: now, validUntil: now + 30_000,
      instructionRevision: 1},
    routes: [{routeId: "catchEventSms", state: {kind: "eligible",
      checkedAt: now,
      validUntil: now + 30_000, permissionRevision: "consent",
      candidate: {mode: "live", binding: {routeId: "catchEventSms",
        transport: "sms", provider: "gupshup", senderIdentity: "catchPlatform",
        senderId: "sender", bindingRevision: 1, recipientEndpointId: "endpoint",
        fallbackOwner: "catch"}}}}]});
  assert.ok(value);
  return state ? {...value, state} : value;
}
function withAttempts(r: MessageRecord, ...attempts: Attempt[]) {
  return parseMessageRecord({...r, attempts,
    updatedAt: Math.max(r.updatedAt, ...attempts.map((a) => a.state.at))});
}
function summary(records: MessageRecord[], now = 50_000) {
  const result = projectLateJoinMessageHistory(historyScope, records, now);
  assert.ok(result.kind === "ready", JSON.stringify(result));
  return result;
}

test("episode history counts outreach intentions once across channel attempts",
  () => {
    const r = record();
    assert.deepEqual(summary([]).facts,
      {lastMessage: null, messagesThisEpisode: 0});
    assert.deepEqual(summary([r]).facts,
      {lastMessage: null, messagesThisEpisode: 0});
    const states: Attempt["state"][] = [
      {kind: "reserved", at: 100, reconcileAfter: 200},
      {kind: "unknown", at: 101, reason: "workerInterrupted",
        providerMessageId: null, reconcileAfter: 200},
      {kind: "accepted", at: 102, providerMessageId: "provider"},
      {kind: "delivered", at: 103, providerMessageId: "provider"},
      {kind: "read", at: 104, providerMessageId: "provider"},
      {kind: "failed", at: 105, providerMessageId: "provider",
        classification: "technical", evidenceId: "failure"},
      {kind: "revoked", at: 106, providerMessageId: "provider",
        evidenceId: "revocation"},
    ];
    for (const state of states) {
      assert.deepEqual(summary([withAttempts(r, attempt(r, state))]).facts,
        {lastMessage: {materialKey: "one", at: state.at},
          messagesThisEpisode: 1}, state.kind);
    }
    const first = attempt(r, states[5]);
    const second = {...attempt(r, states[3]), attemptId: "second", ordinal: 2};
    assert.equal(summary([withAttempts(r, first, second)]).facts
      .messagesThisEpisode, 1);
  });

test("superseded outreach counts and proven unsent attempts do not",
  () => {
    const r = record();
    const sent = withAttempts(r, attempt(r, {kind: "accepted", at: 100,
      providerMessageId: "provider"}));
    for (const lifecycle of ["active", "superseded", "cancelled"] as const) {
      assert.equal(summary([{...sent, lifecycle}]).facts
        .messagesThisEpisode, 1);
    }
    const unsent = withAttempts(r, attempt(r, {kind: "notDispatched",
      at: 30_100, reason: "reservationExpired"}));
    assert.deepEqual(summary([unsent]).facts,
      {lastMessage: null, messagesThisEpisode: 0});
    assert.equal(summary([withAttempts(r, ...unsent.attempts,
      {...attempt(r), attemptId: "retry", ordinal: 2})]).facts
      .messagesThisEpisode, 1);
  });

test("old receipts extend cooldown without replacing the latest instruction",
  () => {
    const old = record("old", 100);
    const recent = record("recent", 200);
    const records = [withAttempts(old, attempt(old, {kind: "delivered", at: 300,
      providerMessageId: "old-provider"})),
    withAttempts(recent, attempt(recent, {kind: "accepted", at: 201,
      providerMessageId: "new-provider"}))];
    assert.deepEqual(summary(records).facts,
      {lastMessage: {materialKey: "recent", at: 300}, messagesThisEpisode: 2});
    assert.equal(summary(records).evidenceHash,
      summary([...records].reverse()).evidenceHash);
  });

test("overflow and conflicts cannot become empty history", () => {
  const r = record();
  assert.deepEqual(projectLateJoinMessageHistory(historyScope,
    Array.from({length: MAX_LATE_JOIN_HISTORY + 1}, () => r), 50_000),
  {kind: "unavailable", reason: "historyLimit"});
  assert.deepEqual(projectLateJoinMessageHistory(historyScope,
    [{...r, deliveryConflict: true}], 50_000),
  {kind: "unavailable", reason: "deliveryConflict"});
  const a = record("a");
  const b = record("b");
  assert.deepEqual(projectLateJoinMessageHistory(historyScope,
    [withAttempts(a, attempt(a)), withAttempts(b, attempt(b))], 50_000),
  {kind: "unavailable", reason: "ambiguousHistory"});
  assert.throws(() => summary([r, r]), /outside/);
  assert.throws(() => summary([r], 99), /outside/);
  for (const intent of [
    {...r.intent, attendeeId: "other"}, {...r.intent, episodeId: "other"},
    {...r.intent, context: {...context, organizerId: "other"}},
    {...r.intent, workflow: {kind: "guestCheckIn", occurrenceId: "one"}},
  ]) {
    assert.throws(() => summary([parseMessageRecord({
      ...newMessageRecord(intent, 100)})]));
  }
});

async function sms(h: Awaited<ReturnType<typeof harness>>) {
  const sender: SmsConfig = {schemaVersion: 1, senderId: "sms-source",
    revision: 1, provider: "gupshup", senderIdentity: "catchPlatform",
    country: "IN", status: "ready", mask: "CATCHS", principalEntityId: "100100",
    credentialVersion: "projects/demo/secrets/SMS_FIXTURE/versions/1",
    activation: {useCaseApprovalId: "fixture", senderApprovalId: "fixture",
      approvedAt: start - 1, validUntil: start + 3_600_000}, maxSegments: 3,
    quote: {revision: 1, currency: "INR", maxMicrosPerSegment: 500_000,
      validUntil: start + 3_600_000}, templates: [{templateId: "template",
      revision: 1, purpose: "joiningUpdate", dltTemplateId: "100200",
      status: "approved", parts: [{kind: "variable", name: "instruction",
        maxCharacters: 180}, {kind: "literal", text: " Reply: "},
      {kind: "variable", name: "responseUrl", maxCharacters: 160}]}]};
  await h.write(smsCollections.senders + "/" + sender.senderId, sender);
  const store = new SmsPreferenceStore(h.db,
    () => h.clock.now, sender.senderId);
  const scope = {eventId: h.context.eventId, attendeeId: h.scope.attendeeId};
  const smsReview = (await store.get(h.actor, scope)).view;
  await store.set(h.actor, {...scope, requestId: "sms-grant",
    expectedReviewHash: smsReview.reviewHash,
    expectedRevision: null, decision: {kind: "grant",
      copyVersion: SMS_CONSENT_VERSION}});
  return {sender, store, scope};
}
function choices(h: Awaited<ReturnType<typeof harness>>):
  EventMessageRouteSelection[] {
  return [{routeId: "organizerEventWhatsapp", senderId: h.scope.senderId},
    {routeId: "catchEventSms", senderId: "sms-source"},
    {routeId: "catchEventRcs", senderId: "rcs-source"}];
}
async function contacts(h: Awaited<ReturnType<typeof harness>>,
  selections = choices(h)) {
  return h.db.runTransaction((tx) => readEventMessageContactability(h.db, tx,
    {context: h.context, attendeeId: h.scope.attendeeId}, selections,
    "joiningUpdate", h.clock.now));
}

test("contactability checks each sender without writes or secrets",
  async () => {
    const h = await harness();
    await sms(h);
    const before = h.fake.entries();
    const result = await contacts(h);
    assert.deepEqual(result.map((r) => r.state.kind),
      ["canPrepare", "canPrepare", "blocked"]);
    assert.deepEqual(result[2].state,
      {kind: "blocked", reason: "notProvisioned"});
    assert.deepEqual(h.fake.entries(), before);
    assert.ok(!JSON.stringify(result).includes(h.actor.phone));
    assert.ok(!JSON.stringify(result).includes("secretVersionResource"));
    await h.preferences.set(h.actor, {...h.scope, requestId: "withdraw",
      expectedRevision: 1, decision: {kind: "revoke"}});
    assert.deepEqual((await contacts(h)).map((r) => r.state.kind),
      ["blocked", "canPrepare", "blocked"]);
  });

test("STOP and independent CRM suppression block planning and final claims",
  async () => {
    const h = await harness();
    await sms(h);
    await h.reserve();
    await h.stop(h.clock.now);
    assert.equal((await contacts(h))[0].state.kind, "blocked");
    assert.equal((await h.claim()).kind, "withheld");
    assert.equal((await contacts(h))[1].state.kind, "canPrepare");
    const fresh = await harness(undefined, "crm");
    await fresh.reserve();
    const stamp = {_seconds: start / 1000, _nanoseconds: 0};
    await fresh.write("organizerContactChannelStates/paused", {
      organizerId: fresh.context.organizerId, contactId: "contact",
      channel: "whatsapp",
      endpointHash: whatsappEndpointHash(fresh.actor.phone),
      suppressionStatus: "none", suppressionSource: null, adminSuppressed: true,
      campaignAcceptedCount: 0, lastCampaignAcceptedAt: null,
      lastInboundAt: stamp, lastReplyAt: null,
      createdAt: stamp, updatedAt: stamp,
    });
    assert.equal((await contacts(fresh))[0].state.kind, "blocked");
    assert.equal((await fresh.claim()).kind, "withheld");
  });

test("missing receipts, changed phones and expiry withhold preparation",
  async () => {
    const h = await harness();
    const s = await sms(h);
    const id = smsPermissionId(h.context, h.scope.attendeeId,
      s.sender.senderId);
    const permission = parseSmsPermission(h.fake.read(
      smsCollections.permissions + "/" + id));
    h.fake.remove(SMS_CONSENT_RECEIPTS + "/" + permission.currentReceiptId);
    assert.equal((await contacts(h))[1].state.kind, "blocked");
    await h.write(h.attendeePath, {...await h.read(h.attendeePath),
      phoneE164: "+919888888888"});
    assert.equal((await contacts(h))[0].state.kind, "blocked");
    const fresh = await harness(undefined, "expired");
    fresh.clock.now = start + 3_600_000;
    assert.equal((await contacts(fresh))[0].state.kind, "blocked");
    await assert.rejects(contacts(fresh, []), /Invalid contactability/);
    await assert.rejects(contacts(fresh,
      [choices(fresh)[0], choices(fresh)[0]]),
    /Invalid contactability/);
    const foreign = await harness(undefined, "foreign");
    await foreign.write(foreign.senderPath, {...foreign.expected.connection,
      organizerId: "other"});
    assert.equal((await contacts(foreign))[0].state.kind, "blocked");
  });

test("Firestore joins live operating facts, consent and episode history", {
  skip: !process.env.FIRESTORE_EMULATOR_HOST, timeout: 60_000,
}, async () => {
  assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? "",
    /^(127\.0\.0\.1|localhost|\[::1\]):\d+$/);
  const app = initializeApp({projectId: "demo-catch-rules"}, randomUUID());
  const db = getEmulatorFirestore(app);
  try {
    const h = await harness(db, randomUUID());
    const attendee = {...JSON.parse(readFileSync(
      "../contracts/fixtures/valid/event_attendee_doc.json", "utf8")),
    ...await h.read(h.attendeePath), organizerId: h.context.organizerId,
    checkedInAt: null, checkedInBy: null, attendanceRevision: 0,
    updatedAt: Timestamp.fromMillis(start)};
    await h.write(h.attendeePath, attendee);
    const settings = new EventAssistanceSettingsStore(db, () => h.clock.now);
    const settingScope = {context: h.context, groupId: "event:whole",
      workflowKind: "lateJoin"};
    const view = (await settings.get("host-1", settingScope)).view;
    const template = suggestedTemplate("lateJoin")!;
    template.setting = {kind: "enabled", authority: "executeWithinPolicy"};
    await settings.set("host-1", {...settingScope, requestId: "enable",
      expectedRevision: view.ownRevision, expectedSourceHash: view.sourceHash,
      preference: {kind: "configured", template}});
    const scope = {context: h.context, attendeeId: h.scope.attendeeId};
    const options = {routes: [choices(h)[0]], responseDeadline: null};
    const evaluate = () => db.runTransaction((tx) =>
      readLiveLateJoinEvaluation(db, tx, scope, options, h.clock.now));
    const initial = await evaluate();
    assert.ok(initial.kind === "evaluated", JSON.stringify(initial));
    assert.equal(initial.input.messagesThisEpisode, 0);
    assert.ok(initial.decision.kind === "update" &&
      initial.decision.shouldSend);
    assert.equal((await h.claim()).kind, "claimed");
    const attempted = await evaluate();
    assert.ok(attempted.kind === "evaluated");
    assert.equal(attempted.input.messagesThisEpisode, 1);
    assert.ok(attempted.decision.kind === "update" &&
      !attempted.decision.shouldSend);
    await h.preferences.set(h.actor, {...h.scope, requestId: "withdraw",
      expectedRevision: 1, decision: {kind: "revoke"}});
    const withdrawn = await evaluate();
    assert.ok(withdrawn.kind === "evaluated");
    assert.equal(withdrawn.input.guest.deliveryEligibility, "unreachable");
    assert.equal(withdrawn.input.messagesThisEpisode, 1);
    const changed = parseMessageRecord({...await h.outbox.get(h.messageId),
      deliveryConflict: true});
    await h.write(EVENT_ASSISTANCE_MESSAGES + "/" + h.messageId, changed);
    assert.deepEqual(await evaluate(), {kind: "historyUnavailable",
      reason: "deliveryConflict"});
    const foreign = record("foreign-" + randomUUID());
    await h.write(EVENT_ASSISTANCE_MESSAGES + "/" + foreign.messageId, foreign);
    const history = await db.runTransaction((tx) => readLateJoinMessageHistory(
      db, tx, {...scope, episodeId: h.intent.episodeId}, h.clock.now));
    assert.deepEqual(history,
      {kind: "unavailable", reason: "deliveryConflict"});
    const permission = await db.collection(WHATSAPP_PERMISSIONS)
      .doc(whatsappPermissionId(h.context, h.scope.attendeeId,
        h.scope.senderId))
      .get();
    assert.equal(permission.data()?.status, "revoked");
    const batch = db.batch();
    for (let i = 0; i < MAX_LATE_JOIN_HISTORY; i++) {
      const extra = newMessageRecord({...h.intent,
        intentId: "history-" + h.context.eventId + "-" + i}, start);
      batch.create(db.collection(EVENT_ASSISTANCE_MESSAGES)
        .doc(extra.messageId), extra);
    }
    await batch.commit();
    assert.deepEqual(await evaluate(), {kind: "historyUnavailable",
      reason: "historyLimit"});
  } finally {
    await deleteApp(app);
  }
});
