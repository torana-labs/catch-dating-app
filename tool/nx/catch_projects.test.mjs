import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";

import {createDependencies, createNodesV2} from "./catch_projects.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const nxJson = JSON.parse(fs.readFileSync(path.join(workspaceRoot, "nx.json"), "utf8"));
const options = nxJson.plugins.find((entry) => entry.plugin === "./tool/nx/catch_projects.mjs").options;
const [, createNodes] = createNodesV2;

function trackedFiles(...patterns) {
  return execFileSync("git", ["ls-files", ...patterns], {cwd: workspaceRoot, encoding: "utf8"})
    .trim().split("\n").filter(Boolean);
}

async function projectsByRoot() {
  const files = ["nx.json", ...trackedFiles("pubspec.yaml", "*/pubspec.yaml", "package-lock.json", "*/package-lock.json")];
  const results = await createNodes(files, options, {workspaceRoot});
  return Object.assign({}, ...results.map(([, result]) => result.projects ?? {}));
}

test("every tracked pubspec.yaml becomes a Dart project with analyze", async () => {
  const projects = await projectsByRoot();
  for (const file of trackedFiles("pubspec.yaml", "*/pubspec.yaml")) {
    const project = projects[path.dirname(file)];
    assert.ok(project, `${file} has no project`);
    assert.match(project.targets.analyze.options.command, /^(flutter|dart) analyze --fatal-infos/);
  }
  assert.equal(projects["."].name, "catch_dating_app");
  assert.equal(projects["."].targets.analyze.options.command, "flutter analyze --fatal-infos lib test integration_test");
  assert.equal(projects["tool/widget_dedupe"].targets.test.options.command, "dart test");
});

test("the root Dart package names its inputs instead of owning the whole repository", async () => {
  const projects = await projectsByRoot();
  const rootInputs = projects["."].namedInputs.default;
  assert.ok(rootInputs.includes("{projectRoot}/lib/**/*"));
  assert.ok(!rootInputs.includes("{projectRoot}/**/*"));
  assert.ok(projects["packages/catch_ui"].namedInputs.default.includes("{workspaceRoot}/pubspec.lock"));
});

test("independently locked npm packages and source projects become projects", async () => {
  const projects = await projectsByRoot();
  assert.equal(projects.functions.name, "functions");
  assert.deepEqual(projects.functions.targets.build, {executor: "nx:run-script", options: {script: "build"}});
  // Read the name: the Operations boundary keeps its package name out of tool/ code.
  const operationsPackage = JSON.parse(fs.readFileSync(path.join(workspaceRoot, "operations/package.json"), "utf8"));
  assert.equal(projects.operations.name, operationsPackage.name);
  assert.equal(projects.contracts.name, "contracts");
  assert.match(projects.contracts.targets.check.options.command, /generate_schema_contracts\.mjs --check$/);
  // The conformance scans read Functions and Dart code, so editing either selects them.
  assert.ok(projects.contracts.targets.conformance.inputs.includes("{workspaceRoot}/functions/src/**/*"));
  assert.ok(projects.contracts.targets.conformance.inputs.includes("{workspaceRoot}/lib/**/*"));
  assert.equal(projects["design/tokens"].name, "design-tokens");
  // These checks compare generators with their committed output, so a change to
  // either selects them and a stale result never passes from the cache.
  // targetDefaults beat plugin targets, so a `check` default would undo all of this.
  const nxJson = JSON.parse(fs.readFileSync(path.join(workspaceRoot, "nx.json"), "utf8"));
  assert.equal(nxJson.targetDefaults.check, undefined);
  for (const [project, generator, output] of [
    ["contracts", "{workspaceRoot}/tool/contracts/**/*", "{workspaceRoot}/admin/src/generated/**/*"],
    ["design/tokens", "{workspaceRoot}/tool/design_tokens/**/*", "{workspaceRoot}/packages/web-config/generated/**/*"],
  ]) {
    assert.equal(projects[project].targets.check.cache, false);
    assert.ok(projects[project].targets.check.inputs.includes(generator));
    assert.ok(projects[project].targets.check.inputs.includes(output));
  }
});

test("path dependencies and declared sources become graph edges", async () => {
  const projects = Object.fromEntries(
    Object.values(await projectsByRoot()).map((project) => [project.name, project]),
  );
  for (const name of ["catch-admin", "catch-marketing", "@catch/web-config", "@catch/brand"]) {
    projects[name] ??= {root: name};
  }
  const edges = createDependencies(options, {workspaceRoot, projects})
    .map(({source, target, type}) => `${source} -> ${target} (${type})`);
  for (const edge of [
    "catch_consumer_app -> catch_dating_app (static)",
    "catch_dating_app -> catch_ui (static)",
    "catch_ui -> catch_tokens (static)",
    "widgetbook_workspace -> catch_dating_app (static)",
    "catch_dating_app -> contracts (implicit)",
    "functions -> contracts (implicit)",
    "catch_tokens -> design-tokens (implicit)",
  ]) {
    assert.ok(edges.includes(edge), `missing ${edge}`);
  }
  assert.ok(!edges.some((edge) => edge.startsWith("catch_ui -> catch_dating_app")), "membership must not add a cycle");
});
