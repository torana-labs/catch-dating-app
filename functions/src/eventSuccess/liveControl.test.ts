import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {HttpsError} from "firebase-functions/v2/https";
import {
  LivePlanState,
  publishedAssignmentThroughRound,
  publishEventSuccessRotationRoundHandler,
  resolveEventSuccessLiveAction,
  resolveRotationPublish,
} from "./liveControl";
import {configuredPreparationAttempts} from "./rotationDraftTrigger";
import {AudienceTestStore} from
  "../organizers/organizerAudienceTestStore";
import {assignmentFeatureConsentId} from
  "./assignmentFeatureConsent";
import {buildAssignmentFeatureAudit} from "./assignmentFeatureAudit";

const baseState = (overrides: Partial<LivePlanState> = {}): LivePlanState => ({
  activeStepIndex: 0,
  liveControlRevision: 4,
  publishedRotationRoundIndex: -1,
  publishedRevealRoundIndex: -1,
  status: "live",
  revealStatus: "idle",
  activeRevealRoundIndex: 0,
  revealStartedAtMillis: null,
  revealCountdownSeconds: 10,
  ...overrides,
});

test("publish is idempotent after a rotation round is committed", () => {
  const first = resolveRotationPublish(
    {liveControlRevision: 4, publishedRotationRoundIndex: -1},
    {
      eventId: "event-1",
      expectedRevision: 4,
      roundIndex: 0,
      confirmed: true,
    }
  );
  assert.deepEqual(first, {
    replayed: false,
    revision: 5,
    publishedRotationRoundIndex: 0,
  });

  const replay = resolveRotationPublish(
    {
      liveControlRevision: first.revision,
      publishedRotationRoundIndex: first.publishedRotationRoundIndex,
    },
    {
      eventId: "event-1",
      expectedRevision: 4,
      roundIndex: 0,
      confirmed: true,
    }
  );
  assert.deepEqual(replay, {
    replayed: true,
    revision: 5,
    publishedRotationRoundIndex: 0,
  });
});

test("rotation publish exposes no future precomputed slots", () => {
  const published = publishedAssignmentThroughRound({
    eventId: "event-1",
    moduleId: "guided_rotations",
    rotationSlots: [
      {roundIndex: 0, peerUid: "user-2", whyCodes: ["fresh_peer"]},
      {roundIndex: 1, peerUid: "user-3", whyCodes: ["fresh_peer"]},
    ],
    sitOutSlots: [{roundIndex: 2, whyCodes: ["sit_out"]}],
  }, 0);

  assert.deepEqual(published.peerUids, ["user-2"]);
  assert.deepEqual(
    (published.rotationSlots as Array<Record<string, unknown>>)
      .map((slot) => slot.roundIndex),
    [0]
  );
  assert.deepEqual(published.sitOutSlots, []);
});

test("beat transition module has no synchronous generator dependency", () => {
  const source = readFileSync(
    join(process.cwd(), "src/eventSuccess/liveControl.ts"),
    "utf8"
  );
  assert.doesNotMatch(source, /generateEventSuccessRotations/);
  assert.doesNotMatch(source, /prepareEventSuccessRotationDraft/);
});

test("published reveal cannot be reverted after countdown expiry", () => {
  const state = baseState({
    revealStatus: "countingDown",
    activeRevealRoundIndex: 0,
    revealStartedAtMillis: 1_000,
  });

  assert.throws(
    () => resolveEventSuccessLiveAction(
      state,
      {
        eventId: "event-1",
        expectedRevision: 4,
        action: "cancelRevealCountdown",
      },
      11_000
    ),
    (error: unknown) => error instanceof HttpsError &&
      error.code === "failed-precondition" &&
      error.message.includes("cannot be reverted")
  );
});

test("reveal publication requires explicit confirmation", () => {
  assert.throws(
    () => resolveEventSuccessLiveAction(
      baseState(),
      {
        eventId: "event-1",
        expectedRevision: 4,
        action: "publishReveal",
        roundIndex: 0,
        confirmed: false,
      },
      1_000
    ),
    (error: unknown) => error instanceof HttpsError &&
      error.code === "failed-precondition" &&
      error.message.includes("explicit confirmation")
  );
});

test("sweep completion warns but explicit acknowledgement completes", () => {
  assert.throws(
    () => resolveEventSuccessLiveAction(
      baseState(),
      {
        eventId: "event-1",
        expectedRevision: 4,
        action: "complete",
      },
      1_000,
      {accountability: "sweep", unresolvedCount: 1}
    ),
    (error: unknown) => error instanceof HttpsError &&
      error.code === "failed-precondition" &&
      error.message.includes("finish anyway")
  );

  const acknowledged = resolveEventSuccessLiveAction(
    baseState(),
    {
      eventId: "event-1",
      expectedRevision: 4,
      action: "complete",
      accountabilityAcknowledged: true,
    },
    1_000,
    {accountability: "sweep", unresolvedCount: 1}
  );
  assert.equal(acknowledged.update.status, "complete");
});

test("live writer rejects a stale revision fence", () => {
  assert.throws(
    () => resolveEventSuccessLiveAction(
      baseState(),
      {
        eventId: "event-1",
        expectedRevision: 3,
        action: "setActiveStep",
        activeStepIndex: 1,
      },
      1_000
    ),
    (error: unknown) => error instanceof HttpsError &&
      error.code === "aborted"
  );
});

test("draft preparation retry ceiling is deployment configurable", () => {
  assert.equal(configuredPreparationAttempts(undefined), 3);
  assert.equal(configuredPreparationAttempts("6"), 6);
  assert.equal(configuredPreparationAttempts("0"), 3);
  assert.equal(configuredPreparationAttempts("6-retries"), 3);
  assert.equal(configuredPreparationAttempts("not-a-number"), 3);
});

test("revoked answer blocks publishing a prepared round", async () => {
  const eventId = "event-1";
  const uid = "user-1";
  const featureId = "feature-1";
  const snapshot = {eventId, organizerId: "org-1", uid, featureId,
    formId: "form-1", versionId: "version-1",
    questionId: "question-1", transformVersion: 1,
    responseId: "response-1", consentReceiptId: "receipt-1",
    value: {kind: "category" as const, optionId: "option-1"}};
  const audit = buildAssignmentFeatureAudit({eventId, organizerId: "org-1",
    configHash: "hash-1", snapshots: [snapshot]});
  const rule = {featureId, formId: "form-1", versionId: "version-1",
    questionId: "question-1", transformVersion: 1, kind: "category",
    mode: "preferSimilar", weight: 1, optionIds: ["option-1"]};
  const stamp = {_seconds: 1, _nanoseconds: 0};
  const consentPath = `eventAssignmentFeatureConsents/${
    assignmentFeatureConsentId(eventId, uid, featureId)}`;
  const store = new AudienceTestStore({
    [`events/${eventId}`]: {organizerId: "org-1"},
    "organizers/org-1": {hostUserId: "host-1", hostUserIds: [],
      hostProfiles: []},
    [`eventSuccessPlans/${eventId}`]: {eventId, organizerId: "org-1",
      liveControlRevision: 4, assignmentDraftRevision: 1,
      publishedRotationRoundIndex: -1, assignmentFeatureRules: [rule],
      assignmentFeatureRevision: 1, assignmentFeatureConfigHash: "hash-1"},
    [`eventSuccessAssignmentDrafts/${eventId}_guided_rotations_${uid}`]: {
      eventId, organizerId: "org-1", uid,
      moduleId: "guided_rotations", roundIndex: 0,
      baseAssignmentRevision: 1,
      assignmentFeatureGuard: {revision: 1, configHash: "hash-1",
        snapshots: [snapshot]},
      assignment: {eventId, uid, moduleId: "guided_rotations",
        assignmentFeatureAudit: audit,
        rotationSlots: [], sitOutSlots: []},
    },
    [consentPath]: {eventId, organizerId: "org-1", uid,
      responseId: "response-1", featureId, formId: "form-1",
      versionId: "version-1", questionId: "question-1",
      transformVersion: 1, purpose: "eventAssignmentMatching",
      status: "granted", receiptId: "receipt-1", revision: 1,
      lastRequestId: "request-1", createdAt: stamp, updatedAt: stamp},
    "organizerFormResponses/response-1": {organizerId: "org-1",
      formId: "form-1", versionId: "version-1", status: "submitted",
      respondentUid: uid, identityKind: "phoneVerified",
      withdrawnAt: null, answers: {"question-1": "answer-1"}},
    "organizerFormVersions/version-1": {organizerId: "org-1",
      formId: "form-1", definition: {sections: [{questions: [{
        questionId: "question-1", privacyClass: "organizerCustom",
        kind: "singleChoice", options: [{optionId: "option-1",
          value: "answer-1"}],
      }]}]}},
  });
  const deps = {firestore: () => store.asFirestore(),
    serverTimestamp: () => stamp, nowMillis: () => 1,
    checkRateLimit: async () => {}};
  const request = {auth: {uid: "host-1"}, data: {eventId,
    expectedRevision: 4, roundIndex: 0, confirmed: true}};
  const current = await publishEventSuccessRotationRoundHandler(
    request as never, deps as never);
  assert.equal(current.assignmentCount, 1);
  const published = store.docs[
    `eventSuccessAssignments/${eventId}_guided_rotations_${uid}`];
  assert.deepEqual(published.assignmentFeatureAudit, audit);
  for (const privateValue of ["response-1", "receipt-1", "option-1"]) {
    assert.equal(JSON.stringify(published).includes(privateValue), false);
  }

  // Keep the prepared draft, restore the publish fence, then withdraw.
  store.docs[`eventSuccessPlans/${eventId}`].liveControlRevision = 4;
  store.docs[`eventSuccessPlans/${eventId}`].publishedRotationRoundIndex = -1;
  const assignmentPath =
    `eventSuccessAssignments/${eventId}_guided_rotations_${uid}`;
  delete store.docs[assignmentPath];
  store.docs[consentPath].status = "withdrawn";
  store.docs[consentPath].receiptId = "withdrawal-2";
  await assert.rejects(() => publishEventSuccessRotationRoundHandler(
    request as never, deps as never), (error: unknown) =>
    error instanceof HttpsError && error.code === "aborted");
  assert.equal(store.docs[assignmentPath], undefined);
});
