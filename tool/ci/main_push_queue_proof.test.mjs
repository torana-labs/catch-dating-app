import assert from "node:assert/strict";
import test from "node:test";
import {chooseQueueProof} from "./main_push_queue_proof.mjs";

const SHA = "a".repeat(40);
const OTHER = "b".repeat(40);
const run = (id, extra = {}) => ({id, head_sha: SHA, event: "merge_group", path: ".github/workflows/ci.yml",
  status: "in_progress", conclusion: null, run_attempt: 1, ...extra});
const job = (name, conclusion, runAttempt = 1) => ({name, conclusion, run_attempt: runAttempt});
const decide = (runs, jobsByRun) =>
  chooseQueueProof({sha: SHA, runs, jobsFor: (id) => (id in jobsByRun ? jobsByRun[id] : null)});

test("22 Nov: Required CI succeeded while a reporting lane still ran, so the run has no conclusion yet", () => {
  // Queue run 45035320897 for ae14a0dc: Required CI succeeded at 15:17:30, the
  // iOS host simulator build ran until 15:25:13, and main's lookup ran at 15:19:57.
  assert.deepEqual(decide([run(45035320897)], {45035320897: [job("Required CI", "success"),
    job("app-builds / iOS host simulator build", null)]}),
  {runId: 45035320897, reason: "required_ci_succeeded"});
});

test("a finished run whose reporting lane failed still proves the commit the queue merged on", () => {
  assert.equal(decide([run(5, {status: "completed", conclusion: "failure"})],
    {5: [job("Required CI", "success"), job("app-builds / iOS host simulator build", "failure")]}).runId, 5);
});

test("only a merge_group run of ci.yml for this exact commit counts", () => {
  const jobs = [job("Required CI", "success")];
  assert.deepEqual(decide([run(1, {head_sha: OTHER}), run(2, {event: "push"}),
    run(3, {path: ".github/workflows/flutter-ci.yml"}), run(0)], {1: jobs, 2: jobs, 3: jobs, 0: jobs}),
  {runId: null, reason: "no_queue_run_for_commit"});
});

test("Required CI must have succeeded, exactly once", () => {
  for (const jobs of [[job("Required CI", "failure")], [job("Required CI", null)], [job("Required CI", "skipped")],
    [job("Required CI", "success"), job("Required CI", "success")], [job("Tools", "success")], []]) {
    assert.deepEqual(decide([run(7)], {7: jobs}), {runId: null, reason: "no_successful_required_ci"});
  }
});

test("a success from an earlier attempt never counts while a re-run is under way", () => {
  assert.deepEqual(decide([run(7, {run_attempt: 2})], {7: [job("Required CI", "success", 1)]}),
    {runId: null, reason: "required_ci_from_another_attempt"});
  assert.equal(decide([run(7, {run_attempt: 2})], {7: [job("Required CI", "success", 2)]}).runId, 7);
});

test("unreadable jobs never prove anything; another run for the commit still can", () => {
  assert.deepEqual(decide([run(9)], {}), {runId: null, reason: "jobs_unreadable"});
  assert.equal(decide([run(9), run(8)], {8: [job("Required CI", "success")]}).runId, 8);
});

test("the newest proving run wins when the commit was queued more than once", () => {
  const ok = [job("Required CI", "success")];
  assert.equal(decide([run(3), run(6), run(4)], {3: ok, 6: [job("Required CI", "failure")], 4: ok}).runId, 4);
});
