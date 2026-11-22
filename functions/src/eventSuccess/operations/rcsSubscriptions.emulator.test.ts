import {getEmulatorFirestore} from "../../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import {createHmac, randomUUID} from "node:crypto";
import test from "node:test";
import {deleteApp, initializeApp} from "firebase-admin/app";
import {Firestore} from "firebase-admin/firestore";
import type {Request, Response} from "express";
import {FakeFirestore} from "../../operations/testFirestore";
import {RcsCallbackStore} from "./rcsCallbackStore";
import {rcsCallbackCollections, rcsCallbackId} from "./rcsCallbackRecords";
import {VerifiedRcsCallback} from "./rcsWebhookProtocol";
import {createRcsWebhookIngress} from "./rcsWebhookIngress";
import {parseRcsSubscription, rcsSubscriptionId, RCS_SUBSCRIPTIONS,
  readRcsSubscription} from "./rcsSubscriptions";

const at = Date.parse("2026-09-08T10:00:00Z");
const agentId = "fixture-agent@rbm.goog";
const phone = "+919999999999";
const token = "fixture-rcs-subscription-token-12345678901234567890";
const body = (id = "stop-1", type = "UNSUBSCRIBE") => ({agentId,
  senderPhoneNumber: phone, eventId: id, eventType: type});
function signed(value: object) {
  const bytes = Buffer.from(JSON.stringify(value));
  return {rawBody: Buffer.from(JSON.stringify({message: {
    data: bytes.toString("base64"), publishTime: "2099-01-01T00:00:00Z",
  }})), signature: createHmac("sha512", token).update(bytes).digest("base64")};
}
function verified(value: object = body(), now = at,
  expectedAgentId = agentId) {
  const parsed = VerifiedRcsCallback.receive({...signed(value),
    clientToken: token, expectedAgentId, receivedAt: now});
  assert.equal(parsed.kind, "verified");
  if (parsed.kind !== "verified") throw new Error("Invalid fixture");
  return parsed.callback;
}
const endpoint = verified().evidence.endpointHash;
const subscriptionPath = (agent = agentId, hash = endpoint) =>
  RCS_SUBSCRIPTIONS + "/" + rcsSubscriptionId(agent, hash);
const callbackPath = (callback: VerifiedRcsCallback) =>
  rcsCallbackCollections.callbacks + "/" + rcsCallbackId(callback.evidence);
const identityPath = (callback: VerifiedRcsCallback) =>
  rcsCallbackCollections.identities + "/" + callback.evidence.receiptKey;
function harness() {
  const fake = new FakeFirestore();
  const db = fake as unknown as Firestore;
  const clock = {now: at};
  const store = new RcsCallbackStore(db, () => clock.now);
  return {fake, db, clock, store, read: (agent = agentId, hash = endpoint) =>
    db.runTransaction((tx) => readRcsSubscription(db, tx, agent, hash,
      clock.now))};
}

test("restriction shares callback acceptance and retry", async () => {
  const h = harness();
  const callback = verified();
  h.fake.failNextCommit = true;
  await assert.rejects(h.store.enqueue(callback));
  assert.deepEqual(h.fake.entries(), []);
  assert.equal(await h.read(), null);
  assert.equal(await h.store.enqueue(callback), "stored");
  const state = await h.read();
  assert.equal(state?.revision, 1);
  assert.deepEqual(state?.lastStop,
    {callbackId: rcsCallbackId(callback.evidence), observedAt: at});
  assert.equal(state?.lastSubscribeRequest, null);
  const original = h.fake.entries();
  h.clock.now++;
  assert.equal(await h.store.enqueue(verified(body(), h.clock.now)),
    "duplicate");
  assert.deepEqual(h.fake.entries(), original);
  assert.ok(!JSON.stringify(original).includes(phone));
  assert.ok(!JSON.stringify(original).includes(token));
});

test("START retains the stop and never creates event permission", async () => {
  for (const startsFirst of [false, true]) {
    const h = harness();
    const stop = verified();
    const start = verified(body("start-1", "SUBSCRIBE"));
    const ordered = startsFirst ? [start, stop] : [stop, start];
    for (const callback of ordered) {
      await h.store.enqueue(callback);
      h.clock.now++;
    }
    const state = await h.read();
    assert.equal(state?.lastStop?.callbackId, rcsCallbackId(stop.evidence));
    assert.equal(state?.lastSubscribeRequest?.callbackId,
      rcsCallbackId(start.evidence));
    assert.equal(state?.revision, 2);
    assert.ok(h.fake.entries().every(([path]) =>
      [RCS_SUBSCRIPTIONS, ...Object.values(rcsCallbackCollections)]
        .some((collection) => path.startsWith(collection + "/"))));
    const before = h.fake.entries();
    await h.store.enqueue(start);
    assert.deepEqual(h.fake.entries(), before);
  }
  const h = harness();
  await h.store.enqueue(verified(body("start-only", "SUBSCRIBE")));
  assert.equal((await h.read())?.lastStop, null);
  assert.equal(h.fake.entries().length, 3);
});

test("country keyword and event observations both restrict", async () => {
  for (const [recipient, stopWord, startWord] of [
    [phone, "STOP", "START"],
    ["+34612345678", "BAJA", "ALTA"],
    ["+5511999999999", "parar", "começar"],
    ["+33612345678", "STOP", "Démarrer"],
  ]) {
    const h = harness();
    const base = {agentId, senderPhoneNumber: recipient};
    const stop = verified({...base, messageId: "keyword-stop", text: stopWord});
    const start = verified({...base, messageId: "keyword-start",
      text: startWord});
    await h.store.enqueue(stop);
    await h.store.enqueue(start);
    const state = await h.read(agentId, stop.evidence.endpointHash);
    assert.ok(state?.lastStop);
    assert.ok(state?.lastSubscribeRequest);
    assert.equal(state?.revision, 2);
    const event = verified({...body(), senderPhoneNumber: recipient});
    await h.store.enqueue(event);
    const before = h.fake.entries();
    await h.store.enqueue(stop);
    await h.store.enqueue(start);
    assert.deepEqual(h.fake.entries(), before);
  }
});

test("subscription scope survives event and credential rotation", async () => {
  const h = harness();
  await h.store.enqueue(verified());
  // No event, attendee, sender config or credential version participates in
  // conversation identity. Different agents and phones remain independent.
  assert.ok((await h.read())?.lastStop);
  assert.equal(await h.read("other-agent", endpoint), null);
  const other = verified({...body(), senderPhoneNumber: "+919999999998"});
  assert.equal(await h.read(agentId, other.evidence.endpointHash), null);
  await h.store.enqueue(other);
  await h.store.enqueue(verified({...body(), agentId: "other-agent"}, at,
    "other-agent"));
  assert.equal(h.fake.entries().filter(([path]) =>
    path.startsWith(RCS_SUBSCRIPTIONS + "/")).length, 3);
});

test("conflicting subscription payloads preserve restrictions", async () => {
  for (const order of [["SUBSCRIBE", "UNSUBSCRIBE"],
    ["UNSUBSCRIBE", "SUBSCRIBE"]]) {
    const h = harness();
    const first = verified(body("one-provider-id", order[0]));
    const second = verified(body("one-provider-id", order[1]));
    await h.store.enqueue(first);
    const original = h.fake.entries();
    h.fake.failNextCommit = true;
    await assert.rejects(h.store.enqueue(second));
    assert.deepEqual(h.fake.entries(), original);
    assert.equal(await h.store.enqueue(second), "conflict");
    assert.ok((await h.read())?.lastStop);
    assert.ok((await h.read())?.lastSubscribeRequest);
    assert.deepEqual(await h.db.runTransaction((tx) =>
      h.store.readForConsumption(tx, rcsCallbackId(second.evidence))),
    {kind: "conflicted"});
  }
});

test("provider time cannot clear a stop or extend a replay", async () => {
  for (const sendTime of [undefined, "2000-01-01T00:00:00Z",
    "2099-01-01T00:00:00Z"]) {
    const h = harness();
    const raw = {...body(), ...(sendTime ? {sendTime} : {})};
    const stop = verified(raw);
    await h.store.enqueue(stop);
    h.clock.now += 10_000;
    await h.store.enqueue(verified({...body("start", "SUBSCRIBE"),
      sendTime: "2099-01-01T00:00:00Z"}, h.clock.now));
    assert.equal((await h.read())?.lastStop?.observedAt, at);
    const original = h.fake.entries();
    await h.store.enqueue(verified(raw, h.clock.now));
    assert.deepEqual(h.fake.entries(), original);
  }
});

test("older inbox records repair without overwriting newer stops", async () => {
  const h = harness();
  const old = verified();
  await h.store.enqueue(old);
  h.fake.remove(subscriptionPath()); // Before subscription projection existed.
  h.clock.now += 1000;
  assert.equal(await h.store.enqueue(old), "duplicate");
  assert.equal((await h.read())?.lastStop?.observedAt, at);
  const newer = verified(body("new-stop"), h.clock.now);
  await h.store.enqueue(newer);
  const original = h.fake.entries();
  await h.store.enqueue(old);
  assert.deepEqual(h.fake.entries(), original);
  assert.equal((await h.read())?.lastStop?.callbackId,
    rcsCallbackId(newer.evidence));
});

test("same-clock stop observations converge in either order", async () => {
  const stops = [verified(body("stop-a")), verified(body("stop-b"))];
  const selected = stops.map((s) => rcsCallbackId(s.evidence)).sort().at(-1);
  for (const order of [stops, [...stops].reverse()]) {
    const h = harness();
    for (const item of order) await h.store.enqueue(item);
    assert.equal((await h.read())?.lastStop?.callbackId, selected);
    const original = h.fake.entries();
    for (const item of order) await h.store.enqueue(item);
    assert.deepEqual(h.fake.entries(), original);
  }
});

test("subscription reader rejects corrupt or missing provenance", async () => {
  const stop = verified();
  for (const mutate of [
    (h: ReturnType<typeof harness>) => h.fake.remove(callbackPath(stop)),
    (h: ReturnType<typeof harness>) => h.fake.write(subscriptionPath(),
      {...h.fake.read(subscriptionPath()), endpointHash: "a".repeat(64)}),
    (h: ReturnType<typeof harness>) => h.fake.write(subscriptionPath(),
      {...h.fake.read(subscriptionPath()), lastStop: {
        callbackId: rcsCallbackId(stop.evidence), observedAt: at - 1,
      }, updatedAt: at - 1}),
    (h: ReturnType<typeof harness>) => {
      h.clock.now = at - 1;
    },
  ]) {
    const h = harness();
    await h.store.enqueue(stop);
    mutate(h);
    await assert.rejects(h.read());
    const original = h.fake.entries();
    await assert.rejects(h.store.enqueue(verified(body("next-stop"))));
    assert.deepEqual(h.fake.entries(), original);
  }
  const h = harness();
  await h.store.enqueue(stop);
  await h.store.enqueue(verified(body("start", "SUBSCRIBE")));
  const state = (await h.read())!;
  h.fake.write(subscriptionPath(), {...state, lastStop:
    state.lastSubscribeRequest});
  await assert.rejects(h.read());
});

test("schema rejects unbound subscription state", async () => {
  const h = harness();
  await h.store.enqueue(verified());
  const state = (await h.read())!;
  for (const patch of [
    {lastStop: null, lastSubscribeRequest: null},
    {phone}, {routeId: "catchEventSms"}, {revision: 0},
    {revision: Number.MAX_SAFE_INTEGER + 1}, {updatedAt: at - 1},
    {subscriptionId: state.subscriptionId + "\n"},
    {lastStop: {...state.lastStop, callbackId: "../foreign"}},
  ]) assert.throws(() => parseRcsSubscription({...state, ...patch}));
  for (const [agent, hash] of [[agentId + "\n", endpoint],
    [agentId, endpoint + "\n"], ["../agent", endpoint]]) {
    assert.throws(() => rcsSubscriptionId(agent, hash));
  }
});

test("HTTP accepts STOP only after subscription storage commits", async () => {
  const h = harness();
  let status = 0;
  const response = {set() {
    return this;
  }, status(code: number) {
    status = code; return this;
  }, send() {
    return this;
  }};
  const handler = createRcsWebhookIngress({enabled: () => true,
    credentials: async () => ({agentId, clientToken: token}),
    enqueue: (callback) => h.store.enqueue(callback),
    clock: () => h.clock.now, failed: () => undefined});
  const deliver = async (signature?: string) => {
    const raw = signed(body());
    await handler({method: "POST", rawBody: raw.rawBody,
      headers: {"x-goog-signature": signature ?? raw.signature},
    } as unknown as Request, response as unknown as Response);
  };
  await deliver("invalid");
  assert.notEqual(status, 200);
  assert.deepEqual(h.fake.entries(), []);
  h.fake.failNextCommit = true;
  await deliver();
  assert.equal(status, 503);
  assert.deepEqual(h.fake.entries(), []);
  await deliver();
  assert.equal(status, 200);
  assert.ok((await h.read())?.lastStop);
});

test("Firestore subscription races retain both observations", {
  skip: !process.env.FIRESTORE_EMULATOR_HOST,
}, async () => {
  const key = randomUUID();
  const projectId = "demo-rcs-sub-" + key.slice(0, 8);
  const firstApp = initializeApp({projectId}, "rcs-sub-first-" + key);
  const secondApp = initializeApp({projectId}, "rcs-sub-second-" + key);
  const db = getEmulatorFirestore(firstApp);
  const other = getEmulatorFirestore(secondApp);
  const first = new RcsCallbackStore(db, () => at);
  const second = new RcsCallbackStore(other, () => at);
  const stop = verified();
  const start = verified(body("start", "SUBSCRIBE"));
  const effect = db.collection("rcsSubscriptionTestEffects").doc(key);
  try {
    const [, , consumer] = await Promise.all([
      first.enqueue(stop), second.enqueue(start),
      db.runTransaction(async (tx) => {
        const facts = await readRcsSubscription(db, tx, agentId, endpoint, at);
        if (!facts?.lastStop) tx.create(effect, {beforeStop: true});
        return !facts?.lastStop;
      }),
    ]);
    assert.equal((await effect.get()).exists, consumer);
    const read = () => db.runTransaction((tx) =>
      readRcsSubscription(db, tx, agentId, endpoint, at));
    const state = (await read())!;
    assert.ok(state.lastStop);
    assert.ok(state.lastSubscribeRequest);
    await Promise.all([first.enqueue(start), second.enqueue(stop)]);
    assert.deepEqual(await read(), state);
  } finally {
    await Promise.all([callbackPath(stop), callbackPath(start),
      identityPath(stop), identityPath(start), subscriptionPath(), effect.path,
    ].map((path) => db.doc(path).delete()));
    await Promise.all([deleteApp(firstApp), deleteApp(secondApp)]);
  }
});
