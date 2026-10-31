import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
import type {Firestore} from "firebase-admin/firestore";
import {FakeFirestore} from "../../operations/testFirestore";
import type {RuntimeFieldId} from "../runtimeProfile";
import {EventRuntimeRequiredDataStore, RUNTIME_DATA_REQUESTS,
  RUNTIME_DATA_REQUEST_RECEIPTS} from "./runtimeRequiredDataStore";

const now = Date.parse("2026-05-15T12:00:00.000Z");
const stamp = (at: number) => ({_seconds: Math.floor(at / 1000),
  _nanoseconds: at % 1000 * 1_000_000});
const fixture = (name: string) => JSON.parse(readFileSync(
  "../contracts/fixtures/valid/" + name + ".json", "utf8"));

async function harness() {
  const fake = new FakeFirestore();
  const context = {mode: "live" as const, eventId: "event-1",
    organizerId: "organizer-1"};
  const attendeeId = "attendee-1";
  const uid = "guest-1";
  const event = {...fixture("event_doc"), organizerId: context.organizerId, startTime: stamp(now - 60_000),
    endTime: stamp(now + 3_600_000), status: "active",
    runtimeAccess: {enabled: true,
      publicRuntimeId: "runtime_123456789012345678901234",
      walkInPolicy: "deny", termsVersion: "event-runtime-v1"}};
  const plan = {...fixture("event_success_plan_doc"),
    eventId: context.eventId, organizerId: context.organizerId};
  const attendee = {...fixture("event_attendee_doc"),
    eventId: context.eventId, organizerId: context.organizerId, status: "registered", linkedUid: uid,
    checkedInAt: null, checkedInBy: null, linkedAt: stamp(now - 60_000),
    accountabilityResolution: null,
    accountabilityResolvedForCheckInAt: null,
    accountabilityResolvedAt: null, accountabilityResolvedBy: null,
    attendanceRevision: 0, preCheckInStatus: null,
    createdAt: stamp(now - 120_000), updatedAt: stamp(now - 60_000),
    registeredAt: stamp(now - 120_000)};
  const participant = {eventId: context.eventId,
    organizerId: context.organizerId, uid,
    eventAttendeeId: attendeeId, identityVersion: 1,
    claimMethod: "verifiedPhone", accessStatus: "needsInput",
    requiredFieldIds: ["displayName", "paceBand"],
    completedFieldIds: ["displayName"], profileRevision: 2,
    runtimeProfile: {displayName: "Guest One", gender: null,
      interestedInGenders: [], relationshipGoal: null, dateOfBirth: null,
      paceBand: null, skillBand: null, dietaryAndSeatingNotes: null,
      questionnaireAnswerIds: [], teamName: null},
    consents: {runtimeTermsVersion: "event-runtime-v1",
      sensitiveDataTermsVersion: null, saveAsCatchPrefill: false},
    claimedAt: stamp(now - 120_000), readyAt: null, revokedAt: null,
    createdAt: stamp(now - 120_000), updatedAt: stamp(now - 60_000)};
  fake.write("events/" + context.eventId, event);
  fake.write("eventSuccessPlans/" + context.eventId, plan);
  fake.write("eventAttendees/" + attendeeId, attendee);
  fake.write("eventRuntimeParticipants/" + context.eventId + "_" + uid,
    participant);
  const clock = {now};
  const store = new EventRuntimeRequiredDataStore(
    fake as unknown as Firestore, () => clock.now);
  return {fake, context, attendeeId, uid, event, plan, attendee, participant,
    clock, store};
}

function command(view: Awaited<ReturnType<
  EventRuntimeRequiredDataStore["review"]>>, operationId = "request-one",
fieldIds: readonly RuntimeFieldId[] = ["paceBand"]) {
  return {kind: "requestRequiredData" as const, context: view.context,
    eventId: view.context.eventId, operationId, payload: {
      attendeeId: view.attendeeId, fieldIds: [...fieldIds],
      expiresAt: view.serverTime + 1_800_000,
      expectedProfileRevision: view.profileRevision,
      expectedRequestRevision: view.requestRevision,
      expectedSourceHash: view.sourceHash}};
}

test("review exposes only current event-derived fields", async () => {
  const h = await harness();
  const view = await h.store.review(h.context, h.attendeeId);
  assert.equal(view.attendeeId, h.attendeeId);
  assert.equal(view.profileRevision, 2);
  assert.equal(view.requestRevision, 0);
  assert.deepEqual(view.completedFieldIds, ["displayName"]);
  assert.deepEqual(view.availableFieldIds,
    ["displayName", "paceBand", "gender", "interestedInGenders"]);
  assert.equal(view.request, null);
  assert.equal(h.fake.entries().length, 4);
});

test("one source-fenced command writes a request and immutable receipt",
  async () => {
    const h = await harness();
    const initial = await h.store.review(h.context, h.attendeeId);
    const input = command(initial);
    const applied = await h.store.request(input);
    assert.equal(applied.outcome, "applied");
    assert.equal(applied.operationRevision, 1);
    assert.equal(applied.view.request?.status, "pending");
    assert.deepEqual(applied.view.request?.fieldIds, ["paceBand"]);
    assert.equal(h.fake.entries().filter(([path]) =>
      path.startsWith(RUNTIME_DATA_REQUESTS + "/")).length, 1);
    assert.equal(h.fake.entries().filter(([path]) =>
      path.startsWith(RUNTIME_DATA_REQUEST_RECEIPTS + "/")).length, 1);
    assert.deepEqual(h.fake.read("events/" + h.context.eventId), h.event);
    assert.deepEqual(h.fake.read("eventAttendees/" + h.attendeeId),
      h.attendee);

    const replayed = await h.store.request(input);
    assert.equal(replayed.outcome, "replayed");
    assert.equal(replayed.operationRevision, 1);
    assert.equal(h.fake.entries().length, 6);
    await assert.rejects(h.store.request({...input,
      payload: {...input.payload, fieldIds: ["gender"]}}),
    {code: "aborted"});
  });

test("profile, request and source revisions fence stale automation",
  async () => {
    const h = await harness();
    const initial = await h.store.review(h.context, h.attendeeId);
    for (const input of [
      {...command(initial, "profile-stale"), payload: {
        ...command(initial).payload,
        expectedProfileRevision: initial.profileRevision + 1}},
      {...command(initial, "request-stale"), payload: {
        ...command(initial).payload,
        expectedRequestRevision: initial.requestRevision + 1}},
      {...command(initial, "source-stale"), payload: {
        ...command(initial).payload, expectedSourceHash: "0".repeat(64)}},
    ]) await assert.rejects(h.store.request(input), {code: "aborted"});

    h.fake.write("eventRuntimeParticipants/event-1_guest-1",
      {...h.participant, profileRevision: 3,
        runtimeProfile: {...h.participant.runtimeProfile,
          paceBand: "moderate"},
        completedFieldIds: ["displayName", "paceBand"]});
    await assert.rejects(h.store.request(command(initial, "changed")),
      {code: "aborted"});
  });

test("completed, unsupported and out-of-window requests fail closed",
  async () => {
    const h = await harness();
    const view = await h.store.review(h.context, h.attendeeId);
    await assert.rejects(h.store.request(command(view, "completed",
      ["displayName"])), {code: "failed-precondition"});
    await assert.rejects(h.store.request({...command(view, "unsupported"),
      payload: {...command(view).payload, fieldIds: ["teamName"]}}),
    {code: "failed-precondition"});
    await assert.rejects(h.store.request({...command(view, "expired"),
      payload: {...command(view).payload, expiresAt: h.clock.now}}),
    {code: "failed-precondition"});
    await assert.rejects(h.store.request({...command(view, "too-late"),
      payload: {...command(view).payload,
        expiresAt: h.clock.now + 3_600_001}}),
    {code: "failed-precondition"});
  });

test("concurrent exact commands commit once and replay thereafter",
  async () => {
    const h = await harness();
    const input = command(await h.store.review(h.context, h.attendeeId));
    const results = await Promise.all(Array.from({length: 8}, () =>
      h.store.request(input)));
    assert.equal(results.filter((result) =>
      result.outcome === "applied").length, 1);
    assert.equal(results.filter((result) =>
      result.outcome === "replayed").length, 7);
    assert.ok(results.every((result) => result.operationRevision === 1));
  });

test("wrong context and inactive participants cannot manufacture requests",
  async () => {
    const h = await harness();
    const view = await h.store.review(h.context, h.attendeeId);
    const input = command(view);
    await assert.rejects(h.store.request({...input, eventId: "event-2"}));
    h.fake.write("eventRuntimeParticipants/event-1_guest-1",
      {...h.participant, accessStatus: "revoked"});
    await assert.rejects(h.store.review(h.context, h.attendeeId),
      {code: "failed-precondition"});
  });
