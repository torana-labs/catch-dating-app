/* eslint-disable max-len */
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import path from "node:path";
import test from "node:test";
import type {Firestore} from "firebase-admin/firestore";
import {catchEndpointHash} from "../../catchMessaging/whatsappReply";
import {validateSupplyIntakeRequestsDocument} from "../../shared/generated/validators/supplyIntakeRequestsDocument";
import {FakeFirestore} from "../testFirestore";
import {
  type MessageNominationDeps,
  queueMessageNominations,
  requestsFromNominationMessage,
} from "./messageNominations";
import {SUPPLY_NOMINATORS, whatsappNominatorId} from "./nominators";
import {supplyIntakeRequestId} from "./requests";
import {packagedMessageParser} from "./runtime";

// The build post-step copies the Operations runtime into lib; tests use it.
execFileSync(process.execPath, [path.join(__dirname, "../../../scripts/copy-operations-runtime.cjs")]);

const NOW = new Date("2026-10-29T08:00:00.000Z");
const SENDER = "919800012345";
const EVENT_ID = `cwhe_${"a".repeat(64)}`;

function registerNominator(db: FakeFirestore, overrides: Record<string, unknown> = {}): string {
  const endpointHash = catchEndpointHash(`+${SENDER}`);
  const nominatorId = whatsappNominatorId(endpointHash);
  db.write(`${SUPPLY_NOMINATORS}/${nominatorId}`, {schemaVersion: 1, nominatorId, channel: "whatsapp", endpointHash,
    phoneLast4: "2345", instagramHandle: null, role: "associate", uid: "associate-1", displayName: "Asha", defaultMarket: "mumbai",
    active: true, createdAt: NOW.toISOString(), updatedAt: NOW.toISOString(), updatedByUid: "admin-1", ...overrides});
  return nominatorId;
}

function deps(db: FakeFirestore, {limited = false} = {}): MessageNominationDeps & {rateLimited: string[]} {
  const rateLimited: string[] = [];
  return {
    db: db as unknown as Firestore,
    now: () => NOW,
    getUser: async () => ({disabled: false, customClaims: {salesStaff: true}}),
    parse: async (text) => (await packagedMessageParser()).parseNominationMessage(text),
    checkRateLimit: async (_db, key) => {
      rateLimited.push(key);
      if (limited) throw Object.assign(new Error("limited"), {code: "resource-exhausted"});
    },
    rateLimited,
  };
}

const requestsIn = (db: FakeFirestore) => db.entries().filter(([key]) => key.startsWith("supplyIntakeRequests/"))
  .map(([, value]) => value as Record<string, any>); // eslint-disable-line @typescript-eslint/no-explicit-any

test("a nominator over the hourly limit queues nothing", async () => {
  const db = new FakeFirestore();
  const nominatorId = registerNominator(db);
  const parsed = await (await packagedMessageParser()).parseNominationMessage("@afterfly.in");
  const nominator = {nominatorId, role: "associate" as const, uid: "associate-1", partnerId: null, defaultMarket: "mumbai"};
  const limited = await queueMessageNominations(deps(db, {limited: true}), {messageKey: EVENT_ID,
    receivedAtMillis: NOW.getTime(), nominator, parsed});
  assert.deepEqual([limited.outcome, requestsIn(db).length], ["rate_limited", 0]);
  const queued = await queueMessageNominations(deps(db), {messageKey: EVENT_ID, receivedAtMillis: NOW.getTime(),
    nominator, parsed});
  assert.deepEqual([queued.outcome, queued.requests.length, requestsIn(db).length], ["queued", 1, 1]);
  assert.equal(validateSupplyIntakeRequestsDocument(requestsIn(db)[0]), true);
  assert.equal(requestsIn(db)[0].requestId, supplyIntakeRequestId("msg", [EVENT_ID, "0"]));
});

test("a partner's nomination credits the partner and unknown cities wait for staff", () => {
  const [request] = requestsFromNominationMessage({messageKey: EVENT_ID, receivedAt: NOW,
    nominator: {nominatorId: "whatsapp-x", role: "partner", uid: "partner-1", partnerId: "partner-1", defaultMarket: null},
    parsed: {nominations: [{urls: ["https://luma.com/afterfly"], notes: "great vibes"}], unreadable: [], droppedNominations: 0}});
  assert.deepEqual([request.market, request.submittedBy], ["unassigned",
    {role: "partner", uid: "partner-1", partnerId: "partner-1"}]);
});
