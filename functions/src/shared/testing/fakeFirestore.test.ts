import assert from "node:assert/strict";
import test from "node:test";
import {FieldValue, Timestamp} from "firebase-admin/firestore";
import {FakeFirestore} from "./fakeFirestore";

test("Timestamps stay Timestamps through seed, write and read", async () => {
  const at = Timestamp.fromMillis(5_000);
  const db = new FakeFirestore({"events/e1": {startTime: at}});
  const read = (await db.collection("events").doc("e1").get()).data();
  assert.ok(read?.startTime instanceof Timestamp);
  assert.equal((read?.startTime as Timestamp).toMillis(), 5_000);
});

test("write-time sentinels resolve when the write commits", async () => {
  const db = new FakeFirestore({"events/e1": {bookedCount: 2, tags: ["a"],
    note: "x"}});
  db.now = () => Timestamp.fromMillis(9_000);
  await db.runTransaction(async (tx) => {
    tx.update(db.doc("events/e1"), {
      bookedCount: FieldValue.increment(1),
      tags: FieldValue.arrayUnion("a", "b"),
      note: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
  const event = db.get("events/e1")!;
  assert.equal(event.bookedCount, 3);
  assert.deepEqual(event.tags, ["a", "b"]);
  assert.equal("note" in event, false);
  assert.equal((event.updatedAt as Timestamp).toMillis(), 9_000);
});

test("merge writes merge deeply and dotted updates reach nested fields",
  async () => {
    const db = new FakeFirestore({"rows/r1": {booking: {status: "signedUp",
      paymentId: "pay_1"}, partySize: 2}});
    await db.doc("rows/r1").set({booking: {status: "cancelled"}},
      {merge: true});
    assert.deepEqual(db.get("rows/r1"), {booking: {status: "cancelled",
      paymentId: "pay_1"}, partySize: 2});
    await db.doc("rows/r1").update({"booking.deletedAt": "now"});
    assert.equal((db.get("rows/r1")!.booking as {deletedAt: string})
      .deletedAt, "now");
  });

test("queries filter and order on dotted paths with cursors", async () => {
  const db = new FakeFirestore({
    "rows/a": {eventId: "e1", booking: {status: "waitlisted",
      waitlistedAt: Timestamp.fromMillis(3)}},
    "rows/b": {eventId: "e1", booking: {status: "waitlisted",
      waitlistedAt: Timestamp.fromMillis(1)}},
    "rows/c": {eventId: "e1", booking: {status: "signedUp"}},
    "rows/d": {eventId: "e2", booking: {status: "waitlisted",
      waitlistedAt: Timestamp.fromMillis(2)}},
  });
  const query = db.collection("rows").where("eventId", "==", "e1")
    .where("booking.status", "in", ["waitlisted"])
    .orderBy("booking.waitlistedAt");
  assert.deepEqual((await query.get()).docs.map((doc) => doc.id), ["b", "a"]);
  const first = (await query.limit(1).get()).docs[0];
  assert.deepEqual((await query.startAfter(first).get()).docs
    .map((doc) => doc.id), ["a"]);
  assert.equal((await db.collection("rows").count().get()).data().count, 4);
});

test("a transaction refuses a read after its first write", async () => {
  const db = new FakeFirestore({"events/e1": {}});
  await assert.rejects(db.runTransaction(async (tx) => {
    tx.set(db.doc("events/e1"), {a: 1});
    await tx.get(db.doc("events/e1"));
  }), /read every document before the first write/);
});

test("create refuses an existing document and commits nothing", async () => {
  const db = new FakeFirestore({"locks/l1": {owner: "a"}});
  await assert.rejects(db.runTransaction(async (tx) => {
    tx.set(db.doc("other/o1"), {x: 1});
    tx.create(db.doc("locks/l1"), {owner: "b"});
  }), /ALREADY_EXISTS/);
  assert.equal(db.get("other/o1"), undefined);
  assert.equal(db.get("locks/l1")?.owner, "a");
});

test("subcollections are separate from their parent's siblings", async () => {
  const db = new FakeFirestore({
    "users/u1": {},
    "users/u1/pushInstallations/i1": {token: "t"},
    "users/u2": {},
  });
  assert.equal((await db.collection("users").get()).size, 2);
  assert.equal((await db.doc("users/u1").collection("pushInstallations")
    .get()).docs[0].get("token"), "t");
});
