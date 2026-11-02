#!/usr/bin/env node

import fs from "node:fs";
import {tokenizeDartSyntax} from "../lib/dart_source.mjs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {
  repoRoot as defaultRepoRoot,
} from "../lib/repo_paths.mjs";

const defaultArbRelativePath = "lib/l10n/app_en.arb";
const defaultSourceRootRelativePath = "lib";

const generatedSuffixPattern =
  /\.(?:freezed|g|gen|gr|mocks)\.dart$/u;
const generatedHeaderPattern =
  /(?:GENERATED CODE\s*-\s*DO NOT (?:EDIT|MODIFY)|DO NOT MODIFY BY HAND)/iu;
const dartIdentifierPattern = /^[A-Za-z_$][A-Za-z0-9_$]*$/u;
const canonicalNonMessageL10nMembers = new Set(["localeName"]);
class CliUsageError extends Error {}

const isCliEntrypoint =
  process.argv[1] != null &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCliEntrypoint) {
  try {
    runCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = error instanceof CliUsageError ? 64 : 1;
  }
}

export function scanL10nKeyUsage({
  repoRoot = defaultRepoRoot,
  arbPath = path.join(repoRoot, defaultArbRelativePath),
  sourceRoot = path.join(repoRoot, defaultSourceRootRelativePath),
} = {}) {
  const resolvedRepoRoot = path.resolve(repoRoot);
  const resolvedArbPath = path.resolve(arbPath);
  const resolvedSourceRoot = path.resolve(sourceRoot);
  const catalog = parseArbCatalog(
    fs.readFileSync(resolvedArbPath, "utf8"),
    displayPath(resolvedArbPath, resolvedRepoRoot),
  );
  const catalogKeySet = new Set(catalog.keys);
  const usagesByKey = new Map(catalog.keys.map((key) => [key, []]));
  const l10nReferencesByKey = new Map(
    catalog.keys.map((key) => [key, []]),
  );
  const nonMessageL10nReferences = [];
  const missingCatalogReferences = [];
  const scannedFiles = [];
  const excludedFiles = [];

  for (const filePath of collectDartFiles(resolvedSourceRoot)) {
    const source = fs.readFileSync(filePath, "utf8");
    const relativePath = displayPath(filePath, resolvedRepoRoot);
    const exclusionReason = generatedFileExclusionReason({
      relativePath,
      source,
    });
    if (exclusionReason != null) {
      excludedFiles.push({path: relativePath, reason: exclusionReason});
      continue;
    }

    scannedFiles.push(relativePath);
    const lineStarts = lineStartOffsets(source);
    const tokens = tokenizeDartSyntax(source);
    for (const token of tokens) {
      if (token.kind !== "identifier") continue;
      if (!catalogKeySet.has(token.identifier)) continue;
      const location = lineColumnForOffset(lineStarts, token.offset);
      usagesByKey.get(token.identifier).push({
        path: relativePath,
        line: location.line,
        column: location.column,
      });
    }
    for (const reference of l10nMemberReferencesFromTokens(tokens)) {
      const location = lineColumnForOffset(lineStarts, reference.offset);
      const usage = {
        path: relativePath,
        line: location.line,
        column: location.column,
      };
      if (catalogKeySet.has(reference.key)) {
        l10nReferencesByKey.get(reference.key).push(usage);
      } else if (canonicalNonMessageL10nMembers.has(reference.key)) {
        nonMessageL10nReferences.push({key: reference.key, ...usage});
      } else {
        missingCatalogReferences.push({key: reference.key, ...usage});
      }
    }
  }

  const keys = catalog.keys.map((key) => {
    const usages = usagesByKey.get(key);
    const l10nReferences = l10nReferencesByKey.get(key);
    return {
      key,
      status: usages.length === 0 ? "orphaned" : "used",
      usageCount: usages.length,
      usages,
      l10nReferenceCount: l10nReferences.length,
      l10nReferences,
    };
  });
  const orphanedKeys = keys
    .filter((entry) => entry.status === "orphaned")
    .map((entry) => entry.key);
  const usageReferenceCount = keys.reduce(
    (total, entry) => total + entry.usageCount,
    0,
  );
  const catalogL10nReferenceCount = keys.reduce(
    (total, entry) => total + entry.l10nReferenceCount,
    0,
  );
  const missingCatalogKeys = [...new Set(
    missingCatalogReferences.map((reference) => reference.key),
  )].sort(compareText);
  const inventory = {
    schemaVersion: 2,
    generatedBy: "node tool/copy/check_l10n_key_usage.mjs",
    catalog: displayPath(resolvedArbPath, resolvedRepoRoot),
    sourceRoot: displayPath(resolvedSourceRoot, resolvedRepoRoot),
    scope: {
      included:
        "exact ARB-key identifiers and statically recognized l10n.<key> member references in handwritten production Dart",
      excluded: [
        "Dart files under generated directories",
        "lib/l10n/generated/**",
        "*.g.dart, *.freezed.dart, *.gen.dart, *.gr.dart, and *.mocks.dart",
        "Dart files with a generated-code do-not-edit header",
        "comments and non-interpolated string contents",
        "the ARB locale-metadata accessor AppLocalizations.localeName",
      ],
    },
    summary: {
      catalogKeys: keys.length,
      usedKeys: keys.length - orphanedKeys.length,
      orphanedKeys: orphanedKeys.length,
      usageReferences: usageReferenceCount,
      catalogL10nReferences: catalogL10nReferenceCount,
      nonMessageL10nReferences: nonMessageL10nReferences.length,
      missingCatalogKeys: missingCatalogKeys.length,
      missingCatalogReferences: missingCatalogReferences.length,
      scannedDartFiles: scannedFiles.length,
      excludedGeneratedDartFiles: excludedFiles.length,
    },
    orphanedKeys,
    nonMessageL10nReferences,
    missingCatalogKeys,
    missingCatalogReferences,
    keys,
  };

  return {
    inventory,
    orphanedKeys,
    nonMessageL10nReferences,
    missingCatalogKeys,
    missingCatalogReferences,
    scannedFiles,
    excludedFiles,
  };
}

export function parseArbCatalog(source, label = "ARB catalog") {
  let value;
  try {
    value = JSON.parse(source);
  } catch (error) {
    throw new Error(
      `${label} is not valid JSON: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be a JSON object.`);
  }

  const keys = Object.keys(value)
    .filter((key) => !key.startsWith("@"))
    .sort(compareText);
  for (const key of keys) {
    if (!dartIdentifierPattern.test(key)) {
      throw new Error(
        `${label} key ${JSON.stringify(key)} is not a Dart identifier.`,
      );
    }
    if (typeof value[key] !== "string") {
      throw new Error(
        `${label} message ${JSON.stringify(key)} must be a string.`,
      );
    }
  }
  return {keys, value};
}

export function tokenizeDartIdentifiers(source) {
  return tokenizeDartSyntax(source)
    .filter((token) => token.kind === "identifier")
    .map(({identifier, offset}) => ({identifier, offset}));
}

export function findL10nMemberReferences(source) {
  return l10nMemberReferencesFromTokens(tokenizeDartSyntax(source));
}

function l10nMemberReferencesFromTokens(tokens) {
  const references = [];
  for (let index = 0; index + 2 < tokens.length; index += 1) {
    const receiver = tokens[index];
    const access = tokens[index + 1];
    const member = tokens[index + 2];
    if (
      receiver.kind === "identifier" &&
      receiver.identifier === "l10n" &&
      access.kind === "member-access" &&
      member.kind === "identifier"
    ) {
      references.push({
        key: member.identifier,
        offset: member.offset,
        receiverOffset: receiver.offset,
        operator: access.operator,
      });
    }
  }
  return references;
}

export function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function generatedFileExclusionReason({relativePath, source}) {
  const normalizedPath = normalizePath(relativePath);
  if (normalizedPath.startsWith("lib/l10n/generated/")) {
    return "l10n-generated-directory";
  }
  if (normalizedPath.split("/").includes("generated")) {
    return "generated-directory";
  }
  if (generatedSuffixPattern.test(normalizedPath)) {
    return "generated-suffix";
  }
  const header = source.split(/\r?\n/u, 8).join("\n");
  if (generatedHeaderPattern.test(header)) {
    return "generated-header";
  }
  return null;
}

function collectDartFiles(root) {
  if (!fs.existsSync(root)) {
    throw new Error(`Dart source root does not exist: ${root}`);
  }
  const files = [];
  walk(root, files);
  return files
    .filter((filePath) => filePath.endsWith(".dart"))
    .sort(compareText);
}

function walk(directory, files) {
  for (const entry of fs
    .readdirSync(directory, {withFileTypes: true})
    .sort((a, b) => compareText(a.name, b.name))) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(filePath, files);
    else if (entry.isFile()) files.push(filePath);
  }
}

function lineStartOffsets(source) {
  const starts = [0];
  for (let index = 0; index < source.length; index += 1) {
    if (source.charCodeAt(index) === 10) starts.push(index + 1);
  }
  return starts;
}

function lineColumnForOffset(lineStarts, offset) {
  let low = 0;
  let high = lineStarts.length;
  while (low + 1 < high) {
    const middle = Math.floor((low + high) / 2);
    if (lineStarts[middle] <= offset) low = middle;
    else high = middle;
  }
  return {line: low + 1, column: offset - lineStarts[low] + 1};
}

function compareText(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function normalizePath(value) {
  return value.split(path.sep).join("/");
}

function displayPath(filePath, repoRoot) {
  const relativePath = path.relative(repoRoot, filePath);
  if (
    relativePath === "" ||
    (!relativePath.startsWith(`..${path.sep}`) && relativePath !== "..")
  ) {
    return normalizePath(relativePath || ".");
  }
  return normalizePath(path.resolve(filePath));
}

function parseArgs(argv) {
  const parsed = {
    arb: defaultArbRelativePath,
    check: false,
    help: false,
    json: false,
    repoRoot: defaultRepoRoot,
    sourceRoot: defaultSourceRootRelativePath,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--arb") parsed.arb = requiredValue(argv, ++index, argument);
    else if (argument === "--check") parsed.check = true;
    else if (argument === "--help" || argument === "-h") parsed.help = true;
    else if (argument === "--json") parsed.json = true;
    else if (argument === "--repo-root") {
      parsed.repoRoot = path.resolve(requiredValue(argv, ++index, argument));
    } else if (argument === "--source-root") {
      parsed.sourceRoot = requiredValue(argv, ++index, argument);
    } else throw new CliUsageError(`Unknown argument: ${argument}`);
  }

  return parsed;
}

function requiredValue(argv, index, flag) {
  const value = argv[index];
  if (value == null || value.startsWith("--")) {
    throw new CliUsageError(`${flag} requires a value.`);
  }
  return value;
}

function resolveFromRoot(root, value) {
  return path.isAbsolute(value) ? path.resolve(value) : path.resolve(root, value);
}

function runCli() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const repoRoot = path.resolve(args.repoRoot);
  const arbPath = resolveFromRoot(repoRoot, args.arb);
  const sourceRoot = resolveFromRoot(repoRoot, args.sourceRoot);
  const result = scanL10nKeyUsage({repoRoot, arbPath, sourceRoot});

  if (args.json) {
    console.log(
      stableJson({
        inventory: result.inventory,
        excludedFiles: result.excludedFiles,
      }).trimEnd(),
    );
  } else {
    const summary = result.inventory.summary;
    console.log(
      `Flutter l10n key usage: ${summary.catalogKeys} catalog key(s), ` +
        `${summary.usedKeys} used, ${summary.orphanedKeys} orphaned, ` +
        `${summary.catalogL10nReferences} catalog getter reference(s), ` +
        `${summary.missingCatalogReferences} missing catalog getter reference(s), ` +
        `${summary.scannedDartFiles} handwritten Dart file(s), ` +
        `${summary.excludedGeneratedDartFiles} generated Dart file(s) excluded.`,
    );
  }

  if (result.missingCatalogReferences.length > 0) {
    reportMissingCatalogReferences(result.missingCatalogReferences);
    process.exitCode = 1;
  }

  if (args.check && result.orphanedKeys.length > 0) {
    console.error("Orphaned Flutter ARB keys:");
    for (const key of result.orphanedKeys) console.error(`- ${key}`);
    console.error(
      "Restore a handwritten production use or remove the obsolete ARB entry.",
    );
    process.exitCode = 1;
  }
}

function reportMissingCatalogReferences(references) {
  console.error(
    "Flutter l10n getters missing from the canonical ARB catalog:",
  );
  for (const reference of references) {
    console.error(
      `- ${reference.path}:${reference.line}:${reference.column} l10n.${reference.key}`,
    );
  }
  console.error(
    "Restore each canonical ARB message or update the handwritten callsite; missing catalog getters always fail.",
  );
}

function printHelp() {
  console.log(`Usage: node tool/copy/check_l10n_key_usage.mjs [options]

Scans exact app_en.arb key identifiers and l10n.<key> member references in
handwritten production Dart. Missing catalog getters always fail. Generated
Dart, comments, and ordinary string contents cannot affect either result.

Check options:
  --check                 Fail on any orphaned catalog key.
  --json                  Print the complete live inventory.

Path options:
  --arb <path>            Override lib/l10n/app_en.arb.
  --source-root <path>    Override the lib source root.
  --repo-root <path>      Override the checkout root (used by fixture tests).
  --help, -h              Show this help.

Parent integration loop:
  node tool/copy/check_l10n_key_usage.mjs --check
  node tool/copy/check_l10n_key_usage.mjs --check --json > build/ci/l10n-key-usage.json
`);
}
