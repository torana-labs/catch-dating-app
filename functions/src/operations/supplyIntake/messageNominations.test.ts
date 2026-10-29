/* eslint-disable max-len */
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import path from "node:path";
import test from "node:test";
import {Timestamp, type Firestore} from "firebase-admin/firestore";
import type {CatchReceipt} from "../../catchMessaging/whatsappEndpointStops";
import {catchEndpointHash} from "../../catchMessaging/whatsappReply";
import {validateSupplyIntakeRequestsDocument} from "../../shared/generated/validators/supplyIntakeRequestsDocument";
import {FakeFirestore} from "../testFirestore";
import {
  type MessageNominationDeps,
  processWhatsappNomination,
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

function receipt(text: string | null, overrides: Partial<CatchReceipt> = {}): CatchReceipt {
  return {schema: "catch.whatsapp-webhook-event/v1", eventId: EVENT_ID, wabaId: "1", phoneNumberId: "2",
    payloadHash: "b".repeat(64), eventKind: "inbound", messageId: "wamid.1", providerTimestampSeconds: "1793260800",
    participantId: SENDER, messageType: "text", text, textTruncated: false, deliveryStatus: null, errorCodes: [],
    receivedAtMillis: NOW.getTime(), expiresAt: Timestamp.fromMillis(NOW.getTime() + 1000), ...overrides};
}

function registerNominator(db: FakeFirestore, overrides: Record<string, unknown> = {}): string {
  const endpointHash = catchEndpointHash(`+${SENDER}`);
  const nominatorId = whatsappNominatorId(endpointHash);
  db.write(`${SUPPLY_NOMINATORS}/${nominatorId}`, {schemaVersion: 1, nominatorId, channel: "whatsapp", endpointHash,
    phoneLast4: "2345", role: "associate", uid: "associate-1", displayName: "Asha", defaultMarket: "mumbai",
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

test("a registered nominator's message becomes one credited nomination per organizer line", async () => {
  const db = new FakeFirestore();
  const nominatorId = registerNominator(db);
  const message = receipt("https://www.instagram.com/afterfly.in?igsh=abc\nlu.ma/calendar/bandra-runs Pune crowd");
  assert.equal(await processWhatsappNomination(deps(db), message), "queued");
  const stored = requestsIn(db);
  assert.equal(stored.length, 2);
  for (const row of stored) {
    assert.equal(validateSupplyIntakeRequestsDocument(row), true, JSON.stringify(validateSupplyIntakeRequestsDocument.errors));
  }
  const byId = Object.fromEntries(stored.map((row) => [row.requestId, row.request]));
  const first = byId[supplyIntakeRequestId("msg", [EVENT_ID, "0"])];
  const second = byId[supplyIntakeRequestId("msg", [EVENT_ID, "1"])];
  assert.deepEqual([first.kind, first.market, first.seed.urls, first.submittedBy, first.origin], ["nomination", "mumbai",
    ["https://instagram.com/afterfly.in"], {role: "associate", uid: "associate-1", partnerId: null},
    {kind: "message_nomination", id: EVENT_ID}]);
  // A city named on the line wins over the nominator's default.
  assert.deepEqual([second.market, second.seed.urls, second.seed.notes], ["pune",
    ["https://luma.com/calendar/bandra-runs"], "Pune crowd"]);

  // A redelivered message finds its own requests and adds nothing.
  const tracker = deps(db);
  assert.equal(await processWhatsappNomination(tracker, message), "queued");
  assert.equal(requestsIn(db).length, 2);
  assert.deepEqual(tracker.rateLimited, [nominatorId]);
});

test("messages from anyone else, without links, or that are not plain text are left alone", async () => {
  const db = new FakeFirestore();
  assert.equal(await processWhatsappNomination(deps(db), receipt("@afterfly.in")), "not_nominator");
  registerNominator(db, {active: false});
  assert.equal(await processWhatsappNomination(deps(db), receipt("@afterfly.in")), "not_nominator");
  registerNominator(db);
  assert.equal(await processWhatsappNomination(deps(db), receipt("thanks, will send more later")), "no_links");
  assert.equal(await processWhatsappNomination(deps(db), receipt("STOP")), "ignored");
  assert.equal(await processWhatsappNomination(deps(db), receipt("@afterfly.in", {textTruncated: true})), "ignored");
  assert.equal(await processWhatsappNomination(deps(db), receipt(null, {messageType: "image"})), "ignored");
  assert.equal(await processWhatsappNomination(deps(db), receipt(null, {eventKind: "status", messageType: null,
    deliveryStatus: "read"})), "ignored");
  assert.equal(requestsIn(db).length, 0);
});

test("a nominator over the hourly limit queues nothing", async () => {
  const db = new FakeFirestore();
  registerNominator(db);
  assert.equal(await processWhatsappNomination(deps(db, {limited: true}), receipt("@afterfly.in")), "rate_limited");
  assert.equal(requestsIn(db).length, 0);
});

test("a partner's nomination credits the partner and unknown cities wait for staff", () => {
  const [request] = requestsFromNominationMessage({messageKey: EVENT_ID, receivedAt: NOW,
    nominator: {nominatorId: "whatsapp-x", role: "partner", uid: "partner-1", partnerId: "partner-1", defaultMarket: null},
    parsed: {nominations: [{urls: ["https://luma.com/afterfly"], notes: "great vibes"}], unreadable: [], droppedNominations: 0}});
  assert.deepEqual([request.market, request.submittedBy], ["unassigned",
    {role: "partner", uid: "partner-1", partnerId: "partner-1"}]);
});
