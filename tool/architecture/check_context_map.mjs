#!/usr/bin/env node
import path from "node:path";
import {fileURLToPath} from "node:url";
import {fromRepo} from "../lib/repo_paths.mjs";
import {createRepositorySnapshot} from "../lib/repository_snapshot.mjs";

const contextMapPath = "tool/architecture/context_map.json";
const specPath = "docs/app_architecture.md";
const specHeading = "## Bounded Context Contract";

const declaredLayers = new Set(["kernel", "platform", "context", "pages", "app"]);

const isCliEntrypoint =
  process.argv[1] != null &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCliEntrypoint) runCli();

export function loadContextMap(source) {
  let map;
  try {
    map = JSON.parse(source);
  } catch (error) {
    throw new Error(`Context map ${contextMapPath} is invalid: ${error.message}`);
  }
  const contexts = map.contexts ?? [];
  const contextRank = new Map();
  for (const [index, context] of contexts.entries()) {
    if (!/^[a-z][a-z_]*$/u.test(context?.id ?? "")) {
      throw new Error(`Context map has an invalid context id: ${context?.id}`);
    }
    if (contextRank.has(context.id)) {
      throw new Error(`Context map declares ${context.id} twice.`);
    }
    if (typeof context.owns !== "string" || context.owns.trim() === "") {
      throw new Error(`Context ${context.id} must say what it owns.`);
    }
    contextRank.set(context.id, index);
  }
  const roots = map.roots ?? {};
  for (const root of ["contexts", "pages", "kernel", "platform"]) {
    if (typeof roots[root] !== "string" || !roots[root].endsWith("/")) {
      throw new Error(`Context map root ${root} must be a folder ending in /.`);
    }
  }
  const legacy = [];
  const seen = new Set();
  for (const entry of map.legacy ?? []) {
    if (seen.has(entry.path)) {
      throw new Error(`Context map places ${entry.path} twice.`);
    }
    seen.add(entry.path);
    if (entry.context != null && !contextRank.has(entry.context)) {
      throw new Error(`${entry.path} names undeclared context ${entry.context}.`);
    }
    if (entry.context == null && !declaredLayers.has(entry.layer)) {
      throw new Error(`${entry.path} needs a declared context or layer.`);
    }
    checkMoveFields(entry);
    legacy.push(entry);
  }
  legacy.sort((a, b) => b.path.length - a.path.length);
  return {
    roots,
    contexts,
    contextRank,
    legacy,
    forbidLegacyContextFiles: map.forbidLegacyContextFiles === true,
  };
}

// A legacy entry may say where its files move ("moveTo") and which screen-move
// group moves them ("group"); move_screens.mjs plans and applies a group. A
// folder moves to a folder and a Dart file to a Dart file.
function checkMoveFields(entry) {
  const unknown = Object.keys(entry)
    .filter((key) => !["path", "context", "layer", "moveTo", "group"].includes(key));
  if (unknown.length > 0) {
    throw new Error(`${entry.path} has unknown field(s): ${unknown.join(", ")}.`);
  }
  if (entry.group != null) {
    if (typeof entry.group !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(entry.group)) {
      throw new Error(`${entry.path} needs a kebab-case group, not ${JSON.stringify(entry.group)}.`);
    }
    if (entry.moveTo == null) throw new Error(`${entry.path} has a group but no moveTo.`);
  }
  if (entry.moveTo == null) return;
  if (typeof entry.moveTo !== "string" || entry.moveTo === entry.path) {
    throw new Error(`${entry.path} needs a moveTo path that differs from its own.`);
  }
  const folder = entry.path.endsWith("/");
  if (!folder && !entry.path.endsWith(".dart")) {
    throw new Error(`${entry.path} must name a folder or a Dart file to carry a moveTo.`);
  }
  if (folder !== entry.moveTo.endsWith("/") || (!folder && !entry.moveTo.endsWith(".dart"))) {
    throw new Error(`${entry.path} must move to a ${folder ? "folder ending in /" : "Dart file"}, not ${entry.moveTo}.`);
  }
}

// Where a moveTo may point: an app package's lib/, a shared page, a
// context's actions/ or data/ folder, or the platform and test-support
// packages. Never the Widgetbook corpus sources lib/pages/startup/ and
// lib/contexts/*/parts/, which a mechanical move cannot enter without new
// golden baselines.
export function checkMoveTargets({map, files}) {
  const appPackages = new Set(files
    .map((file) => /^apps\/([^/]+)\/pubspec\.yaml$/u.exec(file)?.[1])
    .filter(Boolean));
  const findings = [];
  for (const entry of map.legacy) {
    if (entry.moveTo == null) continue;
    const reason = moveTargetProblem(entry.moveTo, map, appPackages);
    if (reason == null) continue;
    findings.push({
      rule: "moveToInvalid",
      path: contextMapPath,
      line: 1,
      reason: `${entry.path} moves to ${entry.moveTo}, but ${reason}`,
    });
  }
  return findings;
}

function moveTargetProblem(target, map, appPackages) {
  const app = /^apps\/([^/]+)\/lib\/./u.exec(target);
  if (app != null) {
    return appPackages.has(app[1]) ? null : `apps/${app[1]} has no pubspec.yaml`;
  }
  if (target.startsWith(map.roots.pages)) {
    if (target.startsWith(`${map.roots.pages}startup/`)) {
      return `${map.roots.pages}startup/ is a Widgetbook corpus source`;
    }
    return target.length > map.roots.pages.length ? null : "it names no page";
  }
  if (target.startsWith(map.roots.contexts)) {
    const [context, layer] = target.slice(map.roots.contexts.length).split("/");
    if (!map.contextRank.has(context)) return `${context} is not a declared context`;
    return ["actions", "data"].includes(layer)
      ? null
      : "a move into a context goes to its actions/ or data/ folder";
  }
  if (/^packages\/(?:platform|catch_test_support)\/lib\/./u.test(target)) return null;
  return "a moveTo must sit under apps/<app>/lib/, lib/pages/, " +
    "lib/contexts/<context>/(actions|data)/ or packages/(platform|catch_test_support)/lib/";
}

// Returns where a lib/ path sits: {layer, context, legacy}. Target roots win;
// otherwise the longest legacy prefix decides. Legacy UI (presentation/ and
// shared/ folders) is app composition until it is redrawn into apps/.
export function placePath(relativePath, map) {
  const {roots} = map;
  if (relativePath.startsWith(roots.contexts)) {
    const context = relativePath.slice(roots.contexts.length).split("/")[0];
    return {layer: "context", context, legacy: false};
  }
  for (const layer of ["pages", "kernel", "platform"]) {
    if (relativePath.startsWith(roots[layer])) {
      return {layer, context: null, legacy: false};
    }
  }
  const entry = map.legacy.find((candidate) =>
    relativePath.startsWith(candidate.path));
  if (entry == null) return null;
  if (entry.context == null) {
    return {layer: entry.layer, context: null, legacy: true};
  }
  const isLegacyUi = /\/(?:presentation|shared)\//u.test(relativePath);
  return {
    layer: isLegacyUi ? "app" : "context",
    context: entry.context,
    legacy: true,
  };
}

// The spec's context table must list the map's contexts, in order, with the
// same ownership sentence.
export function checkSpecTable({source, map}) {
  const finding = (reason) => [{rule: "specOutOfSync", path: specPath, line: 1, reason}];
  if (source == null) return finding(`${specPath} is missing`);
  const start = source.indexOf(`\n${specHeading}\n`);
  if (start < 0) return finding(`${specPath} has no "${specHeading}" section`);
  const end = source.indexOf("\n## ", start + specHeading.length + 2);
  const section = source.slice(start, end < 0 ? source.length : end);
  const rows = [...section.matchAll(/^\|\s*(\d+)\s*\|\s*`([a-z_]+)`\s*\|\s*(.+?)\s*\|\s*$/gmu)]
    .map((match) => `${match[1]} ${match[2]}: ${match[3]}`);
  const expected = [...map.contexts.entries()]
    .map(([index, context]) => `${index + 1} ${context.id}: ${context.owns}`);
  const missing = expected.filter((row) => !rows.includes(row));
  const extra = rows.filter((row) => !expected.includes(row));
  if (missing.length === 0 && extra.length === 0) return [];
  return finding(`the context table in "${specHeading}" disagrees with ${contextMapPath}; expected ${missing.join("; ") || "nothing"}; found extra ${extra.join("; ") || "nothing"}`);
}

// Every root and legacy entry must still place at least one tracked file. A
// folder that moved or was deleted leaves an entry that silently places
// nothing, so a stale map reads as a live one.
export function checkMappedPaths({map, files}) {
  const entries = [
    ...Object.entries(map.roots).map(([root, rootPath]) =>
      ({path: rootPath, label: `root ${root}`})),
    ...map.legacy.map((entry) => ({path: entry.path, label: "legacy entry"})),
  ];
  return entries
    .filter(({path: mappedPath}) =>
      !files.some((file) => file.startsWith(mappedPath)))
    .map(({path: mappedPath, label}) => ({
      rule: "mappedPathMissing",
      path: contextMapPath,
      line: 1,
      reason: `${label} ${mappedPath} matches no tracked file; remove it or ` +
        "point it at the folder's new home",
    }));
}

// What the analyzer cannot see from one file: that the map itself is well
// formed, that every path it places exists, that every moveTo is a valid
// destination, and that the spec agrees with it. Placement and import order are
// catch_arch_* lints in packages/catch_ui_lints.
export function scanContextMap({snapshot}) {
  if (snapshot == null || typeof snapshot.readTexts !== "function" ||
      !Array.isArray(snapshot.files)) {
    throw new Error("Context map check requires a repository snapshot.");
  }
  const sources = snapshot.readTexts([contextMapPath, specPath]);
  const mapSource = sources.get(contextMapPath);
  if (mapSource == null) {
    throw new Error(`Required repository path is missing: ${contextMapPath}`);
  }
  const map = loadContextMap(mapSource);
  return {
    contexts: map.contexts.length,
    findings: [
      ...checkMappedPaths({map, files: snapshot.files}),
      ...checkMoveTargets({map, files: snapshot.files}),
      ...checkSpecTable({source: sources.get(specPath), map}),
    ],
  };
}

function printHelp() {
  console.log(`Usage:
  node tool/architecture/check_context_map.mjs
  node tool/architecture/check_context_map.mjs --json

Checks that ${contextMapPath} is well formed, that every root and legacy
path in it still matches a tracked file, that every moveTo points where a
screen move may land, and that the context table in
${specPath} matches it. Where each file sits and which imports it may make are
catch_arch_* lints in packages/catch_ui_lints, which read the same map.`);
}

function runCli() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    return;
  }
  const unknown = args.find((arg) => arg !== "--json");
  if (unknown != null) {
    console.error(`Unknown argument: ${unknown}`);
    process.exit(2);
  }
  const result = scanContextMap({snapshot: createRepositorySnapshot({root: fromRepo()})});
  if (args.includes("--json")) console.log(JSON.stringify(result, null, 2));
  if (result.findings.length > 0) {
    if (!args.includes("--json")) {
      console.error(`Context map check failed (${result.findings.length} finding(s)).`);
      for (const finding of result.findings) {
        console.error(`- ${finding.path}: ${finding.reason}`);
      }
    }
    process.exit(1);
  }
  if (!args.includes("--json")) {
    console.log(`Context map check passed (${result.contexts} contexts agree with ${specPath}).`);
  }
}
