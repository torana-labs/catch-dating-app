import assert from "node:assert/strict";
import test from "node:test";
import * as admin from "firebase-admin";
import type {
  ProgramAccessViewDocument,
} from "../../shared/generated/firestoreAdminTypes";
import {
  accessGrantId,
  programAccessGrant,
  programAccessGrantId,
  stageProgramAccessGrant,
} from "./programAccessGrants";

const now = 1_800_000_000_000;
const hour = 3_600_000;
const updatedAt = admin.firestore.Timestamp.fromMillis(now);
const maps = ["duties", "pickupAll", "pickupScoped", "hotelAll",
  "hotelScoped", "functionAll", "functionScoped", "programAll",
  "workPickup", "workHotel", "workFunction", "arrivalRoutes",
  "tripRoutes"] as const;

/** A view as programAccessViewFor writes it (built by hand here: the access
 * context imports platform only). */
function view(overrides: Partial<ProgramAccessViewDocument> = {}):
  ProgramAccessViewDocument {
  const empty = Object.fromEntries(maps.map((key) => [key, {}]));
  return {programId: "program-1", organizerId: "org-1", uid: "desk-1",
    ownerUid: "owner-1", role: "staff", status: "active",
    activeFromMillis: now - hour, expiresAtMillis: now + 2 * hour,
    ...empty, assignments: [], grantExpiresAtMillis: now + 2 * hour,
    organizerManager: true, revision: 4, version: 1,
    ...overrides} as ProgramAccessViewDocument;
}

test("ids are scopeType__scopeId__uid, so rules build them from trusted ids",
  () => {
    assert.equal(accessGrantId("program", "program_a_b", "uid-1"),
      "program__program_a_b__uid-1");
    assert.equal(programAccessGrantId("program-1", "desk-1"),
      "program__program-1__desk-1");
  });

test("the owner is role owner with empty reach and no grantor", () => {
  const owner = view({uid: "owner-1", role: "manager", activeFromMillis: 0,
    expiresAtMillis: null, grantExpiresAtMillis: null, revision: 0});
  const document = programAccessGrant(owner, "someone", updatedAt);
  assert.equal(document?.role, "owner");
  assert.equal(document?.status, "active");
  assert.equal(document?.expiresAtMillis, null);
  assert.equal(document?.grantedBy, null);
  assert.deepEqual(document?.reach.duties, {});
  assert.equal(document?.scopeType, "program");
  assert.equal(document?.organizerId, "org-1");
});

test("a staff grant's reach is exactly the view's expiry maps", () => {
  const staff = view({duties: {guestRelations: now + 2 * hour},
    programAll: {guestRelations: now + 2 * hour},
    arrivalRoutes: {"*|*": now + hour},
    assignments: [{duty: "guestRelations", pickupPointIds: [], hotelIds: [],
      expiresAtMillis: now + 2 * hour}]});
  const document = programAccessGrant(staff, "owner-1", updatedAt)!;
  assert.equal(document.role, "staff");
  assert.equal(document.status, "active");
  assert.equal(document.reach.programAll?.guestRelations, now + 2 * hour);
  for (const key of maps) {
    assert.deepEqual(document.reach[key], staff[key], key);
  }
  assert.deepEqual(document.assignments, staff.assignments);
  assert.equal(document.grantedBy, "owner-1");
  assert.equal(document.revision, 4);
  assert.equal(Object.hasOwn(document, "organizerManager"), false);
});

test("an inactive view is an inactive document with empty reach", () => {
  const document = programAccessGrant(view({status: "inactive",
    activeFromMillis: 0, expiresAtMillis: null,
    grantExpiresAtMillis: null}), "owner-1", updatedAt)!;
  assert.equal(document.status, "inactive");
  assert.deepEqual(document.reach.programAll, {});
  assert.deepEqual(document.assignments, []);
});

test("nothing held means no document, and staging deletes it", () => {
  assert.equal(programAccessGrant(null, null, updatedAt), null);
  const calls: Array<[string, string, unknown?]> = [];
  const writer = {
    set: (ref: {path: string}, data: unknown) => {
      calls.push(["set", ref.path, data]);
    },
    delete: (ref: {path: string}) => {
      calls.push(["delete", ref.path]);
    },
  };
  const db = {collection: (name: string) => ({doc: (id: string) =>
    ({path: `${name}/${id}`})})} as unknown as FirebaseFirestore.Firestore;
  stageProgramAccessGrant(writer as never, db, {programId: "program-1",
    uid: "desk-1", view: null, grantedBy: null, updatedAt});
  stageProgramAccessGrant(writer as never, db, {programId: "program-1",
    uid: "owner-1", view: view({uid: "owner-1", role: "manager"}),
    grantedBy: null, updatedAt});
  assert.deepEqual(calls.map(([kind, path]) => [kind, path]), [
    ["delete", "accessGrants/program__program-1__desk-1"],
    ["set", "accessGrants/program__program-1__owner-1"],
  ]);
});
