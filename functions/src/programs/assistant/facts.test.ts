/* eslint-disable max-len */
import assert from "node:assert/strict";
import test from "node:test";
import * as admin from "firebase-admin";
import {FakeFirestore, type FakeData} from "../../shared/testing/programFirestore";
import {baseSeed, now} from "../../shared/testing/programFixtures";
import {buildFactPack, renderFactPack} from "./facts";
import {factInput} from "./assistantFixture";
import {FactSourceError, loadFactPackInput} from "./factsSource";

test("the fact pack holds the household's own itinerary, stay, travel and RSVP", () => {
  const pack = buildFactPack(factInput());
  assert.equal(pack.household?.label, "The Mehra family");
  assert.deepEqual(pack.household?.members, ["Neha Mehra", "Kamla Mehra"]);
  assert.deepEqual(pack.itinerary.map((entry) => entry.name), ["Sangeet", "Haldi"]);
  const sangeet = pack.itinerary[0];
  assert.deepEqual(sangeet.guests, [{name: "Neha Mehra", status: "attending", partySize: 2}]);
  assert.equal(sangeet.instructions, "Cars leave the porch at 6:45 PM");
  const haldi = pack.itinerary[1];
  assert.equal(haldi.dressCode, "Yellow");
  assert.equal(haldi.time, "10:00 AM to 12:30 PM");
  assert.match(haldi.day, /Sunday, December 13/u);
  assert.deepEqual(haldi.guests.map((guest) => guest.status), ["attending", "invited"]);
  assert.deepEqual(pack.rsvp, [{name: "Neha Mehra", status: "attending"},
    {name: "Kamla Mehra", status: "pending"}]);
  assert.equal(pack.stays.length, 1);
  assert.equal(pack.stays[0].room, "216");
  assert.equal(pack.travel.length, 1);
  assert.equal(pack.travel[0].pickup, "UDR arrivals, Gate 2");
  assert.equal(pack.travel[0].goesTo, "Taj Fateh Prakash");
});

test("the fact pack never carries another household's guests, rooms or flights", () => {
  const text = renderFactPack(buildFactPack(factInput()));
  for (const leaked of ["Iyer", "230", "6E201", "Cancelled brunch", "puja"]) {
    assert.ok(!text.includes(leaked), `fact pack leaked ${leaked}`);
  }
  assert.match(text, /Neha Mehra: Taj Fateh Prakash \(City Palace, Udaipur\), room 216/u);
  assert.match(text, /pickup at UDR arrivals, Gate 2, then to Taj Fateh Prakash/u);
  assert.match(text, /Pickup instructions: Pooja meets you with a sign/u);
});

test("the programme-only pack (Try it without a household) lists functions only", () => {
  const pack = buildFactPack(factInput({household: null}));
  assert.equal(pack.household, null);
  assert.deepEqual(pack.rsvp, []);
  assert.deepEqual(pack.stays, []);
  assert.deepEqual(pack.travel, []);
  assert.deepEqual(pack.itinerary.map((entry) => entry.name),
    ["Iyer family puja", "Sangeet", "Haldi"]);
  assert.ok(pack.itinerary.every((entry) => entry.guests.length === 0));
  const text = renderFactPack(pack);
  assert.match(text, /Only programme-wide facts are known/u);
});

test("the fact pack is deterministic for the same records", () => {
  const first = renderFactPack(buildFactPack(factInput()));
  const shuffled = factInput();
  shuffled.functions.reverse();
  shuffled.stays.reverse();
  assert.equal(renderFactPack(buildFactPack(shuffled)), first);
});

const ts = (iso: string) => admin.firestore.Timestamp.fromMillis(Date.parse(iso));

function seed(): Record<string, FakeData> {
  const base = baseSeed();
  return {
    ...base,
    "programHouseholds/hh-1": {programId: "program-1", organizerId: "org-1",
      label: "The Sharma family", primaryContactName: "Asha",
      primaryPhoneE164: "+919800000001", primaryEmail: null,
      memberGuestIds: ["guest-1"], deliveryPreference: "whatsapp",
      createdAt: now, updatedAt: now, revision: 1},
    "programGuests/guest-1": {...base["programGuests/guest-1"], householdId: "hh-1",
      displayName: "Asha Sharma"},
    "programFunctions/fn-1": {programId: "program-1", organizerId: "org-1",
      name: "Mehendi", startsAt: ts("2026-12-12T06:00:00Z"),
      endsAt: ts("2026-12-12T09:00:00Z"), venueName: "Garden", status: "scheduled",
      dressCode: "Green", createdAt: now, updatedAt: now, revision: 1},
    "programFunctions/fn-other-org": {programId: "program-1", organizerId: "org-2",
      name: "Wrong organiser", startsAt: ts("2026-12-12T06:00:00Z"),
      endsAt: ts("2026-12-12T09:00:00Z"), venueName: "X", status: "scheduled",
      createdAt: now, updatedAt: now, revision: 1},
    "programStays/stay-1": {programId: "program-1", organizerId: "org-1",
      guestId: "guest-1", hotelId: "hotel-1", roomLabel: "412", startsAt: null,
      endsAt: null, status: "confirmed", notes: "VIP, internal", source: "planner"},
    "programStays/stay-2": {programId: "program-1", organizerId: "org-1",
      guestId: "guest-2", hotelId: "hotel-1", roomLabel: "999", startsAt: null,
      endsAt: null, status: "confirmed", notes: null, source: "planner"},
  };
}

test("the source reads only the household's members and drops staff notes", async () => {
  const db = new FakeFirestore(seed()) as unknown as FirebaseFirestore.Firestore;
  const input = await loadFactPackInput(db, "program-1", "hh-1");
  assert.deepEqual(input.members.map((member) => member.guestId), ["guest-1"]);
  assert.deepEqual(input.stays.map((stay) => stay.roomLabel), ["412"]);
  assert.deepEqual(input.functions.map((fn) => fn.functionId), ["fn-1"]);
  assert.ok(input.travelLegs.every((leg) => leg.guestId === "guest-1"));
  const text = renderFactPack(buildFactPack(input));
  assert.ok(!text.includes("VIP"));
  assert.ok(!text.includes("999"));
  assert.ok(!text.includes("+9198"));
  assert.match(text, /Asha Sharma/u);
});

test("the source refuses another programme's household and archived programmes", async () => {
  const data = seed();
  data["programHouseholds/hh-x"] = {...data["programHouseholds/hh-1"], programId: "program-2"};
  const db = new FakeFirestore(data) as unknown as FirebaseFirestore.Firestore;
  await assert.rejects(loadFactPackInput(db, "program-1", "hh-x"), FactSourceError);
  data["organizerPrograms/program-1"] = {...data["organizerPrograms/program-1"],
    status: "archived"};
  const archived = new FakeFirestore(data) as unknown as FirebaseFirestore.Firestore;
  await assert.rejects(loadFactPackInput(archived, "program-1", "hh-1"), FactSourceError);
});
