import assert from "node:assert/strict";
import {test} from "node:test";
import {initializeApp, deleteApp} from "firebase-admin/app";
import {getFirestore} from "firebase-admin/firestore";
import {Timestamp, type Firestore} from "firebase-admin/firestore";
import {FormPaymentTestStore} from
  "../payments/formPayments/formPaymentTestStore";
import {parseCatchWhatsappWebhook, WEBHOOK_RETENTION_MILLIS} from
  "./whatsappWebhookProtocol";
import {catchEndpointHash, catchReplyHash, catchReplyId,
  CATCH_SUPPORT_WINDOW_MS} from
  "./whatsappReply";
import {CATCH_RECEIPTS, CATCH_REPLY_OPERATIONS, readCatchOperation} from
  "./whatsappReplyStore";
import {consumeCatchReplyStatus, advanceCatchDelivery,
  processCatchWhatsappReceipt, reconcileCatchReplyStatuses,
  needsCatchStatusReconciliation, onCatchWhatsappWebhookEventCreated,
  onCatchWhatsappReplyOperationWritten} from
  "./whatsappReceiptConsumer";

const time = 1800000000000;
const scope = {wabaId: "123", phoneNumberId: "456"};
function fixture(start = time) {
  const fake = new FormPaymentTestStore();
  const db = fake as unknown as Firestore;
  const operationId = catchReplyId(scope, "wamid.inbound");
  const operation = readCatchOperation({schemaVersion: 1, operationId,
    purpose: "serviceSupport", source: "reviewedInboundSupportRequest",
    ...scope, recipientUid: "participant", actorUid: "agent",
    endpointHash: catchEndpointHash("+919000000001"),
    inboundEventId: "cwhe_" + "a".repeat(64), inboundMessageId: "wamid.inbound",
    inboundTextHash: "a".repeat(64), bodyHash: "b".repeat(64),
    materialHash: "c".repeat(64), readinessEvidenceHash: "d".repeat(64),
    reviewedAtMillis: start,
    deadlineMillis: start + CATCH_SUPPORT_WINDOW_MS, state: "completed",
    providerMessageId: "wamid.outbound", deliveryStatus: "accepted",
    deliveryEventId: null, deliveryAtMillis: null,
    createdAtMillis: start, updatedAtMillis: start});
  const key = CATCH_REPLY_OPERATIONS + "/" + operationId;
  fake.records.set(key, {...operation});
  function receipt(status: string, patch: Record<string, unknown> = {}) {
    const raw = Buffer.from(JSON.stringify({object: "whatsapp_business_account",
      entry: [{id: scope.wabaId, changes: [{field: "messages", value: {
        messaging_product: "whatsapp", metadata: {phone_number_id: "456"},
        statuses: [{id: "wamid.outbound", status, timestamp:
          String(start / 1000 + 1), recipient_id: "919000000001"}],
      }}]}]}));
    const event = parseCatchWhatsappWebhook(raw, scope)[0];
    const record = {...event, receivedAtMillis: start + 2000,
      expiresAt: Timestamp.fromMillis(start + WEBHOOK_RETENTION_MILLIS),
      ...patch};
    fake.records.set(CATCH_RECEIPTS + "/" + event.eventId, record);
    return event.eventId;
  }
  return {fake, db, key, operation, operationId, receipt};
}

test("delivery projection advances without mutating immutable status receipts",
  async () => {
    const f = fixture();
    const delivered = f.receipt("delivered");
    const original = {...f.fake.records.get(CATCH_RECEIPTS + "/" + delivered)!};
    assert.equal(await consumeCatchReplyStatus(f.db, f.operationId, delivered,
      time + 3000), "applied");
    assert.equal(await consumeCatchReplyStatus(f.db, f.operationId, delivered,
      time + 3000), "unchanged");
    assert.equal(await consumeCatchReplyStatus(f.db, f.operationId,
      f.receipt("sent"), time + 3000), "unchanged");
    assert.equal(await consumeCatchReplyStatus(f.db, f.operationId,
      f.receipt("failed"), time + 3000), "unchanged");
    assert.equal(await consumeCatchReplyStatus(f.db, f.operationId,
      f.receipt("read"), time + 3000), "applied");
    assert.equal(f.fake.records.get(f.key)?.deliveryStatus, "read");
    assert.deepEqual(f.fake.records.get(CATCH_RECEIPTS + "/" + delivered),
      original);
    assert.ok([...f.fake.records.keys()].every((key) =>
      key.startsWith(CATCH_RECEIPTS + "/") ||
      key.startsWith(CATCH_REPLY_OPERATIONS + "/")));
  });

test("status must match sender, endpoint and saved message ID",
  async () => {
    for (const patch of [{wabaId: "999"}, {phoneNumberId: "999"},
      {participantId: "919000000002"}, {messageId: "wamid.foreign"},
      {errorCodes: [131026]},
      {providerTimestampSeconds: String(time / 1000 - 1)},
      {providerTimestampSeconds: String(time / 1000 + 50)},
      {expiresAt: Timestamp.fromMillis(time)}]) {
      const f = fixture();
      assert.equal(await consumeCatchReplyStatus(f.db, f.operationId,
        f.receipt("delivered", patch), time + 3000), "unmatched");
      assert.equal(f.fake.records.get(f.key)?.deliveryStatus, "accepted");
    }
  });

test("early status is deferred and can be consumed after saving message ID",
  async () => {
    const f = fixture();
    f.fake.records.set(f.key, {...f.operation, state: "claimed",
      providerMessageId: null, deliveryStatus: "pending"});
    const eventId = f.receipt("delivered");
    assert.equal(await consumeCatchReplyStatus(f.db, f.operationId,
      eventId, time + 3000), "deferred");
    f.fake.records.set(f.key, {...f.operation});
    assert.equal(await consumeCatchReplyStatus(f.db, f.operationId,
      eventId, time + 3000), "applied");
  });

test("arrival order and failure cannot override delivery proof",
  () => {
    assert.equal(advanceCatchDelivery("accepted", "failed"), "failed");
    assert.equal(advanceCatchDelivery("failed", "sent"), "failed");
    assert.equal(advanceCatchDelivery("failed", "delivered"), "delivered");
    assert.equal(advanceCatchDelivery("read", "failed"), "read");
  });

test("receipt dispatcher and saved-operation reconciliation close early race",
  async () => {
    const f = fixture();
    f.fake.records.set(f.key, {...f.operation, state: "claimed",
      providerMessageId: null, deliveryStatus: "pending"});
    const eventId = f.receipt("delivered");
    assert.equal(await processCatchWhatsappReceipt(f.db, eventId, scope,
      time + 3000), "deferred");
    f.fake.records.set(f.key, {...f.operation});
    assert.equal(await reconcileCatchReplyStatuses(f.db, f.operationId,
      scope, time + 3000), 1);
    assert.equal(await processCatchWhatsappReceipt(f.db, eventId, scope,
      time + 3000), "unchanged");
    assert.equal(await reconcileCatchReplyStatuses(f.db, f.operationId,
      scope, time + 3000), 0);
    assert.equal(await processCatchWhatsappReceipt(f.db, f.receipt("read"),
      scope, time + 3000), "applied");
    assert.equal(f.fake.records.get(f.key)?.deliveryStatus, "read");
  });

test("inbound messages reach the router; STOPs and statuses never do",
  async () => {
    const f = fixture();
    const inbound = (id: string, body: string) => {
      const raw = Buffer.from(JSON.stringify({
        object: "whatsapp_business_account",
        entry: [{id: scope.wabaId, changes: [{field: "messages", value: {
          messaging_product: "whatsapp", metadata: {phone_number_id: "456"},
          messages: [{id, from: "919000000001", type: "text",
            timestamp: String(time / 1000 + 1), text: {body}}],
        }}]}]}));
      const event = parseCatchWhatsappWebhook(raw, scope)[0];
      f.fake.records.set(CATCH_RECEIPTS + "/" + event.eventId, {...event,
        receivedAtMillis: time + 2000,
        expiresAt: Timestamp.fromMillis(time + WEBHOOK_RETENTION_MILLIS)});
      return event.eventId;
    };
    const routed: string[] = [];
    const route = async (receipt: {text: string | null}) => {
      routed.push(receipt.text ?? "");
    };
    assert.equal(await processCatchWhatsappReceipt(f.db,
      inbound("wamid.nomination", "@afterfly.in"), scope, time + 3000, route),
    "unchanged");
    assert.equal(await processCatchWhatsappReceipt(f.db,
      inbound("wamid.stop", "STOP"), scope, time + 3000, route), "applied");
    await processCatchWhatsappReceipt(f.db, f.receipt("delivered"), scope,
      time + 3000, route);
    assert.deepEqual(routed, ["@afterfly.in"]);
  });

test("dispatch lookup is scoped and rejects ambiguous ownership",
  async () => {
    const f = fixture(); const eventId = f.receipt("delivered");
    f.fake.records.set(CATCH_REPLY_OPERATIONS + "/foreign-sender", {
      ...f.operation, phoneNumberId: "999",
    });
    f.fake.records.set(CATCH_REPLY_OPERATIONS + "/foreign-endpoint", {
      ...f.operation, endpointHash: catchEndpointHash("+919000000002"),
    });
    assert.equal(await processCatchWhatsappReceipt(f.db, eventId,
      {...scope, phoneNumberId: "999"}, time + 3000), "unmatched");
    assert.equal(await processCatchWhatsappReceipt(f.db, eventId, scope,
      time + 3000), "applied");
    f.fake.records.set(CATCH_REPLY_OPERATIONS + "/ambiguous", {...f.operation});
    await assert.rejects(processCatchWhatsappReceipt(f.db, eventId, scope,
      time + 3000), /Ambiguous/);
  });

test("reconciliation overflow fails before publishing a partial projection",
  async () => {
    const f = fixture(); const eventId = f.receipt("delivered");
    const receipt = f.fake.records.get(CATCH_RECEIPTS + "/" + eventId)!;
    for (let index = 0; index < 50; index++) {
      const id = "cwhe_" + catchReplyHash(index);
      f.fake.records.set(CATCH_RECEIPTS + "/" + id, {...receipt, eventId: id});
    }
    await assert.rejects(reconcileCatchReplyStatuses(f.db, f.operationId,
      scope, time + 3000), /exceeds bounded scope/);
    assert.equal(f.fake.records.get(f.key)?.deliveryStatus, "accepted");
  });


test("operation trigger only reconciles newly saved provider identity", () => {
  const {operation} = fixture();
  assert.equal(needsCatchStatusReconciliation(undefined, {...operation}), true);
  assert.equal(needsCatchStatusReconciliation({...operation, state: "claimed",
    providerMessageId: null}, {...operation}), true);
  assert.equal(needsCatchStatusReconciliation({...operation},
    {...operation, deliveryStatus: "read"}), false);
  assert.equal(needsCatchStatusReconciliation({...operation},
    undefined), false);
  assert.equal(needsCatchStatusReconciliation(undefined,
    {...operation, state: "unknown"}), false);
});

test("exported triggers default disabled without database initialization",
  async () => {
    const key = "CATCH_WHATSAPP_RECEIPT_CONSUMERS_ENABLED";
    const previous = process.env[key];
    delete process.env[key];
    try {
      const data = new Proxy({}, {get: () => {
        throw new Error("Disabled trigger accessed event data");
      }});
      await onCatchWhatsappWebhookEventCreated.run({data} as never);
      await onCatchWhatsappReplyOperationWritten.run({data} as never);
    } finally {
      if (previous === undefined) delete process.env[key];
      else process.env[key] = previous;
    }
  });

test("exported trigger callbacks reconcile early status and replay safely",
  {skip: !process.env.FIRESTORE_EMULATOR_HOST}, async () => {
    assert.match(process.env.FIRESTORE_EMULATOR_HOST!,
      /^(localhost|127\.0\.0\.1):[0-9]+$/u);
    const keys = ["CATCH_WHATSAPP_RECEIPT_CONSUMERS_ENABLED",
      "CATCH_WHATSAPP_WABA_ID", "CATCH_WHATSAPP_PHONE_NUMBER_ID"];
    const previous = keys.map((key) => process.env[key]);
    keys.forEach((key, i) => {
      process.env[key] = ["true", "123", "456"][i];
    });
    const app = initializeApp({projectId: "demo-catch-cat16-consumers"});
    const db = getFirestore(app);
    // The triggers read the real clock, and so do the Firestore client's gRPC
    // deadlines, so build the fixture just behind it instead of mocking
    // Date.now (a frozen future clock makes every call exceed its deadline).
    const f = fixture(Math.floor(Date.now() / 1000) * 1000 - 3000);
    const eventId = f.receipt("delivered");
    const receiptRef = db.collection(CATCH_RECEIPTS).doc(eventId);
    const operationRef = db.doc(f.key);
    try {
      const original = f.fake.records.get(CATCH_RECEIPTS + "/" + eventId)!;
      await receiptRef.set(original);
      await operationRef.set({...f.operation, state: "claimed",
        providerMessageId: null, deliveryStatus: "pending"});
      const before = await operationRef.get();
      const receiptEvent = {params: {eventId}, data: await receiptRef.get()};
      await onCatchWhatsappWebhookEventCreated.run(receiptEvent as never);
      assert.equal((await operationRef.get()).get("deliveryStatus"), "pending");
      await operationRef.set(f.operation);
      const completedEvent = {params: {operationId: f.operationId},
        data: {before, after: await operationRef.get()}};
      await onCatchWhatsappReplyOperationWritten.run(completedEvent as never);
      await onCatchWhatsappReplyOperationWritten.run(completedEvent as never);
      await onCatchWhatsappWebhookEventCreated.run(receiptEvent as never);
      assert.equal((await operationRef.get()).get("deliveryStatus"),
        "delivered");
      assert.deepEqual((await receiptRef.get()).data(), original);
      process.env[keys[2]] = "999";
      const readId = f.receipt("read");
      const readRef = db.collection(CATCH_RECEIPTS).doc(readId);
      try {
        await readRef.set(f.fake.records.get(CATCH_RECEIPTS + "/" + readId)!);
        await onCatchWhatsappWebhookEventCreated.run({params: {eventId: readId},
          data: await readRef.get()} as never);
        assert.equal((await operationRef.get()).get("deliveryStatus"),
          "delivered");
      } finally {
        await readRef.delete();
      }
    } finally {
      await receiptRef.delete(); await operationRef.delete();
      await deleteApp(app);
      keys.forEach((key, i) => {
        if (previous[i] === undefined) delete process.env[key];
        else process.env[key] = previous[i];
      });
    }
  });
