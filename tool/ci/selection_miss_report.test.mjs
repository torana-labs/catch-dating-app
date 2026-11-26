import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {selectEmulatorTests} from "../lib/functions_test_selection.mjs";
import {COMMIT_LIMIT, ISSUE_TITLE, decideSelectionMiss, failingEmulatorTests, failingUnitTests, lastGreenNightly, testId,
  unionSelection} from "./selection_miss_report.mjs";

const run = {html_url: "https://example.test/run/9", head_sha: "f".repeat(40)};
const commits = (count) => Array.from({length: count}, (_, n) => ({sha: String(n + 1).repeat(40).slice(0, 40), subject: `commit ${n + 1}`}));
const range = (count, {unit = [], emulator = [], unitMode = "selected", emulatorMode = "selected", ...extra} = {}) => ({
  base: "b".repeat(40), truncated: false, commits: commits(count),
  unit: {mode: unitMode, tests: unit}, emulator: {mode: emulatorMode, tests: emulator}, ...extra,
});

test("test ids are named relative to functions/, as the selector lists them", () => {
  assert.equal(testId("/home/runner/work/app/app/functions/lib/chat/send.test.js"), "lib/chat/send.test.js");
  assert.equal(testId("/w/functions/test/rules/events.rules.test.cjs"), "test/rules/events.rules.test.cjs");
  // The last functions/ segment that starts a test tree wins.
  assert.equal(testId("/home/functions/x/functions/scripts/run-tests.test.cjs"), "scripts/run-tests.test.cjs");
  assert.equal(testId("/w/website/src/a.test.mjs"), null);
});

test("the JUnit report yields each failing file once, including files that failed to load", () => {
  const junit = `<?xml version="1.0" encoding="utf-8"?>
<testsuites>
\t<testcase name="ok" time="0.1" classname="test" file="/w/functions/lib/a.test.js"/>
\t<testcase name="bad &quot;one&quot;" time="0.1" classname="test" file="/w/functions/lib/a.test.js" failure="x">
\t\t<failure type="testCodeFailure" message="x">[Error: x &lt;b&gt;]</failure>
\t</testcase>
\t<testsuite name="suite">
\t\t<testcase name="also bad" time="0.1" classname="test" file="/w/functions/lib/a.test.js" failure="y"><failure/></testcase>
\t</testsuite>
\t<testcase name="b.test.cjs" time="0.1" classname="test" file="/w/functions/test/b%20c&amp;d.test.cjs" failure="test failed"><failure/></testcase>
\t<testcase name="skipped" time="0" classname="test" file="/w/functions/lib/c.test.js"><skipped type="skipped" message="true"/></testcase>
</testsuites>`;
  assert.deepEqual(failingUnitTests(junit), ["lib/a.test.js", "test/b%20c&d.test.cjs"]);
  assert.deepEqual(failingUnitTests(""), []);
});

test("emulator evidence yields its failed files, not skipped or passing ones", () => {
  assert.deepEqual(failingEmulatorTests({executed: [
    {file: "/w/functions/test/rules/a.rules.test.cjs", name: "x", status: "fail"},
    {file: "/w/functions/test/rules/a.rules.test.cjs", name: "y", status: "fail"},
    {file: "/w/functions/lib/b.emulator.test.js", name: "z", status: "pass"},
    {file: "/w/functions/lib/c.emulator.test.js", name: "z", status: "skipped"},
  ]}), ["test/rules/a.rules.test.cjs"]);
  assert.deepEqual(failingEmulatorTests({}), []);
});

test("a failing test no commit selected opens one issue naming it and its lane", () => {
  const decision = decideSelectionMiss({run, openIssue: null,
    failures: [{lane: "unit", test: "lib/a.test.js"}, {lane: "emulator", test: "test/rules/b.rules.test.cjs"},
      {lane: "unit", test: "lib/c.test.js"}],
    range: range(2, {unit: ["lib/c.test.js"], emulator: ["test/rules/other.rules.test.cjs"]})});
  assert.equal(decision.action, "open");
  assert.equal(decision.title, ISSUE_TITLE);
  assert.deepEqual(decision.missed.map(({test}) => test), ["lib/a.test.js", "test/rules/b.rules.test.cjs"]);
  assert.match(decision.body, /failed 3 Functions test file\(s\): https:\/\/example\.test\/run\/9/u);
  assert.match(decision.body, /would not have run 2 of them for any of the 2 commit\(s\) since the last green nightly \(bbbbbbbb\.\.ffffffff\)/u);
  assert.match(decision.body, /- `lib\/a\.test\.js` \(Functions unit\)\n- `test\/rules\/b\.rules\.test\.cjs` \(emulator\)/u);
  assert.match(decision.body, /1 other failing test file\(s\) were selected/u);
  assert.match(decision.body, /Rerun the test before treating it as a selector gap/u);
  assert.match(decision.body, /\n\n---\n_Posted by the Main CI alert workflow \(tool\/ci\/selection_miss_report\.mjs\)/u);
});

test("a lane's selection only covers that lane's tests", () => {
  // The same file selected in the other lane does not count.
  const decision = decideSelectionMiss({run, openIssue: null, failures: [{lane: "emulator", test: "lib/x.emulator.test.js"}],
    range: range(1, {unit: ["lib/x.emulator.test.js"]})});
  assert.equal(decision.action, "open");
});

test("further misses comment on the open issue", () => {
  const decision = decideSelectionMiss({run, openIssue: {number: 41}, failures: [{lane: "unit", test: "lib/a.test.js"}],
    range: range(1)});
  assert.deepEqual([decision.action, decision.issue], ["comment", 41]);
});

test("a test some commit selected, or a full selection, is no miss", () => {
  const failures = [{lane: "unit", test: "lib/a.test.js"}, {lane: "emulator", test: "test/rules/b.rules.test.cjs"}];
  const caught = decideSelectionMiss({run, openIssue: {number: 41}, failures,
    range: range(2, {unit: ["lib/a.test.js"], emulatorMode: "full"})});
  assert.equal(caught.action, "none");
  assert.match(caught.reason, /every failing test was selected/u);
});

test("no failures, or no commit since the last green nightly, reports nothing", () => {
  assert.deepEqual(decideSelectionMiss({run, openIssue: null, failures: [], range: range(1)}),
    {action: "none", reason: "no Functions test failed"});
  assert.deepEqual(decideSelectionMiss({run, openIssue: null, failures: [{lane: "unit", test: "lib/a.test.js"}], range: range(0)}),
    {action: "none", reason: "no commit since the last green nightly"});
  assert.throws(() => decideSelectionMiss({run: {...run, head_sha: "main"}, openIssue: null, failures: [], range: range(0)}),
    /names its commit/u);
});

test("an unknown or distant green nightly says only the newest commits were checked", () => {
  const decision = decideSelectionMiss({run, openIssue: null, failures: [{lane: "unit", test: "lib/a.test.js"}],
    range: range(2, {base: null, truncated: true})});
  assert.match(decision.body, /the newest 2 up to ffffffff/u);
  assert.match(decision.body, new RegExp(`older than ${COMMIT_LIMIT} commits or unknown, so only the newest 2 were checked`, "u"));
});

test("selecting the union of several changes' paths selects exactly the union of their selections", () => {
  // One case per selector branch: an import, an unbounded read's broad match,
  // a bounded read, a data input, a functions/ data file, a contract, docs that
  // no test reads, and a shared input that selects everything.
  const dependency = (resolved) => ({module: `./${resolved}`, resolved, coreModule: false, couldNotResolve: false});
  const listed = ["lib/a/service.test.js", "lib/b/reader.test.js", "lib/c/broad.test.js", "test/data.test.cjs"];
  const modules = [
    {source: "src/a/service.test.ts", dependencies: [dependency("src/a/service.ts")]},
    {source: "src/a/service.ts", dependencies: []},
    {source: "src/b/reader.test.ts", dependencies: []},
    {source: "src/c/broad.test.ts", dependencies: []},
    {source: "test/data.test.cjs", dependencies: []},
  ];
  const sources = {
    "src/b/reader.test.ts": "import fs from \"node:fs\";\nfs.readFileSync(\"../tool/harness/component_graph.json\");",
    "src/c/broad.test.ts": "import fs from \"node:fs\";\nconst d = \"website\";\nfs.readFileSync(name);",
    "test/data.test.cjs": "const indexes = require(\"../../firestore.indexes.json\"); const f = \"sample.json\";",
  };
  const select = (changedPaths) => selectEmulatorTests({changedPaths, listed, modules, readSource: (file) => sources[file] ?? ""});
  const pool = [["functions/src/a/service.ts"], ["tool/harness/component_graph.json"], ["website/src/app.ts"],
    ["firestore.indexes.json"], ["functions/test/fixtures/sample.json"], ["docs/guide.md"], ["contracts/x.json"],
    ["functions/package.json"]];
  for (let mask = 1; mask < 2 ** pool.length; mask++) {
    const changes = pool.filter((_, index) => mask & (1 << index));
    const each = changes.map((change) => select(change));
    const expected = each.some(({mode}) => mode === "full") ? listed :
      listed.filter((test) => each.some(({tests}) => tests.includes(test)));
    const union = unionSelection(select, changes);
    assert.deepEqual(union.mode === "full" ? listed : union.tests, expected, JSON.stringify(changes));
  }
  // The fixture reaches every branch, so the property is not vacuous.
  assert.deepEqual(select(pool[0]).tests, ["lib/a/service.test.js"]);
  assert.deepEqual(select(pool[1]).tests, ["lib/b/reader.test.js"]);
  assert.deepEqual(select(pool[2]).tests, ["lib/c/broad.test.js"]);
  assert.deepEqual(select(pool[3]).tests, ["test/data.test.cjs"]);
  assert.deepEqual(select(pool[4]).tests, ["test/data.test.cjs"]);
  assert.deepEqual(select(pool[5]).tests, []);
  assert.equal(select(pool[7]).mode, "full");
});

test("the selection-miss job reads only main's failed nightlies and can only write issues", () => {
  const workflow = fs.readFileSync(new URL("../../.github/workflows/main-red-alert.yml", import.meta.url), "utf8");
  assert.match(workflow, /workflow_run:\n\s+workflows: \[CI\]\n\s+types: \[completed\]\n\s+branches: \[main\]/u);
  assert.match(workflow, /^permissions: \{\}$/mu);
  const job = workflow.slice(workflow.indexOf("\n  selection-miss:\n"));
  assert.ok(job.length > 1, "main-red-alert.yml has a selection-miss job");
  // A failed nightly only, as the resolve job reports it: through workflow_run, or the
  // Scheduled run watchdog's dispatch for a GITHUB_TOKEN-dispatched nightly (26 Nov 2026).
  assert.ok(job.includes("needs: resolve\n    if: ${{ needs.resolve.outputs.proceed == 'true' && " +
    "needs.resolve.outputs.head_branch == 'main' && needs.resolve.outputs.nightly == 'true' && " +
    "needs.resolve.outputs.conclusion == 'failure' }}"), "selection-miss runs on a failed nightly only");
  assert.match(job, /permissions:\n\s+actions: read\n\s+contents: read\n\s+issues: write\n/u);
  assert.doesNotMatch(job, /contents: write|pull-requests: write|actions: write/u);
  assert.match(job, /ref: \$\{\{ needs\.resolve\.outputs\.head_sha \}\}/u);
  assert.match(job, /RUN_ID: \$\{\{ needs\.resolve\.outputs\.run_id \}\}/u);
  assert.match(job, /node tool\/ci\/selection_miss_report\.mjs/u);
  // The nightly keeps the unit report this reads; the emulator lane already keeps its evidence.
  const functions = fs.readFileSync(new URL("../../.github/workflows/functions-ci.yml", import.meta.url), "utf8");
  assert.match(functions, /CATCH_UNIT_TEST_JUNIT_PATH: \$\{\{ inputs\.mode == 'nightly' &&/u);
  assert.match(functions, /name: functions-unit-junit-\$\{\{ github\.run_id \}\}-\$\{\{ github\.run_attempt \}\}/u);
  const rules = fs.readFileSync(new URL("../../.github/workflows/firestore-rules-ci.yml", import.meta.url), "utf8");
  assert.match(rules, /name: backend-integration-execution-\$\{\{ github\.run_id \}\}-\$\{\{ github\.run_attempt \}\}-/u);
});


test("a failed nightly's window starts at the last green nightly, scheduled or dispatched, never a plain full dispatch", () => {
  const failed = {event: "workflow_dispatch", display_title: "CI nightly", created_at: "2026-11-28T02:40:00Z", head_sha: "f".repeat(40)};
  const greens = [
    {id: 4, event: "workflow_dispatch", display_title: "CI", created_at: "2026-11-27T15:00:00Z", head_sha: "d".repeat(40)},
    {id: 3, event: "workflow_dispatch", display_title: "CI nightly", created_at: "2026-11-27T02:40:00Z", head_sha: "c".repeat(40)},
    {id: 2, event: "schedule", display_title: "CI", created_at: "2026-11-25T09:00:00Z", head_sha: "b".repeat(40)},
  ];
  const all = () => true;
  assert.equal(lastGreenNightly({greens, nightly: failed, isAncestor: all}).id, 3);
  // A commit main no longer holds is skipped, back to the last green scheduled nightly.
  assert.equal(lastGreenNightly({greens, nightly: failed, isAncestor: (sha) => sha !== "c".repeat(40)}).id, 2);
  // A scheduled nightly that failed reads the same window as a dispatched one.
  assert.equal(lastGreenNightly({greens, nightly: {...failed, event: "schedule", display_title: "CI"}, isAncestor: all}).id, 3);
  assert.equal(lastGreenNightly({greens: greens.slice(0, 1), nightly: failed, isAncestor: all}), null);
});
