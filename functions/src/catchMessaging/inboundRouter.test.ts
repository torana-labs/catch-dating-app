/* eslint-disable max-len */
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import path from "node:path";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {SUPPLY_NOMINATORS, whatsappNominatorId} from "../operations/supplyIntake/nominators";
import {packagedMessageParser} from "../operations/supplyIntake/runtime";
import {validateSupplyIntakeRequestsDocument} from "../shared/generated/validators/supplyIntakeRequestsDocument";
import type {CatchAutoReplyRequest} from "./autoReply";
import {CATCH_CLARIFICATIONS, routeCatchWhatsappInbound, type CatchInboundRouterDeps} from "./inboundRouter";
import {TestDocStore} from "./testDocStore";
import {CATCH_RECEIPTS, type CatchReceipt} from "./whatsappEndpointStops";
import {catchEndpointHash} from "./whatsappReply";

// The build post-step copies the Operations runtime into lib; tests use it.
execFileSync(process.execPath, [path.join(__dirname, "../../scripts/copy-operations-runtime.cjs")]);

const NOW = new Date("2026-10-30T08:00:00.000Z");
const SENDER = "919800012345";
const ENDPOINT = catchEndpointHash(`+${SENDER}`);
let messageNumber = 0;

function receipt(text: string | null, overrides: Partial<CatchReceipt> = {}): CatchReceipt {
  messageNumber++;
  return {schema: "catch.whatsapp-webhook-event/v1", eventId: `cwhe_${messageNumber.toString(16).padStart(64, "0")}`,
    wabaId: "1", phoneNumberId: "2", payloadHash: "b".repeat(64), eventKind: "inbound",
    messageId: `wamid.${messageNumber}`, providerTimestampSeconds: String(NOW.getTime() / 1000), participantId: SENDER,
    messageType: "text", text, textTruncated: false, deliveryStatus: null, errorCodes: [],
    receivedAtMillis: NOW.getTime(), expiresAt: Timestamp.fromMillis(NOW.getTime() + 1000), ...overrides};
}

function setup({nominator = true, limited = false} = {}) {
  const store = new TestDocStore();
  if (nominator) {
    store.records.set(`${SUPPLY_NOMINATORS}/${whatsappNominatorId(ENDPOINT)}`, {schemaVersion: 1,
      nominatorId: whatsappNominatorId(ENDPOINT), channel: "whatsapp", endpointHash: ENDPOINT, phoneLast4: "2345", instagramHandle: null,
      role: "associate", uid: "associate-1", displayName: "Asha", defaultMarket: "mumbai", active: true,
      createdAt: NOW.toISOString(), updatedAt: NOW.toISOString(), updatedByUid: "admin-1"});
  }
  const replies: CatchAutoReplyRequest[] = [];
  const deps: CatchInboundRouterDeps = {
    db: store.asFirestore(),
    now: () => NOW,
    getUser: async () => ({disabled: false, customClaims: {salesStaff: true}}),
    parse: async (text) => (await packagedMessageParser()).parseNominationMessage(text),
    checkRateLimit: async () => {
      if (limited) throw Object.assign(new Error("limited"), {code: "resource-exhausted"});
    },
    reply: async (request) => {
      replies.push(request);
      return "sent";
    },
  };
  const route = (message: CatchReceipt) => {
    store.records.set(`${CATCH_RECEIPTS}/${message.eventId}`, {...message});
    return routeCatchWhatsappInbound(deps, message);
  };
  const requests = () => [...store.records.entries()].filter(([key]) => key.startsWith("supplyIntakeRequests/"))
    .map(([, value]) => value as Record<string, any>); // eslint-disable-line @typescript-eslint/no-explicit-any
  return {store, replies, route, requests};
}

test("a nominator's links become credited nominations and an acknowledgement", async () => {
  const t = setup();
  const message = receipt("https://www.instagram.com/afterfly.in?igsh=abc\nlu.ma/calendar/bandra-runs Pune crowd");
  assert.equal(await t.route(message), "nomination");
  const stored = t.requests();
  assert.equal(stored.length, 2);
  for (const row of stored) assert.equal(validateSupplyIntakeRequestsDocument(row), true);
  assert.deepEqual(stored.map((row) => row.request.market).sort(), ["mumbai", "pune"]);
  assert.deepEqual(stored.map((row) => row.request.origin), [{kind: "message_nomination", id: message.eventId},
    {kind: "message_nomination", id: message.eventId}]);
  assert.equal(t.replies.length, 1);
  assert.equal(t.replies[0].kind, "nomination_queued");
  assert.equal(t.replies[0].sourceEventId, message.eventId);
  assert.match(t.replies[0].body, /Queued 2 organizers for a Catch listing: @afterfly\.in, luma\.com\/calendar\/bandra-runs/u);
  // A redelivery queues nothing new.
  await t.route({...message});
  assert.equal(t.requests().length, 2);
});

test("links with a question get a 1-or-2 question; 1 nominates the original message", async () => {
  const t = setup();
  const question = receipt("is this a good one? @afterfly.in");
  assert.equal(await t.route(question), "clarify");
  assert.equal(t.requests().length, 0);
  assert.equal(t.replies[0].kind, "clarification_question");
  assert.equal(t.store.records.get(`${CATCH_CLARIFICATIONS}/${ENDPOINT}`)?.sourceEventId, question.eventId);

  assert.equal(await t.route(receipt("1")), "clarification_answer");
  assert.equal(t.store.records.has(`${CATCH_CLARIFICATIONS}/${ENDPOINT}`), false);
  assert.deepEqual(t.requests().map((row) => [row.request.seed.urls, row.request.origin.id]),
    [[["https://instagram.com/afterfly.in"], question.eventId]]);
  assert.equal(t.replies[1].kind, "nomination_queued");
});

test("2 turns an unclear message into a question for the team", async () => {
  const t = setup();
  await t.route(receipt("can you check @afterfly.in for me?"));
  assert.equal(await t.route(receipt("2")), "clarification_answer");
  assert.equal(t.requests().length, 0);
  assert.deepEqual(t.replies.map((reply) => reply.kind), ["clarification_question", "support_acknowledged"]);
});

test("support messages, and anyone who is not a nominator, get no automatic reply", async () => {
  const nominator = setup();
  assert.equal(await nominator.route(receipt("when do payouts arrive")), "support");
  const stranger = setup({nominator: false});
  assert.equal(await stranger.route(receipt("@afterfly.in")), "support");
  assert.equal(await stranger.route(receipt("nominate @afterfly.in")), "support");
  assert.deepEqual([nominator.replies.length, stranger.replies.length, stranger.requests().length], [0, 0, 0]);
});

test("explicit nominations without links, Linktree-only links and rate limits are answered", async () => {
  const t = setup();
  assert.equal(await t.route(receipt("nominate the run club from yesterday")), "nomination_without_links");
  await t.route(receipt("https://linktr.ee/afterfly"));
  assert.match(t.replies[1].body, /can't read Linktree or Beacons pages/u);
  const limited = setup({limited: true});
  await limited.route(receipt("@afterfly.in"));
  assert.deepEqual([limited.replies[0].kind, limited.requests().length], ["nomination_rate_limited", 0]);
});

test("STOP, truncated text and non-text messages are not routed", async () => {
  const t = setup();
  assert.equal(await t.route(receipt("STOP")), "ignored");
  assert.equal(await t.route(receipt("@afterfly.in", {textTruncated: true})), "ignored");
  assert.equal(await t.route(receipt(null, {messageType: "image"})), "ignored");
  assert.equal(t.replies.length, 0);
});
