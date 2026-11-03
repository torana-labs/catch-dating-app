#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {execFileSync} from "node:child_process";
import {parseArgs} from "node:util";
import {fileURLToPath} from "node:url";

import {fromRepo, relativeToRepo} from "../lib/repo_paths.mjs";

const sourcePath = fromRepo(
  "design/features/host_feature_responsibilities.json",
);
const schemaPath = fromRepo(
  "design/features/host_feature_responsibilities.schema.json",
);
const shellManifestPath = fromRepo(
  "design/source_packs/host-v2/host-coverage-manifest.json",
);
const routeContractPath = fromRepo("packages/platform/lib/routing/route_contract.dart");
const expectedFeatureIds = ["today", "events", "audience", "inbox", "organizer"];
const generatedNotice =
  "<!-- GENERATED FROM design/features/host_feature_responsibilities.json. DO NOT EDIT. -->";
const isCli = process.argv[1] != null &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

export class HostFeatureResponsibilityError extends Error {
  constructor(errors) {
    super(errors.join("\n"));
    this.name = "HostFeatureResponsibilityError";
    this.errors = errors;
  }
}

if (isCli) {
  runCli().catch((error) => {
    if (error instanceof HostFeatureResponsibilityError) {
      console.error("Host feature responsibility generation failed:");
      for (const message of error.errors) console.error(`- ${message}`);
    } else {
      console.error(error instanceof Error ? error.stack : String(error));
    }
    process.exitCode = 1;
  });
}

async function runCli() {
  let options;
  try {
    options = parseHostDocumentationArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    printHelp();
    process.exitCode = 64;
    return;
  }
  const checkOnly = options.check;
  const summaryOnly = options.summary;

  const contract = readJson(sourcePath);
  // Impact must remain readable when a referenced file was deleted or renamed.
  // It needs only Node, Git, and the mapping so the existing CI planner can
  // report advice without installing dependencies or checking out product code.
  // Full schema/source validation remains owned by generation and --check.
  if (options.affected) {
    const feature = findFeature(contract.features, options.affected, false);
    const comparison = readDocumentationComparison(options.base);
    const previousFeature = comparison.previousContract?.features?.find(
      (candidate) => candidate.id === feature.id,
    );
    const report = hostDocumentationImpact({
      feature, previousFeature, changedPaths: comparison.changedPaths,
    });
    report.base = comparison.base;
    console.log(options.json ? JSON.stringify(report, null, 2) :
      renderDocumentationImpact(report));
    return;
  }

  const {default: Ajv2020} = await import("ajv/dist/2020.js");
  const schema = readJson(schemaPath);
  const validate = new Ajv2020({allErrors: true, strict: false}).compile(schema);
  if (!validate(contract)) {
    throw new HostFeatureResponsibilityError(
      (validate.errors ?? []).map(
        (error) =>
          `host_feature_responsibilities.json${error.instancePath || "/"}: ${error.message}`,
      ),
    );
  }

  if (options.explain) {
    const feature = findFeature(contract.features, options.explain);
    const errors = [];
    const guide = resolveHostFeatureGuide({
      feature, errors,
      pathExists: (repoPath) => fs.existsSync(fromRepo(repoPath)),
      readText: (repoPath) => fs.readFileSync(fromRepo(repoPath), "utf8"),
    });
    if (errors.length) throw new HostFeatureResponsibilityError(errors);
    const explanation = hostFeatureExplanation({...feature, guide}, options.question);
    console.log(options.json ? JSON.stringify(explanation, null, 2) :
      renderHostFeatureGuide({...feature, guide: explanation.guide}).join("\n"));
    return;
  }

  const resolved = validateAndResolveHostFeatureResponsibilities({
    contract,
    shellManifest: readJson(shellManifestPath),
    routes: parseDartRoutes(fs.readFileSync(routeContractPath, "utf8")),
    pathExists: (repoPath) => fs.existsSync(fromRepo(repoPath)),
    readText: (repoPath) => fs.readFileSync(fromRepo(repoPath), "utf8"),
  });
  const outputs = resolved.map((feature) => ({
    path: fromRepo(`${feature.targetRoot}/README.md`),
    content: renderHostFeatureReadme({contract, feature}),
  }));

  if (summaryOnly) {
    printSummary(resolved);
    return;
  }

  const stale = findStaleHostFeatureOutputs({
    outputs,
    readCurrent: (outputPath) =>
      fs.existsSync(outputPath) ? fs.readFileSync(outputPath, "utf8") : null,
  });
  if (checkOnly) {
    if (stale.length > 0) {
      console.error("Generated Host feature responsibility docs are stale:");
      for (const outputPath of stale) console.error(`- ${relativeToRepo(outputPath)}`);
      console.error("Run: node tool/design/build_host_feature_responsibilities.mjs");
      process.exitCode = 1;
      return;
    }
    printSummary(resolved);
    console.log("Generated Host feature responsibility docs are current.");
    return;
  }

  for (const output of outputs) {
    fs.mkdirSync(path.dirname(output.path), {recursive: true});
    fs.writeFileSync(output.path, output.content);
  }
  printSummary(resolved);
  console.log(`Generated ${outputs.length} Host feature responsibility docs.`);
}

export function parseDartRoutes(source) {
  const routes = new Map();
  const pattern = /^\s*([A-Za-z][A-Za-z0-9_]*)\(\s*'([^']+)'\s*,\s*AppRouteAudience\.([a-z]+)\s*[,)]/gmu;
  for (const match of source.matchAll(pattern)) {
    routes.set(match[1], {id: match[1], path: match[2], audience: match[3]});
  }
  return routes;
}

export function validateAndResolveHostFeatureResponsibilities({
  contract,
  shellManifest,
  routes,
  pathExists,
  readText,
}) {
  const errors = [];
  const declaredIds = (contract.features ?? []).map((feature) => feature.id);
  if (JSON.stringify(declaredIds) !== JSON.stringify(expectedFeatureIds)) {
    errors.push(
      `feature order must be ${expectedFeatureIds.join(", ")}; found ${declaredIds.join(", ")}`,
    );
  }
  const shellRoutes = shellManifest?.primaryRoutes ?? [];
  if (shellRoutes.length !== expectedFeatureIds.length) {
    errors.push(`Host shell manifest must declare five primary routes, found ${shellRoutes.length}.`);
  }

  const ownedRouteIds = new Map();
  const resolved = [];
  for (const [index, feature] of (contract.features ?? []).entries()) {
    const label = `features.${feature.id}`;
    const shellRoute = shellRoutes[index];
    if (shellRoute?.destination !== feature.destination) {
      errors.push(
        `${label}: destination ${feature.destination} does not match shell position ${shellRoute?.destination ?? "missing"}.`,
      );
    }
    if (shellRoute?.routeId !== feature.primaryRouteId) {
      errors.push(
        `${label}: primary route ${feature.primaryRouteId} does not match shell route ${shellRoute?.routeId ?? "missing"}.`,
      );
    }
    if (feature.targetRoot !== `lib/hosts/${feature.id}`) {
      errors.push(`${label}: targetRoot must be lib/hosts/${feature.id}.`);
    }
    if (!feature.ownedRouteIds.includes(feature.primaryRouteId)) {
      errors.push(`${label}: ownedRouteIds must include primaryRouteId ${feature.primaryRouteId}.`);
    }

    const resolvedRoutes = [];
    for (const routeId of feature.ownedRouteIds) {
      const route = resolveRoute({routeId, routes, label, errors});
      if (route != null) resolvedRoutes.push(route);
      const previous = ownedRouteIds.get(routeId);
      if (previous != null) {
        errors.push(`${label}: route ${routeId} is already owned by ${previous}.`);
      } else {
        ownedRouteIds.set(routeId, feature.id);
      }
    }
    const handoffRoutes = feature.handoffRouteIds
      .map((routeId) => resolveRoute({routeId, routes, label, errors}))
      .filter((route) => route != null);
    const primaryRoute = routes.get(feature.primaryRouteId);
    if (primaryRoute != null && shellRoute?.path !== primaryRoute.path) {
      errors.push(
        `${label}: shell path ${shellRoute?.path} does not match route contract ${primaryRoute.path}.`,
      );
    }

    for (const currentRoot of feature.currentRoots) {
      if (!pathExists(currentRoot)) errors.push(`${label}: missing current root ${currentRoot}.`);
    }
    if (
      feature.migrationStatus === "verticalSlice" &&
      !feature.currentRoots.includes(feature.targetRoot)
    ) {
      errors.push(`${label}: verticalSlice must list ${feature.targetRoot} as a current root.`);
    }

    const codeOwners = [];
    const dataContracts = new Set(feature.additionalDataContracts);
    const seenOwnerIds = new Set();
    for (const owner of feature.additionalCodeOwners) {
      addCodeOwner({
        owner: {...owner, language: "dart"},
        label,
        errors,
        codeOwners,
        seenOwnerIds,
        pathExists,
        readText,
      });
    }
    for (const dataContract of dataContracts) {
      if (!pathExists(dataContract)) errors.push(`${label}: missing data contract ${dataContract}.`);
    }
    for (const dependency of feature.sharedDependencies) {
      if (!pathExists(dependency.path)) {
        errors.push(`${label}: missing shared dependency ${dependency.path}.`);
      }
    }
    for (const testFile of feature.testFiles) {
      if (!pathExists(testFile)) errors.push(`${label}: missing test file ${testFile}.`);
    }
    const guide = resolveHostFeatureGuide({feature, pathExists, readText, errors});

    resolved.push({
      ...feature,
      guide,
      label: shellRoute?.label ?? titleCase(feature.id),
      primaryRoute,
      routes: resolvedRoutes,
      handoffRoutes,
      codeOwners,
      dataContracts: [...dataContracts].sort(),
    });
  }

  if (errors.length > 0) throw new HostFeatureResponsibilityError(errors);
  return resolved;
}

function resolveRoute({routeId, routes, label, errors}) {
  const route = routes.get(routeId);
  if (route == null) {
    errors.push(`${label}: unknown route ${routeId}.`);
    return null;
  }
  if (route.audience !== "host") {
    errors.push(`${label}: route ${routeId} is not Host-owned.`);
  }
  return route;
}

function addCodeOwner({
  owner,
  label,
  errors,
  codeOwners,
  seenOwnerIds,
  pathExists,
  readText,
}) {
  if (seenOwnerIds.has(owner.id)) {
    errors.push(`${label}: duplicate code owner ${owner.id}.`);
    return;
  }
  seenOwnerIds.add(owner.id);
  if (!pathExists(owner.file)) {
    errors.push(`${label}: missing code owner path ${owner.file}.`);
    return;
  }
  const source = readText(owner.file);
  const symbolPattern = new RegExp(`\\b${escapeRegExp(owner.symbol)}\\b`, "u");
  if (!symbolPattern.test(source)) {
    errors.push(`${label}: symbol ${owner.symbol} is missing from ${owner.file}.`);
    return;
  }
  codeOwners.push(owner);
}

export function renderHostFeatureReadme({contract, feature}) {
  const lines = [
    generatedNotice,
    "",
    `# Host ${feature.label}`,
    "",
    feature.purpose,
    "",
    ...renderHostFeatureGuide(feature),
    "## Ownership",
    "",
    `- Primary route: \`${feature.primaryRoute.id}\` (\`${feature.primaryRoute.path}\`)`,
    `- Target root: \`${feature.targetRoot}\``,
    `- Migration status: ${migrationStatusLabel(feature.migrationStatus)}`,
    `- Responsibility contract updated: ${contract.updated}`,
    ...(feature.guide ? [`- Product guide updated: ${feature.guide.updated}`] : []),
    "",
    "Current implementation roots:",
    "",
    ...feature.currentRoots.map((repoPath) => `- \`${repoPath}\``),
    "",
    "## This feature owns",
    "",
    ...feature.responsibilities.map((responsibility) => `- ${responsibility}`),
    "",
    "## This feature does not own",
    "",
    ...feature.doesNotOwn.map((exclusion) => `- ${exclusion}`),
    "",
    "## Routes",
    "",
    "Owned routes:",
    "",
    ...feature.routes.map((route) => `- \`${route.id}\` — \`${route.path}\``),
    "",
    "Typed handoffs:",
    "",
    ...feature.handoffRoutes.map((route) => `- \`${route.id}\` — \`${route.path}\``),
    "",
    "## Key code owners",
    "",
    "| Owner | Source | Responsibility |",
    "|---|---|---|",
    ...feature.codeOwners.map(
      (owner) =>
        `| \`${owner.symbol}\` | \`${owner.file}\` | ${escapeTable(owner.role)} |`,
    ),
    "",
    "## Shared dependencies",
    "",
    ...feature.sharedDependencies.map(
      (dependency) => `- \`${dependency.path}\` — ${dependency.reason}`,
    ),
    "",
    "## Data contracts",
    "",
    ...feature.dataContracts.map((repoPath) => `- \`${repoPath}\``),
    "",
    "## Focused tests",
    "",
    ...feature.testFiles.map((repoPath) => `- \`${repoPath}\``),
    "",
    "## Maintenance",
    "",
    "Do not edit this file directly. Update " +
      "`design/features/host_feature_responsibilities.json`, then run:",
    "",
    "```sh",
    "node tool/design/build_host_feature_responsibilities.mjs",
    "node tool/design/build_host_feature_responsibilities.mjs --check",
    "```",
    "",
    "The generator cross-checks the Host shell order, typed route contract, " +
      "Dart symbols, data-contract paths, and focused tests.",
    ...renderGuideMaintenance(feature),
  ];
  return `${lines.join("\n")}\n`;
}

export function findStaleHostFeatureOutputs({outputs, readCurrent}) {
  return outputs
    .filter((output) => readCurrent(output.path) !== output.content)
    .map((output) => output.path);
}

export function parseHostDocumentationArgs(args) {
  const {values} = parseArgs({args, options: {
    check: {type: "boolean"}, summary: {type: "boolean"},
    explain: {type: "string"}, affected: {type: "string"},
    base: {type: "string"}, question: {type: "string"}, json: {type: "boolean"},
  }});
  for (const [name, value] of Object.entries(values)) {
    if (typeof value === "string" && value.trim() === "") {
      throw new Error(`--${name} must not be empty.`);
    }
  }
  if ([values.check, values.summary, values.explain, values.affected]
    .filter(Boolean).length > 1) throw new Error("Choose one documentation mode.");
  if (Boolean(values.affected) !== Boolean(values.base)) {
    throw new Error("--affected and --base must be supplied together.");
  }
  if (values.question && !values.explain) throw new Error("--question requires --explain.");
  if (values.json && !values.explain && !values.affected) {
    throw new Error("--json requires --explain or --affected.");
  }
  return values;
}

function findFeature(features, id, requireGuide = true) {
  const feature = features.find((candidate) => candidate.id === id);
  if (!feature) throw new Error(`Unknown Host feature: ${id}`);
  if (requireGuide && !feature.guide) throw new Error(`No product guide is declared for ${id}.`);
  return feature;
}

function validGuidePath(value) {
  return typeof value === "string" &&
    /^(lib|functions|contracts|test|tool|design)\//u.test(value) &&
    !value.split("/").some((part) => ["", ".", ".."].includes(part)) &&
    !/[\\\u0000-\u001f]/u.test(value);
}

export function readJsonPointer(value, pointer) {
  if (!pointer.startsWith("/") || /~(?![01])/u.test(pointer)) {
    throw new Error(`Invalid JSON pointer: ${pointer}`);
  }
  for (const encoded of pointer.slice(1).split("/")) {
    const key = encoded.replaceAll("~1", "/").replaceAll("~0", "~");
    if (value == null || !Object.hasOwn(value, key)) {
      throw new Error(`Missing JSON pointer: ${pointer}`);
    }
    value = value[key];
  }
  const scalar = (item) => item === null ||
    ["string", "number", "boolean"].includes(typeof item);
  if (!scalar(value) && !(Array.isArray(value) && value.every(scalar))) {
    throw new Error(`Reference fact must be a scalar or scalar array: ${pointer}`);
  }
  return value;
}

export function resolveHostFeatureGuide({feature, pathExists, readText, errors}) {
  if (!feature.guide) return undefined;
  const guide = feature.guide;
  const ids = new Set();
  const questions = new Set();
  const checkPath = (repoPath) => {
    if (!validGuidePath(repoPath)) {
      errors.push(`${feature.id}: invalid guide path ${repoPath}.`);
      return false;
    }
    if (!pathExists(repoPath)) {
      errors.push(`${feature.id}: missing guide source ${repoPath}.`);
      return false;
    }
    return true;
  };
  for (const section of guide.sections) {
    if (ids.has(section.id)) errors.push(`${feature.id}: duplicate guide section ${section.id}.`);
    ids.add(section.id);
    for (const question of [section.question, ...section.aliases]) {
      const normalized = question.trim().toLowerCase();
      if (!normalized || questions.has(normalized)) {
        errors.push(`${feature.id}: empty or duplicate guide question ${question}.`);
      }
      questions.add(normalized);
    }
    for (const source of section.sourcePaths) checkPath(source);
    for (const example of section.examples) {
      if (!checkPath(example.path)) continue;
      // This checks a named declaration, not its outcome or the prose's truth.
      const declaration = new RegExp(
        `\\b(?:test|testWidgets|it)\\s*\\(\\s*(["'])${escapeRegExp(example.testName)}\\1\\s*,`, "u",
      );
      if (!declaration.test(readText(example.path))) {
        errors.push(`${feature.id}.${section.id}: missing named example ${example.testName} in ${example.path}.`);
      }
    }
  }
  const facts = guide.facts.map((fact) => {
    if (ids.has(fact.id)) errors.push(`${feature.id}: duplicate guide fact ${fact.id}.`);
    ids.add(fact.id);
    if (!checkPath(fact.path)) return fact;
    try {
      return {...fact, value: readJsonPointer(JSON.parse(readText(fact.path)), fact.pointer)};
    } catch (error) {
      errors.push(`${feature.id}.${fact.id}: ${error.message}`);
      return fact;
    }
  });
  return {...guide, facts};
}

export function hostFeatureExplanation(feature, question) {
  const guide = feature.guide;
  const query = question?.trim().toLowerCase();
  const sections = query ? guide.sections.filter((section) =>
    [section.id, section.question, ...section.aliases].some((text) =>
      text.toLowerCase().includes(query))) : guide.sections;
  if (sections.length === 0) throw new Error(`No documented question matches: ${question}`);
  return {
    feature: feature.id,
    document: `${feature.targetRoot}/README.md`,
    evidence: "Authored explanation with checked references; examples are not executed by this command.",
    guide: {...guide, sections, facts: query ? [] : guide.facts},
  };
}

function guideLink(feature, repoPath, label = repoPath) {
  return `[${label}](${path.posix.relative(feature.targetRoot, repoPath)})`;
}

export function renderHostFeatureGuide(feature) {
  if (!feature.guide) return [];
  const {guide} = feature;
  const lines = ["## Product guide", "",
    "Authored explanations follow; the reference table is derived from schemas. " +
      "Source links and named example declarations are checked, but this generator " +
      "does not run the examples or establish deployment status.", ""];
  for (const section of guide.sections) {
    lines.push(`<a id="${section.id}"></a>`, "", `### ${section.question}`, "",
      section.answer, "");
  }
  if (guide.facts.length) {
    lines.push("### Schema reference", "", "| Declared constraint | Value | Source |",
      "|---|---|---|");
    for (const fact of guide.facts) {
      lines.push(`| ${escapeTable(fact.label)} | \`${escapeTable(JSON.stringify(fact.value))}\` | ` +
        `${guideLink(feature, fact.path, path.posix.basename(fact.path))} \`${fact.pointer}\` |`);
    }
    lines.push("", "These are schema declarations, not independent proof of runtime limits.", "");
  }
  lines.push("<details>", "<summary>Sources and named examples for each answer</summary>", "");
  for (const section of guide.sections) {
    lines.push(`**${section.question}**`, "",
      ...section.sourcePaths.map((source) => `- Source: ${guideLink(feature, source)}`),
      ...section.examples.map((example) =>
        `- Example: ${guideLink(feature, example.path)} — ${example.testName}`), "");
  }
  lines.push("</details>", "");
  return lines;
}

function renderGuideMaintenance(feature) {
  if (!feature.guide) return [];
  return ["", "Product answers live in this feature's `guide` in the same responsibility contract. " +
    "Edit that source, never the generated README. Update the guide date when its " +
    "explanation changes. To retrieve the guide or review change impact:", "", "```sh",
  `node tool/design/build_host_feature_responsibilities.mjs --explain ${feature.id}`,
  `node tool/design/build_host_feature_responsibilities.mjs --explain ${feature.id} --question membership --json`,
  `node tool/design/build_host_feature_responsibilities.mjs --affected ${feature.id} --base origin/main --json`,
  "node tool/run.mjs check design:host-feature-responsibilities audit:host-crm-boundaries",
  "```", "",
  "Impact is an explicit, read-only PR review command. It compares the base with " +
    "the tracked working tree plus untracked non-ignored files, using section dependencies " +
    "from both versions. It reports relevant changes even if a source or dependency " +
    "was removed. It does not traverse every import or certify unchanged prose. " +
    "The registered generator check blocks stale generated output and broken guide " +
    "references; prose impact remains advisory. Review each affected answer against " +
    "the change and update it, or explain why it remains accurate in the PR. " +
    "Run the linked behavior suites when their implementation changes. " +
    "No review stamps, generated history, or dependency snapshots are committed."];
}

export function hostDocumentationImpact({feature, previousFeature, changedPaths}) {
  const current = feature.guide?.sections ?? [];
  const previous = previousFeature?.guide?.sections ?? [];
  const ids = [...new Set([...current, ...previous].map((section) => section.id))];
  const sections = [];
  for (const id of ids) {
    const next = current.find((section) => section.id === id);
    const old = previous.find((section) => section.id === id);
    const dependencies = [...new Set([next, old].filter(Boolean).flatMap((section) =>
      [...section.sourcePaths, ...section.examples.map((example) => example.path)]))];
    const matches = [...new Set(changedPaths.filter((changed) => dependencies.some((dependency) =>
      changed === dependency || changed.startsWith(`${dependency}/`))))].sort();
    const explanationChanged = JSON.stringify(next) !== JSON.stringify(old);
    if (matches.length || explanationChanged) sections.push({
      id, question: (next ?? old).question,
      anchor: `${feature.targetRoot}/README.md#${id}`,
      status: next ? "review-needed" : "removed",
      changedSources: matches, explanationChanged,
    });
  }
  const facts = [...feature.guide?.facts ?? [], ...previousFeature?.guide?.facts ?? []];
  const referenceSources = [...new Set(facts.map((fact) => fact.path))];
  return {
    feature: feature.id, document: `${feature.targetRoot}/README.md`, advisory: true,
    coverage: "Explicit section sources and examples from both versions; no transitive import or semantic proof.",
    sections,
    changedReferenceSources: [...new Set(changedPaths.filter((item) => referenceSources.includes(item)))].sort(),
    referenceDefinitionChanged: JSON.stringify(feature.guide?.facts) !==
      JSON.stringify(previousFeature?.guide?.facts),
  };
}

export function readDocumentationComparison(base, root = fromRepo(".")) {
  const git = (args) => execFileSync("git", args, {
    cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 16 * 1024 * 1024,
  });
  const sha = git(["rev-parse", "--verify", "--end-of-options", `${base}^{commit}`]).trim();
  const contractPath = "design/features/host_feature_responsibilities.json";
  const previousContract = git(["ls-tree", "--name-only", sha, "--", contractPath]).trim() ?
    JSON.parse(git(["show", `${sha}:${contractPath}`])) : null;
  const changedPaths = [...new Set([
    ...git(["diff", "--name-only", "--no-renames", "-z", sha, "--"]).split("\0"),
    ...git(["ls-files", "--others", "--exclude-standard", "-z"]).split("\0"),
  ].filter(Boolean))].sort();
  return {base: sha, previousContract, changedPaths};
}

function renderDocumentationImpact(report) {
  return [`${report.feature}: advisory documentation impact against ${report.base}`,
    report.coverage,
    ...report.sections.map((section) =>
      `- ${section.anchor}: ${section.status}; ${section.changedSources.join(", ") || "explanation changed"}`),
    ...report.changedReferenceSources.map((source) => `- Regenerate schema reference: ${source}`),
    ...(report.referenceDefinitionChanged ? ["- Schema reference selection changed."] : []),
    ...(report.sections.length === 0 ? ["No affected explanations found in declared dependencies."] : []),
  ].join("\n");
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`Could not read ${relativeToRepo(filePath)}: ${error.message}`);
  }
}

function migrationStatusLabel(status) {
  return status === "verticalSlice"
    ? "implemented as a destination-owned vertical slice"
    : "target boundary defined; implementation still lives in listed legacy Host roots";
}

function escapeTable(value) {
  return value.replaceAll("|", "\\|").replaceAll("\n", " ");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function titleCase(value) {
  return `${value[0].toUpperCase()}${value.slice(1)}`;
}

function printSummary(features) {
  console.log(
    `Host feature responsibilities: ${features.map((feature) => feature.label).join(" · ")}`,
  );
  for (const feature of features) {
    console.log(
      `- ${feature.label}: ${feature.routes.length} owned route(s), ` +
        `${feature.codeOwners.length} code owner(s), ${feature.dataContracts.length} data contract(s)`,
    );
  }
}

function printHelp() {
  console.log(`Usage:
  node tool/design/build_host_feature_responsibilities.mjs
  node tool/design/build_host_feature_responsibilities.mjs --check
  node tool/design/build_host_feature_responsibilities.mjs --summary
  node tool/design/build_host_feature_responsibilities.mjs --explain audience [--question <text>] [--json]
  node tool/design/build_host_feature_responsibilities.mjs --affected audience --base <git-ref> [--json]

Validates the five ordered Host destination responsibilities against the shell,
route contract, Dart symbols, data contracts, and tests, then
generates one local README.md in each destination's target feature root.
Explain prints only the product guide and schema facts. Affected compares the
base commit with tracked working changes and untracked, non-ignored files.
Impact is advisory and covers explicit section dependencies at both versions;
it does not certify prose, execute linked examples, or verify deployment.`);
}
