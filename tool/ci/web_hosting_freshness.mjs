#!/usr/bin/env node

import fs from "node:fs";
import {spawnSync} from "node:child_process";

const shaPattern = /^[0-9a-f]{40}$/u;
const idPattern = /^[1-9][0-9]*$/u;

function safeId(value) {
  const text = value == null ? "" : String(value);
  return idPattern.test(text) ? text : "<invalid>";
}

function safeSha(value) {
  return typeof value === "string" && shaPattern.test(value)
    ? value
    : "<invalid>";
}

function safeLabel(value) {
  return typeof value === "string" && /^[A-Za-z0-9._/-]{1,64}$/u.test(value)
    ? value
    : "<invalid>";
}

function safeInteger(value) {
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

function projectRun(run) {
  return {
    id: safeId(run?.id),
    runNumber: safeInteger(run?.runNumber),
    sha: safeSha(run?.sha),
    branch: safeLabel(run?.branch),
    event: safeLabel(run?.event),
  };
}

// A newer push of the same surface on main supersedes an older promotion:
// queue: max runs promotions in push order, and the newest one deploys the
// newest bytes. Only the latest-run identity may differ, the newer run must
// have a higher run number, and recovery is never superseded.
const SUPERSEDING_FRESHNESS_CHECKS = new Set(["latestRunIdentity", "latestRunNumber", "latestRunSourceSha"]);
const SUPERSEDING_AUTHORIZATION_CHECKS = new Set(["latestRunIdentity", "latestRunNumber", "latestSourceSha"]);

function supersededBy({recovery, failedChecks, allowed, latestRunNumber, runNumber}) {
  const superseded = recovery !== true && failedChecks.length > 0 &&
    failedChecks.every((name) => allowed.has(name)) &&
    Number.isSafeInteger(latestRunNumber) && Number.isSafeInteger(runNumber) &&
    latestRunNumber > runNumber;
  return superseded ? {runNumber: latestRunNumber} : null;
}

/** Evaluate every existing last-moment source/freshness predicate. */
export function evaluatePromotionFreshness(evidence) {
  const expected = evidence?.expected ?? {};
  const actual = evidence?.actual ?? {};
  const sourceRun = actual.sourceRun ?? {};
  const latestRuns = Array.isArray(actual.latestRuns) ? actual.latestRuns : [];
  const latest = latestRuns.length === 1 ? latestRuns[0] : {};
  const expectedRunId = String(expected.runId ?? "");
  const expectedSourceSha = expected.sourceSha;
  const expectedAttempt = expected.runAttempt;
  const expectedRunNumber = expected.runNumber;
  const sourceMainSha = actual.mainSha;

  const checks = {
    sourceShaFormat: typeof expectedSourceSha === "string" &&
      shaPattern.test(expectedSourceSha),
    sourceIsAncestorOfMain: actual.sourceIsAncestor === true,
    recoverySourceEqualsCurrentMain: expected.recovery !== true ||
      sourceMainSha === expectedSourceSha,
    producerRunIdentity: String(sourceRun.id ?? "") === expectedRunId,
    producerAttempt: sourceRun.runAttempt === expectedAttempt,
    producerSourceSha: sourceRun.headSha === expectedSourceSha,
    producerEvent: sourceRun.event === "push",
    producerBranch: sourceRun.branch === "main",
    latestRunCountIsOne: latestRuns.length === 1,
    latestRunIdentity: String(latest.id ?? "") === expectedRunId,
    latestRunNumber: latest.runNumber === expectedRunNumber,
    latestRunSourceSha: latest.sha === expectedSourceSha,
    latestRunBranch: latest.branch === "main",
    latestRunEvent: latest.event === "push",
  };
  const expectedView = {
    sourceSha: safeSha(expectedSourceSha),
    runId: safeId(expected.runId),
    runAttempt: safeInteger(expectedAttempt),
    workflowId: safeId(expected.workflowId),
    runNumber: safeInteger(expectedRunNumber),
    recovery: expected.recovery === true,
  };
  const actualView = {
    mainSha: safeSha(sourceMainSha),
    sourceIsAncestor: actual.sourceIsAncestor === true,
    sourceRun: {
      id: safeId(sourceRun.id),
      runAttempt: safeInteger(sourceRun.runAttempt),
      headSha: safeSha(sourceRun.headSha),
      event: safeLabel(sourceRun.event),
      branch: safeLabel(sourceRun.branch),
    },
    latestRunCount: latestRuns.length,
    // The GitHub endpoint is requested with per_page=1; cap diagnostic output
    // if an unexpected/malformed response returns an unbounded array.
    latestRuns: latestRuns.slice(0, 2).map(projectRun),
  };
  const failedChecks = Object.entries(checks)
    .filter(([, passed]) => passed !== true)
    .map(([name]) => name);

  const superseding = supersededBy({recovery: expected.recovery, failedChecks,
    allowed: SUPERSEDING_FRESHNESS_CHECKS, latestRunNumber: latest.runNumber, runNumber: expectedRunNumber});
  return {
    passed: failedChecks.length === 0,
    superseded: superseding !== null,
    supersededBy: superseding,
    failedChecks,
    checks,
    expected: expectedView,
    actual: actualView,
  };
}

/** The complete initial gate: each snapshot owns all metadata, never mixed reads. */
export function evaluatePromotionAuthorization(expected, snapshot) {
  const checks = {};
  const observations = {};
  function check(name, observed, wanted, passed = observed === wanted) {
    checks[name] = passed;
    // Log only known contract values, ids, SHAs and digests, never API bodies.
    const safe = (value) => {
      if (value == null) return "<missing>";
      if (typeof value === "boolean") return value;
      if (Number.isSafeInteger(value) && value >= 0) return value;
      if (typeof value !== "string") return "<invalid>";
      if (shaPattern.test(value) || idPattern.test(value) ||
        /^sha256:[0-9a-f]{64}$/u.test(value)) return value;
      const constants = [">0 integer", "terminal non-success", "not-applicable",
        "push", "main", "completed", "failure", "cancelled", "timed_out",
        "stale", "action_required", "startup_failure", "in_progress", "queued",
        "Admin Website", "Host Website", "Marketing Website"];
      if (constants.includes(value) ||
        /^\.github\/workflows\/(admin|host|marketing)-website\.yml$/u.test(value) ||
        /^web-hosting-v1-(admin|host|marketing)-[1-9][0-9]*-[1-9][0-9]*-[1-9][0-9]*-[0-9a-f]{40}-[1-9][0-9]*$/u.test(value)) return value;
      if (value === expected.repository && typeof expected.repository === "string" &&
        /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(expected.repository)) return value;
      return "<mismatch>";
    };
    observations[name] = {expected: safe(wanted), observed: safe(observed)};
  }
  check("expectedInputContract", ["admin", "host", "marketing"].includes(expected.surface) &&
    typeof expected.repository === "string" && /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(expected.repository) &&
    typeof expected.sourceSha === "string" && shaPattern.test(expected.sourceSha) &&
    typeof expected.runId === "string" && idPattern.test(expected.runId) &&
    Number.isSafeInteger(expected.runAttempt) && expected.runAttempt > 0 &&
    Number.isSafeInteger(expected.artifactId) && expected.artifactId > 0 &&
    typeof expected.artifactDigest === "string" && /^sha256:[0-9a-f]{64}$/u.test(expected.artifactDigest) &&
    typeof expected.recovery === "boolean", true);
  const attempt = snapshot?.attempt ?? {};
  const current = snapshot?.current ?? {};
  const canonical = snapshot?.canonical ?? {};
  const artifact = snapshot?.artifact ?? {};
  const workflowId = attempt.workflow_id;
  const runNumber = attempt.run_number;
  const expectedName = `${String(expected.surface).charAt(0).toUpperCase()}${String(expected.surface).slice(1)} Website`;
  const expectedPath = `.github/workflows/${expected.surface}-website.yml`;
  for (const [label, run] of [["historical", attempt], ["current", current]]) {
    check(`${label}RunIdentity`, String(run.id ?? ""), expected.runId);
    check(`${label}Attempt`, run.run_attempt, expected.runAttempt);
    check(`${label}SourceSha`, run.head_sha, expected.sourceSha);
    check(`${label}WorkflowName`, run.name, expectedName);
    check(`${label}WorkflowPath`, typeof run.path === "string" ? run.path.split("@")[0] : null, expectedPath);
    check(`${label}Event`, run.event, "push");
    check(`${label}Branch`, run.head_branch, "main");
    check(`${label}Repository`, run.head_repository?.full_name, expected.repository);
  }
  check("historicalWorkflowIdPositiveInteger", workflowId, ">0 integer", Number.isSafeInteger(workflowId) && workflowId > 0);
  check("historicalRunNumberPositiveInteger", runNumber, ">0 integer", Number.isSafeInteger(runNumber) && runNumber > 0);
  check("recoveryTerminalStatus", expected.recovery ? attempt.status : "not-applicable",
    expected.recovery ? "completed" : "not-applicable", !expected.recovery || attempt.status === "completed");
  const terminal = ["failure", "cancelled", "timed_out", "stale", "action_required", "startup_failure"];
  check("recoveryTerminalConclusion", expected.recovery ? attempt.conclusion : "not-applicable",
    expected.recovery ? "terminal non-success" : "not-applicable", !expected.recovery || terminal.includes(attempt.conclusion));
  check("canonicalWorkflowPath", typeof canonical.path === "string" ? canonical.path.split("@")[0] : null, expectedPath);
  check("canonicalWorkflowIdPositiveInteger", canonical.id, ">0 integer", Number.isSafeInteger(canonical.id) && canonical.id > 0);
  check("canonicalWorkflowIdentity", canonical.id, workflowId, canonical.id != null && canonical.id === workflowId);
  const runs = snapshot?.latest?.workflow_runs;
  check("latestRunCountIsOne", Array.isArray(runs) ? runs.length : null, 1);
  const latest = Array.isArray(runs) && runs.length === 1 ? runs[0] : {};
  check("latestRunIdentity", String(latest.id ?? ""), expected.runId);
  check("latestRunNumber", latest.run_number, runNumber, runNumber != null && latest.run_number === runNumber);
  check("latestSourceSha", latest.head_sha, expected.sourceSha);
  check("latestBranch", latest.head_branch, "main");
  check("latestEvent", latest.event, "push");
  const name = `web-hosting-v1-${expected.surface}-${workflowId}-${runNumber}-${expected.runId}-${expected.sourceSha}-${expected.runAttempt}`;
  check("artifactIdentity", artifact.id, expected.artifactId);
  check("artifactNotExpired", artifact.expired, false);
  check("artifactName", artifact.name, name);
  check("artifactDigest", artifact.digest, expected.artifactDigest);
  check("artifactProducer", String(artifact.workflow_run?.id ?? ""), expected.runId);
  const repositoryId = snapshot?.repository?.id;
  check("repositoryIdentityPresent", repositoryId, ">0 integer", Number.isSafeInteger(repositoryId) && repositoryId > 0);
  check("artifactRepository", artifact.workflow_run?.repository_id, repositoryId, repositoryId != null && artifact.workflow_run?.repository_id === repositoryId);
  check("artifactHeadRepository", artifact.workflow_run?.head_repository_id, repositoryId, repositoryId != null && artifact.workflow_run?.head_repository_id === repositoryId);
  check("artifactBranch", artifact.workflow_run?.head_branch, "main");
  check("artifactSourceSha", artifact.workflow_run?.head_sha, expected.sourceSha);
  const pages = snapshot?.pages;
  const complete = Array.isArray(pages) && pages.length > 0 && pages.every(page => Array.isArray(page?.artifacts));
  check("artifactPagesComplete", complete, true);
  const artifacts = complete ? pages.flatMap(page => page.artifacts) : [];
  check("uniqueSelectedArtifact", artifacts.filter(item => item.expired === false && item.name === name).length, 1);
  const prefix = name.slice(0, name.lastIndexOf("-") + 1);
  const packaged = artifacts.filter(item => item.expired === false && typeof item.name === "string" && item.name.startsWith(prefix));
  const attempts = packaged.map(item => /-([1-9][0-9]*)$/u.exec(item.name)?.[1]).map(value => Number(value));
  check("packagedAttemptsValid", attempts.every(value => Number.isSafeInteger(value) && value > 0), true);
  check("freshestPackagedAttempt", attempts.length ? Math.max(...attempts) : 0, expected.runAttempt);
  const failedChecks = Object.keys(checks).filter(name => !checks[name]);
  const superseding = supersededBy({recovery: expected.recovery, failedChecks,
    allowed: SUPERSEDING_AUTHORIZATION_CHECKS, latestRunNumber: latest.run_number, runNumber});
  return {passed: failedChecks.length === 0, superseded: superseding !== null, supersededBy: superseding,
    failedChecks, checks, observations,
    binding: failedChecks.length === 0 ? {workflowId, runNumber, artifactName: name} : null};
}

export function readAuthorizationSnapshot(expected, noCache, api) {
  const root = `repos/${expected.repository}`;
  const attempt = api(`${root}/actions/runs/${expected.runId}/attempts/${expected.runAttempt}`, {noCache});
  const current = api(`${root}/actions/runs/${expected.runId}`, {noCache});
  const canonical = api(`${root}/actions/workflows/${expected.surface}-website.yml`, {noCache});
  const latest = api(`${root}/actions/workflows/${attempt.workflow_id}/runs?branch=main&event=push&per_page=1`, {noCache});
  const artifact = api(`${root}/actions/artifacts/${expected.artifactId}`, {noCache, artifact: true});
  const repository = api(root, {noCache});
  const pages = api(`${root}/actions/runs/${expected.runId}/artifacts?per_page=100`, {noCache, artifact: true, paginate: true});
  return {attempt, current, canonical, latest, artifact, repository, pages};
}

export function authorizePromotion(expected, api, log = () => {}) {
  let last = null;
  for (const noCache of [false, true]) {
    let result;
    try {
      result = evaluatePromotionAuthorization(expected, readAuthorizationSnapshot(expected, noCache, api));
    } catch {
      result = {passed: false, failedChecks: ["authorizationMetadataRead"],
        checks: {authorizationMetadataRead: false}, observations: {authorizationMetadataRead: {expected: "complete valid metadata", observed: "<unavailable-or-invalid>"}}};
    }
    log({phase: noCache ? "single no-cache read" : "initial read", ...result, binding: undefined});
    if (result.passed) return result.binding;
    last = result;
  }
  if (last?.superseded) return {superseded: true, latestRunNumber: last.supersededBy.runNumber};
  throw new Error("Initial authorization remains unsatisfied after one complete no-cache read; refusing deployment.");
}

if (process.argv[2] === "authorize") {
  const env = process.env;
  const expected = {surface: env.SURFACE, repository: env.GITHUB_REPOSITORY,
    runId: env.SOURCE_CI_RUN_ID, runAttempt: Number(env.SOURCE_CI_RUN_ATTEMPT),
    sourceSha: env.SOURCE_SHA, recovery: env.IS_RECOVERY === "true",
    artifactId: Number(env.ARTIFACT_ID), artifactDigest: env.ARTIFACT_DIGEST};
  const api = (endpoint, options) => {
    const args = ["api"];
    if (options.noCache) args.push("-H", "Cache-Control: no-cache");
    if (options.artifact) args.push("-H", "X-GitHub-Api-Version: 2026-03-10");
    if (options.paginate) args.push("--paginate", "--slurp");
    args.push(endpoint);
    const response = spawnSync("gh", args, {encoding: "utf8", maxBuffer: 16 * 1024 * 1024});
    if (response.status !== 0) throw new Error("Metadata read failed");
    return JSON.parse(response.stdout);
  };
  try {
    const binding = authorizePromotion(expected, api, result => process.stderr.write(`${JSON.stringify(result)}\n`));
    process.stdout.write(`${JSON.stringify(binding)}\n`);
  } catch {
    process.stderr.write("Initial authorization remains unsatisfied after one complete no-cache read; refusing deployment.\n");
    process.exitCode = 1;
  }
} else if (process.argv[2] === "evaluate") {
  try {
    const evidence = JSON.parse(fs.readFileSync(0, "utf8"));
    process.stdout.write(`${JSON.stringify(evaluatePromotionFreshness(evidence))}\n`);
  } catch {
    // Never echo source API responses, malformed payloads, or environment data.
    process.stdout.write(`${JSON.stringify({
      passed: false,
      failedChecks: ["evidenceCouldNotBeEvaluated"],
      checks: {evidenceCouldNotBeEvaluated: false},
      expected: null,
      actual: null,
    })}\n`);
  }
} else if (process.argv[1] === new URL(import.meta.url).pathname) {
  process.stderr.write("Usage: node web_hosting_freshness.mjs authorize | evaluate < evidence.json\n");
  process.exitCode = 64;
}
