import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {FakeFirestore} from "../shared/testing/programFirestore";
import {
  purgeRetainedSafetyRecordsNow,
  retainSafetyRecordsForDeletedAccount,
} from "./safetyRetention";

// #2468 group 4: safety records outside the original retention set get the
// same 180-day clock when the account they name is deleted, and are purged
// when it runs out. Retention is never extended.

const T0 = Date.UTC(2026, 10, 1, 9);
const DAY = 24 * 3600_000;

async function deleteAndPurge(db: FakeFirestore, purgeAfterDays: number) {
  await retainSafetyRecordsForDeletedAccount(db as never, "guest-1", T0);
  await purgeRetainedSafetyRecordsNow(db as never,
    Timestamp.fromMillis(T0 + purgeAfterDays * DAY));
}

test("an event safety report the account made is kept 180 days after its " +
  "deletion, then purged", async () => {
  const seed = () => new FakeFirestore({
    "eventSafetyReports/report-1": {eventId: "event-1",
      reporterUserId: "guest-1", status: "open"},
    "eventSafetyReports/report-2": {eventId: "event-1",
      reporterUserId: "guest-2", status: "open"},
  });
  const early = seed();
  await deleteAndPurge(early, 179);
  assert.ok(early.getDoc("eventSafetyReports/report-1"));
  const late = seed();
  await deleteAndPurge(late, 181);
  assert.equal(late.getDoc("eventSafetyReports/report-1"), undefined);
  assert.ok(late.getDoc("eventSafetyReports/report-2"));
  assert.equal(late.getDoc("eventSafetyReports/report-2")!.retainUntil,
    undefined);
});

test("a moderation ticket about the account is kept 180 days after its " +
  "deletion, then purged, and an earlier clock is not pushed out",
async () => {
  const earlier = Timestamp.fromMillis(T0 + 10 * DAY);
  const db = new FakeFirestore({
    "moderationFlags/flag-1": {targetUserId: "guest-1", status: "pending"},
    "moderationFlags/flag-2": {targetUserId: "guest-1", status: "pending",
      retainUntil: earlier},
    "moderationFlags/flag-3": {targetUserId: "guest-2", status: "pending"},
  });
  await retainSafetyRecordsForDeletedAccount(db as never, "guest-1", T0);
  assert.equal((db.getDoc("moderationFlags/flag-1")!.retainUntil as
    Timestamp).toMillis(), T0 + 180 * DAY);
  assert.ok((db.getDoc("moderationFlags/flag-2")!.retainUntil as
    Timestamp).isEqual(earlier));
  await purgeRetainedSafetyRecordsNow(db as never,
    Timestamp.fromMillis(T0 + 181 * DAY));
  assert.equal(db.getDoc("moderationFlags/flag-1"), undefined);
  assert.equal(db.getDoc("moderationFlags/flag-2"), undefined);
  assert.ok(db.getDoc("moderationFlags/flag-3"));
});
