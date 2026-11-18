import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {FakeFirestore} from "../shared/testing/programFirestore";
import {baseSeed} from "../shared/testing/programFixtures";
import {
  programDoorFunction,
  programDoorJournalView,
  programDoorRow,
  programDoorRowId,
  reconcileProgramDoorFunction,
  reconcileProgramDoorJournalView,
  reconcileProgramDoorRow,
} from "./programDoorViews";

const at = (millis: number) => Timestamp.fromMillis(millis);

const fn = (overrides: Record<string, unknown> = {}) => ({
  programId: "program-1", organizerId: "org-1", name: "Sangeet",
  venueName: "Lawn", venueNotes: "ring Ravi", dressCode: "gold",
  instructions: "gate 2", startsAt: at(1000), endsAt: at(5000),
  status: "scheduled", checkInEnabled: true, expectedCount: 12,
  checkedInCount: 3, ...overrides});
const guest = (overrides: Record<string, unknown> = {}) => ({
  programId: "program-1", organizerId: "org-1", displayName: "Rohan",
  householdId: null, phoneE164: "+919999900001", email: "r@example.com",
  ...overrides});
const join = (overrides: Record<string, unknown> = {}) => ({
  programId: "program-1", functionId: "f1", guestId: "g1", invited: true,
  rsvpStatus: "attending", attendanceStatus: "expected", partySize: 3,
  responseNote: "vegan", ...overrides});

test("the door header is the callable's function fields, with defaults", () => {
  const header = programDoorFunction("f1", fn({invitationMode: undefined,
    checkInEnabled: undefined, expectedCount: undefined,
    checkedInCount: undefined}))!;
  assert.equal(header.invitationMode, "allGuests");
  assert.equal(header.checkInEnabled, true);
  assert.equal(header.expectedCount, 0);
  assert.equal(header.venueNotes, "ring Ravi");
  assert.equal(header.startsAtMillis, 1000);
  assert.equal(programDoorFunction("f1", undefined), null);
});

test("a row never carries a contact field", () => {
  const row = programDoorRow("f1", fn(), "g1", join(), guest(), "Sharma")!;
  assert.deepEqual(row, {programId: "program-1", organizerId: "org-1",
    functionId: "f1", guestId: "g1", displayName: "Rohan", invited: true,
    rsvpStatus: "attending", attendanceStatus: "expected", partySize: 3,
    householdLabel: "Sharma", responseNote: "vegan", version: 1});
  const text = JSON.stringify(row);
  assert.equal(text.includes("9999900001"), false);
  assert.equal(text.includes("example.com"), false);
});

test("allGuests invites everyone; selectedGuests lists only join rows", () => {
  const all = programDoorRow("f1", fn(), "g1", undefined, guest(), null)!;
  assert.equal(all.invited, true);
  assert.equal(all.rsvpStatus, "pending");
  assert.equal(programDoorRow("f1", fn({invitationMode: "selectedGuests"}),
    "g1", undefined, guest(), null), null);
  // A walk-in: not invited but checked in, so listed.
  const walkIn = programDoorRow("f1", fn({invitationMode: "selectedGuests"}),
    "g1", join({invited: false, attendanceStatus: "checkedIn"}), guest(),
    null)!;
  assert.equal(walkIn.invited, false);
  // Not invited and still expected: not on the door list.
  assert.equal(programDoorRow("f1", fn({invitationMode: "selectedGuests"}),
    "g1", join({invited: false}), guest(), null), null);
});

test("a guest or join row of another programme is not listed", () => {
  assert.equal(programDoorRow("f1", fn(), "g1", undefined,
    guest({programId: "other"}), null), null);
  const ignored = programDoorRow("f1", fn(), "g1",
    join({programId: "other", attendanceStatus: "checkedIn"}), guest(),
    null)!;
  assert.equal(ignored.attendanceStatus, "expected");
});

test("an anonymized journal entry carries no name, note or label", () => {
  const entry = {programId: "program-1", organizerId: "org-1",
    functionId: "f1", guestId: "g1", actorUid: "staff-1",
    action: "checkIn", occurredAtMillis: 9, partySize: 2, note: "late",
    deviceId: "dev-1"};
  const view = programDoorJournalView("j1", entry, "Rohan", "Arjun")!;
  assert.deepEqual(view, {programId: "program-1", organizerId: "org-1",
    functionId: "f1", guestId: "g1", displayName: "Rohan",
    action: "checkIn", occurredAtMillis: 9, partySize: 2, note: "late",
    actorLabel: "Arjun", version: 1});
  assert.equal(JSON.stringify(view).includes("staff-1"), false);
  assert.equal(JSON.stringify(view).includes("dev-1"), false);
  const scrubbed = programDoorJournalView("j1",
    {...entry, anonymizedAt: at(1)}, "Rohan", "Arjun")!;
  assert.equal(scrubbed.displayName, null);
  assert.equal(scrubbed.note, null);
  assert.equal(scrubbed.actorLabel, null);
});

test("reconcile writes rows on change only and removes unlisted ones",
  async () => {
    const seed = {...baseSeed(),
      "programFunctions/f1": fn(),
      "programHouseholds/hh1": {programId: "program-1", label: "Sharma"},
      "programGuests/g1": guest({householdId: "hh1"}),
      "programFunctionGuests/f1_g1": join(),
      "programDoorJournal/j1": {programId: "program-1",
        organizerId: "org-1", functionId: "f1", guestId: "g1",
        actorUid: "greeter-1", action: "checkIn", occurredAtMillis: 9,
        partySize: 3, note: null, deviceId: null}};
    const store = new FakeFirestore(seed);
    const db = store as unknown as FirebaseFirestore.Firestore;
    await reconcileProgramDoorFunction(db, "f1");
    await reconcileProgramDoorRow(db, "f1", "g1");
    await reconcileProgramDoorJournalView(db, "j1");
    const rowPath = `programDoorRows/${programDoorRowId("f1", "g1")}`;
    assert.equal((store.getDoc(rowPath) as {householdLabel: string})
      .householdLabel, "Sharma");
    assert.equal((store.getDoc("programDoorJournalViews/j1") as
      {actorLabel: string}).actorLabel, "Arjun");

    let writes = 0;
    const setDoc = store.setDoc.bind(store);
    store.setDoc = (...args: Parameters<typeof setDoc>) => {
      writes++;
      return setDoc(...args);
    };
    await reconcileProgramDoorFunction(db, "f1");
    await reconcileProgramDoorRow(db, "f1", "g1");
    await reconcileProgramDoorJournalView(db, "j1");
    assert.equal(writes, 0, "a no-op writes nothing");

    store.updateDoc("programHouseholds/hh1", {label: "Rao"});
    await reconcileProgramDoorRow(db, "f1", "g1");
    assert.equal((store.getDoc(rowPath) as {householdLabel: string})
      .householdLabel, "Rao");

    // The guest leaves a selectedGuests list: the row goes.
    store.updateDoc("programFunctions/f1", {invitationMode: "selectedGuests"});
    store.deleteDoc("programFunctionGuests/f1_g1");
    await reconcileProgramDoorRow(db, "f1", "g1");
    assert.equal(store.getDoc(rowPath), undefined);
  });
