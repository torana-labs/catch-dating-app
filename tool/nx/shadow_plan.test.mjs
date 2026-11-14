import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {compare, comparedLanes, contractsConsumerScanPrefixes, explain, explanationRules, isControlPlane, laneForTask,
  shadowExitCode, summary} from "./shadow_plan.mjs";

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

// Each explanation rule with the real disagreement that motivated it, from
// the shadow runs over the 30 PRs merged before c6f3e11c (12 Nov 2026).
const source = (component, value, relationship = "direct") => ({component, relationship, value});
const explanationFixtures = [
  {rule: "planner-full-selection", commit: "885a608e", lane: "flutter", side: "planner",
    sources: [source("repo.harness", "flutter")], changedFiles: ["tool/tools_manifest.json", "website/app/[[...path]]/page.tsx"]},
  {rule: "planner-functions-implies-contracts", commit: "e15166a5", lane: "contracts", side: "planner",
    sources: [source("backend.functions", "contracts"), source("ci.backend-delivery", "contracts")],
    changedFiles: [".github/workflows/backend-deploy.yml", "functions/scripts/deploy-size.cjs"]},
  {rule: "planner-propagates-to-captures", commit: "78d9457f", lane: "capture_freshness", side: "planner",
    sources: [source("web.marketing", "capture_freshness", "affected")],
    nxTasks: ["lane-marketing-design:lane"], changedFiles: ["design/components/catch.components.json"]},
  {rule: "planner-operations-doc", commit: "(synthetic: operations/README.md)", lane: "functions", side: "planner",
    sources: [source("operations.workflow-doc", "functions")], changedFiles: ["operations/README.md"]},
  {rule: "planner-contracts-source", commit: "(synthetic: contracts/admin)", lane: "flutter", side: "planner",
    sources: [source("contracts.source", "flutter")], changedFiles: ["contracts/admin/admin_action_catalog.json"]},
  {rule: "nx-control-plane", commit: "ce8dda26", lane: "flutter", side: "nx", changedFiles: ["tool/nx/select_lanes.mjs"]},
  {rule: "docs-reads-every-markdown", commit: "32e79379", lane: "docs", side: "nx", changedFiles: ["functions/README.md"]},
  {rule: "contracts-scan-consumers", commit: "0284bd52", lane: "contracts", side: "nx",
    nxTasks: ["contracts:check", "contracts:conformance"],
    changedFiles: ["lib/swipes/presentation/event_recap_screen.dart"]},
  {rule: "design-lane-reads-flutter", commit: "ec37f86f", lane: "admin", side: "nx",
    nxTasks: ["lane-admin-design:lane", "catch_ui:analyze"],
    changedFiles: ["packages/catch_ui/lib/src/components/catch_avatar_initials_surface.dart"]},
  {rule: "lane-tools-coarse", commit: "4c927168", lane: "tools", side: "nx", nxTasks: ["lane-tools:lane"],
    changedFiles: ["functions/src/shared/testing/fakeFirestore.ts"]},
  {rule: "brand-guard-in-functions", commit: "29479d8a", lane: "functions", side: "nx",
    nxTasks: ["functions:test", "@catch/brand:check"], changedFiles: ["packages/brand/literal_allowlist.json"]},
];

test("every explanation rule is pinned by the disagreement that motivated it", () => {
  assert.deepEqual(explanationFixtures.map((fixture) => fixture.rule).sort(),
    explanationRules.map((rule) => rule.id).sort(), "one fixture per rule");
  for (const {rule, commit, ...fixture} of explanationFixtures) {
    assert.equal(explain(fixture), rule, `${commit} ${fixture.side} only ${fixture.lane}`);
  }
});

test("a disagreement with no known cause stays unexplained", () => {
  // The planner selects Flutter for an app change and Nx misses it: a real gap.
  assert.equal(explain({lane: "flutter", side: "planner", sources: [source("app.source", "flutter")],
    changedFiles: ["lib/main.dart"]}), null);
  // Planner rules need planner provenance; a rule never fires on the other side.
  assert.equal(explain({lane: "contracts", side: "planner", changedFiles: ["lib/main.dart"]}), null);
  assert.equal(explain({lane: "docs", side: "planner", changedFiles: ["functions/README.md"]}), null);
  // Admin selected by catch-admin itself is not the design-parity lane.
  assert.equal(explain({lane: "admin", side: "nx", nxTasks: ["lane-admin-design:lane", "catch-admin:test"],
    changedFiles: ["packages/catch_ui/lib/a.dart"]}), null);
  // lane-tools-coarse does not cover a tool change.
  assert.equal(explain({lane: "tools", side: "nx", nxTasks: ["lane-tools:lane"], changedFiles: ["tool/run.mjs"]}), null);

  const result = compare({plannerLanes: ["flutter"], nxTasks: ["lane-docs:lane"], changedFiles: ["README.md"],
    plannerSources: [source("app.source", "flutter")]});
  assert.deepEqual(result.unexplainedPlannerOnly, ["flutter"]);
  assert.deepEqual(result.explained, [{lane: "docs", side: "nx", rule: "docs-reads-every-markdown"}]);
  assert.equal(result.explainedAgree, false);
  assert.match(summary(result, {base: "a".repeat(40), head: "b".repeat(40), mode: "pr"}), /\*\*Unexplained\*\*: planner only `flutter`/u);
});

test("the contracts consumer-scan prefixes are the contracts targets' inputs outside contracts/", () => {
  const nxJson = JSON.parse(fs.readFileSync(new URL("../../nx.json", import.meta.url), "utf8"));
  const contracts = nxJson.plugins.find((entry) => entry.plugin === "./tool/nx/catch_projects.mjs")
    .options.sourceProjects.find((project) => project.name === "contracts");
  const prefixes = new Set(Object.values(contracts.targets).flatMap((target) => target.inputs)
    .filter((input) => input.startsWith("{workspaceRoot}/") && input.endsWith("/**/*"))
    .map((input) => input.slice("{workspaceRoot}/".length, -"**/*".length))
    .filter((prefix) => prefix !== "contracts/"));
  assert.deepEqual([...prefixes].sort(), [...contractsConsumerScanPrefixes].sort());
});
