import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {FLOOR_EXIT_TITLE, ISSUE_TITLE, decideAlert, decideFloorExit, nightlyWindow, owedFromIssue}
  from "./main_red_alert.mjs";

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

test("the workflow listens only to main's push and nightly CI and can only write issues", () => {
  const workflow = fs.readFileSync(new URL("../../.github/workflows/main-red-alert.yml", import.meta.url), "utf8");
  assert.match(workflow, /workflow_run:\n\s+workflows: \[CI\]\n\s+types: \[completed\]\n\s+branches: \[main\]/u);
  assert.match(workflow, /^permissions: \{\}$/mu);
  assert.match(workflow, /contains\(fromJSON\('\["push", "schedule"\]'\), github\.event\.workflow_run\.event\)/u);
  assert.match(workflow, /github\.event\.workflow_run\.head_branch == 'main'/u);
  assert.match(workflow, /issues: write/u);
  assert.doesNotMatch(workflow, /contents: write|pull-requests: write/u);
  assert.match(workflow, /RUN_ID: \$\{\{ github\.event\.workflow_run\.id \}\}/u);
  assert.match(workflow, /node tool\/ci\/main_red_alert\.mjs/u);
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
