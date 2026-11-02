import assert from "node:assert/strict";
import test from "node:test";
import {selectEmulatorTests, sourceForListedTest} from "./functions_test_selection.mjs";

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

test("the action catalog contract selects the tests that reach its generated module", () => {
  const importer = {source: "src/b/other.ts", dependencies: [
    {module: "../shared/generated/adminActionCatalog", couldNotResolve: true, coreModule: false}]};
  const result = selectEmulatorTests({
    changedPaths: ["contracts/admin/admin_action_catalog.json"], listed,
    modules: modules.map((module) => module.source === importer.source ? importer : module),
    readSource: (file) => sources[file] ?? "",
  });
  assert.ok(result.tests.includes("lib/b/other.test.js"), JSON.stringify(result));
});

test("shared inputs and unexplained functions files run every listed test", () => {
  for (const changed of ["firestore.rules", "storage.rules", "functions/package.json", "functions/package-lock.json", "functions/tsconfig.json",
    "functions/test/emulator-tests.json",
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
