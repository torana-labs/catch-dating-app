/* eslint-disable max-len */
import assert from "node:assert/strict";
import test from "node:test";
import {CATCH_AUTO_REPLIES, catchAutoReplyId, sendCatchAutoReply, type CatchAutoReplyRequest} from "./autoReply";
import {TestDocStore} from "./testDocStore";
import {CATCH_ENDPOINT_STOPS} from "./whatsappEndpointStops";
import {catchEndpointHash, catchStopId} from "./whatsappReply";

const NOW = 1_793_260_800_000;
const scope = {wabaId: "123", phoneNumberId: "456"};
const request = (overrides: Partial<CatchAutoReplyRequest> = {}): CatchAutoReplyRequest => ({kind: "nomination_queued",
  sourceEventId: `cwhe_${"a".repeat(64)}`, participantId: "919800012345", inboundAtMillis: NOW - 60_000,
  body: "Got it.", ...overrides});

function setup(sender: ((to: string, body: string) => Promise<string>) | null = async () => "wamid.out") {
  const store = new TestDocStore();
  const sent: Array<[string, string]> = [];
  const deps = {db: store.asFirestore(), nowMillis: () => NOW, scope,
    sender: async () => sender && (async (to: string, body: string) => {
      sent.push([to, body]);
      return sender(to, body);
    })};
  return {store, sent, deps};
}

const record = (store: TestDocStore, req = request()) =>
  store.records.get(`${CATCH_AUTO_REPLIES}/${catchAutoReplyId(req.sourceEventId, req.kind, req.discriminator)}`);

test("a reply is sent once per message and purpose, and keeps no text", async () => {
  const {store, sent, deps} = setup();
  assert.equal(await sendCatchAutoReply(deps, request()), "sent");
  assert.equal(await sendCatchAutoReply(deps, request()), "replayed");
  assert.deepEqual(sent, [["+919800012345", "Got it."]]);
  const stored = record(store);
  assert.deepEqual([stored?.state, stored?.providerMessageId], ["sent", "wamid.out"]);
  assert.equal(JSON.stringify(stored).includes("Got it."), false);
  // Another purpose, or another organizer, is its own reply.
  assert.equal(await sendCatchAutoReply(deps, request({kind: "listing_ready", discriminator: "req-1"})), "sent");
  assert.equal(await sendCatchAutoReply(deps, request({kind: "listing_ready", discriminator: "req-2"})), "sent");
  assert.equal(sent.length, 3);
});

test("nobody who sent STOP is messaged", async () => {
  const {store, sent, deps} = setup();
  store.records.set(`${CATCH_ENDPOINT_STOPS}/${catchStopId(scope, catchEndpointHash("+919800012345"))}`, {stopId: "x"});
  assert.equal(await sendCatchAutoReply(deps, request()), "stopped");
  assert.equal(sent.length, 0);
  assert.equal(record(store)?.state, "skipped_stop");
});

test("nothing is sent outside the 24-hour window or without a credential", async () => {
  const late = setup();
  assert.equal(await sendCatchAutoReply(late.deps, request({inboundAtMillis: NOW - 24 * 60 * 60 * 1000})), "outside_window");
  assert.equal(late.sent.length, 0);
  const unconfigured = setup(null);
  assert.equal(await sendCatchAutoReply(unconfigured.deps, request()), "unavailable");
  assert.equal(record(unconfigured.store)?.state, "skipped_unavailable");
});

test("an uncertain send stays consumed and is never retried", async () => {
  const {store, sent, deps} = setup(async () => {
    throw new Error("timeout");
  });
  assert.equal(await sendCatchAutoReply(deps, request()), "unknown");
  assert.equal(record(store)?.state, "unknown");
  assert.equal(await sendCatchAutoReply(deps, request()), "replayed");
  assert.equal(sent.length, 1);
});
