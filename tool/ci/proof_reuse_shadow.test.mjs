import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import YAML from "yaml";
import {ELIGIBLE_LANES, KEYS_JOB, LANE_JOBS, RECORD_TITLE, changesCi, compareShadow, decideVerdicts, hasherVersion,
  laneClass, laneResult, readRecord, summaryMarkdown} from "./proof_reuse_shadow.mjs";
import {comparedLanes} from "../nx/shadow_plan.mjs";

const workflow = (file) => fs.readFileSync(new URL(`../../.github/workflows/${file}`, import.meta.url), "utf8");
const ci = YAML.parse(workflow("ci.yml"));
const sha = (digit) => digit.repeat(40);
const job = (name, conclusion, status = "completed") => ({name, conclusion, status});

test("every compared lane has its ci.yml job and exactly one eligibility class", () => {
  assert.deepEqual(Object.keys(LANE_JOBS).sort(), [...comparedLanes].sort());
  for (const [lane, id] of Object.entries(LANE_JOBS)) {
    assert.ok(ci.jobs[id], `${lane}: ci.yml job ${id}`);
    assert.notEqual(laneClass(lane), "unknown_lane", lane);
  }
  // Required CI's own lane-to-job map agrees.
  const required = ci.jobs.required.steps.map((step) => step.run ?? "").join("\n");
  for (const [lane, id] of Object.entries(LANE_JOBS)) assert.match(required, new RegExp(`${lane}: "${id}"`, "u"), lane);
});

test("an eligible lane proves on a pull request what it proves in the queue", () => {
  assert.deepEqual([...ELIGIBLE_LANES].sort(), ["contracts", "operations"]);
  for (const lane of ELIGIBLE_LANES) {
    const id = LANE_JOBS[lane];
    // One job per lane, so the job records give this lane's result alone.
    assert.deepEqual(Object.entries(LANE_JOBS).filter(([, other]) => other === id).map(([name]) => name), [lane]);
    // The caller passes no event, mode or base, and its workflow never branches on the event.
    const caller = ci.jobs[id];
    assert.equal(caller.with, undefined, `${id} takes no inputs`);
    assert.doesNotMatch(JSON.stringify(caller), /event_name|merge_group|pull_request|\bmode\b|base_sha/u, id);
    const file = caller.uses.replace("./.github/workflows/", "");
    assert.doesNotMatch(workflow(file), /event_name|merge_group|pull_request|inputs\.mode|inputs\.base_sha/u, file);
  }
  // The lanes ruled out really do branch or share a job.
  assert.match(workflow("functions-ci.yml"), /inputs\.mode == 'pr' && inputs\.base_sha != ''/u);
  assert.match(workflow("firestore-rules-ci.yml"), /inputs\.mode == 'pr' && inputs\.base_sha != ''/u);
  assert.match(workflow("react-surface-validation.yml"), /github\.event_name != 'pull_request'/u);
  assert.equal(laneClass("functions"), "pr_subset");
  assert.equal(laneClass("marketing"), "event_branches");
  assert.equal(laneClass("flutter_build_ios"), "shared_job");
});

test("a pull request that changes CI, the hasher or the toolchain is never eligible", () => {
  for (const file of [".github/workflows/ci.yml", ".github/actions/setup-flutter/action.yml", "tool/ci/toolchain.env",
    "tool/ci/proof_reuse_shadow.mjs", "tool/nx/lane_key.mjs"]) assert.equal(changesCi(file), true, file);
  for (const file of ["functions/src/index.ts", "tool/harness/component_graph.json", "docs/ci.md", ".github/zizmor.yml"]) {
    assert.equal(changesCi(file), false, file);
  }
});

test("the hasher version names the key schema and changes with the hasher's sources", () => {
  const read = (body) => () => Buffer.from(body);
  assert.match(hasherVersion("lane-key/1", read("a")), /^lane-key\/1\+[0-9a-f]{16}$/u);
  assert.notEqual(hasherVersion("lane-key/1", read("a")), hasherVersion("lane-key/1", read("b")));
  assert.notEqual(hasherVersion("lane-key/1", read("a")), hasherVersion("lane-key/2", read("a")));
});

test("the record is the one proof-keys notice, and anything else reads as none", () => {
  const record = {v: "lane-key/1+x", head: sha("a"), lanes: {contracts: "k"}};
  const note = (message, title = RECORD_TITLE) => ({title, message});
  assert.deepEqual(readRecord([note("other", "Lint"), note(JSON.stringify(record))]), record);
  assert.equal(readRecord([note(JSON.stringify(record)), note(JSON.stringify(record))]), null, "two records");
  assert.equal(readRecord([note("{oops")]), null);
  assert.equal(readRecord([note(JSON.stringify({...record, head: "main"}))]), null);
  assert.equal(readRecord(null), null);
});

test("a lane's pull request result comes from its jobs' records, called jobs included", () => {
  assert.equal(laneResult("contracts", [job("contracts / Validate schema contracts", "success")]), "success");
  assert.equal(laneResult("tools", [job("tools / Tool checks (affected)", "skipped"), job("tools / Tool checks (core-audit)", "success")]),
    "success");
  assert.equal(laneResult("contracts", [job("contracts", "skipped")]), "skipped");
  assert.equal(laneResult("contracts", [job("contracts / Validate schema contracts", "failure")]), "failed");
  assert.equal(laneResult("contracts", [job("contracts / Validate schema contracts", "cancelled")]), "failed");
  assert.equal(laneResult("contracts", [job("contracts / Validate schema contracts", null, "in_progress")]), "failed");
  assert.equal(laneResult("contracts", [job("contracts-extra / x", "success")]), "missing", "a prefix is not a job");
  assert.equal(laneResult("contracts", []), "missing");
});

const passed = [job("contracts / Validate schema contracts", "success"), job("operations / Operations platform", "success"),
  job("functions / Lint & test Functions", "success")];
const version = "lane-key/1+abc";
const keys = (overrides = {}) => ({pr: {contracts: "c1", operations: "o1", functions: "f1", ...overrides.pr},
  group: {contracts: "c1", operations: "o2", functions: "f1", ...overrides.group}});
const record = {v: version, head: sha("a"), lanes: {contracts: "c1", operations: "o1", functions: "f1"}};
const lanes = ["contracts", "operations", "functions"];
const byLane = (verdicts) => Object.fromEntries(verdicts.map((verdict) => [verdict.lane, [verdict.verdict, verdict.reason]]));

test("a lane that passed on the pull request with the same key would be reused; nothing else is", () => {
  const verdicts = byLane(decideVerdicts({lanes, record, jobs: passed, version, keys: keys()}));
  assert.deepEqual(verdicts, {
    contracts: ["would_reuse", "keys_match"],
    operations: ["not_eligible", "inputs_changed"],
    functions: ["not_eligible", "pr_subset"],
  });
  // The ineligible lane still reports whether its keys matched, for the roll-up.
  assert.equal(decideVerdicts({lanes, record, jobs: passed, version, keys: keys()}).find((verdict) => verdict.lane === "functions")
    .keysMatch, true);
});

test("every unknown makes a lane not eligible", () => {
  const verdict = (input) => byLane(decideVerdicts({lanes: ["contracts"], record, jobs: passed, version, keys: keys(), ...input})).contracts;
  for (const reason of ["no_pull_request", "fork", "changes_ci", "no_pr_run", "unknown"]) {
    assert.deepEqual(verdict({reason}), ["not_eligible", reason], reason);
  }
  assert.deepEqual(verdict({jobs: [job("contracts / Validate schema contracts", "failure")]}), ["not_eligible", "pr_lane_failed"]);
  assert.deepEqual(verdict({jobs: [job("contracts", "skipped")]}), ["not_eligible", "not_run_on_pr"]);
  assert.deepEqual(verdict({jobs: []}), ["not_eligible", "not_run_on_pr"]);
  assert.deepEqual(verdict({record: null}), ["not_eligible", "no_record"]);
  // The record is only a cross-check of the recomputed key; a different hasher or key never matches.
  assert.deepEqual(verdict({record: {...record, v: "lane-key/1+other"}}), ["not_eligible", "hasher_mismatch"]);
  assert.deepEqual(verdict({record: {...record, lanes: {contracts: "forged"}}}), ["not_eligible", "hasher_mismatch"]);
  assert.deepEqual(verdict({keys: keys({group: {contracts: null}})}), ["not_eligible", "unknown"]);
  assert.deepEqual(verdict({keys: keys({group: {contracts: "c2"}})}), ["not_eligible", "inputs_changed"]);
  // The record says nothing about results: a lane that did not pass is never reused, whatever it claims.
  assert.deepEqual(verdict({jobs: [job("operations / Operations platform", "success")]}), ["not_eligible", "not_run_on_pr"]);
});

test("a lane that would have been reused but failed in the queue is a miss", () => {
  const verdicts = decideVerdicts({lanes, record, jobs: passed, version, keys: keys()});
  const report = compareShadow(verdicts, {contracts: {result: "failure"}, operations: {result: "success"}, functions: {result: "success"}});
  assert.deepEqual(report.map((lane) => [lane.lane, lane.outcome, lane.real]),
    [["contracts", "miss", "failure"], ["operations", "not_eligible", "success"], ["functions", "not_eligible", "success"]]);
  assert.equal(compareShadow(verdicts, {contracts: {result: "success"}})[0].outcome, "hit");
  assert.equal(compareShadow(verdicts, {})[0].outcome, "miss", "a lane with no result is never a hit");
  assert.match(summaryMarkdown({pr: "12", lanes: report}), /\| contracts \| \*\*MISS\*\* \| keys_match \| yes \| failure \|/u);
});

test("the compare mode writes the report and warns on a miss", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "proof-shadow-"));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const verdicts = path.join(root, "verdicts.json");
  fs.writeFileSync(verdicts, JSON.stringify({pr: "12", head: sha("b"), lanes: decideVerdicts({lanes, record, jobs: passed, version,
    keys: keys()})}));
  const out = path.join(root, "out/report.json");
  const summary = path.join(root, "summary.md");
  const result = spawnSync(process.execPath, [new URL("./proof_reuse_shadow.mjs", import.meta.url).pathname, "--compare",
    "--verdicts", verdicts, "--out", out], {encoding: "utf8", env: {...process.env, GITHUB_STEP_SUMMARY: summary,
    NEEDS_JSON: JSON.stringify({contracts: {result: "failure"}, operations: {result: "success"}, functions: {result: "skipped"}})}});
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(fs.readFileSync(out, "utf8"));
  assert.equal(report.pr, "12");
  assert.deepEqual(report.lanes.map((lane) => lane.outcome), ["miss", "not_eligible", "not_eligible"]);
  assert.match(result.stdout, /::warning title=Proof reuse shadow miss::contracts would have been reused/u);
  assert.match(fs.readFileSync(summary, "utf8"), /### Proof reuse shadow/u);
});

test("the shadow jobs run beside the lanes, never gate, and verify the anchor with read-only access", () => {
  const keysJob = ci.jobs["proof-keys"];
  const shadow = ci.jobs["proof-reuse-shadow"];
  assert.equal(keysJob.name, KEYS_JOB);
  for (const entry of [keysJob, shadow]) assert.equal(entry["continue-on-error"], true);
  assert.deepEqual(keysJob.needs, ["plan"]);
  assert.deepEqual(keysJob.permissions, {actions: "read", checks: "read", contents: "read", "pull-requests": "read"});
  assert.equal(shadow.permissions, undefined, "the workflow's read-only token");
  // Neither job holds a gate.
  assert.ok(!ci.jobs.required.needs.includes("proof-keys") && !ci.jobs.required.needs.includes("proof-reuse-shadow"));
  // The comparison waits on every lane job it compares.
  assert.deepEqual([...shadow.needs].filter((name) => name !== "proof-keys").sort(), [...new Set(Object.values(LANE_JOBS))].sort());
  assert.match(shadow.if, /github\.event_name == 'merge_group'/u);
  // Keys of the pull request's own head; verdicts only in the queue.
  assert.equal(keysJob.steps[0].with.ref, "${{ github.event_name == 'pull_request' && github.event.pull_request.head.sha || github.sha }}");
  assert.equal(keysJob.steps[0].with["fetch-depth"], 0);
  const verdictStep = keysJob.steps.find((step) => step.id === "verdicts");
  assert.equal(verdictStep.if, "${{ github.event_name == 'merge_group' }}");
  assert.equal(verdictStep.env.HEAD_REF, "${{ github.event.merge_group.head_ref }}");
  assert.match(keysJob.if, /github\.event_name == 'pull_request' && !github\.event\.pull_request\.draft/u);
});
