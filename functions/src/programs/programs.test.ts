import assert from "node:assert/strict";
import test from "node:test";
import * as admin from "firebase-admin";
import {baseSeed, deps, request, now} from "../shared/testing/programFixtures";
import {FakeFirestore} from "../shared/testing/programFirestore";
import {
  createOrganizerProgramHandler,
  getOrganizerProgramHandler,
  listOrganizerProgramsHandler,
  updateOrganizerProgramHandler,
} from "./programs";
import {archiveProgramHandler, unarchiveProgramHandler} from
  "./programRetention";

const input = (extra: Record<string, unknown> = {}) => ({
  organizerId: "org-1", kind: "wedding", title: "Wedding weekend",
  timezone: "Asia/Kolkata", startsAtMillis: now.toMillis(),
  endsAtMillis: now.toMillis() + 86_400_000,
  capabilities: ["arrivalsTransport"],
  ...extra,
});
const code = (expected: string) => (error: unknown) =>
  (error as {code?: string}).code === expected;
const create = (db: FakeFirestore, extra: Record<string, unknown> = {},
  uid = "manager-1") => createOrganizerProgramHandler(
  request(input(extra), uid), deps(db));
const inventory = (db: FakeFirestore, organizerId = "org-1",
  uid = "manager-1") => listOrganizerProgramsHandler(
  request({organizerId}, uid), deps(db));

function removeOrganizerRole(db: FakeFirestore): void {
  db.updateDoc("organizers/org-1", {ownerUserId: "replacement",
    hostUserId: "replacement", hostUserIds: ["replacement"], hostProfiles: []});
}

function grantProgramAdmin(db: FakeFirestore, deadline = now.toMillis() + 1000):
  void {
  db.setDoc("programStaffGrants/program-1__admin", {
    ...db.getDoc("programStaffGrants/program-1__dispatcher-1")!,
    uid: "admin", createdBy: "manager-1",
    expiresAt: admin.firestore.Timestamp.fromMillis(deadline),
    duties: [{duty: "programAdmin", pickupPointIds: [], hotelIds: [],
      functionIds: [], expiresAtMillis: deadline}],
  });
}

test("creator role loss keeps bounded own-program paging and ID rediscovery",
  async () => {
    const seed = baseSeed();
    for (let i = 0; i < 55; i++) {
      seed[`organizerPrograms/own-${String(i).padStart(2, "0")}`] = {
        ...seed["organizerPrograms/program-1"],
      };
    }
    for (let i = 0; i < 100; i++) {
      seed[`organizerPrograms/other-${i}`] = {
        ...seed["organizerPrograms/program-1"], createdBy: "replacement",
        startsAt: admin.firestore.Timestamp.fromMillis(now.toMillis() + 1000),
      };
    }
    seed["organizerPrograms/foreign-own"] = {
      ...seed["organizerPrograms/program-1"], organizerId: "org-2",
    };
    const db = new FakeFirestore(seed);
    removeOrganizerRole(db);
    const queries: {collectionPath: string; limitN: number | null;
      wheres: {field: string; op: string; value: unknown}[]}[] = [];
    const read = db.runQuery.bind(db);
    db.runQuery = async (query) => {
      queries.push(query); return read(query);
    };
    const first = await inventory(db);
    assert.equal(first.programs.length, 50);
    assert.ok(first.nextCursor);
    const second = await listOrganizerProgramsHandler(request({
      organizerId: "org-1", cursor: first.nextCursor,
    }, "manager-1"), deps(db));
    assert.equal(second.programs.length, 6);
    assert.equal(second.nextCursor, null);
    const rows = [...first.programs, ...second.programs];
    assert.equal(new Set(rows.map((row) => row.programId)).size, 56);
    assert.ok(rows.every((row) => row.canArchive && !row.canUnarchive));
    assert.ok(queries.filter((q) => q.collectionPath === "organizerPrograms")
      .every((q) => q.limitN === 51 && q.wheres.some((where) =>
        where.field === "createdBy" && where.value === "manager-1")));
    const exact = await listOrganizerProgramsHandler(request({
      organizerId: "org-1", programId: "program-1",
    }, "manager-1"), deps(db));
    assert.deepEqual(exact.programs.map((row) => row.programId), ["program-1"]);
    assert.equal(exact.programs[0].functionCount, 0);
    await assert.rejects(listOrganizerProgramsHandler(request({
      organizerId: "org-1", programId: "foreign-own",
    }, "manager-1"), deps(db)), code("not-found"));
    for (const selector of [{programId: "other-0"}, {cursor: "other-0"}]) {
      await assert.rejects(listOrganizerProgramsHandler(request({
        organizerId: "org-1", ...selector,
      }, "manager-1"), deps(db)), code(
        "programId" in selector ? "permission-denied" : "not-found"));
    }
  });

test("creator reopens and edits only their program after organizer-role loss",
  async () => {
    const seed = baseSeed();
    seed["organizerPrograms/other"] = {
      ...seed["organizerPrograms/program-1"], createdBy: "replacement",
    };
    const db = new FakeFirestore(seed);
    removeOrganizerRole(db);
    const detail = await getOrganizerProgramHandler(
      request({programId: "program-1"}, "manager-1"), deps(db));
    assert.equal(detail.program.programId, "program-1");
    const edited = await updateOrganizerProgramHandler(request({
      programId: "program-1", expectedRevision: 3, title: "Creator's update",
    }, "manager-1"), deps(db));
    assert.equal(db.getDoc("organizerPrograms/program-1")!.createdBy,
      "manager-1");
    assert.equal(db.getDoc("organizerPrograms/program-1")!.revision,
      edited.revision);
    const before = new Map(db.docs);
    await assert.rejects(updateOrganizerProgramHandler(request({
      programId: "program-1", expectedRevision: 3, title: "Stale update",
    }, "manager-1"), deps(db)), code("aborted"));
    await assert.rejects(getOrganizerProgramHandler(
      request({programId: "other"}, "manager-1"), deps(db)),
    code("permission-denied"));
    assert.deepEqual(db.docs, before);
  });

test("branding is set, read back and cleared through the update", async () => {
  const db = new FakeFirestore(baseSeed());
  const branding = {color: "marigold",
    coverImagePath: "programs/program-1/branding/cover.jpg",
    creditLine: "  Meher Shah Weddings "};
  await assert.rejects(updateOrganizerProgramHandler(request({
    programId: "program-1", expectedRevision: 3,
    branding: {...branding, coverImagePath: "programs/other/branding/x.jpg"},
  }, "manager-1"), deps(db)), code("invalid-argument"));
  const edited = await updateOrganizerProgramHandler(request({
    programId: "program-1", expectedRevision: 3, branding,
  }, "manager-1"), deps(db));
  const detail = await getOrganizerProgramHandler(
    request({programId: "program-1"}, "manager-1"), deps(db));
  assert.deepEqual(detail.program.branding, {...branding,
    creditLine: "Meher Shah Weddings"});
  await updateOrganizerProgramHandler(request({
    programId: "program-1", expectedRevision: edited.revision,
    branding: null,
  }, "manager-1"), deps(db));
  const cleared = await getOrganizerProgramHandler(
    request({programId: "program-1"}, "manager-1"), deps(db));
  assert.equal(cleared.program.branding, undefined);
});

test("organizer-only managers keep setup but have no archive or restore action",
  async () => {
    const db = new FakeFirestore(baseSeed());
    removeOrganizerRole(db);
    const row = (await inventory(db, "org-1", "replacement")).programs[0];
    assert.equal(row.canArchive, false);
    assert.equal(row.canUnarchive, false);
    const detail = await getOrganizerProgramHandler(
      request({programId: "program-1"}, "replacement"), deps(db));
    assert.equal(detail.counts.guests, 2);
    assert.equal(JSON.stringify(detail).includes("Rohan Sharma"), false);
    assert.equal(JSON.stringify(detail).includes("+919999900001"), false);
    const edited = await updateOrganizerProgramHandler(request({
      programId: "program-1", expectedRevision: 3, title: "Managed setup",
    }, "replacement"), deps(db));
    const before = new Map(db.docs);
    await assert.rejects(archiveProgramHandler(request({
      programId: "program-1", expectedRevision: edited.revision,
    }, "replacement"), deps(db)), code("permission-denied"));
    await assert.rejects(unarchiveProgramHandler(request({
      programId: "program-1", expectedRevision: edited.revision,
    }, "replacement"), deps(db)), code("permission-denied"));
    assert.deepEqual(db.docs, before);
  });

test("approved program admin can rediscover and edit their exact program only",
  async () => {
    const db = new FakeFirestore(baseSeed());
    grantProgramAdmin(db);
    const exact = await listOrganizerProgramsHandler(request({
      organizerId: "org-1", programId: "program-1",
    }, "admin"), deps(db));
    assert.equal(exact.programs[0].canArchive, false);
    assert.equal(exact.programs[0].canUnarchive, false);
    await getOrganizerProgramHandler(
      request({programId: "program-1"}, "admin"), deps(db));
    const edited = await updateOrganizerProgramHandler(request({
      programId: "program-1", expectedRevision: 3, title: "Admin setup",
    }, "admin"), deps(db));
    const before = new Map(db.docs);
    await assert.rejects(archiveProgramHandler(
      request({programId: "program-1", expectedRevision: edited.revision},
        "admin"), deps(db)), code("permission-denied"));
    await assert.rejects(unarchiveProgramHandler(
      request({programId: "program-1", expectedRevision: edited.revision},
        "admin"), deps(db)), code("permission-denied"));
    await assert.rejects(inventory(db, "org-1", "admin"),
      code("permission-denied"));
    await assert.rejects(getOrganizerProgramHandler(
      request({programId: "program-1"}, "greeter-1"), deps(db)),
    code("permission-denied"));
    assert.deepEqual(db.docs, before);
  });

test("program admin expiry during setup reads returns no stale authorized view",
  async () => {
    const db = new FakeFirestore(baseSeed());
    grantProgramAdmin(db);
    let clock = now;
    const read = db.runQuery.bind(db);
    db.runQuery = async (query) => {
      const result = await read(query);
      if (query.collectionPath === "programStaffGrants") {
        clock = admin.firestore.Timestamp.fromMillis(now.toMillis() + 1000);
      }
      return result;
    };
    const before = new Map(db.docs);
    await assert.rejects(getOrganizerProgramHandler(
      request({programId: "program-1"}, "admin"),
      deps(db, {now: () => clock})), code("permission-denied"));
    assert.deepEqual(db.docs, before);
  });

test("program admin expiry during exact-ID counts returns no stale inventory",
  async () => {
    const db = new FakeFirestore(baseSeed());
    grantProgramAdmin(db);
    let clock = now;
    const read = db.runQuery.bind(db);
    db.runQuery = async (query) => {
      const result = await read(query);
      clock = admin.firestore.Timestamp.fromMillis(now.toMillis() + 1000);
      return result;
    };
    const before = new Map(db.docs);
    await assert.rejects(listOrganizerProgramsHandler(request({
      organizerId: "org-1", programId: "program-1",
    }, "admin"), deps(db, {now: () => clock})), code("permission-denied"));
    assert.deepEqual(db.docs, before);
  });

for (const change of ["revocation", "approval withdrawal", "deleted actor",
  "valid control"]) {
  test(`inventory rechecks ${change} after delayed counts`, async () => {
    const db = new FakeFirestore(baseSeed());
    grantProgramAdmin(db);
    const grantPath = "programStaffGrants/program-1__admin";
    // Explicit creator approval is needed for this delegated grant. Removing
    // that approval cannot fall back to a legacy creator-issued grant.
    db.updateDoc(grantPath, {
      createdBy: "delegating-admin",
      programAuthorization: {ownerUid: "manager-1",
        approvedByUid: "delegating-admin", approvedAtMillis: now.toMillis(),
        authorizedUntilMillis: now.toMillis() + 1000},
    });
    let countStarted!: () => void;
    let releaseCount!: () => void;
    const started = new Promise<void>((resolve) => {
      countStarted = resolve;
    });
    const released = new Promise<void>((resolve) => {
      releaseCount = resolve;
    });
    const read = db.runQuery.bind(db);
    db.runQuery = async (query) => {
      const result = await read(query);
      if (query.collectionPath === "programFunctions") {
        countStarted();
        await released;
      }
      return result;
    };
    let clock = now;
    const pending = listOrganizerProgramsHandler(request({
      organizerId: "org-1", programId: "program-1",
    }, "admin"), deps(db, {now: () => clock}));
    await started;
    clock = admin.firestore.Timestamp.fromMillis(now.toMillis() + 999);
    if (change === "revocation") {
      db.updateDoc(grantPath, {status: "revoked", revokedAt: clock,
        revokedBy: "manager-1"});
    } else if (change === "approval withdrawal") {
      const withdrawn = {...db.getDoc(grantPath)!};
      delete withdrawn.programAuthorization;
      db.setDoc(grantPath, withdrawn);
    } else if (change === "deleted actor") {
      db.setDoc("deletedUsers/admin", {status: "processing"});
    } else {
      db.updateDoc("organizerPrograms/program-1", {
        title: "Current authorized setup", revision: 4,
      });
    }
    const afterChange = new Map(db.docs);
    releaseCount();
    if (change === "valid control") {
      const result = await pending;
      assert.equal(result.nextCursor, null);
      assert.equal(result.programs.length, 1);
      const row = result.programs[0];
      assert.equal(row.programId, "program-1");
      assert.equal(row.title, "Current authorized setup");
      assert.equal(row.revision, 4);
      assert.equal(row.functionCount, 0);
      assert.equal(row.canArchive, false);
      assert.equal(row.canUnarchive, false);
    } else {
      await assert.rejects(pending, code("permission-denied"));
    }
    assert.deepEqual(db.docs, afterChange);
  });
}

test("program admin expiry before the setup write preserves the saved draft",
  async () => {
    const db = new FakeFirestore(baseSeed());
    grantProgramAdmin(db);
    let clock = now;
    const read = db.getDoc.bind(db);
    db.getDoc = (path) => {
      const result = read(path);
      if (path === "programStaffGrants/program-1__admin") {
        clock = admin.firestore.Timestamp.fromMillis(now.toMillis() + 1000);
      }
      return result;
    };
    const before = new Map(db.docs);
    await assert.rejects(updateOrganizerProgramHandler(request({
      programId: "program-1", expectedRevision: 3, title: "Expired edit",
    }, "admin"), deps(db, {now: () => clock})), code("permission-denied"));
    assert.deepEqual(db.docs, before);
  });

test("creator lifecycle rediscovery keeps revision fences and restore grace",
  async () => {
    const db = new FakeFirestore(baseSeed());
    removeOrganizerRole(db);
    const archived = await archiveProgramHandler(request({
      programId: "program-1", expectedRevision: 3,
    }, "manager-1"), deps(db));
    const row = (await inventory(db)).programs[0];
    assert.equal(row.canArchive, false);
    assert.equal(row.canUnarchive, true);
    assert.equal(row.revision, archived.revision);
    assert.equal(row.anonymizeAtMillis, archived.anonymizeAtMillis);
    const before = new Map(db.docs);
    await assert.rejects(unarchiveProgramHandler(request({
      programId: "program-1", expectedRevision: 3,
    }, "manager-1"), deps(db)), code("aborted"));
    await assert.rejects(unarchiveProgramHandler(request({
      programId: "program-1", expectedRevision: archived.revision,
    }, "manager-1"), deps(db, {now: () =>
      admin.firestore.Timestamp.fromMillis(archived.anonymizeAtMillis)})),
    code("failed-precondition"));
    assert.deepEqual(db.docs, before);
    await unarchiveProgramHandler(request({programId: "program-1",
      expectedRevision: archived.revision}, "manager-1"), deps(db));
    const restored = (await inventory(db)).programs[0];
    assert.equal(restored.status, "active");
    assert.equal(restored.canArchive, true);
    assert.equal(restored.canUnarchive, false);
    assert.equal(restored.anonymizeAtMillis, null);
  });

test("create receipt persists the same ID in the draft inventory", async () => {
  const db = new FakeFirestore(baseSeed());
  const result = await create(db, {requestId: "program-create-request-1"});
  assert.equal(db.getDoc(`organizerPrograms/${result.entityId}`)!.status,
    "draft");
  const rows = (await inventory(db)).programs;
  const saved = rows.find((row) => row.programId === result.entityId)!;
  assert.equal(saved.title, "Wedding weekend");
  assert.equal(saved.timezone, "Asia/Kolkata");
  assert.equal(saved.startsAtMillis, input().startsAtMillis);
  assert.equal(saved.endsAtMillis, input().endsAtMillis);
  assert.equal(saved.functionCount, 0);
  assert.equal(saved.canArchive, true);
  assert.equal(saved.canUnarchive, false);
  assert.ok(rows.some((row) => row.programId === "program-1"));
});

test(
  "missing required fields and equal/reversed dates write nothing",
  async () => {
    for (const extra of [
      {title: " "}, {kind: ""}, {timezone: " "},
      {timezone: "Not/AZone"},
      {startsAtMillis: undefined}, {endsAtMillis: undefined},
      {endsAtMillis: now.toMillis()},
      {endsAtMillis: now.toMillis() - 1},
    ]) {
      const db = new FakeFirestore(baseSeed());
      const before = new Map(db.docs);
      await assert.rejects(create(db, extra), code("invalid-argument"));
      assert.deepEqual(db.docs, before);
    }
  }
);

test("update rejects a non-IANA program timezone without writing", async () => {
  const db = new FakeFirestore(baseSeed());
  const before = new Map(db.docs);
  await assert.rejects(
    updateOrganizerProgramHandler(request({
      programId: "program-1",
      expectedRevision: 3,
      timezone: "Not/AZone",
    }, "manager-1"), deps(db)),
    code("invalid-argument")
  );
  assert.deepEqual(db.docs, before);
});

test(
  "lost-response replay and concurrent duplicate submits create one ID",
  async () => {
    const db = new FakeFirestore(baseSeed());
    const key = {requestId: "program-create-request-1"};
    const first = await create(db, key);
    const replay = await create(db, key);
    assert.equal(replay.entityId, first.entityId);
    assert.equal(replay.alreadyApplied, true);
    const concurrent = await Promise.all([create(db, key), create(db, key)]);
    assert.ok(concurrent.every((row) => row.entityId === first.entityId));
    assert.equal([...db.docs.keys()].filter((path) =>
      path.startsWith("organizerPrograms/")).length, 2);
  }
);

test(
  "request reuse with a changed body cannot overwrite or create",
  async () => {
    const db = new FakeFirestore(baseSeed());
    const key = {requestId: "program-create-request-1"};
    await create(db, key);
    const before = new Map(db.docs);
    await assert.rejects(create(db, {...key, title: "Different program"}),
      code("failed-precondition"));
    assert.deepEqual(db.docs, before);
  }
);

test(
  "same title is allowed for distinct requests; legacy IDs stay intact",
  async () => {
    const db = new FakeFirestore(baseSeed());
    const legacy = db.getDoc("organizerPrograms/program-1");
    const first = await create(db, {requestId: "program-create-request-1"});
    const second = await create(db, {requestId: "program-create-request-2"});
    const oldClient = await create(db);
    assert.notEqual(first.entityId, second.entityId);
    assert.notEqual(first.entityId, oldClient.entityId);
    assert.deepEqual(db.getDoc("organizerPrograms/program-1"), legacy);
  }
);

test(
  "create and receipt replay recheck current organizer authority",
  async () => {
    const db = new FakeFirestore(baseSeed());
    await assert.rejects(create(db, {}, "outsider"), code("permission-denied"));
    const key = {requestId: "program-create-request-1"};
    await create(db, key);
    db.updateDoc("organizers/org-1", {ownerUserId: "other",
      hostUserId: "other", hostUserIds: ["other"], hostProfiles: []});
    const before = new Map(db.docs);
    await assert.rejects(create(db, key), code("permission-denied"));
    assert.deepEqual(db.docs, before);
  }
);

test(
  "deleted accounts cannot create, replay, list, or read an exact program",
  async () => {
    const db = new FakeFirestore(baseSeed());
    const key = {requestId: "program-create-request-1"};
    const created = await create(db, key);
    db.setDoc("deletedUsers/manager-1", {status: "processing"});
    const before = new Map(db.docs);
    await assert.rejects(create(db, key), code("permission-denied"));
    await assert.rejects(inventory(db), code("permission-denied"));
    await assert.rejects(getOrganizerProgramHandler(
      request({programId: "program-1"}, "manager-1"), deps(db)),
    code("permission-denied"));
    await assert.rejects(updateOrganizerProgramHandler(request({
      programId: "program-1", expectedRevision: 3, title: "Deleted actor edit",
    }, "manager-1"), deps(db)), code("permission-denied"));
    await assert.rejects(
      listOrganizerProgramsHandler(
        request(
          {organizerId: "org-1", programId: created.entityId},
          "manager-1"
        ),
        deps(db)
      ),
      code("permission-denied")
    );
    assert.deepEqual(db.docs, before);
  }
);

test("the same request key remains isolated to its organizer", async () => {
  const seed = baseSeed();
  seed["organizers/org-2"] = {...seed["organizers/org-1"]};
  const db = new FakeFirestore(seed);
  const key = {requestId: "program-create-request-1"};
  const first = await create(db, key);
  const second = await create(db, {...key, organizerId: "org-2"});
  assert.notEqual(first.entityId, second.entityId);
  const rows = (await inventory(db, "org-2")).programs;
  assert.deepEqual(rows.map((row) => row.programId), [second.entityId]);
});

test(
  "inventory event counts include only listed authorized programs",
  async () => {
    const seed = baseSeed();
    seed["organizerPrograms/foreign"] = {
      ...seed["organizerPrograms/program-1"], organizerId: "org-2",
    };
    seed["programFunctions/one"] = {
      programId: "program-1", organizerId: "org-1",
    };
    seed["programFunctions/two"] = {
      programId: "program-1", organizerId: "org-1",
    };
    seed["programFunctions/foreign"] = {
      programId: "foreign", organizerId: "org-2",
    };
    seed["programFunctions/wrong-owner"] = {
      programId: "program-1", organizerId: "org-2",
    };
    const db = new FakeFirestore(seed);
    const rows = (await inventory(db)).programs;
    assert.deepEqual(rows.map((row) => [row.programId, row.functionCount]),
      [["program-1", 2]]);
    await assert.rejects(inventory(db, "org-1", "outsider"),
      code("permission-denied"));
  }
);

test(
  "incomplete or failed count reads omit counts and preserve programs",
  async () => {
    const seed = baseSeed();
    for (let index = 0; index < 2001; index++) {
      seed[`programFunctions/function-${index}`] = {
        organizerId: "org-1", programId: "program-1",
      };
    }
    const db = new FakeFirestore(seed);
    const capped = (await inventory(db)).programs;
    assert.equal(capped.length, 1);
    assert.equal("functionCount" in capped[0], false);
    const runQuery = db.runQuery.bind(db);
    db.runQuery = async (query) => {
      if (query.collectionPath === "programFunctions") {
        throw new Error("count unavailable");
      }
      return runQuery(query);
    };
    const failed = (await inventory(db)).programs;
    assert.equal(failed[0].programId, "program-1");
    assert.equal("functionCount" in failed[0], false);
  }
);

test(
  "same-start inventory pages use snapshot ties without omissions",
  async () => {
    const seed = baseSeed();
    for (let i = 0; i < 55; i++) {
      seed[`organizerPrograms/tie-${String(i).padStart(2, "0")}`] = {
        ...seed["organizerPrograms/program-1"],
      };
    }
    const db = new FakeFirestore(seed);
    const first = await listOrganizerProgramsHandler(
      request({organizerId: "org-1"}, "manager-1"), deps(db));
    assert.equal(first.programs.length, 50);
    assert.ok(first.nextCursor);
    const second = await listOrganizerProgramsHandler(
      request({organizerId: "org-1", cursor: first.nextCursor}, "manager-1"),
      deps(db));
    assert.equal(second.programs.length, 6);
    assert.equal(second.nextCursor, null);
    const uniqueIds = new Set(
      [...first.programs, ...second.programs].map((row) => row.programId)
    );
    assert.equal(uniqueIds.size, 56);
  }
);

test(
  "stable inventory cursor cannot move when its program date is edited",
  async () => {
    const seed = baseSeed();
    const day = 86_400_000;
    seed["organizerPrograms/newer"] = {
      ...seed["organizerPrograms/program-1"],
      startsAt: admin.firestore.Timestamp.fromMillis(now.toMillis() + 3 * day),
    };
    seed["organizerPrograms/cursor"] = {
      ...seed["organizerPrograms/program-1"],
      startsAt: admin.firestore.Timestamp.fromMillis(now.toMillis() + 2 * day),
    };
    const db = new FakeFirestore(seed);
    const first = await listOrganizerProgramsHandler(
      request({organizerId: "org-1", limit: 2}, "manager-1"), deps(db));
    assert.deepEqual(first.programs.map((row) => row.programId),
      ["newer", "cursor"]);
    assert.match(first.nextCursor ?? "", /^v1\./u);

    db.updateDoc("organizerPrograms/cursor", {
      startsAt: admin.firestore.Timestamp.fromMillis(now.toMillis() + 4 * day),
    });
    const second = await listOrganizerProgramsHandler(
      request({organizerId: "org-1", limit: 2, cursor: first.nextCursor},
        "manager-1"), deps(db));
    assert.deepEqual(second.programs.map((row) => row.programId),
      ["program-1"]);
    assert.equal(second.nextCursor, null);
  }
);

test("cursor and exact-ID requests recheck organizer scope", async () => {
  const seed = baseSeed();
  seed["organizers/org-2"] = {...seed["organizers/org-1"]};
  seed["organizerPrograms/foreign"] = {
    ...seed["organizerPrograms/program-1"], organizerId: "org-2",
  };
  const db = new FakeFirestore(seed);
  const selectors = [
    {cursor: "foreign"},
    {programId: "foreign"},
    {cursor: "missing"},
    {programId: "missing"},
  ];
  for (const selector of selectors) {
    await assert.rejects(listOrganizerProgramsHandler(
      request({organizerId: "org-1", ...selector}, "manager-1"), deps(db)),
    code("not-found"));
  }
  await assert.rejects(listOrganizerProgramsHandler(request({
    organizerId: "org-1", cursor: "program-1", programId: "program-1",
  }, "manager-1"), deps(db)), code("invalid-argument"));
  await assert.rejects(listOrganizerProgramsHandler(request({
    organizerId: "org-1", programId: "program-1",
  }, "outsider"), deps(db)), code("permission-denied"));
});

test(
  "earlier-start creation confirms by exact ID without scanning inventory",
  async () => {
    const seed = baseSeed();
    for (let i = 0; i < 55; i++) {
      seed[`organizerPrograms/recent-${i}`] = {
        ...seed["organizerPrograms/program-1"],
      };
    }
    const db = new FakeFirestore(seed);
    const result = await create(db, {
      requestId: "earlier-start-request", startsAtMillis: 1, endsAtMillis: 2,
    });
    const firstPage = (await inventory(db)).programs;
    assert.equal(
      firstPage.some((row) => row.programId === result.entityId),
      false
    );
    const queryPaths: string[] = [];
    const runQuery = db.runQuery.bind(db);
    db.runQuery = async (query) => {
      queryPaths.push(query.collectionPath); return runQuery(query);
    };
    const exact = await listOrganizerProgramsHandler(request({
      organizerId: "org-1", programId: result.entityId,
    }, "manager-1"), deps(db));
    assert.equal(exact.programs.length, 1);
    assert.equal(exact.programs[0].programId, result.entityId);
    assert.equal(exact.programs[0].functionCount, 0);
    assert.equal(exact.nextCursor, null);
    assert.deepEqual(queryPaths, ["programFunctions"]);
  }
);
