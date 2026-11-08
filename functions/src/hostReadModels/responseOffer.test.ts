import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {AudienceTestStore} from "../organizers/organizerAudienceTestStore";
import {genericFormApplicationId} from
  "../organizers/organizerApplicationAccess";
import {validateHostResponseSummaryDocument} from
  "../shared/generated/validators/hostResponseSummaryDocument";
import {backfillResponseOfferSummaries, reconcileApplicationSummary,
  reconcileResponseSummary} from "./responseStore";
import {responseSummaryId} from "./responseIds";
import {redactResponseSummary} from "./responseRedaction";

const now = Timestamp.fromMillis(1000);
const source = {kind: "native", providerId: null, externalFormId: null,
  externalResponseId: "response", importReceiptId: null};
const applicationId = genericFormApplicationId("response");
const summaryKey = "hostResponseSummaries/" +
  responseSummaryId("response", "response");

class OfferTestStore extends AudienceTestStore {
  override snapshot(ref: Parameters<AudienceTestStore["snapshot"]>[0]) {
    const snap = super.snapshot(ref);
    return {...snap, get: (field: string) => snap.data()?.[field]};
  }
}

function store() {
  return new OfferTestStore({
    "organizers/org": {hostUserId: "host"},
    "organizerForms/form": {organizerId: "org", title: "Supper club",
      submittedResponseCount: 1},
    "organizerFormVersions/version": {organizerId: "org", formId: "form",
      version: 1},
    "organizerFormResponses/response": {
      organizerId: "org", formId: "form", versionId: "version",
      publicFormId: "publicform123456789012", draftId: "draft",
      status: "submitted", identityKind: "catchAccount", respondentUid: "user",
      identity: {displayName: "Asha", phoneE164: null, email: null,
        searchName: "asha", origin: "respondentGranted"},
      withdrawalTokenHash: null, answers: {}, answerSnapshots: [],
      consentVersion: "v1", sourceLinkId: null, completionMillis: 10,
      submittedAt: now, withdrawnAt: null},
    [`organizerApplications/${applicationId}`]: {organizerId: "org",
      formId: "form", formVersionId: "version", targetKind: "organizer",
      targetId: null, linkedUid: "user", contactId: "contact",
      applicantDisplayName: "Asha", reviewStatus: "approved",
      latestResponseId: "response", source, revision: 2, submittedAt: now},
    "organizerApplicationResponses/response": {organizerId: "org",
      applicationId, formId: "form", formVersionId: "version",
      linkedUid: "user", answers: [], source},
  });
}

function offer(status: string, updatedAtMillis: number,
  extra: Record<string, unknown> = {}) {
  return {organizerId: "org", eventId: "supper", contactId: "contact",
    applicationId, sourceKind: "formResponse", status, updatedAtMillis,
    offeredAtMillis: status === "draft" ? null : 5000, ...extra};
}

test("a response summary carries its review status and live offer",
  async () => {
    const db = store();
    await reconcileResponseSummary(db.asFirestore(), "response", "response");
    assert.equal(db.docs[summaryKey].reviewStatus, "approved");
    assert.equal("offer" in db.docs[summaryKey], false);

    db.docs["organizerEventOffers/draft"] = offer("draft", 9000);
    await reconcileApplicationSummary(db.asFirestore(), applicationId);
    assert.equal("offer" in db.docs[summaryKey], false, "a draft is no offer");

    db.docs["organizerEventOffers/offer-1"] = offer("offered", 6000);
    db.docs["organizerEventOffers/foreign"] = offer("offered", 99999,
      {organizerId: "other"});
    await reconcileApplicationSummary(db.asFirestore(), applicationId);
    assert.deepEqual(db.docs[summaryKey].offer,
      {status: "offered", eventId: "supper", offeredAtMillis: 5000});
    assert.equal(validateHostResponseSummaryDocument(db.docs[summaryKey]), true,
      JSON.stringify(validateHostResponseSummaryDocument.errors));

    db.docs["organizerEventOffers/offer-1"] = offer("withdrawn", 7000);
    await reconcileApplicationSummary(db.asFirestore(), applicationId);
    assert.equal(db.docs[summaryKey].offer.status, "withdrawn");

    const redacted = redactResponseSummary(db.docs[summaryKey], "org",
      "response", "response", 8000);
    assert.deepEqual([redacted?.reviewStatus, redacted?.offer?.status],
      ["withdrawn", "withdrawn"]);
  });

test("the offer backfill reconciles every offered application", async () => {
  const db = store();
  db.docs["organizerEventOffers/offer-1"] = offer("offered", 6000);
  assert.deepEqual(
    await backfillResponseOfferSummaries(db.asFirestore(), "org", false),
    {scanned: 1, applications: 1});
  assert.equal(summaryKey in db.docs, false);
  await backfillResponseOfferSummaries(db.asFirestore(), "org", true);
  assert.deepEqual(db.docs[summaryKey]?.offer,
    {status: "offered", eventId: "supper", offeredAtMillis: 5000});
});
