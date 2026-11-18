import assert from "node:assert/strict";
import test from "node:test";
import {MIGRATIONS} from "./lib/firestore_consolidation_migrations.mjs";

const migration = MIGRATIONS.find((entry) => entry.name === "onboarding-drafts-rename");

test("onboarding-drafts-rename is one create step with the same id and data", async () => {
  assert.ok(migration, "the migration is registered");
  assert.equal(migration.steps.length, 1);
  const [step] = migration.steps;
  assert.equal(step.kind, "create");
  assert.equal(step.source, "onboarding_drafts");
  assert.equal(step.target, "onboardingDrafts");
  const draft = {step: 2, firstName: "Asha", futureStepPayload: {a: 1}};
  assert.equal(await step.targetId("uid-1", draft), "uid-1");
  assert.deepEqual(await step.transform(draft, "uid-1"), draft);
});

test("an id that cannot be a document id is skipped", async () => {
  const [step] = migration.steps;
  assert.equal(await step.targetId("a/b", {step: 1}), null);
  assert.equal(await step.targetId("", {step: 1}), null);
});
