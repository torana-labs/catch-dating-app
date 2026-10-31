import assert from "node:assert/strict";
import test from "node:test";
import * as admin from "firebase-admin";
import {HttpsError} from "firebase-functions/v2/https";
import {baseSeed, deps, request, now} from "../shared/testing/programFixtures";
import {FakeFirestore} from "../shared/testing/programFirestore";
import {getProgramArrivalsRosterHandler, getProgramTransportPlanHandler}
  from "./programArrivals";
import type {ProgramTransportPlanCallableResponse} from
  "../shared/generated/programTransportPlanCallableResponse";
import {contractValidator} from "../shared/contractTestValidators";

const validateProgramTransportPlanCallableResponse =
  contractValidator<ProgramTransportPlanCallableResponse>(
    "ProgramTransportPlanCallableResponse"
  );

async function plan(db: FakeFirestore) {
  const result = await getProgramTransportPlanHandler(
    request({programId: "program-1"}, "dispatcher-1"), deps(db));
  assert.ok(validateProgramTransportPlanCallableResponse(result),
    JSON.stringify(validateProgramTransportPlanCallableResponse.errors));
  return result;
}

test("ready party deadline starts at the first passenger's curb observation",
  async () => {
    const db = new FakeFirestore(baseSeed());
    db.updateDoc("programTravelLegs/leg-1", {partyId: "party",
      readiness: "ready", readyAt: admin.firestore.Timestamp.fromMillis(
        now.toMillis() - 20 * 60_000)});
    db.updateDoc("programTravelLegs/leg-2", {partyId: "party",
      readiness: "ready", readyAt: now, pickupPointId: "pp-t3"});
    db.setDoc("programTravelParties/party", {programId: "program-1",
      organizerId: "org-1", legIds: ["leg-1", "leg-2"]});
    const result = await plan(db);
    assert.equal(result.groups.length, 1);
    assert.equal(result.groups[0].waitOverdue, true);
    assert.equal(result.groups[0].dispatchByMillis,
      now.toMillis() - 10 * 60_000);
  });

test("manual timing cannot turn a disrupted journey into a suggested pickup",
  async () => {
    const db = new FakeFirestore(baseSeed());
    db.updateDoc("programTravelLegs/leg-1", {readiness: "disrupted",
      manualCurbAt: now});
    const result = await plan(db);
    assert.ok(result.unassigned.some((item) => item.legId === "leg-1"));
    assert.ok(result.groups.every((group) => !group.legIds.includes("leg-1")));
  });

test("hotel identifiers cannot collide with free-text destination keys",
  async () => {
    const db = new FakeFirestore(baseSeed());
    db.setDoc("programHotels/label:lobby", {
      ...db.getDoc("programHotels/hotel-1"),
      name: "Actual Hotel"});
    db.updateDoc("programTravelLegs/leg-1", {
      destinationHotelId: "label:lobby"});
    db.updateDoc("programTravelLegs/leg-2", {destinationHotelId: null,
      destinationLabel: "Lobby", pickupPointId: "pp-t3"});
    const result = await plan(db);
    assert.equal(result.groups.length, 2);
    assert.equal(result.groups.find((group) =>
      group.destinationHotelId === "label:lobby")!.destinationLabel,
    "Actual Hotel");
    assert.equal(result.groups.find((group) =>
      group.destinationHotelId === null)!.destinationLabel, "Lobby");
    const roster = await getProgramArrivalsRosterHandler(request({
      programId: "program-1",
    }, "dispatcher-1"), deps(db));
    assert.equal(roster.rows.find((row) => row.legId === "leg-1")!
      .destinationLabel, "Actual Hotel");
  });

test("unresolved journeys remain visible for assignment", async () => {
  const db = new FakeFirestore(baseSeed());
  db.updateDoc("programTravelLegs/leg-1", {pickupPointId: null});
  const result = await plan(db);
  assert.ok(result.unassigned.some((item) =>
    item.legId === "leg-1" && item.reason === "missingScope"));
});

test("more than 200 suggested groups requires narrowing the view", async () => {
  const seed = baseSeed();
  for (let i = 0; i < 200; i++) {
    seed[`programTravelLegs/private-${i}`] = {
      ...seed["programTravelLegs/leg-1"], dedicatedVehicle: true,
    };
  }
  await assert.rejects(plan(new FakeFirestore(seed)), (error: unknown) =>
    error instanceof HttpsError && error.code === "resource-exhausted");
});


for (const inParty of [false, true]) {
  test(`separate journeys for one guest remain separate (${inParty ?
    "party member" : "unpartied"})`, async () => {
    const seed = baseSeed();
    seed["programTravelLegs/leg-2"] = {...seed["programTravelLegs/leg-1"]};
    if (inParty) {
      seed["programTravelLegs/leg-1"].partyId = "party";
      seed["programTravelParties/party"] = {programId: "program-1",
        organizerId: "org-1", legIds: ["leg-1"]};
    }
    const result = await plan(new FakeFirestore(seed));
    assert.equal(result.groups.length, 2);
    assert.deepEqual(result.groups.flatMap((group) => group.legIds).sort(),
      ["leg-1", "leg-2"]);
    assert.deepEqual(result.unassigned, []);
    assert.ok(result.groups.every((group) => group.legIds.length === 1));
  });
}


for (const collection of ["programPickupPoints", "programHotels"]) {
  for (const invalid of ["missing", "inactive", "foreign-program",
    "foreign-organizer"]) {
    test(`${invalid} ${collection} keeps journeys visible but unsuggested`,
      async () => {
        const seed = baseSeed();
        const id = collection === "programHotels" ? "hotel-1" : "pp-t3";
        if (invalid === "missing") {
          delete seed[`${collection}/${id}`];
        } else {
          Object.assign(seed[`${collection}/${id}`], invalid === "inactive" ?
            {active: false} : invalid === "foreign-program" ?
              {programId: "other"} : {organizerId: "other"});
        }
        const db = new FakeFirestore(seed);
        const result = await plan(db);
        assert.ok(result.groups.every((group) =>
          !group.legIds.includes("leg-1")));
        assert.ok(result.unassigned.some((row) =>
          row.legId === "leg-1" && row.reason === "missingScope"));
        const roster = await getProgramArrivalsRosterHandler(request({
          programId: "program-1",
        }, "dispatcher-1"), deps(db));
        assert.ok(roster.rows.some((row) => row.legId === "leg-1"));
      });
  }
}

test("invalid destination keeps the entire party unassigned", async () => {
  const seed = baseSeed();
  for (const id of ["leg-1", "leg-2"]) {
    Object.assign(seed[`programTravelLegs/${id}`],
      {partyId: "party", pickupPointId: "pp-t3"});
  }
  seed["programTravelParties/party"] = {programId: "program-1",
    organizerId: "org-1", legIds: ["leg-1", "leg-2"]};
  seed["programHotels/hotel-1"].active = false;
  const result = await plan(new FakeFirestore(seed));
  assert.deepEqual(result.groups, []);
  assert.deepEqual(result.unassigned, [
    {legId: "leg-1", reason: "missingScope"},
    {legId: "leg-2", reason: "missingScope"},
  ]);
});
