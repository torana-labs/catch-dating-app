#!/usr/bin/env node
// Shadow proof reuse (Phase 1, RE-approved design, 22 Nov 2026): would a
// merge-queue group have been able to reuse a lane that already passed on the
// queued pull request? Shadow only: every lane still runs, nothing is skipped
// and no gate changes. The owner decides on reuse after a week of zero misses.
//
// A lane's key (tool/nx/lane_key.mjs) hashes every file the lane reads in a
// commit's tree, its workflow and toolchain files included. Three modes:
//
//   --keys --head <sha> --out <file>
//     Pull request and queue runs: the keys of every compared lane at <sha>,
//     with the hasher version, printed once as a `proof-keys` notice on this
//     job's check run. The record is only a cross-check: the queue recomputes
//     every key itself and takes no result from it.
//   --verdicts --head <group sha> --head-ref <ref> --out <file>
//     Queue runs: per lane, `would_reuse` or `not_eligible` with a reason.
//     The anchor is GitHub's job records of the pull request's own latest CI
//     run for its current head (this repository's ci.yml, pull_request event),
//     never an artifact. Any unknown means not eligible.
//   --compare --verdicts <file> --out <file>   (NEEDS_JSON set)
//     After the lanes: each verdict against the lane's real result. A lane
//     that would have been reused but failed is a miss.
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {execFileSync, spawnSync} from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SHA = /^[0-9a-f]{40}$/u;
export const RECORD_TITLE = "proof-keys";
export const KEYS_JOB = "Compute proof-reuse keys";
const CI_PATH = ".github/workflows/ci.yml";

/**
 * The queued pull request's number from a merge group's head ref, or null.
 * GitHub sends merge_group.head_ref as a full ref
 * (refs/heads/gh-readonly-queue/<base>/pr-<n>-<sha>); the bare branch name is
 * accepted too.
 */
export function prFromHeadRef(headRef) {
  return /^(?:refs\/heads\/)?gh-readonly-queue\/.+\/pr-([1-9][0-9]*)-[0-9a-f]{40}$/u.exec(headRef ?? "")?.[1] ?? null;
}

/** The ci.yml job that runs each compared lane. */
export const LANE_JOBS = Object.freeze({
  admin: "admin", capture_freshness: "capture-freshness", contracts: "contracts", docs: "docs-policy",
  firestore_rules: "firestore-rules", flutter: "flutter", flutter_build_android: "app-builds",
  flutter_build_ios: "app-builds", flutter_build_web: "app-builds", flutter_web_smoke: "app-builds",
  functions: "functions", marketing: "marketing", operations: "operations", policy_docs: "docs-policy",
  tools: "tools", visual_integration: "visual-integration",
});
/**
 * Lanes whose pull request run proves what their queue run proves: no event,
 * mode or base input or condition in the lane workflow or its ci.yml caller,
 * and one job per lane. Every other lane is compared but never eligible.
 */
export const ELIGIBLE_LANES = Object.freeze(["contracts", "operations"]);
const INELIGIBLE = {
  // Narrow their tests to the pull request's diff in pr mode; the queue runs them in full.
  pr_subset: ["firestore_rules", "flutter", "functions", "tools"],
  // Run different steps on pull requests and in the queue.
  event_branches: ["admin", "capture_freshness", "marketing", "visual_integration"],
  // Share one job with other lanes, so job records give no per-lane result.
  shared_job: ["docs", "policy_docs", "flutter_build_android", "flutter_build_ios", "flutter_build_web", "flutter_web_smoke"],
};
export const laneClass = (lane) => (ELIGIBLE_LANES.includes(lane) ? "eligible" :
  Object.entries(INELIGIBLE).find(([, lanes]) => lanes.includes(lane))?.[0] ?? "unknown_lane");
/** A pull request that changes CI, the hasher or the toolchain is never eligible (RE, 22 Nov 2026). */
export const changesCi = (file) => /^(\.github\/workflows\/|\.github\/actions\/|tool\/ci\/|tool\/nx\/)/u.test(file);
const HASHER_SOURCES = ["tool/nx/lane_key.mjs", "tool/nx/lane_key_replay.mjs", "tool/nx/shadow_plan.mjs",
  "tool/nx/workflow_callers.mjs", "tool/ci/proof_reuse_shadow.mjs"];
const FAILED = new Set(["failure", "cancelled", "timed_out", "action_required", "startup_failure", "stale"]);

/** The hasher version: the key schema and the hasher's own sources, so different hashers never match. */
export function hasherVersion(schema, read = (file) => fs.readFileSync(path.join(repoRoot, file))) {
  const hash = createHash("sha256");
  for (const file of HASHER_SOURCES) hash.update(`${file}\n`).update(read(file)).update("\n");
  return `${schema}+${hash.digest("hex").slice(0, 16)}`;
}

/** The one `proof-keys` record among a check run's annotations, or null. */
export function readRecord(annotations) {
  const records = (annotations ?? []).filter((entry) => entry?.title === RECORD_TITLE);
  if (records.length !== 1) return null;
  try {
    const value = JSON.parse(records[0].message);
    return SHA.test(value?.head ?? "") && typeof value?.v === "string" && value.lanes && typeof value.lanes === "object" ?
      value : null;
  } catch {
    return null;
  }
}

/** A lane's result in a run's job records: its ci.yml job, or that job's called jobs. */
export function laneResult(lane, jobs) {
  const job = LANE_JOBS[lane];
  const mine = (jobs ?? []).filter((entry) => entry?.name === job || String(entry?.name).startsWith(`${job} / `));
  if (!mine.length) return "missing";
  if (mine.some((entry) => entry.status !== "completed" || FAILED.has(entry.conclusion))) return "failed";
  return mine.some((entry) => entry.conclusion === "success") ? "success" : "skipped";
}

/**
 * Per-lane verdicts for a queue group. Pure, so every case is testable.
 *
 * @param {object} input
 * @param {string[]} input.lanes Compared lanes.
 * @param {string} input.repository owner/name.
 * @param {string|null} input.reason A reason no lane is eligible (no pull request, fork, changes_ci, no run...).
 * @param {object|null} input.record The pull request run's proof-keys record (cross-check only).
 * @param {Array<object>} input.jobs The pull request run's latest-attempt job records.
 * @param {string} input.version This hasher's version.
 * @param {{pr: Record<string,string|null>, group: Record<string,string|null>}} input.keys Recomputed keys.
 */
export function decideVerdicts({lanes, reason = null, record = null, jobs = [], version, keys = {pr: {}, group: {}}}) {
  return lanes.map((lane) => {
    const job = LANE_JOBS[lane] ?? null;
    const prKey = keys.pr?.[lane] ?? null;
    const groupKey = keys.group?.[lane] ?? null;
    const keysMatch = Boolean(prKey && groupKey && prKey === groupKey);
    const prResult = reason ? null : laneResult(lane, jobs);
    const base = {lane, job, class: laneClass(lane), keysMatch, prResult, prKey, groupKey};
    const no = (why) => ({...base, verdict: "not_eligible", reason: why});
    if (reason) return no(reason);
    if (base.class !== "eligible") return no(base.class);
    if (prResult === "failed") return no("pr_lane_failed");
    if (prResult !== "success") return no("not_run_on_pr");
    if (!record) return no("no_record");
    if (record.v !== version || record.lanes?.[lane] !== prKey) return no("hasher_mismatch");
    if (!prKey || !groupKey) return no("unknown");
    if (!keysMatch) return no("inputs_changed");
    return {...base, verdict: "would_reuse", reason: "keys_match"};
  });
}

/**
 * Each verdict against the lane's real queue result. Pure.
 *
 * @param {Array<object>} verdicts decideVerdicts output.
 * @param {Record<string, {result:string}>} needs The shadow job's `needs` context.
 */
export function compareShadow(verdicts, needs) {
  return verdicts.map((verdict) => {
    const real = verdict.job ? needs?.[verdict.job]?.result ?? "missing" : "missing";
    const outcome = verdict.verdict !== "would_reuse" ? "not_eligible" : real === "success" ? "hit" : "miss";
    return {...verdict, real, outcome};
  });
}

export function summaryMarkdown(report) {
  const misses = report.lanes.filter((lane) => lane.outcome === "miss");
  return [
    "### Proof reuse shadow", "",
    `Pull request ${report.pr ? `#${report.pr}` : "unknown"}: ${report.lanes.filter((lane) => lane.outcome === "hit").length} would reuse, ` +
      `${misses.length} miss(es). Shadow only: every lane ran.`, "",
    "| Lane | Verdict | Reason | Keys match | Real |", "|---|---|---|---|---|",
    ...report.lanes.map((lane) => `| ${lane.lane} | ${lane.outcome === "miss" ? "**MISS**" : lane.outcome} | ${lane.reason} | ` +
      `${lane.keysMatch ? "yes" : "no"} | ${lane.real} |`),
  ].join("\n");
}

function gh(args) {
  const result = spawnSync("gh", args, {encoding: "utf8", maxBuffer: 64 * 1024 * 1024});
  if (result.status !== 0) throw new Error(`gh ${args.at(-1)}: ${result.stderr.trim().split("\n")[0]}`);
  return JSON.parse(result.stdout);
}

const pages = (endpoint) => gh(["api", "--paginate", "--slurp", endpoint]);

async function keyerFor() {
  const {createKeyer} = await import("../nx/lane_key_replay.mjs");
  const {keySchema} = await import("../nx/lane_key.mjs");
  const {comparedLanes} = await import("../nx/shadow_plan.mjs");
  return {key: createKeyer(), version: hasherVersion(keySchema), lanes: comparedLanes};
}

const keysAt = (key, lanes, sha) => Object.fromEntries(lanes.map((lane) => {
  try {
    return [lane, key(sha, lane)];
  } catch {
    return [lane, null];
  }
}));

function parseArgs(argv) {
  const mode = argv[0];
  assert.ok(["--keys", "--verdicts", "--compare"].includes(mode), "Usage: proof_reuse_shadow.mjs --keys|--verdicts|--compare ...");
  const args = {mode};
  for (let index = 1; index < argv.length; index += 2) {
    assert.ok(argv[index]?.startsWith("--") && argv[index + 1], `Bad argument: ${argv[index]}`);
    args[argv[index].slice(2)] = argv[index + 1];
  }
  return args;
}

async function verdictsFor({repository, head, headRef}) {
  const pr = prFromHeadRef(headRef);
  const {key, version, lanes} = await keyerFor();
  const result = (reason, extra = {}) => ({pr, head, version, lanes: decideVerdicts({lanes, reason, version, ...extra})});
  if (!pr) return result("no_pull_request");
  const pull = gh(["api", `repos/${repository}/pulls/${pr}`]);
  const prHead = pull?.head?.sha;
  if (pull?.head?.repo?.full_name !== repository) return result("fork");
  if (!SHA.test(prHead ?? "")) return result("unknown");
  const files = pages(`repos/${repository}/pulls/${pr}/files?per_page=100`).flat();
  if (!Array.isArray(files) || files.length >= 3000 || files.length !== Number(pull.changed_files)) return result("unknown");
  if (files.some((file) => changesCi(file.filename) || (file.previous_filename && changesCi(file.previous_filename)))) {
    return result("changes_ci");
  }
  const runs = gh(["api", `repos/${repository}/actions/workflows/ci.yml/runs?event=pull_request&head_sha=${prHead}&per_page=20`])
    .workflow_runs ?? [];
  const run = runs.filter((entry) => entry.event === "pull_request" && entry.head_sha === prHead && entry.path === CI_PATH &&
    entry.repository?.full_name === repository && entry.head_repository?.full_name === repository)
    .sort((left, right) => Number(right.id) - Number(left.id))[0];
  if (!run) return result("no_pr_run");
  const jobs = pages(`repos/${repository}/actions/runs/${run.id}/attempts/${run.run_attempt}/jobs?per_page=100`)
    .flatMap((page) => page.jobs ?? []);
  const keysJob = jobs.filter((job) => job.name === KEYS_JOB);
  const record = keysJob.length === 1 && keysJob[0].conclusion === "success" ?
    readRecord(pages(`repos/${repository}/check-runs/${keysJob[0].id}/annotations?per_page=100`).flat()) : null;
  execFileSync("git", ["fetch", "--no-tags", "-q", "origin", prHead], {cwd: repoRoot, stdio: "ignore"});
  const keys = {pr: keysAt(key, lanes, prHead), group: keysAt(key, lanes, head)};
  return {pr, head, prHead, prRun: run.id, version, lanes: decideVerdicts({lanes, record: record?.head === prHead ? record : null,
    jobs, version, keys})};
}

async function main(argv) {
  const args = parseArgs(argv);
  const write = (value) => {
    fs.mkdirSync(path.dirname(args.out), {recursive: true});
    fs.writeFileSync(args.out, `${JSON.stringify(value, null, 2)}\n`);
  };
  if (args.mode === "--keys") {
    assert.match(args.head ?? "", SHA, "--head must be a full commit SHA");
    const {key, version, lanes} = await keyerFor();
    const record = {v: version, head: args.head, lanes: keysAt(key, lanes, args.head)};
    write(record);
    console.log(`::notice title=${RECORD_TITLE}::${JSON.stringify(record)}`);
    return;
  }
  if (args.mode === "--verdicts") {
    assert.match(args.head ?? "", SHA, "--head must be a full commit SHA");
    const repository = process.env.GITHUB_REPOSITORY;
    assert.match(repository ?? "", /^[\w.-]+\/[\w.-]+$/u, "GITHUB_REPOSITORY is required");
    let report;
    try {
      report = await verdictsFor({repository, head: args.head, headRef: args["head-ref"]});
    } catch (error) {
      // Anything unknown is not eligible.
      const {comparedLanes} = await import("../nx/shadow_plan.mjs");
      report = {pr: null, head: args.head, error: error.message.split("\n")[0],
        lanes: decideVerdicts({lanes: comparedLanes, reason: "unknown", version: "unknown"})};
    }
    write(report);
    console.log(`Proof reuse verdicts: ${report.lanes.filter((lane) => lane.verdict === "would_reuse").map((lane) => lane.lane)
      .join(", ") || "none"} would reuse${report.error ? ` (unknown: ${report.error})` : ""}`);
    return;
  }
  const verdicts = JSON.parse(fs.readFileSync(args.verdicts, "utf8"));
  const report = {...verdicts, lanes: compareShadow(verdicts.lanes ?? [], JSON.parse(process.env.NEEDS_JSON ?? "{}"))};
  write(report);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summaryMarkdown(report)}\n`);
  for (const miss of report.lanes.filter((lane) => lane.outcome === "miss")) {
    console.log(`::warning title=Proof reuse shadow miss::${miss.lane} would have been reused but its queue run ended ${miss.real}.`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
