import assert from "node:assert/strict";
import test from "node:test";
import {emulatorShards, selectEmulatorTests, singleShardTestLimit, sourceForListedTest} from "./functions_test_selection.mjs";

const dependency = (resolved) => ({module: `./${resolved}`, resolved, coreModule: false, couldNotResolve: false});
const listed = [
  "lib/a/service.test.js",
  "lib/b/other.test.js",
  "lib/c/schema.test.js",
  "test/firestore.rules.test.cjs",
];
const modules = [
  {source: "src/a/service.test.ts", dependencies: [dependency("src/a/service.ts")]},
  {source: "src/a/service.ts", dependencies: [dependency("src/shared/util.ts")]},
  {source: "src/shared/util.ts", dependencies: []},
  {source: "src/b/other.test.ts", dependencies: [dependency("src/b/other.ts")]},
  {source: "src/b/other.ts", dependencies: []},
  {source: "src/c/schema.test.ts", dependencies: [dependency("src/c/schema.ts")]},
  {source: "src/c/schema.ts", dependencies: []},
  {source: "test/firestore.rules.test.cjs", dependencies: [
    {module: "../lib/shared/util", couldNotResolve: true, coreModule: false}]},
];
const sources = {
  "src/c/schema.ts": "const file = path.join(repoRoot, 'contracts', 'firestore', name);",
  "test/firestore.rules.test.cjs": "const rules = fs.readFileSync('../firestore.rules', 'utf8');",
  "src/b/other.ts": "export const fixture = readJson('fixtures/sample.json');",
};
const select = (changedPaths) => selectEmulatorTests({changedPaths, listed, modules,
  readSource: (file) => sources[file] ?? ""});

test("listed tests map compiled tests to their sources", () => {
  assert.equal(sourceForListedTest("lib/a/x.test.js"), "src/a/x.test.ts");
  assert.equal(sourceForListedTest("test/y.rules.test.cjs"), "test/y.rules.test.cjs");
});

test("a source change selects every listed test whose imports reach it, through compiled requires too", () => {
  assert.deepEqual(select(["functions/src/shared/util.ts"]),
    {mode: "selected", tests: ["lib/a/service.test.js", "test/firestore.rules.test.cjs"], reasons: []});
  assert.deepEqual(select(["functions/src/b/other.ts"]).tests, ["lib/b/other.test.js"]);
});

test("contract files select the tests that read them as data", () => {
  assert.deepEqual(select(["contracts/firestore/events.schema.json"]).tests, ["lib/c/schema.test.js"]);
});

test("the entry point selects the tests that read its export list, though nothing imports it", () => {
  const entryListed = ["scripts/functionExports.test.cjs", "lib/commands/catalog.test.js", "lib/b/other.test.js"];
  const entryModules = [
    {source: "scripts/functionExports.test.cjs", dependencies: [dependency("scripts/functionExports.cjs")]},
    {source: "scripts/functionExports.cjs", dependencies: []},
    {source: "src/commands/catalog.test.ts", dependencies: []},
    {source: "src/b/other.test.ts", dependencies: [dependency("src/b/other.ts")]},
    {source: "src/b/other.ts", dependencies: []},
  ];
  const entrySources = {
    "scripts/functionExports.test.cjs": "require(\"./functionExports.cjs\");",
    "src/commands/catalog.test.ts": "path.join(repo, \"functions/scripts/functionExports.cjs\")",
  };
  const result = selectEmulatorTests({changedPaths: ["functions/src/index.ts"], listed: entryListed,
    modules: entryModules, readSource: (file) => entrySources[file] ?? ""});
  assert.deepEqual(result, {mode: "selected", reasons: [],
    tests: ["scripts/functionExports.test.cjs", "lib/commands/catalog.test.js"]});
});

test("the action catalog contract selects the tests that reach its generated module", () => {
  const importer = {source: "src/b/other.ts", dependencies: [
    {module: "../shared/generated/adminActionCatalog", couldNotResolve: true, coreModule: false}]};
  for (const changed of ["contracts/admin/admin_action_catalog.json", "contracts/admin/actions/sales.json"]) {
    const result = selectEmulatorTests({
      changedPaths: [changed], listed,
      modules: modules.map((module) => module.source === importer.source ? importer : module),
      readSource: (file) => sources[file] ?? "",
    });
    assert.ok(result.tests.includes("lib/b/other.test.js"), JSON.stringify(result));
  }
});

test("shared inputs and unexplained functions files run every listed test", () => {
  for (const changed of ["firestore.rules", "storage.rules", "functions/package.json", "functions/package-lock.json", "functions/tsconfig.json",
    "functions/scripts/run-tests.cjs", "firebase.json"]) {
    const result = select([changed]);
    assert.equal(result.mode, "full", changed);
    assert.deepEqual(result.tests, listed);
  }
  assert.equal(select(["functions/src/b/fixtures/unknown.bin"]).mode, "full");
  assert.deepEqual(select(["functions/src/b/fixtures/sample.json"]).tests, ["lib/b/other.test.js"]);
});

test("docs and unrelated folders select nothing unless a test names them", () => {
  assert.deepEqual(select(["functions/README.md", "website/src/page.tsx"]),
    {mode: "selected", tests: [], reasons: []});
});

test("emulator shards: none for an empty selection, one for a small one, three otherwise", () => {
  const tests = (count) => Array.from({length: count}, (_, index) => `test/t${index}.test.cjs`);
  assert.deepEqual(emulatorShards(undefined), [1, 2, 3]);
  assert.deepEqual(emulatorShards({mode: "full", tests: tests(100)}), [1, 2, 3]);
  assert.deepEqual(emulatorShards({mode: "selected", tests: []}), []);
  assert.deepEqual(emulatorShards({mode: "selected", tests: tests(1)}), [1]);
  assert.deepEqual(emulatorShards({mode: "selected", tests: tests(singleShardTestLimit)}), [1]);
  assert.deepEqual(emulatorShards({mode: "selected", tests: tests(singleShardTestLimit + 1)}), [1, 2, 3]);
  assert.throws(() => emulatorShards({mode: "partial", tests: []}), /mode full or selected/u);
  assert.throws(() => emulatorShards({mode: "selected"}), /tests array/u);
});

test("a contract change selects its readers, dynamic readers and generated-module importers only", () => {
  const listed = ["lib/a/reads.test.js", "lib/b/other.test.js", "lib/c/dynamic.test.js", "lib/d/validates.test.js"];
  const modules = [
    {source: "src/a/reads.test.ts", dependencies: [dependency("src/shared/contractFixtures.ts")]},
    {source: "src/shared/contractFixtures.ts", dependencies: []},
    {source: "src/b/other.test.ts", dependencies: [dependency("src/shared/contractFixtures.ts")]},
    {source: "src/c/dynamic.test.ts", dependencies: []},
    {source: "src/d/validates.test.ts", dependencies: [dependency("src/d/service.ts")]},
    {source: "src/d/service.ts", dependencies: [dependency("src/shared/generated/schemas/organizerDocument.ts")]},
    {source: "src/shared/generated/schemas/organizerDocument.ts", dependencies: []},
  ];
  const sources = {
    "src/shared/contractFixtures.ts": 'const root = path.resolve(__dirname, "..", "..", "..", "contracts");',
    "src/a/reads.test.ts": 'const doc = contractFixture("organizer_doc");',
    "src/b/other.test.ts": 'const doc = contractFixture("event_doc");',
    "src/c/dynamic.test.ts": 'readFileSync("../contracts/firestore/" + name + ".schema.json");',
    "src/shared/generated/schemas/organizerDocument.ts":
      '{"$id": "https://catch.app/contracts/firestore/organizers.schema.json"}',
  };
  const run = (changed) => selectEmulatorTests({changedPaths: [changed], listed, modules,
    readSource: (file) => sources[file] ?? ""}).tests;
  assert.deepEqual(run("contracts/fixtures/valid/organizer_doc.json"), ["lib/a/reads.test.js", "lib/c/dynamic.test.js"]);
  assert.deepEqual(run("contracts/firestore/organizers.schema.json"), ["lib/c/dynamic.test.js", "lib/d/validates.test.js"]);
  assert.deepEqual(run("contracts/catalogs/unrelated.json"), ["lib/c/dynamic.test.js"]);
});

// Paths outside functions/ and contracts/: a test runs only when a file in its
// tree can read the path, unless the tree has a read the selector can't bound.
const fsHeader = "import fs from \"node:fs\";\nimport path from \"node:path\";\n";
const repoListed = [
  "lib/docs/guide.test.js",
  "lib/docs/label.test.js",
  "lib/graph/loader.test.js",
  "lib/graph/mention.test.js",
  "lib/root/built.test.js",
  "lib/root/unnamed.test.js",
  "lib/env/words.test.js",
];
const repoModules = repoListed.map((test) => ({source: sourceForListedTest(test), dependencies: []}));
const repoSources = {
  // Reads the guide by path.
  "src/docs/guide.test.ts": `${fsHeader}fs.readFileSync(path.join(__dirname, "../../../docs/guide.md"), "utf8");`,
  // Names docs as a word only.
  "src/docs/label.test.ts": "const section = \"docs\";\nassert.equal(section, \"docs\");",
  // Loads the component graph through a same-file root.
  "src/graph/loader.test.ts": `${fsHeader}const repoRoot = path.resolve(__dirname, "..", "..", "..");\nconst graph = JSON.parse(fs.readFileSync(path.join(repoRoot, "tool", "harness", "component_graph.json"), "utf8"));`,
  // Names tool without reading anything under it.
  "src/graph/mention.test.ts": "const kinds = [\"tool\", \"service\"];\nassert.ok(kinds.includes(\"tool\"));",
  // Builds a path from a root folder and a computed name: unbounded, so the broad rule keeps it.
  "src/root/built.test.ts": `${fsHeader}const toolRoot = path.join(repoRoot(), "tool");\nfor (const name of names()) fs.readFileSync(path.join(toolRoot, name));`,
  // Unbounded too, but its tree never names tool: the broad rule can't reach it either.
  "src/root/unnamed.test.ts": `${fsHeader}fs.readFileSync(process.env.FIXTURE_FILE);`,
  // "test" as a value, a label and a test name, as Functions tests often write it.
  "src/env/words.test.ts": "test(\"test\", () => assert.equal(config.environment, \"test\"));\nconst status = {mode: \"test\"};",
};
const selectRepo = (changed) => selectEmulatorTests({changedPaths: [changed], listed: repoListed, modules: repoModules,
  readSource: (file) => repoSources[file] ?? ""});

test("a docs change selects only tests that read the file by path", () => {
  assert.deepEqual(selectRepo("docs/guide.md").tests, ["lib/docs/guide.test.js"]);
  assert.deepEqual(selectRepo("docs/other.md").tests, []);
});

test("the component graph selects the tests that load it, not the ones that only say tool", () => {
  assert.deepEqual(selectRepo("tool/harness/component_graph.json").tests,
    ["lib/graph/loader.test.js", "lib/root/built.test.js"]);
});

test("negative control: a root-built read the selector can't bound still selects its test", () => {
  const result = selectEmulatorTests({changedPaths: ["tool/anything/new.json"], listed: repoListed, modules: repoModules,
    readSource: (file) => repoSources[file] ?? "", explain: true});
  assert.deepEqual(result.tests, ["lib/root/built.test.js"]);
  assert.match(result.why["lib/root/built.test.js"], /^broad: src\/root\/built\.test\.ts has an unbounded read; the tree names tool$/u);
});

test("test/ui_captures changes no longer select every test that says test", () => {
  assert.deepEqual(selectRepo("test/ui_captures/capture_runner_test.dart").tests, []);
});

test("explain says which read covers a selected test", () => {
  const result = selectEmulatorTests({changedPaths: ["docs/guide.md"], listed: repoListed, modules: repoModules,
    readSource: (file) => repoSources[file] ?? "", explain: true});
  assert.deepEqual(result.why, {"lib/docs/guide.test.js": "reads */docs/guide.md"});
});
