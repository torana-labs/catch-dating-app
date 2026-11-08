import assert from "node:assert/strict";
import test from "node:test";
import * as admin from "firebase-admin";
import {HttpsError} from "firebase-functions/v2/https";
import {FakeFirestore, type FakeData} from
  "../shared/testing/programFirestore";
import {request} from "../shared/testing/programFixtures";
import {
  type EventStaffPresenceDeps,
  eventStaffPresenceLifetimeMillis,
  heartbeatEventStaffPresenceHandler,
} from "./eventStaffPresence";

const now = admin.firestore.Timestamp.fromMillis(1_800_000_000_000);
const later = admin.firestore.Timestamp.fromMillis(now.toMillis() + 1e7);

function seed(overrides: Record<string, FakeData> = {}) {
  return {
    "events/event-1": {organizerId: "club-1", status: "active"},
    "organizers/club-1": {hostUserId: "host-1", ownerUserId: "host-1",
      hostUserIds: ["host-1"], hostProfiles: [{uid: "host-1",
        displayName: "Priya", avatarUrl: null, role: "owner"}]},
    "eventStaffGrants/event-1__staff-1": {eventId: "event-1",
      organizerId: "club-1", uid: "staff-1", displayName: "Kabir",
      status: "active", role: "checkInOperator",
      permissions: ["viewRoster", "setAttendance"], expiresAt: later},
    "eventStaffGrants/event-1__gone-1": {eventId: "event-1",
      organizerId: "club-1", uid: "gone-1", displayName: "Gone",
      status: "revoked", role: "checkInOperator",
      permissions: ["viewRoster"], expiresAt: later},
    ...overrides,
  };
}

function deps(firestore: FakeFirestore): EventStaffPresenceDeps {
  return {
    firestore: () => firestore as unknown as FirebaseFirestore.Firestore,
    checkRateLimit: async () => undefined,
    now: () => now,
    timestampFromMillis: (millis) =>
      admin.firestore.Timestamp.fromMillis(millis),
  };
}

test("managers and staff record door presence that lapses", async () => {
  const firestore = new FakeFirestore(seed());
  for (const [uid, name, role] of [["host-1", "Priya", "manager"],
    ["staff-1", "Kabir", "operator"]]) {
    const result = await heartbeatEventStaffPresenceHandler(
      request({eventId: "event-1"}, uid), deps(firestore));
    assert.deepEqual(result, {eventId: "event-1",
      lastSeenAtMillis: now.toMillis(),
      expiresAtMillis: now.toMillis() + eventStaffPresenceLifetimeMillis});
    const row = firestore.getDoc(`eventStaffPresence/event-1_${uid}`);
    assert.equal(row?.displayName, name);
    assert.equal(row?.role, role);
    assert.equal(row?.organizerId, "club-1");
    assert.equal((row?.expiresAt as admin.firestore.Timestamp).toMillis(),
      now.toMillis() + eventStaffPresenceLifetimeMillis);
  }
});

test("nobody else can say they are on the door", async () => {
  const firestore = new FakeFirestore(seed());
  for (const uid of ["gone-1", "guest-1"]) {
    await assert.rejects(heartbeatEventStaffPresenceHandler(
      request({eventId: "event-1"}, uid), deps(firestore)),
    (error) => error instanceof HttpsError &&
      error.code === "permission-denied");
    assert.equal(firestore.getDoc(`eventStaffPresence/event-1_${uid}`),
      undefined);
  }
});

test("a cancelled event takes no presence", async () => {
  const firestore = new FakeFirestore(seed({
    "events/event-1": {organizerId: "club-1", status: "cancelled"}}));
  await assert.rejects(heartbeatEventStaffPresenceHandler(
    request({eventId: "event-1"}, "host-1"), deps(firestore)),
  (error) => error instanceof HttpsError &&
    error.code === "failed-precondition");
});
