import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {MAX_COMMITS, macosFromPlan, selectMainMacos} from "./main_macos_selection.mjs";

const sha = (digit) => digit.repeat(40);
const plan = (source, targets) => ({sourceSha: source, operations: {ciTargets: targets}});

test("a queue plan selects the goldens for visual integration and the captures for capture freshness or marketing", () => {
  assert.deepEqual(macosFromPlan(plan(sha("a"), ["flutter", "visual_integration"]), sha("a")), {goldens: true, captures: false});
  assert.deepEqual(macosFromPlan(plan(sha("a"), ["capture_freshness"]), sha("a")), {goldens: false, captures: true});
  assert.deepEqual(macosFromPlan(plan(sha("a"), ["marketing"]), sha("a")), {goldens: false, captures: true});
  assert.deepEqual(macosFromPlan(plan(sha("a"), ["tools"]), sha("a")), {goldens: false, captures: false});
  // Not this commit's plan, or no lanes: unreadable.
  assert.equal(macosFromPlan(plan(sha("b"), ["tools"]), sha("a")), null);
  assert.equal(macosFromPlan({sourceSha: sha("a")}, sha("a")), null);
  assert.equal(macosFromPlan(null, sha("a")), null);
});

test("a replaced run's deferred macOS work is owed by the run that covers it", () => {
  // HEAD's own plan selects neither; the replaced commits' plans selected both.
  const plans = {[sha("d")]: {goldens: false, captures: false}, [sha("c")]: {goldens: false, captures: true},
    [sha("b")]: {goldens: true, captures: false}};
  assert.deepEqual(selectMainMacos({base: {full: false}, commits: [sha("d"), sha("c"), sha("b")],
    selectionFor: (commit) => plans[commit]}), {goldens: true, captures: true, reason: "covers_replaced_runs", commits: 3});
  // With no replaced run, only HEAD's own plan counts.
  assert.deepEqual(selectMainMacos({base: {full: false}, commits: [sha("d")], selectionFor: (commit) => plans[commit]}),
    {goldens: false, captures: false, reason: "own_plan", commits: 1});
  assert.deepEqual(selectMainMacos({base: {full: false}, commits: [sha("d"), sha("e")],
    selectionFor: () => ({goldens: false, captures: false})}), {goldens: false, captures: false, reason: "covers_replaced_runs", commits: 2});
});

test("anything it cannot read runs both macOS jobs", () => {
  const none = () => ({goldens: false, captures: false});
  const both = (reason, commits = 0) => ({goldens: true, captures: true, reason, commits});
  assert.deepEqual(selectMainMacos({base: null, commits: [sha("d")], selectionFor: none}), both("base_unknown"));
  assert.deepEqual(selectMainMacos({base: {full: true}, commits: [sha("d")], selectionFor: none}), both("base_unknown"));
  assert.deepEqual(selectMainMacos({base: {full: false}, commits: null, selectionFor: none}), both("no_commits"));
  assert.deepEqual(selectMainMacos({base: {full: false}, commits: [], selectionFor: none}), both("no_commits"));
  const many = Array.from({length: MAX_COMMITS + 1}, (_, index) => index.toString(16).padStart(40, "0"));
  assert.deepEqual(selectMainMacos({base: {full: false}, commits: many, selectionFor: none}), both("too_many_commits", MAX_COMMITS + 1));
  // One unreadable commit, even after the others selected nothing.
  assert.deepEqual(selectMainMacos({base: {full: false}, commits: [sha("d"), sha("c")],
    selectionFor: (commit) => (commit === sha("c") ? null : {goldens: false, captures: false})}), both("unreadable:cccccccc", 2));
});

// The real script, with the real main_push_base and main_push_queue_proof, on
// a temporary main of four commits whose two middle push runs were replaced.
function runCli(t, {queueRunsFor, plansFor}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "main-macos-"));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const repo = path.join(root, "repo");
  fs.mkdirSync(repo);
  const git = (...args) => {
    const result = spawnSync("git", args, {cwd: repo, encoding: "utf8"});
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  };
  git("init", "-q");
  git("config", "user.email", "ci@example.test");
  git("config", "user.name", "CI");
  const commits = ["base", "replaced-1", "replaced-2", "head"].map((name) => {
    git("commit", "-q", "--allow-empty", "-m", name);
    return git("rev-parse", "HEAD");
  });
  const [base, first, second, head] = commits;
  const named = {base, first, second, head};
  const queueRuns = queueRunsFor(named);
  const plans = plansFor(named);
  const zips = {};
  for (const [commit, targets] of Object.entries(plans)) {
    const dir = path.join(root, `plan-${commit}`);
    fs.mkdirSync(dir);
    fs.writeFileSync(path.join(dir, "impact-plan.json"), JSON.stringify(plan(commit, targets)));
    zips[commit] = path.join(dir, "plan.zip");
    assert.equal(spawnSync("zip", ["-q", "-j", zips[commit], path.join(dir, "impact-plan.json")]).status, 0);
  }
  const queueRun = (commit) => queueRuns[commit] ?? null;
  const state = {
    pushRuns: [
      {id: 100, event: "push", head_branch: "main", path: ".github/workflows/ci.yml", head_sha: base, status: "completed", conclusion: "success"},
      {id: 101, event: "push", head_branch: "main", path: ".github/workflows/ci.yml", head_sha: first, status: "completed", conclusion: "cancelled"},
      {id: 102, event: "push", head_branch: "main", path: ".github/workflows/ci.yml", head_sha: second, status: "completed", conclusion: "cancelled"},
    ],
    queue: Object.fromEntries(commits.map((commit) => [commit, queueRun(commit)])),
    runForArtifacts: Object.fromEntries(commits.filter(queueRun).map((commit) => [queueRun(commit), commit])),
    zips,
  };
  const bin = path.join(root, "bin");
  fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin, "gh"), `#!/usr/bin/env node
const fs = require("fs");
const state = ${JSON.stringify(state)};
const endpoint = process.argv.slice(2).find((arg) => arg.startsWith("repos/"));
const match = (pattern) => pattern.exec(endpoint);
let found;
if (endpoint === "repos/owner/repo/actions/workflows/ci.yml/runs?event=push&branch=main&per_page=100") {
  console.log(JSON.stringify({workflow_runs: state.pushRuns}));
} else if ((found = match(/workflows\\/ci\\.yml\\/runs\\?event=merge_group&head_sha=([0-9a-f]{40})/u))) {
  const id = state.queue[found[1]];
  console.log(JSON.stringify({workflow_runs: id ? [{id: Number(id), event: "merge_group", head_sha: found[1],
    path: ".github/workflows/ci.yml", run_attempt: 1}] : []}));
} else if ((found = match(/actions\\/runs\\/(\\d+)\\/jobs/u))) {
  console.log(JSON.stringify({total_count: 1, jobs: [{name: "Required CI", conclusion: "success", run_attempt: 1}]}));
} else if ((found = match(/actions\\/runs\\/(\\d+)\\/artifacts/u))) {
  const commit = state.runForArtifacts[found[1]];
  console.log(JSON.stringify({artifacts: commit && state.zips[commit] ?
    [{id: Number(found[1]) * 10, name: "harness-plan-1-" + found[1] + "-" + commit + "-1", expired: false}] : []}));
} else if ((found = match(/actions\\/artifacts\\/(\\d+)\\/zip/u))) {
  const commit = state.runForArtifacts[String(Number(found[1]) / 10)];
  process.stdout.write(fs.readFileSync(state.zips[commit]));
} else process.exit(1);
`, {mode: 0o755});
  const result = spawnSync(process.execPath, [new URL("./main_macos_selection.mjs", import.meta.url).pathname,
    "--head", head, "--before", second, "--run-id", "103", "--queue-run", String(queueRuns[head])],
  {cwd: repo, encoding: "utf8", env: {...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}`, GITHUB_REPOSITORY: "owner/repo"}});
  assert.equal(result.status, 0, result.stderr);
  return {output: result.stdout, log: result.stderr};
}

test("the script owes the work of commits whose push runs were replaced", (t) => {
  const queueRunsFor = (c) => ({[c.head]: 41, [c.first]: 42, [c.second]: 43});
  // HEAD's own plan selects neither; the replaced commits' plans selected both.
  const owed = runCli(t, {queueRunsFor,
    plansFor: (c) => ({[c.head]: ["tools"], [c.first]: ["visual_integration"], [c.second]: ["marketing"]})});
  assert.equal(owed.output, "goldens=true\ncaptures=true\ncommits=3\nreason=covers_replaced_runs\n", owed.log);
  const none = runCli(t, {queueRunsFor,
    plansFor: (c) => ({[c.head]: ["tools"], [c.first]: ["tools"], [c.second]: ["flutter"]})});
  assert.equal(none.output, "goldens=false\ncaptures=false\ncommits=3\nreason=covers_replaced_runs\n", none.log);
  // A replaced commit with no queue proof runs both.
  const missing = runCli(t, {queueRunsFor: (c) => ({[c.head]: 41, [c.first]: 42}),
    plansFor: (c) => ({[c.head]: ["tools"], [c.first]: ["tools"]})});
  assert.match(missing.output, /^goldens=true\ncaptures=true\ncommits=3\nreason=unreadable:[0-9a-f]{8}\n$/u, missing.log);
});
