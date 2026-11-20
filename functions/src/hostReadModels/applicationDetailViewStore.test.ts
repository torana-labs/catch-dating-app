import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import type {CallableRequest} from "firebase-functions/v2/https";
import {genericApplicationSources} from
  "../organizers/genericApplicationFixture";
import {genericFormApplicationId} from
  "../organizers/organizerApplicationAccess";
import {getOrganizerApplicationDetailHandler} from
  "../organizers/organizerApplications";
import {AudienceTestStore} from "../organizers/organizerAudienceTestStore";
import {organizerContactOriginId} from "../shared/organizerContactOrigins";
import {
  applicationIdForOrigin,
  reconcileHostApplicationDetailView,
  reconcileHostApplicationDetailViewsForApplicant,
} from "./applicationDetailViewStore";

const now = Timestamp.fromMillis(1800000000000);
const applicationId = genericFormApplicationId("response-1");
const appPath = `organizerApplications/${applicationId}`;
const viewPath = `hostApplicationDetailViews/${applicationId}`;
const responsePath = "organizerFormResponses/response-1";

const answers = [{questionId: "phone", questionKey: "phone",
  questionLabel: "Phone", questionKind: "phone",
  canonicalFieldId: "phoneNumber", privacyClass: "contact",
  hostPresentation: "detailOnly", value: {valueKind: "text",
    textValue: "+919876543210", numberValue: null, booleanValue: null,
    dateValue: null, optionValues: [], assetIds: []}},
{questionId: "insta", questionKey: "insta", questionLabel: "Instagram",
  questionKind: "shortText", canonicalFieldId: "instagramHandle",
  privacyClass: "contact", hostPresentation: "detailOnly",
  value: {valueKind: "text", textValue: "@synthetic_demo", numberValue: null,
    booleanValue: null, dateValue: null, optionValues: [], assetIds: []}}];

function world() {
  return new AudienceTestStore({
    "organizers/org-1": {ownerUserId: "host-1", hostUserIds: ["host-1"],
      hostProfiles: []},
    [appPath]: {organizerId: "org-1", formId: "form-1",
      formVersionId: "version-1", targetKind: "organizer", targetId: null,
      linkedUid: "user-1", contactId: null, applicantDisplayName: "Ada",
      applicantDisplayNameNormalized: "ada", reviewStatus: "submitted",
      latestResponseId: "response-1", source: {kind: "native",
        providerId: null, externalFormId: null,
        externalResponseId: "response-1", importReceiptId: null},
      assignedReviewerUid: null, reviewNote: null, revision: 1,
      submittedAt: now, updatedAt: now, reviewedAt: null},
    [responsePath]: {organizerId: "org-1", formId: "form-1",
      versionId: "version-1", respondentUid: "user-1", status: "submitted",
      ...genericApplicationSources(answers).response},
    "organizerFormVersions/version-1": {organizerId: "org-1",
      formId: "form-1", definition: {purpose: "application",
        ...genericApplicationSources(answers).version}},
  });
}

const callableDetail = (db: AudienceTestStore) =>
  getOrganizerApplicationDetailHandler({auth: {uid: "host-1"},
    data: {organizerId: "org-1", applicationId}} as CallableRequest<unknown>,
  {firestore: () => db.asFirestore(), timestamp: () => now,
    checkRateLimit: async () => undefined,
    identitySecret: () => "test-secret-".repeat(4)});

test("the view holds exactly the callable's application detail", async () => {
  const db = world();
  await reconcileHostApplicationDetailView(db.asFirestore(), applicationId);
  const detail = await callableDetail(db);
  assert.deepEqual(db.docs[viewPath], {organizerId: "org-1", applicationId,
    detail, version: 1});
  assert.equal(detail.dataAccessState, "submittedFormResponse");
  assert.equal(detail.outreach.phoneE164, "+919876543210");
  assert.equal(detail.outreach.instagramUrl,
    "https://www.instagram.com/synthetic_demo/");
  assert.equal(detail.answers.length, 2);
  assert.deepEqual(detail.communityMembership,
    {uid: "user-1", state: "none", revision: 0});
});

test("a withdrawn response masks the answers, outreach and membership",
  async () => {
    const db = world();
    await reconcileHostApplicationDetailView(db.asFirestore(), applicationId);
    db.docs[responsePath].status = "withdrawn";
    await reconcileHostApplicationDetailView(db.asFirestore(), applicationId);
    const view = db.docs[viewPath] as {detail: {answers: unknown[];
      applicantDisplayName: string; dataAccessState: string;
      outreach: Record<string, unknown>; communityMembership: unknown}};
    assert.deepEqual(view.detail.answers, []);
    assert.equal(view.detail.dataAccessState, "revokedParticipantGrant");
    assert.equal(view.detail.applicantDisplayName, "Withdrawn applicant");
    assert.deepEqual(view.detail.outreach, {phoneE164: null, email: null,
      instagramUrl: null, linkedinUrl: null});
    assert.equal(view.detail.communityMembership, null);
    assert.equal(JSON.stringify(view).includes("+919876543210"), false);
    assert.deepEqual(view.detail, await callableDetail(db));
  });

test("the view follows a merge and goes with its application", async () => {
  const db = world();
  const originId = organizerContactOriginId({organizerId: "org-1",
    sourceKind: "hostForm", sourceEntityKind: "hostFormResponse",
    sourceEntityId: "response-1"});
  const origin = {organizerId: "org-1", sourceKind: "hostForm",
    sourceEntityKind: "hostFormResponse", sourceEntityId: "response-1",
    currentContactId: "contact-2"};
  db.docs[`organizerContactOrigins/${originId}`] = origin;
  assert.equal(await applicationIdForOrigin(db.asFirestore(), origin),
    applicationId);
  await reconcileHostApplicationDetailView(db.asFirestore(), applicationId);
  assert.equal((db.docs[viewPath] as {detail: {contactId: string}})
    .detail.contactId, "contact-2");
  const written = db.docs[viewPath];
  await reconcileHostApplicationDetailViewsForApplicant(db.asFirestore(),
    "org-1", "user-1");
  assert.equal(db.docs[viewPath], written);
  delete db.docs[appPath];
  await reconcileHostApplicationDetailView(db.asFirestore(), applicationId);
  assert.equal(db.docs[viewPath], undefined);
});

test("an imported response's origin names its application", async () => {
  const db = world();
  db.docs["organizerApplicationResponses/imported-1"] = {
    applicationId: "imported-app"};
  assert.equal(await applicationIdForOrigin(db.asFirestore(), {
    sourceKind: "hostForm", sourceEntityKind: "hostApplicationResponse",
    sourceEntityId: "imported-1"}), "imported-app");
  assert.equal(await applicationIdForOrigin(db.asFirestore(), {
    sourceKind: "event", sourceEntityKind: "eventAttendee",
    sourceEntityId: "a1"}), null);
});
