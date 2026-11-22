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

// A linear main history: each commit is an ancestor of every later one.
function chain(...commits) {
  return (target, of) => commits.indexOf(target) >= 0 && commits.indexOf(target) < commits.indexOf(of);
}
const decideOn = ({commits, head, before, runId, runs}) => {
  const order = chain(...commits);
  return chooseMainPushBase({runs, runId, head, before, isAncestor: (target, of = head) => order(target, of)});
};

test("22 Nov: queue merges' push runs created out of order plan from the nearest ancestor, not full", () => {
  // Main moved 7c7f → ae14 → fffb → 7db7 → 59a4 in one queue batch. GitHub
  // created 59a4's and 7db7's runs before ae14's; fffb got none.
  const [c7c7f, ae14, fffb, c7db7, c59a4] = ["7", "a", "b", "c", "d"].map(sha);
  const decision = decideOn({commits: [c7c7f, ae14, fffb, c7db7, c59a4], head: ae14, before: c7c7f, runId: 45037686600,
    runs: [run(45034976249, c7c7f, "completed", "success"), run(45037597778, c59a4, "completed", "success"),
      run(45037603434, c7db7, "completed", "success")]});
  assert.deepEqual(decision, {baseSha: c7c7f, full: false, reason: "previous_push", skippedDescendantRuns: 2});
});

test("a descendant's run is never trusted to cover this commit; a replaced ancestor run is still covered", () => {
  // A < B < H < D. B's run was replaced (never started), D's run ran. H must
  // plan from A so B's change is in its window; D's window may start after H.
  const [a, b, h, d] = ["1", "2", "3", "4"].map(sha);
  const decision = decideOn({commits: [a, b, h, d], head: h, before: b, runId: 40,
    runs: [run(10, a, "completed", "success"), run(20, b, "completed", "cancelled"), run(30, d, "in_progress")]});
  assert.deepEqual(decision, {baseSha: a, full: false, reason: "covers_replaced_runs", previousRunId: 10,
    skippedDescendantRuns: 1});
});

test("the nearest ancestor wins over the newest run id", () => {
  // A < B < H; A's run was created after B's.
  const [a, b, h] = ["1", "2", "3"].map(sha);
  const decision = decideOn({commits: [a, b, h], head: h, before: b, runId: 30,
    runs: [run(10, b, "completed", "success"), run(20, a, "completed", "success")]});
  assert.deepEqual(decision, {baseSha: b, full: false, reason: "previous_push"});
});

test("only descendants' runs ran: validate everything; a cancelled ancestor never counts", () => {
  const [a, h, d] = ["1", "2", "3"].map(sha);
  assert.deepEqual(decideOn({commits: [a, h, d], head: h, before: a, runId: 30,
    runs: [run(10, a, "completed", "cancelled"), run(20, d, "completed", "success")]}),
  {baseSha: a, full: true, reason: "earlier_run_not_an_ancestor"});
});
