import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {compare, comparedLanes, isControlPlane, laneForTask, shadowExitCode, summary} from "./shadow_plan.mjs";

const dart = {catch_dating_app: ["lang:dart"], catch_ui: ["lang:dart"], widget_dedupe: ["lang:dart"]};

test("Nx tasks map onto the CI lanes they would replace", () => {
  assert.equal(laneForTask("catch_ui:test", ["lang:dart"]), "flutter");
  assert.equal(laneForTask("@catch/web-ui:typecheck"), "admin");
  assert.equal(laneForTask("contracts:conformance"), "contracts");
  assert.equal(laneForTask(["@catch", "operations"].join("/") + ":test"), "operations");
  assert.equal(laneForTask("widget_dedupe:test", ["lang:dart"]), "tools");
  assert.equal(laneForTask("unknown-project:test"), null);
});

test("every planner lane has an Nx project to compare with", () => {
  const result = compare({plannerLanes: ["functions", "contracts", "docs"],
    nxTasks: ["functions:test", "contracts:conformance", "lane-docs:lane"], tagsByProject: dart});
  assert.equal(result.agree, true);
  assert.equal(laneForTask("lane-build-ios:lane"), "flutter_build_ios");
  assert.equal(laneForTask("lane-flutter-design:lane"), "flutter");
});

test("an edit to how CI runs selects every lane", () => {
  assert.equal(isControlPlane(".github/workflows/ci.yml"), true);
  assert.equal(isControlPlane("tool/nx/catch_projects.mjs"), true);
  assert.equal(isControlPlane("tool/tools_manifest.json"), false);
  const result = compare({plannerLanes: comparedLanes, nxTasks: [], changedFiles: [".github/actions/setup-flutter/action.yml"]});
  assert.equal(result.agree, true);
});

test("pull requests leave the queue-only lanes to the merge queue", () => {
  const result = compare({plannerLanes: ["flutter"], mode: "pr", tagsByProject: dart,
    nxTasks: ["catch_dating_app:analyze", "lane-visual:lane", "lane-build-web:lane"]});
  assert.equal(result.agree, true);
});

test("a lane only the planner selects is reported as Nx being narrower", () => {
  const result = compare({plannerLanes: ["flutter", "functions"], plannerFull: true,
    nxTasks: ["functions:test"], tagsByProject: dart});
  assert.deepEqual(result.plannerOnly, ["flutter"]);
  assert.match(summary(result, {base: "a".repeat(40), head: "b".repeat(40), mode: "pr"}), /Nx is narrower/u);
});

test("a lane only Nx selects is flagged as a planner gap", () => {
  const result = compare({plannerLanes: [], nxTasks: ["catch_dating_app:analyze", "unknown-project:test"], tagsByProject: dart});
  assert.deepEqual(result.nxOnly, ["flutter"]);
  assert.deepEqual(result.unmappedTasks, ["unknown-project:test"]);
  const text = summary(result, {base: "a".repeat(40), head: "b".repeat(40), mode: "pr"});
  assert.match(text, /Nx selects a lane the planner skips/u);
  assert.match(text, /Unmapped Nx tasks.*unknown-project:test/u);
});

// A website-only change (2a2f26d1, 12 Nov 2026) affects only the marketing
// site, but the task graph also held @catch/web-ui:build, which the marketing
// build depends on. Mapping that dependency ran Admin on every website PR.
test("the lane plan asks Nx for affected tasks without their dependencies", () => {
  assert.match(fs.readFileSync(new URL("./shadow_plan.mjs", import.meta.url), "utf8"),
    /"nx", "affected", "-t", \.\.\.targets, [^\n]*"--excludeTaskDependencies"/u);
  const nxTasks = ["catch-marketing:build", "catch-marketing:typecheck", "lane-capture-freshness:lane"];
  const result = compare({plannerLanes: ["capture_freshness", "marketing"], mode: "pr", nxTasks});
  assert.deepEqual(result.nxLanes, ["capture_freshness", "marketing"]);
  assert.equal(result.agree, true);
});

// codex/brand-config-publish (run 43302464381, 12 Nov 2026) reported
// @catch/brand:check and :test as unmapped. meta:brand-literals runs both in
// the Tools lane.
test("brand tasks select the Tools lane", () => {
  assert.equal(laneForTask("@catch/brand:check"), "tools");
  assert.equal(laneForTask("@catch/brand:test"), "tools");
  const result = compare({plannerLanes: ["tools"], nxTasks: ["@catch/brand:check", "@catch/brand:test"]});
  assert.deepEqual(result.unmappedTasks, []);
  assert.equal(result.agree, true);
});


test("the shadow run fails when Nx selects a task with no lane", () => {
  assert.equal(shadowExitCode(compare({plannerLanes: [], nxTasks: ["unknown-project:test"]})), 1);
  assert.equal(shadowExitCode(compare({plannerLanes: ["tools"], nxTasks: ["design-tokens:check", "widget_dedupe:test"]})), 0);
});
