import assert from "node:assert/strict";
import test from "node:test";
import type {RuntimeRequiredDataView} from
  "./runtimeRequiredDataStore";
import {requestMissingRuntimeData} from "./runtimeRequiredDataTrigger";

const stamp = {_seconds: 1_800_000_000, _nanoseconds: 0};
function participant(overrides: Record<string, unknown> = {}) {
  return {eventId: "event-1", organizerId: "organizer-1", uid: "guest-1",
    eventAttendeeId: "attendee-1", identityVersion: 1,
    claimMethod: "verifiedPhone", accessStatus: "needsInput",
    requiredFieldIds: ["displayName", "paceBand"],
    completedFieldIds: ["displayName"], profileRevision: 2,
    runtimeProfile: {displayName: "Guest One", gender: null,
      interestedInGenders: [], relationshipGoal: null, dateOfBirth: null,
      paceBand: null, skillBand: null, dietaryAndSeatingNotes: null,
      questionnaireAnswerIds: [], teamName: null},
    consents: {runtimeTermsVersion: "event-runtime-v1",
      sensitiveDataTermsVersion: null, saveAsCatchPrefill: false},
    claimedAt: stamp, readyAt: null, revokedAt: null,
    createdAt: stamp, updatedAt: stamp, ...overrides};
}

function view(overrides: Partial<RuntimeRequiredDataView> = {}):
RuntimeRequiredDataView {
  return {context: {mode: "live", eventId: "event-1",
    organizerId: "organizer-1"}, attendeeId: "attendee-1",
  serverTime: 1_800_000_000_000, sourceHash: "a".repeat(64),
  profileRevision: 2, requestRevision: 0,
  validUntil: 1_800_003_600_000,
  requiredFieldIds: ["displayName", "paceBand"],
  availableFieldIds: ["displayName", "paceBand"],
  completedFieldIds: ["displayName"], request: null, ...overrides};
}

test("needs-input writes one deterministic system command", async () => {
  const commands: unknown[] = [];
  const result = await requestMissingRuntimeData(
    "event-1_guest-1", participant(), {store: () => ({
      review: async () => view(),
      request: async (command) => {
        commands.push(command);
        return {outcome: "applied" as const, operationRevision: 1,
          view: view({requestRevision: 1})};
      },
    })});
  assert.equal(result?.outcome, "applied");
  assert.equal(commands.length, 1);
  const command = commands[0] as {kind: string; operationId: string;
    payload: Record<string, unknown>};
  assert.equal(command.kind, "requestRequiredData");
  assert.match(command.operationId, /^required-data:[a-f0-9]{64}$/);
  assert.deepEqual(command.payload.fieldIds, ["paceBand"]);
  assert.equal(command.payload.expiresAt, view().validUntil);
  assert.equal(command.payload.expectedProfileRevision, 2);
  assert.equal(command.payload.expectedRequestRevision, 0);
});

test("ready and fully complete participants do not create commands",
  async () => {
    let calls = 0;
    const deps = {store: () => ({review: async () => {
      calls += 1;
      return view({completedFieldIds: ["displayName", "paceBand"]});
    }, request: async () => {
      calls += 100;
      throw new Error("unexpected request");
    }})};
    assert.equal(await requestMissingRuntimeData("event-1_guest-1",
      participant({accessStatus: "ready"}), deps), null);
    assert.equal(calls, 0);
    assert.equal(await requestMissingRuntimeData("event-1_guest-1",
      participant(), deps), null);
    assert.equal(calls, 1);
  });

test("invalid participant identity fails before source review", async () => {
  let calls = 0;
  const deps = {store: () => ({review: async () => {
    calls += 1; return view();
  }, request: async () => {
    calls += 1; throw new Error("unexpected request");
  }})};
  await assert.rejects(requestMissingRuntimeData("another-id",
    participant(), deps), {code: "failed-precondition"});
  await assert.rejects(requestMissingRuntimeData("event-1_guest-1",
    {...participant(), runtimeProfile: null}, deps),
  {code: "failed-precondition"});
  assert.equal(calls, 0);
});
