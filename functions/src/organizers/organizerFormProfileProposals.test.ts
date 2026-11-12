import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {createFormPaymentFixture} from
  "../payments/formPayments/formPaymentTestStore";
import {prepareFormProfileProposal, readParticipantFormProfileProposal} from
  "./organizerFormProfileProposals";
import {submitOrganizerFormResponseHandler, organizerFormResponseReceipt} from
  "./organizerFormResponses";
import {projectFormPayment} from
  "../payments/formPayments/formPaymentProjection";
import type {OrganizerFormPaymentDocument as Payment,
  OrganizerFormResponseDocument as Response} from
  "../shared/generated/firestoreAdminTypes";
import {validateOrganizerFormDefinition} from "./organizerForms";

function fixture() {
  const h = createFormPaymentFixture();
  const questions = h.version.definition.sections[0].questions;
  questions[0].answerDestination = "catchProfile";
  const extra = (id: string) => ({...questions[0], questionId: id, key: id,
    required: false, label: id});
  questions.push({...extra("cocktail"), canonicalFieldId: null,
    answerDestination: "organizerCard"});
  questions.push({...extra("customName"), canonicalFieldId: "givenName",
    answerDestination: "organizerOnly"});
  questions.push({...extra("emptyCard"), canonicalFieldId: null,
    answerDestination: "organizerCard"});
  h.draft.answers = {name: "Sara Demo", cocktail: "Tequila",
    customName: "CRM-only name", emptyCard: ""};
  h.store.records.set("organizerFormResponseDrafts/draft", {...h.draft});
  const proposals = () => [...h.store.records.entries()]
    .filter(([path]) => path.startsWith("participantFormProfileProposals/"));
  return {...h, proposals};
}

test("capture prepares only explicit nonempty profile/card pointers once",
  async () => {
    const h = fixture();
    const {paymentId} = await h.reserve();
    assert.equal(h.proposals().length, 0);
    h.capture(paymentId);
    await Promise.all([h.finalize(paymentId), h.finalize(paymentId)]);
    const rows = h.proposals();
    assert.equal(rows.length, 1);
    const proposal = rows[0][1];
    assert.equal(proposal.uid, "person");
    assert.equal(proposal.organizerId, "org");
    assert.deepEqual(proposal.fields, [
      {questionId: "name", destination: "catchProfile",
        canonicalFieldId: "displayName"},
      {questionId: "cocktail", destination: "organizerCard",
        canonicalFieldId: null},
    ]);
    assert.equal(proposal.responseId, rows[0][0].split("/")[1]);
    assert.equal(proposal.claimedAt, undefined);
    assert.equal(JSON.stringify(proposal).includes("Tequila"), false);
    assert.equal([...h.store.records.keys()].some((path) =>
      /^(users|publicProfiles|participantIntakeProfiles|eventRooms)\//u
        .test(path)), false);
  });

test("free forms prepare the same private proposal in their submit transaction",
  async () => {
    const h = fixture();
    h.version.definition.payment = null;
    const result = await submitOrganizerFormResponseHandler(h.request, {
      firestore: () => h.db, timestamp: () => Timestamp.fromMillis(1000),
      checkRateLimit: async () => undefined,
      storageBucket: () => {
        throw new Error("No upload");
      },
    });
    assert.equal(result.profileReviewAvailable, true);
    assert.equal(h.proposals()[0][1].responseId, result.responseId);
    assert.equal(h.proposals().length, 1);
  });

test("legacy canonical labels and organizer-only answers prepare nothing",
  async () => {
    const h = createFormPaymentFixture();
    const {paymentId} = await h.reserve();
    h.capture(paymentId);
    await h.finalize(paymentId);
    assert.equal([...h.store.records.keys()].some((path) =>
      path.startsWith("participantFormProfileProposals/")), false);
  });

test("hidden answers are not read from the editable draft", async () => {
  const h = fixture();
  await h.db.runTransaction(async (tx) => {
    const write = await prepareFormProfileProposal({tx, db: h.db,
      draft: h.draft, definition: h.version.definition,
      answers: {name: "Sara Demo"}, responseId: "response",
      now: Timestamp.fromMillis(1000)});
    write();
  });
  assert.deepEqual(h.proposals()[0][1].fields, [
    {questionId: "name", destination: "catchProfile",
      canonicalFieldId: "displayName"},
  ]);
});

test("unverified identity and missing disclosure cannot prepare a profile",
  async () => {
    for (const patch of [{identityKind: "emailVerified" as const},
      {respondentUid: null}, {consentAccepted: false},
      {consentVersion: "older"}]) {
      const h = fixture();
      await assert.rejects(h.db.runTransaction(async (tx) => {
        const write = await prepareFormProfileProposal({tx, db: h.db,
          draft: {...h.draft, ...patch}, definition: h.version.definition,
          answers: h.draft.answers, responseId: "response",
          now: Timestamp.fromMillis(1000)});
        write();
      }), /verified phone/u);
      assert.equal(h.proposals().length, 0);
    }
  });

test("deleted identity cannot be scaffolded by delayed payment", async () => {
  const h = fixture();
  const {paymentId} = await h.reserve();
  h.store.records.set("deletedUsers/person", {status: "processing"});
  h.capture(paymentId);
  await h.finalize(paymentId);
  assert.equal(h.proposals().length, 0);
});

test("profile proposal is atomic with submission on commit failure",
  async () => {
    const h = fixture();
    const {paymentId} = await h.reserve();
    h.capture(paymentId);
    h.store.failNextCommit = true;
    await assert.rejects(h.finalize(paymentId));
    assert.equal(h.proposals().length, 0);
    assert.equal(h.store.records.get("organizerForms/form")!
      .submittedResponseCount, 0);
    assert.equal(await h.finalize(paymentId), "submitted");
    assert.equal(h.proposals().length, 1);
  });

test("duplicate core field assignments and oversized card sets cannot publish",
  () => {
    const h = fixture();
    const questions = h.version.definition.sections[0].questions;
    questions.push({...questions[0], questionId: "anotherName",
      key: "anotherName"});
    assert.ok(validateOrganizerFormDefinition(h.version.definition)
      .some((issue) => issue.code === "duplicateProfileField"));
    for (let i = 0; i < 101; i++) {
      questions.push({...questions[1], questionId: `card${i}`,
        key: `card${i}`});
    }
    assert.ok(validateOrganizerFormDefinition(h.version.definition)
      .some((issue) => issue.code === "tooManyProfileFields"));
  });

test("owner review returns only designated answers, never CRM or contact data",
  async () => {
    const h = fixture();
    const {paymentId} = await h.reserve();
    h.capture(paymentId);
    await h.finalize(paymentId);
    const responseId = h.proposals()[0][1].responseId as string;
    const result = await readParticipantFormProfileProposal({db: h.db,
      uid: "person", responseId});
    assert.deepEqual(result.fields.map((field) => field.value),
      ["Sara Demo", "Tequila"]);
    assert.equal(JSON.stringify(result).includes("CRM-only name"), false);
    assert.equal("identity" in result, false);
    assert.equal("answers" in result, false);
    for (const uid of ["host", "other-person", "other-organizer"]) {
      await assert.rejects(readParticipantFormProfileProposal({db: h.db,
        uid, responseId}), /unavailable/u);
    }
  });

test("withdrawn, foreign, mismatched and deleted sources cannot be reviewed",
  async () => {
    for (const patch of [
      {status: "withdrawn", withdrawnAt: Timestamp.fromMillis(2000)},
      {respondentUid: "someone-else"}, {organizerId: "foreign"},
      {versionId: "different"}, {formId: "different"},
      {identityKind: "emailVerified"}, {consentVersion: "outdated"},
    ]) {
      const h = fixture();
      const {paymentId} = await h.reserve();
      h.capture(paymentId);
      await h.finalize(paymentId);
      const responseId = h.proposals()[0][1].responseId as string;
      const path = `organizerFormResponses/${responseId}`;
      h.store.records.set(path, {...h.store.records.get(path), ...patch});
      await assert.rejects(readParticipantFormProfileProposal({db: h.db,
        uid: "person", responseId}), /unavailable/u);
    }
    const h = fixture();
    const {paymentId} = await h.reserve();
    h.capture(paymentId);
    await h.finalize(paymentId);
    h.store.records.set("deletedUsers/person", {status: "processing"});
    await assert.rejects(readParticipantFormProfileProposal({db: h.db,
      uid: "person", responseId: h.proposals()[0][1].responseId as string}),
    /unavailable/u);
  });

test("a forged pointer cannot promote an organizer-only response answer",
  async () => {
    const h = fixture();
    const {paymentId} = await h.reserve();
    h.capture(paymentId);
    await h.finalize(paymentId);
    const [path, proposal] = h.proposals()[0];
    h.store.records.set(path, {...proposal, fields: [{
      questionId: "customName", destination: "catchProfile",
      canonicalFieldId: "givenName",
    }]});
    await assert.rejects(readParticipantFormProfileProposal({db: h.db,
      uid: "person", responseId: proposal.responseId as string}),
    /unavailable/u);
  });


test("captured receipt offers claim only while the owned proposal is active",
  async () => {
    const h = fixture();
    const {paymentId} = await h.reserve();
    h.capture(paymentId);
    await h.finalize(paymentId);
    const payment = h.store.records.get(
      `guestPayments/${paymentId}`) as unknown as Payment;
    const project = () => projectFormPayment({db: h.db, paymentId, payment,
      respondentUid: "person"});
    assert.equal((await project()).receipt?.profileReviewAvailable, true);
    const responsePath = `organizerFormResponses/${payment.responseId}`;
    const response = h.store.records.get(responsePath)!;
    for (const change of ["withdraw", "delete", "missingProposal"]) {
      if (change === "withdraw") {
        h.store.records.set(responsePath,
          {...response, status: "withdrawn", withdrawnAt: Timestamp.now()});
      }
      if (change === "delete") {
        h.store.records.set(responsePath, response);
        h.store.records.set("deletedUsers/person", {status: "processing"});
      }
      if (change === "missingProposal") {
        h.store.records.delete("deletedUsers/person");
        h.store.records.delete(
          `participantFormProfileProposals/${payment.responseId}`);
      }
      assert.equal((await project()).receipt?.profileReviewAvailable, false);
    }
  });

test("ordinary forms do not advertise profile claiming", async () => {
  const h = createFormPaymentFixture();
  const {paymentId} = await h.reserve();
  h.capture(paymentId);
  await h.finalize(paymentId);
  const payment = h.store.records.get(
    `guestPayments/${paymentId}`) as unknown as Payment;
  const response = h.store.records.get(
    `organizerFormResponses/${payment.responseId}`) as unknown as Response;
  const receipt = await organizerFormResponseReceipt(h.db, payment.responseId!,
    response, h.version, null);
  assert.equal(receipt.profileReviewAvailable, false);
});
