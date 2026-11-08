import assert from "node:assert/strict";
import test from "node:test";
import * as admin from "firebase-admin";
import {HttpsError} from "firebase-functions/v2/https";
import {parseGuestLinkKeys} from
  "../eventSuccess/operations/guestLinkKeyStore";
import {FakeFirestore, type FakeData} from
  "../shared/testing/programFirestore";
import {request} from "../shared/testing/programFixtures";
import {
  type EventTicketCodeDeps,
  getEventTicketCodeHandler,
  resolveEventTicketCodeHandler,
  signEventTicketCode,
  verifyEventTicketCode,
} from "./eventTicketCodes";

const now = admin.firestore.Timestamp.fromMillis(1_800_000_000_000);
const keyRing = (currentKeyId = "k2") => parseGuestLinkKeys({
  schema: "catch.event-assistance-guest-keys/v1", currentKeyId,
  keys: [
    {keyId: "k1", key: Buffer.alloc(32, 1).toString("base64url")},
    {keyId: "k2", key: Buffer.alloc(32, 2).toString("base64url")},
  ]});

function attendee(overrides: FakeData = {}): FakeData {
  return {eventId: "event-1", organizerId: "club-1",
    displayName: "Asha Rao", searchName: "asha rao", source: "catchBooking",
    status: "registered", linkedUid: "guest-1", phoneE164: null, email: null,
    externalReference: null, arrivalGroup: null, ticketType: null,
    importId: null, sourceRowId: null, createdAt: now, updatedAt: now,
    registeredAt: now, waitlistedAt: null, checkedInAt: null,
    cancelledAt: null, checkedInBy: null, linkedAt: now,
    attendanceRevision: 2, ...overrides};
}

function seed(): Record<string, FakeData> {
  return {
    "events/event-1": {organizerId: "club-1", status: "active"},
    "organizers/club-1": {hostUserId: "host-1", ownerUserId: "host-1",
      hostUserIds: ["host-1"]},
    "eventAttendees/att-1": attendee(),
    "eventAttendees/att-2": attendee({linkedUid: "guest-2",
      status: "waitlisted", displayName: "Dev Mehta"}),
    "eventAttendees/att-3": attendee({linkedUid: "guest-3",
      status: "cancelled", displayName: "Lee"}),
    "eventStaffGrants/event-1__staff-1": {eventId: "event-1",
      organizerId: "club-1", uid: "staff-1", status: "active",
      role: "checkInOperator", permissions: ["viewRoster", "setAttendance"],
      expiresAt: admin.firestore.Timestamp.fromMillis(now.toMillis() + 1e7)},
    "eventStaffGrants/event-1__viewer-1": {eventId: "event-1",
      organizerId: "club-1", uid: "viewer-1", status: "active",
      role: "checkInOperator", permissions: ["viewRoster"],
      expiresAt: admin.firestore.Timestamp.fromMillis(now.toMillis() + 1e7)},
  };
}

function deps(firestore: FakeFirestore,
  overrides: Partial<EventTicketCodeDeps> = {}): EventTicketCodeDeps {
  return {
    firestore: () => firestore as unknown as FirebaseFirestore.Firestore,
    checkRateLimit: async () => undefined,
    signingKeys: async () => keyRing(),
    now: () => now,
    ...overrides,
  };
}

function reason(error: unknown): unknown {
  return error instanceof HttpsError ?
    (error.details as {reason?: string} | undefined)?.reason : undefined;
}

test("a ticket code verifies only for its event and its key ring", () => {
  const code = signEventTicketCode({eventId: "event-1", attendeeId: "att-1",
    keys: keyRing()});
  assert.match(code, /^[A-Za-z0-9_-]{8,596}\.[A-Za-z0-9_-]{43}$/);
  assert.equal(verifyEventTicketCode({eventId: "event-1", ticketCode: code,
    keys: keyRing()}), "att-1");
  // Rotation: a code signed with the old current key still verifies while
  // the ring keeps that key.
  assert.equal(verifyEventTicketCode({eventId: "event-1", ticketCode: code,
    keys: keyRing("k1")}), "att-1");
  assert.equal(verifyEventTicketCode({eventId: "event-2", ticketCode: code,
    keys: keyRing()}), null);
  const [body, mac] = code.split(".");
  const flipped = (mac[0] === "A" ? "B" : "A") + mac.slice(1);
  for (const bad of [`${body}.${flipped}`, `${body}.${mac}.x`, "x.y",
    `${Buffer.from("[1,\"k9\",\"att-1\"]").toString("base64url")}.${mac}`,
    `${Buffer.from("[2,\"k2\",\"att-1\"]").toString("base64url")}.${mac}`]) {
    assert.equal(verifyEventTicketCode({eventId: "event-1", ticketCode: bad,
      keys: keyRing()}), null, bad);
  }
});

test("a guest gets the code for their own place only", async () => {
  const firestore = new FakeFirestore(seed());
  const result = await getEventTicketCodeHandler(
    request({eventId: "event-1"}, "guest-1"), deps(firestore));
  assert.equal(result.attendeeId, "att-1");
  assert.equal(verifyEventTicketCode({eventId: "event-1",
    ticketCode: result.ticketCode, keys: keyRing()}), "att-1");
  for (const uid of ["guest-2", "guest-3", "stranger"]) {
    await assert.rejects(getEventTicketCodeHandler(
      request({eventId: "event-1"}, uid), deps(firestore)),
    (error) => reason(error) === "noPlace");
  }
});

test("missing signing keys are unavailable without detail", async () => {
  const firestore = new FakeFirestore(seed());
  await assert.rejects(getEventTicketCodeHandler(
    request({eventId: "event-1"}, "guest-1"), deps(firestore, {
      signingKeys: async () => {
        throw new Error("secret detail");
      }})),
  (error) => error instanceof HttpsError && error.code === "unavailable" &&
    !error.message.includes("secret detail"));
});

test("the door resolves a code for managers and attendance staff", async () => {
  const firestore = new FakeFirestore(seed());
  const ticketCode = signEventTicketCode({eventId: "event-1",
    attendeeId: "att-1", keys: keyRing()});
  for (const uid of ["host-1", "staff-1"]) {
    const result = await resolveEventTicketCodeHandler(
      request({eventId: "event-1", ticketCode}, uid), deps(firestore));
    assert.deepEqual(result, {eventId: "event-1", attendeeId: "att-1",
      displayName: "Asha Rao", status: "registered", attendanceRevision: 2});
  }
  for (const uid of ["viewer-1", "guest-1"]) {
    await assert.rejects(resolveEventTicketCodeHandler(
      request({eventId: "event-1", ticketCode}, uid), deps(firestore)),
    (error) => error instanceof HttpsError &&
      error.code === "permission-denied");
  }
});

test("the door refuses forged, foreign and cancelled tickets", async () => {
  const firestore = new FakeFirestore({...seed(),
    "events/event-2": {organizerId: "club-1", status: "active"},
    "eventAttendees/att-9": attendee({eventId: "event-2"})});
  const sign = (eventId: string, attendeeId: string) => signEventTicketCode({
    eventId, attendeeId, keys: keyRing()});
  const cases: Array<[string, string]> = [
    [sign("event-1", "att-missing"), "invalidTicket"],
    // Signed for event-1 but naming another event's row.
    [sign("event-1", "att-9"), "invalidTicket"],
    [sign("event-2", "att-1"), "invalidTicket"],
    [sign("event-1", "att-3"), "ticketCancelled"],
  ];
  for (const [ticketCode, expected] of cases) {
    await assert.rejects(resolveEventTicketCodeHandler(
      request({eventId: "event-1", ticketCode}, "host-1"), deps(firestore)),
    (error) => reason(error) === expected);
  }
  await assert.rejects(resolveEventTicketCodeHandler(
    request({eventId: "event-1", ticketCode: "not-a-code"}, "host-1"),
    deps(firestore)),
  (error) => error instanceof HttpsError &&
    error.code === "invalid-argument");
});
