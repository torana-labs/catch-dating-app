import assert from "node:assert/strict";
import test from "node:test";
import * as admin from "firebase-admin";
import {deps, request, now} from "../shared/testing/programFixtures";
import {FakeFirestore, type FakeData} from
  "../shared/testing/programFirestore";
import {createProgramWalkInHandler} from "./doorView";

const FUTURE = now.toMillis() + 86_400_000;
const T0 = now.toMillis() + 1_000;

const fn = (id: string, patch: FakeData = {}): FakeData => ({
  programId: "program-1",
  organizerId: "org-1",
  name: id,
  startsAt: admin.firestore.Timestamp.fromMillis(1_800_600_000_000),
  endsAt: admin.firestore.Timestamp.fromMillis(1_800_603_000_000),
  venueName: "Venue",
  venueNotes: null,
  venueLocation: null,
  dressCode: null,
  instructions: null,
  invitationMode: "selectedGuests",
  checkInEnabled: true,
  expectedCount: 0,
  checkedInCount: 0,
  status: "scheduled",
  createdAt: now,
  updatedAt: now,
  revision: 1,
  ...patch,
});

const guest = (id: string, patch: FakeData = {}): FakeData => ({
  programId: "program-1",
  organizerId: "org-1",
  displayName: id,
  householdId: null,
  contactId: null,
  phoneE164: "secret",
  email: "secret@example.com",
  externalReference: null,
  invitationStatus: "invited",
  rsvpStatus: "attending",
  source: "manual",
  createdAt: now,
  updatedAt: now,
  revision: 1,
  ...patch,
});

const join = (functionId: string, guestId: string,
  patch: FakeData = {}): FakeData => ({
  programId: "program-1",
  organizerId: "org-1",
  functionId,
  guestId,
  invited: true,
  rsvpStatus: "attending",
  attendanceStatus: "expected",
  partySize: null,
  respondedAt: now,
  responseNote: null,
  responseSource: "householdLink",
  recordedByUid: null,
  createdAt: now,
  updatedAt: now,
  revision: 1,
  ...patch,
});

const grant = (uid: string, duties: FakeData[],
  displayName = "Staff"): FakeData => ({
  organizerId: "org-1",
  programId: "program-1",
  uid,
  displayName,
  phoneLastFour: "0000",
  duties,
  status: "active",
  createdBy: "manager-1",
  createdAt: now,
  expiresAt: admin.firestore.Timestamp.fromMillis(FUTURE),
  revokedBy: null,
  revokedAt: null,
  updatedAt: now,
  revision: 1,
});

const duty = (name: string, functionIds?: string[]): FakeData => ({
  duty: name,
  pickupPointIds: [],
  hotelIds: [],
  ...(functionIds === undefined ? {} : {functionIds}),
  expiresAtMillis: FUTURE,
});

const seed = (): Record<string, FakeData> => ({
  "organizers/org-1": {
    hostUserId: "manager-1", ownerUserId: "manager-1",
    hostUserIds: ["manager-1"], hostProfiles: [],
  },
  "organizerPrograms/program-1": {
    organizerId: "org-1", kind: "wedding", title: "Wedding",
    timezone: "Asia/Kolkata", status: "active", capabilities: [],
    transportSettings: {vehicleClasses: []},
    startsAt: admin.firestore.Timestamp.fromMillis(1_800_600_000_000),
    endsAt: admin.firestore.Timestamp.fromMillis(1_800_900_000_000),
    createdBy: "manager-1", createdAt: now, updatedAt: now, revision: 1,
  },
  "programFunctions/fn-sangeet": fn("fn-sangeet"),
  "programFunctions/fn-mehndi": fn("fn-mehndi"),
  "programFunctions/fn-open": fn("fn-open", {invitationMode: "allGuests"}),
  "programGuests/g-1": guest("g-1"),
  "programGuests/g-2": guest("g-2", {rsvpStatus: "pending"}),
  "programGuests/g-3": guest("g-3"),
  "programGuests/w-1": guest("w-1", {invitationStatus: "notInvited"}),
  "programHouseholds/h-1": {
    programId: "program-1", organizerId: "org-1", label: "The Mehtas",
    primaryContactName: "A", primaryPhoneE164: null, primaryEmail: null,
    memberGuestIds: ["g-1"], deliveryPreference: "whatsapp",
    createdAt: now, updatedAt: now, revision: 1,
  },
  "programFunctionGuests/fn-sangeet_g-1": join("fn-sangeet", "g-1",
    {partySize: 2}),
  "programFunctionGuests/fn-sangeet_g-2": join("fn-sangeet", "g-2",
    {rsvpStatus: "pending"}),
  "programFunctionGuests/fn-sangeet_w-1": join("fn-sangeet", "w-1", {
    invited: false, rsvpStatus: "pending", attendanceStatus: "checkedIn",
    partySize: 3, respondedAt: null, responseSource: "staff",
    recordedByUid: "door-1",
  }),
  "programFunctionGuests/fn-mehndi_g-2": join("fn-mehndi", "g-2"),
  "programStaffGrants/program-1__door-1":
    grant("door-1", [duty("functionCheckIn")], "Door One"),
  "programStaffGrants/program-1__door-scoped":
    grant("door-scoped", [duty("functionCheckIn", ["fn-mehndi"])]),
  "programStaffGrants/program-1__lead-1":
    grant("lead-1", [duty("functionLead")], "Lead One"),
  "programStaffGrants/program-1__staff-other":
    grant("staff-other", [duty("guestRelations")]),
});

const walkIn = (db: FakeFirestore, uid: string,
  data: Record<string, unknown> = {}) =>
  createProgramWalkInHandler(request({
    programId: "program-1", functionId: "fn-sangeet",
    displayName: "Surprise Cousin", occurredAtMillis: T0,
    clientOperationId: "walkin-op-1", partySize: 2, note: null,
    deviceId: "door-pad-1",
    ...data,
  }, uid), deps(db));

const denied = (err: unknown) =>
  (err as {code?: string}).code === "permission-denied";
const precondition = (err: unknown) =>
  (err as {code?: string}).code === "failed-precondition";

test("walk-in creates the guest, join row, and journal entry atomically",
  async () => {
    const db = new FakeFirestore(seed());
    const result = await walkIn(db, "door-1");
    assert.equal(result.alreadyApplied, false);
    const guestId = result.entityId;
    const created = db.getDoc(`programGuests/${guestId}`) as FakeData;
    assert.equal(created.displayName, "Surprise Cousin");
    assert.equal(created.invitationStatus, "notInvited");
    const row = db.getDoc(
      `programFunctionGuests/fn-sangeet_${guestId}`) as FakeData;
    assert.equal(row.invited, false);
    assert.equal(row.attendanceStatus, "checkedIn");
    assert.equal(row.partySize, 2);
    const journal = (await db.collection("programDoorJournal").get()).docs
      .map((doc) => doc.data() as FakeData)
      .filter((doc) => doc.guestId === guestId);
    assert.equal(journal.length, 1);
    const fnDoc = db.getDoc("programFunctions/fn-sangeet") as FakeData;
    assert.equal(fnDoc.checkedInCount, 3 + 2); // w-1 party of 3 + walk-in
  });

test("walk-in replays idempotently on the same clientOperationId",
  async () => {
    const db = new FakeFirestore(seed());
    const first = await walkIn(db, "door-1");
    const second = await walkIn(db, "door-1");
    assert.equal(second.entityId, first.entityId);
    assert.equal(second.alreadyApplied, true);
    assert.equal(
      (await db.collection("programGuests").get()).docs
        .map((doc) => doc.data() as FakeData)
        .filter((doc) => doc.displayName === "Surprise Cousin").length,
      1);
  });

test("walk-in requires door authority over the function", async () => {
  await assert.rejects(walkIn(new FakeFirestore(seed()), "staff-other"),
    denied);
  await assert.rejects(walkIn(new FakeFirestore(seed()), "door-scoped"),
    denied);
  const ok = await walkIn(
    new FakeFirestore(seed()), "door-scoped", {functionId: "fn-mehndi"});
  assert.equal(ok.alreadyApplied, false);
});

test("walk-in refuses cancelled and check-in-disabled functions",
  async () => {
    const cancelled = seed();
    cancelled["programFunctions/fn-sangeet"] =
      fn("fn-sangeet", {status: "cancelled"});
    await assert.rejects(
      walkIn(new FakeFirestore(cancelled), "door-1"), precondition);
    const disabled = seed();
    disabled["programFunctions/fn-sangeet"] =
      fn("fn-sangeet", {checkInEnabled: false});
    await assert.rejects(
      walkIn(new FakeFirestore(disabled), "door-1"), precondition);
  });
