#!/usr/bin/env node
// Which macOS jobs a main push the merge queue already validated still runs.
//
// The merge queue no longer runs the macOS goldens or the capture render
// (owner decision, 22 Nov 2026), so main runs them when the queue's own Nx plan
// selected visual integration (goldens), or capture freshness or marketing
// (captures). A main push run plans from the nearest earlier run that ran
// (tool/ci/main_push_base.mjs), so it also covers commits whose own push runs
// were replaced before they ran; their deferred macOS work is owed here too
// (RE, 22 Nov 2026: 4d66cf5e6's run was replaced and the next run read only its
// own plan). This ORs each job over every commit in base..HEAD, each read from
// that commit's own queue run. Anything it cannot read runs both jobs; it never
// skips them on a guess.
//
// Usage: node tool/ci/main_macos_selection.mjs --head <sha> --before <sha> --run-id <id> --queue-run <id>
// Prints `goldens=<true|false>`, `captures=<true|false>` and `commits=<n>` for $GITHUB_OUTPUT.

import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";

const SHA = /^[0-9a-f]{40}$/u;
const RUN = /^[1-9][0-9]*$/u;
/** Beyond this many commits, the run plays safe instead of reading every plan. */
export const MAX_COMMITS = 30;

/** What a queue run's harness plan selects for the macOS jobs, or null when it is not this commit's plan. */
export function macosFromPlan(plan, sha) {
  if (plan?.sourceSha !== sha || !Array.isArray(plan?.operations?.ciTargets)) return null;
  const targets = plan.operations.ciTargets;
  return {goldens: targets.includes("visual_integration"),
    captures: targets.includes("capture_freshness") || targets.includes("marketing")};
}

/**
 * ORs the macOS jobs over the commits a queue-verified main push covers. Pure.
 *
 * @param {object} input
 * @param {{full:boolean}|null} input.base main_push_base's answer; null when it could not be read.
 * @param {string[]|null} input.commits base..HEAD, newest first; null when Git could not list them.
 * @param {(sha: string) => {goldens:boolean, captures:boolean} | null} input.selectionFor
 *   One commit's selection from its own queue run; null when it cannot be read.
 * @returns {{goldens:boolean, captures:boolean, reason:string, commits:number}}
 */
export function selectMainMacos({base, commits, selectionFor}) {
  const both = (reason, count = 0) => ({goldens: true, captures: true, reason, commits: count});
  if (!base || base.full) return both("base_unknown");
  if (!Array.isArray(commits) || !commits.length) return both("no_commits");
  if (commits.length > MAX_COMMITS) return both("too_many_commits", commits.length);
  let goldens = false;
  let captures = false;
  for (const sha of commits) {
    const selection = selectionFor(sha);
    if (!selection) return both(`unreadable:${sha.slice(0, 8)}`, commits.length);
    goldens ||= selection.goldens;
    captures ||= selection.captures;
  }
  return {goldens, captures, reason: commits.length > 1 ? "covers_replaced_runs" : "own_plan", commits: commits.length};
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 2) {
    const [flag, value] = [argv[index], argv[index + 1]];
    assert.ok(["--head", "--before", "--run-id", "--queue-run"].includes(flag), `Unknown argument: ${flag}`);
    assert.ok(value, `${flag} needs a value`);
    args[flag.slice(2)] = value;
  }
  assert.match(args.head ?? "", SHA, "--head must be a full commit SHA");
  assert.match(args.before ?? "", SHA, "--before must be a full commit SHA");
  assert.match(args["run-id"] ?? "", RUN, "--run-id must be a run id");
  assert.match(args["queue-run"] ?? "", RUN, "--queue-run must be a run id");
  return {head: args.head, before: args.before, runId: args["run-id"], queueRun: args["queue-run"]};
}

const here = path.dirname(fileURLToPath(import.meta.url));
const node = (script, args) => spawnSync(process.execPath, [path.join(here, script), ...args],
  {encoding: "utf8", maxBuffer: 16 * 1024 * 1024});

function readBase({head, before, runId}) {
  const result = node("main_push_base.mjs", ["--head", head, "--before", before, "--run-id", runId]);
  if (result.status !== 0) return null;
  const field = (name) => new RegExp(`^${name}=(.*)$`, "mu").exec(result.stdout)?.[1];
  const baseSha = field("base_sha");
  if (!SHA.test(baseSha ?? "") || !["true", "false"].includes(field("full"))) return null;
  return {baseSha, full: field("full") === "true"};
}

function listCommits(baseSha, head) {
  const result = spawnSync("git", ["rev-list", "--first-parent", `${baseSha}..${head}`], {encoding: "utf8"});
  if (result.status !== 0) return null;
  const commits = result.stdout.split("\n").filter(Boolean);
  return commits.every((sha) => SHA.test(sha)) ? commits : null;
}

function queueRunFor(sha, {head, queueRun}) {
  if (sha === head) return queueRun;
  const result = node("main_push_queue_proof.mjs", ["--sha", sha]);
  const id = result.status === 0 ? result.stdout.trim() : "";
  return RUN.test(id) ? id : null;
}

function planSelection(repository, runId, sha) {
  const artifacts = spawnSync("gh", ["api", `repos/${repository}/actions/runs/${runId}/artifacts?per_page=100`],
    {encoding: "utf8", maxBuffer: 16 * 1024 * 1024});
  if (artifacts.status !== 0) return null;
  let artifact;
  try {
    artifact = (JSON.parse(artifacts.stdout).artifacts ?? [])
      .filter((entry) => String(entry.name).startsWith("harness-plan-") && !entry.expired)
      .sort((left, right) => Number(right.id) - Number(left.id))[0];
  } catch {
    return null;
  }
  if (!RUN.test(String(artifact?.id ?? ""))) return null;
  const zip = spawnSync("gh", ["api", `repos/${repository}/actions/artifacts/${artifact.id}/zip`], {maxBuffer: 16 * 1024 * 1024});
  if (zip.status !== 0) return null;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "main-macos-"));
  try {
    fs.writeFileSync(path.join(dir, "plan.zip"), zip.stdout);
    const plan = spawnSync("unzip", ["-p", path.join(dir, "plan.zip"), "impact-plan.json"], {encoding: "utf8"});
    return plan.status === 0 ? macosFromPlan(JSON.parse(plan.stdout), sha) : null;
  } catch {
    return null;
  } finally {
    fs.rmSync(dir, {recursive: true, force: true});
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const repository = process.env.GITHUB_REPOSITORY;
  assert.match(repository ?? "", /^[\w.-]+\/[\w.-]+$/u, "GITHUB_REPOSITORY is required");
  const base = readBase(args);
  const commits = base && !base.full ? listCommits(base.baseSha, args.head) : null;
  const decision = selectMainMacos({base, commits, selectionFor: (sha) => {
    const runId = queueRunFor(sha, args);
    const selection = runId ? planSelection(repository, runId, sha) : null;
    console.error(`  ${sha.slice(0, 8)}: queue run ${runId ?? "none"}, ` +
      (selection ? `goldens ${selection.goldens}, captures ${selection.captures}` : "unreadable"));
    return selection;
  }});
  console.error(`macOS jobs: goldens ${decision.goldens}, captures ${decision.captures} ` +
    `(${decision.reason}, ${decision.commits} commit(s) from ${base?.baseSha?.slice(0, 8) ?? "unknown base"})`);
  process.stdout.write(`goldens=${decision.goldens}\ncaptures=${decision.captures}\ncommits=${decision.commits}\n` +
    `reason=${decision.reason}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
