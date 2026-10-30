#!/usr/bin/env node
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {queueOnlyCiTargets} from "./lib/component_graph.mjs";

const snapshotPaths = ["tool/harness/component_graph.json",
  "tool/harness/lib/component_graph.mjs", "tool/lib/path_glob.mjs"];
// Harness tests assert selector behaviour but never feed the snapshot engine.
const selectorControl = /^(?:tool\/harness(?:\.mjs|\/(?!.*\.test\.mjs$))|tool\/lib\/(?:path_glob|tool_impact|repository_snapshot)\.mjs$|tool\/(?:run\.mjs|tools_manifest\.json)$|\.github\/workflows\/ci\.yml$)/u;
const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
function git(cwd, args) {
  const result = spawnSync("git", args, {cwd, encoding: "utf8", maxBuffer: 32 * 1024 * 1024});
  assert.equal(result.status, 0, result.stderr || `Cannot read Git selection inputs: ${args.join(" ")}`);
  return result.stdout;
}
function resolve(cwd, ref) {
  const sha = git(cwd, ["rev-parse", "--verify", "--end-of-options", `${ref}^{commit}`]).trim();
  assert.match(sha, /^[0-9a-f]{40}$/u);
  return sha;
}

function runSnapshot(cwd, sha, input) {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "catch-selector-snapshot-"));
  try {
    const hashes = {};
    for (const file of snapshotPaths) {
      const bytes = git(cwd, ["show", `${sha}:${file}`]);
      const output = path.join(temporary, file);
      fs.mkdirSync(path.dirname(output), {recursive: true});
      fs.writeFileSync(output, bytes);
      hashes[file] = sha256(bytes);
    }
    // Execute each revision's actual engine against identical paths. Do not
    // interpret the trusted base graph with the edited head implementation.
    const runner = path.join(temporary, "compare.mjs");
    fs.writeFileSync(runner, `import fs from 'node:fs';
import {planAffected} from './tool/harness/lib/component_graph.mjs';
const graph = JSON.parse(fs.readFileSync(new URL('./tool/harness/component_graph.json', import.meta.url)));
const input = JSON.parse(fs.readFileSync(0, 'utf8'));
console.log(JSON.stringify({targets: graph.targets, plan: planAffected({...input, graph})}));\n`);
    const result = spawnSync(process.execPath, [runner], {cwd: temporary, input: JSON.stringify(input),
      encoding: "utf8", timeout: 30_000, maxBuffer: 32 * 1024 * 1024,
      env: {...process.env, NODE_OPTIONS: ""}});
    assert.equal(result.status, 0, `Selector snapshot ${sha} failed; retain full validation and repair snapshot closure.\n${result.stderr || result.error?.message}`);
    return {sourceSha: sha, inputHashes: hashes, ...JSON.parse(result.stdout)};
  } finally {
    fs.rmSync(temporary, {recursive: true, force: true});
  }
}

export function compareSelectors({cwd = process.cwd(), base, head = "HEAD", mode = "pr"}) {
  assert.ok(["pr", "merge_group", "main", "nightly"].includes(mode), "Invalid validation mode.");
  const baseSha = resolve(cwd, base);
  const headSha = resolve(cwd, head);
  // No rename collapsing: both removed and added identities remain obligations.
  if (mode === "main") git(cwd, ["merge-base", "--is-ancestor", baseSha, headSha]);
  const command = mode === "main"
    ? ["log", "--format=", "--name-only", "--no-renames", "-m", "-z", `${baseSha}..${headSha}`, "--"]
    : ["diff", "--name-only", "--no-renames", "-z", `${baseSha}...${headSha}`, "--"];
  const changedPaths = [...new Set(git(cwd, command).split("\0").filter(Boolean))].sort();
  const controls = changedPaths.filter(file => selectorControl.test(file));
  if (!controls.length) return {baseSha, headSha, mode, status: "no-selector-control-change", changedPaths};
  const input = {changedPaths, mode};
  const before = runSnapshot(cwd, baseSha, input);
  const after = runSnapshot(cwd, headSha, input);
  assert.equal(after.plan.complete, true, "Edited selector must retain complete, unambiguous path coverage.");
  const requiredTargets = [...new Set([...before.targets, ...after.targets])].sort();
  const missingTargets = requiredTargets.filter(target => !after.plan.operations.ciTargets.includes(target));
  assert.deepEqual(missingTargets, [], `Selector-control edits require full validation; missing ${missingTargets.join(", ")}. Restore fail-closed selection.`);
  const changes = {};
  for (const key of ["ciTargets", "checkIds", "codegenIds", "buildTargets"]) {
    const oldIds = before.plan.operations[key] ?? [], newIds = after.plan.operations[key] ?? [];
    changes[key] = {removed: oldIds.filter(id => !newIds.includes(id)), added: newIds.filter(id => !oldIds.includes(id))};
  }
  return {baseSha, headSha, mode, node: process.version, platform: process.platform,
    status: "full-validation-required", changedPaths, controls, requiredTargets,
    before, after, changes};
}

export function requireComparedTargets(comparison, actualPlan, githubOutput) {
  assert.equal(actualPlan.sourceSha, comparison.headSha, "Planned source differs from selector comparison.");
  assert.equal(actualPlan.baseSha, comparison.baseSha, "Planned base differs from selector comparison.");
  assert.ok(["no-selector-control-change", "full-validation-required"].includes(comparison.status), "Unknown selector comparison status.");
  // Only a pull request may defer queue-only lanes; merge_group still owes them.
  const pullRequest = comparison.mode === "pr" && actualPlan.mode === "pr";
  const deferred = pullRequest ? actualPlan.queueDeferredCiTargets ?? [] : [];
  assert.ok(deferred.every(target => queueOnlyCiTargets.includes(target)), "Only queue-only lanes may be deferred.");
  const missing = (comparison.requiredTargets ?? []).filter(target =>
    !actualPlan.operations.ciTargets.includes(target) && !deferred.includes(target));
  assert.deepEqual(missing, [], `Actual CI plan suppressed compared obligations: ${missing.join(", ")}`);
  assert.equal(typeof githubOutput, "string", "Actual GitHub output file is required.");
  for (const target of actualPlan.operations.ciTargets) {
    const entries = githubOutput.split("\n").filter(line => line.startsWith(`${target}=`));
    assert.deepEqual(entries, [`${target}=true`], `GitHub fanout suppressed or duplicated selected target ${target}.`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const options = {};
    for (let i = 2; i < process.argv.length; i += 2) {
      const flag = process.argv[i], value = process.argv[i + 1];
      assert.ok(["--base", "--head", "--mode", "--verify-plan", "--comparison", "--github-output"].includes(flag) && value && !value.startsWith("--"), "Use --base <ref> [--head <ref>] [--mode <validation-mode>].");
      const key = flag.slice(2);
      assert.ok(!Object.hasOwn(options, key), `Duplicate ${flag}`);
      options[key] = value;
    }
    if (options["verify-plan"] || options.comparison) {
      assert.deepEqual(Object.keys(options).sort(), ["comparison", "github-output", "verify-plan"], "Use --verify-plan <path> --comparison <path> --github-output <path>.");
      const read = file => JSON.parse(fs.readFileSync(file, "utf8"));
      requireComparedTargets(read(options.comparison), read(options["verify-plan"]), fs.readFileSync(options["github-output"], "utf8"));
      console.log("Actual CI plan retains compared base/head validation obligations.");
    } else {
      assert.ok(options.base, "--base is required.");
      console.log(JSON.stringify(compareSelectors(options), null, 2));
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
