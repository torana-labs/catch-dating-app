#!/usr/bin/env node
import fs from "node:fs";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";

/**
 * A main push run of a website workflow is superseded once a newer push run of
 * the same workflow exists on main. The website callers admit every run (they
 * carry no workflow-level concurrency), and promotion already deploys only the
 * freshest source, so a superseded run's validation and packaging are never
 * deployed. Skipping them frees runners without discarding any run.
 *
 * The check is per workflow, not per commit: these workflows are path
 * filtered, so a newer main commit that does not touch a surface starts no
 * newer run of it, and its latest run must still validate and deploy.
 */
export function isSuperseded({current, runs}) {
  if (current?.event !== "push" || current.head_branch !== "main") return false;
  if (!Number.isSafeInteger(current.run_number) || !Array.isArray(runs)) return false;
  return runs.some(run =>
    run?.workflow_id === current.workflow_id &&
    run.event === "push" &&
    run.head_branch === "main" &&
    run.head_sha !== current.head_sha &&
    Number.isSafeInteger(run.run_number) &&
    run.run_number > current.run_number &&
    run.conclusion !== "skipped");
}

/** Reads the current run and its workflow's latest main pushes; fails open. */
export function checkSuperseded({repository, runId, request = githubRequest}) {
  try {
    const current = request(`repos/${repository}/actions/runs/${runId}`);
    const {workflow_runs: runs} = request(
      `repos/${repository}/actions/workflows/${current.workflow_id}/runs?event=push&branch=main&per_page=20`);
    return {superseded: isSuperseded({current, runs}), current};
  } catch (error) {
    // Never skip a run because the check itself could not complete.
    return {superseded: false, error: error.message};
  }
}

function githubRequest(endpoint) {
  const result = spawnSync("gh", ["api", "-H", "Cache-Control: no-cache", endpoint],
    {encoding: "utf8", timeout: 30_000, maxBuffer: 16 * 1024 * 1024});
  if (result.status !== 0) throw new Error(result.stderr || `gh api ${endpoint} failed`);
  return JSON.parse(result.stdout);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = checkSuperseded({
    repository: process.env.GITHUB_REPOSITORY,
    runId: process.env.GITHUB_RUN_ID,
  });
  if (result.error) console.warn(`Superseded check failed open: ${result.error}`);
  console.log(result.superseded ?
    "A newer main push run of this workflow exists; this run skips validation, packaging and promotion." :
    "This is the newest main push run of this workflow.");
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `superseded=${result.superseded}\n`);
  }
}
