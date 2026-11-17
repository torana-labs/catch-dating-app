import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import type {CallableRequest} from "firebase-functions/v2/https";
import {createFormPaymentFixture} from
  "../payments/formPayments/formPaymentTestStore";
import {claimParticipantFormProfileHandler as claim,
  getParticipantFormProfileHandler as review} from "./claimFormProfile";
import {listParticipantFormProfilesHandler as list} from "./listFormProfiles";
import {reconcileParticipantFormProfileView,
  reconcileParticipantIntakeProfileView, responseWriteChangesReview} from
  "./participantFormProfileViewStore";
import {contractValidator} from "../shared/contractTestValidators";

const validView = contractValidator("ParticipantFormProfileViewDocument");
const validIntakeView =
  contractValidator("ParticipantIntakeProfileViewDocument");
const now = Timestamp.fromDate(new Date("2026-09-23T12:00:00Z"));

async function fixture() {
  const h = createFormPaymentFixture();
  const questions = h.version.definition.sections[0].questions;
  questions[0].answerDestination = "catchProfile";
  questions.push({...questions[0], questionId: "cocktail", key: "cocktail",
    required: false, canonicalFieldId: null,
    answerDestination: "organizerCard",
    answerAudience: {mode: "eventMembersWithConsent" as const,
      eventProfileSlot: "customRow" as const}});
  h.version.definition.eventProfile = {enabled: true,
    allowedSlots: ["customRow"], maxCustomRows: 1,
    noticeVersion: "event-profile-sharing-v2"};
  questions.push({...questions[0], questionId: "crm", key: "crm",
    required: false, canonicalFieldId: null,
    answerDestination: "organizerOnly"});
  h.draft.answers = {name: "Sara Demo", cocktail: "Tequila", crm: "Private"};
  h.store.records.set("organizerFormResponseDrafts/draft", {...h.draft});
  const {paymentId} = await h.reserve();
  h.capture(paymentId);
  await h.finalize(paymentId);
  const responseId = [...h.store.records.keys()].find((path) =>
    path.startsWith("participantFormProfileProposals/"))!.split("/")[1];
  const auth = {uid: "person", token: {phone_number: "+919000000001"}};
  const call = (data: unknown) =>
    ({auth, data} as unknown as CallableRequest<unknown>);
  const deps = {db: () => h.db, now: () => now,
    rateLimit: async () => undefined, copyPhoto: async () => {
      throw new Error("No photo in this fixture");
    }};
  const view = () => h.store.records.get(
    `participantFormProfileViews/${responseId}`);
  const intakeView = () => h.store.records.get(
    "participantIntakeProfileViews/person");
  const reconcile = async () => {
    await reconcileParticipantFormProfileView(h.db, responseId);
    await reconcileParticipantIntakeProfileView(h.db, "person");
  };
  /** The parts of the callables' answers the views must reproduce. */
  const expected = async () => {
    const reviewed = await review(call({responseId}), deps);
    const page = await list(call({cursor: null, limit: 20}), deps);
    return {reviewed, item: page.items.find((row) =>
      row.responseId === responseId)};
  };
  return {...h, responseId, call, deps, view, intakeView, reconcile,
    expected};
}

type Fixture = Awaited<ReturnType<typeof fixture>>;

async function assertMatchesCallables(h: Fixture) {
  await h.reconcile();
  const {reviewed, item} = await h.expected();
  const row = h.view();
  assert.equal(validView(row), true);
  assert.deepEqual(row, {uid: "person", organizerId: reviewed.organizerId,
    formId: reviewed.formId, formTitle: reviewed.formTitle,
    submittedAtMillis: reviewed.submittedAtMillis,
    claimedAtMillis: reviewed.claimedAtMillis, fields: reviewed.fields,
    selectedCardQuestionIds: reviewed.selectedCardQuestionIds,
    cardRevision: reviewed.cardRevision, termsVersion: reviewed.termsVersion,
    version: 1});
  assert.deepEqual({organizerId: item?.organizerId,
    formTitle: item?.formTitle, submittedAtMillis: item?.submittedAtMillis,
    claimedAtMillis: item?.claimedAtMillis,
    cardFieldCount: item?.cardFieldCount}, {
    organizerId: row!.organizerId, formTitle: row!.formTitle,
    submittedAtMillis: row!.submittedAtMillis,
    claimedAtMillis: row!.claimedAtMillis,
    cardFieldCount: (row!.selectedCardQuestionIds as string[]).length});
  const intake = h.intakeView();
  assert.equal(intake?.intakeRevision ?? 0, reviewed.intakeRevision);
  assert.equal(intake?.linkedinUrl ?? null, reviewed.currentLinkedinUrl);
  if (intake) assert.equal(validIntakeView(intake), true);
}

test("each row holds exactly what the review and list callables return",
  async () => {
    const h = await fixture();
    await assertMatchesCallables(h);
    const row = h.view()!;
    assert.equal(row.claimedAtMillis, null);
    assert.deepEqual(row.selectedCardQuestionIds, []);
    assert.equal(JSON.stringify(row).includes("Private"), false);
    assert.deepEqual((row.fields as Array<{questionId: string;
      eventProfileEligible: boolean}>).map((field) =>
      [field.questionId, field.eventProfileEligible]),
    [["name", false], ["cocktail", true]]);
  });

test("a claim moves the row's claim date, card choice and intake revision",
  async () => {
    const h = await fixture();
    h.store.records.set("participantIntakeProfiles/person", {
      fields: [{canonicalFieldId: "linkedinUrl", value: {valueKind: "text",
        textValue: "https://www.linkedin.com/in/sara", numberValue: null,
        booleanValue: null, dateValue: null, optionValues: [], assetIds: []},
      sourceApplicationId: null, reviewedByParticipantAt: now,
      updatedAt: now}], revision: 3, createdAt: now, updatedAt: now});
    await assertMatchesCallables(h);
    assert.deepEqual(h.intakeView(), {uid: "person", intakeRevision: 3,
      linkedinUrl: "https://www.linkedin.com/in/sara", version: 1});
    await claim(h.call({responseId: h.responseId, expectedProfileRevision: 0,
      expectedIntakeRevision: 3, requestId: "claim-request-00000001",
      termsVersion: "form-profile-claim-v1",
      profile: {displayName: "Sara Demo", dateOfBirth: "1994-06-15",
        gender: "woman"},
      selectedQuestionIds: ["name", "cocktail"]}), h.deps);
    await assertMatchesCallables(h);
    assert.equal(h.view()!.claimedAtMillis, now.toMillis());
    assert.deepEqual(h.view()!.selectedCardQuestionIds, ["cocktail"]);
    assert.equal(h.view()!.cardRevision, 1);
  });

test("withdrawal and account deletion remove the rows", async () => {
  const h = await fixture();
  h.store.records.set("participantIntakeProfiles/person", {fields: [],
    revision: 1, createdAt: now, updatedAt: now});
  await h.reconcile();
  assert.ok(h.view());
  assert.ok(h.intakeView());
  const responsePath = `organizerFormResponses/${h.responseId}`;
  const response = h.store.records.get(responsePath)!;
  h.store.records.set(responsePath, {...response, status: "withdrawn",
    withdrawnAt: now});
  await h.reconcile();
  assert.equal(h.view(), undefined);
  await assert.rejects(review(h.call({responseId: h.responseId}), h.deps),
    /unavailable/u);
  h.store.records.set(responsePath, response);
  await h.reconcile();
  assert.ok(h.view());
  h.store.records.set("deletedUsers/person", {status: "processing"});
  await h.reconcile();
  assert.equal(h.view(), undefined);
  assert.equal(h.intakeView(), undefined);
});

test("no proposal or intake profile means no row", async () => {
  const h = createFormPaymentFixture();
  await reconcileParticipantFormProfileView(h.db, "missing");
  await reconcileParticipantIntakeProfileView(h.db, "nobody");
  assert.equal(h.store.records.has("participantFormProfileViews/missing"),
    false);
  assert.equal(h.store.records.has("participantIntakeProfileViews/nobody"),
    false);
});

test("a proposal that fails its contract keeps the previous row",
  async () => {
    const h = await fixture();
    await h.reconcile();
    const before = h.view();
    const path = `participantFormProfileProposals/${h.responseId}`;
    h.store.records.set(path, {...h.store.records.get(path)!,
      fields: "broken"});
    await reconcileParticipantFormProfileView(h.db, h.responseId);
    assert.deepEqual(h.view(), before);
  });

test("only response writes the review reads reconcile the row", () => {
  const response = {status: "submitted", withdrawnAt: null,
    respondentUid: "person", answers: {name: "Sara"}, reviewNote: "a"};
  assert.equal(responseWriteChangesReview(undefined, response), true);
  assert.equal(responseWriteChangesReview(response, undefined), true);
  assert.equal(responseWriteChangesReview(response,
    {...response, reviewNote: "b"}), false);
  assert.equal(responseWriteChangesReview(response,
    {...response, status: "withdrawn"}), true);
  assert.equal(responseWriteChangesReview(response,
    {...response, answers: {name: "Sara"}}), false);
});
