#!/usr/bin/env node
// Weekly CI metrics (owner decision, 15 Nov 2026: measure CI efficiency every
// week instead of reconstructing it by hand). Reads the last seven days of
// main CI (`ci.yml`) runs and their jobs, and posts one comment to a single
// open "Weekly CI metrics" issue:
//
// - time from run start to the Required CI result, per event (p50, p90);
// - Linux and macOS job minutes per run, per event (rounded up per job, as
//   GitHub bills), so cost can be tracked even while minutes are free;
// - merge-queue runs per merged pull request;
// - how many main push runs reused the merge queue's result;
// - peak concurrent Linux and macOS jobs;
// - Required CI failure rate per event;
// - flaky jobs: a job that failed and then passed on a re-run of the same run
//   (same commit, same inputs).
//
// Each comment embeds its numbers, so the next week's comment shows the change.
// Report-only: it never fails CI and changes nothing but the issue.
//
// Usage (CI metrics workflow): GH_TOKEN and GITHUB_REPOSITORY set.
//   node tool/ci/ci_metrics.mjs [--days 7] [--dry-run]
import assert from "node:assert/strict";
import {execFile, spawnSync} from "node:child_process";
import {promisify} from "node:util";
import {fileURLToPath} from "node:url";

export const ISSUE_TITLE = "Weekly CI metrics";
export const REQUIRED_CI_JOB = "Required CI";
const EVENTS = ["pull_request", "merge_group", "push", "schedule"];
const FOOTER = "\n\n---\n_Posted by the CI metrics workflow (tool/ci/ci_metrics.mjs)._";
const MARKER = /<!-- ci-metrics:(\{.*?\}) -->/su;
// A main push run that reused the merge queue's result runs only its plan and
// the Required CI summary: a few Linux minutes at most.
const REUSE_MAX_LINUX_MINUTES = 5;

const minutesBetween = (start, end) => (Date.parse(end) - Date.parse(start)) / 60000;
const isMac = (job) => (job.labels ?? []).some((label) => /macos/iu.test(label));
const ran = (job) => job.started_at && job.completed_at && job.conclusion && job.conclusion !== "skipped";

/** The value at quantile `q` of `values` (nearest rank), or null when empty. */
export function quantile(values, q) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1))];
}

/** Billable minutes of one run's latest-attempt jobs: each job rounded up, Linux and macOS apart. */
export function runMinutes(jobs) {
  let linux = 0;
  let mac = 0;
  for (const job of jobs.filter(ran)) {
    const minutes = Math.max(1, Math.ceil(minutesBetween(job.started_at, job.completed_at)));
    if (isMac(job)) mac += minutes; else linux += minutes;
  }
  return {linux, mac};
}

/** The most jobs of each kind running at the same moment. */
export function peakConcurrency(jobs) {
  const edges = jobs.filter(ran).flatMap((job) => [
    {at: Date.parse(job.started_at), delta: 1, mac: isMac(job)},
    {at: Date.parse(job.completed_at), delta: -1, mac: isMac(job)},
  ]).sort((a, b) => a.at - b.at || a.delta - b.delta);
  const now = {linux: 0, mac: 0};
  const peak = {linux: 0, mac: 0};
  for (const edge of edges) {
    const kind = edge.mac ? "mac" : "linux";
    now[kind] += edge.delta;
    peak[kind] = Math.max(peak[kind], now[kind]);
  }
  return peak;
}

/**
 * Jobs that failed in one attempt of a run and passed in a later attempt of
 * the same run: the same commit and inputs, so the failure did not come from
 * the change. `jobs` holds every attempt's jobs (each with run_id and
 * run_attempt).
 */
export function flakyJobs(jobs) {
  const byRunAndName = new Map();
  for (const job of jobs) {
    if (!job.conclusion) continue;
    const key = `${job.run_id}\0${job.name}`;
    byRunAndName.set(key, [...(byRunAndName.get(key) ?? []), job]);
  }
  const flaky = new Map();
  for (const attempts of byRunAndName.values()) {
    const sorted = attempts.sort((a, b) => a.run_attempt - b.run_attempt);
    const failedAt = sorted.findIndex((job) => ["failure", "timed_out"].includes(job.conclusion));
    if (failedAt < 0 || !sorted.slice(failedAt + 1).some((job) => job.conclusion === "success")) continue;
    const name = sorted[failedAt].name;
    flaky.set(name, (flaky.get(name) ?? 0) + 1);
  }
  return [...flaky].map(([name, count]) => ({name, count})).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/**
 * The week's metrics. Pure, so every number is testable.
 *
 * @param {object} input
 * @param {Array<object>} input.runs CI runs created in the window.
 * @param {Map<number, Array<object>>} input.jobsByRun Every attempt's jobs, by run id.
 * @param {number|null} input.mergedPullRequests Pull requests merged in the window.
 */
export function summarize({runs, jobsByRun, mergedPullRequests}) {
  const events = {};
  const allLatestJobs = [];
  for (const event of EVENTS) {
    const counted = runs.filter((run) => run.event === event && run.status === "completed" &&
      !["cancelled", "skipped"].includes(run.conclusion));
    const answers = [];
    const linux = [];
    const mac = [];
    let failed = 0;
    let reused = 0;
    for (const run of counted) {
      const latest = (jobsByRun.get(run.id) ?? []).filter((job) => job.run_attempt === run.run_attempt);
      allLatestJobs.push(...latest);
      const required = latest.find((job) => job.name === REQUIRED_CI_JOB && job.completed_at);
      if (required) {
        answers.push(minutesBetween(run.run_started_at ?? run.created_at, required.completed_at));
        if (required.conclusion !== "success") failed += 1;
      }
      const minutes = runMinutes(latest);
      linux.push(minutes.linux);
      mac.push(minutes.mac);
      if (event === "push" && required?.conclusion === "success" && minutes.linux <= REUSE_MAX_LINUX_MINUTES &&
        minutes.mac === 0) reused += 1;
    }
    const mean = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
    events[event] = {
      runs: counted.length,
      answerP50: quantile(answers, 0.5),
      answerP90: quantile(answers, 0.9),
      linuxPerRun: mean(linux),
      macPerRun: mean(mac),
      linuxTotal: linux.reduce((sum, value) => sum + value, 0),
      macTotal: mac.reduce((sum, value) => sum + value, 0),
      requiredFailureRate: answers.length ? failed / answers.length : null,
      ...(event === "push" ? {reusedQueueResult: reused} : {}),
    };
  }
  const queueRuns = events.merge_group.runs;
  return {
    events,
    mergedPullRequests,
    queueRunsPerMergedPr: mergedPullRequests ? queueRuns / mergedPullRequests : null,
    peak: peakConcurrency(allLatestJobs),
    flaky: flakyJobs([...jobsByRun.values()].flat()),
  };
}

const fmt = (value, digits = 0) => value === null || value === undefined ? "–" : Number(value).toFixed(digits);
const pct = (value) => value === null || value === undefined ? "–" : `${Math.round(value * 100)}%`;

function delta(current, previous, digits = 0, lowerIsBetter = true) {
  if (current === null || current === undefined || previous === null || previous === undefined) return "";
  const change = current - previous;
  if (Math.abs(change) < 10 ** -digits / 2) return " (=)";
  const better = lowerIsBetter ? change < 0 : change > 0;
  return ` (${change > 0 ? "+" : ""}${change.toFixed(digits)} ${better ? "better" : "worse"})`;
}

/** The comment body for this week, compared with last week's numbers when given. */
export function renderReport({metrics, previous = null, from, to}) {
  const prev = previous?.events ?? {};
  const label = {pull_request: "Pull request", merge_group: "Merge queue", push: "Main push", schedule: "Nightly"};
  const rows = EVENTS.map((event) => {
    const now = metrics.events[event];
    const was = prev[event] ?? {};
    return `| ${label[event]} | ${now.runs} | ${fmt(now.answerP50)}${delta(now.answerP50, was.answerP50)} | ` +
      `${fmt(now.answerP90)}${delta(now.answerP90, was.answerP90)} | ${fmt(now.linuxPerRun)}${delta(now.linuxPerRun, was.linuxPerRun)} | ` +
      `${fmt(now.macPerRun)}${delta(now.macPerRun, was.macPerRun)} | ${pct(now.requiredFailureRate)} |`;
  });
  const push = metrics.events.push;
  const flaky = metrics.flaky.length ?
    metrics.flaky.slice(0, 15).map((job) => `- ${job.name}: ${job.count}`).join("\n") :
    "None: no job failed and then passed on a re-run of the same run.";
  const body = [
    `## CI metrics, ${from} to ${to}`,
    "",
    "Minutes to answer: from run start to the Required CI result. Job minutes: per run, each job rounded up as GitHub bills.",
    "Brackets compare with last week's comment.",
    "",
    "| Event | Runs | Minutes to answer, p50 | p90 | Linux job-min / run | macOS job-min / run | Required CI failed |",
    "|---|---:|---:|---:|---:|---:|---:|",
    ...rows,
    "",
    `- Merge-queue runs per merged pull request: ${fmt(metrics.queueRunsPerMergedPr, 2)}` +
      `${delta(metrics.queueRunsPerMergedPr, previous?.queueRunsPerMergedPr, 2)} ` +
      `(${metrics.events.merge_group.runs} queue runs, ${metrics.mergedPullRequests ?? "?"} merged pull requests)`,
    `- Main push runs that reused the merge queue's result: ${push.reusedQueueResult ?? 0} of ${push.runs}`,
    `- Peak concurrent jobs: ${metrics.peak.linux} Linux, ${metrics.peak.mac} macOS`,
    `- Total job minutes: ${EVENTS.reduce((sum, event) => sum + metrics.events[event].linuxTotal, 0)} Linux, ` +
      `${EVENTS.reduce((sum, event) => sum + metrics.events[event].macTotal, 0)} macOS`,
    "",
    "### Flaky jobs (failed, then passed on a re-run of the same run)",
    "",
    flaky,
    "",
    `<!-- ci-metrics:${JSON.stringify(metrics)} -->`,
  ].join("\n");
  return body + FOOTER;
}

/** Last week's numbers from the newest earlier comment that carries them. */
export function previousMetrics(comments) {
  for (const comment of [...comments].reverse()) {
    const match = MARKER.exec(comment.body ?? "");
    if (!match) continue;
    try { return JSON.parse(match[1]); } catch { /* an unreadable comment is skipped */ }
  }
  return null;
}

function gh(args, input) {
  const result = spawnSync("gh", args, {encoding: "utf8", input, maxBuffer: 256 * 1024 * 1024});
  assert.equal(result.status, 0, result.stderr || `gh ${args.join(" ")} failed`);
  return result.stdout;
}

function pages(endpoint, key) {
  const items = [];
  for (let page = 1; page <= 50; page += 1) {
    const separator = endpoint.includes("?") ? "&" : "?";
    const response = JSON.parse(gh(["api", `${endpoint}${separator}per_page=100&page=${page}`]));
    const batch = (key ? response[key] : response) ?? [];
    items.push(...batch);
    if (batch.length < 100) break;
  }
  return items;
}

const execFileAsync = promisify(execFile);

/** Every page of a list endpoint, read without blocking other requests. */
async function pagesAsync(endpoint, key) {
  const items = [];
  for (let page = 1; page <= 50; page += 1) {
    const separator = endpoint.includes("?") ? "&" : "?";
    const {stdout} = await execFileAsync("gh", ["api", `${endpoint}${separator}per_page=100&page=${page}`],
      {maxBuffer: 256 * 1024 * 1024});
    const response = JSON.parse(stdout);
    const batch = (key ? response[key] : response) ?? [];
    items.push(...batch);
    if (batch.length < 100) break;
  }
  return items;
}

/** Runs `task` over `items`, at most `limit` at a time. */
async function mapLimit(items, limit, task) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({length: Math.min(limit, items.length)}, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await task(items[index]);
    }
  }));
  return results;
}

async function main(argv) {
  const repository = process.env.GITHUB_REPOSITORY;
  assert.match(repository ?? "", /^[\w.-]+\/[\w.-]+$/u, "GITHUB_REPOSITORY is required");
  const daysIndex = argv.indexOf("--days");
  const days = daysIndex >= 0 ? Number(argv[daysIndex + 1]) : 7;
  assert.ok(Number.isInteger(days) && days > 0 && days <= 31, "--days must be 1-31");
  const dryRun = argv.includes("--dry-run");
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  const fromIso = from.toISOString().slice(0, 19) + "Z";
  const runs = pages(`repos/${repository}/actions/workflows/ci.yml/runs?created=%3E%3D${fromIso}`, "workflow_runs");
  const completed = runs.filter((run) => run.status === "completed");
  const jobLists = await mapLimit(completed, 8, (run) =>
    pagesAsync(`repos/${repository}/actions/runs/${run.id}/jobs?filter=all`, "jobs"));
  const jobsByRun = new Map(completed.map((run, index) => [run.id, jobLists[index]]));
  const search = JSON.parse(gh(["api", "-X", "GET", "search/issues", "-f",
    `q=repo:${repository} is:pr is:merged merged:>=${fromIso}`, "-f", "per_page=1"]));
  const metrics = summarize({runs, jobsByRun, mergedPullRequests: search.total_count ?? null});
  const issues = JSON.parse(gh(["api", `repos/${repository}/issues?state=open&creator=github-actions%5Bbot%5D&per_page=100`]));
  const issue = issues.find((candidate) => candidate.title === ISSUE_TITLE && !candidate.pull_request) ?? null;
  // The issue body carries the first week's numbers; comments carry the rest.
  const comments = issue ? [{body: issue.body}, ...pages(`repos/${repository}/issues/${issue.number}/comments`, null)] : [];
  const body = renderReport({metrics, previous: previousMetrics(comments), from: fromIso.slice(0, 10),
    to: to.toISOString().slice(0, 10)});
  if (dryRun) {
    console.log(body);
    return;
  }
  if (issue) {
    gh(["api", "-X", "POST", `repos/${repository}/issues/${issue.number}/comments`, "-F", "body=@-"], body);
  } else {
    gh(["api", "-X", "POST", `repos/${repository}/issues`, "-f", `title=${ISSUE_TITLE}`, "-F", "body=@-"],
      `One comment a week with main CI's speed, job minutes, merge-queue reuse and flaky jobs (docs/release_operations.md, "Weekly CI metrics").\n\n${body}`);
  }
  console.log(`CI metrics posted for ${runs.length} runs.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => { console.error(error.stack ?? error.message); process.exitCode = 1; });
}
