import assert from "node:assert/strict";
import test from "node:test";
import {seedWorkspaceFieldAssertions} from
  "../workspaces/workspaceFieldFixture";
import {baseSeed, now} from "../shared/testing/programFixtures";
import {FakeFirestore, type FakeData} from
  "../shared/testing/programFirestore";
import {contractValidator} from "../shared/contractTestValidators";
import {
  groupDirectoryRow,
  householdDirectoryRow,
  reconcileProgramGuestDirectoryRow,
} from "./programGuestDirectoryViews";

const validateRow = contractValidator("ProgramGuestDirectoryViewDocument");

const household = (members: string[]): FakeData => ({
  programId: "program-1", organizerId: "org-1", label: "Sharma family",
  primaryContactName: "Household contact", primaryPhoneE164: "+919900000000",
  primaryEmail: "family@example.com", memberGuestIds: members,
  deliveryPreference: "whatsapp", createdAt: now, updatedAt: now,
  revision: 3,
});
const group: FakeData = {programId: "program-1", organizerId: "org-1",
  label: "Bride's side", dimension: "side", sortOrder: 2, memberCount: 1,
  hotelId: null, createdAt: now, updatedAt: now, revision: 5};
const functionGuest = (functionId: string, patch: object = {}): FakeData => ({
  programId: "program-1", organizerId: "org-1", functionId,
  guestId: "guest-1", invited: true, rsvpStatus: "attending",
  attendanceStatus: "expected", partySize: 2, responseNote: "Vegetarian",
  createdAt: now, updatedAt: now, revision: 1, ...patch,
});

const seed = () => seedWorkspaceFieldAssertions({...baseSeed(),
  "programHouseholds/house-1": household(["guest-1"]),
  "programGuests/guest-1": {...baseSeed()["programGuests/guest-1"],
    householdId: "house-1", externalReference: "row-7",
    email: "rohan@example.com", groupIds: ["group-1"],
    rsvpStatus: "attending"},
});

function store() {
  const fake = new FakeFirestore(seed());
  fake.setDoc("programGuestGroups/group-1", group);
  fake.setDoc("programFunctionGuests/fn-sangeet_guest-1",
    functionGuest("fn-sangeet"));
  fake.setDoc("programFunctionGuests/fn-mehndi_guest-1",
    functionGuest("fn-mehndi", {rsvpStatus: "declined", partySize: null}));
  return fake;
}
const dbOf = (fake: FakeFirestore) =>
  fake as unknown as FirebaseFirestore.Firestore;

test("a guest row is the callable's guest with its function rows", async () => {
  const fake = store();
  await reconcileProgramGuestDirectoryRow(dbOf(fake), "guest", "guest-1");
  const row = fake.getDoc("programGuestDirectoryViews/guest__guest-1")!;
  assert.ok(validateRow(row), JSON.stringify(validateRow.errors));
  assert.equal(row.kind, "guest");
  assert.equal(row.sourceId, "guest-1");
  assert.equal(row.household, null);
  assert.equal(row.group, null);
  assert.deepEqual(row.guest, {
    displayName: "Rohan Sharma", householdId: "house-1", contactId: null,
    phoneE164: "+919999900001", email: "rohan@example.com",
    externalReference: "row-7", groupIds: ["group-1"],
    invitationStatus: "notInvited", rsvpStatus: "attending", revision: 1,
    functions: [
      {functionId: "fn-mehndi", invited: true, rsvpStatus: "declined",
        attendanceStatus: "expected", partySize: null},
      {functionId: "fn-sangeet", invited: true, rsvpStatus: "attending",
        attendanceStatus: "expected", partySize: 2},
    ],
  });
  // No evidence, authority or note reaches the row.
  const text = JSON.stringify(row);
  for (const hidden of ["fieldSelections", "wfa_", "Vegetarian",
    "\"source\":"]) {
    assert.equal(text.includes(hidden), false, hidden);
  }
});

test("contacts come from the selected assertions, not the flattened copy",
  async () => {
    const fake = store();
    // A flattened value that no assertion backs is restricted, so it is
    // never disclosed, exactly as listProgramGuests resolves it.
    fake.updateDoc("programGuests/guest-1", {phoneE164: "+910000000000"});
    await reconcileProgramGuestDirectoryRow(dbOf(fake), "guest", "guest-1");
    const row = fake.getDoc("programGuestDirectoryViews/guest__guest-1")!;
    assert.equal((row.guest as FakeData).phoneE164, null);
    assert.equal((row.guest as FakeData).displayName, "Rohan Sharma");
  });

test("a guest whose name is not disclosable has no row", async () => {
  const fake = store();
  await reconcileProgramGuestDirectoryRow(dbOf(fake), "guest", "guest-1");
  fake.updateDoc("programGuests/guest-1", {fieldSelections: {}});
  await reconcileProgramGuestDirectoryRow(dbOf(fake), "guest", "guest-1");
  assert.equal(fake.getDoc("programGuestDirectoryViews/guest__guest-1"),
    undefined);
});

test("function rows of another organizer are skipped", async () => {
  const fake = store();
  fake.setDoc("programFunctionGuests/fn-other_guest-1",
    functionGuest("fn-other", {organizerId: "foreign"}));
  await reconcileProgramGuestDirectoryRow(dbOf(fake), "guest", "guest-1");
  const row = fake.getDoc("programGuestDirectoryViews/guest__guest-1")!;
  assert.deepEqual(((row.guest as FakeData).functions as FakeData[])
    .map((fn) => fn.functionId), ["fn-mehndi", "fn-sangeet"]);
});

test("reconcile writes on change only and deletes with the source",
  async () => {
    const fake = store();
    const path = "programGuestDirectoryViews/guest__guest-1";
    await reconcileProgramGuestDirectoryRow(dbOf(fake), "guest", "guest-1");
    let writes = 0;
    const setDoc = fake.setDoc.bind(fake);
    fake.setDoc = (...args: Parameters<typeof setDoc>) => {
      writes++;
      return setDoc(...args);
    };
    await reconcileProgramGuestDirectoryRow(dbOf(fake), "guest", "guest-1");
    assert.equal(writes, 0, "a no-op writes nothing");
    fake.deleteDoc("programGuests/guest-1");
    await reconcileProgramGuestDirectoryRow(dbOf(fake), "guest", "guest-1");
    assert.equal(fake.getDoc(path), undefined);
  });

test("household and group rows carry labels, members and revisions only",
  async () => {
    const fake = store();
    await reconcileProgramGuestDirectoryRow(dbOf(fake), "household",
      "house-1");
    await reconcileProgramGuestDirectoryRow(dbOf(fake), "group", "group-1");
    const house = fake.getDoc("programGuestDirectoryViews/household__house-1")!;
    assert.ok(validateRow(house), JSON.stringify(validateRow.errors));
    assert.deepEqual(house.household, {label: "Sharma family",
      memberGuestIds: ["guest-1"], revision: 3});
    assert.equal(JSON.stringify(house).includes("family@example.com"), false);
    const grp = fake.getDoc("programGuestDirectoryViews/group__group-1")!;
    assert.ok(validateRow(grp), JSON.stringify(validateRow.errors));
    assert.deepEqual(grp.group, {label: "Bride's side", dimension: "side",
      sortOrder: 2, memberCount: 1, revision: 5});
    assert.equal(householdDirectoryRow("x", undefined), null);
    assert.equal(groupDirectoryRow("x", {label: "No programme"}), null);
  });
