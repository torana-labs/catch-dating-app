#!/usr/bin/env node
// The CI nightly, once per UTC day (owner decision, 26 Nov 2026). GitHub
// starts this repository's scheduled runs 7.5-10.6 hours late, so
// .github/workflows/ci-nightly.yml wakes after each push CI run on main as
// well as on its fallback cron, and dispatches ci.yml on main with
// `nightly: true` from the first wake of the day that passes this gate. That
// helper is the only workflow allowed to dispatch the nightly; the nightly
// run is titled "CI nightly", and every nightly-only behaviour downstream asks
// isNightlyRun rather than looking for a schedule event.
//
//   node tool/ci/ci_nightly.mjs
//
// Needs GH_TOKEN, GITHUB_REPOSITORY, GITHUB_EVENT_NAME and GITHUB_EVENT_PATH;
// writes dispatch=true|false, day=<YYYY-MM-DD>, marker=<artifact name> and
// reason=<text> to GITHUB_OUTPUT. Reads the Actions API, writes nothing.
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import {fileURLToPath} from "node:url";
import {decideDailyRun} from "./daily_once_gate.mjs";

/** ci.yml's run-name for the nightly; workflow_run payloads and run listings carry it as display_title. */
export const NIGHTLY_TITLE = "CI nightly";
/** No wake dispatches before this UTC hour: the fallback cron is 02:23, and the nightly validates the day's main. */
export const NIGHTLY_FROM_HOUR = 2;

/**
 * Whether a CI run is the nightly: a dispatched run titled "CI nightly", or a
 * scheduled run from before 26 Nov 2026, when ci.yml had its own cron.
 */
export function isNightlyRun(run) {
  return run?.event === "schedule" || (run?.event === "workflow_dispatch" && run?.display_title === NIGHTLY_TITLE);
}

/**
 * Nightly CI runs on main, newest first, from the runs API: the dispatched
 * nightlies and the scheduled ones from before 26 Nov 2026.
 *
 * @param {(endpoint: string) => {workflow_runs?: object[]}} listRuns Reads one runs API endpoint.
 * @param {string} repository owner/name.
 * @param {string} [query] Extra query parameters, e.g. "status=success&per_page=30".
 */
export function nightlyRuns(listRuns, repository, query = "per_page=30") {
  const runs = ["workflow_dispatch", "schedule"].flatMap((event) =>
    listRuns(`repos/${repository}/actions/workflows/ci.yml/runs?branch=main&event=${event}&${query}`).workflow_runs ?? []);
  const limit = Number(new URLSearchParams(query).get("per_page") ?? 30);
  return runs.filter(isNightlyRun).sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at))
    .slice(0, limit);
}

/** The artifact the dispatching job uploads; its existence means the day's nightly was dispatched. */
export const nightlyMarker = (day) => `ci-nightly-${day}`;

/** The UTC day of a time, as YYYY-MM-DD. */
export const utcDay = (now) => new Date(now).toISOString().slice(0, 10);

/**
 * Whether this wake dispatches the nightly. Pure, so every event is testable.
 *
 * @param {object} input
 * @param {string} input.event GITHUB_EVENT_NAME of ci-nightly.yml.
 * @param {object} [input.workflowRun] The workflow_run payload's run, for a workflow_run wake.
 * @param {string} input.repository owner/name.
 * @param {Array<{name:string, expired:boolean}>} input.artifacts The day's marker artifacts.
 * @param {Array<object>} [input.dispatchedRuns] ci.yml's dispatched runs on main created today; a
 *   nightly among them also means today's is done, in case a marker upload failed.
 * @param {number} input.now Milliseconds since the epoch.
 * @returns {{dispatch:boolean, reason:string, day:string, marker:string}}
 */
export function nightlyWake({event, workflowRun, repository, artifacts, dispatchedRuns = [], now}) {
  const day = utcDay(now);
  const marker = nightlyMarker(day);
  const skip = (reason) => ({dispatch: false, reason, day, marker});
  if (event === "workflow_run") {
    // Only main's own push CI wakes it: never a pull-request run (a fork's
    // branch can also be called main), the nightly's own run, or a dispatch.
    if (workflowRun?.event !== "push") return skip(`woken by a ${workflowRun?.event ?? "unknown"} CI run`);
    if (workflowRun.head_branch !== "main" || workflowRun.head_repository?.full_name !== repository) {
      return skip("woken by a CI run that is not this repository's main");
    }
  } else {
    // No workflow_dispatch: a nightly by hand is dispatched on ci.yml itself.
    assert.equal(event, "schedule", `Unexpected event ${event}`);
  }
  const started = dispatchedRuns.find((run) => isNightlyRun(run) && utcDay(Date.parse(run.created_at)) === day);
  if (started) return skip(`today's nightly already started (run ${started.id})`);
  const named = artifacts.filter((artifact) => artifact.name === marker);
  const decision = decideDailyRun({event, artifacts: named, now, notBeforeHour: NIGHTLY_FROM_HOUR});
  return {dispatch: decision.run, reason: decision.run ? "today's nightly has not been dispatched yet" : decision.reason,
    day, marker};
}

function main() {
  const repository = process.env.GITHUB_REPOSITORY;
  assert.match(repository ?? "", /^[\w.-]+\/[\w.-]+$/u, "GITHUB_REPOSITORY is required");
  const event = process.env.GITHUB_EVENT_NAME;
  const payload = process.env.GITHUB_EVENT_PATH ? JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, "utf8")) : {};
  const now = Date.now();
  const marker = nightlyMarker(utcDay(now));
  const listed = spawnSync("gh", ["api", `repos/${repository}/actions/artifacts?name=${marker}&per_page=100`],
    {encoding: "utf8", maxBuffer: 16 * 1024 * 1024});
  assert.equal(listed.status, 0, listed.stderr);
  const artifacts = JSON.parse(listed.stdout).artifacts ?? [];
  const runs = spawnSync("gh", ["api",
    `repos/${repository}/actions/workflows/ci.yml/runs?branch=main&event=workflow_dispatch&created=%3E%3D${utcDay(now)}&per_page=100`],
  {encoding: "utf8", maxBuffer: 16 * 1024 * 1024});
  assert.equal(runs.status, 0, runs.stderr);
  const dispatchedRuns = JSON.parse(runs.stdout).workflow_runs ?? [];
  const wake = nightlyWake({event, workflowRun: payload.workflow_run, repository, artifacts, dispatchedRuns, now});
  console.log(`${wake.dispatch ? "Dispatch" : "Skip"}: ${wake.reason}`);
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT,
      `dispatch=${wake.dispatch}\nday=${wake.day}\nmarker=${wake.marker}\nreason=${wake.reason}\n`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
