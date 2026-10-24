import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {assertIndexSource, assertReviewIndexReady, reviewIndex} from "./reviewIndexRelease.mjs";
const live = (state = "READY") => ({name: "projects/catch-dating-app-64e51/databases/(default)/collectionGroups/reviews/indexes/expected", queryScope: "COLLECTION", state,
  fields: [...reviewIndex.fields.map(({fieldPath, mode}) => ({fieldPath, order: mode})), {fieldPath: "__name__", order: "DESCENDING"}]});
test("the backend index file declares exactly the organiser-review index", () => {
  const document = JSON.parse(fs.readFileSync(new URL("../../../firestore.indexes.json", import.meta.url)));
  assertIndexSource(document);
  assert.throws(() => assertIndexSource({indexes: []}));
  assert.throws(() => assertIndexSource({indexes: [reviewIndex, reviewIndex]}));
  assert.throws(() => assertIndexSource({indexes: [{...reviewIndex, queryScope: "COLLECTION_GROUP"}]}));
});
test("website promotion waits for a READY organiser-review index", () => {
  assertReviewIndexReady([live()]);
  assert.throws(() => assertReviewIndexReady([live("CREATING")]));
  assert.throws(() => assertReviewIndexReady([]));
  const promotion = fs.readFileSync(new URL("../../../.github/workflows/website-next-promote.yml", import.meta.url), "utf8");
  assert.ok(promotion.indexOf("assertReviewIndexReady(gcloudIndexList") < promotion.indexOf("gcloud run deploy"));
});
