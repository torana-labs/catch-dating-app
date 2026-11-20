/* eslint-disable max-len */
import assert from "node:assert/strict";
import {createHash, createHmac} from "node:crypto";
import test from "node:test";

import {FakeFirestore} from "../operations/testFirestore";
import type {HostRosterIntakeManageDeps} from "./hostRosterIntakeApply";
import {HostRosterIntakeSessionStore} from "./hostRosterIntakeSessionStore";
import {
  InboundRosterWebhookPayload,
  ingestEventRosterWebhookHandler,
  parseInboundRosterPayload,
  resolveHandoffToken,
  verifyRosterWebhookSignature,
} from "./eventRosterHandoffs";

const payload: InboundRosterWebhookPayload = {
  channel: "email",
  providerMessageId: "message-1",
  senderVerified: true,
  senderEmail: "host@example.com",
  recipient: "roster+abcdefghijklmnopqrstuvwx@inbound.example.com",
  attachment: {
    fileName: "guests.csv",
    contentType: "text/csv",
    contentBase64: Buffer.from("Name\nAsha Shah").toString("base64"),
  },
};

test("verifies only the exact HMAC-authenticated inbound body", () => {
  const raw = Buffer.from(JSON.stringify(payload));
  const signature = createHmac("sha256", "secret")
    .update(raw)
    .digest("hex");

  assert.equal(verifyRosterWebhookSignature(raw, signature, "secret"), true);
  assert.equal(
    verifyRosterWebhookSignature(Buffer.from(`${raw.toString()} `),
      signature, "secret"),
    false
  );
  assert.equal(verifyRosterWebhookSignature(raw, undefined, "secret"), false);
});

test("parses a bounded normalized provider payload", () => {
  const parsed = parseInboundRosterPayload(
    Buffer.from(JSON.stringify(payload))
  );
  assert.equal(parsed.providerMessageId, "message-1");
  assert.equal(parsed.attachment.fileName, "guests.csv");
});

test("extracts capabilities from email and WhatsApp transports", () => {
  assert.equal(resolveHandoffToken(payload), "abcdefghijklmnopqrstuvwx");
  assert.equal(resolveHandoffToken({
    ...payload,
    channel: "whatsapp",
    recipient: undefined,
    messageText: "Please import ROSTER zyxwvutsrqponmlkjihgfedc",
  }), "zyxwvutsrqponmlkjihgfedc");
});

test("rejects payloads without provider verification metadata", () => {
  const invalid = {...payload} as Record<string, unknown>;
  delete invalid.senderVerified;
  assert.throws(
    () => parseInboundRosterPayload(Buffer.from(JSON.stringify(invalid))),
    /invalid_inbound_payload/u
  );
});

// A forwarded roster becomes a review draft (owner decision on #2061,
// question 3 (b)). Every name, number and address here is fictional.

const SECRET = "webhook-secret";
const TOKEN = "abcdefghijklmnopqrstuvwx";

function forwardedHarness() {
  const db = new FakeFirestore();
  const imports: unknown[] = [];
  const timestamp = (millis: number) => ({toMillis: () => millis, _seconds: Math.floor(millis / 1000),
    _nanoseconds: 0}) as unknown as FirebaseFirestore.Timestamp;
  db.write("events/event-1", {organizerId: "organizer-1"});
  const tokenHash = createHash("sha256").update(TOKEN).digest("hex");
  const handoff = {eventId: "event-1", organizerId: "organizer-1", hostUid: "host-1", tokenHash,
    provider: "luma", status: "active", createdAt: timestamp(1000), updatedAt: timestamp(1000),
    expiresAt: timestamp(10_000_000)};
  // The fake store clones values, so the handoff (with Timestamps) is served
  // directly.
  const firestore = new Proxy(db, {get: (target, property) => property === "collection" ?
    (path: string) => path === "eventRosterHandoffs" ? {doc: (id: string) => ({get: async () => ({
      id, exists: id === tokenHash, data: () => id === tokenHash ? handoff : undefined})})} :
      target.collection(path) :
    Reflect.get(target, property, target)});
  const store = new HostRosterIntakeSessionStore(db as unknown as FirebaseFirestore.Firestore, () => 5000);
  const intake = {
    store, authorize: (async () => undefined) as never, rateLimit: async () => undefined,
    loadInitialCurrentRows: async () => new Map(), loadTransactionCurrentRows: async () => new Map(),
    importCanonical: async (input: unknown) => {
      imports.push(input);
      throw new Error("a forwarded roster must not import");
    },
  } as unknown as HostRosterIntakeManageDeps;
  const deps = {
    firestore: () => firestore as unknown as FirebaseFirestore.Firestore,
    auth: () => ({getUser: async () => ({email: "host@example.com"})}) as never,
    checkRateLimit: (async () => undefined) as never,
    nowMillis: () => 5000,
    timestampFromMillis: timestamp,
    randomToken: () => TOKEN,
    emailDomain: () => "inbound.example.com",
    whatsappNumber: () => "",
    intake: () => intake,
  };
  return {db, deps, imports};
}

function signed(csv: string, messageId = "message-1") {
  const body = Buffer.from(JSON.stringify({...payload, providerMessageId: messageId,
    attachment: {...payload.attachment, contentBase64: Buffer.from(csv).toString("base64")}}));
  return {body, signature: createHmac("sha256", SECRET).update(body).digest("hex")};
}

const LUMA_CSV = "Name,Approval Status,Registration Date,Ticket Type,Guest Key,Phone\n" +
  "Asha Sample,approved,2026-11-01,General,g-1,98765 43210\n" +
  "Ravi Sample,approved,2026-11-01,General,g-2,98765 43211\n";

test("a forwarded roster becomes a review draft and nothing is imported", async () => {
  const {db, deps, imports} = forwardedHarness();
  const {body, signature} = signed(LUMA_CSV);
  const result = await ingestEventRosterWebhookHandler(body, signature, SECRET, deps as never);
  assert.equal(result.status, "review");
  assert.equal(result.rowCount, 2);
  assert.equal(imports.length, 0);
  assert.equal(db.entries().filter(([key]) => key.startsWith("eventAttendees/")).length, 0);
  const stored = db.read(`hostRosterIntakeSessions/${result.sessionId}`) as {draft: {state: string; hostUid: string;
    eventId: string; rows: Array<{fields: Record<string, {origin: string}>}>}};
  assert.deepEqual([stored.draft.state, stored.draft.hostUid, stored.draft.eventId], ["review", "host-1", "event-1"]);
  assert.equal(stored.draft.rows[0].fields.phone.origin, "upload");

  // Forwarding the same file again resumes the same draft.
  const again = signed(LUMA_CSV, "message-2");
  const resumed = await ingestEventRosterWebhookHandler(again.body, again.signature, SECRET, deps as never);
  assert.equal(resumed.sessionId, result.sessionId);

  // The host finds it from Catch Host.
  const latest = await deps.intake().store.latestInReview!({hostUid: "host-1", organizerId: "organizer-1",
    eventId: "event-1"}, (async () => undefined) as never);
  assert.equal(latest?.sessionId, result.sessionId);
  assert.equal(await deps.intake().store.latestInReview!({hostUid: "host-2", organizerId: "organizer-1",
    eventId: "event-1"}, (async () => undefined) as never), null);
});

test("a forwarded file from another sender is refused before anything is read", async () => {
  const {db, deps} = forwardedHarness();
  const {body, signature} = signed(LUMA_CSV);
  const other = {...deps, auth: () => ({getUser: async () => ({email: "someone@example.com"})}) as never};
  await assert.rejects(ingestEventRosterWebhookHandler(body, signature, SECRET, other as never), /sender_mismatch/u);
  assert.equal(db.entries().filter(([key]) => key.startsWith("hostRosterIntakeSessions/")).length, 0);
});
