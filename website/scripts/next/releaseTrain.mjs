import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {setTimeout as sleep} from "node:timers/promises";
import {fileURLToPath} from "node:url";
import {waitMainMarketingValidation} from "../../../tool/ci/wait_main_marketing_validation.mjs";
import {canonicalRepository} from "../../../tool/lib/canonical_repository.mjs";
import {currentReleaseLineage} from "./previewRelease.mjs";

// The website release train. After main CI completes (or on the hourly
// fallback), it previews main's head through the existing preview workflow,
// passes the prod environment's gate (no required reviewer since 30 Oct 2026;
// adding one makes it wait for approval again), then runs the existing
// promotion workflow on that exact preview. It never
// relaxes either workflow's own checks; it only removes the hand dispatches.
// When the website changed since live but main's head ran no website
// validation of its own, it first runs full CI on that head, so a docs or
// tooling merge on top of a website change never strands it.

export const APPROVAL_ENVIRONMENT = "prod";
export const PREVIEW_WORKFLOW = "website-next-preview.yml";
export const PROMOTE_WORKFLOW = "website-next-promote.yml";
export const CI_WORKFLOW = "ci.yml";
const BOT = "github-actions[bot]";
const POLL_MS = 20_000;

function command(name, args, options = {}) {
  const result = spawnSync(name, args, {encoding: "utf8", maxBuffer: 32 * 1024 * 1024, ...options});
  assert.equal(result.status, 0, result.stderr || `${name} failed`);
  return result.stdout.trim();
}
const github = (endpoint) => JSON.parse(command("gh", ["api", "-H", "Cache-Control: no-cache", endpoint]));

/**
 * Whether this train should release, and what. Pure, so every skip and
 * refusal is testable without GitHub. `websiteChanged` is whether the website
 * changed between live and main's head; `validationRuns` are the full CI runs
 * a train already dispatched for the head.
 */
export function planDecision({event, eventSha, eventConclusion, mainSha, validation, lineage,
  websiteChanged, validationRuns = []}) {
  // A newer merge cancels main's push run of a commit; the merge queue run that
  // tested the same commit still validates it, so only a failure stops here.
  if (event === "workflow_run" && !["success", "cancelled"].includes(eventConclusion)) return skip("ci_unsuccessful");
  if (lineage.alreadyLive) return skip("already_live");
  // Any CI completion considers main's head, not the commit that completed: a
  // later merge supersedes that commit, and the head's merge queue run already
  // validated it. Scheduled runs are no fallback; GitHub may delay or drop them.
  if (validation?.validated && validation.captureBinding) {
    return {release: true, validate: false, sourceSha: mainSha, liveSha: lineage.liveSha, reason: "release"};
  }
  // The head's own change ran no website validation. Docs, tooling and backend
  // merges leave the website as live has it: nothing to release.
  assert.equal(typeof websiteChanged, "boolean", "Whether the website changed since live must be known");
  if (!websiteChanged) return skip("website_unchanged_since_live");
  // Otherwise the website changes since live would wait for the next website
  // merge. Validate the head with full CI, once: a failed run stops the train
  // until a person re-runs it or main moves on.
  if (validationRuns.some((run) => run.status !== "completed")) return skip("website_validation_running");
  if (validationRuns.length > 0) return skip("website_validation_failed");
  return {release: true, validate: true, sourceSha: mainSha, liveSha: lineage.liveSha, reason: "validate_and_release"};
}

function skip(reason) {
  return {release: false, validate: false, sourceSha: null, liveSha: null, reason};
}

/**
 * Whether the website changed between two commits of main, by the planner CI
 * uses to decide when to run Marketing validation. Anything it cannot place
 * counts as a change.
 */
export function websiteChangedInPlan(plan) {
  const targets = plan?.operations?.ciTargets;
  return plan?.full !== false || plan.complete !== true || !Array.isArray(targets) || targets.includes("marketing");
}

function websiteChangedBetween(baseSha, headSha) {
  return websiteChangedInPlan(JSON.parse(command(process.execPath,
    ["tool/harness.mjs", "plan", "--base", baseSha, "--head", headSha, "--mode", "merge_group", "--json"])));
}

/**
 * Picks the run this train dispatched: the newest workflow_dispatch run on
 * main that the workflow token started after the request.
 */
export function selectDispatchedRun({runs, requestedAt, expectedSha = null}) {
  const started = Date.parse(requestedAt) - 5_000;
  const candidates = runs.filter((run) => run.event === "workflow_dispatch" && run.head_branch === "main" &&
    run.triggering_actor?.login === BOT && Date.parse(run.created_at) >= started)
    .sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at));
  if (candidates.length === 0) return null;
  const [run] = candidates;
  // Main moved between planning and dispatch: a newer train owns that commit.
  if (expectedSha !== null) {
    assert.equal(run.head_sha, expectedSha, "Main moved before the dispatched run started; the next train releases it");
  }
  return run;
}

async function plan() {
  const repository = canonicalRepository(process.env);
  const mainSha = github(`repos/${repository}/git/ref/heads/main`).object.sha;
  let validation = null;
  try {
    validation = await waitMainMarketingValidation({repository, sourceSha: mainSha, maxWaitMs: 0});
  } catch {
    validation = null;
  }
  const lineage = await currentReleaseLineage(repository, mainSha);
  const unvalidated = !lineage.alreadyLive && !(validation?.validated && validation.captureBinding);
  const websiteChanged = unvalidated ? websiteChangedBetween(lineage.liveSha, mainSha) : undefined;
  const validationRuns = unvalidated ? github(`repos/${repository}/actions/workflows/${CI_WORKFLOW}/runs?branch=main&event=workflow_dispatch&head_sha=${mainSha}&per_page=100`)
    .workflow_runs.filter((run) => run.head_sha === mainSha && run.triggering_actor?.login === BOT) : [];
  const decision = planDecision({event: process.env.GITHUB_EVENT_NAME, eventSha: process.env.EVENT_HEAD_SHA,
    eventConclusion: process.env.EVENT_CONCLUSION, mainSha, validation, lineage,
    websiteChanged, validationRuns});
  output({release: String(decision.release), validate: String(decision.validate), source_sha: decision.sourceSha ?? "",
    reason: decision.reason});
  summary(!decision.release ? `Nothing to release: ${decision.reason.replaceAll("_", " ")}.` : decision.validate ?
    `Validating \`${decision.sourceSha}\` with full CI, then releasing it (live: \`${decision.liveSha}\`).` :
    `Releasing \`${decision.sourceSha}\` (live: \`${decision.liveSha}\`).`);
}

async function dispatchAndWait({repository, workflow, inputs = {}, expectedSha, timeoutMs}) {
  const requestedAt = new Date().toISOString();
  command("gh", ["workflow", "run", workflow, "--repo", repository, "--ref", "main",
    ...Object.entries(inputs).flatMap(([key, value]) => ["-f", `${key}=${value}`])]);
  const deadline = Date.now() + timeoutMs;
  let run = null;
  while (Date.now() < deadline) {
    await sleep(POLL_MS);
    if (!run) {
      const runs = github(`repos/${repository}/actions/workflows/${workflow}/runs?branch=main&event=workflow_dispatch&per_page=10`).workflow_runs;
      run = selectDispatchedRun({runs, requestedAt, expectedSha});
      if (!run) continue;
      summary(`${workflow}: ${run.html_url}`);
    }
    run = github(`repos/${repository}/actions/runs/${run.id}`);
    if (run.status === "completed") {
      assert.equal(run.conclusion, "success", `${workflow} run ${run.id} ended ${run.conclusion}`);
      return run;
    }
  }
  throw new Error(`${workflow} did not finish within ${Math.round(timeoutMs / 60_000)} minutes`);
}

// Full CI of main's head: the nightly mode, which runs Marketing validation
// and captures for the exact commit. The preview then reads that run as the
// head's validation. If main moved meanwhile, the next train releases it.
async function runValidation() {
  const repository = canonicalRepository(process.env);
  const sourceSha = process.env.SOURCE_SHA;
  await dispatchAndWait({repository, workflow: CI_WORKFLOW, inputs: {full: "true"}, expectedSha: sourceSha,
    timeoutMs: 140 * 60_000});
  const current = github(`repos/${repository}/git/ref/heads/main`).object.sha === sourceSha;
  output({current: String(current)});
  summary(current ? `Full CI validated \`${sourceSha}\`.` :
    `Main moved past \`${sourceSha}\` during validation; the next train releases main's head.`);
}

async function runPreview() {
  const repository = canonicalRepository(process.env);
  const sourceSha = process.env.SOURCE_SHA;
  const run = await dispatchAndWait({repository, workflow: PREVIEW_WORKFLOW, expectedSha: sourceSha,
    timeoutMs: 60 * 60_000});
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "website-preview-"));
  command("gh", ["run", "download", String(run.id), "--repo", repository,
    "--name", `next-preview-serving-${run.id}-${run.run_attempt}`, "--dir", directory]);
  const channel = JSON.parse(fs.readFileSync(path.join(directory, "channel.json"), "utf8"));
  assert.match(channel.url ?? "", /^https:\/\/[a-z0-9-]+--next-candidate-[a-z0-9]+\.web\.app\/?$/u, "Unexpected preview URL");
  output({preview_run_id: String(run.id), preview_url: channel.url});
  summary(`Preview of \`${sourceSha}\`: ${channel.url}\n\nIt is promoted once the ${APPROVAL_ENVIRONMENT} environment's gate passes.`);
}

async function runPromotion() {
  const repository = canonicalRepository(process.env);
  const run = await dispatchAndWait({repository, workflow: PROMOTE_WORKFLOW,
    // Promotion binds to the preview's own source, so main may have moved.
    inputs: {preview_run_id: process.env.PREVIEW_RUN_ID}, timeoutMs: 45 * 60_000});
  summary(`Released \`${process.env.SOURCE_SHA}\` to https://catchdates.com (${run.html_url}).`);
}

function output(values) {
  if (!process.env.GITHUB_OUTPUT) return;
  fs.appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(values).map(([key, value]) => `${key}=${value}\n`).join(""));
}

function summary(text) {
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${text}\n`);
  console.log(text);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const commands = {plan, validate: runValidation, preview: runPreview, promote: runPromotion};
  const selected = commands[process.argv[2]];
  if (!selected) throw new Error("Expected plan, validate, preview or promote");
  await selected();
}
