import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {FakeFirestore} from "../shared/testing/programFirestore";
import {baseSeed} from "../shared/testing/programFixtures";
import type {OrganizerProgramDocument} from
  "../shared/generated/firestoreAdminTypes";
import {
  programArrivalView,
  programDepartureView,
  programVendorView,
  reconcileProgramArrivalView,
  reconcileProgramDepartureView,
  reconcileProgramVendorView,
} from "./programArrivalViews";

const at = (millis: number) => Timestamp.fromMillis(millis);
const seed = baseSeed();
const settings = (seed["organizerPrograms/program-1"] as unknown as
  OrganizerProgramDocument).transportSettings;
const inbound = (overrides: Record<string, unknown> = {}) => ({
  ...(seed["programTravelLegs/leg-1"] as Record<string, unknown>),
  ...overrides});
const context = {guest: {displayName: "Rohan"} as never, party: undefined,
  partyGuestIds: [], hotel: {name: "The Grand"} as never,
  claimantName: null};

test("an arrivals row is the callable's row, keyed for rules, no contacts",
  () => {
    const row = programArrivalView("leg-1", inbound(), settings, context)!;
    assert.equal(row.guestDisplayName, "Rohan");
    assert.equal(row.destinationLabel, "The Grand");
    assert.equal(row.pickupKey, "pp-t3");
    assert.equal(row.hotelKey, "hotel-1");
    assert.deepEqual(row.partyGuestIds, ["guest-1"]);
    assert.equal(row.claimedByUid, null);
    assert.equal(row.curbSource, "scheduledLanding");
    assert.equal(JSON.stringify(row).includes("9999900001"), false);
  });

test("only expected, ready and disrupted inbound journeys are listed", () => {
  for (const readiness of ["expected", "ready", "disrupted"]) {
    assert.notEqual(programArrivalView("leg-1", inbound({readiness}),
      settings, context), null, readiness);
  }
  for (const readiness of ["dispatched", "arrived", "noShow"]) {
    assert.equal(programArrivalView("leg-1", inbound({readiness}), settings,
      context), null, readiness);
  }
  assert.equal(programArrivalView("leg-1", inbound({kind: "outbound"}),
    settings, context), null);
  assert.equal(programArrivalView("leg-1", undefined, settings, context),
    null);
});

test("a journey with no pickup point or hotel gets the empty key", () => {
  const row = programArrivalView("leg-1", inbound({pickupPointId: null,
    destinationHotelId: null, destinationLabel: "Farmhouse"}), settings,
  {...context, hotel: undefined})!;
  assert.equal(row.pickupKey, "~");
  assert.equal(row.hotelKey, "~");
  assert.equal(row.destinationLabel, "Farmhouse");
});

test("a claim carries the claimant's name and account id", () => {
  const row = programArrivalView("leg-1", inbound({claimedByUid: "greeter-1"}),
    settings, {...context, claimantName: "Arjun"})!;
  assert.equal(row.claimedByDisplay, "Arjun");
  assert.equal(row.claimedByUid, "greeter-1");
  const unnamed = programArrivalView("leg-1",
    inbound({claimedByUid: "greeter-1"}), settings, context)!;
  assert.equal(unnamed.claimedByDisplay, "Staff");
});

const outbound = (overrides: Record<string, unknown> = {}) => inbound({
  kind: "outbound", destinationHotelId: "hotel-1",
  scheduledArrivalAt: at(50_000_000), manualCurbAt: null,
  readiness: "expected", ...overrides});
const noStay = {guestName: "Rohan", partyLabel: null, room: null,
  stayStatus: null};

test("a departures row mirrors the desk row and its leave-by rule", () => {
  const row = programDepartureView("leg-2", outbound(), {...noStay,
    room: "412", stayStatus: "checkedIn"})!;
  assert.equal(row.hotelId, "hotel-1");
  assert.equal(row.roomLabel, "412");
  assert.equal(row.state, "inRoom");
  assert.equal(row.leaveByMillis, 50_000_000 - 3 * 3_600_000);
  assert.equal(programDepartureView("leg-2", outbound({manualCurbAt:
    at(40_000_000)}), noStay)!.leaveByMillis, 40_000_000);
  assert.equal(programDepartureView("leg-2", outbound(), {...noStay,
    stayStatus: "checkedOut"})!.state, "checkedOut");
  assert.equal(programDepartureView("leg-2", outbound({readiness:
    "dispatched"}), noStay)!.state, "left");
  assert.equal(programDepartureView("leg-2", outbound({pickupPointId: null}),
    noStay)!.state, "carNotNeeded");
});

test("inbound, anonymized and hotel-less journeys are not on a desk", () => {
  assert.equal(programDepartureView("l", inbound(), noStay), null);
  assert.equal(programDepartureView("l", outbound({anonymizedAt: at(1)}),
    noStay), null);
  assert.equal(programDepartureView("l", outbound({destinationHotelId: null}),
    noStay), null);
});

test("a vendor view is id, name and active, never the phone number", () => {
  const vendor = {organizerId: "org-1", name: "City Cabs",
    phoneE164: "+919800000000", programIds: ["program-1", "program-2"],
    active: true};
  const view = programVendorView("program-1", "v1", vendor)!;
  assert.deepEqual(view, {programId: "program-1", organizerId: "org-1",
    vendorId: "v1", name: "City Cabs", active: true, version: 1});
  assert.equal(JSON.stringify(view).includes("9800000000"), false);
  assert.equal(programVendorView("program-9", "v1", vendor), null);
});

test("reconcile writes on change only, follows a rename, removes when the " +
  "journey leaves the roster", async () => {
  const store = new FakeFirestore({...baseSeed(),
    "programTravelParties/party-1": {programId: "program-1",
      organizerId: "org-1", label: "Rao family", legIds: ["leg-1"]},
    "programStays/stay-1": {programId: "program-1", organizerId: "org-1",
      guestId: "guest-1", hotelId: "hotel-1", roomLabel: "412",
      status: "checkedIn", endsAt: at(60_000_000)},
    "programTravelLegs/leg-9": outbound({guestId: "guest-1",
      partyId: "party-1"}),
    "transportVendors/v1": {organizerId: "org-1", name: "City Cabs",
      phoneE164: "+919800000000", programIds: ["program-1"], active: true}});
  const db = store as unknown as FirebaseFirestore.Firestore;
  await reconcileProgramArrivalView(db, "leg-1");
  await reconcileProgramDepartureView(db, "leg-9");
  await reconcileProgramVendorView(db, "program-1", "v1");
  const arrival = store.getDoc("programArrivalViews/leg-1") as
    {guestDisplayName: string; destinationLabel: string};
  assert.equal(arrival.guestDisplayName, "Rohan Sharma");
  assert.equal(arrival.destinationLabel.length > 0, true);
  const departure = store.getDoc("programDepartureViews/leg-9") as
    {roomLabel: string; partyLabel: string};
  assert.equal(departure.roomLabel, "412");
  assert.equal(departure.partyLabel, "Rao family");
  assert.equal((store.getDoc("programVendorViews/program-1__v1") as
    {name: string}).name, "City Cabs");

  let writes = 0;
  const setDoc = store.setDoc.bind(store);
  store.setDoc = (...args: Parameters<typeof setDoc>) => {
    writes++;
    return setDoc(...args);
  };
  await reconcileProgramArrivalView(db, "leg-1");
  await reconcileProgramDepartureView(db, "leg-9");
  await reconcileProgramVendorView(db, "program-1", "v1");
  assert.equal(writes, 0, "a no-op writes nothing");

  store.updateDoc("programGuests/guest-1", {displayName: "Rohan S"});
  await reconcileProgramArrivalView(db, "leg-1");
  assert.equal((store.getDoc("programArrivalViews/leg-1") as
    {guestDisplayName: string}).guestDisplayName, "Rohan S");

  store.updateDoc("programTravelLegs/leg-1", {readiness: "dispatched"});
  await reconcileProgramArrivalView(db, "leg-1");
  assert.equal(store.getDoc("programArrivalViews/leg-1"), undefined);

  store.updateDoc("transportVendors/v1", {programIds: []});
  await reconcileProgramVendorView(db, "program-1", "v1");
  assert.equal(store.getDoc("programVendorViews/program-1__v1"), undefined);
});
