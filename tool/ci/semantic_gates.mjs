#!/usr/bin/env node
// Runs the merge-queue semantic gate: every tool whose manifest file carries
// `"queueGate": "always"` (tool/lib/semantic_gates.mjs), each by its manifest
// command, serially, all of them even after a failure. `--candidates` also
// runs the `"candidate"` checks, which report but never fail the run.
//
//   node tool/ci/semantic_gates.mjs list [--candidates] [--json]
//   node tool/ci/semantic_gates.mjs run [--candidates] [--timings <file>]
//   node tool/ci/semantic_gates.mjs budget --timings-dir <dir> [--runs 7]
//     [--limit-ms 10000] [--issue-body <file>]
//
// `run` writes per-check timings as JSON and, in GitHub Actions, a step
// summary. `budget` reads the timings of recent nightly runs and lists every
// `always` check whose p95 exceeds the limit, with the fix (drop its
// queueGate so affected-tools selects it instead). It is report-only: it
// always exits 0, and the caller posts the list as an issue.
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {semanticGateIds} from "../lib/semantic_gates.mjs";
import {loadToolsManifest} from "../lib/tools_manifest.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const DEFAULT_LIMIT_MS = 10000;
export const DEFAULT_RUNS = 7;

export function parseArgs(argv) {
  const [command, ...rest] = argv;
  if (!["list", "run", "budget"].includes(command)) {
    throw new Error("Usage: semantic_gates.mjs list|run|budget [options]; see the file header.");
  }
  const options = {command, candidates: false, json: false, timings: null, timingsDir: null,
    runs: DEFAULT_RUNS, limitMs: DEFAULT_LIMIT_MS, issueBody: null};
  const valued = {"--timings": "timings", "--timings-dir": "timingsDir", "--runs": "runs",
    "--limit-ms": "limitMs", "--issue-body": "issueBody"};
  for (let index = 0; index < rest.length; index += 1) {
    const flag = rest[index];
    if (flag === "--candidates") options.candidates = true;
    else if (flag === "--json") options.json = true;
    else if (valued[flag]) {
      const value = rest[index + 1];
      if (value === undefined || value.startsWith("--")) throw new Error(`${flag} needs a value.`);
      index += 1;
      const key = valued[flag];
      if (key === "runs" || key === "limitMs") {
        const number = Number(value);
        if (!Number.isInteger(number) || number < 1) throw new Error(`${flag} must be a positive integer.`);
        options[key] = number;
      } else options[key] = value;
    } else throw new Error(`Unknown option ${flag}.`);
  }
  if (command === "budget" && !options.timingsDir) throw new Error("budget needs --timings-dir <dir>.");
  return options;
}

/** The checks a run executes, in id order: always gates, then candidates if asked. */
export function gateChecks(manifest, {candidates = false} = {}) {
  const byId = new Map(manifest.tools.map((tool) => [tool.id, tool]));
  const levels = candidates ? ["always", "candidate"] : ["always"];
  return levels.flatMap((level) => semanticGateIds(manifest, {level})
    .map((id) => ({id, level, command: byId.get(id).command})));
}

/**
 * Runs each check and returns its result. A failed `always` check fails the
 * run; a candidate never does. `exec` is injectable for tests.
 */
export function runGates(checks, {exec, log = () => {}}) {
  const results = [];
  for (const check of checks) {
    log(`==> ${check.id} (${check.level}): ${check.command}`);
    const started = Date.now();
    const status = exec(check.command);
    results.push({...check, status, ms: Date.now() - started});
  }
  const failed = results.filter((result) => result.level === "always" && result.status !== 0);
  return {results, failed, ok: failed.length === 0};
}

const seconds = (ms) => (ms / 1000).toFixed(1);

/** The step summary: failures first, then every check with its time. */
export function renderSummary({results, failed}) {
  const lines = ["### Semantic checks", ""];
  lines.push(failed.length ? `${failed.length} gating check(s) failed:` : `All ${results.filter((r) => r.level === "always").length} gating checks passed.`);
  for (const result of failed) lines.push(`- \`${result.id}\` exited ${result.status}: \`${result.command}\``);
  lines.push("", "| Check | Level | Result | Seconds |", "|---|---|---|---:|");
  for (const result of results) {
    lines.push(`| \`${result.id}\` | ${result.level} | ${result.status === 0 ? "pass" : `exit ${result.status}`} | ${seconds(result.ms)} |`);
  }
  return `${lines.join("\n")}\n`;
}

const percentile = (values, p) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];
};

/**
 * Over the newest `runs` timing documents, the `always` checks of the current
 * gate list whose p95 exceeds `limitMs`, slowest first. A check with no timing
 * yet is skipped; a check that left the gate list is ignored.
 */
export function overBudget(documents, {gateIds, runs = DEFAULT_RUNS, limitMs = DEFAULT_LIMIT_MS}) {
  const recent = [...documents].sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, runs);
  const times = new Map(gateIds.map((id) => [id, []]));
  for (const document of recent) {
    for (const result of document.results ?? []) {
      if (times.has(result.id) && Number.isFinite(result.ms)) times.get(result.id).push(result.ms);
    }
  }
  return [...times].filter(([, values]) => values.length > 0)
    .map(([id, values]) => ({id, p95Ms: percentile(values, 95), samples: values.length}))
    .filter((entry) => entry.p95Ms > limitMs)
    .sort((a, b) => b.p95Ms - a.p95Ms);
}

/** The "Semantic gate over budget" issue body, or null when nothing is over. */
export function renderBudgetIssue(over, {runs, limitMs}) {
  if (over.length === 0) return null;
  return [
    `These merge-queue semantic gates ran slower than ${seconds(limitMs)} s at p95 over the last ${runs} nightly runs:`,
    "",
    "| Check | p95 s | Nightly samples |",
    "|---|---:|---:|",
    ...over.map((entry) => `| \`${entry.id}\` | ${seconds(entry.p95Ms)} | ${entry.samples} |`),
    "",
    "A slow check is not a broken main, so this report does not fail the nightly. To fix one, speed it up, " +
      "or remove `\"queueGate\": \"always\"` from its `tool/manifest/tools/<id>.json` so affected-tools selects it " +
      "only when its `impactPaths` change. See docs/release_operations.md#semantic-checks-gate.",
    "",
  ].join("\n");
}

function loadTimings(dir) {
  const files = [];
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, {withFileTypes: true})) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".json")) files.push(full);
    }
  };
  if (fs.existsSync(dir)) walk(dir);
  return files.flatMap((file) => {
    try {
      const document = JSON.parse(fs.readFileSync(file, "utf8"));
      return Array.isArray(document.results) ? [document] : [];
    } catch {
      return [];
    }
  });
}

function main(argv) {
  const options = parseArgs(argv);
  const manifest = loadToolsManifest({root: repoRoot});
  if (options.command === "list") {
    const checks = gateChecks(manifest, options);
    if (options.json) process.stdout.write(`${JSON.stringify(checks, null, 2)}\n`);
    else for (const check of checks) console.log(`${check.id.padEnd(46)} ${check.level}`);
    return 0;
  }
  if (options.command === "budget") {
    const over = overBudget(loadTimings(options.timingsDir),
      {gateIds: semanticGateIds(manifest), runs: options.runs, limitMs: options.limitMs});
    const body = renderBudgetIssue(over, options);
    if (options.issueBody && body) fs.writeFileSync(options.issueBody, body);
    console.log(body ?? `Every semantic gate is within ${seconds(options.limitMs)} s at p95.`);
    return 0;
  }
  const checks = gateChecks(manifest, options);
  const outcome = runGates(checks, {
    log: (line) => console.log(line),
    exec: (command) => spawnSync(command, {cwd: repoRoot, shell: true, stdio: "inherit"}).status ?? 1,
  });
  const summary = renderSummary(outcome);
  console.log(`\n${summary}`);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
  if (options.timings) {
    fs.mkdirSync(path.dirname(path.resolve(options.timings)), {recursive: true});
    fs.writeFileSync(options.timings, `${JSON.stringify({
      sha: process.env.GITHUB_SHA ?? null, at: new Date().toISOString(),
      results: outcome.results.map(({id, level, status, ms}) => ({id, level, status, ms})),
    }, null, 2)}\n`);
  }
  return outcome.ok ? 0 : 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 64;
  }
}
