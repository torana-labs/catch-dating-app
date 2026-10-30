import {getEmulatorFirestore} from "../../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import test from "node:test";
import {createHash, createHmac, randomUUID} from "node:crypto";
import {deleteApp, initializeApp} from "firebase-admin/app";
import {Timestamp} from "firebase-admin/firestore";
import {operationContentHash} from "../../operations/durableActions";
import {ingestMetaWhatsappWebhook} from
  "../../organizers/organizerWhatsappWebhook";
import {MetaWhatsappProvider} from
  "../../organizers/organizerWhatsappProvider";
import {WHATSAPP_ENDPOINT_STOPS, parseWhatsappStop, whatsappStopId} from
  "../../shared/organizerWhatsappStops";
import {guestCollections, guestIdentity} from "./guestRecords";
import {readEventAssistanceMessageGate} from "./guestMessageGate";
import {parseMessageIntent} from "./messageProtocol";
import {assistanceMessageId} from "./messageOutbox";
import {WHATSAPP_CONSENT_RECEIPTS,
  parseWhatsappConsentReceipt} from "./whatsappConsent";
import {EventWhatsappWorker} from "./whatsappWorker";
import {WhatsappDeliveryStore} from "./whatsappDeliveryStore";
import {whatsappStatusCorrelation} from "./whatsappDeliveryProtocol";
import {WhatsappReplyStore} from "./whatsappReplyStore";
import {WhatsappWithdrawalStore} from "./whatsappWithdrawalStore";
import {WHATSAPP_WITHDRAWAL_GRANTS} from "./whatsappWithdrawalRecords";
import {getEventWhatsappWithdrawalHandler, withdrawEventWhatsappHandler} from
  "./whatsappWithdrawalHandlers";
import {Permission, WHATSAPP_PERMISSIONS, whatsappPermissionId,
  whatsappSenderHash} from "./whatsappPermissionRecords";
import {whatsappEndpointId, whatsappEndpointHash, WHATSAPP_REPLY_BINDINGS} from
  "./whatsappReplyProtocol";
import type {CallableRequest} from "firebase-functions/v2/https";
import {WHATSAPP_DISPATCHES} from "./whatsappSpend";
import {whatsappTemplateSnapshot} from
  "./whatsappTemplate";

import {start, keys, appSecret, harness, Harness, worker, queuedStatus} from
  "./whatsappTestHarness";
import {BRAND} from "../../shared/generated/brand";

function withdrawal(h: Harness) {
  const store = new WhatsappWithdrawalStore(h.db, () => h.clock.now);
  const credential = {linkId: h.link.linkId, secret: h.link.secret};
  const input = {...credential, requestId: "withdraw", expectedRevision: 1};
  const permissionPath = WHATSAPP_PERMISSIONS + "/" +
    whatsappPermissionId(h.context, h.scope.attendeeId, h.scope.senderId);
  return {store, credential, input, permissionPath};
}
test("WhatsApp withdrawal authority is issued atomically with dispatch",
  async () => {
    const h = await harness();
    const w = withdrawal(h);
    await assert.rejects(w.store.get(w.credential), /unavailable/);
    const reserved = await h.reserve();
    h.fake.failNextCommit = true;
    await assert.rejects(h.outbox.claimLiveDispatch(h.messageId,
      reserved.record.attempts[0].attemptId,
      h.store.prepare(h.link.linkId, h.expected)), /interruption/);
    assert.equal(await h.read(WHATSAPP_WITHDRAWAL_GRANTS + "/" +
      h.link.linkId), undefined);
    await h.claim();
    const view = await w.store.get(w.credential);
    assert.equal(view.view.preference, "enabled");
    const authority = await h.read(WHATSAPP_WITHDRAWAL_GRANTS + "/" +
      h.link.linkId);
    assert.equal(authority!.providerPhoneNumberId,
      h.expected.connection.phoneNumberId);
    const serialized = JSON.stringify([authority, view]);
    assert.equal(serialized.includes(h.actor.phone), false);
    assert.equal(serialized.includes(h.link.secret), false);
  });

test("WhatsApp withdrawal survives expired instructions and deleted sources",
  async () => {
    const h = await harness();
    await h.claim();
    h.clock.now = start + 1_800_001;
    h.fake.remove("events/" + h.context.eventId);
    h.fake.remove(h.attendeePath);
    h.fake.remove(h.senderPath);
    h.fake.remove(h.policyPath);
    const w = withdrawal(h);
    const before = await h.read(w.permissionPath);
    h.fake.failNextCommit = true;
    await assert.rejects(w.store.withdraw(w.input), /interruption/);
    assert.deepEqual(await h.read(w.permissionPath), before);
    const result = await w.store.withdraw(w.input);
    assert.equal(result.view.preference, "disabled");
    const permission = await h.read(w.permissionPath);
    assert.deepEqual(permission!.evidence, before!.evidence);
    const receipt = parseWhatsappConsentReceipt(await h.read(
      WHATSAPP_CONSENT_RECEIPTS + "/" + permission!.currentReceiptId));
    assert.equal(receipt.source, "messageLink");
    assert.equal(receipt.actorUid, null);
    assert.equal(receipt.decision, "revoke");
    assert.equal(receipt.linkId, h.link.linkId);
    assert.throws(() => parseWhatsappConsentReceipt({...receipt,
      decision: "grant"}), /Invalid/);
    assert.throws(() => parseWhatsappConsentReceipt({...receipt,
      actorUid: h.actor.uid}), /Invalid/);
    assert.equal(JSON.stringify(receipt).includes(h.link.secret), false);
  });

test("old WhatsApp withdrawals cannot reverse a later explicit grant",
  async () => {
    const h = await harness();
    await h.claim();
    const w = withdrawal(h);
    await w.store.withdraw(w.input);
    h.clock.now += 1000;
    await h.preferences.set(h.actor, {...h.grant, requestId: "reenable",
      expectedRevision: 2});
    const before = await h.read(w.permissionPath);
    assert.equal((await w.store.withdraw(w.input)).view.preference, "enabled");
    assert.equal((await w.store.withdraw({...w.input, requestId: "stale"}))
      .outcome, "conflict");
    await assert.rejects(w.store.withdraw({...w.input, expectedRevision: 3}),
      /new WhatsApp withdrawal request/);
    assert.deepEqual(await h.read(w.permissionPath), before);
    assert.equal((await w.store.withdraw({...w.input,
      requestId: "stop-current", expectedRevision: 3})).view.preference,
    "disabled");
  });

test("WhatsApp withdrawal cannot cross recipient, subject or provider identity",
  async () => {
    for (const field of ["phone", "subject", "generation", "account", "sender",
      "secret", "revokedLink", "expired", "otherLink"] as const) {
      const h = await harness();
      await h.claim();
      const w = withdrawal(h);
      const value = (await h.read(w.permissionPath))!;
      const evidence = {...value.evidence as Record<string, unknown>};
      if (field === "phone") {
        value.phoneE164 = "+919999999998";
        value.recipientEndpointId = whatsappEndpointId(value.phoneE164);
      }
      if (field === "subject") {
        evidence.subjectUid = "different-user";
        value.recipientBinding = {...value.recipientBinding as object,
          subjectUid: "different-user"};
      }
      if (field === "generation") value.attendeeGeneration = "f".repeat(64);
      if (field === "account" || field === "sender") {
        const sender = {...value.sender as Permission["sender"]};
        sender[field === "account" ? "providerAccountId" :
          "providerPhoneNumberId"] = "555555";
        value.sender = sender;
        evidence.senderHash = whatsappSenderHash(h.context.organizerId,
          h.scope.senderId, sender);
      }
      value.evidence = evidence;
      await h.write(w.permissionPath, value);
      if (field === "secret") w.input.secret = "a".repeat(43);
      if (field === "expired") h.clock.now = start + 3600_000 + 86_400_000;
      if (field === "otherLink") w.input.linkId = "a".repeat(32);
      if (field === "revokedLink") {
        const path = "eventAssistanceGuestGrants/" + h.link.linkId;
        await h.write(path, {...(await h.read(path)), revokedAt: start});
      }
      await assert.rejects(w.store.withdraw(w.input), /unavailable/, field);
    }
  });

test("WhatsApp link withdrawal suppresses another queued send only",
  async () => {
    const h = await harness();
    await h.claim();
    const next = {...h.intent, intentId: "next-message", workflow: {
      kind: "lateJoin" as const, occurrenceId: "s2"}};
    const thread = await h.guests.publishMessage(next, null);
    const link = await h.guests.issueLink(thread.threadId, "next", keys);
    const outbox = h.store.outbox(link.linkId);
    const id = assistanceMessageId(next);
    const reserved = await outbox.reserve(id);
    const w = withdrawal(h);
    const event = await h.read("events/" + h.context.eventId);
    const attendee = await h.read(h.attendeePath);
    await w.store.withdraw(w.input);
    assert.equal((await outbox.claimLiveDispatch(id,
      reserved.record.attempts[0].attemptId,
      h.store.prepare(link.linkId, h.expected))).kind, "withheld");
    assert.deepEqual(await h.read("events/" + h.context.eventId), event);
    assert.deepEqual(await h.read(h.attendeePath), attendee);
    assert.equal(h.fake.entries().some(([path]) =>
      path.startsWith("eventAssistanceSmsPermissions/")), false);
  });

test("bearer WhatsApp callables validate and rate-limit a revocation-only API",
  async () => {
    const h = await harness();
    await h.claim();
    const w = withdrawal(h);
    const calls: string[] = [];
    const deps = {firestore: () => h.db, now: () => h.clock.now,
      checkRateLimit: async (_db: unknown, identity: string) => {
        calls.push(identity);
      }};
    const request = (data: unknown) => ({data,
      rawRequest: {ip: "127.0.0.1"}} as unknown as CallableRequest<unknown>);
    await assert.rejects(withdrawEventWhatsappHandler(request({...w.input,
      decision: "grant"}), deps), {code: "invalid-argument"});
    assert.equal(calls.length, 0);
    await getEventWhatsappWithdrawalHandler(request(w.credential), deps);
    const result = await withdrawEventWhatsappHandler(request(w.input), deps);
    assert.equal(result.view.preference, "disabled");
    assert.equal(calls.length, 4);
    assert.equal(JSON.stringify(calls).includes(h.link.secret), false);
  });

test("WhatsApp worker claims once and sends the exact reviewed native payload",
  async () => {
    const h = await harness();
    let sends = 0;
    const service = worker(h, async (url, init) => {
      sends++;
      assert.ok(String(url).endsWith(
        "/" + h.expected.connection.phoneNumberId + "/messages"));
      const body = JSON.parse(init!.body as string);
      const attempt = (await h.outbox.get(h.messageId))!.attempts[0];
      assert.equal(attempt.state.kind, "unknown");
      const dispatch = await h.read(WHATSAPP_DISPATCHES + "/" +
        attempt.attemptId);
      assert.equal(body.biz_opaque_callback_data,
        whatsappStatusCorrelation(attempt.attemptId,
          dispatch!.payloadHash as string));
      assert.equal(body.to, h.actor.phone.slice(1));
      assert.equal(body.template.name, "update");
      assert.equal(body.template.components[0].parameters[0].text,
        "Join us at stop one.");
      const native = await h.read(WHATSAPP_REPLY_BINDINGS + "/" +
        attempt.attemptId);
      assert.equal(body.template.components[1].parameters[0].payload,
        (native!.choices as Array<{nativeId: string}>)[0].nativeId);
      return Response.json({messages: [{id: "wamid.delivery"}]});
    });
    const results = await Promise.all(Array.from({length: 8}, () =>
      service.dispatch(h.messageId, h.link.linkId)));
    assert.equal(sends, 1);
    assert.equal(results.filter((r) => r.kind === "submitted").length, 1);
    assert.equal((await h.outbox.get(h.messageId))!.attempts[0].state.kind,
      "accepted");
    for (const path of h.budgetPaths) {
      assert.equal((await h.read(path))!.chargedMicros, 500_000);
    }
    const durable = JSON.stringify(h.fake.entries());
    assert.equal(durable.includes("fixture-token"), false);
  });

test("secret latency precedes reservation and sender rotation fences the claim",
  async () => {
    for (const mode of ["slow", "missing", "rotated"] as const) {
      const h = await harness();
      let sends = 0;
      const service = worker(h, async () => {
        sends++;
        return Response.json({messages: [{id: "wamid.delivery"}]});
      }, async () => {
        assert.equal((await h.outbox.get(h.messageId))!.attempts.length, 0);
        if (mode === "missing") throw new Error("private-vault-error");
        if (mode === "slow") h.clock.now += 60_000;
        if (mode === "rotated") {
          await h.write(h.senderPath,
            {...(await h.read(h.senderPath)), revision: 2,
              secretVersionResource:
              "projects/demo/secrets/WA_FIXTURE/versions/2"});
        }
        return "fixture-token";
      });
      const result = await service.dispatch(h.messageId, h.link.linkId);
      assert.equal(result.kind, mode === "slow" ? "submitted" : "withheld");
      assert.equal(sends, mode === "slow" ? 1 : 0);
      if (mode === "missing") {
        assert.deepEqual(result,
          {kind: "withheld", reason: "credentialUnavailable"});
      }
    }
  });

test("unknown submission and receipt commit failure never repeat provider I/O",
  async () => {
    const faults = ["connectionLost", "receiptLost", "httpError"] as const;
    for (const mode of faults) {
      const h = await harness();
      let sends = 0;
      let correlation = "";
      const service = worker(h, async (_, init) => {
        sends++;
        correlation = JSON.parse(init!.body as string).biz_opaque_callback_data;
        if (mode === "connectionLost") throw new Error("lost response");
        if (mode === "receiptLost") h.fake.failNextCommit = true;
        if (mode === "httpError") {
          return Response.json({error: {code: 190}},
            {status: 401});
        }
        return Response.json({messages: [{id: "wamid.delivery"}]});
      });
      const dispatch = () => service.dispatch(h.messageId, h.link.linkId);
      if (mode === "receiptLost") {
        await assert.rejects(dispatch,
          /injected transaction interruption/);
      } else {
        assert.deepEqual(await dispatch(),
          {kind: "submitted", outcome: {kind: "unknown"}});
      }
      assert.equal((await h.outbox.get(h.messageId))!.attempts[0].state.kind,
        "unknown");
      assert.equal((await dispatch()).kind, "waiting");
      assert.equal(sends, 1);
      h.clock.now += 1000;
      const queueId = await queuedStatus(h, correlation, "delivered");
      const reports = new WhatsappDeliveryStore(h.db, () => h.clock.now);
      assert.equal((await reports.consumeQueued(queueId)).kind, "recorded");
      assert.equal((await h.outbox.get(h.messageId))!.attempts[0].state.kind,
        "delivered");
    }
  });

test("expired dispatch and contradictory delivery remain distinguishable",
  async () => {
    const h = await harness();
    let sends = 0;
    let correlation = "";
    const actual = new MetaWhatsappProvider({appId: "f", appSecret: "f",
      configId: "f", graphVersion: "v23.0"}, async () => {
      sends++;
      throw new Error("must not send");
    }, () => h.clock.now);
    const service = new EventWhatsappWorker(h.store, {
      sendTemplate: async (input) => {
        correlation = input.callbackData!;
        h.clock.now = input.deadline!;
        return actual.sendTemplate(input);
      },
    }, {accessBound: async () => "fixture-token"}, () => h.clock.now);
    assert.deepEqual(await service.dispatch(h.messageId, h.link.linkId),
      {kind: "withheld", reason: "permitExpired"});
    assert.equal(sends, 0);
    assert.equal((await h.outbox.get(h.messageId))!.attempts[0].state.kind,
      "notDispatched");
    h.clock.now += 1000;
    const queueId = await queuedStatus(h, correlation, "delivered");
    const result = await new WhatsappDeliveryStore(h.db, () => h.clock.now)
      .consumeQueued(queueId);
    assert.equal(result.kind, "recorded");
    if (result.kind === "recorded") {
      assert.equal(result.disposition, "conflictingEvidence");
    }
    assert.equal((await h.outbox.get(h.messageId))!.deliveryConflict, true);
  });

test("signed receipt can precede submission response and survive event closure",
  async () => {
    const h = await harness();
    let correlation = "";
    const reports = new WhatsappDeliveryStore(h.db, () => h.clock.now);
    const service = worker(h, async (_, init) => {
      correlation = JSON.parse(init!.body as string).biz_opaque_callback_data;
      const id = await queuedStatus(h, correlation, "delivered");
      assert.equal((await reports.consumeQueued(id)).kind, "recorded");
      return Response.json({messages: [{id: "wamid.delivery"}]});
    });
    await service.dispatch(h.messageId, h.link.linkId);
    assert.equal((await h.outbox.get(h.messageId))!.attempts[0].state.kind,
      "delivered");
    h.clock.now += 1000;
    const readId = await queuedStatus(h, correlation, "read");
    h.fake.remove(h.senderPath);
    h.fake.remove("events/" + h.context.eventId);
    h.fake.remove(h.attendeePath);
    await h.outbox.close(h.messageId,
      (await h.outbox.get(h.messageId))!.revision, "cancelled");
    assert.equal((await reports.consumeQueued(readId)).kind, "recorded");
    const repeated = await reports.consumeQueued(readId);
    assert.equal(repeated.kind, "recorded");
    if (repeated.kind === "recorded") {
      assert.equal(repeated.disposition, "duplicateOrOlder");
    }
    assert.equal((await h.outbox.get(h.messageId))!.attempts[0].state.kind,
      "read");
  });

test("status correlation rejects wrong scope, recipient, time and receipt",
  async () => {
    for (const fault of ["endpoint", "payload", "account", "sender", "receipt",
      "time", "expired", "knownId", "notClaimed"] as const) {
      const h = await harness();
      const claim = await h.claim();
      assert.equal(claim.kind, "claimed");
      if (claim.kind !== "claimed") return;
      const attempt = claim.permit.attempt;
      const correlation = whatsappStatusCorrelation(attempt.attemptId,
        claim.resource.rendered.payloadHash);
      h.clock.now += 1000;
      const id = await queuedStatus(h,
        fault === "payload" ? correlation.slice(0, -1) +
          (correlation.endsWith("0") ? "1" : "0") : correlation,
        "delivered", fault === "endpoint" ?
          {recipient_id: "919999999998"} : fault === "time" ?
            {timestamp: String((start - 301_000) / 1000)} : {});
      const queuePath = "organizerMessagingWebhookEvents/" + id;
      if (fault === "account" || fault === "sender") {
        await h.write(queuePath, {...(await h.read(queuePath)),
          [fault === "account" ? "providerAccountId" : "connectionId"]:
            "wrong-scope"});
      }
      if (fault === "receipt") {
        h.fake.remove(
          "organizerCampaignWebhookReceipts/" + id);
      }
      if (fault === "expired") h.clock.now += 31 * 86_400_000;
      if (fault === "knownId") {
        await h.outbox.recordReceipt(h.messageId, {
          attemptId: attempt.attemptId, ...attempt.binding,
          providerEventId: "fixture-accepted", receivedAt: h.clock.now,
          state: {kind: "accepted", at: h.clock.now,
            providerMessageId: "wamid.other"},
        });
      }
      if (fault === "notClaimed") {
        const path = "eventAssistanceMessages/" + h.messageId;
        const record = (await h.outbox.get(h.messageId))!;
        await h.write(path, {...record, attempts: [{...attempt, state: {
          kind: "reserved", at: start, reconcileAfter: start + 120_000}}]});
      }
      const before = await h.outbox.get(h.messageId);
      assert.deepEqual(await new WhatsappDeliveryStore(h.db, () => h.clock.now)
        .consumeQueued(id), {kind: "rejected"}, fault);
      assert.deepEqual(await h.outbox.get(h.messageId), before, fault);
    }
  });

test("ambiguous recipient or inconsistent status cannot unlock SMS fallback",
  async () => {
    for (const status of ["failed", "sent", "delivered"] as const) {
      const h = await harness();
      const claim = await h.claim();
      if (claim.kind !== "claimed") throw new Error("Expected claim");
      const correlation = whatsappStatusCorrelation(claim.permit.attempt
        .attemptId, claim.resource.rendered.payloadHash);
      const id = await queuedStatus(h, correlation, status,
        {errors: [{code: 131026}]});
      assert.deepEqual(await new WhatsappDeliveryStore(h.db, () => h.clock.now)
        .consumeQueued(id), {kind: "unconfirmed", messageId: h.messageId});
      assert.equal((await h.outbox.get(h.messageId))!.attempts[0].state.kind,
        "unknown");
    }
  });

test("complete signed failures use a closed service and restriction mapping",
  async () => {
    const cases = [
      {codes: [131016], classification: "technical"},
      {codes: [130429, 131016, 130429], classification: "technical"},
      ...[368, 130497, 131031, 131047, 131048, 131049].map((code) =>
        ({codes: [131016, code, 999999], classification: "policy"})),
      {codes: [131016, 131050, 999999], classification: "suppressed"},
    ];
    for (const {codes, classification} of cases) {
      const h = await harness();
      const claim = await h.claim();
      assert.ok(claim.kind === "claimed");
      const attemptId = claim.permit.attempt.attemptId;
      const correlation = whatsappStatusCorrelation(attemptId,
        claim.resource.rendered.payloadHash);
      const id = await queuedStatus(h, correlation, "failed",
        {errors: codes.map((code) => ({code}))});
      const result = await new WhatsappDeliveryStore(h.db, () => h.clock.now)
        .consumeQueued(id);
      assert.deepEqual(result, {kind: "recorded", messageId: h.messageId,
        disposition: "applied"});
      const state = (await h.outbox.get(h.messageId))!.attempts[0].state;
      assert.ok(state.kind === "failed");
      assert.equal(state.classification, classification);
      assert.equal(state.providerMessageId, "wamid.delivery");
      const receipt = (await h.read("organizerCampaignWebhookReceipts/" + id))!;
      const queued = (await h.read("organizerMessagingWebhookEvents/" + id))!;
      assert.equal(state.evidenceId, "wa-status:" + operationContentHash([
        attemptId, queued.providerEventId, receipt.payloadHash,
      ]));
      // A report is not a refund, a permission mutation or another send.
      for (const path of h.budgetPaths) {
        assert.equal((await h.read(path))!.chargedMicros, 500_000);
        assert.equal((await h.read(path))!.revision, 2);
      }
      assert.equal((await h.outbox.get(h.messageId))!.attempts.length, 1);
    }
  });

test("signed success and technical failure preserve a conflict in either order",
  async () => {
    for (const first of ["delivered", "failed"] as const) {
      const h = await harness();
      const claim = await h.claim();
      assert.ok(claim.kind === "claimed");
      const correlation = whatsappStatusCorrelation(
        claim.permit.attempt.attemptId, claim.resource.rendered.payloadHash);
      const reports = new WhatsappDeliveryStore(h.db, () => h.clock.now);
      const consume = async (status: string) => reports.consumeQueued(
        await queuedStatus(h, correlation, status,
          status === "failed" ? {errors: [{code: 131016}]} : {}));
      await consume(first);
      h.clock.now += 1000;
      assert.deepEqual(await consume(first === "failed" ?
        "delivered" : "failed"), {kind: "recorded", messageId: h.messageId,
        disposition: "conflictingEvidence"});
      const record = (await h.outbox.get(h.messageId))!;
      assert.equal(record.deliveryConflict, true);
      assert.equal(record.attempts[0].state.kind, "delivered");
      assert.deepEqual((await h.reserve()).decision, {
        kind: "hostDecision", reason: "conflictingDeliveryEvidence"});
    }
  });

test("a later signed restriction fences previously technical recovery",
  async () => {
    const h = await harness();
    const claim = await h.claim();
    assert.ok(claim.kind === "claimed");
    const correlation = whatsappStatusCorrelation(claim.permit.attempt
      .attemptId, claim.resource.rendered.payloadHash);
    const reports = new WhatsappDeliveryStore(h.db, () => h.clock.now);
    for (const code of [131016, 131050]) {
      await reports.consumeQueued(await queuedStatus(h, correlation, "failed",
        {errors: [{code}]}));
      h.clock.now += 1000;
    }
    const record = (await h.outbox.get(h.messageId))!;
    assert.equal(record.deliveryConflict, true);
    assert.ok(record.attempts[0].state.kind === "failed");
    assert.equal(record.attempts[0].state.classification, "suppressed");
    assert.deepEqual((await h.reserve()).decision, {
      kind: "hostDecision", reason: "conflictingDeliveryEvidence"});
  });

async function rejectsIncompleteDeliveryEvidence(h: Harness) {
  const claim = await h.claim();
  if (claim.kind !== "claimed") throw new Error("Expected claim");
  const correlation = whatsappStatusCorrelation(claim.permit.attempt.attemptId,
    claim.resource.rendered.payloadHash);
  const reports = new WhatsappDeliveryStore(h.db, () => h.clock.now);
  const before = await h.outbox.get(h.messageId);
  for (const status of ["sent", "delivered", "read", "failed"]) {
    for (const errors of [null, [{}], [{}, {code: 131026}],
      [{code: 131016}, {code: 131026}], Array(11).fill({code: 131016})]) {
      h.clock.now += 1000;
      const id = await queuedStatus(h, correlation, status, {errors});
      assert.deepEqual(await reports.consumeQueued(id),
        {kind: "unconfirmed", messageId: h.messageId});
      assert.deepEqual(await h.outbox.get(h.messageId), before);
      assert.equal((await h.reserve()).decision.kind, "reconcile");
    }
  }
  // An older queue row cannot prove the discarded errors were absent.
  h.clock.now += 1000;
  const oldId = await queuedStatus(h, correlation, "delivered");
  const path = "organizerMessagingWebhookEvents/" + oldId;
  const legacy = {...(await h.read(path))!};
  delete legacy.providerErrorEvidence;
  await h.write(path, legacy);
  assert.deepEqual(await reports.consumeQueued(oldId),
    {kind: "unconfirmed", messageId: h.messageId});
  assert.deepEqual(await h.outbox.get(h.messageId), before);
  h.clock.now += 1000;
  const mismatchId = await queuedStatus(h, correlation, "failed",
    {errors: [{code: 131016}]});
  const mismatchPath = "organizerMessagingWebhookEvents/" + mismatchId;
  await h.write(mismatchPath, {...(await h.read(mismatchPath)),
    providerErrorCode: 130429});
  assert.deepEqual(await reports.consumeQueued(mismatchId),
    {kind: "unconfirmed", messageId: h.messageId});
  assert.deepEqual(await h.outbox.get(h.messageId), before);
  for (const budget of h.budgetPaths) {
    assert.equal((await h.read(budget))!.chargedMicros, 500_000);
  }
  // Later complete signed evidence still recovers a lost submission.
  h.clock.now += 1000;
  const deliveredId = await queuedStatus(h, correlation, "delivered",
    {errors: []});
  assert.equal((await reports.consumeQueued(deliveredId)).kind, "recorded");
  assert.equal((await h.outbox.get(h.messageId))!.attempts[0].state.kind,
    "delivered");
}

test("incomplete signed errors cannot confirm delivery or allow fallback",
  async () => rejectsIncompleteDeliveryEvidence(await harness()));

test("Firestore retains ambiguous delivery until complete signed evidence", {
  skip: !process.env.FIRESTORE_EMULATOR_HOST, timeout: 60_000,
}, async () => {
  assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? "",
    /^(127\.0\.0\.1|localhost|\[::1\]):\d+$/);
  const id = randomUUID();
  const app = initializeApp({projectId: "demo-catch-rules"}, "wa-errors-" + id);
  try {
    const h = await harness(getEmulatorFirestore(app), id);
    await rejectsIncompleteDeliveryEvidence(h);
  } finally {
    await deleteApp(app);
  }
});

for (const privateRecipient of [false, true]) {
  test("native reply recovers a lost response, private=" + privateRecipient,
    async () => {
      const h = await harness(undefined, "reply", undefined, undefined,
        privateRecipient);
      const claim = await h.claim();
      if (claim.kind !== "claimed") throw new Error("Expected claim");
      const attemptId = claim.permit.attempt.attemptId;
      const rawBody = Buffer.from(JSON.stringify({entry: [{
        id: h.expected.connection.wabaId, changes: [{value: {
          metadata: {phone_number_id: h.expected.connection.phoneNumberId},
          messages: [{id: "wamid.reply", from: h.actor.phone.slice(1),
            context: {id: "wamid.delivery"}, timestamp: String(start / 1000),
            type: "button", button: {text: "On my way",
              payload: claim.resource.replies[0].payload}}],
        }}],
      }]}));
      await ingestMetaWhatsappWebhook({db: h.db, rawBody, appSecret,
        now: Timestamp.fromMillis(h.clock.now), signatureHeader: "sha256=" +
        createHmac("sha256", appSecret).update(rawBody).digest("hex")});
      const replyId = "omwe_" + createHash("sha256")
        .update("inbound:wamid.reply")
        .digest("hex").slice(0, 48);
      const replies = new WhatsappReplyStore(h.db, () => h.clock.now);
      assert.deepEqual(await replies.consumeQueued(replyId),
        {kind: "waiting", reason: "deliveryUnconfirmed"});
      const statusId = await queuedStatus(h,
        whatsappStatusCorrelation(attemptId,
          claim.resource.rendered.payloadHash),
        "sent");
      assert.equal((await new WhatsappDeliveryStore(h.db, () => h.clock.now)
        .consumeQueued(statusId)).kind, "recorded");
      assert.deepEqual(await replies.consumeQueued(replyId),
        {kind: "accepted"});
      assert.deepEqual(await replies.consumeQueued(replyId),
        {kind: "replayed"});
    });
}

test("one claim atomically debits two ceilings and freezes native choices",
  async () => {
    const h = await harness();
    const result = await h.claim();
    assert.equal(result.kind, "claimed");
    if (result.kind !== "claimed") return;
    const attemptId = result.permit.attempt.attemptId;
    const dispatch = await h.read(WHATSAPP_DISPATCHES + "/" + attemptId);
    const native = await h.read(WHATSAPP_REPLY_BINDINGS + "/" + attemptId);
    assert.equal(dispatch!.maxCostMicros, 500_000);
    assert.equal(dispatch!.replyBindingId, attemptId);
    assert.equal(native!.attemptId, attemptId);
    assert.equal(result.resource.replies[0].payload,
      (native!.choices as Array<{nativeId: string}>)[0].nativeId);
    assert.equal(result.permit.attempt.state.kind, "unknown");
    for (const path of h.budgetPaths) {
      assert.equal((await h.read(path))!.chargedMicros, 500_000);
    }
    assert.equal((await h.claim()).kind, "withheld");
    assert.equal(JSON.stringify([dispatch, native])
      .includes(h.actor.phone), false);
    assert.equal(JSON.stringify([dispatch, native])
      .includes(h.link.secret), false);
  });

test("failed commits leave no debit or reply binding and can safely retry",
  async () => {
    const h = await harness();
    await h.reserve();
    h.fake.failNextCommit = true;
    await assert.rejects(h.outbox.claimLiveDispatch(h.messageId,
      (await h.outbox.get(h.messageId))!.attempts[0].attemptId,
      h.store.prepare(h.link.linkId, h.expected)), /interruption/);
    assert.equal(h.fake.entries().some(([p]) =>
      p.startsWith(WHATSAPP_DISPATCHES + "/")), false);
    assert.equal(h.fake.entries().some(([p]) =>
      p.startsWith(WHATSAPP_REPLY_BINDINGS + "/")), false);
    for (const path of h.budgetPaths) {
      assert.equal((await h.read(path))!.chargedMicros, 0);
    }
    assert.equal((await h.claim()).kind, "claimed");
  });

test("fresh consent, sender, template, roster and spending gate each claim",
  async () => {
    for (const change of ["consent", "sender", "template",
      "roster", "budget"]) {
      const h = await harness();
      await h.reserve();
      if (change === "consent") {
        await h.preferences.set(h.actor, {...h.scope,
          requestId: "withdraw", expectedRevision: 1,
          decision: {kind: "revoke"}});
      }
      const path = change === "sender" ? h.senderPath :
        change === "template" ? h.templatePath : change === "roster" ?
          h.attendeePath : h.budgetPaths[1];
      const patch = change === "sender" ? {revision: 2} :
        change === "template" ? {contentHash: "e".repeat(64)} :
          change === "roster" ? {status: "checkedIn"} : {limitMicros: 1};
      if (change !== "consent") {
        await h.write(path,
          {...(await h.read(path)), ...patch});
      }
      assert.equal((await h.claim()).kind, "withheld", change);
      for (const budget of h.budgetPaths) {
        assert.equal((await h.read(budget))!.chargedMicros, 0, change);
      }
    }
  });

test("STOP needs no CRM contact and fences unseen re-enablement",
  async () => {
    const h = await harness();
    await h.reserve();
    h.clock.now += 1000;
    await h.stop(h.clock.now);
    assert.equal((await h.claim()).kind, "withheld");
    const stopped = (await h.preferences.get(h.actor, h.scope)).view;
    assert.equal(stopped.preference, "disabled");
    h.clock.now += 1000;
    await assert.rejects(h.preferences.set(h.actor, {...h.grant,
      requestId: "stale-enable", expectedRevision: 1}), /cannot be enabled/);
    const renewed = await h.preferences.set(h.actor, {...h.grant,
      requestId: "fresh-enable", expectedRevision: 1,
      decision: {...h.grant.decision, reviewHash: stopped.reviewHash,
        stopRecordHash: stopped.stopRecordHash}});
    assert.equal(renewed.view.preference, "enabled");
    // A pre-STOP reservation cannot inherit the renewed permission.
    assert.equal((await h.claim()).kind, "withheld");
    const id = whatsappStopId(h.context.organizerId,
      whatsappEndpointHash(h.actor.phone)!);
    const record = parseWhatsappStop(await h.read(WHATSAPP_ENDPOINT_STOPS +
      "/" + id));
    assert.equal(record.revision, 1);
  });

test("older STOP deliveries cannot reverse a later explicit event opt-in",
  async () => {
    const h = await harness();
    h.clock.now += 1000;
    await h.stop(h.clock.now, "new-stop");
    const stopped = (await h.preferences.get(h.actor, h.scope)).view;
    h.clock.now += 1000;
    await h.preferences.set(h.actor, {...h.grant, requestId: "fresh",
      expectedRevision: 1, decision: {...h.grant.decision,
        reviewHash: stopped.reviewHash,
        stopRecordHash: stopped.stopRecordHash}});
    await h.stop(start, "old-stop");
    assert.equal((await h.preferences.get(h.actor, h.scope)).view.preference,
      "enabled");
    assert.equal((await h.claim()).kind, "claimed");
  });

test("unknown delivery retains its debit and cannot obtain another claim",
  async () => {
    const h = await harness();
    await h.claim();
    h.clock.now += 200_000;
    assert.equal((await h.reserve()).decision.kind, "reconcile");
    assert.equal((await h.claim()).kind, "withheld");
    for (const path of h.budgetPaths) {
      assert.equal((await h.read(path))!.chargedMicros, 500_000);
    }
  });

test("event consent stays separate from announcement opt-out and CRM pauses",
  async () => {
    for (const kind of ["marketing", "admin", "provider", "legacyStop"]) {
      const h = await harness();
      await h.reserve();
      const stamp = {_seconds: start / 1000, _nanoseconds: 0};
      await h.write("organizerContactChannelStates/contact-state", {
        organizerId: h.context.organizerId, contactId: "contact",
        channel: "whatsapp", endpointHash: whatsappEndpointHash(h.actor.phone),
        suppressionStatus: kind === "provider" ? "providerBlocked" : "optedOut",
        suppressionSource: kind === "legacyStop" ? "inboundStop" : "preference",
        adminSuppressed: kind === "admin", campaignAcceptedCount: 0,
        lastCampaignAcceptedAt: null, lastInboundAt: stamp, lastReplyAt: null,
        createdAt: stamp, updatedAt: stamp,
      });
      assert.equal((await h.claim()).kind,
        kind === "marketing" ? "claimed" : "withheld", kind);
    }
  });

test("templates with webpage choices need no empty native binding",
  async () => {
    const h = await harness();
    const template = {...(await h.read(h.templatePath)),
      buttonKinds: [], buttonLabels: [], buttonUrls: []};
    await h.write(h.templatePath, template);
    const policy = structuredClone(h.expected.policy);
    policy.templates[0].quickReplies = [];
    policy.templates[0].templateHash = operationContentHash(
      whatsappTemplateSnapshot(template));
    await h.write(h.policyPath, policy);
    const expected = (await h.store.sender())!;
    const reserved = await h.reserve();
    const attempt = reserved.record.attempts[0];
    const result = await h.outbox.claimLiveDispatch(h.messageId,
      attempt.attemptId, h.store.prepare(h.link.linkId, expected));
    assert.equal(result.kind, "claimed");
    const dispatch = await h.read(WHATSAPP_DISPATCHES + "/" +
      attempt.attemptId);
    assert.equal(dispatch!.replyBindingId, null);
    assert.equal(await h.read(WHATSAPP_REPLY_BINDINGS + "/" +
      attempt.attemptId), undefined);
    if (result.kind === "claimed") {
      assert.ok(result.resource.rendered.variables.response_url
        .startsWith(`${BRAND.web.origin}/event-update/`));
    }
  });

test("shortened event windows cap existing post-event message authority",
  async () => {
    const h = await harness();
    const value: Record<string, unknown> = {...h.intent,
      kind: "operationalNotice", intentId: "follow-up", noticeKind: "followUp",
      instructionRevision: 1, title: "Thank you", body: "Thanks for joining.",
      workflow: {kind: "lateJoin", occurrenceId: "follow-up"},
      choices: [{choiceId: "ack", label: "Got it", value: {
        kind: "acknowledge", instructionRevision: 1}}]};
    delete value.guidance;
    const intent = parseMessageIntent(value);
    const path = "events/" + h.context.eventId;
    await h.write(path, {...(await h.read(path)),
      endTime: Timestamp.fromMillis(start - 86_400_000 + 1)});
    await h.guests.publishMessage(intent, null);
    const readGate = () => h.db.runTransaction((tx) =>
      readEventAssistanceMessageGate(h.db, tx, intent, h.clock.now));
    const before = await readGate();
    assert.equal(before.kind, "allow");
    if (before.kind === "allow") assert.equal(before.validUntil, start + 1);
    h.clock.now += 1;
    assert.deepEqual(await readGate(), {kind: "stop", reason: "eventClosed"});
  });

test("Firestore arbitrates one claim/debit under eight competing workers", {
  skip: !process.env.FIRESTORE_EMULATOR_HOST, timeout: 60_000,
}, async () => {
  assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? "",
    /^(127\.0\.0\.1|localhost|\[::1\]):\d+$/);
  const id = randomUUID();
  const app = initializeApp({projectId: "demo-catch-rules"},
    "wa-dispatch-" + id);
  try {
    const h = await harness(getEmulatorFirestore(app), id);
    let sends = 0;
    let correlation = "";
    const service = worker(h, async (_, init) => {
      sends++;
      correlation = JSON.parse(init!.body as string).biz_opaque_callback_data;
      return Response.json({messages: [{id: "wamid.delivery"}]});
    });
    const results = await Promise.all(Array.from({length: 8}, () =>
      service.dispatch(h.messageId, h.link.linkId)));
    assert.equal(results.filter((r) => r.kind === "submitted").length, 1);
    assert.equal(sends, 1);
    for (const path of h.budgetPaths) {
      assert.equal((await h.read(path))!.chargedMicros, 500_000);
      assert.equal((await h.read(path))!.revision, 2);
    }
    h.clock.now += 1000;
    const statusId = await queuedStatus(h, correlation, "delivered");
    const reports = new WhatsappDeliveryStore(h.db, () => h.clock.now);
    const reconciled = await Promise.all(Array.from({length: 8}, () =>
      reports.consumeQueued(statusId)));
    assert.equal(reconciled.filter((r) => r.kind === "recorded" &&
      r.disposition === "applied").length, 1);
    assert.equal((await h.outbox.get(h.messageId))!.attempts[0].state.kind,
      "delivered");
    const w = withdrawal(h);
    const withdrawals = await Promise.all(Array.from({length: 8}, () =>
      w.store.withdraw(w.input)));
    assert.equal(withdrawals.filter((r) => r.outcome === "applied").length, 1);
    assert.equal((await w.store.get(w.credential)).view.revision, 2);
    // Different outboxes must contend on spending, not just on message CAS.
    const shared = await harness(getEmulatorFirestore(app), id + "-shared");
    for (const path of shared.budgetPaths) {
      await shared.write(path, {...(await shared.read(path)),
        limitMicros: 500_000});
    }
    const secondIntent = {...shared.intent, intentId: "second-" + id,
      workflow: {kind: "lateJoin" as const, occurrenceId: "s2"}};
    const thread = await shared.guests.publishMessage(secondIntent, null);
    const link = await shared.guests.issueLink(thread.threadId, "second", keys);
    const second = shared.store.outbox(link.linkId);
    const secondId = assistanceMessageId(secondIntent);
    const reservation = await second.reserve(secondId);
    await shared.reserve();
    const resultsAcrossMessages = await Promise.all([
      shared.claim(), second.claimLiveDispatch(secondId,
        reservation.record.attempts[0].attemptId,
        shared.store.prepare(link.linkId, shared.expected)),
    ]);
    assert.equal(resultsAcrossMessages.filter((r) => r.kind === "claimed")
      .length, 1);
    for (const path of shared.budgetPaths) {
      assert.equal((await shared.read(path))!.chargedMicros, 500_000);
    }
    shared.clock.now += 1000;
    const stops = await Promise.all(Array.from({length: 8}, () =>
      shared.stop(shared.clock.now)));
    assert.equal(stops.reduce((a, b) => a + b, 0), 1);
    const preference = await shared.preferences.get(shared.actor, shared.scope);
    assert.equal(preference.view.preference, "disabled");
  } finally {
    await deleteApp(app);
  }
});

test("changed destination between reservation and WhatsApp claim stops send",
  async () => {
    const h = await harness();
    const reserved = await h.reserve();
    assert.equal(reserved.decision.kind, "dispatch");
    await h.progress.confirm("two");
    const claim = await h.outbox.claimLiveDispatch(h.messageId,
      reserved.record.attempts[0].attemptId,
      h.store.prepare(h.link.linkId, h.expected));
    assert.equal(claim.kind, "withheld");
    let requests = 0;
    const w = worker(h, async () => {
      requests++;
      return new Response(JSON.stringify({messages: [{id: "wamid.test"}]}));
    });
    const result = await w.dispatch(h.messageId, h.link.linkId);
    assert.notEqual(result.kind, "submitted");
    assert.equal(requests, 0);
    for (const path of h.budgetPaths) {
      assert.equal((await h.read(path))?.chargedMicros, 0);
    }
  });


test("a participation break prevents WhatsApp claim and budget charge",
  async () => {
    const h = await harness();
    const reserved = await h.reserve();
    assert.equal(reserved.decision.kind, "dispatch");
    const path = guestCollections.guests + "/" +
      guestIdentity(h.context, h.scope.attendeeId);
    const guest = (await h.read(path))!;
    await h.write(path, {...guest, participation: {state: "temporaryBreak",
      resumeAtUnit: null}, revision: Number(guest.revision) + 1});
    const claim = await h.outbox.claimLiveDispatch(h.messageId,
      reserved.record.attempts[0].attemptId,
      h.store.prepare(h.link.linkId, h.expected));
    assert.equal(claim.kind, "withheld");
    for (const budget of h.budgetPaths) {
      assert.equal((await h.read(budget))?.chargedMicros, 0);
    }
  });
