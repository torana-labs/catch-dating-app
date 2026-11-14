// What each lane-* project in nx.json reads. A lane input wider than the
// planner's selection runs a lane on changes that cannot affect it.
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";

import {compare, targets} from "./shadow_plan.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(workspaceRoot, file), "utf8"));
const options = readJson("nx.json").plugins.find((entry) => entry.plugin === "./tool/nx/catch_projects.mjs").options;
const project = (name) => options.sourceProjects.find((entry) => entry.name === name);
const laneInputs = (name) => project(name).targets.lane.inputs;

// Admin changes run the Tools lane (~50 min) only for the files the pending
// operations scanner reads, as the planner's admin-pending-input profile does.
// A feature-controllers glob ran it on every Admin controller PR (421f9dc2).
test("only the pending-operations scanner's Admin inputs select the Tools lane", () => {
  const scanner = readJson("tool/tools_manifest.json").tools.find((tool) => tool.id === "web:admin-pending-operations");
  const adminInputs = laneInputs("lane-tools").filter((input) => input.startsWith("{workspaceRoot}/admin/"));
  assert.deepEqual(adminInputs.map((input) => input.replace("{workspaceRoot}/", "")).sort(),
    [...scanner.impactPaths].filter((file) => file.startsWith("admin/")).sort());
  assert.ok(adminInputs.every((input) => !input.includes("*")), "Admin Tools inputs name files, not globs");
});

// The tasks `nx affected` selects for one changed file, without their
// dependencies, and every project's tags.
function affectedGraph(file) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nx-lane-inputs-"));
  const graphFile = path.join(dir, "graph.json");
  execFileSync("npx", ["nx", "affected", "-t", ...targets, "--files", file, "--excludeTaskDependencies",
    `--graph=${graphFile}`], {cwd: workspaceRoot, stdio: "ignore"});
  const graph = JSON.parse(fs.readFileSync(graphFile, "utf8"));
  fs.rmSync(dir, {recursive: true, force: true});
  return {
    nxTasks: Object.keys(graph.tasks.tasks).sort(),
    tagsByProject: Object.fromEntries(Object.entries(graph.graph.nodes).map(([name, node]) => [name, node.data.tags ?? []])),
  };
}
const affectedTasks = (file) => affectedGraph(file).nxTasks;
// The lanes a pull request runs for one changed file.
const lanesFor = (file) => compare({plannerLanes: [], mode: "pr", ...affectedGraph(file)}).nxLanes;

// functions/README.md alone ran ~15 min of backend jobs (32e79379), and a
// README under lib/ or functions/src/ ran Flutter, Functions, Firestore rules
// and contracts. Markdown is not a project input; a check that reads one
// names it, as the Functions export inventory does with functions/README.md.
test("documents select the docs lane and the checks that read them, nothing else", () => {
  assert.deepEqual(affectedTasks("functions/src/salesDemo/README.md"), ["lane-docs:lane"]);
  assert.deepEqual(affectedTasks("lib/safety/README.md"), ["lane-docs:lane"]);
  assert.deepEqual(affectedTasks("website/README.md"), ["lane-docs:lane"]);
  assert.deepEqual(affectedTasks("functions/README.md"), ["functions:check", "lane-docs:lane"]);
  const functionsSource = affectedTasks("functions/src/index.ts");
  assert.ok(["functions:check", "functions:test", "lane-firestore-rules:lane"].every((task) => functionsSource.includes(task)),
    "a Functions source change still runs Functions and its inventory check");
  assert.ok(affectedTasks("tool/tools_manifest.json").includes("functions:check"),
    "functions-ci runs its governance checks through the tool manifest");
  assert.deepEqual(affectedTasks("contracts/README.md"), ["contracts:check", "contracts:conformance", "lane-docs:lane"]);
});

// contracts was one project and an implicit dependency of almost everything,
// so one Admin action-catalog change ran Flutter, Marketing and Operations.
// Families nothing `$ref`s, and that feed narrow consumers, are their own
// projects. The schema generator still reads every family (contracts lane),
// and shared, firestore, callables, callable_responses, operations, embedded
// and public form one `$ref` cycle, so they stay one family.
test("a contract family change selects only that family's consumers", () => {
  assert.deepEqual(lanesFor("contracts/admin/admin_action_catalog.json"),
    ["admin", "contracts", "firestore_rules", "functions", "tools"]);
  assert.deepEqual(lanesFor("contracts/storage/event_media_objects.schema.json"), ["contracts", "flutter", "tools"]);
  assert.deepEqual(lanesFor("contracts/http/join_waitlist_request.schema.json"),
    ["capture_freshness", "contracts", "firestore_rules", "functions", "marketing", "tools"]);
  assert.ok(lanesFor("contracts/shared/commercial_terms.schema.json").includes("operations"),
    "the shared schema cycle still reaches every consumer");
});

// ee8b3cb7 (store link slots) ran Operations because the operations package was
// declared to depend on @catch/brand. Nothing in operations/ reads it.
test("a brand change does not run Operations", () => {
  assert.ok(!lanesFor("packages/brand/brand.json").includes("operations"));
});
