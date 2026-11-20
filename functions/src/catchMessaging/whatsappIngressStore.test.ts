import assert from "node:assert/strict";
import {test} from "node:test";
import {Timestamp, type Firestore} from "firebase-admin/firestore";
import {FormPaymentTestStore} from
  "../payments/formPayments/formPaymentTestStore";
import {parseCatchWhatsappWebhook, WEBHOOK_RETENTION_MILLIS} from
  "./whatsappWebhookProtocol";
import {persistCatchVerifiedIngressEvent, CATCH_INGRESS_EVIDENCE,
  assertCatchIngressAccepted} from "./whatsappIngressStore";
import {CATCH_RECEIPTS, CATCH_ENDPOINT_STOPS, readCatchReceipt} from
  "./whatsappEndpointStops";
import {persistCatchWhatsappWebhookEvents} from "./whatsappWebhook";
import {catchEndpointHash, catchStopId} from "./whatsappReply";

const now = 1800000000000;
function events(texts: string[],
  ids = texts.map((_, index) => "wamid." + index)) {
  return parseCatchWhatsappWebhook(Buffer.from(JSON.stringify({
    object: "whatsapp_business_account",
    entry: [{id: "123", changes: [{field: "messages", value: {
      messaging_product: "whatsapp",
      metadata: {phone_number_id: "456"},
      messages: texts.map((body, index) => ({
        id: ids[index], from: "919000000001", timestamp: String(now / 1000),
        type: "text", text: {body}}))},
    }]}]})), {wabaId: "123", phoneNumberId: "456"});
}
test("semantic ingress replay preserves body/TTL and blocked conflicts " +
  "survive body expiry", async () => {
  const fake = new FormPaymentTestStore();
  const db = fake as unknown as Firestore;
  const [event] = events(["Please help"]);
  await persistCatchVerifiedIngressEvent(db, event, now);
  const key = CATCH_RECEIPTS + "/" + event.eventId;
  const original = fake.records.get(key)!;
  await persistCatchVerifiedIngressEvent(db,
    {...event, payloadHash: "c".repeat(64)}, now + 1000);
  assert.deepEqual(fake.records.get(key), original);
  await assert.rejects(persistCatchVerifiedIngressEvent(db,
    {...event, text: "Different material"}, now + 2000));
  assert.equal(fake.records.get(
    CATCH_INGRESS_EVIDENCE + "/" + event.eventId)!.state, "blocked");
  assert.deepEqual(fake.records.get(key), original);
  await assert.rejects(db.runTransaction((tx) =>
    assertCatchIngressAccepted(tx, db, readCatchReceipt(original))));
  fake.records.delete(key);
  await assert.rejects(persistCatchVerifiedIngressEvent(db, event,
    now + WEBHOOK_RETENTION_MILLIS + 1));
  assert.equal(fake.records.has(key), false,
    "Receipt purge cannot renew eligibility");
  assert.ok((original.expiresAt as Timestamp).toMillis() ===
    now + WEBHOOK_RETENTION_MILLIS);
});

test("conflicting first STOP cannot prevent later signed STOPs from committing",
  async () => {
    const fake = new FormPaymentTestStore();
    const db = fake as unknown as Firestore;
    const [original] = events(["Please help"], ["wamid.conflict"]);
    await persistCatchVerifiedIngressEvent(db, original, now);
    const batch = events(["STOP", "STOP", "New support"],
      ["wamid.conflict", "wamid.stop-two", "wamid.support"]);
    batch[1] = {...batch[1], participantId: "919000000002"};
    // The conflicting STOP's denial is committed, so the batch is
    // acknowledged and the support message behind it still lands.
    assert.equal(
      await persistCatchWhatsappWebhookEvents(db, batch, now + 1000), 1);
    for (const stop of batch.slice(0, 2)) {
      assert.equal(fake.records.has(CATCH_ENDPOINT_STOPS + "/" +
      catchStopId(stop, catchEndpointHash("+" + stop.participantId))), true);
    }
    assert.equal(fake.records.has(
      CATCH_RECEIPTS + "/" + batch[2].eventId), true);
    assert.equal(fake.records.get(
      CATCH_RECEIPTS + "/" + original.eventId)!.text, "Please help");
  });

test("ambiguous normalized ingress is durable denial and failed commits " +
  "publish nothing", async () => {
  const fake = new FormPaymentTestStore();
  const db = fake as unknown as Firestore;
  const [event] = events(["Unsupported normalized text"]);
  fake.failNextCommit = true;
  await assert.rejects(persistCatchVerifiedIngressEvent(db, event, now));
  assert.equal(fake.records.size, 0);
  await assert.rejects(persistCatchVerifiedIngressEvent(db,
    {...event, textTruncated: true}, now));
  assert.equal(fake.records.get(
    CATCH_INGRESS_EVIDENCE + "/" + event.eventId)!.state, "blocked");
  await assert.rejects(persistCatchVerifiedIngressEvent(db, event, now + 1000));
});

test("webhook persists canonical ingress evidence and preserves replay " +
  "body and TTL", async () => {
  const fake = new FormPaymentTestStore();
  const db = fake as unknown as Firestore;
  const [event] = events(["Please help"]);
  await persistCatchWhatsappWebhookEvents(db, [event], now);
  const key = CATCH_RECEIPTS + "/" + event.eventId;
  const original = fake.records.get(key)!;
  await db.runTransaction((tx) =>
    assertCatchIngressAccepted(tx, db, readCatchReceipt(original)));
  await persistCatchWhatsappWebhookEvents(db,
    [{...event, payloadHash: "c".repeat(64)}], now + 1000);
  assert.deepEqual(fake.records.get(key), original);
  assert.equal(await persistCatchWhatsappWebhookEvents(db,
    [{...event, text: "Changed support"}], now + 2000), 1);
  assert.deepEqual(fake.records.get(key), original);
  assert.equal(fake.records.get(
    CATCH_INGRESS_EVIDENCE + "/" + event.eventId)!.state, "blocked");
  await assert.rejects(db.runTransaction((tx) =>
    assertCatchIngressAccepted(tx, db, readCatchReceipt(original))));
});

test("failed first STOP commit retains its error and attempts later STOPs " +
  "before rejecting support", async () => {
  const fake = new FormPaymentTestStore();
  const db = fake as unknown as Firestore;
  const batch = events(["STOP", "STOP", "New support"]);
  batch[1] = {...batch[1], participantId: "919000000002"};
  fake.failNextCommit = true;
  await assert.rejects(persistCatchWhatsappWebhookEvents(db, batch, now),
    /Interrupted commit/);
  assert.equal(fake.records.has(CATCH_ENDPOINT_STOPS + "/" +
    catchStopId(batch[0], catchEndpointHash("+" + batch[0].participantId))),
  false);
  assert.equal(fake.records.has(CATCH_ENDPOINT_STOPS + "/" +
    catchStopId(batch[1], catchEndpointHash("+" + batch[1].participantId))),
  true);
  assert.equal(fake.records.has(
    CATCH_RECEIPTS + "/" + batch[2].eventId), false);
  assert.equal(fake.records.has(
    CATCH_INGRESS_EVIDENCE + "/" + batch[2].eventId), false);
});

test("invalid later receipt rejects the whole webhook batch before " +
  "a signed STOP writes", async () => {
  const fake = new FormPaymentTestStore();
  const db = fake as unknown as Firestore;
  const batch = events(["STOP", "Support"]);
  batch[1] = {...batch[1], messageId: ""};
  await assert.rejects(persistCatchWhatsappWebhookEvents(db, batch, now),
    /Invalid Catch webhook receipt/);
  assert.equal(fake.records.size, 0);
});
