#!/usr/bin/env node
// Daily roll-up of the proof-reuse shadow (Phase 1, 22 Nov 2026). Each merge
// queue run of ci.yml uploads proof-reuse-shadow-<run>-<attempt>
// (tool/ci/proof_reuse_shadow.mjs): per lane, whether the queue could have
// reused the queued pull request's pass, and what the lane really did. This
// reads one UTC day of those runs (bucketed by run created_at) and writes
// proof-reuse-daily-<date>.json, schema proof-reuse-daily/1. `runs` is the
// count of the day's queue runs and `perRun` lists each run's lane verdicts:
//
// - savedSeconds: summed runtime of the lane's jobs in runs where it would have
//   been reused and passed (eligible lanes only);
// - potentialSavedSeconds: the same for runs where a narrowed (pr_subset) lane's
//   keys matched and it passed on the pull request, the evidence for whether
//   those lanes should run queue-equivalent on pull requests;
// - misses: lanes that would have been reused but did not pass;
// - unchecked*: the same for eligible lanes whose pull request record came
//   from another hasher version, so it could not cross-check the recomputed
//   key (would_reuse_unchecked, RE 23 Nov 2026), kept apart from the checked
//   numbers. An unchecked miss is still a miss and is posted to the issue.
//
// All times are integer seconds of runner time (summed job runtimes), not
// wall-clock. A miss is also posted once to the "Proof reuse shadow miss"
// issue. Report-only: it skips and gates nothing.
//
// Usage: node tool/ci/proof_reuse_report.mjs [--date YYYY-MM-DD] --out <dir>
//   (GH_TOKEN, GITHUB_REPOSITORY set; the date defaults to yesterday in UTC)
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";

export const SCHEMA = "proof-reuse-daily/1";
export const MISS_TITLE = "Proof reuse shadow miss";
const DATE = /^\d{4}-\d{2}-\d{2}$/u;
const FOOTER = "\n\n---\n_Posted by the Proof reuse daily workflow (tool/ci/proof_reuse_report.mjs)._";
const MISS_MARKER = /<!-- proof-reuse-miss (\d+):(\d+):([a-z_]+) -->/gu;

/** Summed runtime, in whole seconds, of a lane's ci.yml job and its called jobs that ran. */
export function laneSeconds(job, jobs) {
  if (!job) return 0;
  let total = 0;
  for (const entry of jobs ?? []) {
    if (entry?.name !== job && !String(entry?.name).startsWith(`${job} / `)) continue;
    if (!entry.started_at || !entry.completed_at || entry.conclusion === "skipped") continue;
    const seconds = (Date.parse(entry.completed_at) - Date.parse(entry.started_at)) / 1000;
    if (Number.isFinite(seconds) && seconds > 0) total += seconds;
  }
  return Math.round(total);
}

/**
 * One day's roll-up. Pure, so every case is testable.
 *
 * @param {object} input
 * @param {string} input.date YYYY-MM-DD (UTC).
 * @param {string} input.repository owner/name.
 * @param {string} input.generatedAt ISO time.
 * @param {{workflowRunId:number|null, sha:string|null}} input.source The run that builds the file.
 * @param {Array<object>} input.runs The day's merge_group ci.yml runs (latest attempt each).
 * @param {Map<number, object>} input.reports Shadow report per run id, when one was found.
 * @param {Map<number, Array<object>>} input.jobs Latest-attempt job records per run id.
 */
export function buildDaily({date, repository, generatedAt, source, runs, reports, jobs}) {
  assert.match(date, DATE, "date must be YYYY-MM-DD");
  const day = runs.filter((run) => String(run.created_at ?? "").startsWith(date))
    .sort((left, right) => Number(left.id) - Number(right.id));
  const withReport = day.filter((run) => reports.has(Number(run.id)));
  const withoutReport = day.filter((run) => !reports.has(Number(run.id)))
    .map((run) => ({run: Number(run.id), attempt: Number(run.run_attempt), conclusion: run.conclusion ?? run.status ?? null}));
  const lanes = {};
  const misses = [];
  const entries = withReport.map((run) => {
    const report = reports.get(Number(run.id));
    const runJobs = jobs.get(Number(run.id)) ?? [];
    const laneEntries = {};
    for (const lane of report.lanes ?? []) {
      const potential = lane.class === "pr_subset" && lane.keysMatch === true && lane.prResult === "success";
      const realSeconds = laneSeconds(lane.job, runJobs);
      laneEntries[lane.lane] = {outcome: lane.outcome, class: lane.class, reason: lane.reason, keysMatch: lane.keysMatch === true,
        prResult: lane.prResult ?? null, real: lane.real ?? null, potential, realSeconds};
      const total = lanes[lane.lane] ??= {class: lane.class, compared: 0, eligible: 0, wouldReuse: 0, hits: 0, misses: 0,
        wouldReuseUnchecked: 0, uncheckedHits: 0, uncheckedMisses: 0, uncheckedSavedSeconds: 0,
        keysMatchPassed: 0, savedSeconds: 0, potentialSavedSeconds: 0, potentialMisses: 0, reasons: {}};
      total.compared += 1;
      if (lane.class === "eligible") total.eligible += 1;
      if (lane.verdict === "would_reuse") total.wouldReuse += 1;
      if (lane.verdict === "would_reuse_unchecked") total.wouldReuseUnchecked += 1;
      if (lane.outcome === "hit") {
        total.hits += 1;
        total.savedSeconds += realSeconds;
      }
      if (lane.outcome === "hit_unchecked") {
        total.uncheckedHits += 1;
        total.uncheckedSavedSeconds += realSeconds;
      }
      if (lane.outcome === "miss" || lane.outcome === "miss_unchecked") {
        const unchecked = lane.outcome === "miss_unchecked";
        if (unchecked) total.uncheckedMisses += 1;
        else total.misses += 1;
        misses.push({lane: lane.lane, run: Number(run.id), attempt: Number(run.run_attempt),
          runUrl: run.html_url ?? `https://github.com/${repository}/actions/runs/${run.id}`,
          pr: report.pr ? Number(report.pr) : null, real: lane.real ?? null, unchecked});
      }
      if (lane.keysMatch === true && lane.prResult === "success") total.keysMatchPassed += 1;
      if (potential) {
        if (lane.real === "success") total.potentialSavedSeconds += realSeconds;
        else total.potentialMisses += 1;
      }
      total.reasons[lane.reason] = (total.reasons[lane.reason] ?? 0) + 1;
    }
    return {run: Number(run.id), attempt: Number(run.run_attempt), pr: report.pr ? Number(report.pr) : null,
      createdAt: run.created_at, lanes: laneEntries};
  });
  const sum = (field) => Object.values(lanes).reduce((total, lane) => total + lane[field], 0);
  return {
    schema: SCHEMA, date, generatedAt, source,
    runs: day.length,
    runsWithVerdicts: withReport.length,
    cancelledRuns: withoutReport.filter((run) => run.conclusion === "cancelled").length,
    runsWithoutReport: withoutReport,
    lanes: Object.fromEntries(Object.entries(lanes).sort(([left], [right]) => left.localeCompare(right))),
    totals: {savedSeconds: sum("savedSeconds"), potentialSavedSeconds: sum("potentialSavedSeconds"), misses: sum("misses"),
      potentialMisses: sum("potentialMisses"), uncheckedSavedSeconds: sum("uncheckedSavedSeconds"),
      uncheckedMisses: sum("uncheckedMisses")},
    misses,
    perRun: entries,
  };
}

/** The misses not yet posted, by their hidden markers in the issue's texts. */
export function newMisses(misses, texts) {
  const posted = new Set(texts.flatMap((text) => [...String(text ?? "").matchAll(MISS_MARKER)].map((match) => match.slice(1).join(":"))));
  return misses.filter((miss) => !posted.has(`${miss.run}:${miss.attempt}:${miss.lane}`));
}

export function missBody(misses, date) {
  return [
    `Proof reuse shadow, ${date}: ${misses.length === 1 ? "a lane" : `${misses.length} lanes`} would have been reused but did not pass in the merge queue.`,
    "", ...misses.map((miss) => `- \`${miss.lane}\` in ${miss.runUrl}${miss.pr ? ` (#${miss.pr})` : ""}: ${miss.real}` +
      (miss.unchecked ? " (unchecked: the pull request's record came from another hasher version)" : "")),
    "", "The bar for enabling reuse is a week with zero misses. Find why the lane's key matched the pull request's but its queue result differed.",
  ].join("\n") + misses.map((miss) => `\n<!-- proof-reuse-miss ${miss.run}:${miss.attempt}:${miss.lane} -->`).join("") + FOOTER;
}

export function summaryMarkdown(daily) {
  const lanes = Object.entries(daily.lanes);
  return [
    `### Proof reuse shadow, ${daily.date}`, "",
    `${daily.runs} queue runs: ${daily.runsWithVerdicts} with verdicts, ${daily.cancelledRuns} cancelled, ` +
      `${daily.runsWithoutReport.length - daily.cancelledRuns} other without a report.`,
    `Saved (hits, eligible lanes): ${daily.totals.savedSeconds}s. Potential (narrowed lanes, keys matched): ` +
      `${daily.totals.potentialSavedSeconds}s. Misses: ${daily.totals.misses}. Potential misses: ${daily.totals.potentialMisses}.`,
    `Unchecked (record from another hasher version): saved ${daily.totals.uncheckedSavedSeconds}s, ` +
      `misses ${daily.totals.uncheckedMisses}.`,
    "Runner time (summed job runtimes), not wall-clock.", "",
    "| Lane | Class | Compared | Would reuse | Hits | Misses | Unchecked reuse | Unchecked hits | Unchecked misses | " +
      "Keys matched, PR passed | Saved s | Unchecked s | Potential s |",
    "|---|---|---|---|---|---|---|---|---|---|---|---|---|",
    ...lanes.map(([lane, total]) => `| ${lane} | ${total.class} | ${total.compared} | ${total.wouldReuse} | ${total.hits} | ` +
      `${total.misses} | ${total.wouldReuseUnchecked} | ${total.uncheckedHits} | ${total.uncheckedMisses} | ` +
      `${total.keysMatchPassed} | ${total.savedSeconds} | ${total.uncheckedSavedSeconds} | ${total.potentialSavedSeconds} |`),
  ].join("\n");
}

function gh(args, {binary = false} = {}) {
  const result = spawnSync("gh", args, {encoding: binary ? undefined : "utf8", maxBuffer: 64 * 1024 * 1024});
  assert.equal(result.status, 0, `gh ${args.at(-1)}: ${String(result.stderr).trim().split("\n")[0]}`);
  return binary ? result.stdout : JSON.parse(result.stdout);
}

const yesterday = (now = Date.now()) => new Date(now - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

function readReport(repository, run) {
  const artifacts = gh(["api", "--paginate", "--slurp", `repos/${repository}/actions/runs/${run.id}/artifacts?per_page=100`])
    .flatMap((page) => page.artifacts ?? []);
  const name = `proof-reuse-shadow-${run.id}-${run.run_attempt}`;
  const artifact = artifacts.find((entry) => entry.name === name && !entry.expired);
  if (!artifact) return null;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "proof-reuse-"));
  try {
    fs.writeFileSync(path.join(dir, "report.zip"), gh(["api", `repos/${repository}/actions/artifacts/${artifact.id}/zip`], {binary: true}));
    const json = spawnSync("unzip", ["-p", path.join(dir, "report.zip"), "proof-reuse-shadow.json"], {encoding: "utf8"});
    if (json.status !== 0) return null;
    const report = JSON.parse(json.stdout);
    return Array.isArray(report?.lanes) ? report : null;
  } catch {
    return null;
  } finally {
    fs.rmSync(dir, {recursive: true, force: true});
  }
}

function postMisses(repository, misses, date) {
  if (!misses.length) return "none";
  const issues = gh(["api", `repos/${repository}/issues?state=open&creator=github-actions%5Bbot%5D&per_page=100`])
    .filter((issue) => issue.title === MISS_TITLE && !issue.pull_request);
  const open = issues[0] ?? null;
  const texts = open ? [open.body, ...gh(["api", "--paginate", "--slurp", `repos/${repository}/issues/${open.number}/comments?per_page=100`])
    .flat().map((comment) => comment.body)] : [];
  const fresh = newMisses(misses, texts);
  if (!fresh.length) return "already_posted";
  const body = missBody(fresh, date);
  const post = (args) => spawnSync("gh", args, {input: body, encoding: "utf8"});
  const result = open ?
    post(["api", "-X", "POST", `repos/${repository}/issues/${open.number}/comments`, "-F", "body=@-"]) :
    post(["api", "-X", "POST", `repos/${repository}/issues`, "-f", `title=${MISS_TITLE}`, "-F", "body=@-"]);
  assert.equal(result.status, 0, result.stderr);
  return open ? "commented" : "opened";
}

function main(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 2) {
    assert.ok(["--date", "--out"].includes(argv[index]) && argv[index + 1], `Bad argument: ${argv[index]}`);
    args[argv[index].slice(2)] = argv[index + 1];
  }
  const date = args.date || yesterday();
  assert.match(date, DATE, "--date must be YYYY-MM-DD");
  assert.ok(args.out, "--out <dir> is required");
  const repository = process.env.GITHUB_REPOSITORY;
  assert.match(repository ?? "", /^[\w.-]+\/[\w.-]+$/u, "GITHUB_REPOSITORY is required");
  const runs = gh(["api", "--paginate", "--slurp",
    `repos/${repository}/actions/workflows/ci.yml/runs?event=merge_group&created=${date}T00:00:00Z..${date}T23:59:59Z&per_page=100`])
    .flatMap((page) => page.workflow_runs ?? []);
  const reports = new Map();
  const jobs = new Map();
  for (const run of runs) {
    const report = run.status === "completed" ? readReport(repository, run) : null;
    if (!report) continue;
    reports.set(Number(run.id), report);
    jobs.set(Number(run.id), gh(["api", "--paginate", "--slurp",
      `repos/${repository}/actions/runs/${run.id}/attempts/${run.run_attempt}/jobs?per_page=100`]).flatMap((page) => page.jobs ?? []));
  }
  const daily = buildDaily({date, repository, generatedAt: new Date().toISOString(),
    source: {workflowRunId: Number(process.env.GITHUB_RUN_ID) || null, sha: process.env.GITHUB_SHA ?? null}, runs, reports, jobs});
  fs.mkdirSync(args.out, {recursive: true});
  fs.writeFileSync(path.join(args.out, `proof-reuse-daily-${date}.json`), `${JSON.stringify(daily, null, 2)}\n`);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `date=${date}\n`);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summaryMarkdown(daily)}\n`);
  console.log(`Proof reuse daily ${date}: ${daily.runsWithVerdicts}/${daily.runs} runs with verdicts, ` +
    `${daily.totals.misses} miss(es), ${daily.totals.uncheckedMisses} unchecked; miss issue: ${postMisses(repository, daily.misses, date)}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
