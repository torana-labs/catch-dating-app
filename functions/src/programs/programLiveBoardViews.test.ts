import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {FakeFirestore} from "../shared/testing/programFirestore";
import {baseSeed} from "../shared/testing/programFixtures";
import {momentAttentionWindowMillis} from
  "../organizers/organizerAttentionPolicy";
import {
  alertResolution,
  programAlertViewId,
  reconcileAlertResolution,
  reconcileStaffAttentionAlert,
  reconcileTravelAlerts,
  reconcileTravelCounts,
  staffAttentionAlertView,
  travelAlertView,
  travelCountView,
} from "./programLiveBoardViews";

const at = (millis: number) => Timestamp.fromMillis(millis);
const now = 1_800_000_000_000;
const open = alertResolution(undefined);

const send = (overrides: Record<string, unknown> = {}) => ({
  runId: "run-1", momentId: "moment-1", scopeKind: "program",
  scopeId: "program-1", organizerId: "org-1", actionKind: "staffAttention",
  duty: "functionLead", severity: "warning", title: "Sangeet is running late",
  createdAtMillis: now - 1000, ...overrides});

test("a staff attention alert lasts the callable's window, then drops", () => {
  const view = staffAttentionAlertView("program-1", "org-1", {
    runId: "run-1", momentId: "moment-1", scopeKind: "program",
    scopeId: "program-1", duty: "functionLead", severity: "warning",
    title: "Late", createdAtMillis: now - 1000}, open, now)!;
  assert.equal(view.alertId, "run-1_functionLead");
  assert.equal(view.duty, "functionLead");
  assert.equal(view.expiresAtMillis, now - 1000 + momentAttentionWindowMillis);
  assert.equal(view.expiresAt?.toMillis(), view.expiresAtMillis);
  assert.equal(view.state, "open");
  assert.equal(staffAttentionAlertView("program-1", "org-1", {
    runId: "run-1", momentId: "m", scopeKind: "program",
    scopeId: "program-1", duty: "functionLead", severity: "info",
    title: "Old", createdAtMillis: now - momentAttentionWindowMillis - 1},
  open, now), null);
});

test("travel alerts follow flight status and readiness, never for others",
  () => {
    const leg = (overrides: Record<string, unknown> = {}) => ({
      kind: "inbound", programId: "program-1", organizerId: "org-1",
      flightNumber: "AI847", flightStatus: "scheduled",
      readiness: "expected", updatedAt: at(now), ...overrides});
    assert.equal(travelAlertView("program-1", "flight_l1", "l1", leg(), open,
      now), null);
    const cancelled = travelAlertView("program-1", "flight_l1", "l1",
      leg({flightStatus: "cancelled"}), open, now)!;
    assert.equal(cancelled.severity, "urgent");
    assert.equal(cancelled.duty, null);
    assert.equal(cancelled.expiresAtMillis, null);
    assert.equal(cancelled.expiresAt, null);
    // A disrupted journey raises the readiness alert, not the flight one.
    const disrupted = leg({readiness: "disrupted"});
    assert.equal(travelAlertView("program-1", "flight_l1", "l1", disrupted,
      open, now), null);
    assert.equal(travelAlertView("program-1", "readiness_l1", "l1",
      disrupted, open, now)!.source, "readiness");
    assert.equal(travelAlertView("program-1", "flight_l1", "l1",
      leg({kind: "outbound", flightStatus: "cancelled"}), open, now), null);
    assert.equal(travelAlertView("program-1", "flight_l1", "l1",
      leg({programId: "other", flightStatus: "cancelled"}), open, now), null);
  });

test("travel counts are readiness counts of this programme's inbound legs",
  () => {
    const counts = travelCountView("program-1", "org-1", [
      {kind: "inbound", programId: "program-1", organizerId: "org-1",
        readiness: "expected"},
      {kind: "inbound", programId: "program-1", organizerId: "org-1",
        readiness: "ready"},
      {kind: "inbound", programId: "program-1", organizerId: "org-1",
        readiness: "disrupted"},
      {kind: "outbound", programId: "program-1", organizerId: "org-1",
        readiness: "expected"},
      {kind: "inbound", programId: "other", organizerId: "org-1",
        readiness: "expected"},
    ]);
    assert.deepEqual(counts, {programId: "program-1", organizerId: "org-1",
      expected: 1, atCurb: 1, disrupted: 1, version: 1});
  });

test("reconcile merges resolutions, dedupes fanout and writes on change only",
  async () => {
    const store = new FakeFirestore({...baseSeed(),
      "organizerMomentSends/s2": send({createdAtMillis: now - 500}),
      "organizerMomentSends/s1": send(),
      "programAlerts/program-1_run-1_functionLead": {programId: "program-1",
        alertId: "run-1_functionLead", state: "done", assigneeUid: "lead-1",
        assigneeName: "Dev", revision: 4}});
    const db = store as unknown as FirebaseFirestore.Firestore;
    await reconcileStaffAttentionAlert(db, "program-1", "run-1",
      "functionLead", now);
    const path = `programAlertViews/${programAlertViewId("program-1",
      "run-1_functionLead")}`;
    const view = store.getDoc(path) as Record<string, unknown>;
    assert.equal(view.createdAtMillis, now - 1000, "earliest send wins");
    assert.equal(view.state, "done");
    assert.equal(view.assigneeName, "Dev");
    assert.equal(view.revision, 4);

    let writes = 0;
    const setDoc = store.setDoc.bind(store);
    store.setDoc = (...args: Parameters<typeof setDoc>) => {
      writes++;
      return setDoc(...args);
    };
    await reconcileStaffAttentionAlert(db, "program-1", "run-1",
      "functionLead", now);
    assert.equal(writes, 0);

    // The resolution is reopened, then deleted by retention.
    store.setDoc("programAlerts/program-1_run-1_functionLead", {
      programId: "program-1", alertId: "run-1_functionLead", state: "open",
      assigneeUid: null, assigneeName: null, revision: 5});
    await reconcileAlertResolution(db, "program-1", "run-1_functionLead");
    assert.equal((store.getDoc(path) as {state: string}).state, "open");
    store.deleteDoc("programAlerts/program-1_run-1_functionLead");
    await reconcileAlertResolution(db, "program-1", "run-1_functionLead");
    assert.equal((store.getDoc(path) as {revision: number}).revision, 0);
    // An alert with no view has nothing to merge a resolution into.
    await reconcileAlertResolution(db, "program-1", "run-9_functionLead");
    assert.equal(store.getDoc("programAlertViews/program-1_run-9_functionLead"),
      undefined);
  });

test("a cancelled flight raises an alert and clears when it recovers",
  async () => {
    const store = new FakeFirestore(baseSeed());
    const db = store as unknown as FirebaseFirestore.Firestore;
    store.updateDoc("programTravelLegs/leg-1", {flightStatus: "cancelled"});
    await reconcileTravelAlerts(db, "program-1", "leg-1", now);
    const path = "programAlertViews/program-1_flight_leg-1";
    assert.equal((store.getDoc(path) as {severity: string}).severity,
      "urgent");
    store.updateDoc("programTravelLegs/leg-1", {flightStatus: "scheduled"});
    await reconcileTravelAlerts(db, "program-1", "leg-1", now);
    assert.equal(store.getDoc(path), undefined);
    await reconcileTravelCounts(db, "program-1");
    assert.equal((store.getDoc("programTravelCountViews/program-1") as
      {expected: number}).expected, 2);
  });
