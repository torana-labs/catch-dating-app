#!/usr/bin/env node
/**
 * Run the CI gates that apply to the current change, derived from the workflow
 * definitions rather than from a hand-maintained list.
 *
 *   node tool/harness/verify_local.mjs --base origin/main            # run them
 *   node tool/harness/verify_local.mjs --base origin/main --list     # show them
 *   node tool/harness/verify_local.mjs --base origin/main --json
 *   node tool/harness/verify_local.mjs --target flutter --list       # one target
 *   node tool/harness/verify_local.mjs --preflight --base origin/main # cheap structural gates
 *   # Sparse feedback only: --preflight --allow-deferred reports unavailable
 *   # checks without accepting that report as a complete preflight.
 *
 * Motivation: every prompt, checklist and doc in this repository that restated
 * "the gates to run" has drifted from CI at least once, and each drift cost a
 * CI round-trip or shipped a defect. `tool/harness.mjs plan` already resolves
 * *which* CI targets a diff affects, but it emits identifiers, so turning them
 * into commands stayed a from-memory step. This closes that gap: identifiers in,
 * the workflow's own commands out.
 *
 * Fail-closed by design. A ciTarget with no matching workflow, or a workflow
 * whose steps cannot be parsed, is an error — not an empty run. Silently
 * verifying nothing is the failure mode this tool exists to prevent.
 */

import {spawnSync} from "node:child_process";
import fs from "node:fs";
import {createRequire} from "node:module";
import {pathToFileURL} from "node:url";
import path from "node:path";
import process from "node:process";

import {deriveTargetWorkflows, extractSteps, planCodegenFreshness, planSourcePreflight, workflowForTarget} from "./lib/workflow_steps.mjs";
import {planAffectedToolChecks} from "../lib/tool_impact.mjs";

const WORKFLOW_DIR = ".github/workflows";

function parseArgs(argv) {
  const args = {base: "origin/main", head: "HEAD", mode: "pr", full: false,
    commitWindow: false, preflight: false, list: false, json: false, targets: []};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--list") args.list = true;
    else if (arg === "--json") args.json = true;
    else if (arg === "--preflight") args.preflight = true;
    else if (arg === "--allow-deferred") args.allowDeferred = true;
    else if (arg === "--full") args.full = true;
    else if (arg === "--commit-window") args.commitWindow = true;
    else if (arg === "--base") args.base = argv[++i];
    else if (arg === "--head") args.head = argv[++i];
    else if (arg === "--mode") args.mode = argv[++i];
    else if (arg === "--target") args.targets.push(argv[++i]);
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`unknown argument: ${arg}`);
  }
  if (args.preflight && (args.list || args.targets.length > 0)) {
    throw new Error("--preflight requires a base/head plan and cannot use --list or --target.");
  }
  if (args.allowDeferred && !args.preflight) throw new Error("--allow-deferred requires --preflight.");
  return args;
}

function resolveTargets({base, head, mode, full, commitWindow}) {
  const result = spawnSync(
    process.execPath,
    ["tool/harness.mjs", "plan", "--base", base, "--head", head,
      "--mode", mode, ...(full ? ["--full"] : []),
      ...(commitWindow ? ["--commit-window"] : []), "--json"],
    {encoding: "utf8", maxBuffer: 32 * 1024 * 1024},
  );
  if (result.error) {
    throw new Error(`harness plan spawn failed (${result.error.code || "unknown"}): ${result.error.message}`);
  }
  // The planner exits non-zero when it cannot map every changed path, but it
  // still emits a usable plan. Treat that as "incomplete", not "unavailable":
  // the useful response is to run the gates it did resolve and say loudly which
  // paths were unmapped, rather than to refuse and leave the change unverified.
  let plan;
  if (!result.stdout) {
    throw new Error(`harness plan failed (exit ${result.status}) and produced no plan:\n${result.stderr || ""}`);
  }
  try {
    plan = JSON.parse(result.stdout);
  } catch {
    throw new Error(
      `harness plan failed (exit ${result.status}) and produced invalid JSON:\n` +
      `${result.stderr || result.stdout}`,
    );
  }
  if (result.status !== 0 && plan.complete === true) {
    throw new Error(`harness plan failed (exit ${result.status}): ${result.stderr}`);
  }
  return {
    targets: plan.operations?.ciTargets ?? [],
    codegenIds: plan.operations?.codegenIds,
    changedPaths: plan.changedPaths ?? [],
    complete: plan.complete === true,
    mode: plan.mode,
    full: plan.full,
    unknownPaths: plan.unknownPaths ?? [],
    ambiguousPaths: plan.ambiguousPaths ?? [],
  };
}

function commitSha(ref) {
  const result = spawnSync("git", ["rev-parse", "--verify", "--end-of-options",
    `${ref}^{commit}`], {encoding: "utf8"});
  if (result.status !== 0 || !/^[0-9a-f]{40}\s*$/u.test(result.stdout)) {
    throw new Error(`Unable to resolve commit ${ref}: ${result.stderr}`);
  }
  return result.stdout.trim();
}

function runPreflight(args, context) {
  if (!context.complete || context.unknownPaths.length || context.ambiguousPaths.length) {
    throw new Error("Structural preflight requires a complete, unambiguous Harness plan: " +
      JSON.stringify({unknownPaths: context.unknownPaths,
        ambiguousPaths: context.ambiguousPaths}));
  }
  const localRunnableChecks = [];
  for (const command of [
    ["tool/harness.mjs", "validate"],
    ["tool/run.mjs", "check", "--manifest-only"],
  ]) {
    const result = spawnSync(process.execPath, command, {encoding: "utf8"});
    localRunnableChecks.push({command: `node ${command.join(" ")}`,
      status: result.status === 0 ? "passed" : "failed"});
    if (result.status !== 0) {
      throw new Error(`Structural preflight failed: node ${command.join(" ")}\n` +
        (result.stderr || result.stdout));
    }
  }
  const graph = JSON.parse(fs.readFileSync("tool/harness/component_graph.json", "utf8"));
  const inventory = spawnSync("git", ["ls-files", "-t", "--cached", "--others",
    "--exclude-standard", "-z"], {encoding: "utf8", maxBuffer: 32 * 1024 * 1024});
  if (inventory.status !== 0) throw new Error("Cannot inspect freshness source materialization.");
  const files = inventory.stdout.split("\0").filter(Boolean);
  const runtimes = new Map();
  const requirements = {graph, codegenIds: context.codegenIds,
    repositoryPaths: files.map((file) => file.slice(2)),
    sparsePaths: files.filter((file) => file.startsWith("S ")).map((file) => file.slice(2)),
    fileAvailable: (file) => fs.existsSync(file) && fs.statSync(file).isFile(),
    executableAvailable(executable) {
      if (!runtimes.has(executable)) {
        runtimes.set(executable, spawnSync(executable, ["--version"], {
          encoding: "utf8", timeout: 15_000}).status === 0);
      }
      return runtimes.get(executable);
    },
    packageAvailable(dependency) {
      try {
        if (dependency.kind === "node") {
          createRequire(path.resolve(dependency.from)).resolve(dependency.name);
          return true;
        }
        const config = JSON.parse(fs.readFileSync(dependency.from, "utf8"));
        const entry = config.packages.find((candidate) => candidate.name === dependency.name);
        return entry && fs.existsSync(new URL(entry.rootUri,
          pathToFileURL(path.resolve(dependency.from))));
      } catch {
        return false;
      }
    },
  };
  const freshnessChecks = planCodegenFreshness(requirements);
  const sourceChecks = planSourcePreflight({...requirements, targets: context.targets});
  const failures = [];
  for (const check of [...sourceChecks, ...freshnessChecks]) {
    if (!check.runnable) { check.status = "ci-only"; continue; }
    const [executable, ...commandArgs] = check.command.trim().split(/\s+/u);
    const result = spawnSync(executable, commandArgs, {encoding: "utf8",
      timeout: check.timeoutSeconds * 1000, maxBuffer: 32 * 1024 * 1024});
    check.status = result.status === 0 ? "passed" : "failed";
    localRunnableChecks.push({codegenId: check.codegenId, command: check.command, status: check.status});
    if (result.status !== 0) {
      failures.push(`${check.codegenId ? "Freshness preflight failed for " + check.codegenId : "Source preflight failed: " + check.command}:\n` +
        (result.error?.message || result.stderr || result.stdout) +
        (check.writeCommand ? `\nRegenerate with: ${check.writeCommand}` : ""));
    }
  }
  const deferred = [...sourceChecks, ...freshnessChecks].filter(check => check.status === "ci-only");
  const report = {
    baseSha: commitSha(args.base), headSha: commitSha(args.head),
    mode: context.mode, full: context.full, commitWindow: args.commitWindow,
    complete: true, changedPaths: context.changedPaths, targets: context.targets,
    codegenIds: context.codegenIds, sourceChecks, freshnessChecks,
    preflightComplete: failures.length === 0 && deferred.length === 0, failures,
    freshnessComplete: freshnessChecks.every((check) => check.status === "passed"),
    validationComplete: false,
    localRunnableChecks,
    githubOnlyObligations: [
      ...deferred.map((check) => ({
        codegenId: check.codegenId, command: check.command,
        reason: check.reasons.join("; "),
      })),
      ...context.targets.map((target) => ({target,
        reason: "Selected CI lane and its runtime checks require GitHub Actions."})),
    ],
  };
  if (args.json) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(`Source preflight ${report.preflightComplete ? "passed" : "incomplete"} for ${report.baseSha}..${report.headSha} (${report.mode}).`);
    console.log(`${localRunnableChecks.filter(check => check.status === "passed").length} structural/freshness checks passed; ` +
      `${failures.length} failed; ${deferred.length} deferred; ` +
      `${report.githubOnlyObligations.length} required check/lane(s) remain GitHub obligations.`);
  }
  if (failures.length) {
    console.error(failures.join("\n\n"));
    process.exitCode = 1;
  } else if (deferred.length && !args.allowDeferred) {
    console.error("Preflight incomplete: " + deferred.map(check =>
      `${check.command}: ${check.reasons.join("; ")}`).join("\n"));
    process.exitCode = 1;
  }

}

function collectGates(targets, context) {
  const available = fs.readdirSync(WORKFLOW_DIR).filter((f) => f.endsWith(".yml"));
  const derived = deriveTargetWorkflows(
    fs.readFileSync(path.join(WORKFLOW_DIR, "ci.yml"), "utf8"),
  );
  const gates = [];
  const unresolved = [];
  const skipped = [];
  const seen = new Set();
  const seenSkipped = new Set();

  for (const target of targets) {
    if (target === "tools") {
      const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
      const tools = planAffectedToolChecks({
        changedPaths: context.changedPaths ?? [],
        manifest: read("tool/tools_manifest.json"),
        componentGraph: read("tool/harness/component_graph.json"),
        mode: context.mode ?? "pr",
        full: context.full ?? true,
      });
      if (tools.mode !== "full" && !tools.toolIds.length) throw new Error("Affected Tools plan is empty.");
      if (tools.toolIds.some((id) => !/^[a-z0-9:_-]+$/.test(id))) throw new Error("Unsafe tool identifier.");
      gates.push({target, workflow: "tools-ci.yml", name: `Registered tool checks (${tools.mode})`,
        workingDirectory: ".", command: "node tool/run.mjs check" +
          (tools.mode === "full" ? "" : " " + tools.toolIds.join(" "))});
      continue;
    }
    const workflows = workflowForTarget(target, available, derived);
    if (workflows.length === 0) {
      unresolved.push(target);
      continue;
    }
    for (const workflow of workflows) {
      const source = fs.readFileSync(path.join(WORKFLOW_DIR, workflow), "utf8");
      const steps = extractSteps(source);
      if (steps.length === 0) {
        unresolved.push(`${target} (no steps parsed from ${workflow})`);
        continue;
      }
      for (const [index, step] of steps.entries()) {
        if (!step.runnable) {
          const key = `${workflow}::${index}`;
          if (!seenSkipped.has(key)) {
            seenSkipped.add(key);
            skipped.push({workflow, job: step.job, line: step.line,
              name: step.name, reason: step.skipReason});
          }
          continue;
        }
        // Targets share workflows (android/ios/web all route to the build
        // matrix); running a gate once per target would multiply the cost of
        // a full verification for no additional coverage.
        const key = JSON.stringify([step.workingDirectory, step.run]);
        if (seen.has(key)) continue;
        seen.add(key);
        gates.push({target, workflow, name: step.name, command: step.run, workingDirectory: step.workingDirectory});
      }
    }
  }
  return {gates, unresolved, skipped};
}

function runGate(gate) {
  const started = Date.now();
  const result = spawnSync("bash", ["-e", "-o", "pipefail", "-c", gate.command], {
    stdio: "inherit", cwd: path.resolve(gate.workingDirectory),
  });
  return {...gate, status: result.status ?? 1, seconds: Math.round((Date.now() - started) / 1000)};
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(String(error.message));
    process.exit(2);
  }
  if (args.help) {
    console.log(fs.readFileSync(new URL(import.meta.url), "utf8").split("*/")[0]);
    return;
  }

  let targets;
  let context = {};
  try {
    if (args.targets.length > 0) {
      targets = args.targets;
    } else {
      const resolved = resolveTargets(args);
      targets = resolved.targets;
      context = resolved;
    }
    if (args.preflight) {
      runPreflight(args, context);
      return;
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
    return;
  }

  let collected;
  try {
    collected = collectGates(targets, context);
  } catch (error) {
    console.error(`Cannot derive local workflow checks: ${error.message}`);
    process.exitCode = 2;
    return;
  }
  const {gates, unresolved, skipped} = collected;

  if (unresolved.length > 0) {
    console.error(
      `error: no workflow resolved for ciTarget(s): ${unresolved.join(", ")}\n` +
      `The harness component graph and ${WORKFLOW_DIR}/ have diverged. Fix the ` +
      `mapping in tool/harness/lib/workflow_steps.mjs rather than ignoring the target.`,
    );
    process.exit(2);
  }

  if (args.json) {
    console.log(JSON.stringify({targets, gates, skipped,
      localRunnableChecks: gates, githubOnlyObligations: [
        ...skipped,
        ...targets.map((target) => ({target,
          reason: "Full selected CI lane still requires GitHub Actions."})),
      ], ...context}, null, 2));
    return;
  }

  if (targets.length === 0) {
    console.log("No CI targets affected by this change.");
    return;
  }

  console.log(`CI targets affected: ${targets.join(", ")}`);
  if (context.unknownPaths?.length) {
    console.log(`warning: ${context.unknownPaths.length} path(s) unmapped by the harness ` +
      `(${context.unknownPaths.slice(0, 3).join(", ")}) — coverage may be incomplete.`);
  }
  console.log(`${gates.length} locally-runnable gate(s):\n`);
  const reportSkipped = () => {
    if (skipped.length === 0) return;
    console.log(
      `\n${skipped.length} CI step(s) are NOT covered locally — this run is not ` +
      `equivalent to CI:`,
    );
    for (const step of skipped) console.log(`  ${step.name}  (${step.workflow}${step.job ? ` / ${step.job}:${step.line}` : ""}) — ${step.reason}`);
    console.log("\nTools selection is resolved through the same registered planner and runner as CI.");
  };

  if (args.list) {
    let lastWorkflow = null;
    for (const gate of gates) {
      if (gate.workflow !== lastWorkflow) {
        console.log(`  ── ${gate.workflow}`);
        lastWorkflow = gate.workflow;
      }
      console.log(`  ${gate.name}`);
      if (gate.workingDirectory !== ".") console.log(`      working directory: ${gate.workingDirectory}`);
      for (const line of gate.command.split("\n")) console.log(`      ${line}`);
    }
    reportSkipped();
    return;
  }

  const results = [];
  for (const [index, gate] of gates.entries()) {
    console.log(`\n[${index + 1}/${gates.length}] ${gate.name}  (${gate.workflow})`);
    results.push(runGate(gate));
  }

  const failed = results.filter((r) => r.status !== 0);
  console.log(`\n${"─".repeat(60)}`);
  for (const r of results) {
    console.log(`  ${r.status === 0 ? "pass" : "FAIL"}  ${String(r.seconds).padStart(4)}s  ${r.name}`);
  }
  console.log(`${results.length - failed.length}/${results.length} gate(s) passed.`);
  reportSkipped();
  process.exit(failed.length === 0 && context.complete !== false ? 0 : 1);
}

main();
