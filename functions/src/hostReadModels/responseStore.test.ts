import {organizerContactOriginId} from
  "../shared/organizerContactOrigins";
import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import type {CallableRequest} from "firebase-functions/v2/https";
import {AudienceTestStore} from "../organizers/organizerAudienceTestStore";
import {withdrawOrganizerFormResponseHandler} from
  "../organizers/organizerFormResponses";
import {genericFormApplicationId} from
  "../organizers/organizerApplicationAccess";
import {reconcileResponseSummary, reconcileApplicationSummary,
  backfillResponseSummaries, activateResponseSummaries} from "./responseStore";
import {responseSummaryId} from "./responseIds";
const now = Timestamp.fromMillis(1000);
const source = {kind: "native", providerId: null, externalFormId: null,
  externalResponseId: null, importReceiptId: null};
class ResponseTestStore extends AudienceTestStore {
  override snapshot(ref: Parameters<AudienceTestStore["snapshot"]>[0]) {
    const snap = super.snapshot(ref);
    return {...snap, get: (field: string) => snap.data()?.[field]};
  }
}
function store() {
  return new ResponseTestStore({
    "organizers/org": {hostUserId: "host"},
    "organizerForms/form": {organizerId: "org", title: "Survey",
      submittedResponseCount: 1},
    "organizerFormVersions/version": {organizerId: "org", formId: "form",
      version: 1, definition: {sections: []}},
    "organizerFormResponses/response": {
      organizerId: "org", formId: "form", versionId: "version",
      publicFormId: "publicform123456789012", draftId: "draft",
      status: "submitted", identityKind: "catchAccount", respondentUid: "user",
      identity: {displayName: "Private name", phoneE164: "+919999999999",
        email: null, searchName: "private name", origin: "respondentGranted"},
      withdrawalTokenHash: null, answers: {secret: "private-answer"},
      answerSnapshots: [{questionId: "secret", key: "secret", label: "Secret",
        kind: "shortText", answer: "private-answer"}],
      consentVersion: "v1", sourceLinkId: null, completionMillis: 10,
      submittedAt: now, withdrawnAt: null},
  });
}
function app(latestResponseId = "evidence") {
  return {organizerId: "org", formId: "form", formVersionId: "version",
    targetKind: "organizer", targetId: null, linkedUid: "user", contactId: "c",
    applicantDisplayName: "Private name", reviewStatus: "submitted",
    latestResponseId, source, revision: 1, submittedAt: now};
}
function importedApplication(db: AudienceTestStore) {
  const imported = {...source, kind: "tabularImport", importReceiptId: "r1"};
  db.docs["organizerApplications/app"] = {...app(), source: imported};
  db.docs["organizerApplicationResponses/evidence"] = {
    organizerId: "org", applicationId: "app", formId: "form",
    formVersionId: "version", linkedUid: "user", answers: [],
    source: imported, grantId: null};
}

test("withdrawal redacts PII atomically; replay stays redacted",
  async () => {
    const db = store();
    const key = "hostResponseSummaries/" +
      responseSummaryId("response", "response");
    await reconcileResponseSummary(db.asFirestore(), "response", "response");
    assert.equal(JSON.stringify(db.docs[key])
      .includes("private-answer"), false);
    await withdrawOrganizerFormResponseHandler({auth: {uid: "user", token: {}},
      data: {responseId: "response", requestId: "withdraw-summary-test",
        withdrawalToken: null}} as CallableRequest<unknown>, {
      firestore: () => db.asFirestore(), checkRateLimit: async () => undefined,
      timestamp: () => Timestamp.fromMillis(2000),
      storageBucket: (): never => {
        throw new Error("No assets");
      }});
    assert.equal(JSON.stringify(db.docs[key])
      .includes("Private name"), false, "no trigger needed to remove PII");
    await reconcileResponseSummary(db.asFirestore(), "response", "response");
    await reconcileResponseSummary(db.asFirestore(), "response", "response");
    assert.equal(JSON.stringify(db.docs[key]).includes("Private name"), false);
    assert.equal(JSON.stringify(db.docs[key]).includes("+919999999999"), false);
  });

test("converted applications retain one response entry", async () => {
  const db = store();
  const id = genericFormApplicationId("response");
  db.docs[`organizerApplications/${id}`] = {...app("response"),
    source: {...source, externalResponseId: "response"}};
  await backfillResponseSummaries(db.asFirestore(), "org", true);
  assert.equal(await activateResponseSummaries(db.asFirestore(), "org"), 1);
  assert.equal(db.docs["hostDirectorySummaries/org"].responseSummaryVersion, 1);
  assert.equal(Object.keys(db.docs).filter((key) =>
    key.startsWith("hostResponseSummaries/")).length, 1);
  delete db.docs["hostResponseSummaries/" +
    responseSummaryId("response", "response")];
  await assert.rejects(activateResponseSummaries(db.asFirestore(), "org"),
    /parity failed/);
});

test("foreign form metadata never projects into this inbox", async () => {
  const db = store();
  db.docs["organizerFormVersions/version"].organizerId = "other";
  await reconcileResponseSummary(db.asFirestore(), "response", "response");
  assert.equal(Object.keys(db.docs).some((key) =>
    key.startsWith("hostResponseSummaries/")), false);
});


test("application contact metadata follows the current merge origin",
  async () => {
    const db = store(); importedApplication(db);
    const originId = organizerContactOriginId({organizerId: "org",
      sourceKind: "hostForm", sourceEntityKind: "hostApplicationResponse",
      sourceEntityId: "evidence"});
    db.docs[`organizerContactOrigins/${originId}`] = {organizerId: "org",
      currentContactId: "merged-contact"};
    await reconcileApplicationSummary(db.asFirestore(), "app");
    const view = db.docs["hostResponseSummaries/" +
    responseSummaryId("application", "app")].row as {
      application: {contactId: string}};
    assert.equal(view.application.contactId, "merged-contact");
  });
