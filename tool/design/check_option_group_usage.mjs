#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {isScreenSource, screenSourceRoots} from "../lib/flutter_source_roots.mjs";
import {repoRoot} from "../lib/repo_paths.mjs";

const generatedSuffixes = [".g.dart", ".freezed.dart", ".mocks.dart"];
const allowedProductionPaths = new Set([
  "packages/catch_ui/lib/src/components/catch_choice_input.dart",
]);
const directItemPattern =
  /\bCatchChoiceButton(?:\s*<[^>\n]+>)?\s*\(/gu;

const isCliEntrypoint =
  process.argv[1] != null &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCliEntrypoint) runCli();

export function scanOptionGroupUsage({root = repoRoot} = {}) {
  const files = collectDartFiles(root).filter(isScannableDartFile);
  const findings = [];

  for (const relativePath of files) {
    const absolutePath = path.join(root, relativePath);
    if (!fs.existsSync(absolutePath)) continue;
    const source = fs.readFileSync(absolutePath, "utf8");
    findings.push(...scanSourceForOptionGroupUsage({relativePath, source}));
  }

  findings.sort(compareFindings);
  return {
    filesScanned: files.length,
    findings,
    counts: summarize(findings),
  };
}

export function scanSourceForOptionGroupUsage({relativePath, source}) {
  if (!isScreenSource(relativePath)) return [];
  if (allowedProductionPaths.has(relativePath)) return [];

  const commentStripped = stripDartCommentsPreserveLength(source);
  const findings = [];
  directItemPattern.lastIndex = 0;
  for (const match of commentStripped.matchAll(directItemPattern)) {
    findings.push({
      path: relativePath,
      line: lineForOffset(source, match.index ?? 0),
      level: "high",
      rule: "OPTION-GROUP-001",
      reason:
        "Production code should route underline tabs through CatchChoiceInput.segmented or CatchPageTabBar; direct item composition forks divider, indicator, ink, and trailing alignment behavior.",
      expression: "CatchChoiceButton",
    });
  }
  return findings;
}

function collectDartFiles(root) {
  const files = [];
  for (const sourceRoot of screenSourceRoots(root)) {
    const absolute = path.join(root, sourceRoot);
    if (fs.existsSync(absolute)) walk(absolute, files, root);
  }
  return files.sort();
}

function walk(directory, files, root) {
  for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(absolute, files, root);
    } else if (entry.isFile() && entry.name.endsWith(".dart")) {
      files.push(path.relative(root, absolute));
    }
  }
}

function isScannableDartFile(relativePath) {
  if (!relativePath.endsWith(".dart")) return false;
  if (generatedSuffixes.some((suffix) => relativePath.endsWith(suffix))) {
    return false;
  }
  if (relativePath.includes("/generated/")) return false;
  return true;
}

function runCli() {
  const args = process.argv.slice(2);
  const command =
    args[0] != null && !args[0].startsWith("--") ? args[0] : "--summary";

  if (command === "--help" || command === "-h" || command === "help") {
    printHelp();
    return;
  }
  if (
    command !== "--summary" &&
    command !== "summary" &&
    command !== "--json" &&
    command !== "json"
  ) {
    console.error(`Unknown command: ${command}`);
    printHelp();
    process.exit(64);
  }

  const result = scanOptionGroupUsage({
    root: valueAfter(args, "--root") ?? repoRoot,
  });
  if (args.includes("--json") || command === "--json" || command === "json") {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const maxRows = Number(valueAfter(args, "--max") ?? 40);
  printSummary(result, {maxRows});

  const failOn = valueAfter(args, "--fail-on");
  if (failOn != null && shouldFail(result.counts, failOn)) {
    process.exit(1);
  }
}

function printSummary(result, {maxRows}) {
  console.log("Option group usage advisory:");
  console.log(`Files scanned: ${result.filesScanned}`);
  console.log(`High-confidence direct item usages: ${result.counts.high}`);
  console.log(`Medium review candidates: ${result.counts.medium}`);
  console.log(`Low inventory items: ${result.counts.low}`);

  for (const finding of result.findings.slice(0, maxRows)) {
    console.log(
      `- ${finding.level.toUpperCase()} ${finding.path}:${finding.line} ${finding.reason} (${finding.expression})`,
    );
  }
}

function printHelp() {
  console.log(`Usage:
  node tool/design/check_option_group_usage.mjs --summary [--max 40]
  node tool/design/check_option_group_usage.mjs --json

Reports production direct CatchChoiceButton usage that should route through
CatchChoiceInput.segmented or CatchPageTabBar.
`);
}

function summarize(findings) {
  return {
    high: findings.filter((finding) => finding.level === "high").length,
    medium: findings.filter((finding) => finding.level === "medium").length,
    low: findings.filter((finding) => finding.level === "low").length,
    total: findings.length,
  };
}

function shouldFail(counts, failOn) {
  if (failOn === "high") return counts.high > 0;
  if (failOn === "medium") return counts.high + counts.medium > 0;
  if (failOn === "any") return counts.total > 0;
  throw new Error(`Unsupported --fail-on value: ${failOn}`);
}

function compareFindings(a, b) {
  const levelOrder = {high: 0, medium: 1, low: 2};
  return (
    levelOrder[a.level] - levelOrder[b.level] ||
    a.path.localeCompare(b.path) ||
    a.line - b.line
  );
}

function valueAfter(args, flag) {
  const index = args.indexOf(flag);
  if (index < 0) return null;
  return args[index + 1] ?? null;
}

function lineForOffset(source, offset) {
  return source.slice(0, offset).split("\n").length;
}

function stripDartCommentsPreserveLength(source) {
  let output = "";
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (char === "/" && next === "/") {
      while (index < source.length && source[index] !== "\n") {
        output += " ";
        index += 1;
      }
      output += "\n";
      continue;
    }
    if (char === "/" && next === "*") {
      output += "  ";
      index += 2;
      while (
        index < source.length &&
        !(source[index] === "*" && source[index + 1] === "/")
      ) {
        output += source[index] === "\n" ? "\n" : " ";
        index += 1;
      }
      if (index < source.length) output += "  ";
      index += 1;
      continue;
    }
    output += char;
  }
  return output;
}
