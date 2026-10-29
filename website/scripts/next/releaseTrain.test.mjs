import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {APPROVAL_ENVIRONMENT, planDecision, selectDispatchedRun, websiteChangedInPlan} from "./releaseTrain.mjs";

const mainSha = "a".repeat(40);
const liveSha = "b".repeat(40);
const reviewers = [{type: "required_reviewers", reviewers: [{type: "User", reviewer: {login: "owner"}}]}];
const base = {event: "workflow_run", eventSha: mainSha, eventConclusion: "success", mainSha,
  validation: {validated: true, captureBinding: {sourceSha: mainSha}}, lineage: {liveSha, alreadyLive: false},
  approvalRules: reviewers};

test("the train releases main's validated head when it is newer than live", () => {
  assert.deepEqual(planDecision(base), {release: true, validate: false, sourceSha: mainSha, liveSha, reason: "release"});
  assert.equal(planDecision({...base, event: "schedule", eventSha: "", eventConclusion: ""}).release, true);
});

test("the train skips what it should not release", () => {
  for (const [label, change, reason] of [
    ["unsuccessful CI", {eventConclusion: "failure"}, "ci_unsuccessful"],
    ["timed-out CI", {eventConclusion: "timed_out"}, "ci_unsuccessful"],
    ["no website validation, website as live has it", {validation: null, websiteChanged: false}, "website_unchanged_since_live"],
    ["validation without captures, website as live has it",
      {validation: {validated: true, captureBinding: null}, websiteChanged: false}, "website_unchanged_since_live"],
    ["already live", {lineage: {liveSha: mainSha, alreadyLive: true}}, "already_live"],
    ["already live, unvalidated", {validation: null, lineage: {liveSha: mainSha, alreadyLive: true}}, "already_live"],
  ]) {
    assert.deepEqual([planDecision({...base, ...change}).release, planDecision({...base, ...change}).reason],
      [false, reason], label);
  }
});

test("a newer merge cancelling main's push run leaves the decision to the merge queue evidence", () => {
  assert.equal(planDecision({...base, eventConclusion: "cancelled"}).release, true);
  assert.equal(planDecision({...base, eventConclusion: "cancelled", validation: null, websiteChanged: false}).reason,
    "website_unchanged_since_live");
});

test("completion of an older commit's CI releases main's validated head", () => {
  const decision = planDecision({...base, eventSha: "c".repeat(40), eventConclusion: "cancelled"});
  assert.deepEqual([decision.release, decision.sourceSha], [true, mainSha]);
  assert.equal(planDecision({...base, eventSha: "c".repeat(40), validation: null, websiteChanged: false}).reason,
    "website_unchanged_since_live");
});

// 29-30 Oct 2026: #1018, #1019 and #1028 changed the website, then docs and
// tooling merges became main's head. Their CI ran no Marketing validation, so
// every train skipped and the website changes never reached approval.
test("a docs or tooling head on top of unreleased website changes is validated, then released", () => {
  for (const validation of [null, {validated: false, captureProduced: false}, {validated: false, captureProduced: true}]) {
    for (const event of ["workflow_run", "schedule", "workflow_dispatch"]) {
      assert.deepEqual(planDecision({...base, event, validation, websiteChanged: true}),
        {release: true, validate: true, sourceSha: mainSha, liveSha, reason: "validate_and_release"},
        `${event} ${JSON.stringify(validation)}`);
    }
  }
  // Once the dispatched full run validated the head, the next plan releases it outright.
  assert.equal(planDecision({...base, websiteChanged: true}).validate, false);
});

test("the train dispatches one validation per head, and a failed one stops it", () => {
  const unvalidated = {...base, validation: null, websiteChanged: true};
  for (const status of ["queued", "in_progress", "waiting"]) {
    assert.equal(planDecision({...unvalidated, validationRuns: [{status}]}).reason, "website_validation_running", status);
  }
  for (const conclusion of ["failure", "cancelled", "timed_out", "success"]) {
    assert.deepEqual(planDecision({...unvalidated, validationRuns: [{status: "completed", conclusion}]}),
      {release: false, validate: false, sourceSha: null, liveSha: null, reason: "website_validation_failed"}, conclusion);
  }
  assert.equal(planDecision({...unvalidated, eventConclusion: "failure"}).reason, "ci_unsuccessful",
    "a failed CI stops the train before any validation");
});

test("an unvalidated head never releases without knowing whether the website changed", () => {
  assert.throws(() => planDecision({...base, validation: null}), /must be known/u);
});

test("the website changed when CI's planner would run Marketing validation, or cannot tell", () => {
  const plan = (ciTargets, overrides = {}) => ({full: false, complete: true, operations: {ciTargets}, ...overrides});
  assert.equal(websiteChangedInPlan(plan(["docs", "tools"])), false);
  assert.equal(websiteChangedInPlan(plan(["capture_freshness", "flutter"])), false,
    "app captures alone ride with the next website release, as before");
  assert.equal(websiteChangedInPlan(plan(["marketing", "tools"])), true);
  for (const unknown of [plan(["docs"], {full: true}), plan(["docs"], {complete: false}), plan(["docs"], {full: undefined}),
    {full: false, complete: true}, null]) {
    assert.equal(websiteChangedInPlan(unknown), true, JSON.stringify(unknown));
  }
});

test("the train refuses to run when production approval would not wait for anyone", () => {
  for (const approvalRules of [[], [{type: "wait_timer", wait_timer: 5}], [{type: "required_reviewers", reviewers: []}]]) {
    assert.throws(() => planDecision({...base, approvalRules}), /must require a reviewer/u);
  }
});

test("the train follows only the run it dispatched", () => {
  const requestedAt = "2026-10-24T08:00:00.000Z";
  const run = (overrides) => ({event: "workflow_dispatch", head_branch: "main", head_sha: mainSha,
    triggering_actor: {login: "github-actions[bot]"}, created_at: "2026-10-24T08:00:10.000Z", ...overrides});
  assert.equal(selectDispatchedRun({runs: [], requestedAt, expectedSha: mainSha}), null);
  assert.equal(selectDispatchedRun({runs: [run({created_at: "2026-10-24T07:50:00.000Z"})], requestedAt}), null,
    "an older run is not ours");
  assert.equal(selectDispatchedRun({runs: [run({triggering_actor: {login: "someone"}})], requestedAt}), null,
    "a person's manual dispatch is not ours");
  const newest = run({id: 2, created_at: "2026-10-24T08:00:30.000Z"});
  assert.equal(selectDispatchedRun({runs: [run({id: 1}), newest], requestedAt, expectedSha: mainSha}), newest);
  assert.throws(() => selectDispatchedRun({runs: [run({head_sha: "c".repeat(40)})], requestedAt, expectedSha: mainSha}),
    /next train releases it/u);
  assert.ok(selectDispatchedRun({runs: [run({head_sha: "c".repeat(40)})], requestedAt}),
    "promotion follows its run wherever main is");
});

test("the train workflow gates production on the protected environment and never cancels a pending approval", () => {
  const workflow = fs.readFileSync(new URL("../../../.github/workflows/website-release.yml", import.meta.url), "utf8");
  assert.match(workflow, /workflow_run:\n {4}workflows: \[CI\]\n {4}types: \[completed\]\n {4}branches: \[main\]/u);
  assert.match(workflow, /schedule:\n {4}- cron: "23 \* \* \* \*"/u);
  assert.match(workflow, /concurrency:\n {2}group: website-release\n {2}cancel-in-progress: false/u);
  const job = (name) => workflow.split(`\n  ${name}:\n`)[1].split(/\n {2}[a-z]+:\n/u)[0];
  const approve = job("approve");
  assert.match(approve, new RegExp(`environment:\\n {6}name: ${APPROVAL_ENVIRONMENT}\\n`, "u"));
  assert.match(approve, /permissions: \{\}/u);
  assert.doesNotMatch(approve, /uses:|secrets\.|id-token/u, "the approval job holds no token or credential");
  assert.match(job("promote"), /needs: \[plan, preview, approve\]/u);
  for (const name of ["plan", "validate", "preview", "promote"]) {
    assert.doesNotMatch(job(name), /id-token: write|environment:/u, `${name} never touches production credentials`);
  }
  // Main's push, nightly and dispatched CI may start a train; pull request and merge queue CI never do.
  assert.match(job("plan"), /contains\(fromJSON\('\["push", "schedule", "workflow_dispatch"\]'\), github\.event\.workflow_run\.event\)/u);
  assert.match(job("plan"), /fetch-depth: 0/u, "the planner compares live with main's head");
  assert.match(job("validate"), /if: \$\{\{ needs\.plan\.outputs\.validate == 'true' \}\}/u);
  assert.match(job("validate"), /permissions:\n {6}actions: write\n {6}contents: read\n/u);
  // A failed validation, or one main moved past, never reaches the preview or approval.
  assert.match(job("preview"), /needs: \[plan, validate\]/u);
  assert.match(job("preview"), /needs\.validate\.result == 'skipped' \|\| \(needs\.validate\.result == 'success' && needs\.validate\.outputs\.current == 'true'\)/u);
  assert.match(job("approve"), /needs: \[plan, preview\]/u);
});
