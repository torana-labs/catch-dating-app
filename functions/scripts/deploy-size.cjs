// Reports, before a backend deploy touches the environment, which Functions
// codebases it changes: each one is one Cloud Build (the Functions of a
// codebase share its build) and an update of every Function it holds. The
// Firebase CLI skips a codebase whose content hash is unchanged, so this
// compares each codebase's hash (functions/scripts/build-deploy-codebases.cjs)
// with the hashes recorded on the environment's last delivered deploy. With no
// usable record every codebase counts as changed. It refuses nothing: a build
// costs about a build-minute and updating a Function costs nothing, so the
// size of a deploy is reported, not limited.
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

/** Which codebases a deploy changes and why, and how many builds and Function updates that is. */
function deployPlan({current, previous, full = false}) {
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
  return {changed, unchanged, builds: changed.length, total};
}

function planMarkdown(plan, environment) {
  const rows = plan.changed.map(({codebase, functions, reason}) => `| ${codebase} | ${functions} | ${reason} |`);
  return [`### This ${environment} deploy: ${plan.builds} codebase build(s), ${plan.total} Function update(s)`, "",
    ...(rows.length ? ["| Codebase | Functions | Why |", "|---|---:|---|", ...rows] : ["No codebase changed."]), "",
    plan.unchanged.length ? `Unchanged: ${plan.unchanged.map(({codebase}) => codebase).join(", ")}.` : "", ""]
    .join("\n");
}

module.exports = {deployPlan, planMarkdown, recordedHashes};

function main() {
  const {values} = parseArgs({options: {
    current: {type: "string"}, previous: {type: "string"},
    environment: {type: "string", default: "this environment"},
    full: {type: "string", default: "false"}, summary: {type: "string"},
  }});
  if (!values.current) {
    throw new Error("Usage: deploy-size.cjs --current <codebases.json> [--previous <record>] " +
      "[--environment <name>] [--full true|false] [--summary <file>]");
  }
  const current = JSON.parse(fs.readFileSync(values.current, "utf8"));
  const previousText = values.previous && fs.existsSync(values.previous) ?
    fs.readFileSync(values.previous, "utf8") : "";
  const plan = deployPlan({current, previous: recordedHashes(previousText), full: values.full === "true"});
  const markdown = planMarkdown(plan, values.environment);
  process.stdout.write(markdown);
  if (values.summary) fs.appendFileSync(values.summary, markdown);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
