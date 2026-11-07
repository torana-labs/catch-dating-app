// Counts the Functions a backend deploy would create or update, before it
// touches the environment, and refuses one above the limit unless the run
// allows a large deploy. The Firebase CLI updates every Function of a codebase
// whose content hash changed, so this compares each codebase's hash
// (functions/scripts/build-deploy-codebases.cjs) with the hashes recorded on
// the environment's last successful deploy. With no usable record every
// codebase counts as changed: unknown scope is refused, never guessed small.
// Secret version changes are not files and are not counted.
//
// A large deploy happens at most once every 7 days per environment, and
// nothing overrides that: allow_large and full only permit one inside an open
// window. The record carries when the last large deploy happened
// (largeDeployAt); a record without it counts from its own creation time, so
// the deploy it describes is treated as large. The nightly window run deploys
// a pending large delta by itself once the window opens, and stays quiet when
// there is nothing to deploy or the window is still closed.
// Docs: docs/release_operations.md, "Deploy backend".
"use strict";
const fs = require("node:fs");
const {parseArgs} = require("node:util");

const DAY_MS = 24 * 60 * 60 * 1000;
const MODES = ["push", "window"];

function isoTime(value, what) {
  const time = Date.parse(value);
  if (typeof value !== "string" || !Number.isFinite(time)) throw new Error(`${what} is not a time: ${value}`);
  return time;
}

/** A time as people in the team read it, e.g. "14 Nov 2026 18:45 IST". */
function istLabel(iso) {
  const at = new Date(isoTime(iso, "The time") + 330 * 60 * 1000);
  const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][at.getUTCMonth()];
  const pad = (n) => String(n).padStart(2, "0");
  return `${at.getUTCDate()} ${month} ${at.getUTCFullYear()} ${pad(at.getUTCHours())}:${pad(at.getUTCMinutes())} IST`;
}

/**
 * The recorded codebase hashes (null when the record holds none this version
 * reads) and when the last large deploy happened (null when not recorded).
 */
function recordedState(text) {
  let record;
  try {
    record = JSON.parse(text);
  } catch {
    return {hashes: null, largeDeployAt: null};
  }
  if (typeof record === "string") return recordedState(record);
  const largeDeployAt = typeof record?.largeDeployAt === "string" &&
    Number.isFinite(Date.parse(record.largeDeployAt)) ? record.largeDeployAt : null;
  if (record?.version !== 1 || !record.codebases || typeof record.codebases !== "object") {
    return {hashes: null, largeDeployAt};
  }
  const hashes = {};
  for (const [codebase, entry] of Object.entries(record.codebases)) {
    if (typeof entry?.hash !== "string") return {hashes: null, largeDeployAt};
    hashes[codebase] = entry.hash;
  }
  return {hashes, largeDeployAt};
}

/** The recorded codebase hashes, or null when the record holds none this version reads. */
const recordedHashes = (text) => recordedState(text).hashes;

/**
 * Which codebases a deploy changes and why, how many Functions that updates,
 * whether the limit or the weekly window refuses it, and whether the nightly
 * window run has nothing to do.
 */
function deployPlan({current, previous, limit, full = false, allowLarge = false, mode = "push",
  now = new Date().toISOString(), previousCreatedAt = null, windowDays = 7}) {
  if (!Number.isInteger(limit) || limit < 0) throw new Error(`The limit must be a whole number, not ${limit}.`);
  if (!MODES.includes(mode)) throw new Error(`The mode must be one of ${MODES.join(", ")}, not ${mode}.`);
  const nowTime = isoTime(now, "now");
  const hashes = previous?.hashes ?? null;
  const changed = [];
  const unchanged = [];
  for (const [codebase, {hash, functions}] of Object.entries(current.codebases)) {
    const reason = full ? "full deploy" :
      hashes === null ? "no recorded hashes" :
        !(codebase in hashes) ? "new codebase" :
          hashes[codebase] !== hash ? "content changed" : null;
    (reason ? changed : unchanged).push({codebase, functions: functions.length, ...(reason && {reason})});
  }
  const total = changed.reduce((sum, {functions}) => sum + functions, 0);
  const large = total > limit;
  // Without a recorded large deploy, the record's own creation counts as one.
  const lastLarge = previous?.largeDeployAt ?? (previousCreatedAt || null);
  const windowOpensAt = lastLarge === null ? null :
    new Date(isoTime(lastLarge, "The last large deploy") + windowDays * DAY_MS).toISOString();
  const eligible = windowOpensAt === null || nowTime >= Date.parse(windowOpensAt);
  const permitted = allowLarge || full || mode === "window";
  // The nightly window run does nothing, quietly, rather than fail.
  const skip = mode === "window" && (total === 0 || (large && !eligible));
  const blocked = !skip && large && (!permitted || !eligible);
  const reason = !blocked ? null : eligible ? "needs-allow-large" : "window-closed";
  const deploysLarge = large && !blocked && !skip;
  return {changed, unchanged, total, limit, large, blocked, reason, skip, windowOpensAt, eligible,
    largeDeployAt: deploysLarge ? new Date(nowTime).toISOString() : lastLarge};
}

function windowLine(plan) {
  if (plan.windowOpensAt === null) return "Full-deploy window: open (no earlier deploy recorded).";
  return plan.eligible ?
    `Full-deploy window: open since ${istLabel(plan.windowOpensAt)} (${plan.windowOpensAt}).` :
    `Full-deploy window: opens ${istLabel(plan.windowOpensAt)} (${plan.windowOpensAt}).`;
}

function planMarkdown(plan, environment) {
  const rows = plan.changed.map(({codebase, functions, reason}) => `| ${codebase} | ${functions} | ${reason} |`);
  return [`### Functions this ${environment} deploy changes: ${plan.total} (limit ${plan.limit})`, "",
    ...(rows.length ? ["| Codebase | Functions | Why |", "|---|---:|---|", ...rows] : ["No codebase changed."]), "",
    plan.unchanged.length ? `Unchanged: ${plan.unchanged.map(({codebase}) => codebase).join(", ")}.` : "", "",
    ...("windowOpensAt" in plan ? [windowLine(plan), ""] : [])]
    .join("\n");
}

function blockedMessage(plan, environment) {
  const head = `This deploy would update ${plan.total} Functions in ${environment}, over the limit of ` +
    `${plan.limit}. Nothing was changed. The full Functions suite deploys at most once every 7 days.`;
  if (plan.reason === "window-closed") {
    return `${head} The window opens ${istLabel(plan.windowOpensAt)} (${plan.windowOpensAt}); nothing can ` +
      "deploy this before then. The nightly window run deploys it by itself once the window opens.";
  }
  return `${head} The window is open, and the nightly window run deploys this by itself, so no manual ` +
    "run is needed.";
}

module.exports = {deployPlan, istLabel, planMarkdown, recordedHashes, recordedState};

function main() {
  const {values} = parseArgs({options: {
    current: {type: "string"}, previous: {type: "string"}, limit: {type: "string"},
    environment: {type: "string", default: "this environment"},
    full: {type: "string", default: "false"}, "allow-large": {type: "string", default: "false"},
    mode: {type: "string", default: "push"}, now: {type: "string"},
    "previous-created-at": {type: "string", default: ""},
    summary: {type: "string"}, output: {type: "string"},
  }});
  if (!values.current || !values.limit) {
    throw new Error("Usage: deploy-size.cjs --current <codebases.json> [--previous <record>] --limit <n> " +
      "[--environment <name>] [--full true|false] [--allow-large true|false] [--mode push|window] " +
      "[--now <iso>] [--previous-created-at <iso>] [--summary <file>] [--output <file>]");
  }
  const current = JSON.parse(fs.readFileSync(values.current, "utf8"));
  const previousText = values.previous && fs.existsSync(values.previous) ?
    fs.readFileSync(values.previous, "utf8") : "";
  const plan = deployPlan({current, previous: recordedState(previousText), limit: Number(values.limit),
    full: values.full === "true", allowLarge: values["allow-large"] === "true", mode: values.mode,
    ...(values.now && {now: values.now}), previousCreatedAt: values["previous-created-at"] || null});
  const markdown = planMarkdown(plan, values.environment);
  const skipLine = plan.skip ? (plan.total === 0 ?
    `Nightly window run: nothing to deploy to ${values.environment}.\n` :
    `Nightly window run: ${plan.total} Functions wait for the window, which opens ` +
      `${istLabel(plan.windowOpensAt)}.\n`) : "";
  process.stdout.write(markdown + skipLine);
  if (values.summary) fs.appendFileSync(values.summary, markdown + skipLine);
  if (values.output) {
    fs.appendFileSync(values.output, `skip=${plan.skip}\nlarge=${plan.large}\n` +
      `large_deploy_at=${plan.largeDeployAt ?? ""}\nwindow_opens_at=${plan.windowOpensAt ?? ""}\n`);
  }
  if (plan.blocked) {
    process.stderr.write(`::error::${blockedMessage(plan, values.environment)}\n`);
    process.exitCode = 3;
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
