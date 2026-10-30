import {getEmulatorFirestore} from "../../shared/testing/emulatorFirestore";
import type {CallableRequest, Request} from "firebase-functions/v2/https";
import type {Response} from "express";
import {SmsWithdrawalStore} from "./smsWithdrawalStore";
import {SMS_WITHDRAWAL_GRANTS, newSmsWithdrawalGrant} from
  "./smsWithdrawalRecords";
import {SMS_CONSENT_RECEIPTS, parseSmsConsentReceipt} from "./smsConsent";
import {withdrawEventAssistanceSmsHandler} from "./smsWithdrawalHandlers";
import assert from "node:assert/strict";
import test from "node:test";
import {randomUUID} from "node:crypto";
import {deleteApp, initializeApp} from "firebase-admin/app";
import {Firestore} from "firebase-admin/firestore";
import type {EventAssistanceMessageIntent as Intent} from
  "../../shared/generated/eventAssistanceMessageIntent";
import {ProgressFirestore, seedJoiningProgress} from
  "./groupProgressTestFixtures";
import {GuestAssistanceStore} from "./guestAssistanceStore";
import {guestCollections, parseGrant} from "./guestRecords";
import {GuestLinkSigningKeys} from "./guestLinkTokens";
import {assistanceMessageId} from "./messageOutbox";
import {
  SmsDispatchStore, smsCollections, smsBudgetScopes, smsBudgetId,
  smsPermissionId, Budget, parseSmsBudget, parseSmsPermission,
} from "./smsDispatchStore";
import {parseSmsConfig, renderEventSms, smsSegments, SmsConfig} from
  "./smsProtocol";
import {
  GupshupSmsProvider, parseGupshupSubmission, parseSmsCredentials,
  SmsCredentials,
} from "./gupshupSmsProvider";
import {EventSmsWorker} from "./smsWorker";
import {smsProviderCorrelation, smsReportTokenMatches} from
  "./smsReportCredentials";
import {SmsPreferenceStore} from "./smsPreferenceStore";
import {SmsDeliveryReportStore} from "./smsDeliveryReports";
import {eventAssistanceSmsDeliveryWebhookHandler} from "./smsDeliveryWebhook";
import {BRAND} from "../../shared/generated/brand";

const keys: GuestLinkSigningKeys = {currentKeyId: "sms-key-1",
  keyFor: () => Buffer.alloc(32, 7)};
const start = Date.parse("2026-09-06T14:30:00Z");

function config(senderId = "sms-sender-1"): SmsConfig {
  return {schemaVersion: 1, senderId, revision: 1, provider: "gupshup",
    senderIdentity: "catchPlatform", country: "IN", status: "ready",
    mask: "CATCHS", principalEntityId: "100100100100",
    credentialVersion: "projects/catchdates-dev/secrets/EVENT_SMS/versions/1",
    activation: {useCaseApprovalId: "fixture-use-case",
      senderApprovalId:
      "fixture-sender", approvedAt: start - 1000,
      validUntil: start + 3_600_000},
    maxSegments: 3, quote: {revision: 1, currency: "INR",
      maxMicrosPerSegment: 500_000, validUntil: start + 3_600_000},
    templates: [{templateId: "fixture-joining", revision: 1,
      purpose: "joiningUpdate", dltTemplateId: "100200200200",
      status: "approved",
      parts: [{kind: "literal", text: "Catch: "},
        {kind: "variable", name: "instruction", maxCharacters: 180},
        {kind: "literal", text: " Reply: "},
        {kind: "variable", name: "responseUrl", maxCharacters: 160}]}]};
}

async function harness(realDb?: Firestore, id = "test") {
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
  const context = {mode: "live" as const, eventId: "event-" + id,
    organizerId: "organizer-" + id};
  const attendeeId = "attendee-" + id;
  const sender = config("sender-" + id);
  const progress = await seedJoiningProgress(db, context, start,
    start + 3_600_000);
  const attendeePath = "eventAttendees/" + attendeeId;
  await write(attendeePath, {organizerId: context.organizerId,
    eventId: context.eventId, status: "registered", linkedUid: "guest-uid",
    phoneE164: "+919999999999", createdAt: {
      seconds: (start - 1000) / 1000, nanoseconds: 4,
    }});
  const guests = new GuestAssistanceStore(db, () => clock.now);
  const guest = await guests.startEpisode(context, attendeeId, "start-1", null);
  const intent: Intent = {schemaVersion: 1, intentId: "message-" + id,
    revision: 1, context, eventId: context.eventId, attendeeId,
    episodeId: guest.episodeId,
    workflow: {kind: "lateJoin", occurrenceId: "departure-1"},
    createdAt: start, expiresAt: start + 1_800_000,
    permittedRoutes: ["catchEventSms"], deliveryPolicy: {maxAttempts: 2,
      maxAttemptsPerRoute: 1, minimumRetrySeconds: 1}, kind: "joiningUpdate",
    guidance: progress.guidance,
    choices: [{choiceId: "on-my-way", label: "I'm on my way", value: {
      kind: "joinIntent", intention: {kind: "onMyWay", claimedEta: null},
    }}]};
  const thread = await guests.publishMessage(intent, null);
  const link = await guests.issueLink(thread.threadId, "send-1", keys);
  const permissionPath = smsCollections.permissions + "/" +
    smsPermissionId(context, attendeeId, sender.senderId);
  const senderPath = smsCollections.senders + "/" + sender.senderId;
  await write(senderPath, sender);
  const preferences = new SmsPreferenceStore(db, () => clock.now,
    sender.senderId);
  const smsReview = (await preferences.get(
    {uid: "guest-uid", phone: "+919999999999"},
    {eventId: context.eventId, attendeeId})).view;
  await preferences.set({uid: "guest-uid", phone: "+919999999999"}, {
    expectedReviewHash: smsReview.reviewHash,
    eventId: context.eventId, attendeeId, requestId: "fixture-opt-in",
    expectedRevision: null, decision: {kind: "grant",
      copyVersion: "catch-event-service-sms-v1"},
  });
  const permission = parseSmsPermission(await read(permissionPath));
  const budgetPaths: string[] = [];
  for (const scope of smsBudgetScopes(context, start)) {
    const begins = scope.kind === "senderDay" ?
      Date.parse(scope.day + "T00:00:00+05:30") : start - 1000;
    const budget: Budget = {schemaVersion: 1,
      budgetId: smsBudgetId(sender.senderId, scope), revision: 1,
      senderId: sender.senderId, scope, status: "active",
      approvalId: "fixture-spending", currency: "INR",
      limitMicros: 10_000_000, chargedMicros: 0,
      startsAt: begins, endsAt: scope.kind === "senderDay" ?
        begins + 86_400_000 : start + 3_600_000, updatedAt: start};
    const path = smsCollections.budgets + "/" + budget.budgetId;
    budgetPaths.push(path);
    await write(path, budget);
  }
  const store = new SmsDispatchStore(db, sender.senderId, keys,
    () => clock.now);
  const credentials: SmsCredentials = {schema: "catch.event-sms-credential/v1",
    senderId: sender.senderId, userid: "1234", password: "private &=+password"};
  const requests: Array<{url: string; init?: RequestInit}> = [];
  const transport = {
    reply: "success|919999999999|660362025761505631-520576818555598760",
    status: 200, error: false, delay: 0};
  const fetchImpl: typeof fetch = async (url, init) => {
    requests.push({url: String(url), init});
    clock.now += transport.delay;
    if (transport.error) throw new Error(credentials.password);
    return new Response(transport.reply, {status: transport.status});
  };
  const provider = new GupshupSmsProvider(fetchImpl, () => clock.now);
  const credentialStore = {access: async () => credentials};
  const worker = new EventSmsWorker(store, credentialStore, provider,
    () => clock.now);
  const messageId = assistanceMessageId(intent);
  return {db, fake, clock, context, attendeeId, attendeePath,
    sender, senderPath, guest, guests, thread, link,
    permission, permissionPath, preferences, budgetPaths, store,
    credentials, requests,
    transport, provider, worker, write, read, intent, messageId, paths,
    progress};
}

test("SMS segmentation counts GSM extensions and Unicode pairs at boundaries",
  () => {
    assert.deepEqual(smsSegments("a".repeat(160)), {
      encoding: "gsm7", units: 160, segments: 1,
    });
    assert.equal(smsSegments("a".repeat(161)).segments, 2);
    assert.equal(smsSegments("^".repeat(80)).segments, 1);
    assert.equal(smsSegments("^".repeat(81)).segments, 2);
    assert.equal(smsSegments("^".repeat(153)).segments, 3);
    assert.deepEqual(smsSegments("न".repeat(71)), {
      encoding: "unicode", units: 71, segments: 2,
    });
    assert.equal(smsSegments("🙂".repeat(35)).segments, 1);
    assert.equal(smsSegments("🙂".repeat(67)).segments, 3);
    assert.throws(() => smsSegments("\ud800"), /Invalid SMS/);
    assert.throws(() => smsSegments(""), /Invalid SMS/);
  });

test("SMS renders exact approved parts with a scoped response link",
  async () => {
    const h = await harness();
    const grant = parseGrant(await h.read(guestCollections.grants + "/" +
    h.link.linkId));
    const input = {config: h.sender, intent: h.intent, grant, keys,
      eventTitle: "Friday social", now: h.clock.now};
    const rendered = renderEventSms(input);
    assert.equal(rendered.text, "Catch: Join us at stop one. Reply: " +
    `${BRAND.web.origin}/event-update/` + h.link.linkId + "#" + h.link.secret);
    assert.equal(rendered.maxCostMicros, rendered.segments * 500_000);
    assert.throws(() => renderEventSms({...input,
      grant: {...grant, episodeId: "wrong-episode"}}), /unavailable/);
    assert.throws(() => renderEventSms({...input,
      keys: {...keys, keyFor: () => Buffer.alloc(32, 1)}}), /key mismatch/);
    for (const change of ["slot", "length", "approval", "purpose", "quote"]) {
      const cfg = structuredClone(h.sender);
      if (change === "slot") cfg.templates[0].parts.pop();
      if (change === "length") cfg.maxSegments = 1;
      if (change === "approval") cfg.templates[0].status = "pending";
      if (change === "purpose") cfg.templates[0].purpose = "followUp";
      if (change === "quote") cfg.quote.validUntil = h.clock.now;
      // The default fixture happens to fit one segment. Force two for the cap.
      const intent = change === "length" ? {...h.intent,
        guidance: {...h.intent.guidance, text: "a".repeat(180)}} : h.intent;
      assert.throws(() => renderEventSms({...input, config: cfg, intent}),
        Error, change);
    }
    assert.throws(() => parseSmsConfig({...h.sender,
      templates: [...h.sender.templates, {...h.sender.templates[0],
        templateId: "duplicate-purpose"}]}), /Ambiguous/);
  });

test("provider uncertainty never becomes technical failure or retry permission",
  () => {
    for (const code of ["100", "117", "125", "190", "999"]) {
      assert.deepEqual(parseGupshupSubmission("error | " + code + " | omitted",
        "+919999999999"), {kind: "uncertain", reason: "providerPending", code});
    }
    assert.equal(parseGupshupSubmission("error|102|private provider body",
      "+919999999999").kind, "rejected");
    assert.deepEqual(parseGupshupSubmission("error|105|bad phone",
      "+919999999999"), {kind: "rejected", code: "105",
      classification: "invalidRecipient"});
    for (const body of ["<html>Error</html>",
      "success|918888888888|123-456", "success|919999999999|", "success|" +
    "919999999999|123-456\nsuccess|919999999999|789-012"]) {
      assert.equal(parseGupshupSubmission(body, "+919999999999").kind,
        "uncertain");
    }
  });

test("SMS worker contends once, debits atomically and posts correctly",
  async () => {
    const h = await harness();
    const results = await Promise.all(Array.from({length: 8}, () =>
      h.worker.dispatch(h.messageId, h.link.linkId)));
    assert.equal(results.filter((r) => r.kind === "submitted").length, 1);
    assert.equal(h.requests.length, 1);
    const request = h.requests[0];
    assert.equal(request.url, "https://enterprise.smsgupshup.com/GatewayAPI/rest");
    assert.equal(request.init?.method, "POST");
    assert.equal(request.init?.redirect, "error");
    const form = new URLSearchParams(String(request.init?.body));
    assert.equal(form.get("password"), h.credentials.password);
    assert.equal(form.get("send_to"), "919999999999");
    assert.equal(form.get("mask"), "CATCHS");
    assert.equal(form.get("dltTemplateId"), "100200200200");
    assert.equal(form.get("principalEntityId"), "100100100100");
    assert.ok(form.get("msg")!.includes(h.link.secret));
    const record = await h.store.outbox(h.link.linkId).get(h.messageId);
    assert.equal(record?.attempts[0].state.kind, "accepted");
    assert.equal(form.get("msg_id"),
      smsProviderCorrelation(record!.attempts[0].attemptId));
    assert.match(form.get("extra")!, /^[a-f0-9]{48}$/);
    const debit = await h.read(smsCollections.dispatches + "/" +
    record!.attempts[0].attemptId);
    assert.ok(debit);
    assert.ok(smsReportTokenMatches(form.get("extra")!,
      String(debit.reportTokenHash)));
    for (const path of h.budgetPaths) {
      const budget = parseSmsBudget(await h.read(path));
      assert.equal(budget.chargedMicros, debit.maxCostMicros);
      assert.equal(budget.revision, 2);
    }
    const persisted = JSON.stringify(h.fake.entries());
    for (const secret of [h.link.secret, h.credentials.password,
      form.get("extra")!]) {
      assert.equal(persisted.includes(secret), false);
      assert.equal(JSON.stringify(results).includes(secret), false);
    }
  });

test("failed claim commit rolls back both spending and dispatch evidence",
  async () => {
    const h = await harness();
    const outbox = h.store.outbox(h.link.linkId);
    const {record} = await outbox.reserve(h.messageId);
    h.fake.failNextCommit = true;
    await assert.rejects(outbox.claimLiveDispatch(h.messageId,
      record.attempts[0].attemptId, h.store.prepare(h.link.linkId, h.sender)),
    /interruption/);
    assert.equal((await outbox.get(h.messageId))?.attempts[0].state.kind,
      "reserved");
    assert.equal(await h.read(smsCollections.dispatches + "/" +
    record.attempts[0].attemptId), undefined);
    for (const path of h.budgetPaths) {
      assert.equal((await h.read(path))?.chargedMicros, 0);
    }
    assert.equal((await h.worker.dispatch(h.messageId, h.link.linkId)).kind,
      "submitted");
    assert.equal(h.requests.length, 1);
  });

test("fresh source changes withhold a previously reserved send", async () => {
  for (const change of ["checkIn", "phone", "uid", "generation", "permission",
    "expiredPermission", "grant", "sender", "configSameRevision", "budget",
    "expiredPermit", "participation"]) {
    const h = await harness();
    const outbox = h.store.outbox(h.link.linkId);
    const {record} = await outbox.reserve(h.messageId);
    assert.equal(record.attempts.length, 1);
    const attendee = (await h.read(h.attendeePath))!;
    if (change === "participation") {
      await h.write(guestCollections.guests + "/" + h.guest.guestId,
        {...h.guest, participation: {state: "temporaryBreak",
          resumeAtUnit: null}, revision: h.guest.revision + 1});
    }
    if (change === "checkIn") {
      await h.write(h.attendeePath,
        {...attendee, status: "checkedIn"});
    }
    if (change === "phone") {
      await h.write(h.attendeePath,
        {...attendee, phoneE164: "+918888888888"});
    }
    if (change === "uid") {
      await h.write(h.attendeePath,
        {...attendee, linkedUid: "different-person"});
    }
    if (change === "generation") {
      await h.write(h.attendeePath,
        {...attendee, createdAt: {seconds: start / 1000, nanoseconds: 0}});
    }
    if (change === "permission") {
      await h.write(h.permissionPath,
        {...h.permission, status: "revoked"});
    }
    if (change === "expiredPermission") {
      h.clock.now++;
      await h.write(h.permissionPath,
        {...h.permission, expiresAt: h.clock.now});
    }
    if (change === "grant") await h.guests.revokeLink(h.link.linkId);
    if (change === "sender") {
      await h.write(h.senderPath,
        {...h.sender, status: "paused"});
    }
    if (change === "configSameRevision") {
      await h.write(h.senderPath,
        {...h.sender, mask: "CHANGD"});
    }
    if (change === "budget") {
      await h.write(h.budgetPaths[0],
        {...(await h.read(h.budgetPaths[0])), limitMicros: 0});
    }
    if (change === "expiredPermit") h.clock.now += 30_001;
    const claim = await outbox.claimLiveDispatch(h.messageId,
      record.attempts[0].attemptId, h.store.prepare(h.link.linkId, h.sender));
    assert.equal(claim.kind, "withheld", change);
    assert.equal(h.requests.length, 0);
    for (const path of h.budgetPaths) {
      assert.equal((await h.read(path))?.chargedMicros, 0, change);
    }
  }
});

test("uncertain submissions retain the debit and cannot send again",
  async () => {
    for (const problem of ["timeout", "maintenance", "wrongRecipient", "http",
      "oversize"]) {
      const h = await harness();
      if (problem === "timeout") h.transport.error = true;
      if (problem === "maintenance") {
        h.transport.reply = "error|125|Maintenance";
      }
      if (problem === "wrongRecipient") {
        h.transport.reply = "success|918888888888|123-456";
      }
      if (problem === "http") h.transport.status = 503;
      if (problem === "oversize") h.transport.reply = "x".repeat(9000);
      const result = await h.worker.dispatch(h.messageId, h.link.linkId);
      assert.ok(result.kind === "submitted");
      assert.equal(result.outcome.kind, "uncertain", problem);
      h.clock.now += 121_000;
      await h.worker.dispatch(h.messageId, h.link.linkId);
      assert.equal(h.requests.length, 1, problem);
      assert.ok(Number((await h.read(h.budgetPaths[0]))?.chargedMicros) > 0);
      assert.equal(JSON.stringify(result).includes(h.credentials.password),
        false);
    }
  });

test("credential I/O precedes short reservation; changed config cannot claim",
  async () => {
    const h = await harness();
    const slow = new EventSmsWorker(h.store, {access: async () => {
      h.clock.now += 35_000;
      return h.credentials;
    }}, h.provider, () => h.clock.now);
    assert.equal((await slow.dispatch(h.messageId, h.link.linkId)).kind,
      "submitted");
    assert.equal(h.requests.length, 1);
    const other = await harness();
    const changed = new EventSmsWorker(other.store, {access: async () => {
      await other.write(other.senderPath, {...other.sender,
        credentialVersion: other.sender.credentialVersion.replace("/1", "/2")});
      return other.credentials;
    }}, other.provider, () => other.clock.now);
    assert.equal((await changed.dispatch(other.messageId,
      other.link.linkId)).kind, "withheld");
    assert.equal(other.requests.length, 0);
    assert.throws(() => parseSmsCredentials({
      ...h.credentials, senderId: "other"},
    h.sender.senderId), /another sender/);
  });

async function contestedBudget(h: Awaited<ReturnType<typeof harness>>) {
  // Two distinct messages can both reserve before either spends the last unit.
  const secondIntent: Intent = {...h.intent, intentId: h.intent.intentId + "-2",
    workflow: {kind: "lateJoin", occurrenceId: "departure-2"}};
  const secondThread = await h.guests.publishMessage(secondIntent, null);
  const secondLink = await h.guests.issueLink(secondThread.threadId,
    "send-2", keys);
  const firstOutbox = h.store.outbox(h.link.linkId);
  const secondOutbox = h.store.outbox(secondLink.linkId);
  const secondMessageId = assistanceMessageId(secondIntent);
  for (const path of h.budgetPaths) {
    await h.write(path, {...(await h.read(path)), limitMicros: 500_000});
  }
  const first = await firstOutbox.reserve(h.messageId);
  const second = await secondOutbox.reserve(secondMessageId);
  assert.equal(first.record.attempts.length, 1);
  assert.equal(second.record.attempts.length, 1);
  const results = await Promise.all([
    h.worker.dispatch(h.messageId, h.link.linkId),
    h.worker.dispatch(secondMessageId, secondLink.linkId),
  ]);
  assert.equal(results.filter((r) => r.kind === "submitted").length, 1);
  assert.equal(h.requests.length, 1);
  for (const path of h.budgetPaths) {
    assert.equal((await h.read(path))?.chargedMicros, 500_000);
  }
}

test("different messages cannot overspend a shared event/day budget",
  async () => {
    await contestedBudget(await harness());
  });

test("Firestore atomically arbitrates different SMS budget claims", {
  skip: !process.env.FIRESTORE_EMULATOR_HOST, timeout: 60_000,
}, async () => {
  assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? "",
    /^(127\.0\.0\.1|localhost|\[::1\]):\d+$/);
  const id = randomUUID();
  const app = initializeApp({projectId: "demo-catch-rules"}, "sms-" + id);
  const db = getEmulatorFirestore(app);
  try {
    await contestedBudget(await harness(db, id));
  } finally {
    // This isolated demo project is erased by the owning emulator test suite.
    await deleteApp(app);
  }
});

test("a scoped webpage reply prevents later SMS dispatch", async () => {
  const h = await harness();
  const outbox = h.store.outbox(h.link.linkId);
  await outbox.reserve(h.messageId);
  const view = await h.guests.getView(h.link.linkId, h.link.secret);
  assert.ok(view.status === "ready");
  await h.guests.submit({linkId: h.link.linkId, secret: h.link.secret,
    intentId: view.intentId, intentRevision: view.intentRevision,
    expectedGuestRevision: view.guestRevision, choiceId: "on-my-way",
    requestId: "reply-1"});
  await h.worker.dispatch(h.messageId, h.link.linkId);
  assert.equal(h.requests.length, 0);
  assert.equal((await h.read(h.attendeePath))?.status, "registered");
});

test("missing event-service permission cannot inherit organizer marketing",
  async () => {
    const h = await harness();
    await h.write(h.permissionPath, {...h.permission, purpose: "marketing"});
    await assert.rejects(h.worker.dispatch(h.messageId, h.link.linkId),
      /event-service SMS permission/);
    assert.equal(h.requests.length, 0);
  });

test("slow resource preparation cannot commit an expired claim or debit",
  async () => {
    const h = await harness();
    const outbox = h.store.outbox(h.link.linkId);
    const reservation = await outbox.reserve(h.messageId);
    const prepare = h.store.prepare(h.link.linkId, h.sender);
    const result = await outbox.claimLiveDispatch(h.messageId,
      reservation.record.attempts[0].attemptId,
      async (...args) => {
        const resource = await prepare(...args);
        h.clock.now += 30_001;
        return resource;
      });
    assert.ok(result.kind === "withheld");
    assert.equal(result.reason, "authorizationExpired");
    for (const path of h.budgetPaths) {
      assert.equal((await h.read(path))?.chargedMicros, 0);
    }
  });

test("transport refuses an expired permit, changed phone or changed body",
  async () => {
    for (const change of ["phone", "body", "expiry"]) {
      const h = await harness();
      const outbox = h.store.outbox(h.link.linkId);
      const reservation = await outbox.reserve(h.messageId);
      const claimed = await outbox.claimLiveDispatch(h.messageId,
        reservation.record.attempts[0].attemptId,
        h.store.prepare(h.link.linkId, h.sender));
      assert.ok(claimed.kind === "claimed");
      const input = {permit: claimed.permit, config: claimed.resource.config,
        credentials: h.credentials, phoneE164: h.permission.phoneE164,
        reportToken: claimed.resource.reportToken,
        rendered: claimed.resource.rendered};
      if (change === "phone") input.phoneE164 = "+918888888888";
      if (change === "body") input.rendered.text = "Changed after budget claim";
      if (change === "expiry") {
        h.clock.now = claimed.permit.validUntil;
        assert.deepEqual(await h.provider.send(input), {
          kind: "withheld", reason: "permitExpired",
        });
        await outbox.recordExpiredBeforeSend(claimed.permit);
        assert.equal((await outbox.get(h.messageId))?.attempts[0].state.kind,
          "notDispatched");
      } else {
        await assert.rejects(h.provider.send(input), /permit|material changed/);
      }
      assert.equal(h.requests.length, 0);
    }
  });

test("SMS cannot silently bypass WhatsApp or RCS selection", async () => {
  const h = await harness();
  const intent: Intent = {...h.intent, intentId: "multi-route",
    workflow: {kind: "lateJoin", occurrenceId: "multi-channel"},
    permittedRoutes: ["organizerEventWhatsapp", "catchEventRcs",
      "catchEventSms"]};
  const thread = await h.guests.publishMessage(intent, null);
  const link = await h.guests.issueLink(thread.threadId, "send-1", keys);
  const result = await h.worker.dispatch(assistanceMessageId(intent),
    link.linkId);
  assert.deepEqual(result, {kind: "withheld",
    reason: "routeCompositionUnavailable"});
  assert.equal(h.requests.length, 0);
});

async function withdrawalHarness(realDb?: Firestore, id = "withdrawal") {
  const h = await harness(realDb, id);
  const withdrawal = new SmsWithdrawalStore(h.db, () => h.clock.now);
  const credential = {linkId: h.link.linkId, secret: h.link.secret};
  const request = {...credential, requestId: "stop-texts", expectedRevision: 1};
  return {...h, withdrawal, credential, request};
}

test("SMS claim installs withdrawal authority without exposing guest identity",
  async () => {
    const h = await withdrawalHarness();
    await assert.rejects(h.withdrawal.get(h.credential), /unavailable/);
    await h.worker.dispatch(h.messageId, h.link.linkId);
    const view = await h.withdrawal.get(h.credential);
    assert.equal(view.view.preference, "enabled");
    for (const hidden of [h.link.secret, h.attendeeId, h.permission.phoneE164,
      h.permission.evidence!.subjectUid, h.context.eventId]) {
      assert.equal(JSON.stringify(view).includes(hidden), false);
    }
    assert.ok(await h.read(SMS_WITHDRAWAL_GRANTS + "/" + h.link.linkId));
    assert.equal(JSON.stringify(h.fake.entries()).includes(h.link.secret),
      false);
  });

test("withdrawal survives expired instructions, cancellation and paused sender",
  async () => {
    const h = await withdrawalHarness();
    await h.worker.dispatch(h.messageId, h.link.linkId);
    const roster = await h.read(h.attendeePath);
    h.clock.now = h.link.expiresAt + 1;
    await h.write("events/" + h.context.eventId,
      {...(await h.read("events/" + h.context.eventId)), status: "cancelled"});
    await h.write(h.senderPath, {...h.sender, status: "paused"});
    await assert.rejects(h.guests.getView(h.link.linkId, h.link.secret),
      /unavailable/);
    const result = await h.withdrawal.withdraw(h.request);
    assert.equal(result.view.preference, "disabled");
    const permission = parseSmsPermission(await h.read(h.permissionPath));
    const receipt = parseSmsConsentReceipt(await h.read(SMS_CONSENT_RECEIPTS +
      "/" + permission.currentReceiptId));
    assert.equal(receipt.source, "messageLink");
    assert.equal(receipt.actorUid, null);
    assert.equal(receipt.linkId, h.link.linkId);
    assert.deepEqual(await h.read(h.attendeePath), roster);
    assert.equal(h.requests.length, 1);
  });

test("old withdrawal requests cannot undo later verified consent",
  async () => {
    const h = await withdrawalHarness();
    await h.worker.dispatch(h.messageId, h.link.linkId);
    await h.withdrawal.withdraw(h.request);
    const actor = {uid: "guest-uid", phone: "+919999999999"};
    const scope = {eventId: h.context.eventId, attendeeId: h.attendeeId};
    assert.equal((await h.preferences.get(actor, scope)).view.preference,
      "disabled");
    h.clock.now++;
    const review = (await h.preferences.get(actor, scope)).view;
    await h.preferences.set(actor, {...scope, requestId: "enable-again",
      expectedReviewHash: review.reviewHash,
      expectedRevision: 2, decision: {kind: "grant",
        copyVersion: "catch-event-service-sms-v1"}});
    assert.equal((await h.withdrawal.withdraw(h.request)).view.preference,
      "enabled");
    const stale = await h.withdrawal.withdraw({...h.request,
      requestId: "old-tab"});
    assert.equal(stale.outcome, "conflict");
    assert.equal(stale.view.revision, 3);
    await assert.rejects(h.withdrawal.withdraw({...h.request,
      expectedRevision: 3}), /new text withdrawal request/);
    await h.withdrawal.withdraw({...h.request, requestId: "stop-current",
      expectedRevision: 3});
    assert.equal((await h.preferences.get(actor, scope)).view.preference,
      "disabled");
  });

test("withdrawal rejects changed credentials, revocation and replacement scope",
  async () => {
    for (const change of ["secret", "revoked", "generation", "subject",
      "expiry", "clock"]) {
      const h = await withdrawalHarness();
      await h.worker.dispatch(h.messageId, h.link.linkId);
      if (change === "secret") h.credential.secret = "z".repeat(43);
      if (change === "revoked") await h.guests.revokeLink(h.link.linkId);
      if (change === "generation") {
        await h.write(h.permissionPath,
          {...h.permission, attendeeGeneration: "c".repeat(64)});
      }
      if (change === "subject") {
        await h.write(h.permissionPath,
          {...h.permission, recipientBinding: {...h.permission.recipientBinding,
            subjectUid: "replacement-guest"},
          evidence: {...h.permission.evidence,
            subjectUid: "replacement-guest"}});
      }
      if (change === "expiry") h.clock.now = h.permission.expiresAt;
      if (change === "clock") h.clock.now--;
      await assert.rejects(h.withdrawal.get(h.credential), /unavailable/,
        change);
    }
  });

test("failed claims and failed withdrawals leave no partial changes",
  async () => {
    const h = await withdrawalHarness();
    const outbox = h.store.outbox(h.link.linkId);
    const reserved = await outbox.reserve(h.messageId);
    h.fake.failNextCommit = true;
    await assert.rejects(outbox.claimLiveDispatch(h.messageId,
      reserved.record.attempts[0].attemptId,
      h.store.prepare(h.link.linkId, h.sender)), /interruption/);
    assert.equal(await h.read(SMS_WITHDRAWAL_GRANTS + "/" + h.link.linkId),
      undefined);
    await outbox.claimLiveDispatch(h.messageId,
      reserved.record.attempts[0].attemptId,
      h.store.prepare(h.link.linkId, h.sender));
    const before = h.fake.entries();
    h.fake.failNextCommit = true;
    await assert.rejects(h.withdrawal.withdraw(h.request), /interruption/);
    assert.deepEqual(h.fake.entries(), before);
    await h.withdrawal.withdraw(h.request);
    assert.equal((await h.withdrawal.get(h.credential)).view.preference,
      "disabled");
  });

test("unauthenticated withdrawal callable permits only a scoped stop action",
  async () => {
    const h = await withdrawalHarness();
    await h.worker.dispatch(h.messageId, h.link.linkId);
    const rates: string[] = [];
    const deps = {firestore: () => h.db, now: () => h.clock.now,
      checkRateLimit: async (_db: Firestore, identity: string) => {
        rates.push(identity);
      }};
    const request = {data: h.request, rawRequest: {ip: "127.0.0.1"}} as
      CallableRequest<unknown>;
    await assert.rejects(withdrawEventAssistanceSmsHandler({...request,
      data: {...h.request, decision: "grant"}}, deps), /additional properties/);
    assert.equal(rates.length, 0);
    const response = await withdrawEventAssistanceSmsHandler(request, deps);
    assert.equal(response.view.preference, "disabled");
    assert.equal(rates.length, 2);
    assert.equal(JSON.stringify(rates).includes(h.link.secret), false);
  });

test("Firestore deduplicates competing message-link withdrawals", {
  skip: !process.env.FIRESTORE_EMULATOR_HOST, timeout: 60_000,
}, async () => {
  assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? "",
    /^(127\.0\.0\.1|localhost|\[::1\]):\d+$/);
  const id = randomUUID();
  const app = initializeApp({projectId: "demo-catch-rules"}, "withdraw-" + id);
  try {
    const h = await withdrawalHarness(getEmulatorFirestore(app), id);
    await h.worker.dispatch(h.messageId, h.link.linkId);
    const results = await Promise.all(Array.from({length: 8}, () =>
      h.withdrawal.withdraw(h.request)));
    assert.equal(results.filter((r) => r.outcome === "applied").length, 1);
    assert.equal(results.filter((r) => r.outcome === "replayed").length, 7);
    assert.equal((await h.withdrawal.get(h.credential)).view.revision, 2);
  } finally {
    await deleteApp(app);
  }
});

test("withdrawing through a sent link suppresses another queued SMS",
  async () => {
    const h = await withdrawalHarness();
    await h.worker.dispatch(h.messageId, h.link.linkId);
    const next: Intent = {...h.intent, intentId: "next-update",
      workflow: {kind: "lateJoin", occurrenceId: "next-stop"}};
    const thread = await h.guests.publishMessage(next, null);
    const link = await h.guests.issueLink(thread.threadId, "next-link", keys);
    const nextId = assistanceMessageId(next);
    await h.store.outbox(link.linkId).reserve(nextId);
    await h.withdrawal.withdraw(h.request);
    await h.worker.dispatch(nextId, link.linkId);
    assert.equal(h.requests.length, 1);
  });

test("SMS withholds a withdrawal binding stored under the wrong link",
  async () => {
    const h = await withdrawalHarness();
    const grant = parseGrant(await h.read(guestCollections.grants +
      "/" + h.link.linkId));
    const authority = newSmsWithdrawalGrant(h.permission, grant, h.clock.now);
    await h.write(SMS_WITHDRAWAL_GRANTS + "/" + h.link.linkId,
      {...authority, linkId: "c".repeat(32)});
    const result = await h.worker.dispatch(h.messageId, h.link.linkId);
    assert.equal(result.kind, "withheld");
    assert.equal(h.requests.length, 0);
  });

async function deliveryReport(h: Awaited<ReturnType<typeof harness>>) {
  const form = new URLSearchParams(String(h.requests.at(-1)?.init?.body));
  const record = await h.store.outbox(h.link.linkId).get(h.messageId);
  assert.ok(record);
  const dispatch = await h.read(smsCollections.dispatches + "/" +
    record.attempts[0].attemptId);
  assert.ok(dispatch);
  return {msg_id: form.get("msg_id")!, extra: form.get("extra")!,
    externalId: "660362025761505631-520576818555598760",
    deliveredTS: String(h.clock.now), status: "SUCCESS", cause: "SUCCESS",
    errCode: "000", phoneNo: "919999999999",
    noOfFrags: String(dispatch.segments), mask: "CATCHS"};
}

test("authenticated SMS delivery reconciles a lost response after closure",
  async () => {
    const h = await harness();
    h.transport.error = true;
    await h.worker.dispatch(h.messageId, h.link.linkId);
    const report = await deliveryReport(h);
    const outbox = h.store.outbox(h.link.linkId);
    const before = await outbox.get(h.messageId);
    assert.equal(before?.attempts[0].state.kind, "unknown");
    await outbox.close(h.messageId, before!.revision, "cancelled");
    await h.write(h.senderPath, {...h.sender, status: "paused"});
    await h.write("events/" + h.context.eventId, {status: "cancelled"});
    await h.write(h.attendeePath,
      {status: "cancelled", linkedUid: "replacement"});
    h.clock.now += 2 * 86_400_000;
    const budgets = await Promise.all(h.budgetPaths.map(h.read));
    const reports = new SmsDeliveryReportStore(h.db, () => h.clock.now);
    assert.deepEqual(await reports.receive(report), {kind: "recorded",
      messageId: h.messageId, disposition: "applied"});
    const after = await outbox.get(h.messageId);
    assert.equal(after?.lifecycle, "cancelled");
    assert.deepEqual(after?.attempts[0].state, {kind: "delivered",
      at: h.clock.now, providerMessageId: report.externalId});
    assert.deepEqual(await Promise.all(h.budgetPaths.map(h.read)), budgets);
    assert.equal(h.requests.length, 1);
  });

test("SMS reports require their issued credential and exact dispatch scope",
  async () => {
    const h = await harness();
    await h.worker.dispatch(h.messageId, h.link.linkId);
    const report = await deliveryReport(h);
    const reports = new SmsDeliveryReportStore(h.db, () => h.clock.now);
    const before = h.fake.entries();
    for (const change of [
      {extra: undefined}, {extra: "a".repeat(48)}, {extra: [report.extra]},
      {msg_id: "catchSms1" + "b".repeat(64)}, {msg_id: [report.msg_id]},
      {externalId: "123-456"}, {phoneNo: "918888888888"}, {mask: "CHANGD"},
      {noOfFrags: report.noOfFrags === "1" ? "2" : "1"},
      {noOfFrags: "7"}, {deliveredTS: String(start - 300_001)},
      {deliveredTS: String(start + 300_001)}, {deliveredTS: "NaN"},
      {deliveredTS: String(start / 1000)}, {status: "DELIVERED"},
    ]) {
      assert.deepEqual(await reports.receive({...report, ...change}),
        {kind: "rejected"}, Object.keys(change).join(","));
      assert.deepEqual(h.fake.entries(), before);
    }
    for (const malformed of [null, [], "raw query", {msg_id: report.msg_id}]) {
      assert.deepEqual(await reports.receive(malformed), {kind: "rejected"});
    }
    assert.deepEqual(await reports.receive({...report, mask: undefined}),
      {kind: "recorded", messageId: h.messageId, disposition: "applied"});
  });

test("unknown SMS reports never manufacture failure or another send",
  async () => {
    const h = await harness();
    h.transport.error = true;
    await h.worker.dispatch(h.messageId, h.link.linkId);
    const report = await deliveryReport(h);
    const reports = new SmsDeliveryReportStore(h.db, () => h.clock.now);
    const before = h.fake.entries();
    for (const change of [
      {status: "UNKNOWN"},
      {status: "FAILURE", cause: "DEFERRED", errCode: "10"},
      {status: "FAILURE", cause: "SMSCTIMEDOUT", errCode: "00c"},
      {status: "FAILURE", cause: "NO_ACK_FROM_OPERATOR", errCode: "13"},
      {status: "FAILURE", cause: "OTHER", errCode: "24"},
      {status: "FAILURE", cause: "SERVICE_DOWN", errCode: "999"},
      {status: "FAILURE", cause: "DND_FAIL", errCode: "004"},
      {status: "SUCCESS", cause: "DND_FAIL", errCode: "006"},
    ]) {
      assert.deepEqual(await reports.receive({...report, ...change}),
        {kind: "unconfirmed", messageId: h.messageId}, change.cause);
      assert.deepEqual(h.fake.entries(), before);
    }
    h.clock.now += 121_000;
    const result = await h.worker.dispatch(h.messageId, h.link.linkId);
    assert.ok(result.kind === "waiting");
    assert.equal(result.decision.kind, "reconcile");
    assert.equal(h.requests.length, 1);
  });

test("SMS final causes retain technical, suppression and policy meaning",
  async () => {
    for (const [code, cause, classification] of [
      ["001", "ABSENT_SUBSCRIBER", "technical"],
      ["004", "SERVICE_DOWN", "technical"],
      ["005", "SYSTEM_FAILURE", "technical"],
      ["011", "INBOXFULL", "technical"],
      ["012", "CONGESTION", "technical"],
      ["002", "CALL_BARRED", "suppressed"],
      ["006", "DND_FAIL", "suppressed"],
      ["007", "BLOCKED", "suppressed"],
      ["022", "BLOCKED_FOR_USER", "suppressed"],
      ["003", "UNKNOWN_SUBSCRIBER", "invalidRecipient"],
      ["023", "UNKNOWN_SUBSCRIBER", "invalidRecipient"],
      ["008", "DND_TIMEOUT", "policy"],
      ["009", "OUTSIDE_WORKING_HOURS", "policy"],
      ["00b", "BLOCKED_MASK", "policy"],
      ["038", "MSG_DOES_NOT_MATCH_TEMPLATE", "policy"],
    ]) {
      const h = await harness();
      await h.worker.dispatch(h.messageId, h.link.linkId);
      const report = {...await deliveryReport(h), status: "FAILURE",
        cause, errCode: code};
      const reports = new SmsDeliveryReportStore(h.db, () => h.clock.now);
      const result = await reports.receive(report);
      assert.equal(result.kind, "recorded", cause);
      const record = await h.store.outbox(h.link.linkId).get(h.messageId);
      const state = record!.attempts[0].state;
      assert.ok(state.kind === "failed");
      assert.equal(state.classification, classification, cause);
      assert.match(state.evidenceId, /^sms-dlr:[a-f0-9]{64}$/);
      assert.equal(h.requests.length, 1);
    }
  });

async function receiveHttpReport(store: SmsDeliveryReportStore,
  report: Record<string, string>) {
  const received: Awaited<ReturnType<SmsDeliveryReportStore["receive"]>>[] = [];
  let status = 0;
  let body: unknown;
  const response = {
    set: () => response,
    status: (value: number) => {
      status = value; return response;
    },
    send: (value: unknown) => {
      body = value; return response;
    },
  };
  await eventAssistanceSmsDeliveryWebhookHandler({method: "GET",
    originalUrl: "/?" + new URLSearchParams(report), headers: {},
    rawBody: Buffer.alloc(0)} as Request, response as unknown as Response, {
      enabled: () => true,
      receive: async (value) => {
        const result = await store.receive(value);
        received.push(result);
        return result;
      },
      failed: () => assert.fail("HTTP delivery reporting failed"),
    });
  assert.equal(received.length, 1);
  const rejected = received[0].kind === "rejected";
  assert.equal(status, rejected ? 403 : 200);
  assert.equal(body, rejected ? "Invalid report" : "ok");
  return received[0];
}

async function competingReports(h: Awaited<ReturnType<typeof harness>>) {
  await h.worker.dispatch(h.messageId, h.link.linkId);
  const report = await deliveryReport(h);
  const reports = new SmsDeliveryReportStore(h.db, () => h.clock.now);
  assert.deepEqual(await receiveHttpReport(reports,
    {...report, extra: "c".repeat(48)}), {kind: "rejected"});
  const results = await Promise.all(Array.from({length: 8}, () =>
    receiveHttpReport(reports, report)));
  assert.equal(results.filter((r) => r.kind === "recorded" &&
    r.disposition === "applied").length, 1);
  assert.equal(results.filter((r) => r.kind === "recorded" &&
    r.disposition === "duplicateOrOlder").length, 7);
  assert.deepEqual(await receiveHttpReport(reports,
    {...report, status: "FAILURE",
      cause: "SERVICE_DOWN", errCode: "004"}), {kind: "recorded",
    messageId: h.messageId, disposition: "conflictingEvidence"});
  const record = await h.store.outbox(h.link.linkId).get(h.messageId);
  assert.equal(record?.deliveryConflict, true);
  assert.equal(record?.attempts[0].state.kind, "delivered");
  await h.worker.dispatch(h.messageId, h.link.linkId);
  assert.equal(h.requests.length, 1);
}

test("duplicate SMS reports converge and contradictory reports retain evidence",
  async () => competingReports(await harness()));

test("Firestore deduplicates competing SMS delivery reports", {
  skip: !process.env.FIRESTORE_EMULATOR_HOST, timeout: 60_000,
}, async () => {
  assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? "",
    /^(127\.0\.0\.1|localhost|\[::1\]):\d+$/);
  const id = randomUUID();
  const app = initializeApp({projectId: "demo-catch-rules"}, "sms-dlr-" + id);
  try {
    await competingReports(await harness(getEmulatorFirestore(app), id));
  } finally {
    await deleteApp(app);
  }
});

test("changed destination between reservation and SMS claim prevents sending",
  async () => {
    const h = await harness();
    const outbox = h.store.outbox(h.link.linkId);
    const reserved = await outbox.reserve(h.messageId);
    assert.equal(reserved.decision.kind, "dispatch");
    await h.progress.confirm("two");
    const claim = await outbox.claimLiveDispatch(h.messageId,
      reserved.record.attempts[0].attemptId,
      h.store.prepare(h.link.linkId, h.sender));
    assert.equal(claim.kind, "withheld");
    const result = await h.worker.dispatch(h.messageId, h.link.linkId);
    assert.notEqual(result.kind, "submitted");
    assert.equal(h.requests.length, 0);
    for (const path of h.budgetPaths) {
      assert.equal(parseSmsBudget(await h.read(path)).chargedMicros, 0);
    }
  });

test("temporary progress read failure leaves an SMS reservation retryable",
  async () => {
    const h = await harness();
    const outbox = h.store.outbox(h.link.linkId);
    const reserved = await outbox.reserve(h.messageId);
    assert.equal(reserved.decision.kind, "dispatch");
    h.fake.beforeRead = (path) => {
      if (path.startsWith("eventAssistanceGroupProgress/")) {
        throw new Error("temporary progress read failure");
      }
    };
    await assert.rejects(outbox.claimLiveDispatch(h.messageId,
      reserved.record.attempts[0].attemptId,
      h.store.prepare(h.link.linkId, h.sender)), /temporary progress/);
    assert.deepEqual(await outbox.get(h.messageId), reserved.record);
    assert.equal(h.requests.length, 0);
    h.fake.beforeRead = undefined;
    assert.equal((await h.worker.dispatch(h.messageId, h.link.linkId)).kind,
      "submitted");
    assert.equal(h.requests.length, 1);
  });
