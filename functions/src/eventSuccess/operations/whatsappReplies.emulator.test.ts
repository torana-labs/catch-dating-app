import {getEmulatorFirestore} from "../../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import test from "node:test";
import {createHash, createHmac, randomUUID} from "node:crypto";
import {deleteApp, initializeApp} from "firebase-admin/app";
import {Firestore, Timestamp} from "firebase-admin/firestore";
import {ProgressFirestore, seedJoiningProgress} from
  "./groupProgressTestFixtures";
import {ingestMetaWhatsappWebhook} from
  "../../organizers/organizerWhatsappWebhook";
import type {EventAssistanceMessageIntent as Intent} from
  "../../shared/generated/eventAssistanceMessageIntent";
import {GuestAssistanceStore} from "./guestAssistanceStore";
import {guestCollections, parseGuest} from "./guestRecords";
import {readEventAssistanceMessageGate} from "./guestMessageGate";
import {EVENT_ASSISTANCE_MESSAGES, FirestoreMessageOutbox} from
  "./firestoreMessageOutbox";
import {parseMessageRecord} from "./messageOutbox";
import {
  parseWhatsappReplyBinding, ReplyBinding, WHATSAPP_REPLY_BINDINGS,
  whatsappEndpointId, whatsappNativeReplyId,
} from "./whatsappReplyProtocol";
import {WhatsappReplyStore} from "./whatsappReplyStore";

const signingKeys = {currentKeyId: "fixture-key",
  keyFor: () => Buffer.alloc(32, 9)};
const appSecret = "fixture-wa-action-secret";

async function fixture(options: {db?: Firestore; claim?: boolean;
  accept?: boolean; replyKind?: ReplyBinding["replyKind"];
  notice?: "safety" | "ack"} = {}) {
  const fake = new ProgressFirestore();
  const db = options.db ?? fake as unknown as Firestore;
  const id = randomUUID();
  const clock = {now: 1_000_000};
  const context = {mode: "live" as const, eventId: "event-" + id,
    organizerId: "organizer-" + id};
  const attendeeId = "attendee-" + id;
  const senderId = "sender-" + id;
  const phone = "+919999999999";
  const phoneNumberId = "12345" + BigInt("0x" +
    id.replace(/-/g, "").slice(0, 16)).toString();
  const paths = new Set<string>();
  const put = async (path: string, value: object) => {
    paths.add(path);
    if (options.db) await db.doc(path).set(value);
    else fake.write(path, value as Record<string, unknown>);
  };
  const read = async (path: string) => options.db ?
    (await db.doc(path).get()).data() : fake.read(path);
  const eventPath = "events/" + context.eventId;
  const attendeePath = "eventAttendees/" + attendeeId;
  const senderPath = "organizerSenderConnections/" + senderId;
  const progress = await seedJoiningProgress(db, context, clock.now,
    3_000_000);
  await put(attendeePath, {organizerId: context.organizerId,
    eventId: context.eventId, status: "registered", phoneE164: phone,
    createdAt: Timestamp.fromMillis(900_000), attendanceRevision: 7});
  await put(senderPath, {organizerId: context.organizerId, channel: "whatsapp",
    provider: "metaCloudApi", status: "active", wabaId: "700123",
    phoneNumberId, businessId: "900123", displayPhoneNumber: "+918888888888",
    verifiedName: "Fixture organizer", secretVersionResource: null,
    qualityRating: "GREEN", messagingLimitTier: null,
    templateSyncStatus: "current", webhookStatus: "subscribed",
    testStatus: "delivered", testProviderMessageId: "wamid.fixture-test",
    testRecipientHash: null, connectedByUid: "manager-1", revision: 1,
    createdAt: Timestamp.fromMillis(clock.now),
    updatedAt: Timestamp.fromMillis(clock.now), disconnectedAt: null});
  const guestStore = new GuestAssistanceStore(db, () => clock.now);
  const guest = await guestStore.startEpisode(context, attendeeId,
    "start-1", null);
  const base = {schemaVersion: 1 as const, intentId: "message-" + id,
    revision: 1, context, eventId: context.eventId, attendeeId,
    episodeId: guest.episodeId,
    workflow: {kind: "lateJoin" as const, occurrenceId: "departure-1"},
    createdAt: clock.now, expiresAt: 2_000_000,
    permittedRoutes: ["organizerEventWhatsapp" as const],
    deliveryPolicy: {maxAttempts: 2, maxAttemptsPerRoute: 1,
      minimumRetrySeconds: 1}};
  const intent: Intent = options.notice ? {...base,
    kind: "operationalNotice", noticeKind: "planChanged",
    title: "Event update", body: "Meet us at stop two.",
    instructionRevision: 1, choices: options.notice === "safety" ?
      [{choiceId: "help", label: "I need help",
        value: {kind: "requestHelp", category: "comfortSafety"}}] :
      [{choiceId: "ack", label: "Understood",
        value: {kind: "acknowledge", instructionRevision: 1}}]} :
    {...base, kind: "joiningUpdate", guidance: progress.guidance, choices: [
      {choiceId: "on-my-way", label: "I'm on my way",
        value: {kind: "joinIntent", intention: {kind: "onMyWay",
          claimedEta: null}}},
      {choiceId: "not-coming", label: "I can't make it",
        value: {kind: "joinIntent", intention: {kind: "notComing"}}},
      {choiceId: "help", label: "I need help",
        value: {kind: "requestHelp", category: "eventLogistics"}},
    ]};
  const thread = await guestStore.publishMessage(intent, null);
  const link = await guestStore.issueLink(thread.threadId, "send-1",
    signingKeys);
  const outbox = new FirestoreMessageOutbox(db, async (tx, value, now) => ({
    gate: await readEventAssistanceMessageGate(db, tx, value, now),
    routes: [{routeId: "organizerEventWhatsapp", state: {kind: "eligible",
      checkedAt: now, validUntil: now + 30_000,
      permissionRevision: "fixture-event-service-authority",
      candidate: {mode: "live", binding: {
        routeId: "organizerEventWhatsapp", transport: "whatsapp",
        provider: "meta", senderIdentity: "organizerManaged", senderId,
        bindingRevision: 1, recipientEndpointId: whatsappEndpointId(phone),
        fallbackOwner: "catch",
      }}}}],
  }), () => clock.now);
  const reserved = await outbox.reserve(thread.messageId);
  assert.equal(reserved.decision.kind, "dispatch");
  const attempt = reserved.record.attempts[0];
  const replies = new WhatsappReplyStore(db, () => clock.now);
  const replyKind = options.replyKind ?? "templateQuickReply";
  const claim = () => outbox.claimLiveDispatch(thread.messageId,
    attempt.attemptId, replies.prepare(replyKind,
      intent.choices.map((c) => c.choiceId)));
  const providerMessageId = "wamid.outbound." + id;
  const accept = () => outbox.recordReceipt(thread.messageId, {
    attemptId: attempt.attemptId, senderId, bindingRevision: 1,
    recipientEndpointId: whatsappEndpointId(phone),
    routeId: "organizerEventWhatsapp", providerEventId: "fixture-send-" + id,
    receivedAt: clock.now, state: {kind: "accepted", at: clock.now,
      providerMessageId},
  });
  if (options.claim !== false) {
    assert.equal((await claim()).kind, "claimed");
    if (options.accept !== false) await accept();
  }
  const receive = async (index = 0, change: {kind?: string; nativeId?: string;
    from?: string; account?: string; phoneId?: string; contextId?: string;
    label?: string; signature?: string} = {}) => {
    const kind = change.kind ?? replyKind;
    const nativeId = change.nativeId ??
      whatsappNativeReplyId(attempt.attemptId, index);
    const label = change.label ?? "A display label";
    const incomingId = "wamid.reply." + randomUUID();
    const rawBody = Buffer.from(JSON.stringify({
      object: "whatsapp_business_account", entry: [{id: change.account ??
        "700123", changes: [{field: "messages", value: {
        messaging_product: "whatsapp", metadata: {phone_number_id:
          change.phoneId ?? phoneNumberId}, messages: [{id: incomingId,
          from: change.from ?? phone.slice(1), timestamp:
            String(Math.floor(clock.now / 1000)),
          context: {id: change.contextId ?? providerMessageId},
          ...(kind === "templateQuickReply" ? {type: "button",
            button: {payload: nativeId, text: label}} : {type: "interactive",
            interactive: kind === "replyButton" ? {type: "button_reply",
              button_reply: {id: nativeId, title: label}} : {type: "list_reply",
              list_reply: {id: nativeId, title: label}}}),
        }],
      }}]}],
    }));
    await ingestMetaWhatsappWebhook({db, rawBody, appSecret,
      signatureHeader: change.signature ?? "sha256=" +
        createHmac("sha256", appSecret).update(rawBody).digest("hex"),
      now: Timestamp.fromMillis(clock.now)});
    const eventId = "omwe_" + createHash("sha256")
      .update("inbound:" + incomingId).digest("hex").slice(0, 48);
    paths.add("organizerMessagingWebhookEvents/" + eventId);
    paths.add("organizerCampaignWebhookReceipts/" + eventId);
    return eventId;
  };
  const guestPath = guestCollections.guests + "/" + guest.guestId;
  const messagePath = EVENT_ASSISTANCE_MESSAGES + "/" + thread.messageId;
  const bindingPath = WHATSAPP_REPLY_BINDINGS + "/" + attempt.attemptId;
  for (const path of [guestPath, messagePath, bindingPath,
    guestCollections.threads + "/" + thread.threadId,
    guestCollections.grants + "/" + link.linkId]) paths.add(path);
  const submitWeb = (choiceId = intent.choices[0].choiceId) =>
    guestStore.submit({...link, intentId: intent.intentId,
      intentRevision: intent.revision, expectedGuestRevision: guest.revision,
      choiceId, requestId: "web-response-1"});
  const cleanup = async () => {
    if (!options.db) return;
    const cases = await db.collection(guestCollections.cases)
      .where("messageId", "==", thread.messageId).get();
    const batch = db.batch();
    for (const path of paths) batch.delete(db.doc(path));
    for (const row of cases.docs) batch.delete(row.ref);
    await batch.commit();
  };
  return {db, fake, clock, context, guest, intent, thread, link, guestStore,
    outbox, replies, attempt, claim, accept, receive, submitWeb, put, read,
    progress, eventPath, guestPath, attendeePath, senderPath, messagePath,
    bindingPath,
    cleanup};
}

test("reply bindings commit with one dispatch claim and freeze offered choices",
  async () => {
    const h = await fixture({claim: false});
    assert.equal((await h.outbox.claimLiveDispatch(h.thread.messageId,
      h.attempt.attemptId, h.replies.prepare("replyButton", ["unknown"])))
      .kind, "withheld");
    assert.equal(await h.read(h.bindingPath), undefined);
    const claims = await Promise.all(Array.from({length: 8}, () => h.claim()));
    assert.equal(claims.filter((r) => r.kind === "claimed").length, 1);
    const binding = parseWhatsappReplyBinding(await h.read(h.bindingPath));
    assert.equal(binding.guestRevision, h.guest.revision);
    assert.deepEqual(binding.choices.map((c) => c.choiceId),
      h.intent.choices.map((c) => c.choiceId));
    const persisted = JSON.stringify(binding);
    assert.equal(persisted.includes("919999999999"), false);
    assert.equal(persisted.includes(h.link.secret), false);
    assert.throws(() => parseWhatsappReplyBinding({...binding,
      choices: [...binding.choices, binding.choices[0]]}), /Invalid/);
  });

test("native reply kinds apply stored actions once and ignore display labels",
  async () => {
    const kinds = ["templateQuickReply", "replyButton", "listReply"] as const;
    for (const replyKind of kinds) {
      const h = await fixture({replyKind});
      const attendee = await h.read(h.attendeePath);
      const eventId = await h.receive(0, {label: "I can't make it"});
      const results = await Promise.all(Array.from({length: 8}, () =>
        h.replies.consumeQueued(eventId)));
      assert.equal(results.filter((r) => r.kind === "accepted").length, 1);
      assert.equal(results.filter((r) => r.kind === "replayed").length, 7);
      const guest = parseGuest(await h.read(h.guestPath));
      assert.equal(guest.intention.kind, "onMyWay");
      assert.equal(guest.revision, h.guest.revision + 1);
      assert.deepEqual(await h.read(h.attendeePath), attendee);
    }
  });

test("replies wait for original-message correlation instead of guessing",
  async () => {
    const h = await fixture({accept: false});
    const eventId = await h.receive();
    assert.deepEqual(await h.replies.consumeQueued(eventId),
      {kind: "waiting", reason: "deliveryUnconfirmed"});
    assert.equal(parseGuest(await h.read(h.guestPath)).revision, 0);
    await h.accept();
    assert.deepEqual(await h.replies.consumeQueued(eventId),
      {kind: "accepted"});
  });

test("sender, recipient, original message and native kind must all match",
  async () => {
    for (const change of [
      {from: "918888888888"}, {account: "700999"}, {phoneId: "999123"},
      {contextId: "wamid.another-message"}, {kind: "replyButton"},
    ]) {
      const h = await fixture();
      const eventId = await h.receive(0, change);
      assert.equal((await h.replies.consumeQueued(eventId)).kind, "rejected");
      assert.equal(parseGuest(await h.read(h.guestPath)).revision, 0);
    }
    const h = await fixture();
    await assert.rejects(h.receive(0, {signature: "invalid"}), /signature/);
    const unrelated = await h.receive(0, {nativeId: "on-my-way"});
    assert.deepEqual(await h.replies.consumeQueued(unrelated),
      {kind: "ignored"});
    const missing = await h.receive(0, {nativeId:
      whatsappNativeReplyId("attempt:" + "a".repeat(64), 0)});
    assert.deepEqual(await h.replies.consumeQueued(missing),
      {kind: "rejected", reason: "unavailable"});
  });

test("changed source identity, attendance and expiry prevent native effects",
  async () => {
    for (const change of ["progress", "phone", "generation", "checkIn",
      "cancel",
      "senderOwner", "episode", "expiry"]) {
      const h = await fixture();
      const eventId = await h.receive();
      const attendee = (await h.read(h.attendeePath))!;
      if (change === "progress") {
        await h.progress.confirm("two");
      }
      if (change === "phone") {
        await h.put(h.attendeePath,
          {...attendee, phoneE164: "+918888888888"});
      }
      if (change === "generation") {
        await h.put(h.attendeePath,
          {...attendee, createdAt: Timestamp.fromMillis(900_001)});
      }
      if (change === "checkIn") {
        await h.put(h.attendeePath,
          {...attendee, status: "checkedIn"});
      }
      if (change === "cancel") {
        await h.put(h.eventPath,
          {...(await h.read(h.eventPath)), status: "cancelled"});
      }
      if (change === "senderOwner") {
        await h.put(h.senderPath,
          {...(await h.read(h.senderPath)), organizerId: "another-organizer"});
      }
      if (change === "episode") {
        await h.guestStore.startEpisode(h.context,
          h.guest.attendeeId, "new-episode", h.guest.revision);
      }
      if (change === "expiry") h.clock.now = h.intent.expiresAt;
      const before = await h.read(h.guestPath);
      assert.equal((await h.replies.consumeQueued(eventId)).kind, "rejected",
        change);
      assert.deepEqual(await h.read(h.guestPath), before);
    }
  });

test("superseded instructions and newer guest decisions fence old buttons",
  async () => {
    const h = await fixture();
    const eventId = await h.receive();
    const replacement = {...h.intent, intentId: "replacement"};
    await h.guestStore.publishMessage(replacement, h.thread.revision);
    assert.deepEqual(await h.replies.consumeQueued(eventId),
      {kind: "rejected", reason: "noLongerNeeded"});
    const other = await fixture();
    const otherReply = await other.receive();
    const separate = {...other.intent, intentId: "separate-message",
      workflow: {kind: "joiningInstructions" as const, occurrenceId: "other"}};
    const thread = await other.guestStore.publishMessage(separate, null);
    const link = await other.guestStore.issueLink(thread.threadId, "other",
      signingKeys);
    await other.guestStore.submit({...link, intentId: separate.intentId,
      intentRevision: 1, expectedGuestRevision: 0, choiceId: "on-my-way",
      requestId: "new-decision"});
    assert.deepEqual(await other.replies.consumeQueued(otherReply),
      {kind: "rejected", reason: "guestStateChanged"});
  });

test("binding metadata cannot replace the attempt's frozen sender revision",
  async () => {
    const h = await fixture();
    const eventId = await h.receive();
    await h.put(h.senderPath, {...(await h.read(h.senderPath)), revision: 2});
    // Health revisions can advance without invalidating a historical sender.
    await h.put(h.bindingPath, {...(await h.read(h.bindingPath)),
      bindingRevision: 2});
    assert.deepEqual(await h.replies.consumeQueued(eventId),
      {kind: "rejected", reason: "scopeMismatch"});
    await h.put(h.bindingPath, {...(await h.read(h.bindingPath)),
      bindingRevision: 1});
    assert.deepEqual(await h.replies.consumeQueued(eventId),
      {kind: "accepted"});
  });

test("native and webpage replies share one atomic response and domain effect",
  async () => {
    const h = await fixture();
    const eventId = await h.receive(2);
    const results = await Promise.all(Array.from({length: 8}, (_, i) => i % 2 ?
      h.submitWeb().then((r) => r.result) : h.replies.consumeQueued(eventId)));
    assert.equal(results.filter((r) => r.kind === "accepted").length, 1);
    const record = parseMessageRecord(await h.read(h.messagePath));
    assert.equal(record.lifecycle, "responded");
    assert.ok(record.response);
    const cases = h.fake.entries().filter(([path]) =>
      path.startsWith(guestCollections.cases + "/"));
    assert.equal(cases.length, record.response.value.kind ===
      "requestHelp" ? 1 : 0);
  });

test("declines replay, help has an owner, and ack changes no guest",
  async () => {
    const declined = await fixture();
    const declineId = await declined.receive(1);
    assert.deepEqual(await declined.replies.consumeQueued(declineId),
      {kind: "accepted"});
    assert.deepEqual(await declined.replies.consumeQueued(declineId),
      {kind: "replayed"});
    assert.equal(parseGuest(await declined.read(declined.guestPath))
      .intention.kind, "notComing");
    for (const notice of ["safety", "ack"] as const) {
      const h = await fixture({notice});
      const eventId = await h.receive();
      assert.deepEqual(await h.replies.consumeQueued(eventId),
        {kind: "accepted"});
      assert.equal(parseGuest(await h.read(h.guestPath)).revision, 0);
      const cases = h.fake.entries().filter(([path]) =>
        path.startsWith(guestCollections.cases + "/"));
      assert.equal(cases.length, notice === "safety" ? 1 : 0);
      if (notice === "safety") {
        assert.equal(cases[0][1].owner, "authorizedSafetyOperator");
      }
    }
  });

test("interrupted response transactions leave neither a case nor a response",
  async () => {
    const h = await fixture();
    const eventId = await h.receive(2);
    const before = h.fake.entries();
    h.fake.failNextCommit = true;
    await assert.rejects(h.replies.consumeQueued(eventId), /interruption/);
    assert.deepEqual(h.fake.entries(), before);
    assert.deepEqual(await h.replies.consumeQueued(eventId),
      {kind: "accepted"});
  });

test("expiry is rechecked after source reads and missing events close replies",
  async () => {
    const h = await fixture();
    const eventId = await h.receive();
    let calls = 0;
    const store = new WhatsappReplyStore(h.db, () => calls++ === 0 ?
      h.clock.now : h.intent.expiresAt);
    assert.deepEqual(await store.consumeQueued(eventId),
      {kind: "rejected", reason: "expired"});
    await h.put(h.eventPath, {});
    assert.deepEqual(await h.replies.consumeQueued(eventId),
      {kind: "rejected", reason: "unavailable"});
  });

test("shortened schedule invalidates an otherwise unexpired native reply",
  async () => {
    const h = await fixture();
    const eventId = await h.receive();
    await h.put(h.eventPath, {...(await h.read(h.eventPath)),
      endTime: Timestamp.fromMillis(h.clock.now + 1)});
    let reads = 0;
    const replies = new WhatsappReplyStore(h.db, () =>
      reads++ === 0 ? h.clock.now : h.clock.now + 1);
    assert.deepEqual(await replies.consumeQueued(eventId),
      {kind: "rejected", reason: "noLongerNeeded"});
    assert.equal(parseGuest(await h.read(h.guestPath)).revision, 0);
  });

test("Firestore arbitrates competing native and web replies to one effect", {
  skip: !process.env.FIRESTORE_EMULATOR_HOST, timeout: 60_000,
}, async () => {
  assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? "",
    /^(127\.0\.0\.1|localhost|\[::1\]):\d+$/);
  const app = initializeApp({projectId: "demo-catch-rules"},
    "wa-action-" + randomUUID());
  let h: Awaited<ReturnType<typeof fixture>> | undefined;
  try {
    h = await fixture({db: getEmulatorFirestore(app)});
    const eventId = await h.receive(2);
    const {replies, submitWeb} = h;
    const results = await Promise.all(Array.from({length: 8}, (_, i) => i % 2 ?
      submitWeb().then((r) => r.result) : replies.consumeQueued(eventId)));
    assert.equal(results.filter((r) => r.kind === "accepted").length, 1);
    const record = parseMessageRecord(await h.read(h.messagePath));
    assert.equal(record.lifecycle, "responded");
    assert.ok(record.response);
    const guest = parseGuest(await h.read(h.guestPath));
    assert.equal(guest.revision, record.response.value.kind ===
      "joinIntent" ? 1 : 0);
    const cases = await h.db.collection(guestCollections.cases)
      .where("messageId", "==", h.thread.messageId).get();
    assert.equal(cases.size, record.response.value.kind === "requestHelp" ?
      1 : 0);
    assert.equal((await h.read(h.attendeePath))?.status, "registered");
  } finally {
    await h?.cleanup();
    await deleteApp(app);
  }
});
