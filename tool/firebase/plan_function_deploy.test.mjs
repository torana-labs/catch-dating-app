import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";
import {finalHash, planFunctionDeploy, planMarkdown, readRecord} from "./plan_function_deploy.mjs";

const toolchain = {firebaseTools: "15.34.2", node: "24"};
const current = (overrides = {}) => ({version: 2, codebases: {
  admin: {hash: "A2", functions: ["adminA", "adminB"], functionHashes: {adminA: "a1", adminB: "b2"}},
  events: {hash: "E1", functions: ["onEvent"], functionHashes: {onEvent: "e1"},
    functionSecrets: {onEvent: ["STRIPE_KEY"]}},
  ...overrides,
}});
const versions = {STRIPE_KEY: "projects/p/secrets/STRIPE_KEY/versions/3"};
// The payload a run that deployed `manifest` with `secretVersions` would have recorded.
const recordOf = (manifest, secretVersions = versions) =>
  JSON.stringify(planFunctionDeploy({current: manifest, secretVersions, toolchain, full: true}).payload);
const plan = (manifest, previous, options = {}) =>
  planFunctionDeploy({current: manifest, previous, secretVersions: versions, toolchain, ...options});

test("only Functions whose own hash or secret versions changed deploy, by exact codebase name", () => {
  const before = current({admin: {hash: "A1", functions: ["adminA", "adminB"], functionHashes: {adminA: "a1", adminB: "b1"}}});
  const result = plan(current(), recordOf(before));
  assert.equal(result.mode, "planned");
  assert.deepEqual(result.deploy, [{codebase: "admin", name: "adminB", target: "functions:admin:adminB",
    why: "its code, packages, parameters or secrets changed"}]);
  assert.equal(result.skipped, 2);
  // A rotated secret redeploys exactly the Functions that declare it.
  const rotated = plan(current(), recordOf(current()), {secretVersions: {STRIPE_KEY: "projects/p/secrets/STRIPE_KEY/versions/4"}});
  assert.deepEqual(rotated.deploy.map(({name}) => name), ["onEvent"]);
  // Nothing changed: an empty plan, so the Functions deploy is skipped.
  const same = plan(current(), recordOf(current()));
  assert.deepEqual([same.mode, same.deploy.length, same.skipped, same.reason], ["planned", 0, 3, "no Function changed"]);
});

test("a new Function deploys, and a Function that loads a computed path follows its codebase", () => {
  const withNew = current({events: {hash: "E1", functions: ["onEvent", "onNew"], functionHashes: {onEvent: "e1", onNew: "n1"},
    functionSecrets: {onEvent: ["STRIPE_KEY"]}}});
  assert.deepEqual(plan(withNew, recordOf(current())).deploy.map(({name, why}) => [name, why]), [["onNew", "new Function"]]);
  const computed = (hash) => current({admin: {hash, functions: ["adminA", "adminB"],
    functionHashes: {adminA: `codebase:${hash}`, adminB: "b2"}}});
  assert.deepEqual(plan(computed("A3"), recordOf(computed("A2"))).deploy.map(({name, why}) => [name, why]),
    [["adminA", "its codebase changed (it loads a computed path)"]]);
});

test("anything it cannot prove falls back to the plain codebase deploy", () => {
  const record = recordOf(current());
  for (const [previous, options, reason] of [
    ["", {}, /no delivered Functions record/u],
    ["not json", {}, /not JSON/u],
    [JSON.stringify({version: 1, codebases: {admin: {hash: "A2"}}}), {}, /payload version 1, from before per-Function hashes/u],
    [JSON.stringify({version: 2, codebases: {admin: {hash: "A2"}}}), {}, /admin codebase holds no Function hashes/u],
    [record, {toolchain: {...toolchain, firebaseTools: "15.40.0"}}, /another toolchain/u],
    [record, {full: true}, /full deploy requested/u],
    [record, {secretVersions: null}, /newest version of STRIPE_KEY could not be read/u],
    [record, {secretVersions: {}, secretFailures: ["STRIPE_KEY"]}, /newest version of STRIPE_KEY could not be read/u],
  ]) {
    const result = plan(current(), previous, options);
    assert.equal(result.mode, "all", String(reason));
    assert.match(result.reason, reason);
    assert.deepEqual(result.deploy, []);
  }
  // A Function that moved codebase cannot be deployed by exact name.
  const moved = current({admin: {hash: "A2", functions: ["adminA"], functionHashes: {adminA: "a1"}},
    events: {hash: "E1", functions: ["onEvent", "adminB"], functionHashes: {onEvent: "e1", adminB: "b2"},
      functionSecrets: {onEvent: ["STRIPE_KEY"]}}});
  assert.match(plan(moved, record).reason, /adminB moved from codebase admin to events/u);
  // A secret nobody declares does not matter.
  assert.equal(plan(current(), record, {secretFailures: ["UNUSED"]}).mode, "planned");
  assert.throws(() => plan({version: 1, codebases: {}}, record), /must be version 2/u);
});

test("the payload records what was deployed, and only when every secret version is known", () => {
  const result = plan(current(), recordOf(current()));
  assert.equal(result.payload.version, 2);
  assert.deepEqual(result.payload.toolchain, toolchain);
  assert.equal(result.payload.codebases.events.functions.onEvent, finalHash("e1", ["STRIPE_KEY"], versions));
  assert.match(result.payload.codebases.admin.functions.adminA, /^[0-9a-f]{24}$/u);
  assert.equal(result.payload.codebases.admin.hash, "A2");
  // Unknown secrets record no per-Function hashes, so the next run falls back
  // too instead of trusting a hash that left out a secret.
  const unread = plan(current(), recordOf(current()), {secretVersions: null});
  assert.deepEqual(unread.payload.codebases.events, {hash: "E1"});
  assert.equal(unread.payload.version, 1);
  assert.equal(readRecord(JSON.stringify(unread.payload)).reason.includes("payload version 1"), true);
  // A record stored as a JSON string (the deployment payload) reads the same.
  assert.ok(readRecord(JSON.stringify(JSON.stringify(result.payload))).record);
});

test("the summary names each Function, why it deploys, and a loud warning for unread secrets", () => {
  const before = current({admin: {hash: "A1", functions: ["adminA", "adminB"], functionHashes: {adminA: "a1", adminB: "b1"}}});
  const markdown = planMarkdown(plan(current(), recordOf(before)), "dev");
  assert.match(markdown, /### This dev deploy: 1 Function\(s\), 2 unchanged/u);
  assert.match(markdown, /\| adminB \| admin \| its code, packages, parameters or secrets changed \|/u);
  assert.match(planMarkdown(plan(current(), recordOf(current())), "dev"), /No Function changed; the Functions deploy is skipped\./u);
  const warned = planMarkdown(plan(current(), recordOf(current()), {secretVersions: null}), "prod");
  assert.match(warned, /every changed codebase \(the newest version of STRIPE_KEY could not be read\)/u);
  assert.match(warned, /\*\*Warning:\*\* the newest version of STRIPE_KEY could not be read/u);
});

test("the CLI writes the plan, the record payload, the summary and the step outputs", (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "catch-function-plan-"));
  t.after(() => fs.rmSync(directory, {recursive: true, force: true}));
  const file = (name, contents) => {
    const target = path.join(directory, name);
    if (contents !== undefined) fs.writeFileSync(target, contents);
    return target;
  };
  const before = current({admin: {hash: "A1", functions: ["adminA", "adminB"], functionHashes: {adminA: "a1", adminB: "b1"}}});
  const run = (secrets) => spawnSync(process.execPath, [fileURLToPath(new URL("./plan_function_deploy.mjs", import.meta.url)),
    "--current", file("current.json", JSON.stringify(current())), "--previous", file("previous.json", recordOf(before)),
    "--secrets", file("secrets.json", JSON.stringify(secrets)), "--toolchain", JSON.stringify(toolchain),
    "--environment", "dev", "--plan-out", file("plan.json"), "--record-out", file("record.json"),
    "--summary", file("summary.md", ""), "--github-output", file("output.txt", "")], {encoding: "utf8"});
  const planned = run({versions, failures: []});
  assert.equal(planned.status, 0, planned.stderr);
  assert.equal(fs.readFileSync(file("output.txt"), "utf8"), "mode=planned\nonly=functions:admin:adminB\ncount=1\n");
  assert.equal(JSON.parse(fs.readFileSync(file("record.json"), "utf8")).version, 2);
  assert.match(fs.readFileSync(file("summary.md"), "utf8"), /1 Function\(s\), 2 unchanged/u);
  const fallback = run({versions: {}, failures: ["STRIPE_KEY"]});
  assert.equal(fallback.status, 0, fallback.stderr);
  assert.match(fallback.stdout, /::warning::The newest version of secret STRIPE_KEY could not be read/u);
  assert.equal(fs.readFileSync(file("output.txt"), "utf8"), "mode=all\nonly=functions\ncount=0\n");
});
