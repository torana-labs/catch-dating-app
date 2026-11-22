import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import test from "node:test";
import {repoRoot} from "./repo_paths.mjs";
import {createRepositorySnapshot} from "./repository_snapshot.mjs";
import {
  isToolsManifestPath,
  loadToolsManifest,
  loadToolsManifestFromSnapshot,
  toolsManifestAt,
  toolsManifestFrom,
  toolsManifestPath,
  toolsManifestPatterns,
  toolsManifestTextAt,
  toolsManifestTextFrom,
  touchesToolsManifest,
  writeToolsManifest,
} from "./tools_manifest.mjs";

const fixtureManifest = {version: 1, ciImpact: {mandatoryCheckIds: []},
  tools: [{id: "a:one", path: "tool/a.mjs"}, {id: "b:two", path: "tool/b.mjs"}]};

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-tools-manifest-"));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  return root;
}

test("every loader returns exactly what parsing this repository's manifest file gives", () => {
  const parsed = JSON.parse(fs.readFileSync(path.join(repoRoot, toolsManifestPath), "utf8"));
  assert.deepEqual(loadToolsManifest(), parsed);
  assert.deepEqual(loadToolsManifestFromSnapshot(createRepositorySnapshot()), parsed);
  assert.deepEqual(toolsManifestFrom({read: (file) => fs.readFileSync(path.join(repoRoot, file), "utf8")}),
    parsed);
  assert.deepEqual(toolsManifestAt("HEAD"), JSON.parse(spawnSync("git",
    ["show", `HEAD:${toolsManifestPath}`], {cwd: repoRoot, encoding: "utf8"}).stdout));
});

test("names the manifest's paths for selectors, sparse checkouts and inputs", () => {
  assert.deepEqual(toolsManifestPatterns, ["tool/tools_manifest.json"]);
  assert.equal(isToolsManifestPath("tool/tools_manifest.json"), true);
  for (const other of ["tool/tools_manifest.jsonx", "tool/run.mjs", "docs/tool/tools_manifest.json"]) {
    assert.equal(isToolsManifestPath(other), false, other);
  }
  assert.equal(touchesToolsManifest(["docs/README.md", "tool/tools_manifest.json"]), true);
  assert.equal(touchesToolsManifest(["docs/README.md"]), false);
});

test("a fixture written by writeToolsManifest loads back, and an absent one takes the fallback", (t) => {
  const root = fixture(t);
  assert.equal(loadToolsManifest({root, fallback: null}), null);
  assert.deepEqual(loadToolsManifest({root, fallback: {tools: []}}), {tools: []});
  assert.throws(() => loadToolsManifest({root}), /ENOENT/u);
  writeToolsManifest(root, fixtureManifest);
  assert.equal(fs.readFileSync(path.join(root, toolsManifestPath), "utf8"),
    `${JSON.stringify(fixtureManifest, null, 2)}\n`);
  assert.deepEqual(loadToolsManifest({root}), fixtureManifest);
  writeToolsManifest(root, null, {text: "{\"tools\": []}"});
  assert.deepEqual(loadToolsManifest({root}), {tools: []});
});

test("reader-based loading honours exists and reports malformed JSON", () => {
  const files = new Map([[toolsManifestPath, JSON.stringify(fixtureManifest)]]);
  const reader = {read: (file) => files.get(file), exists: (file) => files.has(file)};
  assert.equal(toolsManifestTextFrom(reader), JSON.stringify(fixtureManifest));
  assert.deepEqual(toolsManifestFrom(reader), fixtureManifest);
  files.clear();
  assert.equal(toolsManifestTextFrom(reader), null);
  assert.deepEqual(toolsManifestFrom({...reader, fallback: {tools: []}}), {tools: []});
  files.set(toolsManifestPath, "{");
  assert.throws(() => toolsManifestFrom(reader), SyntaxError);
});

test("a revision's manifest is null when Git cannot read it, and an injected reader is used as is", () => {
  assert.equal(toolsManifestTextAt("0000000000000000000000000000000000000000"), null);
  assert.equal(toolsManifestAt("0000000000000000000000000000000000000000"), null);
  const seen = [];
  const text = toolsManifestTextAt("base", {show: (file) => {
    seen.push(file);
    return "{\"tools\": []}";
  }});
  assert.deepEqual(seen, [toolsManifestPath]);
  assert.equal(text, "{\"tools\": []}");
  assert.throws(() => toolsManifestTextAt("base", {show: () => {
    throw new Error("history unreadable");
  }}), /history unreadable/u);
});

test("a snapshot without the manifest fails when it is required and falls back when one is given", (t) => {
  const root = fixture(t);
  const git = (...args) => spawnSync("git", args, {cwd: root, encoding: "utf8"});
  assert.equal(git("init", "-q").status, 0);
  fs.writeFileSync(path.join(root, "README.md"), "fixture\n");
  assert.equal(git("add", "-A").status, 0);
  const snapshot = createRepositorySnapshot({root});
  assert.throws(() => loadToolsManifestFromSnapshot(snapshot));
  assert.deepEqual(loadToolsManifestFromSnapshot(snapshot, {fallback: {tools: []}}), {tools: []});
});
