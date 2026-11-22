import assert from "node:assert/strict";
import {createHmac} from "node:crypto";
import {test} from "node:test";
import * as admin from "firebase-admin";
import {handleCatchWhatsappWebhook, MAX_WEBHOOK_BYTES, MAX_WEBHOOK_EVENTS,
  parseCatchWhatsappWebhook, WEBHOOK_RETENTION_MILLIS} from
  "./whatsappWebhookProtocol";
import type {CatchWebhookConfig, CatchWebhookEvent} from
  "./whatsappWebhookProtocol";
import {CATCH_WEBHOOK_COLLECTION, persistCatchWhatsappWebhookEvents} from
  "./whatsappWebhook";
import {validateCatchWhatsappWebhookEventDocument} from
  "../shared/generated/validators/catchWhatsappWebhookEventDocument";
import {FormPaymentTestStore} from
  "../payments/formPayments/formPaymentTestStore";
import {assertCatchIngressAccepted, CATCH_INGRESS_EVIDENCE} from
  "./whatsappIngressStore";
import {readCatchReceipt} from "./whatsappEndpointStops";

const config: CatchWebhookConfig = {wabaId: "123",
  phoneNumberId: "456", appSecret: "test-app-secret-keep-private",
  verifyToken: "test-only-verification-token-32-characters"};
const incoming = {id: "wamid.inbound", from: "919000000001",
  timestamp: "1790854245", type: "text", text: {body: "Hello Catch"}};
function payload(messages: object[] = [incoming], statuses: object[] = [],
  wabaId = config.wabaId, phoneNumberId = config.phoneNumberId): Buffer {
  return Buffer.from(JSON.stringify({object: "whatsapp_business_account",
    entry: [{id: wabaId, changes: [{field: "messages", value: {
      messaging_product: "whatsapp", metadata: {phone_number_id: phoneNumberId},
      contacts: [{profile: {name: "Must not be retained"}}], messages, statuses,
    }}]}]}));
}
function signed(rawBody: Buffer, secret = config.appSecret) {
  return {method: "POST", query: {}, rawBody,
    signature: "sha256=" + createHmac("sha256", secret)
      .update(rawBody).digest("hex")};
}
function status(name: string, seconds = "1790854250") {
  return {id: "wamid.outbound", status: name, timestamp: seconds,
    recipient_id: "919000000001"};
}
const mustNotWrite = async () => {
  throw new Error("Unexpected persistence");
};

test("verification echoes the exact challenge without persisting", async () => {
  const result = await handleCatchWhatsappWebhook({method: "GET", query: {
    "hub.mode": "subscribe", "hub.verify_token": config.verifyToken,
    "hub.challenge": "0042143",
  }}, config, mustNotWrite);
  assert.deepEqual(result, {status: 200, body: "0042143"});
});

test("wrong tokens and any missing credential fail closed before persistence",
  async () => {
    for (const token of ["wrong", [config.verifyToken], undefined]) {
      assert.equal((await handleCatchWhatsappWebhook({method: "GET", query: {
        "hub.mode": "subscribe", "hub.verify_token": token,
        "hub.challenge": "challenge",
      }}, config, mustNotWrite)).status, 403);
    }
    for (const patch of [{wabaId: ""}, {phoneNumberId: ""}, {wabaId: " "},
      {appSecret: ""}, {verifyToken: ""}, {verifyToken: "t".repeat(31)}]) {
      assert.equal((await handleCatchWhatsappWebhook(signed(payload()),
        {...config, ...patch}, mustNotWrite)).status, 503);
    }
  });

test("signature checks exact raw bytes and the configured app secret",
  async () => {
    const raw = payload();
    for (const request of [{...signed(raw), signature: undefined},
      signed(raw, "foreign-app-secret"),
      {...signed(raw), rawBody: Buffer.concat([raw, Buffer.from(" ")])},
      {...signed(raw), signature: "sha256=short"}]) {
      assert.equal((await handleCatchWhatsappWebhook(request, config,
        mustNotWrite)).status, 401);
    }
  });

test("a signed foreign WABA or phone cannot enter Catch storage", async () => {
  let writes = 0;
  for (const raw of [payload([incoming], [], "999"),
    payload([incoming], [], config.wabaId, "999")]) {
    const result = await handleCatchWhatsappWebhook(signed(raw), config,
      async () => {
        writes += 1;
      });
    assert.equal(result.status, 403);
  }
  // A valid first entry must not be persisted when a later entry is foreign.
  const mixed = JSON.parse(payload().toString());
  mixed.entry.push(JSON.parse(payload([incoming], [], "999").toString())
    .entry[0]);
  assert.equal((await handleCatchWhatsappWebhook(signed(Buffer.from(
    JSON.stringify(mixed))), config, async () => {
    writes += 1;
  })).status, 403);
  assert.equal(writes, 0);
});

test("accepted messages and statuses are private receipts", async () => {
  const raw = payload([{...incoming, text: {body: "x".repeat(5000)}}],
    [{...status("failed"), errors: [{code: 131026,
      message: "Do not retain error details"}]}]);
  let saved: CatchWebhookEvent[] = [];
  const result = await handleCatchWhatsappWebhook(signed(raw), config,
    async (events) => {
      saved = events;
    });
  assert.equal(result.status, 200);
  assert.equal(saved.length, 2);
  assert.equal(saved[0].text?.length, 4096);
  assert.equal(saved[0].textTruncated, true);
  assert.deepEqual(saved[1].errorCodes, [131026]);
  assert.equal(saved[1].text, null);
  assert.equal(JSON.stringify(saved).includes("Must not be retained"), false);
  assert.equal(JSON.stringify(saved).includes("Do not retain"), false);
  assert.equal(JSON.stringify(saved).includes(config.appSecret), false);
});

test("status receipts preserve out-of-order observations and stable replay ids",
  () => {
    const statuses = [status("read", "1790854260"),
      status("sent", "1790854245"), status("delivered", "1790854250")];
    const first = parseCatchWhatsappWebhook(payload([], statuses), config);
    const reversed = parseCatchWhatsappWebhook(payload([], [...statuses]
      .reverse()), config);
    assert.deepEqual(new Set(first.map((event) => event.eventId)),
      new Set(reversed.map((event) => event.eventId)));
    assert.deepEqual(first.map((event) => event.deliveryStatus),
      ["read", "sent", "delivered"]);
    assert.equal(new Set(first.map((event) => event.eventId)).size, 3);
  });

test("Meta receives a retryable failure if persistence is unavailable",
  async () => {
    const result = await handleCatchWhatsappWebhook(signed(payload()), config,
      async () => {
        throw new Error("private database detail");
      });
    assert.equal(result.status, 503);
    assert.equal(result.body.includes("private database detail"), false);
  });

test("success is returned only after persistence completes", async () => {
  let release: () => void = () => {
    throw new Error("Not initialized");
  };
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let finished = false;
  const result = handleCatchWhatsappWebhook(signed(payload()), config,
    () => gate).then((response) => {
    finished = true; return response;
  });
  await Promise.resolve();
  assert.equal(finished, false);
  release();
  assert.equal((await result).status, 200);
});

test("invalid or excessive signed payloads cannot be acknowledged or truncated",
  async () => {
    const raws = [Buffer.from("not-json"), Buffer.from("{}"),
      payload([{...incoming, timestamp: "bad"}]),
      payload([{...incoming, id: "x".repeat(241)}]),
      payload(Array.from({length: MAX_WEBHOOK_EVENTS + 1}, (_, index) =>
        ({...incoming, id: "wamid." + index}))),
      payload([], [status("made-up-status")])];
    for (const raw of raws) {
      assert.equal((await handleCatchWhatsappWebhook(signed(raw), config,
        mustNotWrite)).status, 400);
    }
    assert.equal((await handleCatchWhatsappWebhook(signed(Buffer.alloc(
      MAX_WEBHOOK_BYTES + 1)), config, mustNotWrite)).status, 413);
    assert.equal((await handleCatchWhatsappWebhook({method: "DELETE",
      query: {}},
    config, mustNotWrite)).status, 405);
  });

test("unsubscribed fields are ignored without storing their private payload",
  async () => {
    const raw = Buffer.from(JSON.stringify({object: "whatsapp_business_account",
      entry: [{id: config.wabaId, changes: [{field: "account_update",
        value: {privateField: "ignored"}}]}]}));
    let saved: CatchWebhookEvent[] | undefined;
    assert.equal((await handleCatchWhatsappWebhook(signed(raw), config,
      async (events) => {
        saved = events;
      })).status, 200);
    assert.deepEqual(saved, []);
  });

function store() {
  const fake = new FormPaymentTestStore();
  let errorCode: number | undefined;
  const db = {
    collection: (name: string) => fake.collection(name),
    runTransaction: async (
      work: Parameters<FormPaymentTestStore["runTransaction"]>[0]
    ) => {
      if (errorCode !== undefined) {
        throw Object.assign(new Error("Injected failure"), {code: errorCode});
      }
      return fake.runTransaction(work);
    },
  };
  return {docs: fake.records, db: db as unknown as FirebaseFirestore.Firestore,
    fail: (code: number) => {
      errorCode = code;
    }};
}

test("concurrent retries preserve one receipt and its original TTL",
  async () => {
    const db = store();
    const events = parseCatchWhatsappWebhook(payload(), config);
    const now = 1790854245000;
    await Promise.all([persistCatchWhatsappWebhookEvents(db.db, events, now),
      persistCatchWhatsappWebhookEvents(db.db, events, now + 1000)]);
    const receipts = [...db.docs].filter(([key]) =>
      key.startsWith(CATCH_WEBHOOK_COLLECTION + "/"));
    const evidence = [...db.docs].filter(([key]) =>
      key.startsWith(CATCH_INGRESS_EVIDENCE + "/"));
    assert.equal(receipts.length, 1);
    assert.equal(evidence.length, 1);
    assert.equal(db.docs.size, 2);
    const [key, document] = receipts[0];
    assert.ok(key.startsWith(CATCH_WEBHOOK_COLLECTION + "/cwhe_"));
    assert.equal(document.receivedAtMillis, now);
    const expiresAt = document.expiresAt as FirebaseFirestore.Timestamp;
    assert.equal(expiresAt.toMillis(), now + WEBHOOK_RETENTION_MILLIS);
    assert.ok(validateCatchWhatsappWebhookEventDocument({...document,
      expiresAt: {_seconds: expiresAt.seconds,
        _nanoseconds: expiresAt.nanoseconds}}));
    await db.db.runTransaction((tx) =>
      assertCatchIngressAccepted(tx, db.db, readCatchReceipt(document)));
  });

test("only existing receipts count as successful persistence retries",
  async () => {
    const events = parseCatchWhatsappWebhook(payload(), config);
    const now = 1790854245000;
    const duplicate = store();
    await persistCatchWhatsappWebhookEvents(duplicate.db, events, now);
    const original = new Map(duplicate.docs);
    await persistCatchWhatsappWebhookEvents(duplicate.db, events, now + 1000);
    assert.deepEqual(duplicate.docs, original);
    const receiptKey = CATCH_WEBHOOK_COLLECTION + "/" + events[0].eventId;
    const proofKey = CATCH_INGRESS_EVIDENCE + "/" + events[0].eventId;
    await duplicate.db.runTransaction((tx) => assertCatchIngressAccepted(tx,
      duplicate.db, readCatchReceipt(duplicate.docs.get(receiptKey))));
    // A bare duplicate error is not evidence of an equivalent retained receipt.
    for (const code of [6, 7, 14]) {
      const db = store(); db.fail(code);
      await assert.rejects(
        persistCatchWhatsappWebhookEvents(db.db, events, now), {code});
      assert.equal(db.docs.size, 0);
    }
    const missingReceipt = store();
    missingReceipt.docs.set(proofKey, {...original.get(proofKey)!});
    assert.equal(await persistCatchWhatsappWebhookEvents(missingReceipt.db,
      events, now + 1000), 1);
    assert.equal(missingReceipt.docs.has(receiptKey), false);
    assert.equal(missingReceipt.docs.get(proofKey)!.state, "blocked");
  });

test("a non-text message is recorded blocked and acknowledged, and the " +
  "text behind it still lands", async () => {
  const db = store();
  const image = {id: "wamid.image", from: "919000000001",
    timestamp: "1790854245", type: "image", image: {id: "media-1"}};
  const raw = payload([image, incoming]);
  const [blocked, text] = parseCatchWhatsappWebhook(raw, config);
  const now = 1790854245000;
  const receive = (at: number) => handleCatchWhatsappWebhook(signed(raw),
    config, (events) => persistCatchWhatsappWebhookEvents(db.db, events, at));
  // Meta retries anything but a 200 for a week; a committed denial must not
  // put the callback in that loop.
  assert.deepEqual(await receive(now), {status: 200, body: "ok"});
  assert.deepEqual(await receive(now + 1000), {status: 200, body: "ok"});
  assert.equal(db.docs.get(CATCH_INGRESS_EVIDENCE + "/" + blocked.eventId)!
    .state, "blocked");
  // The receipt keeps a placeholder, so Support can show the photo arrived.
  assert.equal(blocked.text, "[photo]");
  assert.equal(db.docs.get(CATCH_WEBHOOK_COLLECTION + "/" + blocked.eventId)!
    .text, "[photo]");
  assert.equal(db.docs.get(CATCH_INGRESS_EVIDENCE + "/" + text.eventId)!
    .state, "accepted");
  await db.db.runTransaction((tx) => assertCatchIngressAccepted(tx, db.db,
    readCatchReceipt(db.docs.get(CATCH_WEBHOOK_COLLECTION + "/" +
      text.eventId))));
});

test("a scope refusal says which configured id did not match", async () => {
  const mustNotWrite = async () => assert.fail("must not write");
  assert.deepEqual(await handleCatchWhatsappWebhook(signed(payload([incoming],
    [], "999")), config, mustNotWrite), {status: 403,
    body: "Foreign account."});
  assert.deepEqual(await handleCatchWhatsappWebhook(signed(payload([incoming],
    [], config.wabaId, "999")), config, mustNotWrite), {status: 403,
    body: "Foreign sender."});
});

test("invalid internal receipts cannot reach the writer", async () => {
  const db = store();
  const [event] = parseCatchWhatsappWebhook(payload(), config);
  await assert.rejects(persistCatchWhatsappWebhookEvents(db.db,
    [{...event, text: "x".repeat(4097)}]));
  assert.equal(db.docs.size, 0);
});


test("Firestore deduplicates Catch callbacks atomically",
  {skip: !process.env.FIRESTORE_EMULATOR_HOST}, async () => {
    const host = process.env.FIRESTORE_EMULATOR_HOST!;
    assert.match(host, /^(127\.0\.0\.1|localhost):[0-9]+$/);
    const app = admin.initializeApp({projectId: "demo-catch-rules"},
      "catch-webhook-test-" + Date.now());
    const db = admin.firestore(app);
    const events = parseCatchWhatsappWebhook(payload([{...incoming,
      id: "wamid.emulator." + Date.now()}]), config);
    const ref = db.collection(CATCH_WEBHOOK_COLLECTION).doc(events[0].eventId);
    const proofRef = db.collection(CATCH_INGRESS_EVIDENCE)
      .doc(events[0].eventId);
    const now = 1790854245000;
    try {
      await persistCatchWhatsappWebhookEvents(db, events, now);
      const originalReceipt = (await ref.get()).data()!;
      const originalProof = (await proofRef.get()).data()!;
      assert.equal(originalProof.state, "accepted");
      await Promise.all(Array.from({length: 5}, () =>
        persistCatchWhatsappWebhookEvents(db, events, now + 1000)));
      const receipt = (await ref.get()).data()!;
      assert.deepEqual(receipt, originalReceipt);
      assert.deepEqual((await proofRef.get()).data(), originalProof);
      assert.equal(receipt.messageId, events[0].messageId);
      assert.equal(receipt.receivedAtMillis, now);
      assert.equal(receipt.expiresAt.toMillis(),
        now + WEBHOOK_RETENTION_MILLIS);
      assert.equal(receipt.organizerId, undefined);
      await db.runTransaction((tx) =>
        assertCatchIngressAccepted(tx, db, readCatchReceipt(receipt)));
    } finally {
      await Promise.all([ref.delete(), proofRef.delete()]);
      await app.delete();
    }
  });
