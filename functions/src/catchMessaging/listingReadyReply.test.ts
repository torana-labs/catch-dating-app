/* eslint-disable max-len */
import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import type {CatchAutoReplyRequest} from "./autoReply";
import {replyWhenListingReady} from "./listingReadyReply";
import {TestDocStore} from "./testDocStore";
import {CATCH_RECEIPTS} from "./whatsappEndpointStops";

const EVENT_ID = `cwhe_${"c".repeat(64)}`;
const NOW = Date.parse("2026-10-30T08:00:00.000Z");

function setup() {
  const store = new TestDocStore();
  store.records.set(`${CATCH_RECEIPTS}/${EVENT_ID}`, {schema: "catch.whatsapp-webhook-event/v1", eventId: EVENT_ID,
    wabaId: "1", phoneNumberId: "2", payloadHash: "b".repeat(64), eventKind: "inbound", messageId: "wamid.9",
    providerTimestampSeconds: String(NOW / 1000), participantId: "919800012345", messageType: "text",
    text: "@afterfly.in", textTruncated: false, deliveryStatus: null, errorCodes: [], receivedAtMillis: NOW,
    expiresAt: Timestamp.fromMillis(NOW + 1000)});
  const replies: CatchAutoReplyRequest[] = [];
  const deps = {db: store.asFirestore(), reply: async (request: CatchAutoReplyRequest) => {
    replies.push(request);
    return "sent" as const;
  }};
  return {deps, replies};
}

const state = (status: string, origin: {kind: string; id: string} = {kind: "message_nomination", id: EVENT_ID}, eventCount = 3) =>
  ({status, request: {origin, seed: {urls: ["https://instagram.com/afterfly.in"]}}, result: {eventCount}});

test("a finished WhatsApp nomination tells its nominator, once per organizer", async () => {
  const t = setup();
  assert.equal(await replyWhenListingReady(t.deps, "msg-1", state("running"), state("completed")), "sent");
  assert.deepEqual([t.replies[0].kind, t.replies[0].discriminator, t.replies[0].participantId, t.replies[0].sourceEventId],
    ["listing_ready", "msg-1", "919800012345", EVENT_ID]);
  assert.match(t.replies[0].body, /^@afterfly\.in is ready: the listing is built with 3 upcoming events/u);
});

test("other requests and updates that are not the finish are ignored", async () => {
  const t = setup();
  assert.equal(await replyWhenListingReady(t.deps, "r", state("completed"), state("completed")), "not_applicable");
  assert.equal(await replyWhenListingReady(t.deps, "r", state("queued"), state("running")), "not_applicable");
  assert.equal(await replyWhenListingReady(t.deps, "r", state("running"),
    state("completed", {kind: "admin_nomination", id: "x"})), "not_applicable");
  assert.equal(await replyWhenListingReady(t.deps, "r", state("running"),
    state("completed", {kind: "message_nomination", id: `cwhe_${"d".repeat(64)}`})), "not_applicable");
  assert.equal(t.replies.length, 0);
});
