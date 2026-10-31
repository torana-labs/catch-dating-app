import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {HttpsError} from "firebase-functions/v2/https";
import {FakeFirestore} from "../shared/testing/programFirestore";
import {
  AdminSupportDeps,
  adminGetSupportConversationHandler,
  adminListSupportConversationsHandler,
  adminRecordSupportMessageHandler,
  adminUpdateSupportConversationHandler,
  adminUpsertSupportSavedReplyHandler,
} from "./adminSupport";
import {
  maskedContactLabel,
  recordWhatsappSupportReceipt,
  supportConversationId,
} from "./conversations";

const T0 = Date.UTC(2026, 10, 1, 9);

function harness() {
  const db = new FakeFirestore({
    "users/guest-1": {displayName: "Rhea Kapoor"},
    "payments/pay-1": {userId: "guest-1"},
    "organizers/org-1": {hostUserIds: ["host-1"]},
    "users/host-1": {displayName: "Meher Bhatt"},
  });
  const clock = {millis: T0};
  const phones: Record<string, string> = {
    "+919800001234": "guest-1",
    "+919800005678": "host-1",
  };
  const deps: AdminSupportDeps = {
    firestore: () => db as never,
    now: () => Timestamp.fromMillis(clock.millis),
    findUidByPhone: async (phone) => phones[phone] ?? null,
    serverTimestamp: () => "SERVER_TS" as never,
  };
  return {db, deps, clock};
}

const ops = (data: unknown) => ({
  auth: {uid: "ops-1", token: {support: true}},
  data,
  rawRequest: {headers: {}},
}) as never;

function receipt(eventId: string, participantId: string, text: string) {
  return {eventId, eventKind: "inbound", messageType: "text", participantId,
    text};
}

test("an inbound WhatsApp message opens a conversation matched to the " +
  "guest, once per receipt", async () => {
  const h = harness();
  await recordWhatsappSupportReceipt(h.deps,
    receipt("cwhe_1", "919800001234", "I paid but have no ticket"));
  await recordWhatsappSupportReceipt(h.deps,
    receipt("cwhe_1", "919800001234", "I paid but have no ticket"));
  const id = supportConversationId("whatsapp", "+919800001234");
  const conversation = h.db.getDoc(`supportConversations/${id}`)!;
  assert.equal(conversation.uid, "guest-1");
  assert.equal(conversation.displayName, "Rhea Kapoor");
  assert.equal(conversation.audience, "guest");
  assert.equal(conversation.messageCount, 1);
  assert.equal(conversation.contactLabel, "+91 ••••• 01234");
  assert.equal((conversation.waitingSince as Timestamp).toMillis(), T0);
});

test("organizers are told apart from guests", async () => {
  const h = harness();
  await recordWhatsappSupportReceipt(h.deps,
    receipt("cwhe_2", "919800005678", "A payout is missing"));
  const list = await adminListSupportConversationsHandler(
    ops({view: "open", audience: "organizer", limit: 20}), h.deps);
  assert.equal(list.items.length, 1);
  assert.equal(list.items[0].displayName, "Meher Bhatt");
});

test("a reply stops the waiting clock; their answer restarts it",
  async () => {
    const h = harness();
    await recordWhatsappSupportReceipt(h.deps,
      receipt("cwhe_3", "919800001234", "Where is my ticket?"));
    const id = supportConversationId("whatsapp", "+919800001234");
    h.clock.millis += 3600_000;
    await adminRecordSupportMessageHandler(ops({conversationId: id,
      channel: "whatsapp", contactAddress: null, displayName: null,
      direction: "outbound", text: "Looking at it now.",
      savedReplyId: null}), h.deps);
    let conversation = h.db.getDoc(`supportConversations/${id}`)!;
    assert.equal(conversation.status, "waitingOnThem");
    assert.equal(conversation.waitingSince, null);
    h.clock.millis += 3600_000;
    await recordWhatsappSupportReceipt(h.deps,
      receipt("cwhe_4", "919800001234", "Thanks!"));
    conversation = h.db.getDoc(`supportConversations/${id}`)!;
    assert.equal(conversation.status, "open");
    assert.equal((conversation.waitingSince as Timestamp).toMillis(),
      T0 + 2 * 3600_000);
    const detail = await adminGetSupportConversationHandler(
      ops({conversationId: id}), h.deps);
    assert.deepEqual(detail.messages.map((m) => m.direction),
      ["inbound", "outbound", "inbound"]);
    assert.equal(detail.conversation.contactAddress, "+919800001234");
  });

test("owner, status and links to existing records", async () => {
  const h = harness();
  await recordWhatsappSupportReceipt(h.deps,
    receipt("cwhe_5", "919800001234", "Refund please"));
  const id = supportConversationId("whatsapp", "+919800001234");
  await assert.rejects(adminUpdateSupportConversationHandler(ops({
    conversationId: id, ownerUid: "ops-1", status: "open",
    links: [{kind: "payment", path: "payments/missing", label: "x"}]}),
  h.deps), (error) => error instanceof HttpsError &&
    error.code === "not-found");
  await adminUpdateSupportConversationHandler(ops({conversationId: id,
    ownerUid: "ops-1", status: "open",
    links: [{kind: "payment", path: "payments/pay-1",
      label: "₹1,500 captured"}]}), h.deps);
  const mine = await adminListSupportConversationsHandler(
    ops({view: "mine", audience: null, limit: 20}), h.deps);
  assert.equal(mine.items[0].linkCount, 1);
  assert.equal(mine.counts.mine, 1);
});

test("a logged email starts a conversation; saved replies are kept",
  async () => {
    const h = harness();
    const result = await adminRecordSupportMessageHandler(ops({
      conversationId: null, channel: "email",
      contactAddress: "Ishaan@example.com", displayName: "Ishaan Bose",
      direction: "inbound", text: "The sign-in code never arrives.",
      savedReplyId: null}), h.deps);
    const conversation = h.db.getDoc(
      `supportConversations/${result.conversationId}`)!;
    assert.equal(conversation.contactAddress, "ishaan@example.com");
    assert.equal(conversation.displayName, "Ishaan Bose");
    const {replyId} = await adminUpsertSupportSavedReplyHandler(ops({
      replyId: null, title: "Sign-in code", body: "Try again in a minute.",
      active: true}), h.deps);
    assert.ok(h.db.getDoc(`supportSavedReplies/${replyId}`));
  });

test("contact labels hide most of the address", () => {
  assert.equal(maskedContactLabel("email", "rhea@example.com"),
    "r•••@example.com");
});
