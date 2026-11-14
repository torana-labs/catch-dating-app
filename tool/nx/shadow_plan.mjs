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
import {callerLanes, isSelector, workflowCallers} from "./workflow_callers.mjs";

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
  // The Tools lane runs meta:brand-literals: `generate.mjs --check`, the brand
  // tests and the literal scan.
  "brand": "tools",
  // design:tokens and design:widget-dedupe-fingerprints run in the Tools lane.
  "design-tokens": "tools",
  "widget_dedupe": "tools",
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

// A file CI executes or reads selects the lanes whose jobs reach it, and a
// file that decides selection selects every lane (workflow_callers.mjs).
let defaultGraph = null;
export const callerGraph = () => (defaultGraph ??= workflowCallers({lanes: comparedLanes}));
export const isControlPlane = (file, graph = callerGraph()) => isSelector(file, graph);
export const workflowLanes = (changedFiles, graph = callerGraph()) =>
  changedFiles.length === 0 ? new Set() : callerLanes(changedFiles, {graph, allLanes: comparedLanes});

/** The CI lane an Nx task stands in for, or null when it has none yet. */
export function laneForTask(taskId, tags = []) {
  const project = taskId.slice(0, taskId.lastIndexOf(":")).replace(/^@catch\//, "");
  if (project in laneByProject) return laneByProject[project];
  return tags.includes("lang:dart") ? "flutter" : null;
}

/**
 * Compare the planner's lanes with the lanes Nx tasks stand in for.
 *
 * `nxTasks` are the tasks the change affects, without the tasks they depend
 * on (`--excludeTaskDependencies`): a website-only change must not run Admin
 * because the website build needs @catch/web-ui:build. A change that does
 * reach web-ui selects its tasks itself.
 */
const projectOf = (task) => task.slice(0, task.lastIndexOf(":"));
// Directories the contracts scans read outside contracts/ (contracts:check
// and :conformance inputs in nx.json). lane_inputs.test.mjs keeps it in step.
export const contractsConsumerScanPrefixes = ["functions/src/", "lib/", "packages/kernel/lib/", "packages/platform/lib/",
  "tool/contracts/"];

/**
 * Known reasons the planner and Nx disagree on a lane. A disagreement that
 * matches one is explained; anything else is unexplained and counts against
 * the cut-over (#1554). Each rule is pinned by a fixture in shadow_plan.test.mjs.
 *
 * Planner rules read the planner's own provenance for the lane
 * (plan.operationSources.ciTargets entries whose value is the lane).
 */
export const explanationRules = [
  {id: "planner-full-selection", side: "planner",
    why: "The planner runs every lane for its own control plane (repo.harness: tools_manifest.json, the graph, tool/ci) and retired root shells.",
    matches: ({sources}) => sources.some((source) => ["repo.harness", "app.native.retired"].includes(source.component))},
  {id: "planner-functions-implies-contracts", side: "planner", lanes: ["contracts"],
    why: "The planner adds Contracts for any Functions or backend-deploy file; the contracts scans read only functions/src and the lockfile, so Nx skips it.",
    matches: ({sources}) => sources.length > 0 &&
      sources.every((source) => ["backend.functions", "ci.backend-delivery"].includes(source.component))},
  {id: "planner-propagates-to-captures", side: "planner", lanes: ["capture_freshness"],
    why: "The planner reaches capture freshness through an affected component; Nx runs it only when the website itself changes.",
    matches: ({sources, nxTasks}) => sources.length > 0 && sources.every((source) => source.relationship === "affected") &&
      !nxTasks.some((task) => projectOf(task) === "catch-marketing")},
  {id: "planner-operations-doc", side: "planner", lanes: ["functions"],
    why: "The planner runs Functions for operations READMEs, which no check reads.",
    matches: ({sources}) => sources.length > 0 && sources.every((source) => source.component === "operations.workflow-doc")},
  {id: "planner-contracts-source", side: "planner",
    why: "The planner runs nine lanes for any contract file; Nx runs only the consumers of the changed contract family.",
    matches: ({sources}) => sources.length > 0 && sources.every((source) => source.component === "contracts.source")},
  {id: "docs-reads-every-markdown", side: "nx", lanes: ["docs"],
    why: "lane-docs reads every Markdown file; the planner leaves doc-contract files (READMEs it classifies as terminal) out of Docs.",
    matches: ({changedFiles}) => changedFiles.some((file) => file.endsWith(".md"))},
  {id: "contracts-scan-consumers", side: "nx", lanes: ["contracts"],
    why: "The contracts scans read consumer code (path literals, type boundaries); the planner does not model that.",
    matches: ({changedFiles}) => changedFiles.some((file) => contractsConsumerScanPrefixes.some((prefix) => file.startsWith(prefix)))},
  {id: "design-lane-reads-flutter", side: "nx", lanes: ["admin", "marketing"],
    why: "The Admin and Marketing design-parity lanes read Flutter UI sources; the planner keeps those changes in Flutter.",
    matches: ({lane, nxTasks}) => {
      const tasks = nxTasks.filter((task) => laneForTask(task) === lane);
      return tasks.length > 0 && tasks.every((task) => projectOf(task) === `lane-${lane}-design`);
    }},
  {id: "lane-tools-coarse", side: "nx", lanes: ["tools"],
    why: "lane-tools reads whole source trees until tool checks become Nx targets (stage 2); the planner selects tool checks by import graph.",
    matches: ({nxTasks, changedFiles}) => nxTasks.filter((task) => laneForTask(task) === "tools")
      .every((task) => task === "lane-tools:lane") && !changedFiles.some((file) => file.startsWith("tool/"))},
  {id: "brand-guard-in-functions", side: "nx", lanes: ["functions", "firestore_rules"],
    why: "functions/src/shared/brand.test.ts re-runs the brand guard, so brand changes run Functions (and the rules lane that depends on it); the planner misses that.",
    matches: ({changedFiles}) => changedFiles.some((file) => file.startsWith("packages/brand/"))},
  // Last: the more specific Nx rules above name the cause when they apply.
  {id: "nx-control-plane", side: "nx",
    why: "A file CI executes or reads selects every lane that runs it, and a selector file selects every lane; the planner narrows some of them by hand.",
    matches: ({lane, changedFiles, graph}) => workflowLanes(changedFiles, graph).has(lane)},
];

/** The rule that explains one disagreeing lane, or null. */
export function explain({lane, side, sources = [], nxTasks = [], changedFiles = [], graph}) {
  const rule = explanationRules.find((candidate) => candidate.side === side &&
    (!candidate.lanes || candidate.lanes.includes(lane)) &&
    candidate.matches({lane, sources: sources.filter((source) => source.value === lane), nxTasks, changedFiles, graph}));
  return rule?.id ?? null;
}

export function compare({plannerLanes, plannerFull = false, nxTasks, tagsByProject = {}, mode = "merge_group",
  changedFiles = [], plannerSources = [], graph}) {
  const nxLanes = workflowLanes(changedFiles, graph);
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
  const explained = [
    ...plannerOnly.map((lane) => ({lane, side: "planner"})),
    ...nxOnly.map((lane) => ({lane, side: "nx"})),
  ].map((entry) => ({...entry, rule: explain({...entry, sources: plannerSources, nxTasks, changedFiles, graph})}));
  const unexplained = (side) => explained.filter((entry) => entry.side === side && !entry.rule).map((entry) => entry.lane);
  return {
    agree: plannerOnly.length === 0 && nxOnly.length === 0,
    explainedAgree: explained.every((entry) => entry.rule),
    unexplainedPlannerOnly: unexplained("planner"),
    unexplainedNxOnly: unexplained("nx"),
    explained: explained.filter((entry) => entry.rule),
    plannerSources,
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
    result.explainedAgree ? "Every disagreement has a known explanation." :
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
    `- Explained: ${list(result.explained.map((entry) => `${entry.lane} (${entry.side} only: ${entry.rule})`))}`,
    `- **Unexplained**: planner only ${list(result.unexplainedPlannerOnly)}; Nx only ${list(result.unexplainedNxOnly)}`,
    `- Nx tasks: ${list(result.nxTasks)}`,
    ...(result.unmappedTasks.length ? [`- **Unmapped Nx tasks** (map them in shadow_plan.mjs): ${list(result.unmappedTasks)}`] : []),
    "",
  ].join("\n");
}

/**
 * The shadow run's exit code. A disagreement is the report's subject, so it
 * passes; an Nx task with no lane means the comparison itself is incomplete.
 */
export function shadowExitCode(result) {
  return result.unmappedTasks.length > 0 ? 1 : 0;
}

function run(command, args) {
  return execFileSync(command, args, {encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "inherit"]});
}

/** The tasks a change affects, without the tasks they depend on, and every project's tags. */
export function nxAffected({base, head}) {
  const graphFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "nx-affected-")), "graph.json");
  run("npx", ["nx", "affected", "-t", ...targets, "--base", base, "--head", head, "--excludeTaskDependencies",
    `--graph=${graphFile}`]);
  const graph = JSON.parse(fs.readFileSync(graphFile, "utf8"));
  const tagsByProject = Object.fromEntries(Object.entries(graph.graph.nodes).map(([name, node]) => [name, node.data.tags ?? []]));
  return {nxTasks: Object.keys(graph.tasks.tasks), tagsByProject};
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
  const changedFiles = run("git", ["diff", "--name-only", args.base, args.head]).trim().split("\n");
  const result = compare({plannerLanes: plan.operations.ciTargets, plannerFull: plan.full === true,
    ...nxAffected(args), mode: args.mode, changedFiles, plannerSources: plan.operationSources?.ciTargets ?? []});
  const report = {base: args.base, head: args.head, mode: args.mode, ...result};
  if (args.out) fs.writeFileSync(args.out, `${JSON.stringify(report, null, 2)}\n`);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary(result, args));
  console.log(summary(result, args));
  if (result.unmappedTasks.length > 0) {
    console.error(`::error::Nx tasks with no CI lane: ${result.unmappedTasks.join(", ")}. Map them in tool/nx/shadow_plan.mjs.`);
  }
  process.exitCode = shadowExitCode(result);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
