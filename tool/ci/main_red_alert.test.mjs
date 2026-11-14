import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {ISSUE_TITLE, decideAlert} from "./main_red_alert.mjs";

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
