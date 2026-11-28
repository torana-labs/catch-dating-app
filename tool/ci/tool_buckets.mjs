#!/usr/bin/env node
// Splits the full Tools matrix into evenly timed buckets. The assignment is
// computed, never hand-kept: every active tool goes to exactly one bucket by
// longest-first greedy balancing, over groups of tools that share a check
// command (so the runner still executes each shared command once), of the
// measured seconds in
// tool/ci/tool_bucket_timings.json. A tool the timing file does not know yet
// (a new tool) counts as the file's defaultSeconds until the next regenerate.
//
//   node tool/ci/tool_buckets.mjs ids --bucket <n>        tool ids for bucket n (1-based), one per line
//   node tool/ci/tool_buckets.mjs setup --bucket <n>      that bucket's CI setup requirements (JSON)
//   node tool/ci/tool_buckets.mjs plan [--json]           every bucket's tools and estimated seconds
//   node tool/ci/tool_buckets.mjs regenerate [--runs <id,...>] [--out <file>] [--fallback <file>] <job-log>...
//
// `regenerate` reads saved logs (files named <run-id>-<job>.log group by run) of full-matrix bucket jobs (the "Check tool
// categories" step, timestamped GitHub log lines) and writes each tool's
// seconds: the time from its "==> <tool-id>:" lines to the next such line,
// summed per tool and averaged over the runs that ran it. A tool a log hands to
// another lane gets no sample from that log, and any tool handed over somewhere
// takes its longest measured run instead of the average. The first `dart
// analyze` and `flutter test` in a log lose their one-off startup, which
// SETUP_SECONDS charges to the bucket instead. With --fallback, a
// tool the logs do not cover (a log GitHub truncated, a tool that did not run)
// keeps its seconds from that earlier timing file.
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {hasExecutableChecks, projectToolCiRequirements, splitSharedPrerequisite} from "../lib/tool_impact.mjs";
import {loadToolsManifest} from "../lib/tools_manifest.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
export const TIMINGS_PATH = path.join(here, "tool_bucket_timings.json");
export const BUCKET_COUNT = 6;

/** The tools the full matrix runs: every active tool with executable checks, in manifest order. */
export function fullMatrixTools(manifest) {
  return manifest.tools.filter((tool) => tool.status === "active" && hasExecutableChecks(tool));
}

/**
 * Tools that register an identical check command or shared prerequisite,
 * directly or through a chain of such tools, form one group. The runner executes an identical command once
 * per invocation, so a group stays in one bucket and every shared command
 * still runs once in the full matrix.
 */
export function sharedCommandGroups(tools) {
  const parent = new Map(tools.map((tool) => [tool.id, tool.id]));
  const find = (id) => {
    while (parent.get(id) !== id) {
      parent.set(id, parent.get(parent.get(id)));
      id = parent.get(id);
    }
    return id;
  };
  const ownerOf = new Map();
  for (const tool of tools) {
    for (const command of tool.checks ?? []) {
      // A shared prerequisite (the Functions build) is shared work too.
      const {prerequisite} = splitSharedPrerequisite(command);
      for (const key of prerequisite ? [command, prerequisite.command] : [command]) {
        if (!ownerOf.has(key)) ownerOf.set(key, tool.id);
        else parent.set(find(tool.id), find(ownerOf.get(key)));
      }
    }
  }
  const groups = new Map();
  for (const tool of tools) {
    const root = find(tool.id);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(tool);
  }
  return [...groups.values()];
}

// Median seconds each optional bucket setup step costs (full-matrix bucket
// jobs, 24 Nov 2026): setup-flutter including its post step, flutter pub get,
// root npm ci, Functions npm ci, the Playwright browser and ripgrep. Node and
// the checkout are common to every bucket. The cached contracts step installs
// the Functions dependencies itself when they are missing, so functions-npm
// costs little extra.
//
// The first `dart analyze` and the first `flutter test` in a job also pay a
// one-off analyzer, analyzer-plugin and test-runner startup (measured 28 Nov
// 2026: about 26 s and 9 s over their warm times). That cost belongs to the
// bucket, not to whichever tool runs first, so regenerate takes it off the
// first such tool in each log and flutter-pub counts it here.
export const DART_ANALYZE_WARMUP_SECONDS = 26;
export const FLUTTER_TEST_WARMUP_SECONDS = 9;
export const SETUP_SECONDS = Object.freeze({
  flutter: 30, "flutter-pub": 4 + DART_ANALYZE_WARMUP_SECONDS + FLUTTER_TEST_WARMUP_SECONDS,
  "root-npm": 31, "functions-npm": 5, playwright: 9, ripgrep: 1, node: 0,
});

function setupSeconds(setup) {
  return setup.reduce((sum, requirement) => sum + (SETUP_SECONDS[requirement] ?? 0), 0);
}

/**
 * Longest-first greedy assignment over shared-command groups, counting each
 * bucket's setup as well as its checks: groups sorted by seconds (then first
 * tool id) go one by one to the bucket whose finish (setup it would need plus
 * checks) stays lowest, the lowest index on a tie. Tools that need the same
 * setup therefore gather, and a bucket without Flutter or root npm tools skips
 * those steps. Each bucket lists its tools in manifest order. Deterministic for
 * the same inputs.
 */
export function assignBuckets({tools, timings, count = BUCKET_COUNT}) {
  if (!Number.isInteger(count) || count < 1) throw new Error("Bucket count must be a positive integer.");
  const secondsOf = (tool) => timings.seconds[tool.id] ?? timings.defaultSeconds;
  const order = new Map(tools.map((tool, index) => [tool.id, index]));
  const buckets = Array.from({length: count}, () => ({seconds: 0, tools: [], setup: new Set()}));
  const groups = sharedCommandGroups(tools).map((members) => ({
    members,
    seconds: members.reduce((sum, tool) => sum + secondsOf(tool), 0),
    setup: projectToolCiRequirements(members).setup,
    key: members[0].id,
  }));
  groups.sort((a, b) => b.seconds - a.seconds || a.key.localeCompare(b.key));
  const finishWith = (bucket, group) =>
    bucket.seconds + group.seconds + setupSeconds([...new Set([...bucket.setup, ...group.setup])]);
  for (const group of groups) {
    let target = buckets[0];
    for (const bucket of buckets.slice(1)) {
      if (finishWith(bucket, group) < finishWith(target, group)) target = bucket;
    }
    target.seconds += group.seconds;
    target.tools.push(...group.members);
    for (const requirement of group.setup) target.setup.add(requirement);
  }
  for (const bucket of buckets) bucket.tools.sort((a, b) => order.get(a.id) - order.get(b.id));
  return buckets.map((bucket, index) => {
    const setup = projectToolCiRequirements(bucket.tools).setup;
    return {
      bucket: index + 1,
      seconds: Math.round(bucket.seconds),
      setupSeconds: setupSeconds(setup),
      toolIds: bucket.tools.map((tool) => tool.id),
      setup,
    };
  });
}

/** Rejects a timing file that is not the shape regenerate writes. */
export function validateTimings(timings) {
  const errors = [];
  if (!timings || typeof timings !== "object") return ["The timing file is not a JSON object."];
  if (!(Number.isFinite(timings.defaultSeconds) && timings.defaultSeconds > 0)) {
    errors.push("defaultSeconds must be a positive number.");
  }
  if (!timings.seconds || typeof timings.seconds !== "object") {
    errors.push("seconds must map tool ids to seconds.");
  } else {
    for (const [id, value] of Object.entries(timings.seconds)) {
      if (!(Number.isFinite(value) && value >= 0)) errors.push(`${id}: seconds must be a non-negative number.`);
    }
    const ids = Object.keys(timings.seconds);
    if (ids.join("\n") !== [...ids].sort().join("\n")) errors.push("seconds must be sorted by tool id.");
  }
  return errors;
}

export function readTimings(file = TIMINGS_PATH) {
  const timings = JSON.parse(fs.readFileSync(file, "utf8"));
  const errors = validateTimings(timings);
  if (errors.length > 0) throw new Error(`${path.relative(process.cwd(), file)}: ${errors.join(" ")}`);
  return timings;
}

const timestamped = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z)\s?(.*)$/u;

/**
 * One bucket job log, parsed: each "==> <tool-id>: <command>" line runs until
 * the next "==> " line, or until "Tool checks passed." / the last line.
 * "==> shared prerequisite: <command>" counts toward the tool whose check
 * triggered it, the line before it.
 *
 * A tool whose work the runner hands to another lane ("provided by the
 * required same-run React marketing lane", "nightly-only visual report") did
 * not run in this log, so it gets no sample here, never about 0 s; it is listed
 * in handedOver instead. The first `dart analyze` and first `flutter test`
 * tool lose the one-off startup that SETUP_SECONDS charges to the bucket,
 * unless the job already ran that command before its first tool (a setup
 * step), in which case the tools ran warm.
 */
export function parseBucketLog(text) {
  const marks = [];
  const handedOver = new Set();
  const warmBeforeTools = {analyze: false, test: false};
  let lastTime = null;
  for (const raw of text.split("\n")) {
    const match = timestamped.exec(raw.trimEnd());
    if (!match) continue;
    const [, time, line] = match;
    lastTime = Date.parse(time);
    if (!line.startsWith("==> ") && !marks.some((mark) => mark.tool)) {
      if (/\bdart analyze\b/u.test(line)) warmBeforeTools.analyze = true;
      if (/\bflutter test\b/u.test(line)) warmBeforeTools.test = true;
    }
    const tool = /^==> ([a-z0-9][a-z0-9-]*:[a-z0-9][a-z0-9-]*): (.*)$/u.exec(line);
    if (tool && handedOverLine.test(tool[2])) {
      handedOver.add(tool[1]);
      marks.push({tool: null, skip: true, at: lastTime});
    } else if (tool) {
      marks.push({tool: tool[1], command: tool[2], at: lastTime});
    } else if (/^==> /u.test(line)) {
      marks.push({tool: null, at: lastTime});
    } else if (line.startsWith("Tool checks passed.")) {
      marks.push({end: true, at: lastTime});
    }
  }
  const seconds = {};
  let owner = null;
  for (let index = 0; index < marks.length; index += 1) {
    const mark = marks[index];
    if (mark.end) break;
    owner = mark.skip ? null : mark.tool ?? owner;
    const next = marks[index + 1]?.at ?? lastTime;
    if (owner) seconds[owner] = (seconds[owner] ?? 0) + (next - mark.at) / 1000;
  }
  for (const [pattern, warmup, warm] of [
    [/^dart analyze\b/u, DART_ANALYZE_WARMUP_SECONDS, warmBeforeTools.analyze],
    [/^flutter test\b/u, FLUTTER_TEST_WARMUP_SECONDS, warmBeforeTools.test],
  ]) {
    if (warm) continue;
    const first = marks.find((mark) => mark.tool && pattern.test(mark.command))?.tool;
    if (first && seconds[first] != null) seconds[first] = Math.max(0, seconds[first] - warmup);
  }
  for (const tool of handedOver) delete seconds[tool];
  return {seconds, handedOver};
}

const toolIdPattern = /^[a-z0-9][a-z0-9-]*:[a-z0-9][a-z0-9-]*$/u;
const handedOverLine = /^(provided by the required same-run React marketing lane\.|nightly-only visual report\b)/u;

/** One job log's per-tool seconds (see parseBucketLog); handed-over tools are absent. */
export function toolSecondsFromLog(text) {
  return parseBucketLog(text).seconds;
}

/**
 * Builds the timing file from per-run results, where a run is either
 * {seconds, handedOver} or a plain tool -> seconds object. A tool is averaged
 * over the runs that ran it. A tool some run handed to another lane runs in
 * Tools only in some contexts (a tools-only PR or queue entry, not a full
 * dispatch), so it takes its longest measured time instead: the bucket must
 * hold it whenever Tools does run it.
 */
export function buildTimings(runs, {runIds = [], fallback = null} = {}) {
  const samples = new Map();
  const handedOverAnywhere = new Set();
  for (const run of runs) {
    const seconds = run.seconds && typeof run.seconds === "object" ? run.seconds : run;
    for (const tool of run.handedOver ?? []) handedOverAnywhere.add(tool);
    for (const [tool, value] of Object.entries(seconds)) {
      if (!samples.has(tool)) samples.set(tool, []);
      samples.get(tool).push(value);
    }
  }
  const round = (value) => Math.round(value * 10) / 10;
  const measured = new Map([...samples].map(([tool, values]) => [tool, round(handedOverAnywhere.has(tool)
    ? Math.max(...values)
    : values.reduce((sum, value) => sum + value, 0) / values.length)]));
  // Only tool ids carry over: a stale non-tool key in an older file is dropped.
  const kept = Object.entries(fallback?.seconds ?? {})
    .filter(([tool]) => toolIdPattern.test(tool) && !measured.has(tool));
  const seconds = Object.fromEntries([...measured, ...kept].sort(([a], [b]) => a.localeCompare(b)));
  const values = Object.values(seconds).sort((a, b) => a - b);
  const median = values.length ? values[Math.floor(values.length / 2)] : 1;
  const maxed = [...handedOverAnywhere].filter((tool) => samples.has(tool)).sort();
  const unmeasured = [...handedOverAnywhere].filter((tool) => !samples.has(tool)).sort();
  return {
    description: "Measured seconds per tool in the full Tools matrix; tool/ci/tool_buckets.mjs balances the buckets from it. Regenerate with `node tool/ci/tool_buckets.mjs regenerate`.",
    source: {
      runs: runIds,
      ...(maxed.length > 0 ? {longestRunForHandedOverTools: maxed} : {}),
      ...(unmeasured.length > 0 ? {handedOverWithoutMeasuredRun: unmeasured} : {}),
      ...(kept.length > 0 ? {keptFromFallback: kept.map(([tool]) => tool)} : {}),
    },
    defaultSeconds: Math.max(1, median),
    seconds,
  };
}

function argValue(args, flag) {
  const index = args.indexOf(flag);
  return index === -1 ? null : args[index + 1] ?? null;
}

function bucketArg(args) {
  const value = Number(argValue(args, "--bucket"));
  if (!Number.isInteger(value) || value < 1 || value > BUCKET_COUNT) {
    throw new Error(`--bucket must be 1 to ${BUCKET_COUNT}.`);
  }
  return value;
}

function main(argv) {
  const [command, ...args] = argv;
  if (command === "regenerate") {
    const valueFlags = new Set(["--runs", "--out", "--fallback"]);
    const logs = args.filter((arg, index) => !arg.startsWith("--") && !valueFlags.has(args[index - 1]));
    if (logs.length === 0) throw new Error("regenerate needs one or more job log files.");
    // Files named <run>-<anything>.log group into runs; other files form one run each.
    const byRun = new Map();
    for (const file of logs) {
      const run = /^(\d+)-/u.exec(path.basename(file))?.[1] ?? file;
      const parsed = parseBucketLog(fs.readFileSync(file, "utf8"));
      const merged = byRun.get(run) ?? {seconds: {}, handedOver: new Set()};
      Object.assign(merged.seconds, parsed.seconds);
      for (const tool of parsed.handedOver) merged.handedOver.add(tool);
      byRun.set(run, merged);
    }
    const runIds = (argValue(args, "--runs") ?? [...byRun.keys()].join(",")).split(",").filter(Boolean);
    const out = argValue(args, "--out") ?? TIMINGS_PATH;
    const fallbackFile = argValue(args, "--fallback");
    const fallback = fallbackFile ? readTimings(fallbackFile) : null;
    fs.writeFileSync(out, `${JSON.stringify(buildTimings([...byRun.values()], {runIds, fallback}), null, 2)}\n`);
    console.log(`Wrote ${path.relative(process.cwd(), out)} from ${byRun.size} run(s).`);
    return;
  }
  const buckets = assignBuckets({tools: fullMatrixTools(loadToolsManifest()), timings: readTimings()});
  if (command === "ids") {
    console.log(buckets[bucketArg(args) - 1].toolIds.join("\n"));
  } else if (command === "setup") {
    console.log(JSON.stringify(buckets[bucketArg(args) - 1].setup));
  } else if (command === "plan") {
    if (args.includes("--json")) {
      console.log(JSON.stringify(buckets, null, 2));
    } else {
      for (const bucket of buckets) {
        console.log(`bucket ${bucket.bucket}: ${bucket.toolIds.length} tools, checks about ${(bucket.seconds / 60).toFixed(1)} min + optional setup ${bucket.setupSeconds} s; setup ${bucket.setup.join(", ")}`);
      }
    }
  } else {
    throw new Error("Usage: tool_buckets.mjs ids|setup --bucket <n> | plan [--json] | regenerate [--runs <ids>] [--out <file>] [--fallback <file>] <job-log>...");
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
