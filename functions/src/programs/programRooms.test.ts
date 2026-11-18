import assert from "node:assert/strict";
import test from "node:test";
import * as admin from "firebase-admin";
import {deps, request, now} from "../shared/testing/programFixtures";
import {FakeFirestore, type FakeData} from
  "../shared/testing/programFirestore";
import {
  getProgramHotelRoomsHandler,
  upsertProgramRoomBlockHandler,
  upsertProgramStayHandler,
} from "./programRooms";

const FUTURE = now.toMillis() + 86_400_000;
const WINDOW_START = 1_800_600_000_000;
const WINDOW_END = 1_800_900_000_000;

const hotel = (id: string, patch: FakeData = {}): FakeData => ({
  programId: "program-1",
  organizerId: "org-1",
  name: `Hotel ${id}`,
  address: null,
  location: null,
  checkInNotes: null,
  contactName: null,
  contactPhoneE164: null,
  active: true,
  createdAt: now,
  updatedAt: now,
  revision: 1,
  ...patch,
});

const guest = (id: string, patch: FakeData = {}): FakeData => ({
  programId: "program-1",
  organizerId: "org-1",
  displayName: `Guest ${id}`,
  householdId: null,
  contactId: null,
  phoneE164: "secret-phone",
  email: "secret@example.com",
  externalReference: null,
  invitationStatus: "invited",
  rsvpStatus: "attending",
  source: "manual",
  groupIds: [],
  createdAt: now,
  updatedAt: now,
  revision: 1,
  ...patch,
});

const block = (id: string, patch: FakeData = {}): FakeData => ({
  programId: "program-1",
  organizerId: "org-1",
  hotelId: "hotel-haveli",
  label: id,
  roomType: null,
  totalRooms: 2,
  assignedCount: 0,
  heldForGroupIds: [],
  startsAt: admin.firestore.Timestamp.fromMillis(WINDOW_START),
  endsAt: admin.firestore.Timestamp.fromMillis(WINDOW_END),
  notes: null,
  createdAt: now,
  updatedAt: now,
  revision: 1,
  ...patch,
});

const stay = (id: string, patch: FakeData = {}): FakeData => ({
  programId: "program-1",
  organizerId: "org-1",
  guestId: id,
  hotelId: "hotel-haveli",
  roomBlockId: null,
  roomLabel: null,
  startsAt: admin.firestore.Timestamp.fromMillis(WINDOW_START),
  endsAt: admin.firestore.Timestamp.fromMillis(WINDOW_END),
  status: "confirmed",
  roomReadyAt: null,
  hotelArrivedAt: null,
  notes: null,
  source: "planner",
  createdAt: now,
  updatedAt: now,
  revision: 1,
  ...patch,
});

const leg = (guestId: string, patch: FakeData = {}): FakeData => ({
  programId: "program-1",
  organizerId: "org-1",
  guestId,
  partyId: null,
  kind: "inbound",
  flightNumber: null,
  carrierCode: null,
  originIata: null,
  destinationIata: null,
  scheduledArrivalAt: null,
  estimatedArrivalAt: null,
  actualArrivalAt: null,
  flightStatus: "unknown",
  flightInstanceId: null,
  arrivalTerminal: null,
  flightRefreshedAt: null,
  flightNextRefreshAt: null,
  international: null,
  pickupPointId: null,
  destinationHotelId: "hotel-haveli",
  destinationLabel: null,
  readiness: "expected",
  readyAt: null,
  claimedByUid: null,
  claimedAt: null,
  manualCurbAt: null,
  manualCurbNote: null,
  passengers: 1,
  luggageUnits: 0,
  requiredCapabilities: [],
  dedicatedVehicle: false,
  source: "planner",
  createdAt: now,
  updatedAt: now,
  revision: 1,
  ...patch,
});

const grant = (uid: string, duties: FakeData[]): FakeData => ({
  organizerId: "org-1",
  programId: "program-1",
  uid,
  displayName: uid,
  phoneLastFour: "0000",
  duties,
  status: "active",
  createdBy: "manager-1",
  createdAt: now,
  expiresAt: admin.firestore.Timestamp.fromMillis(FUTURE),
  revokedBy: null,
  revokedAt: null,
  updatedAt: now,
  revision: 1,
});

const duty = (name: string, hotelIds: string[] = []): FakeData => ({
  duty: name,
  pickupPointIds: [],
  hotelIds,
  expiresAtMillis: FUTURE,
});

const seed = (): Record<string, FakeData> => ({
  "organizers/org-1": {
    hostUserId: "manager-1", ownerUserId: "manager-1",
    hostUserIds: ["manager-1"], hostProfiles: [],
  },
  "organizerPrograms/program-1": {
    organizerId: "org-1", kind: "wedding", title: "Wedding",
    timezone: "Asia/Kolkata", status: "active", capabilities: [],
    transportSettings: {vehicleClasses: []},
    startsAt: admin.firestore.Timestamp.fromMillis(WINDOW_START),
    endsAt: admin.firestore.Timestamp.fromMillis(WINDOW_END),
    createdBy: "manager-1", createdAt: now, updatedAt: now, revision: 1,
  },
  "programHotels/hotel-haveli": hotel("hotel-haveli"),
  "programHotels/hotel-mirrorlake": hotel("hotel-mirrorlake"),
  "programGuests/g-1": guest("g-1"),
  "programGuests/g-2": guest("g-2", {groupIds: ["grp-bride"]}),
  "programGuests/g-3": guest("g-3"),
  "programGuests/g-4": guest("g-4"),
  "programGuestGroups/grp-bride": {
    programId: "program-1", organizerId: "org-1", label: "Bride family",
    memberGuestIds: ["g-2"], createdAt: now, updatedAt: now, revision: 1,
  },
  "programRoomBlocks/blk-general": block("blk-general"),
  "programRoomBlocks/blk-bride": block("blk-bride",
    {label: "Bride family", heldForGroupIds: ["grp-bride"], totalRooms: 1}),
  "programStays/stay-1": stay("stay-1",
    {guestId: "g-1", roomBlockId: "blk-general", roomLabel: "301"}),
  "programStays/stay-2": stay("stay-2",
    {guestId: "g-4", status: "cancelled", roomBlockId: null}),
  "programTravelLegs/leg-2": leg("g-2"),
  "programTravelLegs/leg-3": leg("g-3"),
  "programTravelLegs/leg-noshow": leg("g-4", {readiness: "noShow"}),
  "programStaffGrants/program-1__desk-1":
    grant("desk-1", [duty("hotelDesk", ["hotel-haveli"])]),
  "programStaffGrants/program-1__desk-all":
    grant("desk-all", [duty("hotelDesk")]),
  "programStaffGrants/program-1__coord-1":
    grant("coord-1", [duty("programCoordinator")]),
  "programStaffGrants/program-1__staff-other":
    grant("staff-other", [duty("guestRelations")]),
});

const view = (db: FakeFirestore, uid: string, hotelId = "hotel-haveli") =>
  getProgramHotelRoomsHandler(request({
    programId: "program-1", hotelId,
  }, uid), deps(db));

const upsertStay = (db: FakeFirestore, uid: string,
  data: Record<string, unknown> = {}) =>
  upsertProgramStayHandler(request({
    programId: "program-1", guestId: "g-2", hotelId: "hotel-haveli",
    ...data,
  }, uid), deps(db));

const upsertBlock = (db: FakeFirestore, uid: string,
  data: Record<string, unknown> = {}) =>
  upsertProgramRoomBlockHandler(request({
    programId: "program-1", hotelId: "hotel-haveli", label: "New block",
    totalRooms: 4, heldForGroupIds: [],
    startsAtMillis: WINDOW_START, endsAtMillis: WINDOW_END,
    ...data,
  }, uid), deps(db));

const denied = (err: unknown) =>
  (err as {code?: string}).code === "permission-denied";
const notFound = (err: unknown) =>
  (err as {code?: string}).code === "not-found";
const precondition = (err: unknown) =>
  (err as {code?: string}).code === "failed-precondition";
const aborted = (err: unknown) =>
  (err as {code?: string}).code === "aborted";

test("hotel desk reads blocks, stays, and unplaced guests without PII",
  async () => {
    const result = await view(new FakeFirestore(seed()), "desk-1");
    assert.equal(result.hotelName, "Hotel hotel-haveli");
    const general = result.roomBlocks.find((b) =>
      b.roomBlockId === "blk-general")!;
    // One live stay consumes one of two rooms; cancelled stay-2 holds none.
    assert.equal(general.totalRooms, 2);
    assert.equal(general.assignedCount, 1);
    assert.equal(general.remainingRooms, 1);
    const bride = result.roomBlocks.find((b) =>
      b.roomBlockId === "blk-bride")!;
    assert.equal(bride.remainingRooms, 1);
    assert.deepEqual(bride.heldForGroupIds, ["grp-bride"]);
    const stays = result.stays.map((s) => s.guestId).sort();
    assert.deepEqual(stays, ["g-1", "g-4"]);
    const s1 = result.stays.find((s) => s.stayId === "stay-1")!;
    assert.equal(s1.guestDisplayName, "Guest g-1");
    assert.equal(s1.roomLabel, "301");
    // g-2 and g-3 are routed inbound with no live stay; g-4's stay is
    // cancelled so they re-appear for re-placement.
    const unplaced = result.unplacedGuests.map((u) => u.guestId).sort();
    assert.deepEqual(unplaced, ["g-2", "g-3", "g-4"]);
    // Group-held inventory wins for the bride-side guest.
    const g2 = result.unplacedGuests.find((u) => u.guestId === "g-2")!;
    assert.equal(g2.suggestedRoomBlockId, "blk-bride");
    // Least privilege: names only, no contact fields anywhere.
    assert.equal(JSON.stringify(result).includes("secret"), false);
  });

test("scoped desk staff and non-desk duties are rejected", async () => {
  await assert.rejects(
    view(new FakeFirestore(seed()), "desk-1", "hotel-mirrorlake"), denied);
  await assert.rejects(
    view(new FakeFirestore(seed()), "staff-other"), denied);
  const unscoped = await view(new FakeFirestore(seed()), "desk-all");
  assert.equal(unscoped.hotelId, "hotel-haveli");
  const manager = await view(new FakeFirestore(seed()), "manager-1");
  assert.equal(manager.hotelId, "hotel-haveli");
});

test("cross-program or unknown hotels read as not-found", async () => {
  const db = new FakeFirestore(seed());
  await assert.rejects(view(db, "manager-1", "hotel-nope"), notFound);
});

test("stay upsert assigns a room and maintains the block rollup", async () => {
  const db = new FakeFirestore(seed());
  const created = await upsertStay(db, "desk-1", {
    guestId: "g-2", roomBlockId: "blk-bride", roomLabel: "512",
    status: "confirmed",
  });
  assert.equal(created.alreadyApplied, false);
  const doc = db.getDoc(`programStays/${created.entityId}`)!;
  assert.equal(doc.roomBlockId, "blk-bride");
  assert.equal(doc.roomLabel, "512");
  assert.equal(doc.status, "confirmed");
  assert.equal(doc.source, "manual");
  const bride = db.getDoc("programRoomBlocks/blk-bride")!;
  assert.equal(bride.assignedCount, 1);
  // Checkout releases the room and the rollup settles back.
  await upsertStay(db, "desk-1", {
    stayId: created.entityId, guestId: "g-2",
    expectedRevision: created.revision, status: "checkedOut",
  });
  const released = db.getDoc("programRoomBlocks/blk-bride")!;
  assert.equal(released.assignedCount, 0);
});

test("full blocks reject new assignments", async () => {
  const db = new FakeFirestore(seed());
  db.setDoc("programRoomBlocks/blk-bride",
    {...block("blk-bride", {label: "Bride family",
      heldForGroupIds: ["grp-bride"], totalRooms: 1}), assignedCount: 0});
  db.setDoc("programStays/stay-full", stay("stay-full",
    {guestId: "g-3", roomBlockId: "blk-bride", status: "held"}));
  await assert.rejects(upsertStay(db, "desk-1", {
    guestId: "g-2", roomBlockId: "blk-bride", status: "confirmed",
  }), precondition);
  // Ad-hoc assignment outside the block still works.
  const ok = await upsertStay(db, "desk-1", {
    guestId: "g-2", roomBlockId: null, roomLabel: "Lobby pullout",
  });
  assert.ok(ok.entityId);
});

test("stale revisions abort; scoped desks cannot write other hotels",
  async () => {
    const db = new FakeFirestore(seed());
    await assert.rejects(upsertStay(db, "desk-1", {
      stayId: "stay-1", guestId: "g-1", expectedRevision: 999,
      roomLabel: "999",
    }), aborted);
    await assert.rejects(upsertStay(db, "desk-1", {
      guestId: "g-3", hotelId: "hotel-mirrorlake",
    }), denied);
  });

test("coordinators define blocks; desk staff and capacity cuts are refused",
  async () => {
    const db = new FakeFirestore(seed());
    await assert.rejects(upsertBlock(db, "desk-1", {}), denied);
    const created = await upsertBlock(db, "coord-1", {totalRooms: 3});
    const doc = db.getDoc(`programRoomBlocks/${created.entityId}`)!;
    assert.equal(doc.label, "New block");
    assert.equal(doc.assignedCount, 0);
    // Shrinking below live occupancy fails.
    db.setDoc("programStays/stay-a", stay("stay-a",
      {guestId: "g-2", roomBlockId: created.entityId, status: "held"}));
    db.setDoc("programStays/stay-b", stay("stay-b",
      {guestId: "g-3", roomBlockId: created.entityId, status: "confirmed"}));
    await assert.rejects(upsertBlock(db, "coord-1", {
      roomBlockId: created.entityId,
      expectedRevision: created.revision,
      totalRooms: 1,
    }), precondition);
    const ok = await upsertBlock(db, "coord-1", {
      roomBlockId: created.entityId,
      expectedRevision: created.revision,
      totalRooms: 2, label: "Renamed",
    });
    assert.equal(ok.revision > created.revision, true);
    const updated = db.getDoc(`programRoomBlocks/${created.entityId}`)!;
    assert.equal(updated.label, "Renamed");
    assert.equal(updated.assignedCount, 2);
  });


test("explicit roommates use one room and keep identity after label edits",
  async () => {
    const db = new FakeFirestore(seed());
    db.updateDoc("programRoomBlocks/blk-general",
      {totalRooms: 1, maxOccupantsPerRoom: 2, assignedCount: 2});
    const joined = await upsertStay(db, "desk-1", {
      roomBlockId: "blk-general", shareWithStayId: "stay-1",
      shareWithStayRevision: 1, roomLabel: "Different display label",
    });
    assert.equal(db.getDoc(`programStays/${joined.entityId}`)!.roomOccupancyId,
      "stay-1");
    assert.equal(db.getDoc("programRoomBlocks/blk-general")!.assignedCount, 1);
    const board = await view(db, "desk-1");
    assert.equal(board.roomBlocks.find((b) => b.roomBlockId ===
      "blk-general")!.remainingRooms, 0);
    await assert.rejects(upsertStay(db, "desk-1", {
      guestId: "g-3", roomBlockId: "blk-general", roomLabel: "301",
    }), precondition);
    await assert.rejects(upsertStay(db, "desk-1", {
      guestId: "g-3", roomBlockId: "blk-general", shareWithStayId: "stay-1",
      shareWithStayRevision: 1,
    }), precondition);
    await assert.rejects(upsertStay(db, "desk-1", {
      stayId: joined.entityId, expectedRevision: joined.revision,
      separateRoom: true,
    }), precondition);
  });

test("turnover and contract windows use local nights", async () => {
  const db = new FakeFirestore(seed());
  const turnover = WINDOW_START + 86400000;
  db.updateDoc("programRoomBlocks/blk-general", {totalRooms: 1});
  db.updateDoc("programStays/stay-1",
    {endsAt: admin.firestore.Timestamp.fromMillis(turnover)});
  const added = await upsertStay(db, "desk-1", {
    roomBlockId: "blk-general", startsAtMillis: turnover,
    endsAtMillis: WINDOW_END,
  });
  assert.equal(db.getDoc("programRoomBlocks/blk-general")!.assignedCount, 1);
  await assert.rejects(upsertStay(db, "desk-1", {
    stayId: added.entityId, expectedRevision: added.revision,
    startsAtMillis: WINDOW_START,
  }), precondition);
  await assert.rejects(upsertStay(db, "desk-1", {
    stayId: added.entityId, expectedRevision: added.revision,
    endsAtMillis: WINDOW_END + 86400000,
  }), precondition);
  await assert.rejects(upsertBlock(db, "manager-1", {
    roomBlockId: "blk-general",
    expectedRevision: db.getDoc("programRoomBlocks/blk-general")!.revision,
    endsAtMillis: turnover,
  }), precondition);
});

test("missing revisions and stale roommate reviews cannot mutate", async () => {
  const db = new FakeFirestore(seed());
  await assert.rejects(upsertStay(db, "manager-1", {
    stayId: "stay-1", guestId: "g-1", roomLabel: "999",
  }), precondition);
  await assert.rejects(upsertBlock(db, "manager-1", {
    roomBlockId: "blk-general",
  }), precondition);
  await assert.rejects(upsertStay(db, "manager-1", {
    roomBlockId: "blk-general", shareWithStayId: "stay-1",
  }), precondition);
  await assert.rejects(upsertStay(db, "manager-1", {
    roomBlockId: "blk-general", shareWithStayId: "stay-1",
    shareWithStayRevision: 999,
  }), aborted);
});

test("cross-hotel simultaneous assignments have one winner", async () => {
  const db = new FakeFirestore(seed());
  const result = await Promise.allSettled([
    upsertStay(db, "manager-1", {guestId: "g-3"}),
    upsertStay(db, "manager-1", {guestId: "g-3", hotelId: "hotel-mirrorlake"}),
  ]);
  assert.equal(result.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(result.filter((r) => r.status === "rejected").length, 1);
});

test("roommate writes serialize and cannot exceed occupancy", async () => {
  const db = new FakeFirestore(seed());
  db.updateDoc("programRoomBlocks/blk-general",
    {totalRooms: 1, maxOccupantsPerRoom: 2});
  const result = await Promise.allSettled(["g-2", "g-3"].map((guestId) =>
    upsertStay(db, "manager-1", {guestId, roomBlockId: "blk-general",
      shareWithStayId: "stay-1", shareWithStayRevision: 1})));
  assert.equal(result.filter((r) => r.status === "fulfilled").length, 1);
});

test("a concurrent check-in invalidates an earlier room edit", async () => {
  const db = new FakeFirestore(seed());
  db.beforeCommit = async () => {
    db.beforeCommit = undefined;
    db.updateDoc("programStays/stay-1", {status: "checkedIn", revision: 2});
  };
  await assert.rejects(upsertStay(db, "manager-1", {
    stayId: "stay-1", guestId: "g-1", expectedRevision: 1, roomLabel: "New",
  }), aborted);
  await assert.rejects(upsertStay(db, "manager-1", {
    stayId: "stay-1", guestId: "g-1", expectedRevision: 2, roomLabel: "New",
  }), precondition);
  assert.equal(db.getDoc("programStays/stay-1")!.roomLabel, "301");
});

test("sharing never follows a household and unknown occupancy stays single",
  async () => {
    const db = new FakeFirestore(seed());
    db.updateDoc("programGuests/g-1", {householdId: "family"});
    db.updateDoc("programGuests/g-2", {householdId: "family"});
    await assert.rejects(upsertStay(db, "manager-1", {
      roomBlockId: "blk-general", shareWithStayId: "stay-1",
      shareWithStayRevision: 1,
    }), precondition);
    const added = await upsertStay(db, "manager-1", {
      roomBlockId: "blk-general", roomLabel: "301",
    });
    const saved = db.getDoc(`programStays/${added.entityId}`)!;
    assert.notEqual(saved.roomOccupancyId,
      "stay-1");
    assert.equal(db.getDoc("programRoomBlocks/blk-general")!.assignedCount, 2);
  });


test("checked-in status cannot be downgraded to bypass allocation locks",
  async () => {
    const db = new FakeFirestore(seed());
    db.updateDoc("programStays/stay-1", {status: "checkedIn", revision: 2});
    for (const status of ["held", "confirmed", "cancelled"]) {
      await assert.rejects(upsertStay(db, "desk-1", {
        stayId: "stay-1", guestId: "g-1", expectedRevision: 2, status,
      }), precondition);
      assert.equal(db.getDoc("programStays/stay-1")!.status, "checkedIn");
      await assert.rejects(upsertStay(db, "desk-1", {
        stayId: "stay-1", guestId: "g-1", expectedRevision: 2,
        separateRoom: true, roomLabel: "999",
      }), precondition);
    }
    await upsertStay(db, "desk-1", {
      stayId: "stay-1", guestId: "g-1", expectedRevision: 2,
      status: "checkedOut",
    });
    assert.equal(db.getDoc("programStays/stay-1")!.status, "checkedOut");
    assert.equal(db.getDoc("programRoomBlocks/blk-general")!.assignedCount, 0);
  });


test("desk updates preserve planner bindings until an allocation moves",
  async () => {
    const db = new FakeFirestore(seed());
    db.updateDoc("programStays/stay-1", {lodgingPartyId: "party",
      lodgingInventoryId: "unit"});
    const ready = await upsertStay(db, "desk-1", {stayId: "stay-1",
      guestId: "g-1", expectedRevision: 1, markRoomReady: true});
    assert.equal(db.getDoc("programStays/stay-1")!.lodgingPartyId, "party");
    assert.equal(db.getDoc("programStays/stay-1")!.lodgingInventoryId, "unit");
    await upsertStay(db, "desk-1", {stayId: "stay-1", guestId: "g-1",
      expectedRevision: ready.revision, roomLabel: "302"});
    const moved = db.getDoc("programStays/stay-1")!;
    assert.equal(moved.lodgingPartyId, undefined);
    assert.equal(moved.lodgingInventoryId, undefined);
  });
