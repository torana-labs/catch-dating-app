import assert from "node:assert/strict";
import test from "node:test";
import {FakeFirestore, type FakeData} from "../../shared/testing/fakeFirestore";
import {eventAttendeeId} from "../../events/eventAttendees";
import {prepareMarkBookingAttended} from "./bookingAttendance";

const bookingPath = "eventBookings/event-1_runner-1";

function seed(booking: FakeData = {}): FakeFirestore {
  return new FakeFirestore({
    "events/event-1": {organizerId: "organizer-1", checkedInCount: 2},
    [bookingPath]: {eventId: "event-1", organizerId: "organizer-1",
      uid: "runner-1", status: "signedUp", genderAtSignup: "woman",
      cohortAtSignup: "regular", paymentId: "payment-1", ...booking},
    "publicProfiles/runner-1": {name: "  Asha Rao "},
  });
}

async function markAttended(firestore: FakeFirestore): Promise<void> {
  const db = firestore.asFirestore();
  await db.runTransaction(async (tx) => {
    const [bookingSnap, attendance] = await Promise.all([
      tx.get(db.collection("eventBookings").doc("event-1_runner-1")),
      prepareMarkBookingAttended({db, tx, eventId: "event-1",
        uid: "runner-1", verifiedPhone: async () => null}),
    ]);
    attendance.apply({bookingSnap, organizerId: "organizer-1"});
  });
}

test("marking a booking attended moves the booking, roster and counter",
  async () => {
    const firestore = seed();
    await markAttended(firestore);

    const rosterId = eventAttendeeId("event-1", "uid:runner-1");
    const booking = firestore.get(bookingPath)!;
    assert.equal(booking.status, "attended");
    assert.equal(booking.attendeeId, rosterId);
    assert.equal(booking.genderAtSignup, "woman");
    assert.equal(booking.cohortAtSignup, "regular");
    assert.equal(booking.paymentId, "payment-1");
    assert.equal(firestore.get("events/event-1")?.checkedInCount, 3);
    const roster = firestore.get(`eventAttendees/${rosterId}`)!;
    assert.equal(roster.source, "catchBooking");
    assert.equal(roster.linkedUid, "runner-1");
    assert.equal(roster.displayName, "Asha Rao");
  });

test("marking attended keeps a booking's existing roster link", async () => {
  const rosterId = eventAttendeeId("event-1", "phone:+919876543210");
  const firestore = seed({attendeeId: rosterId});
  firestore.put(`eventAttendees/${rosterId}`, {eventId: "event-1",
    organizerId: "organizer-1", source: "hostImport", status: "registered",
    displayName: "Asha (Host list)", linkedUid: "runner-1",
    phoneE164: "+919876543210"});
  await markAttended(firestore);

  assert.equal(firestore.get(bookingPath)?.attendeeId, rosterId);
  assert.deepEqual(firestore.paths("eventAttendees/"),
    [`eventAttendees/${rosterId}`]);
});

test("missing signup facts are left alone, not written as undefined",
  async () => {
    const firestore = seed({genderAtSignup: null, paymentId: null});
    const stored = firestore.get(bookingPath)!;
    delete stored.cohortAtSignup;
    firestore.put(bookingPath, stored);
    await markAttended(firestore);

    const attended = firestore.get(bookingPath)!;
    assert.equal(attended.status, "attended");
    assert.equal(attended.genderAtSignup, null);
    assert.equal("cohortAtSignup" in attended, false);
    assert.equal(attended.paymentId, null);
  });
