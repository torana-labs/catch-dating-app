#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {repoRoot} from "../lib/repo_paths.mjs";

const productionRoots = ["lib/", "packages/catch_ui/lib/"];
const generatedSuffixes = [".g.dart", ".freezed.dart", ".mocks.dart"];
const canonicalImplementationPaths = new Set([
  "packages/catch_ui/lib/src/components/catch_section.dart",
  "lib/organizers/presentation/discovery/widgets/organizer_avatar_rail.dart",
]);
const railCallPattern = /\b(CatchSection\s*\.\s*horizontal|OrganizerAvatarRail)\s*\(/gu;
const zeroPaddingPattern =
  /\b(?:headerPadding|listPadding)\s*:\s*EdgeInsets\.zero\b/u;
const showDividerFalsePattern = /\bshowDivider\s*:\s*false\b/u;
const fullBleedTruePattern = /\bfullBleed\s*:\s*true\b/u;

const isCliEntrypoint =
  process.argv[1] != null &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCliEntrypoint) runCli();

export function scanRailContracts({root = repoRoot} = {}) {
  const files = collectDartFiles(root).filter(isScannableDartFile);
  const findings = [];
  const inventory = {fullBleedOptIns: 0, railCalls: 0};

  for (const relativePath of files) {
    const absolutePath = path.join(root, relativePath);
    if (!fs.existsSync(absolutePath)) continue;
    const source = fs.readFileSync(absolutePath, "utf8");
    const result = scanSourceForRailContracts({relativePath, source});
    findings.push(...result.findings);
    inventory.fullBleedOptIns += result.inventory.fullBleedOptIns;
    inventory.railCalls += result.inventory.railCalls;
  }

  findings.sort(compareFindings);
  return {
    filesScanned: files.length,
    findings,
    counts: summarize(findings),
    inventory,
  };
}

export function scanSourceForRailContracts({relativePath, source}) {
  if (!productionRoots.some((root) => relativePath.startsWith(root))) {
    return {findings: [], inventory: {fullBleedOptIns: 0, railCalls: 0}};
  }
  if (canonicalImplementationPaths.has(relativePath)) {
    return {findings: [], inventory: {fullBleedOptIns: 0, railCalls: 0}};
  }

  const commentStripped = stripDartCommentsPreserveLength(source);
  const findings = [];
  const inventory = {fullBleedOptIns: 0, railCalls: 0};

  railCallPattern.lastIndex = 0;
  for (const match of commentStripped.matchAll(railCallPattern)) {
    const start = match.index ?? 0;
    const openParen = commentStripped.indexOf("(", start);
    const end = findBalancedClose(commentStripped, openParen);
    if (end == null) continue;

    const expression = source.slice(start, end + 1);
    inventory.railCalls += 1;
    if (fullBleedTruePattern.test(expression)) inventory.fullBleedOptIns += 1;

    if (zeroPaddingPattern.test(expression)) {
      findings.push({
        path: relativePath,
        line: lineForOffset(source, start),
        level: "high",
        rule: "RAIL-CONTRACT-001",
        reason:
          "Rail callers should use the embedded default or fullBleed: true instead of manually zeroing rail chrome.",
        expression: compactWhitespace(expression),
      });
      continue;
    }
    if (showDividerFalsePattern.test(expression) && !fullBleedTruePattern.test(expression)) {
      findings.push({
        path: relativePath,
        line: lineForOffset(source, start),
        level: "medium",
        rule: "RAIL-CONTRACT-001",
        reason:
          "Embedded rails hide dividers by default; remove redundant showDivider: false unless this is a documented exception.",
        expression: compactWhitespace(expression),
      });
    }
  }

  return {findings, inventory};
}

function collectDartFiles(root) {
  const files = [];
  for (const sourceRoot of productionRoots) {
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

  const result = scanRailContracts({
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
  console.log("Rail contract advisory:");
  console.log(`Files scanned: ${result.filesScanned}`);
  console.log(`Rail calls found: ${result.inventory.railCalls}`);
  console.log(`Full-bleed rail opt-ins: ${result.inventory.fullBleedOptIns}`);
  console.log(`High-confidence legacy chrome zeroings: ${result.counts.high}`);
  console.log(`Medium redundant divider flags: ${result.counts.medium}`);
  console.log(`Low inventory items: ${result.counts.low}`);

  for (const finding of result.findings.slice(0, maxRows)) {
    console.log(
      `- ${finding.level.toUpperCase()} ${finding.path}:${finding.line} ${finding.reason} (${finding.expression})`,
    );
  }
}

function printHelp() {
  console.log(`Usage:
  node tool/design/check_rail_contracts.mjs --summary [--max 40]
  node tool/design/check_rail_contracts.mjs --json

Reports rail callers that manually zero divider/header/list chrome instead of
using the CatchSection.horizontal/OrganizerAvatarRail embedded-default vs fullBleed
contract.
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

function valueAfter(args, flag) {
  const index = args.indexOf(flag);
  if (index < 0) return null;
  return args[index + 1] ?? null;
}

function lineForOffset(source, offset) {
  return source.slice(0, offset).split("\n").length;
}

function compactWhitespace(value) {
  return value.replace(/\s+/gu, " ").trim();
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
