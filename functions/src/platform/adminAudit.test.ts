import assert from "node:assert/strict";
import test from "node:test";
import {FieldValue, Timestamp} from "firebase-admin/firestore";
import {FakeFirestore} from "../shared/testing/fakeFirestore";
import {
  assertValidAdminAuditLog,
  createAdminAuditLogInTransaction,
  setAdminAuditLogInTransaction,
  writeAdminAuditLog,
} from "./adminAudit";

const db = () => new FakeFirestore();
const asDb = (fake: FakeFirestore) =>
  fake as unknown as FirebaseFirestore.Firestore;
type Tx = FirebaseFirestore.Transaction;

test("a valid audit entry is written with the server clock", async () => {
  const fake = db();
  await writeAdminAuditLog(asDb(fake), {uid: "staff-1", roles: ["support"]}, {
    action: "people.search",
    targetPath: "adminPeopleIndex",
    note: "Prefix search",
    serverTimestamp: () => FieldValue.serverTimestamp(),
  });
  const [path] = fake.paths("adminAuditLogs/");
  const stored = fake.get(path)!;
  assert.equal(stored.actorUid, "staff-1");
  assert.deepEqual(stored.roles, ["support"]);
  assert.equal(stored.note, "Prefix search");
  assert.ok(stored.createdAt instanceof Timestamp);
  assert.equal("requestId" in stored, false);
});

test("a callable without a trace header writes no requestId", async () => {
  const fake = db();
  await fake.runTransaction(async (tx) => {
    setAdminAuditLogInTransaction(tx as unknown as Tx, asDb(fake),
      {uid: "owner-1", roles: ["adminOwner"]}, {
        action: "discovery.update",
        targetPath: "discoverySettings/current",
        request: {rawRequest: {headers: {}}} as never,
        serverTimestamp: () => FieldValue.serverTimestamp(),
      });
  });
  const stored = fake.get(fake.paths("adminAuditLogs/")[0])!;
  assert.equal("requestId" in stored, false);
});

test("a deterministic id creates exactly one entry", async () => {
  const fake = db();
  const write = () => fake.runTransaction(async (tx) => {
    createAdminAuditLogInTransaction(tx as unknown as Tx, asDb(fake),
      {uid: "owner-1", roles: ["adminOwner"]}, {
        action: "salesDemo.blueprint.save",
        targetPath: "salesDemoBlueprints/b-1",
        requestId: "request-0001",
        before: {revision: 1},
        after: {revision: 2, materialHash: "abc"},
      }, {docId: "sales_demo_r-1"});
  });
  await write();
  assert.deepEqual(fake.paths("adminAuditLogs/"),
    ["adminAuditLogs/sales_demo_r-1"]);
  const stored = fake.get("adminAuditLogs/sales_demo_r-1")!;
  assert.equal(stored.requestId, "request-0001");
  assert.deepEqual(stored.before, {revision: 1});
  assert.deepEqual(stored.after, {revision: 2, materialHash: "abc"});
  assert.ok(stored.createdAt instanceof Timestamp);
  await assert.rejects(write);
  assert.equal(fake.paths("adminAuditLogs/").length, 1);
});

test("an invalid audit document is rejected before any write", async () => {
  const fake = db();
  await assert.rejects(fake.runTransaction(async (tx) => {
    createAdminAuditLogInTransaction(tx as unknown as Tx, asDb(fake),
      {uid: "partner-1", roles: ["partner"]}, {
        action: "partner.draft.record",
        targetPath: "salesIntelligenceReceipts/r-1",
      });
  }), /Invalid admin audit log: \/roles\/0/);
  await assert.rejects(fake.runTransaction(async (tx) => {
    createAdminAuditLogInTransaction(tx as unknown as Tx, asDb(fake),
      {uid: "", roles: ["admin"]}, {action: "x", targetPath: "a/b"});
  }), /\/actorUid/);
  assert.equal(fake.paths("adminAuditLogs/").length, 0);
  assert.throws(() => assertValidAdminAuditLog({actorUid: "u",
    actorRoles: ["adminOwner"], action: "x", targetPath: "a/b"}),
  /must have required property 'roles'/);
  assert.throws(() => assertValidAdminAuditLog({actorUid: "u", roles: [],
    action: "x", targetPath: "a/b", beforeRevision: 1}),
  /must NOT have additional properties/);
});
