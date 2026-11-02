import assert from "node:assert/strict";
import test from "node:test";
import type {CallableRequest} from "firebase-functions/v2/https";
import {
  listOrganizerRequestsHandler,
  type OrganizerRequestDeps,
} from "./organizerRequests";

const at = (millis: number) => ({toMillis: () => millis});
const nowMillis = 1_000_000;

const event = (name: string, start: number, manual = false,
  waitlisted = 0) => ({
  name, meetingPoint: "Somewhere", startTime: at(start), capacityLimit: 32,
  priceInPaise: 0, bookedCount: 30, waitlistedCount: waitlisted,
  eventPolicy: {admission: {manualApprovalRequired: manual}},
});

interface World {
  events?: Record<string, unknown>;
  pending?: Record<string, unknown>[];
  waitlist?: Record<string, Record<string, unknown>[]>;
  profiles?: Record<string, {name: string}>;
  contacts?: Record<string, {contactId: string; attended: number}>;
  blocked?: string[];
}

function deps(world: World): OrganizerRequestDeps {
  const snap = (rows: Record<string, unknown>[]) => ({
    docs: rows.map((row, index) => ({id: String(index), data: () => row})),
  });
  const query = (name: string, filters: Record<string, unknown> = {}) => ({
    where: (field: string, _op: string, value: unknown) =>
      query(name, {...filters, [field]: value}),
    orderBy: () => query(name, filters),
    limit: () => query(name, filters),
    doc: (id: string) => ({get: async () => ({data: () => {
      if (name === "organizers") {
        return {ownerUserId: "owner", hostUserIds: ["owner", "manager"]};
      }
      if (name === "publicProfiles") return world.profiles?.[id];
      if (name === "hostContactSummaries") {
        const contact = Object.values(world.contacts ?? {})
          .find((item) => item.contactId === id);
        return contact ? {row: {attendedEventCount: contact.attended}} :
          undefined;
      }
      return undefined;
    }})}),
    get: async () => {
      if (name === "events") {
        return {docs: Object.entries(world.events ?? {}).map(([id, data]) =>
          ({id, data: () => data}))};
      }
      if (name === "organizerContacts") {
        const contact = world.contacts?.[filters.linkedUid as string];
        return {docs: contact ? [{id: contact.contactId}] : []};
      }
      if (filters.hostApprovalStatus) return snap(world.pending ?? []);
      return snap(world.waitlist?.[filters.eventId as string] ?? []);
    },
  });
  return {
    db: () => ({collection: (name: string) => query(name)}) as unknown as
      FirebaseFirestore.Firestore,
    now: () => nowMillis,
    checkRateLimit: async () => undefined,
    isBlocked: async (_db, _uid, other) =>
      (world.blocked ?? []).includes(other),
  };
}

const ask = (uid: string, eventId: string, millis: number, extra = {}) => ({
  uid, eventId, organizerId: "org", status: "waitlisted",
  waitlistedAt: at(millis), createdAt: at(millis), ...extra,
});

const request = (uid: string) =>
  ({auth: {uid}, data: {organizerId: "org"}}) as
    unknown as CallableRequest<unknown>;

test("requests and the waitlist come back in order, with their facts",
  async () => {
    const result = await listOrganizerRequestsHandler(request("manager"), deps({
      events: {
        later: event("Long Table Supper", 3_000_000, false, 1),
        soon: event("Tuesday Trivia", 2_000_000, true),
      },
      pending: [
        ask("ishaan", "soon", 200, {hostApprovalStatus: "pending"}),
        ask("zoya", "soon", 100, {hostApprovalStatus: "pending"}),
      ],
      waitlist: {later: [ask("nikhil", "later", 50)]},
      profiles: {zoya: {name: "Zoya Merchant"}, nikhil: {name: "Nikhil Rao"}},
      contacts: {zoya: {contactId: "c1", attended: 3}},
    }));
    assert.equal(result.complete, true);
    assert.deepEqual(result.rows.map((row) => [row.uid, row.kind]), [
      ["zoya", "request"], ["ishaan", "request"], ["nikhil", "waitlist"]]);
    assert.equal(result.rows[0].name, "Zoya Merchant");
    assert.equal(result.rows[0].attendedEventCount, 3);
    assert.equal(result.rows[0].placesLeft, 2);
    assert.equal(result.rows[1].name, null);
    assert.equal(result.rows[1].attendedEventCount, null);
    assert.equal(result.rows[2].waitlistPosition, 1);
  });

test("someone with a block either way is left out", async () => {
  const result = await listOrganizerRequestsHandler(request("owner"), deps({
    events: {soon: event("Trivia", 2_000_000, true)},
    pending: [ask("zoya", "soon", 100, {hostApprovalStatus: "pending"})],
    blocked: ["zoya"],
  }));
  assert.deepEqual(result.rows, []);
});

test("a request for an event already over is left out", async () => {
  const result = await listOrganizerRequestsHandler(request("owner"), deps({
    events: {},
    pending: [ask("zoya", "past", 100, {hostApprovalStatus: "pending"})],
  }));
  assert.deepEqual(result.rows, []);
});

test("an approved guest still paying is not on the waitlist view", async () => {
  const result = await listOrganizerRequestsHandler(request("owner"), deps({
    events: {soon: event("Trivia", 2_000_000, true, 1)},
    waitlist: {soon: [ask("zoya", "soon", 100,
      {hostApprovalStatus: "approved"})]},
  }));
  assert.deepEqual(result.rows, []);
});

test("a live offer shows when it runs out; a stale one does not", async () => {
  const result = await listOrganizerRequestsHandler(request("owner"), deps({
    events: {soon: event("Trivia", 2_000_000, false, 2)},
    waitlist: {soon: [
      ask("live", "soon", 1, {waitlistOfferStatus: "active",
        waitlistOfferExpiresAt: at(nowMillis + 10)}),
      ask("stale", "soon", 2, {waitlistOfferStatus: "active",
        waitlistOfferExpiresAt: at(nowMillis - 10)}),
    ]},
  }));
  assert.equal(result.rows[0].offerExpiresAtMillis, nowMillis + 10);
  assert.equal(result.rows[1].offerExpiresAtMillis, null);
});

test("only this organizer's hosts can read it", async () => {
  await assert.rejects(listOrganizerRequestsHandler(request("stranger"),
    deps({})), {code: "permission-denied"});
});
