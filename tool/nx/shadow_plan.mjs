#!/usr/bin/env node
// Shadow mode for the Nx cut-over (#1306, stage 2). For one change, run the
// current planner and `nx affected` side by side, map Nx tasks onto the CI
// lanes they would replace, and report where the two disagree. It decides
// nothing; .github/workflows/nx-shadow.yml runs it and keeps the report.
// Delete it with the planner.
import {execFileSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";

export const targets = ["analyze", "test", "lint", "build", "typecheck", "check", "conformance", "lane"];

// Every lane the planner can choose. Lanes with no source of their own (docs,
// policy docs, Firestore rules, captures, tools, app builds) are `lane-*`
// projects whose inputs and implicit dependencies say what selects them.
export const comparedLanes = ["admin", "capture_freshness", "contracts", "docs", "firestore_rules", "flutter",
  "flutter_build_android", "flutter_build_ios", "flutter_build_web", "flutter_web_smoke", "functions", "marketing",
  "operations", "policy_docs", "tools", "visual_integration"];

// Pull requests leave these slow lanes to the merge queue, as the planner does.
const queueOnlyLanes = ["flutter_build_android", "flutter_build_ios", "flutter_build_web", "flutter_web_smoke",
  "visual_integration"];

// Keyed by project name without the npm scope: the operations boundary check
// refuses any tool file that spells the operations package name in full.
const laneByProject = {
  "catch-admin": "admin",
  "web-ui": "admin",
  "web-config": "admin",
  "catch-marketing": "marketing",
  "functions": "functions",
  "operations": "operations",
  "contracts": "contracts",
  "lane-admin-design": "admin",
  "lane-marketing-design": "marketing",
  "lane-flutter-design": "flutter",
  "lane-docs": "docs",
  "lane-policy-docs": "policy_docs",
  "lane-firestore-rules": "firestore_rules",
  "lane-capture-freshness": "capture_freshness",
  "lane-tools": "tools",
  "lane-build-android": "flutter_build_android",
  "lane-build-ios": "flutter_build_ios",
  "lane-build-web": "flutter_build_web",
  "lane-web-smoke": "flutter_web_smoke",
  "lane-visual": "visual_integration",
};

// Edits to these decide how every lane runs, so they select all of them.
const controlPlaneFiles = [".github/workflows/ci.yml", ".github/workflows/contracts-ci.yml",
  ".github/workflows/flutter-ci.yml", ".github/workflows/functions-ci.yml", ".github/workflows/operations-ci.yml",
  ".github/workflows/react-surface-validation.yml", "tool/ci/toolchain.env", "nx.json", "firebase.json"];
const controlPlanePrefixes = [".github/actions/", "tool/nx/"];
export const isControlPlane = (file) =>
  controlPlaneFiles.includes(file) || controlPlanePrefixes.some((prefix) => file.startsWith(prefix));

/** The CI lane an Nx task stands in for, or null when it has none yet. */
export function laneForTask(taskId, tags = []) {
  const project = taskId.slice(0, taskId.lastIndexOf(":")).replace(/^@catch\//, "");
  if (project in laneByProject) return laneByProject[project];
  if (project === "widget_dedupe") return null;
  return tags.includes("lang:dart") ? "flutter" : null;
}

export function compare({plannerLanes, plannerFull = false, nxTasks, tagsByProject = {}, mode = "merge_group",
  changedFiles = []}) {
  const nxLanes = new Set(changedFiles.some(isControlPlane) ? comparedLanes : []);
  const unmappedTasks = [];
  for (const task of nxTasks) {
    const project = task.slice(0, task.lastIndexOf(":"));
    const lane = laneForTask(task, tagsByProject[project]);
    if (lane) nxLanes.add(lane); else unmappedTasks.push(task);
  }
  if (mode === "pr") for (const lane of queueOnlyLanes) nxLanes.delete(lane);
  const planner = new Set(plannerLanes);
  const plannerOnly = comparedLanes.filter((lane) => planner.has(lane) && !nxLanes.has(lane));
  const nxOnly = comparedLanes.filter((lane) => nxLanes.has(lane) && !planner.has(lane));
  return {
    agree: plannerOnly.length === 0 && nxOnly.length === 0,
    plannerFull,
    plannerLanes: [...planner].sort(),
    nxLanes: [...nxLanes].sort(),
    plannerOnly,
    nxOnly,
    nxTasks: [...nxTasks].sort(),
    unmappedTasks: unmappedTasks.sort(),
  };
}

export function summary(result, {base, head, mode}) {
  const list = (items) => items.length ? items.map((item) => `\`${item}\``).join(", ") : "none";
  const verdict = result.agree ? "Agree on the compared lanes." :
    result.nxOnly.length ? "**Nx selects a lane the planner skips.** Check this before cut-over." :
      "Nx is narrower. Check each lane below is safe to skip.";
  return [
    `## Nx shadow plan (${mode})`,
    "",
    `\`${base.slice(0, 9)}..${head.slice(0, 9)}\`: ${verdict}`,
    "",
    `- Planner lanes${result.plannerFull ? " (full run)" : ""}: ${list(result.plannerLanes)}`,
    `- Nx lanes: ${list(result.nxLanes)}`,
    `- Planner only: ${list(result.plannerOnly)}`,
    `- Nx only: ${list(result.nxOnly)}`,
    `- Nx tasks: ${list(result.nxTasks)}`,
    "",
  ].join("\n");
}

function run(command, args) {
  return execFileSync(command, args, {encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "inherit"]});
}

function main(argv) {
  const args = {mode: "pr"};
  for (let index = 0; index < argv.length; index += 2) {
    const [flag, value] = [argv[index], argv[index + 1]];
    if (!["--base", "--head", "--mode", "--out"].includes(flag) || !value) {
      throw new Error("Usage: node tool/nx/shadow_plan.mjs --base <sha> --head <sha> [--mode pr|merge_group] [--out file]");
    }
    args[flag.slice(2)] = value;
  }
  if (!args.base || !args.head) throw new Error("--base and --head are required");
  const plan = JSON.parse(run(process.execPath, ["tool/harness.mjs", "plan", "--base", args.base, "--head", args.head,
    "--mode", args.mode, "--json"]));
  const graphFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "nx-shadow-")), "graph.json");
  run("npx", ["nx", "affected", "-t", ...targets, "--base", args.base, "--head", args.head, `--graph=${graphFile}`]);
  const graph = JSON.parse(fs.readFileSync(graphFile, "utf8"));
  const changedFiles = run("git", ["diff", "--name-only", args.base, args.head]).trim().split("\n");
  const tagsByProject = Object.fromEntries(Object.entries(graph.graph.nodes).map(([name, node]) => [name, node.data.tags ?? []]));
  const result = compare({plannerLanes: plan.operations.ciTargets, plannerFull: plan.full === true,
    nxTasks: Object.keys(graph.tasks.tasks), tagsByProject, mode: args.mode, changedFiles});
  const report = {base: args.base, head: args.head, mode: args.mode, ...result};
  if (args.out) fs.writeFileSync(args.out, `${JSON.stringify(report, null, 2)}\n`);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary(result, args));
  console.log(summary(result, args));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
