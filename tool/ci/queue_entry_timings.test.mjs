import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";
import {PROOF_REUSE_SCHEMA, THIN_BELOW, analyzeRun, baseOf, criticalPathSaving, fetchDataset, formatReport,
  loadProofReuseDays, parseArgs, prNumberOf, proofReuseSummary, queueEvents, queueRebuilds, report, runnerKind,
  stats} from "./queue_entry_timings.mjs";

const script = fileURLToPath(new URL("./queue_entry_timings.mjs", import.meta.url));
const branch = (pr, base) => `gh-readonly-queue/main/pr-${pr}-${base.padEnd(40, "0")}`;
const at = (minute, second = 0) => `2026-11-20T10:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}Z`;
const run = (id, pr, base, created, updated, extra = {}) =>
  ({id, head_branch: branch(pr, base), created_at: created, run_started_at: created, updated_at: updated, status: "completed", ...extra});
const job = (name, created, started, completed, {labels = ["ubuntu-latest"], conclusion = "success", ran = true} = {}) =>
  ({name, labels, conclusion, created_at: created, started_at: ran ? started : created, completed_at: completed,
    ...(ran ? {runner_id: 1, runner_name: "GitHub Actions 1"} : {})});

const jobs = [
  job("Plan affected targets", at(0, 0), at(0, 2), at(1, 0)),
  job("flutter / Analyze & test", at(1, 0), at(1, 30), at(12, 0)),
  // macOS waits 9 minutes for a runner, then finishes last: the critical path.
  job("visual-integration / macOS goldens", at(1, 0), at(10, 0), at(20, 0), {labels: ["macos-26"]}),
  job("app-builds", at(1, 0), at(1, 0), at(1, 0), {conclusion: "skipped", ran: false, labels: ["macos-26"]}),
  job("Required CI", at(20, 5), at(20, 7), at(20, 10)),
];

test("branch names give the PR and the group's base", () => {
  assert.equal(prNumberOf("gh-readonly-queue/main/pr-2332-7c7f1fb8db5aa38ff9584c00d4e62fc387c2f00a"), 2332);
  assert.equal(baseOf("gh-readonly-queue/main/pr-2332-7c7f1fb8db5aa38ff9584c00d4e62fc387c2f00a"), "7c7f1fb8db5aa38ff9584c00d4e62fc387c2f00a");
  assert.equal(prNumberOf("main"), null);
  assert.equal(runnerKind(["macos-26"]), "macos");
  assert.equal(runnerKind(["ubuntu-24.04"]), "linux");
});

test("a run's critical path, runner waits split by OS, and outcome from Required CI", () => {
  const entry = analyzeRun(run(1, 10, "aaa", at(0), at(20, 10)), jobs);
  assert.deepEqual(entry.criticalPath, {name: "visual-integration / macOS goldens", runner: "macos", finishedAfter: 1200, jobDuration: 600});
  assert.deepEqual(entry.runnerWait.macos, {jobs: 1, total: 540, max: 540}, "the skipped macOS job never waited");
  assert.deepEqual(entry.runnerWait.linux, {jobs: 3, total: 34, max: 30});
  assert.equal(entry.runDuration, 1210);
  assert.equal(entry.outcome, "passed");
  assert.equal(entry.queueWaitBeforeRun, null, "no timeline: not measured, never zero");
});

test("the timeline gives the enqueue wait and the removal cause", () => {
  const timeline = [
    {event: "added_to_merge_queue", created_at: "2026-11-20T09:40:00Z", actor: {login: "example-dev"}},
    {event: "commented", created_at: "2026-11-20T09:45:00Z"},
    {event: "removed_from_merge_queue", created_at: at(15), reason: "A CI check failed", actor: {login: "github-merge-queue"}},
  ];
  assert.deepEqual(queueEvents(timeline).map((event) => event.event), ["added_to_merge_queue", "removed_from_merge_queue"]);
  const failing = jobs.map((item) => item.name === "flutter / Analyze & test" ? {...item, conclusion: "failure"} :
    item.name === "visual-integration / macOS goldens" ? {...item, conclusion: "cancelled"} : item);
  const entry = analyzeRun(run(2, 11, "bbb", at(0), at(15)), failing, timeline);
  assert.equal(entry.queueWaitBeforeRun, 20 * 60);
  assert.equal(entry.outcome, "removed");
  assert.deepEqual(entry.removal, {at: at(15), reason: "A CI check failed", actor: "github-merge-queue"});
  assert.deepEqual(entry.failedJobs, ["flutter / Analyze & test"]);
  assert.deepEqual(entry.cancelledJobs, ["visual-integration / macOS goldens"]);
});

test("a merged entry, and a run with no Required CI yet", () => {
  const merged = analyzeRun(run(3, 12, "ccc", at(0), at(21)), jobs,
    [{event: "added_to_merge_queue", created_at: at(0)}, {event: "merged", created_at: at(21)}]);
  assert.equal(merged.outcome, "merged");
  assert.equal(merged.queueWaitBeforeRun, 0);
  assert.equal(analyzeRun({...run(4, 13, "ddd", at(0), at(1)), status: "in_progress"}, jobs.slice(0, 2)).outcome, "incomplete");
});

test("queue rebuilds: a new run of the same PR on a new base while the old one ran", () => {
  const runs = [
    run(10, 20, "aaa", at(0), at(30)),
    run(11, 20, "bbb", at(29), at(50)), // superseded run 10 before it finished
    run(12, 21, "aaa", at(2), at(20)),
    run(13, 21, "aaa", at(40), at(55)), // same base: a re-run, not a rebuild
    run(14, 22, "ccc", at(4), at(10)),
    run(15, 22, "ddd", at(31), at(45)), // 21 minutes later: a re-queue, not a rebuild
    run(16, 23, "bbb", at(29, 5), at(50)),
    run(17, 24, "bbb", at(29, 9), at(50)),
  ];
  const result = queueRebuilds(runs);
  assert.deepEqual(result.superseded.map((item) => [item.pr, item.runId, item.replacedBy]), [[20, 10, 11]]);
  assert.equal(result.prsWithSeveralRuns, 3);
  assert.deepEqual(result.bursts, [{at: "2026-11-20T10:29:00.000Z", runs: 3}]);
});

test("stats use nearest rank and ignore missing values", () => {
  assert.deepEqual(stats([5, null, 1, 3, 2, 4]), {n: 5, median: 3, p90: 5, max: 5});
  assert.deepEqual(stats([null]), {n: 0, median: null, p90: null, max: null});
});

test("the report splits before and after, marks a thin period and lists failures", () => {
  const dataset = {runs: [run(1, 10, "aaa", at(0), at(20, 10)), run(2, 11, "bbb", at(30), at(50))],
    jobs: {1: jobs, 2: jobs.map((item) => item.name === "Required CI" ? {...item, conclusion: "failure"} : item)}};
  const result = report(dataset, {split: at(25)});
  assert.equal(result.periods.before.runs, 1);
  assert.equal(result.periods.after.runs, 1);
  assert.ok(result.periods.after.thin && THIN_BELOW > 1);
  assert.deepEqual(result.flagged.map((flag) => [flag.runId, flag.outcome]), [[2, "failed"]]);
  const text = formatReport(result);
  assert.match(text, /No PR timelines: enqueue wait and removal reasons are not measured\./u);
  assert.match(text, /thin: fewer than 10; do not extrapolate/u);
  assert.match(text, /critical-path jobs: visual-integration \/ macOS goldens ×1/u);
});

test("arguments are checked", () => {
  assert.throws(() => parseArgs(["fetch", "--since", "2026-11-15"]), /needs --since and --out/u);
  assert.throws(() => parseArgs(["report"]), /needs --data/u);
  assert.throws(() => parseArgs(["report", "--data", "x", "--split", "soon"]), /ISO/u);
  assert.throws(() => parseArgs(["bogus"]), /Usage/u);
  assert.equal(parseArgs(["report", "--data", "x", "--json"]).json, true);
  assert.equal(parseArgs(["fetch", "--since", "2026-11-15", "--out", "q.json", "--fresh"]).fresh, true);
});

test("end to end: report from a saved dataset", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "queue-timings-"));
  try {
    const file = path.join(dir, "data.json");
    fs.writeFileSync(file, JSON.stringify({runs: [run(1, 10, "aaa", at(0), at(20, 10))], jobs: {1: jobs}}));
    const result = spawnSync(process.execPath, [script, "report", "--data", file, "--json"], {encoding: "utf8"});
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).periods.all.criticalPathJobs[0][0], "visual-integration / macOS goldens");
  } finally {
    fs.rmSync(dir, {recursive: true, force: true});
  }
});

test("fetch resumes: completed runs and settled timelines are reused, unfinished ones refetched", () => {
  const listed = [run(1, 10, "aaa", at(0), at(20)), {...run(2, 11, "bbb", at(5), at(9)), status: "in_progress"}];
  const calls = [];
  const api = (endpoint) => {
    calls.push(endpoint);
    if (endpoint.includes("/workflows/")) return [{workflow_runs: listed}];
    if (endpoint.includes("/jobs")) return [{jobs: [{...jobs[0], extra: "dropped"}]}];
    return [[{event: "added_to_merge_queue", created_at: at(0), actor: {login: "example-dev", id: 1}}, {event: "labeled"}]];
  };
  const saves = [];
  const first = fetchDataset({repo: "example-org/example-repo", workflow: "ci.yml", since: "2026-11-20", api,
    save: (value) => saves.push(Object.keys(value.jobs).length), saveEvery: 2});
  assert.equal(first.calls, 5, "runs list, two job lists, two timelines");
  assert.deepEqual(first.dataset.timelines[10], [{event: "added_to_merge_queue", created_at: at(0), reason: null,
    actor: {login: "example-dev"}}]);
  assert.equal(first.dataset.jobs[1][0].extra, undefined, "only the fields the report reads are kept");
  assert.ok(saves.length >= 2 && saves.at(-1) === 2, "progress is saved during and after the fetch");
  calls.length = 0;
  const second = fetchDataset({repo: "example-org/example-repo", workflow: "ci.yml", since: "2026-11-20", api,
    previous: first.dataset});
  // Run 1 and PR 10 are settled; run 2 is still in progress, so its jobs and PR 11's timeline are fetched again.
  assert.deepEqual(calls.map((endpoint) => endpoint.split("?")[0]), ["repos/example-org/example-repo/actions/workflows/ci.yml/runs",
    "repos/example-org/example-repo/actions/runs/2/jobs", "repos/example-org/example-repo/issues/11/timeline"]);
  assert.equal(second.calls, 3);
  assert.deepEqual(second.dataset.jobs[1], first.dataset.jobs[1]);
});

test("a removal one second before the merge is a merge, not a removal", () => {
  const timeline = [
    {event: "added_to_merge_queue", created_at: at(0)},
    {event: "removed_from_merge_queue", created_at: at(21, 0), reason: "Merged", actor: {login: "github-merge-queue"}},
    {event: "merged", created_at: at(21, 1)},
  ];
  const entry = analyzeRun(run(5, 14, "eee", at(0), at(21)), jobs, timeline);
  assert.equal(entry.outcome, "merged");
  assert.equal(entry.removal, null);
  // Control: a removal well before a later merge is still a removal.
  const late = analyzeRun(run(6, 15, "fff", at(0), at(21)), jobs, [
    {event: "added_to_merge_queue", created_at: at(0)},
    {event: "removed_from_merge_queue", created_at: at(10), reason: "A CI check failed"},
    {event: "merged", created_at: at(40)},
  ]);
  assert.equal(late.outcome, "removed");
  assert.equal(late.removal.reason, "A CI check failed");
});

test("an earlier run regrouped onto a new base is superseded; the PR's events go to its later run", () => {
  const timeline = [
    {event: "added_to_merge_queue", created_at: at(0)},
    {event: "removed_from_merge_queue", created_at: at(50, 0)},
    {event: "merged", created_at: at(50, 1)},
  ];
  const dataset = {runs: [run(7, 16, "aaa", at(1), at(30)), run(8, 16, "bbb", at(29), at(50))],
    jobs: {7: jobs, 8: jobs}, timelines: {16: timeline}};
  const result = report(dataset);
  assert.deepEqual(result.entries.map((entry) => [entry.runId, entry.outcome]), [[7, "superseded"], [8, "merged"]]);
  assert.deepEqual(result.periods.all.outcomes, {superseded: 1, merged: 1});
  assert.equal(result.flagged.length, 0);
  // Control: a later run on the same base (a re-run) does not supersede.
  const rerun = report({runs: [run(9, 17, "ccc", at(1), at(30)), run(10, 17, "ccc", at(31), at(50))], jobs: {9: jobs, 10: jobs}});
  assert.equal(rerun.entries[0].outcome, "passed");
});

test("removal causes name the failing lane, never Required CI, and count removals with no failure", () => {
  const failing = (name) => jobs.map((item) => item.name === name || item.name === "Required CI" ? {...item, conclusion: "failure"} : item);
  const removedAt = (minute) => [{event: "added_to_merge_queue", created_at: at(0)},
    {event: "removed_from_merge_queue", created_at: at(minute), reason: "A CI check failed"}];
  const dataset = {
    runs: [run(11, 20, "a1", at(0), at(20)), run(12, 21, "a2", at(1), at(20)), run(13, 22, "a3", at(2), at(20))],
    jobs: {11: failing("flutter / Analyze & test"), 12: failing("flutter / Analyze & test"), 13: jobs},
    timelines: {20: removedAt(20), 21: removedAt(21), 22: removedAt(22)},
  };
  const causes = report(dataset).periods.all.removalCauses;
  assert.deepEqual(causes, {removed: 3, withFailingJob: 2, withoutFailingJob: 1,
    topFailingJobs: [["flutter / Analyze & test", 2]]});
  assert.match(formatReport(report(dataset)), /removals: 3 \(2 with a failing job, 1 without\)\n  top failing jobs in removals: flutter \/ Analyze & test ×2/u);
});

const fixtureDir = fileURLToPath(new URL("./fixtures/proof-reuse-daily/", import.meta.url));
const fixtureDay = () => JSON.parse(fs.readFileSync(path.join(fixtureDir, "proof-reuse-daily-2026-11-22.json"), "utf8"));
const laneJobs = (lastLane) => [
  job("Plan affected targets", at(0, 0), at(0, 2), at(1, 0)),
  job("flutter / Unit & widget tests", at(1, 0), at(1, 10), at(9, 0)),
  job("contracts / Contract checks", at(1, 0), at(1, 10), at(lastLane === "contracts" ? 14 : 5, 0)),
  job("operations / Operations tests", at(1, 0), at(1, 10), at(lastLane === "operations" ? 12 : 4, 0)),
  job("Required CI", at(14, 5), at(14, 7), at(14, 10)),
];

test("the critical-path saving counts only a reused lane that finished last", () => {
  // contracts ends at 14:00, the next gating job (flutter) at 9:00: 5 minutes saved.
  assert.equal(criticalPathSaving(laneJobs("contracts"), ["contracts"]), 300);
  // contracts was not last: reusing it moves nothing.
  assert.equal(criticalPathSaving(laneJobs("operations"), ["contracts"]), 0);
  // Required CI and skipped jobs never count; a run with no gating job is not measured.
  assert.equal(criticalPathSaving([job("Required CI", at(1), at(1), at(2))], ["contracts"]), null);
  assert.equal(criticalPathSaving(laneJobs("contracts"), []), 0);
});

test("the proof-reuse fixture reads back with its counts, unchecked numbers and critical path", () => {
  const days = loadProofReuseDays(fixtureDir);
  assert.deepEqual(days.map((day) => day.date), ["2026-11-22"]);
  // 501 had a checked contracts hit (contracts last), 504 an unchecked one (operations last), 502 none.
  const summary = proofReuseSummary(days, {501: laneJobs("contracts"), 504: laneJobs("operations")});
  const [row] = summary.rows;
  assert.deepEqual(row.problems, []);
  assert.equal(row.runs, 4);
  assert.equal(row.runsWithVerdicts, 3);
  assert.equal(row.cancelledRuns, 1);
  assert.deepEqual([row.savedSeconds, row.potentialSavedSeconds, row.uncheckedSavedSeconds], [240, 1800, 180]);
  assert.deepEqual([row.misses, row.uncheckedMisses, row.potentialMisses], [1, 1, 1]);
  assert.deepEqual(row.criticalPath, {checked: {savedSeconds: 300, runs: 1}, unchecked: {savedSeconds: 0, runs: 0},
    runsWithHits: 2, notMeasured: 0, duplicates: 0});
  const text = formatReport(report({runs: [], jobs: {}}, {proofReuse: days}));
  assert.match(text, /^Proof reuse shadow \(1 daily files; runner time is summed job runtime, not wall-clock\):/u);
  assert.match(text, /2026-11-22: 4 runs, 3 with verdicts, 1 cancelled\n/u);
  assert.match(text, /runner time saved by hits 4\.0 min of 30\.0 min potential; misses 1, potential misses 1/u);
  assert.match(text, /unchecked: runner time 3\.0 min, misses 1/u);
  assert.match(text, /2 runs with hits, 2 not in the dataset/u);
  assert.doesNotMatch(text, /merge_group runs/u);
});

test("a day whose counts disagree is flagged, and a run seen on an earlier day is not counted twice", () => {
  const first = fixtureDay();
  const second = {...fixtureDay(), date: "2026-11-23", runs: 9, cancelledRuns: 0};
  const summary = proofReuseSummary([first, second], {501: laneJobs("contracts")});
  assert.deepEqual(summary.rows[0].problems, []);
  assert.deepEqual(summary.rows[1].problems, ["runs 9 != runsWithVerdicts 3 + runsWithoutReport 1",
    "cancelledRuns 0 != 1 cancelled in runsWithoutReport"]);
  assert.equal(summary.rows[1].criticalPath.duplicates, 3);
  assert.equal(summary.rows[1].criticalPath.runsWithHits, 0);
  assert.equal(summary.totals.criticalPathSavedSeconds, 300);
  assert.match(formatProofReuseText(summary), /PROBLEM: runs 9 != /u);
});

const formatProofReuseText = (summary) => formatReport({runs: 0, proofReuse: summary});

test("only proof-reuse-daily/1 files are read, and a file's date must match its name", () => {
  const files = {"proof-reuse-daily-2026-11-22.json": {schema: PROOF_REUSE_SCHEMA, date: "2026-11-22"},
    "notes.json": {schema: "other"}};
  const read = (file) => JSON.stringify(files[path.basename(file)]);
  assert.equal(loadProofReuseDays("dir", {list: () => Object.keys(files), read}).length, 1);
  files["proof-reuse-daily-2026-11-22.json"].schema = "proof-reuse-daily/2";
  assert.throws(() => loadProofReuseDays("dir", {list: () => Object.keys(files), read}), /expected proof-reuse-daily\/1/u);
  files["proof-reuse-daily-2026-11-22.json"] = {schema: PROOF_REUSE_SCHEMA, date: "2026-11-21"};
  assert.throws(() => loadProofReuseDays("dir", {list: () => Object.keys(files), read}), /does not match its name/u);
});

test("end to end: --proof-reuse with and without a dataset", () => {
  const alone = spawnSync(process.execPath, [script, "report", "--proof-reuse", fixtureDir], {encoding: "utf8"});
  assert.equal(alone.status, 0, alone.stderr);
  assert.match(alone.stdout, /^Proof reuse shadow/u);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "queue-timings-"));
  try {
    const file = path.join(dir, "data.json");
    fs.writeFileSync(file, JSON.stringify({runs: [run(501, 41, "aaa", at(0), at(14, 10))], jobs: {501: laneJobs("contracts")}}));
    const both = spawnSync(process.execPath, [script, "report", "--data", file, "--proof-reuse", fixtureDir, "--json"],
      {encoding: "utf8"});
    assert.equal(both.status, 0, both.stderr);
    assert.equal(JSON.parse(both.stdout).proofReuse.totals.criticalPathSavedSeconds, 300);
  } finally {
    fs.rmSync(dir, {recursive: true, force: true});
  }
  assert.throws(() => parseArgs(["report"]), /--data, --proof-reuse or both/u);
});
