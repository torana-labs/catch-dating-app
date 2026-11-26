import assert from "node:assert/strict";
import test from "node:test";
import {
  BUDGET_ISSUE_TITLE, DEFAULT_LIMIT_MS, DEFAULT_RUNS, applyBudgetDecision, decideBudgetIssue, gateChecks, overBudget, parseArgs, renderBudgetIssue, renderSummary, runGates,
} from "./semantic_gates.mjs";
import {fakeIssueApi} from "../lib/github_issues.mjs";

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
    {command: "run", candidates: true, json: false, github: false, timings: "t.json", timingsDir: null,
      runs: DEFAULT_RUNS, limitMs: DEFAULT_LIMIT_MS, issueBody: null});
  assert.equal(parseArgs(["budget", "--timings-dir", "d", "--limit-ms", "5000"]).limitMs, 5000);
  assert.throws(() => parseArgs(["gate"]), /Usage/u);
  assert.throws(() => parseArgs(["budget"]), /exactly one of --timings-dir <dir> or --github/u);
  assert.throws(() => parseArgs(["budget", "--github", "--timings-dir", "d"]), /exactly one/u);
  assert.equal(parseArgs(["budget", "--github"]).github, true);
  assert.throws(() => parseArgs(["run", "--runs", "0"]), /positive integer/u);
  assert.throws(() => parseArgs(["run", "--timings"]), /needs a value/u);
  assert.throws(() => parseArgs(["run", "--bogus"]), /Unknown option/u);
});

test("decideBudgetIssue opens, updates only on change, and closes once within budget", () => {
  const open = {number: 7, body: "old"};
  assert.deepEqual(decideBudgetIssue({body: "slow", openIssue: null}), {action: "open", title: BUDGET_ISSUE_TITLE, body: "slow"});
  assert.deepEqual(decideBudgetIssue({body: "slow", openIssue: open}), {action: "update", issue: 7, body: "slow"});
  assert.deepEqual(decideBudgetIssue({body: "old", openIssue: open}), {action: "none"});
  assert.deepEqual(decideBudgetIssue({body: null, openIssue: open}), {action: "close", issue: 7});
  assert.deepEqual(decideBudgetIssue({body: null, openIssue: null}), {action: "none"});
});

test("two nightly alert runs racing to open the budget issue leave one issue carrying the report", () => {
  let race = null;
  const fake = fakeIssueApi({between: (name) => {
    if (name === "create" && race) {
      const write = race;
      race = null;
      write();
    }
  }});
  const options = {runs: DEFAULT_RUNS, limitMs: DEFAULT_LIMIT_MS};
  race = () => applyBudgetDecision(fake.api, decideBudgetIssue({body: "report from the earlier nightly", openIssue: null}), options);
  applyBudgetDecision(fake.api, decideBudgetIssue({body: "report from the later nightly", openIssue: null}), options);
  const open = fake.state.issues.filter((issue) => issue.state === "open");
  assert.deepEqual(open.map((issue) => [issue.number, issue.title]), [[1, BUDGET_ISSUE_TITLE]]);
  assert.equal(open[0].body, "report from the later nightly", "the run that wrote last leaves its table");
  // A run that finds the issue open replaces the table instead of commenting.
  applyBudgetDecision(fake.api, decideBudgetIssue({body: "newest", openIssue: null}), options);
  assert.equal(open[0].comments.length, 1, "only the moved duplicate");
  assert.equal(fake.state.issues[0].body, "newest");
});
