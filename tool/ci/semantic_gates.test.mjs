import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_LIMIT_MS, DEFAULT_RUNS, gateChecks, overBudget, parseArgs, renderBudgetIssue, renderSummary, runGates,
} from "./semantic_gates.mjs";

const manifest = {tools: [
  {id: "b:gate", status: "active", command: "node b.mjs", queueGate: "always"},
  {id: "a:gate", status: "active", command: "node a.mjs", queueGate: "always"},
  {id: "c:new", status: "active", command: "node c.mjs", queueGate: "candidate"},
  {id: "d:plain", status: "active", command: "node d.mjs"},
]};

test("gateChecks runs the always gates in id order, and candidates only when asked", () => {
  assert.deepEqual(gateChecks(manifest).map((check) => [check.id, check.level, check.command]),
    [["a:gate", "always", "node a.mjs"], ["b:gate", "always", "node b.mjs"]]);
  assert.deepEqual(gateChecks(manifest, {candidates: true}).map((check) => check.id), ["a:gate", "b:gate", "c:new"]);
});

test("runGates runs every check after a failure, and only a failed always gate fails the run", () => {
  const ran = [];
  const statuses = {"node a.mjs": 1, "node b.mjs": 0, "node c.mjs": 2};
  const outcome = runGates(gateChecks(manifest, {candidates: true}), {exec: (command) => {
    ran.push(command);
    return statuses[command];
  }});
  assert.deepEqual(ran, ["node a.mjs", "node b.mjs", "node c.mjs"]);
  assert.equal(outcome.ok, false);
  assert.deepEqual(outcome.failed.map((result) => result.id), ["a:gate"]);
  const candidateOnly = runGates(gateChecks(manifest, {candidates: true}),
    {exec: (command) => (command === "node c.mjs" ? 1 : 0)});
  assert.equal(candidateOnly.ok, true, "a failed candidate reports but does not fail the run");
});

test("renderSummary leads with the failures and lists every check", () => {
  const summary = renderSummary(runGates(gateChecks(manifest), {exec: (command) => (command === "node a.mjs" ? 3 : 0)}));
  assert.match(summary, /1 gating check\(s\) failed:\n- `a:gate` exited 3: `node a.mjs`/u);
  assert.match(summary, /\| `b:gate` \| always \| pass \|/u);
  assert.match(renderSummary(runGates(gateChecks(manifest), {exec: () => 0})), /All 2 gating checks passed\./u);
});

const nightly = (at, times) => ({at, results: Object.entries(times).map(([id, ms]) => ({id, level: "always", status: 0, ms}))});

test("overBudget takes p95 over the newest runs and keeps only current gates over the limit", () => {
  const documents = [
    nightly("2026-11-20T02:30:00Z", {"a:gate": 50000, "b:gate": 1000}),
    ...Array.from({length: 7}, (_, day) =>
      nightly(`2026-11-2${day + 1}T02:30:00Z`, {"a:gate": 9000 + day * 1000, "b:gate": 1000, "gone:gate": 99999})),
  ];
  const over = overBudget(documents, {gateIds: ["a:gate", "b:gate"], runs: 7, limitMs: 10000});
  // The newest 7 give a:gate 9–15 s (the 50 s run is older); p95 of 7 samples is the slowest.
  assert.deepEqual(over, [{id: "a:gate", p95Ms: 15000, samples: 7}]);
  assert.deepEqual(overBudget(documents, {gateIds: ["b:gate"], runs: 7, limitMs: 10000}), []);
  assert.deepEqual(overBudget([], {gateIds: ["a:gate"]}), [], "no timings yet reports nothing");
});

test("renderBudgetIssue names each slow check and the fix, or nothing when all are within budget", () => {
  assert.equal(renderBudgetIssue([], {runs: 7, limitMs: 10000}), null);
  const body = renderBudgetIssue([{id: "a:gate", p95Ms: 16000, samples: 7}], {runs: 7, limitMs: 10000});
  assert.match(body, /slower than 10\.0 s at p95 over the last 7 nightly runs/u);
  assert.match(body, /\| `a:gate` \| 16\.0 \| 7 \|/u);
  assert.match(body, /remove `"queueGate": "always"`/u);
  assert.match(body, /does not fail the nightly/u);
});

test("parseArgs validates commands and options", () => {
  assert.deepEqual(parseArgs(["run", "--candidates", "--timings", "t.json"]),
    {command: "run", candidates: true, json: false, timings: "t.json", timingsDir: null,
      runs: DEFAULT_RUNS, limitMs: DEFAULT_LIMIT_MS, issueBody: null});
  assert.equal(parseArgs(["budget", "--timings-dir", "d", "--limit-ms", "5000"]).limitMs, 5000);
  assert.throws(() => parseArgs(["gate"]), /Usage/u);
  assert.throws(() => parseArgs(["budget"]), /--timings-dir/u);
  assert.throws(() => parseArgs(["run", "--runs", "0"]), /positive integer/u);
  assert.throws(() => parseArgs(["run", "--timings"]), /needs a value/u);
  assert.throws(() => parseArgs(["run", "--bogus"]), /Unknown option/u);
});
