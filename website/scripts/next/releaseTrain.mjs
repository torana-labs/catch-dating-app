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
// waits for a person to approve the preview in the protected environment,
// then runs the existing promotion workflow on that exact preview. It never
// relaxes either workflow's own checks; it only removes the hand dispatches.

export const APPROVAL_ENVIRONMENT = "prod";
export const PREVIEW_WORKFLOW = "website-next-preview.yml";
export const PROMOTE_WORKFLOW = "website-next-promote.yml";
const POLL_MS = 20_000;

function command(name, args, options = {}) {
  const result = spawnSync(name, args, {encoding: "utf8", maxBuffer: 32 * 1024 * 1024, ...options});
  assert.equal(result.status, 0, result.stderr || `${name} failed`);
  return result.stdout.trim();
}
const github = (endpoint) => JSON.parse(command("gh", ["api", "-H", "Cache-Control: no-cache", endpoint]));

/**
 * Whether this train should release, and what. Pure, so every skip and
 * refusal is testable without GitHub.
 */
export function planDecision({event, eventSha, eventConclusion, mainSha, validation, lineage, approvalRules}) {
  const reviewers = (approvalRules ?? []).filter((rule) => rule?.type === "required_reviewers")
    .flatMap((rule) => rule.reviewers ?? []);
  // Without required reviewers the environment would not wait for anyone, so
  // the train refuses rather than promote unapproved.
  assert.ok(reviewers.length > 0, `The ${APPROVAL_ENVIRONMENT} environment must require a reviewer before production`);
  // A newer merge cancels main's push run of a commit; the merge queue run that
  // tested the same commit still validates it, so only a failure stops here.
  if (event === "workflow_run" && !["success", "cancelled"].includes(eventConclusion)) return skip("ci_unsuccessful");
  // Any CI completion considers main's head, not the commit that completed: a
  // later merge supersedes that commit, and the head's merge queue run already
  // validated it. Scheduled runs are no fallback; GitHub may delay or drop them.
  if (!validation?.validated || !validation.captureBinding) return skip("no_website_validation_for_main_head");
  if (lineage.alreadyLive) return skip("already_live");
  return {release: true, sourceSha: mainSha, liveSha: lineage.liveSha, reason: "release"};
}

function skip(reason) {
  return {release: false, sourceSha: null, liveSha: null, reason};
}

/**
 * Picks the run this train dispatched: the newest workflow_dispatch run on
 * main that the workflow token started after the request.
 */
export function selectDispatchedRun({runs, requestedAt, expectedSha = null}) {
  const started = Date.parse(requestedAt) - 5_000;
  const candidates = runs.filter((run) => run.event === "workflow_dispatch" && run.head_branch === "main" &&
    run.triggering_actor?.login === "github-actions[bot]" && Date.parse(run.created_at) >= started)
    .sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at));
  if (candidates.length === 0) return null;
  const [run] = candidates;
  // Main moved between planning and dispatch: a newer train owns that commit.
  if (expectedSha !== null) {
    assert.equal(run.head_sha, expectedSha, "Main moved before the preview started; the next train releases it");
  }
  return run;
}

async function plan() {
  const repository = canonicalRepository(process.env);
  const mainSha = github(`repos/${repository}/git/ref/heads/main`).object.sha;
  const approvalRules = github(`repos/${repository}/environments/${APPROVAL_ENVIRONMENT}`).protection_rules;
  let validation = null;
  try {
    validation = await waitMainMarketingValidation({repository, sourceSha: mainSha, maxWaitMs: 0});
  } catch {
    validation = null;
  }
  const lineage = await currentReleaseLineage(repository, mainSha);
  const decision = planDecision({event: process.env.GITHUB_EVENT_NAME, eventSha: process.env.EVENT_HEAD_SHA,
    eventConclusion: process.env.EVENT_CONCLUSION, mainSha, validation, lineage, approvalRules});
  output({release: String(decision.release), source_sha: decision.sourceSha ?? "", reason: decision.reason});
  summary(decision.release ?
    `Releasing \`${decision.sourceSha}\` (live: \`${decision.liveSha}\`).` :
    `Nothing to release: ${decision.reason.replaceAll("_", " ")}.`);
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
  summary(`Preview of \`${sourceSha}\`: ${channel.url}\n\nApprove the ${APPROVAL_ENVIRONMENT} deployment to release it.`);
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
  const commands = {plan, preview: runPreview, promote: runPromotion};
  const selected = commands[process.argv[2]];
  if (!selected) throw new Error("Expected plan, preview or promote");
  await selected();
}
