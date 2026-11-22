import assert from "node:assert/strict";
import test from "node:test";
import {FakeFirestore} from "../shared/testing/programFirestore";
import {
  ensureEventDefaultMoments,
  stepAsideEventFeedbackPrompt,
} from "./momentDefaults";
import {momentFromDocument} from "./momentDocuments";
import {runMomentSweep} from "./momentRunner";
import {buildMomentRunnerDeps} from "./momentWiring";

// Times are Asia/Kolkata (UTC+5:30), where default quiet hours are
// 21:00-08:00 local.
const istMillis = (day: number, hour: number, minute = 0) =>
  Date.UTC(2026, 10, day, hour, minute) - 330 * 60_000;
const HOUR = 60 * 60_000;

function event(startMillis: number, endMillis: number) {
  return {
    status: "active", publicationState: "published", setupRevision: 1,
    name: "Sunrise loop", organizerId: "org-1", timezone: "Asia/Kolkata",
    startTime: startMillis, endTime: endMillis, revision: 1,
  };
}

function seed(startMillis: number, endMillis: number,
  extra: Record<string, Record<string, unknown>> = {}) {
  return new FakeFirestore({
    "events/run": event(startMillis, endMillis),
    "organizers/org-1": {name: "Fictional Run Club"},
    "eventBookings/came": {eventId: "run", uid: "came", status: "attended"},
    "eventBookings/missed":
      {eventId: "run", uid: "missed", status: "signedUp"},
    "eventBookings/left": {eventId: "run", uid: "left", status: "attended",
      cancelledAt: 1},
    "users/came": {}, "users/missed": {}, "users/left": {},
    ...extra,
  });
}

async function provision(db: FakeFirestore, nowMillis: number) {
  return ensureEventDefaultMoments({
    firestore: () => db as never,
    nowMillis: () => nowMillis,
    timestampFromMillis: (millis: number) => millis,
  });
}

type Push = {uid: string; title: string; body: string; type: string};

function sweepAt(db: FakeFirestore, nowMillis: number) {
  const pushed: Push[] = [];
  // Real quiet hours, local time, cap and copy; only the push leg is
  // captured.
  const deps = buildMomentRunnerDeps({
    firestore: () => db as never,
    nowMillis: () => nowMillis,
    sendPushToUid: async (params) => {
      pushed.push({uid: params.uid, title: params.title, body: params.body,
        type: params.notificationType});
    },
  });
  return {pushed, run: () => runMomentSweep(deps)};
}

test("the default feedback request goes to checked-in guests two hours " +
    "after the end", async () => {
  const start = istMillis(24, 6, 30);
  const end = istMillis(24, 8, 0);
  const db = seed(start, end);
  await provision(db, start - 2 * HOUR);
  const moment = momentFromDocument(
    db.getDoc("organizerMoments/run_event_feedback_prompt")!)!;
  assert.equal(moment.status, "armed");
  assert.equal(moment.origin, "systemDefault");
  assert.deepEqual(moment.audience,
    {kind: "eventParticipants", statuses: ["attended"]});

  // Not due before end + 2h.
  const early = sweepAt(db, end + HOUR);
  await early.run();
  assert.deepEqual(early.pushed.filter((p) => p.type === "eventFeedback"),
    []);

  const due = sweepAt(db, end + 2 * HOUR);
  await due.run();
  assert.deepEqual(due.pushed.filter((p) => p.type === "eventFeedback"), [{
    uid: "came", type: "eventFeedback",
    title: "How was Sunrise loop?",
    body: "Tap to rate it and leave a note for Fictional Run Club.",
  }]);
});

test("a late-evening event's feedback request waits for 08:00", async () => {
  const start = istMillis(24, 20, 0);
  const end = istMillis(24, 22, 0);
  const db = seed(start, end);
  await provision(db, start - HOUR);
  const sweep = sweepAt(db, end + 2 * HOUR); // 00:00 local
  await sweep.run();
  assert.deepEqual(sweep.pushed, []);
  const run = db.getDoc(
    `organizerMomentRuns/run_event_feedback_prompt_1_${end + 2 * HOUR}`);
  assert.equal(run!.status, "planned");
  assert.equal(run!.dueAtMillis, istMillis(25, 8, 0));
});

test("an event with a close-out thank-you gets no default request",
  async () => {
    const start = istMillis(24, 6, 30);
    const db = seed(start, start + HOUR, {
      "organizerMoments/run_close_out_thank_you": {status: "armed"},
    });
    const summary = await provision(db, start - HOUR);
    assert.equal(summary.created, 1); // the start reminder only
    assert.equal(db.getDoc("organizerMoments/run_event_feedback_prompt"),
      undefined);
  });

test("a paused feedback request stays paused and sends nothing",
  async () => {
    const start = istMillis(24, 6, 30);
    const end = start + HOUR;
    const db = seed(start, end);
    await provision(db, start - HOUR);
    const paused = await stepAsideEventFeedbackPrompt(db as never, "run", 5);
    assert.equal(paused?.status, "paused");
    assert.equal(
      await stepAsideEventFeedbackPrompt(db as never, "run", 6), null);
    // The next sweep neither re-arms it nor sends it.
    await provision(db, start - HOUR / 2);
    assert.equal(
      db.getDoc("organizerMoments/run_event_feedback_prompt")!.status,
      "paused");
    const sweep = sweepAt(db, end + 2 * HOUR);
    await sweep.run();
    assert.deepEqual(sweep.pushed, []);
  });

test("feedback copy falls back to the host when the organizer is unknown",
  async () => {
    const start = istMillis(24, 6, 30);
    const end = start + HOUR;
    const db = seed(start, end);
    db.updateDoc("events/run", {organizerId: "missing-org"});
    await provision(db, start - HOUR);
    const sweep = sweepAt(db, end + 2 * HOUR);
    await sweep.run();
    assert.equal(sweep.pushed[0]?.body,
      "Tap to rate it and leave a note for the host.");
  });
