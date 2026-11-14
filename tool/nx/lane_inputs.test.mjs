// What each lane-* project in nx.json reads. A lane input wider than the
// planner's selection runs a lane on changes that cannot affect it.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";

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
