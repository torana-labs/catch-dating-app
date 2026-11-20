import assert from "node:assert/strict";
import test from "node:test";
import {FakeFirestore} from "../shared/testing/programFirestore";
import {
  listOrganizerMomentsHandler,
  upsertOrganizerMomentHandler,
  type MomentCallablesDeps,
} from "./momentCallables";
import {MOMENT_RUNS_COLLECTION, MOMENTS_COLLECTION} from "./momentDocuments";
import {momentToWire} from "./momentWire";
import {
  reconcileOrganizerMomentView,
  tallyRuns,
} from "./organizerMomentViews";

const NOW = 1_000_000;

const deps = (db: FakeFirestore): MomentCallablesDeps => ({
  firestore: () => db as never,
  nowMillis: () => NOW,
  authorizeManage: async () => undefined,
});

const payload = (scope: Record<string, string>) => ({
  scope, name: "Sangeet starts soon",
  initiation: {kind: "scheduled", atMillis: 5_000_000},
  sense: "audience",
  audience: scope.kind === "event" ?
    {kind: "eventParticipants", statuses: ["signedUp"]} :
    {kind: "households", rsvpPendingOnly: false},
  action: scope.kind === "event" ?
    {kind: "push", notificationType: "eventReminder",
      preferenceKey: "eventReminders"} :
    {kind: "sendTemplate", connectionId: "conn1", templateId: "tpl",
      variables: {}},
});

test("runs tally sends of dispatched runs and the earliest planned run",
  () => {
    assert.deepEqual(tallyRuns([
      {status: "dispatched", sent: 3},
      {status: "dispatched", sent: 2},
      {status: "failed", sent: 9},
      {status: "planned", dueAtMillis: 9_000},
      {status: "planned", dueAtMillis: 7_000},
    ]), {sent: 5, nextDueAtMillis: 7_000});
  });

test("a moment row is the listed moment and its plan, without the state",
  async () => {
    const db = new FakeFirestore({});
    const {moment} = await upsertOrganizerMomentHandler(deps(db), {
      actorUid: "mgr", payload: payload({kind: "program", programId: "prog"}),
    });
    db.setDoc(`${MOMENT_RUNS_COLLECTION}/r1`, {momentId: moment.momentId,
      status: "dispatched", sent: 4});
    db.setDoc(`${MOMENT_RUNS_COLLECTION}/r2`, {momentId: moment.momentId,
      status: "planned", dueAtMillis: 8_000});
    await reconcileOrganizerMomentView(db as never, moment.momentId);
    const view = db.getDoc(`organizerMomentViews/${moment.momentId}`) as
      Record<string, unknown>;
    const listed = await listOrganizerMomentsHandler(deps(db), {
      actorUid: "mgr", scope: {kind: "program", programId: "prog"}});
    assert.deepEqual(view.moment, momentToWire(listed.moments[0]));
    const plan: Record<string, unknown> = {...listed.plans[0]};
    delete plan.state;
    delete plan.momentId;
    // A draft has nothing planned to show; the sends still count.
    assert.deepEqual(view.plan, plan);
    assert.equal((view.plan as {sentCount: number}).sentCount, 4);
    assert.equal((view.plan as {nextRunAtMillis: null}).nextRunAtMillis,
      null);
    assert.equal(view.scopeKind, "program");
    assert.equal(view.programId, "prog");
    assert.equal(view.eventId, null);
  });

test("an event moment names its event; an armed moment its next run",
  async () => {
    const db = new FakeFirestore({});
    const {moment} = await upsertOrganizerMomentHandler(deps(db), {
      actorUid: "mgr", payload: payload({kind: "event", eventId: "ev1"}),
    });
    db.updateDoc(`${MOMENTS_COLLECTION}/${moment.momentId}`,
      {status: "armed", approval: {approvedByUid: "mgr",
        approvedAtMillis: NOW}});
    db.setDoc(`${MOMENT_RUNS_COLLECTION}/r1`, {momentId: moment.momentId,
      status: "planned", dueAtMillis: 8_000});
    await reconcileOrganizerMomentView(db as never, moment.momentId);
    const view = db.getDoc(`organizerMomentViews/${moment.momentId}`) as
      Record<string, unknown>;
    assert.equal(view.scopeKind, "event");
    assert.equal(view.eventId, "ev1");
    assert.equal(view.programId, null);
    assert.equal((view.plan as {nextRunAtMillis: number}).nextRunAtMillis,
      8_000);
    db.deleteDoc(`${MOMENTS_COLLECTION}/${moment.momentId}`);
    await reconcileOrganizerMomentView(db as never, moment.momentId);
    assert.equal(db.getDoc(`organizerMomentViews/${moment.momentId}`),
      undefined);
  });

test("organiser-scope automation moments get no row", async () => {
  const db = new FakeFirestore({
    [`${MOMENTS_COLLECTION}/auto1`]: {momentId: "auto1",
      scope: {kind: "organizer", organizerId: "org-1"},
      scopeKind: "organizer", scopeId: "org-1", name: "Companion",
      initiation: {kind: "scheduled", atMillis: 5_000},
      sense: "audience",
      audience: {kind: "households", rsvpPendingOnly: false},
      action: {kind: "push", notificationType: "programUpdate",
        preferenceKey: "programUpdates"},
      status: "armed", approval: null, origin: "automation", revision: 1},
  });
  await reconcileOrganizerMomentView(db as never, "auto1");
  assert.equal(db.getDoc("organizerMomentViews/auto1"), undefined);
});
