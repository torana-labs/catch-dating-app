/* eslint-disable max-len */
import assert from "node:assert/strict";
import test from "node:test";
import {HttpsError} from "firebase-functions/v2/https";
import {AudienceTestStore} from "../organizers/organizerAudienceTestStore";
import {PLAN_SETUP_FIELDS, planSetupRefusal, setupBlockedByEvent, timestampMicros} from "./planSetup";
import {saveEventSuccessPlanSetupHandler} from "./saveEventSuccessPlanSetup";

const code = (expected: string, reason?: string) => (error: unknown) =>
  error instanceof HttpsError && error.code === expected &&
  (reason === undefined || (error.details as {reason?: string} | undefined)?.reason === reason);

const UPDATED = {_seconds: 1_800_000_000, _nanoseconds: 123_456_000};
const UPDATED_MICROS = 1_800_000_000_123_456;
const NOW = 1_800_000_100_000;
const NEW_STAMP = {_seconds: 1_800_000_200, _nanoseconds: 0};
const FUTURE = {_seconds: 1_900_000_000, _nanoseconds: 0};

const setup = {
  playbookId: "dinner_table_mixer",
  selectedModuleIds: ["qr_check_in", "guided_rotations", "wingman_requests"],
  targetAttendeeCount: 24,
  structureConfig: {unitKind: "tables", unitSize: 4, unitCount: null, rotationIntervalMinutes: 30,
    revealCountdownSeconds: 10, topology: "adjacency",
    resourceCapacity: {concurrentUnits: 6, resourceLabelId: "table", seatsPerUnit: 4}},
  hostGoal: "Everyone meets four new people.",
  wingmanRequestsEnabled: true,
  contextualOpenersEnabled: false,
  compatibilityAffectsRanking: false,
  questionnaireConfig: {templateId: "balanced", customTitle: null, customQuestions: []},
  conversationGraphConsentMode: "optOut",
  attendeePrompt: "Bring a story about your best meal.",
};

function harness(overrides: {event?: Record<string, unknown>; plan?: Record<string, unknown> | null} = {}) {
  const docs: Record<string, Record<string, unknown>> = {
    "events/event-1": {organizerId: "org-1", startTime: FUTURE, bookedCount: 0, waitlistedCount: 0,
      checkedInCount: 0, ...overrides.event},
    "organizers/org-1": {hostUserId: "host-1", hostUserIds: ["host-2"], hostProfiles: []},
  };
  if (overrides.plan !== null) {
    docs["eventSuccessPlans/event-1"] = {eventId: "event-1", organizerId: "org-1", status: "setup",
      frozenAt: null, playbookId: "social_run_light", selectedModuleIds: [], targetAttendeeCount: 20,
      hostGoal: "", wingmanRequestsEnabled: false, contextualOpenersEnabled: false, activeStepIndex: 0,
      liveControlRevision: 3, stepOverrides: [{stepId: "kept"}], createdAt: {_seconds: 1, _nanoseconds: 0},
      updatedAt: UPDATED, ...overrides.plan};
  }
  const store = new AudienceTestStore(docs);
  const deps = {firestore: () => store.asFirestore(), serverTimestamp: () => NEW_STAMP,
    nowMillis: () => NOW, checkRateLimit: async () => {}};
  return {store, deps};
}

const request = (data: Record<string, unknown> = {}, uid = "host-1") =>
  ({auth: {uid}, data: {eventId: "event-1", expectedUpdatedAtMicros: UPDATED_MICROS, setup, ...data}}) as never;

test("a host saves exactly the setup fields, including topology and resource capacity", async () => {
  const {store, deps} = harness();
  const response = await saveEventSuccessPlanSetupHandler(request(), deps as never);
  assert.deepEqual(response, {eventId: "event-1", saved: true});
  const plan = store.docs["eventSuccessPlans/event-1"];
  for (const key of PLAN_SETUP_FIELDS) assert.deepEqual(plan[key], setup[key], key);
  assert.deepEqual(plan.updatedAt, NEW_STAMP);
  // Everything that isn't a setup field is untouched.
  assert.equal(plan.liveControlRevision, 3);
  assert.deepEqual(plan.stepOverrides, [{stepId: "kept"}]);
  assert.equal(plan.status, "setup");
  assert.deepEqual(plan.createdAt, {_seconds: 1, _nanoseconds: 0});
});

test("any organizer manager may save; anyone else is refused", async () => {
  const {deps} = harness();
  assert.deepEqual(await saveEventSuccessPlanSetupHandler(request({}, "host-2"), deps as never),
    {eventId: "event-1", saved: true});
  const other = harness();
  await assert.rejects(saveEventSuccessPlanSetupHandler(request({}, "guest-1"), other.deps as never),
    code("permission-denied"));
  await assert.rejects(saveEventSuccessPlanSetupHandler({data: {eventId: "event-1", expectedUpdatedAtMicros: UPDATED_MICROS, setup}} as never, other.deps as never),
    code("unauthenticated"));
});

test("a save from another device since the host read the plan is refused", async () => {
  const {store, deps} = harness();
  await assert.rejects(saveEventSuccessPlanSetupHandler(request({expectedUpdatedAtMicros: UPDATED_MICROS - 1}),
    deps as never), code("aborted", "stale_plan"));
  assert.equal(store.docs["eventSuccessPlans/event-1"].playbookId, "social_run_light");
});

test("setup closes once the event starts or has guests, and a live or frozen plan is locked", async () => {
  const cases: Array<[Parameters<typeof harness>[0], string]> = [
    [{plan: null}, "plan_missing"],
    [{event: {startTime: {_seconds: 1_700_000_000, _nanoseconds: 0}}}, "setup_closed"],
    [{event: {bookedCount: 1}}, "setup_closed"],
    [{event: {waitlistedCount: 2}}, "setup_closed"],
    [{event: {checkedInCount: 1}}, "setup_closed"],
    [{plan: {status: "live"}}, "plan_locked"],
    [{plan: {frozenAt: {_seconds: 5, _nanoseconds: 0}}}, "plan_locked"],
    [{plan: {eventId: "event-2"}}, "event_mismatch"],
  ];
  for (const [overrides, reason] of cases) {
    const {store, deps} = harness(overrides);
    await assert.rejects(saveEventSuccessPlanSetupHandler(request(), deps as never),
      code("failed-precondition", reason), reason);
    if (overrides?.plan !== null) {
      assert.equal(store.docs["eventSuccessPlans/event-1"].playbookId !== "dinner_table_mixer", true, reason);
    }
  }
});

test("the payload is checked against its contract", async () => {
  const {deps} = harness();
  await assert.rejects(saveEventSuccessPlanSetupHandler(request({setup: {...setup, extra: 1}}), deps as never),
    code("invalid-argument"));
  await assert.rejects(saveEventSuccessPlanSetupHandler(request({setup: {...setup, targetAttendeeCount: 0}}),
    deps as never), code("invalid-argument"));
  const {hostGoal: _omitted, ...missing} = setup;
  void _omitted;
  await assert.rejects(saveEventSuccessPlanSetupHandler(request({setup: missing}), deps as never),
    code("invalid-argument"));
});

test("helpers: microsecond timestamps and setup blocking", () => {
  assert.equal(timestampMicros(UPDATED), UPDATED_MICROS);
  assert.equal(timestampMicros({seconds: 2, nanoseconds: 1_999}), 2_000_001);
  assert.equal(timestampMicros(null), null);
  assert.equal(setupBlockedByEvent({startTime: FUTURE}, NOW), false);
  assert.equal(setupBlockedByEvent({startTime: {_seconds: NOW / 1000, _nanoseconds: 0}}, NOW), true);
  assert.equal(planSetupRefusal({startTime: FUTURE}, {status: "setup", frozenAt: null}, "e", NOW), null);
});
