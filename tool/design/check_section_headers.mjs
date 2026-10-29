#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {repoRoot} from "../lib/repo_paths.mjs";
import {isAppSharedWidgetSource} from "./lib/component_naming.mjs";

const generatedSuffixes = [".g.dart", ".freezed.dart", ".mocks.dart"];
const sectionCallPattern =
  /\bCatchSection\.(?:divided|fieldRows|contained|containedFieldRows|containedFieldGroups|plain)\s*\(/gu;
const sectionHeaderCallPattern = /\bCatchSectionHeader\s*\(/gu;
const adjacentSectionCallPattern =
  /^(?:const\s+)?CatchSection\.(?:divided|fieldRows|contained|containedFieldRows|containedFieldGroups|plain)\s*\(/u;
const widgetClassPattern =
  /\bclass\s+([A-Za-z_]\w*)\s+extends\s+(?:StatelessWidget|ConsumerWidget|StatefulWidget|ConsumerStatefulWidget)\s*\{/gu;
const headerTextPattern =
  /\bText\s*\(\s*(?:const\s+)?(["'])([^"'\n]{2,96})\1[\s\S]{0,260}?\bstyle\s*:\s*CatchTextStyles\.(titleL|sectionTitle|kicker|kickerLg)\s*\(/gu;
const sectionHeaderPattern =
  /\bCatchSectionHeader\s*\([\s\S]{0,260}?\btitle\s*:\s*(["'])([^"'\n]{2,96})\1/gu;
const kickerPattern =
  /\bCatchKickerText\s*\([\s\S]{0,260}?\blabel\s*:\s*(["'])([^"'\n]{2,96})\1/gu;
const classInstantiationPattern = /\b([A-Z][A-Za-z0-9_]*)\s*\(/gu;
const headerFlagFieldPattern = /\bfinal\s+bool\s+(showHeader|showTitle)\s*;/gu;


const isCliEntrypoint =
  process.argv[1] != null &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCliEntrypoint) runCli();

export function scanSectionHeaders({root = repoRoot} = {}) {
  const files = collectDartFiles(root).filter(isScannableDartFile);
  const sources = new Map();
  const classMap = new Map();
  const findings = [];

  for (const relativePath of files) {
    const absolutePath = path.join(root, relativePath);
    if (!fs.existsSync(absolutePath)) continue;
    const source = fs.readFileSync(absolutePath, "utf8");
    sources.set(relativePath, source);
    for (const info of collectWidgetClasses({relativePath, source})) {
      classMap.set(info.className, info);
    }
  }

  const propagatedHeaders = buildPropagatedHeaderMap(classMap);
  const headerFlagInventory = collectHeaderFlagInventory(classMap);

  for (const [relativePath, source] of sources) {
    findings.push(
      ...scanSourceForSectionHeaders({
        relativePath,
        source,
        classMap,
        propagatedHeaders,
      }),
    );
  }
  findings.push(...headerFlagInventory.findings);

  findings.sort(compareFindings);
  return {
    filesScanned: sources.size,
    findings,
    counts: summarize(findings),
    headerFlagInventory: {
      count: headerFlagInventory.widgets.length,
      widgets: headerFlagInventory.widgets,
    },
  };
}

export function scanSourceForSectionHeaders({
  relativePath,
  source,
  classMap = new Map(),
  propagatedHeaders = new Map(),
}) {
  const commentStripped = stripDartCommentsPreserveLength(source);
  const findings = [];

  sectionCallPattern.lastIndex = 0;
  for (const match of commentStripped.matchAll(sectionCallPattern)) {
    const start = match.index ?? 0;
    const openParen = commentStripped.indexOf("(", start);
    const end = findBalancedClose(commentStripped, openParen);
    if (end == null) continue;

    const expression = source.slice(start, end + 1);
    const title = extractTopLevelStringArgument(expression, "title");
    if (title == null) continue;

    const duplicates = collectDuplicateHeaders({
      ownerTitle: title,
      expression,
      source,
      offset: start,
      classMap,
      propagatedHeaders,
    });
    for (const duplicate of duplicates) {
      findings.push({
        path: relativePath,
        line: lineForOffset(source, start),
        level: "high",
        rule: "SECTION-HEADER-001",
        reason:
          "CatchSection already owns this section title; nested content should render body/state only or opt out of its own header.",
        expression: `${title} duplicated by ${duplicate}`,
      });
    }
  }

  sectionHeaderCallPattern.lastIndex = 0;
  for (const match of commentStripped.matchAll(sectionHeaderCallPattern)) {
    const start = match.index ?? 0;
    const openParen = commentStripped.indexOf("(", start);
    const end = findBalancedClose(commentStripped, openParen);
    if (end == null) continue;

    const adjacentSection = findAdjacentUntitledSection({
      source,
      commentStripped,
      cursor: end + 1,
    });
    if (adjacentSection == null) continue;

    findings.push({
      path: relativePath,
      line: lineForOffset(source, start),
      level: "high",
      rule: "SECTION-HEADER-004",
      reason:
        "A standalone CatchSectionHeader immediately followed by an untitled CatchSection hand-rolls section title and spacing ownership; move title, trailing, and count into the CatchSection constructor.",
      expression: `CatchSectionHeader followed by ${adjacentSection.constructor} without title`,
    });
  }

  for (const info of collectWidgetClasses({relativePath, source})) {
    if (
      info.className.endsWith("Card") &&
      !isPrimitiveImplementation(relativePath) &&
      /\bCatchSurface(?:\.card|\.message|\.tinted)?\s*\(/u.test(info.source) &&
      /\bCatchSectionHeader\s*\(/u.test(info.source) &&
      /\b(?:CatchButton|CatchField|CatchErrorState|CatchBanner|Text)\s*(?:\.|\()/u.test(
        info.source,
      )
    ) {
      findings.push({
        path: relativePath,
        line: info.line,
        level: "medium",
        rule: "SECTION-HEADER-005",
        reason:
          "Feature-local *Card hand-rolls a CatchSurface plus CatchSectionHeader around section-like body or actions; verify the card is an object, or move title, trailing, body, and actions into CatchSection.contained.",
        expression: `${info.className} owns CatchSurface and CatchSectionHeader chrome`,
      });
    }

    if (!info.className.endsWith("Section")) continue;
    if (
      /\bCatchSection\.(?:divided|fieldRows|contained|containedFieldRows|containedFieldGroups|plain)\s*\(/u.test(
        info.source,
      )
    ) {
      continue;
    }
    const ownsParallelSectionShell =
      /\bfinal\s+String\??\s+(?:label|title)\s*;/u.test(info.source) &&
      /\bfinal\s+Widget\s+child\s*;/u.test(info.source) &&
      /\bCatchKickerText\s*\(/u.test(info.source);
    if (ownsParallelSectionShell) {
      findings.push({
        path: relativePath,
        line: info.line,
        level: "high",
        rule: "SECTION-HEADER-003",
        reason:
          "A thin label-plus-child section shell owns CatchKickerText chrome outside CatchSection; absorb the shell into the canonical CatchSection contract.",
        expression: `${info.className} duplicates CatchSection label and body ownership`,
      });
      continue;
    }
    if (isPrimitiveImplementation(relativePath)) continue;
    if (!/\bCatchSurface(?:\.card|\.message|\.tinted)?\s*\(/u.test(info.source)) {
      continue;
    }
    const localTitle = info.directHeaders.find((header) =>
      ["titleL", "sectionTitle", "CatchSectionHeader"].includes(header.kind),
    );
    if (localTitle == null) continue;
    findings.push({
      path: relativePath,
      line: info.line,
      level: "medium",
      rule: "SECTION-HEADER-001",
      reason:
        "Feature-local *Section renders a titled CatchSurface without CatchSection; verify this is a card/content primitive or move the shell/title ownership into CatchSection.",
      expression: `${info.className} renders "${localTitle.title}" via ${localTitle.kind}`,
    });
  }

  return dedupeFindings(findings);
}

function findAdjacentUntitledSection({source, commentStripped, cursor}) {
  cursor = skipSiblingSeparators(commentStripped, cursor);
  while (true) {
    const gapMatch = commentStripped
      .slice(cursor)
      .match(/^gapH[A-Za-z0-9_]*\b/u);
    if (gapMatch != null) {
      cursor += gapMatch[0].length;
      cursor = skipSiblingSeparators(commentStripped, cursor);
      continue;
    }

    const sizedBoxMatch = commentStripped
      .slice(cursor)
      .match(/^(?:const\s+)?SizedBox\s*\(/u);
    if (sizedBoxMatch == null) break;
    const openParen = commentStripped.indexOf("(", cursor);
    const end = findBalancedClose(commentStripped, openParen);
    if (end == null) break;
    const expression = source.slice(cursor, end + 1);
    if (
      !hasTopLevelNamedArgument(expression, "height") ||
      hasTopLevelNamedArgument(expression, "child")
    ) {
      break;
    }
    cursor = skipSiblingSeparators(commentStripped, end + 1);
  }

  const sectionMatch = commentStripped.slice(cursor).match(adjacentSectionCallPattern);
  if (sectionMatch == null) return null;
  const openParen = commentStripped.indexOf("(", cursor);
  const end = findBalancedClose(commentStripped, openParen);
  if (end == null) return null;
  const expression = source.slice(cursor, end + 1);
  if (hasTopLevelNamedArgument(expression, "title")) return null;

  const constructor = sectionMatch[0].trim().replace(/\s*\($/u, "");
  return {constructor};
}

function skipSiblingSeparators(source, cursor) {
  while (cursor < source.length && /[\s,]/u.test(source[cursor])) cursor += 1;
  return cursor;
}

function collectDuplicateHeaders({
  ownerTitle,
  expression,
  classMap,
  propagatedHeaders,
}) {
  const ownerKey = normalizeTitle(ownerTitle);
  const duplicates = [];

  for (const header of collectHeaderLiterals(expression)) {
    if (normalizeTitle(header.title) === ownerKey) {
      duplicates.push(`inline ${header.kind}`);
    }
  }

  for (const instance of collectClassInstantiations(expression, classMap)) {
    const headers = propagatedHeaders.get(instance.className) ?? [];
    for (const header of headers) {
      if (normalizeTitle(header.title) === ownerKey) {
        duplicates.push(`${instance.className}.${header.kind}`);
      }
    }
  }

  return [...new Set(duplicates)];
}

function collectWidgetClasses({relativePath, source}) {
  const commentStripped = stripDartCommentsPreserveLength(source);
  const classes = [];
  widgetClassPattern.lastIndex = 0;
  for (const match of commentStripped.matchAll(widgetClassPattern)) {
    const start = match.index ?? 0;
    const openBrace = commentStripped.indexOf("{", start);
    const end = findBalancedBlock(commentStripped, openBrace, "{", "}");
    if (end == null) continue;
    const classSource = source.slice(start, end + 1);
    classes.push({
      className: match[1],
      relativePath,
      line: lineForOffset(source, start),
      source: classSource,
      directHeaders: collectHeaderLiterals(classSource),
    });
  }
  return classes;
}

function buildPropagatedHeaderMap(classMap) {
  const memo = new Map();
  const collect = (className, seen = new Set()) => {
    if (memo.has(className)) return memo.get(className);
    if (seen.has(className)) return [];
    const info = classMap.get(className);
    if (info == null) return [];

    seen.add(className);
    const headers = [...info.directHeaders];
    for (const instance of collectClassInstantiations(info.source, classMap)) {
      headers.push(...collect(instance.className, seen));
    }
    seen.delete(className);

    const unique = uniqueHeaders(headers);
    memo.set(className, unique);
    return unique;
  };

  for (const className of classMap.keys()) collect(className);
  return memo;
}

function collectClassInstantiations(source, classMap) {
  const commentStripped = stripDartCommentsPreserveLength(source);
  const instances = [];
  classInstantiationPattern.lastIndex = 0;
  for (const match of commentStripped.matchAll(classInstantiationPattern)) {
    const className = match[1];
    if (!classMap.has(className)) continue;
    const start = match.index ?? 0;
    const openParen = commentStripped.indexOf("(", start);
    const end = findBalancedClose(commentStripped, openParen);
    if (end == null) continue;
    const expression = source.slice(start, end + 1);
    if (/\bshow(?:Header|Title)\s*:\s*false\b/u.test(expression)) continue;
    instances.push({className, expression});
  }
  return instances;
}

function collectHeaderLiterals(source) {
  const headers = [];
  for (const pattern of [headerTextPattern, sectionHeaderPattern, kickerPattern]) {
    pattern.lastIndex = 0;
    for (const match of source.matchAll(pattern)) {
      const styleKind = pattern === headerTextPattern ? match[3] : null;
      headers.push({
        title: match[2],
        kind:
          styleKind ??
          (pattern === sectionHeaderPattern ? "CatchSectionHeader" : "CatchKickerText"),
      });
    }
  }
  return uniqueHeaders(headers);
}

function collectHeaderFlagInventory(classMap) {
  const widgets = [];
  const findings = [];

  for (const info of classMap.values()) {
    const flags = collectDeclaredHeaderFlags(info);
    if (flags.length === 0) continue;

    widgets.push({
      className: info.className,
      path: info.relativePath,
      line: info.line,
      flags,
    });
    findings.push({
      path: info.relativePath,
      line: info.line,
      level: "low",
      rule: "SECTION-HEADER-002",
      reason:
        "Widget exposes a showHeader/showTitle content-only flag; keep an eye on whether this should become an extracted content-only child.",
      expression: `${info.className} declares ${flags.join(", ")}`,
    });
  }

  widgets.sort(
    (a, b) =>
      a.path.localeCompare(b.path) ||
      a.line - b.line ||
      a.className.localeCompare(b.className),
  );
  findings.sort(compareFindings);
  return {widgets, findings};
}

function collectDeclaredHeaderFlags(info) {
  const flags = new Set();
  headerFlagFieldPattern.lastIndex = 0;
  for (const match of info.source.matchAll(headerFlagFieldPattern)) {
    const flagName = match[1];
    if (constructorDeclaresParameter(info, flagName)) {
      flags.add(flagName);
    }
  }
  return [...flags].sort();
}

function constructorDeclaresParameter(info, flagName) {
  const pattern = new RegExp(`\\b(?:const\\s+)?${info.className}\\s*\\(`, "gu");
  const commentStripped = stripDartCommentsPreserveLength(info.source);
  pattern.lastIndex = 0;
  for (const match of commentStripped.matchAll(pattern)) {
    const start = match.index ?? 0;
    const openParen = commentStripped.indexOf("(", start);
    const end = findBalancedClose(commentStripped, openParen);
    if (end == null) continue;
    const constructorSource = info.source.slice(start, end + 1);
    if (
      new RegExp(`\\bthis\\.${flagName}\\b`, "u").test(constructorSource) ||
      new RegExp(`\\bbool\\s+${flagName}\\b`, "u").test(constructorSource)
    ) {
      return true;
    }
  }
  return false;
}

function extractTopLevelStringArgument(expression, name) {
  const openParen = expression.indexOf("(");
  const closeParen = expression.lastIndexOf(")");
  if (openParen < 0 || closeParen < openParen) return null;

  let depth = 0;
  let quote = null;
  for (let index = openParen + 1; index < closeParen; index += 1) {
    const char = expression[index];
    if (quote != null) {
      if (char === "\\" && index + 1 < closeParen) {
        index += 1;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }
    if (char === "\"" || char === "'") {
      quote = char;
      continue;
    }
    if (char === "(" || char === "[" || char === "{") depth += 1;
    if (char === ")" || char === "]" || char === "}") depth -= 1;
    if (depth !== 0) continue;

    if (!startsNamedArgument(expression, index, name)) continue;
    let valueStart = index + name.length + 1;
    while (/\s/u.test(expression[valueStart] ?? "")) valueStart += 1;
    const quoteChar = expression[valueStart];
    if (quoteChar !== "\"" && quoteChar !== "'") return null;
    let value = "";
    for (let cursor = valueStart + 1; cursor < closeParen; cursor += 1) {
      const current = expression[cursor];
      if (current === "\\" && cursor + 1 < closeParen) {
        value += expression[cursor + 1];
        cursor += 1;
        continue;
      }
      if (current === quoteChar) return value;
      value += current;
    }
  }
  return null;
}

function hasTopLevelNamedArgument(expression, name) {
  const openParen = expression.indexOf("(");
  const closeParen = expression.lastIndexOf(")");
  if (openParen < 0 || closeParen < openParen) return false;

  let depth = 0;
  let quote = null;
  for (let index = openParen + 1; index < closeParen; index += 1) {
    const char = expression[index];
    if (quote != null) {
      if (char === "\\" && index + 1 < closeParen) {
        index += 1;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }
    if (char === "\"" || char === "'") {
      quote = char;
      continue;
    }
    if (char === "(" || char === "[" || char === "{") depth += 1;
    if (char === ")" || char === "]" || char === "}") depth -= 1;
    if (depth === 0 && startsNamedArgument(expression, index, name)) return true;
  }
  return false;
}

function startsNamedArgument(expression, index, name) {
  if (expression.slice(index, index + name.length) !== name) return false;
  const previous = expression[index - 1];
  const next = expression[index + name.length];
  if (previous && /[A-Za-z0-9_$]/u.test(previous)) return false;
  if (next !== ":") return false;
  return true;
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

function isPrimitiveImplementation(relativePath) {
  return isAppSharedWidgetSource(relativePath);
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

  const result = scanSectionHeaders({root: valueAfter(args, "--root") ?? repoRoot});
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
  const headerFlagInventory = result.headerFlagInventory ?? {
    count: 0,
    widgets: [],
  };
  console.log("Section header ownership advisory:");
  console.log(`Files scanned: ${result.filesScanned}`);
  console.log(`High-confidence section ownership violations: ${result.counts.high}`);
  console.log(`Medium section/card review candidates: ${result.counts.medium}`);
  console.log(`Low inventory items: ${result.counts.low}`);
  console.log(`Header flag widget classes: ${headerFlagInventory.count}`);
  for (const item of headerFlagInventory.widgets.slice(0, maxRows)) {
    console.log(
      `  - ${item.className} (${item.flags.join(", ")}) ${item.path}:${item.line}`,
    );
  }
  if (headerFlagInventory.count > maxRows) {
    console.log(
      `  ... ${headerFlagInventory.count - maxRows} more header flag widgets omitted by --max`,
    );
  }
  if (headerFlagInventory.count >= 3) {
    console.log(
      "Advisory: showHeader/showTitle flags have reached 3+ widgets; consider extracting content-only children before adding more.",
    );
  }

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
  node tool/design/check_section_headers.mjs --summary [--max 40]
  node tool/design/check_section_headers.mjs --json

Reports duplicate section headers, standalone header-plus-section shells, and
feature-local titled section/card shells that should route title ownership
through CatchSection or a documented card primitive.
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

function dedupeFindings(findings) {
  const seen = new Set();
  const unique = [];
  for (const finding of findings) {
    const key = `${finding.path}:${finding.line}:${finding.rule}:${finding.expression}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(finding);
  }
  return unique;
}

function uniqueHeaders(headers) {
  const seen = new Set();
  const unique = [];
  for (const header of headers) {
    const key = `${normalizeTitle(header.title)}:${header.kind}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(header);
  }
  return unique;
}

function normalizeTitle(value) {
  return value.trim().replace(/\s+/gu, " ").toLowerCase();
}

function valueAfter(args, flag) {
  const index = args.indexOf(flag);
  if (index < 0) return null;
  return args[index + 1] ?? null;
}

function lineForOffset(source, offset) {
  return source.slice(0, offset).split("\n").length;
}

function findBalancedClose(source, openParenIndex) {
  return findBalancedBlock(source, openParenIndex, "(", ")");
}

function findBalancedBlock(source, openIndex, openChar, closeChar) {
  if (openIndex < 0) return null;
  let depth = 0;
  let quote = null;
  for (let index = openIndex; index < source.length; index += 1) {
    const char = source[index];
    if (quote != null) {
      if (char === "\\" && index + 1 < source.length) {
        index += 1;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }
    if (char === "\"" || char === "'") {
      quote = char;
      continue;
    }
    if (char === openChar) depth += 1;
    if (char === closeChar) {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return null;
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
