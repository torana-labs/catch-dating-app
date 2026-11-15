#!/usr/bin/env node
// Weekly, report-only: does dev's live Functions state still match the
// newest delivered deploy:backend-functions record? Per-Function deploys
// (tool/firebase/plan_function_deploy.mjs) trust that record: a Function it
// lists as deployed is skipped until its hash changes. So drift between the
// record and dev must surface. Two kinds:
//
// - Missing: a Function the record lists is not live on dev.
// - Changed after the record: a live Function updated after the record was
//   written (a named-Functions run, which records nothing, or a deploy from
//   outside Deploy backend).
//
// Live Functions the record does not list (environment-only or dormant ones)
// are not drift. It reads only metadata (gcloud functions list, the GitHub
// deployments API) with dev's existing credentials, and keeps one issue in
// step: opened on the first drift, commented on further drift, closed with a
// comment when dev matches again.
//
// Usage (Functions drift workflow): GH_TOKEN, GITHUB_REPOSITORY,
// GITHUB_SERVER_URL, GITHUB_RUN_ID set; gcloud authenticated for dev.
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import {fileURLToPath} from "node:url";

export const ISSUE_TITLE = "Dev Functions drift from the deploy record";
// A deploy finishes updating Functions before it writes the record, and
// GitHub and Cloud clocks differ slightly.
export const GRACE_MS = 10 * 60 * 1000;
const FOOTER = "\n\n---\n_Posted by the Functions drift workflow (tool/ci/functions_drift_report.mjs)._";

/** A live Function's short name from its resource name. */
export function functionName(resource) {
  return String(resource).split("/").at(-1);
}

/**
 * The drift between dev's live Functions and the newest delivered Functions
 * record. Pure, so every case is testable.
 *
 * @param {object} input
 * @param {Array<{name: string, updateTime: string}>} input.live Live Functions (resource names allowed).
 * @param {{sha: string, createdAt: string, payload: object}|null} input.record
 */
export function findDrift({live, record}) {
  if (!record) return {status: "unknown", reason: "dev has no delivered deploy:backend-functions record yet"};
  const payload = typeof record.payload === "string" ? JSON.parse(record.payload) : record.payload;
  const codebases = payload?.codebases ?? {};
  if (payload?.version !== 2 || Object.values(codebases).some((entry) => typeof entry?.functions !== "object")) {
    return {status: "unknown", reason: `the newest record (${record.sha.slice(0, 8)}) predates per-Function hashes`};
  }
  const recorded = new Set(Object.values(codebases).flatMap((entry) => Object.keys(entry.functions)));
  const recordedAt = Date.parse(record.createdAt);
  assert.ok(Number.isFinite(recordedAt), "The record names when it was written");
  const liveByName = new Map(live.map((fn) => [functionName(fn.name), fn]));
  const missing = [...recorded].filter((name) => !liveByName.has(name)).sort();
  const changed = [...recorded].filter((name) => liveByName.has(name) &&
    Date.parse(liveByName.get(name).updateTime) > recordedAt + GRACE_MS)
    .map((name) => ({name, updateTime: liveByName.get(name).updateTime})).sort((a, b) => a.name.localeCompare(b.name));
  return {status: missing.length || changed.length ? "drift" : "clean", missing, changed,
    recorded: recorded.size, live: live.length, sha: record.sha, createdAt: record.createdAt};
}

/** What to do with the one drift issue. */
export function decideIssue({drift, openIssue, runUrl}) {
  if (drift.status === "unknown") return {action: "none", reason: drift.reason};
  if (drift.status === "clean") {
    return openIssue ? {action: "close", issue: openIssue.number,
      body: `Dev matches the deploy record (${drift.sha.slice(0, 8)}, ${drift.recorded} Functions) again: ${runUrl}${FOOTER}`} :
      {action: "none", reason: `dev matches the record (${drift.recorded} Functions)`};
  }
  const list = (items, line) => items.slice(0, 50).map(line).concat(items.length > 50 ? [`- …and ${items.length - 50} more`] : []);
  const body = [
    `Dev's live Functions differ from the newest delivered \`deploy:backend-functions\` record ` +
      `(${drift.sha.slice(0, 8)}, written ${drift.createdAt}): ${runUrl}`,
    ...(drift.missing.length ? ["", `**Missing on dev** (${drift.missing.length}):`, ...list(drift.missing, (name) => `- \`${name}\``)] : []),
    ...(drift.changed.length ? ["", `**Updated after the record** (${drift.changed.length}):`,
      ...list(drift.changed, ({name, updateTime}) => `- \`${name}\` at ${updateTime}`)] : []),
    "",
    "Per-Function deploys skip a Function until its own hash changes, so a Function changed outside Deploy backend " +
      "can stay out of step. A named-Functions run updates Functions without moving the record, which also shows here. " +
      "To resync, run Deploy backend for dev with `full`.",
  ].join("\n") + FOOTER;
  return openIssue ? {action: "comment", issue: openIssue.number, body} : {action: "open", title: ISSUE_TITLE, body};
}

function run(command, args) {
  const result = spawnSync(command, args, {encoding: "utf8", maxBuffer: 64 * 1024 * 1024, timeout: 180_000});
  assert.equal(result.status, 0, result.stderr || `${command} ${args.join(" ")} failed`);
  return result.stdout;
}

function main() {
  const repository = process.env.GITHUB_REPOSITORY;
  assert.match(repository ?? "", /^[\w.-]+\/[\w.-]+$/u, "GITHUB_REPOSITORY is required");
  const project = JSON.parse(fs.readFileSync(".firebaserc", "utf8")).projects.dev;
  const gh = (args, input) => spawnSync("gh", args, {encoding: "utf8", input, maxBuffer: 32 * 1024 * 1024});
  const api = (path) => {
    const result = gh(["api", path]);
    assert.equal(result.status, 0, result.stderr);
    return JSON.parse(result.stdout);
  };
  let record = null;
  for (let page = 1; !record; page++) {
    const deployments = api(`repos/${repository}/deployments?environment=dev&task=deploy:backend-functions&per_page=100&page=${page}`);
    if (!deployments.length) break;
    for (const deployment of deployments) {
      const statuses = api(`repos/${repository}/deployments/${deployment.id}/statuses?per_page=100`);
      const delivered = statuses.find((status) => status.state === "success");
      if (delivered) {
        record = {sha: deployment.sha, createdAt: delivered.created_at, payload: deployment.payload};
        break;
      }
    }
  }
  const live = JSON.parse(run("gcloud", ["functions", "list", "--v2", "--regions=-", `--project=${project}`,
    "--format=json(name,updateTime)", "--quiet"]));
  const drift = findDrift({live, record});
  const issues = api(`repos/${repository}/issues?state=open&creator=github-actions%5Bbot%5D&per_page=100`);
  const openIssue = issues.find((issue) => issue.title === ISSUE_TITLE && !issue.pull_request) ?? null;
  const runUrl = `${process.env.GITHUB_SERVER_URL}/${repository}/actions/runs/${process.env.GITHUB_RUN_ID}`;
  const decision = decideIssue({drift, openIssue, runUrl});
  const write = (args, input) => {
    const result = gh(args, input);
    assert.equal(result.status, 0, result.stderr);
  };
  if (decision.action === "open") {
    write(["api", "-X", "POST", `repos/${repository}/issues`, "-f", `title=${decision.title}`, "-F", "body=@-"], decision.body);
  } else if (decision.action === "comment" || decision.action === "close") {
    write(["api", "-X", "POST", `repos/${repository}/issues/${decision.issue}/comments`, "-F", "body=@-"], decision.body);
    if (decision.action === "close") {
      write(["api", "-X", "PATCH", `repos/${repository}/issues/${decision.issue}`, "-f", "state=closed", "-f", "state_reason=completed"]);
    }
  }
  const summary = `Functions drift on dev: ${drift.status}` +
    (drift.status === "drift" ? ` (${drift.missing.length} missing, ${drift.changed.length} updated after the record)` : "") +
    (decision.reason ? `; ${decision.reason}` : "") + `; issue: ${decision.action}\n`;
  process.stdout.write(summary);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
