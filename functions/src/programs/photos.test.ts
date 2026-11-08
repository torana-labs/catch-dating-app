import assert from "node:assert/strict";
import test from "node:test";
import * as admin from "firebase-admin";
import {baseSeed, deps, request, now} from "../shared/testing/programFixtures";
import {FakeFirestore} from "../shared/testing/programFirestore";
import {createProgramAssetUploadHandler} from "./programAssets";
import {FakeProgramBucket} from "./programAssetFixture";
import {listProgramPhotosHandler, upsertProgramPhotoHandler} from "./photos";
import {contractValidator} from "../shared/contractTestValidators";

const validateDocument = contractValidator("ProgramPhotoDocument");
const validateList = contractValidator("ProgramPhotosCallableResponse");
const code = (expected: string) => (err: unknown) =>
  (err as {code?: string}).code === expected;
const stamp = admin.firestore.Timestamp.fromMillis;

function setup() {
  const base = baseSeed();
  const db = new FakeFirestore({
    ...base,
    "organizerPrograms/program-1": {...base["organizerPrograms/program-1"]!,
      branding: {color: "rani",
        coverImagePath: "programs/program-1/branding/cover_" + "c".repeat(40),
        creditLine: null}},
    "programFunctions/mehendi": {programId: "program-1",
      organizerId: "org-1", name: "Mehendi", status: "scheduled",
      startsAt: stamp(now.toMillis() + 1000), endsAt: now},
    "programFunctions/sangeet": {programId: "program-1",
      organizerId: "org-1", name: "Sangeet", status: "scheduled",
      startsAt: stamp(now.toMillis() + 2000), endsAt: now},
  });
  const bucket = new FakeProgramBucket();
  const photoDeps = deps(db, {secret: () => "s",
    storageBucket: () => bucket.asBucket()});
  return {db, bucket, photoDeps};
}

async function upload(ctx: ReturnType<typeof setup>, requestId: string,
  kind: "photo" | "cover" = "photo") {
  const intent = await createProgramAssetUploadHandler(request({
    programId: "program-1", kind, contentType: "image/png", sizeBytes: 2048,
    requestId}, "manager-1"), ctx.photoDeps);
  ctx.bucket.put(intent.storagePath, {programId: "program-1",
    subject: "planner", contentType: "image/png"});
  return intent;
}

test("a photo is added to an album, then hidden; albums count it",
  async () => {
    const ctx = setup();
    const intent = await upload(ctx, "photo-request-1");
    const added = await upsertProgramPhotoHandler(request({
      programId: "program-1", photoId: intent.assetId,
      functionId: "mehendi", expectedRevision: 0,
      requestId: "photo-cmd-1"}, "manager-1"), ctx.photoDeps);
    assert.equal(added.revision, 1);
    const doc = ctx.db.getDoc(`programPhotos/program-1_${intent.assetId}`)!;
    assert.equal(validateDocument(doc), true,
      JSON.stringify(validateDocument.errors));

    const list = await listProgramPhotosHandler(request({
      programId: "program-1", functionId: "mehendi"}, "manager-1"),
    ctx.photoDeps);
    assert.equal(validateList(list), true,
      JSON.stringify(validateList.errors));
    assert.deepEqual(list.albums.map((album) =>
      [album.name, album.photoCount]), [["Mehendi", 1], ["Sangeet", 0]]);
    assert.equal(list.photos.length, 1);
    assert.match(list.coverUrl!, /branding\/cover_/);

    const hidden = await upsertProgramPhotoHandler(request({
      programId: "program-1", photoId: intent.assetId, status: "hidden",
      expectedRevision: 1, requestId: "photo-cmd-2"}, "manager-1"),
    ctx.photoDeps);
    assert.equal(hidden.status, "hidden");
    assert.equal(hidden.functionId, "mehendi");
    await assert.rejects(upsertProgramPhotoHandler(request({
      programId: "program-1", photoId: intent.assetId, status: "visible",
      expectedRevision: 1, requestId: "photo-cmd-3"}, "manager-1"),
    ctx.photoDeps), code("aborted"));
    const after = await listProgramPhotosHandler(request({
      programId: "program-1"}, "manager-1"), ctx.photoDeps);
    assert.equal(after.albums[0].photoCount, 0);
  });

test("photos need an upload, a known function and photo access",
  async () => {
    const ctx = setup();
    await assert.rejects(upsertProgramPhotoHandler(request({
      programId: "program-1", photoId: "photo_" + "d".repeat(40),
      expectedRevision: 0, requestId: "photo-cmd-4"}, "manager-1"),
    ctx.photoDeps), code("failed-precondition"));
    const intent = await upload(ctx, "photo-request-2");
    await assert.rejects(upsertProgramPhotoHandler(request({
      programId: "program-1", photoId: intent.assetId,
      functionId: "nope", expectedRevision: 0, requestId: "photo-cmd-5"},
    "manager-1"), ctx.photoDeps), code("not-found"));
    await assert.rejects(listProgramPhotosHandler(request({
      programId: "program-1"}, "greeter-1"), ctx.photoDeps),
    code("permission-denied"));
    // A cover upload is signed into the branding folder.
    const cover = await upload(ctx, "cover-request-1", "cover");
    assert.match(cover.storagePath, /^programs\/program-1\/branding\/cover_/);
  });
