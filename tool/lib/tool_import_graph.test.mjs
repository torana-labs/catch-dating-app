import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {cruiseToolImports, importOwnersByPath, toolEntryFiles} from "./tool_import_graph.mjs";

const dependency = (resolved, extra = {}) => ({module: `./${path.posix.basename(resolved)}`, resolved,
  coreModule: false, couldNotResolve: false, ...extra});

test("entry files are the tool and every script its checks name", () => {
  assert.deepEqual(toolEntryFiles({
    path: "tool/a/run.mjs",
    checks: ["node --check tool/a/run.mjs", "node --test tool/a/run.test.mjs tool/lib/x.test.mjs", "bash tool/a/gate.sh"],
  }).sort(), ["tool/a/run.mjs", "tool/a/run.test.mjs", "tool/lib/x.test.mjs"]);
  assert.deepEqual(toolEntryFiles({path: "tool/a/gate.sh", checks: ["bash tool/a/gate.sh"]}), []);
});

test("owners follow transitive imports, keep unresolved relative paths and skip packages", () => {
  const cruise = {modules: [
    {source: "tool/a/run.mjs", dependencies: [dependency("tool/lib/x.mjs"),
      {module: "node:fs", resolved: "fs", coreModule: true}]},
    {source: "tool/a/run.test.mjs", dependencies: [dependency("tool/a/run.mjs"),
      {module: "../../website/src/data.json", couldNotResolve: true, coreModule: false},
      {module: "ajv/dist/2020.js", couldNotResolve: true, coreModule: false}]},
    {source: "tool/lib/x.mjs", dependencies: [dependency("tool/lib/y.mjs")]},
    {source: "tool/lib/y.mjs", dependencies: []},
    {source: "tool/b/run.mjs", dependencies: []},
    {source: "tool/old/run.mjs", dependencies: [dependency("tool/lib/y.mjs")]},
  ]};
  const manifest = {tools: [
    {id: "a", status: "active", path: "tool/a/run.mjs", checks: ["node --test tool/a/run.test.mjs"]},
    {id: "b", status: "active", path: "tool/b/run.mjs", checks: ["node --check tool/b/run.mjs"]},
    {id: "old", status: "retired", path: "tool/old/run.mjs", checks: ["node tool/old/run.mjs"]},
  ]};
  const owners = importOwnersByPath({manifest, cruise});
  assert.deepEqual([...owners.get("tool/lib/y.mjs")], ["a"]);
  assert.deepEqual([...owners.get("tool/lib/x.mjs")], ["a"]);
  assert.deepEqual([...owners.get("website/src/data.json")], ["a"]);
  assert.deepEqual([...owners.get("tool/b/run.mjs")], ["b"]);
  assert.equal(owners.has("ajv/dist/2020.js"), false);
  assert.equal(owners.has("tool/old/run.mjs"), false);
});

test("the import graph is unavailable until its pinned package is installed", async (context) => {
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), "tool-import-graph-"));
  context.after(() => fs.rmSync(empty, {recursive: true, force: true}));
  assert.equal(await cruiseToolImports({cwd: empty}), null);
});

test("the installed graph sees the runner import its selector", async () => {
  const cruise = await cruiseToolImports();
  if (cruise === null) {
    assert.equal(fs.existsSync("tool/impact/node_modules/dependency-cruiser/package.json"), false);
    return;
  }
  const runner = cruise.modules.find((module) => module.source === "tool/run.mjs");
  assert.ok(runner.dependencies.some((entry) => entry.resolved === "tool/lib/tool_impact.mjs"));
  const pinned = JSON.parse(fs.readFileSync("tool/impact/package.json", "utf8")).devDependencies["dependency-cruiser"];
  assert.equal(cruise.version, pinned);
});

test("the pinned package ignores its own install for sparse checkouts without the root .gitignore", () => {
  assert.match(fs.readFileSync("tool/impact/.gitignore", "utf8"), /^node_modules\/$/mu);
});
