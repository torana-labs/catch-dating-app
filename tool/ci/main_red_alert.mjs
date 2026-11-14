#!/usr/bin/env node
// Makes a red main impossible to miss (owner decision, 12 Nov 2026: alert,
// no auto-revert). When main's CI (a push or the nightly) completes, this
// keeps one GitHub issue, "Main CI is red", in step with it: opened on the
// first failure, commented on each further failure, and closed with a comment
// on the next success. Opening an issue notifies repository watchers.
//
// On 12 Nov 2026 main stayed red for hours three times (brand literals from
// #1749, website lint suppressions, the cities route self-test) and nobody
// noticed until a PR tripped over it.
//
// Usage (Main CI alert workflow): GH_TOKEN, GITHUB_REPOSITORY, RUN_ID set.
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {REPORTING_LANES, REQUIRED_CI_JOB, laneOfJob} from "./required_ci_floor.mjs";

export const ISSUE_TITLE = "Main CI is red";
const FAILED = new Set(["failure", "timed_out", "startup_failure", "action_required"]);
const FOOTER = "\n\n---\n_Posted by the Main CI alert workflow (tool/ci/main_red_alert.mjs)._";

/**
 * What to do for a completed main CI run. Pure, so every case is testable.
 *
 * @param {object} input
 * @param {{id:number, html_url:string, head_sha:string, conclusion:string, event:string, display_title?:string}} input.run
 * @param {Array<{name:string, conclusion:string|null, html_url?:string}>} input.jobs The run's jobs (latest attempt).
 * @param {{number:number}|null} input.openIssue The open alert issue, if any.
 */
export function decideAlert({run, jobs, openIssue}) {
  assert.match(String(run?.head_sha ?? ""), /^[0-9a-f]{40}$/u, "A main CI run names its commit");
  if (run.conclusion === "success") {
    return openIssue ?
      {action: "close", issue: openIssue.number,
        body: `Main CI is green again at ${run.head_sha.slice(0, 8)}: ${run.html_url}${FOOTER}`} :
      {action: "none"};
  }
  if (!FAILED.has(run.conclusion)) return {action: "none"};
  const failed = jobs.filter((job) => FAILED.has(job.conclusion));
  const gating = failed.filter((job) => job.name === REQUIRED_CI_JOB || !REPORTING_LANES.includes(laneOfJob(job.name)));
  const reporting = failed.filter((job) => !gating.includes(job));
  const line = (job) => `- ${job.html_url ? `[${job.name}](${job.html_url})` : job.name}`;
  const severity = gating.some((job) => job.name === REQUIRED_CI_JOB) ?
    "**Required CI failed**: PRs that select these lanes are blocked and no release can promote this commit." :
    "Required CI passed; only reporting lanes failed.";
  const body = [
    `Main CI (${run.event}) failed at ${run.head_sha.slice(0, 8)} (${run.display_title ?? "CI"}): ${run.html_url}`,
    "", severity,
    ...(gating.length ? ["", "Gating jobs:", ...gating.map(line)] : []),
    ...(reporting.length ? ["", "Reporting jobs:", ...reporting.map(line)] : []),
    ...(failed.length ? [] : ["", "No individual job failed; open the run for details."]),
    "", "Fix forward on main, then this issue closes itself on the next green main run.",
  ].join("\n") + FOOTER;
  return openIssue ? {action: "comment", issue: openIssue.number, body} : {action: "open", title: ISSUE_TITLE, body};
}

function gh(args, input) {
  const result = spawnSync("gh", args, {encoding: "utf8", input, maxBuffer: 32 * 1024 * 1024});
  assert.equal(result.status, 0, result.stderr || `gh ${args.join(" ")} failed`);
  return result.stdout;
}

function main() {
  const repository = process.env.GITHUB_REPOSITORY;
  const runId = process.env.RUN_ID;
  assert.match(repository ?? "", /^[\w.-]+\/[\w.-]+$/u, "GITHUB_REPOSITORY is required");
  assert.match(runId ?? "", /^[1-9][0-9]*$/u, "RUN_ID is required");
  const run = JSON.parse(gh(["api", `repos/${repository}/actions/runs/${runId}`]));
  const jobs = JSON.parse(gh(["api", "--paginate", "--slurp", `repos/${repository}/actions/runs/${runId}/jobs?per_page=100&filter=latest`]))
    .flatMap((page) => page.jobs ?? []);
  const issues = JSON.parse(gh(["api", `repos/${repository}/issues?state=open&creator=github-actions%5Bbot%5D&per_page=100`]));
  const openIssue = issues.find((issue) => issue.title === ISSUE_TITLE && !issue.pull_request) ?? null;
  const decision = decideAlert({run, jobs, openIssue});
  if (decision.action === "open") {
    gh(["api", "-X", "POST", `repos/${repository}/issues`, "-f", `title=${decision.title}`, "-F", "body=@-"], decision.body);
  } else if (decision.action === "comment" || decision.action === "close") {
    gh(["api", "-X", "POST", `repos/${repository}/issues/${decision.issue}/comments`, "-F", "body=@-"], decision.body);
    if (decision.action === "close") {
      gh(["api", "-X", "PATCH", `repos/${repository}/issues/${decision.issue}`, "-f", "state=closed", "-f", "state_reason=completed"]);
    }
  }
  console.log(`Main CI alert: ${decision.action} (run ${runId}, ${run.conclusion})`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
