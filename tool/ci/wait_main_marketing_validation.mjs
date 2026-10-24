#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {selectCaptureProducerJob, verifyArtifactMetadata} from "../marketing/import_hosted_captures.mjs";

const workflowPath = ".github/workflows/ci.yml";
const positive = value => Number.isSafeInteger(value) && value > 0;
const terminalFailures = new Set(["failure", "cancelled", "timed_out", "action_required", "stale", "neutral"]);

const mergeQueueBranch = /^gh-readonly-queue\/main\/pr-[1-9][0-9]*-[0-9a-f]{40}$/u;

/**
 * CI that ran a commit on its way to main: main's own push run, or the merge
 * queue run that tested the exact commit main then received.
 */
export function isMainCiSource(run) {
  return (run?.event === "push" && run.head_branch === "main") ||
    (run?.event === "merge_group" && mergeQueueBranch.test(run.head_branch ?? ""));
}

export function selectSameSourceRun({runs, canonical, repository, sourceSha, event = "push"}) {
  assert.ok(positive(canonical?.id) && canonical.path === workflowPath, "Canonical CI workflow identity is invalid.");
  assert.ok(Array.isArray(runs), "Missing canonical CI run list.");
  const candidates = runs.filter(run => run.head_sha === sourceSha && run.event === event && isMainCiSource(run));
  for (const run of candidates) {
    assert.ok(positive(run.id) && positive(run.run_attempt) && positive(run.run_number) &&
      run.workflow_id === canonical.id && run.path?.split("@")[0] === workflowPath && run.name === "CI" &&
      run.repository?.full_name === repository && run.head_repository?.full_name === repository &&
      positive(run.repository?.id) && run.head_repository?.id === run.repository.id,
    "Same-source CI run has an invalid workflow, repository, or attempt identity.");
  }
  return candidates.sort((a, b) => b.run_number - a.run_number || b.id - a.id)[0] ?? null;
}

export function inspectMarketingValidation({run, jobs, sourceSha}) {
  assert.ok(Array.isArray(jobs), "Missing same-attempt jobs.");
  const named = name => {
    const matches = jobs.filter(job => job.name === name);
    assert.ok(matches.length <= 1, `Ambiguous ${name} jobs in one attempt.`);
    const job = matches[0];
    if (!job) return null;
    assert.ok(positive(job.id) && job.run_id === run.id && job.run_attempt === run.run_attempt &&
      job.head_sha === sourceSha, `Wrong source or attempt for ${name}.`);
    if (job.conclusion === "success") {
      const attemptStarted = Date.parse(run.run_started_at);
      const jobStarted = Date.parse(job.started_at);
      const jobCompleted = Date.parse(job.completed_at);
      assert.ok(Number.isFinite(attemptStarted) && Number.isFinite(jobStarted) && Number.isFinite(jobCompleted) &&
        jobStarted >= attemptStarted && jobCompleted >= jobStarted,
      `${name} was not executed in this CI attempt. Use Re-run all jobs.`);
    }
    if (job.status === "completed" && terminalFailures.has(job.conclusion)) {
      throw new Error(`${name} did not succeed (${job.conclusion}); repair CI before packaging.`);
    }
    return job;
  };
  const marketing = named("marketing / Validate marketing website");
  const skipped = named("marketing");
  assert.ok(!(marketing && skipped), "Marketing has conflicting executed and skipped job records.");
  const capture = named("capture-freshness / Render and validate 12 canonical iPhone captures");
  const captureSkipped = named("capture-freshness");
  assert.ok(!(capture && captureSkipped), "Capture has conflicting executed and skipped job records.");
  if (marketing?.status === "completed") {
    assert.equal(marketing.conclusion, "success", "Marketing validation did not execute successfully.");
    // Reuse only the actual canonical producer and its consuming React job.
    // The artifact identity is resolved separately before publishing a binding.
    if (capture?.status === "completed") {
      assert.equal(capture.conclusion, "success", "Capture validation did not execute successfully.");
      return {validated: true, captureProduced: true, jobIds: [marketing.id, capture.id]};
    }
  }
  if (skipped?.status === "completed") {
    assert.equal(skipped.conclusion, "skipped", "Unexpected standalone Marketing job result.");
    // Native-only changes can already have a fresh producer: reuse its bytes,
    // but still execute the missing React validation in the website workflow.
    if (capture?.status === "completed") {
      assert.equal(capture.conclusion, "success", "Capture validation did not execute successfully.");
      return {validated: false, captureProduced: true, jobIds: [capture.id]};
    }
    if (captureSkipped?.status === "completed") {
      assert.equal(captureSkipped.conclusion, "skipped", "Unexpected standalone capture job result.");
      return {validated: false, captureProduced: false, jobIds: []};
    }
  }
  return null;
}

export function selectCaptureBinding({artifacts, run, canonical, repository, sourceSha, jobs = []}) {
  assert.ok(Array.isArray(artifacts), "Missing canonical capture artifacts.");
  const name = `canonical-marketing-${sourceSha}-${run.id}-${run.run_attempt}`;
  const matches = artifacts.filter(artifact => artifact.name === name);
  assert.equal(matches.length, 1, "The exact CI attempt must own one canonical capture artifact.");
  const artifact = matches[0];
  const binding = {repository, sourceSha,
    workflowRef: `${repository}/${workflowPath}@refs/heads/${run.head_branch}`,
    workflowSha: sourceSha, workflowDefinitionSha: sourceSha,
    eventSha: sourceSha, runHeadSha: sourceSha,
    runId: String(run.id), runAttempt: String(run.run_attempt),
    artifactId: String(artifact.id), artifactDigest: artifact.digest};
  const producerJob = run.conclusion === "cancelled" ? selectCaptureProducerJob({jobs, binding, artifact}) : null;
  verifyArtifactMetadata({binding, artifact, repositoryId: run.repository.id, run, workflow: canonical, producerJob});
  return binding;
}

export async function waitMainMarketingValidation({repository, sourceSha, request = githubRequest,
  sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), now = Date.now,
  maxWaitMs = 90 * 60 * 1000, onWait = message => process.stderr.write(`${message}\n`)}) {
  assert.match(repository ?? "", /^[\w.-]+\/[\w.-]+$/u);
  assert.match(sourceSha ?? "", /^[0-9a-f]{40}$/u);
  const canonical = await request(`repos/${repository}/actions/workflows/ci.yml`);
  const runs = `repos/${repository}/actions/workflows/${canonical.id}/runs`;
  const endpoints = {push: `${runs}?branch=main&event=push&head_sha=${sourceSha}&per_page=100`,
    merge_group: `${runs}?event=merge_group&head_sha=${sourceSha}&per_page=100`};
  const latestRun = async event => selectSameSourceRun({runs: (await request(endpoints[event])).workflow_runs,
    canonical, repository, sourceSha, event});
  // Jobs a cancelled run cancelled produced no evidence; jobs that already
  // succeeded still do.
  const inspect = async (run, cancelled) => {
    const attempt = await request(`repos/${repository}/actions/runs/${run.id}/attempts/${run.run_attempt}`);
    assert.equal(attempt.id, run.id, "Wrong validation attempt run.");
    assert.equal(attempt.run_attempt, run.run_attempt, "Wrong validation attempt.");
    assert.equal(attempt.head_sha, sourceSha, "Wrong validation attempt source.");
    assert.ok(Number.isFinite(Date.parse(attempt.run_started_at)), "Missing validation attempt start time.");
    const pages = await request(`repos/${repository}/actions/runs/${run.id}/attempts/${run.run_attempt}/jobs?per_page=100`, {paginate: true});
    assert.ok(Array.isArray(pages) && pages.length > 0 && pages.every(page => Array.isArray(page.jobs)), "Malformed same-attempt job pages.");
    const allJobs = pages.flatMap(page => page.jobs);
    // A newer merge cancels a run's jobs before the run itself completes. Until
    // it completes, the run is being cancelled, not failing: keep waiting, then
    // read it as a cancelled run.
    if (!cancelled && run.status !== "completed" && allJobs.some(job => job.conclusion === "cancelled")) {
      return {allJobs, decision: null};
    }
    const jobs = cancelled ? allJobs.filter(job => job.conclusion !== "cancelled") : allJobs;
    return {allJobs, decision: inspectMarketingValidation({run: {...run, run_started_at: attempt.run_started_at}, jobs, sourceSha})};
  };
  const bindingFor = async (run, allJobs) => {
    const artifactPages = await request(`repos/${repository}/actions/runs/${run.id}/artifacts?per_page=100`, {paginate: true});
    assert.ok(Array.isArray(artifactPages) && artifactPages.length > 0 && artifactPages.every(page => Array.isArray(page.artifacts)), "Malformed capture artifact pages.");
    return selectCaptureBinding({artifacts: artifactPages.flatMap(page => page.artifacts), run, canonical, repository, sourceSha, jobs: allJobs});
  };
  const result = (run, decision, captureBinding) => ({...decision, ...(captureBinding ? {captureBinding} : {}), sourceSha,
    sourceCiWorkflowId: canonical.id, sourceCiRunId: run.id, sourceCiRunAttempt: run.run_attempt, sourceCiEvent: run.event,
    authority: decision.validated ? "same-source-marketing-and-capture-jobs" : "standalone-validation-required", node: process.version});
  // The merge queue tested this exact commit before main received it, and no
  // later merge cancels that run; main's own push run of it usually is.
  // Callers therefore agree on one completed run. Main's push run remains the
  // evidence for a commit that reached main without the queue.
  const queueEvidence = async () => {
    const run = await latestRun("merge_group");
    if (run?.status !== "completed" || run.conclusion !== "success") return null;
    const {allJobs, decision} = await inspect(run, false);
    if (!decision?.validated && !decision?.captureProduced) return null;
    const captureBinding = decision.captureProduced ? await bindingFor(run, allJobs) : undefined;
    const current = await latestRun("merge_group");
    assert.ok(current?.id === run.id && current.run_attempt === run.run_attempt && current.conclusion === "success",
      "Merge queue validation changed during inspection.");
    return result(run, decision, captureBinding);
  };
  const started = now(); let previous = "";
  while (true) {
    const queued = await queueEvidence();
    if (queued) return queued;
    const run = await latestRun("push");
    if (run) {
      // A newer merge to main cancels this run (ci.yml concurrency).
      const cancelled = run.status === "completed" && run.conclusion === "cancelled";
      assert.ok(cancelled || !terminalFailures.has(run.conclusion), `Canonical same-source CI ended ${run.conclusion}; no validation reuse.`);
      const {allJobs, decision} = await inspect(run, cancelled);
      if (cancelled && !decision) {
        // Marketing Website then captures and validates this exact source itself.
        return {validated: false, captureProduced: false, jobIds: [], sourceSha, sourceCiWorkflowId: canonical.id,
          sourceCiRunId: run.id, sourceCiRunAttempt: run.run_attempt, sourceCiEvent: run.event,
          authority: "standalone-validation-required", reason: "source-ci-cancelled-before-evidence", node: process.version};
      }
      if (decision) {
        const captureBinding = decision.captureProduced ? await bindingFor(run, allJobs) : undefined;
        const current = await latestRun("push");
        if (current?.id === run.id && current.run_attempt === run.run_attempt) {
          assert.ok(current.conclusion === "cancelled" || !terminalFailures.has(current.conclusion),
            "Validation attempt failed during inspection.");
          return result(run, decision, captureBinding);
        }
      }
      assert.ok(run.status !== "completed" || decision,
        "Completed CI has no usable Marketing/capture execution; no fallback for missing evidence.");
    }
    assert.ok(now() - started < maxWaitMs, "Timed out awaiting exact-source Marketing validation; no package is authorized.");
    const message = `Waiting for same-source CI ${run ? `${run.id}/${run.run_attempt}` : "run"} Marketing/capture results.`;
    if (message !== previous) { onWait(message); previous = message; }
    await sleep(20_000);
  }
}

function githubRequest(endpoint, {paginate = false} = {}) {
  const result = spawnSync("gh", ["api", "-H", "Cache-Control: no-cache",
    ...(paginate ? ["--paginate", "--slurp"] : []), endpoint],
  {encoding: "utf8", timeout: 30_000, maxBuffer: 32 * 1024 * 1024});
  assert.equal(result.status, 0, result.stderr || "Cannot read same-source CI validation.");
  return JSON.parse(result.stdout);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const result = await waitMainMarketingValidation({repository: process.env.GITHUB_REPOSITORY,
      sourceSha: process.env.GITHUB_SHA});
    if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `validated=${result.validated}\ncapture_binding=${result.captureBinding ? JSON.stringify(result.captureBinding) : ""}\n`);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
