#!/usr/bin/env node

import fs from "node:fs";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {fromRepo, repoRoot} from "./lib/repo_paths.mjs";
import {
  deferQueueOnlyTargets,
  deriveAppRoles,
  planAffected,
  resolveTargetCheckout,
  summarizeCoverage,
  validateComponentGraph,
} from "./harness/lib/component_graph.mjs";
import {collectLocalReadonlyCheckIds} from "./lib/tool_impact.mjs";
import {changedPathsSince} from "./harness/lib/git_changes.mjs";
export {changedPathsSince} from "./harness/lib/git_changes.mjs";

const graphPath = fromRepo("tool/harness/component_graph.json");
const toolsManifestPath = fromRepo("tool/tools_manifest.json");

export function parseArgs(args) {
  const command = args[0] ?? "help";
  const pathsValue = valueAfter(args, "--paths");
  return {
    command,
    base: valueAfter(args, "--base") ?? "origin/main",
    head: valueAfter(args, "--head") ?? "HEAD",
    mode: valueAfter(args, "--mode") ?? "pr",
    paths: pathsValue == null
      ? null
      : pathsValue.split(",").map((value) => value.trim()).filter(Boolean),
    json: args.includes("--json"),
    full: args.includes("--full"),
    commitWindow: args.includes("--commit-window"),
    githubOutput: valueAfter(args, "--github-output"),
  };
}

export function projectPlanOutputs({plan, graph}) {
  if (plan.complete !== true) {
    throw new Error("Refusing to project outputs from an incomplete Harness plan.");
  }
  const selectedTargets = new Set(plan.operations.ciTargets);
  const appRoles = deriveAppRoles(plan);
  // Generator freshness can be selected without its product's validation lane.
  // Bootstrap from the same declared requirements that preflight verifies.
  const generators = new Map(graph.compileCodegen.map(entry => [entry.id, entry]));
  const codegen = (plan.operations.codegenIds ?? []).map(id => {
    const entry = generators.get(id);
    if (!entry) throw new Error(`Unknown required compile-codegen id "${id}".`);
    return entry;
  });
  return {
    ...Object.fromEntries(graph.targets.map((target) => [
      target,
      selectedTargets.has(target),
    ])),
    app_roles: JSON.stringify(appRoles),
    preflight_functions_dependencies: codegen.some(entry =>
      entry.checkRequirements.packages.some(dependency =>
        dependency.kind === "node" && dependency.from === "functions/package.json")),
    build_targets: JSON.stringify([...plan.operations.buildTargets].sort()),
    docs_checkout: JSON.stringify(resolveTargetCheckout({graph, target: "docs"})),
    mode: plan.mode,
    full: plan.full,
    commit_window: plan.commitWindow === true,
    complete: plan.complete,
  };
}

export function planCommittedWindow({graph, endpointPaths, windowPaths}) {
  // Current unowned files still fail. Only historical, transient ownership can
  // broaden validation to nightly/full; publication is independently planned.
  const endpoint = planAffected({changedPaths: endpointPaths, graph, mode: "main"});
  const window = planAffected({changedPaths: windowPaths, graph, mode: "main"});
  const selected = !endpoint.complete ? endpoint : window.complete ? window :
    planAffected({changedPaths: windowPaths, graph, mode: "nightly", full: true});
  return {...selected, commitWindow: true, validationOnly: true};
}

export function formatGithubOutputs(outputs) {
  return Object.entries(outputs)
    .map(([key, value]) => {
      const serialized = String(value);
      if (!/^[a-z][a-z0-9_]*$/.test(key) || /[\r\n]/.test(serialized)) {
        throw new Error(`Unsafe GitHub output ${JSON.stringify(key)}.`);
      }
      return `${key}=${serialized}\n`;
    })
    .join("");
}

export function writeGithubOutputs(path, outputs) {
  fs.appendFileSync(path, formatGithubOutputs(outputs), "utf8");
}

export function main({
  args = process.argv.slice(2),
  setExitCode = (status) => {
    process.exitCode = status;
  },
} = {}) {
  let options;
  try {
    options = parseArgs(args);
    if (["help", "--help", "-h"].includes(options.command)) {
      printHelp();
      return;
    }
    const graph = readJson(graphPath);
    const toolsManifest = readJson(toolsManifestPath);
    const knownCheckIds = collectKnownCheckIds(toolsManifest);
    const validationErrors = validateComponentGraph(graph, {knownCheckIds});
    if (validationErrors.length > 0) {
      printErrors("Harness v2 component graph is invalid:", validationErrors);
      process.exitCode = 1;
      return;
    }
    if (options.command === "validate") {
      printResult({valid: true, graphVersion: graph.version, status: graph.status}, options.json);
      return;
    }
    if (options.command === "coverage") {
      const paths = trackedPaths();
      const coverage = summarizeCoverage({paths, graph});
      printResult({graphVersion: graph.version, status: graph.status, ...coverage}, options.json);
      return;
    }

    if (options.commitWindow && (options.mode !== "main" || options.full || options.paths)) {
      throw new UsageError("--commit-window requires a main base/head plan, without --full or --paths.");
    }
    const changedPaths = options.paths ?? (options.full ? [] : changedPathsSince(options));
    const plan = options.commitWindow ? planCommittedWindow({
      graph, windowPaths: changedPaths,
      endpointPaths: changedPathsSince({...options, commitWindow: false, committedOnly: true}),
    }) : deferQueueOnlyTargets(planAffected({
      changedPaths,
      graph,
      mode: options.mode,
      full: options.full,
    }));

    if (options.command === "explain") {
      printResult(plan, options.json);
      setClassificationExitCode(plan, setExitCode);
      return;
    }
    if (options.command === "plan") {
      if (graph.status !== "required") {
        throw new Error(
          `Harness plan authority requires graph status "required", found ${JSON.stringify(graph.status)}.`,
        );
      }
      if (!plan.complete) {
        printResult(plan, options.json);
        setClassificationExitCode(plan, setExitCode);
        return;
      }
      if (options.githubOutput) {
        writeGithubOutputs(
          options.githubOutput,
          projectPlanOutputs({plan, graph}),
        );
      }
      printResult(plan, options.json);
      return;
    }
    throw new UsageError(`Unknown harness command "${options.command}".`);
  } catch (error) {
    console.error(error.message);
    if (error instanceof UsageError) printHelp();
    process.exitCode = error instanceof UsageError ? 64 : 1;
  }
}

export function collectKnownCheckIds(toolsManifest) {
  return collectLocalReadonlyCheckIds(toolsManifest);
}

function setClassificationExitCode(plan, setExitCode) {
  if (!plan.complete) setExitCode(1);
}

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

export function trackedPaths({cwd = repoRoot, runner = spawnSync} = {}) {
  const result = runner("git", ["ls-files", "-z"], {
    cwd,
    encoding: "utf8",
    shell: false,
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) {
    throw new Error(result.error?.message || result.stderr || "Unable to list tracked paths.");
  }
  return result.stdout.split("\0").filter(Boolean);
}

function valueAfter(args, flag) {
  const index = args.indexOf(flag);
  if (index === -1) return null;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new UsageError(`${flag} requires a value.`);
  return value;
}

function printErrors(label, errors) {
  console.error(label);
  for (const error of errors) console.error(`- ${error}`);
}

function printResult(value, json) {
  if (json) {
    console.log(JSON.stringify(value, null, 2));
    return;
  }
  if (value.directComponents) {
    printPlan(value);
    return;
  }
  console.log(JSON.stringify(value, null, 2));
}

function printPlan(plan) {
  console.log(`Harness v2 ${plan.graphStatus} plan (${plan.mode})`);
  console.log(`Direct components: ${plan.directComponents.join(", ") || "none"}`);
  console.log(`Affected components: ${plan.affectedComponents.join(", ") || "none"}`);
  console.log(`CI targets: ${plan.operations.ciTargets.join(", ") || "none"}`);
  console.log(`Checks: ${plan.operations.checkIds.join(", ") || "none"}`);
  console.log(`Compile-codegen: ${plan.operations.codegenIds.join(", ") || "none"}`);
  if (plan.unknownPaths.length > 0) console.error(`Unknown paths: ${plan.unknownPaths.join(", ")}`);
  if (plan.ambiguousPaths.length > 0) {
    console.error(`Ambiguous paths: ${plan.ambiguousPaths.map((entry) => entry.path).join(", ")}`);
  }
}

function printHelp() {
  console.log(`Usage: node tool/harness.mjs <command> [options]

Commands:
  validate
  coverage [--json]
  explain [--paths a,b | --base ref [--head ref] | --full] [--mode mode] [--json]
  plan [--paths a,b | --base ref [--head ref] [--commit-window] | --full] [--mode mode] [--github-output path] [--json]

Harness is read-only: it explains affected checks, builds, codegen freshness
checks, and delivery lanes but never executes them. Use node tool/run.mjs check
for explicit check execution. Worktree coordination is a separate Git helper:
node tool/git/worktree_guard.mjs help`);
}

class UsageError extends Error {}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
