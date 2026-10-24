import assert from "node:assert/strict";
import {indexSignature, inspectIndexReadiness} from "../../../tool/firebase/wait_firestore_indexes_ready.mjs";
// The organiser-review index ships with the backend index stage
// (.github/workflows/backend-deploy.yml); website promotion refuses to go live
// until it is READY.
export const reviewIndex = Object.freeze({collectionGroup: "reviews", queryScope: "COLLECTION", fields: [
  {fieldPath: "organizerId", mode: "ASCENDING"}, {fieldPath: "createdAt", mode: "DESCENDING"},
]});
const desiredDocument = {indexes: [reviewIndex]};
export function assertIndexSource(document) {
  assert.ok(Array.isArray(document.indexes));
  const matches = document.indexes.filter(index => indexSignature(index, {desired: true}) === indexSignature(reviewIndex, {desired: true}));
  assert.equal(matches.length, 1, "Source must own exactly one reviewed organiser-review index");
  assert.deepEqual(matches[0], reviewIndex, "Index definition differs from the reviewed organiser-review index");
}
export function assertReviewIndexReady(liveIndexes) {
  assert.equal(inspectIndexReadiness(desiredDocument, liveIndexes).complete, true, "Organiser-review index must be READY before website promotion");
}
