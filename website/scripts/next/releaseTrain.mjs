import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {setTimeout as sleep} from "node:timers/promises";
import {fileURLToPath} from "node:url";
import {waitMainMarketingValidation} from "../../../tool/ci/wait_main_marketing_validation.mjs";
import {canonicalRepository} from "../../../tool/lib/canonical_repository.mjs";
import {currentReleaseLineage, sourceCiJobs} from "./previewRelease.mjs";
import {sourceCiPasses} from "../../../tool/ci/required_ci_floor.mjs";
import {brand} from "../../../packages/brand/index.mjs";
import {nxLanes} from "../../../tool/nx/select_lanes.mjs";

// The website release train. After main CI completes (or on the hourly
// fallback), it previews the newest commit of main whose own CI passed with
// website validation (not necessarily main's head) through the existing
// preview workflow, by commit, so merges landing meanwhile never strand it,
// passes the prod environment's gate (no required reviewer since 30 Oct 2026;
// adding one makes it wait for approval again), then runs the existing
// promotion workflow on that exact preview. It never
// relaxes either workflow's own checks; it only removes the hand dispatches.
// When the website changed since live but main's head ran no website
// validation of its own, it first runs CI on that head planned from live, so a docs or
// tooling merge on top of a website change never strands it.

export const APPROVAL_ENVIRONMENT = "prod";
export const PREVIEW_WORKFLOW = "website-next-preview.yml";
export const PROMOTE_WORKFLOW = "website-next-promote.yml";
export const CI_WORKFLOW = "ci.yml";
// The inputs the train's validation dispatch sends: plan every commit since
// live, as a main push does, so only the lanes those commits touched run
// (a website change selects Marketing validation and captures). Full CI ran
// Flutter, visual and app builds for website-only changes, about 125 of its
// 250 runner-minutes (20 dispatches on 11-12 Nov 2026). GitHub rejects a
// dispatch whose inputs the workflow does not declare (HTTP 422, run
// 42944434174), so ci.yml's workflow_dispatch must declare each of these.
export function ciValidationInputs(liveSha) {
  assert.match(liveSha ?? "", /^[a-f0-9]{40}$/u, "Validation plans from the exact live commit");
  return {base_sha: liveSha};
}
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
 * refusal is testable without GitHub. `candidate` is the newest commit of main
 * newer than live whose own CI passed with website validation and captures
 * (`{sha, validation}`), or null. `websiteChanged` is whether the website
 * changed between live and main's head; `validationRuns` are the CI runs
 * a train already dispatched for the head.
 */
export function planDecision({event, eventConclusion, mainSha, lineage, candidate = null,
  websiteChanged, validationRuns = []}) {
  if (lineage.alreadyLive) return skip("already_live");
  // Release the newest commit that fully passed, not main's head (owner
  // decision, 12 Nov 2026). On a busy day main's head is almost never the
  // commit whose CI just finished, so waiting for the head starves the train.
  // The preview and promotion still re-check that exact commit's CI, captures
  // and lineage, so the release never moves behind live.
  if (candidate?.validation?.validated && candidate.validation.captureBinding) {
    assert.match(candidate.sha ?? "", /^[a-f0-9]{40}$/u, "A release candidate is an exact commit");
    return {release: true, validate: false, sourceSha: candidate.sha, liveSha: lineage.liveSha,
      reason: candidate.sha === mainSha ? "release" : "release_newest_validated"};
  }
  // No validated commit is newer than live. A failed CI never triggers a
  // full validation of the head.
  if (event === "workflow_run" && !["success", "cancelled"].includes(eventConclusion)) return skip("ci_unsuccessful");
  // The head's own change ran no website validation. Docs, tooling and backend
  // merges leave the website as live has it: nothing to release.
  assert.equal(typeof websiteChanged, "boolean", "Whether the website changed since live must be known");
  if (!websiteChanged) return skip("website_unchanged_since_live");
  // Otherwise the website changes since live would wait for the next website
  // merge. Validate the head with CI planned from live, once: a failed run stops the train
  // until a person re-runs it or main moves on.
  if (validationRuns.some((run) => run.status !== "completed")) return skip("website_validation_running");
  if (validationRuns.length > 0) return skip("website_validation_failed");
  return {release: true, validate: true, sourceSha: mainSha, liveSha: lineage.liveSha, reason: "validate_and_release"};
}

/** How many commits newer than live the train inspects for website validation. */
export const MAX_CANDIDATE_INSPECTIONS = 8;

/**
 * The commits of main newer than live that a completed main CI run tested,
 * newest first: the commits worth inspecting for website validation. A commit
 * whose run a newer merge replaced while pending never ran, so it has none.
 * `commits` is main's history newest first; it stops at live.
 */
export function releaseCandidates({commits, liveSha, runs, limit = MAX_CANDIDATE_INSPECTIONS}) {
  const tested = new Set(runs.filter((run) => run.status === "completed" && ["success", "failure"].includes(run.conclusion) &&
    ["push", "workflow_dispatch", "schedule"].includes(run.event) && run.head_branch === "main")
    .map((run) => run.head_sha));
  const newer = [];
  for (const commit of commits) {
    if (commit.sha === liveSha) break;
    newer.push(commit.sha);
  }
  return newer.filter((sha) => tested.has(sha)).slice(0, limit);
}

function skip(reason) {
  return {release: false, validate: false, sourceSha: null, liveSha: null, reason};
}

/**
 * Whether the website changed between two commits of main, by the lanes Nx
 * selects. A CI configuration edit doesn't change the website, so it doesn't
 * count here. If Nx cannot answer, that counts as a change.
 */
export function websiteChangedBetween(baseSha, headSha, lanes = nxLanes) {
  try {
    return lanes({base: baseSha, head: headSha, mode: "merge_group", controlPlane: false}).includes("marketing");
  } catch {
    return true;
  }
}

/** The preview workflow's run-name for a source, by which the train finds its dispatch. */
export function previewRunTitle(sourceSha) {
  return `Next Website Preview of ${sourceSha}`;
}

/**
 * The preview builds the planned commit, not main's head at dispatch: main may
 * have moved since the plan or during validation. The preview and promotion
 * still require that commit's own CI and captures, and that it is on main and
 * not older than live.
 */
export function previewDispatch(sourceSha) {
  assert.match(sourceSha ?? "", /^[a-f0-9]{40}$/u, "The train previews an exact commit");
  return {workflow: PREVIEW_WORKFLOW, inputs: {source_sha: sourceSha}, expectedTitle: previewRunTitle(sourceSha)};
}

/**
 * Picks the run this train dispatched: the newest workflow_dispatch run on
 * main that the workflow token started after the request.
 */
export function selectDispatchedRun({runs, requestedAt, expectedSha = null, expectedTitle = null}) {
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
  // A preview runs on main's head, whatever it is now, and names its source.
  if (expectedTitle !== null) assert.equal(run.display_title, expectedTitle, "The newest dispatched run is not this train's");
  return run;
}

async function plan() {
  const repository = canonicalRepository(process.env);
  const mainSha = github(`repos/${repository}/git/ref/heads/main`).object.sha;
  const lineage = await currentReleaseLineage(repository, mainSha);
  let candidate = null;
  if (!lineage.alreadyLive) {
    const commits = github(`repos/${repository}/commits?sha=${mainSha}&per_page=100`);
    const runs = github(`repos/${repository}/actions/workflows/${CI_WORKFLOW}/runs?branch=main&status=completed&per_page=100`).workflow_runs;
    for (const sha of releaseCandidates({commits, liveSha: lineage.liveSha, runs})) {
      let validation = null;
      try {
        validation = await waitMainMarketingValidation({repository, sourceSha: sha, maxWaitMs: 0});
      } catch {
        validation = null;
      }
      if (validation?.validated && validation.captureBinding) {
        // The same lineage the preview requires: on main and newer than live.
        await currentReleaseLineage(repository, sha);
        candidate = {sha, validation};
        break;
      }
    }
  }
  const unvalidated = !lineage.alreadyLive && !candidate;
  const websiteChanged = unvalidated ? websiteChangedBetween(lineage.liveSha, mainSha) : undefined;
  const validationRuns = unvalidated ? github(`repos/${repository}/actions/workflows/${CI_WORKFLOW}/runs?branch=main&event=workflow_dispatch&head_sha=${mainSha}&per_page=100`)
    .workflow_runs.filter((run) => run.head_sha === mainSha && run.triggering_actor?.login === BOT) : [];
  const decision = planDecision({event: process.env.GITHUB_EVENT_NAME,
    eventConclusion: process.env.EVENT_CONCLUSION, mainSha, lineage, candidate,
    websiteChanged, validationRuns});
  output({release: String(decision.release), validate: String(decision.validate), source_sha: decision.sourceSha ?? "",
    live_sha: decision.liveSha ?? "", reason: decision.reason});
  summary(!decision.release ? `Nothing to release: ${decision.reason.replaceAll("_", " ")}.` : decision.validate ?
    `Validating \`${decision.sourceSha}\` with CI planned from live, then releasing it (live: \`${decision.liveSha}\`).` :
    `Releasing \`${decision.sourceSha}\`${decision.sourceSha === mainSha ? "" : ` (newest validated; main is at \`${mainSha}\`)`} (live: \`${decision.liveSha}\`).`);
}

async function dispatchAndWait({repository, workflow, inputs = {}, expectedSha = null, expectedTitle = null, timeoutMs}) {
  const requestedAt = new Date().toISOString();
  command("gh", ["workflow", "run", workflow, "--repo", repository, "--ref", "main",
    ...Object.entries(inputs).flatMap(([key, value]) => ["-f", `${key}=${value}`])]);
  const deadline = Date.now() + timeoutMs;
  let run = null;
  while (Date.now() < deadline) {
    await sleep(POLL_MS);
    if (!run) {
      const runs = github(`repos/${repository}/actions/workflows/${workflow}/runs?branch=main&event=workflow_dispatch&per_page=10`).workflow_runs;
      run = selectDispatchedRun({runs, requestedAt, expectedSha, expectedTitle});
      if (!run) continue;
      summary(`${workflow}: ${run.html_url}`);
    }
    run = github(`repos/${repository}/actions/runs/${run.id}`);
    if (run.status === "completed") {
      // The train's own CI validation passes as the preview's source gate
      // does (sprint floor, owner 11 Nov 2026): tool/ci/required_ci_floor.mjs.
      const passed = workflow === CI_WORKFLOW ? sourceCiPasses({run, jobs: sourceCiJobs(run)}) : run.conclusion === "success";
      assert.ok(passed, `${workflow} run ${run.id} ended ${run.conclusion}`);
      return run;
    }
  }
  throw new Error(`${workflow} did not finish within ${Math.round(timeoutMs / 60_000)} minutes`);
}

// CI of main's head planned from live, which runs Marketing validation and
// captures for the exact commit because the website changed since live. The preview then reads that run as the
// head's validation. It takes about an hour, so main has usually moved by
// then; the train still releases the commit it validated (1 Nov 2026: with
// the queue busy, six trains in a row validated a head and released nothing).
async function runValidation() {
  const repository = canonicalRepository(process.env);
  const sourceSha = process.env.SOURCE_SHA;
  await dispatchAndWait({repository, workflow: CI_WORKFLOW, inputs: ciValidationInputs(process.env.LIVE_SHA), expectedSha: sourceSha,
    timeoutMs: 140 * 60_000});
  const mainSha = github(`repos/${repository}/git/ref/heads/main`).object.sha;
  summary(mainSha === sourceSha ? `CI validated \`${sourceSha}\`.` :
    `CI validated \`${sourceSha}\`; main has since moved to \`${mainSha}\`, which a later train releases.`);
}

/**
 * What a finished preview run left for the train: the preview channel it
 * published, or the marker that it deferred because the project was not
 * serving (a closed billing account), in which case nothing is promoted.
 */
export function previewOutcome(directory) {
  const marker = path.join(directory, "deferred.json");
  if (fs.existsSync(marker)) {
    const deferred = JSON.parse(fs.readFileSync(marker, "utf8"));
    assert.equal(deferred.deferred, true, "a deferral marker says deferred");
    return {deferred: true, reason: deferred.reason, detail: deferred.detail ?? null};
  }
  const channel = JSON.parse(fs.readFileSync(path.join(directory, "channel.json"), "utf8"));
  assert.match(channel.url ?? "", /^https:\/\/[a-z0-9-]+--next-candidate-[a-z0-9]+\.web\.app\/?$/u, "Unexpected preview URL");
  return {deferred: false, url: channel.url};
}

async function runPreview() {
  const repository = canonicalRepository(process.env);
  const sourceSha = process.env.SOURCE_SHA;
  const run = await dispatchAndWait({repository, ...previewDispatch(sourceSha), timeoutMs: 60 * 60_000});
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "website-preview-"));
  command("gh", ["run", "download", String(run.id), "--repo", repository,
    "--name", `next-preview-serving-${run.id}-${run.run_attempt}`, "--dir", directory]);
  const outcome = previewOutcome(directory);
  if (outcome.deferred) {
    output({preview_run_id: String(run.id), preview_url: "", deferred: "true"});
    summary(`Preview of \`${sourceSha}\` deferred: the project is not serving (${outcome.reason}` +
      `${outcome.detail ? `: ${outcome.detail}` : ""}). Nothing is promoted; the next train retries, ` +
      "or re-run Website Release once the project serves again.");
    return;
  }
  output({preview_run_id: String(run.id), preview_url: outcome.url, deferred: "false"});
  summary(`Preview of \`${sourceSha}\`: ${outcome.url}\n\nIt is promoted once the ${APPROVAL_ENVIRONMENT} environment's gate passes.`);
}

async function runPromotion() {
  const repository = canonicalRepository(process.env);
  const run = await dispatchAndWait({repository, workflow: PROMOTE_WORKFLOW,
    // Promotion binds to the preview's own source, so main may have moved.
    inputs: {preview_run_id: process.env.PREVIEW_RUN_ID}, timeoutMs: 45 * 60_000});
  summary(`Released \`${process.env.SOURCE_SHA}\` to ${brand.web.origin} (${run.html_url}).`);
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
