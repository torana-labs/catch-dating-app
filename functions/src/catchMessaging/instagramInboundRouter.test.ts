/* eslint-disable max-len */
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
import path from "node:path";
import test from "node:test";
import {SUPPLY_NOMINATORS, instagramNominatorId} from "../operations/supplyIntake/nominators";
import {packagedMessageParser} from "../operations/supplyIntake/runtime";
import type {InstagramInboundMessage} from "../organizers/instagramClaimProtocol";
import {FakeInstagramProvider} from "../organizers/instagramMessagingProvider";
import {validateOrganizerClaimInstagramMessageDocument} from "../shared/generated/validators/organizerClaimInstagramMessageDocument";
import {validateSupplyIntakeRequestsDocument} from "../shared/generated/validators/supplyIntakeRequestsDocument";
import {INSTAGRAM_MESSAGE_RECEIPTS, routeInstagramInbound, type InstagramInboundRouterDeps} from "./instagramInboundRouter";
import {TestDocStore} from "./testDocStore";

// The build post-step copies the Operations runtime into lib; tests use it.
execFileSync(process.execPath, [path.join(__dirname, "../../scripts/copy-operations-runtime.cjs")]);

const NOW = new Date("2026-10-30T08:00:00.000Z");
const NOMINATOR = "901";
const STRANGER = "902";
let messageNumber = 0;

function message(text: string | null, overrides: Partial<InstagramInboundMessage> = {}): InstagramInboundMessage {
  messageNumber++;
  return {messageKey: createHash("sha256").update(`mid.${messageNumber}`).digest("hex"), senderId: NOMINATOR, text,
    attachments: [], unsupported: false, ...overrides};
}

function setup({limited = false} = {}) {
  const store = new TestDocStore();
  store.records.set(`${SUPPLY_NOMINATORS}/${instagramNominatorId("asha.runs")}`, {schemaVersion: 1,
    nominatorId: instagramNominatorId("asha.runs"), channel: "instagram", endpointHash: null, phoneLast4: null,
    instagramHandle: "asha.runs", role: "associate", uid: "associate-1", displayName: "Asha", defaultMarket: "mumbai",
    active: true, createdAt: NOW.toISOString(), updatedAt: NOW.toISOString(), updatedByUid: "admin-1"});
  const provider = new FakeInstagramProvider({[NOMINATOR]: "asha.runs", [STRANGER]: "someone"});
  let lookups = 0;
  const lookupUsername = provider.lookupUsername.bind(provider);
  provider.lookupUsername = async (senderId) => {
    lookups++;
    return lookupUsername(senderId);
  };
  const deps: InstagramInboundRouterDeps = {
    db: store.asFirestore(),
    now: () => NOW,
    getUser: async () => ({disabled: false, customClaims: {salesStaff: true}}),
    parse: async (text) => (await packagedMessageParser()).parseNominationMessage(text),
    checkRateLimit: async (_db, _key, action) => {
      if (limited && action === "messageNomination") throw Object.assign(new Error("limited"), {code: "resource-exhausted"});
    },
    provider: () => provider,
    serverTimestamp: () => NOW as unknown as FirebaseFirestore.FieldValue,
  };
  const requests = () => [...store.records.entries()].filter(([key]) => key.startsWith("supplyIntakeRequests/"))
    .map(([, value]) => value as Record<string, any>); // eslint-disable-line @typescript-eslint/no-explicit-any
  const receipt = (key: string) => store.records.get(`${INSTAGRAM_MESSAGE_RECEIPTS}/${key}`);
  return {store, provider, deps, requests, receipt, lookups: () => lookups,
    route: (inbound: InstagramInboundMessage) => routeInstagramInbound(deps, inbound)};
}

test("a nominator's links become credited nominations, answered once in the thread", async () => {
  const t = setup();
  const inbound = message("@afterfly.in mumbai\nhttps://lu.ma/quietclub");
  assert.equal(await t.route(inbound), "nominationQueued");
  const requests = t.requests();
  assert.equal(requests.length, 2);
  for (const request of requests) assert.equal(validateSupplyIntakeRequestsDocument(request), true);
  assert.deepEqual(requests.map((request) => [request.request.origin, request.request.submittedBy.uid]),
    [[{kind: "message_nomination", id: inbound.messageKey}, "associate-1"], [{kind: "message_nomination", id: inbound.messageKey}, "associate-1"]]);
  assert.deepEqual(t.provider.replies.map((reply) => reply.recipientId), [NOMINATOR]);
  assert.match(t.provider.replies[0].text, /^Got it\. Queued 2 organizers for a Catch listing: @afterfly\.in, luma\.com\/quietclub\. It shows on catchdates\.com/u);
  const stored = t.receipt(inbound.messageKey)!;
  assert.equal(stored.nominatorId, "instagram-asha.runs");
  assert.equal(validateOrganizerClaimInstagramMessageDocument({...stored,
    receivedAt: {_seconds: 1, _nanoseconds: 0}, expiresAt: {_seconds: 2, _nanoseconds: 0}}), true);

  // Meta redelivers: nothing new is queued and nobody hears twice.
  assert.equal(await t.route(inbound), "replayed");
  assert.equal(t.requests().length, 2);
  assert.equal(t.provider.replies.length, 1);
});

test("ordinary messages and strangers get no reply, and plain chat never asks Meta who sent it", async () => {
  const t = setup();
  assert.equal(await t.route(message("hey, when do you launch in Pune?")), "support");
  assert.equal(t.lookups(), 0);
  assert.equal(await t.route(message("@afterfly.in", {senderId: STRANGER})), "support");
  assert.equal(t.lookups(), 1);
  assert.deepEqual([t.requests().length, t.provider.replies.length], [0, 0]);
});

test("unclear, linkless and rate-limited nominations are answered", async () => {
  const t = setup();
  assert.equal(await t.route(message("@afterfly.in do you think they would fit Catch?")), "nominationUnclear");
  assert.equal(await t.route(message("nominate the run club near Bandra")), "nominationWithoutLinks");
  assert.deepEqual(t.provider.replies.map((reply) => reply.text.slice(0, 30)),
    ["Is this a nomination? Send it ", "I couldn't find a link in that"]);
  const limited = setup({limited: true});
  assert.equal(await limited.route(message("@afterfly.in")), "nominationRateLimited");
  assert.equal(limited.requests().length, 0);
});

test("a shared post asks for the handle; a share that carries a profile link nominates it", async () => {
  const t = setup();
  const post = {type: "ig_post", pageUrl: null, payloadKeys: ["url"]};
  assert.equal(await t.route(message(null, {attachments: [post]})), "shareWithoutProfile");
  assert.equal(await t.route(message(null, {unsupported: true})), "shareWithoutProfile");
  assert.match(t.provider.replies[0].text, /Send their Instagram @handle or profile link/u);
  assert.equal(await t.route(message(null, {attachments: [{type: "share", pageUrl: "https://www.instagram.com/afterfly.in/",
    payloadKeys: ["url"]}]})), "nominationQueued");
  // A post's page link names no account.
  assert.equal(await t.route(message(null, {attachments: [{type: "share", pageUrl: "https://www.instagram.com/p/Cx1/",
    payloadKeys: ["url"]}]})), "shareWithoutProfile");
  assert.deepEqual(t.requests().map((request) => request.request.seed.urls), [["https://instagram.com/afterfly.in"]]);
});
