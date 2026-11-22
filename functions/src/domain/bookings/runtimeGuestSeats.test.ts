import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {HttpsError} from "firebase-functions/v2/https";
import {FakeFirestore, type FakeData} from "../../shared/testing/fakeFirestore";
import type {
  EventAttendeeDocument,
  EventDocument,
} from "../../shared/generated/firestoreAdminTypes";
import {deriveEventSeatPolicy} from
  "../../events/seatAuthority/firestoreAdapter";
import {seatIdentityAliasId} from "../../events/seatIdentityAuthority";
import {
  prepareApprovedRuntimeGuestSeat,
  prepareRuntimeGuestSeatEnrollment,
} from "./runtimeGuestSeats";
import {runtimeGuestAttendeeDocument} from "./runtimeGuests";

const now = Timestamp.fromMillis(1_800_000_000_000);
const phone = "+919876543210";
const phoneRow = "row-phone";

function readyEvent(walkInPolicy: "deny" | "autoCreate" | "hostApproval"):
  FakeData {
  return {organizerId: "organizer-1", capacityLimit: 2, status: "active",
    bookedCount: 0,
    runtimeAccess: {enabled: true,
      publicRuntimeId: "runtime_123456789012345678901234", walkInPolicy,
      termsVersion: "event-runtime-v1"}};
}

function readyStore(event: FakeData): FakeFirestore {
  const policy = deriveEventSeatPolicy(event);
  return new FakeFirestore({
    "events/event-1": event,
    "eventSeatMigrationFences/event-1": {eventId: "event-1",
      migrationRevision: 1, state: "ready"},
    "eventSeatLedgers/event-1": {eventId: "event-1", capacity: 2,
      occupied: 0, revision: 1, capacityRevision: 1, migrationRevision: 1,
      policyVersion: policy.policyVersion, policyHash: policy.policyHash,
      state: "ready"},
  });
}

async function enrollWalkIn(firestore: FakeFirestore,
  walkInPolicy: "deny" | "autoCreate" | "hostApproval",
  guest = {uid: "runner-1", phone, row: phoneRow}):
  Promise<{seatAlreadyActive: boolean}> {
  const db = firestore.asFirestore();
  return db.runTransaction(async (tx) => {
    const event = (await tx.get(db.collection("events").doc("event-1")))
      .data() as EventDocument;
    const enrollment = await prepareRuntimeGuestSeatEnrollment({db, tx, event,
      eventId: "event-1", uid: guest.uid, phone: guest.phone, attendee: null,
      attendeeId: guest.row, phoneAttendeeId: guest.row, walkInPolicy, now});
    enrollment.apply();
    return {seatAlreadyActive: enrollment.seatAlreadyActive};
  });
}

function failedWith(message: string) {
  return (error: unknown) => error instanceof HttpsError &&
    error.code === "failed-precondition" && error.message === message;
}

test("an auto-created walk-in reserves one seat and counts it", async () => {
  const firestore = readyStore(readyEvent("autoCreate"));
  const result = await enrollWalkIn(firestore, "autoCreate");

  assert.equal(result.seatAlreadyActive, false);
  assert.equal(firestore.get("eventSeatLedgers/event-1")?.occupied, 1);
  assert.equal(firestore.get("events/event-1")?.bookedCount, 1);
  assert.ok(now.isEqual(firestore.get("events/event-1")?.updatedAt as
    Timestamp));
  const alias = firestore.get(`eventSeatIdentityAliases/${
    seatIdentityAliasId("event-1", "attendee", phoneRow)}`);
  assert.equal(alias?.kind, "attendee");
  assert.equal(alias?.state, "ready");
});

test("a Host-approval walk-in gets an identity but no seat yet", async () => {
  const firestore = readyStore(readyEvent("hostApproval"));
  await enrollWalkIn(firestore, "hostApproval");

  assert.equal(firestore.get("eventSeatLedgers/event-1")?.occupied, 0);
  assert.equal(firestore.get("events/event-1")?.bookedCount, 0);
  assert.ok(firestore.get(`eventSeatIdentityAliases/${
    seatIdentityAliasId("event-1", "attendee", phoneRow)}`));
});

test("a second identity for the same phone row is refused", async () => {
  const firestore = readyStore(readyEvent("autoCreate"));
  firestore.put(`eventSeatIdentityAliases/${
    seatIdentityAliasId("event-1", "attendee", phoneRow)}`, {
    eventId: "event-1", organizerId: "organizer-1", kind: "attendee",
    state: "ready"});
  await assert.rejects(enrollWalkIn(firestore, "autoCreate"),
    failedWith("Runtime guest identity already exists."));
  assert.equal(firestore.get("eventSeatLedgers/event-1")?.occupied, 0);
});

test("a ledger that disagrees with the event blocks enrollment", async () => {
  const firestore = readyStore(readyEvent("autoCreate"));
  const ledger = firestore.get("eventSeatLedgers/event-1")!;
  firestore.put("eventSeatLedgers/event-1", {...ledger,
    policyHash: "f".repeat(64)});
  await assert.rejects(enrollWalkIn(firestore, "autoCreate"),
    failedWith("Runtime guest and seat authority disagree."));
  assert.equal(firestore.get("events/event-1")?.bookedCount, 0);
});

async function approve(firestore: FakeFirestore, attendeeId: string,
  attendee: EventAttendeeDocument): Promise<void> {
  firestore.put(`eventAttendees/${attendeeId}`,
    attendee as unknown as FakeData);
  const db = firestore.asFirestore();
  await db.runTransaction(async (tx) => {
    const event = (await tx.get(db.collection("events").doc("event-1")))
      .data() as EventDocument;
    const seat = await prepareApprovedRuntimeGuestSeat({db, tx, event,
      eventId: "event-1", uid: "runner-1", attendeeId, attendee, now});
    seat.apply();
  });
}

function invitedRow(): EventAttendeeDocument {
  return runtimeGuestAttendeeDocument({eventId: "event-1",
    organizerId: "organizer-1", uid: null, displayName: "Walk In", phone,
    status: "invited", inviteLinkId: null, now});
}

test("approving an invited claim reserves its seat once", async () => {
  const firestore = readyStore(readyEvent("hostApproval"));
  await enrollWalkIn(firestore, "hostApproval");
  await approve(firestore, phoneRow, invitedRow());

  assert.equal(firestore.get("eventSeatLedgers/event-1")?.occupied, 1);
  assert.equal(firestore.get("events/event-1")?.bookedCount, 1);
});

test("approving a row that already holds its seat writes nothing",
  async () => {
    const firestore = readyStore(readyEvent("autoCreate"));
    await enrollWalkIn(firestore, "autoCreate");
    const before = firestore.get("eventSeatLedgers/event-1");
    await approve(firestore, phoneRow, {...invitedRow(),
      status: "registered"});
    assert.deepEqual(firestore.get("eventSeatLedgers/event-1"), before);
    assert.equal(firestore.get("events/event-1")?.bookedCount, 1);
  });

test("approving another guest's row for a claim is refused",
  async () => {
    const firestore = readyStore(readyEvent("hostApproval"));
    await enrollWalkIn(firestore, "hostApproval");
    await enrollWalkIn(firestore, "hostApproval",
      {uid: "runner-2", phone: "+919876543211", row: "row-other"});
    await assert.rejects(approve(firestore, "row-other", {...invitedRow(),
      phoneE164: "+919876543211"}),
    failedWith("Claim identity and guest seat disagree."));
    assert.equal(firestore.get("eventSeatLedgers/event-1")?.occupied, 0);
  });
