import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {FakeFirestore} from "../shared/testing/programFirestore";
import {
  AdminSupportDeps,
  adminRecordSupportMessageHandler,
  adminUpdateSupportConversationHandler,
} from "./adminSupport";
import {
  recordWhatsappSupportReceipt,
  supportConversationId,
} from "./conversations";
import {SUPPORT_EXPIRY_PAGE} from "./retention";
import {supportExpiresAtMillis} from "../shared/supportRetention";

// Support conversations expire by Firestore TTL on expiresAt, 180 days
// after they close (#2468). The conversation and each message carry the
// stamp; reopening clears both.

const T0 = Date.UTC(2026, 10, 1, 9);
const ID = supportConversationId("whatsapp", "+919800001234");
const PATH = `supportConversations/${ID}`;

function harness() {
  const db = new FakeFirestore({"users/guest-1": {displayName: "Rhea Kapoor"}});
  const clock = {millis: T0};
  const deps: AdminSupportDeps = {
    firestore: () => db as never,
    now: () => Timestamp.fromMillis(clock.millis),
    findUidByPhone: async () => "guest-1",
    serverTimestamp: () => "SERVER_TS" as never,
  };
  return {db, deps, clock};
}

const ops = (data: unknown) => ({
  auth: {uid: "ops-1", token: {support: true}},
  data,
  rawRequest: {headers: {}},
}) as never;

const inbound = (eventId: string, text: string) => ({eventId,
  eventKind: "inbound", messageType: "text", participantId: "919800001234",
  text});

/** A conversation with more messages than one page, as a long thread. */
async function longThread(h: ReturnType<typeof harness>) {
  await recordWhatsappSupportReceipt(h.deps, inbound("cwhe_1", "Refund?"));
  for (let index = 0; index < SUPPORT_EXPIRY_PAGE + 5; index += 1) {
    h.db.setDoc(`${PATH}/messages/old-${String(index).padStart(4, "0")}`, {
      schemaVersion: 1, messageId: `old-${index}`, conversationId: ID,
      direction: "inbound", text: "Earlier", authorUid: null,
      sourceEventId: null, savedReplyId: null, deliveryState: "received",
      at: Timestamp.fromMillis(T0 - 1000)});
  }
}

const close = (h: ReturnType<typeof harness>, status = "closed") =>
  adminUpdateSupportConversationHandler(ops({conversationId: ID,
    ownerUid: "ops-1", status, links: []}), h.deps);

async function messageExpiries(h: ReturnType<typeof harness>) {
  const snap = await h.db.collection(`${PATH}/messages`).get();
  return snap.docs.map((doc) => doc.data()?.expiresAt ?? null);
}

const millis = (value: unknown) =>
  value instanceof Timestamp ? value.toMillis() : value;

test("closing stamps the conversation and every message of a long thread",
  async () => {
    const h = harness();
    await longThread(h);
    h.clock.millis += 60_000;
    await close(h);
    const expected = supportExpiresAtMillis(T0 + 60_000);
    assert.equal(millis(h.db.getDoc(PATH)!.expiresAt), expected);
    const expiries = await messageExpiries(h);
    assert.equal(expiries.length, SUPPORT_EXPIRY_PAGE + 6);
    assert.ok(expiries.every((value) => millis(value) === expected));
  });

test("an inbound message after close reopens the conversation and clears " +
  "every stamp", async () => {
  const h = harness();
  await longThread(h);
  await close(h);
  h.clock.millis += 3600_000;
  await recordWhatsappSupportReceipt(h.deps, inbound("cwhe_2", "Still here"));
  const conversation = h.db.getDoc(PATH)!;
  assert.equal(conversation.status, "open");
  assert.equal(conversation.expiresAt, null);
  assert.ok((await messageExpiries(h)).every((value) => value === null));
});

test("reopening from Admin clears every stamp", async () => {
  const h = harness();
  await longThread(h);
  await close(h);
  await close(h, "open");
  assert.equal(h.db.getDoc(PATH)!.expiresAt, null);
  assert.ok((await messageExpiries(h)).every((value) => value === null));
});

test("a note on a closed conversation expires with it", async () => {
  const h = harness();
  await recordWhatsappSupportReceipt(h.deps, inbound("cwhe_3", "Thanks"));
  await close(h);
  const {messageId} = await adminRecordSupportMessageHandler(ops({
    conversationId: ID, channel: "whatsapp", contactAddress: null,
    displayName: null, direction: "note", text: "Refund confirmed.",
    savedReplyId: null}), h.deps);
  const conversation = h.db.getDoc(PATH)!;
  assert.equal(conversation.status, "closed");
  assert.equal(millis(h.db.getDoc(`${PATH}/messages/${messageId}`)!
    .expiresAt), millis(conversation.expiresAt));
});
