#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {repoRoot} from "./lib/repo_paths.mjs";
import {createRepositorySnapshot} from "./lib/repository_snapshot.mjs";
import {loadToolsManifestFromSnapshot, toolsManifestAt} from "./lib/tools_manifest.mjs";
import {changedPathsSince} from "./harness/lib/git_changes.mjs";
import {
  toolSupportsPlatform,
  validateToolPlatforms,
} from "./lib/tool_platform.mjs";
import {
  duplicateCanonicalFullPathOverrides,
  formatAffectedToolGithubOutputs,
  hasExecutableChecks,
  planAffectedToolChecks,
  prerequisiteFingerprint,
  splitSharedPrerequisite,
  uniqueToolChecks,
  validateToolCheckSafety,
  validateToolCiRequirements,
} from "./lib/tool_impact.mjs";
import {
  closedToolStatuses,
  validateToolLifecycle,
  validateToolOrder,
  validateToolPaths,
  validateToolRoles,
  validateToolRules,
  validateToolSurfaces,
  validateRemoteOpsEntrypoints,
} from "./lib/tool_manifest_rules.mjs";

const componentGraphPath = "tool/harness/component_graph.json";
const remoteOpsManifestPath = "tool/remote_ops_manifest.json";
let capturedRepositorySnapshot = null;

const command = process.argv[2] ?? "help";
const argv = process.argv.slice(3);

if (command === "help" || command === "--help" || command === "-h") {
  printHelp();
} else if (command === "list") {
  listTools(argv);
} else if (command === "check") {
  await checkTools(argv);
} else if (command === "affected-tools") {
  await affectedToolChecks(argv);
} else if (command === "run" || command === "exec") {
  runTool(argv);
} else {
  console.error(`Unknown command: ${command}`);
  printHelp();
  process.exit(64);
}

function loadManifest() {
  const manifest = loadToolsManifestFromSnapshot(repositorySnapshot());
  if (!Array.isArray(manifest.tools)) {
    throw new Error("The tools manifest must contain a tools array.");
  }
  return manifest;
}

function listTools(args) {
  const {category, json, closed} = parseListArgs(args);
  if (closed) {
    listClosedTools(loadManifest(), {category, json});
    return;
  }
  const tools = selectTools(loadManifest(), {category});
  requireSelection(tools, {category});

  if (json) {
    console.log(JSON.stringify(tools, null, 2));
    return;
  }

  const byCategory = new Map();
  for (const tool of tools) {
    if (!byCategory.has(tool.category)) byCategory.set(tool.category, []);
    byCategory.get(tool.category).push(tool);
  }

  for (const [name, entries] of [...byCategory.entries()].sort()) {
    console.log(`\n${name}`);
    for (const tool of entries.sort((a, b) => a.id.localeCompare(b.id))) {
      console.log(`  ${tool.id.padEnd(42)} ${tool.path}`);
    }
  }
}

// Completed and retired tools: what existed, when it closed and why.
function listClosedTools(manifest, {category, json}) {
  const tools = manifest.tools.filter((tool) => closedToolStatuses.includes(tool.status) &&
    (!category || tool.category === category));
  if (json) {
    console.log(JSON.stringify(tools, null, 2));
    return;
  }
  if (tools.length === 0) {
    console.log("No completed or retired tools.");
    return;
  }
  for (const tool of [...tools].sort((a, b) => a.id.localeCompare(b.id))) {
    const commit = tool.lastCommit ? ` (last in ${tool.lastCommit.slice(0, 12)})` : "";
    console.log(`${tool.id.padEnd(42)} ${tool.status} ${tool.retiredOn}${commit}\n  ${tool.reason}`);
  }
}

async function checkTools(args) {
  const {categories, ids, manifestOnly, marketingChecksInReact,
    deferVisualReport} = parseCheckArgs(args);
  const manifest = loadManifest();
  const tools = categories.length === 0 ? selectTools(manifest, {ids}) :
    categories.flatMap((category) => selectTools(manifest, {category, ids}));
  const errors = validateManifest(manifest, loadComponentGraph());
  if (manifestOnly) {
    errors.push(...validateToolOrder(manifest.tools), ...validateToolRoles(manifest.tools),
      ...validateToolRules(manifest.tools));
  }

  if (errors.length > 0) {
    console.error("Tool manifest validation failed:");
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }

  if (manifestOnly) {
    console.log("Tool manifest validation passed.");
    return;
  }

  const selectedIds = new Set(tools.map((tool) => tool.id));
  const missingIds = ids.filter((id) => !selectedIds.has(id));
  if (missingIds.length > 0) {
    console.error(`Unknown or inactive tool ids: ${missingIds.join(", ")}.`);
    process.exitCode = 64;
    return;
  }

  // Validate every requested category before dispatch. Retain category order
  // while allowing the existing command deduplication to span the whole bucket.
  for (const category of categories) {
    requireSelection(tools.filter((tool) => tool.category === category), {category, ids});
  }
  requireSelection(tools, {ids});
  await runChecks(tools, {marketingChecksInReact, deferVisualReport});
}

// Checks read the Admin and Functions import graphs, which include modules their
// builds generate. A sparse checkout has no sources, and no check that needs them.
function generateBuildModules() {
  const generators = ["tool/admin/generate_admin_action_catalog.mjs", "admin/scripts/generateCallableValidators.mjs"];
  if (!fs.existsSync(path.join(repoRoot, "contracts/admin/admin_action_catalog.json")) ||
      !fs.existsSync(path.join(repoRoot, generators[1]))) return true;
  return generators.every((script) => spawnSync(process.execPath, [script],
    {cwd: repoRoot, stdio: "inherit"}).status === 0);
}

function reactOwnsMarketingCheck({toolId, command}) {
  return ((toolId === "marketing:website-build" &&
        command === "npm --prefix website run build") ||
      (toolId === "marketing:website-storybook" &&
        command === "npm --workspace catch-marketing run build:storybook") ||
      (toolId === "marketing:website-storybook-a11y" &&
        command === "npm --workspace catch-marketing run test:storybook:a11y") ||
      (toolId === "web:storybook-visuals" &&
        command === "npm --workspace catch-marketing run build:storybook && node tool/web/check_storybook_visuals.mjs --surface website --report"));
}

// The Storybook visual report only reports pixel changes and never fails, so it
// runs in the CI nightly alone (owner decision, 23 Nov 2026, #2426). CI passes
// --defer-visual-report on every other run; standalone runs keep it.
// A function, not a module constant: the CLI dispatches before later
// top-level bindings initialise.
function deferredVisualReport({toolId, command}) {
  return toolId === "web:storybook-visuals" &&
    command === "npm --workspace catch-marketing run build:storybook && node tool/web/check_storybook_visuals.mjs --surface website --report";
}

async function runChecks(tools, {marketingChecksInReact = false, deferVisualReport = false} = {}) {
  if (marketingChecksInReact && process.env.GITHUB_ACTIONS !== "true") {
    console.error("--marketing-checks-in-react requires the same-run CI marketing lane.");
    process.exitCode = 64;
    return;
  }
  if (!generateBuildModules()) {
    process.exitCode = 1;
    return;
  }
  const compatible = tools.filter((tool) => {
    if (toolSupportsPlatform(tool)) return true;
    console.log(
      `==> ${tool.id}: skipped on ${process.platform}; ` +
      `supported platforms: ${tool.platforms.join(", ")}`,
    );
    return false;
  });
  // Run every selected tool and report every failure: one red check must not
  // hide the checks after it (#2041's harness break went unseen behind an
  // unrelated failure). A tool's later commands build on its earlier ones,
  // so after a failure only that tool's remaining commands are skipped.
  const categoryOf = new Map(compatible.map((tool) => [tool.id, tool.category]));
  const failures = [];
  const failedTools = new Set();
  // A shared prerequisite (the Functions build) runs at the first check that
  // needs it, and again only if its inputs changed since. If it fails, every
  // check that needs it fails with it; none is skipped as passed.
  const prerequisiteRuns = new Map();
  const runPrerequisite = (prerequisite) => {
    const fingerprint = prerequisiteFingerprint(prerequisite, repoRoot);
    const previous = prerequisiteRuns.get(prerequisite.command);
    if (previous?.status === 0 && previous.fingerprint === fingerprint) return 0;
    if (previous?.status > 0) return previous.status;
    console.log(`==> shared prerequisite: ${prerequisite.command}`);
    const result = spawnSync(prerequisite.command, {cwd: repoRoot, shell: true, stdio: "inherit"});
    const status = result.status ?? 1;
    prerequisiteRuns.set(prerequisite.command,
      {status, fingerprint: prerequisiteFingerprint(prerequisite, repoRoot)});
    return status;
  };
  for (const {toolId, command} of uniqueToolChecks(compatible)) {
    if (failedTools.has(toolId)) {
      console.log(`    skipped, an earlier ${toolId} command failed: ${command}`);
      continue;
    }
    // CI's required aggregate owns the parallel React result. Match both the
    // tool and exact command: an altered check must execute until its new
    // equivalence is established. Standalone runs retain builds and browser gates.
    if (deferVisualReport && deferredVisualReport({toolId, command})) {
      console.log(`==> ${toolId}: nightly-only visual report (see #2426).`);
      continue;
    }
    if (marketingChecksInReact && reactOwnsMarketingCheck({toolId, command})) {
      console.log(`==> ${toolId}: provided by the required same-run React marketing lane.`);
      continue;
    }
    console.log(`==> ${toolId}: ${command}`);
    const {prerequisite, rest} = splitSharedPrerequisite(command);
    if (prerequisite) {
      const status = runPrerequisite(prerequisite);
      if (status !== 0) {
        console.error(`    FAILED: the shared prerequisite "${prerequisite.command}" failed, so this check fails too.`);
        failures.push({toolId, category: categoryOf.get(toolId), command, status});
        failedTools.add(toolId);
        continue;
      }
      if (rest === null) {
        console.log("    shared prerequisite passed.");
        continue;
      }
      console.log(`    shared prerequisite passed; running: ${rest}`);
    }
    const result = spawnSync(rest, {
      cwd: repoRoot,
      shell: true,
      stdio: "inherit",
    });
    if (result.status !== 0) {
      const status = result.status ?? 1;
      // One searchable marker per failure: later output can bury the end-of-run list.
      console.error(`FAILED: ${toolId} (exit ${status})`);
      failures.push({toolId, category: categoryOf.get(toolId), command, status});
      failedTools.add(toolId);
    }
  }
  if (failures.length > 0) {
    reportToolFailures(failures);
    process.exitCode = failures[0].status || 1;
    return;
  }
  console.log("Tool checks passed.");
}

/** Lists every failed check as plain text, for the log. */
function formatToolFailures(failures) {
  return [
    `${failures.length} tool check${failures.length === 1 ? "" : "s"} failed:`,
    ...failures.map(({toolId, category, command, status}) =>
      `- ${toolId} (${category ?? "uncategorized"}), exit ${status}: ${command}`),
  ].join("\n");
}

/**
 * Wraps the plain-text list in a fenced code block for the CI step summary, so
 * backticks or `|` in a command render literally instead of as Markdown. The
 * fence is longer than any backtick run in the text, so no command can close it.
 */
function formatToolFailuresMarkdown(failures) {
  const report = formatToolFailures(failures);
  const longestRun = Math.max(0, ...(report.match(/`+/gu) ?? []).map((run) => run.length));
  const fence = "`".repeat(Math.max(3, longestRun + 1));
  return `### Failed tool checks\n\n${fence}text\n${report}\n${fence}\n`;
}

function reportToolFailures(failures) {
  console.error(`\n${formatToolFailures(failures)}`);
  if (!process.env.GITHUB_STEP_SUMMARY) return;
  try {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, formatToolFailuresMarkdown(failures));
  } catch (error) {
    console.error(`Could not write the step summary: ${error.message}`);
  }
}

function requireSelection(tools, {category, ids = []} = {}) {
  if (tools.length > 0 || (!category && ids.length === 0)) return;
  const selector = category ? `category ${category}` : `tool ids ${ids.join(", ")}`;
  console.error(`No active tools matched ${selector}.`);
  process.exit(64);
}

async function affectedToolChecks(args) {
  const options = parseAffectedToolArgs(args);
  const manifest = loadManifest();
  const componentGraph = loadComponentGraph();
  const errors = validateManifest(manifest, componentGraph);
  if (errors.length > 0) {
    console.error("Tool manifest validation failed:");
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }

  if (options.commitWindow && options.paths) throw new Error("--commit-window cannot override committed paths.");
  const changedPaths = options.paths ?? changedPathsSince(options);
  const importGraph = options.importOwners ?
    JSON.parse(fs.readFileSync(options.importOwners, "utf8")) : null;
  const baseManifest = options.paths || options.full ? null : manifestAt(options.base);
  const plan = planAffectedToolChecks({
    changedPaths,
    manifest,
    componentGraph,
    mode: options.mode,
    full: options.full,
    baseManifest,
    importOwners: importGraph && !options.full ?
      new Map(Object.entries(importGraph.owners).map(([file, ids]) => [file, new Set(ids)])) : null,
  });
  plan.importGraph = importGraph ? {tool: importGraph.tool, version: importGraph.version} : null;
  if (!options.check) {
    console.log(JSON.stringify(plan, null, 2));
    if (!options.githubOutput) return;
  }
  let tools = [];
  if (plan.mode !== "full") {
    tools = selectTools(manifest, {ids: plan.toolIds});
    const missingIds = plan.toolIds.filter(
      (id) => !tools.some((tool) => tool.id === id),
    );
    if (missingIds.length > 0) {
      console.error(
        `Affected-tool plan references inactive or unknown tool ids: ${missingIds.join(", ")}`,
      );
      process.exitCode = 1;
      return;
    }
    requireSelection(tools, {ids: plan.toolIds});
  }
  if (!options.check) {
    fs.appendFileSync(
      options.githubOutput,
      formatAffectedToolGithubOutputs(plan),
      "utf8",
    );
    return;
  }
  if (options.githubOutput) {
    fs.appendFileSync(
      options.githubOutput,
      formatAffectedToolGithubOutputs(plan),
      "utf8",
    );
  }
  if (options.json) {
    console.log(JSON.stringify(plan, null, 2));
  } else {
    console.log(`Affected tool mode: ${plan.mode}`);
    console.log(`Affected tool checks: ${plan.toolIds.join(", ") || "none"}`);
  }
  if (plan.mode === "full") {
    console.error(
      "Affected-tool planning selected full mode; run the full category matrix.",
    );
    process.exitCode = 1;
    return;
  }
  await runChecks(tools, {marketingChecksInReact: options.marketingChecksInReact,
    deferVisualReport: options.deferVisualReport});
}

function runTool(args) {
  const id = args[0];
  if (!id) {
    console.error("Usage: node tool/run.mjs run <tool-id> [args...]");
    process.exit(64);
  }

  const tool = loadManifest().tools.find((entry) => entry.id === id);
  if (!tool) {
    console.error(`Unknown tool id: ${id}`);
    process.exit(64);
  }
  if (!tool.command) {
    console.error(`Tool ${id} does not define a command.`);
    process.exit(64);
  }
  if (!toolSupportsPlatform(tool)) {
    console.error(
      `Tool ${id} is unavailable on ${process.platform}; ` +
      `supported platforms: ${tool.platforms.join(", ")}.`,
    );
    process.exit(64);
  }

  if (!generateBuildModules()) process.exit(1);
  const forwarded = args.slice(1).map(shellQuote).join(" ");
  const commandLine = forwarded ? `${tool.command} ${forwarded}` : tool.command;
  const result = spawnSync(commandLine, {
    cwd: repoRoot,
    shell: true,
    stdio: "inherit",
  });
  process.exit(result.status ?? 1);
}

function validateManifest(manifest, componentGraph) {
  const errors = [];
  const ids = new Set();
  const paths = new Set();

  for (const tool of manifest.tools) {
    if (!tool.id) errors.push("Tool entry is missing id.");
    if (!tool.category) errors.push(`${tool.id ?? "<missing>"} is missing category.`);
    if (!tool.path) errors.push(`${tool.id ?? "<missing>"} is missing path.`);
    for (const error of validateToolPlatforms(tool)) {
      errors.push(`${tool.id ?? "<missing>"}: ${error}`);
    }
    validateStringArrayField(tool.impactPaths, `${tool.id}.impactPaths`, errors);
    validateStringArrayField(tool.alsoCheckIds, `${tool.id}.alsoCheckIds`, errors);
    validateStringArrayField(tool.alsoEnforces, `${tool.id}.alsoEnforces`, errors, {nonEmpty: true});
    for (const error of validateToolCiRequirements(tool)) {
      errors.push(`${tool.id ?? "<missing>"}: ${error}`);
    }
    for (const error of validateToolCheckSafety(tool)) {
      errors.push(`${tool.id ?? "<missing>"}: ${error}`);
    }
    if (tool.status === "active" && !hasExecutableChecks(tool)) {
      errors.push(`${tool.id ?? "<missing>"} is active but defines no checks.`);
    }
    if (tool.baseline && !repositorySnapshot().exists(tool.baseline)) {
      errors.push(`${tool.id}: missing baseline ${tool.baseline}`);
    }
    if (tool.id && ids.has(tool.id)) errors.push(`Duplicate tool id: ${tool.id}`);
    if (tool.id) ids.add(tool.id);
    if (tool.path) {
      paths.add(tool.path);
      // A retired tool's file is deleted; validateToolLifecycle checks that instead.
      if (tool.status !== "retired" && !repositorySnapshot().exists(tool.path)) {
        errors.push(`${tool.id}: missing path ${tool.path}`);
      }
    }
  }

  if (
    manifest.ciImpact == null ||
    typeof manifest.ciImpact !== "object" ||
    Array.isArray(manifest.ciImpact)
  ) {
    errors.push("Manifest is missing ciImpact configuration.");
  } else {
    validateStringArrayField(
      manifest.ciImpact.mandatoryCheckIds,
      "ciImpact.mandatoryCheckIds",
      errors,
      {required: true, nonEmpty: true},
    );
    validateStringArrayField(
      manifest.ciImpact.additionalFullPaths,
      "ciImpact.additionalFullPaths",
      errors,
      {required: true, nonEmpty: true},
    );
    validateStringArrayField(
      manifest.ciImpact.importGraphPaths,
      "ciImpact.importGraphPaths",
      errors,
      {required: false, nonEmpty: true},
    );
    validateStringArrayField(
      manifest.ciImpact.manifestCheckIds,
      "ciImpact.manifestCheckIds",
      errors,
      {required: false, nonEmpty: true},
    );
    validateStringArrayField(
      manifest.ciImpact.importOwnerCheckIds,
      "ciImpact.importOwnerCheckIds",
      errors,
      {required: false, nonEmpty: true},
    );
  }

  try {
    const duplicates = duplicateCanonicalFullPathOverrides({
      manifest,
      componentGraph,
    });
    if (duplicates.length > 0) {
      errors.push(
        `ciImpact.additionalFullPaths duplicates canonical repo.harness paths: ${duplicates.join(", ")}`,
      );
    }
  } catch (error) {
    errors.push(error.message);
  }

  errors.push(...validateToolPaths(manifest.tools, {
    exists: (file) => repositorySnapshot().exists(file),
    isTrackedFolder: (directory) => repositorySnapshot().listFiles({prefix: `${directory}/`}).length > 0,
  }));
  errors.push(...validateToolLifecycle(manifest.tools, {
    exists: (file) => repositorySnapshot().exists(file),
    read: readUnlessSparseOmitted,
  }));
  errors.push(...validateToolSurfaces(manifest.tools, {
    exists: (file) => repositorySnapshot().exists(file),
  }));
  // The CI planner's structural preflight runs on a sparse, blobless checkout
  // where this file's blob may be absent; the Tools lane checks it in full.
  const remoteOpsText = repositorySnapshot().exists(remoteOpsManifestPath)
    ? readUnlessSparseOmitted(remoteOpsManifestPath)
    : null;
  if (remoteOpsText != null) {
    errors.push(...validateRemoteOpsEntrypoints(manifest.tools, JSON.parse(remoteOpsText)));
  }

  const activeById = new Map(
    manifest.tools
      .filter((tool) => tool.status === "active")
      .map((tool) => [tool.id, tool]),
  );
  const referencedIds = [
    ...(manifest.ciImpact?.mandatoryCheckIds ?? []),
    ...(manifest.ciImpact?.importOwnerCheckIds ?? []),
    ...(manifest.ciImpact?.manifestCheckIds ?? []),
    ...manifest.tools.flatMap((tool) => tool.alsoCheckIds ?? []),
  ];
  for (const id of new Set(referencedIds)) {
    const tool = activeById.get(id);
    if (!tool) {
      errors.push(`Affected-tool metadata references inactive or unknown id: ${id}`);
    } else if (!Array.isArray(tool.checks) || tool.checks.length === 0) {
      errors.push(`Affected-tool metadata references id without checks: ${id}`);
    }
  }

  for (const relativePath of discoverManagedScripts()) {
    if (!paths.has(relativePath)) {
      errors.push(`Unmanaged tool script: ${relativePath}`);
    }
  }

  return errors;
}

function manifestAt(ref) {
  return toolsManifestAt(ref, {cwd: repoRoot});
}

function loadComponentGraph() {
  return repositorySnapshot().readJson(componentGraphPath, {required: true});
}

function discoverManagedScripts() {
  return repositorySnapshot().listFiles({prefix: "tool/"}).filter((relativePath) => {
    const ext = path.extname(relativePath);
    if (![".mjs", ".cjs", ".js", ".dart", ".py", ".rb", ".sh", ".swift"].includes(ext)) {
      return false;
    }
    if (relativePath.includes("/lib/")) return false;
    if (relativePath.includes("/fixtures/")) return false;
    if (relativePath.includes("/contracts/generated/")) return false;
    if (relativePath.endsWith(".test.mjs")) return false;
    return true;
  });
}

// Runbook anchors need document content. The Tools preflight checks out a
// sparse, blobless tree, so a document outside its closure has a path but no
// local blob; skip the anchor there, and let the full-checkout
// meta:tool-manifest run check it.
function readUnlessSparseOmitted(file) {
  try {
    return repositorySnapshot().readText(file);
  } catch (error) {
    if (String(error?.message).startsWith("Sparse-omitted repository content")) return null;
    throw error;
  }
}

function repositorySnapshot() {
  capturedRepositorySnapshot ??= createRepositorySnapshot();
  return capturedRepositorySnapshot;
}

function selectTools(manifest, {category, ids = []} = {}) {
  return manifest.tools.filter((tool) => {
    if (tool.status !== "active") return false;
    if (category && tool.category !== category) return false;
    if (ids.length > 0 && !ids.includes(tool.id)) return false;
    return true;
  });
}

function validateStringArrayField(
  value,
  label,
  errors,
  {required = false, nonEmpty = false} = {},
) {
  if (value == null && !required) return;
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string" || entry === "")) {
    errors.push(`${label} must be an array of non-empty strings.`);
    return;
  }
  if (nonEmpty && value.length === 0) {
    errors.push(`${label} must not be empty.`);
  }
  if (new Set(value).size !== value.length) {
    errors.push(`${label} must not contain duplicates.`);
  }
}

function parseListArgs(args) {
  return {
    category: valueAfter(args, "--category"),
    json: args.includes("--json"),
    closed: args.includes("--closed"),
  };
}

function parseCheckArgs(args) {
  const categories = [...new Set(args.flatMap((arg, index) => arg === "--category" ?
    [valueAfter(args.slice(index), "--category")] : []))];
  const manifestOnly = args.includes("--manifest-only");
  const ids = args.filter((arg, index) => {
    if (arg.startsWith("--")) return false;
    if (args[index - 1] === "--category") return false;
    return true;
  });
  return {categories, ids, manifestOnly,
    marketingChecksInReact: args.includes("--marketing-checks-in-react"),
    deferVisualReport: args.includes("--defer-visual-report")};
}

function parseAffectedToolArgs(args) {
  const pathsValue = valueAfter(args, "--paths");
  return {
    base: valueAfter(args, "--base") ?? "origin/main",
    head: valueAfter(args, "--head") ?? "HEAD",
    commitWindow: args.includes("--commit-window"),
    paths: pathsValue == null ? null : pathsValue
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .sort(),
    json: args.includes("--json"),
    check: args.includes("--check"),
    full: args.includes("--full"),
    importOwners: valueAfter(args, "--import-owners"),
    mode: valueAfter(args, "--mode") ?? "pr",
    marketingChecksInReact: args.includes("--marketing-checks-in-react"),
    deferVisualReport: args.includes("--defer-visual-report"),
    githubOutput: valueAfter(args, "--github-output"),
  };
}

function valueAfter(args, flag) {
  const index = args.indexOf(flag);
  if (index === -1) return null;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value.`);
  }
  return value;
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function printHelp() {
  console.log(`Usage: node tool/run.mjs <command>

Commands:
  list [--category name] [--json] [--closed]
    --closed lists completed and retired tools with their date and reason instead.
  check [--category name] [--manifest-only] [tool-id ...]
    Repeat --category to validate several categories in one deduplicated run.
  affected-tools [--base ref [--head ref] [--commit-window] | --paths a,b] [--mode mode] [--full] [--json] [--check]
    [--github-output path] [--import-owners file]
  --import-owners reads node tool/impact/import_owners.mjs output so each check also owns the files it imports.
  CI check execution may add --marketing-checks-in-react only when its required
    aggregate owns the same-run React marketing lane.
  --defer-visual-report skips the report-only Storybook visual comparison, which
    CI runs in its nightly alone (#2426); every other check still runs.
  run <tool-id> [args...]

Examples:
  node tool/run.mjs list --category data
  node tool/run.mjs check --manifest-only
  node tool/run.mjs affected-tools --base origin/main --check
  node tool/run.mjs run demo:ops list-commands
`);
}
