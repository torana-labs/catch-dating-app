import {getEmulatorFirestore} from "../../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import test from "node:test";
import {randomUUID} from "node:crypto";
import {deleteApp, initializeApp} from "firebase-admin/app";
import {Firestore} from "firebase-admin/firestore";
import {harness, worker, keys, start, queuedStatus} from
  "./whatsappTestHarness";
import {EventMessageWorker} from "./messageWorker";
import {EventSmsWorker} from "./smsWorker";
import {SmsDispatchStore, smsBudgetId, smsBudgetScopes, smsCollections} from
  "./smsDispatchStore";
import {SmsPreferenceStore} from "./smsPreferenceStore";
import {GupshupSmsProvider} from "./gupshupSmsProvider";
import type {SmsConfig} from "./smsProtocol";
import type {MessageRecord} from "./messageOutbox";
import type {VerifiedDeliveryReceipt} from "./deliveryReceipts";
import {newMessageRecord} from "./messageOutbox";
import {WHATSAPP_DISPATCHES} from "./whatsappSpend";
import {whatsappStatusCorrelation} from "./whatsappDeliveryProtocol";
import {WhatsappDeliveryStore} from "./whatsappDeliveryStore";

type Routes = MessageRecord["intent"]["permittedRoutes"];
async function mixed(realDb?: Firestore, id = "test", routes: Routes =
["organizerEventWhatsapp", "catchEventSms"]) {
  const h = await harness(realDb, id, routes);
  const sender: SmsConfig = {schemaVersion: 1, senderId: "sms-" + id,
    revision: 1, provider: "gupshup", senderIdentity: "catchPlatform",
    country: "IN", status: "ready", mask: "CATCHS",
    principalEntityId: "100100100100",
    credentialVersion: "projects/demo/secrets/SMS_FIXTURE/versions/1",
    activation: {useCaseApprovalId: "fixture", senderApprovalId: "fixture",
      approvedAt: start - 1000, validUntil: start + 3_600_000},
    maxSegments: 3, quote: {revision: 1, currency: "INR",
      maxMicrosPerSegment: 500_000, validUntil: start + 3_600_000},
    templates: [{templateId: "fixture-joining", revision: 1,
      purpose: "joiningUpdate", dltTemplateId: "100200200200",
      status: "approved", parts: [{kind: "literal", text: "Catch: "},
        {kind: "variable", name: "instruction", maxCharacters: 180},
        {kind: "literal", text: " Reply: "},
        {kind: "variable", name: "responseUrl", maxCharacters: 160}]}]};
  const smsSenderPath = smsCollections.senders + "/" + sender.senderId;
  await h.write(smsSenderPath, sender);
  const smsPreferences = new SmsPreferenceStore(h.db, () => h.clock.now,
    sender.senderId);
  const smsScope = {eventId: h.context.eventId,
    attendeeId: h.scope.attendeeId};
  const smsReview = (await smsPreferences.get(h.actor, smsScope)).view;
  await smsPreferences.set(h.actor, {...smsScope, requestId: "sms-grant",
    expectedReviewHash: smsReview.reviewHash,
    expectedRevision: null, decision: {kind: "grant",
      copyVersion: "catch-event-service-sms-v1"}});
  const smsBudgets: string[] = [];
  for (const scope of smsBudgetScopes(h.context, start)) {
    const begins = scope.kind === "senderDay" ?
      Date.parse(scope.day + "T00:00:00+05:30") : start - 1000;
    const budgetId = smsBudgetId(sender.senderId, scope);
    const path = smsCollections.budgets + "/" + budgetId;
    smsBudgets.push(path);
    await h.write(path, {schemaVersion: 1,
      channel: "sms", budgetId, revision: 1,
      senderId: sender.senderId, scope, status: "active",
      approvalId: "fixture", currency: "INR", limitMicros: 10_000_000,
      chargedMicros: 0, startsAt: begins, endsAt: scope.kind === "senderDay" ?
        begins + 86_400_000 : start + 3_600_000, updatedAt: start});
  }
  const smsStore = new SmsDispatchStore(h.db, sender.senderId, keys,
    () => h.clock.now);
  const requests: Array<{route: "sms" | "whatsapp"; body: string}> = [];
  const behavior = {waUnknown: false, smsUnknown: false,
    waCredentialMissing: false, smsCredentialMissing: false,
    afterCredentials: async () => undefined as void};
  const sms = new EventSmsWorker(smsStore, {access: async () => {
    if (behavior.smsCredentialMissing) throw new Error("fixture-unavailable");
    await behavior.afterCredentials();
    return {schema: "catch.event-sms-credential/v1", senderId: sender.senderId,
      userid: "1234", password: "fixture-only"};
  }}, new GupshupSmsProvider(async (_, init) => {
    requests.push({route: "sms", body: init!.body as string});
    if (behavior.smsUnknown) throw new Error("fixture-lost-response");
    return new Response("success|919999999999|1234-5678");
  }, () => h.clock.now), () => h.clock.now);
  const whatsapp = worker(h, async (_, init) => {
    requests.push({route: "whatsapp", body: init!.body as string});
    if (behavior.waUnknown) throw new Error("fixture-lost-response");
    return Response.json({messages: [{id: "wamid.fixture"}]});
  }, async () => {
    if (behavior.waCredentialMissing) throw new Error("fixture-unavailable");
    return "fixture-token";
  });
  const service = new EventMessageWorker(h.db, {sms, whatsapp},
    () => h.clock.now);
  const dispatch = () => service.dispatch(h.messageId, h.link.linkId);
  const record = async () => (await h.outbox.get(h.messageId))!;
  const revokeSms = async () => smsPreferences.set(h.actor, {...smsScope,
    expectedReviewHash: (await smsPreferences.get(h.actor, smsScope))
      .view.reviewHash,
    requestId: "sms-withdraw", expectedRevision: 1,
    decision: {kind: "revoke"}});
  const revokeWa = () => h.preferences.set(h.actor, {...h.scope,
    requestId: "wa-withdraw", expectedRevision: 1,
    decision: {kind: "revoke"}});
  // This is already normalized, trusted test evidence. Raw Meta failures do
  // not acquire a technical classification through this test helper.
  const receipt = async (state: VerifiedDeliveryReceipt["state"],
    ordinal = 1) => {
    const attempt = (await record()).attempts[ordinal - 1];
    assert.ok(attempt?.mode === "live");
    return h.outbox.recordReceipt(h.messageId, {attemptId: attempt.attemptId,
      ...attempt.binding, providerEventId: "fixture-" + ordinal + state.kind,
      receivedAt: h.clock.now, state});
  };
  const whatsappStatus = async (status: string,
    overrides: Record<string, unknown> = {}) => {
    const attemptId = (await record()).attempts[0].attemptId;
    const dispatch = (await h.read(WHATSAPP_DISPATCHES + "/" + attemptId))!;
    const eventId = await queuedStatus(h, whatsappStatusCorrelation(attemptId,
      String(dispatch.payloadHash)), status,
    {id: "wamid.fixture", ...overrides});
    return new WhatsappDeliveryStore(h.db, () => h.clock.now)
      .consumeQueued(eventId);
  };
  return {...h, sms, smsStore, whatsapp, sender, smsSenderPath,
    smsPreferences, smsBudgets, requests, behavior, service, dispatch,
    record, revokeSms, revokeWa, receipt, whatsappStatus};
}

test("one channel history selects WhatsApp then bounded confirmed SMS fallback",
  async () => {
    const h = await mixed();
    const first = await Promise.all(Array.from({length: 8}, h.dispatch));
    assert.equal(first.filter((r) => r.kind === "submitted").length, 1);
    assert.deepEqual(h.requests.map((r) => r.route), ["whatsapp"]);
    for (const path of h.smsBudgets) {
      assert.equal((await h.read(path))!.chargedMicros, 0);
    }
    const reports = await Promise.all(Array.from({length: 8}, () =>
      h.whatsappStatus("failed", {errors: [{code: 131016}]})));
    assert.equal(reports.filter((r) => r.kind === "recorded" &&
      r.disposition === "applied").length, 1);
    assert.equal(reports.filter((r) => r.kind === "recorded" &&
      r.disposition === "duplicateOrOlder").length, 7);
    assert.deepEqual(await h.dispatch(), {kind: "waiting", decision: {
      kind: "wait", notBefore: h.clock.now + 1000, reason: "retryBackoff"}});
    h.clock.now += 1000;
    const second = await Promise.all(Array.from({length: 8}, h.dispatch));
    assert.equal(second.filter((r) => r.kind === "submitted").length, 1);
    assert.deepEqual(h.requests.map((r) => r.route), ["whatsapp", "sms"]);
    const record = await h.record();
    assert.equal(record.attempts.length, 2);
    assert.deepEqual(record.attempts.map((a) => a.mode === "live" &&
      a.binding.routeId), ["organizerEventWhatsapp", "catchEventSms"]);
    const payload = new URLSearchParams(h.requests[1].body);
    assert.ok(payload.get("msg")!
      .includes(h.link.linkId + "#" + h.link.secret));
    for (const path of [...h.budgetPaths, ...h.smsBudgets]) {
      assert.equal((await h.read(path))!.revision, 2);
      assert.ok(Number((await h.read(path))!.chargedMicros) > 0);
    }
    await h.receipt({kind: "delivered", at: h.clock.now,
      providerMessageId: "1234-5678"}, 2);
    assert.equal((await h.dispatch()).kind, "waiting");
    assert.equal(h.requests.length, 2);
  });

test("signed temporary failure recovers a lost submission without guessing",
  async () => {
    const h = await mixed();
    h.behavior.waUnknown = true;
    await h.dispatch();
    assert.equal((await h.record()).attempts[0].state.kind, "unknown");
    await h.whatsappStatus("failed", {errors: [{code: 130429}]});
    h.clock.now += 1000;
    await h.dispatch();
    assert.deepEqual(h.requests.map((r) => r.route), ["whatsapp", "sms"]);
    const failure = (await h.record()).attempts[0].state;
    assert.ok(failure.kind === "failed");
    assert.equal(failure.providerMessageId, "wamid.fixture");
  });

test("ambiguous, mixed and policy failures cannot select SMS",
  async () => {
    for (const codes of [[131026], [131000], [999999], [],
      [131016, 131026], [131048], [131016, 131050], [130429, 131049]]) {
      const h = await mixed();
      await h.dispatch();
      await h.whatsappStatus("failed", {errors: codes.map((code) => ({code}))});
      h.clock.now += 2000;
      const result = await h.dispatch();
      assert.equal(result.kind, "waiting", String(codes));
      assert.deepEqual(h.requests.map((r) => r.route), ["whatsapp"]);
      assert.equal((await h.record()).attempts.length, 1);
      for (const path of h.smsBudgets) {
        assert.equal((await h.read(path))!.chargedMicros, 0);
      }
    }
  });

test("signed failure cannot replace independent SMS permission",
  async () => {
    const h = await mixed();
    await h.dispatch();
    await h.whatsappStatus("failed", {errors: [{code: 131016}]});
    await h.revokeSms();
    h.clock.now += 1000;
    assert.deepEqual(await h.dispatch(), {kind: "waiting", decision: {
      kind: "hostDecision", reason: "noEligibleRoute"}});
    assert.deepEqual(h.requests.map((r) => r.route), ["whatsapp"]);
  });

test("unknown or accepted outcomes hold fallback after a channel disappears",
  async () => {
    for (const unknown of [false, true]) {
      const h = await mixed();
      h.behavior.waUnknown = unknown;
      await h.dispatch();
      h.clock.now += 121_000;
      h.behavior.waCredentialMissing = true;
      const result = await h.dispatch();
      assert.ok(result.kind === "waiting");
      assert.equal(result.decision.kind, "reconcile");
      assert.equal(h.requests.length, 1);
      assert.equal((await h.record()).attempts.length, 1);
      for (const path of h.smsBudgets) {
        assert.equal((await h.read(path))!.revision, 1);
      }
    }
  });

test("preflight fallback needs independent SMS consent and an allowed route",
  async () => {
    for (const condition of ["waWithdrawn", "bothWithdrawn", "credential",
      "unpermitted", "rcs", "smsFirst"]) {
      const routes: Routes = condition === "unpermitted" ?
        ["organizerEventWhatsapp"] : condition === "rcs" ?
          ["catchEventRcs", "catchEventSms"] : condition === "smsFirst" ?
            ["catchEventSms", "organizerEventWhatsapp"] :
            ["organizerEventWhatsapp", "catchEventSms"];
      const h = await mixed(undefined, "test", routes);
      if (["waWithdrawn", "bothWithdrawn", "unpermitted"]
        .includes(condition)) await h.revokeWa();
      if (condition === "bothWithdrawn") await h.revokeSms();
      if (condition === "credential") h.behavior.waCredentialMissing = true;
      await h.dispatch();
      const blocked = ["bothWithdrawn", "unpermitted"].includes(condition);
      assert.deepEqual(h.requests.map((r) => r.route), blocked ? [] : ["sms"],
        condition);
      assert.equal((await h.record()).attempts.length, blocked ? 0 : 1);
    }
  });

test("policy and recipient rejections require resolution across both channels",
  async () => {
    for (const classification of
      ["policy", "suppressed", "invalidRecipient"] as const) {
      const h = await mixed();
      await h.dispatch();
      await h.receipt({kind: "failed", at: h.clock.now,
        providerMessageId: "wamid.fixture", classification,
        evidenceId: "fixture-reviewed-rejection"});
      h.clock.now += 2000;
      assert.deepEqual(await h.dispatch(), {kind: "waiting", decision: {
        kind: "hostDecision", reason: classification === "invalidRecipient" ?
          "recipientNeedsReview" : "policyRejected"}});
      assert.equal(h.requests.length, 1);
    }
  });

test("withdrawal or conflicting delivery before claim fences SMS",
  async () => {
    for (const change of ["withdraw", "delivered"]) {
      const h = await mixed();
      await h.dispatch();
      await h.whatsappStatus("failed", {errors: [{code: 131016}]});
      h.clock.now += 1000;
      const service = new EventMessageWorker(h.db, {whatsapp: h.whatsapp,
        sms: {prepareChannel: async (linkId) => {
          const channel = await h.sms.prepareChannel(linkId);
          assert.ok(channel.kind === "ready");
          return {...channel, dispatchReserved: async (...args) => {
            if (change === "withdraw") {
              await h.revokeSms();
            } else {
              await h.whatsappStatus("delivered");
            }
            return channel.dispatchReserved(...args);
          }};
        }}}, () => h.clock.now);
      const result = await service.dispatch(h.messageId, h.link.linkId);
      assert.ok(result.kind === "withheld");
      assert.equal(result.reason, change === "withdraw" ?
        "authorityChanged" : "deliveryConflict");
      assert.equal(h.requests.length, 1);
      for (const path of h.smsBudgets) {
        assert.equal((await h.read(path))!.revision, 1);
      }
    }
  });

test("changed credential snapshots are ineligible before a reservation exists",
  async () => {
    const h = await mixed(undefined, "test", ["catchEventSms"]);
    h.behavior.afterCredentials = async () => {
      await h.write(h.smsSenderPath, {...h.sender, revision: 2,
        credentialVersion: "projects/demo/secrets/SMS_FIXTURE/versions/2"});
    };
    assert.deepEqual(await h.dispatch(), {kind: "waiting", decision: {
      kind: "hostDecision", reason: "noEligibleRoute"}});
    assert.equal((await h.record()).attempts.length, 0);
    assert.equal(h.requests.length, 0);
  });

test("rehearsal and closed messages cannot prepare live channel credentials",
  async () => {
    for (const mode of ["rehearsal", "closed"]) {
      const h = await mixed();
      let preparations = 0;
      const sms = {prepareChannel: async () => {
        preparations++;
        throw new Error("Unexpected credential access");
      }};
      let messageId = h.messageId;
      if (mode === "rehearsal") {
        const intent = {...h.intent, context: {mode: "rehearsal" as const,
          rehearsalId: "practice", virtualEventId: h.intent.eventId,
          clockId: "virtual"}};
        const record = newMessageRecord(intent, h.clock.now);
        messageId = record.messageId;
        await h.write("eventAssistanceMessages/" + messageId, record);
      } else await h.outbox.close(messageId, 0, "cancelled");
      const service = new EventMessageWorker(h.db, {sms}, () => h.clock.now);
      const result = await service.dispatch(messageId, h.link.linkId);
      assert.deepEqual(result, mode === "rehearsal" ?
        {kind: "withheld", reason: "rehearsal"} :
        {kind: "waiting", decision: {kind: "stop", reason: "cancelled"}});
      assert.equal(preparations, 0);
    }
  });

test("single-channel stores cannot silently reserve mixed-route messages",
  async () => {
    const h = await mixed();
    await assert.rejects(h.outbox.reserve(h.messageId), /channel composer/);
    await assert.rejects(h.smsStore.outbox(h.link.linkId).reserve(h.messageId),
      /channel composer/);
    assert.equal((await h.record()).attempts.length, 0);
  });

test("Firestore arbitrates mixed-channel workers and their fallback budgets", {
  skip: !process.env.FIRESTORE_EMULATOR_HOST, timeout: 60_000,
}, async () => {
  assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? "",
    /^(127\.0\.0\.1|localhost|\[::1\]):\d+$/);
  const id = randomUUID();
  const app = initializeApp({projectId: "demo-catch-rules"}, "channels-" + id);
  try {
    const h = await mixed(getEmulatorFirestore(app), id);
    const contend = () => Promise.all(Array.from({length: 8}, h.dispatch));
    assert.equal((await contend()).filter((r) =>
      r.kind === "submitted").length, 1);
    const reports = await Promise.all(Array.from({length: 8}, () =>
      h.whatsappStatus("failed", {errors: [{code: 131016}]})));
    assert.equal(reports.filter((r) => r.kind === "recorded" &&
      r.disposition === "applied").length, 1);
    assert.equal(reports.filter((r) => r.kind === "recorded" &&
      r.disposition === "duplicateOrOlder").length, 7);
    h.clock.now += 1000;
    assert.equal((await contend()).filter((r) =>
      r.kind === "submitted").length, 1);
    assert.deepEqual(h.requests.map((r) => r.route), ["whatsapp", "sms"]);
    const record = await h.record();
    assert.equal(record.attempts.length, 2);
    assert.ok(await h.read(WHATSAPP_DISPATCHES + "/" +
      record.attempts[0].attemptId));
    assert.ok(await h.read(smsCollections.dispatches + "/" +
      record.attempts[1].attemptId));
    for (const path of [...h.budgetPaths, ...h.smsBudgets]) {
      assert.equal((await h.read(path))!.revision, 2);
    }
  } finally {
    await deleteApp(app);
  }
});

test("a worker interrupted before claim recovers without a duplicate or debit",
  async () => {
    const h = await mixed();
    const interrupted = new EventMessageWorker(h.db, {sms: h.sms,
      whatsapp: {prepareChannel: async (linkId) => {
        const channel = await h.whatsapp.prepareChannel(linkId);
        assert.ok(channel.kind === "ready");
        return {...channel, dispatchReserved: async () => {
          throw new Error("fixture-worker-interrupted");
        }};
      }}}, () => h.clock.now);
    await assert.rejects(interrupted.dispatch(h.messageId, h.link.linkId),
      /fixture-worker-interrupted/);
    const first = (await h.record()).attempts[0];
    assert.equal(first.state.kind, "reserved");
    assert.equal(h.requests.length, 0);
    for (const path of [...h.budgetPaths, ...h.smsBudgets]) {
      assert.equal((await h.read(path))!.revision, 1);
    }
    h.clock.now = first.authorization.validUntil;
    assert.deepEqual(await h.dispatch(), {kind: "waiting", decision: {
      kind: "wait", notBefore: h.clock.now + 1000, reason: "retryBackoff"}});
    h.clock.now += 1000;
    const result = await h.dispatch();
    assert.ok(result.kind === "submitted");
    assert.equal(result.routeId, "organizerEventWhatsapp");
    assert.deepEqual(h.requests.map((r) => r.route), ["whatsapp"]);
    const attempts = (await h.record()).attempts;
    assert.equal(attempts.length, 2);
    assert.notEqual(attempts[1].attemptId, first.attemptId);
    assert.deepEqual(attempts[0], {...first, state: {kind: "notDispatched",
      at: first.authorization.validUntil, reason: "reservationExpired"}});
    for (const path of h.budgetPaths) {
      assert.equal((await h.read(path))!.revision, 2);
    }
    for (const path of h.smsBudgets) {
      assert.equal((await h.read(path))!.revision, 1);
    }
    await h.dispatch();
    assert.equal(h.requests.length, 1);
  });
