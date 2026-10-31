import assert from "node:assert/strict";
import test from "node:test";
import {HttpsError} from "firebase-functions/v2/https";
import {validatePreviewEventAssignmentFeaturesCallableResponse} from
  "../shared/generated/validators/previewEventAssignmentFeaturesOutput";
import {AudienceTestStore} from
  "../organizers/organizerAudienceTestStore";
import {assignmentFeatureConsentId} from
  "./assignmentFeatureConsent";
import {configureEventAssignmentFeaturesHandler,
  listEventAssignmentFeatureChoicesHandler,
  previewEventAssignmentFeaturesHandler,
  setEventAssignmentFeatureConsentHandler} from
  "./assignmentFeatureActions";

const stamp = {_seconds: 1, _nanoseconds: 0};
const rule = {featureId: "feature-1", formId: "form-1",
  versionId: "version-1", questionId: "question-1",
  transformVersion: 1, kind: "category", mode: "preferSimilar",
  weight: 5, optionIds: ["option-1"]};

function fixture() {
  const store = new AudienceTestStore({
    "events/event-1": {organizerId: "org-1", status: "active"},
    "organizers/org-1": {hostUserId: "host-1", hostUserIds: [],
      hostProfiles: []},
    "eventSuccessPlans/event-1": {eventId: "event-1", organizerId: "org-1",
      status: "setup", structureConfig: {topology: "set"}},
    "organizerFormVersions/version-1": {organizerId: "org-1",
      formId: "form-1", publishedAt: stamp,
      definition: {sections: [{questions: [{questionId: "question-1",
        label: "Favorite activity",
        privacyClass: "organizerCustom", kind: "singleChoice",
        options: [{optionId: "option-1", label: "Hiking",
          value: "answer-1"}]}, {questionId: "question-2",
        label: "Pace", privacyClass: "organizerCustom", kind: "number",
        validation: {minNumber: 0, maxNumber: 100}, options: []}]}]}},
    "organizerForms/form-1": {organizerId: "org-1",
      title: "Event choices", activeVersionId: "version-1"},
    "eventParticipations/event-1_user-1": {eventId: "event-1",
      uid: "user-1", status: "signedUp"},
    "organizerFormResponses/response-1": {organizerId: "org-1",
      formId: "form-1", versionId: "version-1", status: "submitted",
      respondentUid: "user-1", identityKind: "phoneVerified",
      identity: {phoneE164: "+919900001111"}, withdrawnAt: null,
      submittedAt: stamp,
      answers: {"question-1": "answer-1", "question-2": 99}},
  });
  const docs = store.docs as Record<string,
    Record<string, unknown> | undefined>;
  const deps = {db: () => store.asFirestore(), now: () => stamp,
    rateLimit: async () => {}};
  return {store, docs, deps};
}

test("Host mapping does not grant use; verified owner can grant and revoke",
  async () => {
    const {docs, deps} = fixture();
    const host = {auth: {uid: "host-1"}, data: {eventId: "event-1",
      expectedRevision: 0, requestId: "config-1", rules: [rule]}};
    const configured = await configureEventAssignmentFeaturesHandler(
      host as never, deps as never);
    assert.equal(configured.revision, 1);
    assert.equal((await configureEventAssignmentFeaturesHandler(
      host as never, deps as never)).replayed, true);
    const consentPath = `eventAssignmentFeatureConsents/${
      assignmentFeatureConsentId("event-1", "user-1", "feature-1")}`;
    assert.equal(Object.hasOwn(docs, consentPath), false);

    const grant = {auth: {uid: "user-1",
      token: {phone_number: "+919900001111"}},
    data: {eventId: "event-1", featureId: "feature-1",
      responseId: "response-1", decision: "grant",
      expectedRevision: 0, requestId: "grant-1"}};
    const granted = await setEventAssignmentFeatureConsentHandler(
      grant as never, deps as never);
    assert.equal(granted.status, "granted");
    assert.equal((await setEventAssignmentFeatureConsentHandler(
      grant as never, deps as never)).replayed, true);
    assert.equal(docs[consentPath]?.purpose,
      "eventAssignmentMatching");

    const withdraw = {auth: {uid: "user-1", token: {}},
      data: {...grant.data, decision: "withdraw", expectedRevision: 1,
        requestId: "withdraw-1"}};
    const withdrawn = await setEventAssignmentFeatureConsentHandler(
      withdraw as never, deps as never);
    assert.equal(withdrawn.status, "withdrawn");
    assert.equal(docs[consentPath]?.status, "withdrawn");
  });

test("mismatched endpoint cannot grant matching answer use", async () => {
  const {docs, deps} = fixture();
  docs["eventSuccessPlans/event-1"]!.assignmentFeatureRules = [rule];
  const request = {auth: {uid: "user-1",
    token: {phone_number: "+919900002222"}},
  data: {eventId: "event-1", featureId: "feature-1",
    responseId: "response-1", decision: "grant",
    expectedRevision: 0, requestId: "grant-1"}};
  await assert.rejects(() => setEventAssignmentFeatureConsentHandler(
    request as never, deps as never), (error: unknown) =>
    error instanceof HttpsError && error.code === "permission-denied");
  assert.equal(docs[`eventAssignmentFeatureConsents/${
    assignmentFeatureConsentId("event-1", "user-1", "feature-1")}`],
  undefined);
});

test("preview uses exact published catalog and returns aggregate coverage",
  async () => {
    const {docs, deps} = fixture();
    const request = {auth: {uid: "host-1"},
      data: {eventId: "event-1", sourceFormIds: ["form-1"],
        rules: [rule]}};
    const before = await previewEventAssignmentFeaturesHandler(
      request as never, deps as never);
    assert.equal(validatePreviewEventAssignmentFeaturesCallableResponse(
      before), true);
    assert.equal(before.rosterCount, 1);
    assert.deepEqual(before.rows[0], {featureId: "feature-1",
      kind: "category", mode: "preferSimilar", weight: 5,
      grantedCount: 0, usableCount: 0, missingCount: 1});
    assert.equal(before.sources[0].versionId, "version-1");
    assert.deepEqual(before.sources[0].questions[0].options,
      [{optionId: "option-1", label: "Hiking"}]);
    assert.equal(JSON.stringify(before).includes("answer-1"), false);

    const consentPath = `eventAssignmentFeatureConsents/${
      assignmentFeatureConsentId("event-1", "user-1", "feature-1")}`;
    docs[consentPath] = {eventId: "event-1", organizerId: "org-1",
      uid: "user-1", responseId: "response-1", featureId: "feature-1",
      formId: "form-1", versionId: "version-1",
      questionId: "question-1", transformVersion: 1,
      purpose: "eventAssignmentMatching", status: "granted",
      receiptId: "receipt-1", revision: 1, lastRequestId: "grant-1",
      createdAt: stamp, updatedAt: stamp};
    const after = await previewEventAssignmentFeaturesHandler(
      request as never, deps as never);
    assert.equal(after.rows[0].grantedCount, 1);
    assert.equal(after.rows[0].usableCount, 1);
    assert.equal(after.rows[0].missingCount, 0);
    assert.equal(JSON.stringify(after).includes("answer-1"), false);
    assert.equal(JSON.stringify(after).includes("user-1"), false);
  });

test("out-of-range number is granted but missing from usable coverage",
  async () => {
    const {docs, deps} = fixture();
    const numericRule = {featureId: "feature-2", formId: "form-1",
      versionId: "version-1", questionId: "question-2",
      transformVersion: 1, kind: "number", mode: "preferSimilar",
      weight: 1, minimum: 0, maximum: 10};
    docs[`eventAssignmentFeatureConsents/${assignmentFeatureConsentId(
      "event-1", "user-1", "feature-2")}`] = {eventId: "event-1",
      organizerId: "org-1", uid: "user-1", responseId: "response-1",
      featureId: "feature-2", formId: "form-1", versionId: "version-1",
      questionId: "question-2", transformVersion: 1,
      purpose: "eventAssignmentMatching", status: "granted",
      receiptId: "receipt-2", revision: 1, lastRequestId: "grant-2",
      createdAt: stamp, updatedAt: stamp};
    const preview = await previewEventAssignmentFeaturesHandler({
      auth: {uid: "host-1"}, data: {eventId: "event-1",
        sourceFormIds: ["form-1"], rules: [numericRule]},
    } as never, deps as never);
    assert.deepEqual(preview.rows[0], {featureId: "feature-2",
      kind: "number", mode: "preferSimilar", weight: 1,
      grantedCount: 1, usableCount: 0, missingCount: 1});
    const question = preview.sources[0].questions.find((item) =>
      item.questionId === "question-2");
    assert.equal(question?.minNumber, 0);
    assert.equal(question?.maxNumber, 100);
  });

test("preview caps roster query before loading profile or answer documents",
  async () => {
    const {docs, deps} = fixture();
    for (let i = 0; i < 1001; i++) {
      docs[`eventParticipations/event-1_extra-${i}`] = {
        eventId: "event-1", uid: `extra-${i}`, status: "signedUp"};
    }
    await assert.rejects(() => previewEventAssignmentFeaturesHandler({
      auth: {uid: "host-1"}, data: {eventId: "event-1", rules: []},
    } as never, deps as never), (error: unknown) =>
      error instanceof HttpsError &&
      error.code === "failed-precondition" &&
      error.message.includes("cohort"));
  });

test("participant can find own answer and old grant after mapping removal",
  async () => {
    const {docs, deps} = fixture();
    docs["eventSuccessPlans/event-1"]!.assignmentFeatureRules = [rule];
    const request = {auth: {uid: "user-1",
      token: {phone_number: "+919900001111"}},
    data: {eventId: "event-1"}};
    const offered = await listEventAssignmentFeatureChoicesHandler(
      request as never, deps as never);
    assert.deepEqual(offered.choices, [{featureId: "feature-1",
      responseId: "response-1", questionLabel: "Favorite activity",
      answerLabel: "Hiking", status: "notGranted", revision: 0,
      canGrant: true}]);
    const consentPath = `eventAssignmentFeatureConsents/${
      assignmentFeatureConsentId("event-1", "user-1", "feature-1")}`;
    docs[consentPath] = {eventId: "event-1", organizerId: "org-1",
      uid: "user-1", responseId: "response-1", featureId: "feature-1",
      formId: "form-1", versionId: "version-1",
      questionId: "question-1", transformVersion: 1,
      purpose: "eventAssignmentMatching", status: "granted",
      receiptId: "receipt-1", revision: 1, lastRequestId: "grant-1",
      createdAt: stamp, updatedAt: stamp};
    docs["eventSuccessPlans/event-1"]!.assignmentFeatureRules = [];
    const retained = await listEventAssignmentFeatureChoicesHandler(
      {auth: {uid: "user-1", token: {}},
        data: {eventId: "event-1"}} as never, deps as never);
    assert.deepEqual(retained.choices, [{featureId: "feature-1",
      responseId: "response-1", questionLabel: null,
      answerLabel: null, status: "granted", revision: 1,
      canGrant: false}]);
    const withdrawn = await setEventAssignmentFeatureConsentHandler({
      auth: {uid: "user-1", token: {}}, data: {eventId: "event-1",
        featureId: "feature-1", responseId: "response-1",
        decision: "withdraw", expectedRevision: 1,
        requestId: "withdraw-after-removal"},
    } as never, deps as never);
    assert.equal(withdrawn.status, "withdrawn");
  });
