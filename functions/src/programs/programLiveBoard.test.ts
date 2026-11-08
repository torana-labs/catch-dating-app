import assert from "node:assert/strict";
import test from "node:test";
import * as admin from "firebase-admin";
import {deps, request, now} from "../shared/testing/programFixtures";
import {FakeFirestore, type FakeData} from
  "../shared/testing/programFirestore";
import {
  getProgramLiveBoardHandler,
  resolveProgramAlertHandler,
  tonightFunctions,
  travelAlerts,
} from "./programLiveBoard";

const HOUR = 3_600_000;
const FUTURE = now.toMillis() + 86_400_000;
const at = (millis: number) => admin.firestore.Timestamp.fromMillis(millis);

const grant = (uid: string, duty: string, name: string): FakeData => ({
  organizerId: "org-1", programId: "program-1", uid, displayName: name,
  phoneLastFour: "0000",
  duties: [{duty, pickupPointIds: [], hotelIds: [],
    expiresAtMillis: FUTURE}],
  status: "active", createdBy: "manager-1", createdAt: now,
  expiresAt: at(FUTURE), revokedBy: null, revokedAt: null,
  updatedAt: now, revision: 1,
});

const seed = (): Record<string, FakeData> => ({
  "organizers/org-1": {
    hostUserId: "manager-1", ownerUserId: "manager-1",
    hostUserIds: ["manager-1"], hostProfiles: [],
  },
  "organizerPrograms/program-1": {
    organizerId: "org-1", kind: "wedding", title: "Wedding",
    timezone: "UTC", status: "active", capabilities: [],
    transportSettings: {vehicleClasses: []},
    startsAt: at(now.toMillis() - HOUR), endsAt: at(FUTURE),
    createdBy: "manager-1", createdAt: now, updatedAt: now, revision: 1,
  },
  "programStaffGrants/program-1__lead-1":
    grant("lead-1", "functionLead", "Lead One"),
  "programStaffGrants/program-1__greeter-1":
    grant("greeter-1", "airportGreeter", "Greeter"),
  "programFunctions/sangeet": {
    programId: "program-1", organizerId: "org-1", name: "Sangeet",
    venueName: "Durbar hall", status: "active",
    startsAt: at(now.toMillis() - HOUR), endsAt: at(now.toMillis() + HOUR),
    expectedCount: 266, checkedInCount: 184,
  },
  "programTravelLegs/leg-1": {
    programId: "program-1", organizerId: "org-1", kind: "inbound",
    flightNumber: "AI 471", flightStatus: "diverted", readiness: "expected",
    updatedAt: at(now.toMillis() - 60_000),
  },
  "programTravelLegs/leg-2": {
    programId: "program-1", organizerId: "org-1", kind: "inbound",
    flightNumber: "6E 2134", flightStatus: "landed", readiness: "ready",
    updatedAt: now,
  },
  "organizerMomentSends/run-a_lead": {
    momentId: "m-late", recipientKey: "k", decision: "sent",
    dayKey: "x", createdAtMillis: now.toMillis() - 30_000, runId: "run-a",
    actionKind: "staffAttention", organizerId: "org-1",
    scopeKind: "program", scopeId: "program-1", duty: "functionLead",
    severity: "warning", title: "The Sharma family will be late",
  },
});

test("tonight orders today's functions into done, now, next, later", () => {
  const base = {name: "", venueName: "", expectedCount: null,
    checkedInCount: null};
  const day = Date.UTC(2027, 1, 20, 12);
  const phases = tonightFunctions([
    {...base, functionId: "dinner", startsAtMillis: day + 3 * HOUR,
      endsAtMillis: day + 5 * HOUR},
    {...base, functionId: "lunch", startsAtMillis: day - 2 * HOUR,
      endsAtMillis: day - HOUR},
    {...base, functionId: "tea", startsAtMillis: day - 10 * 60_000,
      endsAtMillis: day + HOUR},
    {...base, functionId: "party", startsAtMillis: day + 6 * HOUR,
      endsAtMillis: day + 9 * HOUR},
    {...base, functionId: "tomorrow", startsAtMillis: day + 24 * HOUR,
      endsAtMillis: day + 25 * HOUR},
  ], day, "UTC").map((fn) => [fn.functionId, fn.phase]);
  assert.deepEqual(phases, [["lunch", "done"], ["tea", "now"],
    ["dinner", "next"], ["party", "later"]]);
});

test("cancelled, diverted and disrupted journeys raise alerts", () => {
  const alerts = travelAlerts([
    {id: "a", flightNumber: "AI 1", flightStatus: "cancelled",
      readiness: "expected", updatedAtMillis: 1},
    {id: "b", flightNumber: null, flightStatus: "delayed",
      readiness: "disrupted", updatedAtMillis: 2},
    {id: "c", flightNumber: "AI 3", flightStatus: "landed",
      readiness: "ready", updatedAtMillis: 3},
  ]);
  assert.deepEqual(alerts.map((a) => [a.alertId, a.severity, a.title]), [
    ["flight_a", "urgent", "AI 1 was cancelled"],
    ["readiness_b", "warning", "A flight needs a new plan"],
  ]);
});

test("the manager's board has now, travel and every alert", async () => {
  const board = await getProgramLiveBoardHandler(
    request({programId: "program-1"}, "manager-1"),
    deps(new FakeFirestore(seed())));
  assert.equal(board.now?.functionId, "sangeet");
  assert.equal(board.now?.checkedInCount, 184);
  assert.deepEqual(board.travel, {expected: 1, atCurb: 1, disrupted: 0});
  assert.deepEqual(board.alerts.map((a) => a.alertId).sort(),
    ["flight_leg-1", "run-a_functionLead"]);
  assert.ok(board.alerts.every((a) => a.state === "open" && a.revision === 0));
});

test("a function lead sees only staff alerts; greeters are denied",
  async () => {
    const db = new FakeFirestore(seed());
    const board = await getProgramLiveBoardHandler(
      request({programId: "program-1"}, "lead-1"), deps(db));
    assert.deepEqual(board.alerts.map((a) => a.source), ["staffAttention"]);
    assert.deepEqual(board.travel, {expected: 0, atCurb: 0, disrupted: 0});
    await assert.rejects(getProgramLiveBoardHandler(
      request({programId: "program-1"}, "greeter-1"), deps(db)),
    (err: unknown) => (err as {code?: string}).code === "permission-denied");
  });

test("resolving an alert is fenced, replayable and shows on the board",
  async () => {
    const db = new FakeFirestore(seed());
    const resolve = (payload: Record<string, unknown>, uid = "lead-1") =>
      resolveProgramAlertHandler(request({programId: "program-1",
        alertId: "run-a_functionLead", ...payload}, uid), deps(db));
    const claimed = await resolve({action: "claim", expectedRevision: 0,
      requestId: "req-claim-1"});
    assert.deepEqual(claimed, {programId: "program-1",
      alertId: "run-a_functionLead", state: "open", assignedToMe: true,
      revision: 1});
    assert.deepEqual(await resolve({action: "claim", expectedRevision: 0,
      requestId: "req-claim-1"}), claimed);
    await assert.rejects(resolve({action: "done", expectedRevision: 0,
      requestId: "req-done-01"}),
    (err: unknown) => (err as {code?: string}).code === "aborted");
    const done = await resolve({action: "done", expectedRevision: 1,
      requestId: "req-done-02"});
    assert.equal(done.state, "done");
    const board = await getProgramLiveBoardHandler(
      request({programId: "program-1"}, "lead-1"), deps(db));
    const alert = board.alerts.find((a) => a.alertId === "run-a_functionLead");
    assert.equal(alert?.state, "done");
    assert.equal(alert?.assigneeName, "Lead One");
    assert.equal(alert?.revision, 2);
  });
