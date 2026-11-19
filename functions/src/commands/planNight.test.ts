/* eslint-disable max-len */
import assert from "node:assert/strict";
import test from "node:test";
import type {CallableRequest} from "firebase-functions/v2/https";
import {FakeFirestore} from "../operations/testFirestore";
import {contractValidator} from "../shared/contractTestValidators";
import {schemaErrorMessages} from "../shared/generated/schemaValidationRuntime";
import {buildEventSuccessPlanDoc} from "../events/mutateEvent";
import {ensureTryItWorkspaceHandler} from "./ensureTryItWorkspace";
import {planNightHandler} from "./planNight";
import {tryItWorkspaceOrganizerId} from "./workspace";

const NOW = "2026-11-19T08:00:00.000Z";
const SERVER_TIME = {_seconds: 1795161600, _nanoseconds: 0};
const UID = "visitor-1";
const PHONE = "+919000000002";
const KEY = "night-plan-request-0001";
const ORGANIZER_ID = tryItWorkspaceOrganizerId(UID, 1);
const EVENT_ID = "draftevent0000000001";

const validate = contractValidator("PlanNightCallableResponse");
function valid(value: unknown, label: string) {
  assert.equal(validate(value), true, `${label}: ${schemaErrorMessages(validate as never).join("; ")}`);
}

/** Stored timestamps lose their methods in the fake store; give them back. */
const withTime = (value: unknown) => {
  const seconds = (value as {_seconds: number})._seconds;
  return {_seconds: seconds, _nanoseconds: 0, toMillis: () => seconds * 1000};
};

function harness() {
  const db = new FakeFirestore();
  const deps = {
    firestore: () => db as unknown as FirebaseFirestore.Firestore,
    now: () => new Date(NOW),
    serverTimestamp: () => SERVER_TIME as unknown as FirebaseFirestore.FieldValue,
    timestampFromDate: () => SERVER_TIME,
    timestampFromMillis: (millis: number) => ({_seconds: Math.floor(millis / 1000), _nanoseconds: 0}) as unknown as
      FirebaseFirestore.Timestamp,
    checkRateLimit: (async () => undefined) as never,
    buildPlanDoc: ((params: Parameters<typeof buildEventSuccessPlanDoc>[0]) => buildEventSuccessPlanDoc({...params,
      event: {...params.event, startTime: withTime(params.event.startTime), endTime: withTime(params.event.endTime)} as never})) as
      typeof buildEventSuccessPlanDoc,
  };
  return {db, deps};
}

function call(data: unknown) {
  return {data, auth: {uid: UID, token: {phone_number: PHONE}}, rawRequest: {headers: {}, ip: "198.51.100.7"}} as
    unknown as CallableRequest<unknown>;
}

const envelope = (mode: "preview" | "apply", input: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) =>
  ({mode, idempotencyKey: KEY, surface: "website", input: {format: "run", guestCount: 24, ...input}, ...extra});

async function withWorkspace(eventFormat: Record<string, unknown> | null = {version: 1, activityKind: "socialRun", interactionModel: "pacePods"}) {
  const h = harness();
  await ensureTryItWorkspaceHandler(call({mode: "apply", idempotencyKey: "workspace-request-01", surface: "website",
    input: {organizerName: "Sunrise Social Club", marketId: "in-mh-mumbai"}}), h.deps);
  h.db.write(`events/${EVENT_ID}`, {organizerId: ORGANIZER_ID, publicationState: "private", status: "active",
    name: "Driftwood morning run", capacityLimit: 30, startTime: {_seconds: 1795500000, _nanoseconds: 0},
    endTime: {_seconds: 1795507200, _nanoseconds: 0}, ...(eventFormat ? {eventFormat} : {})});
  const pointer = h.db.read(`tryItWorkspaces/${UID}`) as Record<string, unknown>;
  h.db.write(`tryItWorkspaces/${UID}`, {...pointer, tryItEventIds: [EVENT_ID]});
  return h;
}

test("without a workspace it asks for one", async () => {
  const h = harness();
  const response = await planNightHandler(call(envelope("preview")), h.deps);
  valid(response, "no workspace");
  assert.equal(response.status, "needs_input");
  assert.deepEqual(response.result.reasons, ["no_workspace"]);
  assert.equal(response.result.plan, null);
});

test("preview answers the night and a rehearsal setup, and writes nothing", async () => {
  const h = await withWorkspace();
  const before = h.db.entries().length;
  const response = await planNightHandler(call(envelope("preview")), h.deps);
  valid(response, "preview");
  assert.equal(response.status, "previewed");
  assert.equal(response.result.organizerId, ORGANIZER_ID);
  assert.equal(response.result.plan?.groups.count, 3);
  assert.equal(response.result.plan?.missions.length, 3);
  assert.deepEqual(response.result.rehearsalSetup?.moduleIds, ["arrival", "firstHello", "pods", "conversationCues", "afterglow", "accountability"]);
  assert.equal(response.result.rehearsalSetup?.durationMinutes, 62);
  assert.equal(h.db.entries().length, before);
});

test("every format previews against the response contract", async () => {
  const h = await withWorkspace();
  for (const format of ["run", "dinner", "quiz", "courts", "crawl"]) {
    for (const guestCount of [2, 17, 200]) {
      const response = await planNightHandler(call(envelope("preview", {format, guestCount})), h.deps);
      valid(response, `${format} ${guestCount}`);
    }
  }
});

test("apply saves the plan on the workspace draft and replays", async () => {
  const h = await withWorkspace();
  const preview = await planNightHandler(call(envelope("preview")), h.deps);
  const confirm = {commandId: "night.plan", previewHash: preview.previewHash};
  const applied = await planNightHandler(call(envelope("apply", {}, {confirm})), h.deps);
  valid(applied, "applied");
  assert.equal(applied.status, "applied");
  assert.equal(applied.result.eventId, EVENT_ID);
  assert.ok(applied.receiptId);
  const plan = h.db.read(`eventSuccessPlans/${EVENT_ID}`) as Record<string, unknown>;
  assert.equal(plan.playbookId, "social_run_light");
  assert.equal(plan.targetAttendeeCount, 24);
  assert.equal(plan.status, "setup");
  assert.equal(plan.organizerId, ORGANIZER_ID);
  // The topology is kept, not dropped (C4 PR 3).
  assert.deepEqual(plan.structureConfig, {unitKind: "wholeGroup", unitSize: 24, unitCount: 1, rotationIntervalMinutes: null,
    revealCountdownSeconds: (plan.structureConfig as {revealCountdownSeconds: number}).revealCountdownSeconds, topology: "set"});
  const again = await planNightHandler(call(envelope("apply", {}, {confirm})), h.deps);
  assert.equal(again.status, "replayed");
});

test("apply updates a plan still in setup, and leaves a live one alone", async () => {
  const h = await withWorkspace();
  h.db.write(`eventSuccessPlans/${EVENT_ID}`, {eventId: EVENT_ID, organizerId: ORGANIZER_ID, playbookId: "host_led_social",
    status: "setup", frozenAt: null, hostGoal: "Keep mine", structureConfig: {unitKind: "pods", unitSize: 4, revealCountdownSeconds: 20}});
  const updated = await planNightHandler(call(envelope("apply")), h.deps);
  assert.equal(updated.status, "applied");
  const plan = h.db.read(`eventSuccessPlans/${EVENT_ID}`) as Record<string, unknown>;
  assert.equal(plan.playbookId, "social_run_light");
  assert.equal(plan.hostGoal, "Keep mine");
  assert.deepEqual(plan.structureConfig, {unitKind: "wholeGroup", unitSize: 24, unitCount: 1, rotationIntervalMinutes: null,
    revealCountdownSeconds: 20, topology: "set"});

  h.db.write(`eventSuccessPlans/${EVENT_ID}`, {...plan, status: "live"});
  const locked = await planNightHandler(call({...envelope("apply"), idempotencyKey: "night-plan-request-0002"}), h.deps);
  valid(locked, "locked");
  assert.deepEqual(locked.result.reasons, ["plan_locked"]);
});

test("apply refuses when the draft's activity is unset or doesn't match, or there is no draft", async () => {
  const unset = await withWorkspace(null);
  const needed = await planNightHandler(call(envelope("apply")), unset.deps);
  valid(needed, "format needed");
  assert.deepEqual(needed.result.reasons, ["event_format_needed"]);

  const dinner = await withWorkspace({version: 1, activityKind: "dinner", interactionModel: "seatedTable"});
  const mismatch = await planNightHandler(call(envelope("apply")), dinner.deps);
  assert.deepEqual(mismatch.result.reasons, ["event_format_mismatch"]);
  assert.equal(dinner.db.read(`eventSuccessPlans/${EVENT_ID}`), undefined);

  const none = harness();
  await ensureTryItWorkspaceHandler(call({mode: "apply", idempotencyKey: "workspace-request-01", surface: "website",
    input: {organizerName: "Sunrise Social Club", marketId: "in-mh-mumbai"}}), none.deps);
  const noDraft = await planNightHandler(call(envelope("apply")), none.deps);
  valid(noDraft, "no draft");
  assert.deepEqual(noDraft.result.reasons, ["no_draft_event"]);
  assert.deepEqual(noDraft.next, [{commandId: "event.import-from-link", label: "Import an event to plan"}]);
});
