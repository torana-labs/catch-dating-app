import assert from "node:assert/strict";
import test from "node:test";
import {HttpsError} from "firebase-functions/v2/https";
import {AudienceTestStore} from
  "../organizers/organizerAudienceTestStore";
import {
  activeStepIndexAfterEdit,
  applyPlanStepEdit,
  saveEventPlanStepHandler,
} from "./planSteps";
import type {PlanStep} from "./planSteps";

const base: PlanStep[] = [
  {stepId: "playbook-0", title: "Arrivals", durationMinutes: 15},
  {stepId: "playbook-1", title: "First round", durationMinutes: 20},
  {stepId: "playbook-2", title: "Close", durationMinutes: 10},
];
const command = {eventId: "event-1", requestId: "request-0001",
  expectedLiveControlRevision: 0};

const code = (expected: string) => (error: unknown) =>
  error instanceof HttpsError && error.code === expected;

test("the first edit starts from the steps the host saw", () => {
  const after = applyPlanStepEdit(null, {...command, op: "add",
    atIndex: 1, baseSteps: base,
    step: {stepId: "quiz", title: "Quiz", durationMinutes: 5}});
  assert.deepEqual(after.map((step) => step.stepId),
    ["playbook-0", "quiz", "playbook-1", "playbook-2"]);
  assert.throws(() => applyPlanStepEdit(null, {...command, op: "remove",
    stepId: "playbook-0"}), code("failed-precondition"));
});

test("stored overrides win over a stale base", () => {
  const stored = [base[0], base[2]];
  const after = applyPlanStepEdit(stored, {...command, op: "edit",
    baseSteps: base,
    step: {stepId: "playbook-2", title: "Last orders", durationMinutes: 12}});
  assert.deepEqual(after, [base[0],
    {stepId: "playbook-2", title: "Last orders", durationMinutes: 12}]);
});

test("remove, reorder and duplicates fail closed", () => {
  assert.deepEqual(applyPlanStepEdit(base, {...command, op: "remove",
    stepId: "playbook-1"}).map((step) => step.stepId),
  ["playbook-0", "playbook-2"]);
  assert.throws(() => applyPlanStepEdit([base[0]], {...command,
    op: "remove", stepId: "playbook-0"}), code("failed-precondition"));
  assert.throws(() => applyPlanStepEdit(base, {...command, op: "remove",
    stepId: "gone"}), code("not-found"));
  assert.deepEqual(applyPlanStepEdit(base, {...command, op: "reorder",
    orderedStepIds: ["playbook-2", "playbook-0", "playbook-1"]})
    .map((step) => step.stepId), ["playbook-2", "playbook-0", "playbook-1"]);
  assert.throws(() => applyPlanStepEdit(base, {...command, op: "reorder",
    orderedStepIds: ["playbook-2", "playbook-0"]}), code("invalid-argument"));
  assert.throws(() => applyPlanStepEdit(base, {...command, op: "add",
    step: base[0]}), code("already-exists"));
});

test("the live pointer follows its step", () => {
  const reordered = [base[2], base[0], base[1]];
  assert.equal(activeStepIndexAfterEdit(base, reordered, 1), 2);
  assert.equal(activeStepIndexAfterEdit(base, [base[0], base[2]], 1), 1);
  assert.equal(activeStepIndexAfterEdit(base, [base[0]], 2), 0);
});

test("saveEventPlanStep fences, applies once and replays", async () => {
  const stamp = {_seconds: 1, _nanoseconds: 0};
  const store = new AudienceTestStore({
    "events/event-1": {organizerId: "org-1"},
    "organizers/org-1": {hostUserId: "host-1", hostUserIds: [],
      hostProfiles: []},
    "eventSuccessPlans/event-1": {eventId: "event-1", organizerId: "org-1",
      status: "live", activeStepIndex: 1, liveControlRevision: 0},
  });
  const deps = {firestore: () => store.asFirestore(),
    serverTimestamp: () => stamp, timestampFromMillis: () => stamp,
    nowMillis: () => 1000, checkRateLimit: async () => {}};
  const request = {auth: {uid: "host-1"}, data: {...command, op: "reorder",
    baseSteps: base,
    orderedStepIds: ["playbook-1", "playbook-0", "playbook-2"]}};

  const first = await saveEventPlanStepHandler(request as never,
    deps as never);
  assert.deepEqual(first, {eventId: "event-1", liveControlRevision: 1,
    stepCount: 3, replayed: false});
  const plan = store.docs["eventSuccessPlans/event-1"];
  assert.equal(plan.liveControlRevision, 1);
  assert.equal(plan.activeStepIndex, 0);
  assert.deepEqual((plan.stepOverrides as PlanStep[])
    .map((step) => step.stepId), ["playbook-1", "playbook-0", "playbook-2"]);

  const replay = await saveEventPlanStepHandler(request as never,
    deps as never);
  assert.deepEqual(replay, {...first, replayed: true});
  assert.equal(store.docs["eventSuccessPlans/event-1"].liveControlRevision, 1);

  await assert.rejects(saveEventPlanStepHandler({...request, data: {
    ...request.data, requestId: "request-0002"}} as never, deps as never),
  code("aborted"));
  await assert.rejects(saveEventPlanStepHandler({...request, data: {
    ...command, op: "remove", stepId: "playbook-0"}} as never,
  deps as never), code("already-exists"));
  await assert.rejects(saveEventPlanStepHandler({...request,
    auth: {uid: "guest-1"}} as never, deps as never),
  code("permission-denied"));
});
