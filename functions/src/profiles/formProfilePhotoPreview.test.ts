import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import {Timestamp} from "firebase-admin/firestore";
import type {CallableRequest} from "firebase-functions/v2/https";
import {createFormPaymentFixture} from
  "../payments/formPayments/formPaymentTestStore";
import {getParticipantFormPhotoHandler as preview} from
  "./formProfilePhotoPreview";
import type {GetParticipantFormPhotoCallableResponse} from
  "../shared/generated/getParticipantFormPhotoCallableResponse";
import {contractValidator} from "../shared/contractTestValidators";

const validateGetParticipantFormPhotoCallableResponse =
  contractValidator<GetParticipantFormPhotoCallableResponse>(
    "GetParticipantFormPhotoCallableResponse"
  );

async function fixture() {
  const h = createFormPaymentFixture();
  const questions = h.version.definition.sections[0].questions;
  questions.push({...questions[0], questionId: "photo", key: "photo",
    canonicalFieldId: "profilePhoto", answerDestination: "catchProfile",
    kind: "file", validation: {...questions[0].validation, maxFileCount: 1,
      maxFileSizeBytes: 10 * 1024 * 1024, allowedMimeTypes: ["image/jpeg"]}});
  h.draft.answers = {name: "Sara Demo", photo: ["asset"]};
  h.store.records.set("organizerFormResponseDrafts/draft", {...h.draft});
  const assetPath = "organizerFormAssets/asset";
  h.store.records.set(assetPath, {organizerId: "org", formId: "form",
    versionId: "version", draftId: "draft", questionId: "photo",
    respondentUid: "person", status: "ready", deletedAt: null,
    sizeBytes: 1000, contentType: "image/jpeg", declaredSha256: "a".repeat(64),
    storagePath: "organizerForms/form/draft/asset"});
  const {paymentId} = await h.reserve();
  h.capture(paymentId);
  await h.finalize(paymentId);
  const now = Timestamp.fromDate(new Date("2026-09-23T12:00:00Z"));
  h.store.records.set(assetPath, {...h.store.records.get(assetPath),
    expiresAt: Timestamp.fromMillis(now.toMillis() + 60_000)});
  const responseId = [...h.store.records.keys()].find((path) =>
    path.startsWith("participantFormProfileProposals/"))!.split("/")[1];
  const request = {auth: {uid: "person",
    token: {phone_number: "+919000000001"}},
  data: {responseId, questionId: "photo", assetId: "asset"}} as
    unknown as CallableRequest<unknown>;
  const bytes = await sharp({create: {width: 1200, height: 1600,
    channels: 3, background: "#998877"}})
    .withExif({IFD0: {Artist: "Private applicant"}}).jpeg().toBuffer();
  let reads = 0;
  const deps = {db: () => h.db, now: () => now,
    rateLimit: async () => undefined,
    readBytes: async () => {
      reads++; return bytes;
    }};
  return {...h, request, deps, responseId, assetPath, bytes, now,
    reads: () => reads};
}

test("owned previews return bounded metadata-free bytes and no media grant",
  async () => {
    const h = await fixture();
    const before = [...h.store.records.keys()];
    const result = await preview(h.request, h.deps);
    assert.equal(validateGetParticipantFormPhotoCallableResponse(result), true);
    assert.equal(result.width, 480);
    assert.equal(result.height, 640);
    const bytes = Buffer.from(result.previewBase64, "base64");
    assert.ok(bytes.length <= 256 * 1024);
    assert.equal((await sharp(bytes).metadata()).exif, undefined);
    assert.deepEqual([...h.store.records.keys()], before);
    assert.equal(Object.keys(result).some((key) =>
      /url|path|token/iu.test(key)),
    false);
  });

test("identity and exact source are checked before media IO",
  async () => {
    const h = await fixture();
    for (const request of [{...h.request, auth: undefined},
      {...h.request, auth: {uid: "foreign", token: {
        phone_number: "+919000000002"}}},
      {...h.request, auth: {uid: "person", token: {}}},
      {...h.request, data: {responseId: h.responseId,
        questionId: "name", assetId: "asset"}},
      {...h.request, data: {responseId: h.responseId,
        questionId: "photo", assetId: "other"}}]) {
      await assert.rejects(preview(
        request as CallableRequest<unknown>, h.deps));
    }
    h.store.records.set("deletedUsers/person", {status: "processing"});
    await assert.rejects(preview(h.request, h.deps));
    assert.equal(h.reads(), 0);
  });

test("source invalidation during processing denies preview",
  async () => {
    for (const change of ["withdraw", "delete", "asset", "digest", "expiry"]) {
      const h = await fixture();
      await assert.rejects(preview(h.request, {...h.deps,
        readBytes: async () => {
          if (change === "withdraw") {
            const path = `organizerFormResponses/${h.responseId}`;
            h.store.records.set(path, {...h.store.records.get(path),
              status: "withdrawn", withdrawnAt: h.now});
          } else if (change === "delete") {
            h.store.records.set("deletedUsers/person", {status: "processing"});
          } else {
            const patch = change === "asset" ? {deletedAt: h.now} :
              change === "digest" ? {declaredSha256: "b".repeat(64)} :
                {expiresAt: h.now};
            h.store.records.set(h.assetPath,
              {...h.store.records.get(h.assetPath), ...patch});
          }
          return h.bytes;
        }}));
    }
  });

test("invalid image bytes fail without creating a derivative URL", async () => {
  const h = await fixture();
  await assert.rejects(preview(h.request, {...h.deps,
    readBytes: async () => Buffer.from("not an image")}));
});
