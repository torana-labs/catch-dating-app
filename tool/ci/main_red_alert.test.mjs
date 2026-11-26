import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {FLOOR_EXIT_TITLE, ISSUE_TITLE, alertCounts, alertRunTitle, applyDecision, decideAlert, settleDecision, decideFloorExit, decideUncovered, failedJobNames, nightlyWindow, resolveAlertRun,
  onlyMobileBlockFailures, owedFromIssue, reportedUncovered, uncoveredCommits, uncoveredReportCounts}
  from "./main_red_alert.mjs";
import {CAPTURE_JOB, GOLDENS_JOB} from "./golden_policy.mjs";
import {fakeIssueApi, oldestOpen, openIssueOnce, settleToHead} from "../lib/github_issues.mjs";

const run = (conclusion, extra = {}) => ({id: 7, html_url: "https://example.test/run/7", head_sha: "a".repeat(40),
  conclusion, event: "push", display_title: "CI", ...extra});
const job = (name, conclusion) => ({name, conclusion, html_url: `https://example.test/job/${encodeURIComponent(name)}`});

test("the first failure opens one alert issue naming gating and reporting jobs", () => {
  const decision = decideAlert({run: run("failure"), openIssue: null, jobs: [
    job("admin / Validate admin website", "failure"), job("Required CI", "failure"),
    job("tools / Tool checks (marketing-design)", "failure"), job("flutter / Analyze & test", "success")]});
  assert.equal(decision.action, "open");
  assert.equal(decision.title, ISSUE_TITLE);
  assert.match(decision.body, /\*\*Required CI failed\*\*/u);
  assert.match(decision.body, /Gating jobs:\n- \[admin \/ Validate admin website\]/u);
  assert.match(decision.body, /Reporting jobs:\n- \[tools \/ Tool checks \(marketing-design\)\]/u);
  assert.doesNotMatch(decision.body, /Analyze & test/u);
});

test("a reporting-only failure still alerts, and says Required CI passed", () => {
  const decision = decideAlert({run: run("failure"), openIssue: null, jobs: [
    job("tools / Tool checks (core-audit)", "failure"), job("Required CI", "success")]});
  assert.equal(decision.action, "open");
  assert.match(decision.body, /Required CI passed; only reporting lanes failed/u);
  assert.doesNotMatch(decision.body, /Gating jobs/u);
});

test("further failures comment on the open issue instead of opening another", () => {
  const decision = decideAlert({run: run("timed_out"), openIssue: {number: 12}, jobs: []});
  assert.deepEqual([decision.action, decision.issue], ["comment", 12]);
  assert.match(decision.body, /No individual job failed/u);
});

// The issue as main_red_alert.mjs would read it back after the given posts.
const owedAfter = (...decisions) => owedFromIssue(decisions.map((decision) => decision.body));
const lint = "tools / Tool checks (lint-scanners)";

test("a green run that ran every failed job closes the issue; green with no issue does nothing", () => {
  const opened = decideAlert({run: run("failure"), openIssue: null, jobs: [job(lint, "failure"), job("Required CI", "success")]});
  assert.deepEqual(owedAfter(opened), {jobs: [lint], pending: false, unknown: false});
  const decision = decideAlert({run: run("success"), openIssue: {number: 12}, owed: owedAfter(opened),
    jobs: [job(lint, "success"), job("Required CI", "success")]});
  assert.deepEqual([decision.action, decision.issue], ["close", 12]);
  assert.match(decision.body, /green again at aaaaaaaa/u);
  assert.deepEqual(decideAlert({run: run("success"), openIssue: null, jobs: []}), {action: "none"});
});

test("a green run that skipped the failed jobs comments once and leaves the issue open", () => {
  const opened = decideAlert({run: run("failure"), openIssue: null, jobs: [job(lint, "failure"), job("Required CI", "failure")]});
  const skipped = [job(lint, "skipped"), job("Required CI", "success")];
  const first = decideAlert({run: run("success"), openIssue: {number: 12}, owed: owedAfter(opened), jobs: skipped});
  assert.deepEqual([first.action, first.issue], ["comment", 12]);
  assert.match(first.body, /green at aaaaaaaa .*, but `tools \/ Tool checks \(lint-scanners\)` did not run/u);
  // Another green run that skips them again says nothing new.
  assert.deepEqual(decideAlert({run: run("success"), openIssue: {number: 12}, owed: owedAfter(opened, first), jobs: skipped}),
    {action: "none", reason: "still_owed"});
  // A later run that passes them closes it.
  assert.equal(decideAlert({run: run("success"), openIssue: {number: 12}, owed: owedAfter(opened, first),
    jobs: [job(lint, "success")]}).action, "close");
});

test("a green nightly closes the issue even when the failed jobs are not listed", () => {
  const opened = decideAlert({run: run("failure"), openIssue: null, jobs: [job(lint, "failure")]});
  const decision = decideAlert({run: run("success", {event: "schedule"}), openIssue: {number: 12}, owed: owedAfter(opened),
    jobs: [job("Required CI", "success")]});
  assert.equal(decision.action, "close");
});

test("a further failure keeps owing earlier failed jobs it did not pass", () => {
  const opened = decideAlert({run: run("failure"), openIssue: null, jobs: [job(lint, "failure")]});
  const again = decideAlert({run: run("failure"), openIssue: {number: 12}, owed: owedAfter(opened),
    jobs: [job(lint, "skipped"), job("flutter / Analyze & test", "failure")]});
  assert.deepEqual(owedAfter(opened, again).jobs, ["flutter / Analyze & test", lint]);
  // One that passes the earlier job drops it.
  const fixed = decideAlert({run: run("failure"), openIssue: {number: 12}, owed: owedAfter(opened, again),
    jobs: [job(lint, "success"), job("flutter / Analyze & test", "failure")]});
  assert.deepEqual(owedAfter(opened, again, fixed).jobs, ["flutter / Analyze & test"]);
});

test("an issue with no record of its failed jobs waits for a green nightly", () => {
  const first = decideAlert({run: run("success"), openIssue: {number: 12}, owed: null, jobs: [job("Required CI", "success")]});
  assert.equal(first.action, "comment");
  assert.match(first.body, /does not record which jobs failed/u);
  assert.deepEqual(decideAlert({run: run("success"), openIssue: {number: 12}, owed: owedAfter(first), jobs: []}),
    {action: "none", reason: "still_owed"});
  // A failure keeps it unknown rather than trusting a partial list.
  const failed = decideAlert({run: run("failure"), openIssue: {number: 12}, owed: owedAfter(first), jobs: [job(lint, "failure")]});
  assert.equal(owedAfter(first, failed).unknown, true);
  assert.equal(decideAlert({run: run("success"), openIssue: {number: 12}, owed: owedAfter(first, failed),
    jobs: [job(lint, "success")]}).action, "comment");
  assert.equal(decideAlert({run: run("success", {event: "schedule"}), openIssue: {number: 12}, owed: owedAfter(first),
    jobs: []}).action, "close");
});

test("the owed-jobs record reads the latest valid post and ignores malformed ones", () => {
  assert.equal(owedFromIssue([null, "no record here"]), null);
  assert.deepEqual(owedFromIssue(['<!-- main-red-owed {"jobs":["a"]} -->', "<!-- main-red-owed {not json} -->",
    '<!-- main-red-owed {"jobs":[1]} -->']), {jobs: ["a"], pending: false, unknown: false});
  assert.deepEqual(owedFromIssue(['<!-- main-red-owed {"jobs":["a"]} -->', '<!-- main-red-owed {"jobs":["b"],"pending":true} -->']),
    {jobs: ["b"], pending: true, unknown: false});
});

test("cancelled, skipped and neutral runs never change the alert", () => {
  for (const conclusion of ["cancelled", "skipped", "neutral", null]) {
    assert.deepEqual(decideAlert({run: run(conclusion), openIssue: {number: 3}, jobs: []}), {action: "none"}, String(conclusion));
  }
  assert.throws(() => decideAlert({run: run("failure", {head_sha: "main"}), openIssue: null, jobs: []}), /names its commit/u);
});

test("a failed nightly names the commits since the last green nightly", () => {
  const nightly = (id, conclusion, sha, day) => ({id, event: "schedule", conclusion, head_sha: sha.repeat(40),
    created_at: `2026-11-${day}T02:23:00Z`});
  const failed = run("failure", {id: 9, event: "schedule", head_sha: "c".repeat(40), created_at: "2026-11-15T02:23:00Z",
    html_url: "https://github.com/owner/repo/actions/runs/9"});
  const nightlies = [nightly(9, "failure", "c", 15), nightly(8, "failure", "b", 14), nightly(6, "success", "a", 13),
    nightly(5, "success", "9", 12), {...nightly(4, "success", "8", 14), event: "push"}];
  const decision = decideAlert({run: failed, openIssue: null, jobs: [job("app-builds / iOS host simulator build", "failure")],
    nightlies});
  assert.match(decision.body, new RegExp(`Commits since the last green nightly: aaaaaaaa\\.\\.cccccccc ` +
    `\\(https://github\\.com/owner/repo/compare/${"a".repeat(40)}\\.\\.\\.${"c".repeat(40)}\\)`, "u"));
  assert.match(decision.body, /iOS host simulator build/u);
  // No earlier green nightly, or the runs could not be read: say so, never guess.
  assert.equal(nightlyWindow({run: failed, nightlies: [nightly(8, "failure", "b", 14)]}),
    "Commits since the last green nightly: unknown (none in the runs read).");
  assert.equal(nightlyWindow({run: failed, nightlies: null}),
    "Commits since the last green nightly: unknown (none in the runs read).");
  // A later green nightly or one at the same commit is not the window's start.
  assert.match(nightlyWindow({run: failed, nightlies: [nightly(10, "success", "d", 16), nightly(6, "success", "a", 13)]}),
    /aaaaaaaa\.\.cccccccc/u);
  assert.equal(nightlyWindow({run: failed, nightlies: [nightly(6, "success", "c", 13)]}),
    "Commits since the last green nightly: none; it passed at this same commit.");
  // Push failures keep their existing body.
  assert.doesNotMatch(decideAlert({run: run("failure"), openIssue: null, jobs: [], nightlies}).body, /last green nightly/u);
});

test("the dispatched nightly is the nightly: it settles owed jobs, names its window and counts for the floor exit", () => {
  const dispatched = (extra = {}) => ({event: "workflow_dispatch", display_title: "CI nightly", ...extra});
  const opened = decideAlert({run: run("failure"), openIssue: null, jobs: [job(lint, "failure")]});
  // A green dispatched nightly closes the issue like a scheduled one did; a full dispatch by hand does not.
  assert.equal(decideAlert({run: run("success", dispatched()), openIssue: {number: 12}, owed: owedAfter(opened),
    jobs: [job("Required CI", "success")]}).action, "close");
  assert.notEqual(decideAlert({run: run("success", {event: "workflow_dispatch", display_title: "CI"}), openIssue: {number: 12},
    owed: owedAfter(opened), jobs: [job("Required CI", "success")]}).action, "close");
  // A failed dispatched nightly's window starts at the last green nightly, scheduled or dispatched.
  const failed = run("failure", dispatched({id: 9, head_sha: "c".repeat(40), created_at: "2026-11-27T02:40:00Z",
    html_url: "https://github.com/owner/repo/actions/runs/9"}));
  const decision = decideAlert({run: failed, openIssue: null, jobs: [job(lint, "failure")], nightlies: [
    {id: 7, event: "workflow_dispatch", display_title: "CI", conclusion: "success", head_sha: "b".repeat(40), created_at: "2026-11-26T12:00:00Z"},
    {id: 6, ...dispatched(), conclusion: "success", head_sha: "a".repeat(40), created_at: "2026-11-26T02:40:00Z"},
    {id: 5, event: "schedule", conclusion: "success", head_sha: "9".repeat(40), created_at: "2026-11-25T09:00:00Z"}]});
  assert.match(decision.body, /^Main CI \(nightly\) failed at cccccccc/u);
  assert.match(decision.body, /Commits since the last green nightly: aaaaaaaa\.\.cccccccc/u);
  // Seven green days where the nightlies switch from scheduled to dispatched still count as seven nightlies.
  const mixed = greenWeek().map((entry, index) => index < 6 && entry.event === "schedule" ?
    {...entry, event: "workflow_dispatch", display_title: "CI nightly"} : entry);
  assert.equal(decideFloorExit({runs: mixed, now: NOW, openIssue: null}).action, "open");
  const notNightly = greenWeek().map((entry) => entry.event === "schedule" ? {...entry, event: "workflow_dispatch", display_title: "CI"} : entry);
  assert.equal(decideFloorExit({runs: notNightly, now: NOW, openIssue: null}).reason, "too_few_nightlies");
});

test("resolveAlertRun: a workflow_run wake handles its run; a dispatch only a completed CI nightly of main, once", () => {
  const repository = "owner/repo";
  const ciRun = (extra = {}) => ({id: 45809418054, event: "workflow_dispatch", display_title: "CI nightly", status: "completed",
    conclusion: "success", head_branch: "main", head_sha: "a".repeat(40), path: ".github/workflows/ci.yml@refs/heads/main",
    repository: {full_name: repository}, head_repository: {full_name: repository}, ...extra});
  const dispatched = (fetchedRun, extra = {}) => resolveAlertRun({event: "workflow_dispatch", inputRunId: String(fetchedRun.id),
    fetchedRun, repository, alertRuns: [], selfRunId: 900, ...extra});
  // The watchdog's follow-up of a completed CI nightly with no record: handled.
  assert.deepEqual(dispatched(ciRun()), {proceed: true, reason: "", runId: "45809418054", event: "workflow_dispatch",
    nightly: true, conclusion: "success", headSha: "a".repeat(40), headBranch: "main"});
  // Already recorded by an earlier successful alert run (the workflow_run path, or a second dispatch): skipped.
  const recorded = [{id: 800, display_title: "Main CI alert for run 45809418054", conclusion: "success"}];
  assert.deepEqual([dispatched(ciRun(), {alertRuns: recorded}).proceed, dispatched(ciRun(), {alertRuns: recorded}).reason],
    [false, "alert run 800 already handled run 45809418054"]);
  // Its own run, or an earlier one that failed, does not count: a retry is handled.
  assert.equal(dispatched(ciRun(), {alertRuns: [{...recorded[0], id: 900}, {...recorded[0], id: 801, conclusion: "failure"}]}).proceed, true);
  // Refused: not a nightly, not ours, not main, still running, or a mismatched or malformed id.
  for (const [label, run] of [["a push run", ciRun({event: "push", display_title: "CI"})], ["a full dispatch", ciRun({display_title: "CI"})],
    ["another workflow", ciRun({path: ".github/workflows/deploy.yml@refs/heads/main"})],
    ["a fork", ciRun({head_repository: {full_name: "someone/fork"}})], ["another branch", ciRun({head_branch: "feature"})]]) {
    assert.throws(() => dispatched(run), /Refused: run 45809418054 is not a CI nightly of main/u, label);
  }
  assert.throws(() => dispatched(ciRun({status: "in_progress", conclusion: null})), /Refused: run 45809418054 has not completed/u);
  assert.throws(() => dispatched(ciRun(), {inputRunId: "45809418055"}), /not the requested run/u);
  assert.throws(() => dispatched(ciRun(), {inputRunId: "12; rm -rf"}), /run_id must be a CI run id/u);
  // A workflow_run wake handles its payload's run, push or nightly, with the same record check.
  const push = ciRun({id: 7, event: "push", display_title: "CI"});
  assert.deepEqual(resolveAlertRun({event: "workflow_run", payloadRun: push, repository, alertRuns: [], selfRunId: 901}).event, "push");
  assert.equal(resolveAlertRun({event: "workflow_run", payloadRun: ciRun(), repository, alertRuns: recorded, selfRunId: 901}).proceed, false);
  assert.throws(() => resolveAlertRun({event: "schedule", repository, alertRuns: []}), /Unexpected event schedule/u);
});

test("the workflow listens only to main's push and nightly CI and can only write issues", () => {
  const workflow = fs.readFileSync(new URL("../../.github/workflows/main-red-alert.yml", import.meta.url), "utf8");
  assert.match(workflow, /workflow_run:\n\s+workflows: \[CI\]\n\s+types: \[completed\]\n\s+branches: \[main\]/u);
  assert.match(workflow, /^permissions: \{\}$/mu);
  // A dispatch names the CI nightly to handle (the Scheduled run watchdog's
  // follow-up, 26 Nov 2026); the run-name records which CI run each alert run handled.
  assert.match(workflow, /^run-name: Main CI alert for run \$\{\{ inputs\.run_id \|\| github\.event\.workflow_run\.id \}\}$/mu);
  assert.match(workflow, /workflow_dispatch:\n\s+inputs:\n\s+run_id:\n(?:\s+.*\n){1,2}\s+required: true\n\s+type: string\n/u);
  assert.equal(alertRunTitle(45809418054), "Main CI alert for run 45809418054");
  // The resolve job reads the run (refusing a bad dispatch) and every job acts on its answer.
  const resolve = workflow.slice(workflow.indexOf("\n  resolve:\n"), workflow.indexOf("\n  alert:\n"));
  assert.match(resolve, /github\.event_name == 'workflow_dispatch' \|\| \(\n\s+github\.event\.workflow_run\.head_branch == 'main' &&\n\s+github\.event\.workflow_run\.head_repository\.full_name == github\.repository\)/u);
  assert.match(resolve, /permissions:\n {6}actions: read\n {6}contents: read\n/u);
  assert.match(resolve, /INPUT_RUN_ID: \$\{\{ inputs\.run_id \}\}\n\s+run: node tool\/ci\/main_red_alert\.mjs --resolve\n/u);
  const handles = "needs.resolve.outputs.proceed == 'true' && needs.resolve.outputs.head_branch == 'main'";
  assert.equal(workflow.split(`if: \${{ ${handles} && (needs.resolve.outputs.event == 'push' || needs.resolve.outputs.nightly == 'true')`).length - 1, 2);
  assert.equal(workflow.split(`if: \${{ ${handles} && needs.resolve.outputs.nightly == 'true' &&`).length - 1, 2);
  assert.equal(workflow.split("    needs: resolve\n").length - 1, 4);
  assert.doesNotMatch(workflow.slice(workflow.indexOf("\n  alert:\n")), /github\.event\.workflow_run\./u);
  assert.match(workflow, /issues: write/u);
  assert.doesNotMatch(workflow, /contents: write|pull-requests: write/u);
  assert.equal(workflow.split("RUN_ID: ${{ needs.resolve.outputs.run_id }}").length - 1, 3);
  assert.match(workflow, /node tool\/ci\/main_red_alert\.mjs/u);
  // Only the golden-policy job may dispatch, and only the dispatch-only baseline workflows.
  const jobs = workflow.split(/\n  (?=[a-z-]+:\n)/u).slice(1);
  const policy = jobs.find((block) => block.startsWith("golden-policy:"));
  assert.ok(policy, "golden-policy job");
  assert.match(policy, /permissions:\n {6}actions: write\n {6}contents: read\n {6}issues: write\n/u);
  assert.match(policy, /run: node tool\/ci\/golden_policy\.mjs/u);
  for (const block of jobs.filter((entry) => !entry.startsWith("golden-policy:"))) {
    assert.doesNotMatch(block, /actions: write/u, block.split(":")[0]);
  }
});

const NOW = Date.parse("2026-11-30T12:00:00Z");
const daysAgo = (days) => new Date(NOW - days * 24 * 60 * 60 * 1000).toISOString();
const ciRun = (days, conclusion = "success", event = "schedule") =>
  ({created_at: daysAgo(days), status: "completed", conclusion, event});
// Eight nightlies (one a day, 0.5 to 7.5 days ago) plus a push a day.
const greenWeek = () => [...Array(8).keys()].flatMap((day) => [ciRun(day + 0.5), ciRun(day + 0.25, "success", "push")]);

test("seven fully green days open one floor-exit issue with the restore steps", () => {
  const decision = decideFloorExit({runs: greenWeek(), now: NOW, openIssue: null});
  assert.equal(decision.action, "open");
  assert.equal(decision.title, FLOOR_EXIT_TITLE);
  assert.match(decision.body, /`app-builds`, `docs-policy`, `operations`, `tools`/u);
  assert.match(decision.body, /REPORTING_LANES/u);
  assert.match(decision.body, /Required CI/u);
  assert.deepEqual(decideFloorExit({runs: greenWeek(), now: NOW, openIssue: {number: 9}}), {action: "none"});
  // Not while a "Main CI is red" issue is still owed a run.
  assert.deepEqual(decideFloorExit({runs: greenWeek(), now: NOW, openIssue: null, alertOpen: true}),
    {action: "none", reason: "alert_open"});
});

test("a red run inside the week, reporting lanes included, keeps the floor", () => {
  for (const conclusion of ["failure", "timed_out", "startup_failure"]) {
    const decision = decideFloorExit({runs: [...greenWeek(), ciRun(6.9, conclusion, "push")], now: NOW, openIssue: null});
    assert.deepEqual(decision, {action: "none", reason: "red_within_window"}, conclusion);
  }
  // A red run just outside the week no longer counts.
  assert.equal(decideFloorExit({runs: [...greenWeek(), ciRun(7.1, "failure")], now: NOW, openIssue: null}).action, "open");
});

test("a run whose only failures were the macOS golden and capture jobs does not restart the green week", () => {
  // Owner decision, 22 Nov 2026: they block mobile releases instead (golden_policy.mjs).
  const red = {...ciRun(2, "failure", "push"), id: 41};
  assert.equal(decideFloorExit({runs: [...greenWeek(), red], now: NOW, openIssue: null, mobileOnly: new Set([41])}).action, "open");
  // Control: the same run with any other failure still restarts it.
  assert.deepEqual(decideFloorExit({runs: [...greenWeek(), red], now: NOW, openIssue: null, mobileOnly: new Set([42])}),
    {action: "none", reason: "red_within_window"});
  const failed = (...jobs) => failedJobNames(jobs);
  assert.equal(onlyMobileBlockFailures(failed(job(GOLDENS_JOB, "failure"), job("Required CI", "failure"),
    job("flutter / Analyze & test", "success"))), true, "Required CI fails because of them");
  assert.equal(onlyMobileBlockFailures(failed(job(CAPTURE_JOB, "timed_out"), job(GOLDENS_JOB, "failure"))), true);
  assert.equal(onlyMobileBlockFailures(failed(job(GOLDENS_JOB, "failure"), job(lint, "failure"))), false,
    "another failure restarts the week");
  assert.equal(onlyMobileBlockFailures(failed(job("Required CI", "failure"))), false, "Required CI alone");
  assert.equal(onlyMobileBlockFailures(failed(job(GOLDENS_JOB, "success"))), false, "nothing failed");
});

test("cancelled runs, other events, short history and missing nightlies never end the floor", () => {
  const runs = [...greenWeek(), ciRun(1, "cancelled", "push"), ciRun(2, "failure", "pull_request"),
    {...ciRun(3, null, "push"), status: "in_progress"}];
  assert.equal(decideFloorExit({runs, now: NOW, openIssue: null}).action, "open");
  assert.deepEqual(decideFloorExit({runs: greenWeek().filter((run) => Date.parse(run.created_at) > NOW - 7 * 864e5),
    now: NOW, openIssue: null}), {action: "none", reason: "history_too_short"});
  assert.deepEqual(decideFloorExit({runs: greenWeek().filter((run) => run.event === "push" ||
    Date.parse(run.created_at) < NOW - 5 * 864e5), now: NOW, openIssue: null}), {action: "none", reason: "too_few_nightlies"});
  assert.deepEqual(decideFloorExit({runs: greenWeek(), now: NOW, openIssue: null, reportingLanes: []}), {action: "none"});
});

// Uncovered main commits: a replaced push run that no other run covers.
const GAP_NOW = Date.parse("2026-11-22T16:00:00Z");
const at = (minutes) => new Date(GAP_NOW - minutes * 60 * 1000).toISOString();
const pushRun = (id, digit, status, conclusion, minutesAgo) => ({id, head_sha: digit.repeat(40), status, conclusion,
  event: "push", head_branch: "main", path: ".github/workflows/ci.yml", created_at: at(minutesAgo),
  html_url: `https://example.test/run/${id}`});
// Main's history is A < H < D < E.
const order = ["a", "h", "d", "e"].map((digit) => digit.repeat(40));
const linear = (descendant, sha) => order.indexOf(sha) <= order.indexOf(descendant);

test("a later commit's pending run replaced by an earlier commit's run leaves that commit uncovered", () => {
  // D's run was pending; H's run, created after it, replaced it and ran.
  const runs = [pushRun(10, "a", "completed", "success", 60), pushRun(20, "d", "completed", "cancelled", 30),
    pushRun(21, "h", "completed", "success", 29)];
  assert.deepEqual(uncoveredCommits({runs, now: GAP_NOW, contains: linear}),
    {uncovered: [{sha: "d".repeat(40), runId: 20, html_url: "https://example.test/run/20"}], unknown: []});
});

test("a replaced run is covered by any later commit's run that ran or is still to run", () => {
  for (const [status, conclusion] of [["completed", "success"], ["completed", "failure"], ["in_progress", null], ["queued", null]]) {
    const runs = [pushRun(20, "d", "completed", "cancelled", 30), pushRun(21, "h", "completed", "success", 29),
      pushRun(22, "e", status, conclusion, 5)];
    assert.deepEqual(uncoveredCommits({runs, now: GAP_NOW, contains: linear}).uncovered, [], `${status} ${conclusion}`);
  }
  // A later commit's run that was itself replaced covers nothing.
  const runs = [pushRun(20, "d", "completed", "cancelled", 30), pushRun(22, "e", "completed", "cancelled", 5),
    pushRun(23, "h", "completed", "success", 4)];
  assert.deepEqual(uncoveredCommits({runs, now: GAP_NOW, contains: linear}).uncovered.map((commit) => commit.runId), [22, 20]);
});

test("an ordinary replaced intermediate run is covered; out-of-order creation within ten minutes still counts", () => {
  // E's run was created two minutes before D's replaced one and ran.
  const runs = [pushRun(20, "e", "completed", "success", 32), pushRun(21, "d", "completed", "cancelled", 30)];
  assert.deepEqual(uncoveredCommits({runs, now: GAP_NOW, contains: linear}).uncovered, []);
});

test("unknown ancestry is not reported as uncovered; runs older than the nightly window are settled", () => {
  const runs = [pushRun(20, "d", "completed", "cancelled", 30), pushRun(21, "e", "completed", "success", 20)];
  assert.deepEqual(uncoveredCommits({runs, now: GAP_NOW, contains: () => null}), {uncovered: [], unknown: ["d".repeat(40)]});
  assert.deepEqual(uncoveredCommits({runs: [pushRun(20, "d", "completed", "cancelled", 27 * 60)], now: GAP_NOW, contains: linear}),
    {uncovered: [], unknown: []});
});

test("an uncovered commit opens the red issue owing Required CI, or comments once on the open one", () => {
  const uncovered = [{sha: "d".repeat(40), runId: 20, html_url: "https://example.test/run/20"}];
  const opened = decideUncovered({uncovered, openIssue: null});
  assert.equal(opened.action, "open");
  assert.equal(opened.title, ISSUE_TITLE);
  assert.match(opened.body, /`dddddddd`: its run https:\/\/example\.test\/run\/20 was replaced before it ran/u);
  assert.match(opened.body, /Nothing was triggered automatically/u);
  // The next green main push passes Required CI and closes it.
  assert.deepEqual(owedFromIssue([opened.body]), {jobs: ["Required CI"], pending: false, unknown: false});
  assert.equal(decideAlert({run: run("success"), openIssue: {number: 3}, owed: owedFromIssue([opened.body]),
    jobs: [job("Required CI", "success")]}).action, "close");
  // Once reported, the same commit is not reported again.
  assert.deepEqual(decideUncovered({uncovered, openIssue: {number: 3}, reported: reportedUncovered([opened.body])}),
    {action: "none"});
  const comment = decideUncovered({uncovered, openIssue: {number: 9}});
  assert.deepEqual([comment.action, comment.issue], ["comment", 9]);
  assert.equal(owedFromIssue([comment.body]), null, "a comment leaves the issue's owed jobs as they were");
  assert.deepEqual(decideUncovered({uncovered: [], openIssue: null}), {action: "none"});
});

test("a commit reported before an early close is reported once more at most, never in a loop", () => {
  const uncovered = [{sha: "d".repeat(40), runId: 20, html_url: "https://example.test/run/20"}];
  const first = decideUncovered({uncovered, openIssue: null});
  // A green run of an earlier commit closed the issue before the commit was covered.
  const again = decideUncovered({uncovered, openIssue: null, counts: uncoveredReportCounts([first.body])});
  assert.equal(again.action, "open");
  // Closed a second time the same way: the commit has had its two reports.
  assert.deepEqual(decideUncovered({uncovered, openIssue: null, counts: uncoveredReportCounts([first.body, again.body])}),
    {action: "none"});
  assert.deepEqual(decideUncovered({uncovered, openIssue: {number: 4},
    counts: uncoveredReportCounts([first.body, again.body])}), {action: "none"});
});

// One alert run as main() runs it: decide from the issue as it reads now,
// write, then settle to a newer head run whose own alert finished.
function alertRunFor(api, target0, {jobsOf, runs, alertRuns}) {
  const decide = (target) => {
    const openIssue = oldestOpen(api.listOpen(), ISSUE_TITLE);
    return decideAlert({run: target, jobs: jobsOf(target.id), openIssue, owed: openIssue ? owedFromIssue(api.texts(openIssue)) : null});
  };
  return {
    decide: () => decide(target0),
    write: (decision) => applyDecision(api, decision),
    settle: () => settleToHead({run: target0, counts: alertCounts, alertTitle: alertRunTitle, listRuns: () => runs,
      listAlertRuns: () => alertRuns, sleep: () => {}, settle: (head) => applyDecision(api, settleDecision(decide(head), head))}),
  };
}

const mainRun = (id, conclusion, created, sha) => ({id, conclusion, created_at: created, status: "completed", event: "push",
  head_branch: "main", head_sha: sha.repeat(40), html_url: `https://example.test/run/${id}`, display_title: "CI"});
const openAlerts = (fake) => fake.state.issues.filter((issue) => issue.state === "open" && issue.title === ISSUE_TITLE);

test("a close racing an open settles to the state of the latest head run", () => {
  const red = mainRun(100, "failure", "2026-11-26T10:00:00Z", "a");
  const green = mainRun(101, "success", "2026-11-26T10:05:00Z", "b");
  const jobs = {100: [job("Required CI", "failure"), job("tools / Tool checks (core-audit)", "failure")],
    101: [job("Required CI", "success"), job("tools / Tool checks (core-audit)", "success")]};
  const jobsOf = (id) => jobs[id];
  // The newer green run's alert reads first (nothing to close) and finishes;
  // only then does the older red run's alert open the issue.
  const fake = fakeIssueApi();
  const alertRuns = [{display_title: alertRunTitle(101), status: "completed"}];
  const head = alertRunFor(fake.api, green, {jobsOf, runs: [red, green], alertRuns});
  assert.equal(head.decide().action, "none");
  const older = alertRunFor(fake.api, red, {jobsOf, runs: [red, green], alertRuns});
  older.write(older.decide());
  assert.equal(openAlerts(fake).length, 1, "the older red run opened the issue");
  assert.deepEqual(older.settle(), {status: "settled", head: 101});
  assert.equal(openAlerts(fake).length, 0, "settled to the green head: closed");
  assert.match(fake.state.issues[0].comments.at(-1), /^Settled to the latest main run \(https:\/\/example\.test\/run\/101\)/u);

  // The reverse: the newer red run comments, then the older green run closes
  // on what it read before that comment. Settling reopens the alert for the head.
  const reverse = fakeIssueApi();
  const older2 = mainRun(200, "success", "2026-11-26T11:00:00Z", "c");
  const head2 = mainRun(201, "failure", "2026-11-26T11:05:00Z", "d");
  jobs[200] = jobs[101];
  jobs[201] = jobs[100];
  openIssueOnce(reverse.api, {title: ISSUE_TITLE, body: decideAlert({run: mainRun(199, "failure", "2026-11-26T10:55:00Z", "e"),
    jobs: jobs[100], openIssue: null}).body});
  const alertRuns2 = [{display_title: alertRunTitle(201), status: "completed"}];
  const greenAlert = alertRunFor(reverse.api, older2, {jobsOf, runs: [older2, head2], alertRuns: alertRuns2});
  const read = greenAlert.decide();
  assert.equal(read.action, "close");
  const redAlert = alertRunFor(reverse.api, head2, {jobsOf, runs: [older2, head2], alertRuns: alertRuns2});
  redAlert.write(redAlert.decide());
  greenAlert.write(read);
  assert.equal(openAlerts(reverse).length, 0, "the stale close won the race");
  assert.equal(greenAlert.settle().status, "settled");
  assert.equal(openAlerts(reverse).length, 1, "settled to the red head: open again");
  assert.match(openAlerts(reverse)[0].body, /^Settled to the latest main run[^\n]*\n\nMain CI \(push\) failed at dddddddd/u);
  // The head run's own alert is never repeated: settling to a head whose state already holds posts nothing.
  const posts = reverse.state.log.filter(([name]) => ["comment", "create", "close"].includes(name)).length;
  assert.deepEqual(greenAlert.settle(), {status: "settled", head: 201});
  assert.equal(reverse.state.log.filter(([name]) => ["comment", "create", "close"].includes(name)).length, posts);
});

test("two alert runs racing to open Main CI is red end with exactly one open issue", () => {
  const a = mainRun(300, "failure", "2026-11-26T12:00:00Z", "a");
  const b = mainRun(301, "failure", "2026-11-26T12:01:00Z", "b");
  const jobsOf = () => [job("Required CI", "failure")];
  // Both read "no open issue" before either opens, and run B opens while run A
  // is between openIssueOnce's own check and its open.
  let race = null;
  const fake = fakeIssueApi({between: (name) => {
    if (name === "create" && race) {
      const write = race;
      race = null;
      write();
    }
  }});
  const runA = alertRunFor(fake.api, a, {jobsOf, runs: [a, b], alertRuns: []});
  const runB = alertRunFor(fake.api, b, {jobsOf, runs: [a, b], alertRuns: []});
  const decisionA = runA.decide();
  const decisionB = runB.decide();
  assert.deepEqual([decisionA.action, decisionB.action], ["open", "open"]);
  race = () => runB.write(decisionB);
  runA.write(decisionA);
  assert.equal(fake.state.issues.length, 2, "both runs opened an issue");
  assert.deepEqual(openAlerts(fake).map((issue) => issue.number), [1]);
  assert.match(fake.state.issues[0].comments[0], /^#2 was opened by a parallel run[\s\S]*failed at aaaaaaaa/u);
  // The owed record survives the move, so a green run still has to pass both runs' jobs.
  assert.deepEqual(owedFromIssue([fake.state.issues[0].body, ...fake.state.issues[0].comments]).jobs, ["Required CI"]);
});

test("the alert jobs are grouped per CI run, never replaced, and check out the issue guard", () => {
  const source = fs.readFileSync(new URL("../../.github/workflows/main-red-alert.yml", import.meta.url), "utf8");
  assert.match(source, /concurrency:\n  group: main-red-alert-\$\{\{ inputs\.run_id \|\| github\.event\.workflow_run\.id \}\}\n  cancel-in-progress: false\n/u);
  assert.equal([...source.matchAll(/sparse-checkout: \|\n            tool\/ci\n            tool\/lib\n/gu)].length, 4);
});
