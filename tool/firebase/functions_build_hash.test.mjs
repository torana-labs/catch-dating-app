import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";
import {artifactName, buildInputs, buildInputsHash, isTrustedSource, libDigest} from "./functions_build_hash.mjs";

const fixture = (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-functions-build-"));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const write = (file, text) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), {recursive: true});
    fs.writeFileSync(path.join(root, file), text);
  };
  write("package.json", "{\"name\":\"functions\"}\n");
  write("package-lock.json", "{\"lockfileVersion\":3}\n");
  write("tsconfig.json", "{\"compilerOptions\":{\"outDir\":\"lib\"}}\n");
  write("src/index.ts", "export const a = 1;\n");
  write("src/shared/generated/schemaPaths.ts", "export const paths = [];\n");
  write("lib/index.js", "exports.a = 1;\n");
  write("node_modules/typescript/package.json", "{\"version\":\"6.0.3\"}\n");
  return {root, write};
};
const hashOf = (root, overrides = {}) =>
  buildInputsHash({functionsDir: root, nodeVersion: "24", typescriptVersion: "6.0.3", ...overrides});

test("the inputs are the package files, the tsconfigs and every source file, generated ones included", (t) => {
  const {root, write} = fixture(t);
  write("tsconfig.build.json", "{}\n");
  write("README.md", "not an input\n");
  write("scripts/run-tests.cjs", "not an input\n");
  assert.deepEqual(buildInputs(root), ["package-lock.json", "package.json", "src/index.ts",
    "src/shared/generated/schemaPaths.ts", "tsconfig.build.json", "tsconfig.json"]);
});

test("the hash is stable and moves with every input, the Node version and the TypeScript version", (t) => {
  const {root, write} = fixture(t);
  const base = hashOf(root);
  assert.match(base, /^[0-9a-f]{64}$/u);
  assert.equal(hashOf(root), base, "same inputs, same hash");
  // Files tsc does not read leave it alone, including lib itself.
  write("README.md", "docs\n");
  write("lib/extra.js", "x\n");
  write("test/a.test.ts", "x\n");
  assert.equal(hashOf(root), base);
  assert.notEqual(hashOf(root, {nodeVersion: "26"}), base);
  assert.notEqual(hashOf(root, {typescriptVersion: "6.0.4"}), base);
  for (const [file, text] of [["src/index.ts", "export const a = 2;\n"],
    ["src/shared/generated/schemaPaths.ts", "export const paths = [1];\n"], ["src/new.ts", "x\n"],
    ["package-lock.json", "{\"lockfileVersion\":3,\"x\":1}\n"], ["package.json", "{}\n"], ["tsconfig.json", "{}\n"]]) {
    const before = fs.existsSync(path.join(root, file)) ? fs.readFileSync(path.join(root, file)) : null;
    write(file, text);
    assert.notEqual(hashOf(root), base, file);
    if (before) fs.writeFileSync(path.join(root, file), before);
    else fs.rmSync(path.join(root, file));
  }
  assert.equal(hashOf(root), base, "restored inputs, same hash");
  // A renamed file is a different input even with the same bytes.
  fs.renameSync(path.join(root, "src/index.ts"), path.join(root, "src/main.ts"));
  assert.notEqual(hashOf(root), base);
  assert.throws(() => hashOf(root, {typescriptVersion: ""}), /Node and TypeScript versions/u);
});

test("the lib digest lists every built file", (t) => {
  const {root, write} = fixture(t);
  write("lib/shared/a.js", "a\n");
  write("lib/shared/a.js.map", "{}\n");
  const digest = libDigest(path.join(root, "lib"));
  assert.deepEqual(Object.keys(digest), ["index.js", "shared/a.js", "shared/a.js.map"]);
  assert.match(digest["index.js"], /^[0-9a-f]{64}$/u);
  assert.throws(() => libDigest(path.join(root, "missing")), /holds no built files/u);
});

test("only main and its merge queue, on a trusted event, publish or supply a build", () => {
  for (const event of ["push", "merge_group", "schedule", "workflow_dispatch"]) {
    assert.equal(isTrustedSource({event, branch: "main"}), true, event);
    assert.equal(isTrustedSource({event, branch: "gh-readonly-queue/main/pr-1850-27da0853"}), true, event);
  }
  // A branch can edit ci.yml and still run "ci.yml, this repository, success".
  assert.equal(isTrustedSource({event: "workflow_dispatch", branch: "claude/edit-ci"}), false);
  assert.equal(isTrustedSource({event: "push", branch: "release"}), false);
  assert.equal(isTrustedSource({event: "pull_request", branch: "main"}), false);
  assert.equal(isTrustedSource({event: "pull_request_target", branch: "main"}), false);
  assert.equal(isTrustedSource({event: "merge_group", branch: "gh-readonly-queue/release/pr-1"}), false);
  assert.equal(isTrustedSource({event: "push", branch: ""}), false);
  assert.equal(artifactName("ab12"), "functions-build-ab12");
});

test("the CLI writes the build record and digest, and publishes only from a trusted run", (t) => {
  const {root} = fixture(t);
  const out = path.join(root, "out");
  const run = (env) => {
    const output = path.join(root, "output.txt");
    fs.writeFileSync(output, "");
    const result = spawnSync(process.execPath, [fileURLToPath(new URL("./functions_build_hash.mjs", import.meta.url)),
      "--functions-dir", root, "--node-version", "24", "--out", out, "--github-output", output],
    {encoding: "utf8", env: {...process.env, GITHUB_SHA: "a".repeat(40), GITHUB_RUN_ID: "77", GITHUB_RUN_ATTEMPT: "1", ...env}});
    assert.equal(result.status, 0, result.stderr);
    return Object.fromEntries(fs.readFileSync(output, "utf8").trim().split("\n").map((line) => line.split("=")));
  };
  const queue = run({GITHUB_EVENT_NAME: "merge_group", GITHUB_REF: "refs/heads/gh-readonly-queue/main/pr-1-abc"});
  const hash = hashOf(root);
  assert.deepEqual(queue, {hash, name: `functions-build-${hash}`, publish: "true"});
  const record = JSON.parse(fs.readFileSync(path.join(out, "build.json"), "utf8"));
  assert.deepEqual([record.format, record.hash, record.node, record.typescript, record.files, record.runId, record.branch],
    [1, hash, "24", "6.0.3", 1, "77", "gh-readonly-queue/main/pr-1-abc"]);
  assert.deepEqual(Object.keys(JSON.parse(fs.readFileSync(path.join(out, "lib-digest.json"), "utf8"))), ["index.js"]);
  assert.equal(run({GITHUB_EVENT_NAME: "workflow_dispatch", GITHUB_REF: "refs/heads/claude/x"}).publish, "false");
  assert.equal(run({GITHUB_EVENT_NAME: "pull_request", GITHUB_REF: "refs/pull/1/merge"}).publish, "false");
});

test("Functions CI publishes the tested build only after the tests pass, from a trusted run", () => {
  const workflow = fs.readFileSync(new URL("../../.github/workflows/functions-ci.yml", import.meta.url), "utf8");
  const tests = workflow.indexOf("name: Functions tests");
  const describe = workflow.indexOf("name: Describe the tested Functions build");
  const publish = workflow.indexOf("name: Publish the tested Functions build");
  assert.ok(tests > 0 && describe > tests && publish > describe, "after the tests that built lib");
  const describeStep = workflow.slice(describe, publish);
  assert.match(describeStep, /node tool\/firebase\/functions_build_hash\.mjs --functions-dir functions \\\s+--node-version "\$NODE_VERSION" --out build\/functions-build --github-output "\$GITHUB_OUTPUT"/u);
  const publishStep = workflow.slice(publish, workflow.indexOf("\n      - ", publish));
  assert.match(publishStep, /if: \$\{\{ steps\.build\.outputs\.publish == 'true' \}\}/u);
  assert.match(publishStep, /name: \$\{\{ steps\.build\.outputs\.name \}\}/u);
  assert.match(publishStep, /functions\/lib\s+build\/functions-build\/build\.json\s+build\/functions-build\/lib-digest\.json/u);
  assert.match(publishStep, /if-no-files-found: error/u);
  assert.match(publishStep, /retention-days: 14/u);
});
