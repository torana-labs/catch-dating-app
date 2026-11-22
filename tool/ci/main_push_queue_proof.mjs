#!/usr/bin/env node
// Finds the merge-queue run that validated a main push's exact commit, so the
// main push re-runs no validation lane and only plans.
//
// The queue merges a group as soon as its Required CI job succeeds; reporting
// lanes can still be running, and the run's own conclusion stays empty until
// they finish. Required CI succeeding is therefore the proof the queue merged
// on, and this looks for that job, not for a successful run (22 Nov 2026: a
// run-level check missed ae14a0dc's queue run while an iOS reporting build was
// still going, and its main push validated everything again).
//
// The proof stays strict: a merge_group run of ci.yml whose head is exactly the
// pushed commit, with exactly one Required CI job, that job succeeded, and it
// belongs to the run's current attempt (Required CI itself fails when the plan
// came from another attempt, so a re-run's stale success never counts). Any
// lookup failure prints nothing and the main push validates in full.
//
// Usage: node tool/ci/main_push_queue_proof.mjs --sha <sha>
// Prints the queue run id, or nothing when there is no proof.

import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";

const SHA = /^[0-9a-f]{40}$/u;
const CI_PATH = ".github/workflows/ci.yml";
const REQUIRED_JOB = "Required CI";

/**
 * Chooses the queue run whose Required CI proves this commit. Pure, so every
 * case is testable without GitHub.
 *
 * @param {object} input
 * @param {string} input.sha The pushed commit.
 * @param {Array<object>} input.runs CI workflow runs for merge_group events.
 * @param {(runId: number) => Array<object> | null} input.jobsFor The jobs of a
 *   run's latest attempt, or null when they cannot be read.
 * @returns {{runId: number | null, reason: string}}
 */
export function chooseQueueProof({sha, runs, jobsFor}) {
  assert.match(sha, SHA, "sha must be a full commit SHA");
  const candidates = runs
    .filter((run) => run.event === "merge_group" && run.head_sha === sha && run.path === CI_PATH &&
      Number.isSafeInteger(Number(run.id)) && Number(run.id) > 0)
    .sort((left, right) => Number(right.id) - Number(left.id));
  if (!candidates.length) return {runId: null, reason: "no_queue_run_for_commit"};
  let reason = "no_successful_required_ci";
  for (const run of candidates) {
    const jobs = jobsFor(Number(run.id));
    if (!Array.isArray(jobs)) {
      reason = "jobs_unreadable";
      continue;
    }
    const required = jobs.filter((job) => job?.name === REQUIRED_JOB);
    if (required.length !== 1 || required[0].conclusion !== "success") continue;
    if (Number(required[0].run_attempt) !== Number(run.run_attempt)) {
      reason = "required_ci_from_another_attempt";
      continue;
    }
    return {runId: Number(run.id), reason: "required_ci_succeeded"};
  }
  return {runId: null, reason};
}

function parseArgs(argv) {
  assert.ok(argv.length === 2 && argv[0] === "--sha", "Usage: main_push_queue_proof.mjs --sha <sha>");
  return {sha: argv[1]};
}

function ghJson(endpoint) {
  const response = spawnSync("gh", ["api", "-H", "Cache-Control: no-cache", endpoint],
    {encoding: "utf8", maxBuffer: 64 * 1024 * 1024});
  if (response.status !== 0) {
    console.error(`Could not read ${endpoint}: ${response.stderr.trim()}`);
    return null;
  }
  try {
    return JSON.parse(response.stdout);
  } catch {
    console.error(`Unreadable response from ${endpoint}`);
    return null;
  }
}

// Every job of the run's latest attempt, across pages; null if any page fails.
function latestJobs(repository, runId) {
  const jobs = [];
  for (let page = 1; page <= 10; page += 1) {
    const response = ghJson(`repos/${repository}/actions/runs/${runId}/jobs?filter=latest&per_page=100&page=${page}`);
    if (!Array.isArray(response?.jobs)) return null;
    jobs.push(...response.jobs);
    const total = Number(response.total_count);
    if (!response.jobs.length || !Number.isFinite(total) || jobs.length >= total) return jobs;
  }
  return null;
}

function main() {
  const {sha} = parseArgs(process.argv.slice(2));
  const repository = process.env.GITHUB_REPOSITORY;
  assert.ok(repository, "GITHUB_REPOSITORY is required");
  const listed = ghJson(`repos/${repository}/actions/workflows/ci.yml/runs?event=merge_group&head_sha=${sha}&per_page=20`);
  const decision = chooseQueueProof({sha, runs: listed?.workflow_runs ?? [],
    jobsFor: (runId) => latestJobs(repository, runId)});
  console.error(`Merge-queue proof for ${sha}: ${decision.runId ?? "none"} (${decision.reason})`);
  if (decision.runId) process.stdout.write(`${decision.runId}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
