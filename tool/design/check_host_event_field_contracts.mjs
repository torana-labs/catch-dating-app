#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {repoRoot} from "../lib/repo_paths.mjs";

const generatedSuffixes = [".g.dart", ".freezed.dart", ".mocks.dart"];
const activityChoicePattern =
  /\bCatchField\s*<\s*(ActivityKind|PaceLevel|EventInteractionModel)\s*>\s*\.choices\s*\(/gu;
const accordionPattern = /\bCatchAccordionController\s*\(/gu;
const eventDisclosurePaths = [
  "lib/hosts/presentation/event_management/",
  "lib/hosts/create/",
];

const isCliEntrypoint =
  process.argv[1] != null &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCliEntrypoint) runCli();

export function scanHostEventFieldContracts({root = repoRoot} = {}) {
  const findings = [];
  let filesScanned = 0;
  const hostRoot = path.join(root, "lib/hosts");
  if (!fs.existsSync(hostRoot)) return {filesScanned, findings};

  for (const relativePath of collectDartFiles(hostRoot, root)) {
    const source = fs.readFileSync(path.join(root, relativePath), "utf8");
    filesScanned += 1;
    findings.push(...scanHostEventFieldSource({relativePath, source}));
  }

  findings.sort(
    (a, b) => a.path.localeCompare(b.path) || a.line - b.line,
  );
  return {filesScanned, findings};
}

export function scanHostEventFieldSource({relativePath, source}) {
  const maskedSource = maskDartCommentsAndStrings(source);
  const findings = [];

  activityChoicePattern.lastIndex = 0;
  for (const match of maskedSource.matchAll(activityChoicePattern)) {
    const start = match.index ?? 0;
    const openParen = maskedSource.indexOf("(", start);
    const end = findBalancedClose(maskedSource, openParen);
    if (end == null) continue;
    const expression = maskedSource.slice(start, end + 1);
    if (/\bitemAccentBuilder\s*:/u.test(expression)) continue;
    findings.push({
      path: relativePath,
      line: lineForOffset(source, start),
      rule: "HOST-EVENT-FIELD-001",
      reason: `${match[1]} choices must provide itemAccentBuilder so event activity color survives shared-field refactors.`,
    });
  }

  if (eventDisclosurePaths.some((ownedPath) => relativePath.startsWith(ownedPath))) {
    for (const match of maskedSource.matchAll(/\bdisclosureMode\s*:\s*CatchFieldMode\s*\.\s*(?:localExpanded|controlledExpanded)\b/gu)) {
      findings.push({
        path: relativePath,
        line: lineForOffset(source, match.index ?? 0),
        rule: "HOST-EVENT-FIELD-002",
        reason:
          "Event create/edit disclosures must start collapsed; open them only from explicit host interaction.",
      });
    }

    accordionPattern.lastIndex = 0;
    for (const match of maskedSource.matchAll(accordionPattern)) {
      const start = match.index ?? 0;
      const openParen = maskedSource.indexOf("(", start);
      const end = findBalancedClose(maskedSource, openParen);
      if (end == null) continue;
      const expression = source.slice(start, end + 1);
      if (!/\binitialExpanded\s*:/u.test(expression)) continue;
      findings.push({
        path: relativePath,
        line: lineForOffset(source, start),
        rule: "HOST-EVENT-FIELD-002",
        reason:
          "Event create/edit accordions must not seed an expanded field on route entry.",
      });
    }
  }

  return findings;
}

function runCli() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`Usage:
  node tool/design/check_host_event_field_contracts.mjs --check
  node tool/design/check_host_event_field_contracts.mjs --json

Enforces collapsed event create/edit disclosures and activity-colored event
choice fields across Host call sites.
`);
    return;
  }

  const result = scanHostEventFieldContracts({
    root: valueAfter(args, "--root") ?? repoRoot,
  });
  if (args.includes("--json")) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log("Host event field contracts:");
    console.log(`Files scanned: ${result.filesScanned}`);
    console.log(`Violations: ${result.findings.length}`);
    for (const finding of result.findings) {
      console.log(
        `- ${finding.path}:${finding.line} ${finding.rule} ${finding.reason}`,
      );
    }
  }
  if (result.findings.length > 0) process.exit(1);
}

function collectDartFiles(directory, root) {
  const files = [];
  walk(directory, files, root);
  return files
    .filter(
      (relativePath) =>
        !generatedSuffixes.some((suffix) => relativePath.endsWith(suffix)) &&
        !relativePath.includes("/generated/"),
    )
    .sort();
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

function findBalancedClose(source, openParenIndex) {
  if (openParenIndex < 0) return null;
  let depth = 0;
  for (let index = openParenIndex; index < source.length; index += 1) {
    if (source[index] === "(") depth += 1;
    if (source[index] === ")") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return null;
}

function lineForOffset(source, offset) {
  return source.slice(0, offset).split("\n").length;
}

function valueAfter(args, flag) {
  const index = args.indexOf(flag);
  return index < 0 ? null : (args[index + 1] ?? null);
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
