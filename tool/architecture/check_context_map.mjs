#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {fromRepo} from "../lib/repo_paths.mjs";
import {createRepositorySnapshot} from "../lib/repository_snapshot.mjs";
import {scanDartSource} from "../lib/dart_source.mjs";

const contextMapPath = "tool/architecture/context_map.json";
const defaultBaselinePath = "tool/architecture/context_map_baseline.json";
const specPath = "docs/app_architecture.md";
const specHeading = "## Bounded Context Contract";
const appPackage = "package:catch_dating_app/";

// Lower rank may be imported by higher rank. Contexts are additionally ordered
// among themselves by their declaration order in the map.
const layerRank = {kernel: 0, platform: 1, context: 2, pages: 3, app: 4};
const hardGateRules = new Set([
  "contextBarrelBypass",
  "specOutOfSync",
  "unknownContext",
  "unmappedFile",
]);

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
      throw new Error(`Context map root ${root} must be a lib/ folder ending in /.`);
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
    if (entry.context == null && !(entry.layer in layerRank)) {
      throw new Error(`${entry.path} needs a declared context or layer.`);
    }
    legacy.push(entry);
  }
  legacy.sort((a, b) => b.path.length - a.path.length);
  return {roots, contexts, contextRank, legacy};
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

export function scanContextMap({snapshot, baseline = emptyBaseline()}) {
  if (
    snapshot == null ||
    typeof snapshot.listFiles !== "function" ||
    typeof snapshot.readTexts !== "function"
  ) {
    throw new Error("Context map check requires a repository snapshot.");
  }
  const files = collectDartFiles(snapshot);
  if (files.length === 0) {
    throw new Error("Context map check cannot pass without handwritten lib Dart files.");
  }
  const sources = snapshot.readTexts([...files, contextMapPath, specPath]);
  const mapSource = sources.get(contextMapPath);
  if (mapSource == null) {
    throw new Error(`Required repository path is missing: ${contextMapPath}`);
  }
  const map = loadContextMap(mapSource);

  const allFindings = [];
  for (const file of files) {
    const source = sources.get(file);
    if (source == null) {
      throw new Error(`Required repository path is missing: ${file}`);
    }
    allFindings.push(...scanFile({relativePath: file, source, map}));
  }
  allFindings.push(...checkSpecTable({source: sources.get(specPath), map}));

  const baselineKeys = new Set((baseline.allowedFindings ?? []).map(findingKey));
  const findings = [];
  const baselineFindings = [];
  for (const finding of allFindings) {
    if (isAllowedDebt(finding, map) && baselineKeys.has(findingKey(finding))) {
      baselineFindings.push(finding);
    } else {
      findings.push(finding);
    }
  }
  const liveKeys = new Set(allFindings.map(findingKey));
  for (const allowance of baseline.allowedFindings ?? []) {
    if (liveKeys.has(findingKey(allowance))) continue;
    findings.push({
      rule: "staleBaselineAllowance",
      path: allowance.path,
      reason: `Remove obsolete baseline allowance: ${findingKey(allowance)}`,
    });
  }

  return {
    checkedFiles: files.length,
    baselinePath: baseline.path ?? null,
    findings,
    baselineFindings,
    allFindings,
    summary: {
      newFindingsByRule: countByRule(findings),
      baselineFindingsByRule: countByRule(baselineFindings),
    },
  };
}

export function scanFile({relativePath, source, map}) {
  const from = placePath(relativePath, map);
  if (from == null) {
    return [{
      rule: "unmappedFile",
      path: relativePath,
      line: 1,
      reason: `place this file under a target root or add its folder to ${contextMapPath}`,
    }];
  }
  if (from.layer === "context" && !map.contextRank.has(from.context)) {
    return [{
      rule: "unknownContext",
      path: relativePath,
      line: 1,
      reason: `${from.context} is not a context declared in ${contextMapPath}`,
    }];
  }
  if (from.layer === "app") return [];

  const findings = [];
  for (const {uri, line} of directiveUris(source)) {
    const target = resolveLibPath(relativePath, uri);
    if (target == null) continue;
    const to = placePath(target, map);
    if (to == null) continue;
    if (isOwnLegacyBarrelExport({relativePath, target, from, to})) continue;
    const finding = classifyImport({from, to, target, map});
    if (finding == null) continue;
    findings.push({...finding, path: relativePath, import: uri, line});
  }
  return findings;
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

function classifyImport({from, to, target, map}) {
  if (layerRank[to.layer] > layerRank[from.layer]) {
    return {
      rule: "upwardLayerImport",
      reason: `${describe(from)} must not import ${describe(to)}`,
    };
  }
  if (from.layer !== "context" || to.layer !== "context") return null;
  if (from.context === to.context) return null;
  const fromRank = map.contextRank.get(from.context);
  const toRank = map.contextRank.get(to.context);
  if (toRank == null) return null;
  if (toRank > fromRank) {
    return {
      rule: "contextOrderImport",
      reason: `${from.context} is declared before ${to.context}, so it must not depend on it; combine them in the screen's view model or move the shared value down`,
    };
  }
  if (!from.legacy && !to.legacy) {
    const barrel = `${map.roots.contexts}${to.context}/${to.context}.dart`;
    if (target !== barrel) {
      return {
        rule: "contextBarrelBypass",
        reason: `import ${to.context} through its public API ${barrel}`,
      };
    }
  }
  return null;
}

// New roots carry no debt: only legacy-placed files may be baselined.
function isAllowedDebt(finding, map) {
  if (hardGateRules.has(finding.rule)) return false;
  const from = placePath(finding.path, map);
  return from?.legacy === true;
}

// Legacy feature barrels re-export their own screens until they are split.
function isOwnLegacyBarrelExport({relativePath, target, from, to}) {
  if (!from.legacy || to.layer !== "app") return false;
  const match = /^lib\/([^/]+)\/([^/]+)\.dart$/u.exec(relativePath);
  if (match == null || match[1] !== match[2]) return false;
  return target.startsWith(`lib/${match[1]}/`);
}

function describe(place) {
  if (place.layer === "context") return `the ${place.context} context`;
  return place.layer === "app" ? "app screens" : `the ${place.layer} layer`;
}

function directiveUris(source) {
  const uris = [];
  for (const directive of scanDartSource(source).imports) {
    for (const {uri, offset} of directive.uris) {
      uris.push({uri, line: lineForOffset(source, offset)});
    }
  }
  for (const match of source.matchAll(/^export\s+['"]([^'"]+)['"]/gmu)) {
    uris.push({uri: match[1], line: lineForOffset(source, match.index ?? 0)});
  }
  return uris;
}

function resolveLibPath(relativePath, uri) {
  if (uri.startsWith(appPackage)) return `lib/${uri.slice(appPackage.length)}`;
  if (/^[A-Za-z][A-Za-z0-9+.-]*:/u.test(uri)) return null;
  const url = new URL(uri, new URL(relativePath, "file:///"));
  const resolved = path.posix.normalize(decodeURIComponent(url.pathname));
  return resolved.startsWith("/lib/") ? resolved.slice(1) : null;
}

function collectDartFiles(snapshot) {
  return snapshot
    .listFiles({prefix: "lib/"})
    .filter((file) => file.endsWith(".dart"))
    .filter((file) => !file.endsWith(".g.dart"))
    .filter((file) => !file.endsWith(".freezed.dart"))
    .sort((a, b) => a.localeCompare(b));
}

function findingKey(finding) {
  return finding.import == null
    ? `${finding.rule}|${finding.path}`
    : `${finding.rule}|${finding.path}|${finding.import}`;
}

function countByRule(findings) {
  const counts = {};
  for (const finding of findings) {
    counts[finding.rule] = (counts[finding.rule] ?? 0) + 1;
  }
  return counts;
}

function lineForOffset(source, offset) {
  let line = 1;
  for (let index = 0; index < offset; index += 1) {
    if (source.charCodeAt(index) === 10) line += 1;
  }
  return line;
}

function baselineFromFindings(findings, map) {
  return {
    owner: "app_architecture",
    doc: "docs/app_architecture.md#bounded-context-contract",
    version: 1,
    updated: new Date().toISOString().slice(0, 10),
    description:
      "Imports in legacy folders that break the bounded-context order. Each move into lib/contexts/ removes its entries; normal runs fail on new findings and on obsolete allowances.",
    allowedFindings: findings
      .filter((finding) => isAllowedDebt(finding, map))
      .map(({rule, path: findingPath, import: uri}) => ({
        rule,
        path: findingPath,
        import: uri,
      }))
      .sort((a, b) => findingKey(a).localeCompare(findingKey(b))),
  };
}

function readBaseline(snapshot, relativePath) {
  const source = snapshot.readText(relativePath);
  if (source == null) return emptyBaseline(relativePath);
  try {
    return {...JSON.parse(source), path: relativePath};
  } catch (error) {
    throw new Error(`Failed to parse ${relativePath}: ${error.message}`);
  }
}

function emptyBaseline(relativePath = null) {
  return {path: relativePath, allowedFindings: []};
}

function parseArgs(rawArgs) {
  const parsed = {help: false, json: false, root: null, writeBaseline: false};
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (arg === "--help" || arg === "-h") {
      parsed.help = true;
    } else if (arg === "--json") {
      parsed.json = true;
    } else if (arg === "--write-baseline") {
      parsed.writeBaseline = true;
    } else if (arg === "--root") {
      const value = rawArgs[(index += 1)];
      if (value == null || value.startsWith("--")) {
        console.error(`Missing value for ${arg}`);
        process.exit(2);
      }
      parsed.root = path.resolve(value);
    } else {
      console.error(`Unknown argument: ${arg}`);
      process.exit(2);
    }
  }
  return parsed;
}

function printHelp() {
  console.log(`Usage:
  node tool/architecture/check_context_map.mjs
  node tool/architecture/check_context_map.mjs --json
  node tool/architecture/check_context_map.mjs --write-baseline

Places every handwritten lib/**/*.dart file with ${contextMapPath} and checks:
- every file is placed (a new top-level folder must be declared);
- layers import only downward: kernel, platform, contexts, pages, app;
- a context imports only contexts declared before it;
- files under lib/contexts/ cross contexts only through the public API file
  lib/contexts/<name>/<name>.dart.
- the context table in ${specPath} matches the map.

Legacy UI under presentation/ and shared/ counts as app composition. Debt in
legacy folders ratchets in ${defaultBaselinePath}; files under the target
roots (lib/contexts, lib/pages, lib/kernel, lib/platform) cannot be baselined.`);
}

function printFindings(result) {
  console.error(
    `Context map check failed (${result.findings.length} new finding(s); ${result.baselineFindings.length} baseline finding(s) acknowledged).`,
  );
  for (const finding of result.findings) {
    console.error(`- ${finding.path}: ${finding.reason}`);
    const detail = finding.import == null ? "" : `: ${finding.import}`;
    console.error(`  ${finding.line == null ? "" : `L${finding.line} `}${finding.rule}${detail}`);
  }
}

function runCli() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    process.exit(0);
  }
  const snapshot = createRepositorySnapshot({root: args.root ?? fromRepo()});
  const baseline = args.writeBaseline
    ? emptyBaseline()
    : readBaseline(snapshot, defaultBaselinePath);
  const result = scanContextMap({snapshot, baseline});

  if (args.writeBaseline) {
    const map = loadContextMap(snapshot.readText(contextMapPath));
    const nextBaseline = baselineFromFindings(result.allFindings, map);
    const blocking = result.allFindings.filter((finding) => !isAllowedDebt(finding, map));
    const target = path.join(snapshot.root, defaultBaselinePath);
    fs.writeFileSync(target, `${JSON.stringify(nextBaseline, null, 2)}\n`);
    console.log(
      `Wrote context map baseline with ${nextBaseline.allowedFindings.length} finding(s): ${defaultBaselinePath}`,
    );
    if (blocking.length > 0) {
      printFindings({findings: blocking, baselineFindings: []});
      process.exit(1);
    }
    return;
  }

  if (args.json) console.log(JSON.stringify(result, null, 2));
  if (result.findings.length > 0) {
    if (!args.json) printFindings(result);
    process.exit(1);
  }
  if (!args.json) {
    console.log(
      `Context map check passed (${result.checkedFiles} lib Dart files placed; ${result.baselineFindings.length} baseline finding(s) acknowledged).`,
    );
  }
}
