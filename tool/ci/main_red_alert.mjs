#!/usr/bin/env node
// Makes a red main impossible to miss (owner decision, 12 Nov 2026: alert,
// no auto-revert). When main's CI (a push or the nightly) completes, this
// keeps one GitHub issue, "Main CI is red", in step with it: opened on the
// first failure, commented on each further failure, and closed with a comment
// on the next success. Opening an issue notifies repository watchers.
//
// On 12 Nov 2026 main stayed red for hours three times (brand literals from
// #1749, website lint suppressions, the cities route self-test) and nobody
// noticed until a PR tripped over it.
//
// Usage (Main CI alert workflow): GH_TOKEN, GITHUB_REPOSITORY, RUN_ID set.
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {REPORTING_LANES, REQUIRED_CI_JOB, laneOfJob} from "./required_ci_floor.mjs";

export const ISSUE_TITLE = "Main CI is red";
export const FLOOR_EXIT_TITLE = "Main CI green for 7 days: reporting lanes can block again";
const DAY = 24 * 60 * 60 * 1000;
export const FLOOR_EXIT_DAYS = 7;
const FAILED = new Set(["failure", "timed_out", "startup_failure", "action_required"]);
const FOOTER = "\n\n---\n_Posted by the Main CI alert workflow (tool/ci/main_red_alert.mjs)._";

/**
 * What to do for a completed main CI run. Pure, so every case is testable.
 *
 * @param {object} input
 * @param {{id:number, html_url:string, head_sha:string, conclusion:string, event:string, display_title?:string}} input.run
 * @param {Array<{name:string, conclusion:string|null, html_url?:string}>} input.jobs The run's jobs (latest attempt).
 * @param {{number:number}|null} input.openIssue The open alert issue, if any.
 * @param {Array<{id:number, event:string, conclusion:string|null, head_sha:string, created_at:string}>|null} [input.nightlies]
 *   Recent nightly runs, read only when a nightly failed; null if they could not be read.
 */
export function decideAlert({run, jobs, openIssue, nightlies = null}) {
  assert.match(String(run?.head_sha ?? ""), /^[0-9a-f]{40}$/u, "A main CI run names its commit");
  if (run.conclusion === "success") {
    return openIssue ?
      {action: "close", issue: openIssue.number,
        body: `Main CI is green again at ${run.head_sha.slice(0, 8)}: ${run.html_url}${FOOTER}`} :
      {action: "none"};
  }
  if (!FAILED.has(run.conclusion)) return {action: "none"};
  const failed = jobs.filter((job) => FAILED.has(job.conclusion));
  const gating = failed.filter((job) => job.name === REQUIRED_CI_JOB || !REPORTING_LANES.includes(laneOfJob(job.name)));
  const reporting = failed.filter((job) => !gating.includes(job));
  const line = (job) => `- ${job.html_url ? `[${job.name}](${job.html_url})` : job.name}`;
  const severity = gating.some((job) => job.name === REQUIRED_CI_JOB) ?
    "**Required CI failed**: PRs that select these lanes are blocked and no release can promote this commit." :
    "Required CI passed; only reporting lanes failed.";
  const body = [
    `Main CI (${run.event}) failed at ${run.head_sha.slice(0, 8)} (${run.display_title ?? "CI"}): ${run.html_url}`,
    ...(run.event === "schedule" ? [nightlyWindow({run, nightlies})] : []),
    "", severity,
    ...(gating.length ? ["", "Gating jobs:", ...gating.map(line)] : []),
    ...(reporting.length ? ["", "Reporting jobs:", ...reporting.map(line)] : []),
    ...(failed.length ? [] : ["", "No individual job failed; open the run for details."]),
    "", "Fix forward on main, then this issue closes itself on the next green main run.",
  ].join("\n") + FOOTER;
  return openIssue ? {action: "comment", issue: openIssue.number, body} : {action: "open", title: ISSUE_TITLE, body};
}

/**
 * Whether the sprint floor can end. Owner decision, 14 Nov 2026: the reporting
 * lanes (REPORTING_LANES) block merges again once main stays green for a week.
 * Green means every completed main push and nightly CI run concluded success,
 * reporting lanes included; cancelled and skipped runs neither break nor make
 * the streak. Pure, so every case is testable.
 *
 * @param {object} input
 * @param {Array<{created_at:string, conclusion:string|null, status:string, event:string}>} input.runs
 *   Main's push and nightly CI runs, reaching back at least FLOOR_EXIT_DAYS + 1 days.
 * @param {number} input.now Milliseconds since the epoch.
 * @param {{number:number}|null} input.openIssue The open floor-exit issue, if any.
 * @param {readonly string[]} [input.reportingLanes]
 */
export function decideFloorExit({runs, now, openIssue, reportingLanes = REPORTING_LANES}) {
  if (reportingLanes.length === 0 || openIssue) return {action: "none"};
  const since = now - FLOOR_EXIT_DAYS * DAY;
  const counted = runs.filter((run) => ["push", "schedule"].includes(run.event) && run.status === "completed" &&
    !["cancelled", "skipped", "neutral", null].includes(run.conclusion));
  // The history must reach past the window, or a red run just before it could hide.
  if (!counted.some((run) => Date.parse(run.created_at) < since)) return {action: "none", reason: "history_too_short"};
  const lastRed = counted.filter((run) => run.conclusion !== "success")
    .reduce((latest, run) => Math.max(latest, Date.parse(run.created_at)), -Infinity);
  if (lastRed >= since) return {action: "none", reason: "red_within_window"};
  const nightlies = counted.filter((run) => run.event === "schedule" && Date.parse(run.created_at) >= since).length;
  if (nightlies < FLOOR_EXIT_DAYS - 1) return {action: "none", reason: "too_few_nightlies"};
  const body = [
    `Every main push and nightly CI run for the last ${FLOOR_EXIT_DAYS} days succeeded, reporting lanes included ` +
      `(${nightlies} nightly runs). Owner decision, 14 Nov 2026: the reporting lanes now block merges again.`,
    "", `Reporting lanes: ${reportingLanes.map((lane) => `\`${lane}\``).join(", ")}.`,
    "", "To end the sprint floor, in one pull request:",
    "- add the lanes back to the `Required CI` job's `needs` in `.github/workflows/ci.yml` and empty its `$reporting` list;",
    "- empty `REPORTING_LANES` in `tool/ci/required_ci_floor.mjs` (the release gate then requires the whole run to succeed);",
    "- update the sprint floor paragraph in `docs/release_operations.md`.",
  ].join("\n") + FOOTER;
  return {action: "open", title: FLOOR_EXIT_TITLE, body};
}

/**
 * The commits a failed nightly covers: everything since the last green
 * nightly, as a compare link. "unknown" when the runs read hold no earlier
 * green nightly, rather than a guess.
 */
export function nightlyWindow({run, nightlies}) {
  const before = (candidate) => Date.parse(candidate.created_at) < Date.parse(run.created_at);
  const green = (nightlies ?? [])
    .filter((candidate) => candidate.event === "schedule" && candidate.conclusion === "success" &&
      candidate.id !== run.id && before(candidate) && /^[0-9a-f]{40}$/u.test(String(candidate.head_sha)))
    .sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at))[0];
  if (!green) return "Commits since the last green nightly: unknown (none in the runs read).";
  if (green.head_sha === run.head_sha) {
    return `Commits since the last green nightly: none; it passed at this same commit.`;
  }
  const repository = /^(https:\/\/github\.com\/[^/]+\/[^/]+)\/actions\//u.exec(run.html_url)?.[1];
  const range = `${green.head_sha.slice(0, 8)}..${run.head_sha.slice(0, 8)}`;
  return `Commits since the last green nightly: ${range}` +
    (repository ? ` (${repository}/compare/${green.head_sha}...${run.head_sha})` : "");
}

function gh(args, input) {
  const result = spawnSync("gh", args, {encoding: "utf8", input, maxBuffer: 32 * 1024 * 1024});
  assert.equal(result.status, 0, result.stderr || `gh ${args.join(" ")} failed`);
  return result.stdout;
}

function main() {
  const repository = process.env.GITHUB_REPOSITORY;
  const runId = process.env.RUN_ID;
  assert.match(repository ?? "", /^[\w.-]+\/[\w.-]+$/u, "GITHUB_REPOSITORY is required");
  assert.match(runId ?? "", /^[1-9][0-9]*$/u, "RUN_ID is required");
  const run = JSON.parse(gh(["api", `repos/${repository}/actions/runs/${runId}`]));
  const jobs = JSON.parse(gh(["api", "--paginate", "--slurp", `repos/${repository}/actions/runs/${runId}/jobs?per_page=100&filter=latest`]))
    .flatMap((page) => page.jobs ?? []);
  const issues = JSON.parse(gh(["api", `repos/${repository}/issues?state=open&creator=github-actions%5Bbot%5D&per_page=100`]));
  const openIssue = issues.find((issue) => issue.title === ISSUE_TITLE && !issue.pull_request) ?? null;
  let nightlies = null;
  if (run.event === "schedule" && FAILED.has(run.conclusion)) {
    try {
      nightlies = JSON.parse(gh(["api", `repos/${repository}/actions/workflows/ci.yml/runs?branch=main&event=schedule&per_page=30`]))
        .workflow_runs ?? null;
    } catch {
      nightlies = null; // The alert still posts; the window reads "unknown".
    }
  }
  const decision = decideAlert({run, jobs, openIssue, nightlies});
  if (decision.action === "open") {
    gh(["api", "-X", "POST", `repos/${repository}/issues`, "-f", `title=${decision.title}`, "-F", "body=@-"], decision.body);
  } else if (decision.action === "comment" || decision.action === "close") {
    gh(["api", "-X", "POST", `repos/${repository}/issues/${decision.issue}/comments`, "-F", "body=@-"], decision.body);
    if (decision.action === "close") {
      gh(["api", "-X", "PATCH", `repos/${repository}/issues/${decision.issue}`, "-f", "state=closed", "-f", "state_reason=completed"]);
    }
  }
  console.log(`Main CI alert: ${decision.action} (run ${runId}, ${run.conclusion})`);
  if (run.conclusion === "success") floorExit(repository, issues);
}

function floorExit(repository, issues) {
  const now = Date.now();
  const from = new Date(now - (FLOOR_EXIT_DAYS + 1) * DAY).toISOString().slice(0, 10);
  const runs = JSON.parse(gh(["api", "--paginate", "--slurp",
    `repos/${repository}/actions/workflows/ci.yml/runs?branch=main&created=%3E%3D${from}&per_page=100`]))
    .flatMap((page) => page.workflow_runs ?? []);
  const openIssue = issues.find((issue) => issue.title === FLOOR_EXIT_TITLE && !issue.pull_request) ?? null;
  const decision = decideFloorExit({runs, now, openIssue});
  if (decision.action === "open") {
    gh(["api", "-X", "POST", `repos/${repository}/issues`, "-f", `title=${decision.title}`, "-F", "body=@-"], decision.body);
  }
  console.log(`Sprint floor exit: ${decision.action}${decision.reason ? ` (${decision.reason})` : ""}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
