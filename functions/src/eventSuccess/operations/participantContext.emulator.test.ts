import {getEmulatorFirestore} from "../../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import test from "node:test";
import {randomUUID} from "node:crypto";
import {readFileSync, writeFileSync} from "node:fs";
import {deleteApp, initializeApp} from "firebase-admin/app";
import {Firestore, Timestamp} from "firebase-admin/firestore";
import type {CallableRequest} from "firebase-functions/v2/https";
import {ProgressFirestore} from "./groupProgressTestFixtures";
import {getEventAssistanceParticipantContextHandler as handler,
  readParticipantContext} from "./participantContext";

const eventId = "context-event"; const uid = "context-guest";
const organizerId = "context-organizer"; const now = 1000;
const event = {organizerId, status: "active", name: "Test event",
  endTime: Timestamp.fromMillis(now + 1000)};
const attendee = {organizerId, eventId, linkedUid: uid,
  status: "registered", createdAt: Timestamp.fromMillis(now), phoneE164: null};
function fake() {
  const store = new ProgressFirestore();
  store.write("events/" + eventId, event);
  return {store, db: store as unknown as Firestore};
}
const request = (data: unknown, subject = uid) =>
  ({data, auth: {uid: subject, token: {}}}) as CallableRequest<unknown>;

test("own identity is unique and exposes no roster data", async () => {
  const {store, db} = fake();
  store.write("eventAttendees/other", {...attendee, linkedUid: "someone-else"});
  assert.deepEqual((await readParticipantContext(db, uid, eventId,
    () => now)).resolution, {kind: "unlinked"});
  store.write("eventAttendees/own", attendee);
  const result = await readParticipantContext(db, uid, eventId, () => now);
  assert.equal(result.subjectUid, uid);
  assert.equal(result.resolution.kind, "linked");
  if (result.resolution.kind !== "linked") throw new Error("Expected own row");
  assert.equal(result.resolution.attendeeId, "own");
  assert.equal(result.resolution.organizerId, organizerId);
  assert.match(result.resolution.sourceHash, /^[a-f0-9]{64}$/);
  assert.equal(JSON.stringify(result).includes("phone"), false);
  store.write("eventAttendees/second", {...attendee, status: "cancelled"});
  assert.deepEqual((await readParticipantContext(db, uid, eventId,
    () => now)).resolution, {kind: "ambiguous"});
  assert.equal(store.read("eventAttendees/own")?.phoneE164, null);
});

test("source replacement and foreign organizers are fenced", async () => {
  const {store, db} = fake(); store.write("eventAttendees/own", attendee);
  const first = await readParticipantContext(db, uid, eventId, () => now);
  store.generation = Timestamp.fromMillis(2);
  const second = await readParticipantContext(db, uid, eventId, () => now);
  assert.notDeepEqual(first.resolution, second.resolution);
  store.write("eventAttendees/own", {...attendee, organizerId: "foreign"});
  await assert.rejects(readParticipantContext(db, uid, eventId, () => now),
    {code: "not-found"});
});

test("callable verifies auth and input before self-resolution", async () => {
  const {store, db} = fake(); store.write("eventAttendees/own", attendee);
  const limits: string[] = [];
  const deps = {firestore: () => db, now: () => now,
    checkRateLimit: async (_db: Firestore, actor: string, key: string) => {
      limits.push(actor + ":" + key);
    }};
  await assert.rejects(handler({data: {eventId}} as CallableRequest<unknown>,
    deps), {code: "unauthenticated"});
  await assert.rejects(handler(request({eventId, uid: "someone-else"}), deps),
    {code: "invalid-argument"});
  assert.equal(limits.length, 0);
  assert.equal((await handler(request({eventId}), deps)).resolution.kind,
    "linked");
  assert.deepEqual(limits, [uid + ":getEventAssistanceParticipantContext"]);
  const other = await handler(request({eventId}, "other"), deps);
  assert.deepEqual(other.resolution, {kind: "unlinked"});
});

test("emulator self-resolution never links, rewrites or chooses ambiguous rows",
  {skip: !process.env.FIRESTORE_EMULATOR_HOST}, async () => {
    const key = randomUUID(); const app = initializeApp({projectId:
      process.env.GCLOUD_PROJECT || "demo-catch-rules"}, "context-" + key);
    const db = getEmulatorFirestore(app); const id = "event-" + key;
    const refs = [db.collection("events").doc(id),
      db.collection("eventAttendees").doc("own-" + key),
      db.collection("eventAttendees").doc("other-" + key)];
    try {
      await refs[0].set(event); await refs[1].set({...attendee, eventId: id});
      const before = await refs[1].get();
      const linked = await readParticipantContext(db, uid, id, () => now);
      assert.equal(linked.resolution.kind, "linked");
      assert.deepEqual((await refs[1].get()).data(), before.data());
      const afterRead = await refs[1].get();
      assert.equal(afterRead.updateTime?.isEqual(before.updateTime!), true);
      await refs[2].set({...attendee, eventId: id, status: "cancelled"});
      assert.deepEqual((await readParticipantContext(db, uid, id,
        () => now)).resolution, {kind: "ambiguous"});
      await refs[1].update({linkedUid: "other-account"});
      const after = await readParticipantContext(db, uid, id, () => now);
      assert.equal(after.resolution.kind, "linked");
      if (after.resolution.kind === "linked") {
        assert.equal(after.resolution.attendeeId, refs[2].id);
      }
    } finally {
      for (const ref of refs) await ref.delete();
      await deleteApp(app);
    }
  });


test("native identity fixtures use the actual bounded projection", async () => {
  const {store, db} = fake();
  const read = () => readParticipantContext(db, uid, eventId, () => now);
  const unlinked = await read();
  store.write("eventAttendees/own", attendee);
  const linked = await read();
  store.write("eventAttendees/second", attendee);
  const ambiguous = await read();
  const path = "../test/event_success/fixtures/participant_context.json";
  const fixtures = {unlinked, linked, ambiguous};
  if (process.env.UPDATE_PARTICIPANT_CONTEXT_FIXTURES === "1") {
    writeFileSync(path, JSON.stringify(fixtures, null, 2) + "\n");
  }
  assert.deepEqual(JSON.parse(readFileSync(path, "utf8")), fixtures);
});
