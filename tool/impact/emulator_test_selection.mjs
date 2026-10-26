#!/usr/bin/env node
import fs from "node:fs";
import {createRequire} from "node:module";
import path from "node:path";
import {parseArgs} from "node:util";
import {repoRoot} from "../lib/repo_paths.mjs";
import {cruiseModules, loadDependencyCruiser} from "../lib/dependency_cruiser.mjs";
import {selectEmulatorTests} from "../lib/functions_test_selection.mjs";
import {changedPathsSince} from "../harness/lib/git_changes.mjs";

// Prints the strict emulator tests a pull request can affect, for
// `CATCH_TEST_SELECTION` in functions/scripts/run-tests.cjs. CI uses it only on
// pull requests; the merge queue, main and nightly run every listed test.
const {values} = parseArgs({options: {
  base: {type: "string"}, head: {type: "string", default: "HEAD"},
  paths: {type: "string"}, output: {type: "string"},
}});
if (!values.base && !values.paths) {
  console.error("Usage: emulator_test_selection.mjs (--base <ref> [--head <ref>] | --paths a,b) [--output file]");
  process.exit(64);
}
const changedPaths = values.paths ? values.paths.split(",").filter(Boolean) :
  changedPathsSince({base: values.base, head: values.head, committedOnly: true});
const depcruise = await loadDependencyCruiser();
if (!depcruise) {
  console.error("Emulator test selection needs `npm ci --prefix tool/impact`.");
  process.exit(1);
}
const functionsRoot = path.join(repoRoot, "functions");
const tsConfigFile = path.join(functionsRoot, "tsconfig.json");
const previous = process.cwd();
process.chdir(functionsRoot);
let modules;
try {
  modules = cruiseModules(await depcruise.cruise(["src", "test"], {
    tsConfig: {fileName: tsConfigFile},
    doNotFollow: {path: "(^|/)node_modules/"},
    exclude: {path: "(^|/)node_modules/"},
  }, {}, {tsConfig: depcruise.extractTSConfig(tsConfigFile)}));
} finally {
  process.chdir(previous);
}
// The Functions test runner owns the strict list and its file format.
const {listedStrictTests} = createRequire(import.meta.url)(path.join(functionsRoot, "scripts/run-tests.cjs"));
const listed = listedStrictTests(functionsRoot);
const selection = selectEmulatorTests({changedPaths, listed, modules, readSource: (file) => {
  try { return fs.readFileSync(path.join(functionsRoot, file), "utf8"); } catch { return ""; }
}});
const report = {...selection, listed: listed.length, graph: {tool: "dependency-cruiser", version: depcruise.version}};
const text = `${JSON.stringify(report, null, 2)}\n`;
if (values.output) fs.writeFileSync(values.output, text);
else process.stdout.write(text);
