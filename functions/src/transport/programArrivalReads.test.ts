import assert from "node:assert/strict";
import test from "node:test";
import {HttpsError} from "firebase-functions/v2/https";
import {baseSeed, deps, request} from "../shared/testing/programFixtures";
import {FakeFirestore} from "../shared/testing/programFirestore";
import {getProgramTransportPlanHandler} from "./programArrivals";
import {programResourceScopes} from "../shared/programResourceScopes";

for (const handler of [getProgramTransportPlanHandler]) {
  test(`${handler.name}: busy foreign station cannot crowd out assigned rows`,
    async () => {
      const seed = baseSeed();
      const visible = seed["programTravelLegs/leg-1"];
      delete seed["programTravelLegs/leg-1"];
      for (let index = 0; index < 505; index++) {
        seed[`programTravelLegs/hidden-${index}`] = {
          ...visible, pickupPointId: "pp-t1",
        };
      }
      seed["programTravelLegs/leg-1"] = visible;
      const result = await handler(request({programId: "program-1"},
        "greeter-1"), deps(new FakeFirestore(seed)));
      const ids = result.groups.flatMap((group) => group.legIds);
      assert.deepEqual(ids, ["leg-1"]);
    });

  test(`${handler.name}: foreign ownership is filtered before the roster cap`,
    async () => {
      const seed = baseSeed();
      for (let index = 0; index < 505; index++) {
        seed[`programTravelLegs/foreign-${index}`] = {
          ...seed["programTravelLegs/leg-1"], organizerId: "other",
        };
      }
      const result = await handler(request({programId: "program-1"},
        "greeter-1"), deps(new FakeFirestore(seed)));
      const ids = result.groups.flatMap((group) => group.legIds);
      assert.deepEqual(ids, ["leg-1"]);
    });

  test(`${handler.name}: oversize view is explicit, never a partial manifest`,
    async () => {
      const seed = baseSeed();
      for (let index = 0; index < 500; index++) {
        seed[`programTravelLegs/visible-${index}`] = {
          ...seed["programTravelLegs/leg-1"],
        };
      }
      await assert.rejects(handler(request({programId: "program-1"},
        "greeter-1"), deps(new FakeFirestore(seed))), (error: unknown) =>
        error instanceof HttpsError && error.code === "resource-exhausted");
    });
}

const planLegIds = (result: Awaited<
  ReturnType<typeof getProgramTransportPlanHandler>>): string[] => [
  ...result.groups.flatMap((group) => group.legIds),
  ...result.unassigned.map((row) => row.legId),
].sort();

test("arrivals duty scopes keep pickup AND hotel within the same assignment",
  async () => {
    const seed = baseSeed();
    seed["programStaffGrants/program-1__dispatcher-1"].duties = [{
      duty: "airportGreeter",
      expiresAtMillis: 1_800_086_400_000,
      pickupPointIds: ["pp-t3"], hotelIds: ["hotel-2"],
    }, {
      duty: "transportDispatcher",
      expiresAtMillis: 1_800_086_400_000,
      pickupPointIds: ["pp-t1"], hotelIds: [],
    }];
    seed["programTravelLegs/hotel-two"] = {
      ...seed["programTravelLegs/leg-1"], destinationHotelId: "hotel-2",
    };
    const result = await getProgramTransportPlanHandler(
      request({programId: "program-1"}, "dispatcher-1"),
      deps(new FakeFirestore(seed)));
    assert.deepEqual(planLegIds(result), ["hotel-two", "leg-2"]);
  });

test("an explicit station request does not inherit another duty's hotel scope",
  async () => {
    const seed = baseSeed();
    seed["programStaffGrants/program-1__dispatcher-1"].duties = [{
      duty: "airportGreeter",
      expiresAtMillis: 1_800_086_400_000,
      pickupPointIds: ["pp-t3"], hotelIds: ["hotel-2"],
    }, {
      duty: "transportDispatcher",
      expiresAtMillis: 1_800_086_400_000,
      pickupPointIds: ["pp-t1"], hotelIds: [],
    }];
    const result = await getProgramTransportPlanHandler(request({
      programId: "program-1", pickupPointId: "pp-t3",
    }, "dispatcher-1"), deps(new FakeFirestore(seed)));
    assert.deepEqual(planLegIds(result), []);
  });

test("resource queries obey the Firestore disjunction limit with readiness IN",
  () => {
    const pickupPointIds = Array.from({length: 12}, (_, i) => `pickup-${i}`);
    const hotelIds = Array.from({length: 24}, (_, i) => `hotel-${i}`);
    const scopes = programResourceScopes([{duty: "transportDispatcher",
      expiresAtMillis: 1_800_086_400_000,

      pickupPointIds, hotelIds}], {baseDisjunctions: 3});
    const pairs = new Set<string>();
    for (const scope of scopes) {
      assert.ok(scope.pickup.length * scope.hotels.length * 3 <= 30);
      for (const pickup of scope.pickup) {
        for (const hotel of scope.hotels) pairs.add(`${pickup}:${hotel}`);
      }
    }
    assert.equal(pairs.size, pickupPointIds.length * hotelIds.length);
    assert.deepEqual(programResourceScopes([]), []);
  });
