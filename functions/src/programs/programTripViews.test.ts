import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {FakeFirestore} from "../shared/testing/programFirestore";
import {baseSeed} from "../shared/testing/programFixtures";
import type {OrganizerProgramDocument} from
  "../shared/generated/firestoreAdminTypes";
import {
  programHotelInboundView,
  programTripView,
  reconcileProgramHotelInboundView,
  reconcileProgramTripView,
} from "./programTripViews";

const at = (millis: number) => Timestamp.fromMillis(millis);
const seed = baseSeed();
const settings = (seed["organizerPrograms/program-1"] as unknown as
  OrganizerProgramDocument).transportSettings;

const trip = (overrides: Record<string, unknown> = {}) => ({
  programId: "program-1", organizerId: "org-1", kind: "guestTransfer",
  pickupPointId: "pp-t3", destinationHotelId: "hotel-1",
  destinationLabel: "The Grand", vehicleClassId: "sedan",
  vendorId: "v1", vendorNameSnapshot: "City Cabs",
  plateNormalized: "DL1AB1234", plateDisplay: "DL 1 AB 1234",
  partyIds: [], legIds: ["leg-1"], passengerCount: 2, status: "enRoute",
  departedAt: at(10_000), departedByUid: "dispatcher-1", arrivedAt: null,
  voidedByUid: null, voidReason: null, arrivedByUid: null,
  rateSnapshot: {currency: "INR", amountMinor: 100, pricingKind: "perTrip"},
  clientOperationId: "op", notes: "driver Ravi 9800000000",
  createdAt: at(1), updatedAt: at(1), revision: 3, ...overrides});

test("a trip view is the list row and keeps notes, rate and uids out", () => {
  const view = programTripView("t1", trip({dispatchSnapshot: {
    vehicleClass: {id: "sedan", label: "Sedan"},
    manifest: [{legId: "leg-1", guestId: "guest-1",
      guestDisplayName: "Rohan Sharma", passengers: 2, luggageUnits: 1}]}}),
  new Map(), new Map())!;
  assert.equal(view.pickupKey, "pp-t3");
  assert.equal(view.hotelKey, "hotel-1");
  assert.equal(view.manifestSource, "dispatchSnapshot");
  assert.deepEqual(view.guestNames, ["Rohan Sharma"]);
  assert.equal(view.vehicleClassLabel, "Sedan");
  assert.equal(view.vendorName, "City Cabs");
  assert.equal(view.departedAtMillis, 10_000);
  const text = JSON.stringify(view);
  for (const secret of ["9800000000", "dispatcher-1", "amountMinor",
    "DL1AB1234"]) {
    assert.equal(text.includes(secret), false, secret);
  }
});

test("a trip with no hotel gets the empty key; a legacy trip reads names",
  () => {
    const legs = new Map([["leg-1", {programId: "program-1",
      organizerId: "org-1", pickupPointId: "pp-t3",
      destinationHotelId: null, guestId: "guest-1"} as never]]);
    const guests = new Map([["guest-1", {programId: "program-1",
      organizerId: "org-1", displayName: "Rohan"} as never]]);
    const view = programTripView("t1", trip({destinationHotelId: null,
      destinationLabel: null}), legs, guests)!;
    assert.equal(view.hotelKey, "~");
    assert.equal(view.destinationLabel, "Unassigned");
    assert.equal(view.manifestSource, "currentRecords");
    assert.deepEqual(view.guestNames, ["Rohan"]);
    assert.equal(programTripView("t1", undefined, new Map(), new Map()), null);
  });

const inbound = (overrides: Record<string, unknown> = {}) => ({
  ...(seed["programTravelLegs/leg-1"] as Record<string, unknown>),
  ...overrides});

test("a hotel inbound row is the expected-guest row and nothing about the " +
  "flight or the claim", () => {
  const row = programHotelInboundView("leg-1", inbound({claimedByUid: "g"}),
    settings, {guestName: "Rohan", partyLabel: "Rao family"})!;
  assert.deepEqual(Object.keys(row).sort(), ["curbAtMillis", "guestDisplayName",
    "hotelId", "legId", "organizerId", "partyLabel", "passengers", "programId",
    "readiness", "version"]);
  assert.equal(row.hotelId, "hotel-1");
  assert.equal(row.readiness, "expected");
  assert.equal(JSON.stringify(row).includes("AI847"), false);
  for (const readiness of ["disrupted", "dispatched", "arrived", "noShow"]) {
    assert.equal(programHotelInboundView("leg-1", inbound({readiness}),
      settings, {guestName: "R", partyLabel: null}), null, readiness);
  }
  assert.equal(programHotelInboundView("leg-1", inbound({kind: "outbound"}),
    settings, {guestName: "R", partyLabel: null}), null);
  assert.equal(programHotelInboundView("leg-1",
    inbound({destinationHotelId: null}), settings,
    {guestName: "R", partyLabel: null}), null);
});

test("reconcile writes on change only and follows the sources", async () => {
  const store = new FakeFirestore({...baseSeed(),
    "transportTrips/t1": trip({dispatchSnapshot: {
      vehicleClass: {id: "sedan", label: "Sedan"},
      manifest: [{legId: "leg-1", guestId: "guest-1",
        guestDisplayName: "Rohan Sharma", passengers: 2, luggageUnits: 1}]}})});
  const db = store as unknown as FirebaseFirestore.Firestore;
  await reconcileProgramTripView(db, "t1");
  await reconcileProgramHotelInboundView(db, "leg-1");
  assert.equal((store.getDoc("programTripViews/t1") as {status: string})
    .status, "enRoute");
  assert.equal((store.getDoc("programHotelInboundViews/leg-1") as
    {guestDisplayName: string}).guestDisplayName, "Rohan Sharma");

  let writes = 0;
  const setDoc = store.setDoc.bind(store);
  store.setDoc = (...args: Parameters<typeof setDoc>) => {
    writes++;
    return setDoc(...args);
  };
  await reconcileProgramTripView(db, "t1");
  await reconcileProgramHotelInboundView(db, "leg-1");
  assert.equal(writes, 0, "a no-op writes nothing");

  store.updateDoc("transportTrips/t1", {status: "arrived",
    arrivedAt: at(20_000), revision: 4});
  await reconcileProgramTripView(db, "t1");
  assert.equal((store.getDoc("programTripViews/t1") as {status: string})
    .status, "arrived");

  store.updateDoc("programTravelLegs/leg-1", {readiness: "dispatched"});
  await reconcileProgramHotelInboundView(db, "leg-1");
  assert.equal(store.getDoc("programHotelInboundViews/leg-1"), undefined);
  store.deleteDoc("transportTrips/t1");
  await reconcileProgramTripView(db, "t1");
  assert.equal(store.getDoc("programTripViews/t1"), undefined);
});
