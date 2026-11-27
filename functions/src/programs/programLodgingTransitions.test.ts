import assert from "node:assert/strict";
import test from "node:test";
import {planLodging} from "./programLodgingPlanner";
import {lodgingHotelProjection, lodgingTransition}
  from "./programLodgingTransitions";
import type {LodgingAuthority, LodgingCommand, LodgingWorkflow}
  from "./programLodgingTransitions";
import type {LodgingSnapshot} from "./programLodgingTypes";

function setup() {
  const snapshot: LodgingSnapshot = {
    scope: {organizerId: "org", programId: "program"},
    revisions: {source: 1, inventory: 1, layout: 1, published: 0},
    guests: [{id: "guest", arrival: "2026-10-01", departure: "2026-10-03",
      beds: 1, requiredFeatures: ["stepFree"]}],
    parties: [{id: "party", guestIds: ["guest"], confirmed: true,
      priority: 0, requiredRoomType: null, pin: null}],
    groups: [{id: "privateAffinity", parentIds: []}],
    memberships: [{guestId: "guest", groupId: "privateAffinity",
      included: true, authority: "manual", sourceId: null}],
    rooms: [{id: "room", hotelId: "hotel", zoneId: "wing", building: null,
      floor: "1", wing: null, roomType: "standard", beds: 1, maxOccupants: 1,
      verifiedFeatures: ["stepFree"], resourceIds: ["room"], position: null}],
    contracts: [{id: "contract", hotelId: "hotel", nightlyRoomQuota: 1,
      arrival: "2026-10-01", departure: "2026-10-04"}],
    inventory: [{id: "unit", contractId: "contract", physicalRoomId: "room",
      provisional: null,
      availability: [{arrival: "2026-10-01", departure: "2026-10-04"}]}],
    published: [],
  };
  const proposal = planLodging(snapshot);
  const authority: LodgingAuthority = {uid: "host", organizerId: "org",
    programId: "program", role: "manager", hotelIds: [], expiresAtMillis: 100};
  const workflow: LodgingWorkflow = {revision: 0, approvedProposalId: null,
    confirmedHotelIds: [], guestPublishedProposalId: null};
  const command: LodgingCommand = {operationId: "approve-1",
    expectedWorkflowRevision: 0, proposalId: proposal.id,
    action: "approve", hotelId: null};
  return {snapshot, proposal, authority, workflow, command};
}

test("approval, hotel confirmation and guest publication are separate", () => {
  const h = setup();
  const approved = lodgingTransition(h.snapshot, h.proposal, h.workflow,
    h.authority, h.command, null, 1);
  assert.equal(approved.workflow.approvedProposalId, h.proposal.id);
  assert.deepEqual(approved.workflow.confirmedHotelIds, []);
  assert.equal(approved.workflow.guestPublishedProposalId, null);
  const desk: LodgingAuthority = {...h.authority, uid: "desk",
    role: "hotelDesk",
    hotelIds: ["hotel"]};
  const confirmed = lodgingTransition(h.snapshot, h.proposal, approved.workflow,
    desk, {...h.command, operationId: "confirm-1", expectedWorkflowRevision: 1,
      action: "confirmHotel", hotelId: "hotel"}, null, 1);
  assert.deepEqual(confirmed.workflow.confirmedHotelIds, ["hotel"]);
  assert.equal(confirmed.workflow.guestPublishedProposalId, null);
  const published = lodgingTransition(h.snapshot, h.proposal,
    confirmed.workflow, h.authority, {...h.command, operationId: "publish-1",
      expectedWorkflowRevision: 2, action: "publishGuests"}, null, 1);
  assert.equal(published.workflow.guestPublishedProposalId, h.proposal.id);
  assert.equal(published.workflow.revision, 3);
  assert.equal(h.workflow.revision, 0);
});

test("receipt replay needs access and cannot restore old state", () => {
  const h = setup();
  const first = lodgingTransition(h.snapshot, h.proposal, h.workflow,
    h.authority, h.command, null, 1);
  const current = {...first.workflow, revision: 3,
    approvedProposalId: "later-approved-proposal"};
  const replay = lodgingTransition(h.snapshot, h.proposal, current,
    h.authority, h.command, first.receipt, 1);
  assert.equal(replay.replayed, true);
  assert.equal(replay.workflow.approvedProposalId, "later-approved-proposal");
  assert.equal(replay.receipt.resultingRevision, 1);
  assert.throws(() => lodgingTransition(h.snapshot, h.proposal, current,
    {...h.authority, expiresAtMillis: 1}, h.command, first.receipt, 1),
  /authority/);
  assert.throws(() => lodgingTransition(h.snapshot, h.proposal, current,
    h.authority, {...h.command, action: "publishGuests"}, first.receipt, 1),
  /different request/);
});

test("stale changes reject without producing receipts", () => {
  const h = setup();
  assert.throws(() => lodgingTransition(h.snapshot, h.proposal,
    {...h.workflow, revision: 1}, h.authority, h.command, null, 1), /Stale/);
  h.snapshot.revisions.source++;
  assert.throws(() => lodgingTransition(h.snapshot, h.proposal, h.workflow,
    h.authority, h.command, null, 1), /Stale/);
  assert.equal(h.workflow.revision, 0);
});

test("hotel duties cannot approve, publish or confirm another property", () => {
  const h = setup();
  const desk: LodgingAuthority = {...h.authority, role: "hotelDesk",
    hotelIds: ["other"]};
  for (const action of ["approve", "publishGuests", "confirmHotel"] as const) {
    assert.throws(() => lodgingTransition(h.snapshot, h.proposal, h.workflow,
      desk, {...h.command, action,
        hotelId: action === "confirmHotel" ? "hotel" : null}, null, 1),
    /duty/);
  }
  assert.throws(() => lodgingTransition(h.snapshot, h.proposal, h.workflow,
    {...h.authority, programId: "other-program"}, h.command, null, 1),
  /authority/);
});

test("confirmation and publication require exact host approval", () => {
  const h = setup();
  for (const action of ["confirmHotel", "publishGuests"] as const) {
    assert.throws(() => lodgingTransition(h.snapshot, h.proposal, h.workflow,
      h.authority, {...h.command, action,
        hotelId: action === "confirmHotel" ? "hotel" : null}, null, 1),
    /approve this exact/);
  }
});

test("hotel projection exposes operational allocation only", () => {
  const h = setup();
  const desk: LodgingAuthority = {...h.authority, role: "hotelDesk",
    hotelIds: ["hotel"]};
  const labels = {guests: {guest: "Asha Verma"}, rooms: {unit: "101"}};
  const projection = lodgingHotelProjection(h.snapshot, h.proposal,
    desk, "hotel", 1, labels);
  assert.deepEqual(projection, [{partyId: "party", inventoryId: "unit",
    physicalRoomId: "room", zoneId: "wing", roomType: "standard",
    roomLabel: "101", guests: [{guestId: "guest", displayName: "Asha Verma",
      arrival: "2026-10-01", departure: "2026-10-03"}]}]);
  for (const privateValue of ["privateAffinity", "stepFree", "memberships"]) {
    assert.equal(JSON.stringify(projection).includes(privateValue), false);
  }
  assert.throws(() => lodgingHotelProjection(h.snapshot, h.proposal,
    desk, "other", 1, labels), /duty/);
  assert.throws(() => lodgingHotelProjection(h.snapshot, h.proposal,
    desk, "hotel", 1, {guests: {}, rooms: {}}), /Missing guest name/);
  const unreleased = lodgingHotelProjection(h.snapshot, h.proposal,
    desk, "hotel", 1, {...labels, rooms: {}});
  assert.equal(unreleased[0].roomLabel, null);
});
