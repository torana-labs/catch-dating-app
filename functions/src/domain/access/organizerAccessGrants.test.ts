import assert from "node:assert/strict";
import test from "node:test";
import * as admin from "firebase-admin";
import {
  organizerAccessGrant,
  organizerAccessGrantId,
  organizerAccessHolders,
  stageOrganizerAccessGrants,
} from "./organizerAccessGrants";

const updatedAt = admin.firestore.Timestamp.fromMillis(1_800_000_000_000);

test("the id is organizer__organizerId__uid", () => {
  assert.equal(organizerAccessGrantId("club_1", "host-1"),
    "organizer__club_1__host-1");
});

test("holders are the owner and every manager the fields name", () => {
  assert.deepEqual([...organizerAccessHolders({hostUserId: "legacy-1",
    ownerUserId: "owner-1", hostUserIds: ["owner-1", "mgr-1", "mgr-1"]})],
  [["legacy-1", "manager"], ["owner-1", "owner"], ["mgr-1", "manager"]]);
  // Without ownerUserId the legacy hostUserId owns.
  assert.deepEqual([...organizerAccessHolders({hostUserId: "host-1",
    hostUserIds: []})], [["host-1", "owner"]]);
  assert.equal(organizerAccessHolders(null).size, 0);
});

test("an organiser access document never expires and carries no reach", () => {
  const document = organizerAccessGrant({organizerId: "club-1",
    uid: "mgr-1", role: "manager", grantedBy: "owner-1", updatedAt});
  assert.equal(document.scopeType, "organizer");
  assert.equal(document.organizerId, "club-1");
  assert.equal(document.status, "active");
  assert.equal(document.expiresAtMillis, null);
  assert.deepEqual(document.reach, {});
  assert.equal(document.grantedBy, "owner-1");
});

test("staging sets every holder after the change and deletes the removed",
  () => {
    const calls: string[] = [];
    const writer = {
      set: (ref: {path: string}, data: {role: string}) => {
        calls.push(`set ${ref.path} ${data.role}`);
      },
      delete: (ref: {path: string}) => {
        calls.push(`delete ${ref.path}`);
      },
    };
    const db = {collection: (name: string) => ({doc: (id: string) =>
      ({path: `${name}/${id}`})})} as unknown as FirebaseFirestore.Firestore;
    // A transfer: owner-1 becomes a manager, mgr-1 the owner; mgr-2 removed.
    stageOrganizerAccessGrants(writer as never, db, {organizerId: "club-1",
      before: {ownerUserId: "owner-1", hostUserId: "owner-1",
        hostUserIds: ["owner-1", "mgr-1", "mgr-2"]},
      after: {ownerUserId: "mgr-1", hostUserId: "mgr-1",
        hostUserIds: ["mgr-1", "owner-1"]},
      grantedBy: "owner-1", updatedAt});
    assert.deepEqual(calls, [
      "set accessGrants/organizer__club-1__mgr-1 owner",
      "set accessGrants/organizer__club-1__owner-1 manager",
      "delete accessGrants/organizer__club-1__mgr-2",
    ]);
    calls.length = 0;
    // A deleted organiser takes every document with it.
    stageOrganizerAccessGrants(writer as never, db, {organizerId: "club-1",
      before: {ownerUserId: "mgr-1", hostUserIds: ["mgr-1"]}, after: null,
      grantedBy: null, updatedAt});
    assert.deepEqual(calls, ["delete accessGrants/organizer__club-1__mgr-1"]);
  });
