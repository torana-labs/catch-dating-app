import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {HttpsError} from "firebase-functions/v2/https";
import {FakeFirestore} from "../shared/testing/programFirestore";
import {MetaProviderError} from "../organizers/organizerWhatsappProvider";
import {
  AdminSupportDeps,
  adminGetSupportConversationHandler,
} from "../supportInbox/adminSupport";
import {
  recordWhatsappSupportReceipt,
  supportConversationId,
} from "../supportInbox/conversations";
import {
  SupportConversationReplyDeps,
  sendSupportConversationReply,
  supportReplyOperationId,
} from "./supportConversationReply";
import {consumeSupportReplyStatus} from "./whatsappReceiptConsumer";
import {createCatchReplyHandlers} from "./whatsappReplyHandlers";
import {CATCH_ENDPOINT_STOPS, CATCH_RECEIPTS} from "./whatsappEndpointStops";
import {catchEndpointHash, catchStopId} from "./whatsappReply";

const T0 = Date.UTC(2026, 10, 21, 9);
const HOUR = 3600_000;
const scope = {wabaId: "123", phoneNumberId: "456"};
const PHONE = "+919800001234";
const conversationId = supportConversationId("whatsapp", PHONE);

function harness(options: {enabled?: boolean} = {}) {
  const db = new FakeFirestore({});
  const clock = {millis: T0};
  const sent: Array<{to: string; body: string}> = [];
  const rateCalls: Array<{key: string; action: string}> = [];
  let failure: unknown = null;
  const deps: SupportConversationReplyDeps = {
    config: () => ({enabled: options.enabled ?? true, ...scope}),
    db: () => db as never,
    now: () => clock.millis,
    rateLimit: async (_db, key, action) => {
      rateCalls.push({key, action: action as string});
    },
    sender: async () => async (to, body) => {
      if (failure) throw failure;
      sent.push({to, body});
      return `wamid.out${sent.length}`;
    },
    serverTimestamp: () => "SERVER_TS" as never,
  };
  const supportDeps: AdminSupportDeps = {
    firestore: () => db as never,
    now: () => Timestamp.fromMillis(clock.millis),
    findUidByPhone: async () => null,
    serverTimestamp: () => "SERVER_TS" as never,
    whatsappReplies: () => ({enabled: options.enabled ?? true, ...scope}),
  };
  return {db, clock, sent, rateCalls, deps, supportDeps,
    fail: (error: unknown) => {
      failure = error;
    }};
}

async function inbound(h: ReturnType<typeof harness>, eventId: string,
  text: string, atMillis = h.clock.millis) {
  return recordWhatsappSupportReceipt(h.supportDeps, {eventId,
    eventKind: "inbound", messageType: "text", participantId: PHONE.slice(1),
    text, providerTimestampSeconds: String(Math.floor(atMillis / 1000))});
}

const request = (data: Record<string, unknown>,
  token: Record<string, unknown> = {support: true}) => ({
    auth: {uid: "ops-1", token},
    app: {appId: "admin"},
    data: {purpose: "supportConversation", conversationId,
      clientRequestId: "req-00000001", body: "Looking at it now.",
      savedReplyId: null, ...data},
    rawRequest: {headers: {}},
  }) as never;

const openRequest = {auth: {uid: "ops-1", token: {support: true}},
  data: {conversationId}, rawRequest: {headers: {}}} as never;

const code = (expected: string) => (error: unknown) =>
  error instanceof HttpsError && error.code === expected;

function messageDoc(h: ReturnType<typeof harness>,
  clientRequestId = "req-00000001") {
  const id = supportReplyOperationId(scope, conversationId, clientRequestId);
  return h.db.getDoc(`supportConversations/${conversationId}/messages/${id}`);
}

test("a reply inside the window is sent once, appended and audited",
  async () => {
    const h = harness();
    await inbound(h, "cwhe_1", "Where is my ticket?");
    h.clock.millis += HOUR;
    const first = await sendSupportConversationReply(request({}), h.deps);
    assert.equal(first.replayed, false);
    assert.equal(first.providerMessageId, "wamid.out1");
    assert.equal(first.deliveryStatus, "accepted");
    assert.deepEqual(h.sent, [{to: PHONE, body: "Looking at it now."}]);
    const message = messageDoc(h)!;
    assert.equal(message.direction, "outbound");
    assert.equal(message.deliveryState, "accepted");
    assert.equal(message.providerMessageId, "wamid.out1");
    assert.equal(message.authorUid, "ops-1");
    const conversation = h.db.getDoc(`supportConversations/${conversationId}`)!;
    assert.equal(conversation.status, "waitingOnThem");
    assert.equal(conversation.waitingSince, null);
    assert.equal(conversation.messageCount, 2);
    // Retrying the same request returns the first outcome; nothing is resent.
    const again = await sendSupportConversationReply(request({}), h.deps);
    assert.equal(again.replayed, true);
    assert.equal(again.messageId, first.messageId);
    assert.equal(h.sent.length, 1);
    const audits = [...h.db.docs.entries()]
      .filter(([path]) => path.startsWith("adminAuditLogs/"))
      .map(([, data]) => data);
    const actions = audits.map((entry) =>
      (entry.after as {deliveryState?: string})?.deliveryState);
    assert.deepEqual(actions.sort(), ["accepted", "sending"]);
    // The per-conversation limit is keyed on the conversation.
    assert.ok(h.rateCalls.some((call) => call.key === conversationId &&
      call.action === "adminSendSupportConversationReply"));
  });

test("the same request id with different text is refused", async () => {
  const h = harness();
  await inbound(h, "cwhe_1", "Hi");
  await sendSupportConversationReply(request({}), h.deps);
  await assert.rejects(sendSupportConversationReply(
    request({body: "Something else"}), h.deps), code("already-exists"));
  assert.equal(h.sent.length, 1);
});

test("outside the 24-hour window nothing is sent", async () => {
  const h = harness();
  await inbound(h, "cwhe_1", "Hi", T0 - 25 * HOUR);
  await assert.rejects(sendSupportConversationReply(request({}), h.deps),
    (error) => code("failed-precondition")(error) &&
      /24 hours/u.test((error as Error).message));
  assert.equal(h.sent.length, 0);
  assert.equal(messageDoc(h), undefined);
  const detail = await adminGetSupportConversationHandler(
    openRequest, h.supportDeps);
  assert.deepEqual(detail.conversation.reply, {mode: "send", canSend: false,
    blockedReason: "windowClosed",
    windowClosesAtMillis: Math.floor((T0 - 25 * HOUR) / 1000) * 1000 +
      24 * HOUR});
});

test("the window is measured from when they wrote, not when Catch " +
  "processed it", async () => {
  const h = harness();
  // Processed now, but written 23 hours 59.5 minutes ago: inside the margin.
  await inbound(h, "cwhe_1", "Hi", T0 - 24 * HOUR + 30_000);
  await assert.rejects(sendSupportConversationReply(request({}), h.deps),
    code("failed-precondition"));
  assert.equal(h.sent.length, 0);
});

test("after STOP Catch never replies", async () => {
  const h = harness();
  await inbound(h, "cwhe_1", "Hi");
  h.db.setDoc(`${CATCH_ENDPOINT_STOPS}/${catchStopId(scope,
    catchEndpointHash(PHONE))}`, {stopId: "x"});
  await assert.rejects(sendSupportConversationReply(request({}), h.deps),
    (error) => code("failed-precondition")(error) &&
      /stop messaging/u.test((error as Error).message));
  assert.equal(h.sent.length, 0);
  const detail = await adminGetSupportConversationHandler(
    openRequest, h.supportDeps);
  assert.equal(detail.conversation.reply?.blockedReason, "stopped");
});

test("switched off: refused, and the screen records replies instead",
  async () => {
    const h = harness({enabled: false});
    await inbound(h, "cwhe_1", "Hi");
    await assert.rejects(sendSupportConversationReply(request({}), h.deps),
      code("failed-precondition"));
    assert.equal(h.sent.length, 0);
    const detail = await adminGetSupportConversationHandler(
      openRequest, h.supportDeps);
    assert.equal(detail.conversation.reply?.mode, "record");
    assert.equal(detail.conversation.reply?.blockedReason, "switchedOff");
  });

test("only support roles may send, and App Check is required", async () => {
  const h = harness();
  await inbound(h, "cwhe_1", "Hi");
  await assert.rejects(sendSupportConversationReply(
    request({}, {salesStaff: true}), h.deps), code("permission-denied"));
  await assert.rejects(sendSupportConversationReply(
    {...(request({}) as object), app: undefined} as never, h.deps),
  code("unauthenticated"));
  assert.equal(h.sent.length, 0);
});

test("a WhatsApp refusal marks the reply failed; a lost answer marks it " +
  "unknown; neither is resent", async () => {
  const h = harness();
  await inbound(h, "cwhe_1", "Hi");
  h.fail(new MetaProviderError("Meta request failed (400).", 131047, 400));
  await assert.rejects(sendSupportConversationReply(request({}), h.deps),
    code("failed-precondition"));
  assert.equal(messageDoc(h)!.deliveryState, "failed");
  assert.equal(messageDoc(h)!.deliveryErrorCode, 131047);
  await assert.rejects(sendSupportConversationReply(request({}), h.deps),
    code("failed-precondition"));

  h.fail(new MetaProviderError("Meta request outcome is unknown.", null,
    null));
  await assert.rejects(sendSupportConversationReply(
    request({clientRequestId: "req-00000002"}), h.deps), code("unavailable"));
  assert.equal(messageDoc(h, "req-00000002")!.deliveryState, "unknown");
  h.fail(null);
  await assert.rejects(sendSupportConversationReply(
    request({clientRequestId: "req-00000002"}), h.deps), code("unavailable"));
  assert.equal(h.sent.length, 0);
  // A failed send does not stop the waiting clock.
  const conversation = h.db.getDoc(`supportConversations/${conversationId}`)!;
  assert.equal(conversation.status, "open");
});

test("delivery statuses update the sent reply, early ones included",
  async () => {
    const h = harness();
    await inbound(h, "cwhe_1", "Hi");
    // A "sent" status that arrives before the send call returns.
    h.db.setDoc(`${CATCH_RECEIPTS}/cwhe_early`, {...scope,
      eventKind: "status", messageId: "wamid.out1", deliveryStatus: "sent",
      participantId: PHONE.slice(1), errorCodes: []});
    h.clock.millis += 60_000;
    await sendSupportConversationReply(request({}), h.deps);
    assert.equal(messageDoc(h)!.deliveryState, "sent");
    const receipt = (deliveryStatus: string, errorCodes: number[] = []) => ({
      ...scope, eventId: "cwhe_x", eventKind: "status" as const,
      messageId: "wamid.out1", deliveryStatus, participantId: PHONE.slice(1),
      errorCodes, expiresAt: Timestamp.fromMillis(T0 + 30 * 24 * HOUR),
    }) as never;
    assert.equal(await consumeSupportReplyStatus(h.db as never,
      receipt("delivered"), T0), "applied");
    assert.equal(await consumeSupportReplyStatus(h.db as never,
      receipt("failed", [131026]), T0), "unchanged");
    assert.equal(await consumeSupportReplyStatus(h.db as never,
      receipt("read"), T0), "applied");
    assert.equal(messageDoc(h)!.deliveryState, "read");
    assert.equal(await consumeSupportReplyStatus(h.db as never,
      {...(receipt("read") as object), messageId: "wamid.other"} as never, T0),
    "deferred");
    const detail = await adminGetSupportConversationHandler(
      openRequest, h.supportDeps);
    assert.equal(detail.messages.at(-1)?.deliveryState, "read");
    assert.equal(detail.conversation.reply?.canSend, true);
  });

test("the generalised callable routes conversation replies past the " +
  "trial's controlled scope", async () => {
  const h = harness();
  await inbound(h, "cwhe_1", "Hi");
  const handlers = createCatchReplyHandlers({
    config: () => {
      throw new Error("trial config must not be read");
    },
    db: () => h.db as never,
    getUser: async () => {
      throw new Error("trial authority must not be read");
    },
    now: () => h.clock.millis,
    prepare: async () => {
      throw new Error("trial sender must not be prepared");
    },
    rateLimit: async () => undefined,
    supportReply: (call) => sendSupportConversationReply(call, h.deps),
  });
  const result = await handlers.send(request({}));
  assert.equal(result.providerMessageId, "wamid.out1");
  assert.match(result.operationId, /^cwsupport_[a-f0-9]{64}$/u);
});
