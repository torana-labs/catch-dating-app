import assert from "node:assert/strict";
import test from "node:test";
import {
  assertEventVisibilityWithinOrganizerCeiling,
  assertProgrammaticListingChecklist,
  effectiveEventVisibility,
  programmaticListingChecklistFields,
  SupplyVisibilityControls,
} from "./supplyVisibilityPolicy";

const visible: SupplyVisibilityControls = {
  publishStatus: "published",
  indexStatus: "indexed",
  appVisibility: "discoverable",
};

test("effectiveEventVisibility applies each organizer ceiling independently",
  () => {
    assert.deepEqual(effectiveEventVisibility(visible, {
      publishStatus: "published",
      indexStatus: "noindex",
      appVisibility: "hidden",
    }), {
      publishStatus: "published",
      indexStatus: "noindex",
      appVisibility: "hidden",
    });
  });

test("event visibility cannot exceed its organizer on either surface", () => {
  assert.throws(
    () => assertEventVisibilityWithinOrganizerCeiling(visible, {
      publishStatus: "draft",
      indexStatus: "noindex",
      appVisibility: "hidden",
    }),
    (error) => {
      assert.equal((error as {code?: string}).code, "failed-precondition");
      return true;
    }
  );
});

test("event visibility at the organizer ceiling is allowed", () => {
  assert.doesNotThrow(
    () => assertEventVisibilityWithinOrganizerCeiling(visible, visible)
  );
});

test("a programmatic listing needs city evidence, formats, no dating " +
  "framing and no personal data confirmed", () => {
  const confirmed = Object.fromEntries(programmaticListingChecklistFields
    .map((field) => [field, true]));
  assert.deepEqual(programmaticListingChecklistFields, ["cityEvidenceReviewed",
    "formatsReviewed", "datingFramingReviewed", "personalDataReviewed"]);
  assert.doesNotThrow(() => assertProgrammaticListingChecklist(confirmed));
  for (const field of programmaticListingChecklistFields) {
    assert.throws(
      () => assertProgrammaticListingChecklist({...confirmed, [field]: false}),
      new RegExp(`checklist confirmation: ${field}\\.`));
  }
});
