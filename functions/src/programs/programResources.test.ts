import assert from "node:assert/strict";
import test from "node:test";
import {baseSeed, deps, request, now} from "../shared/testing/programFixtures";
import {FakeFirestore} from "../shared/testing/programFirestore";
import {listTransportVendorsHandler, upsertProgramFunctionHandler,
  upsertProgramHotelHandler, upsertProgramPickupPointHandler,
  upsertTransportVendorHandler} from "./programResources";
import {createOrganizerProgramHandler} from "./programs";

const scopes = [
  {label: "hotel", path: "programHotels/hotel-1",
    handler: upsertProgramHotelHandler,
    input: {hotelId: "hotel-1", name: "Updated hotel", address: "Address"}},
  {label: "pickup", path: "programPickupPoints/pp-t3",
    handler: upsertProgramPickupPointHandler,
    input: {pickupPointId: "pp-t3", kind: "airport", label: "New pickup"}},
  {label: "function", path: "programFunctions/function-1",
    handler: upsertProgramFunctionHandler,
    input: {functionId: "function-1", name: "Ceremony", venueName: "Venue",
      startsAtMillis: now.toMillis(), endsAtMillis: now.toMillis() + 60_000}},
];
function resourceSeed() {
  return {...baseSeed(), "programFunctions/function-1": {
    programId: "program-1", organizerId: "org-1", name: "Old function",
    venueName: "Venue", venueNotes: null, status: "scheduled",
    startsAt: now, endsAt: now, createdAt: now, updatedAt: now, revision: 1,
  }};
}
const revokeManager = (db: FakeFirestore) => {
  db.updateDoc("organizers/org-1", {ownerUserId: "other",
    hostUserId: "other", hostUserIds: ["other"], hostProfiles: []});
};
const code = (expected: string) => (error: unknown) =>
  (error as {code?: string}).code === expected;

for (const scope of scopes) {
  const update = (db: FakeFirestore, extra: object = {}, uid = "manager-1") =>
    scope.handler(request({programId: "program-1", expectedRevision: 1,
      ...scope.input, ...extra}, uid), deps(db));

  test(`${scope.label} update commits with current ownership`, async () => {
    const db = new FakeFirestore(resourceSeed());
    const result = await update(db);
    assert.ok(result.revision > 1);
    assert.equal(db.getDoc(scope.path)!.organizerId, "org-1");
    assert.equal(db.getDoc(scope.path)!.revision, result.revision);
  });

  test(`${scope.label} fails after creator account deletion`, async () => {
    const db = new FakeFirestore(resourceSeed());
    const before = db.getDoc(scope.path);
    db.beforeCommit = async () => {
      db.beforeCommit = undefined;
      db.setDoc("deletedUsers/manager-1", {deletedAt: now});
    };
    await assert.rejects(update(db), code("permission-denied"));
    assert.deepEqual(db.getDoc(scope.path), before);
  });

  test(`${scope.label} cannot overwrite changed organizer ownership`,
    async () => {
      const db = new FakeFirestore(resourceSeed());
      db.beforeCommit = async () => {
        db.beforeCommit = undefined;
        db.updateDoc(scope.path, {organizerId: "foreign"});
      };
      await assert.rejects(update(db), code("not-found"));
      assert.equal(db.getDoc(scope.path)!.organizerId, "foreign");
      assert.equal(db.getDoc(scope.path)!.revision, 1);
    });

  test(`${scope.label} with an expected revision cannot recreate a missing row`,
    async () => {
      const db = new FakeFirestore(resourceSeed());
      db.docs.delete(scope.path);
      await assert.rejects(update(db), code("failed-precondition"));
      assert.equal(db.getDoc(scope.path), undefined);
    });

  test(`${scope.label} observes coordinator revocation on transaction retry`,
    async () => {
      const db = new FakeFirestore(resourceSeed());
      db.updateDoc("programStaffGrants/program-1__dispatcher-1", {
        duties: [{duty: "programCoordinator",
          expiresAtMillis: 1_800_086_400_000,

          pickupPointIds: [], hotelIds: []}],
      });
      db.beforeCommit = async () => {
        db.beforeCommit = undefined;
        db.updateDoc("programStaffGrants/program-1__dispatcher-1",
          {status: "revoked"});
      };
      await assert.rejects(update(db, {}, "dispatcher-1"),
        code("permission-denied"));
      assert.equal(db.getDoc(scope.path)!.revision, 1);
    });
}

const vendorEdit = (db: FakeFirestore, patch: object = {}) =>
  upsertTransportVendorHandler(request({organizerId: "org-1",
    vendorId: "vendor-1", name: "Updated vendor", expectedRevision: 1,
    ...patch}, "manager-1"), deps(db));

test("vendor writes recheck manager authority", async () => {
  const db = new FakeFirestore(baseSeed());
  db.beforeCommit = async () => {
    db.beforeCommit = undefined;
    revokeManager(db);
  };
  await assert.rejects(vendorEdit(db), code("permission-denied"));
  assert.equal(db.getDoc("transportVendors/vendor-1")!.name, "Harbour Line Cabs");
});

for (const includePrograms of [false, true]) {
  test(`vendor revalidates retained/new bindings (${includePrograms})`,
    async () => {
      const db = new FakeFirestore(baseSeed());
      db.beforeCommit = async () => {
        db.beforeCommit = undefined;
        db.updateDoc("organizerPrograms/program-1", {organizerId: "foreign"});
      };
      await assert.rejects(vendorEdit(db,
        includePrograms ? {programIds: ["program-1"]} : {}),
      code("invalid-argument"));
      assert.equal(db.getDoc("transportVendors/vendor-1")!.revision, 1);
    });
}

test("vendor missing with an expected revision is not silently recreated",
  async () => {
    const db = new FakeFirestore(baseSeed());
    await assert.rejects(vendorEdit(db, {vendorId: "missing"}),
      code("failed-precondition"));
  });

test("vendor program removal can clear a stale binding", async () => {
  const db = new FakeFirestore(baseSeed());
  db.updateDoc("organizerPrograms/program-1", {organizerId: "foreign"});
  await vendorEdit(db, {programIds: []});
  assert.deepEqual(db.getDoc("transportVendors/vendor-1")!.programIds, []);
});

const list = (db: FakeFirestore, patch: object = {}, uid = "dispatcher-1") =>
  listTransportVendorsHandler(request({organizerId: "org-1",
    programId: "program-1", ...patch}, uid), deps(db));

test("program authority cannot enumerate another organizer's vendors",
  async () => {
    const db = new FakeFirestore(baseSeed());
    db.setDoc("transportVendors/foreign", {
      ...db.getDoc("transportVendors/vendor-1"), organizerId: "foreign",
    });
    await assert.rejects(list(db, {organizerId: "foreign"}),
      code("permission-denied"));
  });

test("unbound and inactive vendors cannot consume the program picker limit",
  async () => {
    const db = new FakeFirestore(baseSeed());
    for (let i = 0; i < 120; i++) {
      db.setDoc(`transportVendors/unbound-${i}`, {
        ...db.getDoc("transportVendors/vendor-1"), programIds: ["other"],
      });
      db.setDoc(`transportVendors/inactive-${i}`, {
        ...db.getDoc("transportVendors/vendor-1"), active: false,
      });
    }
    db.setDoc("transportVendors/last-bound", {
      ...db.getDoc("transportVendors/vendor-1"), name: "Late valid vendor",
    });
    const result = await list(db);
    assert.deepEqual(result.vendors.map((vendor) => vendor.vendorId).sort(),
      ["last-bound", "vendor-1"]);
    assert.ok(result.vendors.every((v) => v.boundToProgram && v.active));
    assert.ok(result.vendors.every((v) => !("phoneE164" in v)));
  });

test("organizer inventory remains manager-only and includes unbound vendors",
  async () => {
    const db = new FakeFirestore(baseSeed());
    db.setDoc("transportVendors/unbound", {
      ...db.getDoc("transportVendors/vendor-1"), programIds: [],
    });
    const result = await list(db, {programId: undefined}, "manager-1");
    assert.equal(result.vendors.length, 2);
    await assert.rejects(list(db, {programId: undefined}),
      code("permission-denied"));
  });

test("vendor picker reports overflow instead of presenting an incomplete list",
  async () => {
    const db = new FakeFirestore(baseSeed());
    for (let i = 0; i < 100; i++) {
      db.setDoc(`transportVendors/active-${i}`, {
        ...db.getDoc("transportVendors/vendor-1"),
      });
    }
    await assert.rejects(list(db), code("resource-exhausted"));
  });

test("program creation cannot commit after organizer management is revoked",
  async () => {
    const db = new FakeFirestore(baseSeed());
    db.beforeCommit = async () => {
      db.beforeCommit = undefined;
      revokeManager(db);
    };
    await assert.rejects(createOrganizerProgramHandler(request({
      organizerId: "org-1", kind: "wedding", title: "Program",
      timezone: "Asia/Kolkata", startsAtMillis: now.toMillis(),
      endsAtMillis: now.toMillis() + 60_000,
      capabilities: ["arrivalsTransport"],
    }, "manager-1"), deps(db)), code("permission-denied"));
    assert.equal([...db.docs.keys()].filter((path) =>
      path.startsWith("organizerPrograms/")).length, 1);
  });
