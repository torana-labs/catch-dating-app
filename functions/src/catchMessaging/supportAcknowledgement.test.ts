import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {FakeFirestore} from "../shared/testing/programFirestore";
import {
  SupportInboxDeps,
  recordWhatsappSupportReceipt,
  supportConversationId,
} from "../supportInbox/conversations";
import type {CatchAutoReplyRequest} from "./autoReply";
import {acknowledgeSupportSender} from "./supportAcknowledgement";
import {supportInboundRoute} from "./whatsappReceiptConsumer";
import type {CatchReceipt} from "./whatsappEndpointStops";

const T0 = Date.UTC(2026, 10, 21, 9);
const HOUR = 3600_000;
const PARTICIPANT = "919800001234";
const conversationId = supportConversationId("whatsapp", `+${PARTICIPANT}`);

function harness(enabled = true) {
  const db = new FakeFirestore({});
  const clock = {millis: T0};
  const support: SupportInboxDeps = {
    firestore: () => db as never,
    now: () => Timestamp.fromMillis(clock.millis),
    findUidByPhone: async () => null,
  };
  const claimed = new Set<string>();
  const replies: CatchAutoReplyRequest[] = [];
  // Mirrors the automatic-reply claim: one send per message and kind.
  const reply = async (request: CatchAutoReplyRequest) => {
    const key = `${request.sourceEventId}:${request.kind}`;
    if (claimed.has(key)) {
      return {outcome: "replayed" as const, providerMessageId: `wamid.${key}`};
    }
    claimed.add(key);
    replies.push(request);
    return {outcome: "sent" as const, providerMessageId: `wamid.${key}`};
  };
  const receipt = (eventId: string, patch: Partial<CatchReceipt> = {}) => ({
    eventId, eventKind: "inbound", messageType: "text",
    participantId: PARTICIPANT, text: "Where is my ticket?",
    textTruncated: false,
    providerTimestampSeconds: String(Math.floor(clock.millis / 1000)),
    ...patch,
  }) as CatchReceipt;
  const route = (nominations = false,
    outcome: "support" | "clarify" | "nomination" = "support") => {
    const routed: string[] = [];
    const handle = supportInboundRoute({
      nominations,
      route: async (value) => {
        routed.push(value.eventId);
        return outcome;
      },
      record: (value) => recordWhatsappSupportReceipt(support, value),
      acknowledge: (value, recorded) => acknowledgeSupportSender({enabled,
        support, reply}, value, recorded),
    });
    return {handle, routed};
  };
  const messages = () => [...db.docs.entries()]
    .filter(([path]) => path.startsWith(
      `supportConversations/${conversationId}/messages/`))
    .map(([, data]) => data);
  return {db, clock, replies, receipt, route, messages};
}

test("a first message is acknowledged once, and kept in the thread " +
  "without stopping the waiting clock", async () => {
  const h = harness();
  const {handle} = h.route();
  await handle(h.receipt("cwhe_1"));
  await handle(h.receipt("cwhe_1"));
  assert.equal(h.replies.length, 1);
  assert.equal(h.replies[0].body, "Thanks. The Catch team will reply here.");
  assert.equal(h.replies[0].kind, "support_acknowledged");
  const conversation = h.db.getDoc(`supportConversations/${conversationId}`)!;
  assert.equal(conversation.status, "open");
  assert.equal((conversation.waitingSince as Timestamp).toMillis(), T0);
  assert.equal(conversation.lastMessagePreview, "Where is my ticket?");
  assert.equal(conversation.lastOutboundAt, null);
  const ack = h.messages().find((message) => message.direction === "outbound")!;
  assert.equal(ack.authorUid, null);
  assert.equal(ack.deliveryState, "accepted");
  assert.equal(ack.providerMessageId, "wamid.cwhe_1:support_acknowledged");
  assert.equal(h.messages().length, 2);
});

test("a follow-up within 24 hours is not acknowledged; after 24 hours of " +
  "silence it is", async () => {
  const h = harness();
  const {handle} = h.route();
  await handle(h.receipt("cwhe_1"));
  h.clock.millis += 2 * HOUR;
  await handle(h.receipt("cwhe_2", {text: "Any news?"}));
  assert.equal(h.replies.length, 1);
  h.clock.millis += 25 * HOUR;
  await handle(h.receipt("cwhe_3", {text: "Hello again"}));
  assert.deepEqual(h.replies.map((reply) => reply.sourceEventId),
    ["cwhe_1", "cwhe_3"]);
});

test("switched off: recorded, never acknowledged", async () => {
  const h = harness(false);
  const {handle} = h.route();
  await handle(h.receipt("cwhe_1"));
  assert.equal(h.replies.length, 0);
  assert.equal(h.messages().length, 1);
});

test("photos, voice notes and button replies land in Support without " +
  "nomination parsing", async () => {
  const h = harness();
  const {handle, routed} = h.route(true);
  await handle(h.receipt("cwhe_1", {messageType: "image", text: "[photo]"}));
  h.clock.millis += 1000;
  await handle(h.receipt("cwhe_2", {messageType: "audio",
    text: "[voice note]"}));
  h.clock.millis += 1000;
  await handle(h.receipt("cwhe_3", {messageType: "button",
    text: "Yes, I'm coming"}));
  await handle(h.receipt("cwhe_4", {messageType: "reaction", text: null}));
  assert.deepEqual(routed, []);
  assert.deepEqual(h.messages().filter((message) =>
    message.direction === "inbound").map((message) => message.text).sort(),
  ["Yes, I'm coming", "[photo]", "[voice note]"]);
  // The first of them opened the conversation, so it was acknowledged.
  assert.deepEqual(h.replies.map((reply) => reply.sourceEventId), ["cwhe_1"]);
});

test("a clarifying question is not followed by an acknowledgement; a " +
  "nomination never reaches Support", async () => {
  const clarify = harness();
  const asked = clarify.route(true, "clarify");
  await asked.handle(clarify.receipt("cwhe_1"));
  assert.deepEqual(asked.routed, ["cwhe_1"]);
  assert.equal(clarify.messages().length, 1);
  assert.equal(clarify.replies.length, 0);

  const nominate = harness();
  const queued = nominate.route(true, "nomination");
  await queued.handle(nominate.receipt("cwhe_1"));
  assert.equal(nominate.messages().length, 0);
  assert.equal(nominate.replies.length, 0);
});
