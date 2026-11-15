import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {ISSUE_TITLE, flakyJobs, peakConcurrency, previousMetrics, quantile, renderReport, runMinutes,
  summarize} from "./ci_metrics.mjs";

const at = (minute) => new Date(Date.UTC(2026, 10, 16, 10, 0) + minute * 60000).toISOString();
const job = (name, start, end, extra = {}) => ({name, started_at: at(start), completed_at: at(end),
  conclusion: "success", labels: ["ubuntu-latest"], run_id: 1, run_attempt: 1, ...extra});
const run = (id, event, extra = {}) => ({id, event, status: "completed", conclusion: "success", run_attempt: 1,
  created_at: at(0), run_started_at: at(0), ...extra});

test("quantiles use the nearest rank and ignore empty input", () => {
  assert.equal(quantile([], 0.5), null);
  assert.equal(quantile([5, 1, 3], 0.5), 3);
  assert.equal(quantile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.9), 9);
});

test("job minutes round each job up and split Linux from macOS; skipped jobs cost nothing", () => {
  const minutes = runMinutes([
    job("a", 0, 0.2), job("b", 0, 2.5), job("ios", 0, 10.1, {labels: ["macos-26"]}),
    job("skipped", 0, 9, {conclusion: "skipped"}), {name: "queued", conclusion: null},
  ]);
  assert.deepEqual(minutes, {linux: 4, mac: 11});
});

test("peak concurrency counts overlapping jobs of each kind", () => {
  assert.deepEqual(peakConcurrency([job("a", 0, 10), job("b", 5, 15), job("c", 10, 20),
    job("m", 0, 30, {labels: ["macos-26"]})]), {linux: 2, mac: 1});
});

test("a job that failed and then passed on a re-run of the same run is flaky; a fix in a new run is not", () => {
  const jobs = [
    job("Flutter shard 1", 0, 5, {conclusion: "failure", run_attempt: 1}),
    job("Flutter shard 1", 10, 15, {run_attempt: 2}),
    job("tools / bucket", 0, 5, {conclusion: "timed_out", run_attempt: 1}),
    job("tools / bucket", 10, 15, {run_attempt: 2}),
    job("Flutter shard 1", 0, 5, {conclusion: "failure", run_id: 2}),
    job("Flutter shard 1", 0, 5, {run_id: 3}),
    job("still red", 0, 5, {conclusion: "failure", run_attempt: 1}),
    job("still red", 10, 15, {conclusion: "failure", run_attempt: 2}),
  ];
  assert.deepEqual(flakyJobs(jobs), [{name: "Flutter shard 1", count: 1}, {name: "tools / bucket", count: 1}]);
});

test("the summary measures answer time, minutes, queue reuse on main and failure rate per event", () => {
  const runs = [
    run(1, "pull_request"),
    run(2, "pull_request", {conclusion: "failure"}),
    run(3, "merge_group"),
    run(4, "push"),
    run(5, "push"),
    run(6, "pull_request", {conclusion: "cancelled"}),
  ];
  const jobsByRun = new Map([
    [1, [job("Plan", 0, 2, {run_id: 1}), job("Tests", 2, 20, {run_id: 1}), job("Required CI", 20, 21, {run_id: 1})]],
    [2, [job("Tests", 0, 30, {run_id: 2, conclusion: "failure"}),
      job("Required CI", 30, 31, {run_id: 2, conclusion: "failure"})]],
    [3, [job("Tests", 0, 40, {run_id: 3}), job("iOS", 0, 12, {run_id: 3, labels: ["macos-26"]}),
      job("Required CI", 40, 41, {run_id: 3})]],
    // Run 4 reused the queue's result: plan and Required CI only.
    [4, [job("Plan", 0, 1, {run_id: 4}), job("Required CI", 1, 2, {run_id: 4})]],
    [5, [job("Tests", 0, 30, {run_id: 5}), job("Required CI", 30, 31, {run_id: 5})]],
    [6, [job("Tests", 0, 99, {run_id: 6})]],
  ]);
  const metrics = summarize({runs, jobsByRun, mergedPullRequests: 2});
  assert.equal(metrics.events.pull_request.runs, 2);
  assert.equal(metrics.events.pull_request.answerP50, 21);
  assert.equal(metrics.events.pull_request.answerP90, 31);
  assert.equal(metrics.events.pull_request.requiredFailureRate, 0.5);
  assert.equal(metrics.events.merge_group.macPerRun, 12);
  assert.equal(metrics.events.push.reusedQueueResult, 1);
  assert.equal(metrics.queueRunsPerMergedPr, 0.5);
  assert.equal(metrics.events.schedule.answerP50, null);
});

test("the report compares with last week's numbers and carries this week's for next time", () => {
  const metrics = summarize({runs: [run(1, "pull_request")],
    jobsByRun: new Map([[1, [job("Required CI", 20, 21, {run_id: 1})]]]), mergedPullRequests: 4});
  const previous = {events: {pull_request: {answerP50: 30}}, queueRunsPerMergedPr: 0.2};
  const body = renderReport({metrics, previous, from: "2026-11-09", to: "2026-11-16"});
  assert.match(body, /\| Pull request \| 1 \| 21 \(-9 better\)/u);
  assert.match(body, /Merge-queue runs per merged pull request: 0\.00 \(-0\.20 better\)/u);
  assert.match(body, /Flaky jobs[^]*None/u);
  assert.deepEqual(previousMetrics([{body: "no marker"}, {body}]), JSON.parse(JSON.stringify(metrics)));
  assert.equal(previousMetrics([{body: "<!-- ci-metrics:{broken -->"}]), null);
  assert.equal(ISSUE_TITLE, "Weekly CI metrics");
});

test("the workflow runs weekly and on dispatch, reads Actions and writes only issues", () => {
  const workflow = fs.readFileSync(new URL("../../.github/workflows/ci-metrics.yml", import.meta.url), "utf8");
  assert.match(workflow, /schedule:\n\s+- cron: "\d+ \d+ \* \* 1"/u);
  assert.match(workflow, /workflow_dispatch:/u);
  assert.match(workflow, /^permissions: \{\}$/mu);
  assert.match(workflow, /actions: read/u);
  assert.match(workflow, /issues: write/u);
  assert.doesNotMatch(workflow, /contents: write|pull-requests: write|secrets\./u);
  assert.match(workflow, /node tool\/ci\/ci_metrics\.mjs/u);
});
