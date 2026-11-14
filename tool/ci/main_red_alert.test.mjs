import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {FLOOR_EXIT_TITLE, ISSUE_TITLE, decideAlert, decideFloorExit} from "./main_red_alert.mjs";

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

test("the next green run closes the issue; green with no issue does nothing", () => {
  const decision = decideAlert({run: run("success"), openIssue: {number: 12}, jobs: []});
  assert.deepEqual([decision.action, decision.issue], ["close", 12]);
  assert.match(decision.body, /green again at aaaaaaaa/u);
  assert.deepEqual(decideAlert({run: run("success"), openIssue: null, jobs: []}), {action: "none"});
});

test("cancelled, skipped and neutral runs never change the alert", () => {
  for (const conclusion of ["cancelled", "skipped", "neutral", null]) {
    assert.deepEqual(decideAlert({run: run(conclusion), openIssue: {number: 3}, jobs: []}), {action: "none"}, String(conclusion));
  }
  assert.throws(() => decideAlert({run: run("failure", {head_sha: "main"}), openIssue: null, jobs: []}), /names its commit/u);
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
