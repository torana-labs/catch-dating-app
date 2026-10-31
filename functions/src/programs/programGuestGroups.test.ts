import {planImportedMembership} from
  "../workspaces/programMembershipPersistence";
import {seedWorkspaceFieldAssertions} from
  "../workspaces/workspaceFieldFixture";
import assert from "node:assert/strict";
import test from "node:test";
import {baseSeed, deps, request, now} from "../shared/testing/programFixtures";
import {FakeFirestore, type FakeData} from
  "../shared/testing/programFirestore";
import {
  deleteProgramGuestGroupHandler,
  listProgramGuestGroupsHandler,
  upsertProgramGuestGroupHandler,
} from "./programGuestGroups";
import {listProgramGuestsHandler, upsertProgramGuestHandler} from
  "./programGuests";
import {contractValidator} from "../shared/contractTestValidators";

const validateProgramGuestGroupDocument =
  contractValidator("ProgramGuestGroupDocument");

const group = (patch: Partial<FakeData> = {}): FakeData => ({
  programId: "program-1", organizerId: "org-1", label: "Groom side",
  dimension: "side", sortOrder: 0, memberCount: 0, hotelId: null,
  createdAt: now, updatedAt: now, revision: 1, ...patch,
});
const seed = () => seedWorkspaceFieldAssertions({...baseSeed(),
  "programGuestGroups/side-a": group(),
  "programGuestGroups/company-b": group({label: "Acme", dimension: "company"}),
});
const groupEdit = (db: FakeFirestore, patch: object = {}) =>
  upsertProgramGuestGroupHandler(request({programId: "program-1",
    groupId: "side-a", label: "Groom side", dimension: "side",
    expectedRevision: 1, ...patch}, "manager-1"), deps(db));
const groupDoc = (db: FakeFirestore, id: string) =>
  db.getDoc(`programGuestGroups/${id}`)!;

function assertGroupContracts(db: FakeFirestore) {
  for (const [path, doc] of db.docs) {
    if (!path.startsWith("programGuestGroups/")) continue;
    assert.ok(validateProgramGuestGroupDocument(doc),
      `${path}: ${JSON.stringify(validateProgramGuestGroupDocument.errors)}`);
  }
}

test("creating a group defaults memberCount and rejects duplicate labels",
  async () => {
    const db = new FakeFirestore(seed());
    const created = await upsertProgramGuestGroupHandler(request({
      programId: "program-1", label: "Friends", dimension: "relation",
      sortOrder: 3}, "manager-1"), deps(db));
    assert.ok(created.revision >= 1);
    assert.equal(groupDoc(db, created.entityId).memberCount, 0);
    assert.equal(groupDoc(db, created.entityId).sortOrder, 3);
    await assert.rejects(upsertProgramGuestGroupHandler(request({
      programId: "program-1", label: "  groom SIDE ", dimension: "SIDE",
    }, "manager-1"), deps(db)), /already exists/);
    assertGroupContracts(db);
  });

test("updating a group preserves memberCount and honors expectedRevision",
  async () => {
    const db = new FakeFirestore(seed());
    db.updateDoc("programGuestGroups/side-a", {memberCount: 7});
    await groupEdit(db, {label: "Baraat side"});
    assert.equal(groupDoc(db, "side-a").label, "Baraat side");
    assert.equal(groupDoc(db, "side-a").memberCount, 7);
    await assert.rejects(groupEdit(db, {expectedRevision: 1}),
      /changed since you loaded/);
    await assert.rejects(upsertProgramGuestGroupHandler(request({
      programId: "program-1", groupId: "missing", label: "x",
      dimension: "side", expectedRevision: 1}, "manager-1"), deps(db)),
    /not found|does not exist/i);
    assertGroupContracts(db);
  });

test("groups from another program are invisible and immovable", async () => {
  const db = new FakeFirestore(seed());
  db.updateDoc("programGuestGroups/company-b",
    {programId: "program-2", organizerId: "org-2"});
  const list = await listProgramGuestGroupsHandler(request({
    programId: "program-1"}, "manager-1"), deps(db));
  await assert.rejects(groupEdit(db, {groupId: "company-b",
    label: "Other", dimension: "delegation"}), /not found/);
  assert.equal(list.groups.length, 1);
  assert.equal(list.groups[0].groupId, "side-a");
});

test("guest upserts set membership and keep memberCount exact", async () => {
  const db = new FakeFirestore(seed());
  const first = await upsertProgramGuestHandler(request({
    programId: "program-1",
    guestId: "guest-1", displayName: "Rohan Sharma", expectedRevision: 1,
    groupIds: ["side-a", "company-b"]}, "manager-1"), deps(db));
  assert.deepEqual(db.getDoc("programGuests/guest-1")!.groupIds,
    ["company-b", "side-a"]);
  assert.equal(groupDoc(db, "side-a").memberCount, 1);
  assert.equal(groupDoc(db, "company-b").memberCount, 1);
  await upsertProgramGuestHandler(request({programId: "program-1",
    guestId: "guest-1", displayName: "Rohan Sharma",
    expectedRevision: first.revision,
    groupIds: ["side-a"]}, "manager-1"), deps(db));
  assert.equal(groupDoc(db, "side-a").memberCount, 1);
  assert.equal(groupDoc(db, "company-b").memberCount, 0);
  assertGroupContracts(db);
});

test("guest upserts reject unknown or foreign groups", async () => {
  const db = new FakeFirestore(seed());
  db.updateDoc("programGuestGroups/company-b",
    {organizerId: "foreign-org"});
  await assert.rejects(upsertProgramGuestHandler(request({
    programId: "program-1", guestId: "guest-1", displayName: "Rohan Sharma",
    expectedRevision: 1, groupIds: ["nope"]}, "manager-1"), deps(db)),
  /Unknown guest group/);
  await assert.rejects(upsertProgramGuestHandler(request({
    programId: "program-1", guestId: "guest-1", displayName: "Rohan Sharma",
    expectedRevision: 1, groupIds: ["company-b"]}, "manager-1"), deps(db)),
  /reconciliation/);
});

test("deleting a group scrubs member groupIds in bounded pages", async () => {
  const db = new FakeFirestore(seed());
  db.updateDoc("programGuests/guest-1", {groupIds: ["side-a", "company-b"]});
  db.updateDoc("programGuests/guest-2", {groupIds: ["side-a"]});
  const result = await deleteProgramGuestGroupHandler(request({
    programId: "program-1", groupId: "side-a", expectedRevision: 1},
  "manager-1"), deps(db));
  assert.equal(result.entityId, "side-a");
  assert.equal(db.getDoc("programGuestGroups/side-a"), undefined);
  assert.deepEqual(db.getDoc("programGuests/guest-1")!.groupIds,
    ["company-b"]);
  assert.deepEqual(db.getDoc("programGuests/guest-2")!.groupIds, []);
  await assert.rejects(deleteProgramGuestGroupHandler(request({
    programId: "program-1", groupId: "side-a"}, "manager-1"), deps(db)),
  /not found/);
});

test("group deletion retires choice pointers before the next guest edit",
  async () => {
    const db = new FakeFirestore(seed());
    const first = await upsertProgramGuestHandler(request({
      programId: "program-1",
      guestId: "guest-1", displayName: "Rohan Sharma", expectedRevision: 1,
      groupIds: ["side-a", "company-b"]}, "manager-1"), deps(db));
    assert.equal((db.getDoc("programGuests/guest-1")!.membershipSelections as
      Array<unknown>).length, 2);
    await deleteProgramGuestGroupHandler(request({programId: "program-1",
      groupId: "side-a", expectedRevision: groupDoc(db, "side-a").revision},
    "manager-1"), deps(db));
    const guest = db.getDoc("programGuests/guest-1")!;
    assert.ok((guest.revision as number) > first.revision);
    assert.deepEqual((guest.membershipSelections as Array<{groupId: string}>)
      .map((p) => p.groupId), ["company-b"]);
    await upsertProgramGuestHandler(request({programId: "program-1",
      guestId: "guest-1", displayName: "Rohan Sharma",
      expectedRevision: guest.revision, groupIds: []}, "manager-1"), deps(db));
    assert.deepEqual(db.getDoc("programGuests/guest-1")!.groupIds, []);
  });

test("guest lists embed the referenced group labels", async () => {
  const db = new FakeFirestore(seed());
  db.updateDoc("programGuests/guest-1",
    {groupIds: ["side-a", "deleted-group"]});
  const response = await listProgramGuestsHandler(request({
    programId: "program-1"}, "manager-1"), deps(db));
  const guest = response.guests.find((g) => g.guestId === "guest-1")!;
  assert.deepEqual(guest.groupIds, ["side-a", "deleted-group"]);
  assert.deepEqual(response.groups.map((g) => g.groupId), ["side-a"]);
  assert.equal(response.groups[0].label, "Groom side");
});

test("groups pin a hotel, clear it, and preserve it when omitted",
  async () => {
    const db = new FakeFirestore(seed());
    // Omitted on create defaults to null; set links a program hotel.
    const created = await upsertProgramGuestGroupHandler(request({
      programId: "program-1", label: "Family", dimension: "relation"},
    "manager-1"), deps(db));
    assert.equal(groupDoc(db, created.entityId).hotelId, null);
    let current = groupDoc(db, created.entityId).revision as number;
    await upsertProgramGuestGroupHandler(request({
      programId: "program-1", groupId: created.entityId, label: "Family",
      dimension: "relation", expectedRevision: current,
      hotelId: "hotel-1"}, "manager-1"), deps(db));
    assert.equal(groupDoc(db, created.entityId).hotelId, "hotel-1");
    // Omitted on update preserves the link.
    current = groupDoc(db, created.entityId).revision as number;
    await upsertProgramGuestGroupHandler(request({
      programId: "program-1", groupId: created.entityId, label: "Family",
      dimension: "relation", expectedRevision: current, sortOrder: 2},
    "manager-1"), deps(db));
    assert.equal(groupDoc(db, created.entityId).hotelId, "hotel-1");
    // Explicit null clears it.
    current = groupDoc(db, created.entityId).revision as number;
    await upsertProgramGuestGroupHandler(request({
      programId: "program-1", groupId: created.entityId, label: "Family",
      dimension: "relation", expectedRevision: current, hotelId: null},
    "manager-1"), deps(db));
    assert.equal(groupDoc(db, created.entityId).hotelId, null);
    assertGroupContracts(db);
  });

test("group hotel links must live inside the same program", async () => {
  const db = new FakeFirestore(seed());
  await assert.rejects(groupEdit(db, {hotelId: "missing"}),
    /Hotel not found/);
  db.updateDoc("programHotels/hotel-1",
    {programId: "program-2", organizerId: "org-2"});
  await assert.rejects(groupEdit(db, {hotelId: "hotel-1"}),
    /Hotel not found/);
});

test("group lists project the hotel link", async () => {
  const db = new FakeFirestore(seed());
  db.updateDoc("programGuestGroups/side-a", {hotelId: "hotel-1"});
  const list = await listProgramGuestGroupsHandler(request({
    programId: "program-1"}, "manager-1"), deps(db));
  assert.equal(
    list.groups.find((g) => g.groupId === "side-a")!.hotelId, "hotel-1");
  assert.equal(
    list.groups.find((g) => g.groupId === "company-b")!.hotelId, null);
});

test("program groups reject staff without the coordinator duty", async () => {
  const db = new FakeFirestore({...seed(),
    "organizers/org-1": {
      hostUserId: "owner-1", ownerUserId: "owner-1",
      hostUserIds: ["owner-1"], hostProfiles: []},
  });
  const owned = await listProgramGuestGroupsHandler(request({
    programId: "program-1"}, "manager-1"), deps(db));
  assert.equal(owned.groups.length, 2);
  await assert.rejects(listProgramGuestGroupsHandler(request({
    programId: "program-1"}, "dispatcher-1"), deps(db)),
  /lacks the programCoordinator duty/);
});


test("group deletion reaches suggestion-only guests beyond an unchanged page",
  async () => {
    const db = new FakeFirestore(seed());
    const guest = db.getDoc("programGuests/guest-1")!;
    for (let i = 0; i < 401; i++) {
      db.setDoc(`programGuests/a-${String(i).padStart(3, "0")}`,
        {...guest, groupIds: []});
    }
    const imported = planImportedMembership({guest: {groupIds: []},
      programId: "program-1", organizerId: "org-1", guestId: "z-target",
      groupIds: ["side-a", "company-b"], operationId: "source-list",
      rowIndex: 0, actorUid: "manager-1", observedAtMillis: now.toMillis()});
    for (const write of imported.writes) {
      db.setDoc(write.path, {...write.data});
    }
    const pointers = imported.projection.suggestions;
    db.setDoc("programGuests/z-target", {...guest, groupIds: [],
      membershipSuggestions: pointers});
    db.setDoc("programGuests/foreign", {...guest, programId: "program-2",
      organizerId: "org-2", groupIds: [], membershipSuggestions: pointers});
    const history = [...db.docs].filter(([path]) =>
      path.startsWith("workspaceMembership"));
    const untouched = {...db.getDoc("programGuests/a-000")!};
    const foreign = {...db.getDoc("programGuests/foreign")!};
    await deleteProgramGuestGroupHandler(request({programId: "program-1",
      groupId: "side-a", expectedRevision: 1}, "manager-1"), deps(db));
    const updated = db.getDoc("programGuests/z-target")!;
    assert.deepEqual(updated.groupIds, []);
    assert.deepEqual(updated.membershipSuggestions,
      pointers.filter((p) => p.groupId === "company-b"));
    assert.ok((updated.revision as number) > (guest.revision as number));
    assert.deepEqual(db.getDoc("programGuests/a-000"), untouched);
    assert.deepEqual(db.getDoc("programGuests/foreign"), foreign);
    assert.deepEqual([...db.docs].filter(([path]) =>
      path.startsWith("workspaceMembership")), history);
  });

test("group deletion frees excluded choices at the membership pointer cap",
  async () => {
    const db = new FakeFirestore(seed());
    for (let batch = 0; batch < 10; batch++) {
      const ids = Array.from({length: 10}, (_, i) =>
        `retired-${batch * 10 + i}`);
      for (const id of ids) {
        db.setDoc(`programGuestGroups/${id}`, group({label: id}));
      }
      const guest = db.getDoc("programGuests/guest-1")!;
      const imported = planImportedMembership({guest,
        programId: "program-1", organizerId: "org-1", guestId: "guest-1",
        groupIds: ids, operationId: `excluded-list-${batch}`, rowIndex: 0,
        actorUid: "manager-1", observedAtMillis: now.toMillis()});
      for (const write of imported.writes) {
        db.setDoc(write.path, {...write.data});
      }
      db.updateDoc("programGuests/guest-1", {
        membershipSuggestions: imported.projection.suggestions});
      await upsertProgramGuestHandler(request({programId: "program-1",
        guestId: "guest-1", displayName: "Rohan Sharma",
        expectedRevision: guest.revision, groupIds: []},
      "manager-1"), deps(db));
    }
    const full = db.getDoc("programGuests/guest-1")!;
    assert.equal((full.membershipSelections as unknown[]).length, 100);
    assert.deepEqual(full.groupIds, []);
    const history = [...db.docs].filter(([path]) =>
      path.startsWith("workspaceMembership"));
    await deleteProgramGuestGroupHandler(request({programId: "program-1",
      groupId: "retired-0", expectedRevision: 1}, "manager-1"), deps(db));
    const cleaned = db.getDoc("programGuests/guest-1")!;
    assert.equal((cleaned.membershipSelections as unknown[]).length, 99);
    assert.deepEqual([...db.docs].filter(([path]) =>
      path.startsWith("workspaceMembership")), history);
    await upsertProgramGuestHandler(request({programId: "program-1",
      guestId: "guest-1", displayName: "Rohan Sharma",
      expectedRevision: cleaned.revision, groupIds: ["company-b"]},
    "manager-1"), deps(db));
    assert.deepEqual(db.getDoc("programGuests/guest-1")!.groupIds,
      ["company-b"]);
    assert.equal(groupDoc(db, "company-b").memberCount, 1);
  });


for (const field of ["groupIds", "membershipSelections",
  "membershipSuggestions"]) {
  for (const bad of [null, [{}]]) {
    test(`group cleanup rejects ${field}=${JSON.stringify(bad)}`, async () => {
      const db = new FakeFirestore(seed());
      db.updateDoc("programGuests/guest-1", {[field]: bad});
      const before = [...db.docs].filter(([path]) =>
        path.startsWith("programGuests/") ||
        path.startsWith("workspaceMembership"));
      await assert.rejects(deleteProgramGuestGroupHandler(request({
        programId: "program-1", groupId: "side-a", expectedRevision: 1},
      "manager-1"), deps(db)), (error: unknown) => {
        assert.ok(error instanceof Error && "code" in error);
        assert.equal(error.code, "failed-precondition");
        assert.match(error.message, /reconciliation/);
        return true;
      });
      assert.deepEqual([...db.docs].filter(([path]) =>
        path.startsWith("programGuests/") ||
        path.startsWith("workspaceMembership")), before);
    });
  }
}
