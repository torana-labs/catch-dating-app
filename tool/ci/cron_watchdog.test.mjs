import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  DEFAULT_GRACE_HOURS,
  MAIN_RED_TITLE,
  MISSED_TITLE,
  TARGETS,
  decide,
  expectedRun,
  latestOccurrence,
  recordsFrom,
} from "./cron_watchdog.mjs";

const repository = "example-org/example-repo";
const at = (iso) => Date.parse(iso);
const run = (iso, event = "schedule") => ({created_at: iso, event});
const target = (id) => TARGETS.find((entry) => entry.id === id);
const only = (id) => [target(id)];

test("every watched cron matches its workflow's own schedule, and each has workflow_dispatch", () => {
  for (const entry of TARGETS) {
    const source = fs.readFileSync(new URL(`../../.github/workflows/${entry.workflow}`, import.meta.url), "utf8");
    const crons = [...source.matchAll(/- cron:\s*['"]([^'"]+)['"]/gu)].map((match) => match[1]);
    assert.deepEqual(crons, [entry.cron], entry.workflow);
    assert.match(source, /^\s+workflow_dispatch:/mu, entry.workflow);
    for (const name of Object.keys({...entry.dispatch, ...entry.ask})) {
      assert.match(source, new RegExp(`^\\s{6}${name}:`, "mu"), `${entry.workflow} has input ${name}`);
    }
  }
});

test("nothing that uses prod is dispatched, not even a read-only run", () => {
  for (const entry of TARGETS) assert.notEqual(entry.dispatch?.environment, "prod", entry.id);
  assert.equal(target("data-validation").dispatch, undefined);
  assert.equal(target("data-validation").ask.environment, "prod");
  assert.deepEqual(target("deploy-backend").dispatch, {environment: "dev"});
  assert.deepEqual(target("deploy-backend").ask, {environment: "prod"});
  // Only the nightly, which is about CI health, reports on the main-red issue.
  assert.deepEqual(TARGETS.filter((entry) => entry.issue === MAIN_RED_TITLE).map((entry) => entry.id), ["nightly-ci"]);
  assert.ok(TARGETS.filter((entry) => !entry.nightly).every((entry) => entry.issue === MISSED_TITLE));
});

test("the expected run is the latest occurrence whose grace period has passed", () => {
  assert.equal(new Date(latestOccurrence("13 21 * * *", at("2026-11-22T21:13:00Z"))).toISOString(), "2026-11-22T21:13:00.000Z");
  assert.equal(new Date(latestOccurrence("13 21 * * *", at("2026-11-22T21:12:59Z"))).toISOString(), "2026-11-21T21:13:00.000Z");
  // At 23:00 today's 21:13 run is still inside its 3-hour grace, so yesterday's is the one owed.
  assert.equal(new Date(expectedRun("13 21 * * *", at("2026-11-22T23:00:00Z"), 3)).toISOString(), "2026-11-21T21:13:00.000Z");
  assert.equal(new Date(expectedRun("13 21 * * *", at("2026-11-23T00:13:00Z"), 3)).toISOString(), "2026-11-22T21:13:00.000Z");
  assert.throws(() => latestOccurrence("13 21 * * 1", 0), /daily/u);
  assert.throws(() => latestOccurrence("61 21 * * *", 0), /Invalid/u);
});

test("a run that started after its occurrence is fine, whether scheduled late or dispatched", () => {
  const now = at("2026-11-23T01:00:00Z");
  for (const runs of [[run("2026-11-22T21:14:05Z")], [run("2026-11-23T00:40:00Z", "workflow_dispatch")]]) {
    const decision = decide({now, graceHours: 3, repository, runs: {"deploy-backend": runs}, records: new Set(),
      targets: only("deploy-backend")});
    assert.deepEqual(decision.dispatches, []);
    assert.deepEqual(decision.reports, {});
    assert.equal(decision.checks[0].status, "started");
  }
});

test("a missing Data Validation run is reported once for the owner, never dispatched", () => {
  const now = at("2026-11-22T23:30:00Z");
  const decision = decide({now, graceHours: 3, repository, runs: {"data-validation": [run("2026-11-21T20:14:00Z")]},
    records: new Set(), targets: only("data-validation")});
  assert.deepEqual(decision.dispatches, []);
  assert.deepEqual(Object.keys(decision.reports), [MISSED_TITLE]);
  const report = decision.reports[MISSED_TITLE];
  assert.match(report, /no run started between 2026-11-22T20:13:00\.000Z and 2026-11-22T23:13:00\.000Z/u);
  assert.match(report, /Not dispatched \(uses prod\)\. To run it: `gh workflow run data-validation\.yml --repo example-org\/example-repo --ref main -f environment=prod -f max_docs=5000 -f fail_on_warning=false`/u);
  const records = recordsFrom([report]);
  assert.deepEqual([...records], ["data-validation@2026-11-22T20:13:00.000Z"]);
  // The next hourly check finds the record and does nothing more.
  const again = decide({now: now + 60 * 60 * 1000, graceHours: 3, repository,
    runs: {"data-validation": [run("2026-11-21T20:14:00Z")]}, records, targets: only("data-validation")});
  assert.deepEqual(again.dispatches, []);
  assert.deepEqual(again.reports, {});
  assert.equal(again.checks[0].action, "already_handled");
});

test("a missing backend deploy dispatches dev only and asks the owner for prod", () => {
  const decision = decide({now: at("2026-11-23T00:30:00Z"), graceHours: 3, repository, runs: {"deploy-backend": []},
    records: new Set(), targets: only("deploy-backend")});
  assert.deepEqual(decision.dispatches.map((entry) => entry.inputs), [{environment: "dev"}]);
  assert.deepEqual(Object.keys(decision.reports), [MISSED_TITLE]);
  const report = decision.reports[MISSED_TITLE];
  assert.match(report, /Dispatched now \(dev-only\): `gh workflow run backend-deploy\.yml --repo example-org\/example-repo --ref main -f environment=dev`/u);
  assert.match(report, /Not dispatched \(uses prod\)\. To run it: `gh workflow run backend-deploy\.yml --repo example-org\/example-repo --ref main -f environment=prod`/u);
  assert.match(report, /"actions":\["dispatched","asked"\]/u);
});

test("a nightly that has not started by its deadline counts as unknown, never green (C5)", () => {
  // A push run on main after 02:23 is not the nightly.
  const runs = {"nightly-ci": [run("2026-11-22T03:10:00Z", "push"), run("2026-11-21T02:30:00Z")]};
  const decision = decide({now: at("2026-11-22T05:30:00Z"), graceHours: 3, repository, runs, records: new Set(),
    targets: only("nightly-ci")});
  assert.equal(decision.checks[0].status, "unknown");
  assert.deepEqual(Object.keys(decision.reports), [MAIN_RED_TITLE]);
  assert.match(decision.reports[MAIN_RED_TITLE], /counts as \*\*unknown\*\*, not green/u);
  assert.deepEqual(decision.dispatches.map((entry) => entry.inputs), [{full: "true"}]);
  // Still unknown after it has been handled, until a run starts.
  const later = decide({now: at("2026-11-22T06:30:00Z"), graceHours: 3, repository, runs,
    records: recordsFrom([decision.reports[MAIN_RED_TITLE]]), targets: only("nightly-ci")});
  assert.equal(later.checks[0].status, "unknown");
  assert.deepEqual(later.reports, {});
});

test("nothing is owed while an occurrence is inside its grace period", () => {
  const decision = decide({now: at("2026-11-22T21:30:00Z"), graceHours: 3, repository,
    runs: {"deploy-backend": [run("2026-11-21T21:15:00Z")]}, records: new Set(), targets: only("deploy-backend")});
  assert.equal(decision.checks[0].expected, "2026-11-21T21:13:00.000Z");
  assert.equal(decision.checks[0].status, "started");
  assert.deepEqual(decision.reports, {});
});

test("missed runs report on their own issues in one check", () => {
  const decision = decide({now: at("2026-11-23T05:40:00Z"), graceHours: 3, repository,
    runs: {"data-validation": [], "deploy-backend": [], "nightly-ci": []}, records: new Set()});
  assert.deepEqual(Object.keys(decision.reports).sort(), [MAIN_RED_TITLE, MISSED_TITLE].sort());
  assert.match(decision.reports[MISSED_TITLE], /Firestore Data Validation[\s\S]*Deploy backend/u);
  assert.doesNotMatch(decision.reports[MISSED_TITLE], /CI \(nightly\)/u);
  assert.doesNotMatch(decision.reports[MAIN_RED_TITLE], /Deploy backend|Data Validation/u);
  assert.deepEqual(decision.dispatches.map((entry) => entry.target).sort(), ["deploy-backend", "nightly-ci"]);
});

test("the grace period is configurable within a day and defaults to 3 hours", () => {
  assert.equal(DEFAULT_GRACE_HOURS, 3);
  const runs = {"deploy-backend": [run("2026-11-21T21:15:00Z")]};
  // 22:30 is past a 1-hour grace for today's 21:13 run.
  const tight = decide({now: at("2026-11-22T22:30:00Z"), graceHours: 1, repository, runs, records: new Set(),
    targets: only("deploy-backend")});
  assert.equal(tight.checks[0].status, "missing");
  for (const graceHours of [0, 24, Number.NaN]) {
    assert.throws(() => decide({now: 0, graceHours, repository, runs: {}, records: new Set()}), /graceHours/u);
  }
});

test("malformed markers record nothing", () => {
  assert.deepEqual([...recordsFrom(["<!-- cron-watchdog {bad -->", "<!-- cron-watchdog {\"target\":1} -->", null])], []);
});

test("a missed shadow read map is reported once, never dispatched", () => {
  const now = at("2026-11-23T07:00:00Z");
  const decision = decide({now, graceHours: 3, repository, runs: {"test-read-map": [run("2026-11-22T03:42:00Z")]},
    records: new Set(), targets: only("test-read-map")});
  assert.deepEqual(decision.dispatches, []);
  const report = decision.reports[MISSED_TITLE];
  assert.match(report, /Test read map \(shadow\).*no run started between 2026-11-23T03:41:00\.000Z/u);
  assert.match(report, /Report only: not dispatched/u);
  assert.doesNotMatch(report, /gh workflow run/u);
  const again = decide({now: now + 60 * 60 * 1000, graceHours: 3, repository,
    runs: {"test-read-map": [run("2026-11-22T03:42:00Z")]}, records: recordsFrom([report]), targets: only("test-read-map")});
  assert.deepEqual(again.reports, {});
});

test("a missed proof-reuse daily roll-up is reported once, never dispatched", () => {
  const now = at("2026-11-23T09:00:00Z");
  const runs = {"proof-reuse-daily": [run("2026-11-22T05:18:00Z")]};
  const decision = decide({now, graceHours: 3, repository, runs, records: new Set(), targets: only("proof-reuse-daily")});
  assert.deepEqual(decision.dispatches, []);
  const report = decision.reports[MISSED_TITLE];
  assert.match(report, /Proof reuse daily.*no run started between 2026-11-23T05:17:00\.000Z/u);
  assert.match(report, /Report only: not dispatched/u);
  assert.doesNotMatch(report, /gh workflow run/u);
  // Started on time: nothing to report.
  const ran = decide({now, graceHours: 3, repository, runs: {"proof-reuse-daily": [run("2026-11-23T05:40:00Z")]},
    records: new Set(), targets: only("proof-reuse-daily")});
  assert.deepEqual(ran.reports, {});
});

test("an occurrence from before the workflow reached main is not owed", () => {
  // test-read-map.yml reached main about 20:41 UTC on 22 Nov; the 01:09 check on
  // 23 Nov owed 22 Nov 03:41, which predates it.
  const now = at("2026-11-23T01:09:00Z");
  const before = decide({now, graceHours: 3, repository, runs: {"test-read-map": []}, records: new Set(),
    onMainBy: {"test-read-map": false}, targets: only("test-read-map")});
  assert.deepEqual(before.checks, [{target: "test-read-map", expected: "2026-11-22T03:41:00.000Z", status: "not_scheduled_yet"}]);
  assert.deepEqual(before.reports, {});
  assert.deepEqual(before.dispatches, []);
  // The first slot after it reached main is owed as usual.
  const after = decide({now: at("2026-11-23T07:00:00Z"), graceHours: 3, repository, runs: {"test-read-map": []},
    records: new Set(), onMainBy: {"test-read-map": true}, targets: only("test-read-map")});
  assert.equal(after.checks[0].status, "missing");
  assert.match(after.reports[MISSED_TITLE], /no run started between 2026-11-23T03:41:00\.000Z/u);
  // No entry means owed: a dispatch-backed target is never skipped by omission.
  const unknown = decide({now: at("2026-11-23T00:30:00Z"), graceHours: 3, repository, runs: {"deploy-backend": []},
    records: new Set(), onMainBy: {}, targets: only("deploy-backend")});
  assert.equal(unknown.dispatches.length, 1);
});

test("the watchdog also wakes after main CI, one check at a time, with unchanged permissions", () => {
  const workflow = fs.readFileSync(new URL("../../.github/workflows/cron-watchdog.yml", import.meta.url), "utf8");
  assert.match(workflow, /schedule:\n\s+# [^\n]*\n\s+- cron: "47 \* \* \* \*"/u);
  assert.match(workflow, /workflow_run:\n\s+workflows: \[CI\]\n\s+types: \[completed\]\n\s+branches: \[main\]/u);
  assert.match(workflow, /if: github\.event_name != 'workflow_run' \|\| github\.event\.workflow_run\.head_branch == 'main'/u);
  assert.match(workflow, /concurrency:\n\s+group: cron-watchdog\n\s+cancel-in-progress: false/u);
  assert.match(workflow, /^permissions: \{\}$/mu);
  const granted = [...workflow.matchAll(/^ {6}(contents|actions|issues|[a-z-]+): (read|write)$/gmu)].map((match) => `${match[1]}:${match[2]}`);
  assert.deepEqual(granted, ["contents:read", "actions:write", "issues:write"]);
  // A workflow_run wake is never a dry run and uses the default grace.
  assert.match(workflow, /DRY_RUN: \$\{\{ github\.event_name == 'workflow_dispatch' && inputs\.dry_run \}\}/u);
});
