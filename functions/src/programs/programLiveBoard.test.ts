import assert from "node:assert/strict";
import test from "node:test";
import * as admin from "firebase-admin";
import {deps, request, now} from "../shared/testing/programFixtures";
import {FakeFirestore, type FakeData} from
  "../shared/testing/programFirestore";
import {
  resolveProgramAlertHandler,
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

test("resolving an alert is fenced, replayable and stored for the views",
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
    const stored = db.getDoc(
      "programAlerts/program-1_run-a_functionLead") as FakeData;
    assert.equal(stored.state, "done");
    assert.equal(stored.assigneeUid, "lead-1");
    assert.equal(stored.assigneeName, "Lead One");
    assert.equal(stored.revision, 2);
    await assert.rejects(resolve({action: "claim", expectedRevision: 2,
      requestId: "req-greet-1"}, "greeter-1"),
    (err: unknown) => (err as {code?: string}).code === "permission-denied");
  });
