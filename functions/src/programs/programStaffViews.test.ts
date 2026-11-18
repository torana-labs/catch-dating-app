import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {FakeFirestore} from "../shared/testing/programFirestore";
import {baseSeed} from "../shared/testing/programFixtures";
import type {
  OrganizerProgramDocument,
  ProgramStaffGrantDocument,
} from "../shared/generated/firestoreAdminTypes";
import {
  programStaffView,
  reconcileProgramStaffView,
} from "./programStaffViews";

const at = (millis: number) => Timestamp.fromMillis(millis);
const now = 1_800_000_000_000;
const hour = 3_600_000;
const program = {organizerId: "org-1", createdBy: "manager-1",
  status: "active"} as unknown as OrganizerProgramDocument;

function grant(overrides: Record<string, unknown> = {}) {
  return {organizerId: "org-1", programId: "program-1", uid: "staff-1",
    displayName: "Arjun", phoneLastFour: "0001",
    duties: [{duty: "hotelDesk", pickupPointIds: [], hotelIds: ["h-1"],
      expiresAtMillis: now + hour}],
    status: "active", createdBy: "manager-1", createdAt: at(now - hour),
    expiresAt: at(now + hour), revokedBy: null, revokedAt: null,
    updatedAt: at(now), revision: 4, ...overrides,
  } as unknown as ProgramStaffGrantDocument;
}

test("the row is the callable's member row with the status's facts", () => {
  const row = programStaffView(program, "program-1", grant(), now)!;
  assert.equal(row.displayName, "Arjun");
  assert.equal(row.phoneLastFour, "0001");
  assert.equal(row.duties.length, 1);
  assert.equal(row.revoked, false);
  assert.equal(row.ownerApproved, true);
  assert.equal(row.activeUntilMillis, now + hour);
  assert.equal(row.expiresAtMillis, now + hour);
  assert.equal(row.revision, 4);
  // No full phone number or other identity field is present.
  assert.deepEqual(Object.keys(row).sort(), ["activeFromMillis",
    "activeUntilMillis", "displayName", "duties", "expiresAtMillis",
    "organizerId", "ownerApproved", "phoneLastFour", "programId", "revision",
    "revoked", "uid", "version"]);
});

test("revoked, expired and approval-required grants say so", () => {
  const revoked = programStaffView(program, "program-1",
    grant({status: "revoked", revokedBy: "manager-1", revokedAt: at(now)}),
    now)!;
  assert.equal(revoked.revoked, true);
  const expired = programStaffView(program, "program-1", grant({duties: [
    {duty: "hotelDesk", pickupPointIds: [], hotelIds: [],
      expiresAtMillis: now - 1}]}), now)!;
  assert.equal(expired.activeUntilMillis, null);
  // A proof from someone other than the programme's owner is no approval.
  const unapproved = programStaffView(program, "program-1", grant({
    programAuthorization: {ownerUid: "impostor", approvedByUid: "impostor",
      approvedAtMillis: now - hour, authorizedUntilMillis: now + hour}}),
  now)!;
  assert.equal(unapproved.ownerApproved, false);
  assert.equal(unapproved.activeUntilMillis, null);
  assert.equal(programStaffView(program, "program-1",
    grant({organizerId: "foreign"}), now), null);
});

test("an assignment past the owner's deadline is not live, as in the " +
  "callable", () => {
  const proof = {ownerUid: "manager-1", approvedByUid: "manager-1",
    approvedAtMillis: now - hour, authorizedUntilMillis: now + hour / 2};
  const row = programStaffView(program, "program-1", grant({
    programAuthorization: proof}), now)!;
  assert.equal(row.ownerApproved, true);
  assert.equal(row.activeUntilMillis, null);
  assert.equal(row.activeFromMillis, now - hour);
});

test("anonymized grants carry no name or digits", () => {
  const row = programStaffView(program, "program-1",
    grant({displayName: null, phoneLastFour: null}), now)!;
  assert.equal(row.displayName, null);
  assert.equal(row.phoneLastFour, null);
});

test("reconcile writes on change only and follows the grant", async () => {
  const store = new FakeFirestore(baseSeed());
  const db = store as unknown as FirebaseFirestore.Firestore;
  const path = "programStaffViews/program-1__greeter-1";
  await reconcileProgramStaffView(db, "program-1", "greeter-1", now);
  assert.equal((store.getDoc(path) as {displayName: string}).displayName,
    "Arjun");
  let writes = 0;
  const setDoc = store.setDoc.bind(store);
  store.setDoc = (...args: Parameters<typeof setDoc>) => {
    writes++;
    return setDoc(...args);
  };
  await reconcileProgramStaffView(db, "program-1", "greeter-1", now);
  assert.equal(writes, 0, "a no-op writes nothing");
  store.updateDoc("programStaffGrants/program-1__greeter-1", {
    status: "revoked", revokedBy: "manager-1", revokedAt: at(now),
    revision: 2});
  await reconcileProgramStaffView(db, "program-1", "greeter-1", now);
  assert.equal((store.getDoc(path) as {revoked: boolean}).revoked, true);
  store.deleteDoc("programStaffGrants/program-1__greeter-1");
  await reconcileProgramStaffView(db, "program-1", "greeter-1", now);
  assert.equal(store.getDoc(path), undefined);
});
