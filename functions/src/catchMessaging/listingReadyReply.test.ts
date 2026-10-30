/* eslint-disable max-len */
import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import type {AutoPublishOutcome} from "../operations/supplyIntake/autoPublish";
import type {CatchAutoReplyRequest} from "./autoReply";
import {replyWhenListingReady} from "./listingReadyReply";
import {TestDocStore} from "./testDocStore";
import {CATCH_RECEIPTS} from "./whatsappEndpointStops";
import {BRAND} from "../shared/generated/brand";

const EVENT_ID = `cwhe_${"c".repeat(64)}`;
const NOW = Date.parse("2026-10-30T08:00:00.000Z");

function setup(published: AutoPublishOutcome = {outcome: "needs_review", reasons: ["not_an_associate"]}) {
  const store = new TestDocStore();
  store.records.set(`${CATCH_RECEIPTS}/${EVENT_ID}`, {schema: "catch.whatsapp-webhook-event/v1", eventId: EVENT_ID,
    wabaId: "1", phoneNumberId: "2", payloadHash: "b".repeat(64), eventKind: "inbound", messageId: "wamid.9",
    providerTimestampSeconds: String(NOW / 1000), participantId: "919800012345", messageType: "text",
    text: "@afterfly.in", textTruncated: false, deliveryStatus: null, errorCodes: [], receivedAtMillis: NOW,
    expiresAt: Timestamp.fromMillis(NOW + 1000)});
  const replies: CatchAutoReplyRequest[] = [];
  const publishes: string[] = [];
  const deps = {db: store.asFirestore(), reply: async (request: CatchAutoReplyRequest) => {
    replies.push(request);
    return "sent" as const;
  }, publish: async (requestId: string) => {
    publishes.push(requestId);
    return published;
  }};
  return {deps, replies, publishes};
}

const state = (status: string, origin: {kind: string; id: string} = {kind: "message_nomination", id: EVENT_ID}, eventCount = 3) =>
  ({status, request: {origin, seed: {urls: ["https://instagram.com/afterfly.in"]}}, result: {eventCount}});

test("a finished WhatsApp nomination tells its nominator, once per organizer", async () => {
  const t = setup();
  assert.equal(await replyWhenListingReady(t.deps, "msg-1", state("running"), state("completed")), "sent");
  assert.deepEqual([t.replies[0].kind, t.replies[0].discriminator, t.replies[0].participantId, t.replies[0].sourceEventId],
    ["listing_ready", "msg-1", "919800012345", EVENT_ID]);
  assert.match(t.replies[0].body, /^@afterfly\.in is ready: the listing is built with 3 upcoming events/u);
  assert.deepEqual(t.publishes, ["msg-1"]);
});

test("an auto-published listing is reported live, with its link", async () => {
  const t = setup({outcome: "published", organizerId: "org-1", canonicalPath: "/organizers/afterfly/"});
  assert.equal(await replyWhenListingReady(t.deps, "msg-1", state("running"), state("completed")), "sent");
  assert.equal(t.replies[0].body, `@afterfly.in is live at ${BRAND.web.domain}/organizers/afterfly/ with 3 upcoming events. ` +
    "Search engines won't list it until the organizer claims and verifies it.");
});

test("other requests and updates that are not the finish are ignored", async () => {
  const t = setup();
  assert.equal(await replyWhenListingReady(t.deps, "r", state("completed"), state("completed")), "not_applicable");
  assert.equal(await replyWhenListingReady(t.deps, "r", state("queued"), state("running")), "not_applicable");
  assert.equal(await replyWhenListingReady(t.deps, "r", state("running"),
    state("completed", {kind: "admin_nomination", id: "x"})), "not_applicable");
  assert.equal(t.replies.length, 0);
  assert.equal(t.publishes.length, 0);
});

test("a nomination with no WhatsApp thread still publishes, and sends nothing", async () => {
  // An Instagram nomination, or a WhatsApp one whose receipt expired:
  // auto-publish decides from its own receipt check.
  const t = setup({outcome: "published", organizerId: "org-1", canonicalPath: "/organizers/afterfly/"});
  assert.equal(await replyWhenListingReady(t.deps, "r", state("running"),
    state("completed", {kind: "message_nomination", id: "d".repeat(64)})), "not_applicable");
  assert.deepEqual(t.publishes, ["r"]);
  assert.equal(t.replies.length, 0);
});
