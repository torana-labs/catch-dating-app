#!/usr/bin/env node
import fs from "node:fs";
import {parseArgs} from "node:util";
import {selectEmulatorTests} from "../lib/functions_test_selection.mjs";
import {discoverableFunctionsTests, functionsModules, readFunctionsSource} from "../lib/functions_module_graph.mjs";
import {changedPathsSince} from "../harness/lib/git_changes.mjs";

// Prints the Functions node --test files a pull request can affect, for
// `CATCH_UNIT_TEST_SELECTION` in functions/scripts/run-tests.cjs. It follows the
// same dependency-cruiser graph and data-path rules as the emulator selection;
// shared inputs (package, tsconfig, scripts, rules, firebase.json) select every
// test. CI uses it only on pull requests; the merge queue, main and nightly run
// every discovered test.
const {values} = parseArgs({options: {
  base: {type: "string"}, head: {type: "string", default: "HEAD"},
  paths: {type: "string"}, "paths-file": {type: "string"}, output: {type: "string"},
}});
if (!values.base && !values.paths && !values["paths-file"]) {
  console.error("Usage: functions_unit_test_selection.mjs (--base <ref> [--head <ref>] | --paths a,b | --paths-file file) [--output file]");
  process.exit(64);
}
const changedPaths = values["paths-file"]
  ? fs.readFileSync(values["paths-file"], "utf8").split("\n").map((line) => line.trim()).filter(Boolean)
  : values.paths ? values.paths.split(",").filter(Boolean) :
    changedPathsSince({base: values.base, head: values.head, committedOnly: true});
const listed = discoverableFunctionsTests();
const {modules, graph} = await functionsModules();
const selection = selectEmulatorTests({changedPaths, listed, modules, readSource: readFunctionsSource});
const text = `${JSON.stringify({...selection, listed: listed.length, graph}, null, 2)}\n`;
if (values.output) fs.writeFileSync(values.output, text);
else process.stdout.write(text);
