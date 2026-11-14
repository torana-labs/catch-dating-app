import assert from "node:assert/strict";
import test from "node:test";
import {maskSource, readsPath, sourceReads} from "./functions_test_reads.mjs";

const reads = (source, file = "functions/src/area/thing.test.ts") => sourceReads({file, source});
const fsImport = "import fs, {readFileSync} from \"node:fs\";\nimport path from \"node:path\";\n";

test("literal and __dirname-anchored reads resolve to repository paths", () => {
  assert.deepEqual(reads(`${fsImport}readFileSync("../docs/guide.md", "utf8");`).reads, ["*/docs/guide.md", "docs/guide.md"]);
  const anchored = reads(`${fsImport}fs.readFileSync(path.join(__dirname, "..", "..", "..", "tool", "harness", "component_graph.json"));`);
  assert.equal(anchored.bounded, true);
  assert.ok(anchored.reads.includes("tool/harness/component_graph.json"), JSON.stringify(anchored));
  // path.resolve with no anchor resolves against the working directory, functions/.
  assert.ok(reads(`${fsImport}readFileSync(path.resolve("src/index.ts"));`).reads.includes("functions/src/index.ts"));
});

test("constants resolve when they are the file's only binding of the name", () => {
  const topLevel = reads(`${fsImport}const root = path.resolve(__dirname, "../../..");\nreadFileSync(path.join(root, "website/src/analytics/measure.ts"));`);
  assert.ok(topLevel.reads.includes("website/src/analytics/measure.ts"), JSON.stringify(topLevel));
  const inner = reads(`${fsImport}test("x", () => {\n  const fixture = "../test/fixtures/case.json";\n  readFileSync(fixture);\n});`);
  assert.ok(inner.reads.includes("test/fixtures/case.json"), JSON.stringify(inner));
});

test("computed, shadowed and templated read paths are unbounded", () => {
  for (const body of [
    "readFileSync(path.join(root, name));",
    "const root = \"docs\";\nfunction load(root) { return readFileSync(root); }",
    "const dir = \"docs\";\nconst {dir: other} = options;\nlet dir2 = dir;\nreadFileSync(dir2);",
    "readFileSync(`${root}/docs/${name}`);",
    "fs.readdirSync(directory).map((file) => fs.readFileSync(path.join(directory, file)));",
  ]) {
    const result = reads(`${fsImport}${body}`);
    assert.equal(result.bounded, false, body);
    assert.match(result.why, /computed read path/u, body);
  }
});

test("a declaration bounds computed reads to its roots", () => {
  const declared = reads(`// test-selection-reads: contracts/, website/src/\n${fsImport}export const load = (file) => readFileSync(path.join(root, file));`);
  assert.equal(declared.bounded, true);
  assert.deepEqual(declared.declared, ["contracts", "website/src"]);
  assert.ok(readsPath(declared.reads, "website/src/app.ts"));
  assert.ok(!readsPath(declared.reads, "docs/guide.md"));
  // A parent-relative or empty root bounds nothing.
  assert.equal(reads(`// test-selection-reads: ../outside/\n${fsImport}readFileSync(file);`).bounded, false);
});

test("a child process stays unbounded even with a declaration; RegExp exec is not a process", () => {
  const spawn = "import {execFileSync} from \"node:child_process\";\nexecFileSync(\"node\", [\"script.mjs\"]);";
  assert.match(reads(spawn).why, /child process via execFileSync/u);
  assert.equal(reads(`// test-selection-reads: tool/\n${spawn}`).bounded, false);
  for (const body of ["const m = /^a(b)$/u.exec(value);", "const m = pattern.exec(value);", "const m = new RegExp(x).exec(value);"]) {
    assert.equal(reads(body).bounded, true, body);
  }
});

test("method definitions and non-fs functions are not reads", () => {
  assert.equal(reads("class Vault {\n  async access(version: string): Promise<string> { return version; }\n}").bounded, true);
  // access() without an fs import is some other function.
  assert.equal(reads("const value = access(config);").bounded, true);
  assert.equal(reads("import {access} from \"node:fs/promises\";\nconst value = access(config);").bounded, false);
});

test("reads through any local name for node:fs are seen", () => {
  for (const body of [
    "import * as filesystem from \"node:fs\";\nfilesystem.readFileSync(name);",
    "const {readFileSync: rf} = require(\"fs\");\nrf(name);",
    "import {readFile as load} from \"node:fs/promises\";\nawait load(name);",
    "import fs from \"node:fs\";\nconst {readdirSync} = fs;\nreaddirSync(dir);",
    "import fs from \"node:fs\";\nconst read = fs.readFileSync;\nread(name);",
    "import fs from \"node:fs\";\nconst files = fs.promises;\nawait files.readFile(name);",
    "const text = require(\"fs\").readFileSync(name);",
    "import $fs from \"node:fs\";\nconst {readFileSync: read$} = $fs;\nread$(name);",
  ]) assert.match(reads(body).why ?? "", /computed read path/u, body);
});

test("imports: literal specifiers are code edges; computed or path-loaded modules are unbounded", () => {
  assert.deepEqual(reads("import x from \"../lib/x\";\nconst y = require(\"./y\");\nawait import(\"./z.js\");").reads, []);
  assert.match(reads("await import(modulePath);").why, /dynamic import/u);
  // A module loaded by path runs its own imports, which nothing follows.
  const runner = "import path from \"node:path\";\nimport {pathToFileURL} from \"node:url\";\nawait import(pathToFileURL(path.resolve(__dirname, \"../../../website/scripts/generate.mjs\")).href);";
  assert.match(reads(runner).why, /import\(\) runs website\/scripts\/generate\.mjs, whose imports are not followed/u);
  const declared = reads(`// test-selection-reads: website/scripts/\n${runner}`);
  assert.equal(declared.bounded, true);
  assert.ok(readsPath(declared.reads, "website/scripts/next/projection.mjs"));
});

test("path-like literals add suffix reads; bare words, prose and URLs do not", () => {
  assert.deepEqual(reads("const doc = `events/${eventId}`;\nconst dir = \"organizers/\";").reads, []);
  const result = reads("const graph = \"harness/component_graph.json\";\nconst label = \"docs\";\nconst env = \"test\";\nconst link = \"https://example.com/docs/guide.md\";\nconst text = \"and/or more\";");
  assert.deepEqual(result.reads, ["*/harness/component_graph.json"]);
  assert.ok(readsPath(result.reads, "tool/harness/component_graph.json"));
  assert.ok(!readsPath(result.reads, "docs/guide.md"));
  assert.ok(!readsPath(result.reads, "test/ui_captures/runner_test.dart"));
});

test("comments and regular expressions are not code", () => {
  assert.equal(reads(`${fsImport}// readFileSync(path.join(root, name));\n/* exec(command) */\nconst re = /readFileSync\\(x\\)/u;`).bounded, true);
  const masked = maskSource("a // b\nc /* d */ e");
  assert.equal(masked.length, "a // b\nc /* d */ e".length);
  assert.doesNotMatch(masked, /[bd]/u);
});

test("readsPath covers exact, directory and suffix reads", () => {
  assert.ok(readsPath(["docs"], "docs/guide.md"));
  assert.ok(readsPath(["docs/guide.md"], "docs/guide.md"));
  assert.ok(!readsPath(["docs/guide.md"], "docs/guide.md.bak"));
  assert.ok(readsPath([""], "anything/at/all"));
  assert.ok(readsPath(["*/component_graph.json"], "tool/harness/component_graph.json"));
  assert.ok(readsPath(["*/event/fixtures"], "test/event/fixtures/case.json"));
  // One segment is a file name, never a directory: "events/" from `events/${id}`.
  assert.ok(!readsPath(["*/fixtures"], "test/event/fixtures/case.json"));
  assert.ok(readsPath(["*/case.json"], "test/event/fixtures/case.json"));
  assert.ok(!readsPath(["*/graph.json"], "tool/harness/component_graph.json"));
});

test("a slash misread as a regular expression can't hide a read", () => {
  // After the keyword-like property "return", the regex-aware reading takes
  // "/ 2; ... 1 /" for a regular expression; the division reading still sees the read.
  const source = `${fsImport}const half = obj.return / 2; fs.readFileSync(name); const third = 1 / 3;`;
  assert.equal(maskSource(source).includes("readFileSync(name)"), false);
  assert.equal(reads(source).bounded, false);
});

test("createRequire loading a package is fine; loading a path, or a worker, is unbounded", () => {
  const header = "import {createRequire} from \"node:module\";\n";
  assert.equal(reads(`${header}const requireTest = createRequire(__filename);\nconst {assertFails} = requireTest(\n  \"@firebase/rules-unit-testing\",\n);`).bounded, true);
  assert.match(reads(`${header}const load = createRequire(import.meta.url);\nload("../../tool/x.cjs");`).why,
    /load loads \.\.\/\.\.\/tool\/x\.cjs by path/u);
  assert.match(reads(`${header}import path from "node:path";\nconst registry = createRequire(__filename)(path.resolve(__dirname, "../../../tool/contracts/generated/registry.mjs"));`).why,
    /createRequire\(\) loads tool\/contracts\/generated\/registry\.mjs by path/u);
  assert.match(reads(`${header}export const make = createRequire;`).why ?? "", /^$/u);
  assert.match(reads(`${header}makeLoader(createRequire(__filename));`).why, /createRequire\(\) loads modules by path/u);
  assert.match(reads("import {Worker} from \"node:worker_threads\";\nnew Worker(new URL(\"./job.mjs\", import.meta.url));").why,
    /Worker\(\) loads modules by path/u);
});
