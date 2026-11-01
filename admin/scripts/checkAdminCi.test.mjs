import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import YAML from "yaml";
import {evaluateExpression, laneSteps} from "./checkAdminCi.mjs";

const context = {"inputs.surface": "admin", "inputs.update_visual_baselines": false, "github.event_name": "merge_group"};

test("evaluates the expressions the lane uses", () => {
  assert.equal(evaluateExpression("inputs.surface == 'admin'", context), true);
  assert.equal(evaluateExpression("inputs.surface == 'admin' && 'admin' || 'website'", context), "admin");
  assert.equal(evaluateExpression("inputs.surface == 'marketing' && 'admin' || 'website'", context), "website");
  assert.equal(evaluateExpression("inputs.surface == 'admin' && (github.event_name != 'pull_request' || inputs.update_visual_baselines)", context), true);
  assert.equal(evaluateExpression("!inputs.update_visual_baselines && github.event_name == 'pull_request'", context), false);
});

test("refuses what it cannot evaluate, rather than skipping the step", () => {
  assert.throws(() => evaluateExpression("always()", context), /Cannot evaluate/u);
  assert.throws(() => evaluateExpression("secrets.TOKEN == 'x'", context), /Cannot evaluate/u);
});

const workflow = YAML.parse(fs.readFileSync(new URL("../../.github/workflows/react-surface-validation.yml", import.meta.url), "utf8"));
const commands = (event) => laneSteps(workflow, {event}).map((step) => step.run.replace(/\s+/gu, " ").trim());

test("the real lane resolves to the Admin checks", () => {
  const steps = commands("merge_group");
  assert.ok(steps.includes("npm run web:admin:build"));
  assert.ok(steps.includes("npm --workspace catch-admin run test:storybook:a11y"));
  assert.ok(steps.includes("npm --workspace catch-admin run build:storybook"));
  assert.ok(steps.includes("node tool/web/check_storybook_visuals.mjs --surface admin --report"));
  assert.ok(steps.includes("node tool/audit/check_unused_code.mjs --check --workspace admin --workspace packages/web-ui --workspace packages/web-config"));
  assert.ok(!steps.includes("npm ci"));
  assert.ok(!steps.some((step) => step.includes("catch-marketing")));
});

test("a pull request leaves out the Storybook build and visual report", () => {
  const steps = commands("pull_request");
  assert.ok(steps.includes("npm run web:admin:build"));
  assert.ok(!steps.includes("npm --workspace catch-admin run build:storybook"));
  assert.ok(!steps.includes("node tool/web/check_storybook_visuals.mjs --surface admin --report"));
});

test("the build gets the workflow's synthetic production environment", () => {
  const build = laneSteps(workflow, {}).find((step) => step.run.includes("web:admin:build"));
  assert.equal(build.env.VITE_ADMIN_DATA_MODE, "live");
});
