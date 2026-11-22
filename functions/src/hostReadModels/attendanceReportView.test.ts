import assert from "node:assert/strict";
import test from "node:test";
import {randomUUID} from "node:crypto";
import {deleteApp, initializeApp} from "firebase-admin/app";
import type {Firestore} from "firebase-admin/firestore";
import {getEmulatorFirestore} from "../shared/testing/emulatorFirestore";
import {harness, command, manager, end} from
  "../domain/live/attendanceDispositionTestFixtures";
import {hostEventAttendanceReportsCollection,
  reconcileHostEventAttendanceReport, HostEventAttendanceReportView} from
  "./attendanceReportView";
import {attendanceReportEventChanged, attendanceReportEventsForAttendee,
  attendanceReportEventsForDisposition} from "./attendanceReportViewTriggers";

async function followsDecisions(db: Firestore) {
  const h = await harness(db);
  const {eventId} = h.scope.context;
  const read = async () => (await h.db
    .collection(hostEventAttendanceReportsCollection).doc(eventId).get())
    .data() as HostEventAttendanceReportView | undefined;
  await h.finish();
  await reconcileHostEventAttendanceReport(h.db, eventId, () => end);
  const before = await read();
  assert.equal(before?.organizerId, h.scope.context.organizerId);
  assert.equal(before?.view.counts.unresolved.unreviewed, 1);
  assert.deepEqual(before?.view.members, [{attendeeId: h.scope.attendeeId,
    classification: {kind: "unresolved", reason: "unreviewed"}}]);

  await h.store.recordNoShow(manager, command(await h.view()));
  await reconcileHostEventAttendanceReport(h.db, eventId, () => end + 10);
  assert.equal((await read())?.view.counts.recordedNoShow.hostConfirmed, 1);

  // A late, older rebuild never rolls the view back.
  await h.store.recordNoShow(manager, command(await h.view(),
    {kind: "clear", reason: "recordingMistake"}, "clear"));
  await reconcileHostEventAttendanceReport(h.db, eventId, () => end + 5);
  assert.equal((await read())?.view.counts.recordedNoShow.hostConfirmed, 1);
}

async function goneEventHasNoView(db: Firestore) {
  const h = await harness(db);
  const {eventId} = h.scope.context;
  await h.finish();
  await reconcileHostEventAttendanceReport(h.db, eventId, () => end);
  await h.db.doc(h.eventPath).delete();
  await reconcileHostEventAttendanceReport(h.db, eventId, () => end + 1);
  const snap = await h.db.collection(hostEventAttendanceReportsCollection)
    .doc(eventId).get();
  assert.equal(snap.exists, false);
}

test("the attendance report view follows the roster report", {
  skip: !process.env.FIRESTORE_EMULATOR_HOST, timeout: 120_000,
}, async (t) => {
  const app = initializeApp({projectId: "demo-catch-rules"}, randomUUID());
  const db = getEmulatorFirestore(app);
  try {
    await t.test("it is the report and follows closeout decisions",
      () => followsDecisions(db));
    await t.test("an event that is gone has no view",
      () => goneEventHasNoView(db));
  } finally {
    await deleteApp(app);
  }
});

test("only fields the report reads rebuild it", () => {
  const attendee = {eventId: "e1", organizerId: "o1", status: "registered",
    checkedInAt: null, attendanceRevision: 1, linkedUid: "u1",
    displayName: "Ira"};
  assert.deepEqual(attendanceReportEventsForAttendee(attendee,
    {...attendee, displayName: "Ira K"}), []);
  assert.deepEqual(attendanceReportEventsForAttendee(attendee,
    {...attendee, status: "checkedIn", attendanceRevision: 2}), ["e1"]);
  assert.deepEqual(attendanceReportEventsForAttendee(undefined, attendee),
    ["e1"]);
  const record = {context: {eventId: "e1"}, revision: 1};
  assert.deepEqual(attendanceReportEventsForDisposition(record, record), []);
  assert.deepEqual(attendanceReportEventsForDisposition(record,
    {...record, revision: 2}), ["e1"]);
  const event = {organizerId: "o1", status: "published", startTime: 1,
    endTime: 2, name: "Quiz night"};
  assert.equal(attendanceReportEventChanged(undefined, event), false);
  assert.equal(attendanceReportEventChanged(event,
    {...event, name: "Quiz"}), false);
  assert.equal(attendanceReportEventChanged(event,
    {...event, status: "cancelled"}), true);
});
