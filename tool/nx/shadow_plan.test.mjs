import assert from "node:assert/strict";
import test from "node:test";
import {compare, laneForTask, summary} from "./shadow_plan.mjs";

const dart = {catch_dating_app: ["lang:dart"], catch_ui: ["lang:dart"], widget_dedupe: ["lang:dart"]};

test("Nx tasks map onto the CI lanes they would replace", () => {
  assert.equal(laneForTask("catch_ui:test", ["lang:dart"]), "flutter");
  assert.equal(laneForTask("@catch/web-ui:typecheck"), "admin");
  assert.equal(laneForTask("contracts:conformance"), "contracts");
  assert.equal(laneForTask(["@catch", "operations"].join("/") + ":test"), "operations");
  assert.equal(laneForTask("widget_dedupe:test", ["lang:dart"]), null);
  assert.equal(laneForTask("@catch/brand:test"), null);
});

test("agreement compares only lanes both selectors can choose", () => {
  const result = compare({plannerLanes: ["functions", "contracts", "docs"],
    nxTasks: ["functions:test", "contracts:conformance"], tagsByProject: dart});
  assert.equal(result.agree, true);
  assert.deepEqual(result.uncomparedPlannerLanes, ["docs"]);
});

test("a lane only the planner selects is reported as Nx being narrower", () => {
  const result = compare({plannerLanes: ["flutter", "functions"], plannerFull: true,
    nxTasks: ["functions:test"], tagsByProject: dart});
  assert.deepEqual(result.plannerOnly, ["flutter"]);
  assert.match(summary(result, {base: "a".repeat(40), head: "b".repeat(40), mode: "pr"}), /Nx is narrower/u);
});

test("a lane only Nx selects is flagged as a planner gap", () => {
  const result = compare({plannerLanes: [], nxTasks: ["catch_dating_app:analyze", "widget_dedupe:test"], tagsByProject: dart});
  assert.deepEqual(result.nxOnly, ["flutter"]);
  assert.deepEqual(result.unmappedTasks, ["widget_dedupe:test"]);
  assert.match(summary(result, {base: "a".repeat(40), head: "b".repeat(40), mode: "pr"}), /Nx selects a lane the planner skips/u);
});
