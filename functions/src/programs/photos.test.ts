import assert from "node:assert/strict";
import test from "node:test";
import * as admin from "firebase-admin";
import {baseSeed, deps, request, now} from "../shared/testing/programFixtures";
import {FakeFirestore} from "../shared/testing/programFirestore";
import {createProgramAssetUploadHandler} from "./programAssets";
import {FakeProgramBucket} from "./programAssetFixture";
import {
  signProgramPhotoUrlsHandler,
  upsertProgramPhotoHandler,
} from "./photos";
import {contractValidator} from "../shared/contractTestValidators";

const validateDocument = contractValidator("ProgramPhotoDocument");
const validateUrls = contractValidator("ProgramPhotoUrlsCallableResponse");
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

test("a photo is added to an album, then hidden",
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
  });

test("the signer returns urls for this programme's own photos only",
  async () => {
    const ctx = setup();
    const intent = await upload(ctx, "photo-request-3");
    await upsertProgramPhotoHandler(request({
      programId: "program-1", photoId: intent.assetId, expectedRevision: 0,
      requestId: "photo-cmd-6"}, "manager-1"), ctx.photoDeps);
    // Another programme's photo, named by its real id, is never signed.
    const foreign = "photo_" + "e".repeat(40);
    ctx.db.setDoc(`programPhotos/program-2_${foreign}`, {
      programId: "program-2", organizerId: "org-1", photoId: foreign,
      storagePath: `programs/program-2/photos/${foreign}`});
    const signed = await signProgramPhotoUrlsHandler(request({
      programId: "program-1", photoIds: [intent.assetId, foreign,
        "photo_" + "f".repeat(40)], includeCover: true}, "manager-1"),
    ctx.photoDeps);
    assert.equal(validateUrls(signed), true,
      JSON.stringify(validateUrls.errors));
    assert.deepEqual(signed.urls.map((entry) => entry.photoId),
      [intent.assetId]);
    assert.match(signed.urls[0].url, /photos\//);
    assert.match(signed.coverUrl!, /branding\/cover_/);
    assert.equal(signed.urlsExpireAtMillis, now.toMillis() + 10 * 60 * 1000);
    const bare = await signProgramPhotoUrlsHandler(request({
      programId: "program-1", photoIds: []}, "manager-1"), ctx.photoDeps);
    assert.equal(bare.coverUrl, null);
    await assert.rejects(signProgramPhotoUrlsHandler(request({
      programId: "program-1", photoIds: [intent.assetId]}, "greeter-1"),
    ctx.photoDeps), code("permission-denied"));
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
    // A cover upload is signed into the branding folder.
    const cover = await upload(ctx, "cover-request-1", "cover");
    assert.match(cover.storagePath, /^programs\/program-1\/branding\/cover_/);
  });
