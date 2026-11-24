import {getEmulatorFirestore} from "../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import test from "node:test";
import {createHmac, randomUUID} from "node:crypto";
import {deleteApp, initializeApp} from "firebase-admin/app";
import {Timestamp} from "firebase-admin/firestore";
import {FakeFirestore} from "../operations/testFirestore";
import {ingestMetaWhatsappWebhook, parseMetaWhatsappWebhook,
  processOrganizerMessagingWebhookEvent} from
  "./organizerWhatsappWebhook";
import type {OrganizerMessagingWebhookEventDocument} from
  "../shared/generated/firestoreAdminTypes";
import {organizerCommunicationPreferenceId} from
  "../shared/organizerCommunicationPreferences";
import {organizerContactChannelStateId} from "./organizerCampaignModel";
import {hashEndpoint} from "../platform/delivery/endpointHash";
import {validateOrganizerMessagingWebhookEventDocument} from
  "../shared/generated/validators/organizerMessagingWebhookEventDocument";
import {WHATSAPP_ENDPOINT_STOPS, parseWhatsappStop} from
  "../shared/organizerWhatsappStops";

test("webhook parsing stores status metadata without message content", () => {
  const events = parseMetaWhatsappWebhook(Buffer.from(JSON.stringify({
    entry: [{changes: [{value: {
      metadata: {phone_number_id: "123456"},
      statuses: [{
        id: "wamid.1",
        status: "delivered",
        timestamp: "1720000000",
        recipient_id: "919999999999",
      }],
    }}]}],
  })));
  assert.equal(events.length, 1);
  assert.equal(events[0].providerMessageId, "wamid.1");
  assert.equal(events[0].deliveryStatus, "delivered");
  assert.equal(events[0].inboundBody, null);
  assert.match(events[0].endpointHash ?? "", /^[a-f0-9]{64}$/);
});

test("webhook parsing recognizes STOP and retains bounded inbound text", () => {
  const rawBody = Buffer.from(JSON.stringify({
    entry: [{changes: [{value: {
      metadata: {phone_number_id: "123456"},
      messages: [{
        id: "wamid.inbound.1",
        from: "919999999999",
        timestamp: "1720000000",
        context: {id: "wamid.outbound.1"},
        type: "text",
        text: {body: " STOP "},
      }],
    }}]}],
  }));
  const events = parseMetaWhatsappWebhook(rawBody);
  assert.equal(events[0].eventKind, "inbound");
  assert.equal(events[0].isStop, true);
  assert.equal(events[0].hasReply, true);
  assert.equal(events[0].contextProviderMessageId, "wamid.outbound.1");
  assert.equal(events[0].inboundBody, "STOP");
});

test("unknown webhook shapes are ignored safely", () => {
  assert.deepEqual(parseMetaWhatsappWebhook(Buffer.from("not-json")), []);
  assert.deepEqual(parseMetaWhatsappWebhook(Buffer.from("{}")), []);
});

const appSecret = "fixture-meta-signing-secret";
function webhook(messages: object[] = [], statuses: object[] = [],
  phoneNumberId = "123456") {
  return Buffer.from(JSON.stringify({object: "whatsapp_business_account",
    entry: [{id: "700123", changes: [{field: "messages", value: {
      messaging_product: "whatsapp", metadata: {phone_number_id: phoneNumberId},
      messages, statuses,
    }}]}]}));
}
function incoming(value: object) {
  return {id: "wamid.inbound.choice", from: "919999999999",
    timestamp: "1720000000", context: {id: "wamid.outbound.event"}, ...value};
}
function signature(rawBody: Buffer) {
  return "sha256=" + createHmac("sha256", appSecret).update(rawBody)
    .digest("hex");
}
function sender() {
  return {provider: "metaCloudApi", phoneNumberId: "123456", wabaId: "700123",
    organizerId: "organizer-one", channel: "whatsapp", status: "active"};
}

test("status errors retain every code without retaining provider text", () => {
  const status = {id: "wamid.errors", status: "failed",
    timestamp: "1720000000", recipient_id: "919999999999"};
  for (const codes of [[131016], [131016, 131026], Array(10).fill(131016)]) {
    const [event] = parseMetaWhatsappWebhook(webhook([], [{...status,
      errors: codes.map((code) => ({code, title: "private provider text",
        error_data: {details: "private diagnostic details"}})),
    }]));
    assert.deepEqual(event.providerErrorEvidence, {kind: "codes", codes});
    assert.equal(event.providerErrorCode, codes[0]);
    assert.equal(JSON.stringify(event).includes("private"), false);
  }
  for (const errors of [undefined, []]) {
    const [event] = parseMetaWhatsappWebhook(
      webhook([], [{...status, errors}]));
    assert.deepEqual(event.providerErrorEvidence, {kind: "none"});
    assert.equal(event.providerErrorCode, null);
  }
});

test("malformed or oversized errors cannot become an error-free status", () => {
  for (const errors of [null, {}, "131016", [null], [{}],
    [{code: "131016"}], [{code: -1}], [{code: 1.5}], [{code: 1e9}],
    [{}, {code: 131026}], [{code: 131016}, {}],
    Array(11).fill({code: 131016})]) {
    const [event] = parseMetaWhatsappWebhook(webhook([], [{
      id: "wamid.invalid-errors", status: "delivered",
      timestamp: "1720000000", recipient_id: "919999999999", errors,
    }]));
    assert.deepEqual(event.providerErrorEvidence, {kind: "unusable"});
    assert.equal(event.providerErrorCode, null);
  }
});

test("signed queue preserves error evidence and rejects impossible shapes",
  async () => {
    const fake = new FakeFirestore();
    fake.write("organizerSenderConnections/connection-one", sender());
    const rawBody = webhook([], [{
      id: "wamid.errors", status: "failed", timestamp: "1720000000",
      recipient_id: "919999999999", errors: [{code: 131016}, {code: 131026}],
    }]);
    const params = {db: fake as unknown as FirebaseFirestore.Firestore,
      rawBody, signatureHeader: signature(rawBody), appSecret,
      now: Timestamp.fromMillis(1720000001000)};
    assert.equal(await ingestMetaWhatsappWebhook(params), 1);
    assert.equal(await ingestMetaWhatsappWebhook(params), 0);
    const row = fake.entries().find(([path]) =>
      path.startsWith("organizerMessagingWebhookEvents/"))![1];
    assert.ok(validateOrganizerMessagingWebhookEventDocument(row));
    assert.deepEqual(row.providerErrorEvidence,
      {kind: "codes", codes: [131016, 131026]});
    for (const invalid of [
      {kind: "none", codes: []}, {kind: "codes", codes: []},
      {kind: "codes", codes: Array(11).fill(1)},
      {kind: "codes", codes: ["131016"]}, {kind: "codes", codes: [-1]},
      {kind: "codes", codes: [1.5]}, {kind: "codes", codes: [1e9]},
      {kind: "unusable", raw: "private"}, {kind: "technical"}]) {
      assert.equal(validateOrganizerMessagingWebhookEventDocument({...row,
        providerErrorEvidence: invalid}), false);
    }
    const legacy = {...row};
    delete legacy.providerErrorEvidence;
    assert.ok(validateOrganizerMessagingWebhookEventDocument(legacy));
  });

test("signed STOP and its queue receipt commit together without a CRM contact",
  async () => {
    const fake = new FakeFirestore();
    fake.write("organizerSenderConnections/connection-one", sender());
    const rawBody = webhook([incoming({type: "text", text: {body: "STOP"}})]);
    const params = {db: fake as unknown as FirebaseFirestore.Firestore,
      rawBody, signatureHeader: signature(rawBody), appSecret,
      now: Timestamp.fromMillis(1720000001000)};
    const before = fake.entries();
    fake.failNextCommit = true;
    await assert.rejects(ingestMetaWhatsappWebhook(params), /interruption/);
    assert.deepEqual(fake.entries(), before);
    assert.equal(await ingestMetaWhatsappWebhook(params), 1);
    assert.equal(await ingestMetaWhatsappWebhook(params), 0);
    const records = fake.entries().filter(([p]) =>
      p.startsWith(WHATSAPP_ENDPOINT_STOPS + "/"));
    assert.equal(records.length, 1);
    const stop = parseWhatsappStop(records[0][1]);
    assert.equal(stop.revision, 1);
    assert.equal(stop.stoppedAt, 1720000000000);
    assert.equal(stop.organizerId, "organizer-one");
    assert.equal(JSON.stringify(stop).includes("919999999999"), false);
    assert.equal(fake.entries().some(([p]) =>
      p.startsWith("organizerContacts/")), false);
  });

test("native labels, unsigned STOP and unmatched senders create no STOP record",
  async () => {
    for (const kind of ["native", "unsigned", "unmatched"]) {
      const fake = new FakeFirestore();
      if (kind !== "unmatched") {
        fake.write("organizerSenderConnections/connection-one", sender());
      }
      const rawBody = webhook([incoming(kind === "native" ? {type: "button",
        button: {payload: "STOP", text: "STOP"}} :
        {type: "text", text: {body: "STOP"}})]);
      const params = {db: fake as unknown as FirebaseFirestore.Firestore,
        rawBody, signatureHeader: kind === "unsigned" ? undefined :
          signature(rawBody), appSecret,
        now: Timestamp.fromMillis(1720000001000)};
      if (kind === "unsigned") {
        await assert.rejects(ingestMetaWhatsappWebhook(params), /signature/);
      } else await ingestMetaWhatsappWebhook(params);
      assert.equal(fake.entries().some(([p]) =>
        p.startsWith(WHATSAPP_ENDPOINT_STOPS + "/")), false, kind);
    }
  });

test("native choices retain their exact discriminator and identifier",
  () => {
    const cases = [
      {input: {type: "button",
        button: {payload: "event-choice:one", text: "Go"}},
      expected: {kind: "templateQuickReply", payload: "event-choice:one",
        label: "Go"}},
      {input: {type: "interactive", interactive: {type: "button_reply",
        button_reply: {id: "event-choice:two", title: "Go"}}},
      expected: {kind: "replyButton", id: "event-choice:two", label: "Go"}},
      {input: {type: "interactive", interactive: {type: "list_reply",
        list_reply: {id: "event-choice:three", title: "Go",
          description: "Meet at the next stop"}}},
      expected: {kind: "listReply", id: "event-choice:three", label: "Go",
        description: "Meet at the next stop"}},
    ];
    for (const {input, expected} of cases) {
      const [event] = parseMetaWhatsappWebhook(webhook([incoming(input)]));
      assert.deepEqual(event.inboundReply, expected);
      assert.equal(event.inboundBody, "Go");
      assert.equal(event.providerAccountId, "700123");
      assert.equal(event.phoneNumberId, "123456");
      assert.equal(event.contextProviderMessageId, "wamid.outbound.event");
      assert.equal(event.isStop, false);
    }
  });

test("native labels and mismatched message shapes cannot become STOP commands",
  () => {
    for (const value of [
      {type: "button", button: {payload: "STOP", text: "STOP"}},
      {type: "interactive", interactive: {type: "button_reply",
        button_reply: {id: "STOP", title: "STOP"}}},
      {type: "image", text: {body: "STOP"}},
    ]) {
      const [event] = parseMetaWhatsappWebhook(webhook([incoming(value)]));
      assert.equal(event.isStop, false);
    }
    const [text] = parseMetaWhatsappWebhook(webhook([
      incoming({type: "text", text: {body: " STOP "}}),
    ]));
    assert.equal(text.isStop, true);
    assert.equal(text.inboundReply, null);
  });

test("malformed native identifiers are never truncated into choices",
  () => {
    for (const value of [
      {type: "button", button: {payload: "x".repeat(1025), text: "On my way"}},
      {type: "button", button: {payload: 12, text: "On my way"}},
      {type: "button", button: {payload: "one", text: ""}},
      {type: "interactive", interactive: {type: "button_reply",
        button_reply: {id: ["one"], title: "On my way"}}},
      {type: "interactive", interactive: {type: "nfm_reply",
        button_reply: {id: "one", title: "On my way"}}},
    ]) {
      const [event] = parseMetaWhatsappWebhook(webhook([incoming(value)]));
      assert.equal(event.inboundReply, null);
      assert.equal(event.inboundBody, null);
    }
  });

test("status correlation is exact, bounded and absent from inbound replies",
  () => {
    const status = {id: "wamid.sent", status: "delivered",
      timestamp: "1720000000", recipient_id: "919999999999"};
    const values = ["event-attempt:one", " x ", "x".repeat(513), {}, null];
    for (const value of values) {
      const [event] = parseMetaWhatsappWebhook(webhook([], [
        {...status, biz_opaque_callback_data: value},
      ]));
      assert.equal(event.callbackData, typeof value === "string" &&
        value.length <= 512 ? value : null);
      assert.equal(event.inboundReply, null);
    }
    const [inbound] = parseMetaWhatsappWebhook(webhook([incoming({
      type: "text", text: {body: "hello"}, biz_opaque_callback_data: "forged",
    })]));
    assert.equal(inbound.callbackData, null);
  });

test("webhook queue retains native evidence and rejects unsigned writes",
  async () => {
    const fake = new FakeFirestore();
    fake.write("organizerSenderConnections/connection-one", sender());
    const db = fake as unknown as FirebaseFirestore.Firestore;
    const rawBody = webhook([incoming({type: "button",
      button: {payload: "event-choice:one", text: "On my way"}})]);
    const params = {db, rawBody, signatureHeader: signature(rawBody),
      appSecret, now: Timestamp.fromMillis(1720000001000)};
    const before = fake.entries();
    for (const bad of [undefined, "sha256=" + "0".repeat(64),
      "sha256=" + "é".repeat(64)]) {
      await assert.rejects(ingestMetaWhatsappWebhook({...params,
        signatureHeader: bad}), /signature/);
      assert.deepEqual(fake.entries(), before);
    }
    const counts = await Promise.all(Array.from({length: 8}, () =>
      ingestMetaWhatsappWebhook(params)));
    assert.equal(counts.reduce((sum, count) => sum + count), 1);
    const entries = fake.entries().filter(([path]) =>
      path.startsWith("organizerMessagingWebhookEvents/"));
    assert.equal(entries.length, 1);
    const queued = entries[0][1];
    assert.ok(validateOrganizerMessagingWebhookEventDocument(queued));
    assert.equal(queued.providerAccountId, "700123");
    assert.equal(queued.providerPhoneNumberId, "123456");
    assert.equal(queued.connectionId, "connection-one");
    assert.deepEqual(queued.inboundReply, {kind: "templateQuickReply",
      payload: "event-choice:one", label: "On my way"});
    assert.equal(queued.callbackData, null);
    const persisted = JSON.stringify(fake.entries());
    assert.equal(persisted.includes(appSecret), false);
    assert.equal(persisted.includes("919999999999"), false);
  });

test("ambiguous sender or mismatched account is retained as unmatched evidence",
  async () => {
    for (const change of ["duplicate", "account", "missing", "noAccount"]) {
      const fake = new FakeFirestore();
      if (change !== "missing") {
        fake.write("organizerSenderConnections/connection-one",
          change === "account" ? {...sender(), wabaId: "700999"} : sender());
      }
      if (change === "duplicate") {
        fake.write("organizerSenderConnections/connection-two", sender());
      }
      const payload = JSON.parse(webhook([incoming({type: "button",
        button: {payload: "event-choice:one", text: "On my way"},
      })]).toString());
      if (change === "noAccount") delete payload.entry[0].id;
      const rawBody = Buffer.from(JSON.stringify(payload));
      await ingestMetaWhatsappWebhook({
        db: fake as unknown as FirebaseFirestore.Firestore,
        rawBody, signatureHeader: signature(rawBody), appSecret,
        now: Timestamp.fromMillis(1720000001000),
      });
      const queue = fake.entries().find(([path]) =>
        path.startsWith("organizerMessagingWebhookEvents/"))![1];
      assert.equal(queue.eventKind, "unmatched", change);
      assert.equal(queue.organizerId, null, change);
      assert.equal(queue.connectionId, null, change);
      assert.equal(queue.providerAccountId,
        change === "noAccount" ? null : "700123");
      assert.ok(queue.inboundReply);
    }
  });

test("Firestore deduplicates competing signed WhatsApp replies", {
  skip: !process.env.FIRESTORE_EMULATOR_HOST, timeout: 60_000,
}, async () => {
  assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? "",
    /^(127\.0\.0\.1|localhost|\[::1\]):\d+$/);
  const id = randomUUID();
  const app = initializeApp({projectId: "demo-catch-rules"}, "wa-hook-" + id);
  const db = getEmulatorFirestore(app);
  const connectionRef = db.collection("organizerSenderConnections").doc(id);
  const phoneNumberId = BigInt("0x" + id.replace(/-/g, "").slice(0, 16))
    .toString();
  const queueQuery = db.collection("organizerMessagingWebhookEvents")
    .where("providerMessageId", "==", "wamid." + id);
  try {
    await connectionRef.set({...sender(), phoneNumberId});
    const rawBody = webhook([incoming({id: "wamid." + id, type: "button",
      button: {payload: "event-choice:one", text: "On my way"}})], [],
    phoneNumberId);
    const params = {db, rawBody, signatureHeader: signature(rawBody),
      appSecret, now: Timestamp.fromMillis(1720000001000)};
    const counts = await Promise.all(Array.from({length: 8}, () =>
      ingestMetaWhatsappWebhook(params)));
    assert.equal(counts.reduce((sum, count) => sum + count), 1);
    const queued = await queueQuery.get();
    assert.equal(queued.size, 1);
    const event = queued.docs[0].data();
    assert.ok(validateOrganizerMessagingWebhookEventDocument(event));
    assert.equal(event.connectionId, id);
    assert.equal(event.providerAccountId, "700123");
    assert.equal(event.providerPhoneNumberId, phoneNumberId);
    assert.deepEqual(event.inboundReply, {kind: "templateQuickReply",
      payload: "event-choice:one", label: "On my way"});
  } finally {
    const queued = await queueQuery.get();
    const batch = db.batch();
    for (const event of queued.docs) {
      batch.delete(event.ref);
      batch.delete(db.collection("organizerCampaignWebhookReceipts")
        .doc(event.id));
    }
    await batch.commit();
    await connectionRef.delete();
    await deleteApp(app);
  }
});

test("processing the same STOP after a fresh v2 grant preserves its decision", {
  skip: !process.env.FIRESTORE_EMULATOR_HOST, timeout: 60_000,
}, async () => {
  const id = randomUUID();
  const app = initializeApp({projectId: "demo-catch-rules"}, "wa-stop-" + id);
  const db = getEmulatorFirestore(app);
  const organizerId = `org-${id}`;
  const uid = `person-${id}`;
  const contactId = `contact-${id}`;
  const phoneNumberId = BigInt("0x" + id.replace(/-/g, "").slice(0, 16))
    .toString();
  const connectionRef = db.collection("organizerSenderConnections").doc(id);
  const contactRef = db.collection("organizerContacts").doc(contactId);
  const stateRef = db.collection("organizerContactChannelStates")
    .doc(organizerContactChannelStateId(organizerId, contactId));
  const grantRef = db.collection("contactPermissionReceipts")
    .doc(`fresh-${id}`);
  const permissionRef = db.collection("users").doc(uid)
    .collection("contactPermissions").doc(`organizer_${organizerId}`);
  const guestRowRef = db.collection("guestMessagingPermissions")
    .doc(organizerCommunicationPreferenceId(organizerId, uid));
  const endpointHash = hashEndpoint("+919999999999");
  const firstAt = Timestamp.fromMillis(1720000001000);
  const grantAt = Timestamp.fromMillis(1720000005000);
  const replayAt = Timestamp.fromMillis(1720000010000);
  const nextStopAt = Timestamp.fromMillis(1720000015000);
  let eventRef: FirebaseFirestore.DocumentReference | null = null;
  let nextEventRef: FirebaseFirestore.DocumentReference | null = null;
  try {
    await connectionRef.set({...sender(), organizerId, phoneNumberId});
    await contactRef.set({organizerId, linkedUid: uid,
      phoneE164: "+919999999999", displayName: "Synthetic"});
    await stateRef.set({organizerId, contactId, channel: "whatsapp",
      endpointHash});
    const rawBody = webhook([incoming({id: `wamid.${id}`, type: "text",
      text: {body: "STOP"}})], [], phoneNumberId);
    await ingestMetaWhatsappWebhook({db, rawBody,
      signatureHeader: signature(rawBody), appSecret, now: firstAt});
    const events = await db.collection("organizerMessagingWebhookEvents")
      .where("providerMessageId", "==", `wamid.${id}`).get();
    assert.equal(events.size, 1);
    eventRef = events.docs[0].ref;
    const event = events.docs[0].data() as
      OrganizerMessagingWebhookEventDocument;
    await processOrganizerMessagingWebhookEvent({db, eventId: eventRef.id,
      event, now: firstAt});
    // The STOP withdrew every WhatsApp purpose with one receipt.
    const stopped = (await permissionRef.get()).data()!;
    assert.deepEqual(stopped.granted, []);
    const stopReceiptRef = db.collection("contactPermissionReceipts")
      .doc(stopped.grants["whatsapp:marketing"].receiptId);
    for (const key of ["whatsapp:eventOperations", "whatsapp:marketing",
      "whatsapp:followerUpdates"]) {
      assert.equal(stopped.grants[key].status, "optedOut", key);
      assert.equal(stopped.grants[key].receiptId, stopReceiptRef.id, key);
    }
    const stopReceipt = (await stopReceiptRef.get()).data()!;
    assert.equal(stopReceipt.revokedAt.toMillis(), firstAt.toMillis());
    assert.equal(stopReceipt.senderKind, "organizer");
    assert.equal(stopReceipt.senderId, organizerId);
    assert.equal(stopReceipt.source, "inboundStop");
    // A newer explicit choice after the STOP is not undone by its replay.
    const grant = {senderKind: "organizer", senderId: organizerId, uid,
      channel: "whatsapp", purpose: "marketing",
      endpointE164: "+919999999999", sourceVersionId: `version-${id}`,
      sourceDecidedAt: grantAt, decision: "optedIn",
      evidenceStatus: "complete", termsVersion: "form-whatsapp-v2",
      consentCopyHash: "a".repeat(64), source: "hostFormResponse",
      sourceEventId: null, sourceFormId: `form-${id}`,
      sourceResponseId: `response-${id}`, sourceProviderEventId: null,
      actorClass: "participant", actorUid: uid,
      identityStrength: "phoneVerified", grantedAt: grantAt, revokedAt: null,
      supersedesReceiptId: stopReceiptRef.id, createdAt: grantAt};
    await grantRef.create(grant);
    const fresh = {...stopped, grants: {...stopped.grants,
      "whatsapp:marketing": {status: "optedIn",
        endpointE164: "+919999999999", receiptId: `fresh-${id}`,
        termsVersion: "form-whatsapp-v2", source: "hostFormResponse",
        updatedAt: grantAt}}, updatedAt: grantAt};
    await permissionRef.set(fresh);
    await processOrganizerMessagingWebhookEvent({db, eventId: eventRef.id,
      event, now: replayAt});
    assert.deepEqual((await permissionRef.get()).data(), fresh);
    assert.deepEqual((await stopReceiptRef.get()).data(), stopReceipt);
    assert.deepEqual((await grantRef.get()).data(), grant);
    const nextRawBody = webhook([incoming({id: `wamid.${id}.next`,
      type: "text", text: {body: "STOP"}})], [], phoneNumberId);
    await ingestMetaWhatsappWebhook({db, rawBody: nextRawBody,
      signatureHeader: signature(nextRawBody), appSecret, now: nextStopAt});
    const nextEvents = await db.collection("organizerMessagingWebhookEvents")
      .where("providerMessageId", "==", `wamid.${id}.next`).get();
    assert.equal(nextEvents.size, 1);
    nextEventRef = nextEvents.docs[0].ref;
    await processOrganizerMessagingWebhookEvent({db,
      eventId: nextEventRef.id,
      event: nextEvents.docs[0].data() as
        OrganizerMessagingWebhookEventDocument,
      now: nextStopAt});
    const stoppedAgain = (await permissionRef.get()).data()!;
    const marketing = stoppedAgain.grants["whatsapp:marketing"];
    assert.equal(marketing.status, "optedOut");
    assert.equal(marketing.updatedAt.toMillis(), nextStopAt.toMillis());
    assert.equal(stoppedAgain.grants["whatsapp:eventOperations"].status,
      "optedOut");
    assert.notEqual(marketing.receiptId, stopReceiptRef.id);
    assert.deepEqual((await grantRef.get()).data(), grant);
    assert.equal((await db.collection("contactPermissionReceipts")
      .where("senderId", "==", organizerId).get()).size, 3);
  } finally {
    const receipts = await db.collection("contactPermissionReceipts")
      .where("senderId", "==", organizerId).get();
    const batch = db.batch();
    for (const ref of [eventRef, nextEventRef, connectionRef, contactRef,
      stateRef, permissionRef, guestRowRef]
      .filter((item) => item !== null)) {
      batch.delete(ref!);
    }
    for (const queued of [eventRef, nextEventRef]) {
      if (queued) {
        batch.delete(db.collection("organizerCampaignWebhookReceipts")
          .doc(queued.id));
      }
    }
    for (const receipt of receipts.docs) batch.delete(receipt.ref);
    await batch.commit();
    await deleteApp(app);
  }
});
