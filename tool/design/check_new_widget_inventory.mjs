#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fromRepo, repoRoot} from "../lib/repo_paths.mjs";
import {componentAliasIndex, newWidgetPolicyIssues, normalizeSymbol} from "./component_concepts.mjs";
import {roleNounRedirectAdvice} from "./lib/component_naming.mjs";
import {isOwnedCompositionRenderer} from "./lib/owned_composition_renderers.mjs";
import {
  buildLineStarts,
  collectClassDeclarations,
  collectClassRanges,
  collectWidgetClasses,
  collectWidgetHelpers,
  requireResolvedMergeBase,
  resolveWidgetTypeNames,
  unresolvedInventoryItems,
} from "./lib/new_widget_inventory_declarations.mjs";
import {
  isGeneratedProductionWidgetDartPath,
  isWidgetInventoryPath,
  productionWidgetRoots,
} from "./lib/production_widget_roots.mjs";

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  console.log(`Usage:
  node tool/design/check_new_widget_inventory.mjs [--base <ref>] [--write <path>] [--json] [--check] [--no-write]

Compares production Dart sources against the merge base with origin/main by
default. Blocks new or moved private widget classes and Widget-returning helpers,
checks Widgetbook for every new or moved public widget, and requires shared
widgets to use the Catch* namespace and an exact source identity in the component
registry. New or moved feature UI also requires a feature-prefixed role name and
a canonical source-file suffix. The widget catalog is generated output, not an independent input.
The scan fails closed when its base ref is unavailable.
`);
  process.exit(0);
}

const explicitBaseRef = valueAfter("--base");
const baseRef = explicitBaseRef ?? defaultBaseRef();
const writePath = valueAfter("--write") ?? "build/reports/new_widget_inventory_scan.json";
const shouldCheck = args.includes("--check");
const shouldJson = args.includes("--json");
const shouldNoWrite = args.includes("--no-write");
const currentFiles = productionWidgetRoots.flatMap((root) =>
  fs.existsSync(fromRepo(root)) ? listCurrentDartFiles(fromRepo(root)) : [],
).filter(isWidgetInventoryPath).sort();
const baseInput = resolveBaseInput({
  ref: baseRef,
});
const baseSnapshot = scanSnapshot({
  files: baseInput.files,
  readFile: baseInput.readFile,
});
const currentSnapshot = scanSnapshot({
  label: "working tree",
  files: currentFiles,
  readFile: (file) => fs.readFileSync(fromRepo(file), "utf8"),
});
const widgetbookNames = readWidgetbookNames();
const componentIdentities = readComponentIdentities();
const registryDocument = JSON.parse(
  fs.readFileSync(fromRepo("design/components/catch.components.json"), "utf8"),
);
const aliasIndex = componentAliasIndex(registryDocument.components ?? []);
const roleNounRedirects = registryDocument.roleNounRedirects ?? {};

const newWidgetClassCandidates = currentSnapshot.widgetClasses.filter(
  (entry) => !baseSnapshot.widgetClassKeys.has(widgetClassKey(entry)),
);
const movedWidgets = newWidgetClassCandidates
  .filter((entry) => isMovedWidgetClass(entry, baseSnapshot, currentSnapshot))
  .map((entry) => classifyWidget(withMoveMetadata(
    entry,
    baseSnapshot.widgetClassIdentityToKeys,
    widgetClassIdentityKey,
  )))
  .sort(compareByFileLine);
const addedWidgets = newWidgetClassCandidates
  .filter((entry) => !isMovedWidgetClass(entry, baseSnapshot, currentSnapshot))
  .map((entry) => classifyWidget(entry))
  .sort(compareByFileLine);

const newWidgetHelperCandidates = currentSnapshot.widgetHelpers.filter(
  (entry) => !baseSnapshot.widgetHelperKeys.has(widgetHelperKey(entry)),
);
const movedWidgetHelpers = newWidgetHelperCandidates
  .filter((entry) => isMovedWidgetHelper(entry, baseSnapshot, currentSnapshot))
  .map((entry) => classifyWidgetHelper(withMoveMetadata(
    entry,
    baseSnapshot.widgetHelperIdentityToKeys,
    widgetHelperIdentityKey,
  )))
  .sort(compareByFileLine);
const addedWidgetHelpers = newWidgetHelperCandidates
  .filter((entry) => !isMovedWidgetHelper(entry, baseSnapshot, currentSnapshot))
  .map(classifyWidgetHelper)
  .sort(compareByFileLine);

const summary = summarize({
  addedWidgets,
  addedWidgetHelpers,
  movedWidgets,
  movedWidgetHelpers,
});
const report = {
  generatedAt: new Date().toISOString(),
  baseRef,
  baseStatus: baseInput.status,
  baseWarning: baseInput.warning,
  current: "working tree",
  sourceOfTruth: {
    widgetbook: "widgetbook/lib/main.directories.g.dart",
    registry: "design/components/catch.components.json",
    policy:
      "New or moved public widget classes need Widgetbook coverage and feature UI requires canonical role names/file suffixes; design-system homes also require a canonical Catch* name, lib/core/widgets and design-system widgets require exact source identity in the component registry, and no new widget may reuse a registered component's name or alias. New or moved private widget classes and Widget-returning helpers must be inlined/deleted, merged into an existing primitive, or promoted to public covered widgets. The catalog inventory is generated separately.",
  },
  summary,
  movedWidgets,
  movedWidgetHelpers,
  addedWidgets,
  addedWidgetHelpers,
};

if (!shouldNoWrite) {
  fs.writeFileSync(fromRepo(writePath), JSON.stringify(report, null, 2) + "\n");
}

if (shouldJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  printSummary(report, writePath);
}

if (shouldCheck && summary.unresolved > 0) {
  console.error(
    `New widget inventory check failed: ${summary.unresolved} unresolved new widget inventory item(s).`,
  );
  process.exit(1);
}

function scanSnapshot({files, readFile}) {
  const widgetClasses = [];
  const widgetHelpers = [];
  const sources = [];

  for (const file of files) {
    if (shouldSkip(file)) continue;
    const source = readFile(file);
    const library = dartLibraryFor(file, source);
    const lineStarts = buildLineStarts(source);
    const classRanges = collectClassRanges(source, lineStarts);
    sources.push({file, source, library, lineStarts, classRanges});
  }

  const widgetTypeNames = resolveWidgetTypeNames(
    sources.flatMap(({source, lineStarts}) =>
      collectClassDeclarations(source, lineStarts),
    ),
  );
  for (const {file, source, library, lineStarts, classRanges} of sources) {
    for (const declaration of collectWidgetClasses(
      source,
      lineStarts,
      widgetTypeNames,
    )) {
      widgetClasses.push({...declaration, file, library});
    }

    for (const helper of collectWidgetHelpers(
      source,
      lineStarts,
      classRanges,
      widgetTypeNames,
    )) {
      const entry = {...helper, file, library};
      if (!isOwnedCompositionRenderer(entry)) widgetHelpers.push(entry);
    }
  }

  return {
    widgetClasses,
    widgetHelpers,
    widgetClassKeys: new Set(widgetClasses.map(widgetClassKey)),
    widgetHelperKeys: new Set(widgetHelpers.map(widgetHelperKey)),
    widgetClassIdentityToKeys: groupKeys(
      widgetClasses,
      widgetClassIdentityKey,
      widgetClassKey,
    ),
    widgetHelperIdentityToKeys: groupKeys(
      widgetHelpers,
      widgetHelperIdentityKey,
      widgetHelperKey,
    ),
  };
}

function dartLibraryFor(file, source) {
  const partOf = source.match(/^\s*part\s+of\s+'([^']+)'\s*;/mu);
  if (!partOf) return file;
  return path.posix.normalize(path.posix.join(path.posix.dirname(file), partOf[1]));
}

function classifyWidget(entry) {
  const widgetbookCovered = widgetbookNames.has(entry.name);
  const componentContracted = componentIdentities.has(`${entry.file}::${entry.name}`);
  const registeredOwner = aliasIndex.get(normalizeSymbol(entry.name)) ?? null;
  const issues = newWidgetPolicyIssues(entry, {
    widgetbookCovered,
    componentContracted,
    registeredOwner,
  });

  return {
    ...entry,
    widgetbookCovered,
    componentContracted,
    status: issues.length === 0 ? "covered" : "unresolved",
    issues,
    registeredOwner,
    recommendedAction: recommendationForWidget({...entry, registeredOwner}, issues),
  };
}

function classifyWidgetHelper(entry) {
  return {
    ...entry,
    status: "unresolved",
    issues: ["widget-returning-helper"],
    recommendedAction:
      "Inline into the owning build method when purely local, merge into an existing primitive when duplicated, or extract a public Widgetbook-covered widget when reusable.",
  };
}

function recommendationForWidget(entry, issues) {
  if (issues.includes("duplicate-of-registered-component")) {
    return `Use ${entry.registeredOwner.symbol} (${entry.registeredOwner.id}) instead; add a recipe or slot to it if it lacks something. A new name is not a new responsibility.`;
  }
  if (issues.includes("noncanonical-feature-widget-name")) {
    const advice = roleNounRedirectAdvice(entry.name, roleNounRedirects);
    return `Name the widget <Feature><RoleNoun> with a role noun from docs/app_architecture.md${advice ? ` (${advice})` : ""}.`;
  }
  if (issues.includes("private-widget-class")) {
    return "Inline/delete the private widget, merge it into an existing public primitive, or promote it to a public widget with Widgetbook coverage and a shared-component registry identity where required.";
  }
  if (issues.includes("missing-widgetbook")) {
    return "Add an exact-name Widgetbook component or merge/delete the redundant public widget.";
  }
  if (issues.includes("noncanonical-core-widget-name")) {
    return "Rename the core widget to the canonical Catch* namespace or merge it into the existing concept owner.";
  }
  if (issues.includes("missing-component-contract")) {
    return "Register the shared widget's exact symbol and source file as a canonical concept or governed member in design/components/catch.components.json.";
  }
  return "Covered by Widgetbook and the applicable shared-component registry contract.";
}

function summarize({
  addedWidgets,
  addedWidgetHelpers,
  movedWidgets,
  movedWidgetHelpers,
}) {
  const allWidgets = [...addedWidgets, ...movedWidgets];
  const allHelpers = [...addedWidgetHelpers, ...movedWidgetHelpers];
  const widgetsByStatus = countBy(allWidgets, (entry) => entry.status);
  const helpersByStatus = countBy(allHelpers, (entry) => entry.status);
  const allItems = [...allWidgets, ...allHelpers];
  const issues = countIssues(allItems);
  const unresolved = unresolvedInventoryItems({
    addedWidgets,
    addedWidgetHelpers,
    movedWidgets,
    movedWidgetHelpers,
  }).length;

  return {
    addedWidgetClasses: addedWidgets.length,
    addedPublicWidgetClasses: addedWidgets.filter((entry) => entry.visibility === "public").length,
    addedPrivateWidgetClasses: addedWidgets.filter((entry) => entry.visibility === "private").length,
    addedWidgetReturningHelpers: addedWidgetHelpers.length,
    movedWidgetClasses: movedWidgets.length,
    movedWidgetReturningHelpers: movedWidgetHelpers.length,
    coveredNewWidgets: addedWidgets.filter((entry) => entry.status === "covered").length,
    unresolved,
    widgetsByStatus,
    helpersByStatus,
    issues,
  };
}

function printSummary(report, outputPath) {
  const {summary} = report;
  console.log(`New widget inventory scan (${report.baseRef} -> working tree)`);
  console.log(`  Added widget classes: ${summary.addedWidgetClasses}`);
  console.log(`    public: ${summary.addedPublicWidgetClasses}`);
  console.log(`    private: ${summary.addedPrivateWidgetClasses}`);
  console.log(`    covered: ${summary.coveredNewWidgets}`);
  console.log(`  Added Widget-returning helpers: ${summary.addedWidgetReturningHelpers}`);
  console.log(`  Moved widget classes: ${summary.movedWidgetClasses}`);
  console.log(`  Moved Widget-returning helpers: ${summary.movedWidgetReturningHelpers}`);
  console.log(`  Unresolved items: ${summary.unresolved}`);
  console.log(`  Issues: ${JSON.stringify(summary.issues)}`);
  if (!shouldNoWrite) console.log(`Report written to: ${outputPath}`);

  const blockers = unresolvedInventoryItems(report);
  if (blockers.length === 0) return;

  console.log("");
  console.log("First unresolved items:");
  for (const item of blockers.slice(0, 25)) {
    const owner = item.owner ? `${item.owner}.` : "";
    console.log(
      `  ${item.file}:${item.line} ${owner}${item.name} [${item.issues.join(", ")}]`,
    );
  }
}

function resolveBaseInput({ref}) {
  const result = spawnGit(
    ["ls-tree", "-r", "--name-only", ref, "--", ...productionWidgetRoots],
    {allowFailure: true},
  );
  if (result.status === 0) {
    return {
      status: "git-ref",
      warning: null,
      files: dartFilesFromGitList(result.stdout),
      readFile: (file) => readGitFile(ref, file),
    };
  }

  console.error(
    `Base ref ${ref} is unavailable; refusing to run a vacuous new-widget check. ` +
      "Fetch the ref or pass an exact reachable commit with --base.\n" +
      (result.stderr || ""),
  );
  process.exit(64);
}

function dartFilesFromGitList(stdout) {
  return stdout
    .split("\n")
    .filter((file) => file.endsWith(".dart"))
    .sort();
}

function listCurrentDartFiles(root) {
  const rows = [];
  for (const entry of fs.readdirSync(root, {withFileTypes: true})) {
    const absolute = path.join(root, entry.name);
    if (entry.isDirectory()) {
      rows.push(...listCurrentDartFiles(absolute));
    } else if (entry.isFile() && entry.name.endsWith(".dart")) {
      rows.push(path.relative(repoRoot, absolute));
    }
  }
  return rows.sort();
}

function readGitFile(ref, file) {
  return spawnGit(["show", `${ref}:${file}`]);
}

function spawnGit(args, options = {}) {
  const result = spawnSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.status !== 0) {
    if (options.allowFailure) return result;
    console.error(result.stderr || `git ${args.join(" ")} failed`);
    process.exit(result.status ?? 1);
  }
  if (options.allowFailure) return result;
  return result.stdout;
}

function readWidgetbookNames() {
  const source = fs.readFileSync(fromRepo("widgetbook/lib/main.directories.g.dart"), "utf8");
  const names = new Set();
  for (const match of source.matchAll(/WidgetbookComponent\(\s*name:\s*'([^']+)'/gu)) {
    const name = match[1];
    names.add(name);
    names.add(name.replace(/<.*>$/u, ""));
  }
  return names;
}

function readComponentIdentities() {
  const components = JSON.parse(
    fs.readFileSync(fromRepo("design/components/catch.components.json"), "utf8"),
  ).components ?? [];
  const names = new Set();
  for (const component of components) {
    if (component.dart?.symbol && component.dart?.file) {
      names.add(`${component.dart.file}::${component.dart.symbol}`);
    }
    for (const member of component.contract?.members ?? []) {
      if (member.symbol) names.add(`${member.file ?? component.dart?.file}::${member.symbol}`);
    }
  }
  return names;
}

function shouldSkip(file) {
  return (
    isGeneratedProductionWidgetDartPath(file) ||
    file.includes("/design_fixtures/")
  );
}

function widgetClassKey(entry) {
  return `${entry.file}::${entry.name}::${entry.baseClass}`;
}

function widgetClassIdentityKey(entry) {
  return `${entry.name}::${entry.baseClass}`;
}

function widgetHelperKey(entry) {
  return `${entry.file}::${entry.owner ?? "<top-level>"}::${entry.name}`;
}

function widgetHelperIdentityKey(entry) {
  return `${entry.library}::${entry.name}`;
}

function isMovedWidgetClass(entry, baseSnapshot, currentSnapshot) {
  return isMovedByIdentity({
    entry,
    baseIdentityToKeys: baseSnapshot.widgetClassIdentityToKeys,
    currentKeys: currentSnapshot.widgetClassKeys,
    identityFor: widgetClassIdentityKey,
  });
}

function isMovedWidgetHelper(entry, baseSnapshot, currentSnapshot) {
  return isMovedByIdentity({
    entry,
    baseIdentityToKeys: baseSnapshot.widgetHelperIdentityToKeys,
    currentKeys: currentSnapshot.widgetHelperKeys,
    identityFor: widgetHelperIdentityKey,
  });
}

function isMovedByIdentity({entry, baseIdentityToKeys, currentKeys, identityFor}) {
  const baseKeys = baseIdentityToKeys.get(identityFor(entry));
  if (!baseKeys) return false;
  return baseKeys.some((key) => !currentKeys.has(key));
}

function withMoveMetadata(entry, baseIdentityToKeys, identityFor) {
  return {
    ...entry,
    previousKeys: baseIdentityToKeys.get(identityFor(entry)) ?? [],
  };
}

function groupKeys(values, identityFor, keyFor) {
  const grouped = new Map();
  for (const value of values) {
    const identity = identityFor(value);
    const rows = grouped.get(identity) ?? [];
    rows.push(keyFor(value));
    grouped.set(identity, rows);
  }
  return grouped;
}

function compareByFileLine(a, b) {
  return a.file.localeCompare(b.file) || a.line - b.line || a.name.localeCompare(b.name);
}

function countBy(values, keyFor) {
  const counts = {};
  for (const value of values) {
    const key = keyFor(value);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function countIssues(values) {
  const counts = {};
  for (const value of values) {
    for (const issue of value.issues ?? []) {
      counts[issue] = (counts[issue] ?? 0) + 1;
    }
  }
  return counts;
}

function valueAfter(flag) {
  const index = args.indexOf(flag);
  if (index === -1) return null;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    console.error(`${flag} requires a value`);
    process.exit(64);
  }
  return value;
}

function defaultBaseRef() {
  const result = spawnGit(["merge-base", "HEAD", "origin/main"], {
    allowFailure: true,
  });
  try {
    return requireResolvedMergeBase(result);
  } catch (error) {
    console.error(`${error.message}\n${result.stderr || ""}`);
    process.exit(64);
  }
}
