#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {fromRepo, relativeToRepo, repoRoot} from "../lib/repo_paths.mjs";

const defaultScreenContractsPath = "design/screens/catch.screens.json";
const defaultStateMatrixPath = "docs/design_parity/state_matrix.json";

const edgeInsetsPattern =
  /\bEdgeInsets(?:Directional)?\.(?:all|only|symmetric|fromLTRB)\s*\(/gu;
const screenGutterTokenPattern = /CatchSpacing\.(?:screenPx|s5)\b/u;
const horizontalInsetPattern =
  /(?:horizontal|left|right|start|end)\s*:\s*[^,\n)]*CatchSpacing\.(?:screenPx|s5)\b/su;
const fromLTRBHorizontalPattern =
  /EdgeInsets(?:Directional)?\.fromLTRB\s*\(\s*[^,\n)]*CatchSpacing\.(?:screenPx|s5)\b[\s\S]*,\s*[^,\n)]*CatchSpacing\.(?:screenPx|s5)\b[\s,)]/u;
const allScreenTokenPattern =
  /EdgeInsets(?:Directional)?\.all\s*\(\s*CatchSpacing\.(?:screenPx|s5)\b/u;
const rawNumericInsetPattern =
  /EdgeInsets(?:Directional)?\.(?:all|only|symmetric|fromLTRB)\s*\(\s*(?:\d|\w+\s*:\s*\d)/u;
const screenishContextPattern =
  /\b(?:page|screen|body|gutter|content|section|list|sliver|scroll|header|rail|tab|feed|padding|insets)\w*\b/iu;
const screenFilePattern = /(?:^|\/)[^/]*screen[^/]*\.dart$/u;
const generatedSuffixes = [".g.dart", ".freezed.dart", ".mocks.dart"];
const excludedPrefixes = [
  "lib/core/widgets/",
  "lib/platform/theme/",
];

const isCliEntrypoint =
  process.argv[1] != null &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCliEntrypoint) runCli();

export function scanScreenGutters({
  root = repoRoot,
  screenContractsPath = defaultScreenContractsPath,
  stateMatrixPath = defaultStateMatrixPath,
} = {}) {
  const contractedFiles = collectContractFiles({
    root,
    screenContractsPath,
    stateMatrixPath,
  });
  const files = collectPresentationFiles(root);
  for (const file of contractedFiles) files.add(file);

  const findings = [];
  let scannedFiles = 0;
  for (const relativePath of [...files].sort()) {
    if (!isScannableDartFile(relativePath)) continue;
    const absolute = path.join(root, relativePath);
    if (!fs.existsSync(absolute)) continue;
    scannedFiles += 1;
    const source = fs.readFileSync(absolute, "utf8");
    findings.push(
      ...scanSourceForEdgeInsets({
        relativePath,
        source,
        isContractedScreenSurface: contractedFiles.has(relativePath),
      }),
    );
  }

  findings.sort(compareFindings);
  return {
    filesScanned: scannedFiles,
    contractedFiles: contractedFiles.size,
    findings,
    counts: summarize(findings),
  };
}

export function scanSourceForEdgeInsets({
  relativePath,
  source,
  isContractedScreenSurface = false,
}) {
  const maskedSource = maskDartCommentsAndStrings(source);
  const findings = [];

  edgeInsetsPattern.lastIndex = 0;
  for (const match of maskedSource.matchAll(edgeInsetsPattern)) {
    const start = match.index ?? 0;
    const openParen = maskedSource.indexOf("(", start);
    const end = findBalancedClose(maskedSource, openParen);
    if (end == null) continue;

    const expression = source.slice(start, end + 1);
    const line = lineForOffset(source, start);
    const context = surroundingLines(source, line, {before: 4, after: 1});
    const classification = classifyEdgeInsets({
      relativePath,
      expression,
      context,
      isContractedScreenSurface,
    });
    findings.push({
      path: relativePath,
      line,
      level: classification.level,
      reason: classification.reason,
      expression: compactWhitespace(expression),
    });
  }

  return findings;
}

function runCli() {
  const args = process.argv.slice(2);
  const command = args[0] != null && !args[0].startsWith("--") ? args[0] : "--summary";

  if (command === "--help" || command === "-h" || command === "help") {
    printHelp();
    return;
  }
  if (command !== "--summary" && command !== "summary" && command !== "--json" && command !== "json") {
    console.error(`Unknown command: ${command}`);
    printHelp();
    process.exit(64);
  }

  const root = valueAfter(args, "--root") ?? repoRoot;
  const result = scanScreenGutters({root});
  if (args.includes("--json") || command === "--json" || command === "json") {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const maxRows = Number(valueAfter(args, "--max") ?? 40);
  const includeLow = args.includes("--include-low");
  printSummary(result, {maxRows, includeLow});

  const failOn = valueAfter(args, "--fail-on");
  if (failOn != null && shouldFail(result.counts, failOn)) {
    process.exit(1);
  }
}

function collectPresentationFiles(root) {
  const files = new Set();
  const libRoot = path.join(root, "lib");
  if (!fs.existsSync(libRoot)) return files;

  for (const absolute of walk(libRoot)) {
    const relativePath = normalizePath(relativeTo(root, absolute));
    if (!relativePath.endsWith(".dart")) continue;
    if (!relativePath.includes("/presentation/")) continue;
    files.add(relativePath);
  }
  return files;
}

function collectContractFiles({root, screenContractsPath, stateMatrixPath}) {
  const files = new Set();
  const screenContracts = readJsonIfExists(path.join(root, screenContractsPath));
  const stateMatrix = readJsonIfExists(path.join(root, stateMatrixPath));

  for (const screen of screenContracts?.screens ?? []) {
    addBinding(files, screen.source);
    for (const binding of screen.stateController?.files ?? []) addBinding(files, binding);
    for (const binding of screen.stateController?.mutationOwners ?? []) addBinding(files, binding);
    for (const section of screen.composition?.sections ?? []) addBinding(files, section.flutter);
  }
  for (const feature of stateMatrix?.features ?? []) {
    for (const screen of feature.screens ?? []) {
      for (const file of screen.implementationPaths ?? []) addBinding(files, file);
    }
  }
  return files;
}

function addBinding(files, binding) {
  if (typeof binding === "string") {
    files.add(normalizePath(binding));
    return;
  }
  if (binding?.file) files.add(normalizePath(binding.file));
  if (binding?.path) files.add(normalizePath(binding.path));
}

function isScannableDartFile(relativePath) {
  if (!relativePath.endsWith(".dart")) return false;
  if (generatedSuffixes.some((suffix) => relativePath.endsWith(suffix))) return false;
  if (excludedPrefixes.some((prefix) => relativePath.startsWith(prefix))) return false;
  return true;
}

function classifyEdgeInsets({
  relativePath,
  expression,
  context,
  isContractedScreenSurface,
}) {
  const usesScreenGutterToken = screenGutterTokenPattern.test(expression);
  const usesHorizontalScreenGutter =
    usesScreenGutterToken &&
    (horizontalInsetPattern.test(expression) ||
      fromLTRBHorizontalPattern.test(expression) ||
      allScreenTokenPattern.test(expression));
  const isScreenish =
    screenFilePattern.test(relativePath) ||
    isContractedScreenSurface ||
    screenishContextPattern.test(context);

  if (usesHorizontalScreenGutter && isScreenish) {
    return {
      level: "high",
      reason:
        "horizontal CatchSpacing.screenPx/s5 EdgeInsets in screen or presentation surface; review for CatchInsets, CatchPageBody.screen, or CatchSection ownership",
    };
  }
  if (usesScreenGutterToken) {
    return {
      level: "medium",
      reason:
        "CatchSpacing.screenPx/s5 EdgeInsets in presentation code; verify this is component-local and not a page gutter",
    };
  }
  if (rawNumericInsetPattern.test(expression)) {
    return {
      level: "medium",
      reason:
        "raw numeric EdgeInsets in presentation code; verify it is local geometry rather than a hidden screen gutter",
    };
  }
  return {
    level: "low",
    reason:
      "EdgeInsets constructor in presentation code; inventory only unless it owns screen spacing",
  };
}

function printSummary(result, {maxRows, includeLow}) {
  const visibleFindings = result.findings.filter(
    (finding) => includeLow || finding.level !== "low",
  );
  console.log(
    [
      "Screen gutter EdgeInsets advisory:",
      "Scope: lib/**/presentation/**/*.dart plus contracted screen implementation paths",
      `Files scanned: ${result.filesScanned}`,
      `Contract registry files included: ${result.contractedFiles}`,
      `EdgeInsets constructors found: ${result.findings.length}`,
      `High-confidence gutter candidates: ${result.counts.high}`,
      `Medium review candidates: ${result.counts.medium}`,
      `Low inventory items: ${result.counts.low}`,
    ].join("\n"),
  );

  for (const finding of visibleFindings.slice(0, maxRows)) {
    console.log(
      `- ${finding.level.toUpperCase()} ${finding.path}:${finding.line} ` +
        `${finding.reason} (${finding.expression})`,
    );
  }
  if (visibleFindings.length > maxRows) {
    console.log(
      `- ... ${visibleFindings.length - maxRows} more findings omitted; rerun with --max ${visibleFindings.length}.`,
    );
  }
}

function summarize(findings) {
  const counts = {high: 0, medium: 0, low: 0};
  for (const finding of findings) counts[finding.level] += 1;
  return counts;
}

function shouldFail(counts, failOn) {
  if (failOn === "any") return counts.high + counts.medium + counts.low > 0;
  if (failOn === "high") return counts.high > 0;
  if (failOn === "medium") return counts.high + counts.medium > 0;
  if (failOn === "low") return counts.high + counts.medium + counts.low > 0;
  console.error(`Unknown --fail-on value: ${failOn}`);
  process.exit(64);
}

function compareFindings(a, b) {
  const levelRank = {high: 0, medium: 1, low: 2};
  return (
    levelRank[a.level] - levelRank[b.level] ||
    a.path.localeCompare(b.path) ||
    a.line - b.line ||
    a.expression.localeCompare(b.expression)
  );
}

function findBalancedClose(source, openParen) {
  if (openParen === -1) return null;
  let depth = 0;
  for (let index = openParen; index < source.length; index += 1) {
    const char = source[index];
    if (char === "(") depth += 1;
    if (char === ")") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return null;
}

function surroundingLines(source, line, {before, after}) {
  const lines = source.split("\n");
  const start = Math.max(0, line - before - 1);
  const end = Math.min(lines.length, line + after);
  return lines.slice(start, end).join("\n");
}

function maskDartCommentsAndStrings(source) {
  const output = [...source];
  let index = 0;

  while (index < source.length) {
    const char = source[index];
    const next = source[index + 1];

    if (char === "/" && next === "/") {
      index = maskUntilLineEnd(output, source, index);
      continue;
    }

    if (char === "/" && next === "*") {
      index = maskBlockComment(output, source, index);
      continue;
    }

    const rawQuote = isRawStringPrefix(source, index);
    if (rawQuote) {
      index = maskString(output, source, index, rawQuote, {raw: true, prefixLength: 1});
      continue;
    }

    if (char === "\"" || char === "'") {
      index = maskString(output, source, index, char, {raw: false, prefixLength: 0});
      continue;
    }

    index += 1;
  }

  return output.join("");
}

function maskUntilLineEnd(output, source, start) {
  let index = start;
  while (index < source.length && source[index] !== "\n") {
    output[index] = " ";
    index += 1;
  }
  return index;
}

function maskBlockComment(output, source, start) {
  let index = start;
  output[index] = " ";
  output[index + 1] = " ";
  index += 2;
  while (index < source.length) {
    const isEnd = source[index] === "*" && source[index + 1] === "/";
    output[index] = source[index] === "\n" ? "\n" : " ";
    if (isEnd) {
      output[index + 1] = " ";
      return index + 2;
    }
    index += 1;
  }
  return index;
}

function isRawStringPrefix(source, index) {
  const char = source[index];
  if (char !== "r" && char !== "R") return null;
  const prev = source[index - 1];
  if (prev && /[A-Za-z0-9_$]/u.test(prev)) return null;
  const quote = source[index + 1];
  return quote === "\"" || quote === "'" ? quote : null;
}

function maskString(output, source, start, quote, {raw, prefixLength}) {
  const quoteStart = start + prefixLength;
  const triple =
    source[quoteStart] === quote &&
    source[quoteStart + 1] === quote &&
    source[quoteStart + 2] === quote;
  const openingQuoteCount = triple ? 3 : 1;
  const endQuoteCount = triple ? 3 : 1;
  let index = start;
  const stringStart = start;

  while (index < quoteStart + openingQuoteCount) {
    output[index] = source[index] === "\n" ? "\n" : " ";
    index += 1;
  }

  while (index < source.length) {
    output[index] = source[index] === "\n" ? "\n" : " ";

    if (!raw && source[index] === "\\" && !triple) {
      if (index + 1 < source.length) {
        output[index + 1] = source[index + 1] === "\n" ? "\n" : " ";
      }
      index += 2;
      continue;
    }

    if (matchesStringTerminator(source, index, quote, endQuoteCount)) {
      for (let offset = 0; offset < endQuoteCount; offset += 1) {
        output[index + offset] = " ";
      }
      return index + endQuoteCount;
    }

    if (!triple && source[index] === "\n" && index > stringStart) {
      return index;
    }

    index += 1;
  }

  return index;
}

function matchesStringTerminator(source, index, quote, count) {
  for (let offset = 0; offset < count; offset += 1) {
    if (source[index + offset] !== quote) return false;
  }
  return true;
}

function walk(directory) {
  const files = [];
  if (!fs.existsSync(directory)) return files;
  for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }
    if (entry.isFile()) files.push(fullPath);
  }
  return files;
}

function readJsonIfExists(file) {
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    console.error(`Failed to parse ${normalizePath(relativeTo(repoRoot, file))}: ${error.message}`);
    process.exit(1);
  }
}

function lineForOffset(source, offset) {
  let line = 1;
  for (let index = 0; index < offset; index += 1) {
    if (source.charCodeAt(index) === 10) line += 1;
  }
  return line;
}

function compactWhitespace(value) {
  return value.replace(/\s+/gu, " ").trim();
}

function relativeTo(root, filePath) {
  return path.relative(root, filePath);
}

function normalizePath(value) {
  return value.split(path.sep).join("/");
}

function valueAfter(values, flag) {
  const index = values.indexOf(flag);
  if (index === -1) return null;
  const value = values[index + 1];
  if (!value || value.startsWith("--")) return null;
  return value;
}

function printHelp() {
  console.log(`Usage:
  node tool/design/check_screen_gutters.mjs --summary [--max 40] [--include-low]
  node tool/design/check_screen_gutters.mjs --json

Advisory inventory for EdgeInsets constructors in screen implementation
surfaces. The scan intentionally covers all lib/**/presentation/**/*.dart files,
not only *_screen.dart, because section widgets can own accidental page gutters.
High and medium findings are review candidates, not automatic errors.`);
}
