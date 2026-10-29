#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {fromRepo} from "../lib/repo_paths.mjs";
import {createRepositorySnapshot} from "../lib/repository_snapshot.mjs";
import {scanDartSource} from "../lib/dart_source.mjs";

const defaultBaselinePath =
  "tool/architecture/dependency_direction_baseline.json";
const architectureRegistryPath =
  "tool/architecture/pattern_adoption.json";

const appSourcePattern = /^apps\/[^/]+\/lib\//u;

const hardGateRules = new Set([
  "barrelPresentationExport",
  "partsProviderCoupling",
  "untrackedStateAdapter",
]);

const allowedDomainPackages = new Set([
  "catch_dating_app",
  "collection",
  "freezed_annotation",
  "json_annotation",
  "meta",
  "pub_semver",
]);

const pluginPackages = new Set([
  "audioplayers",
  "connectivity_plus",
  "firebase_analytics",
  "firebase_app_check",
  "firebase_crashlytics",
  "firebase_messaging",
  "firebase_remote_config",
  "geolocator",
  "google_maps_flutter",
  "health",
  "image_picker",
  "mobile_scanner",
  "package_info_plus",
  "razorpay_flutter",
  "share_plus",
  "shared_preferences",
  "url_launcher",
]);

const isCliEntrypoint =
  process.argv[1] != null &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCliEntrypoint) runCli();

export function scanDependencyDirection({snapshot, baseline = emptyBaseline()}) {
  if (
    snapshot == null ||
    typeof snapshot.listFiles !== "function" ||
    typeof snapshot.readTexts !== "function"
  ) {
    throw new Error("Dependency direction requires a repository snapshot.");
  }

  const files = collectDartFiles(snapshot);
  if (files.length === 0) {
    throw new Error(
      "Dependency direction cannot pass without handwritten lib Dart files.",
    );
  }
  const sources = snapshot.readTexts([...files, architectureRegistryPath]);
  const allFindings = [];
  for (const file of files) {
    const source = sources.get(file);
    if (source == null) {
      throw new Error(`Required repository path is missing: ${file}`);
    }
    allFindings.push(...scanFile({relativePath: file, source}));
  }
  allFindings.push(...scanArchitectureRegistryFindings({
    files,
    source: sources.get(architectureRegistryPath),
  }));

  const baselineKeys = new Set(
    (baseline.allowedFindings ?? [])
      .filter((finding) => finding.rule !== "manualProviderDeclaration" || (
        typeof finding.symbol === "string" && typeof finding.operation === "string" &&
        typeof finding.rationale === "string" && finding.rationale.trim().length > 0 &&
        (finding.status === "accepted-exception" || (finding.status === "planned" &&
          typeof finding.debtId === "string" && finding.debtId.trim().length > 0))
      ))
      .map((finding) => findingKey(finding)),
  );
  const findings = [];
  const baselineFindings = [];
  for (const finding of allFindings) {
    if (isBaselineable(finding) && baselineKeys.has(findingKey(finding))) {
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
    summary: summarizeFindings({findings, baselineFindings}),
  };
}

export function scanFile({relativePath, source}) {
  const findings = [];
  const dart = scanDartSource(source);
  const addSourceFinding = ({rule, line, reason, symbol, operation}) => {
    const candidate = {rule, path: relativePath, line, reason,
      ...(symbol == null ? {} : {symbol}),
      ...(operation == null ? {} : {operation})};
    if (findings.some((finding) => findingKey(finding) === findingKey(candidate))) {
      return;
    }
    findings.push(candidate);
  };

  for (const {uri, offset} of dart.imports.flatMap((directive) => directive.uris)) {
    const targetUri = resolveAppImport(relativePath, uri);
    const line = lineForOffset(source, offset);
    if (isDomainFile(relativePath)) {
      if (!isAllowedDomainImport(targetUri)) {
        findings.push({
          rule: "domainFrameworkImport",
          path: relativePath,
          import: uri,
          line,
          reason:
            "domain files must import only dart SDK, app domain/core primitives, and approved pure Dart annotation/value packages",
        });
      }
    }

    if (isDataOrDomainFile(relativePath) && isFeaturePresentationImport(targetUri)) {
      findings.push({
        rule: "dataDomainPresentationImport",
        path: relativePath,
        import: uri,
        line,
        reason: "data/domain files must not import feature presentation code",
      });
    }

    const sourceFeature = presentationSourceFeature(relativePath);
    const targetFeature = featurePresentationImportTarget(targetUri);
    if (
      sourceFeature != null &&
      targetFeature != null &&
      targetFeature !== "core" &&
      targetFeature !== sourceFeature &&
      !isSanctionedCrossFeaturePresentationSeam({
        sourcePath: relativePath,
        targetImport: targetUri,
      })
    ) {
      findings.push({
        rule: "crossFeaturePresentationImport",
        path: relativePath,
        import: uri,
        line,
        reason:
          "feature presentation files must not import sibling feature presentation internals without a sanctioned seam",
      });
    }

    if (
      isPresentationFile(relativePath) &&
      !isControllerOrServiceFile(relativePath) &&
      !isActionsFile(relativePath) &&
      isPluginPackageImport(targetUri)
    ) {
      findings.push({
        rule: "presentationPluginImport",
        path: relativePath,
        import: uri,
        line,
        reason:
          "presentation widgets must route plugin/platform side effects through controllers or services",
      });
    }
  }

  if (isFeatureRootBarrel(relativePath)) {
    for (const match of source.matchAll(/^export\s+['"]([^'"]+)['"][^;]*;/gmu)) {
      const uri = match[1];
      if (!uri.includes("presentation/")) continue;
      const line = lineForOffset(source, match.index ?? 0);
      if (hasPublicApiAnnotation({source, line})) continue;
      findings.push({
        rule: "barrelPresentationExport",
        path: relativePath,
        import: uri,
        line,
        reason:
          "feature-root barrels may export presentation files only with a // public-api: annotation explaining the cross-feature seam",
      });
    }
  }

  if (isDomainFile(relativePath)) {
    const match = /\bDateTime\s*\.\s*now\s*\(/u.exec(dart.code);
    if (match) {
      findings.push({
        rule: "domainClockAccess",
        path: relativePath,
        line: lineForOffset(source, match.index),
        reason:
          "domain time predicates must accept an injected clock instead of calling DateTime.now() internally",
      });
    }
  }

  if (isDataFile(relativePath)) {
    for (const match of source.matchAll(/\.timeout\s*\(/gu)) {
      const line = lineForOffset(source, match.index ?? 0);
      if (hasStreamTimeoutOverride({source, line})) continue;
      findings.push({
        rule: "dataStreamTimeout",
        path: relativePath,
        line,
        reason:
          "realtime Firestore streams must not be idle-timed-out; annotate non-Firestore protocol deadlines with architecture:allow stream-timeout",
      });
      break;
    }
  }

  if (isPresentationFile(relativePath)) {
    const widgetRefLine = firstMatchingLine(source, (line) => {
      return /\bWidgetRef\s+\w+\s*[,)]/u.test(line) && !line.includes("Widget build(");
    });
    if (widgetRefLine != null) {
      addSourceFinding({
        rule: "widgetRefParameter",
        line: widgetRefLine,
        reason:
          "presentation helpers and constructors must not receive WidgetRef; lift provider reads to the route/controller boundary",
      });
    }

    if (!isControllerServiceOrViewModelFile(relativePath) && !isActionsFile(relativePath)) {
      const repositoryRead = /ref\.(?:watch|read|listen)\s*\(\s*[a-z]\w*[Rr]epositoryProvider\b/u.exec(
        source,
      );
      if (repositoryRead) {
        addSourceFinding({
          rule: "widgetRepositoryProviderRead",
          line: lineForOffset(source, repositoryRead.index),
          reason:
            "presentation widgets must not read repository providers directly; this name-based scanner catches *RepositoryProvider reads outside controllers, services, and view models",
        });
      }
    }

    if (isStateFile(relativePath) && stateFileHasProviderCoupling(source)) {
      addSourceFinding({
        rule: "stateFileProviderImport",
        line: lineForStateFileProviderCoupling(source),
        reason:
          "presentation *_state.dart files are provider-free display adapters by naming convention",
      });
    }

    if (isPartsFile(relativePath) && stateFileHasProviderCoupling(source)) {
      addSourceFinding({
        rule: "partsProviderCoupling",
        line: lineForStateFileProviderCoupling(source),
        reason:
          "context parts/ widgets bind values to catch_ui components and must not import Riverpod or read providers",
      });
    }

    if (isMisplacedStateClassFile(relativePath, source)) {
      addSourceFinding({
        rule: "misplacedStateClass",
        line: lineForMisplacedStateClass(source),
        reason:
          "provider-free display state classes with from/resolve factories should live in *_state.dart files and be tracker-visible",
      });
    }

    const screenCount = routeScreenClassCount(source);
    if (screenCount >= 2) {
      addSourceFinding({
        rule: "multiRouteScreenFile",
        line: lineForRouteScreenClass(source),
        reason:
          "presentation files should keep route-level screens findable; files declaring multiple route screens are split candidates",
      });
    }
  }

  if (isHandwrittenLibFile(relativePath)) {
    const keepAliveLine = firstKeepAliveLineWithoutMarker(source);
    if (keepAliveLine != null) {
      addSourceFinding({
        rule: "undocumentedKeepAlive",
        line: keepAliveLine,
        reason:
          "keepAlive providers must document lifecycle rationale with // keepalive: within the three lines above the annotation/declaration",
      });
    }

    if (!/^lib\/(?:core|platform)\//u.test(relativePath)) {
      for (const providerDeclaration of manualProviderDeclarationMatches(source)) {
        addSourceFinding({
          rule: "manualProviderDeclaration",
          line: lineForOffset(source, providerDeclaration.index),
          symbol: providerDeclaration[1],
          operation: providerDeclaration[2].replace(/\s+/gu, ""),
          reason:
            "handwritten providers outside core should use @riverpod codegen unless explicitly grandfathered",
        });
      }
    }
  }

  return findings;
}

function baselineFromFindings(findings) {
  return {
    owner: "app_architecture",
    targetPhase: "docs/plans/ui_system_blueprint_and_conformance_audit.md#phase-6--continuous-conformance-folds-into-existing-lanes",
    version: 1,
    updated: new Date().toISOString().slice(0, 10),
    description:
      "Current dependency-direction debt baseline. Normal scanner runs fail on findings not listed here.",
    allowedFindings: findings
      .filter(isBaselineable)
      .map(({rule, path: findingPath, import: uri, symbol, operation}) => {
        const finding = {rule, path: findingPath};
        if (uri != null) finding.import = uri;
        if (symbol != null) finding.symbol = symbol;
        if (operation != null) finding.operation = operation;
        return finding;
      })
      .sort((a, b) => findingKey(a).localeCompare(findingKey(b))),
  };
}

function summarizeFindings({findings, baselineFindings}) {
  return {
    newFindingsByRule: countByRule(findings),
    baselineFindingsByRule: countByRule(baselineFindings),
  };
}

function countByRule(findings) {
  const counts = {};
  for (const finding of findings) {
    counts[finding.rule] = (counts[finding.rule] ?? 0) + 1;
  }
  return counts;
}

function findingKey(finding) {
  if (finding.symbol != null || finding.operation != null) {
    return `${finding.rule}|${finding.path}|${finding.symbol ?? ""}|${finding.operation ?? ""}`;
  }
  return finding.import == null
    ? `${finding.rule}|${finding.path}`
    : `${finding.rule}|${finding.path}|${finding.import}`;
}

function collectDartFiles(snapshot) {
  return [
    ...snapshot.listFiles({prefix: "lib/"}),
    ...snapshot.listFiles({prefix: "apps/"}).filter((file) => appSourcePattern.test(file)),
  ]
    .filter((file) => file.endsWith(".dart"))
    .filter((file) => !file.endsWith(".g.dart"))
    .filter((file) => !file.endsWith(".freezed.dart"))
    .sort((a, b) => a.localeCompare(b));
}

// Places a source file for the layer rules. Legacy features use
// lib/<feature>/<layer>/; the bounded-context roots from the Bounded Context
// Contract use lib/contexts/<context>/<layer>/, lib/kernel/ (pure values, held
// to the domain rules), lib/platform/, lib/pages/<page>/ and app-package
// destinations apps/<app>/lib/<destination>/ (screens). App entrypoints at the
// app-package root are not placed.
export function placeSource(relativePath) {
  let match = /^lib\/contexts\/([^/]+)\/(domain|data|actions|parts)\/.+\.dart$/u.exec(relativePath);
  if (match) return {root: "context", owner: `contexts/${match[1]}`, layer: match[2]};
  if (/^lib\/kernel\/.+\.dart$/u.test(relativePath)) {
    return {root: "kernel", owner: "kernel", layer: "domain"};
  }
  if (/^lib\/platform\/.+\.dart$/u.test(relativePath)) {
    return {root: "platform", owner: "platform", layer: "platform"};
  }
  match = /^lib\/pages\/([^/]+)\/.+\.dart$/u.exec(relativePath);
  if (match) return {root: "pages", owner: `pages/${match[1]}`, layer: "presentation"};
  match = /^apps\/([^/]+)\/lib\/([^/]+)\/.+\.dart$/u.exec(relativePath);
  if (match) return {root: "app", owner: `apps/${match[1]}/${match[2]}`, layer: "presentation"};
  match = /^lib\/([^/]+)\/(domain|data|presentation)\/.+\.dart$/u.exec(relativePath);
  if (match) return {root: "legacy", owner: match[1], layer: match[2]};
  return null;
}

// Files under the bounded-context roots carry no debt: only legacy findings
// may be baselined, and hard-gate rules never are.
function isBaselineable(finding) {
  if (hardGateRules.has(finding.rule)) return false;
  const root = placeSource(finding.path ?? "")?.root;
  return root == null || root === "legacy";
}

function isDomainFile(relativePath) {
  return placeSource(relativePath)?.layer === "domain";
}

// Compare relative imports using the same app identity as package imports,
// while retaining the authored URI in findings and existing baseline keys.
function resolveAppImport(relativePath, uri) {
  if (/^[A-Za-z][A-Za-z0-9+.-]*:/u.test(uri)) return uri;
  const url = new URL(uri, new URL(relativePath, "file:///"));
  const resolved = path.posix.normalize(decodeURIComponent(url.pathname));
  return resolved.startsWith("/lib/")
    ? `package:catch_dating_app/${resolved.slice("/lib/".length)}`
    : uri;
}

function isDataOrDomainFile(relativePath) {
  return ["data", "domain"].includes(placeSource(relativePath)?.layer);
}

function isDataFile(relativePath) {
  return placeSource(relativePath)?.layer === "data";
}

function isPresentationFile(relativePath) {
  return ["presentation", "actions", "parts"].includes(
    placeSource(relativePath)?.layer,
  );
}

function isActionsFile(relativePath) {
  return placeSource(relativePath)?.layer === "actions";
}

function isPartsFile(relativePath) {
  return placeSource(relativePath)?.layer === "parts";
}

// Sibling-presentation seams apply between legacy features; the context map
// owns cross-context imports through each context's public API file.
function presentationSourceFeature(relativePath) {
  const place = placeSource(relativePath);
  return place?.root === "legacy" && place.layer === "presentation"
    ? place.owner
    : null;
}

function isSanctionedCrossFeaturePresentationSeam({sourcePath, targetImport}) {
  return (
    isScreenOrControllerFile(sourcePath) &&
    isPresentationControllerImport(targetImport)
  );
}

function isScreenOrControllerFile(relativePath) {
  return /(?:^|\/)[^/]+_(?:screen|controller)\.dart$/u.test(relativePath);
}

function isControllerOrServiceFile(relativePath) {
  return /(?:^|\/)[^/]+_(?:controller|service)\.dart$/u.test(relativePath);
}

function isControllerServiceOrViewModelFile(relativePath) {
  return /(?:^|\/)[^/]+_(?:controller|service|view_model)\.dart$/u.test(
    relativePath,
  );
}

function isPresentationControllerImport(uri) {
  return /^package:catch_dating_app\/[^/]+\/presentation\/.+_controller\.dart$/u.test(
    uri,
  );
}

function featurePresentationImportTarget(uri) {
  return (
    /^package:catch_dating_app\/([^/]+)\/presentation\//u.exec(uri)?.[1] ??
    null
  );
}

// Data and domain code must not reach up into screens, actions or parts.
function isFeaturePresentationImport(uri) {
  if (!uri.startsWith("package:catch_dating_app/")) return false;
  const target = `lib/${uri.slice("package:catch_dating_app/".length)}`;
  return isPresentationFile(target);
}

function scanArchitectureRegistryFindings({files, source}) {
  if (source == null) return [];
  let tracker;
  try {
    tracker = JSON.parse(source);
  } catch (error) {
    throw new Error(
      `Repository JSON ${architectureRegistryPath} is invalid: ${error.message}`,
    );
  }
  const registeredPaths = new Set();
  for (const pattern of tracker.patterns ?? []) {
    for (const collectionName of ["prototypeFiles", "adopters", "variants", "candidateQueue"]) {
      for (const entry of pattern[collectionName] ?? []) {
        if (typeof entry === "string") {
          registeredPaths.add(entry);
        } else if (entry?.path) {
          registeredPaths.add(entry.path);
        }
      }
    }
  }

  const findings = [];
  for (const file of files) {
    if (!isStateFile(file)) continue;
    if (registeredPaths.has(file)) continue;
    findings.push({
      rule: "untrackedStateAdapter",
      path: file,
      line: 1,
      reason:
        "presentation *_state.dart files must be registered in architecture_pattern_adoption.json so provider-free and migration obligations stay visible",
    });
  }
  return findings;
}

function isFeatureRootBarrel(relativePath) {
  const match = /^lib\/([^/]+)\/([^/]+)\.dart$/u.exec(relativePath);
  return match != null && match[1] === match[2];
}

function hasPublicApiAnnotation({source, line}) {
  const lines = source.split(/\r?\n/u);
  return [line - 1, line - 2].some((index) => {
    if (index < 0) return false;
    return /\/\/\s*public-api:\s*\S/u.test(lines[index]);
  });
}

function firstMatchingLine(source, predicate) {
  const lines = source.split(/\r?\n/u);
  for (let index = 0; index < lines.length; index += 1) {
    if (predicate(lines[index])) return index + 1;
  }
  return null;
}

function isStateFile(relativePath) {
  return placeSource(relativePath)?.layer === "presentation" &&
    relativePath.endsWith("_state.dart");
}

function stateFileHasProviderCoupling(source) {
  return (
    /^import\s+['"]package:(?:flutter_riverpod|hooks_riverpod|riverpod_annotation)\//mu.test(
      source,
    ) ||
    /\bProvider<|\bref\.(?:watch|read|listen)\b/u.test(source)
  );
}

function lineForStateFileProviderCoupling(source) {
  const match =
    /^import\s+['"]package:(?:flutter_riverpod|hooks_riverpod|riverpod_annotation)\//mu.exec(
      source,
    ) ?? /\bProvider<|\bref\.(?:watch|read|listen)\b/u.exec(source);
  return match == null ? 1 : lineForOffset(source, match.index);
}

function isMisplacedStateClassFile(relativePath, source) {
  if (isStateFile(relativePath)) return false;
  return lineForMisplacedStateClass(source) != null;
}

function lineForMisplacedStateClass(source) {
  for (const block of classBlocks(source)) {
    if (!/\w+(?:Screen)?State$/u.test(block.name)) continue;
    if (/\bfactory\s+\w+(?:Screen)?State\.(?:from|resolve)\s*\(/u.test(block.body)) {
      return lineForOffset(source, block.start);
    }
  }
  return null;
}

function routeScreenClassCount(source) {
  return [...source.matchAll(/\bclass\s+\w+Screen\s+extends\s+(?:Consumer(?:Stateful)?|Stateless|Stateful)Widget\b/gu)]
    .length;
}

function lineForRouteScreenClass(source) {
  const match = /\bclass\s+\w+Screen\s+extends\s+(?:Consumer(?:Stateful)?|Stateless|Stateful)Widget\b/u.exec(
    source,
  );
  return match == null ? 1 : lineForOffset(source, match.index);
}

function isHandwrittenLibFile(relativePath) {
  return (
    (relativePath.startsWith("lib/") || appSourcePattern.test(relativePath)) &&
    relativePath.endsWith(".dart") &&
    !relativePath.endsWith(".g.dart") &&
    !relativePath.endsWith(".freezed.dart")
  );
}

function firstKeepAliveLineWithoutMarker(source) {
  const lines = source.split(/\r?\n/u);
  for (let index = 0; index < lines.length; index += 1) {
    if (!/@Riverpod\s*\([^)]*\bkeepAlive\s*:\s*true/u.test(lines[index])) {
      if (!/\bkeepAlive\s*:\s*true/u.test(lines[index])) continue;
    }
    const hasMarker = [index - 1, index - 2, index - 3].some((candidate) => {
      return candidate >= 0 && /\/\/\s*keepalive:\s*\S/u.test(lines[candidate]);
    });
    if (!hasMarker) return index + 1;
  }
  return null;
}

function* manualProviderDeclarationMatches(source) {
  // Keep offsets while ignoring comments and strings; this remains the small
  // declaration ratchet. Class ancestry and ownership are AST graph checks.
  const code = source.replace(
    /\/\*[\s\S]*?\*\/|\/\/[^\r\n]*|r?(?:'''[\s\S]*?'''|"""[\s\S]*?"""|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")/gu,
    (text) => text.replace(/[^\r\n]/gu, " "),
  );
  const prefixes = new Set([...source.matchAll(/^import\s+['"]package:(?:flutter_riverpod|hooks_riverpod|riverpod)\/[^'"]+['"]\s+as\s+(\w+)\b[^;]*;/gmu)].map((match) => match[1]));
  for (const match of code.matchAll(
    /\b([A-Za-z_]\w*)\s*=\s*(?:(\w+)\s*\.\s*)?((?:Provider|StateProvider|FutureProvider|StreamProvider|NotifierProvider|AsyncNotifierProvider|StreamNotifierProvider|ChangeNotifierProvider|StateNotifierProvider)(?:\s*\.\s*(?:autoDispose|family))*)(?=\s*[<(])/gu,
  )) {
    if (match[2] != null && !prefixes.has(match[2])) continue;
    const declaration = [match[0], match[1], match[3]];
    declaration.index = match.index;
    yield declaration;
  }
}

function classBlocks(source) {
  const blocks = [];
  for (const match of source.matchAll(/\bclass\s+(\w+)\b[^{]*\{/gu)) {
    const start = match.index ?? 0;
    const bodyStart = start + match[0].length;
    const end = matchingBraceOffset(source, bodyStart - 1);
    if (end == null) continue;
    blocks.push({
      name: match[1],
      start,
      body: source.slice(bodyStart, end),
    });
  }
  return blocks;
}

function matchingBraceOffset(source, openBraceOffset) {
  let depth = 0;
  for (let index = openBraceOffset; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return null;
}

function isAllowedDomainImport(uri) {
  if (uri.startsWith("dart:")) return true;
  if (!uri.startsWith("package:")) return true;
  return allowedDomainPackages.has(packageNameFor(uri));
}

function packageNameFor(uri) {
  return /^package:([^/']+)/u.exec(uri)?.[1] ?? "";
}

function isPluginPackageImport(uri) {
  if (!uri.startsWith("package:")) return false;
  return pluginPackages.has(packageNameFor(uri));
}

function hasStreamTimeoutOverride({source, line}) {
  const lines = source.split(/\r?\n/u);
  return [line - 1, line - 2].some((index) => {
    if (index < 0) return false;
    return /\/\/\s*architecture:allow\s+stream-timeout\s+--\s+reason:\s*\S/u.test(
      lines[index],
    );
  });
}

function lineForOffset(source, offset) {
  let line = 1;
  for (let index = 0; index < offset; index += 1) {
    if (source.charCodeAt(index) === 10) line += 1;
  }
  return line;
}

function readBaseline(snapshot, relativePath) {
  const source = snapshot.readText(relativePath);
  if (source == null) return emptyBaseline(relativePath);
  try {
    return {
      ...JSON.parse(source),
      path: relativePath,
    };
  } catch (error) {
    throw new Error(`Failed to parse ${relativePath}: ${error.message}`);
  }
}

function emptyBaseline(relativePath = null) {
  return {path: relativePath, allowedFindings: []};
}

function parseArgs(rawArgs) {
  const parsed = {
    baseline: null,
    help: false,
    json: false,
    root: null,
    writeBaseline: false,
  };

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (arg === "--help" || arg === "-h") {
      parsed.help = true;
    } else if (arg === "--json") {
      parsed.json = true;
    } else if (arg === "--write-baseline") {
      parsed.writeBaseline = true;
    } else if (arg === "--baseline") {
      parsed.baseline = requireValue(rawArgs, (index += 1), arg);
    } else if (arg === "--root") {
      parsed.root = requireValue(rawArgs, (index += 1), arg);
    } else {
      console.error(`Unknown argument: ${arg}`);
      process.exit(2);
    }
  }

  return parsed;
}

function requireValue(argsList, index, flag) {
  const value = argsList[index];
  if (value == null || value.startsWith("--")) {
    console.error(`Missing value for ${flag}`);
    process.exit(2);
  }
  return path.resolve(value);
}

function printFindings(result) {
  console.error(
    `Dependency direction check failed (${result.findings.length} new finding(s); ${result.baselineFindings.length} baseline finding(s) acknowledged).`,
  );
  for (const finding of result.findings) {
    console.error(`- ${finding.path}: ${finding.reason}`);
    const detail = finding.import == null ? "" : `: ${finding.import}`;
    console.error(`  ${finding.line == null ? "" : `L${finding.line} `}${finding.rule}${detail}`);
  }
}

function printHelp() {
  console.log(`Usage:
  node tool/architecture/check_dependency_direction.mjs
  node tool/architecture/check_dependency_direction.mjs --json
  node tool/architecture/check_dependency_direction.mjs --write-baseline

Scans lib/**/*.dart and app-package sources (apps/*/lib/**/*.dart) for
dependency-direction violations. Legacy features use lib/<feature>/<layer>/;
the bounded-context roots are lib/contexts/<context>/{domain,data,actions,parts}/,
lib/kernel/ (held to the domain rules), lib/platform/, lib/pages/<page>/ and
app destinations apps/<app>/lib/<destination>/ (held to the screen rules).
Rules:
- domain files importing packages outside the small domain allowlist;
- data/domain files importing feature presentation code;
- feature presentation files importing sibling feature presentation internals;
- feature-root barrel presentation exports missing // public-api: annotations;
- presentation helpers leaking WidgetRef below the route/controller boundary;
- presentation widgets reading repository providers directly;
- *_state.dart display adapters coupled to Riverpod/provider declarations;
- unregistered presentation state adapters;
- keepAlive providers without // keepalive: lifecycle rationale markers;
- handwritten provider declarations outside core;
- display-state classes hidden inside non-state files;
- presentation files that declare multiple route screens;
- domain files calling DateTime.now() internally;
- data files wrapping streams in timeout() without an override comment;
- presentation widgets importing plugin/platform packages outside controllers,
  services and context actions;
- context parts/ widgets importing Riverpod or reading providers.

The baseline file ratchets existing debt. Normal runs fail on new findings and
obsolete allowances in tool/architecture/dependency_direction_baseline.json.
Hard-gate rules such as barrelPresentationExport, partsProviderCoupling and
untrackedStateAdapter cannot be suppressed by the baseline, and findings under
the bounded-context roots and app packages are never baselined.`);
}

function normalizePath(filePath) {
  return filePath.split(path.sep).join("/");
}

function relativePathWithinRoot(root, file) {
  const relativePath = normalizePath(path.relative(root, file));
  if (
    relativePath === "" ||
    relativePath === ".." ||
    relativePath.startsWith("../") ||
    path.isAbsolute(relativePath)
  ) {
    throw new Error(`Dependency baseline must be inside the repository: ${file}`);
  }
  return relativePath;
}

function assertMaterializedWriteTarget(snapshot, relativePath) {
  const absolutePath = path.join(snapshot.root, relativePath);
  let stat = null;
  try {
    stat = fs.lstatSync(absolutePath);
  } catch (error) {
    if (error?.code !== "ENOENT" && error?.code !== "ENOTDIR") throw error;
  }
  if (snapshot.exists(relativePath) && stat == null) {
    throw new Error(
      `Refusing to write sparse-omitted repository path: ${relativePath}`,
    );
  }
  if (stat != null && !stat.isFile()) {
    throw new Error(
      `Refusing to write non-regular repository path: ${relativePath}`,
    );
  }
  return absolutePath;
}

function runCli() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  const root = args.root ?? fromRepo();
  const snapshot = createRepositorySnapshot({root});
  const baselineRelativePath = args.baseline == null
    ? defaultBaselinePath
    : relativePathWithinRoot(snapshot.root, args.baseline);
  const baseline = args.writeBaseline
    ? emptyBaseline()
    : readBaseline(snapshot, baselineRelativePath);
  const result = scanDependencyDirection({snapshot, baseline});

  if (args.writeBaseline) {
    const nextBaseline = baselineFromFindings(result.allFindings);
    const baselinePath = assertMaterializedWriteTarget(
      snapshot,
      baselineRelativePath,
    );
    fs.mkdirSync(path.dirname(baselinePath), {recursive: true});
    fs.writeFileSync(
      baselinePath,
      `${JSON.stringify(nextBaseline, null, 2)}\n`,
    );
    if (!args.json) {
      console.log(
        `Wrote dependency direction baseline with ${nextBaseline.allowedFindings.length} finding(s): ${baselineRelativePath}`,
      );
    }
    if (args.json) {
      console.log(JSON.stringify({...result, writtenBaseline: nextBaseline}, null, 2));
    }
    return;
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  }

  if (result.findings.length > 0) {
    if (!args.json) printFindings(result);
    process.exit(1);
  }

  if (!args.json && !args.writeBaseline) {
    console.log(
      `Dependency direction check passed (${result.checkedFiles} Dart files scanned; ${result.baselineFindings.length} baseline finding(s) acknowledged).`,
    );
  }
}
