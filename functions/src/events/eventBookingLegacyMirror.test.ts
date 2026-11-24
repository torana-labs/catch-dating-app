import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {FakeFirestore} from "../shared/testing/fakeFirestore";
import {mirrorEventBookingToLegacy} from "./eventBookingLegacyMirror";

const booking = (status: string) => ({
  eventId: "event-1",
  organizerId: "club-1",
  uid: "guest-1",
  status,
  attendeeId: "event-1_guest-1",
  createdAt: Timestamp.fromMillis(1_000),
  updatedAt: Timestamp.fromMillis(2_000),
});

const asDb = (db: FakeFirestore) =>
  db as unknown as FirebaseFirestore.Firestore;

test("a booking write copies the same document to the legacy mirror",
  async () => {
    const db = new FakeFirestore({
      "eventBookings/event-1_guest-1": booking("signedUp"),
    });

    assert.equal(
      await mirrorEventBookingToLegacy(asDb(db), "event-1_guest-1"),
      "mirrored"
    );

    assert.deepEqual(db.get("eventParticipations/event-1_guest-1"),
      db.get("eventBookings/event-1_guest-1"));
  });

test("the mirror follows the booking's latest state, not the event payload",
  async () => {
    const db = new FakeFirestore({
      "eventBookings/event-1_guest-1": booking("cancelled"),
      "eventParticipations/event-1_guest-1": booking("signedUp"),
    });

    await mirrorEventBookingToLegacy(asDb(db), "event-1_guest-1");

    assert.equal(db.get("eventParticipations/event-1_guest-1")?.status,
      "cancelled");
  });

test("deleting a booking deletes its legacy mirror", async () => {
  const db = new FakeFirestore({
    "eventParticipations/event-1_guest-1": booking("signedUp"),
    "eventParticipations/event-1_guest-2": booking("signedUp"),
  });

  assert.equal(
    await mirrorEventBookingToLegacy(asDb(db), "event-1_guest-1"),
    "deleted"
  );

  assert.equal(db.get("eventParticipations/event-1_guest-1"), undefined);
  assert.ok(db.get("eventParticipations/event-1_guest-2"));
});
