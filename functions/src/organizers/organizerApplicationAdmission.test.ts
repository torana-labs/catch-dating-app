import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {CallableRequest} from "firebase-functions/v2/https";
import type {OrganizerApplicationDocument} from
  "../shared/generated/firestoreAdminTypes";
import {genericApplicationSources} from "./genericApplicationFixture";
import {genericFormApplicationId, organizerApplicationAccess} from
  "./organizerApplicationAccess";
import {getOrganizerApplicationDetailHandler,
  listOrganizerApplicationsHandler, reviewOrganizerApplicationHandler}
  from "./organizerApplications";
import {AudienceTestStore} from "./organizerAudienceTestStore";

const now = Timestamp.fromMillis(1800000000000);
const applicationId = genericFormApplicationId("response-1");
const appPath = `organizerApplications/${applicationId}`;

function harness() {
  const source = {kind: "native", providerId: null, externalFormId: null,
    externalResponseId: "response-1", importReceiptId: null};
  const application = {
    organizerId: "org-1", formId: "form-1", formVersionId: "version-1",
    targetKind: "organizer", targetId: null, linkedUid: "user-1",
    contactId: null,
    applicantDisplayName: "Ada", applicantDisplayNameNormalized: "ada",
    reviewStatus: "submitted", latestResponseId: "response-1", source,
    assignedReviewerUid: null, reviewNote: null, revision: 1,
    submittedAt: now, updatedAt: now, reviewedAt: null,
  } as OrganizerApplicationDocument;
  const answers = [{questionId: "phone", questionKey: "phone",
    questionLabel: "Phone", questionKind: "phone",
    canonicalFieldId: "phoneNumber",
    privacyClass: "contact", hostPresentation: "detailOnly",
    value: {valueKind: "text", textValue: "+919876543210", numberValue: null,
      booleanValue: null, dateValue: null, optionValues: [], assetIds: []}},
  {questionId: "email", questionKey: "email", questionLabel: "Email",
    questionKind: "email", canonicalFieldId: "email", privacyClass: "contact",
    hostPresentation: "detailOnly", value: {valueKind: "text",
      textValue: "ada@example.com", numberValue: null, booleanValue: null,
      dateValue: null, optionValues: [], assetIds: []}}];
  const store = new AudienceTestStore({
    "organizers/org-1": {ownerUserId: "host-1", hostUserIds: ["host-1"],
      hostProfiles: []},
    [appPath]: {...application},
    "organizerFormResponses/response-1": {
      organizerId: "org-1", formId: "form-1", versionId: "version-1",
      respondentUid: "user-1", status: "submitted",
      ...genericApplicationSources(answers).response,
    },
    "organizerFormVersions/version-1": {
      organizerId: "org-1", formId: "form-1",
      definition: {purpose: "application",
        ...genericApplicationSources(answers).version},
    },
  });
  const deps = {firestore: () => store.asFirestore(), timestamp: () => now,
    checkRateLimit: async () => undefined, identitySecret: () =>
      "test-secret-".repeat(4)};
  const request = (data: Record<string, unknown>) => ({
    auth: {uid: "host-1"}, data: {organizerId: "org-1", applicationId, ...data},
  }) as CallableRequest<unknown>;
  const approve = (expectedRevision = 1) => reviewOrganizerApplicationHandler(
    request({expectedRevision, reviewStatus: "approved",
      reviewNote: "Welcome"}),
    deps);
  return {store, deps, request, approve, application};
}

test("generic application access uses the submitted form, without a " +
  "legacy grant",
async () => {
  const h = harness();
  const result = await getOrganizerApplicationDetailHandler(h.request({}),
    h.deps);
  assert.equal(result.dataAccessState, "submittedFormResponse");
  assert.equal(result.answers.length, 2);
  assert.equal(result.sourceResponseId, "response-1");
});

test("approval atomically adds People, provenance and summary; retry is " +
  "idempotent",
async () => {
  const h = harness();
  const result = await h.approve();
  const person = h.store.docs[`organizerContacts/${result.contactId}`];
  assert.equal(h.store.docs[appPath].contactId, result.contactId);
  assert.equal(h.store.docs[appPath].reviewStatus, "approved");
  assert.equal(h.store.docs[appPath].reviewNote, "Welcome");
  assert.equal(person.displayName, "Ada");
  assert.equal(person.linkedUid, null);
  assert.equal(person.identityState, "unlinked");
  assert.equal(person.whatsappStatus, "unknown");
  assert.equal(
    h.store.docs["organizerAudienceSummaries/org-1"].contactCount, 1);
  assert.equal(Object.keys(h.store.docs)
    .filter((p) => p.startsWith("organizerContactOrigins/")).length, 1);
  assert.deepEqual(await h.approve(), result);
  assert.equal(
    h.store.docs["organizerAudienceSummaries/org-1"].contactCount, 1);
  assert.ok(h.store.docs["organizerFormResponses/response-1"]);
});

test("approval reuses a unique active customer without overwriting " +
  "their record",
async () => {
  const h = harness();
  h.store.docs["organizerContacts/existing"] = {
    organizerId: "org-1", phoneE164: "+919876543210",
    email: "ada@example.com",
    displayName: "Host's name", displayNameOverride: null, revision: 9,
    sourceCount: 3, deletedAt: null, hiddenAt: null,
    mergedIntoContactId: null,
  };
  const result = await h.approve();
  assert.equal(result.contactId, "existing");
  assert.equal(h.store.docs["organizerContacts/existing"].displayName,
    "Host's name");
  assert.equal(h.store.docs["organizerContacts/existing"].sourceCount, 4);
  assert.equal(h.store.docs["organizerAudienceSummaries/org-1"], undefined);
});

test("ambiguous endpoints cannot approve or create a partial customer",
  async () => {
    const h = harness();
    for (const [id, phoneE164, email] of [["a", "+919876543210", null],
      ["b", null, "ada@example.com"]]) {
      h.store.docs[`organizerContacts/${id}`] = {organizerId: "org-1",
        phoneE164, email, deletedAt: null, hiddenAt: null,
        mergedIntoContactId: null};
    }
    await assert.rejects(h.approve(), {code: "failed-precondition"});
    assert.equal(h.store.docs[appPath].reviewStatus, "submitted");
    assert.equal(Object.keys(h.store.docs)
      .filter((p) => p.startsWith("organizerContactOrigins/")).length, 0);
  });

for (const invalid of ["withdrawn", "foreign-form", "foreign-response",
  "foreign-respondent", "missing-response", "wrong-version"]) {
  test(`${invalid} source evidence is redacted and cannot be accepted`,
    async () => {
      const h = harness();
      const response = h.store.docs["organizerFormResponses/response-1"];
      if (invalid === "withdrawn") response.status = "withdrawn";
      if (invalid === "foreign-form") {
        h.store.docs["organizerFormVersions/version-1"].organizerId =
          "other-org";
      }
      if (invalid === "foreign-response") response.organizerId = "other-org";
      if (invalid === "foreign-respondent") {
        response.respondentUid = "other-user";
      }
      if (invalid === "missing-response") {
        delete h.store.docs["organizerFormResponses/response-1"];
      }
      if (invalid === "wrong-version") response.versionId = "other-version";
      const result = await getOrganizerApplicationDetailHandler(h.request({}),
        h.deps);
      assert.deepEqual(result.answers, []);
      assert.equal(result.applicantDisplayName, "Withdrawn applicant");
      await assert.rejects(h.approve(), {code: "failed-precondition"});
      assert.equal(h.store.docs[appPath].contactId, null);
    });
}

test("stale review and foreign organizer cannot mutate the application",
  async () => {
    const h = harness();
    await assert.rejects(h.approve(99), {code: "aborted"});
    h.store.docs[appPath].organizerId = "other-org";
    await assert.rejects(h.approve(), {code: "not-found"});
    assert.equal(h.store.docs[appPath].reviewStatus, "submitted");
  });

test("legacy native applications still need their exact participant grant",
  async () => {
    const h = harness();
    const app = {...h.application, latestResponseId: "legacy-response"};
    h.store.docs["organizerApplicationResponses/legacy-response"] = {
      ...h.store.docs["organizerApplicationResponses/response-1"],
      applicationId: "legacy-app",
    };
    const access = await organizerApplicationAccess({db: h.store.asFirestore(),
      applicationId: "legacy-app", application: app});
    assert.equal(access.accessState, "revokedParticipantGrant");
    assert.deepEqual(access.answers, []);
  });


test("approval rejects a customer linked to a different participant",
  async () => {
    const h = harness();
    h.store.docs["organizerContacts/other-account"] = {
      organizerId: "org-1", phoneE164: "+919876543210", email: null,
      linkedUid: "another-user", deletedAt: null, hiddenAt: null,
      mergedIntoContactId: null,
    };
    await assert.rejects(h.approve(), {code: "failed-precondition"});
    assert.equal(h.store.docs[appPath].reviewStatus, "submitted");
  });

test("application detail and person queue follow a merged source origin",
  async () => {
    const h = harness();
    const accepted = await h.approve();
    const origin = Object.values(h.store.docs).find((doc) =>
      doc.sourceEntityId === "response-1")!;
    origin.currentContactId = "survivor";
    h.store.docs["organizerContacts/survivor"] = {
      ...h.store.docs[`organizerContacts/${accepted.contactId}`],
    };
    const detail = await getOrganizerApplicationDetailHandler(h.request({}),
      h.deps);
    assert.equal(detail.contactId, "survivor");
    const listed = await listOrganizerApplicationsHandler(
      {auth: {uid: "host-1"}, data: {organizerId: "org-1",
        contactId: "survivor"}} as CallableRequest<unknown>, h.deps);
    assert.equal(listed.applications[0].contactId, "survivor");
    assert.equal(h.store.docs[appPath].contactId, accepted.contactId);
  });

test("application paging refuses changed filters or review state", async () => {
  const h = harness();
  h.store.docs["organizerApplications/second"] = {...h.application};
  const list = (extra = {}) => listOrganizerApplicationsHandler(
    {auth: {uid: "host-1"}, data: {organizerId: "org-1", limit: 1,
      ...extra}} as CallableRequest<unknown>, h.deps);
  const first = await list();
  assert.ok(first.nextCursor);
  const second = await list({cursor: first.nextCursor});
  assert.notEqual(first.applications[0].applicationId,
    second.applications[0].applicationId);
  await assert.rejects(list({cursor: first.nextCursor, formId: "other-form"}),
    {code: "invalid-argument"});
  h.store.docs[appPath].revision = 2;
  await assert.rejects(list({cursor: first.nextCursor}),
    {code: "invalid-argument"});
});


test("customer queue includes verified-account applications before admission",
  async () => {
    const h = harness();
    h.store.docs["organizerContacts/customer-1"] = {
      organizerId: "org-1", identityState: "verified", linkedUid: "user-1",
      deletedAt: null, hiddenAt: null,
    };
    const list = () => listOrganizerApplicationsHandler(
      {auth: {uid: "host-1"}, data: {organizerId: "org-1",
        contactId: "customer-1"}} as CallableRequest<unknown>, h.deps);
    const result = await list();
    assert.equal(result.applications.length, 1);
    assert.equal(result.applications[0].applicationId, applicationId);
    assert.equal(result.applications[0].contactId, null);
    h.store.docs["organizerContacts/customer-1"].identityState = "ambiguous";
    assert.equal((await list()).applications.length, 0);
  });


test("review contact actions use authorized identity endpoints before approval",
  async () => {
    const h = harness();
    Object.assign(h.store.docs["organizerFormResponses/response-1"],
      genericApplicationSources([]).response);
    h.store.docs["organizerFormResponses/response-1"].identity = {
      phoneE164: "+919876543210", email: "ADA@example.com",
    };
    const detail = await getOrganizerApplicationDetailHandler(h.request({}),
      h.deps);
    assert.equal(detail.outreach.phoneE164, "+919876543210");
    assert.equal(detail.outreach.email, "ada@example.com");
    assert.equal(detail.contactId, null);
    h.store.docs["organizerFormResponses/response-1"].status = "withdrawn";
    const withdrawn = await getOrganizerApplicationDetailHandler(h.request({}),
      h.deps);
    assert.equal(withdrawn.outreach.phoneE164, null);
    assert.equal(withdrawn.outreach.email, null);
  });

test("approval occurrence survives note edits and changes on reapproval",
  async () => {
    const h = harness();
    await h.approve();
    const basis = h.store.docs[appPath].approvalNotificationBasis;
    assert.deepEqual(basis, {revision: 2, approvedAtMillis: now.toMillis()});
    await reviewOrganizerApplicationHandler(h.request({expectedRevision: 2,
      reviewStatus: "approved", reviewNote: "Updated note"}), h.deps);
    assert.deepEqual(h.store.docs[appPath].approvalNotificationBasis, basis);
    await reviewOrganizerApplicationHandler(h.request({expectedRevision: 3,
      reviewStatus: "declined", reviewNote: null}), h.deps);
    await h.approve(4);
    assert.deepEqual(h.store.docs[appPath].approvalNotificationBasis,
      {revision: 5, approvedAtMillis: now.toMillis()});
  });
