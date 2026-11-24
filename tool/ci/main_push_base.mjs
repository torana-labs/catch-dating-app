#!/usr/bin/env node
// The base a main push CI run plans from.
//
// Main push runs queue instead of cancelling each other: GitHub keeps the one
// running main run and one pending run, and a newer merge replaces only the
// pending run. A replaced run never starts, so its commits must be covered by
// the run that replaced it. Each run therefore plans from the commit of the
// nearest earlier main push run that actually ran (running, or finished other
// than cancelled) and whose commit is an ancestor of the head, not from its
// own push's `before` commit.
//
// "Nearest" is by commit graph, not by run id: GitHub can create a batch of
// queue merges' push runs out of order, so the newest earlier run may be for a
// descendant commit. A descendant's run is skipped, never trusted to cover
// this commit, because its own window may start after this commit.
//
// Prints `base_sha=<sha>` and `full=<true|false>` for $GITHUB_OUTPUT. When no
// earlier run that ran is an ancestor of the head, the run validates
// everything (`full=true`, the nightly mode) rather than guessing.
//
// Usage: node tool/ci/main_push_base.mjs --head <sha> --before <sha> --run-id <id>

import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";

const SHA = /^[0-9a-f]{40}$/u;
const CI_PATH = ".github/workflows/ci.yml";

/**
 * Chooses the planning base from earlier main push runs. Pure, so every case
 * is testable without GitHub or Git.
 *
 * @param {object} input
 * @param {Array<object>} input.runs CI workflow runs for push events on main.
 * @param {number} input.runId This run's id; only earlier runs count.
 * @param {string} input.head This run's commit.
 * @param {string} input.before The push event's `before` commit.
 * @param {(sha: string, of?: string) => boolean} input.isAncestor Whether a
 *   commit is an ancestor of `of` (the head when omitted).
 */
export function chooseMainPushBase({runs, runId, head, before, isAncestor}) {
  assert.match(head, SHA, "head must be a full commit SHA");
  assert.match(before, SHA, "before must be a full commit SHA");
  assert.ok(Number.isSafeInteger(runId) && runId > 0, "runId must be a positive integer");
  const ran = (run) => run.status !== "completed" ?
    run.status === "in_progress" :
    !["cancelled", "skipped"].includes(run.conclusion);
  const earlier = runs
    .filter((run) => run.event === "push" && run.head_branch === "main" && run.path === CI_PATH)
    .filter((run) => Number(run.id) < runId && SHA.test(run.head_sha ?? "") && run.head_sha !== head)
    .filter(ran)
    .sort((left, right) => Number(right.id) - Number(left.id));
  if (!earlier.length) return {baseSha: before, full: true, reason: "no_earlier_run_that_ran"};
  const ancestors = earlier.filter((run) => isAncestor(run.head_sha));
  if (!ancestors.length) return {baseSha: before, full: true, reason: "earlier_run_not_an_ancestor"};
  // Main's history is a chain, so the ancestors are totally ordered: keep the
  // one every other ancestor precedes. Ties on a commit keep the newest run.
  const nearest = ancestors.reduce((best, run) =>
    (run.head_sha !== best.head_sha && isAncestor(best.head_sha, run.head_sha) ? run : best));
  const skippedDescendantRuns = earlier.length - ancestors.length;
  const extra = skippedDescendantRuns ? {skippedDescendantRuns} : {};
  if (nearest.head_sha === before) return {baseSha: before, full: false, reason: "previous_push", ...extra};
  return {baseSha: nearest.head_sha, full: false, reason: "covers_replaced_runs",
    previousRunId: Number(nearest.id), ...extra};
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 2) {
    const [flag, value] = [argv[index], argv[index + 1]];
    assert.ok(["--head", "--before", "--run-id"].includes(flag), `Unknown argument: ${flag}`);
    assert.ok(value, `${flag} needs a value`);
    args[flag.slice(2)] = value;
  }
  return {head: args.head, before: args.before, runId: Number(args["run-id"])};
}

function main() {
  const {head, before, runId} = parseArgs(process.argv.slice(2));
  const repository = process.env.GITHUB_REPOSITORY;
  assert.ok(repository, "GITHUB_REPOSITORY is required");
  let runs = [];
  const response = spawnSync("gh", ["api", "-H", "Cache-Control: no-cache",
    `repos/${repository}/actions/workflows/ci.yml/runs?event=push&branch=main&per_page=100`],
  {encoding: "utf8", maxBuffer: 64 * 1024 * 1024});
  if (response.status === 0) {
    runs = JSON.parse(response.stdout).workflow_runs ?? [];
  } else {
    // An unreadable run history validates everything rather than guessing.
    console.error(`Could not list main push runs: ${response.stderr.trim()}`);
  }
  const decision = chooseMainPushBase({runs, runId, head, before,
    isAncestor: (sha, of = head) => spawnSync("git", ["merge-base", "--is-ancestor", sha, of]).status === 0});
  console.error(`Main push base: ${decision.baseSha} (${decision.reason}${
    decision.previousRunId ? `, run ${decision.previousRunId}` : ""}${
    decision.skippedDescendantRuns ? `, skipped ${decision.skippedDescendantRuns} later commits' runs` : ""}${
    decision.full ? ", full validation" : ""})`);
  process.stdout.write(`base_sha=${decision.baseSha}\nfull=${decision.full}\nreason=${decision.reason}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
