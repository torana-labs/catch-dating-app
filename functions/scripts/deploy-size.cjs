// Counts the Functions a backend deploy would create or update, before it
// touches the environment, and refuses one above the limit unless the run
// allows a large deploy. The Firebase CLI updates every Function of a codebase
// whose content hash changed, so this compares each codebase's hash
// (functions/scripts/build-deploy-codebases.cjs) with the hashes recorded on
// the environment's last successful deploy. With no usable record every
// codebase counts as changed: unknown scope is refused, never guessed small.
// Secret version changes are not files and are not counted.
// Docs: docs/release_operations.md, "Deploy backend".
"use strict";
const fs = require("node:fs");
const {parseArgs} = require("node:util");

/** The recorded codebase hashes, or null when the record holds none this version reads. */
function recordedHashes(text) {
  let record;
  try {
    record = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof record === "string") return recordedHashes(record);
  if (record?.version !== 1 || !record.codebases || typeof record.codebases !== "object") return null;
  const hashes = {};
  for (const [codebase, entry] of Object.entries(record.codebases)) {
    if (typeof entry?.hash !== "string") return null;
    hashes[codebase] = entry.hash;
  }
  return hashes;
}

/**
 * Which codebases a deploy changes and why, how many Functions that updates,
 * and whether the limit refuses it.
 */
function deployPlan({current, previous, limit, full = false, allowLarge = false}) {
  if (!Number.isInteger(limit) || limit < 0) throw new Error(`The limit must be a whole number, not ${limit}.`);
  const changed = [];
  const unchanged = [];
  for (const [codebase, {hash, functions}] of Object.entries(current.codebases)) {
    const reason = full ? "full deploy" :
      previous === null ? "no recorded hashes" :
        !(codebase in previous) ? "new codebase" :
          previous[codebase] !== hash ? "content changed" : null;
    (reason ? changed : unchanged).push({codebase, functions: functions.length, ...(reason && {reason})});
  }
  const total = changed.reduce((sum, {functions}) => sum + functions, 0);
  return {changed, unchanged, total, limit, blocked: total > limit && !full && !allowLarge};
}

function planMarkdown(plan, environment) {
  const rows = plan.changed.map(({codebase, functions, reason}) => `| ${codebase} | ${functions} | ${reason} |`);
  return [`### Functions this ${environment} deploy changes: ${plan.total} (limit ${plan.limit})`, "",
    ...(rows.length ? ["| Codebase | Functions | Why |", "|---|---:|---|", ...rows] : ["No codebase changed."]), "",
    plan.unchanged.length ? `Unchanged: ${plan.unchanged.map(({codebase}) => codebase).join(", ")}.` : "", ""]
    .join("\n");
}

module.exports = {deployPlan, planMarkdown, recordedHashes};

function main() {
  const {values} = parseArgs({options: {
    current: {type: "string"}, previous: {type: "string"}, limit: {type: "string"},
    environment: {type: "string", default: "this environment"},
    full: {type: "string", default: "false"}, "allow-large": {type: "string", default: "false"},
    summary: {type: "string"},
  }});
  if (!values.current || !values.limit) {
    throw new Error("Usage: deploy-size.cjs --current <codebases.json> [--previous <record>] --limit <n> " +
      "[--environment <name>] [--full true|false] [--allow-large true|false] [--summary <file>]");
  }
  const current = JSON.parse(fs.readFileSync(values.current, "utf8"));
  const previousText = values.previous && fs.existsSync(values.previous) ?
    fs.readFileSync(values.previous, "utf8") : "";
  const plan = deployPlan({current, previous: recordedHashes(previousText), limit: Number(values.limit),
    full: values.full === "true", allowLarge: values["allow-large"] === "true"});
  const markdown = planMarkdown(plan, values.environment);
  process.stdout.write(markdown);
  if (values.summary) fs.appendFileSync(values.summary, markdown);
  if (plan.blocked) {
    process.stderr.write(`::error::This deploy would update ${plan.total} Functions in ` +
      `${values.environment}, over the limit of ${plan.limit}. Nothing was changed. To deploy them ` +
      "together, run Deploy backend for this environment with allow_large; later merges then deploy " +
      "normally.\n");
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
