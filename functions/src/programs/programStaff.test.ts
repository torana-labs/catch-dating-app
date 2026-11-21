import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {baseSeed, deps, now, request} from "../shared/testing/programFixtures";
import {FakeFirestore} from "../shared/testing/programFirestore";
import {getProgramWorkAccessHandler, grantProgramStaffHandler,
  revokeProgramStaffHandler} from "./programStaff";

const payload = {programId: "program-1", phoneNumber: "+919900001111",
  expiresAtMillis: now.toMillis() + 60_000,
  duties: [{duty: "airportGreeter", pickupPointIds: ["pp-t3"], hotelIds: []}]};
const code = (expected: string) => (error: unknown) =>
  (error as {code?: string}).code === expected;

for (const patch of [{active: false}, {programId: "foreign"},
  {organizerId: "foreign"}]) {
  test(`direct grants recheck resource changes: ${JSON.stringify(patch)}`,
    async () => {
      const store = new FakeFirestore(baseSeed());
      store.beforeCommit = async () => {
        store.beforeCommit = undefined;
        store.updateDoc("programPickupPoints/pp-t3", patch);
      };
      await assert.rejects(grantProgramStaffHandler(
        request(payload, "manager-1"), deps(store)), code("invalid-argument"));
      assert.equal(store.getDoc("programStaffGrants/program-1__new-staff-1"),
        undefined);
    });
}

for (const duties of [
  [{duty: "hotelDesk", pickupPointIds: ["pp-t3"], hotelIds: ["hotel-1"]}],
  [{duty: "programCoordinator", pickupPointIds: [], hotelIds: ["hotel-1"]}],
]) {
  test("direct grants reject misleading named-duty scope", async () => {
    const store = new FakeFirestore(baseSeed());
    await assert.rejects(grantProgramStaffHandler(
      request({...payload, duties}, "manager-1"), deps(store)),
    code("invalid-argument"));
    assert.equal(store.transactionCommits, 0);
  });
}

test("direct grant retries reject a deleted creator", async () => {
  const store = new FakeFirestore(baseSeed());
  store.beforeCommit = async () => {
    store.beforeCommit = undefined;
    store.setDoc("deletedUsers/manager-1", {deletedAt: now});
  };
  await assert.rejects(grantProgramStaffHandler(
    request(payload, "manager-1"), deps(store)), code("permission-denied"));
  assert.equal(store.getDoc("programStaffGrants/program-1__new-staff-1"),
    undefined);
});

for (const patch of [{organizerId: "foreign"}, {programId: "foreign"},
  {uid: "other-user"}]) {
  test(`staff mutations preserve foreign bindings: ${JSON.stringify(patch)}`,
    async () => {
      const store = new FakeFirestore(baseSeed());
      const foreign = {
        ...store.getDoc("programStaffGrants/program-1__greeter-1"),
        ...patch};
      store.setDoc("programStaffGrants/program-1__greeter-1", foreign);
      store.setDoc("programStaffGrants/program-1__new-staff-1",
        {...foreign, uid: "new-staff-1", ...patch});
      await assert.rejects(grantProgramStaffHandler(
        request(payload, "manager-1"), deps(store)),
      code("failed-precondition"));
      await assert.rejects(revokeProgramStaffHandler(request({
        programId: "program-1", uid: "greeter-1", expectedRevision: 1,
      }, "manager-1"), deps(store)), code("not-found"));
      assert.deepEqual(store.getDoc("programStaffGrants/program-1__greeter-1"),
        foreign);
    });
}

for (const [collection, existingId, uid, field] of [
  ["programPickupPoints", "pp-t3", "greeter-1", "pickupPoints"],
  ["programHotels", "hotel-1", "hotelier-1", "hotels"],
] as const) {
  test(`assigned ${collection} cannot be crowded out by unrelated resources`,
    async () => {
      const seed = baseSeed();
      const noise = Object.fromEntries(Array.from({length: 80}, (_, i) =>
        [`${collection}/noise-${i}`, seed[`${collection}/${existingId}`]]));
      const store = new FakeFirestore({...noise, ...seed});
      const access = await getProgramWorkAccessHandler(
        request({programId: "program-1"}, uid), deps(store));
      assert.equal(access[field].length, 1);
      if (field === "pickupPoints") {
        assert.equal(access.pickupPoints[0].pickupPointId, existingId);
      } else {
        assert.equal(access.hotels[0].hotelId, existingId);
        assert.deepEqual(access.pickupPoints, []);
      }
    });

  test(`unrestricted ${collection} overflow is explicit`, async () => {
    const seed = baseSeed();
    const noise = Object.fromEntries(Array.from({length: 80}, (_, i) =>
      [`${collection}/noise-${i}`, seed[`${collection}/${existingId}`]]));
    const store = new FakeFirestore({...noise, ...seed});
    await assert.rejects(getProgramWorkAccessHandler(
      request({programId: "program-1"}, "manager-1"), deps(store)),
    code("resource-exhausted"));
  });

  test(`foreign ${collection} cannot occupy the current owner's page`,
    async () => {
      const seed = baseSeed();
      const noise = Object.fromEntries(Array.from({length: 80}, (_, i) =>
        [`${collection}/noise-${i}`, {...seed[`${collection}/${existingId}`],
          organizerId: "foreign"}]));
      const store = new FakeFirestore({...noise, ...seed});
      const access = await getProgramWorkAccessHandler(
        request({programId: "program-1"}, "manager-1"), deps(store));
      assert.equal(access[field].length, 2);
    });
}

for (const patch of [{active: false}, {organizerId: "foreign"},
  {programId: "foreign"}]) {
  test(`bootstrap omits stale resource bindings: ${JSON.stringify(patch)}`,
    async () => {
      const store = new FakeFirestore(baseSeed());
      store.updateDoc("programPickupPoints/pp-t3", patch);
      const access = await getProgramWorkAccessHandler(
        request({programId: "program-1"}, "greeter-1"), deps(store));
      assert.deepEqual(access.pickupPoints, []);
    });
}

test("the union of individually bounded assignments cannot truncate bootstrap",
  async () => {
    const store = new FakeFirestore(baseSeed());
    const ids = Array.from({length: 33}, (_, i) => `point-${i}`);
    for (const id of ids) {
      store.setDoc(`programPickupPoints/${id}`,
        store.getDoc("programPickupPoints/pp-t3")!);
    }
    store.updateDoc("programStaffGrants/program-1__greeter-1", {duties:
      [ids.slice(0, 16), ids.slice(16)].map((pickupPointIds) => ({
        duty: "airportGreeter", pickupPointIds, hotelIds: [],
        expiresAtMillis: now.toMillis() + 60_000,
      }))});
    await assert.rejects(getProgramWorkAccessHandler(
      request({programId: "program-1"}, "greeter-1"), deps(store)),
    code("resource-exhausted"));
  });

for (const action of ["grant", "revoke"]) {
  test(`${action} returns the committed receipt without a follow-up read`,
    async () => {
      const db = new FakeFirestore(baseSeed());
      const query = db.runQuery.bind(db);
      const get = db.getDoc.bind(db);
      db.runQuery = async (input) => {
        assert.equal(db.transactionCommits, 0, "no post-commit list query");
        return query(input);
      };
      db.getDoc = (path) => {
        assert.equal(db.transactionCommits, 0, "no post-commit document read");
        return get(path);
      };
      const receipt = action === "grant" ? await grantProgramStaffHandler(
        request(payload, "manager-1"), deps(db)) :
        await revokeProgramStaffHandler(request({
          programId: "program-1", uid: "greeter-1", expectedRevision: 1,
        }, "manager-1"), deps(db));
      const uid = action === "grant" ? "new-staff-1" : "greeter-1";
      const stored = db.docs.get(`programStaffGrants/program-1__${uid}`)!;
      assert.deepEqual(receipt, {entityId: uid, revision: stored.revision,
        alreadyApplied: false});
      assert.equal(stored.status, action === "grant" ? "active" : "revoked");
      assert.equal(db.transactionCommits, 1);
    });
}

for (const organizerId of ["org-1", "foreign"]) {
  test(`direct staff quota counts current owner only: ${organizerId}`,
    async () => {
      const seed = baseSeed();
      for (let i = 0; i < 100; i++) {
        const uid = `quota-${i}`;
        seed[`programStaffGrants/program-1__${uid}`] = {
          ...seed["programStaffGrants/program-1__greeter-1"], uid, organizerId};
      }
      const db = new FakeFirestore(seed);
      const grant = grantProgramStaffHandler(request(payload, "manager-1"),
        deps(db));
      if (organizerId === "org-1") {
        await assert.rejects(grant, code("resource-exhausted"));
        assert.equal(db.transactionCommits, 0);
      } else {
        assert.equal((await grant).entityId, "new-staff-1");
        assert.equal(db.transactionCommits, 1);
      }
    });
}

const functionDoc = (id: string, patch: Record<string, unknown> = {}) => ({
  programId: "program-1", organizerId: "org-1", name: id,
  startsAt: now, endsAt: now,
  venueName: "Venue", venueNotes: null, venueLocation: null,
  dressCode: null, instructions: null, invitationMode: "selectedGuests",
  checkInEnabled: true, expectedCount: 3, checkedInCount: 1,
  status: "scheduled", createdAt: now, updatedAt: now, revision: 1,
  ...patch,
});

const doorGrant = (uid: string, duty: string, functionIds?: string[]) => ({
  organizerId: "org-1", programId: "program-1", uid, displayName: uid,
  phoneLastFour: "0000",
  duties: [{
    duty, expiresAtMillis: now.toMillis() + 60_000,
    pickupPointIds: [], hotelIds: [],
    ...(functionIds === undefined ? {} : {functionIds}),
  }],
  status: "active", createdBy: "manager-1", createdAt: now,
  expiresAt: Timestamp.fromMillis(now.toMillis() + 86_400_000),
  revokedBy: null, revokedAt: null, updatedAt: now,
  revision: 1,
});

test("work access lists functions for door and guest duties, scoped by grant",
  async () => {
    const seed = baseSeed();
    seed["programFunctions/fn-sangeet"] = functionDoc("fn-sangeet");
    seed["programFunctions/fn-mehndi"] = functionDoc("fn-mehndi");
    seed["programFunctions/fn-foreign"] = functionDoc("fn-foreign",
      {organizerId: "foreign"});
    seed["programStaffGrants/program-1__door-1"] =
      doorGrant("door-1", "functionCheckIn", ["fn-sangeet"]);
    seed["programStaffGrants/program-1__lead-1"] =
      doorGrant("lead-1", "functionLead");
    seed["programStaffGrants/program-1__guest-1"] =
      doorGrant("guest-1", "guestRelations");
    const store = new FakeFirestore(seed);

    const scoped = await getProgramWorkAccessHandler(
      request({programId: "program-1"}, "door-1"), deps(store));
    assert.deepEqual(
      scoped.functions.map((f) => f.functionId), ["fn-sangeet"]);
    assert.equal(scoped.functions[0].checkInEnabled, true);
    assert.equal(scoped.functions[0].expectedCount, 3);

    const lead = await getProgramWorkAccessHandler(
      request({programId: "program-1"}, "lead-1"), deps(store));
    assert.deepEqual(
      lead.functions.map((f) => f.functionId).sort(),
      ["fn-mehndi", "fn-sangeet"]);

    // guestRelations is program-scoped — the desk sees every function.
    const guestDesk = await getProgramWorkAccessHandler(
      request({programId: "program-1"}, "guest-1"), deps(store));
    assert.deepEqual(
      guestDesk.functions.map((f) => f.functionId).sort(),
      ["fn-mehndi", "fn-sangeet"]);

    const manager = await getProgramWorkAccessHandler(
      request({programId: "program-1"}, "manager-1"), deps(store));
    assert.equal(manager.functions.length, 2);

    const greeter = await getProgramWorkAccessHandler(
      request({programId: "program-1"}, "greeter-1"), deps(store));
    assert.deepEqual(greeter.functions, []);
  });

test("scoped door staff are not crowded out by unrelated functions",
  async () => {
    const seed = baseSeed();
    const noise = Object.fromEntries(Array.from({length: 80}, (_, i) =>
      [`programFunctions/fn-noise-${i}`, functionDoc(`fn-noise-${i}`)]));
    Object.assign(seed, noise);
    seed["programFunctions/fn-mine"] = functionDoc("fn-mine");
    seed["programStaffGrants/program-1__door-1"] =
      doorGrant("door-1", "functionCheckIn", ["fn-mine"]);
    const store = new FakeFirestore(seed);
    const access = await getProgramWorkAccessHandler(
      request({programId: "program-1"}, "door-1"), deps(store));
    assert.deepEqual(
      access.functions.map((f) => f.functionId), ["fn-mine"]);
  });

test("unrestricted function overflow is explicit", async () => {
  const seed = baseSeed();
  for (let i = 0; i < 60; i++) {
    seed[`programFunctions/fn-${i}`] = functionDoc(`fn-${i}`);
  }
  const store = new FakeFirestore(seed);
  await assert.rejects(getProgramWorkAccessHandler(
    request({programId: "program-1"}, "manager-1"), deps(store)),
  code("resource-exhausted"));
});

function adminStore(deadline = now.toMillis() + 60_000) {
  const seed = baseSeed();
  seed["programStaffGrants/program-1__admin-1"] = {
    ...seed["programStaffGrants/program-1__greeter-1"], uid: "admin-1",
    duties: [{duty: "programAdmin", pickupPointIds: [], hotelIds: [],
      expiresAtMillis: deadline}],
    expiresAt: Timestamp.fromMillis(deadline),
    programAuthorization: {ownerUid: "manager-1", approvedByUid: "manager-1",
      approvedAtMillis: now.toMillis() - 1, authorizedUntilMillis: deadline},
  };
  return new FakeFirestore(seed);
}

test("creator retains delegation after every organizer role is removed",
  async () => {
    const db = new FakeFirestore(baseSeed());
    db.updateDoc("organizers/org-1", {ownerUserId: "other",
      hostUserId: "other", hostUserIds: [], hostProfiles: []});
    const receipt = await grantProgramStaffHandler(
      request(payload, "manager-1"), deps(db));
    const grant = db.getDoc(
      `programStaffGrants/program-1__${receipt.entityId}`)!;
    assert.deepEqual(grant.programAuthorization, {ownerUid: "manager-1",
      approvedByUid: "manager-1", approvedAtMillis: now.toMillis(),
      authorizedUntilMillis: payload.expiresAtMillis});
  });

for (const actor of ["organizer-only", "greeter-1", "dispatcher-1"]) {
  test(`organizer or operational duty cannot delegate: ${actor}`, async () => {
    const db = new FakeFirestore(baseSeed());
    db.updateDoc("organizers/org-1", {ownerUserId: actor,
      hostUserId: actor, hostUserIds: [actor]});
    await assert.rejects(grantProgramStaffHandler(
      request(payload, actor), deps(db)), code("permission-denied"));
    assert.equal(db.transactionCommits, 0);
  });
}

test("explicit admin delegates only within its creator-approved deadline",
  async () => {
    const db = adminStore();
    const result = await grantProgramStaffHandler(
      request(payload, "admin-1"), deps(db));
    assert.equal(result.entityId, "new-staff-1");
    const stored = db.getDoc("programStaffGrants/program-1__new-staff-1")!;
    assert.equal((stored.programAuthorization as {approvedByUid: string})
      .approvedByUid, "admin-1");
    await assert.rejects(grantProgramStaffHandler(request({...payload,
      expiresAtMillis: payload.expiresAtMillis + 1}, "admin-1"), deps(db)),
    code("permission-denied"));
  });

test("admin bootstrap remains expiring staff with no operational resources",
  async () => {
    const access = await getProgramWorkAccessHandler(
      request({programId: "program-1"}, "admin-1"), deps(adminStore()));
    assert.equal(access.actorRole, "staff");
    assert.equal(access.grantExpiresAtMillis, payload.expiresAtMillis);
    assert.deepEqual(access.pickupPoints, []);
    assert.deepEqual(access.hotels, []);
    assert.deepEqual(access.functions, []);
  });

test("admin cannot extend itself or a peer through renewal", async () => {
  const db = adminStore();
  const selfDeps = deps(db, {getUserByPhoneNumber: async () =>
    ({uid: "admin-1", displayName: "Admin"})});
  await assert.rejects(grantProgramStaffHandler(request({...payload,
    duties: [{duty: "programAdmin", pickupPointIds: [], hotelIds: []}],
    expiresAtMillis: payload.expiresAtMillis + 1}, "admin-1"), selfDeps),
  code("permission-denied"));
  assert.equal(db.getDoc("programStaffGrants/program-1__admin-1")?.revision, 1);
});

test("creator reissue replaces legacy duties and preserves creation audit",
  async () => {
    const db = adminStore();
    const legacy = {...db.getDoc("programStaffGrants/program-1__greeter-1"),
      uid: "new-staff-1", createdBy: "organizer-only"};
    db.setDoc("programStaffGrants/program-1__new-staff-1", legacy);
    await assert.rejects(grantProgramStaffHandler(
      request(payload, "admin-1"), deps(db)), code("permission-denied"));
    await grantProgramStaffHandler(request(payload, "manager-1"), deps(db));
    const grant = db.getDoc("programStaffGrants/program-1__new-staff-1")!;
    assert.equal(grant.createdBy, "organizer-only");
    assert.deepEqual(grant.duties, payload.duties.map((duty) =>
      ({...duty, expiresAtMillis: payload.expiresAtMillis})));
    const access = await getProgramWorkAccessHandler(
      request({programId: "program-1"}, "new-staff-1"), deps(db));
    assert.equal(access.actorRole, "staff");
  });

test("revoked admin on transaction retry cannot commit a child grant",
  async () => {
    const db = adminStore();
    db.beforeCommit = async () => {
      db.beforeCommit = undefined;
      db.updateDoc("programStaffGrants/program-1__admin-1",
        {status: "revoked"});
    };
    await assert.rejects(grantProgramStaffHandler(
      request(payload, "admin-1"), deps(db)), code("permission-denied"));
    assert.equal(db.getDoc("programStaffGrants/program-1__new-staff-1"),
      undefined);
  });

test("revoke rechecks admin expiry after reading its target", async () => {
  const db = adminStore();
  let reads = 0;
  const advancing = deps(db, {now: () => ++reads < 3 ? now :
    Timestamp.fromMillis(payload.expiresAtMillis)});
  await assert.rejects(revokeProgramStaffHandler(request({
    programId: "program-1", uid: "greeter-1", expectedRevision: 1,
  }, "admin-1"), advancing), code("permission-denied"));
  assert.equal(db.getDoc("programStaffGrants/program-1__greeter-1")?.status,
    "active");
  assert.equal(db.transactionCommits, 0);
});
