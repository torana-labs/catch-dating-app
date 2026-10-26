#!/usr/bin/env node

"use strict";

const fs = require("node:fs");
const {createHash} = require("node:crypto");
const path = require("node:path");
const {spawnSync} = require("node:child_process");

const functionsRoot = path.resolve(__dirname, "..");
// The strict emulator list is test data, not a package script: a package.json
// edit counts as a runtime change and redeploys every Function.
const strictTestList = "test/emulator-tests.json";

function discoverTestFiles(root = functionsRoot) {
  return fs.globSync(["lib/**/*.test.js", "test/**/*.test.cjs", "scripts/**/*.test.cjs"], {cwd: root})
    .filter((file) => !file.endsWith(".rules.test.cjs"))
    .map((file) => file.split(path.sep).join("/"))
    .sort();
}

function listedStrictTests(root = functionsRoot) {
  const listed = JSON.parse(fs.readFileSync(path.join(root, strictTestList), "utf8"));
  if (!Array.isArray(listed) || !listed.every((file) => typeof file === "string")) {
    throw new Error(`${strictTestList} must be an array of test paths.`);
  }
  return listed;
}

async function run(argv = process.argv.slice(2)) {
  if (argv[0] === "--require-emulators") {
    const files = argv.slice(1);
    return runStrictFiles(files.length ? files : listedStrictTests());
  }
  const testFiles = discoverTestFiles();
  if (argv.includes("--list")) {
    process.stdout.write(`${testFiles.join("\n")}\n`);
    return 0;
  }
  if (testFiles.length === 0) {
    console.error("No compiled Functions or harness tests were discovered.");
    return 1;
  }
  console.log(`Running ${testFiles.length} discovered Functions test files.`);
  const result = spawnSync(process.execPath, ["--test", ...testFiles], {
    cwd: functionsRoot,
    stdio: "inherit",
  });
  return result.status ?? 1;
}

if (require.main === module) {
  run().then((status) => { process.exitCode = status; }).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

// CI may split the strict list across parallel emulator jobs with
// CATCH_TEST_SHARD="<index>/<total>". Round-robin positions make the shards
// disjoint and together cover every listed file exactly once.
function shardFiles(files, shard, {allowEmpty = false} = {}) {
  if (!shard) return {files, shard: null};
  const match = /^([1-9][0-9]*)\/([1-9][0-9]*)$/u.exec(shard);
  if (!match || Number(match[1]) > Number(match[2])) {
    throw new Error(`Invalid CATCH_TEST_SHARD: ${shard}`);
  }
  const [index, total] = [Number(match[1]), Number(match[2])];
  const subset = files.filter((_, position) => position % total === index - 1);
  if (!subset.length && !allowEmpty) throw new Error(`Shard ${shard} selects no backend integration tests.`);
  return {files: subset, shard: {index, total, listed: files.length}};
}

// Pull request CI may narrow the strict list to the tests a change can reach
// (tool/impact/emulator_test_selection.mjs); every other run keeps the full list.
function narrowToSelection(files, selectionPath) {
  if (!selectionPath) return {files, selection: null};
  const selection = JSON.parse(fs.readFileSync(selectionPath, "utf8"));
  if (!["full", "selected"].includes(selection.mode) || !Array.isArray(selection.tests)) {
    throw new Error(`Invalid CATCH_TEST_SELECTION: ${selectionPath}`);
  }
  const unknown = selection.tests.filter((test) => !files.includes(test));
  if (unknown.length) throw new Error(`Selection names tests outside the strict list: ${unknown.join(", ")}`);
  const summary = {mode: selection.mode, listed: files.length, reasons: selection.reasons ?? []};
  if (selection.mode === "full") return {files, selection: summary};
  return {files: files.filter((file) => selection.tests.includes(file)), selection: summary};
}

// The ordinary Functions lane intentionally allows emulator-only tests to skip.
// Its integration owner must use this mode inside emulators:exec instead.
async function runStrictFiles(files, {root = functionsRoot, shard = process.env.CATCH_TEST_SHARD,
  selectionPath = process.env.CATCH_TEST_SELECTION} = {}) {
  for (const key of ["FIRESTORE_EMULATOR_HOST", "FIREBASE_STORAGE_EMULATOR_HOST"]) {
    if (!process.env[key]) throw new Error(`${key} is required for backend integration tests.`);
  }
  if (!files.length || new Set(files).size !== files.length) {
    throw new Error("Backend integration requires nonempty, unique test files.");
  }
  const narrowed = narrowToSelection(files, selectionPath);
  const listed = narrowed.files.map((file) => {
    const absolute = path.resolve(root, file);
    if (!absolute.startsWith(`${path.resolve(root)}${path.sep}`) ||
        !/\.test\.(?:js|cjs)$/u.test(file)) {
      throw new Error(`Invalid backend integration test path: ${file}`);
    }
    return fs.realpathSync(absolute);
  });
  const {files: selected, shard: shardIdentity} = shardFiles(listed, shard,
    {allowEmpty: narrowed.selection?.mode === "selected"});
  if (selected.length === 0) {
    console.log("No strict emulator test can be affected by this change; the merge queue runs them all.");
    return writeEvidence({kind: "backend-integration-execution", shard: shardIdentity,
      selection: narrowed.selection, selected, executed: [], summaries: {}, success: true}, 0);
  }
  const {run: runTests} = require("node:test");
  const summaries = new Map();
  const executed = [];
  let failed = false;
  for await (const event of runTests({files: selected, concurrency: 1, execArgv: []})) {
    const data = event.data;
    if (event.type === "test:pass" || event.type === "test:fail") {
      const skipped = Object.hasOwn(data, "skip") && data.skip !== false;
      const todo = Object.hasOwn(data, "todo") && data.todo !== false;
      executed.push({file: data.file, name: data.name, line: data.line,
        status: skipped ? "skipped" : todo ? "todo" : event.type.slice(5)});
      if (event.type === "test:fail" || skipped || todo) failed = true;
      console.log(`${event.type}: ${data.file}:${data.line} ${data.name}${skipped ? " SKIPPED" : ""}${todo ? " TODO" : ""}`);
      if (data.details?.error) console.error(data.details.error);
    }
    if (event.type === "test:stdout" || event.type === "test:stderr") {
      process.stderr.write(data.message);
    }
    if (event.type === "test:summary") {
      if (!data.success || data.counts.failed || data.counts.cancelled ||
          data.counts.skipped || data.counts.todo) failed = true;
      if (data.file) summaries.set(fs.realpathSync(data.file), data.counts);
    }
  }
  for (const file of selected) {
    if (!(summaries.get(file)?.tests > 0)) {
      console.error(`No executed tests proved for ${file}`);
      failed = true;
    }
  }
  const source = spawnSync("git", ["rev-parse", "HEAD"], {cwd: root, encoding: "utf8"});
  const inputFiles = [...selected, path.join(root, "package-lock.json"), __filename]
    .filter((file) => fs.existsSync(file));
  const evidence = {kind: "backend-integration-execution", node: process.version,
    sourceSha: source.status === 0 ? source.stdout.trim() : null,
    platform: process.platform, architecture: process.arch,
    inputHashes: Object.fromEntries(inputFiles.map(file => [path.relative(root, file),
      createHash("sha256").update(fs.readFileSync(file)).digest("hex")])),
    shard: shardIdentity, selection: narrowed.selection, selected, executed,
    summaries: Object.fromEntries(summaries), success: !failed};
  return writeEvidence(evidence, failed ? 1 : 0);
}

function writeEvidence(evidence, status) {
  if (process.env.CATCH_TEST_EVIDENCE_PATH) {
    const output = path.resolve(process.env.CATCH_TEST_EVIDENCE_PATH);
    fs.mkdirSync(path.dirname(output), {recursive: true});
    fs.writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`);
  }
  console.log(JSON.stringify(evidence));
  return status;
}

module.exports = {discoverTestFiles, listedStrictTests, narrowToSelection, runStrictFiles, shardFiles,
  strictTestList};
