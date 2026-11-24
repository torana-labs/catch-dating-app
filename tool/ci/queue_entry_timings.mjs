#!/usr/bin/env node
// Merge-queue per-entry timings: for each merge_group CI run, how long the
// entry waited before its run existed, which job was the critical path, and
// how long jobs waited for a runner (macOS and Linux apart). Report only: it
// reads GitHub through `gh api` and changes nothing.
//
//   node tool/ci/queue_entry_timings.mjs fetch --since <ISO date> --out <file>
//     [--repo owner/name] [--workflow ci.yml] [--limit <runs>]
//   node tool/ci/queue_entry_timings.mjs report --data <file> [--split <ISO time>] [--json]
//     [--proof-reuse <dir>]
//
// `fetch` saves runs, their jobs (filter=all) and each queued PR's timeline
// (added_to_merge_queue, removed_from_merge_queue, merged). `report` reads that
// file, so the analysis is repeatable and testable offline. A dataset without
// timelines still reports everything except the enqueue wait and removal
// reasons, which it marks as not measured.
//
// `--proof-reuse <dir>` adds the proof-reuse shadow's daily roll-ups
// (proof-reuse-daily-<date>.json, schema proof-reuse-daily/1, written by
// tool/ci/proof_reuse_report.mjs): per day the runner time hits saved against
// the potential, the unchecked numbers, cancelled runs, and the critical-path
// time hits would have saved in the runs the dataset has jobs for.
import {execFileSync} from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {LANE_JOBS} from "./proof_reuse_shadow.mjs";

const seconds = (from, to) => (from && to ? Math.round((Date.parse(to) - Date.parse(from)) / 1000) : null);

/** The PR number a merge-queue branch names (gh-readonly-queue/main/pr-123-<sha>). */
export function prNumberOf(headBranch) {
  const match = /\/pr-(\d+)-[0-9a-f]{7,40}$/u.exec(headBranch ?? "");
  return match ? Number(match[1]) : null;
}

/**
 * Jobs that are never the critical path: Required CI is the end point, and the
 * proof-reuse shadow's jobs run beside the lanes, outside Required CI's needs
 * (the comparison runs after every lane, so it is often the last job to finish).
 */
export const OFF_PATH_JOBS = Object.freeze(["Required CI", "Compute proof-reuse keys",
  "Compare proof-reuse verdicts with the lanes"]);

/** macos for any macOS runner label, otherwise linux. */
export const runnerKind = (labels = []) => (labels.some((label) => /^macos/iu.test(label)) ? "macos" : "linux");

/** A job that ran on a runner (skipped jobs and job-level `if: false` never get one). */
const executed = (job) => job.conclusion !== "skipped" && Boolean(job.runner_id ?? job.runner_name) && Boolean(job.started_at);

/** The merge-queue events of one PR's timeline, oldest first. */
export function queueEvents(timeline = []) {
  return timeline
    .filter((event) => ["added_to_merge_queue", "removed_from_merge_queue", "merged"].includes(event.event))
    .map((event) => ({event: event.event, at: event.created_at, reason: event.reason ?? null,
      actor: event.actor?.login ?? null}))
    .sort((left, right) => Date.parse(left.at) - Date.parse(right.at));
}

/** GitHub writes removed_from_merge_queue about a second before merged on a successful queue merge. */
export const MERGE_AFTER_REMOVAL_SECONDS = 60;

/**
 * One run's timings. `timeline` may be absent; then the enqueue wait and
 * removal cause are null. `next` is the same PR's next run, if any: queue
 * events from its creation on belong to it, and a run followed by one on a
 * new base with no queue event in between was superseded (regrouped).
 */
export function analyzeRun(run, jobs = [], timeline = null, {next = null} = {}) {
  const ran = jobs.filter(executed);
  const required = jobs.find((job) => job.name === "Required CI");
  const gating = ran.filter((job) => !OFF_PATH_JOBS.includes(job.name) && job.completed_at);
  const critical = gating.reduce((last, job) =>
    (!last || Date.parse(job.completed_at) > Date.parse(last.completed_at) ? job : last), null);
  const waits = {linux: [], macos: []};
  for (const job of ran) {
    const wait = seconds(job.created_at, job.started_at);
    if (wait !== null) waits[runnerKind(job.labels)].push(wait);
  }
  const finishedAt = jobs.reduce((last, job) =>
    (job.completed_at && (!last || Date.parse(job.completed_at) > Date.parse(last)) ? job.completed_at : last), null);
  const events = timeline ? queueEvents(timeline) : null;
  const enqueued = events?.filter((event) => event.event === "added_to_merge_queue" &&
    Date.parse(event.at) <= Date.parse(run.created_at)).at(-1) ?? null;
  const windowEnd = next ? Date.parse(next.created_at) : Infinity;
  const within = (events ?? []).filter((event) => event.event !== "added_to_merge_queue" &&
    Date.parse(event.at) >= Date.parse(run.created_at) && Date.parse(event.at) < windowEnd);
  const mergedEvent = within.find((event) => event.event === "merged");
  const removedEvent = within.find((event) => event.event === "removed_from_merge_queue");
  // A removal just before the merge is how GitHub records a successful queue merge.
  const mergedAfterRemoval = removedEvent && mergedEvent &&
    seconds(removedEvent.at, mergedEvent.at) >= 0 && seconds(removedEvent.at, mergedEvent.at) <= MERGE_AFTER_REMOVAL_SECONDS;
  const removal = removedEvent && !mergedAfterRemoval &&
    (!mergedEvent || Date.parse(removedEvent.at) < Date.parse(mergedEvent.at)) ? removedEvent : null;
  // Required CI only aggregates the lanes; the cause is the lane that failed.
  const failed = ran.filter((job) => job.conclusion === "failure" && job.name !== "Required CI").map((job) => job.name);
  const cancelled = jobs.filter((job) => job.conclusion === "cancelled").map((job) => job.name);
  let outcome;
  if (removal) outcome = "removed";
  else if (mergedEvent) outcome = "merged";
  else if (next && baseOf(next.head_branch) !== baseOf(run.head_branch)) outcome = "superseded";
  else if (!required || !required.conclusion) outcome = run.status === "completed" ? "no-required-ci" : "incomplete";
  else if (required.conclusion === "success") outcome = "passed";
  else if (required.conclusion === "cancelled" || cancelled.length) outcome = "cancelled";
  else outcome = required.conclusion === "failure" ? "failed" : required.conclusion;
  const sum = (list) => list.reduce((total, value) => total + value, 0);
  return {
    runId: run.id, pr: prNumberOf(run.head_branch), attempt: run.run_attempt ?? 1,
    enqueuedAt: enqueued?.at ?? null, createdAt: run.created_at, startedAt: run.run_started_at ?? null, finishedAt,
    queueWaitBeforeRun: enqueued ? seconds(enqueued.at, run.created_at) : null,
    runStartDelay: seconds(run.created_at, run.run_started_at),
    // The queue merges on Required CI, so its completion is the primary end
    // point; the last job to finish (which can be off the path) is kept beside it.
    runDuration: seconds(run.run_started_at ?? run.created_at, finishedAt),
    requiredCiAfter: required?.completed_at ? seconds(run.run_started_at ?? run.created_at, required.completed_at) : null,
    criticalPath: critical ? {name: critical.name, runner: runnerKind(critical.labels),
      finishedAfter: seconds(run.run_started_at ?? run.created_at, critical.completed_at),
      jobDuration: seconds(critical.started_at, critical.completed_at)} : null,
    runnerWait: Object.fromEntries(Object.entries(waits).map(([kind, list]) =>
      [kind, {jobs: list.length, total: sum(list), max: list.length ? Math.max(...list) : 0}])),
    outcome, failedJobs: failed, cancelledJobs: cancelled,
    removal: removal ? {at: removal.at, reason: removal.reason, actor: removal.actor} : null,
  };
}

/** The base commit a merge-queue branch names: the group the entry was tested on. */
export const baseOf = (headBranch) => /\/pr-\d+-([0-9a-f]{7,40})$/u.exec(headBranch ?? "")?.[1] ?? null;

/**
 * Queue rebuilds, from run data alone. A run is superseded when the same PR
 * gets a new run, on another base, before its run finished or within
 * `graceSeconds` of it: the queue regrouped the entry (an entry ahead left,
 * or the base moved) and cancelled or abandoned the old group. A burst is
 * `burstSize` or more runs created within `burstSeconds`, the queue
 * recreating several groups at once.
 */
export function queueRebuilds(runs, {graceSeconds = 120, burstSeconds = 20, burstSize = 3} = {}) {
  const byPr = new Map();
  for (const run of runs) {
    const pr = prNumberOf(run.head_branch);
    if (pr) byPr.set(pr, [...(byPr.get(pr) ?? []), run]);
  }
  const superseded = [];
  for (const [pr, list] of byPr) {
    list.sort((left, right) => Date.parse(left.created_at) - Date.parse(right.created_at));
    for (let index = 1; index < list.length; index += 1) {
      const [old, next] = [list[index - 1], list[index]];
      if (baseOf(old.head_branch) === baseOf(next.head_branch)) continue;
      if (Date.parse(next.created_at) <= Date.parse(old.updated_at) + graceSeconds * 1000) {
        superseded.push({pr, runId: old.id, createdAt: old.created_at, endedAt: old.updated_at,
          replacedBy: next.id, replacedAt: next.created_at});
      }
    }
  }
  const created = runs.map((run) => Date.parse(run.created_at)).sort((a, b) => a - b);
  const bursts = [];
  for (let start = 0; start < created.length;) {
    let end = start;
    while (end + 1 < created.length && created[end + 1] - created[start] <= burstSeconds * 1000) end += 1;
    if (end - start + 1 >= burstSize) bursts.push({at: new Date(created[start]).toISOString(), runs: end - start + 1});
    start = end + 1;
  }
  return {prs: byPr.size, prsWithSeveralRuns: [...byPr.values()].filter((list) => list.length > 1).length,
    superseded: superseded.sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt)), bursts};
}

/** Median and 90th percentile (nearest rank) of the non-null values. */
export function stats(values) {
  const sorted = values.filter((value) => value !== null && value !== undefined).sort((a, b) => a - b);
  if (!sorted.length) return {n: 0, median: null, p90: null, max: null};
  const rank = (q) => sorted[Math.min(sorted.length - 1, Math.ceil(q * sorted.length) - 1)];
  return {n: sorted.length, median: rank(0.5), p90: rank(0.9), max: sorted.at(-1)};
}

/** Fewer entries than this in a period are reported as thin, not extrapolated. */
export const THIN_BELOW = 10;

/**
 * Why removed entries left the queue: each failing job (Required CI excluded)
 * with how many removals it appears in, and the removals with no failing job
 * (dequeued by hand, or a cancelled or timed-out run).
 */
export function removalCauses(entries) {
  const removed = entries.filter((entry) => entry.outcome === "removed");
  const byJob = {};
  for (const entry of removed) for (const job of new Set(entry.failedJobs)) byJob[job] = (byJob[job] ?? 0) + 1;
  return {removed: removed.length, withFailingJob: removed.filter((entry) => entry.failedJobs.length).length,
    withoutFailingJob: removed.filter((entry) => !entry.failedJobs.length).length,
    topFailingJobs: Object.entries(byJob).sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))};
}

function summarizePeriod(entries) {
  const counts = (list) => Object.entries(list.reduce((acc, key) => ({...acc, [key]: (acc[key] ?? 0) + 1}), {}))
    .sort((left, right) => right[1] - left[1]);
  return {
    runs: entries.length, thin: entries.length < THIN_BELOW,
    queueWaitBeforeRun: stats(entries.map((entry) => entry.queueWaitBeforeRun)),
    runStartDelay: stats(entries.map((entry) => entry.runStartDelay)),
    runDuration: stats(entries.map((entry) => entry.runDuration)),
    requiredCiAfter: stats(entries.map((entry) => entry.requiredCiAfter)),
    criticalPathFinishedAfter: stats(entries.map((entry) => entry.criticalPath?.finishedAfter ?? null)),
    criticalPathJobs: counts(entries.filter((entry) => entry.criticalPath).map((entry) => entry.criticalPath.name)),
    runnerWaitLinuxMax: stats(entries.map((entry) => (entry.runnerWait.linux.jobs ? entry.runnerWait.linux.max : null))),
    runnerWaitMacosMax: stats(entries.map((entry) => (entry.runnerWait.macos.jobs ? entry.runnerWait.macos.max : null))),
    runsUsingMacos: entries.filter((entry) => entry.runnerWait.macos.jobs > 0).length,
    outcomes: Object.fromEntries(counts(entries.map((entry) => entry.outcome))),
    removalCauses: removalCauses(entries),
  };
}

/** The report: per-run entries, periods before and after `split`, and every removal or cancellation. */
export function report(dataset, {split = null, proofReuse = null} = {}) {
  const byPr = new Map();
  for (const run of [...dataset.runs].sort((left, right) => Date.parse(left.created_at) - Date.parse(right.created_at))) {
    const pr = prNumberOf(run.head_branch);
    byPr.set(pr, [...(byPr.get(pr) ?? []), run]);
  }
  const nextOf = (run) => {
    const list = byPr.get(prNumberOf(run.head_branch)) ?? [];
    return list[list.indexOf(run) + 1] ?? null;
  };
  const entries = dataset.runs
    .map((run) => analyzeRun(run, dataset.jobs?.[run.id] ?? [], dataset.timelines?.[prNumberOf(run.head_branch)] ?? null,
      {next: nextOf(run)}))
    .sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt));
  const withJobs = entries.filter((entry) => (dataset.jobs?.[entry.runId] ?? []).length > 0);
  const periods = split
    ? {before: withJobs.filter((entry) => Date.parse(entry.createdAt) < Date.parse(split)),
      after: withJobs.filter((entry) => Date.parse(entry.createdAt) >= Date.parse(split))}
    : {all: withJobs};
  return {
    runs: entries.length, runsWithJobs: withJobs.length,
    timelines: Boolean(dataset.timelines && Object.keys(dataset.timelines).length),
    split,
    periods: Object.fromEntries(Object.entries(periods).map(([name, list]) => [name, summarizePeriod(list)])),
    runLevel: {runStartDelay: stats(entries.map((entry) => entry.runStartDelay))},
    rebuilds: queueRebuilds(dataset.runs),
    flagged: withJobs.filter((entry) => ["removed", "cancelled", "failed"].includes(entry.outcome) ||
      entry.cancelledJobs.length).map((entry) => ({runId: entry.runId, pr: entry.pr, createdAt: entry.createdAt,
      outcome: entry.outcome, failedJobs: entry.failedJobs, cancelledJobs: entry.cancelledJobs, removal: entry.removal})),
    entries,
    ...(proofReuse ? {proofReuse: proofReuseSummary(proofReuse, dataset.jobs ?? {})} : {}),
  };
}

export const PROOF_REUSE_SCHEMA = "proof-reuse-daily/1";
const DAILY_FILE = /^proof-reuse-daily-(\d{4}-\d{2}-\d{2})\.json$/u;

/**
 * Reads every proof-reuse-daily-<date>.json in `dir`, oldest first. A file
 * with another schema, or one whose name and date disagree, is refused.
 */
export function loadProofReuseDays(dir, {read = (file) => fs.readFileSync(file, "utf8"), list = fs.readdirSync} = {}) {
  return list(dir).filter((name) => DAILY_FILE.test(name)).sort().map((name) => {
    const day = JSON.parse(read(path.join(dir, name)));
    if (day.schema !== PROOF_REUSE_SCHEMA) throw new Error(`${name}: schema ${day.schema ?? "missing"}, expected ${PROOF_REUSE_SCHEMA}.`);
    if (day.date !== DAILY_FILE.exec(name)[1]) throw new Error(`${name}: date ${day.date} does not match its name.`);
    return day;
  });
}

const belongsTo = (job) => (entry) => entry.name === job || String(entry.name).startsWith(`${job} / `);

/**
 * Seconds the run's critical path would have been shorter had the given
 * ci.yml jobs (and their called jobs) been reused: the last gating finish
 * minus the last finish of what remains. A reused lane that was not last to
 * finish saves nothing. Jobs that waited on a reused lane keep their real
 * times, so this is a lower bound. null when the run has no gating job.
 */
export function criticalPathSaving(jobs, reusedJobs) {
  const gating = (jobs ?? []).filter((job) => !OFF_PATH_JOBS.includes(job.name) && job.completed_at && job.started_at &&
    job.conclusion !== "skipped");
  if (!gating.length || !reusedJobs.length) return gating.length ? 0 : null;
  const last = (list) => Math.max(...list.map((job) => Date.parse(job.completed_at)));
  const remaining = gating.filter((job) => !reusedJobs.some((reused) => belongsTo(reused)(job)));
  const start = Math.min(...gating.map((job) => Date.parse(job.started_at)));
  return Math.max(0, Math.round((last(gating) - (remaining.length ? last(remaining) : start)) / 1000));
}

/**
 * The proof-reuse section: one row per daily file, checked against its own
 * counts, with the critical-path saving of its hits measured against the
 * dataset's job records. A run+attempt seen in an earlier file is skipped.
 */
export function proofReuseSummary(days, jobsByRun = {}) {
  const seen = new Set();
  const rows = days.map((day) => {
    const problems = [];
    const withoutReport = day.runsWithoutReport ?? [];
    if (day.runs !== day.runsWithVerdicts + withoutReport.length) {
      problems.push(`runs ${day.runs} != runsWithVerdicts ${day.runsWithVerdicts} + runsWithoutReport ${withoutReport.length}`);
    }
    const cancelledListed = withoutReport.filter((entry) => entry.conclusion === "cancelled").length;
    if (day.cancelledRuns !== cancelledListed) problems.push(`cancelledRuns ${day.cancelledRuns} != ${cancelledListed} cancelled in runsWithoutReport`);
    const critical = {checked: {savedSeconds: 0, runs: 0}, unchecked: {savedSeconds: 0, runs: 0}, runsWithHits: 0,
      notMeasured: 0, duplicates: 0};
    for (const entry of day.perRun ?? []) {
      const key = `${entry.run}:${entry.attempt}`;
      if (seen.has(key)) {
        critical.duplicates += 1;
        continue;
      }
      seen.add(key);
      const lanes = Object.entries(entry.lanes ?? {});
      const hits = (outcome) => lanes.filter(([, lane]) => lane.outcome === outcome).map(([name]) => LANE_JOBS[name] ?? name);
      const [checked, unchecked] = [hits("hit"), hits("hit_unchecked")];
      if (!checked.length && !unchecked.length) continue;
      critical.runsWithHits += 1;
      const jobs = jobsByRun[entry.run] ?? [];
      if (!jobs.length) {
        critical.notMeasured += 1;
        continue;
      }
      for (const [kind, reused] of [["checked", checked], ["unchecked", unchecked]]) {
        const saved = reused.length ? criticalPathSaving(jobs, reused) : 0;
        if (saved) {
          critical[kind].savedSeconds += saved;
          critical[kind].runs += 1;
        }
      }
    }
    const totals = day.totals ?? {};
    return {date: day.date, runs: day.runs, runsWithVerdicts: day.runsWithVerdicts, cancelledRuns: day.cancelledRuns,
      runsWithoutReport: withoutReport.length, savedSeconds: totals.savedSeconds ?? 0,
      potentialSavedSeconds: totals.potentialSavedSeconds ?? 0, uncheckedSavedSeconds: totals.uncheckedSavedSeconds ?? 0,
      misses: totals.misses ?? 0, uncheckedMisses: totals.uncheckedMisses ?? 0, potentialMisses: totals.potentialMisses ?? 0,
      criticalPath: critical, problems};
  });
  const sum = (pick) => rows.reduce((total, row) => total + pick(row), 0);
  return {days: rows.length, rows, totals: {
    savedSeconds: sum((row) => row.savedSeconds), potentialSavedSeconds: sum((row) => row.potentialSavedSeconds),
    uncheckedSavedSeconds: sum((row) => row.uncheckedSavedSeconds), misses: sum((row) => row.misses),
    uncheckedMisses: sum((row) => row.uncheckedMisses), potentialMisses: sum((row) => row.potentialMisses),
    cancelledRuns: sum((row) => row.cancelledRuns),
    criticalPathSavedSeconds: sum((row) => row.criticalPath.checked.savedSeconds),
    uncheckedCriticalPathSavedSeconds: sum((row) => row.criticalPath.unchecked.savedSeconds),
  }};
}

const minutes = (value) => (value === null ? "not measured" : `${(value / 60).toFixed(1)} min`);

export function formatReport(result) {
  // A proof-reuse-only report (no --data) has no queue entries to describe.
  if (!result.runs && result.proofReuse) return formatProofReuse(result.proofReuse).join("\n");
  const lines = [`${result.runs} merge_group runs; ${result.runsWithJobs} with job timings.` +
    (result.timelines ? "" : " No PR timelines: enqueue wait and removal reasons are not measured.")];
  for (const [name, period] of Object.entries(result.periods)) {
    lines.push("", `${name}: ${period.runs} runs${period.thin ? ` (thin: fewer than ${THIN_BELOW}; do not extrapolate)` : ""}`);
    lines.push(`  queue wait before a run exists: median ${minutes(period.queueWaitBeforeRun.median)}, p90 ${minutes(period.queueWaitBeforeRun.p90)}`);
    lines.push(`  time to Required CI: median ${minutes(period.requiredCiAfter.median)}, p90 ${minutes(period.requiredCiAfter.p90)}`);
    lines.push(`  time to last job: median ${minutes(period.runDuration.median)}, p90 ${minutes(period.runDuration.p90)}`);
    lines.push(`  critical path (last lane job) done after: median ${minutes(period.criticalPathFinishedAfter.median)}, p90 ${minutes(period.criticalPathFinishedAfter.p90)}`);
    lines.push(`  critical-path jobs: ${period.criticalPathJobs.map(([job, count]) => `${job} ×${count}`).join(", ") || "none"}`);
    lines.push(`  longest runner wait per run, Linux: median ${period.runnerWaitLinuxMax.median ?? "-"} s, p90 ${period.runnerWaitLinuxMax.p90 ?? "-"} s, max ${period.runnerWaitLinuxMax.max ?? "-"} s`);
    lines.push(`  longest runner wait per run, macOS: ${period.runsUsingMacos} runs used macOS; median ${period.runnerWaitMacosMax.median ?? "-"} s, p90 ${period.runnerWaitMacosMax.p90 ?? "-"} s, max ${period.runnerWaitMacosMax.max ?? "-"} s`);
    lines.push(`  outcomes: ${Object.entries(period.outcomes).map(([outcome, count]) => `${outcome} ${count}`).join(", ")}`);
    const causes = period.removalCauses;
    if (causes.removed) {
      lines.push(`  removals: ${causes.removed} (${causes.withFailingJob} with a failing job, ${causes.withoutFailingJob} without)`);
      lines.push(`  top failing jobs in removals: ${causes.topFailingJobs.slice(0, 5).map(([job, count]) => `${job} ×${count}`).join(", ") || "none"}`);
    }
  }
  const rebuilds = result.rebuilds;
  lines.push("", `Queue rebuilds (all ${result.runs} runs): ${rebuilds.prs} PRs, ${rebuilds.prsWithSeveralRuns} with more than one run; ` +
    `${rebuilds.superseded.length} runs superseded by a run of the same PR on a new base; ${rebuilds.bursts.length} bursts of 3+ groups created within 20 s.`);
  const perDay = rebuilds.superseded.reduce((acc, item) => ({...acc, [item.createdAt.slice(0, 10)]: (acc[item.createdAt.slice(0, 10)] ?? 0) + 1}), {});
  if (rebuilds.superseded.length) lines.push(`  superseded per day: ${Object.entries(perDay).sort().map(([day, count]) => `${day} ${count}`).join(", ")}`);
  lines.push("", `Removals, failures and cancellations: ${result.flagged.length}`);
  for (const flag of result.flagged) {
    const cause = flag.removal ? `removed (${flag.removal.reason ?? "no reason"}${flag.removal.actor ? `, by ${flag.removal.actor}` : ""})` : flag.outcome;
    lines.push(`  run ${flag.runId} (#${flag.pr}, ${flag.createdAt}): ${cause}` +
      (flag.failedJobs.length ? `; failed: ${flag.failedJobs.join(", ")}` : "") +
      (flag.cancelledJobs.length ? `; cancelled: ${flag.cancelledJobs.join(", ")}` : ""));
  }
  if (result.proofReuse) lines.push("", ...formatProofReuse(result.proofReuse));
  return lines.join("\n");
}

/** The proof-reuse section. Runner time is summed job runtime; critical path is wall-clock. */
export function formatProofReuse(summary) {
  const lines = [`Proof reuse shadow (${summary.days} daily files; runner time is summed job runtime, not wall-clock):`];
  for (const row of summary.rows) {
    const critical = row.criticalPath;
    lines.push(`  ${row.date}: ${row.runs} runs, ${row.runsWithVerdicts} with verdicts, ${row.cancelledRuns} cancelled` +
      (row.runsWithoutReport > row.cancelledRuns ? `, ${row.runsWithoutReport - row.cancelledRuns} more without a report` : ""));
    lines.push(`    runner time saved by hits ${minutes(row.savedSeconds)} of ${minutes(row.potentialSavedSeconds)} potential; ` +
      `misses ${row.misses}, potential misses ${row.potentialMisses}`);
    lines.push(`    unchecked: runner time ${minutes(row.uncheckedSavedSeconds)}, misses ${row.uncheckedMisses}`);
    lines.push(`    critical path saved: ${minutes(critical.checked.savedSeconds)} over ${critical.checked.runs} runs` +
      `, unchecked ${minutes(critical.unchecked.savedSeconds)} over ${critical.unchecked.runs}; ` +
      `${critical.runsWithHits} runs with hits, ${critical.notMeasured} not in the dataset` +
      (critical.duplicates ? `, ${critical.duplicates} already counted on an earlier day` : ""));
    for (const problem of row.problems) lines.push(`    PROBLEM: ${problem}`);
  }
  const totals = summary.totals;
  if (summary.days > 1) {
    lines.push(`  all days: runner time saved ${minutes(totals.savedSeconds)} of ${minutes(totals.potentialSavedSeconds)} potential, ` +
      `unchecked ${minutes(totals.uncheckedSavedSeconds)}; critical path saved ${minutes(totals.criticalPathSavedSeconds)}, ` +
      `unchecked ${minutes(totals.uncheckedCriticalPathSavedSeconds)}; misses ${totals.misses}, unchecked ${totals.uncheckedMisses}, ` +
      `potential ${totals.potentialMisses}; cancelled runs ${totals.cancelledRuns}`);
  }
  return lines;
}

function gh(endpoint, {paginate = false} = {}) {
  const args = ["api", "-H", "Accept: application/vnd.github+json", ...(paginate ? ["--paginate", "--slurp"] : []), endpoint];
  return JSON.parse(execFileSync("gh", args, {encoding: "utf8", maxBuffer: 1 << 30}));
}

const QUEUE_EVENTS = ["added_to_merge_queue", "removed_from_merge_queue", "merged"];

/**
 * Runs, their jobs and the queued PRs' timelines from `gh api`. Resumable:
 * with `previous` (the file an earlier fetch wrote), a completed run's jobs
 * and a PR's timeline are reused unless that PR still has a run in progress,
 * so a rerun fetches only what is new or unfinished. `save` receives the
 * dataset every `saveEvery` API calls, so an interrupted fetch keeps its work.
 */
export function fetchDataset({repo, workflow, since, limit = Infinity, previous = null, api = gh,
  save = () => {}, saveEvery = 25}) {
  const pages = api(`repos/${repo}/actions/workflows/${workflow}/runs?event=merge_group&per_page=100&created=>=${since}`,
    {paginate: true});
  const runs = pages.flatMap((page) => page.workflow_runs).slice(0, limit)
    .map(({id, created_at, run_started_at, updated_at, status, conclusion, run_attempt, head_branch, head_sha}) =>
      ({id, created_at, run_started_at, updated_at, status, conclusion, run_attempt, head_branch, head_sha}));
  const before = new Map((previous?.runs ?? []).map((run) => [run.id, run]));
  const unfinished = new Set(runs.filter((run) => run.status !== "completed").map((run) => prNumberOf(run.head_branch)));
  const dataset = {repo, workflow, since, fetchedAt: new Date().toISOString(), runs, jobs: {}, timelines: {}};
  let calls = 1;
  const tick = () => {
    calls += 1;
    if (calls % saveEvery === 0) save(dataset);
  };
  for (const run of runs) {
    const old = before.get(run.id);
    const reusable = old?.status === "completed" && old.run_attempt === run.run_attempt && previous?.jobs?.[run.id];
    dataset.jobs[run.id] = reusable ? previous.jobs[run.id] :
      api(`repos/${repo}/actions/runs/${run.id}/jobs?filter=all&per_page=100`, {paginate: true})
        .flatMap((page) => page.jobs)
        .map(({name, status, conclusion, labels, runner_id, runner_name, created_at, started_at, completed_at}) =>
          ({name, status, conclusion, labels, runner_id, runner_name, created_at, started_at, completed_at}));
    if (!reusable) tick();
    const pr = prNumberOf(run.head_branch);
    if (!pr || dataset.timelines[pr]) continue;
    if (previous?.timelines?.[pr] && !unfinished.has(pr)) {
      dataset.timelines[pr] = previous.timelines[pr];
      continue;
    }
    dataset.timelines[pr] = api(`repos/${repo}/issues/${pr}/timeline?per_page=100`, {paginate: true}).flat()
      .filter((event) => QUEUE_EVENTS.includes(event.event))
      .map(({event, created_at, reason, actor}) => ({event, created_at, reason: reason ?? null,
        actor: actor ? {login: actor.login} : null}));
    tick();
  }
  save(dataset);
  return {dataset, calls};
}

/** Writes JSON through a temporary file, so an interrupted write never leaves half a dataset. */
export function writeJson(file, value) {
  fs.writeFileSync(`${file}.tmp`, `${JSON.stringify(value)}\n`);
  fs.renameSync(`${file}.tmp`, file);
}

const usage = "Usage: node tool/ci/queue_entry_timings.mjs fetch --since <ISO date> --out <file> " +
  "[--repo owner/name] [--workflow ci.yml] [--limit <n>] [--fresh]\n" +
  "       node tool/ci/queue_entry_timings.mjs report (--data <file> | --proof-reuse <dir>) [--data <file>] " +
  "[--proof-reuse <dir>] [--split <ISO time>] [--json]";

export function parseArgs(argv) {
  const [command, ...rest] = argv;
  if (!["fetch", "report"].includes(command)) throw new Error(usage);
  const options = {command, repo: "torana-labs/catch-dating-app", workflow: "ci.yml", json: false, fresh: false,
    limit: Infinity};
  for (let index = 0; index < rest.length; index += 1) {
    const flag = rest[index];
    if (flag === "--json") { options.json = true; continue; }
    if (flag === "--fresh") { options.fresh = true; continue; }
    const value = rest[++index];
    if (value === undefined) throw new Error(`${flag} needs a value.\n${usage}`);
    const key = {"--since": "since", "--out": "out", "--repo": "repo", "--workflow": "workflow", "--data": "data",
      "--split": "split", "--limit": "limit", "--proof-reuse": "proofReuse"}[flag];
    if (!key) throw new Error(`Unknown option ${flag}.\n${usage}`);
    options[key] = key === "limit" ? Number(value) : value;
  }
  if (command === "fetch" && (!options.since || !options.out)) throw new Error(`fetch needs --since and --out.\n${usage}`);
  if (command === "report" && !options.data && !options.proofReuse) {
    throw new Error(`report needs --data, --proof-reuse or both.\n${usage}`);
  }
  for (const key of ["since", "split"]) {
    if (options[key] && Number.isNaN(Date.parse(options[key]))) throw new Error(`--${key} must be an ISO date or time.`);
  }
  return options;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv[2] === "--help") {
    console.log(usage);
  } else {
    try {
      const options = parseArgs(process.argv.slice(2));
      if (options.command === "fetch") {
        const previous = !options.fresh && fs.existsSync(options.out) ? JSON.parse(fs.readFileSync(options.out, "utf8")) : null;
        const {dataset, calls} = fetchDataset({...options, previous, save: (value) => writeJson(options.out, value)});
        console.log(`Wrote ${options.out}: ${dataset.runs.length} runs, ${calls} API calls` +
          (previous ? " (resumed; completed runs and settled timelines reused)." : "."));
      } else {
        const dataset = options.data ? JSON.parse(fs.readFileSync(options.data, "utf8")) : {runs: [], jobs: {}};
        const result = report(dataset, {split: options.split ?? null,
          proofReuse: options.proofReuse ? loadProofReuseDays(options.proofReuse) : null});
        console.log(options.json ? JSON.stringify(result, null, 2) : formatReport(result));
      }
    } catch (error) {
      console.error(error.message);
      process.exitCode = 2;
    }
  }
}
