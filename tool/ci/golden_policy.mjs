#!/usr/bin/env node
// The golden and capture policy for main (owner decision, 22 Nov 2026). The
// macOS goldens and the capture render left the merge queue, so main pushes
// and the nightly are where they fail. When main's CI (a push or the nightly)
// completes, this keeps two GitHub issues in step with it:
//
// - "Golden or capture failure", labelled release-block:mobile, when either
//   macOS job failed (a render error, an assertion, stale generated code, a
//   failed capture render). Release Readiness fails while it is open
//   (tool/ci/release_block.mjs). A baseline refresh is the wrong fix for a
//   failure, so nothing is dispatched; it closes on the next main run that
//   passes every job it still owes.
// - "Golden baselines drifted", unlabelled and report-only, when the goldens
//   passed but some differ from their baselines. Opening it, or a newly
//   drifted suite, dispatches that suite's baseline workflow at the drifted
//   commit; a person reviews its artifact and commits it. The baseline
//   workflows never push or open a pull request. It closes on the next main
//   run whose goldens pass with no drift.
//
// No auto-revert. Usage (Main CI alert workflow): GH_TOKEN, GITHUB_REPOSITORY, RUN_ID set.
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";

export const FAILURE_TITLE = "Golden or capture failure";
export const DRIFT_TITLE = "Golden baselines drifted";
export const RELEASE_BLOCK_LABEL = "release-block:mobile";
export const GOLDENS_JOB = "visual-integration / macOS goldens & Widgetbook determinism";
export const CAPTURE_JOB = "capture-freshness / Render and validate canonical iPhone captures";
const CAPTURE_REUSE_JOB = "capture-freshness / Reuse validated canonical iPhone captures";
/** The main jobs whose failure blocks a mobile release, and nothing else. */
export const MOBILE_BLOCK_JOBS = Object.freeze([GOLDENS_JOB, CAPTURE_JOB]);
// A capture failure is settled by a later capture that rendered, or that
// reused a validated render of the same inputs.
const SETTLED_BY = {[GOLDENS_JOB]: [GOLDENS_JOB], [CAPTURE_JOB]: [CAPTURE_JOB, CAPTURE_REUSE_JOB]};
export const DRIFT_ARTIFACT_PREFIX = "golden-drift-";
/** The per-suite report files in the drift artifact (visual-integration-ci.yml). */
export const DRIFT_REPORTS = Object.freeze({
  app: "catch-golden-report-app.tsv",
  package: "catch-golden-report-package.tsv",
  widgetbook: "catch-golden-report-widgetbook.tsv",
});
/** The dispatch-only workflow that renders each suite's baselines; the app goldens have none. */
export const BASELINE_WORKFLOWS = Object.freeze({
  package: "package-golden-baselines.yml",
  widgetbook: "widgetbook-golden-baselines.yml",
});
const FAILED = new Set(["failure", "timed_out", "startup_failure", "action_required"]);
const SHA = /^[0-9a-f]{40}$/u;
const FOOTER = "\n\n---\n_Posted by the Main CI alert workflow (tool/ci/golden_policy.mjs)._";
const FAILURE_MARKER = /<!-- golden-failure-owed (\{.*?\}) -->/gu;
const DRIFT_MARKER = /<!-- golden-drift (\{.*?\}) -->/gu;

function latestRecord(texts, pattern, valid) {
  let record = null;
  for (const text of texts) {
    for (const match of String(text ?? "").matchAll(pattern)) {
      try {
        const value = JSON.parse(match[1]);
        if (valid(value)) record = value;
      } catch {
        // A malformed record is ignored; an earlier valid one stands.
      }
    }
  }
  return record;
}

const names = (value) => Array.isArray(value) && value.every((name) => typeof name === "string");
/** The jobs the open failure issue still owes, from its latest post (body, then comments). */
export const owedFromFailureIssue = (texts) => latestRecord(texts, FAILURE_MARKER, (value) => names(value.jobs))?.jobs ?? null;
/** The suites the open drift issue last reported. */
export const suitesFromDriftIssue = (texts) => latestRecord(texts, DRIFT_MARKER, (value) => names(value.suites))?.suites ?? null;

const link = (job) => (job.html_url ? `[${job.name}](${job.html_url})` : job.name);
const mainRun = (run) => ["push", "schedule"].includes(run?.event) && run?.head_branch === "main" &&
  SHA.test(String(run?.head_sha ?? ""));

/**
 * The release-blocking failure issue for a completed main CI run. Pure.
 *
 * @param {object} input
 * @param {{html_url:string, head_sha:string, event:string, head_branch:string}} input.run
 * @param {Array<{name:string, conclusion:string|null, html_url?:string}>} input.jobs The run's jobs (latest attempt).
 * @param {{number:number}|null} input.openIssue The open "Golden or capture failure" issue, if any.
 * @param {string[]|null} [input.owed] Its owed jobs (owedFromFailureIssue); null owes every blocking job.
 */
export function decideFailure({run, jobs, openIssue, owed = null}) {
  if (!mainRun(run)) return {action: "none", reason: "not_main"};
  const failed = jobs.filter((job) => MOBILE_BLOCK_JOBS.includes(job.name) && FAILED.has(job.conclusion));
  const passed = new Set(jobs.filter((job) => job.conclusion === "success").map((job) => job.name));
  const settled = (name) => (SETTLED_BY[name] ?? [name]).some((job) => passed.has(job));
  const sha = run.head_sha.slice(0, 8);
  if (failed.length) {
    const owedNow = [...new Set([...failed.map((job) => job.name),
      ...(openIssue ? owed ?? MOBILE_BLOCK_JOBS : []).filter((name) => !settled(name))])].sort();
    const body = [
      `Main CI (${run.event}) at ${sha}: ${run.html_url}`, "",
      "Failed:", ...failed.map((job) => `- ${link(job)}`), "",
      `**Mobile releases are blocked**: Release Readiness fails while an open issue carries \`${RELEASE_BLOCK_LABEL}\`.`,
      "A failure (render error, assertion, stale generated code, failed capture render) is not baseline drift, " +
        "so no baseline refresh was dispatched. Fix forward on main; this issue closes itself on the next main run " +
        "that passes these jobs. No commit is reverted automatically.",
    ].join("\n") + `\n<!-- golden-failure-owed ${JSON.stringify({jobs: owedNow})} -->` + FOOTER;
    return openIssue ?
      {action: "comment", issue: openIssue.number, body, label: RELEASE_BLOCK_LABEL} :
      {action: "open", title: FAILURE_TITLE, body, label: RELEASE_BLOCK_LABEL};
  }
  if (!openIssue) return {action: "none"};
  const missing = (owed ?? MOBILE_BLOCK_JOBS).filter((name) => !settled(name));
  if (missing.length) return {action: "none", reason: "still_owed"};
  return {action: "close", issue: openIssue.number,
    body: `The golden and capture jobs pass again at ${sha}: ${run.html_url}. Mobile releases are no longer blocked by this issue.${FOOTER}`};
}

/** The drifted goldens per suite, from the drift artifact's report files (name -> text). */
export function parseDrift(files) {
  const drift = {};
  for (const [suite, file] of Object.entries(DRIFT_REPORTS)) {
    const rows = String(files[file] ?? "").split("\n").map((line) => line.split("\t"))
      .filter((cells) => cells.length >= 2 && cells[0].trim())
      .map(([golden, change]) => ({golden: golden.trim(), change: change.trim()}));
    const unique = [...new Map(rows.map((row) => [row.golden, row])).values()];
    if (unique.length) drift[suite] = unique.sort((left, right) => left.golden.localeCompare(right.golden));
  }
  return drift;
}

/**
 * The report-only drift issue and baseline dispatches for a completed main CI run. Pure.
 *
 * @param {object} input
 * @param {{html_url:string, head_sha:string, event:string, head_branch:string}} input.run
 * @param {Array<{name:string, conclusion:string|null}>} input.jobs
 * @param {Record<string, Array<{golden:string, change:string}>>|null} input.drift parseDrift of this
 *   run's drift artifact; {} when the goldens passed with no artifact.
 * @param {{number:number}|null} input.openIssue The open "Golden baselines drifted" issue, if any.
 * @param {string[]|null} [input.reported] The suites it last reported (suitesFromDriftIssue).
 */
export function decideDrift({run, jobs, drift, openIssue, reported = null}) {
  if (!mainRun(run)) return {action: "none", reason: "not_main"};
  // Only a passing goldens job says anything about drift; a failure is the failure issue's.
  if (jobs.find((job) => job.name === GOLDENS_JOB)?.conclusion !== "success") return {action: "none", reason: "goldens_not_passed"};
  const sha = run.head_sha.slice(0, 8);
  const suites = Object.keys(drift ?? {}).sort();
  if (!suites.length) {
    return openIssue ?
      {action: "close", issue: openIssue.number,
        body: `The goldens match their baselines at ${sha}: ${run.html_url}.${FOOTER}`} :
      {action: "none"};
  }
  // Dispatch on opening, and for a suite that newly drifted; not on every run.
  const fresh = suites.filter((suite) => !openIssue || !(reported ?? []).includes(suite));
  if (openIssue && !fresh.length) return {action: "none", reason: "already_reported"};
  const dispatch = fresh.filter((suite) => BASELINE_WORKFLOWS[suite])
    .map((suite) => ({suite, workflow: BASELINE_WORKFLOWS[suite], inputs: {ref: run.head_sha, name_pattern: "."}}));
  const lines = suites.flatMap((suite) => {
    const rows = drift[suite];
    const shown = rows.slice(0, 25).map((row) => `  - \`${row.golden}\` (${row.change})`);
    return [`- **${suite}**: ${rows.length} golden(s)`, ...shown, ...(rows.length > shown.length ? [`  - and ${rows.length - shown.length} more`] : [])];
  });
  const body = [
    `The goldens passed at ${sha} (${run.event}), but some differ from their baselines: ${run.html_url}`, "",
    ...lines, "",
    "Report only: drift does not block a merge or a release. The images are in the run's flutter-golden-failures artifact.",
    ...(dispatch.length ? ["", "Baseline refresh dispatched at this commit (it uploads changed baselines for a person to review and commit; it never pushes):",
      ...dispatch.map((entry) => `- ${entry.suite}: \`${entry.workflow}\`{{${entry.suite}}}`)] : []),
    ...(fresh.includes("app") ? ["", "The app goldens (`test/goldens`) have no baseline workflow: refresh them on macOS with " +
      "`flutter test --concurrency=1 --update-goldens test/goldens` and commit the result."] : []),
  ].join("\n") + `\n<!-- golden-drift ${JSON.stringify({suites})} -->` + FOOTER;
  return openIssue ?
    {action: "comment", issue: openIssue.number, body, dispatch} :
    {action: "open", title: DRIFT_TITLE, body, dispatch};
}

function gh(args, input) {
  const result = spawnSync("gh", args, {encoding: "utf8", input, maxBuffer: 32 * 1024 * 1024});
  assert.equal(result.status, 0, result.stderr || `gh ${args.join(" ")} failed`);
  return result.stdout;
}

const issueTexts = (repository, issue) => [issue.body, ...JSON.parse(gh(["api", "--paginate", "--slurp",
  `repos/${repository}/issues/${issue.number}/comments?per_page=100`])).flat().map((comment) => comment.body)];

function ensureLabel(repository, label) {
  const found = spawnSync("gh", ["api", `repos/${repository}/labels/${encodeURIComponent(label)}`], {encoding: "utf8"});
  if (found.status === 0) return;
  gh(["api", "-X", "POST", `repos/${repository}/labels`, "-f", `name=${label}`, "-f", "color=b60205",
    "-f", "description=Release Readiness fails while an open issue carries this label"]);
}

/** This run's drift reports, or {} when it uploaded none. */
function readDrift(repository, runId) {
  const artifacts = JSON.parse(gh(["api", "--paginate", "--slurp", `repos/${repository}/actions/runs/${runId}/artifacts?per_page=100`]))
    .flatMap((page) => page.artifacts ?? [])
    .filter((artifact) => artifact.name.startsWith(DRIFT_ARTIFACT_PREFIX) && !artifact.expired);
  const artifact = artifacts.sort((left, right) => right.id - left.id)[0];
  if (!artifact) return {};
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "golden-drift-"));
  const zip = path.join(dir, "drift.zip");
  const download = spawnSync("gh", ["api", `repos/${repository}/actions/artifacts/${artifact.id}/zip`], {maxBuffer: 16 * 1024 * 1024});
  assert.equal(download.status, 0, String(download.stderr || "drift artifact download failed"));
  fs.writeFileSync(zip, download.stdout);
  const files = {};
  for (const file of Object.values(DRIFT_REPORTS)) {
    const result = spawnSync("unzip", ["-p", zip, file], {encoding: "utf8"});
    if (result.status === 0) files[file] = result.stdout;
  }
  return parseDrift(files);
}

function post(repository, decision) {
  if (decision.action === "open") {
    gh(["api", "-X", "POST", `repos/${repository}/issues`, "-f", `title=${decision.title}`, "-F", "body=@-",
      ...(decision.label ? ["-f", `labels[]=${decision.label}`] : [])], decision.body);
  } else if (["comment", "close"].includes(decision.action)) {
    gh(["api", "-X", "POST", `repos/${repository}/issues/${decision.issue}/comments`, "-F", "body=@-"], decision.body);
    if (decision.label) gh(["api", "-X", "POST", `repos/${repository}/issues/${decision.issue}/labels`, "-f", `labels[]=${decision.label}`]);
    if (decision.action === "close") {
      gh(["api", "-X", "PATCH", `repos/${repository}/issues/${decision.issue}`, "-f", "state=closed", "-f", "state_reason=completed"]);
    }
  }
}

function main() {
  const repository = process.env.GITHUB_REPOSITORY;
  const runId = process.env.RUN_ID;
  assert.match(repository ?? "", /^[\w.-]+\/[\w.-]+$/u, "GITHUB_REPOSITORY is required");
  assert.match(runId ?? "", /^[1-9][0-9]*$/u, "RUN_ID is required");
  const run = JSON.parse(gh(["api", `repos/${repository}/actions/runs/${runId}`]));
  const jobs = JSON.parse(gh(["api", "--paginate", "--slurp", `repos/${repository}/actions/runs/${runId}/jobs?per_page=100&filter=latest`]))
    .flatMap((page) => page.jobs ?? []);
  const issues = JSON.parse(gh(["api", `repos/${repository}/issues?state=open&creator=github-actions%5Bbot%5D&per_page=100`]))
    .filter((issue) => !issue.pull_request);
  const failureIssue = issues.find((issue) => issue.title === FAILURE_TITLE) ?? null;
  const failure = decideFailure({run, jobs, openIssue: failureIssue,
    owed: failureIssue ? owedFromFailureIssue(issueTexts(repository, failureIssue)) : null});
  if (failure.label) ensureLabel(repository, failure.label);
  post(repository, failure);
  console.log(`Golden or capture failure: ${failure.action}${failure.reason ? ` (${failure.reason})` : ""}`);

  const goldens = jobs.find((job) => job.name === GOLDENS_JOB);
  const driftIssue = issues.find((issue) => issue.title === DRIFT_TITLE) ?? null;
  const drift = mainRun(run) && goldens?.conclusion === "success" ? readDrift(repository, runId) : null;
  const decision = decideDrift({run, jobs, drift, openIssue: driftIssue,
    reported: driftIssue ? suitesFromDriftIssue(issueTexts(repository, driftIssue)) : null});
  let body = decision.body;
  for (const entry of decision.dispatch ?? []) {
    // The dispatch runs main's copy of the workflow; its own `ref` input checks out the drifted commit.
    const args = ["api", "-X", "POST", `repos/${repository}/actions/workflows/${entry.workflow}/dispatches`,
      "-f", "ref=main", "-f", `inputs[ref]=${entry.inputs.ref}`, "-f", `inputs[name_pattern]=${entry.inputs.name_pattern}`];
    // Ask for the new run's link; an API that refuses the field still dispatches without it.
    let result = spawnSync("gh", [...args, "-F", "return_run_details=true"], {encoding: "utf8"});
    if (result.status !== 0) result = spawnSync("gh", args, {encoding: "utf8"});
    let target = `https://github.com/${repository}/actions/workflows/${entry.workflow}`;
    if (result.status === 0) {
      try {
        target = JSON.parse(result.stdout || "{}").html_url ?? target;
      } catch {
        // An empty 204 answer still dispatched; link the workflow's runs.
      }
    }
    body = body.replace(`{{${entry.suite}}}`, result.status === 0 ? `: ${target}` : ` could not be dispatched (${result.stderr.split("\n")[0]}); run it by hand: ${target}`);
  }
  post(repository, {...decision, body});
  console.log(`Golden baselines drifted: ${decision.action}${decision.reason ? ` (${decision.reason})` : ""}` +
    `${decision.dispatch?.length ? `, dispatched ${decision.dispatch.map((entry) => entry.workflow).join(", ")}` : ""}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
