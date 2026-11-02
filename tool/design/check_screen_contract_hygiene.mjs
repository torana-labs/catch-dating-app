#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {fromRepo, relativeToRepo, repoRoot} from "../lib/repo_paths.mjs";
import {isAppSharedWidgetSource} from "./lib/component_naming.mjs";

const screenContractsPath = fromRepo("design/screens/catch.screens.json");

const args = process.argv.slice(2);
const command = args[0] ?? "--help";
const maxRows = Number(valueAfter(args, "--max") ?? 25);


const rawMaterialPatterns = [
  /\bElevatedButton\b/gu,
  /\bOutlinedButton\b/gu,
  /\bTextButton\b/gu,
  /\bIconButton\b/gu,
  /\bFloatingActionButton\b/gu,
  /\bCard\b/gu,
  /\bListTile\b/gu,
  /\bChip\b/gu,
  /\bChoiceChip\b/gu,
  /\bFilterChip\b/gu,
  /\bTextField\b/gu,
  /\bDropdownButton\b/gu,
  /\bSwitch\b/gu,
  /\bSlider\b/gu,
  /\bSnackBar\b/gu,
  /\bAlertDialog\b/gu,
  /\bBottomSheet\b/gu,
];

const handRolledValuePatterns = [
  /\bColors\.[A-Za-z0-9_]+\b/gu,
  /\bTextStyle\s*\(/gu,
  /\bEdgeInsets(?:Directional)?\.(?:all|only|symmetric|fromLTRB)\s*\(\s*\d/gu,
  /\bBorderRadius\.(?:circular|only|vertical|horizontal)\s*\(\s*\d/gu,
  /\bSizedBox\s*\(\s*(?:height|width):\s*\d/gu,
];

if (command === "--help" || command === "-h" || command === "help") {
  printHelp();
} else if (command === "--summary" || command === "summary" || command === "--check" || command === "check") {
  printSummary();
} else {
  console.error(`Unknown command: ${command}`);
  printHelp();
  process.exit(64);
}

function printSummary() {
  const files = collectContractFiles();
  const findings = [];

  for (const file of files) {
    const absolute = fromRepo(file);
    if (
      !fs.existsSync(absolute) ||
      !file.endsWith(".dart") ||
      isPrimitiveImplementation(file)
    ) {
      continue;
    }
    const source = fs.readFileSync(absolute, "utf8");
    const maskedSource = maskDartCommentsAndStrings(source);
    const rawMaterial = collectMatches(maskedSource, rawMaterialPatterns);
    const handRolledValue = collectMatches(maskedSource, handRolledValuePatterns, {
      ignoreMatch: (match) => match === "Colors.transparent",
    });
    const rawMaterialCount = rawMaterial.count;
    const handRolledValueCount = handRolledValue.count;
    if (rawMaterialCount === 0 && handRolledValueCount === 0) continue;
    findings.push({
      file,
      rawMaterialCount,
      handRolledValueCount,
      rawMaterialSamples: rawMaterial.samples,
      handRolledValueSamples: handRolledValue.samples,
      total: rawMaterialCount + handRolledValueCount,
    });
  }

  findings.sort((a, b) => b.total - a.total || a.file.localeCompare(b.file));
  console.log(
    [
      "Screen contract hygiene advisory:",
      `Files scanned: ${files.size}`,
      `Files with findings: ${findings.length}`,
      `Raw Material/control findings: ${sum(findings, "rawMaterialCount")}`,
      `Hand-rolled visual value findings: ${sum(findings, "handRolledValueCount")}`,
    ].join("\n")
  );

  for (const finding of findings.slice(0, maxRows)) {
    const sampleText = formatSamples(finding);
    console.log(
      `- ${finding.file}: ${finding.rawMaterialCount} raw controls, ${finding.handRolledValueCount} visual values${sampleText}`
    );
  }
  if (findings.length > maxRows) {
    console.log(`- ... ${findings.length - maxRows} more files omitted; rerun with --max ${findings.length}.`);
  }
}

function collectContractFiles() {
  const files = new Set();
  const screenContracts = readJson(screenContractsPath);

  for (const screen of screenContracts.screens ?? []) {
    addBinding(files, screen.source);
    for (const binding of screen.stateController?.files ?? []) addBinding(files, binding);
    for (const binding of screen.stateController?.mutationOwners ?? []) addBinding(files, binding);
    for (const section of screen.composition?.sections ?? []) addBinding(files, section.flutter);
  }
  return files;
}

function addBinding(files, binding) {
  if (binding?.file) files.add(binding.file);
}

function isPrimitiveImplementation(file) {
  return isAppSharedWidgetSource(file);
}

function collectMatches(source, patterns, {ignoreMatch = () => false} = {}) {
  let count = 0;
  const samples = [];
  const lines = source.split("\n");
  for (const pattern of patterns) {
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
      pattern.lastIndex = 0;
      for (const match of lines[lineIndex].matchAll(pattern)) {
        const value = match[0];
        if (ignoreMatch(value)) continue;
        count += 1;
        if (samples.length < 3) {
          samples.push({line: lineIndex + 1, value});
        }
      }
    }
  }
  return {count, samples};
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
  let index = start;
  const endQuoteCount = triple ? 3 : 1;
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

function formatSamples(finding) {
  const parts = [];
  if (finding.rawMaterialSamples.length > 0) {
    parts.push(`raw ${formatSampleList(finding.rawMaterialSamples)}`);
  }
  if (finding.handRolledValueSamples.length > 0) {
    parts.push(`values ${formatSampleList(finding.handRolledValueSamples)}`);
  }
  return parts.length === 0 ? "" : ` (${parts.join("; ")})`;
}

function formatSampleList(samples) {
  return samples.map((sample) => `L${sample.line}:${sample.value}`).join(", ");
}

function sum(values, key) {
  return values.reduce((total, value) => total + value[key], 0);
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    console.error(`Failed to parse ${path.relative(repoRoot, file)}: ${error.message}`);
    process.exit(1);
  }
}

function valueAfter(values, flag) {
  const index = values.indexOf(flag);
  if (index === -1) return null;
  return values[index + 1] ?? null;
}

function printHelp() {
  console.log(`Usage:
  node tool/design/check_screen_contract_hygiene.mjs --summary [--max 25]

Advisory scanner for contracted screen implementation files. Reports raw
Material controls and hand-rolled visual values that should be migrated toward
registered Catch primitives, tokens, sections, and adapters.`);
}
