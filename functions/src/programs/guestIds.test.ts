import assert from "node:assert/strict";
import test from "node:test";
import * as admin from "firebase-admin";
import {baseSeed, deps, request, now} from "../shared/testing/programFixtures";
import {FakeFirestore, type FakeData} from
  "../shared/testing/programFirestore";
import {mintHouseholdToken} from "../programRsvp/rsvpLinkTokens";
import {issueProgramWebLinkHandler, mintWebLinkToken} from
  "./programWebLinks";
import {createProgramAssetUploadHandler} from "./programAssets";
import {FakeProgramBucket} from "./programAssetFixture";
import {
  decideProgramGuestIdHandler,
  getProgramHotelHandoverHandler,
  listProgramIdTrackerHandler,
  submitProgramGuestIdHandler,
} from "./guestIds";
import {contractValidator} from "../shared/contractTestValidators";

const validateDocument = contractValidator("ProgramGuestIdDocument");
const validateTracker =
  contractValidator("ProgramIdTrackerCallableResponse");
const validateHandover =
  contractValidator("ProgramHotelHandoverCallableResponse");

const SECRET = "test-secret";
const code = (expected: string) => (err: unknown) =>
  (err as {code?: string}).code === expected;
const stamp = admin.firestore.Timestamp.fromMillis;

function seed(): Record<string, FakeData> {
  const base = baseSeed();
  const stay = (guestId: string) => ({programId: "program-1",
    organizerId: "org-1", guestId, hotelId: "hotel-1", roomBlockId: null,
    roomLabel: "214", startsAt: stamp(now.toMillis() + 86_400_000),
    endsAt: stamp(now.toMillis() + 3 * 86_400_000), status: "confirmed",
    roomReadyAt: null, hotelArrivedAt: null, notes: null, source: "planner",
    createdAt: now, updatedAt: now, revision: 1});
  return {
    ...base,
    "organizers/org-1": {...base["organizers/org-1"]!,
      name: "Meher Shah Weddings"},
    "programGuests/guest-1": {...base["programGuests/guest-1"]!,
      householdId: "house-1"},
    "programGuests/guest-2": {...base["programGuests/guest-2"]!,
      householdId: "house-1"},
    "programHouseholds/house-1": {programId: "program-1",
      organizerId: "org-1", label: "Mehra family",
      memberGuestIds: ["guest-1", "guest-2"]},
    "programStays/stay-1": stay("guest-1"),
    "programStays/stay-2": stay("guest-2"),
  };
}

function setup() {
  const db = new FakeFirestore(seed());
  const bucket = new FakeProgramBucket();
  const assetDeps = deps(db, {secret: () => SECRET,
    storageBucket: () => bucket.asBucket()});
  const token = mintHouseholdToken({programId: "program-1",
    householdId: "house-1", expiresAtMillis: now.toMillis() + 86_400_000},
  SECRET);
  return {db, bucket, assetDeps, token};
}

async function upload(ctx: ReturnType<typeof setup>, requestId: string) {
  const intent = await createProgramAssetUploadHandler(request({
    kind: "guestId", token: ctx.token, contentType: "image/jpeg",
    sizeBytes: 2048, requestId}, "anyone"), ctx.assetDeps);
  ctx.bucket.put(intent.storagePath, {programId: "program-1",
    subject: "house-1"});
  return intent;
}

test("an ID upload is signed to the household and verified on submit",
  async () => {
    const ctx = setup();
    const front = await upload(ctx, "front-request-1");
    assert.match(front.storagePath, /^programs\/program-1\/guestIds\//);
    assert.equal(ctx.bucket.policies[0].fields["x-goog-meta-subject"],
      "house-1");
    const saved = await submitProgramGuestIdHandler(request({
      token: ctx.token, guestId: "guest-1", idKind: "aadhaar",
      numberLast4: "4821", frontAssetId: front.assetId,
      requestId: "submit-request-1"}, "anyone"), ctx.assetDeps);
    assert.equal(saved.status, "submitted");
    const doc = ctx.db.getDoc("programGuestIds/program-1_guest-1")!;
    assert.equal(validateDocument(doc), true,
      JSON.stringify(validateDocument.errors));
    assert.equal(doc.frontPath, front.storagePath);

    // Replay returns the stored result without a second write.
    const replay = await submitProgramGuestIdHandler(request({
      token: ctx.token, guestId: "guest-1", idKind: "aadhaar",
      numberLast4: "4821", frontAssetId: front.assetId,
      requestId: "submit-request-1"}, "anyone"), ctx.assetDeps);
    assert.equal(replay.revision, saved.revision);
  });

test("IDs are limited to the household and to matching uploads",
  async () => {
    const ctx = setup();
    const front = await upload(ctx, "front-request-2");
    await assert.rejects(submitProgramGuestIdHandler(request({
      token: ctx.token, guestId: "guest-3", idKind: "passport",
      frontAssetId: front.assetId, requestId: "submit-request-2"},
    "anyone"), ctx.assetDeps), code("permission-denied"));

    // An object bound to another household is rejected and deleted.
    const stray = "programs/program-1/guestIds/guestId_" + "b".repeat(40);
    ctx.bucket.put(stray, {programId: "program-1", subject: "house-9"});
    await assert.rejects(submitProgramGuestIdHandler(request({
      token: ctx.token, guestId: "guest-1", idKind: "passport",
      frontAssetId: "guestId_" + "b".repeat(40),
      requestId: "submit-request-3"}, "anyone"), ctx.assetDeps),
    code("failed-precondition"));
    assert.deepEqual(ctx.bucket.deleted, [stray]);

    await assert.rejects(createProgramAssetUploadHandler(request({
      kind: "guestId", token: "bad.token-value-here", contentType:
        "image/jpeg", sizeBytes: 10, requestId: "front-request-9"},
    "anyone"), ctx.assetDeps), code("unauthenticated"));
  });

test("guest relations accept or ask again under a revision fence",
  async () => {
    const ctx = setup();
    const front = await upload(ctx, "front-request-4");
    const saved = await submitProgramGuestIdHandler(request({
      token: ctx.token, guestId: "guest-1", idKind: "aadhaar",
      frontAssetId: front.assetId, requestId: "submit-request-4"},
    "anyone"), ctx.assetDeps);
    await assert.rejects(decideProgramGuestIdHandler(request({
      programId: "program-1", guestId: "guest-1", decision: "accept",
      expectedRevision: saved.revision, requestId: "decide-request-0"},
    "greeter-1"), ctx.assetDeps), code("permission-denied"));
    const asked = await decideProgramGuestIdHandler(request({
      programId: "program-1", guestId: "guest-1", decision: "askAgain",
      note: "The photo is blurred", expectedRevision: saved.revision,
      requestId: "decide-request-1"}, "manager-1"), ctx.assetDeps);
    assert.equal(asked.status, "askedAgain");
    await assert.rejects(decideProgramGuestIdHandler(request({
      programId: "program-1", guestId: "guest-1", decision: "accept",
      expectedRevision: saved.revision, requestId: "decide-request-2"},
    "manager-1"), ctx.assetDeps), code("aborted"));

    // A new photo replaces the old file and waits for a check again.
    const again = await upload(ctx, "front-request-5");
    const resubmitted = await submitProgramGuestIdHandler(request({
      token: ctx.token, guestId: "guest-1", idKind: "aadhaar",
      frontAssetId: again.assetId, requestId: "submit-request-5"},
    "anyone"), ctx.assetDeps);
    assert.equal(resubmitted.status, "submitted");
    assert.deepEqual(ctx.bucket.deleted, [front.storagePath]);
  });

test("the tracker counts staying guests and signs image URLs", async () => {
  const ctx = setup();
  const front = await upload(ctx, "front-request-6");
  await submitProgramGuestIdHandler(request({token: ctx.token,
    guestId: "guest-1", idKind: "passport", numberLast4: "z123",
    frontAssetId: front.assetId, requestId: "submit-request-6"}, "anyone"),
  ctx.assetDeps);
  const tracker = await listProgramIdTrackerHandler(request({
    programId: "program-1"}, "manager-1"), ctx.assetDeps);
  assert.equal(validateTracker(tracker), true,
    JSON.stringify(validateTracker.errors));
  assert.deepEqual(tracker.counts, {staying: 2, idsIn: 1, toCheck: 1,
    missing: 1, passports: 1});
  const row = tracker.rows.find((entry) => entry.guestId === "guest-1")!;
  assert.equal(row.numberLast4, "Z123");
  assert.equal(row.frontUrl, `https://signed.example/${front.storagePath}`);
  assert.deepEqual(tracker.hotels.find((hotel) =>
    hotel.hotelId === "hotel-1")?.staying, 2);
});

test("the hotel sees accepted IDs only and each look is recorded",
  async () => {
    const ctx = setup();
    const front = await upload(ctx, "front-request-7");
    const saved = await submitProgramGuestIdHandler(request({
      token: ctx.token, guestId: "guest-1", idKind: "aadhaar",
      numberLast4: "4821", frontAssetId: front.assetId,
      requestId: "submit-request-7"}, "anyone"), ctx.assetDeps);
    const link = await issueProgramWebLinkHandler(request({
      programId: "program-1", kind: "hotelHandover", subjectId: "hotel-1"},
    "manager-1"), ctx.assetDeps);
    const before = await getProgramHotelHandoverHandler(
      request({token: link.token}, "anyone"), ctx.assetDeps);
    assert.equal(validateHandover(before), true,
      JSON.stringify(validateHandover.errors));
    assert.equal(before.organizerName, "Meher Shah Weddings");
    assert.equal(before.rooms.length, 1);
    assert.deepEqual(before.rooms[0].guests.map((guest) =>
      [guest.idStatus, guest.frontUrl]), [["pending", null],
      ["missing", null]]);

    await decideProgramGuestIdHandler(request({programId: "program-1",
      guestId: "guest-1", decision: "accept",
      expectedRevision: saved.revision, requestId: "decide-request-7"},
    "manager-1"), ctx.assetDeps);
    const after = await getProgramHotelHandoverHandler(
      request({token: link.token}, "anyone"), ctx.assetDeps);
    assert.equal(after.counts.idsAccepted, 1);
    assert.ok(after.rooms[0].guests[0].frontUrl);
    const doc = ctx.db.getDoc("programGuestIds/program-1_guest-1")!;
    assert.deepEqual(doc.hotelViews, [{hotelId: "hotel-1",
      atMillis: now.toMillis()}]);

    // A porter link never opens the handover.
    const porter = mintWebLinkToken({kind: "hamperPorter",
      programId: "program-1", subjectId: "hotel-1",
      expiresAtMillis: now.toMillis() + 1000}, SECRET);
    await assert.rejects(getProgramHotelHandoverHandler(
      request({token: porter}, "anyone"), ctx.assetDeps),
    code("permission-denied"));
  });

test("only guest relations mint the hotel link; hotel desk mints porters",
  async () => {
    const ctx = setup();
    await assert.rejects(issueProgramWebLinkHandler(request({
      programId: "program-1", kind: "hotelHandover", subjectId: "hotel-1"},
    "hotelier-1"), ctx.assetDeps), code("permission-denied"));
    const porter = await issueProgramWebLinkHandler(request({
      programId: "program-1", kind: "hamperPorter", subjectId: "hotel-1"},
    "hotelier-1"), ctx.assetDeps);
    assert.equal(porter.expiresAtMillis, now.toMillis() + 2 * 86_400_000);
    await assert.rejects(issueProgramWebLinkHandler(request({
      programId: "program-1", kind: "hamperPorter", subjectId: "hotel-x"},
    "manager-1"), ctx.assetDeps), code("not-found"));
  });
