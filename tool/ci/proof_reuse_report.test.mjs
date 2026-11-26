import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {GH_ATTEMPTS, MISS_TITLE, SCHEMA, buildDaily, laneSeconds, missBody, newMisses, summaryMarkdown, transientGhFailure,
  withRetry} from "./proof_reuse_report.mjs";

const fixtures = new URL("./fixtures/proof-reuse-daily/", import.meta.url).pathname;
const input = JSON.parse(fs.readFileSync(path.join(fixtures, "input.json"), "utf8"));
const toMap = (object) => new Map(Object.entries(object).map(([key, value]) => [Number(key), value]));
const fixtureDaily = () => buildDaily({...input, reports: toMap(input.reports), jobs: toMap(input.jobs)});

test("the fixture day builds the committed proof-reuse-daily/1 file", () => {
  // The committed file is also the fixture for the queue entry timings report's --proof-reuse reader.
  const expected = JSON.parse(fs.readFileSync(path.join(fixtures, "proof-reuse-daily-2026-11-22.json"), "utf8"));
  assert.deepEqual(fixtureDaily(), expected);
  assert.equal(expected.schema, SCHEMA);
});

test("the header's counts agree with its lists", () => {
  const daily = fixtureDaily();
  // The run from 21 Nov is not in the 22 Nov file.
  assert.equal(daily.runs, 4);
  assert.equal(daily.runs, daily.runsWithVerdicts + daily.runsWithoutReport.length);
  assert.equal(daily.cancelledRuns, daily.runsWithoutReport.filter((run) => run.conclusion === "cancelled").length);
  assert.equal(daily.perRun.length, daily.runsWithVerdicts);
  assert.deepEqual(daily.perRun.map((run) => run.run), [501, 502, 504]);
  for (const field of ["savedSeconds", "potentialSavedSeconds", "misses", "potentialMisses", "uncheckedSavedSeconds", "uncheckedMisses"]) {
    assert.equal(daily.totals[field], Object.values(daily.lanes).reduce((total, lane) => total + lane[field], 0), field);
  }
  // The miss list holds both kinds; the totals keep them apart.
  assert.equal(daily.totals.misses, daily.misses.filter((miss) => !miss.unchecked).length);
  assert.equal(daily.totals.uncheckedMisses, daily.misses.filter((miss) => miss.unchecked).length);
  for (const run of daily.perRun) {
    for (const lane of Object.values(run.lanes)) assert.ok(Number.isInteger(lane.realSeconds));
  }
});

test("a day with no queue runs is an empty file, not an error", () => {
  const daily = buildDaily({...input, runs: [], reports: new Map(), jobs: new Map()});
  assert.deepEqual({runs: daily.runs, lanes: daily.lanes, misses: daily.misses, perRun: daily.perRun},
    {runs: 0, lanes: {}, misses: [], perRun: []});
  assert.deepEqual(daily.totals, {savedSeconds: 0, potentialSavedSeconds: 0, misses: 0, potentialMisses: 0,
    uncheckedSavedSeconds: 0, uncheckedMisses: 0});
  assert.throws(() => buildDaily({...input, date: "22 Nov", reports: new Map(), jobs: new Map()}), /YYYY-MM-DD/u);
});

test("a lane's runtime sums its own job and its called jobs that ran", () => {
  const job = (name, seconds, conclusion = "success") => ({name, conclusion, started_at: "2026-11-22T00:00:00Z",
    completed_at: new Date(Date.parse("2026-11-22T00:00:00Z") + seconds * 1000).toISOString()});
  const jobs = [job("Tools", 60), job("Tools / Node", 30.6), job("Toolsmith", 500), job("Tools / Skipped", 99, "skipped"),
    {name: "Tools / Queued", conclusion: null, started_at: "2026-11-22T00:00:00Z", completed_at: null}];
  assert.equal(laneSeconds("Tools", jobs), 91);
  assert.equal(laneSeconds("Docs", jobs), 0);
  assert.equal(laneSeconds(undefined, jobs), 0);
  assert.equal(laneSeconds("Tools", undefined), 0);
});

test("each miss is posted once, by its hidden marker", () => {
  const {misses} = fixtureDaily();
  const body = missBody(misses, "2026-11-22");
  assert.match(body, /`contracts` in https:\/\/github\.com\/owner\/repo\/actions\/runs\/502 \(#42\): failure/u);
  assert.match(body, /<!-- proof-reuse-miss 502:1:contracts -->/u);
  // An unchecked miss is still a miss, posted and labelled.
  assert.match(body, /`operations` in https:\/\/github\.com\/owner\/repo\/actions\/runs\/504 \(#44\): failure \(unchecked: /u);
  assert.match(body, /<!-- proof-reuse-miss 504:1:operations -->/u);
  assert.match(body, /_Posted by the Proof reuse daily workflow/u);
  assert.deepEqual(newMisses(misses, [null, "unrelated"]), misses);
  assert.deepEqual(newMisses(misses, ["older", body]), []);
  // Another attempt of the same run is a separate miss.
  assert.deepEqual(newMisses([{...misses[0], attempt: 2}], [body]).length, 1);
});

test("the summary states runner time and every compared lane", () => {
  const summary = summaryMarkdown(fixtureDaily());
  assert.match(summary, /4 queue runs: 3 with verdicts, 1 cancelled, 0 other without a report\./u);
  assert.match(summary, /Saved \(hits, eligible lanes\): 240s\. Potential .*: 1800s\. Misses: 1\. Potential misses: 1\./u);
  assert.match(summary, /Unchecked \(record from another hasher version\): saved 180s, misses 1\./u);
  assert.match(summary, /not wall-clock/u);
  assert.match(summary, /\| contracts \| eligible \| 3 \| 2 \| 1 \| 1 \| 1 \| 1 \| 0 \| 3 \| 240 \| 180 \| 0 \|/u);
  assert.match(summary, /\| operations \| eligible \| 3 \| 0 \| 0 \| 0 \| 1 \| 0 \| 1 \| 1 \| 0 \| 0 \| 0 \|/u);
  assert.match(summary, /\| flutter \| pr_subset \| 2 \| 0 \| 0 \| 0 \| 0 \| 0 \| 0 \| 2 \| 0 \| 0 \| 1800 \|/u);
});

// The real script against a fake gh serving the fixture day: runs, artifacts, jobs and the miss issue.
function runCli(t, {openIssue = null, comments = [], flaky = []} = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "proof-reuse-daily-"));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const zips = {};
  for (const [run, report] of Object.entries(input.reports)) {
    const dir = path.join(root, `report-${run}`);
    fs.mkdirSync(dir);
    fs.writeFileSync(path.join(dir, "proof-reuse-shadow.json"), JSON.stringify(report));
    zips[run] = path.join(dir, "report.zip");
    assert.equal(spawnSync("zip", ["-q", "-j", zips[run], path.join(dir, "proof-reuse-shadow.json")]).status, 0);
  }
  // `flaky` endpoint patterns answer HTTP 502 the first time they are read.
  const state = {runs: input.runs, jobs: input.jobs, zips, openIssue, comments, posts: path.join(root, "posts.jsonl"),
    flaky, failed: path.join(root, "failed.txt")};
  const bin = path.join(root, "bin");
  fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin, "gh"), `#!/usr/bin/env node
const fs = require("fs");
const state = ${JSON.stringify(state)};
const args = process.argv.slice(2);
const endpoint = args.find((arg) => arg.startsWith("repos/"));
const page = (value) => console.log(JSON.stringify(args.includes("--slurp") ? [value] : value));
let found;
const flaky = state.flaky.find((pattern) => endpoint && endpoint.includes(pattern));
const failedBefore = fs.existsSync(state.failed) ? fs.readFileSync(state.failed, "utf8").split("\\n") : [];
if (flaky && !failedBefore.includes(endpoint)) {
  fs.appendFileSync(state.failed, endpoint + "\\n");
  process.stderr.write("gh: Server Error (HTTP 502)\\n");
  process.exit(1);
}
if (args.includes("POST")) {
  const body = fs.readFileSync(0, "utf8");
  fs.appendFileSync(state.posts, JSON.stringify({endpoint, title: args.find((arg) => arg.startsWith("title=")) ?? null, body}) + "\\n");
  console.log("{}");
} else if (endpoint === "repos/owner/repo/actions/workflows/ci.yml/runs?event=merge_group&created=2026-11-22T00:00:00Z..2026-11-22T23:59:59Z&per_page=100") {
  page({workflow_runs: state.runs.filter((run) => run.created_at.startsWith("2026-11-22"))});
} else if ((found = /actions\\/runs\\/(\\d+)\\/artifacts/u.exec(endpoint))) {
  const run = state.runs.find((entry) => String(entry.id) === found[1]);
  page({artifacts: state.zips[found[1]] ? [{id: Number(found[1]) * 10, expired: false,
    name: "proof-reuse-shadow-" + found[1] + "-" + run.run_attempt}, {id: 1, expired: false, name: "harness-plan-x"}] : []});
} else if ((found = /actions\\/artifacts\\/(\\d+)\\/zip/u.exec(endpoint))) {
  process.stdout.write(fs.readFileSync(state.zips[String(Number(found[1]) / 10)]));
} else if ((found = /actions\\/runs\\/(\\d+)\\/attempts\\/(\\d+)\\/jobs/u.exec(endpoint))) {
  page({jobs: state.jobs[found[1]] ?? []});
} else if (/\\/issues\\?state=open/u.test(endpoint)) {
  console.log(JSON.stringify(state.openIssue ? [state.openIssue, {number: 3, title: "Other", body: ""}] : []));
} else if (/\\/issues\\/\\d+\\/comments/u.test(endpoint)) {
  page(state.comments);
} else process.exit(1);
`, {mode: 0o755});
  const out = path.join(root, "out");
  const summary = path.join(root, "summary.md");
  const output = path.join(root, "output.txt");
  const result = spawnSync(process.execPath, [new URL("./proof_reuse_report.mjs", import.meta.url).pathname,
    "--date", "2026-11-22", "--out", out], {encoding: "utf8", env: {...process.env,
    PATH: `${bin}${path.delimiter}${process.env.PATH}`, GITHUB_REPOSITORY: "owner/repo", GITHUB_RUN_ID: "9000",
    GITHUB_SHA: input.source.sha, GITHUB_STEP_SUMMARY: summary, GITHUB_OUTPUT: output, PROOF_REUSE_RETRY_BASE_MS: "1"}});
  assert.equal(result.status, 0, result.stderr);
  const posts = fs.existsSync(state.posts) ? fs.readFileSync(state.posts, "utf8").trim().split("\n").map((line) => JSON.parse(line)) : [];
  const failed = fs.existsSync(state.failed) ? fs.readFileSync(state.failed, "utf8").trim().split("\n") : [];
  return {failed, daily: JSON.parse(fs.readFileSync(path.join(out, "proof-reuse-daily-2026-11-22.json"), "utf8")),
    log: result.stdout, posts, summary: fs.readFileSync(summary, "utf8"), output: fs.readFileSync(output, "utf8")};
}

test("the script writes the day's file and opens the miss issue", (t) => {
  const {daily, log, posts, summary, output} = runCli(t);
  assert.equal(output, "date=2026-11-22\n");
  const expected = fixtureDaily();
  assert.deepEqual({...daily, generatedAt: null}, {...expected, generatedAt: null});
  assert.match(log, /3\/4 runs with verdicts, 1 miss\(es\), 1 unchecked; miss issue: opened/u);
  assert.equal(posts.length, 1);
  assert.equal(posts[0].endpoint, "repos/owner/repo/issues");
  assert.equal(posts[0].title, `title=${MISS_TITLE}`);
  assert.match(posts[0].body, /proof-reuse-miss 502:1:contracts/u);
  assert.match(posts[0].body, /proof-reuse-miss 504:1:operations/u);
  assert.match(summary, /### Proof reuse shadow, 2026-11-22/u);
});

test("the script comments on the open miss issue, and only with misses not yet posted", (t) => {
  const openIssue = {number: 7, title: MISS_TITLE, body: "first"};
  const commented = runCli(t, {openIssue});
  assert.match(commented.log, /miss issue: commented/u);
  assert.equal(commented.posts[0].endpoint, "repos/owner/repo/issues/7/comments");
  const posted = runCli(t, {openIssue, comments: [{body: "<!-- proof-reuse-miss 502:1:contracts -->\n<!-- proof-reuse-miss 504:1:operations -->"}]});
  assert.match(posted.log, /miss issue: already_posted/u);
  assert.deepEqual(posted.posts, []);
});


test("an API read that GitHub answers 5xx is retried, up to three attempts with backoff; nothing else is", () => {
  const answers = (...list) => {
    const calls = [];
    return {calls, call: () => { calls.push(1); return list[calls.length - 1]; }};
  };
  const ok = {status: 0, stdout: "{}", stderr: ""};
  const bad = (code) => ({status: 1, stdout: "", stderr: `gh: Server Error (HTTP ${code})\n`});
  const waits = [];
  const sleep = (ms) => waits.push(ms);
  let run = answers(bad(502), bad(503), ok);
  assert.equal(withRetry(run.call, {baseMs: 100, sleep}), ok);
  assert.deepEqual([run.calls.length, waits], [3, [100, 200]]);
  // Three 5xx in a row: the last failure is returned for the caller to report.
  waits.length = 0;
  run = answers(bad(500), bad(502), bad(504), ok);
  assert.deepEqual(withRetry(run.call, {baseMs: 100, sleep}), bad(504));
  assert.deepEqual([run.calls.length, waits, GH_ATTEMPTS], [3, [100, 200], 3]);
  // A 4xx or any other failure is not transient: no retry, no wait.
  waits.length = 0;
  for (const failure of [bad(404), {status: 1, stdout: "", stderr: "gh: Not Found (HTTP 404)"}, {status: 1, stderr: "spawn gh ENOENT"}]) {
    run = answers(failure, ok);
    assert.equal(withRetry(run.call, {baseMs: 100, sleep}), failure);
    assert.equal(run.calls.length, 1);
  }
  assert.deepEqual(waits, []);
  assert.equal(transientGhFailure("gh: Bad Gateway (HTTP 502)"), true);
  assert.equal(transientGhFailure("HTTP 5020 bytes"), false);
  assert.equal(transientGhFailure(undefined), false);
});

test("the script survives a 502 on the runs listing and on a run's jobs, and writes the same day", (t) => {
  const {daily, failed} = runCli(t, {flaky: ["/runs?event=merge_group", "/jobs"]});
  assert.ok(failed.some((endpoint) => endpoint.includes("/runs?event=merge_group")), "the runs listing failed once");
  assert.ok(failed.some((endpoint) => endpoint.includes("/jobs")), "a jobs read failed once");
  const expected = fixtureDaily();
  assert.deepEqual({...daily, generatedAt: null}, {...expected, generatedAt: null});
});
