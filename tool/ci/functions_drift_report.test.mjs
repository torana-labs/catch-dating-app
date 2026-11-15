import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {GRACE_MS, ISSUE_TITLE, decideIssue, findDrift, functionName} from "./functions_drift_report.mjs";

const recordedAt = "2026-11-16T02:00:00Z";
const record = (functions = {admin: {adminA: "h1", adminB: "h2"}, events: {onEvent: "h3"}}, extra = {}) => ({
  sha: "a".repeat(40), createdAt: recordedAt,
  payload: {version: 2, toolchain: {}, codebases: Object.fromEntries(Object.entries(functions)
    .map(([codebase, names]) => [codebase, {hash: "c", functions: names}]))}, ...extra});
const fn = (name, minutesAfter = -30) => ({name: `projects/p/locations/asia-south1/functions/${name}`,
  updateTime: new Date(Date.parse(recordedAt) + minutesAfter * 60_000).toISOString()});
const runUrl = "https://example.test/run/1";

test("live Functions are named by their resource's last segment", () => {
  assert.equal(functionName("projects/p/locations/asia-south1/functions/adminA"), "adminA");
});

test("dev matching the record is clean; unlisted live Functions are not drift", () => {
  const drift = findDrift({live: [fn("adminA"), fn("adminB"), fn("onEvent"), fn("environmentOnly", 60)], record: record()});
  assert.deepEqual([drift.status, drift.missing, drift.changed, drift.recorded], ["clean", [], [], 3]);
  // An update inside the grace window (the deploy itself) is not drift either.
  assert.equal(findDrift({live: [fn("adminA", GRACE_MS / 60_000 - 1), fn("adminB"), fn("onEvent")], record: record()}).status, "clean");
});

test("a missing Function or one updated after the record is drift", () => {
  const drift = findDrift({live: [fn("adminA", 120), fn("onEvent")], record: record()});
  assert.equal(drift.status, "drift");
  assert.deepEqual(drift.missing, ["adminB"]);
  assert.deepEqual(drift.changed.map(({name}) => name), ["adminA"]);
});

test("no record, or a record from before per-Function hashes, is unknown, not drift", () => {
  assert.equal(findDrift({live: [], record: null}).status, "unknown");
  const old = findDrift({live: [], record: {sha: "b".repeat(40), createdAt: recordedAt, payload: {version: 1, codebases: {admin: {hash: "c"}}}}});
  assert.deepEqual([old.status, old.reason], ["unknown", "the newest record (bbbbbbbb) predates per-Function hashes"]);
  // GitHub may hand the payload back as a JSON string.
  const asString = record();
  asString.payload = JSON.stringify(asString.payload);
  assert.equal(findDrift({live: [fn("adminA"), fn("adminB"), fn("onEvent")], record: asString}).status, "clean");
});

test("one issue: opened on drift, commented on further drift, closed when clean", () => {
  const drift = findDrift({live: [fn("adminA", 120), fn("onEvent")], record: record()});
  const opened = decideIssue({drift, openIssue: null, runUrl});
  assert.deepEqual([opened.action, opened.title], ["open", ISSUE_TITLE]);
  assert.match(opened.body, /\*\*Missing on dev\*\* \(1\):\n- `adminB`/u);
  assert.match(opened.body, /\*\*Updated after the record\*\* \(1\):\n- `adminA` at /u);
  assert.match(opened.body, /run Deploy backend for dev with `full`/u);
  assert.match(opened.body, /\n\n---\n_Posted by the Functions drift workflow/u);
  assert.deepEqual(decideIssue({drift, openIssue: {number: 9}, runUrl}).action, "comment");
  const clean = findDrift({live: [fn("adminA"), fn("adminB"), fn("onEvent")], record: record()});
  assert.deepEqual([decideIssue({drift: clean, openIssue: {number: 9}, runUrl}).action,
    decideIssue({drift: clean, openIssue: {number: 9}, runUrl}).issue], ["close", 9]);
  assert.equal(decideIssue({drift: clean, openIssue: null, runUrl}).action, "none");
  assert.equal(decideIssue({drift: findDrift({live: [], record: null}), openIssue: {number: 9}, runUrl}).action, "none");
});

test("a long drift list is capped in the issue body", () => {
  const names = Object.fromEntries(Array.from({length: 60}, (_, index) => [`f${index}`, "h"]));
  const drift = findDrift({live: [], record: record({admin: names})});
  const {body} = decideIssue({drift, openIssue: null, runUrl});
  assert.match(body, /\*\*Missing on dev\*\* \(60\)/u);
  assert.match(body, /- …and 10 more/u);
});

test("the workflow is weekly, report-only, read-only on dev and creates no deployment", () => {
  const workflow = fs.readFileSync(new URL("../../.github/workflows/functions-drift.yml", import.meta.url), "utf8");
  assert.match(workflow, /schedule:\n\s+- cron: "\d+ \d+ \* \* \d"/u);
  assert.match(workflow, /^permissions: \{\}$/mu);
  assert.match(workflow, /environment:\n\s+name: dev\n\s+deployment: false/u);
  assert.match(workflow, /contents: read\n\s+id-token: write\n\s+issues: write/u);
  assert.doesNotMatch(workflow, /contents: write|deployments: write|actions: write/u);
  assert.match(workflow, /node tool\/ci\/functions_drift_report\.mjs/u);
  assert.match(workflow, /github\.ref == 'refs\/heads\/main'/u);
});
