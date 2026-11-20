import assert from "node:assert/strict";
import test from "node:test";
import * as admin from "firebase-admin";
import {deps, request, now} from "../shared/testing/programFixtures";
import {FakeFirestore, type FakeData} from
  "../shared/testing/programFirestore";
import {getProgramHotelRoomsHandler} from "./programRooms";
import {
  programHotelRoomViewId,
  reconcileProgramHotelRoomView,
} from "./programHotelRoomViews";

const WINDOW_START = 1_800_600_000_000;
const WINDOW_END = 1_800_900_000_000;
const at = (millis: number) => admin.firestore.Timestamp.fromMillis(millis);

const own = {programId: "program-1", organizerId: "org-1"};
const guest = (id: string, patch: FakeData = {}): FakeData => ({...own,
  displayName: `Guest ${id}`, householdId: null, contactId: null,
  phoneE164: "+919800000000", email: "secret@example.com", groupIds: [],
  rsvpStatus: "attending", createdAt: now, updatedAt: now, revision: 1,
  ...patch});
const block = (id: string, patch: FakeData = {}): FakeData => ({...own,
  hotelId: "hotel-haveli", label: id, roomType: null, totalRooms: 2,
  assignedCount: 0, heldForGroupIds: [], startsAt: at(WINDOW_START),
  endsAt: at(WINDOW_END), notes: "rate card 9800000000", createdAt: now,
  updatedAt: now, revision: 1, ...patch});
const stay = (id: string, patch: FakeData = {}): FakeData => ({...own,
  guestId: id, hotelId: "hotel-haveli", roomBlockId: null, roomLabel: null,
  startsAt: at(WINDOW_START), endsAt: at(WINDOW_END), status: "confirmed",
  roomReadyAt: null, hotelArrivedAt: null, notes: "allergic, call mum",
  source: "planner", createdAt: now, updatedAt: now, revision: 1, ...patch});
const leg = (guestId: string, patch: FakeData = {}): FakeData => ({...own,
  guestId, partyId: null, kind: "inbound", flightNumber: "AI 101",
  destinationHotelId: "hotel-haveli", readiness: "expected", passengers: 1,
  createdAt: now, updatedAt: now, revision: 1, ...patch});

const seed = (): Record<string, FakeData> => ({
  "organizers/org-1": {hostUserId: "manager-1", ownerUserId: "manager-1",
    hostUserIds: ["manager-1"], hostProfiles: []},
  "organizerPrograms/program-1": {organizerId: "org-1", kind: "wedding",
    title: "Wedding", timezone: "Asia/Kolkata", status: "active",
    capabilities: [], transportSettings: {vehicleClasses: []},
    startsAt: at(WINDOW_START), endsAt: at(WINDOW_END),
    createdBy: "manager-1", createdAt: now, updatedAt: now, revision: 1},
  "programHotels/hotel-haveli": {...own, name: "Haveli",
    contactPhoneE164: "+919811111111", active: true, revision: 1},
  "programGuests/g-1": guest("g-1"),
  "programGuests/g-2": guest("g-2", {groupIds: ["grp-bride"]}),
  "programGuests/g-3": guest("g-3"),
  "programGuests/g-4": guest("g-4"),
  "programRoomBlocks/blk-general": block("blk-general"),
  "programRoomBlocks/blk-bride": block("blk-bride",
    {label: "Bride family", heldForGroupIds: ["grp-bride"], totalRooms: 1}),
  "programStays/stay-1": stay("stay-1",
    {guestId: "g-1", roomBlockId: "blk-general", roomLabel: "301",
      revision: 4}),
  "programStays/stay-2": stay("stay-2", {guestId: "g-4",
    status: "cancelled"}),
  "programTravelLegs/leg-2": leg("g-2"),
  "programTravelLegs/leg-3": leg("g-3"),
  "programTravelLegs/leg-noshow": leg("g-4", {readiness: "noShow"}),
});

const viewPath = `programHotelRoomViews/${programHotelRoomViewId(
  "program-1", "hotel-haveli")}`;

test("a room board is the callable's board, with no contact or note",
  async () => {
    const db = new FakeFirestore(seed());
    await reconcileProgramHotelRoomView(db as never, "program-1",
      "hotel-haveli");
    const view = db.getDoc(viewPath) as Record<string, unknown>;
    const board = await getProgramHotelRoomsHandler(request({
      programId: "program-1", hotelId: "hotel-haveli"}, "manager-1"),
    deps(db));
    const rest: Record<string, unknown> = {...board};
    delete rest.accessExpiresAtMillis;
    delete rest.generatedAtMillis;
    assert.deepEqual({...view}, {...rest, organizerId: "org-1",
      overflow: false, version: 1});
    const stays = view.stays as Array<Record<string, unknown>>;
    assert.equal(stays.find((s) => s.stayId === "stay-1")!.revision, 4);
    const unplaced = view.unplacedGuests as Array<Record<string, unknown>>;
    assert.deepEqual(unplaced.map((u) => u.guestId), ["g-2", "g-3", "g-4"]);
    assert.equal(unplaced[0].suggestedRoomBlockId, "blk-bride");
    const text = JSON.stringify(view);
    for (const secret of ["9800000000", "9811111111", "secret@", "mum",
      "AI 101"]) {
      assert.equal(text.includes(secret), false, secret);
    }
  });

test("a board is written only on change and follows its sources",
  async () => {
    const db = new FakeFirestore(seed());
    await reconcileProgramHotelRoomView(db as never, "program-1",
      "hotel-haveli");
    const first = db.getDoc(viewPath);
    await reconcileProgramHotelRoomView(db as never, "program-1",
      "hotel-haveli");
    assert.deepEqual(db.getDoc(viewPath), first);
    db.setDoc("programStays/stay-3", stay("stay-3", {guestId: "g-2",
      roomBlockId: "blk-bride", revision: 1}));
    await reconcileProgramHotelRoomView(db as never, "program-1",
      "hotel-haveli");
    const next = db.getDoc(viewPath) as Record<string, unknown>;
    const blocks = next.roomBlocks as Array<Record<string, unknown>>;
    assert.equal(blocks.find((b) => b.roomBlockId === "blk-bride")!
      .remainingRooms, 0);
    assert.deepEqual((next.unplacedGuests as Array<{guestId: string}>)
      .map((u) => u.guestId), ["g-3", "g-4"]);
  });

test("a hotel that left the programme loses its board", async () => {
  const db = new FakeFirestore(seed());
  await reconcileProgramHotelRoomView(db as never, "program-1",
    "hotel-haveli");
  assert.ok(db.getDoc(viewPath));
  db.deleteDoc("programHotels/hotel-haveli");
  await reconcileProgramHotelRoomView(db as never, "program-1",
    "hotel-haveli");
  assert.equal(db.getDoc(viewPath), undefined);
});

test("a board past the complete-read cap overflows with empty lists",
  async () => {
    const data = seed();
    for (let i = 0; i < 501; i++) {
      data[`programRoomBlocks/b-${i}`] = block(`b-${i}`);
    }
    const db = new FakeFirestore(data);
    await reconcileProgramHotelRoomView(db as never, "program-1",
      "hotel-haveli");
    const view = db.getDoc(viewPath) as Record<string, unknown>;
    assert.equal(view.overflow, true);
    assert.deepEqual(view.roomBlocks, []);
    assert.deepEqual(view.stays, []);
  });
