import assert from "node:assert/strict";
import test from "node:test";
import {validateProgramLodgingProposalDocument} from
  "../shared/generated/validators/programLodgingProposalDocument";
import {validateProgramLodgingWorkflowDocument} from
  "../shared/generated/validators/programLodgingWorkflowDocument";
import {validateProgramLodgingReceiptDocument} from
  "../shared/generated/validators/programLodgingReceiptDocument";
import {validateWorkspaceMembershipAssertionDocument} from
  "../shared/generated/validators/workspaceMembershipAssertionDocument";
import {selectWorkspaceMembership, workspaceMembershipAssertionId} from
  "../workspaces/workspaceMembershipAuthority";
import type {WorkspaceMembershipAssertion} from
  "../workspaces/workspaceMembershipAuthority";
import {lodgingProposalId} from "./programLodgingPlanner";
import {contractValidator} from "../shared/contractTestValidators";

const validateWorkspaceMembershipDecisionDocument =
  contractValidator("WorkspaceMembershipDecisionDocument");

const scope = {organizerId: "org", programId: "program"};
const revisions = {source: 1, inventory: 1, layout: 1, published: 0};
const placements = [{partyId: "party", inventoryId: "room"}];
const id = lodgingProposalId(scope, revisions, placements);

test("lodging contracts bound identity and operational data",
  () => {
    const record = {...scope, createdByUid: "manager", createdAtMillis: 1,
      proposal: {scope, revisions, placements, id, unplacedPartyIds: [],
        explanations: [], score: [0, 0, 0, 0, 0],
        search: {complete: true, explored: 1}}};
    assert.equal(validateProgramLodgingProposalDocument(record), true);
    assert.equal(validateProgramLodgingProposalDocument({...record,
      proposal: {...record.proposal, id: "mutable-room-label"}}), false);
    assert.equal(validateProgramLodgingProposalDocument({...record,
      medicalNotes: "private data cannot enter this envelope"}), false);
    assert.equal(validateProgramLodgingProposalDocument({...record,
      proposal: {...record.proposal,
        placements: Array.from({length: 501}, () => placements[0])}}), false);
  });

test("workflow and receipt contracts keep publication states distinct", () => {
  const workflow = {revision: 1, approvedProposalId: id,
    guestPublishedProposalId: null, confirmedHotelIds: []};
  assert.equal(validateProgramLodgingWorkflowDocument({...scope, workflow}),
    true);
  assert.equal(validateProgramLodgingWorkflowDocument({...scope,
    workflow: {...workflow, confirmedHotelIds: ["hotel", "hotel"]}}), false);
  const receipt = {operationId: "approve-1", requestHash: id,
    actorUid: "manager", resultingRevision: 1};
  assert.equal(validateProgramLodgingReceiptDocument(
    {...scope, receipt}), true);
  assert.equal(validateProgramLodgingReceiptDocument({...scope,
    receipt: {...receipt, resultingRevision: 0}}), false);
});

test("membership contracts preserve typed program guest evidence", () => {
  const context = {...scope, schemaVersion: 1,
    workspaceRef: {kind: "program", id: "program"},
    relationshipRef: {kind: "programGuest", id: "guest"}, groupId: "friends"};
  const assertion = {...context, included: false, sourceKind: "manualEntry",
    sourceId: "manual-1", sourceVersion: 1, sourceLabel: "Host review",
    actorUid: "manager", observedAtMillis: 1};
  assert.equal(validateWorkspaceMembershipAssertionDocument(assertion), true);
  assert.equal(validateWorkspaceMembershipAssertionDocument({...assertion,
    relationshipRef: {kind: "programHousehold", id: "household"}}), false);
  const decision = {...context, selectedAssertionId: "wma_" + id,
    previousAssertionId: null, relationshipRevision: 1,
    actorUid: "manager", observedAtMillis: 2};
  assert.equal(validateWorkspaceMembershipDecisionDocument(decision), true);
  assert.equal(validateWorkspaceMembershipDecisionDocument({...decision,
    selectedAssertionId: "wfa_" + id}), false);
});


test("membership selector returns only permitted decision fields", () => {
  const assertion: WorkspaceMembershipAssertion = {...scope, schemaVersion: 1,
    workspaceRef: {kind: "program", id: "program"},
    relationshipRef: {kind: "programGuest", id: "guest"}, groupId: "friends",
    included: false, sourceKind: "manualEntry", sourceId: "manual-1",
    sourceVersion: 1, sourceLabel: "Host review", actorUid: "manager",
    observedAtMillis: 1};
  const context = {...assertion,
    workspaceRef: {...assertion.workspaceRef, privateSourceNote: "private"},
    relationshipRef: {...assertion.relationshipRef, privateNote: "private"}};
  const result = selectWorkspaceMembership({context, assertion,
    assertionId: workspaceMembershipAssertionId(assertion),
    projection: {groupIds: ["friends"], selections: [], suggestions: []},
    currentRevision: 1, expectedRevision: 1,
    actorUid: "reviewer", observedAtMillis: 2});
  assert.equal(validateWorkspaceMembershipDecisionDocument(result.decision),
    true);
  assert.deepEqual(result.projection.groupIds, []);
  assert.equal("included" in result.decision, false);
  assert.equal("privateSourceNote" in result.decision.workspaceRef, false);
  assert.equal("privateNote" in result.decision.relationshipRef, false);
});
