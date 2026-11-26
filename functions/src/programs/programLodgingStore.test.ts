import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import type {ProgramDataDeps} from "../shared/programDataDeps";
import {baseSeed, deps} from "../shared/testing/programFixtures";
import {FakeFirestore} from "../shared/testing/programFirestore";
import {immutableLodgingProposal} from "./programLodgingPlanner";
import {ProgramLodgingStore} from "./programLodgingStore";
import type {LodgingSnapshot} from "./programLodgingTypes";
import type {LodgingCommand} from "./programLodgingTransitions";
import type {ProgramLodgingConfigDocument} from
  "../shared/generated/programLodgingConfigDocument";

function setup() {
  const snapshot: LodgingSnapshot = {
    scope: {organizerId: "org-1", programId: "program-1"},
    revisions: {source: 1, inventory: 1, layout: 1, published: 0},
    guests: [{id: "guest-1", arrival: "2026-10-01", departure: "2026-10-03",
      beds: 1, requiredFeatures: ["stepFree"]}],
    parties: [{id: "party", guestIds: ["guest-1"], confirmed: true,
      priority: 0, requiredRoomType: null, pin: null}],
    groups: [], memberships: [],
    rooms: [{id: "room", hotelId: "hotel-1", zoneId: "wing", building: null,
      floor: "1", wing: null, roomType: "standard", beds: 1, maxOccupants: 1,
      verifiedFeatures: ["stepFree"], resourceIds: ["room"], position: null}],
    contracts: [{id: "contract", hotelId: "hotel-1", nightlyRoomQuota: 1,
      arrival: "2026-10-01", departure: "2026-10-04"}],
    inventory: [{id: "unit", contractId: "contract", physicalRoomId: "room",
      provisional: null,
      availability: [{arrival: "2026-10-01", departure: "2026-10-04"}]}],
    published: [],
  };
  const db = new FakeFirestore({...baseSeed(),
    "plannerTestSources/program-1": {snapshot}});
  const controls = {failPublish: false, nowMillis: 1_800_000_000_000};
  const dependencies = deps(db, {now: () =>
    Timestamp.fromMillis(controls.nowMillis)}) as ProgramDataDeps;
  const store = new ProgramLodgingStore(dependencies, async (tx) => {
    const ref = dependencies.firestore()
      .collection("plannerTestSources").doc("program-1");
    const data = (await tx.get(ref)).data()!;
    const current = structuredClone(data.snapshot) as LodgingSnapshot;
    return {snapshot: current,
      labels: {guests: {"guest-1": "Rohan Sharma"}, groups: {},
        hotels: {"hotel-1": "Harbourview Palace"}},
      configuration: {labels: [{inventoryId: "unit", roomLabel: "101"}]} as
        unknown as ProgramLodgingConfigDocument,
      publish: (proposal) => {
        tx.set(dependencies.firestore()
          .collection("plannerTestPublished").doc("program-1"),
        {placements: proposal.placements,
          revision: current.revisions.published + 1});
        tx.update(ref, {snapshot: {...current,
          revisions: {...current.revisions,
            published: current.revisions.published + 1},
          published: proposal.placements.map((p) => ({...p,
            locked: false, checkedIn: false}))}});
        if (controls.failPublish) throw new Error("Synthetic bridge failure");
      }};
  });
  const approve = (proposalId: string): LodgingCommand => ({proposalId,
    operationId: "approve-1", expectedWorkflowRevision: 0,
    action: "approve", hotelId: null});
  const count = (prefix: string) => [...db.docs.keys()]
    .filter((path) => path.startsWith(prefix + "/")).length;
  return {db, store, controls, snapshot, approve, count};
}

test("saved proposals require current coordinator authority", async () => {
  const h = setup();
  const proposal = await h.store.preview("program-1", "manager-1");
  await assert.rejects(h.store.save("program-1", "hotelier-1", proposal),
    /programCoordinator/);
  const first = await h.store.save("program-1", "manager-1", proposal);
  assert.deepEqual(
    await h.store.save("program-1", "manager-1", proposal), first);
  assert.equal(h.count("programLodgingProposals"), 1);
  h.db.updateDoc("plannerTestSources/program-1", {snapshot: {...h.snapshot,
    revisions: {...h.snapshot.revisions, source: 2}}});
  await assert.rejects(
    h.store.save("program-1", "manager-1", proposal), /Stale/);
});

test("competing publications commit one bridge and receipt", async () => {
  const h = setup();
  const proposal = await h.store.preview("program-1", "manager-1");
  await h.store.save("program-1", "manager-1", proposal);
  await h.store.transition("program-1", "manager-1", h.approve(proposal.id));
  const command: LodgingCommand = {...h.approve(proposal.id),
    action: "publishGuests", operationId: "publish-1",
    expectedWorkflowRevision: 1};
  const results = await Promise.all([0, 1].map(() =>
    h.store.transition("program-1", "manager-1", command)));
  assert.equal(results.filter((r) => r.replayed).length, 1);
  assert.equal(h.count("programLodgingReceipts"), 2); // Approval plus publish.
  assert.equal(h.db.getDoc("plannerTestPublished/program-1")!.revision, 1);
  const workflow = h.db.getDoc("programLodgingWorkflows/program-1")!.workflow;
  assert.equal((workflow as {revision: number}).revision, 2);
  assert.equal((await h.store.hotelBoard("program-1", "hotelier-1", "hotel-1"))
    .rows.length, 1);
});

test("bridge failure rolls back the complete operation", async () => {
  const h = setup();
  const proposal = await h.store.preview("program-1", "manager-1");
  await h.store.save("program-1", "manager-1", proposal);
  await h.store.transition("program-1", "manager-1", h.approve(proposal.id));
  h.controls.failPublish = true;
  await assert.rejects(h.store.transition("program-1", "manager-1",
    {...h.approve(proposal.id), action: "publishGuests", operationId: "publish",
      expectedWorkflowRevision: 1}), /Synthetic bridge failure/);
  assert.equal(h.count("programLodgingReceipts"), 1);
  assert.equal(h.db.getDoc("plannerTestPublished/program-1"), undefined);
  assert.equal((h.db.getDoc("programLodgingWorkflows/program-1")!.workflow as
    {revision: number}).revision, 1);
});

test("revocation retries confirmation with current authority", async () => {
  const h = setup();
  const proposal = await h.store.preview("program-1", "manager-1");
  await h.store.save("program-1", "manager-1", proposal);
  await h.store.transition("program-1", "manager-1", h.approve(proposal.id));
  h.db.beforeCommit = async () => {
    h.db.beforeCommit = undefined;
    h.db.updateDoc("programStaffGrants/program-1__hotelier-1",
      {status: "revoked"});
  };
  await assert.rejects(h.store.transition("program-1", "hotelier-1",
    {...h.approve(proposal.id), action: "confirmHotel", hotelId: "hotel-1",
      operationId: "confirm", expectedWorkflowRevision: 1}), /access/);
  assert.equal(h.count("programLodgingReceipts"), 1);
});

test("source revisions fence approval; hotel data is allowlisted", async () => {
  const h = setup();
  const proposal = await h.store.preview("program-1", "manager-1");
  await h.store.save("program-1", "manager-1", proposal);
  assert.deepEqual(
    await h.store.hotelBoard("program-1", "hotelier-1", "hotel-1"),
    {hotelLabel: "Harbourview Palace", rows: []});
  await h.store.transition("program-1", "manager-1", h.approve(proposal.id));
  const {rows} = await h.store.hotelBoard("program-1", "hotelier-1",
    "hotel-1");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].roomLabel, "101");
  assert.equal(rows[0].guests[0].displayName, "Rohan Sharma");
  assert.equal(JSON.stringify(rows).includes("stepFree"), false);
  await assert.rejects(h.store.hotelBoard("program-1", "hotelier-1", "hotel-2"),
    /Hotel duty/);
  h.db.updateDoc("plannerTestSources/program-1", {snapshot: {...h.snapshot,
    revisions: {...h.snapshot.revisions, published: 1}}});
  await assert.rejects(h.store.transition("program-1", "manager-1",
    {...h.approve(proposal.id), operationId: "stale",
      expectedWorkflowRevision: 1}),
  /Stale/);
  assert.equal(h.count("programLodgingReceipts"), 1);
});


test("saved proposal replay rejects expiry during its final read", async () => {
  const h = setup();
  const proposal = await h.store.preview("program-1", "manager-1");
  await h.store.save("program-1", "manager-1", proposal);
  const expiry = h.controls.nowMillis + 100;
  h.db.setDoc("programStaffGrants/program-1__coordinator", {
    ...h.db.getDoc("programStaffGrants/program-1__hotelier-1"),
    uid: "coordinator", duties: [{duty: "programCoordinator",
      expiresAtMillis: expiry, pickupPointIds: [], hotelIds: []}],
  });
  const read = h.db.getDoc.bind(h.db);
  h.db.getDoc = (path) => {
    const doc = read(path);
    if (path === "programLodgingProposals/" + proposal.id) {
      h.controls.nowMillis = expiry;
    }
    return doc;
  };
  await assert.rejects(h.store.save("program-1", "coordinator", proposal),
    /expired/);
  assert.equal(h.controls.nowMillis, expiry);
  assert.equal(h.count("programLodgingProposals"), 1);
});


test("altered stored placements reject save, transition and hotel reads",
  async () => {
    const h = setup();
    const proposal = await h.store.preview("program-1", "manager-1");
    await h.store.save("program-1", "manager-1", proposal);
    await h.store.transition("program-1", "manager-1", h.approve(proposal.id));
    h.db.updateDoc("programLodgingProposals/" + proposal.id,
      {proposal: {...proposal, placements: []}});
    await assert.rejects(h.store.save("program-1", "manager-1", proposal),
      /content does not match/);
    await assert.rejects(h.store.hotelBoard(
      "program-1", "hotelier-1", "hotel-1"), /content does not match/);
    await assert.rejects(h.store.transition("program-1", "manager-1",
      h.approve(proposal.id)), /content does not match/);
    assert.equal(h.count("programLodgingReceipts"), 1);
  });

test("valid partial proposal cannot become an approved hotel board",
  async () => {
    const h = setup();
    const partial = immutableLodgingProposal(h.snapshot, []);
    await h.store.save("program-1", "manager-1", partial);
    h.db.setDoc("programLodgingWorkflows/program-1", {
      ...h.snapshot.scope, workflow: {revision: 1,
        approvedProposalId: partial.id, confirmedHotelIds: [],
        guestPublishedProposalId: null},
    });
    await assert.rejects(h.store.hotelBoard(
      "program-1", "hotelier-1", "hotel-1"), /complete and feasible/);
  });


test("stored map key order does not change proposal identity", async () => {
  const h = setup();
  const proposal = await h.store.preview("program-1", "manager-1");
  await h.store.save("program-1", "manager-1", proposal);
  const reverse = (value: object) =>
    Object.fromEntries(Object.entries(value).reverse());
  h.db.updateDoc("programLodgingProposals/" + proposal.id, {proposal: {
    ...proposal, scope: reverse(proposal.scope),
    revisions: reverse(proposal.revisions),
    placements: proposal.placements.map(reverse),
  }});
  const replay = await h.store.save("program-1", "manager-1", proposal);
  assert.equal(replay.id, proposal.id);
});
