import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import type {ProgramDataDeps} from "../shared/programDataDeps";
import {baseSeed, deps, now} from "../shared/testing/programFixtures";
import {FakeFirestore} from "../shared/testing/programFirestore";
import {ProgramLodgingStore} from "./programLodgingStore";
import {canonicalLodgingSource, saveCanonicalLodgingConfig} from
  "./programLodgingConfig";

const start = Date.parse("2026-10-01T00:00:00Z");
const end = Date.parse("2026-10-03T00:00:00Z");
function setup() {
  const scope = {programId: "program-1", organizerId: "org-1"};
  const config = {...scope, revision: 1,
    demand: ["guest-1", "guest-2"].map((guestId) => ({guestId,
      startsAtMillis: start, endsAtMillis: end, beds: 1,
      requiredFeatures: []})),
    parties: [{id: "party", guestIds: ["guest-1", "guest-2"],
      confirmed: true, priority: 0, requiredRoomType: null, pin: null}],
    groupParents: [], rooms: [{id: "room", hotelId: "hotel-1", zoneId: "wing",
      building: null, floor: "1", wing: null, roomType: "standard", beds: 2,
      maxOccupants: 2, verifiedFeatures: [], resourceIds: ["room"],
      position: {x: 0.2, y: 0.2}}],
    inventory: [{id: "unit", contractId: "block", physicalRoomId: "room",
      provisional: null, availability: [{arrival: "2026-10-01",
        departure: "2026-10-03"}]}], labels: [{inventoryId: "unit",
      roomLabel: "101"}]};
  const fake = new FakeFirestore({...baseSeed(),
    "programLodgingConfigs/program-1": config,
    "programRoomBlocks/block": {...scope, hotelId: "hotel-1", label: "Block",
      roomType: "standard", totalRooms: 1, assignedCount: 0,
      maxOccupantsPerRoom: 2, heldForGroupIds: [],
      startsAt: Timestamp.fromMillis(start), endsAt: Timestamp.fromMillis(end),
      createdAt: now, updatedAt: now, revision: 1}});
  const dependencies = deps(fake) as ProgramDataDeps;
  const store = new ProgramLodgingStore(dependencies,
    canonicalLodgingSource(dependencies));
  const saveAndApprove = async () => {
    const proposal = await store.preview("program-1", "manager-1");
    await store.save("program-1", "manager-1", proposal);
    await store.transition("program-1", "manager-1", {proposalId: proposal.id,
      action: "approve", hotelId: null, operationId: "approve",
      expectedWorkflowRevision: 0});
    return proposal;
  };
  const setupConfig = {demand: config.demand, parties: config.parties,
    groupParents: config.groupParents, rooms: config.rooms,
    inventory: config.inventory, labels: config.labels};
  return {fake, store, config, setupConfig, dependencies, saveAndApprove};
}

test("native config bridges preview approval publication and hotel board",
  async () => {
    const h = setup();
    const proposal = await h.saveAndApprove();
    const command = {proposalId: proposal.id, action: "publishGuests" as const,
      hotelId: null, operationId: "publish", expectedWorkflowRevision: 1};
    assert.equal((await h.store.transition("program-1", "manager-1",
      command)).replayed, false);
    assert.equal((await h.store.transition("program-1", "manager-1",
      command)).replayed, true);
    const board = await h.store.hotelBoard("program-1", "hotelier-1",
      "hotel-1");
    assert.equal(board.hotelLabel, "Harbourview Palace");
    assert.deepEqual(board.rows.map((row) => [row.roomLabel,
      row.guests.map((guest) => guest.displayName)]),
    [["101", ["Rohan Sharma", "Vikram Rao"]]]);
    assert.equal(h.fake.getDoc("programRoomBlocks/block")!.assignedCount, 1);
    const fence = h.fake.getDoc("programLodgingSourceVersions/program-1")!;
    assert.equal((fence.versions as Record<string, {revision: number}>)
      .published.revision, proposal.revisions.published + 1);
    const next = await h.store.preview("program-1", "manager-1");
    assert.equal(next.revisions.source, proposal.revisions.source);
    assert.equal(next.revisions.inventory, proposal.revisions.inventory);
  });

test("native edits invalidate saved plans before publication", async () => {
  const h = setup();
  const proposal = await h.saveAndApprove();
  h.fake.updateDoc("programRoomBlocks/block", {totalRooms: 2});
  await assert.rejects(h.store.transition("program-1", "manager-1", {
    proposalId: proposal.id, action: "publishGuests", hotelId: null,
    operationId: "publish", expectedWorkflowRevision: 1}), /Stale/);
  assert.equal([...h.fake.docs.keys()].filter((p) =>
    p.startsWith("programStays/")).length, 0);
});

test("private configuration rejects copied CRM fields and unknown demand",
  async () => {
    const h = setup();
    h.fake.updateDoc("programLodgingConfigs/program-1",
      {contactEmail: "private"});
    await assert.rejects(h.store.preview("program-1", "manager-1"),
      /Invalid or foreign/);
    h.fake.setDoc("programLodgingConfigs/program-1", {...h.config,
      demand: [{...h.config.demand[0], guestId: "foreign"}]});
    await assert.rejects(h.store.preview("program-1", "manager-1"),
      /canonical guest/);
  });

test("unbound native assignments cannot become spare planner capacity",
  async () => {
    const h = setup();
    h.fake.setDoc("programStays/legacy", {...h.config,
      guestId: "guest-1", hotelId: "hotel-1", roomBlockId: "block",
      roomLabel: "101", startsAt: Timestamp.fromMillis(start),
      endsAt: Timestamp.fromMillis(end), status: "confirmed"});
    await assert.rejects(h.store.preview("program-1", "manager-1"),
      /verified canonical inventory binding/);
  });

test("canonical contract capacity constrains planner facts", async () => {
  const h = setup();
  h.fake.updateDoc("programRoomBlocks/block", {maxOccupantsPerRoom: 1});
  await assert.rejects(h.store.preview("program-1", "manager-1"),
    /verified contracted occupant capacity/);
});


test("configuration writes use current authority and required revisions",
  async () => {
    const h = setup();
    await assert.rejects(saveCanonicalLodgingConfig(h.dependencies,
      "program-1", "hotelier-1", h.setupConfig, 1), /programCoordinator/);
    assert.equal(await saveCanonicalLodgingConfig(h.dependencies,
      "program-1", "manager-1", h.setupConfig, 1), 2);
    await assert.rejects(saveCanonicalLodgingConfig(h.dependencies,
      "program-1", "manager-1", h.setupConfig, 1), /changed since/);
    assert.equal(h.fake.getDoc("programLodgingConfigs/program-1")!.revision, 2);
  });

test("legacy adoption preserves allocation and checks stay revision",
  async () => {
    const h = setup();
    const proposal = await h.saveAndApprove();
    await h.store.transition("program-1", "manager-1", {
      proposalId: proposal.id, action: "publishGuests", hotelId: null,
      operationId: "publish", expectedWorkflowRevision: 1});
    const stays = [...h.fake.docs].filter(([path]) =>
      path.startsWith("programStays/"));
    for (const [path, row] of stays) {
      const legacy = {...row};
      delete legacy.lodgingPartyId;
      delete legacy.lodgingInventoryId;
      h.fake.setDoc(path, legacy);
    }
    const adoptions = stays.map(([path, row]) => ({stayId: path.split("/")[1],
      partyId: "party", inventoryId: "unit",
      expectedRevision: row.revision as number}));
    await assert.rejects(saveCanonicalLodgingConfig(h.dependencies,
      "program-1", "manager-1", h.setupConfig, 1,
      [{...adoptions[0], expectedRevision: 0}, adoptions[1]]), /changed since/);
    await saveCanonicalLodgingConfig(h.dependencies, "program-1", "manager-1",
      h.setupConfig, 1, adoptions);
    for (const [path, row] of stays) {
      const adopted = h.fake.getDoc(path)!;
      assert.equal(adopted.roomOccupancyId, row.roomOccupancyId);
      assert.equal(adopted.roomLabel, row.roomLabel);
      assert.equal(adopted.lodgingInventoryId, "unit");
    }
  });
