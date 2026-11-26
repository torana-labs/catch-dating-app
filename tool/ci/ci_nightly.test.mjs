import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";
import {NIGHTLY_TITLE, isNightlyRun, nightlyMarker, nightlyRuns, nightlyWake} from "./ci_nightly.mjs";

const script = fileURLToPath(new URL("./ci_nightly.mjs", import.meta.url));
const workflow = (name) => fs.readFileSync(new URL(`../../.github/workflows/${name}`, import.meta.url), "utf8");
const repository = "example-org/example-repo";
const at = (iso) => Date.parse(iso);
/** The workflow_run payload of a completed CI run. */
const ciRun = (event, extra = {}) => ({event, head_branch: "main", head_repository: {full_name: repository}, ...extra});

test("each kind of wake: only main's own push CI and the cron can dispatch, and only from 02:00", () => {
  const now = at("2026-11-27T02:30:00Z");
  const wake = (event, workflowRun) => nightlyWake({event, workflowRun, repository, artifacts: [], now});
  assert.deepEqual(wake("workflow_run", ciRun("push")),
    {dispatch: true, reason: "today's nightly has not been dispatched yet", day: "2026-11-27", marker: "ci-nightly-2026-11-27"});
  assert.equal(wake("schedule").dispatch, true);
  for (const [label, workflowRun] of [
    ["a pull request's CI", ciRun("pull_request")],
    ["a merge-queue group's CI", ciRun("merge_group")],
    ["the nightly's own CI run", ciRun("workflow_dispatch", {display_title: NIGHTLY_TITLE})],
    ["another dispatch's CI run", ciRun("workflow_dispatch")],
    ["a CI run from before the switch", ciRun("schedule")],
    ["a fork's branch called main", ciRun("push", {head_repository: {full_name: "someone/fork"}})],
    ["a push to another branch", ciRun("push", {head_branch: "release"})],
    ["a payload with no run", undefined],
  ]) assert.equal(wake("workflow_run", workflowRun).dispatch, false, label);
  // Before 02:00 UTC no wake dispatches: the day's nightly validates the day's main.
  assert.deepEqual(nightlyWake({event: "workflow_run", workflowRun: ciRun("push"), repository, artifacts: [],
    now: at("2026-11-27T01:59:59Z")}).reason, "before 2:00 UTC");
  // A nightly by hand is dispatched on ci.yml itself, never through this gate.
  for (const event of ["workflow_dispatch", "push", "pull_request"]) {
    assert.throws(() => wake(event), /Unexpected event/u, event);
  }
});

test("a simulated day: the cron and many push-CI wakes dispatch exactly one nightly", () => {
  for (const order of [["cron-first"], ["push-first"], ["lost-marker"]]) {
    const artifacts = [];
    const dispatchedRuns = [];
    const dispatches = [];
    const wakes = [
      ["workflow_run", "2026-11-27T00:40:00Z", ciRun("push")],
      ["workflow_run", "2026-11-27T01:55:00Z", ciRun("pull_request")],
      ...(order[0] === "cron-first" ? [["schedule", "2026-11-27T02:23:00Z"]] : []),
      ["workflow_run", "2026-11-27T02:41:00Z", ciRun("push")],
      ["workflow_run", "2026-11-27T03:10:00Z", ciRun("workflow_dispatch", {display_title: NIGHTLY_TITLE})],
      ["workflow_run", "2026-11-27T05:02:00Z", ciRun("push")],
      // The fallback cron fires 7.5-10.6 hours late here.
      ["schedule", "2026-11-27T11:47:00Z"],
      ["workflow_run", "2026-11-27T23:59:00Z", ciRun("push")],
    ];
    for (const [event, iso, workflowRun] of wakes) {
      const wake = nightlyWake({event, workflowRun, repository, artifacts, dispatchedRuns, now: at(iso)});
      if (!wake.dispatch) continue;
      dispatches.push(iso);
      dispatchedRuns.push({id: dispatches.length, event: "workflow_dispatch", display_title: NIGHTLY_TITLE, created_at: iso});
      // A marker upload that fails after the dispatch still leaves the run to find.
      if (order[0] !== "lost-marker") artifacts.push({name: wake.marker, expired: false});
    }
    assert.deepEqual(dispatches, [order[0] === "cron-first" ? "2026-11-27T02:23:00Z" : "2026-11-27T02:41:00Z"], order[0]);
  }
  // The next UTC day owes its own nightly; yesterday's marker and run do not count.
  assert.equal(nightlyWake({event: "workflow_run", workflowRun: ciRun("push"), repository,
    artifacts: [{name: "ci-nightly-2026-11-27", expired: false}],
    dispatchedRuns: [{id: 1, event: "workflow_dispatch", display_title: NIGHTLY_TITLE, created_at: "2026-11-27T02:41:00Z"}],
    now: at("2026-11-28T02:05:00Z")}).dispatch, true);
  // Another dispatch of ci.yml today (a full run by hand) is not the nightly.
  assert.equal(nightlyWake({event: "schedule", repository, artifacts: [],
    dispatchedRuns: [{id: 2, event: "workflow_dispatch", display_title: "CI", created_at: "2026-11-28T02:01:00Z"}],
    now: at("2026-11-28T02:23:00Z")}).dispatch, true);
  assert.equal(nightlyMarker("2026-11-28"), "ci-nightly-2026-11-28");
});

test("isNightlyRun: the dispatched nightly and the scheduled ones from before, nothing else", () => {
  assert.equal(isNightlyRun({event: "workflow_dispatch", display_title: "CI nightly"}), true);
  assert.equal(isNightlyRun({event: "schedule", display_title: "CI"}), true);
  for (const run of [{event: "workflow_dispatch", display_title: "CI"}, {event: "push", display_title: "CI nightly"},
    {event: "pull_request", display_title: "CI nightly"}, {event: "merge_group", display_title: "CI"}, null, undefined]) {
    assert.equal(isNightlyRun(run), false, JSON.stringify(run));
  }
});

test("nightlyRuns reads dispatched and scheduled runs, keeps only nightlies, newest first", () => {
  const asked = [];
  const runs = nightlyRuns((endpoint) => {
    asked.push(endpoint);
    return endpoint.includes("event=schedule") ?
      {workflow_runs: [{id: 1, event: "schedule", created_at: "2026-11-25T09:00:00Z"}]} :
      {workflow_runs: [{id: 3, event: "workflow_dispatch", display_title: "CI nightly", created_at: "2026-11-27T02:41:00Z"},
        {id: 2, event: "workflow_dispatch", display_title: "CI", created_at: "2026-11-26T12:00:00Z"}]};
  }, repository, "status=success&per_page=2");
  assert.deepEqual(runs.map((run) => run.id), [3, 1]);
  assert.deepEqual(asked, [
    `repos/${repository}/actions/workflows/ci.yml/runs?branch=main&event=workflow_dispatch&status=success&per_page=2`,
    `repos/${repository}/actions/workflows/ci.yml/runs?branch=main&event=schedule&status=success&per_page=2`,
  ]);
  assert.equal(nightlyRuns(() => ({}), repository).length, 0);
});

test("ci-nightly.yml: the cron fallback and main's push CI wake one gated job; only the dispatch job may write, and only the nightly", () => {
  const source = workflow("ci-nightly.yml");
  assert.match(source, /^on:\n  schedule:\n(?:    #.*\n)?    - cron: "23 2 \* \* \*"\n  workflow_run:\n    workflows: \[CI\]\n    types: \[completed\]\n    branches: \[main\]\n\n/mu);
  assert.doesNotMatch(source, /workflow_dispatch:|pull_request|push:/u);
  assert.match(source, /^permissions: \{\}$/mu);
  assert.match(source, /^concurrency:\n  # .*\n  group: ci-nightly\n  cancel-in-progress: false$/mu);
  assert.match(source, /github\.event\.workflow_run\.event == 'push' &&\n\s+github\.event\.workflow_run\.head_repository\.full_name == github\.repository &&\n\s+github\.event\.workflow_run\.head_branch == 'main'/u);
  const jobs = source.slice(source.indexOf("\njobs:\n")).split(/\n  (?=[a-z-]+:\n)/u).slice(1);
  assert.deepEqual(jobs.map((block) => block.split(":")[0]), ["gate", "dispatch"]);
  const [gate, dispatch] = jobs;
  assert.match(gate, /permissions:\n(?:\s+#.*\n)?\s+actions: read\n\s+contents: read\n\s+outputs:/u);
  assert.match(gate, /run: node tool\/ci\/ci_nightly\.mjs\n/u);
  assert.match(dispatch, /needs: gate\n\s+if: needs\.gate\.outputs\.dispatch == 'true'\n/u);
  assert.match(dispatch, /permissions:\n(?:\s+#.*\n)?\s+actions: write\n\s+steps:/u);
  assert.equal(source.match(/actions: write/gu).length, 1);
  // The target workflow, ref and input are fixed in the command, never taken from an event.
  const commands = dispatch.split("\n").filter((line) => line.includes("gh workflow run"));
  assert.deepEqual(commands.map((line) => line.trim()), ['run: gh workflow run ci.yml --repo "$REPOSITORY" --ref main -f nightly=true']);
  assert.doesNotMatch(dispatch, /github\.event\./u);
  // The day's marker is the gate's, and is uploaded only after the dispatch.
  assert.ok(dispatch.indexOf("gh workflow run") < dispatch.indexOf("actions/upload-artifact"));
  assert.match(dispatch, /name: \$\{\{ needs\.gate\.outputs\.marker \}\}\n/u);
});

test("ci.yml has no cron of its own, takes `nightly`, titles the nightly, and keys every nightly-only path on it", () => {
  const ci = workflow("ci.yml");
  assert.doesNotMatch(ci, /schedule/u);
  assert.match(ci, /^  workflow_dispatch:\n    inputs:\n      nightly:\n        description: .*\n        required: false\n        type: boolean\n        default: false\n/mu);
  assert.match(ci, /github\.event_name == 'workflow_dispatch' && inputs\.nightly && 'CI nightly' \|\| 'CI' \}\}/u);
  // The plan runs the nightly in full; nightly and base_sha never combine.
  assert.match(ci, /REQUEST_FULL: \$\{\{ inputs\.nightly \|\| inputs\.full \}\}/u);
  assert.match(ci, /if \[\[ "\$NIGHTLY" == "true" \]\]; then\n(?:.*\n){1,6}?\s+event_mode="nightly"\n\s+base_sha="\$\{HEAD_SHA\}\^"\n\s+full_flag=\(--full\)/u);
  // Visual reports, the semantic gates and Required CI's check of them, and the capture probe.
  assert.equal(ci.split("visual_report: ${{ github.event_name == 'workflow_dispatch' && (inputs.nightly || inputs.full) }}").length - 1, 3);
  assert.match(ci, /\(github\.event_name == 'merge_group' \|\| \(github\.event_name == 'workflow_dispatch' && inputs\.nightly\) \|\|/u);
  assert.match(ci, /NIGHTLY: \$\{\{ github\.event_name == 'workflow_dispatch' && inputs\.nightly \}\}\n/u);
  assert.match(ci, /"\$\{EVENT_NAME:-\}" == merge_group \|\| "\$\{NIGHTLY:-\}" == true \|\|/u);
  assert.match(ci, /automatic_source_sha: \$\{\{ needs\.plan\.outputs\.source_sha \}\}\n\s+nightly: \$\{\{ github\.event_name == 'workflow_dispatch' && inputs\.nightly \}\}\n/u);
  const captures = workflow("marketing-captures.yml");
  assert.match(captures, /if: \$\{\{ inputs\.nightly && inputs\.automatic_source_sha != '' \}\}/u);
  assert.match(captures, /CAPTURE_NIGHTLY: \$\{\{ inputs\.nightly \|\| false \}\}/u);
  assert.doesNotMatch(captures, /'schedule'/u);
});

test("the CLI reads the day's marker and dispatched runs and writes its outputs", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ci-nightly-"));
  try {
    const bin = path.join(dir, "bin");
    fs.mkdirSync(bin);
    fs.writeFileSync(path.join(bin, "gh"), `#!/usr/bin/env node
const endpoint = process.argv.at(-1);
require("node:fs").appendFileSync(${JSON.stringify(path.join(dir, "calls"))}, endpoint + "\\n");
const exists = process.env.FAKE_MARKER === "1";
console.log(JSON.stringify(endpoint.includes("/artifacts?") ?
  {artifacts: exists ? [{name: endpoint.match(/name=([^&]+)/)[1], expired: false}] : []} : {workflow_runs: []}));
`, {mode: 0o755});
    const event = path.join(dir, "event.json");
    fs.writeFileSync(event, JSON.stringify({workflow_run: ciRun("push")}));
    const run = (marker) => {
      const output = path.join(dir, `out-${marker}`);
      const result = spawnSync(process.execPath, [script], {encoding: "utf8",
        env: {...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}`, GITHUB_REPOSITORY: repository,
          GITHUB_EVENT_NAME: "workflow_run", GITHUB_EVENT_PATH: event, GITHUB_OUTPUT: output, FAKE_MARKER: marker}});
      assert.equal(result.status, 0, result.stderr);
      return fs.readFileSync(output, "utf8");
    };
    const day = new Date().toISOString().slice(0, 10);
    const hour = new Date().getUTCHours();
    assert.match(run("1"), new RegExp(`^dispatch=false\\nday=${day}\\nmarker=ci-nightly-${day}\\nreason=`, "u"));
    assert.match(run("0"), new RegExp(`^dispatch=${hour >= 2}\\n`, "u"));
    const calls = fs.readFileSync(path.join(dir, "calls"), "utf8").trim().split("\n");
    assert.deepEqual(calls.slice(0, 2), [
      `repos/${repository}/actions/artifacts?name=ci-nightly-${day}&per_page=100`,
      `repos/${repository}/actions/workflows/ci.yml/runs?branch=main&event=workflow_dispatch&created=%3E%3D${day}&per_page=100`,
    ]);
  } finally {
    fs.rmSync(dir, {recursive: true, force: true});
  }
});
