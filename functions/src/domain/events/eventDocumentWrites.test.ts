import assert from "node:assert/strict";
import test from "node:test";
import {FieldValue, Timestamp} from "firebase-admin/firestore";
import {
  FakeBatch,
  FakeFirestore,
  FakeTransaction,
} from "../../shared/testing/fakeFirestore";
import {
  EventDocumentWriteError,
  deleteTryItDraftEvent,
  updateEventAdminDetails,
  updateEventBookingCounters,
  updateEventOrganizerSummary,
  updateEventPairHoldCounters,
  updateEventProviderOrigin,
  updateEventPublicRegistration,
} from "./eventDocumentWrites";

type Ref = FirebaseFirestore.DocumentReference;
type Tx = FirebaseFirestore.Transaction;
type Db = FirebaseFirestore.Firestore;

function harness() {
  const db = new FakeFirestore();
  const tx = new FakeTransaction();
  return {
    db,
    fakeTx: tx,
    tx: tx as unknown as Tx,
    eventRef: db.collection("events").doc("event-1") as unknown as Ref,
  };
}

const now = Timestamp.fromMillis(1_790_000_000_000);

test("booking counters stage one update with the patch as given", () => {
  const h = harness();
  const increment = FieldValue.increment(1);
  const womanCount = "genderCounts.woman" as const;
  updateEventBookingCounters(h.tx, h.eventRef, {
    bookedCount: 4,
    checkedInCount: increment,
    [womanCount]: increment,
    cohortCounts: {open: 3},
    waitlistedCohortCounts: {},
    crossPathsPairConfirmedCount: increment,
    discoveryHasOpenSpots: true,
    updatedAt: now,
  });
  // Cohort totals go to the server-only eventCohortCounts, and the event's
  // copy of each map written is removed (#2493).
  assert.deepEqual(h.fakeTx.pending(), [{kind: "update",
    path: "events/event-1", data: {
      bookedCount: 4,
      checkedInCount: increment,
      [womanCount]: increment,
      cohortCounts: FieldValue.delete(),
      waitlistedCohortCounts: FieldValue.delete(),
      crossPathsPairConfirmedCount: increment,
      discoveryHasOpenSpots: true,
      updatedAt: now,
    }}, {kind: "merge", path: "eventCohortCounts/event-1", data: {
    eventId: "event-1",
    cohortCounts: {open: 3},
    waitlistedCohortCounts: {},
    updatedAt: FieldValue.serverTimestamp(),
  }}]);
});

test("cohort totals are written whole, never by dotted path", () => {
  const h = harness();
  assert.throws(() => updateEventBookingCounters(h.tx, h.eventRef,
    {"cohortCounts.open": 1} as never), EventDocumentWriteError);
  assert.deepEqual(h.fakeTx.pending(), []);
});

test("booking counters refuse a field outside the allowlist", () => {
  const h = harness();
  assert.throws(() => updateEventBookingCounters(h.tx, h.eventRef,
    {bookedCount: 1, status: "cancelled"} as never),
  (error: unknown) => error instanceof EventDocumentWriteError &&
    /booking counters write may not change status/u.test(error.message));
  assert.throws(() => updateEventBookingCounters(h.tx, h.eventRef,
    {"organizerSummary.name": "Other"} as never), EventDocumentWriteError);
  assert.deepEqual(h.fakeTx.pending(), []);
});

test("every write refuses a reference outside events", () => {
  const h = harness();
  const other = h.db.collection("eventBookings").doc("event-1") as
    unknown as Ref;
  const nested = h.db.doc("events/event-1/private/x") as unknown as Ref;
  for (const ref of [other, nested]) {
    assert.throws(() => updateEventBookingCounters(h.tx, ref,
      {bookedCount: 1}), EventDocumentWriteError);
  }
  assert.deepEqual(h.fakeTx.pending(), []);
});

test("pair-hold counters allow only the pair-hold fields", () => {
  const h = harness();
  updateEventPairHoldCounters(h.tx, h.eventRef, {
    crossPathsPairHeldCount: 0,
    crossPathsPairHeldCohortCounts: {open: 0},
  });
  assert.deepEqual(h.fakeTx.pending(), [{kind: "update",
    path: "events/event-1", data: {
      crossPathsPairHeldCount: 0,
      crossPathsPairHeldCohortCounts: FieldValue.delete(),
    }}, {kind: "merge", path: "eventCohortCounts/event-1", data: {
    eventId: "event-1",
    crossPathsPairHeldCohortCounts: {open: 0},
    updatedAt: FieldValue.serverTimestamp(),
  }}]);
  assert.throws(() => updateEventPairHoldCounters(h.tx, h.eventRef,
    {bookedCount: 2} as never), /pair-hold counters write may not change/u);
  assert.equal(h.fakeTx.pending().length, 2);
});

test("organizer summary writes only organizerSummary", () => {
  const h = harness();
  const summary = {name: "Test organizer", tags: []} as never;
  updateEventOrganizerSummary(h.tx, h.eventRef, summary);
  assert.deepEqual(h.fakeTx.pending(), [{kind: "update",
    path: "events/event-1", data: {organizerSummary: summary}}]);
});

test("public registration allows its mode, flag, revision and time", () => {
  const h = harness();
  updateEventPublicRegistration(h.tx, h.eventRef, {
    publicRegistrationMode: "free",
    publicRegistrationEnabled: true,
    publicRegistrationRevision: 3,
    updatedAt: now,
  });
  assert.deepEqual(h.fakeTx.pending(), [{kind: "update",
    path: "events/event-1", data: {
      publicRegistrationMode: "free",
      publicRegistrationEnabled: true,
      publicRegistrationRevision: 3,
      updatedAt: now,
    }}]);
  assert.throws(() => updateEventPublicRegistration(h.tx, h.eventRef,
    {priceInPaise: 0} as never), EventDocumentWriteError);
});

test("provider origin stages eventOrigin on the caller's batch", () => {
  const db = new FakeFirestore();
  const batch = new FakeBatch(db);
  const origin = {mode: "externalCompanion" as const,
    rosterAuthority: "hostImport" as const, connectedAt: null,
    connectedBy: null};
  updateEventProviderOrigin(batch as unknown as FirebaseFirestore.WriteBatch,
    db.collection("events").doc("event-1") as unknown as Ref, origin);
  assert.equal(db.get("events/event-1"), undefined);
  db.put("events/event-1", {name: "Sunrise loop"});
  return batch.commit().then(() => {
    assert.deepEqual(db.get("events/event-1"),
      {name: "Sunrise loop", eventOrigin: origin});
  });
});

test("admin details allow edited fields and their projections", () => {
  const h = harness();
  const stamp = FieldValue.serverTimestamp();
  updateEventAdminDetails(h.tx, h.eventRef, {
    description: "Easy pace",
    crossPathsDiscoveryEnabled: true,
    discoveryAvailability: "open",
    adminSearch: {tokens: ["easy"], sortKey: "easy",
      updatedAt: stamp, updatedBySource: "adminUpdateEventDetails"},
  });
  assert.deepEqual(h.fakeTx.pending(), [{kind: "update",
    path: "events/event-1", data: {
      description: "Easy pace",
      crossPathsDiscoveryEnabled: true,
      discoveryAvailability: "open",
      adminSearch: {tokens: ["easy"], sortKey: "easy",
        updatedAt: stamp, updatedBySource: "adminUpdateEventDetails"},
    }}]);
  assert.throws(() => updateEventAdminDetails(h.tx, h.eventRef,
    {organizerId: "club-2", bookedCount: 0} as never),
  /admin details write may not change bookedCount, organizerId/u);
});

test("try-it draft deletion removes the event and its setup state", () => {
  const h = harness();
  const count = deleteTryItDraftEvent(h.tx, h.db as unknown as Db,
    "event-1");
  assert.equal(count, 3);
  assert.deepEqual(h.fakeTx.pending(), [
    {kind: "delete", path: "events/event-1"},
    {kind: "delete", path: "eventSetupPreferences/event-1"},
    {kind: "delete", path: "eventPrivateAccess/event-1"},
  ]);
});
