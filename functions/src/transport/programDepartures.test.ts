import assert from "node:assert/strict";
import test from "node:test";
import * as admin from "firebase-admin";
import {deps, request, now} from "../shared/testing/programFixtures";
import {FakeFirestore, type FakeData} from
  "../shared/testing/programFirestore";
import {
  departureCounts,
  departureLeaveBy,
  departureState,
  getProgramDeparturesRosterHandler,
} from "./programDepartures";

const HOUR = 3_600_000;
const FUTURE = now.toMillis() + 86_400_000;
const at = (millis: number) => admin.firestore.Timestamp.fromMillis(millis);

const grant = (uid: string, hotelIds: string[]): FakeData => ({
  organizerId: "org-1", programId: "program-1", uid, displayName: uid,
  phoneLastFour: "0000",
  duties: [{duty: "hotelDesk", pickupPointIds: [], hotelIds,
    expiresAtMillis: FUTURE}],
  status: "active", createdBy: "manager-1", createdAt: now,
  expiresAt: at(FUTURE), revokedBy: null, revokedAt: null,
  updatedAt: now, revision: 1,
});

const leg = (id: string, guestId: string, patch: FakeData = {}): FakeData => ({
  programId: "program-1", organizerId: "org-1", guestId, partyId: null,
  kind: "outbound", destinationHotelId: "taj", flightNumber: "AI 472",
  scheduledArrivalAt: at(now.toMillis() + 5 * HOUR), manualCurbAt: null,
  readiness: "expected", pickupPointId: "udr", passengers: 1,
  luggageUnits: 2, revision: 1, ...patch,
});

const seed = (): Record<string, FakeData> => ({
  "organizers/org-1": {
    hostUserId: "manager-1", ownerUserId: "manager-1",
    hostUserIds: ["manager-1"], hostProfiles: [],
  },
  "organizerPrograms/program-1": {
    organizerId: "org-1", kind: "wedding", title: "Wedding",
    timezone: "UTC", status: "active", capabilities: [],
    transportSettings: {vehicleClasses: []},
    startsAt: at(now.toMillis() - HOUR), endsAt: at(FUTURE),
    createdBy: "manager-1", createdAt: now, updatedAt: now, revision: 1,
  },
  "programStaffGrants/program-1__desk-taj": grant("desk-taj", ["taj"]),
  "programStaffGrants/program-1__desk-leela": grant("desk-leela", ["leela"]),
  "programHotels/taj": {programId: "program-1", organizerId: "org-1",
    name: "Taj Fateh Prakash"},
  "programGuests/kamla": {programId: "program-1", organizerId: "org-1",
    displayName: "Kamla Mehra"},
  "programGuests/neha": {programId: "program-1", organizerId: "org-1",
    displayName: "Neha Mehra"},
  "programGuests/ravi": {programId: "program-1", organizerId: "org-1",
    displayName: "Ravi Iyer"},
  "programTravelLegs/l-kamla": leg("l-kamla", "kamla", {
    manualCurbAt: at(now.toMillis() + HOUR)}),
  "programTravelLegs/l-neha": leg("l-neha", "neha", {
    scheduledArrivalAt: at(now.toMillis() + 2 * HOUR)}),
  "programTravelLegs/l-ravi": leg("l-ravi", "ravi", {
    readiness: "dispatched"}),
  "programTravelLegs/l-in": leg("l-in", "kamla", {kind: "inbound"}),
  "programStays/s-kamla": {programId: "program-1", organizerId: "org-1",
    guestId: "kamla", hotelId: "taj", roomLabel: "214",
    status: "checkedOut", endsAt: at(now.toMillis())},
  "programStays/s-neha": {programId: "program-1", organizerId: "org-1",
    guestId: "neha", hotelId: "taj", roomLabel: "216",
    status: "checkedIn", endsAt: at(now.toMillis())},
});

test("leave-by prefers the reviewed curb time over the flight lead", () => {
  assert.equal(departureLeaveBy({manualCurbAtMillis: 10,
    flightAtMillis: 99 * HOUR}), 10);
  assert.equal(departureLeaveBy({manualCurbAtMillis: null,
    flightAtMillis: 5 * HOUR}), 2 * HOUR);
  assert.equal(departureLeaveBy({manualCurbAtMillis: null,
    flightAtMillis: null}), null);
});

test("desk state reads the journey first, then the stay", () => {
  assert.equal(departureState({readiness: "arrived", pickupPointId: "a"},
    "checkedIn"), "left");
  assert.equal(departureState({readiness: "expected", pickupPointId: "a"},
    "checkedOut"), "checkedOut");
  assert.equal(departureState({readiness: "expected", pickupPointId: null},
    null), "carNotNeeded");
  assert.equal(departureState({readiness: "ready", pickupPointId: "a"},
    "checkedIn"), "inRoom");
});

test("late checkouts are still in their room after leave-by", () => {
  const row = (state: "inRoom" | "checkedOut", leaveByMillis: number) => ({
    legId: "x", guestId: "g", guestDisplayName: "", partyLabel: null,
    passengers: 1, luggageUnits: 0, flightNumber: null,
    flightAtMillis: null, leaveByMillis, roomLabel: null, state,
    revision: 1,
  });
  assert.deepEqual(departureCounts([row("inRoom", 0), row("inRoom", 2 * HOUR),
    row("checkedOut", HOUR)], HOUR),
  {checkedOut: 1, leavingSoon: 2, lateCheckouts: 1});
});

test("the hotel desk reads its departures soonest first", async () => {
  const roster = await getProgramDeparturesRosterHandler(
    request({programId: "program-1", hotelId: "taj"}, "desk-taj"),
    deps(new FakeFirestore(seed())));
  assert.equal(roster.hotelName, "Taj Fateh Prakash");
  assert.deepEqual(roster.rows.map((row) =>
    [row.guestDisplayName, row.state, row.roomLabel]), [
    ["Neha Mehra", "inRoom", "216"],
    ["Kamla Mehra", "checkedOut", "214"],
    ["Ravi Iyer", "left", null],
  ]);
  assert.equal(roster.checkedOut, 1);
  assert.equal(roster.leavingSoon, 1);
  assert.equal(roster.lateCheckouts, 1);
});

test("another hotel's desk is refused", async () => {
  await assert.rejects(getProgramDeparturesRosterHandler(
    request({programId: "program-1", hotelId: "taj"}, "desk-leela"),
    deps(new FakeFirestore(seed()))),
  (err: unknown) => (err as {code?: string}).code === "permission-denied");
});
