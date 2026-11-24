import {getEmulatorFirestore} from "../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import test from "node:test";
import {randomUUID} from "node:crypto";
import {deleteApp, initializeApp} from "firebase-admin/app";
import {Firestore, Timestamp, Transaction} from
  "firebase-admin/firestore";
import type {CallableRequest} from "firebase-functions/v2/https";
import type {EventAttendanceReportCallableResponse as Response} from
  "../shared/generated/eventAttendanceReportCallableResponse";
import {EventAttendanceReportStore, classifyAttendance} from
  "../domain/live/attendanceReport";
import {getEventAttendanceReportHandler} from "./attendanceReportHandlers";
import {harness, command, decline, manager, start, end} from
  "../domain/live/attendanceDispositionTestFixtures";
import {setEventAttendeeAttendanceHandler} from "./eventAttendees";

test("classifications follow reviewed evidence and preserve uncertainty",
  async () => {
    const h = await harness();
    const classify = async () => classifyAttendance(await h.view());
    assert.deepEqual(await classify(),
      {kind: "unresolved", reason: "unreviewed"});
    await decline(h);
    await h.finish();
    // A guest reply is evidence to review, not a recorded closeout decision.
    assert.deepEqual(await classify(),
      {kind: "unresolved", reason: "unreviewed"});
    const view = await h.view();
    assert.ok(view.declineEvidence);
    await h.store.recordNoShow(manager, command(view,
      {kind: "record", evidence: view.declineEvidence}));
    assert.deepEqual(await classify(),
      {kind: "recordedNoShow", evidence: "guestDeclined"});
    await h.store.recordNoShow(manager, command(await h.view(),
      {kind: "clear", reason: "recordingMistake"}, "clear"));
    assert.deepEqual(await classify(),
      {kind: "unresolved", reason: "cleared"});
    h.fake.generation = Timestamp.fromMillis(2);
    assert.deepEqual(await classify(),
      {kind: "unresolved", reason: "sourceChanged"});
  });

test("attendance and admission override old decisions", async () => {
  const h = await harness();
  await h.finish();
  await h.store.recordNoShow(manager, command(await h.view()));
  const classify = async () => classifyAttendance(await h.view());
  for (const status of ["invited", "waitlisted", "cancelled"]) {
    await h.put(h.attendeePath, {...h.attendee, status});
    assert.deepEqual(await classify(), {kind: "notExpected", reason: status});
  }
  // A later booking cancellation does not erase existing check-in evidence.
  await h.put(h.attendeePath, {...h.attendee, status: "cancelled",
    checkedInAt: Timestamp.fromMillis(start)});
  assert.deepEqual(await classify(), {kind: "attended"});
  await h.put(h.attendeePath, {...h.attendee, attendanceRevision: 8});
  assert.deepEqual(await classify(),
    {kind: "unresolved", reason: "superseded"});
  await h.put(h.eventPath, {...h.progress.event, status: "cancelled"});
  assert.deepEqual(await classify(),
    {kind: "notExpected", reason: "eventCancelled"});
});

test("report rejects invalid scope and unauthorized callers before roster read",
  async () => {
    const h = await harness();
    const store = new EventAttendanceReportStore(h.db, () => end);
    for (const input of [{}, {context: {mode: "rehearsal"}},
      {context: h.scope.context, attendeeId: h.scope.attendeeId}]) {
      await assert.rejects(store.get(manager, input),
        {code: "invalid-argument"});
    }
    for (const uid of ["guest-1", "door-staff", "stranger"]) {
      await assert.rejects(store.get(uid, {context: h.scope.context}),
        {code: "permission-denied"});
    }
  });

test("report handler authenticates and rate-limits before data access",
  async () => {
    const calls: string[] = [];
    const deps = {db: () => ({}) as Firestore,
      rateLimit: async (_db: Firestore, uid: string, action: string) => {
        assert.equal(uid, manager);
        assert.equal(action, "getEventAttendanceReport");
        calls.push("limit");
      }, store: () => ({get: async () => {
        calls.push("get"); return {} as Response;
      }})};
    const request = {data: {}, auth: {uid: manager}} as CallableRequest;
    await assert.rejects(getEventAttendanceReportHandler(
      {data: {}} as CallableRequest, deps), {code: "unauthenticated"});
    assert.deepEqual(calls, []);
    await getEventAttendanceReportHandler(request, deps);
    assert.deepEqual(calls, ["limit", "get"]);
    calls.length = 0;
    await assert.rejects(getEventAttendanceReportHandler(request,
      {...deps, rateLimit: async () => {
        throw new Error("rate limited");
      }}), /rate limited/);
    assert.deepEqual(calls, []);
  });

function reportStore(h: Awaited<ReturnType<typeof harness>>,
  db: Firestore = h.db) {
  const store = new EventAttendanceReportStore(db, () => h.clock.now);
  return async () => (await store.get(manager,
    {context: h.scope.context})).view;
}

function verifyTotals(view: Response["view"]) {
  const c = view.counts;
  assert.equal(c.attended + [...Object.values(c.recordedNoShow),
    ...Object.values(c.unresolved), ...Object.values(c.notExpected)]
    .reduce((a, b) => a + b, 0), view.rosterCount);
  assert.equal(view.members.length, view.rosterCount);
  assert.equal(new Set(view.members.map((m) => m.attendeeId)).size,
    view.rosterCount);
}

/** Keep the SDK snapshot while forcing a concurrent mutation. */
function observeReadOnly(db: Firestore,
  afterRoster?: () => Promise<void>): Firestore {
  return new Proxy(db, {get(target, key) {
    if (key === "runTransaction") {
      return (update: (tx: Transaction) => Promise<unknown>,
        options: unknown) => {
        assert.deepEqual(options, {readOnly: true});
        return target.runTransaction((tx) => update(new Proxy(tx, {
          get(transaction, member) {
            if (["set", "create", "update", "delete"]
              .includes(String(member))) {
              return () => assert.fail("An attendance report cannot write");
            }
            if (member === "get") {
              return async (...args: unknown[]) => {
                const result = await Reflect.apply(transaction.get,
                  transaction, args);
                await afterRoster?.();
                return result;
              };
            }
            const value = Reflect.get(transaction, member);
            return typeof value === "function" ?
              value.bind(transaction) : value;
          },
        })), {readOnly: true});
      };
    }
    const value = Reflect.get(target, key);
    return typeof value === "function" ? value.bind(target) : value;
  }});
}

test("canonical attendance reports use complete, consistent SDK snapshots", {
  skip: !process.env.FIRESTORE_EMULATOR_HOST, timeout: 120_000,
}, async (t) => {
  assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? "",
    /^(127\.0\.0\.1|localhost|\[::1\]):\d+$/);
  const app = initializeApp({projectId: "demo-catch-rules"}, randomUUID());
  const db = getEmulatorFirestore(app);
  try {
    await t.test("empty roster is explicit and cannot claim completed review",
      async () => {
        const h = await harness(db);
        await db.doc(h.attendeePath).delete();
        const get = reportStore(h, observeReadOnly(db));
        const empty = await get();
        assert.equal(empty.coverage, "emptyRoster");
        assert.equal(empty.source, "eventAttendees");
        assert.equal(empty.rosterCount, 0);
        verifyTotals(empty);
        h.clock.now++;
        assert.equal((await get()).sourceHash, empty.sourceHash);
        await db.doc(h.planPath).delete();
        h.clock.now = end;
        const closed = await get();
        assert.equal(closed.closure.kind, "scheduledEnd");
        assert.notEqual(closed.sourceHash, empty.sourceHash);
        await h.put(h.eventPath, {...h.progress.event,
          endTime: new Timestamp(end / 1000, 1000)});
        const storedEnd = (await db.doc(h.eventPath).get()).data()!.endTime;
        assert.equal(storedEnd.nanoseconds, 1000);
        assert.equal((await get()).closure.kind, "open");
        assert.notEqual((await get()).sourceHash, closed.sourceHash);
      });

    await t.test("imported guests need no linked profile or Consumer booking",
      async () => {
        const h = await harness(db);
        await h.put(h.attendeePath, {...h.attendee, linkedUid: null});
        for (const [i, status] of ["checkedIn", "waitlisted", "invited",
          "cancelled"].entries()) {
          await h.put("eventAttendees/mixed-" + i + "-" + randomUUID(),
            {...h.attendee, linkedUid: null, status});
        }
        const foreign = await harness(db);
        const get = reportStore(h, observeReadOnly(db));
        h.clock.now = end + 1;
        const live = await get();
        assert.equal(live.closure.kind, "open");
        assert.equal(live.rosterCount, 5);
        assert.equal(live.counts.attended, 1);
        assert.equal(live.counts.unresolved.unreviewed, 1);
        assert.deepEqual(live.counts.notExpected,
          {waitlisted: 1, invited: 1, cancelled: 1, eventCancelled: 0});
        assert.ok(live.members.every((m) =>
          m.attendeeId !== foreign.scope.attendeeId));
        verifyTotals(live);
        await h.finish();
        await h.store.recordNoShow(manager, command(await h.view()));
        const recorded = await get();
        assert.equal(recorded.counts.recordedNoShow.hostConfirmed, 1);
        assert.equal(recorded.counts.unresolved.unreviewed, 0);
        verifyTotals(recorded);
        await db.doc(h.attendeePath).delete();
        await h.put(h.attendeePath, {...h.attendee, linkedUid: null});
        const replaced = await get();
        assert.equal(replaced.counts.recordedNoShow.hostConfirmed, 0);
        assert.equal(replaced.counts.unresolved.sourceChanged, 1);
        assert.notEqual(replaced.sourceHash, recorded.sourceHash);
      });

    await t.test("concurrent check-in cannot mix old and new facts",
      async () => {
        const h = await harness(db);
        await h.finish();
        await h.store.recordNoShow(manager, command(await h.view()));
        const get = reportStore(h, observeReadOnly(db, async () => {
          await setEventAttendeeAttendanceHandler({auth: {uid: manager}, data: {
            eventId: h.scope.context.eventId, attendeeId: h.scope.attendeeId,
            expectedRevision: 7, desiredCheckedIn: true,
            clientOperationId: randomUUID()}} as CallableRequest, {
            firestore: () => db, checkRateLimit: async () => undefined,
            timestamp: () => Timestamp.fromMillis(end)});
          await h.store.recordNoShow(manager, command(await h.view(),
            {kind: "clear", reason: "attendanceCorrected"}, "clear"));
        }));
        const before = await get();
        assert.equal(before.counts.recordedNoShow.hostConfirmed, 1);
        assert.equal(before.counts.unresolved.cleared, 0);
        const after = await reportStore(h)();
        assert.equal(after.counts.attended, 1);
        assert.equal(after.counts.recordedNoShow.hostConfirmed, 0);
        assert.notEqual(before.sourceHash, after.sourceHash);
        verifyTotals(before); verifyTotals(after);
      });

    await t.test("invalid facts fail without partial totals",
      async () => {
        const h = await harness(db);
        const get = reportStore(h);
        for (const row of [{...h.attendee, status: "unexpected"},
          {...h.attendee, organizerId: "foreign"}]) {
          await h.put(h.attendeePath, row);
          await assert.rejects(get(), {code: "failed-precondition"});
        }
        await h.put(h.attendeePath, h.attendee);
        await h.finish();
        await h.put(h.planPath, {...h.progress.plan, status: "complete",
          completedAt: Timestamp.fromMillis(end + 1)});
        await assert.rejects(get(), {code: "failed-precondition"});
        await h.finish();
        const organizerPath = "organizers/" + h.scope.context.organizerId;
        const organizer = (await db.doc(organizerPath).get()).data()!;
        await h.put(organizerPath, {...organizer, hostUserIds: [],
          ownerUserId: "other", hostUserId: "other", hostProfiles: []});
        await assert.rejects(get(), {code: "permission-denied"});
      });

    await t.test("overflow fails; a bounded roster is never truncated",
      async () => {
        const h = await harness(db);
        for (let offset = 0; offset < 1000; offset += 500) {
          const batch = db.batch();
          for (let i = offset; i < offset + 500; i++) {
            batch.set(db.collection("eventAttendees")
              .doc("bounded-" + h.scope.attendeeId + "-" + i), h.attendee);
          }
          await batch.commit();
        }
        const get = reportStore(h, observeReadOnly(db));
        await assert.rejects(get(), {code: "resource-exhausted"});
        await db.doc(h.attendeePath).delete();
        const full = await get();
        assert.equal(full.coverage, "completeRoster");
        assert.equal(full.rosterCount, 1000);
        assert.equal(full.counts.unresolved.unreviewed, 1000);
        verifyTotals(full);
        assert.deepEqual(full.members.map((m) => m.attendeeId),
          full.members.map((m) => m.attendeeId).sort());
      });
  } finally {
    await deleteApp(app);
  }
});
