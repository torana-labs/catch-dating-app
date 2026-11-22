import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import test from "node:test";
import {fileURLToPath} from "node:url";
import {repoRoot} from "./repo_paths.mjs";
import {createRepositorySnapshot} from "./repository_snapshot.mjs";
import {
  formatToolsManifest,
  isToolsManifestPath,
  legacyToolsManifestPath,
  loadToolsManifest,
  loadToolsManifestFromSnapshot,
  splitToolsManifest,
  toolIdFromManifestFile,
  toolsManifestAt,
  toolsManifestFrom,
  toolsManifestFromFiles,
  toolsManifestHeaderPath,
  toolsManifestLayoutProblems,
  toolsManifestPatterns,
  toolsManifestTextAt,
  toolsManifestTextFrom,
  toolsManifestToolPath,
  touchesToolsManifest,
  writeToolsManifest,
} from "./tools_manifest.mjs";

const loader = fileURLToPath(new URL("./tools_manifest.mjs", import.meta.url));

const fixtureManifest = {version: 1, updated: "2026-01-01", ciImpact: {mandatoryCheckIds: ["b:two"]},
  tools: [{id: "b:two", path: "tool/b.mjs"}, {id: "a:one", path: "tool/a.mjs"}, {id: "a_b:x-1", path: "tool/c.mjs"}]};

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-tools-manifest-"));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  return root;
}

const git = (cwd, ...args) => {
  const result = spawnSync("git", args, {cwd, encoding: "utf8"});
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
};

function fromMap(files) {
  return toolsManifestFromFiles(files.keys(), (file) => files.get(file));
}

test("one file per tool plus a header, loaded back with tools sorted by id", (t) => {
  const files = splitToolsManifest(fixtureManifest);
  assert.deepEqual([...files.keys()], [
    "tool/manifest/manifest.json",
    "tool/manifest/tools/b.two.json",
    "tool/manifest/tools/a.one.json",
    "tool/manifest/tools/a_b.x-1.json",
  ]);
  assert.equal(JSON.parse(files.get(toolsManifestHeaderPath)).tools, undefined);
  assert.equal(files.get(toolsManifestToolPath("a:one")), formatToolsManifest(fixtureManifest.tools[1]));
  const root = fixture(t);
  writeToolsManifest(root, fixtureManifest);
  const loaded = loadToolsManifest({root});
  assert.deepEqual(Object.keys(loaded), ["version", "updated", "ciImpact", "tools"]);
  assert.deepEqual(loaded.tools.map(({id}) => id), ["a:one", "a_b:x-1", "b:two"]);
  // Writing again replaces the manifest, so a dropped tool's file goes too.
  writeToolsManifest(root, {...fixtureManifest, tools: [fixtureManifest.tools[1]]});
  assert.deepEqual(loadToolsManifest({root}).tools.map(({id}) => id), ["a:one"]);
});

test("file names map to ids reversibly, and only manifest paths count", () => {
  for (const id of ["meta:tool-manifest", "a:one", "a_b:x-1"]) {
    assert.equal(toolIdFromManifestFile(toolsManifestToolPath(id)), id);
  }
  assert.equal(toolsManifestToolPath("meta:tool-manifest"), "tool/manifest/tools/meta.tool-manifest.json");
  for (const bad of ["no-colon", "a:b:c", "A:upper", "a:dot.ted", ""]) {
    assert.throws(() => toolsManifestToolPath(bad), /must be <category>:<name>/u, bad);
  }
  for (const name of ["tool/manifest/tools/a.json", "tool/manifest/tools/a.b.c.json", "tool/manifest/a.b.json",
    "tool/manifest/tools/sub/a.b.json", "tool/manifest/tools/a.b.txt"]) {
    assert.equal(toolIdFromManifestFile(name), null, name);
  }
  assert.deepEqual(toolsManifestPatterns, ["tool/manifest/**"]);
  for (const file of ["tool/manifest/manifest.json", "tool/manifest/tools/a.one.json", legacyToolsManifestPath]) {
    assert.equal(isToolsManifestPath(file), true, file);
  }
  for (const file of ["tool/manifestx/a.json", "tool/run.mjs", "docs/tool/manifest/a.json"]) {
    assert.equal(isToolsManifestPath(file), false, file);
  }
  assert.equal(touchesToolsManifest(["docs/README.md", "tool/manifest/tools/a.one.json"]), true);
  assert.equal(touchesToolsManifest(["docs/README.md"]), false);
});

test("fails closed on every malformed layout, naming each file", () => {
  const good = splitToolsManifest(fixtureManifest);
  const cases = [
    ["missing header", (files) => files.delete(toolsManifestHeaderPath), /manifest\.json: missing/u],
    ["header holding tools", (files) => files.set(toolsManifestHeaderPath, JSON.stringify({version: 1, tools: []})),
      /manifest\.json: tools live in tool\/manifest\/tools\//u],
    ["unparseable header", (files) => files.set(toolsManifestHeaderPath, "{\"version\": 1,"),
      /manifest\.json: invalid JSON/u],
    // A second file can't smuggle in a duplicate id: every id is its file's name.
    ["duplicate id", (files) => files.set("tool/manifest/tools/a.copy.json", JSON.stringify({id: "a:one"})),
      /tools\/a\.copy\.json: id must be "a:copy"/u],
    ["id and file name disagree", (files) => files.set(toolsManifestToolPath("a:one"), JSON.stringify({id: "b:two"})),
      /tools\/a\.one\.json: id must be "a:one"/u],
    ["orphan file beside the header", (files) => files.set("tool/manifest/a.one.json", good.get(toolsManifestToolPath("a:one"))),
      /tool\/manifest\/a\.one\.json: not a manifest file/u],
    ["nested file", (files) => files.set("tool/manifest/tools/old/a.one.json", "{}"),
      /tools\/old\/a\.one\.json: not a manifest file/u],
    ["misnamed file", (files) => files.set("tool/manifest/tools/a-one.json", "{}"), /tools\/a-one\.json: not a manifest file/u],
    ["unparseable tool", (files) => files.set(toolsManifestToolPath("a:one"), "{"), /tools\/a\.one\.json: invalid JSON/u],
    ["empty tool file", (files) => files.set(toolsManifestToolPath("a:one"), ""), /tools\/a\.one\.json: invalid JSON/u],
    ["tool that is not an object", (files) => files.set(toolsManifestToolPath("a:one"), "[]"),
      /tools\/a\.one\.json: must hold a JSON object/u],
    ["the single file back beside the split", (files) => files.set(legacyToolsManifestPath, "{}"),
      /tool\/tools_manifest\.json: the manifest lives in tool\/manifest\/; delete this file/u],
  ];
  for (const [name, edit, pattern] of cases) {
    const files = new Map(good);
    edit(files);
    assert.throws(() => fromMap(files), pattern, name);
  }
  const several = new Map(good);
  several.set(toolsManifestToolPath("a:one"), "{");
  several.set(toolsManifestToolPath("b:two"), JSON.stringify({id: "a:one"}));
  assert.throws(() => fromMap(several), (error) => /a\.one\.json: invalid JSON/u.test(error.message) &&
    /b\.two\.json: id must be "b:two"/u.test(error.message));
  assert.deepEqual(toolsManifestLayoutProblems(good.keys()), []);
  assert.equal(fromMap(new Map([...good, ["tool/other.json", "{"]])).tools.length, 3);
});

test("every reader gives this repository's combined manifest, and the loader prints it", () => {
  const manifest = loadToolsManifest();
  assert.deepEqual(loadToolsManifestFromSnapshot(createRepositorySnapshot()), manifest);
  const files = new Map(splitToolsManifest(manifest));
  assert.deepEqual(toolsManifestFrom({list: () => [...files.keys()], read: (file) => files.get(file)}), manifest);
  assert.equal(toolsManifestTextFrom({list: () => [...files.keys()], read: (file) => files.get(file)}),
    formatToolsManifest(manifest));
  const ids = manifest.tools.map(({id}) => id);
  assert.deepEqual(ids, [...ids].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)));
  assert.equal(fs.existsSync(path.join(repoRoot, legacyToolsManifestPath)), false,
    "the combined manifest is printed on demand, never committed");
  const printed = spawnSync(process.execPath, [loader], {cwd: os.tmpdir(), encoding: "utf8", maxBuffer: 64 * 1024 * 1024});
  assert.equal(printed.status, 0, printed.stderr);
  assert.equal(printed.stdout, formatToolsManifest(manifest));
});

test("a revision reads the split files, or the single file from before the split", (t) => {
  const root = fixture(t);
  git(root, "init", "-q");
  const commit = (message) => {
    git(root, "add", "-A");
    git(root, "-c", "user.name=t", "-c", "user.email=t@example.test", "commit", "-q", "--allow-empty", "-m", message);
    return git(root, "rev-parse", "HEAD").trim();
  };
  const empty = commit("empty");
  const legacyText = `${JSON.stringify(fixtureManifest, null, 2)}\n`;
  fs.mkdirSync(path.join(root, "tool"));
  fs.writeFileSync(path.join(root, legacyToolsManifestPath), legacyText);
  const before = commit("single file");
  writeToolsManifest(root, fixtureManifest);
  const after = commit("split");
  assert.equal(toolsManifestTextAt(before, {cwd: root}), legacyText, "the single file comes back as it was");
  const sorted = {...fixtureManifest, tools: [...fixtureManifest.tools].sort((a, b) => (a.id < b.id ? -1 : 1))};
  assert.equal(toolsManifestTextAt(after, {cwd: root}), formatToolsManifest(sorted));
  assert.deepEqual(toolsManifestAt(after, {cwd: root}), sorted);
  assert.equal(toolsManifestTextAt(empty, {cwd: root}), null);
  assert.equal(toolsManifestAt("0000000000000000000000000000000000000000", {cwd: root}), null);
  assert.throws(() => toolsManifestTextAt(empty, {cwd: root, strict: true}), /no tools manifest/u);
  // A broken revision is unreadable rather than half-read.
  fs.writeFileSync(path.join(root, toolsManifestToolPath("a:one")), "{");
  const broken = commit("broken");
  assert.equal(toolsManifestTextAt(broken, {cwd: root}), null);
  assert.throws(() => toolsManifestTextAt(broken, {cwd: root, strict: true}), /a\.one\.json: invalid JSON/u);
  // Injected readers replace Git.
  const files = splitToolsManifest(fixtureManifest);
  assert.equal(toolsManifestTextAt("any", {list: () => [...files.keys()], show: (file) => files.get(file)}),
    formatToolsManifest(sorted));
});

test("absent manifests take the fallback; a required one fails", (t) => {
  const root = fixture(t);
  assert.equal(loadToolsManifest({root, fallback: null}), null);
  assert.deepEqual(loadToolsManifest({root, fallback: {tools: []}}), {tools: []});
  assert.throws(() => loadToolsManifest({root}), /manifest\.json: missing/u);
  git(root, "init", "-q");
  fs.writeFileSync(path.join(root, "README.md"), "fixture\n");
  git(root, "add", "-A");
  const snapshot = createRepositorySnapshot({root});
  assert.throws(() => loadToolsManifestFromSnapshot(snapshot), /manifest\.json: missing/u);
  assert.deepEqual(loadToolsManifestFromSnapshot(snapshot, {fallback: {tools: []}}), {tools: []});
  assert.equal(toolsManifestTextFrom({list: () => [], read: () => null}), null);
});
