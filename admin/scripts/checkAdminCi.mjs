#!/usr/bin/env node
// `npm run check:admin`: what CI's Admin lane runs, run locally, before a push.
// It reads the steps from the workflow, so the two cannot drift apart.
import {spawn} from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import YAML from "yaml";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const workflowPath = ".github/workflows/react-surface-validation.yml";
const logRoot = path.join(repoRoot, "build/admin-ci");

// Admin checks that run in other CI lanes. They fail fast, so they go first.
const otherLaneGates = [
  {name: "Validate the admin action catalog (contracts lane)", run: "node tool/admin/generate_admin_action_catalog.mjs --validate"},
  // CI's tools lane fetches these first; a fresh worktree has neither.
  {name: "Fetch Dart packages for design parity", run: "test -f tool/widget_dedupe/.dart_tool/package_config.json || (flutter pub get && dart pub get -C tool/widget_dedupe)"},
  {name: "Check design parity (tools lane)", run: "npm run design:parity:check"},
];

// The local checkout already has these.
const setupCommands = new Set(["npm ci"]);

/**
 * Evaluates a GitHub Actions expression. The lane uses only ==, !=, &&, ||, !, parentheses,
 * single-quoted strings and the inputs and github contexts; anything else throws.
 */
export function evaluateExpression(expression, context) {
  const tokens = expression.match(/'[^']*'|==|!=|&&|\|\||!|\(|\)|[A-Za-z_][\w.-]*|\S/gu) ?? [];
  let index = 0;
  const read = (name) => {
    if (name === "true") return true;
    if (name === "false") return false;
    if (Object.hasOwn(context, name)) return context[name];
    throw new Error(`Cannot evaluate "${name}" in: ${expression}`);
  };
  const primary = () => {
    const token = tokens[index++];
    if (token === undefined) throw new Error(`Unexpected end of expression: ${expression}`);
    if (token === "!") return !primary();
    if (token === "(") {
      const value = or();
      if (tokens[index++] !== ")") throw new Error(`Unbalanced parentheses: ${expression}`);
      return value;
    }
    if (token.startsWith("'")) return token.slice(1, -1);
    if (/^[A-Za-z_]/u.test(token)) return read(token);
    throw new Error(`Unexpected "${token}" in: ${expression}`);
  };
  const equality = () => {
    const left = primary();
    if (tokens[index] === "==") { index++; return left === primary(); }
    if (tokens[index] === "!=") { index++; return left !== primary(); }
    return left;
  };
  const and = () => {
    let left = equality();
    while (tokens[index] === "&&") { index++; const right = equality(); left = left ? right : left; }
    return left;
  };
  const or = () => {
    let left = and();
    while (tokens[index] === "||") { index++; const right = and(); left = left ? left : right; }
    return left;
  };
  const value = or();
  if (index !== tokens.length) throw new Error(`Unexpected "${tokens[index]}" in: ${expression}`);
  return value;
}

function interpolate(text, context) {
  return text.replace(/\$\{\{(.*?)\}\}/gu, (_, expression) => String(evaluateExpression(expression, context)));
}

/** The workflow's run steps that this event would run, with their expressions resolved. */
export function laneSteps(workflow, {event = "merge_group", surface = "admin"} = {}) {
  const context = {
    "inputs.surface": surface,
    "inputs.update_visual_baselines": false,
    "inputs.skip_deployable_build": false,
    "github.event_name": event,
    "github.workflow": "Admin Website",
  };
  const steps = [];
  for (const step of workflow.jobs.validate.steps) {
    if (typeof step.run !== "string") continue;
    if (step.if !== undefined) {
      const condition = String(step.if).replace(/^\$\{\{|\}\}$/gu, "");
      if (!evaluateExpression(condition, context)) continue;
    }
    if (setupCommands.has(step.run.trim())) continue;
    steps.push({
      name: step.name ?? step.run,
      run: interpolate(step.run, context),
      env: Object.fromEntries(Object.entries(step.env ?? {}).map(([key, value]) =>
        [key, interpolate(String(value), context)])),
    });
  }
  return steps;
}

function runStep(step, logPath) {
  return new Promise((resolve) => {
    const log = fs.openSync(logPath, "w");
    const child = spawn(step.run, {
      cwd: repoRoot, shell: true, env: {...process.env, ...step.env}, stdio: ["ignore", log, log],
    });
    child.on("close", (code) => { fs.closeSync(log); resolve(code ?? 1); });
    child.on("error", () => { fs.closeSync(log); resolve(1); });
  });
}

function printHelp() {
  console.log(`Usage: npm run check:admin [-- options]

Runs CI's Admin lane locally, reading its steps from ${workflowPath}.
Every step runs even after a failure, so one run shows everything CI would.
Logs are in build/admin-ci/.

  --pr            What a pull request runs: leaves out the Storybook build and
                  visual report. The default is what the merge queue runs.
  --only <text>   Only the steps whose name contains <text>.
  --list          Print the steps and stop.`);
}

async function main(argv) {
  if (argv.includes("--help") || argv.includes("-h")) {
    printHelp();
    return 0;
  }
  const onlyIndex = argv.indexOf("--only");
  const only = onlyIndex >= 0 ? argv[onlyIndex + 1]?.toLowerCase() : null;
  const workflow = YAML.parse(fs.readFileSync(path.join(repoRoot, workflowPath), "utf8"));
  const steps = [
    ...otherLaneGates.map((gate) => ({...gate, env: {}})),
    ...laneSteps(workflow, {event: argv.includes("--pr") ? "pull_request" : "merge_group"}),
  ].filter((step) => !only || step.name.toLowerCase().includes(only));
  if (argv.includes("--list")) {
    for (const step of steps) console.log(`${step.name}\n    ${step.run.trim()}`);
    return 0;
  }
  if (!fs.existsSync(path.join(repoRoot, "node_modules"))) {
    console.error("node_modules is missing. Run: bash tool/git/bootstrap_worktree.sh --target root");
    return 1;
  }
  fs.mkdirSync(logRoot, {recursive: true});
  const results = [];
  for (const [index, step] of steps.entries()) {
    const logPath = path.join(logRoot, `${String(index + 1).padStart(2, "0")}.log`);
    process.stdout.write(`[${index + 1}/${steps.length}] ${step.name} ... `);
    const started = Date.now();
    const code = await runStep(step, logPath);
    const seconds = Math.round((Date.now() - started) / 1000);
    console.log(`${code === 0 ? "ok" : "FAILED"} (${seconds}s)`);
    if (code !== 0) {
      console.log(fs.readFileSync(logPath, "utf8").trimEnd().split("\n").slice(-30).join("\n"));
      console.log(`Full log: ${path.relative(repoRoot, logPath)}\n`);
    }
    results.push({...step, code});
  }
  const failed = results.filter((result) => result.code !== 0);
  console.log(failed.length === 0 ?
    `\nAdmin lane passed: ${results.length} steps.` :
    `\nAdmin lane failed ${failed.length} of ${results.length} steps:\n${failed.map((result) => `- ${result.name}`).join("\n")}`);
  return failed.length === 0 ? 0 : 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv.slice(2));
}
