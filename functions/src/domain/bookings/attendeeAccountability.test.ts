import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {HttpsError} from "firebase-functions/v2/https";
import {FakeFirestore} from "../../shared/testing/fakeFirestore";
import type {EventAttendeeDocument} from
  "../../shared/generated/firestoreAdminTypes";
import {
  checkInTimestampIdentity,
  prepareAttendeeAccountabilityResolution,
} from "./attendeeAccountability";

const checkedInAt = Timestamp.fromMillis(1_700_000_000_000);
const now = Timestamp.fromMillis(1_700_000_600_000);
const rowPath = "eventAttendees/row-1";

function checkedInRow(
  overrides: Partial<EventAttendeeDocument> = {}
): EventAttendeeDocument {
  return {eventId: "event-1", organizerId: "organizer-1",
    displayName: "Asha Rao", status: "checkedIn", checkedInAt,
    accountabilityRevision: 2, ...overrides} as EventAttendeeDocument;
}

async function resolve(firestore: FakeFirestore,
  attendee: EventAttendeeDocument,
  resolution: "returned" | "departed" | "unresolved") {
  const db = firestore.asFirestore();
  return db.runTransaction(async (tx) => {
    const prepared = prepareAttendeeAccountabilityResolution({db,
      attendeeId: "row-1", attendee, resolution, actorUid: "host-1", now});
    prepared.apply(tx);
    return prepared;
  });
}

test("a resolution is bound to the current check-in and revision",
  async () => {
    const row = checkedInRow();
    const firestore = new FakeFirestore({[rowPath]: {...row}});
    const prepared = await resolve(firestore, row, "departed");

    const stored = firestore.get(rowPath)!;
    assert.equal(stored.accountabilityRevision, 3);
    assert.equal(stored.accountabilityResolution, "departed");
    assert.equal(stored.accountabilityResolvedBy, "host-1");
    assert.ok(checkedInAt.isEqual(
      stored.accountabilityResolvedForCheckInAt as Timestamp));
    assert.ok(now.isEqual(stored.accountabilityResolvedAt as Timestamp));
    assert.equal(stored.displayName, "Asha Rao");
    assert.deepEqual(prepared.attendee, {...row, ...prepared.fields});
  });

test("unresolved clears the result but still advances the revision",
  async () => {
    const row = checkedInRow({accountabilityResolution: "returned"});
    const firestore = new FakeFirestore({[rowPath]: {...row}});
    await resolve(firestore, row, "unresolved");

    const stored = firestore.get(rowPath)!;
    assert.equal(stored.accountabilityRevision, 3);
    assert.equal(stored.accountabilityResolution, null);
    assert.equal(stored.accountabilityResolvedForCheckInAt, null);
    assert.equal(stored.accountabilityResolvedAt, null);
    assert.equal(stored.accountabilityResolvedBy, null);
  });

test("only a guest checked in now can be resolved", () => {
  const db = new FakeFirestore().asFirestore();
  for (const attendee of [checkedInRow({status: "registered"}),
    checkedInRow({checkedInAt: null})]) {
    assert.throws(() => prepareAttendeeAccountabilityResolution({db,
      attendeeId: "row-1", attendee, resolution: "returned",
      actorUid: "host-1", now}), (error) => error instanceof HttpsError &&
      error.message ===
        "Only a currently checked-in attendee can be resolved.");
  }
});

test("an unusable revision is refused", () => {
  const db = new FakeFirestore().asFirestore();
  assert.throws(() => prepareAttendeeAccountabilityResolution({db,
    attendeeId: "row-1",
    attendee: checkedInRow({accountabilityRevision: Number.MAX_SAFE_INTEGER}),
    resolution: "returned", actorUid: "host-1", now}),
  (error) => error instanceof HttpsError &&
    error.message === "The accountability revision is unavailable.");
});

test("check-in identities accept stored and serialized timestamps", () => {
  assert.equal(checkInTimestampIdentity(Timestamp.fromMillis(1_500)),
    "1:500000000");
  assert.equal(checkInTimestampIdentity({_seconds: 1, _nanoseconds: 5}),
    "1:5");
  assert.equal(checkInTimestampIdentity(null), null);
  assert.equal(checkInTimestampIdentity({_seconds: -1, _nanoseconds: 0}),
    null);
});
