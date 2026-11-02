#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {screenSourceRoots} from "../lib/flutter_source_roots.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const defaultRepoRoot = path.resolve(path.dirname(scriptPath), "../..");
const defaultRegistryPath =
  "docs/design_parity/widget_consolidation/pattern_families.json";
const widgetbookPath = "widgetbook/lib/main.directories.g.dart";

const priorities = new Set(["P0", "P1", "P2"]);
const statuses = new Set([
  "draft",
  "review",
  "approved",
  "implemented",
  "blocked",
]);
const dispositions = new Set([
  "canonical",
  "repair",
  "unify",
  "register",
  "discard",
]);
const previewStates = new Set([
  "required",
  "source-only",
  "not-applicable",
]);
const decidedStatuses = new Set(["approved", "implemented"]);
const targetDispositions = new Set(["repair", "unify"]);
const kebabCase = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

export function validatePatternFamilies(registry, evidence = {}) {
  const errors = [];
  if (!isObject(registry)) {
    return ["registry must be a JSON object"];
  }
  if (registry.schemaVersion !== 1) {
    errors.push("schemaVersion must be 1");
  }
  if (!Array.isArray(registry.families) || registry.families.length === 0) {
    errors.push("families must be a nonempty array");
    return errors.sort();
  }

  const familyIds = new Set();
  for (const [familyIndex, family] of registry.families.entries()) {
    const prefix = `families[${familyIndex}]`;
    if (!isObject(family)) {
      errors.push(`${prefix} must be an object`);
      continue;
    }

    requireNonemptyString(family, "id", prefix, errors);
    requireNonemptyString(family, "title", prefix, errors);
    requireNonemptyString(family, "intent", prefix, errors);
    requireNonemptyString(family, "targetContract", prefix, errors);
    requireNonemptyString(family, "qualityReference", prefix, errors);
    requireString(family, "decisionSource", prefix, errors);
    requireStringArray(family, "acceptedVisualDelta", prefix, errors);
    validateReviewQuestions(family, prefix, errors);

    if (typeof family.id === "string" && family.id.trim() !== "") {
      if (!kebabCase.test(family.id)) {
        errors.push(`${prefix}.id must be stable kebab-case; found '${family.id}'`);
      }
      if (familyIds.has(family.id)) {
        errors.push(`${prefix}.id duplicates family id '${family.id}'`);
      }
      familyIds.add(family.id);
    }
    if (!priorities.has(family.priority)) {
      errors.push(
        `${prefix}.priority must be one of ${formatAllowed(priorities)}; found ${formatValue(family.priority)}`,
      );
    }
    if (!statuses.has(family.status)) {
      errors.push(
        `${prefix}.status must be one of ${formatAllowed(statuses)}; found ${formatValue(family.status)}`,
      );
    }
    if (decidedStatuses.has(family.status)) {
      if (!isNonemptyString(family.decisionSource)) {
        errors.push(`${prefix}.decisionSource is required when status is '${family.status}'`);
      }
      if (
        !Array.isArray(family.acceptedVisualDelta) ||
        family.acceptedVisualDelta.length === 0
      ) {
        errors.push(
          `${prefix}.acceptedVisualDelta is required when status is '${family.status}'`,
        );
      }
    }

    if (!Array.isArray(family.members) || family.members.length === 0) {
      errors.push(`${prefix}.members must be a nonempty array`);
      continue;
    }

    const memberSymbols = new Set();
    for (const [memberIndex, member] of family.members.entries()) {
      const memberPrefix = `${prefix}.members[${memberIndex}]`;
      if (!isObject(member)) {
        errors.push(`${memberPrefix} must be an object`);
        continue;
      }

      requireNonemptyString(member, "symbol", memberPrefix, errors);
      requireNonemptyString(member, "rationale", memberPrefix, errors);
      if (typeof member.symbol === "string" && member.symbol.trim() !== "") {
        if (memberSymbols.has(member.symbol)) {
          errors.push(`${memberPrefix}.symbol duplicates member '${member.symbol}'`);
        }
        memberSymbols.add(member.symbol);
      }
      if (!dispositions.has(member.disposition)) {
        errors.push(
          `${memberPrefix}.disposition must be one of ${formatAllowed(dispositions)}; found ${formatValue(member.disposition)}`,
        );
      }
      if (!previewStates.has(member.preview)) {
        errors.push(
          `${memberPrefix}.preview must be one of ${formatAllowed(previewStates)}; found ${formatValue(member.preview)}`,
        );
      }

      validateTarget({member, memberPrefix, errors});

      if (member.preview === "required" && isNonemptyString(member.symbol)) {
        if (!evidence.widgetbookSymbols?.has(member.symbol)) {
          errors.push(
            `${memberPrefix}.preview is required but '${member.symbol}' is missing from ${widgetbookPath}`,
          );
        }
      }
      if (member.preview === "source-only" && isNonemptyString(member.symbol)) {
        const hasSource = evidence.sourceSymbols?.has(member.symbol);
        if (!hasSource) {
          errors.push(
            `${memberPrefix}.preview is source-only but '${member.symbol}' has no current lib source evidence`,
          );
        }
      }
    }

    if (
      isNonemptyString(family.qualityReference) &&
      !memberSymbols.has(family.qualityReference)
    ) {
      errors.push(
        `${prefix}.qualityReference '${family.qualityReference}' must name a family member`,
      );
    }

    for (const [memberIndex, member] of family.members.entries()) {
      if (!isObject(member)) continue;
      const memberPrefix = `${prefix}.members[${memberIndex}]`;
      if (
        targetDispositions.has(member.disposition) &&
        isNonemptyString(member.target) &&
        !targetNamesFamilyMember(member.target, memberSymbols)
      ) {
        errors.push(
          `${memberPrefix}.target '${member.target}' must name a family member or one of its named constructors`,
        );
      }
    }
  }

  return [...new Set(errors)].sort();
}

export function checkPatternFamilies({
  repoRoot = defaultRepoRoot,
  filePath = defaultRegistryPath,
} = {}) {
  const resolvedRoot = path.resolve(repoRoot);
  const resolvedFile = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(resolvedRoot, filePath);
  const readResult = readRegistry(resolvedFile);
  if (readResult.errors.length > 0) {
    return {
      errors: readResult.errors,
      familyCount: 0,
      memberCount: 0,
      registryPath: resolvedFile,
    };
  }

  const evidence = collectEvidence(resolvedRoot, readResult.registry);
  const errors = [
    ...evidence.errors,
    ...validatePatternFamilies(readResult.registry, evidence),
  ].sort();
  const families = Array.isArray(readResult.registry.families)
    ? readResult.registry.families
    : [];

  return {
    errors: [...new Set(errors)],
    familyCount: families.length,
    memberCount: families.reduce(
      (total, family) => total + (Array.isArray(family?.members) ? family.members.length : 0),
      0,
    ),
    registryPath: resolvedFile,
  };
}

function targetNamesFamilyMember(target, memberSymbols) {
  if (memberSymbols.has(target)) return true;
  const constructorSeparator = target.indexOf(".");
  if (constructorSeparator <= 0 || constructorSeparator === target.length - 1) {
    return false;
  }
  return memberSymbols.has(target.slice(0, constructorSeparator));
}

function validateTarget({member, memberPrefix, errors}) {
  const hasTarget = Object.hasOwn(member, "target");
  if (member.disposition === "unify") {
    if (!isNonemptyString(member.target)) {
      errors.push(`${memberPrefix}.target is required when disposition is 'unify'`);
    }
    return;
  }
  if (member.disposition === "repair") {
    if (hasTarget && !isNonemptyString(member.target)) {
      errors.push(`${memberPrefix}.target must be a nonempty string when provided for 'repair'`);
    }
    return;
  }
  if (hasTarget) {
    errors.push(`${memberPrefix}.target is only allowed for 'repair' or 'unify'`);
  }
}

function requireStringArray(value, key, prefix, errors) {
  if (!Array.isArray(value[key])) {
    errors.push(`${prefix}.${key} must be an array of nonempty strings`);
    return;
  }
  for (const [index, item] of value[key].entries()) {
    if (!isNonemptyString(item)) {
      errors.push(`${prefix}.${key}[${index}] must be a nonempty string`);
    }
  }
}

function validateReviewQuestions(family, prefix, errors) {
  if (!Array.isArray(family.reviewQuestions)) {
    if (family.status === "review") {
      errors.push(`${prefix}.reviewQuestions must be a nonempty array when status is 'review'`);
    }
    return;
  }
  if (family.status === "review" && family.reviewQuestions.length === 0) {
    errors.push(`${prefix}.reviewQuestions must be a nonempty array when status is 'review'`);
  }

  const questionIds = new Set();
  for (const [questionIndex, question] of family.reviewQuestions.entries()) {
    const questionPrefix = `${prefix}.reviewQuestions[${questionIndex}]`;
    if (!isObject(question)) {
      errors.push(`${questionPrefix} must be an object`);
      continue;
    }
    requireNonemptyString(question, "id", questionPrefix, errors);
    requireNonemptyString(question, "prompt", questionPrefix, errors);
    requireNonemptyString(question, "recommendation", questionPrefix, errors);
    if (isNonemptyString(question.id)) {
      if (questionIds.has(question.id)) {
        errors.push(`${questionPrefix}.id duplicates question '${question.id}'`);
      }
      questionIds.add(question.id);
    }
    if (!Array.isArray(question.options) || question.options.length < 2) {
      errors.push(`${questionPrefix}.options must contain at least two nonempty strings`);
      continue;
    }
    for (const [optionIndex, option] of question.options.entries()) {
      if (!isNonemptyString(option)) {
        errors.push(`${questionPrefix}.options[${optionIndex}] must be a nonempty string`);
      }
    }

    const hasSelectedOption = Object.hasOwn(question, "selectedOption");
    if (decidedStatuses.has(family.status) && !hasSelectedOption) {
      errors.push(
        `${questionPrefix}.selectedOption is required when status is '${family.status}'`,
      );
    }
    if (hasSelectedOption) {
      if (!isNonemptyString(question.selectedOption)) {
        errors.push(`${questionPrefix}.selectedOption must be a nonempty string`);
      } else if (!question.options.includes(question.selectedOption)) {
        errors.push(`${questionPrefix}.selectedOption must match one declared option`);
      }
    }
  }
}

function collectEvidence(repoRoot, registry) {
  const previews = collectRequestedPreviewStates(registry);
  const errors = [];
  let widgetbookSymbols = new Set();
  let sourceSymbols = new Set();

  if (previews.has("required")) {
    const fullPath = path.resolve(repoRoot, widgetbookPath);
    if (!fs.existsSync(fullPath)) {
      errors.push(`${widgetbookPath} is required for preview validation but is missing`);
    } else {
      try {
        widgetbookSymbols = parseWidgetbookSymbols(fs.readFileSync(fullPath, "utf8"));
      } catch (error) {
        errors.push(`${widgetbookPath} could not be read: ${error.message}`);
      }
    }
  }

  if (previews.has("source-only")) {
    sourceSymbols = new Set(screenSourceRoots(repoRoot).flatMap(
      (sourceRoot) => [...collectDartSourceSymbols(path.resolve(repoRoot, sourceRoot))],
    ));
  }

  return {errors, widgetbookSymbols, sourceSymbols};
}

function collectRequestedPreviewStates(registry) {
  const previews = new Set();
  if (!Array.isArray(registry?.families)) return previews;
  for (const family of registry.families) {
    if (!Array.isArray(family?.members)) continue;
    for (const member of family.members) previews.add(member?.preview);
  }
  return previews;
}

export function parseWidgetbookSymbols(source) {
  const symbols = new Set();
  const pattern = /WidgetbookComponent\(\s*name:\s*'([^']+)'/gu;
  for (const match of source.matchAll(pattern)) {
    // The generator prints instantiated type arguments for multi-generic APIs;
    // registry identity belongs to the declaring class, not its type arguments.
    symbols.add(match[1].replace(/<.*>$/u, ""));
  }
  return symbols;
}

function collectDartSourceSymbols(libRoot) {
  const symbols = new Set();
  if (!fs.existsSync(libRoot)) return symbols;
  for (const filePath of listFiles(libRoot, ".dart")) {
    const source = fs.readFileSync(filePath, "utf8");
    for (const match of source.matchAll(/\bclass\s+([A-Za-z_][A-Za-z0-9_]*)\b/gu)) {
      symbols.add(match[1]);
    }
  }
  return symbols;
}

function listFiles(root, extension) {
  const files = [];
  for (const entry of fs
    .readdirSync(root, {withFileTypes: true})
    .sort((left, right) => left.name.localeCompare(right.name))) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...listFiles(fullPath, extension));
    if (entry.isFile() && entry.name.endsWith(extension)) files.push(fullPath);
  }
  return files;
}

function readRegistry(filePath) {
  if (!fs.existsSync(filePath)) {
    return {errors: [`registry file is missing: ${filePath}`], registry: null};
  }
  try {
    return {errors: [], registry: JSON.parse(fs.readFileSync(filePath, "utf8"))};
  } catch (error) {
    return {errors: [`registry is not valid JSON: ${error.message}`], registry: null};
  }
}

function requireNonemptyString(value, key, prefix, errors) {
  if (!isNonemptyString(value[key])) {
    errors.push(`${prefix}.${key} must be a nonempty string`);
  }
}

function requireString(value, key, prefix, errors) {
  if (typeof value[key] !== "string") {
    errors.push(`${prefix}.${key} must be a string`);
  }
}

function isNonemptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function formatAllowed(values) {
  return [...values].map((value) => `'${value}'`).join(", ");
}

function formatValue(value) {
  return typeof value === "string" ? `'${value}'` : JSON.stringify(value);
}

function parseArgs(argv) {
  let repoRoot = defaultRepoRoot;
  let filePath = defaultRegistryPath;
  let command = null;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--check" || argument === "check") {
      if (command !== null) throw new Error("only one command may be provided");
      command = "check";
      continue;
    }
    if (argument === "--help" || argument === "-h" || argument === "help") {
      if (command !== null) throw new Error("only one command may be provided");
      command = "help";
      continue;
    }
    if (argument === "--repo-root" || argument === "--file") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`${argument} requires a value`);
      }
      if (argument === "--repo-root") repoRoot = value;
      if (argument === "--file") filePath = value;
      index += 1;
      continue;
    }
    throw new Error(`unknown argument '${argument}'`);
  }

  return {command: command ?? "help", repoRoot, filePath};
}

function printHelp() {
  console.log(`Usage:
  node tool/design/check_widget_pattern_families.mjs --check [--file <path>] [--repo-root <path>]

Validates the widget pattern-family decision registry and its preview/source evidence.`);
}

function runCli() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`Widget pattern family check usage error: ${error.message}`);
    printHelp();
    process.exitCode = 64;
    return;
  }

  if (options.command === "help") {
    printHelp();
    return;
  }

  const result = checkPatternFamilies(options);
  const displayPath = path.relative(path.resolve(options.repoRoot), result.registryPath) || ".";
  if (result.errors.length > 0) {
    console.error(`Widget pattern family check failed: ${displayPath}`);
    for (const error of result.errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }

  console.log(
    `Widget pattern families OK: ${displayPath} (${result.familyCount} families, ${result.memberCount} members)`,
  );
}

if (path.resolve(process.argv[1] ?? "") === scriptPath) runCli();
