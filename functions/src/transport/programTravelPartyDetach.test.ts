import assert from "node:assert/strict";
import test from "node:test";
import {HttpsError} from "firebase-functions/v2/https";
import {baseSeed, deps, request} from "../shared/testing/programFixtures";
import {FakeFirestore} from "../shared/testing/programFirestore";
import {upsertProgramTravelPartyHandler} from "./programTravelParties";
import {detachProgramTravelLegHandler} from "./programTravelPartyDetach";

const isCode = (code: string) => (error: unknown) =>
  error instanceof HttpsError && error.code === code;

/** Three journeys on one route, and a coordinator beside the dispatcher. */
function seed() {
  const data = baseSeed();
  data["programTravelLegs/leg-2"].pickupPointId = "pp-t3";
  data["programTravelLegs/leg-3"] = {
    ...data["programTravelLegs/leg-1"], guestId: "guest-3",
  };
  data["programStaffGrants/program-1__coordinator-1"] = {
    ...data["programStaffGrants/program-1__dispatcher-1"],
    uid: "coordinator-1", displayName: "Kavya", phoneLastFour: "0009",
    duties: [{duty: "programCoordinator", expiresAtMillis: 1_800_086_400_000,
      pickupPointIds: [], hotelIds: []}],
  };
  return data;
}

async function party(db: FakeFirestore, legIds: string[]) {
  const result = await upsertProgramTravelPartyHandler(request({
    programId: "program-1", label: "Airport group", legIds,
    dedicatedVehicle: true,
  }, "manager-1"), deps(db));
  return result.entityId;
}

function detach(db: FakeFirestore, legId: string, uid = "manager-1",
  expectedRevision = db.getDoc(`programTravelLegs/${legId}`)!.revision) {
  return detachProgramTravelLegHandler(request({programId: "program-1",
    legId, expectedRevision}, uid), deps(db));
}

test("detaching a middle journey keeps the party's label and vehicle",
  async () => {
    const db = new FakeFirestore(seed());
    const partyId = await party(db, ["leg-1", "leg-2", "leg-3"]);
    const before = db.getDoc(`programTravelParties/${partyId}`)!;
    const legBefore = db.getDoc("programTravelLegs/leg-2")!.revision as number;
    const result = await detach(db, "leg-2", "coordinator-1");
    const after = db.getDoc(`programTravelParties/${partyId}`)!;
    assert.deepEqual(after.legIds, ["leg-1", "leg-3"]);
    assert.equal(after.label, "Airport group");
    assert.equal(after.dedicatedVehicle, true);
    assert.ok((after.revision as number) > (before.revision as number));
    const leg = db.getDoc("programTravelLegs/leg-2")!;
    assert.equal(leg.partyId, null);
    assert.ok((leg.revision as number) > legBefore);
    assert.deepEqual(result, {entityId: "leg-2", revision: leg.revision,
      alreadyApplied: false});
    assert.equal(db.getDoc("programTravelLegs/leg-1")!.partyId, partyId);
    assert.equal(db.getDoc("programTravelLegs/leg-3")!.partyId, partyId);
  });

test("detaching the last journey leaves the party empty", async () => {
  const db = new FakeFirestore(seed());
  const partyId = await party(db, ["leg-1"]);
  await detach(db, "leg-1");
  const after = db.getDoc(`programTravelParties/${partyId}`)!;
  assert.deepEqual(after.legIds, []);
  assert.equal(after.label, "Airport group");
  assert.equal(db.getDoc("programTravelLegs/leg-1")!.partyId, null);
});

test("detach needs the journey's current revision", async () => {
  const db = new FakeFirestore(seed());
  const partyId = await party(db, ["leg-1", "leg-2"]);
  const stale = (db.getDoc("programTravelLegs/leg-1")!.revision as number) - 1;
  await assert.rejects(detach(db, "leg-1", "manager-1", stale),
    isCode("aborted"));
  assert.equal(db.getDoc("programTravelLegs/leg-1")!.partyId, partyId);
});

for (const uid of ["dispatcher-1", "greeter-1"]) {
  test(`detach refuses ${uid} without the coordinator duty`, async () => {
    const db = new FakeFirestore(seed());
    const partyId = await party(db, ["leg-1", "leg-2"]);
    await assert.rejects(detach(db, "leg-1", uid),
      isCode("permission-denied"));
    assert.equal(db.getDoc("programTravelLegs/leg-1")!.partyId, partyId);
  });
}

for (const readiness of ["dispatched", "arrived"]) {
  test(`detach refuses a ${readiness} journey`, async () => {
    const db = new FakeFirestore(seed());
    const partyId = await party(db, ["leg-1", "leg-2"]);
    db.updateDoc("programTravelLegs/leg-1", {readiness});
    await assert.rejects(detach(db, "leg-1"), isCode("failed-precondition"));
    assert.equal(db.getDoc("programTravelLegs/leg-1")!.partyId, partyId);
    assert.deepEqual(db.getDoc(`programTravelParties/${partyId}`)!.legIds,
      ["leg-1", "leg-2"]);
  });
}

test("a departed sibling does not block detaching a waiting journey",
  async () => {
    const db = new FakeFirestore(seed());
    const partyId = await party(db, ["leg-1", "leg-2"]);
    db.updateDoc("programTravelLegs/leg-2", {readiness: "dispatched"});
    const sibling = {...db.getDoc("programTravelLegs/leg-2")!};
    await detach(db, "leg-1");
    assert.equal(db.getDoc("programTravelLegs/leg-1")!.partyId, null);
    assert.deepEqual(db.getDoc(`programTravelParties/${partyId}`)!.legIds,
      ["leg-2"]);
    assert.deepEqual(db.getDoc("programTravelLegs/leg-2"), sibling);
  });

test("detach refuses a journey outside any party", async () => {
  const db = new FakeFirestore(seed());
  await assert.rejects(detach(db, "leg-1"), isCode("failed-precondition"));
});

test("detach refuses disagreeing membership instead of guessing",
  async () => {
    const db = new FakeFirestore(seed());
    const partyId = await party(db, ["leg-1", "leg-2"]);
    db.updateDoc(`programTravelParties/${partyId}`, {legIds: ["leg-2"]});
    await assert.rejects(detach(db, "leg-1"), isCode("failed-precondition"));
    db.updateDoc(`programTravelParties/${partyId}`,
      {legIds: ["leg-1", "leg-2"]});
    db.updateDoc("programTravelLegs/leg-2", {partyId: null});
    await assert.rejects(detach(db, "leg-1"), isCode("failed-precondition"));
    assert.equal(db.getDoc("programTravelLegs/leg-1")!.partyId, partyId);
  });

test("detach cannot reach a journey in another program", async () => {
  const db = new FakeFirestore(seed());
  await party(db, ["leg-1"]);
  db.updateDoc("programTravelLegs/leg-1", {organizerId: "other"});
  await assert.rejects(detach(db, "leg-1"), isCode("not-found"));
});
