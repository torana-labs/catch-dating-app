import {getEmulatorFirestore} from "../../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import {createHmac, randomUUID} from "node:crypto";
import test from "node:test";
import {deleteApp, initializeApp} from "firebase-admin/app";
import {Firestore} from "firebase-admin/firestore";
import type {Request, Response} from "express";
import {FakeFirestore} from "../../operations/testFirestore";
import {createRcsWebhookIngress} from "./rcsWebhookIngress";
import {VerifiedRcsCallback} from "./rcsWebhookProtocol";
import {RcsCallbackStore} from "./rcsCallbackStore";
import {RCS_SUBSCRIPTIONS} from "./rcsSubscriptions";
import {
  parseRcsCallback,
  parseRcsCallbackIdentity,
  rcsCallbackCollections,
  rcsCallbackId,
  rcsCallbackReceiptKey,
  RcsCallbackDocument,
} from "./rcsCallbackRecords";

const at = Date.parse("2026-09-08T10:00:00Z");
const token = "fixture-only-rcs-token-12345678901234567890";
const agentId = "fixture-agent@rbm.goog";
function payload() {
  return {
    agentId,
    senderPhoneNumber: "+919999999999",
    eventId: "provider-event-1",
    messageId: "provider-message-1",
    eventType: "DELIVERED",
    sendTime: "2026-09-08T09:59:59.123456789Z",
  };
}
function signed(value: object) {
  const data = Buffer.from(JSON.stringify(value));
  return {
    rawBody: Buffer.from(
      JSON.stringify({
        message: {
          data: data.toString("base64"),
          messageId: "unsigned-wrapper-id",
        },
      }),
    ),
    signature: createHmac("sha512", token).update(data).digest("base64"),
  };
}
function verified(
  value: object = payload(),
  receivedAt = at,
  expectedAgentId = agentId,
): VerifiedRcsCallback {
  const result = VerifiedRcsCallback.receive({
    ...signed(value),
    clientToken: token,
    expectedAgentId,
    receivedAt,
  });
  assert.equal(result.kind, "verified");
  if (result.kind !== "verified") {
    throw new Error("Expected verified fixture");
  }
  return result.callback;
}
function harness() {
  const fake = new FakeFirestore();
  const db = fake as unknown as Firestore;
  const clock = {now: at};
  const store = new RcsCallbackStore(db, () => clock.now);
  const consume = (callback: VerifiedRcsCallback) =>
    db.runTransaction((tx) =>
      store.readForConsumption(tx, rcsCallbackId(callback.evidence)),
    );
  return {fake, db, clock, store, consume};
}
const eventPath = (callback: VerifiedRcsCallback) =>
  rcsCallbackCollections.callbacks + "/" + rcsCallbackId(callback.evidence);
const identityPath = (callback: VerifiedRcsCallback) =>
  rcsCallbackCollections.identities + "/" + callback.evidence.receiptKey;

test("callback and identity commit atomically", async () => {
  const h = harness();
  const callback = verified();
  assert.equal(await h.store.enqueue(callback), "stored");
  const row = parseRcsCallback(
    h.fake.read(eventPath(callback)),
    rcsCallbackId(callback.evidence),
  );
  assert.equal(
    row.evidence.providerOccurredAt,
    "2026-09-08T09:59:59.123456789Z",
  );
  assert.equal(row.storedAt, at);
  assert.equal((await h.consume(callback)).kind, "ready");
  const original = h.fake.entries();
  h.clock.now += 5000;
  assert.equal(
    await h.store.enqueue(verified(payload(), h.clock.now)),
    "duplicate",
  );
  assert.deepEqual(h.fake.entries(), original);
  assert.ok(!JSON.stringify(original).includes("+919999999999"));
  assert.ok(!JSON.stringify(original).includes(token));
});

test("failed acceptance rolls back both records for retry", async () => {
  const h = harness();
  const callback = verified();
  h.fake.failNextCommit = true;
  await assert.rejects(h.store.enqueue(callback));
  assert.deepEqual(h.fake.entries(), []);
  h.clock.now++;
  assert.equal(await h.store.enqueue(callback), "stored");
  assert.equal(h.fake.entries().length, 2);
  assert.equal(await h.store.enqueue(callback), "duplicate");
});

test("signed conflicts retain variants and withhold consumers", async () => {
  const h = harness();
  const first = verified();
  await h.store.enqueue(first);
  const original = h.fake.read(eventPath(first));
  const changed = verified({...payload(), eventType: "READ"});
  h.clock.now++;
  assert.equal(await h.store.enqueue(changed), "conflict");
  assert.deepEqual(h.fake.read(eventPath(first)), original);
  const identity = h.fake.read(identityPath(first));
  const third = verified({
    ...payload(),
    eventType: "READ",
    future: "field",
  });
  h.clock.now++;
  assert.equal(await h.store.enqueue(third), "conflict");
  assert.equal(h.fake.entries().length, 4);
  assert.deepEqual(h.fake.read(identityPath(first)), identity);
  assert.equal(await h.store.enqueue(first), "conflict");
  for (const callback of [first, changed, third]) {
    assert.deepEqual(await h.consume(callback), {kind: "conflicted"});
  }
});

test("conflict rollback cannot leave an unmarked variant", async () => {
  const h = harness();
  const first = verified();
  await h.store.enqueue(first);
  const original = h.fake.entries();
  const second = verified({...payload(), eventType: "READ"});
  h.fake.failNextCommit = true;
  await assert.rejects(h.store.enqueue(second));
  assert.deepEqual(h.fake.entries(), original);
  assert.equal((await h.consume(first)).kind, "ready");
  assert.equal(await h.store.enqueue(second), "conflict");
  assert.equal((await h.consume(first)).kind, "conflicted");
});

test("provider identity dimensions remain independent", async () => {
  const h = harness();
  const callbacks = [
    verified(),
    verified({...payload(), eventId: "another-event"}),
    verified({...payload(), senderPhoneNumber: "+919999999998"}),
    verified({...payload(), agentId: "other-agent"}, at, "other-agent"),
    verified({
      agentId,
      senderPhoneNumber: "+919999999999",
      messageId: "provider-event-1",
      text: "Private unstructured text",
    }),
  ];
  for (const callback of callbacks) {
    assert.equal(await h.store.enqueue(callback), "stored");
    assert.equal((await h.consume(callback)).kind, "ready");
  }
  assert.equal(h.fake.entries().length, callbacks.length * 2);
  assert.ok(
    !JSON.stringify(h.fake.entries()).includes("Private unstructured"),
  );
});

test("canonical observations cannot invent guest effects", async () => {
  const h = harness();
  const base = {agentId, senderPhoneNumber: "+919999999999"};
  const messages = [
    {eventType: "DELIVERED", eventId: "delivery", messageId: "message"},
    {eventType: "READ", eventId: "read", messageId: "message"},
    {eventId: "subscribe", eventType: "SUBSCRIBE"},
    {eventId: "unsubscribe", eventType: "UNSUBSCRIBE"},
    {messageId: "keyword", text: "STOP"},
    {
      messageId: "native",
      suggestionResponse: {
        type: "REPLY",
        postbackData: "ce-rcs1." + "a".repeat(64) + ".2",
      },
    },
    {
      eventId: "native-event",
      suggestionResponse: {
        type: "ACTION",
        postbackData: "ce-rcs-web1." + "a".repeat(64),
      },
    },
    {
      messageId: "unknown-native",
      suggestionResponse: {
        postbackData: "foreign-choice",
      },
    },
    {messageId: "text", text: "private text"},
    {messageId: "location", location: {latitude: 1, longitude: 2}},
    {
      messageId: "file",
      userFile: {payload: {fileUrl: "https://private.invalid"}},
    },
  ];
  const callbacks = messages.map((value) =>
    verified({...base, ...value}),
  );
  for (const type of [
    "TTL_EXPIRATION_REVOKED",
    "TTL_EXPIRATION_REVOKE_FAILED",
  ]) {
    callbacks.push(
      verified({
        agentId,
        phoneNumber: base.senderPhoneNumber,
        eventId: type,
        messageId: "expired-message",
        eventType: type,
      }),
    );
  }
  for (const callback of callbacks) {
    await h.store.enqueue(callback);
    const result = await h.consume(callback);
    assert.equal(result.kind, "ready");
    if (result.kind !== "ready") throw new Error("Expected ready");
    assert.deepEqual(
      result.record.evidence.observation,
      callback.evidence.observation,
    );
    assert.equal(result.record.evidence.providerOccurredAt, null);
  }
  assert.ok(
    h.fake
      .entries()
      .every(([path]) =>
        [...Object.values(rcsCallbackCollections), RCS_SUBSCRIPTIONS]
          .some((prefix) =>
            path.startsWith(prefix + "/"),
          ),
      ),
  );
  const stored = JSON.stringify(h.fake.entries());
  for (const privateValue of [
    "private text",
    "private.invalid",
    "latitude",
  ]) {
    assert.ok(!stored.includes(privateValue));
  }
});

test("plain records and forged prototypes lack authority", async () => {
  const h = harness();
  const callback = verified();
  for (const value of [
    {evidence: callback.evidence},
    structuredClone(callback.evidence),
    Object.create(VerifiedRcsCallback.prototype),
  ]) {
    await assert.rejects(h.store.enqueue(value as VerifiedRcsCallback));
  }
  assert.deepEqual(h.fake.entries(), []);
});

test("corrupt identities cannot become consumable", async () => {
  const callback = verified();
  for (const mutate of [
    (h: ReturnType<typeof harness>) =>
      h.fake.remove(identityPath(callback)),
    (h: ReturnType<typeof harness>) =>
      h.fake.write(identityPath(callback), {
        ...h.fake.read(identityPath(callback)),
        primaryCallbackId: "rcs-event:" + "0".repeat(64),
      }),
    (h: ReturnType<typeof harness>) =>
      h.fake.write(identityPath(callback), {
        ...h.fake.read(identityPath(callback)),
        firstStoredAt: at - 1,
      }),
    (h: ReturnType<typeof harness>) => {
      h.clock.now = at - 1;
    },
    (h: ReturnType<typeof harness>) =>
      h.fake.write(eventPath(callback), {
        ...h.fake.read(eventPath(callback)),
        storedAt: at - 1,
      }),
  ]) {
    const h = harness();
    await h.store.enqueue(callback);
    mutate(h);
    await assert.rejects(h.consume(callback));
    await assert.rejects(h.store.enqueue(callback));
  }
  assert.deepEqual(await harness().consume(callback), {kind: "missing"});
  const h = harness();
  h.clock.now = at - 1;
  await assert.rejects(h.store.enqueue(callback));
  assert.deepEqual(h.fake.entries(), []);
});

test("schema and semantic guards reject corrupt evidence", () => {
  const evidence = verified().evidence;
  const row: RcsCallbackDocument = {
    schemaVersion: 1,
    callbackId: rcsCallbackId(evidence),
    evidence,
    storedAt: at,
  };
  for (const patch of [
    {endpointHash: "foreign"},
    {receivedAt: at + 1},
    {phone: "+919999999999"},
    {providerOccurredAt: "2026-02-30T00:00:00Z"},
    {providerOccurredAt: "2026-09-08T10:00:00Z\n"},
    {providerEventId: "\ud800"},
    {payloadHash: "c".repeat(64)},
    {observation: {...evidence.observation, text: "private"}},
  ]) {
    assert.throws(() =>
      parseRcsCallback(
        {...row, evidence: {...evidence, ...patch}},
        row.callbackId,
      ),
    );
  }
  const wrongFamily = {...evidence, eventFamily: "serverEvent" as const};
  wrongFamily.receiptKey = rcsCallbackReceiptKey(wrongFamily);
  const id = rcsCallbackId(wrongFamily);
  assert.throws(() =>
    parseRcsCallback({...row, callbackId: id, evidence: wrongFamily}, id),
  );
  assert.throws(() =>
    parseRcsCallbackIdentity(
      {
        schemaVersion: 1,
        receiptKey: evidence.receiptKey,
        primaryCallbackId: row.callbackId,
        firstStoredAt: at,
        conflictedAt: at - 1,
      },
      evidence.receiptKey,
    ),
  );
});

test("HTTP acknowledgement follows durable acceptance", async () => {
  const h = harness();
  const sent: Array<{ status: number; body: string }> = [];
  let status = 0;
  const response = {
    set() {
      return this;
    },
    status(value: number) {
      status = value;
      return this;
    },
    send(body: string) {
      sent.push({status, body});
      return this;
    },
  };
  const ingress = createRcsWebhookIngress({
    enabled: () => true,
    credentials: async () => ({agentId, clientToken: token}),
    enqueue: (callback) => h.store.enqueue(callback),
    clock: () => h.clock.now,
    failed: () => undefined,
  });
  const deliver = async (body: object) => {
    const raw = signed(body);
    await ingress(
      {
        method: "POST",
        rawBody: raw.rawBody,
        headers: {"x-goog-signature": raw.signature},
      } as unknown as Request,
      response as unknown as Response,
    );
  };
  h.fake.failNextCommit = true;
  await deliver(payload());
  assert.equal(sent.at(-1)?.status, 503);
  assert.equal(h.fake.entries().length, 0);
  for (const body of [
    payload(),
    payload(),
    {...payload(), eventType: "READ"},
  ]) {
    await deliver(body);
    assert.equal(sent.at(-1)?.status, 200);
  }
  assert.equal(h.fake.entries().length, 3);
  assert.equal((await h.consume(verified())).kind, "conflicted");
});

test(
  "Firestore clients converge on one identity and retain conflicting variants",
  {skip: !process.env.FIRESTORE_EMULATOR_HOST},
  async () => {
    const key = randomUUID();
    const projectId = "demo-rcs-inbox-" + key.slice(0, 8);
    const firstApp = initializeApp({projectId}, "rcs-first-" + key);
    const secondApp = initializeApp({projectId}, "rcs-second-" + key);
    const db = getEmulatorFirestore(firstApp);
    const otherDb = getEmulatorFirestore(secondApp);
    const first = new RcsCallbackStore(db, () => at);
    const second = new RcsCallbackStore(otherDb, () => at);
    const callback = verified();
    const conflict = verified({...payload(), eventType: "READ"});
    const effectRef = db.collection("rcsCallbackTestEffects").doc(key);
    try {
      const results = await Promise.all([
        first.enqueue(callback),
        second.enqueue(callback),
        first.enqueue(callback),
        second.enqueue(callback),
      ]);
      assert.equal(results.filter((r) => r === "stored").length, 1);
      assert.equal(results.filter((r) => r === "duplicate").length, 3);
      const [conflictResult, consumption] = await Promise.all([
        second.enqueue(conflict),
        db.runTransaction(async (tx) => {
          const current = await first.readForConsumption(tx,
            rcsCallbackId(callback.evidence));
          if (current.kind === "ready") tx.create(effectRef, {applied: true});
          return current.kind;
        }),
      ]);
      assert.equal(conflictResult, "conflict");
      // An effect committed before the conflict is not undone. A consumer
      // that loses the race cannot commit a stale ready observation.
      assert.equal((await effectRef.get()).exists, consumption === "ready");
      for (const target of [callback, conflict]) {
        assert.deepEqual(
          await db.runTransaction((tx) =>
            first.readForConsumption(tx, rcsCallbackId(target.evidence)),
          ),
          {kind: "conflicted"},
        );
      }
    } finally {
      await Promise.all(
        [
          eventPath(callback),
          eventPath(conflict),
          identityPath(callback),
          effectRef.path,
        ].map((path) => db.doc(path).delete()),
      );
      await Promise.all([deleteApp(firstApp), deleteApp(secondApp)]);
    }
  },
);
