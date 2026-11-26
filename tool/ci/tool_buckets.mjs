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
// summed per tool and averaged over the runs that ran it. With --fallback, a
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

/**
 * Longest-first greedy assignment over shared-command groups: groups sorted by
 * seconds (then first tool id) go one by one to the bucket with the least load
 * so far (lowest index on a tie). Each bucket lists its tools in manifest
 * order. Deterministic for the same inputs.
 */
export function assignBuckets({tools, timings, count = BUCKET_COUNT}) {
  if (!Number.isInteger(count) || count < 1) throw new Error("Bucket count must be a positive integer.");
  const secondsOf = (tool) => timings.seconds[tool.id] ?? timings.defaultSeconds;
  const order = new Map(tools.map((tool, index) => [tool.id, index]));
  const buckets = Array.from({length: count}, () => ({seconds: 0, tools: []}));
  const groups = sharedCommandGroups(tools).map((members) => ({
    members, seconds: members.reduce((sum, tool) => sum + secondsOf(tool), 0), key: members[0].id}));
  groups.sort((a, b) => b.seconds - a.seconds || a.key.localeCompare(b.key));
  for (const group of groups) {
    const target = buckets.reduce((best, bucket) => (bucket.seconds < best.seconds ? bucket : best), buckets[0]);
    target.seconds += group.seconds;
    target.tools.push(...group.members);
  }
  for (const bucket of buckets) bucket.tools.sort((a, b) => order.get(a.id) - order.get(b.id));
  return buckets.map((bucket, index) => ({
    bucket: index + 1,
    seconds: Math.round(bucket.seconds),
    toolIds: bucket.tools.map((tool) => tool.id),
    setup: projectToolCiRequirements(bucket.tools).setup,
  }));
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
 * One job log's per-tool seconds: each "==> <tool-id>: <command>" line runs
 * until the next "==> " line, or until "Tool checks passed." / the last line.
 * "==> shared prerequisite: <command>" counts toward the tool whose check
 * triggered it, the line before it.
 */
export function toolSecondsFromLog(text) {
  const marks = [];
  let lastTime = null;
  for (const raw of text.split("\n")) {
    const match = timestamped.exec(raw.trimEnd());
    if (!match) continue;
    const [, time, line] = match;
    lastTime = Date.parse(time);
    const tool = /^==> ([a-z0-9][a-z0-9-]*:[a-z0-9][a-z0-9-]*): /u.exec(line);
    if (tool) marks.push({tool: tool[1], at: lastTime});
    else if (/^==> /u.test(line)) marks.push({tool: null, at: lastTime});
    else if (line.startsWith("Tool checks passed.")) marks.push({end: true, at: lastTime});
  }
  const seconds = {};
  let owner = null;
  for (let index = 0; index < marks.length; index += 1) {
    const mark = marks[index];
    if (mark.end) break;
    owner = mark.tool ?? owner;
    const next = marks[index + 1]?.at ?? lastTime;
    if (owner) seconds[owner] = (seconds[owner] ?? 0) + (next - mark.at) / 1000;
  }
  return seconds;
}

/** Averages per-run tool seconds (each run = all its bucket logs) into a timing file. */
export function buildTimings(runs, {runIds = [], fallback = null} = {}) {
  const totals = new Map();
  for (const run of runs) {
    for (const [tool, value] of Object.entries(run)) {
      const entry = totals.get(tool) ?? {sum: 0, count: 0};
      entry.sum += value;
      entry.count += 1;
      totals.set(tool, entry);
    }
  }
  const measured = new Map([...totals].map(([tool, {sum, count}]) => [tool, Math.round((sum / count) * 10) / 10]));
  const kept = Object.entries(fallback?.seconds ?? {}).filter(([tool]) => !measured.has(tool));
  const seconds = Object.fromEntries([...measured, ...kept].sort(([a], [b]) => a.localeCompare(b)));
  const values = Object.values(seconds).sort((a, b) => a - b);
  const median = values.length ? values[Math.floor(values.length / 2)] : 1;
  return {
    description: "Measured seconds per tool in the full Tools matrix; tool/ci/tool_buckets.mjs balances the buckets from it. Regenerate with `node tool/ci/tool_buckets.mjs regenerate`.",
    source: {runs: runIds, ...(kept.length > 0 ? {keptFromFallback: kept.map(([tool]) => tool)} : {})},
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
      const seconds = toolSecondsFromLog(fs.readFileSync(file, "utf8"));
      byRun.set(run, {...(byRun.get(run) ?? {}), ...seconds});
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
        console.log(`bucket ${bucket.bucket}: ${bucket.toolIds.length} tools, about ${(bucket.seconds / 60).toFixed(1)} min; setup ${bucket.setup.join(", ")}`);
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
