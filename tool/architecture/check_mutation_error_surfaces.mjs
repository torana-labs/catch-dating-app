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
  // Coverage is judged per build method on comment-free code, so a comment
  // or a sibling build method naming the same variable cannot suppress a
  // finding (the same unit catch_mutation_pending_requires_error uses).
  const {code, stringMask} = maskDartComments(source);
  const sourceLines = source.split(/\r?\n/u);
  const findings = [];
  for (const body of buildMethodBodies(code, stringMask)) {
    const bodySource = code.slice(body.start, body.end);
    const lineOffset = countNewlines(code, body.start);
    const mutationVariables = mutationVariableExpressions(bodySource);
    const covered = coveredMutationSurfaces(bodySource, mutationVariables);
    for (const pending of pendingLines(bodySource, mutationVariables)) {
      if (isPendingCovered(pending, covered)) continue;
      const line = pending.line + lineOffset;
      const located = {...pending, line, text: sourceLines[line - 1].trim()};
      findings.push({
        path: relativePath,
        line,
        reason: `build method reads ${mutationLabel(
          located,
        )} pending state but has no matching mutation error surface`,
        variableName: located.variableName,
        mutationExpression: located.mutationExpression,
        text: located.text,
        pendingLines: [located],
      });
    }
  }
  return findings;
}

/**
 * Returns the source with every comment replaced by spaces (newlines kept, so
 * offsets and line numbers still match) and a mask of string-literal offsets.
 * String-aware, so `//` inside a URL literal is not a comment; interpolation
 * code inside `${...}` is treated as code.
 */
export function maskDartComments(source) {
  const out = source.split("");
  const stringMask = new Uint8Array(source.length + 1);
  const stack = [];
  const length = source.length;
  const blank = (from, to) => {
    for (let index = from; index < to; index += 1) {
      if (out[index] !== "\n" && out[index] !== "\r") out[index] = " ";
    }
  };
  const markString = (from, to) => {
    for (let index = from; index < to && index < length; index += 1) stringMask[index] = 1;
  };
  let index = 0;
  while (index < length) {
    const top = stack.at(-1);
    const char = source[index];
    if (top?.kind === "string") {
      const close = top.quote.repeat(top.triple ? 3 : 1);
      if (!top.raw && char === "\\") {
        markString(index, index + 2);
        index += 2;
      } else if (!top.raw && char === "$" && source[index + 1] === "{") {
        markString(index, index + 2);
        stack.push({kind: "interpolation", depth: 0});
        index += 2;
      } else if (source.startsWith(close, index)) {
        markString(index, index + close.length);
        stack.pop();
        index += close.length;
      } else if (!top.triple && char === "\n") {
        stack.pop();
        index += 1;
      } else {
        markString(index, index + 1);
        index += 1;
      }
      continue;
    }
    if (char === "/" && source[index + 1] === "/") {
      let end = index;
      while (end < length && source[end] !== "\n") end += 1;
      blank(index, end);
      index = end;
      continue;
    }
    if (char === "/" && source[index + 1] === "*") {
      let depth = 1;
      let end = index + 2;
      while (end < length && depth > 0) {
        if (source.startsWith("/*", end)) {
          depth += 1;
          end += 2;
        } else if (source.startsWith("*/", end)) {
          depth -= 1;
          end += 2;
        } else {
          end += 1;
        }
      }
      blank(index, end);
      index = end;
      continue;
    }
    if (char === "'" || char === '"') {
      const raw = source[index - 1] === "r" && !/[\w$]/u.test(source[index - 2] ?? "");
      const triple = source.startsWith(char.repeat(3), index);
      const width = triple ? 3 : 1;
      markString(index, index + width);
      stack.push({kind: "string", quote: char, triple, raw});
      index += width;
      continue;
    }
    if (top?.kind === "interpolation") {
      if (char === "{") {
        top.depth += 1;
      } else if (char === "}") {
        if (top.depth === 0) {
          markString(index, index + 1);
          stack.pop();
          index += 1;
          continue;
        }
        top.depth -= 1;
      }
    }
    index += 1;
  }
  return {code: out.join(""), stringMask};
}

/** Offsets of each `Widget build(...)` body: a block, or an arrow expression. */
export function buildMethodBodies(code, stringMask) {
  const bodies = [];
  for (const match of code.matchAll(/\bWidget\s+build\s*\(/gu)) {
    if (stringMask[match.index]) continue;
    if (bodies.some((body) => match.index >= body.start && match.index < body.end)) {
      continue;
    }
    const paramsClose = matchingClose(code, stringMask, match.index + match[0].length - 1);
    if (paramsClose < 0) continue;
    let start = paramsClose + 1;
    while (start < code.length && /\s/u.test(code[start])) start += 1;
    let end = -1;
    if (code[start] === "{") {
      end = matchingClose(code, stringMask, start);
    } else if (code.startsWith("=>", start)) {
      end = expressionEnd(code, stringMask, start + 2);
    }
    if (end < 0) continue;
    bodies.push({start, end: end + 1});
  }
  return bodies;
}

// A function, not a const map: runCli() runs at module top, before any const
// below it is initialised.
function closerFor(char) {
  return char === "(" ? ")" : char === "[" ? "]" : char === "{" ? "}" : null;
}

function matchingClose(code, stringMask, openIndex) {
  const stack = [];
  for (let index = openIndex; index < code.length; index += 1) {
    if (stringMask[index]) continue;
    const char = code[index];
    if (closerFor(char) != null) {
      stack.push(closerFor(char));
    } else if (char === ")" || char === "]" || char === "}") {
      if (stack.pop() !== char) return -1;
      if (stack.length === 0) return index;
    }
  }
  return -1;
}

function expressionEnd(code, stringMask, fromIndex) {
  let depth = 0;
  for (let index = fromIndex; index < code.length; index += 1) {
    if (stringMask[index]) continue;
    const char = code[index];
    if (closerFor(char) != null) depth += 1;
    else if (char === ")" || char === "]" || char === "}") depth -= 1;
    else if (char === ";" && depth === 0) return index;
    if (depth < 0) return -1;
  }
  return -1;
}

function countNewlines(text, endIndex) {
  let count = 0;
  for (let index = 0; index < endIndex; index += 1) {
    if (text[index] === "\n") count += 1;
  }
  return count;
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
    /[Mm]utation/u.test(source)
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
.g.dart files. Each Widget build method is judged on its own, with comments
ignored.
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
