import assert from "node:assert/strict";
import test from "node:test";
import {chooseMainPushBase} from "./main_push_base.mjs";

const sha = (digit) => digit.repeat(40);
const HEAD = sha("f");
const BEFORE = sha("e");
const run = (id, headSha, status, conclusion = null, extra = {}) => ({id, head_sha: headSha, status,
  conclusion, event: "push", head_branch: "main", path: ".github/workflows/ci.yml", ...extra});
const decide = (runs, isAncestor = () => true) =>
  chooseMainPushBase({runs, runId: 100, head: HEAD, before: BEFORE, isAncestor});

test("the previous push's run ran: plan from before, as an ordinary push", () => {
  assert.deepEqual(decide([run(99, BEFORE, "in_progress")]),
    {baseSha: BEFORE, full: false, reason: "previous_push"});
  assert.equal(decide([run(99, BEFORE, "completed", "failure")]).baseSha, BEFORE);
});

test("a replaced pending run is covered by the run that replaced it", () => {
  // Run 98 ran a, run 99 (commit e) was pending and replaced by this run.
  const decision = decide([run(99, BEFORE, "completed", "cancelled"), run(98, sha("a"), "completed", "success")]);
  assert.deepEqual(decision, {baseSha: sha("a"), full: false, reason: "covers_replaced_runs", previousRunId: 98});
});

test("runs cancelled by the retired cancel-in-progress rule widen the window too", () => {
  const decision = decide([run(99, BEFORE, "completed", "cancelled"), run(97, sha("b"), "completed", "cancelled"),
    run(96, sha("c"), "completed", "failure")]);
  assert.equal(decision.baseSha, sha("c"));
});

test("later runs, other workflows, other events and this commit never count", () => {
  const decision = decide([
    run(101, sha("1"), "in_progress"),
    run(95, sha("2"), "completed", "success", {event: "workflow_dispatch"}),
    run(94, sha("3"), "completed", "success", {path: ".github/workflows/other.yml"}),
    run(93, sha("4"), "completed", "success", {head_branch: "feature"}),
    run(92, HEAD, "completed", "success"),
    run(91, sha("5"), "queued"),
    run(90, sha("6"), "completed", "success"),
  ]);
  assert.equal(decision.baseSha, sha("6"));
});

test("no earlier run that ran, or one off main's history, validates everything", () => {
  assert.deepEqual(decide([]), {baseSha: BEFORE, full: true, reason: "no_earlier_run_that_ran"});
  assert.deepEqual(decide([run(99, BEFORE, "completed", "cancelled")]).full, true);
  assert.deepEqual(decide([run(98, sha("a"), "completed", "success")], () => false),
    {baseSha: BEFORE, full: true, reason: "earlier_run_not_an_ancestor"});
});

test("inputs are validated", () => {
  assert.throws(() => chooseMainPushBase({runs: [], runId: 1, head: "main", before: BEFORE, isAncestor: () => true}));
  assert.throws(() => chooseMainPushBase({runs: [], runId: 0, head: HEAD, before: BEFORE, isAncestor: () => true}));
});
