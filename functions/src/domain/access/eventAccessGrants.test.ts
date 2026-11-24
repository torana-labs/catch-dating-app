import assert from "node:assert/strict";
import test from "node:test";
import * as admin from "firebase-admin";
import type {
  EventStaffGrantDocument,
} from "../../shared/generated/firestoreAdminTypes";
import {
  eventAccessGrant,
  eventAccessGrantId,
  stageEventAccessGrant,
} from "./eventAccessGrants";

const now = 1_800_000_000_000;
const hour = 3_600_000;
const at = (millis: number) => admin.firestore.Timestamp.fromMillis(millis);
const updatedAt = at(now);

function grant(overrides: Partial<EventStaffGrantDocument> = {}):
  EventStaffGrantDocument {
  return {organizerId: "club-1", eventId: "event_1", uid: "operator-1",
    displayName: "Synthetic Operator", phoneLastFour: "3210",
    role: "eventOperator",
    permissions: ["viewRoster", "setAttendance"],
    operatorExpiresAt: at(now + hour),
    groupDuties: [{groupId: "group-1", duty: "sweep",
      expiresAtMillis: now + 3 * hour, sourceHash: "hash-1",
      grantedBy: "host-1", grantedAtMillis: now - hour}],
    status: "active", createdBy: "host-1", createdAt: at(now - hour),
    expiresAt: at(now + 3 * hour), revokedBy: null, revokedAt: null,
    updatedAt, revision: 5, ...overrides} as EventStaffGrantDocument;
}

test("the id is event__eventId__uid", () => {
  assert.equal(eventAccessGrantId("event_1", "operator-1"),
    "event__event_1__operator-1");
});

test("permissions end at the operator window, not at a later group duty",
  () => {
    const document = eventAccessGrant(grant(), updatedAt);
    assert.equal(document.scopeType, "event");
    assert.equal(document.scopeId, "event_1");
    assert.equal(document.organizerId, "club-1");
    assert.equal(document.role, "staff");
    assert.equal(document.status, "active");
    assert.equal(document.expiresAtMillis, now + 3 * hour);
    assert.deepEqual(document.reach.permissions,
      {viewRoster: now + hour, setAttendance: now + hour});
    assert.deepEqual(document.reach.groupDuties,
      {"group-1__sweep": now + 3 * hour});
    assert.equal(document.grantedBy, "host-1");
    assert.equal(document.revision, 5);
    assert.equal(JSON.stringify(document).includes("Synthetic"), false);
  });

test("a null operator window grants no event-wide permission", () => {
  const document = eventAccessGrant(grant({operatorExpiresAt: null}),
    updatedAt);
  assert.deepEqual(document.reach.permissions, {});
  assert.deepEqual(document.reach.groupDuties,
    {"group-1__sweep": now + 3 * hour});
});

test("a grant without operatorExpiresAt follows the callables' legacy rule",
  () => {
    const checkIn = grant({role: "checkInOperator", groupDuties: []});
    delete (checkIn as Partial<EventStaffGrantDocument>).operatorExpiresAt;
    assert.deepEqual(eventAccessGrant(checkIn, updatedAt).reach.permissions,
      {viewRoster: now + 3 * hour, setAttendance: now + 3 * hour});
    const operator = grant();
    delete (operator as Partial<EventStaffGrantDocument>).operatorExpiresAt;
    assert.deepEqual(eventAccessGrant(operator, updatedAt).reach.permissions,
      {});
  });

test("a revoked grant is an inactive document with empty reach", () => {
  const document = eventAccessGrant(grant({status: "revoked",
    revokedBy: "host-1", revokedAt: updatedAt}), updatedAt);
  assert.equal(document.status, "inactive");
  assert.equal(document.expiresAtMillis, null);
  assert.deepEqual(document.reach, {permissions: {}, groupDuties: {}});
});

test("staging sets the document beside the grant", () => {
  const calls: Array<[string, unknown]> = [];
  const writer = {set: (ref: {path: string}, data: unknown) => {
    calls.push([ref.path, data]);
  }, delete: () => undefined};
  const db = {collection: (name: string) => ({doc: (id: string) =>
    ({path: `${name}/${id}`})})} as unknown as FirebaseFirestore.Firestore;
  stageEventAccessGrant(writer as never, db, grant(), updatedAt);
  assert.equal(calls[0][0], "accessGrants/event__event_1__operator-1");
});
