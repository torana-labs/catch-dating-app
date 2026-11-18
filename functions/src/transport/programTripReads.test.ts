import assert from "node:assert/strict";
import test from "node:test";
import {baseSeed, deps, now, request} from "../shared/testing/programFixtures";
import {FakeFirestore} from "../shared/testing/programFirestore";
import {HttpsError} from "firebase-functions/v2/https";
import {listProgramTripsHandler, getProgramHotelInboundHandler}
  from "./programTripReads";

test("trip ledger does not expose another dispatch station's passengers",
  async () => {
    const seed = baseSeed();
    seed["programStaffGrants/program-1__dispatcher-1"].duties = [{
      duty: "transportDispatcher",
      expiresAtMillis: 1_800_086_400_000,
      pickupPointIds: ["pp-t3"], hotelIds: [],
    }];
    for (const [id, pickupPointId, legId] of [
      ["visible", "pp-t3", "leg-1"], ["hidden", "pp-t1", "leg-2"],
    ]) {
      seed[`transportTrips/${id}`] = {
        programId: "program-1", organizerId: "org-1", pickupPointId,
        destinationHotelId: "hotel-1", destinationLabel: "Harbourview Palace",
        vehicleClassId: "suv", plateDisplay: "DL1T4471", vendorId: null,
        vendorNameSnapshot: null, kind: "guestTransfer", status: "enRoute",
        passengerCount: 1, departedAt: now, arrivedAt: null, voidReason: null,
        legIds: [legId], revision: 1,
      };
    }
    const db = new FakeFirestore(seed);
    const result = await listProgramTripsHandler(
      request({programId: "program-1"}, "dispatcher-1"), deps(db));
    assert.deepEqual(result.trips.map((trip) => trip.tripId), ["visible"]);
    assert.deepEqual(result.trips[0].guestNames, ["Rohan Sharma"]);
  });

test("trip ledger applies each granted scope before unioning duties",
  async () => {
    const seed = baseSeed();
    seed["programStaffGrants/program-1__dispatcher-1"].duties = [{
      duty: "reconciliationViewer", expiresAtMillis: 1_800_086_400_000,
      pickupPointIds: ["pp-t3"], hotelIds: ["hotel-2"],
    }, {
      duty: "transportDispatcher",
      expiresAtMillis: 1_800_086_400_000,
      pickupPointIds: ["pp-t1"], hotelIds: [],
    }];
    for (const [id, pickupPointId, hotel] of [
      ["a", "pp-t3", "hotel-1"], ["b", "pp-t3", "hotel-2"],
      ["c", "pp-t1", "hotel-1"],
    ]) {
      seed[`transportTrips/${id}`] = {
        programId: "program-1", organizerId: "org-1", pickupPointId,
        destinationHotelId: hotel,
        legIds: [], departedAt: now,
      };
    }
    const result = await listProgramTripsHandler(
      request({programId: "program-1"}, "dispatcher-1"),
      deps(new FakeFirestore(seed)));
    assert.deepEqual(
      result.trips.map((trip) => trip.tripId).sort(), ["b", "c"]);
  });

test("a busy unassigned station cannot crowd assigned trips out of the page",
  async () => {
    const seed = baseSeed();
    seed["programStaffGrants/program-1__dispatcher-1"].duties = [{
      duty: "transportDispatcher",
      expiresAtMillis: 1_800_086_400_000,
      pickupPointIds: ["pp-t3"], hotelIds: [],
    }];
    for (let index = 0; index < 205; index++) {
      seed[`transportTrips/hidden-${index}`] = {
        programId: "program-1", organizerId: "org-1", pickupPointId: "pp-t1",
        destinationHotelId: "hotel-1", legIds: [], departedAt: now,
      };
    }
    seed["transportTrips/visible"] = {
      programId: "program-1", organizerId: "org-1", pickupPointId: "pp-t3",
      destinationHotelId: "hotel-1", legIds: [], departedAt: now,
    };
    const result = await listProgramTripsHandler(
      request({programId: "program-1"}, "dispatcher-1"),
      deps(new FakeFirestore(seed)));
    assert.deepEqual(result.trips.map((trip) => trip.tripId), ["visible"]);
  });

function trip(legIds: string[] = ["leg-1"]) {
  return {
    programId: "program-1", organizerId: "org-1", pickupPointId: "pp-t3",
    destinationHotelId: "hotel-1", destinationLabel: "Harbourview Palace",
    vehicleClassId: "suv", plateDisplay: "DL1T4471", vendorId: null,
    vendorNameSnapshot: null, kind: "guestTransfer", status: "enRoute",
    passengerCount: 1, departedAt: now, arrivedAt: null, voidReason: null,
    legIds, revision: 1,
  };
}

test("ledger pages traverse more than 200 tied trips across overlapping duties",
  async () => {
    const seed = baseSeed();
    seed["programStaffGrants/program-1__dispatcher-1"].duties = [{
      duty: "transportDispatcher", expiresAtMillis: 1_800_086_400_000,
      pickupPointIds: ["pp-t3"], hotelIds: [],
    }, {
      duty: "reconciliationViewer", expiresAtMillis: 1_800_086_400_000,
      pickupPointIds: [], hotelIds: ["hotel-1"],
    }];
    const expected = Array.from({length: 213}, (_, i) =>
      `trip-${String(i).padStart(3, "0")}`).reverse();
    for (const id of expected) seed[`transportTrips/${id}`] = trip();
    // More recent, foreign-owned records cannot occupy any page slots.
    for (let i = 0; i < 220; i++) {
      seed[`transportTrips/foreign-${i}`] = {...trip(), organizerId: "other"};
    }
    const db = new FakeFirestore(seed);
    const seen: string[] = [];
    let cursor: string | null = null;
    do {
      const page = await listProgramTripsHandler(request({
        programId: "program-1", ...(cursor ? {cursor} : {}),
      }, "dispatcher-1"), deps(db));
      assert.ok(page.trips.length <= 50);
      seen.push(...page.trips.map((row) => row.tripId));
      cursor = page.nextCursor;
      assert.ok(seen.length <= expected.length, "cursor must advance");
    } while (cursor);
    assert.deepEqual(seen, expected);
  });

test("ledger rejects absent, foreign and out-of-scope cursors", async () => {
  for (const patch of [null, {organizerId: "other"}, {programId: "other"},
    {pickupPointId: "pp-t1"}]) {
    const seed = baseSeed();
    seed["programStaffGrants/program-1__dispatcher-1"].duties = [{
      duty: "transportDispatcher", expiresAtMillis: 1_800_086_400_000,
      pickupPointIds: ["pp-t3"], hotelIds: [],
    }];
    if (patch) seed["transportTrips/cursor"] = {...trip(), ...patch};
    await assert.rejects(listProgramTripsHandler(request({
      programId: "program-1", cursor: "cursor",
    }, "dispatcher-1"), deps(new FakeFirestore(seed))),
    (error: unknown) => error instanceof HttpsError &&
      error.code === "invalid-argument");
  }
});

for (const handler of [listProgramTripsHandler,
  getProgramHotelInboundHandler]) {
  for (const patch of [{organizerId: "other"}, {programId: "other"},
    {pickupPointId: "pp-t1"}, {destinationHotelId: "hotel-2"}]) {
    test(`${handler.name} hides rebound passengers: ${JSON.stringify(patch)}`,
      async () => {
        const seed = baseSeed();
        seed["transportTrips/trip"] = trip();
        seed["programTravelLegs/leg-1"] = {
          ...seed["programTravelLegs/leg-1"], ...patch,
        };
        const result = await handler(request({programId: "program-1",
          ...(handler === getProgramHotelInboundHandler ?
            {hotelId: "hotel-1"} : {})}, "manager-1"),
        deps(new FakeFirestore(seed)));
        assert.deepEqual(result.trips[0].guestNames, []);
      });
  }
  test(`${handler.name} hides foreign guest names`, async () => {
    const seed = baseSeed();
    seed["transportTrips/trip"] = trip();
    seed["programGuests/guest-1"].organizerId = "other";
    const result = await handler(request({programId: "program-1",
      ...(handler === getProgramHotelInboundHandler ?
        {hotelId: "hotel-1"} : {})}, "manager-1"),
    deps(new FakeFirestore(seed)));
    assert.deepEqual(result.trips[0].guestNames, []);
  });
}

test("hotel inbound excludes outbound and foreign-owned expected journeys",
  async () => {
    const seed = baseSeed();
    seed["programHotels/hotel-1"].active = false;
    seed["programTravelLegs/outbound"] = {
      ...seed["programTravelLegs/leg-1"], kind: "outbound",
    };
    seed["programTravelLegs/foreign"] = {
      ...seed["programTravelLegs/leg-1"], organizerId: "other",
    };
    const result = await getProgramHotelInboundHandler(request({
      programId: "program-1", hotelId: "hotel-1",
    }, "manager-1"), deps(new FakeFirestore(seed)));
    assert.deepEqual(result.expectedLegs.map((leg) => leg.legId).sort(),
      ["leg-1", "leg-2"]);
    seed["programHotels/hotel-1"].organizerId = "other";
    await assert.rejects(getProgramHotelInboundHandler(request({
      programId: "program-1", hotelId: "hotel-1",
    }, "manager-1"), deps(new FakeFirestore(seed))),
    (error: unknown) => error instanceof HttpsError &&
      error.code === "not-found");
  });

test("hotel pages traverse tied vehicles and more than 500 expected guests",
  async () => {
    const seed = baseSeed();
    const leg = seed["programTravelLegs/leg-1"];
    delete seed["programTravelLegs/leg-1"];
    delete seed["programTravelLegs/leg-2"];
    const tripIds = Array.from({length: 213}, (_, i) =>
      `trip-${String(i).padStart(3, "0")}`);
    const legIds = Array.from({length: 513}, (_, i) =>
      `leg-${String(i).padStart(3, "0")}`);
    for (const id of tripIds) seed[`transportTrips/${id}`] = trip([]);
    for (const id of legIds) seed[`programTravelLegs/${id}`] = {...leg};
    for (let i = 0; i < 520; i++) {
      const patch = i % 3 === 0 ? {organizerId: "foreign"} :
        i % 3 === 1 ? {programId: "foreign"} :
          {destinationHotelId: "hotel-2"};
      seed[`transportTrips/foreign-${i}`] = {...trip([]), ...patch};
      seed[`programTravelLegs/foreign-${i}`] = {...leg, ...patch};
    }
    const db = new FakeFirestore(seed);
    const seenTrips: string[] = [];
    const seenLegs: string[] = [];
    let tripCursor: string | null = null;
    let expectedCursor: string | null = null;
    do {
      const page = await getProgramHotelInboundHandler(request({
        programId: "program-1", hotelId: "hotel-1",
        ...(tripCursor ? {tripCursor} : {}),
        ...(expectedCursor ? {expectedCursor} : {}),
      }, "hotelier-1"), deps(db));
      assert.ok(page.trips.length <= 50 && page.expectedLegs.length <= 50);
      // Once one stream finishes, retain its cursor while finishing the other.
      if (seenTrips.length < tripIds.length) {
        seenTrips.push(...page.trips.map((row) => row.tripId));
        tripCursor = page.nextTripCursor ?? tripCursor;
      }
      seenLegs.push(...page.expectedLegs.map((row) => row.legId));
      expectedCursor = page.nextExpectedCursor;
      assert.ok(seenLegs.length <= legIds.length, "cursor must advance");
    } while (expectedCursor);
    assert.deepEqual(seenTrips, tripIds);
    assert.deepEqual(seenLegs, legIds);
  });

test("hotel page cursors remain independent after vehicle and guest changes",
  async () => {
    const seed = baseSeed();
    for (const id of ["a", "b", "c"]) {
      seed[`transportTrips/${id}`] = trip([]);
    }
    seed["programTravelLegs/leg-3"] = {...seed["programTravelLegs/leg-2"]};
    const db = new FakeFirestore(seed);
    const read = (cursors = {}) => getProgramHotelInboundHandler(request({
      programId: "program-1", hotelId: "hotel-1", limit: 1, ...cursors,
    }, "hotelier-1"), deps(db));
    const first = await read();
    assert.equal(first.nextTripCursor, "a");
    assert.equal(first.nextExpectedCursor, "leg-1");
    const vehicles = await read({tripCursor: first.nextTripCursor});
    assert.equal(vehicles.trips[0].tripId, "b");
    assert.equal(vehicles.expectedLegs[0].legId, "leg-1");
    const guests = await read({expectedCursor: first.nextExpectedCursor});
    assert.equal(guests.trips[0].tripId, "a");
    assert.equal(guests.expectedLegs[0].legId, "leg-2");
    db.updateDoc("transportTrips/a", {status: "arrived"});
    db.updateDoc("programTravelLegs/leg-1", {readiness: "dispatched"});
    const afterDispatch = await read({
      tripCursor: "a", expectedCursor: "leg-1"});
    assert.equal(afterDispatch.trips[0].tripId, "b");
    assert.equal(afterDispatch.expectedLegs[0].legId, "leg-2");
    db.docs.delete("programTravelLegs/leg-1");
    const afterDeletion = await read({expectedCursor: "leg-1"});
    assert.equal(afterDeletion.expectedLegs[0].legId, "leg-2");
  });

test("hotel rejects missing and foreign vehicle cursors", async () => {
  for (const patch of [null, {organizerId: "other"}, {programId: "other"},
    {destinationHotelId: "hotel-2"}]) {
    const seed = baseSeed();
    if (patch) seed["transportTrips/cursor"] = {...trip(), ...patch};
    await assert.rejects(getProgramHotelInboundHandler(request({
      programId: "program-1", hotelId: "hotel-1", tripCursor: "cursor",
    }, "hotelier-1"), deps(new FakeFirestore(seed))),
    (error: unknown) => error instanceof HttpsError &&
      error.code === "invalid-argument");
  }
});

test("hotel continuation rechecks duty scope and expiry", async () => {
  const db = new FakeFirestore(baseSeed());
  const read = (hotelId: string) => getProgramHotelInboundHandler(request({
    programId: "program-1", hotelId, limit: 1, expectedCursor: "leg-1",
  }, "hotelier-1"), deps(db));
  assert.equal((await read("hotel-1")).expectedLegs[0].legId, "leg-2");
  const denied = (error: unknown) => error instanceof HttpsError &&
    error.code === "permission-denied";
  await assert.rejects(read("hotel-2"), denied);
  db.updateDoc("programStaffGrants/program-1__hotelier-1", {expiresAt: now});
  await assert.rejects(read("hotel-1"), denied);
});

test("hotel hydrates only the selected expected guest page", async () => {
  const db = new FakeFirestore(baseSeed());
  const reads: string[] = [];
  const get = db.getDoc.bind(db);
  db.getDoc = (path) => {
    reads.push(path);
    return get(path);
  };
  const page = await getProgramHotelInboundHandler(request({
    programId: "program-1", hotelId: "hotel-1", limit: 1,
  }, "hotelier-1"), deps(db));
  assert.equal(page.nextExpectedCursor, "leg-1");
  assert.deepEqual(reads.filter((path) => path.startsWith("programGuests/")),
    ["programGuests/guest-1"]);
});
