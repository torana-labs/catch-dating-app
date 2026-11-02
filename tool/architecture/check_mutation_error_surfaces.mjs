#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {screenSourceRoots} from "../lib/flutter_source_roots.mjs";
import {fromRepo} from "../lib/repo_paths.mjs";

const isCliEntrypoint =
  process.argv[1] != null &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCliEntrypoint) runCli();

export function scanMutationErrorSurfaces({root = fromRepo()} = {}) {
  const inputRoot = path.join(root, "lib");
  for (const directory of [root, inputRoot]) {
    if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
      return scopeFailure("Expected a repository root with a production lib directory.");
    }
  }
  const dartFiles = screenSourceRoots(root)
    .flatMap((sourceRoot) => collectDartFiles(path.join(root, sourceRoot)));
  if (dartFiles.length === 0) {
    return scopeFailure("No eligible production lib Dart files found (.g.dart files are excluded).");
  }
  const findings = [];

  for (const file of dartFiles) {
    const source = fs.readFileSync(file, "utf8");
    const relativePath = normalizePath(path.relative(root, file));
    findings.push(...scanFile({relativePath, source}));
  }

  return {
    checkedFiles: dartFiles.length,
    findings,
  };
}

function scopeFailure(reason) {
  return {
    checkedFiles: 0,
    findings: [{
      path: "lib",
      line: null,
      reason,
      text: "Check --root and materialize the production lib source before running this check.",
    }],
  };
}

export function scanFile({relativePath, source}) {
  if (!isBuildMethodMutationPendingCandidate(source)) return [];
  const mutationVariables = mutationVariableExpressions(source);
  const covered = coveredMutationSurfaces(source, mutationVariables);
  const uncoveredPendingLines = pendingLines(source, mutationVariables).filter(
    (pending) => !isPendingCovered(pending, covered),
  );
  if (uncoveredPendingLines.length === 0) return [];

  return uncoveredPendingLines.map((pending) => ({
    path: relativePath,
    line: pending.line,
    reason: `build method reads ${mutationLabel(
      pending,
    )} pending state but has no matching mutation error surface`,
    variableName: pending.variableName,
    mutationExpression: pending.mutationExpression,
    text: pending.text,
    pendingLines: [pending],
  }));
}

function collectDartFiles(root) {
  const files = [];
  walk(root, files);
  return files
    .filter((file) => file.endsWith(".dart"))
    .filter((file) => !file.endsWith(".g.dart"))
    .sort((a, b) => a.localeCompare(b));
}

function walk(directory, files) {
  for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(absolutePath, files);
    } else if (entry.isFile()) {
      files.push(absolutePath);
    }
  }
}

function isBuildMethodMutationPendingCandidate(source) {
  return (
    /\bWidget\s+build\s*\(/u.test(source) &&
    /\bref\.(?:watch|read)\s*\(/u.test(source) &&
    /\.isPending\b/u.test(source) &&
    /\b[Mm]utation\b/u.test(source)
  );
}

function mutationVariableExpressions(source) {
  const variables = new Map();
  const declarationPattern =
    /\bfinal(?:\s+([A-Za-z0-9_<>, ?]+))?\s+(\w+)\s*=\s*ref\.(?:watch|read)\s*\(([\s\S]*?)\)\s*;/gmu;
  for (const match of source.matchAll(declarationPattern)) {
    const [, declaredType = "", variableName, expression] = match;
    if (
      declaredType.includes("Mutation") ||
      variableName.toLowerCase().includes("mutation") ||
      expression.includes("Mutation") ||
      expression.includes("mutation")
    ) {
      variables.set(variableName, canonicalMutationExpression(expression));
    }
  }
  return variables;
}

function coveredMutationSurfaces(source, mutationVariables) {
  const variables = new Set();
  const expressions = new Set();

  for (const variableName of mutationVariables.keys()) {
    const escaped = escapeRegExp(variableName);
    if (new RegExp(`\\b${escaped}\\.hasError\\b`, "u").test(source)) {
      addCoveredVariable({variableName, mutationVariables, variables, expressions});
    }
    if (
      new RegExp(`\\bmutationErrorMessage\\s*\\(\\s*${escaped}\\b`, "u").test(
        source,
      )
    ) {
      addCoveredVariable({variableName, mutationVariables, variables, expressions});
    }
  }

  for (const match of source.matchAll(
    /\bCatchLocalizedErrorBanner\.mutation\s*\([\s\S]*?\bmutation\s*:\s*([^,\)\]]+)/gmu,
  )) {
    addCoveredExpressionList(match[1], {mutationVariables, variables, expressions});
  }
  for (const match of source.matchAll(
    /\blistenToCatchMutationErrors\s*\([^;]*?\bmutations\s*:\s*\[([\s\S]*?)\]/gmu,
  )) {
    addCoveredExpressionList(match[1], {mutationVariables, variables, expressions});
  }
  for (const match of source.matchAll(
    /\b\w*(?:MutationError|ErrorMutation)\w*\s*\(\s*\[([\s\S]*?)\]\s*\)/gmu,
  )) {
    addCoveredExpressionList(match[1], {mutationVariables, variables, expressions});
  }
  for (const match of source.matchAll(
    /\[([^\[\]]*?)\]\s*\.firstWhere\s*\([\s\S]*?\.hasError[\s\S]*?\)/gmu,
  )) {
    addCoveredExpressionList(match[1], {mutationVariables, variables, expressions});
  }

  return {variables, expressions};
}

function addCoveredExpressionList(
  rawList,
  {mutationVariables, variables, expressions},
) {
  for (const expression of rawList.split(",")) {
    const trimmed = expression.trim();
    if (!trimmed) continue;
    if (mutationVariables.has(trimmed)) {
      addCoveredVariable({
        variableName: trimmed,
        mutationVariables,
        variables,
        expressions,
      });
    } else {
      expressions.add(canonicalMutationExpression(trimmed));
    }
  }
}

function addCoveredVariable({
  variableName,
  mutationVariables,
  variables,
  expressions,
}) {
  variables.add(variableName);
  const expression = mutationVariables.get(variableName);
  if (expression) expressions.add(expression);
}

function pendingLines(source, mutationVariables) {
  const lines = source.split(/\r?\n/u);
  const matches = [];
  for (const [index, line] of lines.entries()) {
    for (const variableName of mutationVariables.keys()) {
      if (!new RegExp(`\\b${escapeRegExp(variableName)}\\.isPending\\b`, "u").test(line)) {
        continue;
      }
      matches.push({
        line: index + 1,
        text: line.trim(),
        variableName,
        mutationExpression: mutationVariables.get(variableName) ?? null,
      });
    }
    for (const match of line.matchAll(
      /ref\.(?:watch|read)\s*\(([\s\S]*?)\)\.isPending/gmu,
    )) {
      const mutationExpression = canonicalMutationExpression(match[1]);
      if (!isStaticMutationExpression(mutationExpression)) continue;
      matches.push({
        line: index + 1,
        text: line.trim(),
        variableName: null,
        mutationExpression,
      });
    }
  }
  return matches;
}

function isPendingCovered(pending, covered) {
  if (pending.variableName != null && covered.variables.has(pending.variableName)) {
    return true;
  }
  return (
    pending.mutationExpression != null &&
    covered.expressions.has(pending.mutationExpression)
  );
}

function mutationLabel(pending) {
  return pending.variableName ?? pending.mutationExpression ?? "mutation";
}

function canonicalMutationExpression(expression) {
  return String(expression).replace(/\s+/gu, "").replace(/,+$/u, "");
}

function isStaticMutationExpression(expression) {
  return /^[A-Z]/u.test(expression) || expression.includes("Mutation");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function parseArgs(rawArgs) {
  const parsed = {
    help: false,
    json: false,
    root: fromRepo(),
  };

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (arg === "--help" || arg === "-h") {
      parsed.help = true;
    } else if (arg === "--json") {
      parsed.json = true;
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

function normalizePath(filePath) {
  return filePath.split(path.sep).join("/");
}

function printFindings(result) {
  console.error(
    `Mutation error surface check failed (${result.findings.length} finding(s)).`,
  );
  for (const finding of result.findings) {
    const location = finding.line == null
      ? finding.path
      : `${finding.path}:${finding.line}`;
    console.error(`- ${location}: ${finding.reason}`);
    console.error(`  ${finding.text}`);
  }
}

function printHelp() {
  console.log(`Usage:
  node tool/architecture/check_mutation_error_surfaces.mjs
  node tool/architecture/check_mutation_error_surfaces.mjs --json
  node tool/architecture/check_mutation_error_surfaces.mjs --root <repo-root>

Scans production lib/**/*.dart and apps/*/lib/**/*.dart build methods, excluding
.g.dart files.
Missing, non-directory or empty input scopes fail the check.
Any watched mutation whose
isPending state is read must also expose a matching mutation error surface, such
as listenToCatchMutationErrors, CatchLocalizedErrorBanner.mutation, mutationErrorMessage, or
a direct hasError branch for that same mutation.`);
}

function runCli() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  const result = scanMutationErrorSurfaces({root: args.root});

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  }

  if (result.findings.length > 0) {
    if (!args.json) printFindings(result);
    process.exit(1);
  }

  if (!args.json) {
    console.log(
      `Mutation error surface check passed (${result.checkedFiles} lib and apps/*/lib Dart files scanned).`,
    );
  }
}
