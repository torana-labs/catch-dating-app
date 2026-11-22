import {getEmulatorFirestore} from "../../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import test from "node:test";
import {createHash, createHmac, randomUUID} from "node:crypto";
import {initializeApp, deleteApp} from "firebase-admin/app";
import {Timestamp} from "firebase-admin/firestore";
import {ingestMetaWhatsappWebhook} from
  "../../organizers/organizerWhatsappWebhook";
import {validateOrganizerMessagingWebhookEventDocument} from
  "../../shared/generated/validators/organizerMessagingWebhookEventDocument";
import {harness, Harness, appSecret, queuedStatus} from
  "./whatsappTestHarness";
import {WhatsappDeliveryStore} from "./whatsappDeliveryStore";
import {WhatsappReplyStore} from "./whatsappReplyStore";
import {WHATSAPP_DISPATCHES} from "./whatsappSpend";
import {whatsappNativeReplyId} from "./whatsappReplyProtocol";
import {whatsappStatusCorrelation} from
  "../../platform/delivery/whatsappDeliveryProtocol";
import {
  EventWhatsappWebhookProcessor, isEventAssistanceWhatsappEvent,
  onEventAssistanceWhatsappEventCreated, processEventAssistanceWhatsappEvent,
  WhatsappReplyAwaitingDelivery,
} from "./whatsappWebhookProcessing";

const queue = "organizerMessagingWebhookEvents/";
const receipts = "organizerCampaignWebhookReceipts/";
async function reply(h: Harness, id = "fixture-reply") {
  const record = (await h.outbox.get(h.messageId))!;
  const attempt = record.attempts[0];
  const rawBody = Buffer.from(JSON.stringify({entry: [{
    id: h.expected.connection.wabaId, changes: [{value: {
      metadata: {phone_number_id: h.expected.connection.phoneNumberId},
      messages: [{id, type: "button", from: h.actor.phone.slice(1),
        timestamp: String(h.clock.now / 1000),
        context: {id: "wamid.delivery"}, button: {
          payload: whatsappNativeReplyId(attempt.attemptId, 0),
          text: "On my way",
        }}],
    }}],
  }]}));
  await ingestMetaWhatsappWebhook({db: h.db, rawBody, appSecret,
    now: Timestamp.fromMillis(h.clock.now), signatureHeader: "sha256=" +
      createHmac("sha256", appSecret).update(rawBody).digest("hex")});
  return "omwe_" + createHash("sha256").update("inbound:" + id)
    .digest("hex").slice(0, 48);
}
async function status(h: Harness, state = "sent") {
  const record = (await h.outbox.get(h.messageId))!;
  const attemptId = record.attempts[0].attemptId;
  const dispatch = (await h.read(WHATSAPP_DISPATCHES + "/" + attemptId))!;
  return queuedStatus(h, whatsappStatusCorrelation(attemptId,
    String(dispatch.payloadHash)), state);
}
function processor(h: Harness) {
  return new EventWhatsappWebhookProcessor(h.db, () => h.clock.now);
}
async function checkpoint(h: Harness, id: string) {
  const event = await h.read(queue + id);
  assert.ok(validateOrganizerMessagingWebhookEventDocument(event));
  assert.ok(event.assistanceProcessing);
  return event.assistanceProcessing;
}

test("signed native replies retry until delivery evidence becomes available",
  async () => {
    const h = await harness();
    await h.claim();
    const originalAttendee = await h.read(h.attendeePath);
    const replyId = await reply(h);
    const service = processor(h);
    await assert.rejects(processEventAssistanceWhatsappEvent(service, replyId),
      WhatsappReplyAwaitingDelivery);
    assert.deepEqual((await checkpoint(h, replyId)).outcome,
      {kind: "waiting", reason: "deliveryUnconfirmed"});
    assert.equal((await h.outbox.get(h.messageId))!.response, null);
    const statusId = await status(h);
    await processEventAssistanceWhatsappEvent(service, statusId);
    assert.deepEqual((await checkpoint(h, statusId)).outcome,
      {kind: "delivery", disposition: "applied"});
    await processEventAssistanceWhatsappEvent(service, replyId);
    const done = await checkpoint(h, replyId);
    assert.deepEqual(done.outcome, {kind: "reply", disposition: "accepted"});
    assert.equal(done.attemptCount, 2);
    assert.equal((await h.outbox.get(h.messageId))!.response?.value.kind,
      "joinIntent");
    assert.deepEqual(await h.read(h.attendeePath), originalAttendee);
    h.clock.now += 3_600_000;
    await processEventAssistanceWhatsappEvent(service, replyId);
    assert.deepEqual(await checkpoint(h, replyId), done);
    assert.equal(JSON.stringify(done).includes(h.actor.phone), false);
    assert.equal(JSON.stringify(done).includes(h.link.secret), false);
  });

test("Inbox processing and Assistance checkpoints remain independent",
  async () => {
    const h = await harness();
    await h.claim();
    const id = await status(h, "delivered");
    const source = (await h.read(queue + id))!;
    await h.write(queue + id, {...source, processingStatus: "processed",
      attemptCount: 2, processedAt: source.createdAt});
    const service = processor(h);
    await service.process(id);
    const saved = await checkpoint(h, id);
    const processed = (await h.read(queue + id))!;
    assert.equal(processed.processingStatus, "processed");
    assert.equal(processed.attemptCount, 2);
    // A later legacy-consumer update cannot invalidate the Assistance proof.
    await h.write(queue + id, {...processed, attemptCount: 3});
    await service.process(id);
    assert.deepEqual(await checkpoint(h, id), saved);
    assert.equal((await h.read(queue + id))!.attemptCount, 3);
  });

test("checkpoint failure after a guest effect retries idempotently",
  async () => {
    const h = await harness();
    await h.claim();
    const service = processor(h);
    await service.process(await status(h));
    const id = await reply(h);
    const native = new WhatsappReplyStore(h.db, () => h.clock.now);
    let fail = true;
    const interrupted = new EventWhatsappWebhookProcessor(h.db,
      () => h.clock.now, {
        delivery: new WhatsappDeliveryStore(h.db, () => h.clock.now),
        replies: {consumeQueued: async (eventId) => {
          const result = await native.consumeQueued(eventId);
          if (fail) {
            fail = false;
            h.fake.failNextCommit = true;
          }
          return result;
        }},
      });
    await assert.rejects(interrupted.process(id), /interruption/);
    const applied = await h.outbox.get(h.messageId);
    assert.ok(applied?.response);
    assert.equal((await h.read(queue + id))!.assistanceProcessing, undefined);
    await interrupted.process(id);
    assert.deepEqual((await checkpoint(h, id)).outcome,
      {kind: "reply", disposition: "replayed"});
    assert.deepEqual(await h.outbox.get(h.messageId), applied);
  });

test("an older pending result cannot overwrite concurrent completion",
  async () => {
    const h = await harness();
    await h.claim();
    await processor(h).process(await status(h));
    const id = await reply(h);
    let allowWaiting: () => void = () => undefined;
    let entered: () => void = () => undefined;
    const started = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const wait = new Promise<void>((resolve) => {
      allowWaiting = resolve;
    });
    const lagging = new EventWhatsappWebhookProcessor(h.db, () => h.clock.now, {
      delivery: new WhatsappDeliveryStore(h.db, () => h.clock.now),
      replies: {consumeQueued: async () => {
        entered();
        await wait;
        return {kind: "waiting", reason: "deliveryUnconfirmed"};
      }},
    });
    const pending = processEventAssistanceWhatsappEvent(lagging, id);
    await started;
    await processEventAssistanceWhatsappEvent(processor(h), id);
    const complete = await checkpoint(h, id);
    allowWaiting();
    await pending;
    assert.deepEqual(await checkpoint(h, id), complete);
    assert.deepEqual(complete.outcome,
      {kind: "reply", disposition: "accepted"});
  });

test("waiting replies terminate on expiry instead of retrying indefinitely",
  async () => {
    const h = await harness();
    await h.claim();
    const id = await reply(h);
    const service = processor(h);
    await assert.rejects(processEventAssistanceWhatsappEvent(service, id),
      WhatsappReplyAwaitingDelivery);
    h.clock.now = h.intent.expiresAt;
    await processEventAssistanceWhatsappEvent(service, id);
    const done = await checkpoint(h, id);
    assert.deepEqual(done.outcome, {kind: "rejected", reason: "expired"});
    assert.equal((await h.outbox.get(h.messageId))!.response, null);
    await processEventAssistanceWhatsappEvent(service, id);
    assert.deepEqual(await checkpoint(h, id), done);
  });

test("unconfirmed failure cannot unlock fallback or trigger hot retries",
  async () => {
    const h = await harness();
    await h.claim();
    const id = await status(h, "failed");
    const service = processor(h);
    await processEventAssistanceWhatsappEvent(service, id);
    assert.deepEqual((await checkpoint(h, id)).outcome,
      {kind: "delivery", disposition: "unconfirmed"});
    assert.equal((await h.outbox.get(h.messageId))!.attempts[0].state.kind,
      "unknown");
    await processEventAssistanceWhatsappEvent(service, id);
    assert.equal((await checkpoint(h, id)).attemptCount, 1);
  });

test("verified technical failure checkpoints once without dispatching",
  async () => {
    const h = await harness();
    const claim = await h.claim();
    assert.ok(claim.kind === "claimed");
    const id = await queuedStatus(h, whatsappStatusCorrelation(
      claim.permit.attempt.attemptId, claim.resource.rendered.payloadHash),
    "failed", {errors: [{code: 131016}]});
    const service = processor(h);
    await processEventAssistanceWhatsappEvent(service, id);
    const done = await checkpoint(h, id);
    assert.deepEqual(done.outcome, {kind: "delivery", disposition: "applied"});
    const record = (await h.outbox.get(h.messageId))!;
    assert.ok(record.attempts[0].state.kind === "failed");
    assert.equal(record.attempts[0].state.classification, "technical");
    await processEventAssistanceWhatsappEvent(service, id);
    assert.deepEqual(await checkpoint(h, id), done);
    assert.equal((await h.outbox.get(h.messageId))!.attempts.length, 1);
    for (const path of h.budgetPaths) {
      assert.equal((await h.read(path))!.revision, 2);
    }
  });

test("missing or mismatched ingress evidence cannot execute a queued reply",
  async () => {
    for (const change of ["missing", "tenant", "payload", "identity"]) {
      const h = await harness();
      await h.claim();
      const id = await reply(h);
      const service = processor(h);
      if (change === "missing") h.fake.remove(receipts + id);
      if (change === "tenant") {
        await h.write(receipts + id, {...(await h.read(receipts + id)),
          organizerId: "another-organizer"});
      }
      if (change === "identity") {
        await h.write(queue + id, {...(await h.read(queue + id)),
          providerEventId: "inbound:another-message"});
      }
      if (change === "payload") {
        await service.process(id);
        await h.write(queue + id, {...(await h.read(queue + id)),
          inboundBody: "Changed after processing"});
      }
      assert.deepEqual(await service.process(id),
        {kind: "rejected", reason: "unavailable"}, change);
      assert.equal((await h.outbox.get(h.messageId))!.response, null);
    }
  });

test("the trigger retries processing failures and ignores unrelated traffic",
  async () => {
    const endpoint = onEventAssistanceWhatsappEventCreated.__endpoint;
    assert.equal(endpoint.eventTrigger?.retry, true);
    assert.equal(endpoint.eventTrigger?.eventFilterPathPatterns?.document,
      "organizerMessagingWebhookEvents/{eventId}");
    for (const input of [null, {}, {eventKind: "inbound", inboundBody: "STOP"},
      {eventKind: "status", callbackData: "campaign:123"},
      {eventKind: "inbound", inboundReply: {
        kind: "replyButton", id: "other",
      }}]) {
      assert.equal(isEventAssistanceWhatsappEvent(input), false);
    }
    await assert.rejects(processEventAssistanceWhatsappEvent({process:
      async () => {
        throw new Error("fixture-transient-firestore");
      }},
    "ignored-by-fixture"), /fixture-transient-firestore/);
    await processEventAssistanceWhatsappEvent({process: async () =>
      ({kind: "rejected", reason: "scopeMismatch"})}, "ignored-by-fixture");
  });

test("Firestore retries converge on one reply and one terminal checkpoint", {
  skip: !process.env.FIRESTORE_EMULATOR_HOST, timeout: 60_000,
}, async () => {
  assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? "",
    /^(127\.0\.0\.1|localhost|\[::1\]):\d+$/);
  const id = randomUUID();
  const app = initializeApp({projectId: "demo-catch-rules"}, "wa-queue-" + id);
  try {
    const h = await harness(getEmulatorFirestore(app), id);
    await h.claim();
    const service = processor(h);
    const replyId = await reply(h, id);
    assert.deepEqual(await service.process(replyId),
      {kind: "waiting", reason: "deliveryUnconfirmed"});
    const statusId = await status(h);
    await Promise.all(Array.from({length: 8}, () => service.process(statusId)));
    const results = await Promise.all(Array.from({length: 8}, () =>
      service.process(replyId)));
    assert.ok(results.every((r) => r.kind === "reply"));
    const message = await h.outbox.get(h.messageId);
    assert.ok(message?.response);
    const done = await checkpoint(h, replyId);
    assert.equal(done.attemptCount, 2);
    assert.equal(done.outcome.kind, "reply");
    await service.process(replyId);
    assert.deepEqual(await h.outbox.get(h.messageId), message);
    assert.deepEqual(await checkpoint(h, replyId), done);
  } finally {
    await deleteApp(app);
  }
});
