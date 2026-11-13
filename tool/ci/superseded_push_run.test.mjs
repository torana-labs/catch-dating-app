import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {checkSuperseded, isSuperseded} from "./superseded_push_run.mjs";

const run = (runNumber, extra = {}) => ({
  workflow_id: 7, event: "push", head_branch: "main",
  head_sha: String(runNumber).repeat(40).slice(0, 40), run_number: runNumber, conclusion: null,
  ...extra,
});

test("a newer main push run of the same workflow supersedes this one", () => {
  assert.equal(isSuperseded({current: run(41), runs: [run(42), run(41), run(40)]}), true);
});

test("the newest run, other workflows and other events never supersede", () => {
  assert.equal(isSuperseded({current: run(42), runs: [run(42), run(41)]}), false);
  assert.equal(isSuperseded({current: run(41), runs: [run(42, {workflow_id: 8})]}), false);
  assert.equal(isSuperseded({current: run(41), runs: [run(42, {event: "workflow_dispatch"})]}), false);
  assert.equal(isSuperseded({current: run(41), runs: [run(42, {head_branch: "feature"})]}), false);
  assert.equal(isSuperseded({current: run(41), runs: [run(42, {head_sha: run(41).head_sha})]}), false,
    "a re-run of the same source is not newer work");
  assert.equal(isSuperseded({current: run(41), runs: [run(42, {conclusion: "skipped"})]}), false);
});

test("only main push runs can be superseded", () => {
  assert.equal(isSuperseded({current: run(41, {event: "workflow_dispatch"}), runs: [run(42)]}), false);
  assert.equal(isSuperseded({current: run(41, {head_branch: "feature"}), runs: [run(42)]}), false);
  assert.equal(isSuperseded({current: null, runs: [run(42)]}), false);
  assert.equal(isSuperseded({current: run(41), runs: null}), false);
});

test("the check fails open when the API cannot be read", () => {
  const result = checkSuperseded({repository: "o/r", runId: "1", request: () => {
    throw new Error("boom");
  }});
  assert.deepEqual(result, {superseded: false, error: "boom"});
  const ok = checkSuperseded({repository: "o/r", runId: "41", request: (endpoint) =>
    endpoint.endsWith("/runs/41") ? run(41) : {workflow_runs: [run(42), run(41)]}});
  assert.equal(ok.superseded, true);
});

/** The YAML of one top-level job: from its key to the next two-space key. */
function jobBlock(source, job) {
  const start = source.indexOf(`\n  ${job}:\n`);
  assert.ok(start >= 0, `missing job ${job}`);
  const rest = source.slice(start + 1);
  const next = rest.slice(1).search(/\n  [a-z][a-z0-9_-]*:\n/u);
  return next < 0 ? rest : rest.slice(0, next + 1);
}

test("each website caller runs the check first and gates its push work on it", () => {
  const callers = {
    "marketing-website": {first: "ci-validation", gated: ["captures", "validate", "package"]},
    "admin-website": {first: "queue-validation", gated: ["validate", "package"]},
    "host-website": {first: "queue-validation", gated: ["validate"]},
  };
  for (const [name, {first, gated}] of Object.entries(callers)) {
    const source = fs.readFileSync(`.github/workflows/${name}.yml`, "utf8");
    const header = source.slice(0, source.indexOf("\njobs:"));
    assert.doesNotMatch(header, /^concurrency:/mu, `${name} must still admit every run`);
    const firstJob = jobBlock(source, first);
    assert.match(firstJob, /superseded: \$\{\{ steps\.superseded\.outputs\.superseded \}\}/u,
      `${name} ${first} must publish the superseded output`);
    assert.match(firstJob,
      /id: superseded\n\s+env:\n\s+GH_TOKEN: \$\{\{ github\.token \}\}\n\s+run: node tool\/ci\/superseded_push_run\.mjs/u,
      `${name} ${first} must run the superseded check`);
    for (const job of gated) {
      const condition = jobBlock(source, job).split("\n    runs-on:")[0].split("\n    uses:")[0];
      assert.match(condition, new RegExp(`needs\\.${first}\\.outputs\\.superseded != 'true'`, "u"),
        `${name} ${job} must skip a superseded push run`);
    }
  }
});
