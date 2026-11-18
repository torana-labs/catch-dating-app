import assert from "node:assert/strict";
import test from "node:test";
import {
  buildGuestItinerary,
  buildHouseholdItinerary,
  resolveItineraryStatus,
  type FunctionRsvpLike,
  type ProgramGuestLike,
} from "./guestItinerary";
import type {ProgramFunctionLike} from "./programTimeline";

const KOLKATA = "Asia/Kolkata";

const functions: ProgramFunctionLike[] = [
  {
    functionId: "sangeet",
    name: "Sangeet",
    // 2026-05-01 19:00 IST.
    startsAt: Date.UTC(2026, 4, 1, 13, 30),
    endsAt: Date.UTC(2026, 4, 1, 16, 0),
    venueName: "Mirror Lake Pavilion",
    status: "scheduled",
    revision: 1,
  },
  {
    functionId: "haldi",
    name: "Haldi",
    // 2026-05-02 10:00 IST.
    startsAt: Date.UTC(2026, 4, 2, 4, 30),
    endsAt: Date.UTC(2026, 4, 2, 6, 0),
    venueName: "Courtyard",
    status: "scheduled",
    revision: 1,
  },
  {
    functionId: "mehendi",
    name: "Mehendi",
    startsAt: Date.UTC(2026, 4, 2, 8, 0),
    endsAt: Date.UTC(2026, 4, 2, 10, 0),
    venueName: "Garden",
    status: "cancelled",
    revision: 2,
  },
  {
    functionId: "wedding",
    name: "Wedding",
    // 2026-05-02 19:00 IST, venue not assigned yet.
    startsAt: Date.UTC(2026, 4, 2, 13, 30),
    endsAt: Date.UTC(2026, 4, 2, 17, 0),
    status: "scheduled",
    revision: 1,
  },
];

function guest(
  guestId: string,
  partial?: Partial<ProgramGuestLike>,
): ProgramGuestLike {
  return {
    guestId,
    displayName: guestId,
    householdId: "h1",
    invitationStatus: "invited",
    rsvpStatus: "pending",
    ...partial,
  };
}

test("invited guests get every scheduled function in order", () => {
  const itinerary = buildGuestItinerary(
    guest("asha"), functions, [], KOLKATA);
  assert.deepEqual(itinerary.map((entry) => entry.functionId),
    ["sangeet", "haldi", "wedding"]);
  assert.deepEqual(itinerary.map((entry) => entry.status),
    ["invited", "invited", "invited"]);
  assert.deepEqual(itinerary.map((entry) => entry.dayLabel), [
    "Friday, May 1, 2026",
    "Saturday, May 2, 2026",
    "Saturday, May 2, 2026",
  ]);
  assert.equal(itinerary[0].venueName, "Mirror Lake Pavilion");
  assert.equal(itinerary[2].venueName, null);
  assert.equal(itinerary[0].name, "Sangeet");
});

test("notInvited guests receive an empty itinerary", () => {
  assert.deepEqual(buildGuestItinerary(
    guest("outsider", {invitationStatus: "notInvited"}),
    functions, [], KOLKATA), []);
});

test("rsvp statuses map onto itinerary statuses", () => {
  assert.equal(resolveItineraryStatus("attending"), "attending");
  assert.equal(resolveItineraryStatus("declined"), "declined");
  assert.equal(resolveItineraryStatus("maybe"), "pending");
  assert.equal(resolveItineraryStatus("pending"), "invited");
  const attending = buildGuestItinerary(
    guest("a", {rsvpStatus: "attending"}), functions, [], KOLKATA);
  assert.ok(attending.every((entry) => entry.status === "attending"));
  const maybe = buildGuestItinerary(
    guest("b", {rsvpStatus: "maybe"}), functions, [], KOLKATA);
  assert.ok(maybe.every((entry) => entry.status === "pending"));
});

test("per-function overrides win over the program-wide rsvp", () => {
  const overrides: FunctionRsvpLike[] = [
    {functionId: "wedding", guestId: "asha", rsvpStatus: "declined"},
    {functionId: "haldi", guestId: "someone-else",
      rsvpStatus: "declined"},
  ];
  const itinerary = buildGuestItinerary(
    guest("asha", {rsvpStatus: "attending"}), functions, overrides,
    KOLKATA);
  assert.deepEqual(itinerary.map((entry) => entry.status),
    ["attending", "attending", "declined"]);
});

test("household itineraries merge member statuses per function", () => {
  const members = [
    guest("asha", {rsvpStatus: "attending"}),
    guest("raj", {rsvpStatus: "pending"}),
    guest("kid", {invitationStatus: "notInvited"}),
  ];
  const overrides: FunctionRsvpLike[] = [
    {functionId: "haldi", guestId: "raj", rsvpStatus: "maybe"},
  ];
  const itinerary = buildHouseholdItinerary(
    members, functions, overrides, KOLKATA);
  assert.deepEqual(itinerary.map((entry) => entry.functionId),
    ["sangeet", "haldi", "wedding"]);
  const haldi = itinerary[1];
  assert.deepEqual(haldi.guests, [
    {guestId: "asha", displayName: "asha", status: "attending"},
    {guestId: "raj", displayName: "raj", status: "pending"},
  ]);
  assert.deepEqual(itinerary[0].guests.map((g) => g.status),
    ["attending", "invited"]);
  // No invited members means no itinerary at all.
  assert.deepEqual(buildHouseholdItinerary(
    [guest("x", {invitationStatus: "notInvited"})],
    functions, [], KOLKATA), []);
});
