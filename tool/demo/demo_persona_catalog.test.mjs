import assert from "node:assert/strict";
import test from "node:test";
import {
  assertValidPersonaCatalog,
  formatPersonaPhotoGenerationPlanMarkdown,
  loadPersonaCatalog,
  photoPromptAnswersForPersona,
  personaProfileProjection,
  personaPhotoGenerationPlan,
  profilePhotosForPersona,
  profilePromptAnswersForPersona,
  validatePersonaCatalog,
} from "./demo_persona_catalog.mjs";

test("draft sales persona catalog validates", () => {
  const catalog = loadPersonaCatalog(
    "tool/demo/demo_seed/personas/us_nyc_sales_personas.draft.json"
  );

  const result = validatePersonaCatalog(catalog);

  assert.equal(result.valid, true);
  assert.equal(result.summary.personaCount, 24);
  assert.equal(result.summary.photoCount, 96);
  assert.equal(result.summary.runningPhotoCount, 7);
  assert.equal(result.summary.runningPhotoShare, 7 / 96);
  assert.equal(result.summary.cityCounts["new-york"], 24);
  assert.equal(result.summary.genderCounts.man, 12);
  assert.equal(result.summary.genderCounts.woman, 12);
  assert.equal(result.summary.categoryCounts.clearSoloPortrait, 24);
  assert.equal(result.summary.categoryCounts.activeLifestyle, 13);
});

test("India core persona catalog validates as one balanced, Indian cohort", () => {
  const catalog = loadPersonaCatalog(
    "tool/demo/demo_seed/personas/india_core_sales_personas.draft.json"
  );

  const result = validatePersonaCatalog(catalog);

  assert.equal(result.valid, true);
  assert.equal(result.summary.personaCount, 68);
  assert.equal(result.summary.photoCount, 272);
  assert.equal(result.summary.genderCounts.man, 34);
  assert.equal(result.summary.genderCounts.woman, 34);
  assert.deepEqual(result.summary.cityCounts, {bangalore: 12, delhi: 12, hyderabad: 10, indore: 1, mumbai: 21, pune: 12});
  assert.equal(result.summary.categoryCounts.clearSoloPortrait, 68);
  assert.ok(catalog.personas.every((persona) => persona.countryCode === "IN" && persona.id.startsWith("in_")));
});

test("persona catalog rejects sparse photo sets", () => {
  const catalog = validCatalog();
  catalog.personas[0].photos = catalog.personas[0].photos.slice(0, 3);

  const result = validateTestCatalog(catalog);

  assert.equal(result.valid, false);
  assert.match(result.issues.join("\n"), /at least 4 entries/);
});

test("persona catalog rejects unknown prompt ids and duplicate photo positions", () => {
  const catalog = validCatalog();
  catalog.personas[0].profilePrompts[0].promptId = "unknownPrompt";
  catalog.personas[0].photos[1].position = 0;

  const result = validateTestCatalog(catalog);

  assert.equal(result.valid, false);
  assert.match(result.issues.join("\n"), /unknown promptId unknownPrompt/);
  assert.match(result.issues.join("\n"), /duplicate position 0/);
});

test("published seed validation requires uploaded assets", () => {
  const catalog = validCatalog();

  const result = validateTestCatalog(catalog, {requirePublishedAssets: true});

  assert.equal(result.valid, false);
  assert.match(result.issues.join("\n"), /assetStatus must be uploaded/);
});

test("persona catalog rejects fitness-heavy photo mixes", () => {
  const catalog = validCatalog();
  catalog.personas[0].photos[1].categoryId = "activeLifestyle";
  catalog.personas[0].photos[1].activityId = "running";
  catalog.personas[0].photos[2].categoryId = "activeLifestyle";
  catalog.personas[0].photos[2].activityId = "running";

  const result = validateTestCatalog(catalog);

  assert.equal(result.valid, false);
  assert.match(result.issues.join("\n"), /category activeLifestyle can be at most 1/);
  assert.match(result.issues.join("\n"), /activity running can be at most 1/);
});

test("persona catalog rejects unknown photo activities", () => {
  const catalog = validCatalog();
  catalog.personas[0].photos[1].activityId = "marathon_onboarding";

  const result = validateTestCatalog(catalog);

  assert.equal(result.valid, false);
  assert.match(result.issues.join("\n"), /unknown activityId marathon_onboarding/);
});

test("persona prompt and photo mappers return app-ready profile fields", () => {
  const persona = validCatalog().personas[0];

  assert.deepEqual(
    profilePromptAnswersForPersona(persona).map((answer) => answer.promptId),
    ["perfectRun", "afterEvent", "greenFlag"]
  );
  assert.deepEqual(
    photoPromptAnswersForPersona(persona).map((answer) => answer.photoIndex),
    [0, 1, 2, 3]
  );

  const photos = profilePhotosForPersona(persona, {
    createdAt: "created",
    updatedAt: "updated",
  });

  assert.equal(photos.length, 4);
  assert.equal(photos[0].moderation.synthetic, true);
  assert.equal(photos[0].createdAt, "created");
  assert.equal(photos[0].updatedAt, "updated");
});

test("profile photo mapper can filter by asset status", () => {
  const persona = validCatalog().personas[0];

  assert.equal(profilePhotosForPersona(persona).length, 4);
  assert.equal(
    profilePhotosForPersona(persona, {assetStatuses: ["uploaded"]}).length,
    0
  );
  assert.equal(
    profilePhotosForPersona(persona, {assetStatuses: ["planned"]}).length,
    4
  );
  assert.equal(profilePhotosForPersona(persona, {assetStatuses: "all"}).length, 4);
  assert.throws(
    () => profilePhotosForPersona(persona, {assetStatuses: ["published"]}),
    /Unknown persona asset status published/
  );
});

test("persona profile projection exposes reusable app-ready profile data", () => {
  const catalog = validCatalog();

  assert.throws(
    () => personaProfileProjection(catalog, {
      photoCompositionIndex: testCompositionIndex(),
    }),
    /requires explicit assetStatuses/
  );
  const uploadedProjection = personaProfileProjection(catalog, {
    assetStatuses: ["uploaded"],
    photoCompositionIndex: testCompositionIndex(),
  });
  const plannedProjection = personaProfileProjection(catalog, {
    assetStatuses: ["planned"],
    photoCompositionIndex: testCompositionIndex(),
  });

  assert.equal(uploadedProjection.assetStatuses[0], "uploaded");
  assert.equal(uploadedProjection.projectedPhotoCount, 0);
  assert.equal(plannedProjection.projectedPhotoCount, 4);
  assert.equal(plannedProjection.personas[0].profilePrompts[0].promptId, "perfectRun");
  assert.equal(plannedProjection.personas[0].profilePhotos[0].id, "photo_0");
});

test("persona photo generation plan exposes reviewable prompts", () => {
  const catalog = validCatalog();

  const plan = personaPhotoGenerationPlan(catalog, {
    photoCompositionIndex: testCompositionIndex(),
  });

  assert.equal(plan.catalogId, "test-sales-personas");
  assert.equal(plan.photos.length, 4);
  assert.deepEqual(
    plan.photos.map((photo) => photo.categoryId),
    ["clearSoloPortrait", "socialDining", "activeLifestyle", "everydayCandid"]
  );
  assert.equal(plan.photos[2].activityId, "pickleball");
  assert.match(plan.photos[0].generationPrompt, /Synthetic person/);
});

test("persona photo generation plan can be rendered as markdown", () => {
  const catalog = validCatalog();
  const plan = personaPhotoGenerationPlan(catalog, {
    photoCompositionIndex: testCompositionIndex(),
  });

  const markdown = formatPersonaPhotoGenerationPlanMarkdown(plan);

  assert.match(markdown, /^# Persona Photo Generation Plan/);
  assert.match(markdown, /\| Category \| Count \| Share \|/);
  assert.match(markdown, /## Maya Shah/);
  assert.match(markdown, /Prompt: Synthetic person/);
});

test("assertValidPersonaCatalog throws with validation details", () => {
  const catalog = validCatalog();
  catalog.personas[0].heightCm = 400;

  assert.throws(
    () => assertValidPersonaCatalog(catalog, {
      photoCompositionIndex: testCompositionIndex(),
    }),
    /heightCm must be an integer/
  );
});

test("persona catalog rejects cohort composition drift", () => {
  const catalog = validCatalog();
  catalog.compositionCohortIds = ["hostSalesPilot"];
  catalog.personas = Array.from({length: 8}, (_, index) => ({
    ...validCatalog().personas[0],
    id: `test_persona_${index}`,
    photos: validCatalog().personas[0].photos.map((photo) => ({
      ...photo,
      id: `${photo.id}_${index}`,
      categoryId: photo.position === 0 ? "clearSoloPortrait" : "socialDining",
      activityId: photo.position === 0 ? "street_portrait" : "coffee",
    })),
  }));

  const result = validatePersonaCatalog(catalog);

  assert.equal(result.valid, false);
  assert.match(result.issues.join("\n"), /category socialDining share/);
  assert.match(result.issues.join("\n"), /cohort\[hostSalesPilot\]/);
});

function validCatalog() {
  return {
    schemaVersion: 1,
    id: "test-sales-personas",
    label: "Test sales personas",
    qualityGate: {
      minimumPhotosPerPersona: 4,
      maximumPhotosPerPersona: 6,
      publishedAssetRequired: false,
    },
    photoActivityTaxonomyId: "sales-demo-photo-activity-taxonomy-v1",
    personas: [
      {
        id: "test_maya_shah",
        firstName: "Maya",
        lastName: "Shah",
        displayName: "Maya Shah",
        gender: "woman",
        pronouns: "she/her",
        dateOfBirth: "1997-02-11",
        heightCm: 160,
        countryCode: "US",
        citySlug: "new-york",
        cityLabel: "New York",
        occupation: "Product designer",
        company: "Independent",
        demographicBrief: "South Asian American woman in her late twenties.",
        appearanceContinuityBrief: "Same person across all images; petite athletic build.",
        personalityBrief: "Warm, precise, and social after thoughtfully planned events.",
        marketFitBrief: "Fits a New York activity-social audience.",
        profilePrompts: [
          {promptId: "perfectRun", answer: "Six easy miles and a good cortado after."},
          {promptId: "afterEvent", answer: "Comparing routes over coffee nearby."},
          {promptId: "greenFlag", answer: "I make plans that actually happen."},
        ],
        photos: [0, 1, 2, 3].map((position) => ({
          id: `photo_${position}`,
          position,
          promptId: position === 0 ? "proofIRun" : "notRunning",
          categoryId: [
            "clearSoloPortrait",
            "socialDining",
            "activeLifestyle",
            "everydayCandid",
          ][position],
          activityId: [
            "street_portrait",
            "coffee",
            "pickleball",
            "bookstore",
          ][position],
          assetStatus: "planned",
          url: `https://storage.googleapis.com/catch-demo-assets/personas/test_maya/${position}.jpg`,
          thumbnailUrl:
            `https://storage.googleapis.com/catch-demo-assets/personas/test_maya/thumbs/${position}.jpg`,
          storagePath: `demo/personas/test_maya/${position}.jpg`,
          thumbnailStoragePath: `demo/personas/test_maya/thumbs/${position}.jpg`,
          scene: "Dating-app ready lifestyle image.",
          generationPrompt: "Synthetic person, consistent face, polished natural light.",
          continuityNotes: "Keep the same face, hair, height, and athletic build.",
        })),
      },
    ],
  };
}

function validateTestCatalog(catalog, options = {}) {
  return validatePersonaCatalog(catalog, {
    ...options,
    photoCompositionIndex: testCompositionIndex(),
  });
}

function testCompositionIndex() {
  return {
    schemaVersion: 1,
    id: "test-photo-composition-index",
    label: "Test photo composition index",
    photoActivityTaxonomyId: "sales-demo-photo-activity-taxonomy-v1",
    profileRules: {
      photoCount: {minimum: 4, maximum: 6},
      minimumDistinctCategories: 4,
      categoryCounts: {
        clearSoloPortrait: {minimum: 1, maximum: 2},
        activeLifestyle: {minimum: 0, maximum: 1},
        friendsGroup: {minimum: 0, maximum: 1},
      },
      activityCounts: {
        running: {minimum: 0, maximum: 1},
      },
    },
    catalogRules: {
      minimumPersonas: 1,
    },
  };
}
