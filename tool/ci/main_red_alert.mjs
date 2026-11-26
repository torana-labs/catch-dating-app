#!/usr/bin/env node
// Makes a red main impossible to miss (owner decision, 12 Nov 2026: alert,
// no auto-revert). When main's CI (a push or the nightly) completes, this
// keeps one GitHub issue, "Main CI is red", in step with it: opened on the
// first failure, commented on each further failure, and closed with a comment
// on the next success that re-ran every job still owed. Opening an issue
// notifies repository watchers.
//
// On 12 Nov 2026 main stayed red for hours three times (brand literals from
// #1749, website lint suppressions, the cities route self-test) and nobody
// noticed until a PR tripped over it.
//
// Usage (Main CI alert workflow): GH_TOKEN, GITHUB_REPOSITORY, RUN_ID set.
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import {fileURLToPath} from "node:url";
import {REPORTING_LANES, REQUIRED_CI_JOB, laneOfJob} from "./required_ci_floor.mjs";
import {MOBILE_BLOCK_JOBS} from "./golden_policy.mjs";
import {isNightlyRun, nightlyRuns} from "./ci_nightly.mjs";
import {githubIssueApi, oldestOpen, openIssueOnce, settleToHead, sleepMs} from "../lib/github_issues.mjs";

export const ISSUE_TITLE = "Main CI is red";
export const FLOOR_EXIT_TITLE = "Main CI green for 7 days: reporting lanes can block again";
const DAY = 24 * 60 * 60 * 1000;
export const FLOOR_EXIT_DAYS = 7;
const FAILED = new Set(["failure", "timed_out", "startup_failure", "action_required"]);
const FOOTER = "\n\n---\n_Posted by the Main CI alert workflow (tool/ci/main_red_alert.mjs)._";
// Each alert post records the jobs main still owes a green run, so a green run
// that did not select them cannot close the issue (15 Nov 2026: #1929 closed on
// a run that skipped the failing Tools jobs).
const OWED_MARKER = /<!-- main-red-owed (\{.*?\}) -->/gu;

/** The owed-jobs record in the latest alert post among `texts` (issue body, then comments). */
export function owedFromIssue(texts) {
  let owed = null;
  for (const text of texts) {
    for (const match of String(text ?? "").matchAll(OWED_MARKER)) {
      try {
        const value = JSON.parse(match[1]);
        if (Array.isArray(value.jobs) && value.jobs.every((name) => typeof name === "string")) {
          owed = {jobs: value.jobs, pending: value.pending === true, unknown: value.unknown === true};
        }
      } catch {
        // A malformed record is ignored; an earlier valid one stands.
      }
    }
  }
  return owed;
}

const owedMarker = (jobs, {pending = false, unknown = false} = {}) =>
  `\n<!-- main-red-owed ${JSON.stringify({jobs: [...new Set(jobs)].sort(),
    ...(pending ? {pending} : {}), ...(unknown ? {unknown} : {})})} -->`;

/**
 * What to do for a completed main CI run. Pure, so every case is testable.
 *
 * @param {object} input
 * @param {{id:number, html_url:string, head_sha:string, conclusion:string, event:string, display_title?:string}} input.run
 * @param {Array<{name:string, conclusion:string|null, html_url?:string}>} input.jobs The run's jobs (latest attempt).
 * @param {{number:number}|null} input.openIssue The open alert issue, if any.
 * @param {Array<{id:number, event:string, conclusion:string|null, head_sha:string, created_at:string}>|null} [input.nightlies]
 *   Recent nightly runs, read only when a nightly failed; null if they could not be read.
 * @param {{jobs:string[], pending:boolean, unknown?:boolean}|null} [input.owed] The open issue's
 *   owed-jobs record (owedFromIssue); null when it has none, as an issue opened before the record
 *   existed. Without a record only a green nightly, which runs every lane, closes the issue.
 */
export function decideAlert({run, jobs, openIssue, nightlies = null, owed = null}) {
  assert.match(String(run?.head_sha ?? ""), /^[0-9a-f]{40}$/u, "A main CI run names its commit");
  const passed = new Set(jobs.filter((job) => job.conclusion === "success").map((job) => job.name));
  if (run.conclusion === "success") {
    if (!openIssue) return {action: "none"};
    const sha = run.head_sha.slice(0, 8);
    const known = owed && !owed.unknown;
    // A nightly selects every lane, so it settles every owed job.
    const missing = isNightlyRun(run) ? [] : known ? owed.jobs.filter((name) => !passed.has(name)) : null;
    if (missing?.length === 0) {
      return {action: "close", issue: openIssue.number, body: `Main CI is green again at ${sha}: ${run.html_url}${FOOTER}`};
    }
    // Still owed: say so once per change in what is owed, and leave the issue open.
    if (owed?.pending && (missing ? missing.length === owed.jobs.length : owed.unknown)) {
      return {action: "none", reason: "still_owed"};
    }
    const body = missing ?
      `Main CI is green at ${sha} (${run.html_url}), but ${missing.map((name) => `\`${name}\``).join(", ")} ` +
        `did not run, so this stays open until a main run passes ${missing.length === 1 ? "it" : "them"} or the nightly is green.` :
      `Main CI is green at ${sha} (${run.html_url}), but this issue does not record which jobs failed, ` +
        "so it stays open until the nightly, which runs every lane, is green.";
    return {action: "comment", issue: openIssue.number,
      body: body + owedMarker(missing ?? [], {pending: true, unknown: !missing}) + FOOTER};
  }
  if (!FAILED.has(run.conclusion)) return {action: "none"};
  const failed = jobs.filter((job) => FAILED.has(job.conclusion));
  // What main now owes: this run's failures plus earlier ones it did not pass.
  const owedNow = [...failed.map((job) => job.name), ...(owed?.jobs ?? []).filter((name) => !passed.has(name))];
  // An issue that never recorded its jobs stays unknown until a nightly settles it.
  const unknown = Boolean(openIssue && (!owed || owed.unknown));
  const gating = failed.filter((job) => job.name === REQUIRED_CI_JOB || !REPORTING_LANES.includes(laneOfJob(job.name)));
  const reporting = failed.filter((job) => !gating.includes(job));
  const line = (job) => `- ${job.html_url ? `[${job.name}](${job.html_url})` : job.name}`;
  const severity = gating.some((job) => job.name === REQUIRED_CI_JOB) ?
    "**Required CI failed**: PRs that select these lanes are blocked and no release can promote this commit." :
    "Required CI passed; only reporting lanes failed.";
  const body = [
    `Main CI (${isNightlyRun(run) ? "nightly" : run.event}) failed at ${run.head_sha.slice(0, 8)} (${run.display_title ?? "CI"}): ${run.html_url}`,
    ...(isNightlyRun(run) ? [nightlyWindow({run, nightlies})] : []),
    "", severity,
    ...(gating.length ? ["", "Gating jobs:", ...gating.map(line)] : []),
    ...(reporting.length ? ["", "Reporting jobs:", ...reporting.map(line)] : []),
    ...(failed.length ? [] : ["", "No individual job failed; open the run for details."]),
    "", "Fix forward on main, then this issue closes itself on the next green main run that runs these jobs " +
      "(or the next green nightly).",
  ].join("\n") + owedMarker(owedNow, {unknown}) + FOOTER;
  return openIssue ? {action: "comment", issue: openIssue.number, body} : {action: "open", title: ISSUE_TITLE, body};
}

/**
 * Whether failed jobs are only the macOS golden and capture jobs, with the
 * Required CI job that fails because of them. Owner decision, 22 Nov 2026:
 * those failures block mobile releases (tool/ci/golden_policy.mjs) but do not
 * restart the sprint floor's green week.
 */
export function onlyMobileBlockFailures(names) {
  const rest = names.filter((name) => name !== REQUIRED_CI_JOB);
  return rest.length > 0 && rest.every((name) => MOBILE_BLOCK_JOBS.includes(name));
}

/** The names of a run's failed jobs. */
export const failedJobNames = (jobs) => jobs.filter((job) => FAILED.has(job.conclusion)).map((job) => job.name);

/**
 * Whether the sprint floor can end. Owner decision, 14 Nov 2026: the reporting
 * lanes (REPORTING_LANES) block merges again once main stays green for a week.
 * Green means every completed main push and nightly CI run concluded success,
 * reporting lanes included; cancelled and skipped runs neither break nor make
 * the streak. A run whose only failures were the macOS golden and capture jobs
 * (onlyMobileBlockFailures) does not break it either (owner decision, 22 Nov
 * 2026). Pure, so every case is testable.
 *
 * @param {object} input
 * @param {Array<{created_at:string, conclusion:string|null, status:string, event:string}>} input.runs
 *   Main's push and nightly CI runs, reaching back at least FLOOR_EXIT_DAYS + 1 days.
 * @param {number} input.now Milliseconds since the epoch.
 * @param {{number:number}|null} input.openIssue The open floor-exit issue, if any.
 * @param {boolean} [input.alertOpen] Whether a "Main CI is red" issue is still open: main
 *   is not proven green while a failed job has not passed again.
 * @param {readonly string[]} [input.reportingLanes]
 * @param {ReadonlySet<number>} [input.mobileOnly] Ids of failed runs whose only failures were the
 *   macOS golden and capture jobs.
 */
export function decideFloorExit({runs, now, openIssue, alertOpen = false, reportingLanes = REPORTING_LANES,
  mobileOnly = new Set()}) {
  if (reportingLanes.length === 0 || openIssue) return {action: "none"};
  if (alertOpen) return {action: "none", reason: "alert_open"};
  const since = now - FLOOR_EXIT_DAYS * DAY;
  const counted = runs.filter((run) => (run.event === "push" || isNightlyRun(run)) && run.status === "completed" &&
    !["cancelled", "skipped", "neutral", null].includes(run.conclusion));
  // The history must reach past the window, or a red run just before it could hide.
  if (!counted.some((run) => Date.parse(run.created_at) < since)) return {action: "none", reason: "history_too_short"};
  const lastRed = counted.filter((run) => run.conclusion !== "success" && !mobileOnly.has(Number(run.id)))
    .reduce((latest, run) => Math.max(latest, Date.parse(run.created_at)), -Infinity);
  if (lastRed >= since) return {action: "none", reason: "red_within_window"};
  const nightlies = counted.filter((run) => isNightlyRun(run) && Date.parse(run.created_at) >= since).length;
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
    .filter((candidate) => isNightlyRun(candidate) && candidate.conclusion === "success" &&
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

// A main push run that a newer merge replaced never starts, and the run that
// replaced it can be for an earlier commit when GitHub creates a queue batch's
// runs out of order. The replaced commit is then validated only by the next
// main push or the nightly. Reported, never triggered (RE decision, 22 Nov 2026).
const UNCOVERED_MARKER = /<!-- main-push-uncovered ([0-9a-f]{40}) -->/gu;
const SHA = /^[0-9a-f]{40}$/u;
const HOUR = 60 * 60 * 1000;
// Runs for later commits can be created this long before an earlier commit's run.
const OUT_OF_ORDER_MS = 10 * 60 * 1000;
const ranOrWill = (run) => run.status !== "completed" || !["cancelled", "skipped"].includes(run.conclusion);

/** The commits already reported uncovered in an issue's texts (body, then comments). */
export function reportedUncovered(texts) {
  return new Set(texts.flatMap((text) => [...String(text ?? "").matchAll(UNCOVERED_MARKER)].map((match) => match[1])));
}

// A commit is reported at most this often across the open and recently closed
// alert issues: once, and once more if a green run of an earlier commit closed
// the issue before the commit was covered. Never a loop.
export const UNCOVERED_REPORT_LIMIT = 2;

/** How often each commit has been reported, across every issue's texts. */
export function uncoveredReportCounts(texts) {
  const counts = new Map();
  for (const text of texts) {
    for (const match of String(text ?? "").matchAll(UNCOVERED_MARKER)) counts.set(match[1], (counts.get(match[1]) ?? 0) + 1);
  }
  return counts;
}

/**
 * Commits whose main push run was cancelled (replaced while pending) and that
 * no run that ran, or is still to run, covers. Pure, so every case is testable.
 *
 * @param {object} input
 * @param {Array<object>} input.runs Recent CI runs for push events on main.
 * @param {number} input.now Milliseconds since the epoch.
 * @param {(descendant: string, sha: string) => boolean | null} input.contains
 *   Whether `descendant` is `sha` or a later commit on main; null when unknown.
 * @returns {{uncovered: Array<{sha:string, runId:number, html_url:string}>, unknown: string[]}}
 */
export function uncoveredCommits({runs, now, contains}) {
  const push = runs.filter((run) => run.event === "push" && run.head_branch === "main" &&
    run.path === ".github/workflows/ci.yml" && SHA.test(String(run.head_sha ?? "")));
  const uncovered = [];
  const unknown = [];
  const seen = new Set();
  // The nightly validates everything, so a replaced run older than a day is settled.
  const replaced = push.filter((run) => run.status === "completed" && run.conclusion === "cancelled" &&
    now - Date.parse(run.created_at) <= 26 * HOUR).sort((left, right) => Number(right.id) - Number(left.id));
  for (const run of replaced) {
    const sha = run.head_sha;
    if (seen.has(sha)) continue;
    seen.add(sha);
    if (push.some((other) => other.head_sha === sha && ranOrWill(other))) continue;
    const created = Date.parse(run.created_at);
    const candidates = push.filter((other) => other.head_sha !== sha && ranOrWill(other) &&
      Date.parse(other.created_at) >= created - OUT_OF_ORDER_MS);
    const answers = candidates.map((other) => contains(other.head_sha, sha));
    if (answers.includes(true)) continue;
    if (answers.includes(null)) unknown.push(sha);
    else uncovered.push({sha, runId: Number(run.id), html_url: run.html_url});
  }
  return {uncovered, unknown};
}

/**
 * Reports uncovered commits on the "Main CI is red" issue: opens it, or
 * comments on the open one: once per commit while the issue stays open, and at
 * most UNCOVERED_REPORT_LIMIT times overall (`counts`). Opening owes Required CI, so the
 * next green main push, whose run plans from the nearest earlier run that ran
 * and so covers the commit, closes it.
 */
export function decideUncovered({uncovered, openIssue, reported = new Set(), counts = new Map()}) {
  const fresh = uncovered.filter((commit) => !reported.has(commit.sha) &&
    (counts.get(commit.sha) ?? 0) < UNCOVERED_REPORT_LIMIT);
  if (!fresh.length) return {action: "none"};
  const lines = fresh.map((commit) => `- \`${commit.sha.slice(0, 8)}\`: its run ${commit.html_url} was replaced before it ran`);
  const body = [
    `Main CI has not validated ${fresh.length === 1 ? "this commit" : "these commits"}, and no later main push run covers ${fresh.length === 1 ? "it" : "them"}:`,
    ...lines,
    "", "The next push to main validates them (its run plans from the nearest earlier run that ran), as does the nightly. " +
      "Nothing was triggered automatically.",
  ].join("\n") + fresh.map((commit) => `\n<!-- main-push-uncovered ${commit.sha} -->`).join("");
  return openIssue ?
    {action: "comment", issue: openIssue.number, body: body + FOOTER} :
    {action: "open", title: ISSUE_TITLE, body: body + owedMarker([REQUIRED_CI_JOB]) + FOOTER};
}

/**
 * The run-name of the Main CI alert run that handles CI run `runId`. It is
 * also the durable record that the run was handled: the Scheduled run
 * watchdog follows up a CI nightly that has no such run.
 */
export const alertRunTitle = (runId) => `Main CI alert for run ${runId}`;

/**
 * The CI run a Main CI alert run handles, and whether it should. A
 * workflow_run wake handles its payload's run. A dispatch (the watchdog's
 * follow-up of a CI nightly, whose completion fires no workflow_run because
 * GITHUB_TOKEN dispatched it) names a run_id: that run is fetched and refused
 * unless it is a completed CI nightly of main in this repository. Either way,
 * a run an earlier alert run already handled successfully is not handled again.
 *
 * @param {object} input
 * @param {string} input.event GITHUB_EVENT_NAME of the alert run.
 * @param {object} [input.payloadRun] github.event.workflow_run, for a workflow_run wake.
 * @param {string} [input.inputRunId] inputs.run_id, for a dispatch.
 * @param {object} [input.fetchedRun] The dispatched run_id's run, as the runs API returns it.
 * @param {string} input.repository owner/name.
 * @param {Array<object>} input.alertRuns Recent Main CI alert runs.
 * @param {number} input.selfRunId This alert run's id.
 */
export function resolveAlertRun({event, payloadRun, inputRunId, fetchedRun, repository, alertRuns, selfRunId}) {
  let run;
  if (event === "workflow_run") {
    run = payloadRun;
  } else {
    assert.equal(event, "workflow_dispatch", `Unexpected event ${event}`);
    assert.match(String(inputRunId ?? ""), /^[1-9][0-9]*$/u, "run_id must be a CI run id");
    run = fetchedRun;
    assert.equal(String(run?.id), String(inputRunId), "The fetched run is not the requested run");
    const ours = run.repository?.full_name === repository && run.head_repository?.full_name === repository &&
      String(run.path ?? "").split("@")[0] === ".github/workflows/ci.yml";
    assert.ok(ours && run.head_branch === "main" && isNightlyRun(run),
      `Refused: run ${inputRunId} is not a CI nightly of main in ${repository}`);
    assert.equal(run.status, "completed", `Refused: run ${inputRunId} has not completed`);
  }
  assert.ok(Number.isSafeInteger(Number(run?.id)), "No CI run to handle");
  const handled = alertRuns.find((candidate) => Number(candidate.id) !== Number(selfRunId) &&
    candidate.display_title === alertRunTitle(run.id) && candidate.conclusion === "success");
  return {proceed: !handled, reason: handled ? `alert run ${handled.id} already handled run ${run.id}` : "",
    runId: String(run.id), event: run.event, nightly: isNightlyRun(run), conclusion: run.conclusion ?? "",
    headSha: run.head_sha ?? "", headBranch: run.head_branch ?? ""};
}

/** --resolve: writes resolveAlertRun's answer to GITHUB_OUTPUT for the workflow's jobs. */
function resolveMain() {
  const repository = process.env.GITHUB_REPOSITORY;
  assert.match(repository ?? "", /^[\w.-]+\/[\w.-]+$/u, "GITHUB_REPOSITORY is required");
  const event = process.env.GITHUB_EVENT_NAME;
  const payload = process.env.GITHUB_EVENT_PATH ? JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, "utf8")) : {};
  const inputRunId = process.env.INPUT_RUN_ID;
  const fetchedRun = event === "workflow_dispatch" && /^[1-9][0-9]*$/u.test(inputRunId ?? "") ?
    JSON.parse(gh(["api", `repos/${repository}/actions/runs/${inputRunId}`])) : null;
  const alertRuns = JSON.parse(gh(["api", `repos/${repository}/actions/workflows/main-red-alert.yml/runs?per_page=100`]))
    .workflow_runs ?? [];
  const target = resolveAlertRun({event, payloadRun: payload.workflow_run, inputRunId, fetchedRun, repository, alertRuns,
    selfRunId: Number(process.env.GITHUB_RUN_ID)});
  console.log(target.proceed ? `Handling run ${target.runId} (${target.event})` : `Skipping: ${target.reason}`);
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, [`proceed=${target.proceed}`, `run_id=${target.runId}`,
      `event=${target.event}`, `nightly=${target.nightly}`, `conclusion=${target.conclusion}`,
      `head_sha=${target.headSha}`, `head_branch=${target.headBranch}`].join("\n") + "\n");
  }
}

function gh(args, input) {
  const result = spawnSync("gh", args, {encoding: "utf8", input, maxBuffer: 32 * 1024 * 1024});
  assert.equal(result.status, 0, result.stderr || `gh ${args.join(" ")} failed`);
  return result.stdout;
}

/**
 * Applies a decision through the issue api. Opening goes through
 * openIssueOnce, so two alert runs opening at once leave one issue.
 */
export function applyDecision(api, decision) {
  if (decision.action === "open") return openIssueOnce(api, {title: decision.title, body: decision.body});
  if (decision.action === "comment" || decision.action === "close") {
    api.comment(decision.issue, decision.body);
    if (decision.action === "close") api.close(decision.issue, "completed");
  }
  return null;
}

/**
 * The head run's decision, applied by an older run once the head run's own
 * alert finished (settleToHead): only opening or closing, so the head run's
 * comments are never posted twice.
 */
export function settleDecision(decision, run) {
  if (decision.action !== "open" && decision.action !== "close") return {action: "none", reason: "head_unchanged"};
  return {...decision, body: `Settled to the latest main run (${run.html_url}) after a parallel alert run.\n\n${decision.body}`};
}

/** Reads what decideAlert needs for `run` and decides. */
function alertFor(repository, api, run) {
  const jobs = JSON.parse(gh(["api", "--paginate", "--slurp", `repos/${repository}/actions/runs/${run.id}/jobs?per_page=100&filter=latest`]))
    .flatMap((page) => page.jobs ?? []);
  const issues = api.listOpen();
  const openIssue = oldestOpen(issues, ISSUE_TITLE);
  const owed = openIssue ? owedFromIssue(api.texts(openIssue)) : null;
  let nightlies = null;
  if (isNightlyRun(run) && FAILED.has(run.conclusion)) {
    try {
      nightlies = nightlyRuns((endpoint) => JSON.parse(gh(["api", endpoint])), repository, "per_page=30");
    } catch {
      nightlies = null; // The alert still posts; the window reads "unknown".
    }
  }
  return {issues, openIssue, owed, decision: decideAlert({run, jobs, openIssue, nightlies, owed})};
}

/** Which CI runs the alert follows: main's push runs and the nightly. */
export const alertCounts = (run) => run.event === "push" || isNightlyRun(run);

function main() {
  const repository = process.env.GITHUB_REPOSITORY;
  const runId = process.env.RUN_ID;
  assert.match(repository ?? "", /^[\w.-]+\/[\w.-]+$/u, "GITHUB_REPOSITORY is required");
  assert.match(runId ?? "", /^[1-9][0-9]*$/u, "RUN_ID is required");
  const api = githubIssueApi(gh, repository);
  const run = JSON.parse(gh(["api", `repos/${repository}/actions/runs/${runId}`]));
  const {issues, openIssue, owed, decision} = alertFor(repository, api, run);
  const opened = applyDecision(api, decision);
  console.log(`Main CI alert: ${decision.action}${decision.reason ? ` (${decision.reason})` : ""} ` +
    `(run ${runId}, ${run.conclusion})${opened?.closed.length ? `, closed duplicate(s) ${opened.closed.join(", ")}` : ""}`);
  const settled = settleToHead({run, counts: alertCounts, alertTitle: alertRunTitle, sleep: () => sleepMs(15000),
    listRuns: () => JSON.parse(gh(["api", "-H", "Cache-Control: no-cache",
      `repos/${repository}/actions/workflows/ci.yml/runs?branch=main&status=completed&per_page=30`])).workflow_runs ?? [],
    listAlertRuns: () => JSON.parse(gh(["api", "-H", "Cache-Control: no-cache",
      `repos/${repository}/actions/workflows/main-red-alert.yml/runs?per_page=100`])).workflow_runs ?? [],
    settle: (head) => {
      const headAlert = settleDecision(alertFor(repository, api, head).decision, head);
      applyDecision(api, headAlert);
      console.log(`Main CI alert: settled to head run ${head.id}: ${headAlert.action}${headAlert.reason ? ` (${headAlert.reason})` : ""}`);
    }});
  console.log(`Main CI alert: head run ${settled.status}${settled.head ? ` (${settled.head})` : ""}`);
  // An alert that owes only the golden and capture jobs does not hold the floor.
  const owedAfter = (decision.body && owedFromIssue([decision.body])) || owed;
  const mobileOwed = Boolean(owedAfter && !owedAfter.unknown && onlyMobileBlockFailures(owedAfter.jobs));
  if (run.conclusion === "success") floorExit(repository, api, issues, Boolean(openIssue && decision.action !== "close" && !mobileOwed));
  if (run.event === "push") {
    try {
      uncoveredTip(repository, api);
    } catch (error) {
      console.log(`Uncovered main commits: not checked (${error.message.split("\n")[0]})`);
    }
  }
}

function uncoveredTip(repository, api) {
  const runs = JSON.parse(gh(["api", "-H", "Cache-Control: no-cache",
    `repos/${repository}/actions/workflows/ci.yml/runs?branch=main&event=push&per_page=100`])).workflow_runs ?? [];
  const memo = new Map();
  const contains = (descendant, sha) => {
    const key = `${sha}...${descendant}`;
    if (!memo.has(key)) {
      const result = spawnSync("gh", ["api", `repos/${repository}/compare/${key}`, "--jq", ".status"], {encoding: "utf8"});
      const status = result.status === 0 ? result.stdout.trim() : "";
      memo.set(key, ["ahead", "identical"].includes(status) ? true : ["behind", "diverged"].includes(status) ? false : null);
    }
    return memo.get(key);
  };
  const {uncovered, unknown} = uncoveredCommits({runs, now: Date.now(), contains});
  // Read the issue afresh: the alert above may have opened or closed it.
  const openIssue = oldestOpen(api.listOpen(), ISSUE_TITLE);
  const texts = (issue) => api.texts(issue);
  const reported = openIssue ? reportedUncovered(texts(openIssue)) : new Set();
  // Alert issues closed in the last 3 days, so a commit reported before an early close is counted.
  const since = new Date(Date.now() - 3 * 24 * HOUR).toISOString();
  const closed = JSON.parse(gh(["api",
    `repos/${repository}/issues?state=closed&creator=github-actions%5Bbot%5D&since=${since}&per_page=100`]))
    .filter((issue) => issue.title === ISSUE_TITLE && !issue.pull_request);
  const counts = uncoveredReportCounts([...(openIssue ? texts(openIssue) : []), ...closed.flatMap(texts)]);
  const decision = decideUncovered({uncovered, openIssue, reported, counts});
  applyDecision(api, decision);
  console.log(`Uncovered main commits: ${decision.action} (${uncovered.length} uncovered` +
    `${unknown.length ? `, ${unknown.length} unknown` : ""})`);
}

function floorExit(repository, api, issues, alertOpen) {
  const now = Date.now();
  const from = new Date(now - (FLOOR_EXIT_DAYS + 1) * DAY).toISOString().slice(0, 10);
  const runs = JSON.parse(gh(["api", "--paginate", "--slurp",
    `repos/${repository}/actions/workflows/ci.yml/runs?branch=main&created=%3E%3D${from}&per_page=100`]))
    .flatMap((page) => page.workflow_runs ?? []);
  const openIssue = oldestOpen(issues, FLOOR_EXIT_TITLE);
  // Read the jobs of failed runs in the window; a run that cannot be read still counts as red.
  const since = now - FLOOR_EXIT_DAYS * DAY;
  const mobileOnly = new Set();
  for (const run of runs) {
    if (!(run.event === "push" || isNightlyRun(run)) || run.status !== "completed" || !FAILED.has(run.conclusion) ||
      Date.parse(run.created_at) < since) continue;
    try {
      const jobs = JSON.parse(gh(["api", "--paginate", "--slurp",
        `repos/${repository}/actions/runs/${run.id}/jobs?per_page=100&filter=latest`])).flatMap((page) => page.jobs ?? []);
      if (onlyMobileBlockFailures(failedJobNames(jobs))) mobileOnly.add(Number(run.id));
    } catch {
      // Counted as red.
    }
  }
  const decision = decideFloorExit({runs, now, openIssue, alertOpen, mobileOnly});
  if (decision.action === "open") applyDecision(api, decision);
  console.log(`Sprint floor exit: ${decision.action}${decision.reason ? ` (${decision.reason})` : ""}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.includes("--resolve")) resolveMain();
  else main();
}
