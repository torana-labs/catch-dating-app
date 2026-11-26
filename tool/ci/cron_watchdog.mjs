#!/usr/bin/env node
// Notices a scheduled workflow that never started (owner decision, 22 Nov 2026:
// "dev runs automatically, prod asks first"). GitHub drops or delays scheduled
// runs under load: the :30 Deploy backend schedule started 5-7 hours late on 17
// and 18 Nov 2026, and a nightly that never ran looked the same as a quiet one.
//
// Each hour, and after each CI run on main (the scheduler it watches can stall
// for hours, so a main push wakes it too), this looks at the latest daily
// occurrence of each watched cron whose
// grace period (WATCHDOG_GRACE_HOURS, default 3) has passed. If no run of that
// workflow started since the occurrence, the run is missing:
// - a dev-only run (the nightly CI, the dev half of Deploy backend) is
//   dispatched once;
// - a run that uses prod is never dispatched, even a read-only one (Data
//   Validation, the prod half of Deploy backend): the "Scheduled run missed"
//   issue gets the missing run and the command for the owner to run it.
// A nightly that has not started by its deadline is reported as unknown, never
// as green (C5), on the "Main CI is red" issue, since it is about CI health.
// Every action leaves a marker comment on its issue, and an occurrence that
// already has a marker is never acted on again, so each expected run is
// dispatched or reported at most once. An occurrence from before the
// workflow file reached main is not owed (no commit on main touched the file
// by then), so a newly added workflow is never reported for the day before.
//
// Usage (Scheduled run watchdog workflow): GH_TOKEN and GITHUB_REPOSITORY set.
// --dry-run prints what it would do and writes nothing. --now <ISO time>
// evaluates as of that time; --assume-missing <target> treats that target's
// runs as absent (both only to prove the workflow; dry runs only).
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {NIGHTLY_FROM_HOUR, isNightlyRun} from "./ci_nightly.mjs";

export const MISSED_TITLE = "Scheduled run missed";
export const MAIN_RED_TITLE = "Main CI is red";
// Records are read from issues updated within this window, closed ones too.
export const RECORD_LOOKBACK_DAYS = 3;
export const DEFAULT_GRACE_HOURS = 3;
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const MARKER = /<!-- cron-watchdog (\{.*?\}) -->/gu;
const FOOTER = "\n\n---\n_Posted by the Scheduled run watchdog workflow (tool/ci/cron_watchdog.mjs)._";

/**
 * The watched schedules. `dispatch` is the dev-only run the watchdog starts
 * itself; `ask` is the prod run it only reports, with the command for the
 * owner; `issue` is where it reports. Each cron must match the `schedule` of
 * `scheduleIn`, or else of the workflow itself (a test checks it). `counts`
 * says which runs of the workflow stand in for the schedule.
 */
export const TARGETS = Object.freeze([
  {
    id: "data-validation",
    name: "Firestore Data Validation",
    workflow: "data-validation.yml",
    cron: "13 20 * * *",
    // Read-only, but it uses the prod environment, so the owner runs it.
    ask: {environment: "prod", max_docs: "5000", fail_on_warning: "false"},
    issue: MISSED_TITLE,
  },
  {
    id: "deploy-backend",
    name: "Deploy backend",
    workflow: "backend-deploy.yml",
    cron: "13 21 * * *",
    dispatch: {environment: "dev"},
    ask: {environment: "prod"},
    issue: MISSED_TITLE,
  },
  {
    id: "nightly-ci",
    name: "CI (nightly)",
    workflow: "ci.yml",
    // Since 26 Nov 2026 ci-nightly.yml holds the cron and dispatches ci.yml as
    // the nightly once per UTC day, from 02:00 (tool/ci/ci_nightly.mjs).
    scheduleIn: "ci-nightly.yml",
    cron: "23 2 * * *",
    dailyFrom: NIGHTLY_FROM_HOUR,
    // Only the nightly counts: not a push run, nor another dispatch of ci.yml.
    counts: isNightlyRun,
    // A missed nightly is backfilled with a full run, as before; only
    // ci-nightly.yml dispatches the nightly itself.
    dispatch: {full: "true"},
    nightly: true,
    issue: MAIN_RED_TITLE,
  },
  {
    id: "test-read-map",
    name: "Test read map (shadow)",
    workflow: "test-read-map.yml",
    cron: "41 3 * * *",
    // Report-only: a shadow job nothing consumes, so a missed night is noted, not re-run.
    reportOnly: true,
    // Also wakes after main's push CI and works once per UTC day (daily_once_gate.mjs).
    dailyFrom: 0,
    issue: MISSED_TITLE,
  },
  {
    id: "proof-reuse-daily",
    name: "Proof reuse daily",
    workflow: "proof-reuse-daily.yml",
    cron: "17 5 * * *",
    // Report-only: a missed day is noted; dispatch it with that day's date to rebuild it.
    reportOnly: true,
    // Also wakes after main's push CI, once per UTC day from 02:00 (daily_once_gate.mjs).
    dailyFrom: 2,
    issue: MISSED_TITLE,
  },
]);

/** [year, month, day] of a UTC time, for Date.UTC. */
const utcDay = (ms) => {
  const day = new Date(ms);
  return [day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()];
};

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
 * @param {Record<string, boolean>} [input.onMainBy] Whether each target's
 *   workflow file was on main by its expected occurrence, by target id. false
 *   means the occurrence predates the workflow and is not owed; a target
 *   without an entry is owed.
 * @param {readonly object[]} [input.targets]
 * @returns {{checks: object[], dispatches: object[], reports: Record<string, string>}}
 *   `reports` maps an issue title to the comment to post there.
 */
export function decide({now, graceHours, repository, runs, records, onMainBy = {}, targets = TARGETS}) {
  assert.ok(Number.isFinite(graceHours) && graceHours > 0 && graceHours < 24, "graceHours must be between 0 and 24");
  const checks = [];
  const dispatches = [];
  const sections = new Map();
  for (const target of targets) {
    const expected = expectedRun(target.cron, now, graceHours);
    const expectedIso = new Date(expected).toISOString();
    // Only a scheduled or dispatched run stands in for the schedule: CI's push
    // runs on main are not the nightly. A once-a-day target (dailyFrom) also
    // wakes after main's push CI and does the day's work at the first wake from
    // that UTC hour, so any of its runs since then counts, even one before
    // the cron time (later wakes that day find the work done and skip).
    const from = target.dailyFrom === undefined ? expected :
      Math.min(expected, Date.UTC(...utcDay(expected), target.dailyFrom));
    const events = target.dailyFrom === undefined ? ["schedule", "workflow_dispatch"] :
      ["schedule", "workflow_dispatch", "workflow_run"];
    const counts = target.counts ?? ((run) => events.includes(run.event));
    const started = (runs[target.id] ?? []).some((run) => counts(run) && Date.parse(run.created_at) >= from);
    if (onMainBy[target.id] === false) {
      checks.push({target: target.id, expected: expectedIso, status: "not_scheduled_yet"});
      continue;
    }
    const key = `${target.id}@${expectedIso}`;
    const status = started ? "started" : target.nightly ? "unknown" : "missing";
    if (started) {
      checks.push({target: target.id, expected: expectedIso, status});
      continue;
    }
    if (records.has(key)) {
      checks.push({target: target.id, expected: expectedIso, status, action: "already_handled"});
      continue;
    }
    const actions = [];
    const deadline = new Date(expected + graceHours * HOUR).toISOString();
    const lines = [`**${target.name}** (\`${target.workflow}\`, cron \`${target.cron}\`): no run started between ` +
      `${expectedIso} and ${deadline}.` + (target.nightly ? " Its result counts as **unknown**, not green." : "")];
    if (target.dispatch) {
      dispatches.push({target: target.id, workflow: target.workflow, inputs: target.dispatch});
      actions.push("dispatched");
      lines.push(`- Dispatched now (dev-only): \`${command(repository, target.workflow, target.dispatch)}\``);
    }
    if (target.reportOnly) {
      actions.push("reported");
      lines.push("- Report only: not dispatched; the next scheduled run covers it.");
    }
    if (target.ask) {
      actions.push("asked");
      lines.push(`- Not dispatched (uses prod). To run it: \`${command(repository, target.workflow, target.ask)}\``);
    }
    const section = sections.get(target.issue) ?? {lines: [], markers: []};
    section.lines.push(...lines);
    section.markers.push(marker(target.id, expectedIso, actions));
    sections.set(target.issue, section);
    checks.push({target: target.id, expected: expectedIso, status, actions});
  }
  const reports = {};
  for (const [title, section] of sections) {
    reports[title] = [
      `Scheduled runs that did not start within ${graceHours} hours of their cron:`,
      "",
      ...section.lines,
      "",
      "GitHub drops or delays scheduled runs under load. Each missed run is handled once; " +
        "this does not change any run's result.",
    ].join("\n") + section.markers.join("") + FOOTER;
  }
  return {checks, dispatches, reports};
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
  const onMainBy = {};
  for (const target of TARGETS) {
    // Any commit on main touching the file by the expected occurrence means it
    // existed then; none means the workflow was added later.
    const until = new Date(expectedRun(target.cron, args.now, graceHours)).toISOString();
    onMainBy[target.id] = JSON.parse(gh(["api",
      `repos/${repository}/commits?sha=main&path=.github/workflows/${target.scheduleIn ?? target.workflow}&until=${until}&per_page=1`])).length > 0;
    runs[target.id] = target.id === args.assumeMissing ? [] : JSON.parse(gh(["api",
      `repos/${repository}/actions/workflows/${target.workflow}/runs?branch=main&created=%3E%3D${from}&per_page=100`]))
      .workflow_runs ?? [];
  }
  // Records survive an issue closing: read every watchdog-written issue
  // updated within the lookback, closed ones too.
  const since = new Date(args.now - RECORD_LOOKBACK_DAYS * DAY).toISOString();
  const titles = new Set(TARGETS.map((target) => target.issue));
  const issues = JSON.parse(gh(["api",
    `repos/${repository}/issues?state=all&creator=github-actions%5Bbot%5D&since=${since}&per_page=100`]))
    .filter((issue) => titles.has(issue.title) && !issue.pull_request);
  const texts = issues.flatMap((issue) => [issue.body, ...JSON.parse(gh(["api", "--paginate", "--slurp",
    `repos/${repository}/issues/${issue.number}/comments?per_page=100`])).flat().map((comment) => comment.body)]);
  const decision = decide({now: args.now, graceHours, repository, runs, records: recordsFrom(texts), onMainBy});
  for (const check of decision.checks) {
    console.log(`${check.target}: expected ${check.expected}, ${check.status}` +
      (check.action ? ` (${check.action})` : check.actions ? ` (${check.actions.join(", ")})` : ""));
  }
  if (args.dryRun) {
    for (const dispatch of decision.dispatches) {
      console.log(`Dry run: would dispatch ${dispatch.workflow} with ${JSON.stringify(dispatch.inputs)}`);
    }
    for (const [title, body] of Object.entries(decision.reports)) {
      console.log(`Dry run: would post to "${title}":\n${body}`);
    }
    return;
  }
  // Record first: a failed dispatch is then reported, never retried hourly.
  for (const [title, body] of Object.entries(decision.reports)) {
    const open = issues.find((issue) => issue.title === title && issue.state === "open") ?? null;
    if (open) {
      gh(["api", "-X", "POST", `repos/${repository}/issues/${open.number}/comments`, "-F", "body=@-"], body);
    } else {
      gh(["api", "-X", "POST", `repos/${repository}/issues`, "-f", `title=${title}`, "-F", "body=@-"], body);
    }
  }
  for (const dispatch of decision.dispatches) {
    const fields = Object.entries(dispatch.inputs).flatMap(([key, value]) => ["-f", `inputs[${key}]=${value}`]);
    gh(["api", "-X", "POST", `repos/${repository}/actions/workflows/${dispatch.workflow}/dispatches`, "-f", "ref=main", ...fields]);
    console.log(`Dispatched ${dispatch.workflow}`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
