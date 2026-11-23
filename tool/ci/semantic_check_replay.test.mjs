import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";
import {loadToolsManifest} from "../lib/tools_manifest.mjs";
import {REPORTING_LANES} from "./required_ci_floor.mjs";
import {
  EXCLUDED, INCLUDED, commandScript, mergeRecords, outcomeOf, parseArgs, queueRunMap, renderMarkdown,
  replayWindow, summarize, verdictOf, wholeRepoInventory,
} from "./semantic_check_replay.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const readWorkflow = (file) => fs.readFileSync(path.join(repoRoot, ".github/workflows", file), "utf8");

const tool = (id, overrides = {}) => ({id, category: id.split(":")[0], status: "active",
  surface: "local-read", role: "gate", command: `node tool/x/${id.split(":")[1]}.mjs`,
  ciRequirements: {repositoryView: "full", setup: ["node"]}, ...overrides});

test("the inventory keeps local repository scripts and drops tests, probes, finders, remote and Flutter tools", () => {
  const manifest = {tools: [
    tool("a:scan"),
    tool("a:ratchet", {role: "ratchet", surface: "local-writes-repo", command: "node tool/x/r.mjs --check"}),
    tool("a:unroled", {role: undefined}),
    tool("a:unit", {command: "node --test tool/x/unit.test.mjs"}),
    tool("a:help", {command: "node tool/x/h.mjs --help"}),
    tool("a:placeholder", {command: "node tool/x/p.mjs --pairs <file>"}),
    tool("a:finder", {role: "finder"}),
    tool("a:remote", {surface: "remote-read"}),
    tool("a:flutter", {ciRequirements: {setup: ["node", "flutter"]}}),
    tool("a:dart", {command: "dart tool/x/d.dart"}),
    tool("a:retired", {status: "retired"}),
    tool("tool:runner", {command: "node tool/run.mjs"}),
    tool("firebase:function-binding-intent", {command: "node --test tool/firebase/f.test.mjs"}),
  ]};
  const {checks, excluded} = wholeRepoInventory(manifest);
  assert.deepEqual(checks.map((check) => check.id),
    ["a:ratchet", "a:scan", "a:unroled", "firebase:function-binding-intent"]);
  assert.equal(checks.find((check) => check.id === "firebase:function-binding-intent").note,
    INCLUDED["firebase:function-binding-intent"]);
  assert.deepEqual(excluded, [{id: "tool:runner", reason: EXCLUDED["tool:runner"]}]);
});

test("the real inventory holds the examples the release engineer named, and every listed exception is current", () => {
  const manifest = loadToolsManifest({root: repoRoot});
  const {checks, excluded} = wholeRepoInventory(manifest);
  const ids = new Set(checks.map((check) => check.id));
  for (const id of ["meta:tool-manifest", "firebase:function-binding-intent", "audit:functions-contexts",
    "operations:boundaries", "contracts:firestore-contract", "contracts:validate-schemas"]) {
    assert.ok(ids.has(id), `${id} is a whole-repo check`);
  }
  const active = new Set(manifest.tools.filter((entry) => entry.status === "active").map((entry) => entry.id));
  for (const id of [...Object.keys(EXCLUDED), ...Object.keys(INCLUDED)]) {
    assert.ok(active.has(id), `${id} is listed as an exception but is not an active tool`);
  }
  // An exclusion the rule no longer admits is stale and should go.
  assert.deepEqual(excluded.map((entry) => entry.id).sort(), Object.keys(EXCLUDED).sort());
});

test("commandScript finds the script a command runs", () => {
  assert.equal(commandScript("node tool/run.mjs check --manifest-only"), "tool/run.mjs");
  assert.equal(commandScript("bash tool/widget_cleanup_scan.sh"), "tool/widget_cleanup_scan.sh");
  assert.equal(commandScript("node --check"), null);
});

const fixtureWorkflows = {
  "ci.yml": `
jobs:
  plan: {runs-on: x}
  tools: {uses: ./.github/workflows/tools-ci.yml}
  contracts: {uses: ./.github/workflows/contracts-ci.yml}
  flutter: {uses: ./.github/workflows/flutter-ci.yml}
  ops: {uses: ./.github/workflows/ops-ci.yml}
  required:
    needs: [plan, contracts, flutter]
`,
  "contracts-ci.yml": `
jobs:
  schema:
    steps:
      - name: Scan
        run: node tool/x/scan.mjs
      - name: Runner checks
        run: node tool/run.mjs check a:other
`,
  "flutter-ci.yml": `
jobs:
  gates:
    steps:
      - name: Advisory scan
        continue-on-error: true
        run: node tool/x/advisory.mjs
`,
  "ops-ci.yml": `
jobs:
  ops:
    steps:
      - run: node tool/x/ops.mjs
`,
};

test("queueRunMap marks a check as gating only in a required lane on a step that does not continue on error", () => {
  const checks = [tool("a:scan"), tool("a:other"), tool("a:advisory"), tool("a:ops"),
    tool("a:manifest", {command: "node tool/run.mjs check --manifest-only"})];
  const map = queueRunMap(checks, {readWorkflow: (file) => fixtureWorkflows[file]});
  assert.deepEqual(map["a:scan"].sites.map((site) => [site.lane, site.gates]), [["tools", false], ["contracts", true]]);
  assert.equal(map["a:scan"].gates, true);
  assert.equal(map["a:other"].gates, true, "a run.mjs check naming the id runs it");
  assert.deepEqual(map["a:advisory"].sites.map((site) => [site.lane, site.gates]), [["tools", false], ["flutter", false]]);
  assert.equal(map["a:ops"].gates, false, "a lane outside Required CI reports only");
  assert.deepEqual(map["a:manifest"].sites.map((site) => site.lane), ["tools"],
    "another run.mjs invocation is not this check");
});

test("on the real workflows the tools lane reports only, as the sprint floor says, and the contracts lane gates", () => {
  const manifest = loadToolsManifest({root: repoRoot});
  const {checks} = wholeRepoInventory(manifest);
  const map = queueRunMap(checks, {readWorkflow});
  const toolsSite = map["meta:tool-manifest"].sites.find((site) => site.lane === "tools");
  assert.equal(toolsSite.gates, !REPORTING_LANES.includes("tools"));
  assert.ok(map["contracts:validate-schemas"].sites.some((site) => site.lane === "contracts" && site.gates));
});

const attempt = (status, ms = 1000, tail = "") => ({status, ms, tail});
const record = (sha, id, statuses, extra = {}) =>
  ({sha, subject: `subject ${sha}`, id, selected: true, attempts: statuses.map((status) => attempt(status, 1000, `out ${sha}`)), ...extra});

test("outcomeOf separates pass, fail, flaky and setup", () => {
  assert.equal(outcomeOf(record("a", "x", [0])), "pass");
  assert.equal(outcomeOf(record("a", "x", [1, 1, 1])), "fail");
  assert.equal(outcomeOf(record("a", "x", [1, 0])), "flaky");
  assert.equal(outcomeOf({sha: "a", id: "x", setupError: "npm ci", attempts: []}), "setup");
});

test("summarize groups consecutive failures into incidents and counts the merges the queue would have blocked", () => {
  const order = ["c1", "c2", "c3", "c4", "c5", "c6"];
  const records = [
    record("c4", "x", [1, 1, 1], {selected: false}),
    record("c1", "x", [0]),
    record("c3", "x", [1, 1, 1]),
    record("c2", "x", [1, 0]),
    record("c5", "x", [0]),
    record("c6", "x", [1, 1, 1], {selected: false}),
    {sha: "c1", subject: "s", id: "y", present: false},
    record("c2", "y", [0]),
  ];
  const time = {c3: 3600, c5: 3600 * 4.5};
  const [x, y] = summarize(records, {order, timeOf: (sha) => time[sha] ?? null});
  assert.equal(x.id, "x");
  assert.deepEqual([x.commits, x.pass, x.fail, x.flaky, x.setup], [6, 2, 3, 1, 0]);
  assert.equal(x.passRate, 2 / 6);
  assert.deepEqual(x.flakes, [{sha: "c2", statuses: [1, 0]}]);
  assert.deepEqual(x.incidents.map((incident) => [incident.introducedAt, incident.commits, incident.fixedAt,
    incident.selectedAtIntroduction, incident.blockedMerges]), [["c3", 2, "c5", true, 1], ["c6", 1, null, false, 0]]);
  assert.deepEqual(x.incidents.map((incident) => incident.redHours), [3.5, null]);
  assert.equal(x.blockedMerges, 1);
  assert.deepEqual([y.commits, y.absent, y.pass], [1, 1, 1]);
});

test("verdictOf requires enough commits, no flakes and no failures, within the runtime budget", () => {
  const base = {pass: 100, fail: 0, flaky: 0, runtimeMs: {p95: 1000}};
  assert.equal(verdictOf(base), "clean");
  assert.equal(verdictOf({...base, pass: 10}), "insufficient");
  assert.equal(verdictOf({...base, flaky: 1}), "flaky");
  assert.equal(verdictOf({...base, fail: 2}), "failing");
  assert.equal(verdictOf({...base, runtimeMs: {p95: 200000}}), "slow");
  assert.equal(verdictOf({...base, runtimeMs: {p95: 200000}}, {budgetMs: 300000}), "clean");
});

test("renderMarkdown lists every check and each failure with its cause line", () => {
  const order = ["c1", "c2"];
  const summaries = summarize([record("c1", "x", [0]), record("c2", "x", [1, 1, 1])], {order});
  const markdown = renderMarkdown(summaries, {queueMap: {x: {gates: false, sites: []}},
    window: {ref: "main", commits: 2, oldest: "c1", newest: "c2"}});
  assert.match(markdown, /Replayed 2 first-parent commits of main/u);
  assert.match(markdown, /\| `x` \| no \| 2 \| 1 \| 1 \| 0 \| 0 \| 50\.0% \|/u);
  assert.match(markdown, /`x`: failed on 1 commit\(s\) from c2 \(subject c2\), still failing at the newest/u);
  assert.match(markdown, /`out c2`/u);
});

test("parseArgs validates commands and options", () => {
  assert.deepEqual(parseArgs(["run", "--out", "r.jsonl", "--commits", "20", "--checks", "a:b, c:d"]),
    {command: "run", ref: "origin/main", commits: 20, every: 1, workers: 3, reruns: 2, timeout: 600,
      checks: ["a:b", "c:d"], workdir: null, "commits-from": null, out: "r.jsonl", results: null, json: null, markdown: null});
  assert.equal(parseArgs(["inventory", "--json"]).json, true);
  assert.equal(parseArgs(["run", "--out", "r", "--reruns", "0"]).reruns, 0);
  assert.throws(() => parseArgs(["replay"]), /Usage/u);
  assert.throws(() => parseArgs(["run"]), /--out/u);
  assert.throws(() => parseArgs(["report"]), /--results/u);
  assert.throws(() => parseArgs(["run", "--out", "r", "--commits", "0"]), /positive integer/u);
  assert.throws(() => parseArgs(["run", "--out", "r", "--bogus", "1"]), /Unknown option/u);
  assert.throws(() => parseArgs(["run", "--out"]), /needs a value/u);
});

test("replayWindow lists first-parent commits oldest first and keeps the newest when sampling", () => {
  const calls = [];
  const git = (args) => { calls.push(args); return "s5\ns4\ns3\ns2\ns1\n"; };
  assert.deepEqual(replayWindow(git, {ref: "main", commits: 5, every: 1}), ["s1", "s2", "s3", "s4", "s5"]);
  assert.deepEqual(calls[0], ["rev-list", "--first-parent", "--max-count=5", "main"]);
  assert.deepEqual(replayWindow(git, {ref: "main", commits: 5, every: 2}), ["s1", "s3", "s5"]);
});

test("mergeRecords lets a later result file replace a commit and check's earlier record", () => {
  const line = (sha, id, status) => JSON.stringify(record(sha, id, [status]));
  const merged = mergeRecords([`${line("c1", "x", 1)}\n${line("c1", "y", 0)}\n`, `${line("c1", "x", 0)}\n`]);
  assert.deepEqual(merged.map((entry) => [entry.id, entry.attempts[0].status]), [["x", 0], ["y", 0]]);
});
