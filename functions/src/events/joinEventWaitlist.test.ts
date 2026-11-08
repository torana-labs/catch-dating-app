import assert from "node:assert/strict";
import test from "node:test";
import type {CallableRequest} from "firebase-functions/v2/https";
import {assertEventTakesWaitlist, joinEventWaitlistHandler,
  leaveEventWaitlistHandler} from "./joinEventWaitlist";

type Row = Record<string, unknown>;

function lockedHarness() {
  const docs = new Map<string, Row>([
    ["events/event-1", {status: "active"}],
    ["users/runner-1", {name: "Runner"}],
    ["eventParticipations/event-1_runner-1", {status: "waitlisted"}],
    ["eventSeatMigrationFences/event-1", {eventId: "event-1",
      migrationRevision: 1, state: "locked"}],
    ["eventSeatLedgers/event-1", {eventId: "event-1",
      migrationRevision: 1, state: "unreconciled"}],
  ]);
  let writes = 0;
  const collection = (name: string) => ({
    doc: (id: string) => ({path: `${name}/${id}`}),
    where: () => ({where: () => ({get: async () => ({docs: []})})}),
  });
  const tx = {
    get: async (ref: {path?: string}) => {
      const value = docs.get(ref.path ?? "");
      return {exists: value !== undefined, data: () => value, docs: []};
    },
    update: () => {
      writes++;
    },
    set: () => {
      writes++;
    },
    delete: () => {
      writes++;
    },
  };
  const db = {collection, runTransaction: async <T>(work:
    (transaction: typeof tx) => Promise<T>) => work(tx)} as unknown as
    FirebaseFirestore.Firestore;
  return {writes: () => writes, deps: {
    firestore: () => db,
    checkRateLimit: async () => undefined,
    resolveInviteAttribution: async () => null,
  }};
}

function request(): CallableRequest<unknown> {
  return {auth: {uid: "runner-1", token: {}} as CallableRequest["auth"],
    data: {eventId: "event-1"},
    rawRequest: {} as CallableRequest["rawRequest"],
    acceptsStreaming: false};
}

test("locked migration denies join and leave before waitlist source writes",
  async () => {
    const h = lockedHarness();
    await assert.rejects(() => joinEventWaitlistHandler(request(), h.deps));
    await assert.rejects(() => leaveEventWaitlistHandler(request(), h.deps));
    assert.equal(h.writes(), 0);
  });

test("a turned-off waitlist refuses joins but keeps join requests", () => {
  const policy = (mode: string, manualApprovalRequired = false) => ({
    admission: {waitlistPolicy: {mode}, manualApprovalRequired}});
  assert.throws(() => assertEventTakesWaitlist(policy("disabled")),
    /does not take a waitlist/);
  assert.doesNotThrow(() =>
    assertEventTakesWaitlist(policy("disabled", true)));
  assert.doesNotThrow(() => assertEventTakesWaitlist(policy("rankedOffer")));
  assert.doesNotThrow(() => assertEventTakesWaitlist({admission: {}}));
});
