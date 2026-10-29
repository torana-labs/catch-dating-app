#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {repoRoot} from "../lib/repo_paths.mjs";
import {isAppSharedWidgetSource} from "./lib/component_naming.mjs";

const generatedSuffixes = [".g.dart", ".freezed.dart", ".mocks.dart"];
const rawDividerPattern = /\b(?:Divider|VerticalDivider)\s*\(/gu;
const rawHairlineBoxPattern =
  /ColoredBox\s*\([\s\S]{0,220}CatchStroke\.hairline/gu;
const sectionCallPattern = /\bCatchSection\.divided\s*\(/gu;
const customFieldLeadingPattern =
  /\bCatchField(?:<[^>]+>)?\.(?:read|content|nav|action)\s*\(/gu;
const thinSectionWrapperPattern =
  /\bclass\s+([A-Za-z_]\w*)\s+extends\s+StatelessWidget\s*\{/gu;
const allowedRawDividerFiles = new Set([
  "packages/catch_ui/lib/src/primitives/catch_divider.dart",
  "packages/catch_ui/lib/src/components/catch_section.dart",
]);

const isCliEntrypoint =
  process.argv[1] != null &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCliEntrypoint) runCli();

export function scanSectionDividers({root = repoRoot} = {}) {
  const files = collectDartFiles(root);
  const findings = [];
  let scannedFiles = 0;
  for (const relativePath of files) {
    if (!isScannableDartFile(relativePath)) continue;
    const absolutePath = path.join(root, relativePath);
    if (!fs.existsSync(absolutePath)) continue;
    const source = fs.readFileSync(absolutePath, "utf8");
    scannedFiles += 1;
    findings.push(...scanSourceForSectionDividers({relativePath, source}));
  }

  findings.sort(compareFindings);
  return {
    filesScanned: scannedFiles,
    findings,
    counts: summarize(findings),
  };
}

export function scanSourceForSectionDividers({relativePath, source}) {
  const maskedSource = maskDartCommentsAndStrings(source);
  const findings = [];

  sectionCallPattern.lastIndex = 0;
  for (const match of maskedSource.matchAll(sectionCallPattern)) {
    const start = match.index ?? 0;
    const openParen = maskedSource.indexOf("(", start);
    const end = findBalancedClose(maskedSource, openParen);
    if (end == null) continue;
    const expression = source.slice(start, end + 1);
    if (/\binternalDividerColor\s*:/u.test(expression)) {
      findings.push({
        path: relativePath,
        line: lineForOffset(source, start),
        level: "high",
        rule: "SECTION-DIVIDER-001",
        reason:
          "CatchSection.divided row groups should use the default field-row divider role or internalDividerRole, not caller-owned internalDividerColor.",
        expression: compactWhitespace(expression),
      });
    }
  }

  customFieldLeadingPattern.lastIndex = 0;
  for (const match of maskedSource.matchAll(customFieldLeadingPattern)) {
    const start = match.index ?? 0;
    const openParen = maskedSource.indexOf("(", start);
    const end = findBalancedClose(maskedSource, openParen);
    if (end == null) continue;
    const expression = source.slice(start, end + 1);
    if (/\bleading\s*:/u.test(expression) && !/\bleadingExtent\s*:/u.test(expression)) {
      findings.push({
        path: relativePath,
        line: lineForOffset(source, start),
        level: "high",
        rule: "FIELD-LEADING-001",
        reason:
          "Custom CatchField leading content must declare leadingExtent so text lanes and section dividers share the same geometry.",
        expression: compactWhitespace(expression),
      });
    }
  }

  thinSectionWrapperPattern.lastIndex = 0;
  for (const match of maskedSource.matchAll(thinSectionWrapperPattern)) {
    const start = match.index ?? 0;
    const className = match[1];
    const openBrace = maskedSource.indexOf("{", start);
    const end = findBalancedBlock(maskedSource, openBrace, "{", "}");
    if (end == null) continue;
    const expression = source.slice(start, end + 1);
    const finding = classifyThinSectionWrapper({
      relativePath,
      className,
      source,
      line: lineForOffset(source, start),
      expression,
    });
    if (finding != null) findings.push(finding);
    const rowDividerFinding = classifyFeatureRowDividerOwnership({
      relativePath,
      className,
      line: lineForOffset(source, start),
      expression,
    });
    if (rowDividerFinding != null) findings.push(rowDividerFinding);
  }

  rawDividerPattern.lastIndex = 0;
  for (const match of maskedSource.matchAll(rawDividerPattern)) {
    const start = match.index ?? 0;
    const openParen = maskedSource.indexOf("(", start);
    const end = findBalancedClose(maskedSource, openParen);
    if (end == null) continue;
    const expression = source.slice(start, end + 1);
    const line = lineForOffset(source, start);
    findings.push(classifyRawDivider({relativePath, source, line, start, expression}));
  }

  rawHairlineBoxPattern.lastIndex = 0;
  for (const match of maskedSource.matchAll(rawHairlineBoxPattern)) {
    const start = match.index ?? 0;
    const expression = surroundingLines(source, lineForOffset(source, start), {
      before: 2,
      after: 4,
    });
    if (!/line|CatchOpacity\.(?:fieldRowDivider|profileInfoDivider|subtleBorder)/u.test(expression)) {
      continue;
    }
    findings.push(classifyHairlineBox({
      relativePath,
      source,
      line: lineForOffset(source, start),
      expression,
    }));
  }

  return findings.filter(Boolean);
}

function classifyFeatureRowDividerOwnership({
  relativePath,
  className,
  line,
  expression,
}) {
  if (isAppSharedWidgetSource(relativePath)) {
    return null;
  }
  if (!className.endsWith("Rows")) return null;
  if (!/\bCatchField(?:<[^>]+>)?\.(?:content|input|nav|read)\s*\(/u.test(expression)) {
    return null;
  }
  if (
    !/\bdivider\s*:\s*(?:[A-Za-z_]\w*\s*!=\s*[A-Za-z_]\w*\.first|[A-Za-z_]\w*\s*(?:>|!=)\s*0)\b/u.test(
      expression,
    )
  ) {
    return null;
  }
  return {
    path: relativePath,
    line,
    level: "high",
    rule: "SECTION-DIVIDER-002",
    reason:
      "Feature-local *Rows manually assigns sibling CatchField dividers; pass the rows directly to CatchSection.fieldRows so the section owns a single fieldSection divider role.",
    expression: `${className} owns per-sibling CatchField divider flags`,
  };
}

function classifyThinSectionWrapper({relativePath, className, line, expression}) {
  if (isAppSharedWidgetSource(relativePath)) {
    return null;
  }
  if (!className.endsWith("Section")) return null;
  if (!/\bCatchSection\.(?:divided|fieldRows)\s*\(/u.test(expression)) {
    return null;
  }
  if (!/\bfinal\s+List<Widget>\??\s+children\s*;/u.test(expression)) {
    return null;
  }
  if (!/\bchildren\s*:\s*children\b/u.test(expression)) return null;
  return {
    path: relativePath,
    line,
    level: "high",
    rule: "SECTION-WRAPPER-001",
    reason:
      "Feature-local section wrapper only forwards children into CatchSection; call CatchSection.fieldRows/divided directly or move the missing behavior into CatchSection.",
    expression: `${className} -> ${compactWhitespace(firstReturnOrAssignment(expression))}`,
  };
}

function classifyRawDivider({relativePath, source, line, start, expression}) {
  const context = surroundingLines(source, line, {before: 6, after: 3});
  if (isSkeletonFile(relativePath)) {
    return {
      path: relativePath,
      line,
      level: "low",
      rule: "SECTION-DIVIDER-001",
      reason:
        "Raw Divider appears in a loading skeleton; treat as visual skeleton geometry unless it becomes live row or section chrome.",
      expression: compactWhitespace(expression),
    };
  }
  if (/CatchOpacity\.darkHeroDivider/u.test(expression)) {
    return {
      path: relativePath,
      line,
      level: "low",
      rule: "SECTION-DIVIDER-001",
      reason:
        "Raw Divider uses the dark editorial hero divider token; keep as overlay chrome unless this becomes a standard row or section separator.",
      expression: compactWhitespace(expression),
    };
  }
  if (/CatchOpacity\.(?:profileInfoDivider|subtleBorder)/u.test(expression)) {
    return {
      path: relativePath,
      line,
      level: "high",
      rule: "SECTION-DIVIDER-001",
      reason:
        "Raw Divider uses a non-row divider opacity; use CatchDivider.fieldRow or a documented section/header primitive.",
      expression: compactWhitespace(expression),
    };
  }
  if (
    /CatchOpacity\.fieldRowDivider/u.test(expression) ||
    /class\s+\w*(?:Skeleton|Row|Tile|Section)\b/u.test(context)
  ) {
    return {
      path: relativePath,
      line,
      level: "medium",
      rule: "SECTION-DIVIDER-001",
      reason:
        "Raw row/list Divider candidate; prefer CatchDivider.fieldRow unless this is documented non-row chrome.",
      expression: compactWhitespace(expression),
    };
  }
  return {
    path: relativePath,
    line,
    level: allowedRawDividerFiles.has(relativePath) ? "low" : "medium",
    rule: "SECTION-DIVIDER-001",
    reason:
      "Raw Divider inventory; verify this is decorative/header chrome rather than a row or CatchSection divider.",
    expression: compactWhitespace(expression),
  };
}

function isSkeletonFile(relativePath) {
  return /(?:^|[/_])skeleton(?:s)?(?:_|\.|\/)/u.test(relativePath);
}

function classifyHairlineBox({relativePath, line, expression}) {
  if (/CatchOpacity\.(?:profileInfoDivider|subtleBorder)/u.test(expression)) {
    return {
      path: relativePath,
      line,
      level: "high",
      rule: "SECTION-DIVIDER-001",
      reason:
        "Raw hairline uses an old/non-row opacity; use CatchDivider.fieldRow or a documented section/header primitive.",
      expression: compactWhitespace(expression),
    };
  }
  if (/CatchOpacity\.fieldRowDivider/u.test(expression)) {
    return {
      path: relativePath,
      line,
      level: "medium",
      rule: "SECTION-DIVIDER-001",
      reason:
        "Raw field-row hairline candidate; prefer CatchDivider.fieldRow so color and height stay centralized.",
      expression: compactWhitespace(expression),
    };
  }
  return {
    path: relativePath,
    line,
    level: "low",
    rule: "SECTION-DIVIDER-001",
    reason:
      "Raw hairline inventory; verify this is decorative/header chrome rather than a row or CatchSection divider.",
    expression: compactWhitespace(expression),
  };
}

function collectDartFiles(root) {
  const files = [];
  for (const top of ["lib", "test", "widgetbook/lib"]) {
    const absolute = path.join(root, top);
    if (!fs.existsSync(absolute)) continue;
    walk(absolute, files, root);
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
  const result = scanSectionDividers({root});
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

function printSummary(result, {maxRows, includeLow}) {
  console.log("Section divider advisory:");
  console.log(`Files scanned: ${result.filesScanned}`);
  console.log(`High-confidence violations: ${result.counts.high}`);
  console.log(`Medium review candidates: ${result.counts.medium}`);
  console.log(`Low inventory items: ${result.counts.low}`);

  const rows = result.findings
    .filter((finding) => includeLow || finding.level !== "low")
    .slice(0, maxRows);
  for (const finding of rows) {
    console.log(
      `- ${finding.level.toUpperCase()} ${finding.path}:${finding.line} ${finding.reason} (${finding.expression})`,
    );
  }
}

function printHelp() {
  console.log(`Usage:
  node tool/design/check_section_dividers.mjs --summary [--max 40] [--include-low]
  node tool/design/check_section_dividers.mjs --json

Reports raw divider and section-row divider patterns that should route through
CatchDivider or CatchSection divider roles, plus custom CatchField leading
content whose text-lane extent is not declared.
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

function surroundingLines(source, line, {before, after}) {
  const lines = source.split("\n");
  const start = Math.max(0, line - 1 - before);
  const end = Math.min(lines.length, line + after);
  return lines.slice(start, end).join("\n");
}

function compactWhitespace(value) {
  return value.replace(/\s+/gu, " ").trim();
}

function findBalancedClose(source, openParenIndex) {
  return findBalancedBlock(source, openParenIndex, "(", ")");
}

function findBalancedBlock(source, openIndex, openChar, closeChar) {
  if (openIndex < 0) return null;
  let depth = 0;
  for (let index = openIndex; index < source.length; index += 1) {
    const char = source[index];
    if (char === openChar) depth += 1;
    if (char === closeChar) {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return null;
}

function firstReturnOrAssignment(source) {
  const returnMatch = source.match(/\breturn\s+CatchSection\.(?:divided|fieldRows)\s*\([\s\S]{0,240}/u);
  if (returnMatch != null) return returnMatch[0];
  const assignmentMatch = source.match(/=\s*CatchSection\.(?:divided|fieldRows)\s*\([\s\S]{0,240}/u);
  return assignmentMatch?.[0] ?? source.slice(0, 240);
}

function maskDartCommentsAndStrings(source) {
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
      while (index < source.length && !(source[index] === "*" && source[index + 1] === "/")) {
        output += source[index] === "\n" ? "\n" : " ";
        index += 1;
      }
      if (index < source.length) output += "  ";
      index += 1;
      continue;
    }
    if (char === "\"" || char === "'") {
      const quote = char;
      output += " ";
      while (++index < source.length) {
        const current = source[index];
        output += current === "\n" ? "\n" : " ";
        if (current === "\\" && index + 1 < source.length) {
          index += 1;
          output += source[index] === "\n" ? "\n" : " ";
          continue;
        }
        if (current === quote) break;
      }
      continue;
    }
    output += char;
  }
  return output;
}
