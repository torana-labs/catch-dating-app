import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {HttpsError, type CallableRequest} from "firebase-functions/v2/https";
import {createFormPaymentFixture} from
  "../payments/formPayments/formPaymentTestStore";
import {beginOrganizerFormResponseHandler as begin,
  saveOrganizerFormResponseDraftHandler as save,
  submitOrganizerFormResponseHandler as submit} from "./organizerFormResponses";
import type {BeginOrganizerFormResponseCallableResponse} from
  "../shared/generated/beginOrganizerFormResponseCallableResponse";
import {contractValidator} from "../shared/contractTestValidators";

const validateBeginOrganizerFormResponseCallableResponse =
  contractValidator<BeginOrganizerFormResponseCallableResponse>(
    "BeginOrganizerFormResponseCallableResponse"
  );

const request = (data: unknown, uid = "person") => ({data,
  auth: {uid, token: {}}}) as unknown as CallableRequest<unknown>;
const unavailable = (error: unknown) =>
  error instanceof HttpsError && error.code === "not-found";

async function fixture() {
  const h = createFormPaymentFixture();
  h.version.definition.identityPolicy = "catchAccount";
  h.version.definition.payment = null;
  h.version.definition.availability.responseLimit = null;
  h.version.definition.sections[0].questions[0].prefillPolicy =
    "participantReviewRequired";
  h.draft.identityKind = "catchAccount";
  h.store.records.set("organizerFormResponseDrafts/draft", {...h.draft});
  const db = {collection: (name: string) => {
    const collection = h.store.collection(name);
    return {...collection, where: (field: string, op: string,
      value: unknown) => {
      const query = collection.where(field, op, value);
      return {...query, limit: (limit: number) => ({get: async () => {
        const result = await query.limit(limit).get();
        return {...result, size: result.docs.length};
      }})};
    }};
  }, runTransaction: h.store.runTransaction.bind(h.store),
  } as unknown as FirebaseFirestore.Firestore;
  const deps = {firestore: () => db,
    timestamp: () => Timestamp.fromMillis(2000),
    checkRateLimit: async () => undefined, storageBucket: () => {
      throw new Error("No uploads");
    }};
  const source = await submit(request(h.data), {...deps,
    timestamp: () => Timestamp.fromMillis(1000)});
  const sourcePath = `organizerFormResponses/${source.responseId}`;
  const original = h.store.records.get(sourcePath)!;
  const oldVersion = h.store.records.get("organizerFormVersions/version")!;
  h.version.definition = JSON.parse(JSON.stringify(h.version.definition));
  h.store.records.set("organizerFormVersions/current", {...h.version,
    version: 2, publishedAt: Timestamp.fromMillis(1500)});
  h.store.records.set("organizerForms/form", {...h.form,
    activeVersionId: "current", publishedVersion: 2});
  const data = {publicFormId: h.form.publicFormId, sourceToken: null,
    requestId: "reuse-review-request-0001", reuseResponseId: source.responseId};
  return {...h, db, deps, source, sourcePath, original, oldVersion, data};
}

test("own account-only answers are suggestions with immutable origin",
  async () => {
    const h = await fixture();
    const result = await begin(request(h.data), h.deps);
    assert.ok(validateBeginOrganizerFormResponseCallableResponse(result));
    assert.deepEqual(result.prefillSuggestions, {name: "Sara Demo"});
    assert.deepEqual(result.prefillSource, {responseId: h.source.responseId,
      versionId: "version", submittedAtMillis: 1000});
    assert.deepEqual(result.answers, {});
    assert.equal(result.consentAccepted, false);
    assert.equal(result.messagingChoices, undefined);
    assert.deepEqual(h.store.records.get(h.sourcePath), h.original);
    assert.deepEqual(h.store.records.get("organizerFormVersions/version"),
      h.oldVersion);
    assert.equal(h.store.records.has("users/person"), false);
    assert.equal(h.store.records.has("participantIntakeProfiles/person"),
      false);
    const repeated = await begin(request(h.data), h.deps);
    assert.deepEqual(repeated, result);
  });

test("explicit edits create a new version-bound snapshot", async () => {
  const h = await fixture();
  const begun = await begin(request(h.data), h.deps);
  const saved = await save(request({draftId: begun.draftId, draftToken: null,
    expectedRevision: 1, answers: {name: "Updated Demo"},
    consentAccepted: true}), h.deps);
  const fresh = await submit(request({draftId: begun.draftId, draftToken: null,
    expectedRevision: saved.revision, requestId: "reuse-submit-request-0001"}),
  h.deps);
  assert.notEqual(fresh.responseId, h.source.responseId);
  const record = h.store.records.get(
    `organizerFormResponses/${fresh.responseId}`)!;
  assert.equal(record.versionId, "current");
  assert.deepEqual(record.answers, {name: "Updated Demo"});
  assert.deepEqual(h.store.records.get(h.sourcePath), h.original);
});

test("foreign, withdrawn, deleted and anonymous sources deny before draft",
  async () => {
    for (const scenario of ["foreign", "withdrawn", "deleted", "anonymous"]) {
      const h = await fixture();
      if (scenario === "withdrawn") {
        h.store.records.set(h.sourcePath,
          {...h.original, status: "withdrawn",
            withdrawnAt: Timestamp.fromMillis(1700)});
      }
      if (scenario === "deleted") {
        h.store.records.set("deletedUsers/person",
          {status: "processing"});
      }
      if (scenario === "anonymous") {
        h.store.records.set(h.sourcePath,
          {...h.original, identityKind: "anonymous", respondentUid: null});
      }
      const drafts = [...h.store.records.keys()].filter((path) =>
        path.startsWith("organizerFormResponseDrafts/")).length;
      await assert.rejects(begin(request(h.data,
        scenario === "foreign" ? "other" : "person"), h.deps), unavailable);
      assert.equal([...h.store.records.keys()].filter((path) =>
        path.startsWith("organizerFormResponseDrafts/")).length, drafts);
    }
  });

test("same question keys in another form or organizer prove no reuse",
  async () => {
    for (const scope of ["formId", "organizerId"]) {
      const h = await fixture();
      const oldVersion = {...h.oldVersion, [scope]: "other"};
      h.store.records.set("organizerFormVersions/version", oldVersion);
      h.store.records.set(h.sourcePath, {...h.original, [scope]: "other"});
      await assert.rejects(begin(request(h.data), h.deps), unavailable);
    }
  });

test("changed semantics, notice, destinations or opt-out yield no suggestions",
  async () => {
    for (const change of ["label", "kind", "key", "privacyClass", "notice",
      "destination", "optOut", "validation", "acknowledgement"]) {
      const h = await fixture();
      const target = h.version.definition;
      const question = target.sections[0].questions[0];
      switch (change) {
      case "label": question.label = "Different meaning"; break;
      case "kind": question.kind = "longText"; break;
      case "key": question.key = "newKey"; break;
      case "privacyClass": question.privacyClass = "contact"; break;
      case "notice": target.consent.consentCopy = "Different scope"; break;
      case "destination": question.answerDestination = "organizerCard"; break;
      case "optOut": question.prefillPolicy = "never"; break;
      case "validation": question.validation.maxLength = 2; break;
      case "acknowledgement": question.kind = "acknowledgement"; break;
      }
      const result = await begin(request(h.data), h.deps);
      assert.deepEqual(result.prefillSuggestions, {}, change);
      assert.equal(result.prefillSource, undefined, change);
      assert.deepEqual(result.answers, {}, change);
    }
  });
