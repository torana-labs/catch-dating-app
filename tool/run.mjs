#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {repoRoot} from "./lib/repo_paths.mjs";
import {createRepositorySnapshot} from "./lib/repository_snapshot.mjs";
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
  uniqueToolChecks,
  validateToolCheckSafety,
  validateToolCiRequirements,
} from "./lib/tool_impact.mjs";

const manifestPath = "tool/tools_manifest.json";
const componentGraphPath = "tool/harness/component_graph.json";
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
  const manifest = repositorySnapshot().readJson(manifestPath, {required: true});
  if (!Array.isArray(manifest.tools)) {
    throw new Error("tools_manifest.json must contain a tools array.");
  }
  return manifest;
}

function listTools(args) {
  const {category, json} = parseListArgs(args);
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

async function checkTools(args) {
  const {categories, ids, manifestOnly, marketingChecksInReact, marketingCapturesImported, generatedInventoriesMaterialized} = parseCheckArgs(args);
  const manifest = loadManifest();
  const tools = categories.length === 0 ? selectTools(manifest, {ids}) :
    categories.flatMap((category) => selectTools(manifest, {category, ids}));
  const errors = validateManifest(manifest, loadComponentGraph());

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
  await runChecks(tools, {marketingChecksInReact, marketingCapturesImported, generatedInventoriesMaterialized});
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

function captureInputsRequired(tools, marketingChecksInReact) {
  const mediaConsumers = new Set([
    "marketing:app-screenshot-export", "marketing:app-media-sync",
    "marketing:website-build", "marketing:website-storybook",
    "marketing:website-storybook-a11y", "web:storybook-visuals",
  ]);
  return uniqueToolChecks(tools.filter(tool => toolSupportsPlatform(tool))).some(check =>
    mediaConsumers.has(check.toolId) &&
    !(marketingChecksInReact && reactOwnsMarketingCheck(check)) &&
    !check.command.startsWith("node --check ") &&
    !check.command.startsWith("node --test ") &&
    !check.command.startsWith("dart ") &&
    !check.command.includes("--self-test") &&
    !check.command.endsWith("run check:storybook-config"));
}

function importedCaptureOwnsCheck({toolId, command}) {
  return (toolId === "marketing:app-screenshot-export" &&
    ["node tool/marketing/export_app_screenshots.mjs --check",
      "node tool/marketing/export_app_screenshots.mjs --check-design-json"].includes(command)) ||
    (toolId === "marketing:app-media-sync" &&
      command === "node tool/marketing/sync_website_media.mjs --check");
}

function materializedInventoryOwnsCheck({toolId, command}) {
  return (toolId === "design:widget-catalog" && command === "node tool/design/generate_widget_catalog.mjs --check") ||
    (["ui-capture:route-inventory", "design:parity-gate"].includes(toolId) &&
      command === "node tool/ui_capture/check_route_inventory.mjs --check");
}

// Execute proof only in full consumer checkouts, like the registered checks
// below. Planning stays usable from its declared sparse module closure.
function verifyProducerCommand(script, flag) {
  const result = spawnSync(process.execPath, [script, flag], {cwd: repoRoot,
    encoding: "utf8", maxBuffer: 1024 * 1024});
  if (result.status !== 0) throw new Error(result.stderr?.trim() || result.error?.message ||
    `Producer verification failed: ${script}`);
}

async function runChecks(tools, {marketingChecksInReact = false, marketingCapturesImported = false,
  generatedInventoriesMaterialized = false} = {}) {
  if (marketingChecksInReact && process.env.GITHUB_ACTIONS !== "true") {
    console.error("--marketing-checks-in-react requires the same-run CI marketing lane.");
    process.exitCode = 64;
    return;
  }
  const verifyProducerProofs = async () => {
    if (marketingCapturesImported) {
      const binding = JSON.parse(process.env.CAPTURE_BINDING);
      const expected = {repository: "GITHUB_REPOSITORY", sourceSha: "GITHUB_SHA",
        runId: "GITHUB_RUN_ID", runAttempt: "GITHUB_RUN_ATTEMPT",
        workflowRef: "GITHUB_WORKFLOW_REF", workflowDefinitionSha: "GITHUB_WORKFLOW_SHA"};
      if (process.env.GITHUB_ACTIONS !== "true" || Object.entries(expected).some(([key, variable]) =>
        !process.env[variable] || binding[key] !== process.env[variable])) {
        throw new Error("Imported capture checks require this CI source, repository, workflow, run and attempt.");
      }
      verifyProducerCommand("tool/marketing/import_hosted_captures.mjs", "--verify-imported");
    }
    if (generatedInventoriesMaterialized) {
      verifyProducerCommand("tool/ci/generated_inventories.mjs", "--verify-materialized");
    }
  };
  try { await verifyProducerProofs(); } catch (error) {
    console.error(`Cannot reuse CI producer checks: ${error.message}`);
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
  for (const {toolId, command} of uniqueToolChecks(compatible)) {
    // CI's required aggregate owns the parallel React result. Match both the
    // tool and exact command: an altered check must execute until its new
    // equivalence is established. Standalone runs retain builds and browser gates.
    if (marketingChecksInReact && reactOwnsMarketingCheck({toolId, command})) {
      console.log(`==> ${toolId}: provided by the required same-run React marketing lane.`);
      continue;
    }
    if (marketingCapturesImported && importedCaptureOwnsCheck({toolId, command})) {
      console.log(`==> ${toolId}: provided by the verified exact-source capture artifact.`);
      continue;
    }
    if (generatedInventoriesMaterialized && materializedInventoryOwnsCheck({toolId, command})) {
      console.log(`==> ${toolId}: provided by verified exact-source inventory generation.`);
      continue;
    }
    console.log(`==> ${toolId}: ${command}`);
    const result = spawnSync(command, {
      cwd: repoRoot,
      shell: true,
      stdio: "inherit",
    });
    if (result.status !== 0) {
      process.exitCode = result.status ?? 1;
      return;
    }
  }
  // Selected checks must not invalidate evidence reused by this invocation.
  try { await verifyProducerProofs(); } catch (error) {
    console.error(`CI producer checks were invalidated: ${error.message}`);
    process.exitCode = 1;
    return;
  }
  console.log("Tool checks passed.");
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
  const committedOnly = options.check && options.generatedInventoriesMaterialized;
  if (committedOnly) {
    // Setup was planned before these generated outputs were materialized. Prove
    // that authored inputs still match the commit before reusing that same diff;
    // otherwise local output edits can select checks whose setup never ran.
    try {
      verifyProducerCommand("tool/ci/generated_inventories.mjs", "--verify-materialized");
    } catch (error) {
      console.error(`Cannot reuse CI producer checks: ${error.message}`);
      process.exitCode = 1;
      return;
    }
  }
  const changedPaths = options.paths ?? changedPathsSince({...options, committedOnly});
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
  const captureRequired = captureInputsRequired(
    plan.mode === "full" ? selectTools(manifest) : tools, options.marketingChecksInReact);
  const githubOutputs = () => `${formatAffectedToolGithubOutputs(plan)}capture_required=${captureRequired}\n`;
  if (!options.check) {
    fs.appendFileSync(
      options.githubOutput,
      githubOutputs(),
      "utf8",
    );
    return;
  }
  if (options.githubOutput) {
    fs.appendFileSync(
      options.githubOutput,
      githubOutputs(),
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
    marketingCapturesImported: options.marketingCapturesImported,
    generatedInventoriesMaterialized: options.generatedInventoriesMaterialized});
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
    for (const error of validateToolCiRequirements(tool)) {
      errors.push(`${tool.id ?? "<missing>"}: ${error}`);
    }
    for (const error of validateToolCheckSafety(tool)) {
      errors.push(`${tool.id ?? "<missing>"}: ${error}`);
    }
    if (tool.status === "active" && !hasExecutableChecks(tool)) {
      errors.push(`${tool.id ?? "<missing>"} is active but defines no checks.`);
    }
    if (tool.id && ids.has(tool.id)) errors.push(`Duplicate tool id: ${tool.id}`);
    if (tool.id) ids.add(tool.id);
    if (tool.path) {
      paths.add(tool.path);
      if (!repositorySnapshot().exists(tool.path)) {
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
  const result = spawnSync("git", ["show", `${ref}:tool/tools_manifest.json`],
    {cwd: repoRoot, encoding: "utf8", maxBuffer: 16 * 1024 * 1024});
  return result.status === 0 ? JSON.parse(result.stdout) : null;
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
    marketingCapturesImported: args.includes("--marketing-captures-imported"),
    generatedInventoriesMaterialized: args.includes("--generated-inventories-materialized")};
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
    marketingCapturesImported: args.includes("--marketing-captures-imported"),
    generatedInventoriesMaterialized: args.includes("--generated-inventories-materialized"),
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
  list [--category name] [--json]
  check [--category name] [--manifest-only] [tool-id ...]
    Repeat --category to validate several categories in one deduplicated run.
  affected-tools [--base ref [--head ref] [--commit-window] | --paths a,b] [--mode mode] [--full] [--json] [--check]
    [--github-output path] [--import-owners file]
  --import-owners reads node tool/impact/import_owners.mjs output so each check also owns the files it imports.
  CI check execution may add --marketing-checks-in-react only when its required
    aggregate owns the same-run React marketing lane.
  --marketing-captures-imported verifies CAPTURE_BINDING and all imported bytes
    for this CI source/run/attempt before reusing the three freshness checks.
  --generated-inventories-materialized verifies this job's source-bound receipt
    and current output bytes before reusing route/catalog drift checks.
  run <tool-id> [args...]

Examples:
  node tool/run.mjs list --category data
  node tool/run.mjs check --manifest-only
  node tool/run.mjs affected-tools --base origin/main --check
  node tool/run.mjs run demo:ops list-commands
`);
}
