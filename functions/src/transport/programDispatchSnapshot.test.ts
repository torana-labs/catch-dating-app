import assert from "node:assert/strict";
import test from "node:test";
import {HttpsError} from "firebase-functions/v2/https";
import {readySeed, deps, now, request}
  from "../shared/testing/programFixtures";
import {FakeFirestore} from "../shared/testing/programFirestore";
import type {TransportTripDocument}
  from "../shared/generated/firestoreAdminTypes";
import {dispatchProgramTripHandler, markProgramTripArrivedHandler,
  voidProgramTripHandler} from "./programDispatch";

const input = {programId: "program-1", pickupPointId: "pp-t3",
  destinationHotelId: "hotel-1", vehicleClassId: "suv",
  plateDisplay: "DL-1T-4471", vendorId: "vendor-1", legIds: ["leg-1"],
  expectedLegRevisions: [{legId: "leg-1", revision: 1}],
  departedAtMillis: now.toMillis() - 60_000,
  clientOperationId: "snapshot-dispatch"};
const dispatch = (db: FakeFirestore) => dispatchProgramTripHandler(
  request(input, "dispatcher-1"), deps(db));
const tripDocument = (db: FakeFirestore, id: string) =>
  db.getDoc(`transportTrips/${id}`) as unknown as TransportTripDocument;
const isPrecondition = (error: unknown) =>
  error instanceof HttpsError && error.code === "failed-precondition";


test("dispatch captures guest and class facts at recording time", async () => {
  const db = new FakeFirestore(readySeed());
  const result = await dispatch(db);
  const trip = tripDocument(db, result.tripId);
  assert.equal(trip.departedAt.toMillis(), input.departedAtMillis);
  assert.equal(trip.dispatchSnapshot?.recordedAt.toMillis(), now.toMillis());
  assert.deepEqual(trip.dispatchSnapshot?.manifest, [{legId: "leg-1",
    guestId: "guest-1", guestDisplayName: "Rohan Sharma", partyId: null,
    passengers: 2, luggageUnits: 3}]);
  assert.equal(trip.dispatchSnapshot?.vehicleClass.label, "Innova / SUV");
  assert.equal(trip.dispatchSnapshot?.vehicleClass.passengerCapacity, 6);
});

for (const patch of [{programId: "foreign"}, {organizerId: "foreign"}]) {
  test(`dispatch retries recheck guest ${Object.keys(patch)[0]}`, async () => {
    const db = new FakeFirestore(readySeed());
    db.beforeCommit = async () => {
      db.beforeCommit = undefined;
      db.updateDoc("programGuests/guest-1", patch);
    };
    await assert.rejects(dispatch(db), isPrecondition);
    assert.equal(db.getDoc("programTravelLegs/leg-1")?.readiness, "ready");
    assert.equal([...db.docs.keys()].some((id) =>
      id.startsWith("transportTrips/")), false);
  });
}

for (const displayName of ["", "x".repeat(141)]) {
  test(`invalid guest name length ${displayName.length} cannot be snapshotted`,
    async () => {
      const db = new FakeFirestore(readySeed());
      db.updateDoc("programGuests/guest-1", {displayName});
      await assert.rejects(dispatch(db), isPrecondition);
    });
}

test("a missing guest cannot be dispatched with only a journey reference",
  async () => {
    const db = new FakeFirestore(readySeed());
    db.docs.delete("programGuests/guest-1");
    await assert.rejects(dispatch(db), isPrecondition);
  });

test("a concurrent name edit is captured at commit", async () => {
  const db = new FakeFirestore(readySeed());
  db.beforeCommit = async () => {
    db.beforeCommit = undefined;
    db.updateDoc("programGuests/guest-1", {displayName: "Corrected name"});
  };
  const result = await dispatch(db);
  assert.equal(tripDocument(db, result.tripId)
    .dispatchSnapshot?.manifest[0].guestDisplayName, "Corrected name");
});

test("saved manifests survive changed or deleted source records and replay",
  async () => {
    const db = new FakeFirestore(readySeed());
    const result = await dispatch(db);
    const snapshot = tripDocument(db, result.tripId).dispatchSnapshot;
    db.docs.delete("programGuests/guest-1");
    db.docs.delete("programTravelLegs/leg-1");
    db.updateDoc("organizerPrograms/program-1", {transportSettings: {
      ...(db.getDoc("organizerPrograms/program-1")!
        .transportSettings as object),
      vehicleClasses: [],
    }});
    const replay = await dispatch(db);
    assert.equal(replay.tripId, result.tripId);
    assert.equal(replay.alreadyApplied, true);
    assert.deepEqual(tripDocument(db, result.tripId).dispatchSnapshot,
      snapshot);
  });

for (const action of [markProgramTripArrivedHandler, voidProgramTripHandler]) {
  test(`${action.name} preserves the original dispatch snapshot`, async () => {
    const db = new FakeFirestore(readySeed());
    const created = await dispatch(db);
    const before = tripDocument(db, created.tripId).dispatchSnapshot;
    await action(request({programId: "program-1", tripId: created.tripId,
      expectedRevision: 1, clientOperationId: "complete-trip",
      reason: "Wrong dispatch"}, "dispatcher-1"), deps(db));
    assert.deepEqual(tripDocument(db, created.tripId).dispatchSnapshot, before);
  });
}
