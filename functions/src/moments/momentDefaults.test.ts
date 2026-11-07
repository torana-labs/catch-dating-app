import assert from "node:assert/strict";
import test from "node:test";
import {FakeFirestore} from "../shared/testing/programFirestore";
import {ensureEventDefaultMoments} from "./momentDefaults";
import {momentFromDocument} from "./momentDocuments";
import {runMomentSweep, type MomentRunnerDeps} from "./momentRunner";

const NOW = 1_700_000_000_000;

function deps(db: FakeFirestore) {
  return {
    firestore: () => db as never,
    nowMillis: () => NOW,
    timestampFromMillis: (millis: number) => millis,
  };
}

function activeEvent(startMillis: number) {
  return {
    status: "active",
    publicationState: "published",
    setupRevision: 1,
    startTime: startMillis,
    endTime: startMillis + 3_600_000,
    distanceKm: 5,
    meetingPoint: "Gate 3",
    revision: 1,
  };
}

function runnerDeps(db: FakeFirestore): MomentRunnerDeps {
  return {
    firestore: () => db as never,
    nowMillis: () => NOW,
    quietEndMillis: () => null,
    localDayKey: () => "2023-11-14",
    localMinuteOfDay: () => 600,
    quietHoursFor: () => null,
    dailyCapFor: () => 0,
    pushCopyFor: async () => ({title: "t", body: "b"}),
    deliverProgramReminder: async () => ({kind: "sent" as const}),
    deliverAutomationMessage: async () =>
      ({kind: "suppressed" as const, reason: "hostReview" as const}),
    sendPushToUid: async () => {},
    writeStaffAttention: async () => {},
    loadConsentFacts: async () => ({}),
  };
}

test("provisions an armed system-default reminder for upcoming events",
  async () => {
    const db = new FakeFirestore({
      "events/e1": activeEvent(NOW + 60 * 60 * 1000),
    });
    const summary = await ensureEventDefaultMoments(deps(db));
    assert.equal(summary.scanned, 1);
    assert.equal(summary.created, 1);
    const doc = db.getDoc(
      "organizerMoments/e1_event_start_reminder");
    assert.ok(doc !== undefined);
    const moment = momentFromDocument(doc);
    assert.ok(moment !== null);
    assert.equal(moment.status, "armed");
    assert.equal(moment.origin, "systemDefault");
    assert.equal(moment.scope.kind, "event");
    assert.equal(moment.sense, "individual");
    assert.deepEqual(moment.approval,
      {approvedByUid: "system", approvedAtMillis: NOW});
  });

test("skips past and non-active events", async () => {
  const db = new FakeFirestore({
    "events/past": activeEvent(NOW - 60 * 60 * 1000),
    "events/cancelled": {...activeEvent(NOW + 3_600_000),
      status: "cancelled"},
    "events/far": activeEvent(NOW + 30 * 24 * 60 * 60 * 1000),
  });
  const summary = await ensureEventDefaultMoments(deps(db));
  assert.equal(summary.scanned, 0);
  assert.equal(summary.created, 0);
  assert.equal(db.getDoc("organizerMoments/past_event_start_reminder"),
    undefined);
});

test("does not clobber an existing paused moment", async () => {
  const db = new FakeFirestore({
    "events/e1": activeEvent(NOW + 60 * 60 * 1000),
    "organizerMoments/e1_event_start_reminder": {
      momentId: "e1_event_start_reminder",
      scope: {kind: "event", eventId: "e1"},
      scopeKind: "event", scopeId: "e1",
      name: "Event starts soon",
      initiation: {kind: "anchored", anchorKind: "scopeStart",
        anchorId: null, offsetMinutes: -15},
      sense: "individual",
      audience: {kind: "eventParticipants", statuses: ["signedUp"]},
      action: {kind: "push", notificationType: "eventReminder",
        preferenceKey: "eventReminders"},
      status: "paused",
      approval: {approvedByUid: "u-org", approvedAtMillis: 1},
      origin: "systemDefault",
      revision: 2,
      createdAtMillis: 1, updatedAtMillis: 2,
    },
  });
  const summary = await ensureEventDefaultMoments(deps(db));
  assert.equal(summary.created, 0);
  const doc = db.getDoc("organizerMoments/e1_event_start_reminder")!;
  assert.equal(doc.status, "paused");
  assert.equal((doc.approval as {approvedByUid: string}).approvedByUid,
    "u-org");
});

test("provisioned reminder fires through the sweep and honors the " +
    "legacy send-once semantics", async () => {
  const db = new FakeFirestore({
    "events/e1": activeEvent(NOW + 10 * 60 * 1000),
    "eventParticipations/p1":
      {eventId: "e1", uid: "u1", status: "signedUp"},
    "users/u1": {fcmToken: "tok"},
  });
  await ensureEventDefaultMoments(deps(db));
  const pushed: string[] = [];
  const runner: MomentRunnerDeps = {
    ...runnerDeps(db),
    sendPushToUid: async (params) => {
      pushed.push(params.uid);
    },
  };
  const first = await runMomentSweep(runner);
  assert.equal(first.runsFired, 1);
  assert.deepEqual(pushed, ["u1"]);
  // A second sweep must not re-fire the same run or re-send.
  const second = await runMomentSweep(runner);
  assert.equal(second.runsFired, 0);
  assert.deepEqual(pushed, ["u1"]);
});

test("an at-anchor run inside the grace window skips once the anchor " +
    "passed", async () => {
  // Event started 3 minutes ago; an offset-0 run is inside the replan
  // grace window, so it reaches pass 2 — but firing now would deliver
  // "starts now" after the fact.
  const start = NOW - 3 * 60 * 1000;
  const runId = `e1_at_start_1_${start}`;
  const db = new FakeFirestore({
    "events/e1": activeEvent(start),
    "eventParticipations/p1":
      {eventId: "e1", uid: "u1", status: "signedUp"},
    "users/u1": {fcmToken: "tok"},
    "organizerMoments/e1_at_start": {
      momentId: "e1_at_start",
      scope: {kind: "event", eventId: "e1"},
      scopeKind: "event", scopeId: "e1",
      name: "Event starts now",
      initiation: {kind: "anchored", anchorKind: "scopeStart",
        anchorId: null, offsetMinutes: 0},
      sense: "individual",
      audience: {kind: "eventParticipants", statuses: ["signedUp"]},
      action: {kind: "push", notificationType: "eventReminder",
        preferenceKey: "eventReminders"},
      status: "armed",
      approval: {approvedByUid: "system", approvedAtMillis: 1},
      origin: "systemDefault",
      revision: 1,
      createdAtMillis: 1, updatedAtMillis: 1,
    },
    [`organizerMomentRuns/${runId}`]: {
      runId,
      momentId: "e1_at_start",
      dueAtMillis: start,
      anchorRevision: 1,
      status: "planned",
    },
  });
  const pushed: string[] = [];
  const runner: MomentRunnerDeps = {
    ...runnerDeps(db),
    sendPushToUid: async (params) => {
      pushed.push(params.uid);
    },
  };
  const summary = await runMomentSweep(runner);
  assert.equal(summary.runsFired, 0);
  assert.equal(summary.runsSkipped, 1);
  assert.deepEqual(pushed, []);
  assert.equal(
    db.getDoc(`organizerMomentRuns/${runId}`)!.status,
    "skipped");
});

test("private and unconfigured events are never provisioned", async () => {
  const catchBooking = {mode: "catchNative", bookingAuthority: "catch"};
  const db = new FakeFirestore({
    "events/priv": {...activeEvent(NOW + 60 * 60 * 1000),
      publicationState: "private", publicRegistrationEnabled: true},
    "events/unconf": {...activeEvent(NOW + 60 * 60 * 1000),
      publicRegistrationEnabled: false},
    "events/reg": {...activeEvent(NOW + 60 * 60 * 1000),
      publicRegistrationEnabled: true},
    "events/booked": {...activeEvent(NOW + 60 * 60 * 1000),
      eventOrigin: catchBooking},
    "events/bookedClosed": {...activeEvent(NOW + 60 * 60 * 1000),
      eventOrigin: catchBooking, publicRegistrationEnabled: false},
  });
  const summary = await ensureEventDefaultMoments(deps(db));
  assert.equal(summary.created, 3);
  assert.equal(db.getDoc(
    "organizerMoments/priv_event_start_reminder"), undefined);
  assert.equal(db.getDoc(
    "organizerMoments/unconf_event_start_reminder"), undefined);
  assert.ok(db.getDoc(
    "organizerMoments/reg_event_start_reminder") !== undefined);
  // An event with Catch booking keeps its reminder whatever its public
  // registration says.
  assert.ok(db.getDoc(
    "organizerMoments/booked_event_start_reminder") !== undefined);
  assert.ok(db.getDoc(
    "organizerMoments/bookedClosed_event_start_reminder") !== undefined);
});
