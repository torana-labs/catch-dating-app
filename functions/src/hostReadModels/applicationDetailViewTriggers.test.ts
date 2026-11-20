import assert from "node:assert/strict";
import test from "node:test";
import {
  applicationDetailApplicantsForMembership,
  applicationDetailFormResponseChanged,
  applicationDetailIdsForImportedResponse,
  applicationDetailOriginChanged,
} from "./applicationDetailViewTriggers";

test("a form response re-evaluates its application when shown facts move",
  () => {
    const response = {organizerId: "org", formId: "f", versionId: "v",
      status: "submitted", respondentUid: "u", answerSnapshots: [],
      identity: null, updatedAt: 1, aggregateRevision: 3};
    assert.equal(applicationDetailFormResponseChanged(response,
      {...response, updatedAt: 2, aggregateRevision: 4}), false);
    assert.equal(applicationDetailFormResponseChanged(response,
      {...response, status: "withdrawn"}), true);
    assert.equal(applicationDetailFormResponseChanged(response, undefined),
      true);
  });

test("an imported response re-evaluates the applications it names", () => {
  const response = {applicationId: "a1", answers: []};
  assert.deepEqual(applicationDetailIdsForImportedResponse(response,
    response), []);
  assert.deepEqual(applicationDetailIdsForImportedResponse(undefined,
    response), ["a1"]);
  assert.deepEqual(applicationDetailIdsForImportedResponse(response,
    {...response, applicationId: "a2"}), ["a1", "a2"]);
});

test("only a moved People link re-evaluates an origin's application", () => {
  const origin = {organizerId: "org", currentContactId: "c1",
    observedAt: 1};
  assert.equal(applicationDetailOriginChanged(origin,
    {...origin, observedAt: 2}), false);
  assert.equal(applicationDetailOriginChanged(origin,
    {...origin, currentContactId: "c2"}), true);
});

test("a membership write re-evaluates its applicant once", () => {
  const membership = {organizerId: "org", uid: "u", state: "active",
    revision: 1};
  assert.deepEqual(applicationDetailApplicantsForMembership(membership,
    membership), []);
  assert.deepEqual(applicationDetailApplicantsForMembership(membership,
    {...membership, state: "revoked", revision: 2}),
  [{organizerId: "org", uid: "u"}]);
  assert.deepEqual(applicationDetailApplicantsForMembership(membership,
    undefined), [{organizerId: "org", uid: "u"}]);
});
