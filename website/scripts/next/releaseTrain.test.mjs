import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {APPROVAL_ENVIRONMENT, planDecision, selectDispatchedRun} from "./releaseTrain.mjs";

const mainSha = "a".repeat(40);
const liveSha = "b".repeat(40);
const reviewers = [{type: "required_reviewers", reviewers: [{type: "User", reviewer: {login: "owner"}}]}];
const base = {event: "workflow_run", eventSha: mainSha, eventConclusion: "success", mainSha,
  validation: {validated: true, captureBinding: {sourceSha: mainSha}}, lineage: {liveSha, alreadyLive: false},
  approvalRules: reviewers};

test("the train releases main's validated head when it is newer than live", () => {
  assert.deepEqual(planDecision(base), {release: true, sourceSha: mainSha, liveSha, reason: "release"});
  assert.equal(planDecision({...base, event: "schedule", eventSha: "", eventConclusion: ""}).release, true);
});

test("the train skips what it should not release", () => {
  for (const [label, change, reason] of [
    ["unsuccessful CI", {eventConclusion: "failure"}, "ci_unsuccessful"],
    ["timed-out CI", {eventConclusion: "timed_out"}, "ci_unsuccessful"],
    ["a newer merge", {eventSha: "c".repeat(40)}, "superseded_by_newer_main"],
    ["no website validation", {validation: null}, "no_website_validation_for_main_head"],
    ["validation without captures", {validation: {validated: true, captureBinding: null}}, "no_website_validation_for_main_head"],
    ["already live", {lineage: {liveSha: mainSha, alreadyLive: true}}, "already_live"],
  ]) {
    assert.deepEqual([planDecision({...base, ...change}).release, planDecision({...base, ...change}).reason],
      [false, reason], label);
  }
});

test("a newer merge cancelling main's push run leaves the decision to the merge queue evidence", () => {
  assert.equal(planDecision({...base, eventConclusion: "cancelled"}).release, true);
  assert.equal(planDecision({...base, eventConclusion: "cancelled", validation: null}).reason,
    "no_website_validation_for_main_head");
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
  for (const name of ["plan", "preview", "promote"]) {
    assert.doesNotMatch(job(name), /id-token: write|environment:/u, `${name} never touches production credentials`);
  }
  assert.match(job("plan"), /github\.event\.workflow_run\.event == 'push'/u);
});
