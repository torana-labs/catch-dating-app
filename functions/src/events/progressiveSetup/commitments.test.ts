import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {HttpsError} from "firebase-functions/v2/https";
import {normalizePrivateEventBasics} from "./basics";
import {assertPrivateEventBasicsEditable} from "./commitments";

type Row = Record<string, unknown>;

const eventId = "event-1";
const organizerId = "organizer-1";

function privateEvent(): Row {
  const basics = normalizePrivateEventBasics({
    basics: {
      name: "Sunday Mixer",
      city: {mode: "set", value: {
        cityId: "in-mh-mumbai", marketId: "in-mh-mumbai",
      }},
      localDate: "2026-10-18",
      localStartTime: "18:30",
      timezone: {mode: "set", value: "Asia/Kolkata"},
    },
    defaults: {revision: 1},
  });
  return {
    organizerId,
    name: basics.name,
    eventCityId: basics.eventCityId,
    eventMarketId: basics.eventMarketId,
    eventLocalDate: basics.eventLocalDate,
    eventLocalStartTime: basics.eventLocalStartTime,
    eventTimezone: basics.eventTimezone,
    startTime: Timestamp.fromMillis(basics.startTimeMillis),
    setupDefaults: basics.setupDefaults,
    setupRevision: 1,
    publicationState: "private",
    publicRegistrationEnabled: false,
    status: "active",
    cancelledAt: null,
    cancellationReason: null,
    bookedCount: 0,
    checkedInCount: 0,
    waitlistedCount: 0,
    genderCounts: {},
    cohortCounts: {},
    waitlistedCohortCounts: {},
  };
}

function harness(rows: Record<string, Row[]> = {}) {
  const trace: string[] = [];
  const db = {
    collection: (name: string) => ({
      where: (field: string, op: string, value: string) => {
        assert.equal(field, "eventId");
        assert.equal(op, "==");
        assert.equal(value, eventId);
        return {limit: (count: number) => {
          assert.equal(count, 1);
          return {collection: name, eventId: value};
        }};
      },
    }),
  } as unknown as FirebaseFirestore.Firestore;
  const tx = {
    get: async (query: {collection: string; eventId: string}) => {
      trace.push(`read:${query.collection}`);
      const matching = (rows[query.collection] ?? []).filter((row) =>
        row.eventId === query.eventId);
      return {empty: matching.length === 0};
    },
    update: () => trace.push("write:event"),
  } as unknown as FirebaseFirestore.Transaction;
  return {db, tx, trace};
}

function hasCode(error: unknown, expected: string): boolean {
  return error instanceof HttpsError && error.code === expected;
}

test("uncommitted private basics are editable before any transaction write",
  async () => {
    const h = harness();
    await assertPrivateEventBasicsEditable({
      tx: h.tx, db: h.db, eventId, event: privateEvent(),
    });
    h.tx.update({} as FirebaseFirestore.DocumentReference, {});
    assert.equal(h.trace.length, 8);
    assert.equal(h.trace.at(-1), "write:event");
    assert.ok(h.trace.slice(0, -1).every((step) =>
      step.startsWith("read:")));
  });

test("another event's commitments do not block this basics edit", async () => {
  const h = harness({payments: [{eventId: "other-event"}]});
  await assertPrivateEventBasicsEditable({
    tx: h.tx, db: h.db, eventId, event: privateEvent(),
  });
});

for (const collection of [
  "eventAttendees", "eventAttendeeImports", "eventParticipations",
  "eventWaitlistOffers", "organizerEventOffers", "payments",
  "razorpayPendingOrders",
]) {
  test(`${collection} commitment blocks a basics move`, async () => {
    const h = harness({[collection]: [{eventId, status: "historical"}]});
    await assert.rejects(assertPrivateEventBasicsEditable({
      tx: h.tx, db: h.db, eventId, event: privateEvent(),
    }), (error) => hasCode(error, "failed-precondition"));
    assert.ok(h.trace.includes(`read:${collection}`));
    assert.equal(h.trace.some((step) => step.startsWith("write:")), false);
  });
}

test("malformed private event fails before commitment scans", async () => {
  for (const patch of [
    {eventOrigin: {source: "external"}},
    {publicationState: "published"},
    {bookedCount: 1},
    {firstPublishedAt: Timestamp.fromMillis(1)},
    {eventTimezone: ""},
  ]) {
    const h = harness();
    await assert.rejects(assertPrivateEventBasicsEditable({
      tx: h.tx, db: h.db, eventId,
      event: {...privateEvent(), ...patch},
    }), (error) => hasCode(error, "failed-precondition"));
    assert.deepEqual(h.trace, []);
  }
});
