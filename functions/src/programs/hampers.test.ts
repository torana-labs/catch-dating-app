import assert from "node:assert/strict";
import test from "node:test";
import {baseSeed, deps, request, now} from "../shared/testing/programFixtures";
import {FakeFirestore, type FakeData} from
  "../shared/testing/programFirestore";
import {mintWebLinkToken} from "./programWebLinks";
import {createProgramAssetUploadHandler} from "./programAssets";
import {FakeProgramBucket} from "./programAssetFixture";
import {
  getProgramHamperWebViewHandler,
  hamperRoomKey,
  upsertProgramHamperHandler,
} from "./hampers";
import {contractValidator} from "../shared/contractTestValidators";

const validateDocument = contractValidator("ProgramHamperDocument");
const validateView =
  contractValidator("ProgramHamperWebViewCallableResponse");
const SECRET = "test-secret";
const code = (expected: string) => (err: unknown) =>
  (err as {code?: string}).code === expected;

function stay(guestId: string, hotelId: string, roomLabel: string | null):
  FakeData {
  return {programId: "program-1", organizerId: "org-1", guestId, hotelId,
    roomBlockId: null, roomLabel, startsAt: now, endsAt: now,
    status: "confirmed", roomReadyAt: null, hotelArrivedAt: null,
    notes: null, source: "planner", createdAt: now, updatedAt: now,
    revision: 1};
}

function setup() {
  const db = new FakeFirestore({
    ...baseSeed(),
    "programStays/stay-1": stay("guest-1", "hotel-1", "214"),
    "programStays/stay-2": stay("guest-2", "hotel-1", "214"),
    "programStays/stay-3": stay("guest-3", "hotel-1", "Room 9"),
    "programStays/stay-4": stay("guest-4", "hotel-2", "101"),
  });
  const bucket = new FakeProgramBucket();
  const hamperDeps = deps(db, {secret: () => SECRET,
    storageBucket: () => bucket.asBucket()});
  const porter = mintWebLinkToken({kind: "hamperPorter",
    programId: "program-1", subjectId: "hotel-1",
    expiresAtMillis: now.toMillis() + 86_400_000}, SECRET);
  return {db, bucket, hamperDeps, porter};
}

test("room keys are stable and fall back to the stay", () => {
  assert.equal(hamperRoomKey("Room 214", "s"), "room-214");
  assert.equal(hamperRoomKey(null, "Stay_9"), "stay-stay-9");
});

test("a porter marks a room placed with a photo; the list shows it",
  async () => {
    const ctx = setup();
    const before = await getProgramHamperWebViewHandler(
      request({token: ctx.porter}, "anyone"), ctx.hamperDeps);
    assert.equal(validateView(before), true,
      JSON.stringify(validateView.errors));
    assert.deepEqual(before.rooms.map((room) =>
      [room.roomLabel, room.guestCount]), [["214", 2], ["Room 9", 1]]);

    const intent = await createProgramAssetUploadHandler(request({
      kind: "hamper", token: ctx.porter, contentType: "image/jpeg",
      sizeBytes: 4096, requestId: "hamper-photo-1"}, "anyone"),
    ctx.hamperDeps);
    ctx.bucket.put(intent.storagePath, {programId: "program-1",
      subject: "hotel-1"});
    const placed = await upsertProgramHamperHandler(request({
      token: ctx.porter, stayId: "stay-2", status: "placed",
      photoAssetId: intent.assetId, requestId: "hamper-request-1"},
    "anyone"), ctx.hamperDeps);
    assert.equal(placed.roomKey, "214");
    const doc = ctx.db.getDoc("programHampers/program-1_hotel-1_214")!;
    assert.equal(validateDocument(doc), true,
      JSON.stringify(validateDocument.errors));
    assert.deepEqual(doc.placedBy, {kind: "porter", uid: null});

    const after = await getProgramHamperWebViewHandler(
      request({token: ctx.porter}, "anyone"), ctx.hamperDeps);
    assert.deepEqual(after.counts, {rooms: 2, placed: 1});
    assert.equal(after.rooms[0].photoUrl,
      `https://signed.example/${intent.storagePath}`);
  });

test("porters stay at their hotel; hotel desk staff in their scope",
  async () => {
    const ctx = setup();
    await assert.rejects(upsertProgramHamperHandler(request({
      token: ctx.porter, stayId: "stay-4", status: "placed",
      requestId: "hamper-request-2"}, "anyone"), ctx.hamperDeps),
    code("not-found"));
    await assert.rejects(upsertProgramHamperHandler(request({
      programId: "program-1", stayId: "stay-4", status: "placed",
      requestId: "hamper-request-3"}, "hotelier-1"), ctx.hamperDeps),
    code("not-found"));
    const staff = await upsertProgramHamperHandler(request({
      programId: "program-1", stayId: "stay-3", status: "placed",
      requestId: "hamper-request-4"}, "hotelier-1"), ctx.hamperDeps);
    assert.equal(staff.roomKey, "room-9");
    await assert.rejects(upsertProgramHamperHandler(request({
      programId: "program-1", stayId: "stay-3", status: "placed",
      requestId: "hamper-request-5"}, "greeter-1"), ctx.hamperDeps),
    code("permission-denied"));
    // A household link never opens the porters' list.
    const vendor = mintWebLinkToken({kind: "vendorRunSheet",
      programId: "program-1", subjectId: "hotel-1",
      expiresAtMillis: now.toMillis() + 1000}, SECRET);
    await assert.rejects(getProgramHamperWebViewHandler(
      request({token: vendor}, "anyone"), ctx.hamperDeps),
    code("permission-denied"));
  });
