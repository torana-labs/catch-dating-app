import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {FakeFirestore, type FakeData} from "../../shared/testing/fakeFirestore";
import type {EventAttendeeDocument} from
  "../../shared/generated/firestoreAdminTypes";
import {
  checkInRuntimeGuest,
  enrollRuntimeGuestAttendee,
  linkApprovedRuntimeGuest,
  runtimeGuestAttendeeDocument,
  setRuntimeGuestArrivalGroup,
} from "./runtimeGuests";

const now = Timestamp.fromMillis(1_800_000_000_000);
const earlier = Timestamp.fromMillis(1_700_000_000_000);
const rowPath = "eventAttendees/row-1";

function hostRow(overrides: Partial<EventAttendeeDocument> = {}):
  EventAttendeeDocument {
  return {
    ...runtimeGuestAttendeeDocument({eventId: "event-1",
      organizerId: "organizer-1", uid: null, displayName: "Asha Rao",
      phone: "+919876543210", status: "invited", inviteLinkId: null,
      now: earlier}),
    source: "hostImport",
    ...overrides,
  };
}

function store(row?: EventAttendeeDocument): FakeFirestore {
  return new FakeFirestore({
    "events/event-1": {organizerId: "organizer-1", checkedInCount: 4},
    ...(row ? {[rowPath]: row as unknown as FakeData} : {}),
  });
}

async function write(firestore: FakeFirestore,
  stage: (tx: FirebaseFirestore.Transaction,
    db: FirebaseFirestore.Firestore) => void): Promise<void> {
  const db = firestore.asFirestore();
  await db.runTransaction(async (tx) => stage(tx, db));
}

test("checking a runtime guest in records the visit and the counter",
  async () => {
    const firestore = store(hostRow({status: "registered",
      attendanceRevision: 2}));
    await write(firestore, (tx, db) => checkInRuntimeGuest({tx,
      eventRef: db.collection("events").doc("event-1"),
      attendeeRef: db.collection("eventAttendees").doc("row-1"),
      attendee: {status: "registered", attendanceRevision: 2},
      checkedInBy: "runner-1", now, touchEvent: false}));

    const row = firestore.get(rowPath)!;
    assert.equal(row.status, "checkedIn");
    assert.equal(row.checkedInBy, "runner-1");
    assert.equal(row.preCheckInStatus, "registered");
    assert.equal(row.attendanceRevision, 3);
    assert.ok(now.isEqual(row.checkedInAt as Timestamp));
    const event = firestore.get("events/event-1")!;
    assert.equal(event.checkedInCount, 5);
    assert.equal(event.updatedAt, undefined);
  });

test("a venue-session check-in also stamps the event", async () => {
  const firestore = store(hostRow({status: "registered"}));
  await write(firestore, (tx, db) => checkInRuntimeGuest({tx,
    eventRef: db.collection("events").doc("event-1"),
    attendeeRef: db.collection("eventAttendees").doc("row-1"),
    attendee: {status: "registered", attendanceRevision: undefined},
    checkedInBy: "runner-1", now, touchEvent: true}));

  assert.equal(firestore.get(rowPath)?.attendanceRevision, 1);
  const event = firestore.get("events/event-1")!;
  assert.equal(event.checkedInCount, 5);
  assert.ok(now.isEqual(event.updatedAt as Timestamp));
});

test("a runtime guest's team becomes the row's arrival group", async () => {
  const firestore = store(hostRow());
  await write(firestore, (tx, db) => setRuntimeGuestArrivalGroup({db, tx,
    attendeeId: "row-1", arrivalGroup: "Blue team", now}));
  assert.equal(firestore.get(rowPath)?.arrivalGroup, "Blue team");
  assert.ok(now.isEqual(firestore.get(rowPath)?.updatedAt as Timestamp));
});

test("an auto-created walk-in gets a registered, linked row", async () => {
  const firestore = store();
  let written: EventAttendeeDocument | undefined;
  await write(firestore, (tx, db) => {
    written = enrollRuntimeGuestAttendee({tx,
      attendeeRef: db.collection("eventAttendees").doc("row-1"),
      existing: null, eventId: "event-1", organizerId: "organizer-1",
      uid: "runner-1", displayName: "Walk In", phone: "+919876543210",
      walkInPolicy: "autoCreate", seatAlreadyActive: false,
      inviteLinkId: "invite-1", now});
  });
  const row = firestore.get(rowPath)!;
  assert.deepEqual(row, written as unknown as FakeData);
  assert.equal(row.status, "registered");
  assert.equal(row.source, "webOtp");
  assert.equal(row.linkedUid, "runner-1");
  assert.equal(row.phoneE164, "+919876543210");
  assert.equal(row.searchName, "walk in");
  assert.equal(row.inviteLinkId, "invite-1");
  assert.ok(now.isEqual(row.inviteCapturedAt as Timestamp));
});

test("a Host-approval walk-in waits invited, linked to the claimer",
  async () => {
    const firestore = store();
    await write(firestore, (tx, db) => {
      enrollRuntimeGuestAttendee({tx,
        attendeeRef: db.collection("eventAttendees").doc("row-1"),
        existing: null, eventId: "event-1", organizerId: "organizer-1",
        uid: "runner-1", displayName: "Walk In", phone: "+919876543210",
        walkInPolicy: "hostApproval",
        seatAlreadyActive: false, inviteLinkId: null, now});
    });
    const row = firestore.get(rowPath)!;
    assert.equal(row.status, "invited");
    assert.equal(row.linkedUid, "runner-1");
    assert.equal(row.registeredAt, null);
  });

test("a guest holding a Catch seat gets a booking-sourced row", async () => {
  const firestore = store();
  await write(firestore, (tx, db) => {
    enrollRuntimeGuestAttendee({tx,
      attendeeRef: db.collection("eventAttendees").doc("row-1"),
      existing: null, eventId: "event-1", organizerId: "organizer-1",
      uid: "runner-1", displayName: "Catch Guest", phone: "+919876543210",
      walkInPolicy: "deny", seatAlreadyActive: true,
      inviteLinkId: null, now});
  });
  const row = firestore.get(rowPath)!;
  assert.equal(row.source, "catchBooking");
  assert.equal(row.status, "registered");
  assert.equal(row.phoneE164, null);
  assert.equal(row.linkedUid, "runner-1");
});

test("an auto-create claim links a Host row and registers it",
  async () => {
    const existing = hostRow({status: "waitlisted"});
    const firestore = store(existing);
    let result: EventAttendeeDocument | undefined;
    await write(firestore, (tx, db) => {
      result = enrollRuntimeGuestAttendee({tx,
        attendeeRef: db.collection("eventAttendees").doc("row-1"),
        existing, eventId: "event-1", organizerId: "organizer-1",
        uid: "runner-1", displayName: "Ignored", phone: "+919876543210",
        walkInPolicy: "autoCreate",
        seatAlreadyActive: false, inviteLinkId: "invite-1", now});
    });
    const row = firestore.get(rowPath)!;
    assert.equal(row.linkedUid, "runner-1");
    assert.equal(row.status, "registered");
    assert.equal(row.displayName, "Asha Rao");
    assert.equal(row.inviteLinkId, "invite-1");
    assert.ok(now.isEqual(row.linkedAt as Timestamp));
    assert.ok(now.isEqual(row.registeredAt as Timestamp));
    // The caller keeps reasoning about the row's status as it was read.
    assert.equal(result?.status, "waitlisted");
    assert.equal(result?.linkedUid, "runner-1");
  });

test("a Host-approval claim keeps the row's status, link time and invite",
  async () => {
    const existing = hostRow({status: "invited", linkedAt: earlier,
      inviteLinkId: "invite-original", inviteCapturedAt: earlier});
    const firestore = store(existing);
    await write(firestore, (tx, db) => {
      enrollRuntimeGuestAttendee({tx,
        attendeeRef: db.collection("eventAttendees").doc("row-1"),
        existing, eventId: "event-1", organizerId: "organizer-1",
        uid: "runner-1", displayName: "Ignored", phone: "+919876543210",
        walkInPolicy: "hostApproval",
        seatAlreadyActive: false, inviteLinkId: "invite-2", now});
    });
    const row = firestore.get(rowPath)!;
    assert.equal(row.status, "invited");
    assert.ok(earlier.isEqual(row.linkedAt as Timestamp));
    assert.equal(row.inviteLinkId, "invite-original");
  });

test("Host approval registers an invited row and keeps its history",
  async () => {
    const attendee = hostRow({status: "invited", attendanceRevision: 3,
      preCheckInStatus: "registered"});
    const firestore = store(attendee);
    await write(firestore, (tx, db) => linkApprovedRuntimeGuest({tx,
      attendeeRef: db.collection("eventAttendees").doc("row-1"), attendee,
      uid: "runner-1", now}));
    const row = firestore.get(rowPath)!;
    assert.equal(row.status, "registered");
    assert.equal(row.linkedUid, "runner-1");
    assert.equal(row.attendanceRevision, 3);
    assert.equal(row.preCheckInStatus, "registered");
  });

test("Host approval registers a waitlisted row", async () => {
  const attendee = hostRow({status: "waitlisted"});
  const firestore = store(attendee);
  await write(firestore, (tx, db) => linkApprovedRuntimeGuest({tx,
    attendeeRef: db.collection("eventAttendees").doc("row-1"), attendee,
    uid: "runner-1", now}));
  assert.equal(firestore.get(rowPath)?.status, "registered");
});
