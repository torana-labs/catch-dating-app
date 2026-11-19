import {getEmulatorFirestore} from "../../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import {createHmac, randomUUID} from "node:crypto";
import test from "node:test";
import {deleteApp, initializeApp} from "firebase-admin/app";
import {Firestore, Timestamp} from "firebase-admin/firestore";
import {rcsHarness} from "./rcsDispatchTestHarness";
import {RcsCallbackStore} from "./rcsCallbackStore";
import {RcsCallbackConsumer, RCS_CALLBACK_RECEIPT_COMMAND} from
  "./rcsCallbackConsumer";
import {rcsCallbackId, rcsCallbackCollections} from "./rcsCallbackRecords";
import {VerifiedRcsCallback, rcsNativeReplyId} from "./rcsWebhookProtocol";
import {parseRcsDispatch, RCS_DISPATCHES} from "./rcsDispatchRecords";
import {guestCollections, guestIdentity, parseGuest} from "./guestRecords";
import {EVENT_ASSISTANCE_MESSAGES} from "./firestoreMessageOutbox";
import {MessageRecord, parseMessageRecord} from "./messageOutbox";
import {COMMAND_RECEIPTS} from "../../shared/commandReceipts";

const receiptPath = (callbackId: string) => `${COMMAND_RECEIPTS}/` +
  `${RCS_CALLBACK_RECEIPT_COMMAND}_${callbackId.slice("rcs-event:".length)}`;

type Harness = Awaited<ReturnType<typeof fixture>>;
const token = "fixture-only-rcs-token-12345678901234567890";
async function fixture(real?: Firestore, id = "consumer",
  choices?: MessageRecord["intent"]["choices"], privateRecipient = false) {
  const h = await rcsHarness(real, id, undefined, undefined, privateRecipient);
  if (choices) {
    const record = await h.record();
    await h.write(EVENT_ASSISTANCE_MESSAGES + "/" + h.messageId,
      parseMessageRecord({...record, intent: {...record.intent, choices}}));
  }
  const inbox = new RcsCallbackStore(h.db, () => h.clock.now);
  const consumer = new RcsCallbackConsumer(h.db, () => h.clock.now);
  const guestPath = guestCollections.guests + "/" +
    guestIdentity(h.context, h.scope.attendeeId);
  const guest = async () => parseGuest(await h.read(guestPath));
  const attempt = async () => (await h.record()).attempts[0];
  const dispatchEvidence = async () => parseRcsDispatch(await h.read(
    RCS_DISPATCHES + "/" + (await attempt()).attemptId));
  const enqueue = async (body: object) => {
    const data = Buffer.from(JSON.stringify(body));
    const result = VerifiedRcsCallback.receive({
      rawBody: Buffer.from(JSON.stringify({message: {
        data: data.toString("base64")}})),
      signature: createHmac("sha512", token).update(data).digest("base64"),
      clientToken: token, expectedAgentId: h.rcsConfig.agentId,
      receivedAt: h.clock.now});
    assert.equal(result.kind, "verified");
    if (result.kind !== "verified") throw new Error("Invalid fixture");
    await inbox.enqueue(result.callback);
    return rcsCallbackId(result.callback.evidence);
  };
  const base = () => ({agentId: h.rcsConfig.agentId,
    senderPhoneNumber: h.actor.phone});
  const reply = async (id = "reply-1", index = 0,
    type: "REPLY" | "ACTION" | undefined = "REPLY") => ({...base(),
    messageId: id, suggestionResponse: {type,
      postbackData: rcsNativeReplyId((await attempt()).attemptId, index)}});
  const delivery = async (status = "DELIVERED", eventId = "delivery-1") => {
    const dispatch = await dispatchEvidence();
    return {agentId: h.rcsConfig.agentId, eventId,
      ...(status.startsWith("TTL") ? {phoneNumber: h.actor.phone} :
        {senderPhoneNumber: h.actor.phone}),
      messageId: dispatch.providerMessageId, eventType: status};
  };
  return {...h, inbox, consumer, guestPath, guest, attempt, dispatchEvidence,
    enqueue, base, reply, delivery};
}
const consume = async (h: Harness, payload: object) =>
  h.consumer.consume(await h.enqueue(payload));

test("RCS receipts advance delivery monotonically and replay atomically",
  async () => {
    const h = await fixture();
    await h.dispatch();
    const id = await h.enqueue(await h.delivery("READ"));
    assert.equal((await h.consumer.consume(id)).kind, "delivery");
    const record = await h.record();
    assert.equal(record.attempts[0].state.kind, "read");
    assert.deepEqual(await h.consumer.consume(id),
      await h.consumer.consume(id));
    assert.deepEqual(await h.record(), record);
    assert.deepEqual(await consume(h, await h.delivery("DELIVERED", "older")),
      {kind: "delivery", messageId: h.messageId,
        attemptId: (await h.attempt()).attemptId,
        disposition: "duplicateOrOlder"});
    assert.deepEqual(await h.record(), record);
    const path = receiptPath(id);
    await h.write(path, {...await h.read(path), requestHash: "f".repeat(64)});
    await assert.rejects(h.consumer.consume(id), /inconsistent/);
  });

test("only confirmed RCS revocation enables independently permitted fallback",
  async () => {
    const h = await fixture();
    h.behavior.send = "unknown";
    await h.dispatch();
    h.clock.now = (await h.dispatchEvidence()).expiresAt + 1;
    assert.deepEqual(await consume(h,
      await h.delivery("TTL_EXPIRATION_REVOKE_FAILED")),
    {kind: "ignored", reason: "unconfirmedRevocation"});
    await h.dispatch();
    assert.equal(h.requests.filter((r) => r.method === "SMS").length, 0);
    const outcome = await consume(h,
      await h.delivery("TTL_EXPIRATION_REVOKED", "confirmed"));
    assert.equal(outcome.kind, "delivery");
    assert.equal((await h.attempt()).state.kind, "revoked");
    h.clock.now += 1001; // The shared selector retains its retry backoff.
    await h.dispatch();
    assert.equal(h.requests.filter((r) => r.method === "SMS").length, 1);
  });

test("contradictory RCS delivery and revocation retain positive evidence",
  async () => {
    for (const reverse of [false, true]) {
      const h = await fixture();
      await h.dispatch();
      h.clock.now = (await h.dispatchEvidence()).expiresAt + 1;
      const statuses = ["DELIVERED", "TTL_EXPIRATION_REVOKED"];
      if (reverse) statuses.reverse();
      for (const status of statuses) {
        await consume(h,
          await h.delivery(status, status));
      }
      assert.equal((await h.attempt()).state.kind, "delivered");
      assert.equal((await h.record()).deliveryConflict, true);
      await h.dispatch();
      assert.equal(h.requests.filter((r) => r.method === "SMS").length, 0);
    }
  });

for (const privateRecipient of [false, true]) {
  test("native reply handles a lost POST, private=" + privateRecipient,
    async () => {
      const h = await fixture(undefined, "reply", undefined, privateRecipient);
      h.behavior.beforeSend = async () => {
        assert.equal((await h.attempt()).state.kind, "unknown");
        assert.equal((await consume(h, await h.reply())).kind, "reply");
      };
      h.behavior.send = "unknown";
      await h.dispatch();
      assert.equal((await h.guest()).intention.kind, "onMyWay");
      assert.equal((await h.record()).lifecycle, "responded");
      assert.equal((await h.attempt()).state.kind, "delivered");
      assert.equal((await h.read(h.attendeePath))?.status, "registered");
      const before = await h.guest();
      await consume(h, await h.reply());
      assert.deepEqual(await h.guest(), before);
      assert.deepEqual(await consume(h, await h.reply("another-tap")),
        {kind: "rejected", reason: "alreadyResponded"});
    });
}

test("RCS preserves rendered indices and invokes typed help",
  async () => {
    const h = await fixture(undefined, "help", [
      {choiceId: "long", label: "An option too long for a native reply",
        value: {kind: "joinIntent", intention: {kind: "notComing"}}},
      {choiceId: "help", label: "Need help", value: {
        kind: "requestHelp", category: "eventLogistics"}},
    ]);
    await h.dispatch();
    assert.deepEqual((await h.dispatchEvidence()).replyBinding?.choices,
      [{index: 1, choiceId: "help"}]);
    assert.deepEqual(await consume(h, await h.reply("invalid", 0)),
      {kind: "rejected", reason: "invalidChoice"});
    const payload = await h.reply("help", 1);
    delete (payload.suggestionResponse as {type?: string}).type;
    const id = await h.enqueue(payload);
    await h.consumer.consume(id);
    await h.consumer.consume(id);
    const cases = await h.db.collection(guestCollections.cases).get();
    assert.equal(cases.size, 1);
    assert.equal(cases.docs[0].data().category, "eventLogistics");
    assert.equal(cases.docs[0].data().owner, "eventLead");
  });

test("RCS callback correlation rejects forged scope and early expiration",
  async () => {
    const changes: Array<(p: Record<string, unknown>) => void> = [
      (p) => {
        p.senderPhoneNumber = "+918888888888";
      },
      (p) => {
        p.sendTime = "2020-01-01T00:00:00Z";
      },
      (p) => {
        p.sendTime = "2099-01-01T00:00:00Z";
      },
    ];
    for (const change of changes) {
      const h = await fixture(); await h.dispatch();
      const payload = await h.reply(); change(payload);
      assert.deepEqual(await consume(h, payload),
        {kind: "rejected", reason: "scopeMismatch"});
      assert.equal((await h.record()).response, null);
    }
    const h = await fixture(); await h.dispatch();
    assert.deepEqual(await consume(h,
      await h.delivery("TTL_EXPIRATION_REVOKED")),
    {kind: "rejected", reason: "scopeMismatch"});
    assert.equal((await h.attempt()).state.kind, "accepted");
    const unrelated = {...await h.delivery(), messageId: randomUUID()};
    assert.deepEqual(await consume(h, unrelated),
      {kind: "ignored", reason: "unrelatedMessage"});
  });

test("RCS old buttons cannot replace changed guest identity or decisions",
  async () => {
    const mutations: Array<(h: Harness) => Promise<unknown>> = [
      async (h) => h.write(h.attendeePath, {...await h.read(h.attendeePath),
        phoneE164: "+918888888888"}),
      async (h) => h.write(h.attendeePath, {...await h.read(h.attendeePath),
        linkedUid: "replacement-user"}),
      async (h) => h.write(h.guestPath, {...await h.guest(),
        revision: 1, intention: {kind: "onMyWay", claimedEta: null}}),
      async (h) => {
        h.fake.generation = Timestamp.fromMillis(2);
      },
      async (h) => h.write(h.attendeePath, {...await h.read(h.attendeePath),
        status: "checkedIn"}),
      async (h) => h.progress.confirm("two"),
    ];
    for (const mutate of mutations) {
      const h = await fixture(); await h.dispatch(); await mutate(h);
      const before = await h.guest();
      assert.equal((await consume(h, await h.reply())).kind, "rejected");
      assert.deepEqual(await h.guest(), before);
      assert.equal((await h.attempt()).state.kind, "delivered");
    }
  });

test("late replies still prove delivery but cannot perform expired actions",
  async () => {
    const h = await fixture(); await h.dispatch();
    h.clock.now = (await h.dispatchEvidence()).replyBinding!.expiresAt;
    assert.deepEqual(await consume(h, await h.reply()),
      {kind: "rejected", reason: "expired"});
    assert.equal((await h.attempt()).state.kind, "delivered");
    assert.equal((await h.record()).response, null);
  });

test("sender pause and outbound opt-out do not discard a valid guest answer",
  async () => {
    const h = await fixture(); await h.dispatch();
    await h.revoke();
    await h.write(h.rcsSenderPath, {...h.rcsConfig, status: "paused"});
    assert.equal((await consume(h, await h.reply())).kind, "reply");
    assert.equal((await h.permission()).status, "revoked");
  });

test("page opens, free text and action postbacks cannot invent guest actions",
  async () => {
    const h = await fixture(); await h.dispatch();
    const action = await h.reply("action", 0, "ACTION");
    assert.deepEqual(await consume(h, action),
      {kind: "rejected", reason: "invalidChoice"});
    const page = {...await h.reply("page"), suggestionResponse: {type: "ACTION",
      postbackData: "ce-rcs-web1." + (await h.attempt()).attemptId.slice(8)}};
    assert.deepEqual(await consume(h, page),
      {kind: "ignored", reason: "guestPage"});
    assert.deepEqual(await consume(h, {...h.base(), messageId: "text",
      text: "On my way"}), {kind: "ignored", reason: "unstructured"});
    assert.deepEqual(await consume(h, {...h.base(), eventId: "stop",
      eventType: "UNSUBSCRIBE"}), {kind: "ignored", reason: "subscription"});
    assert.equal((await h.record()).response, null);
    assert.equal((await h.attempt()).state.kind, "accepted");
  });

test("callback commit failures leave neither action nor processing receipt",
  async () => {
    const h = await fixture(); await h.dispatch();
    const id = await h.enqueue(await h.reply());
    const before = await h.record();
    h.fake.failNextCommit = true;
    await assert.rejects(h.consumer.consume(id));
    assert.deepEqual(await h.record(), before);
    assert.equal(await h.read(receiptPath(id)), undefined);
    assert.equal((await h.consumer.consume(id)).kind, "reply");
  });

test("conflicted inbox evidence and missing proof cannot reach the domain",
  async () => {
    const h = await fixture(); await h.dispatch();
    const payload = await h.reply();
    const id = await h.enqueue(payload);
    await h.enqueue({...payload, suggestionResponse: {
      ...payload.suggestionResponse, text: "different signed payload"}});
    assert.deepEqual(await h.consumer.consume(id), {kind: "conflicted"});
    assert.equal((await h.record()).response, null);
    const separate = await h.enqueue(await h.reply("separate"));
    const callback = await h.read(rcsCallbackCollections.callbacks + "/" +
    separate);
    h.fake.remove(rcsCallbackCollections.identities + "/" +
    (callback?.evidence as {receiptKey: string}).receiptKey);
    await assert.rejects(h.consumer.consume(separate), /inconsistent/);
  });

test("Firestore RCS contention creates one request and receipt", {
  skip: !process.env.FIRESTORE_EMULATOR_HOST, timeout: 60_000,
}, async () => {
  assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? "",
    /^(127\.0\.0\.1|localhost|\[::1\]):\d+$/);
  const key = randomUUID();
  const app = initializeApp({projectId: "demo-rcs-consumer-" + key.slice(0, 8)},
    "rcs-consumer-" + key);
  const db = getEmulatorFirestore(app);
  try {
    const h = await fixture(db, "real", [{choiceId: "help", label: "Need help",
      value: {kind: "requestHelp", category: "eventLogistics"}}]);
    await h.dispatch();
    const id = await h.enqueue(await h.reply());
    const delivered = await h.enqueue(await h.delivery());
    await Promise.all([h.consumer.consume(delivered),
      ...Array.from({length: 4}, () => h.consumer.consume(id))]);
    assert.equal((await db.collection(guestCollections.cases).get()).size, 1);
    assert.equal((await db.collection(COMMAND_RECEIPTS)
      .where("command", "==", RCS_CALLBACK_RECEIPT_COMMAND).get()).size, 2);
    assert.equal((await h.record()).lifecycle, "responded");
    assert.equal((await h.attempt()).state.kind, "delivered");
  } finally {
    for (const collection of await db.listCollections()) {
      for (const doc of (await collection.get()).docs) await doc.ref.delete();
    }
    await deleteApp(app);
  }
});
