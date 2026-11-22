import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  DEFAULT_GRACE_HOURS,
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

test("a prod run is never dispatched; only dev-only or read-only runs are", () => {
  // Data Validation is the one dispatch that names prod: it only reads Firestore.
  for (const entry of TARGETS) {
    assert.ok(entry.dispatch?.environment !== "prod" || entry.id === "data-validation", entry.id);
  }
  assert.deepEqual(target("deploy-backend").dispatch, {environment: "dev"});
  assert.deepEqual(target("deploy-backend").ask, {environment: "prod"});
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
    assert.equal(decision.report, null);
    assert.equal(decision.checks[0].status, "started");
  }
});

test("a missing dev or read-only run is dispatched once and recorded", () => {
  const now = at("2026-11-22T23:30:00Z");
  const decision = decide({now, graceHours: 3, repository, runs: {"data-validation": [run("2026-11-21T20:14:00Z")]},
    records: new Set(), targets: only("data-validation")});
  assert.deepEqual(decision.dispatches, [{target: "data-validation", workflow: "data-validation.yml",
    inputs: {environment: "prod", max_docs: "5000", fail_on_warning: "false"}}]);
  assert.match(decision.report, /no run started between 2026-11-22T20:13:00\.000Z and 2026-11-22T23:13:00\.000Z/u);
  const records = recordsFrom([decision.report]);
  assert.deepEqual([...records], ["data-validation@2026-11-22T20:13:00.000Z"]);
  // The next hourly check finds the record and does nothing more.
  const again = decide({now: now + 60 * 60 * 1000, graceHours: 3, repository,
    runs: {"data-validation": [run("2026-11-21T20:14:00Z")]}, records, targets: only("data-validation")});
  assert.deepEqual(again.dispatches, []);
  assert.equal(again.report, null);
  assert.equal(again.checks[0].action, "already_handled");
});

test("a missing backend deploy dispatches dev only and asks the owner for prod", () => {
  const decision = decide({now: at("2026-11-23T00:30:00Z"), graceHours: 3, repository, runs: {"deploy-backend": []},
    records: new Set(), targets: only("deploy-backend")});
  assert.deepEqual(decision.dispatches.map((entry) => entry.inputs), [{environment: "dev"}]);
  assert.match(decision.report, /Dispatched now \(dev-only or read-only\): `gh workflow run backend-deploy\.yml --repo example-org\/example-repo --ref main -f environment=dev`/u);
  assert.match(decision.report, /Not dispatched \(prod\)\. To run it: `gh workflow run backend-deploy\.yml --repo example-org\/example-repo --ref main -f environment=prod`/u);
  assert.match(decision.report, /"actions":\["dispatched","asked"\]/u);
});

test("a nightly that has not started by its deadline counts as unknown, never green (C5)", () => {
  // A push run on main after 02:23 is not the nightly.
  const runs = {"nightly-ci": [run("2026-11-22T03:10:00Z", "push"), run("2026-11-21T02:30:00Z")]};
  const decision = decide({now: at("2026-11-22T05:30:00Z"), graceHours: 3, repository, runs, records: new Set(),
    targets: only("nightly-ci")});
  assert.equal(decision.checks[0].status, "unknown");
  assert.match(decision.report, /counts as \*\*unknown\*\*, not green/u);
  assert.deepEqual(decision.dispatches.map((entry) => entry.inputs), [{full: "true"}]);
  // Still unknown after it has been handled, until a run starts.
  const later = decide({now: at("2026-11-22T06:30:00Z"), graceHours: 3, repository, runs,
    records: recordsFrom([decision.report]), targets: only("nightly-ci")});
  assert.equal(later.checks[0].status, "unknown");
  assert.equal(later.report, null);
});

test("nothing is owed while an occurrence is inside its grace period", () => {
  const decision = decide({now: at("2026-11-22T21:30:00Z"), graceHours: 3, repository,
    runs: {"deploy-backend": [run("2026-11-21T21:15:00Z")]}, records: new Set(), targets: only("deploy-backend")});
  assert.equal(decision.checks[0].expected, "2026-11-21T21:13:00.000Z");
  assert.equal(decision.checks[0].status, "started");
  assert.equal(decision.report, null);
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
