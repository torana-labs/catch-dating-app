#!/usr/bin/env node
// Notices a scheduled workflow that never started (owner decision, 22 Nov 2026:
// "dev runs automatically, prod asks first"). GitHub drops or delays scheduled
// runs under load: the :30 Deploy backend schedule started 5-7 hours late on 17
// and 18 Nov 2026, and a nightly that never ran looked the same as a quiet one.
//
// Each hour this looks at the latest daily occurrence of each watched cron whose
// grace period (WATCHDOG_GRACE_HOURS, default 3) has passed. If no run of that
// workflow started since the occurrence, the run is missing:
// - a dev-only or read-only run (Data Validation, the nightly CI, and the dev
//   half of Deploy backend) is dispatched once;
// - a prod run is never dispatched: the "Main CI is red" issue gets the missing
//   run and the command for the owner to run it.
// A nightly that has not started by its deadline is reported as unknown, never
// as green (C5). Every action leaves a marker comment on the issue, and an
// occurrence that already has a marker is never acted on again, so each
// expected run is dispatched or reported at most once.
//
// Usage (Scheduled run watchdog workflow): GH_TOKEN and GITHUB_REPOSITORY set.
// --dry-run prints what it would do and writes nothing. --now <ISO time>
// evaluates as of that time; --assume-missing <target> treats that target's
// runs as absent (both only to prove the workflow; dry runs only).
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";

export const ISSUE_TITLE = "Main CI is red";
export const DEFAULT_GRACE_HOURS = 3;
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const MARKER = /<!-- cron-watchdog (\{.*?\}) -->/gu;
const FOOTER = "\n\n---\n_Posted by the Scheduled run watchdog workflow (tool/ci/cron_watchdog.mjs)._";

/**
 * The watched schedules. `dispatch` is what the watchdog runs itself; `ask`
 * is the prod run it only reports, with the command for the owner. Each cron
 * must match the workflow's own `schedule` (a test checks it).
 */
export const TARGETS = Object.freeze([
  {
    id: "data-validation",
    name: "Firestore Data Validation",
    workflow: "data-validation.yml",
    cron: "13 20 * * *",
    // Read-only: it reads Firestore and writes nothing.
    dispatch: {environment: "prod", max_docs: "5000", fail_on_warning: "false"},
  },
  {
    id: "deploy-backend",
    name: "Deploy backend",
    workflow: "backend-deploy.yml",
    cron: "13 21 * * *",
    dispatch: {environment: "dev"},
    ask: {environment: "prod"},
  },
  {
    id: "nightly-ci",
    name: "CI (nightly)",
    workflow: "ci.yml",
    cron: "23 2 * * *",
    dispatch: {full: "true"},
    nightly: true,
  },
]);

/** The latest occurrence at or before `now` of a daily "M H * * *" cron, in UTC milliseconds. */
export function latestOccurrence(cron, now) {
  const match = /^(\d{1,2}) (\d{1,2}) \* \* \*$/u.exec(cron);
  assert.ok(match, `Only daily "M H * * *" crons are supported, found "${cron}"`);
  const [minute, hour] = [Number(match[1]), Number(match[2])];
  assert.ok(minute < 60 && hour < 24, `Invalid cron "${cron}"`);
  const day = new Date(now);
  const today = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), hour, minute);
  return today <= now ? today : today - DAY;
}

/** The latest occurrence whose grace period has passed: the run that must have started by now. */
export function expectedRun(cron, now, graceHours) {
  return latestOccurrence(cron, now - graceHours * HOUR);
}

/** Watchdog records in issue texts, keyed "target@expected-ISO". */
export function recordsFrom(texts) {
  const records = new Set();
  for (const text of texts) {
    for (const match of String(text ?? "").matchAll(MARKER)) {
      try {
        const value = JSON.parse(match[1]);
        if (typeof value.target === "string" && typeof value.expected === "string") {
          records.add(`${value.target}@${value.expected}`);
        }
      } catch {
        // A malformed marker records nothing.
      }
    }
  }
  return records;
}

const marker = (target, expected, actions) =>
  `\n<!-- cron-watchdog ${JSON.stringify({target, expected, actions})} -->`;

function command(repository, workflow, inputs) {
  const fields = Object.entries(inputs).map(([key, value]) => ` -f ${key}=${value}`).join("");
  return `gh workflow run ${workflow} --repo ${repository} --ref main${fields}`;
}

/**
 * What to do now. Pure, so every case is testable.
 *
 * @param {object} input
 * @param {number} input.now Milliseconds since the epoch.
 * @param {number} input.graceHours
 * @param {string} input.repository owner/name.
 * @param {Record<string, Array<{created_at:string, event:string}>>} input.runs
 *   Each target's recent runs on main, by target id.
 * @param {Set<string>} input.records Keys of occurrences already acted on.
 * @param {readonly object[]} [input.targets]
 * @returns {{checks: object[], dispatches: object[], report: string|null}}
 */
export function decide({now, graceHours, repository, runs, records, targets = TARGETS}) {
  assert.ok(Number.isFinite(graceHours) && graceHours > 0 && graceHours < 24, "graceHours must be between 0 and 24");
  const checks = [];
  const dispatches = [];
  const lines = [];
  const markers = [];
  for (const target of targets) {
    const expected = expectedRun(target.cron, now, graceHours);
    const expectedIso = new Date(expected).toISOString();
    // Only a scheduled or dispatched run stands in for the schedule: CI's push
    // runs on main are not the nightly.
    const started = (runs[target.id] ?? []).some((run) => ["schedule", "workflow_dispatch"].includes(run.event) &&
      Date.parse(run.created_at) >= expected);
    const key = `${target.id}@${expectedIso}`;
    if (started) {
      checks.push({target: target.id, expected: expectedIso, status: "started"});
      continue;
    }
    if (records.has(key)) {
      checks.push({target: target.id, expected: expectedIso, status: target.nightly ? "unknown" : "missing",
        action: "already_handled"});
      continue;
    }
    const actions = [];
    const deadline = new Date(expected + graceHours * HOUR).toISOString();
    lines.push(`**${target.name}** (\`${target.workflow}\`, cron \`${target.cron}\`): no run started between ` +
      `${expectedIso} and ${deadline}.` + (target.nightly ? " Its result counts as **unknown**, not green." : ""));
    if (target.dispatch) {
      dispatches.push({target: target.id, workflow: target.workflow, inputs: target.dispatch});
      actions.push("dispatched");
      lines.push(`- Dispatched now (dev-only or read-only): \`${command(repository, target.workflow, target.dispatch)}\``);
    }
    if (target.ask) {
      actions.push("asked");
      lines.push(`- Not dispatched (prod). To run it: \`${command(repository, target.workflow, target.ask)}\``);
    }
    markers.push(marker(target.id, expectedIso, actions));
    checks.push({target: target.id, expected: expectedIso, status: target.nightly ? "unknown" : "missing", actions});
  }
  const report = lines.length === 0 ? null : [
    "Scheduled runs that did not start within " + `${graceHours} hours of their cron:`,
    "",
    ...lines,
    "",
    "GitHub drops or delays scheduled runs under load. Each missed run is handled once; " +
      "this does not change any run's result.",
  ].join("\n") + markers.join("") + FOOTER;
  return {checks, dispatches, report};
}

function parseArgs(argv) {
  const args = {dryRun: false, now: Date.now(), assumeMissing: null, nowGiven: false};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--now") {
      args.now = Date.parse(argv[++index]);
      args.nowGiven = true;
    }
    else if (arg === "--assume-missing") args.assumeMissing = argv[++index];
    else throw new Error(`Unknown argument: ${arg}`);
  }
  assert.ok(Number.isFinite(args.now), "--now needs an ISO time");
  assert.ok(args.assumeMissing == null || TARGETS.some((target) => target.id === args.assumeMissing),
    `--assume-missing needs one of ${TARGETS.map((target) => target.id).join(", ")}`);
  assert.ok(args.assumeMissing == null || args.dryRun, "--assume-missing only works with --dry-run");
  assert.ok(!args.nowGiven || args.dryRun, "--now only works with --dry-run");
  return args;
}

function gh(args, input) {
  const result = spawnSync("gh", args, {encoding: "utf8", input, maxBuffer: 32 * 1024 * 1024});
  assert.equal(result.status, 0, result.stderr || `gh ${args.join(" ")} failed`);
  return result.stdout;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const repository = process.env.GITHUB_REPOSITORY;
  assert.match(repository ?? "", /^[\w.-]+\/[\w.-]+$/u, "GITHUB_REPOSITORY is required");
  const graceHours = Number(process.env.WATCHDOG_GRACE_HOURS || DEFAULT_GRACE_HOURS);
  const from = new Date(args.now - 2 * DAY).toISOString().slice(0, 10);
  const runs = {};
  for (const target of TARGETS) {
    runs[target.id] = target.id === args.assumeMissing ? [] : JSON.parse(gh(["api",
      `repos/${repository}/actions/workflows/${target.workflow}/runs?branch=main&created=%3E%3D${from}&per_page=100`]))
      .workflow_runs ?? [];
  }
  // Records survive the issue closing: read every alert issue updated recently.
  const since = new Date(args.now - 3 * DAY).toISOString();
  const issues = JSON.parse(gh(["api",
    `repos/${repository}/issues?state=all&creator=github-actions%5Bbot%5D&since=${since}&per_page=100`]))
    .filter((issue) => issue.title === ISSUE_TITLE && !issue.pull_request);
  const texts = issues.flatMap((issue) => [issue.body, ...JSON.parse(gh(["api", "--paginate", "--slurp",
    `repos/${repository}/issues/${issue.number}/comments?per_page=100`])).flat().map((comment) => comment.body)]);
  const decision = decide({now: args.now, graceHours, repository, runs, records: recordsFrom(texts)});
  for (const check of decision.checks) {
    console.log(`${check.target}: expected ${check.expected}, ${check.status}` +
      (check.action ? ` (${check.action})` : check.actions ? ` (${check.actions.join(", ")})` : ""));
  }
  if (args.dryRun) {
    for (const dispatch of decision.dispatches) {
      console.log(`Dry run: would dispatch ${dispatch.workflow} with ${JSON.stringify(dispatch.inputs)}`);
    }
    if (decision.report) console.log(`Dry run: would post to "${ISSUE_TITLE}":\n${decision.report}`);
    return;
  }
  if (!decision.report) return;
  // Record first: a failed dispatch is then reported, never retried hourly.
  const open = issues.find((issue) => issue.state === "open") ?? null;
  if (open) {
    gh(["api", "-X", "POST", `repos/${repository}/issues/${open.number}/comments`, "-F", "body=@-"], decision.report);
  } else {
    gh(["api", "-X", "POST", `repos/${repository}/issues`, "-f", `title=${ISSUE_TITLE}`, "-F", "body=@-"], decision.report);
  }
  for (const dispatch of decision.dispatches) {
    const fields = Object.entries(dispatch.inputs).flatMap(([key, value]) => ["-f", `inputs[${key}]=${value}`]);
    gh(["api", "-X", "POST", `repos/${repository}/actions/workflows/${dispatch.workflow}/dispatches`, "-f", "ref=main", ...fields]);
    console.log(`Dispatched ${dispatch.workflow}`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
