import assert from "node:assert/strict";
import test from "node:test";
import {baseSeed, deps, now, request} from "../shared/testing/programFixtures";
import {FakeFirestore} from "../shared/testing/programFirestore";
import {getProgramTransportPlanHandler} from "./programArrivals";

const at = now.toMillis();
const duty = (name: string, expiresAtMillis: number,
  pickupPointIds: string[] = [],
  hotelIds: string[] = []) => ({duty: name, expiresAtMillis,
  pickupPointIds, hotelIds});
const requestData = {programId: "program-1", pickupPointId: "pp-t3"};
const cases = [
  [getProgramTransportPlanHandler, {programId: requestData.programId,
    pickupPointId: requestData.pickupPointId}, at + 1000],
] as const;

for (const [handler, payload, deadline] of cases) {
  test(`${handler.name} expires only on contributing duties`, async () => {
    const seed = baseSeed();
    seed["programStaffGrants/program-1__dispatcher-1"].duties = [
      duty("transportDispatcher", at + 1000, ["pp-t3"]),
      duty("transportDispatcher", at + 5000, ["pp-t3"], ["hotel-1"]),
      duty("airportGreeter", at + 500, ["pp-t1"]),
      duty("hotelDesk", at + 9000, [], ["hotel-1"]),
      duty("hotelDesk", at + 400, [], ["hotel-2"]),
    ];
    const db = new FakeFirestore(seed);
    const result = await handler(request(payload, "dispatcher-1"), deps(db));
    assert.equal(result.accessExpiresAtMillis, deadline);
    const manager = await handler(request(payload, "manager-1"), deps(db));
    assert.equal(manager.accessExpiresAtMillis, null);
  });
}

test("a narrower remaining airport duty receives a fresh projection deadline",
  async () => {
    const seed = baseSeed();
    seed["programStaffGrants/program-1__dispatcher-1"].duties = [
      duty("transportDispatcher", at, ["pp-t3"]),
      duty("transportDispatcher", at + 5000, ["pp-t3"], ["hotel-1"]),
    ];
    const result = await getProgramTransportPlanHandler(request({
      programId: "program-1", pickupPointId: "pp-t3",
    }, "dispatcher-1"), deps(new FakeFirestore(seed)));
    assert.equal(result.accessExpiresAtMillis, at + 5000);
    assert.deepEqual([...result.groups.flatMap((group) => group.legIds),
      ...result.unassigned.map((row) => row.legId)], ["leg-1"]);
  });
