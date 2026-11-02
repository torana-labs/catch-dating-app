#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {screenSourceRoots} from "../lib/flutter_source_roots.mjs";
import {fromRepo, relativeToRepo} from "../lib/repo_paths.mjs";
import {buildWidgetClassification} from "./generate_widget_classification.mjs";

const args = process.argv.slice(2);
const writeIndex = args.indexOf("--write");
const writePath = writeIndex === -1 ? null : args[writeIndex + 1];
const decisionsIndex = args.indexOf("--decisions");
const decisionsPath =
  decisionsIndex === -1
    ? "docs/design_parity/widgetbook_widget_decisions.json"
    : args[decisionsIndex + 1];
const shouldCheck = args.includes("--check");
const shouldJson = args.includes("--json");
const shouldSelfTest = args.includes("--self-test");

if (args.includes("--help") || args.includes("-h")) {
  console.log(`Usage:
  node tool/design/check_widgetbook_coverage.mjs [--json] [--write <path>] [--decisions <path>] [--check]

Scans lib/**/*.dart and apps/*/lib/**/*.dart widget classes and compares them to generated Widgetbook
component names. Coverage obligations are derived from the generated concept
role: concepts need a direct family preview; members may use their parent's
family; contracted compositions need a direct feature preview; uncontracted
compositions and screens use their feature/screen review owners. Explicit
replacement/promotion/delete decisions remain supported for legacy cleanup.
`);
  process.exit(0);
}

if (shouldSelfTest) {
  runSelfTest();
  process.exit(0);
}

if (writeIndex !== -1 && !writePath) {
  console.error("--write requires a path");
  process.exit(64);
}

if (decisionsIndex !== -1 && !decisionsPath) {
  console.error("--decisions requires a path");
  process.exit(64);
}

const widgetClasses = scanWidgetClasses();
const widgetbookNames = parseWidgetbookComponentNames();
const classifications = loadClassifications();
const conceptPrimaryNames = new Map(
  [...classifications.values()]
    .filter((entry) => entry.conceptRole === "concept" && entry.conceptId)
    .map((entry) => [entry.conceptId, entry.name]),
);
const decisionLedger = loadDecisionLedger(decisionsPath);
const rows = widgetClasses.map((entry) => {
  const publicName = entry.name.replace(/^_/, "");
  const exactNameMatched = widgetbookNames.has(entry.name);
  const publicNameMatched = widgetbookNames.has(publicName);
  const mechanicalStatus = classifyMechanicalCoverage({
    exactNameMatched,
    publicNameMatched,
    visibility: entry.visibility,
  });
  const decision = decisionLedger.decisionsByKey.get(decisionKey(entry));
  const classification = classifications.get(decisionKey(entry)) ?? null;
  const roleCoverage = classifyRoleCoverage({
    classification,
    exactNameMatched,
    widgetbookNames,
    conceptPrimaryNames,
  });
  const status = decision?.status ?? roleCoverage.status;

  return {
    ...entry,
    publicName,
    exactNameMatched,
    publicNameMatched,
    mechanicalStatus,
    conceptRole: classification?.conceptRole ?? "unclassified",
    conceptId: classification?.conceptId ?? null,
    contractId: classification?.contractId ?? null,
    coverageObligation: roleCoverage.obligation,
    decision: decision ?? null,
    status,
  };
});
const liveKeys = new Set(rows.map(decisionKey));
const staleDecisions = decisionLedger.decisions.filter(
  (decision) => !liveKeys.has(decisionKey(decision)),
);

const result = {
  generatedAt: new Date().toISOString(),
  decisionLedgerPath: decisionsPath,
  total: rows.length,
  stats: countBy(rows, (row) => row.status),
  mechanicalStats: countBy(rows, (row) => row.mechanicalStatus),
  roleStats: countBy(rows, (row) => row.conceptRole),
  obligationStats: countBy(rows, (row) => row.coverageObligation),
  decisionStats: countBy(
    rows.filter((row) => row.decision !== null),
    (row) => row.decision.status,
  ),
  areaStats: buildAreaStats(rows),
  staleDecisions,
  rows,
};

if (writePath) {
  fs.writeFileSync(fromRepo(writePath), JSON.stringify(result, null, 2) + "\n");
}

if (shouldJson) {
  console.log(JSON.stringify(result, null, 2));
} else {
  printSummary(result);
}

const uncovered = (result.stats.ROLE_COVERAGE_REQUIRED ?? 0) +
  (result.stats.UNCLASSIFIED_ROLE_REVIEW_REQUIRED ?? 0);
if (shouldCheck && (uncovered > 0 || staleDecisions.length > 0)) {
  const parts = [];
  if (uncovered > 0) {
    parts.push(`${uncovered} widget class(es) fail role-derived review coverage`);
  }
  if (staleDecisions.length > 0) {
    parts.push(`${staleDecisions.length} stale decision(s) no longer match live widget classes`);
  }
  console.error(`Widgetbook coverage check failed: ${parts.join("; ")}.`);
  process.exit(1);
}

function classifyRoleCoverage({
  classification,
  exactNameMatched,
  widgetbookNames,
  conceptPrimaryNames,
}) {
  const role = classification?.conceptRole;
  if (role === "concept") {
    return exactNameMatched
      ? {status: "ROLE_COVERED", obligation: "concept-direct"}
      : {status: "ROLE_COVERAGE_REQUIRED", obligation: "concept-direct"};
  }
  if (role === "member") {
    const primaryName = conceptPrimaryNames.get(classification.conceptId);
    const covered = exactNameMatched || (primaryName && widgetbookNames.has(primaryName));
    return covered
      ? {status: "ROLE_COVERED", obligation: "member-parent-family"}
      : {status: "ROLE_COVERAGE_REQUIRED", obligation: "member-parent-family"};
  }
  if (role === "composition") {
    if (classification.contractId !== null) {
      return exactNameMatched
        ? {status: "ROLE_COVERED", obligation: "contracted-composition-direct"}
        : {status: "ROLE_COVERAGE_REQUIRED", obligation: "contracted-composition-direct"};
    }
    return {status: "FEATURE_REVIEW_OWNED", obligation: "feature-review"};
  }
  if (role === "screen") {
    return {status: "SCREEN_REVIEW_OWNED", obligation: "screen-contract"};
  }
  return {
    status: "UNCLASSIFIED_ROLE_REVIEW_REQUIRED",
    obligation: "classification-required",
  };
}

function loadClassifications() {
  const classification = buildWidgetClassification({repoRoot: fromRepo(".")});
  return new Map((classification.widgets ?? [])
    .filter((entry) => entry.classKind === "widget")
    .map((entry) => [`${entry.file}::${entry.name}`, entry]));
}

function runSelfTest() {
  const names = new Set(["CatchBadge"]);
  const primaries = new Map([["catch.badge", "CatchBadge"]]);
  const missingConcept = classifyRoleCoverage({
    classification: {conceptRole: "concept", conceptId: "catch.field", contractId: "catch.field"},
    exactNameMatched: false,
    widgetbookNames: names,
    conceptPrimaryNames: primaries,
  });
  if (missingConcept.status !== "ROLE_COVERAGE_REQUIRED") {
    throw new Error("known-bad concept without a family preview must fail");
  }
  const member = classifyRoleCoverage({
    classification: {conceptRole: "member", conceptId: "catch.badge", contractId: "catch.badge.status_dot"},
    exactNameMatched: false,
    widgetbookNames: names,
    conceptPrimaryNames: primaries,
  });
  if (member.status !== "ROLE_COVERED") {
    throw new Error("member must inherit its concept family preview");
  }
  const composition = classifyRoleCoverage({
    classification: {conceptRole: "composition", contractId: null},
    exactNameMatched: false,
    widgetbookNames: names,
    conceptPrimaryNames: primaries,
  });
  if (composition.status !== "FEATURE_REVIEW_OWNED") {
    throw new Error("uncontracted composition must stay with feature review");
  }
  const widgetClass = parseWidgetSourceLine(
    "class CatchBadge extends StatelessWidget {",
  );
  if (
    widgetClass?.name !== "CatchBadge" ||
    widgetClass.base !== "StatelessWidget"
  ) {
    throw new Error("widget source lines must retain their class and base names");
  }
  if (parseWidgetSourceLine("class CatchBadge extends Object {") !== null) {
    throw new Error("non-widget source lines must not enter the inventory");
  }
  const appRoot = fs.mkdtempSync(path.join(os.tmpdir(), "catch-widgetbook-coverage-"));
  try {
    for (const file of ["lib/shared_card.dart", "apps/host/lib/today/today_card.dart"]) {
      fs.mkdirSync(path.dirname(path.join(appRoot, file)), {recursive: true});
      fs.writeFileSync(path.join(appRoot, file), "class Probe extends StatelessWidget {}\n");
    }
    const scanned = scanWidgetClasses(appRoot).map((entry) => `${entry.area}:${entry.file}`);
    if (scanned.join() !== "apps/host:apps/host/lib/today/today_card.dart,shared_card.dart:lib/shared_card.dart") {
      throw new Error(`app-package widgets must enter the inventory: ${scanned.join()}`);
    }
  } finally {
    fs.rmSync(appRoot, {recursive: true, force: true});
  }
  console.log("Widgetbook role-derived coverage self-test passed.");
}

function classifyMechanicalCoverage({
  exactNameMatched,
  publicNameMatched,
  visibility,
}) {
  if (visibility === "public" && exactNameMatched) {
    return "PUBLIC_ALREADY_CATALOGED_NAME_MATCH";
  }
  if (visibility === "private" && (exactNameMatched || publicNameMatched)) {
    return "PRIVATE_NAME_MATCH_NEEDS_EXPLICIT_DECISION";
  }
  return visibility === "private"
    ? "PRIVATE_NEEDS_RENAME_OR_REPLACE"
    : "PUBLIC_NEEDS_CATALOG_OR_REPLACE";
}

function scanWidgetClasses(root = fromRepo()) {
  const entries = [];
  const sourceFiles = screenSourceRoots(root)
    .flatMap((sourceRoot) => listDartFiles(path.join(root, sourceRoot)));
  for (const absolutePath of sourceFiles) {
    const file = path.relative(root, absolutePath).replaceAll("\\", "/");
    const lines = fs.readFileSync(absolutePath, "utf8").split(/\r?\n/u);
    for (const [index, line] of lines.entries()) {
      const widgetClass = parseWidgetSourceLine(line);
      if (widgetClass === null) continue;
      entries.push({
        file,
        line: index + 1,
        ...widgetClass,
        area: areaFor(file),
        visibility: widgetClass.name.startsWith("_") ? "private" : "public",
      });
    }
  }
  return entries.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
}

function listDartFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...listDartFiles(absolutePath));
    } else if (entry.isFile() && entry.name.endsWith(".dart")) {
      files.push(absolutePath);
    }
  }
  return files;
}

function parseWidgetSourceLine(line) {
  const match =
    /\bclass\s+(_?[A-Z][A-Za-z0-9_]+)\s+extends\s+(StatelessWidget|StatefulWidget|ConsumerWidget|ConsumerStatefulWidget|HookWidget|HookConsumerWidget)\b/u.exec(
      line,
    );
  if (match === null) return null;
  return {name: match[1], base: match[2]};
}

function parseWidgetbookComponentNames() {
  const source = fs.readFileSync(
    fromRepo("widgetbook/lib/main.directories.g.dart"),
    "utf8",
  );
  return new Set(
    [...source.matchAll(/WidgetbookComponent\(\s*name:\s*'([^']+)'/gu)].map(
      (match) => match[1],
    ),
  );
}

function loadDecisionLedger(path) {
  const resolvedPath = fromRepo(path);
  if (!fs.existsSync(resolvedPath)) {
    return {decisions: [], decisionsByKey: new Map()};
  }

  const parsed = JSON.parse(fs.readFileSync(resolvedPath, "utf8"));
  const decisions = Array.isArray(parsed.decisions) ? parsed.decisions : [];
  const decisionsByKey = new Map();
  for (const decision of decisions) {
    validateDecision(decision);
    const key = decisionKey(decision);
    if (decisionsByKey.has(key)) {
      console.error(`Duplicate widgetbook decision for ${key}`);
      process.exit(65);
    }
    decisionsByKey.set(key, decision);
  }
  return {decisions, decisionsByKey};
}

function validateDecision(decision) {
  const validStatuses = new Set([
    "ALREADY_CATALOGED",
    "REPLACE_WITH_EXISTING_CATALOG_ENTRY",
    "PROMOTE_TO_WIDGETBOOK_CATALOG",
    "DELETE_OR_MERGE_DUPLICATE",
  ]);
  const missing = ["file", "name", "status", "target", "rationale"].filter(
    (field) => typeof decision[field] !== "string" || decision[field] === "",
  );
  if (missing.length > 0) {
    console.error(
      `Invalid widgetbook decision for ${decision.file ?? "<missing file>"}:${decision.name ?? "<missing name>"}; missing ${missing.join(", ")}`,
    );
    process.exit(65);
  }
  if (!validStatuses.has(decision.status)) {
    console.error(
      `Invalid widgetbook decision status ${decision.status} for ${decision.file}:${decision.name}`,
    );
    process.exit(65);
  }
}

function areaFor(file) {
  const parts = file.split("/");
  if (parts[0] === "apps") return `apps/${parts[1]}`;
  if (parts[1] === "core") return `core/${parts[2] ?? ""}`;
  return parts[1] ?? "unknown";
}

function decisionKey(entry) {
  return `${entry.file}::${entry.name}`;
}

function countBy(values, keyFor) {
  const counts = {};
  for (const value of values) {
    const key = keyFor(value);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function buildAreaStats(rows) {
  const byArea = new Map();
  for (const row of rows) {
    const entry =
      byArea.get(row.area) ??
      {
        area: row.area,
        total: 0,
        publicAlreadyCataloged: 0,
        privateNameMatchNeedsDecision: 0,
        privateNeedsRenameOrReplace: 0,
        publicNeedsCatalogOrReplace: 0,
        replacedWithCatalogEntry: 0,
        promotedToWidgetbookCatalog: 0,
        deletedOrMergedDuplicate: 0,
      };
    entry.total += 1;
    if (
      row.status === "PUBLIC_ALREADY_CATALOGED_NAME_MATCH" ||
      row.status === "ALREADY_CATALOGED"
    ) {
      entry.publicAlreadyCataloged += 1;
    } else if (row.status === "PRIVATE_NAME_MATCH_NEEDS_EXPLICIT_DECISION") {
      entry.privateNameMatchNeedsDecision += 1;
    } else if (row.status === "PRIVATE_NEEDS_RENAME_OR_REPLACE") {
      entry.privateNeedsRenameOrReplace += 1;
    } else if (row.status === "PUBLIC_NEEDS_CATALOG_OR_REPLACE") {
      entry.publicNeedsCatalogOrReplace += 1;
    } else if (row.status === "REPLACE_WITH_EXISTING_CATALOG_ENTRY") {
      entry.replacedWithCatalogEntry += 1;
    } else if (row.status === "PROMOTE_TO_WIDGETBOOK_CATALOG") {
      entry.promotedToWidgetbookCatalog += 1;
    } else if (row.status === "DELETE_OR_MERGE_DUPLICATE") {
      entry.deletedOrMergedDuplicate += 1;
    }
    byArea.set(row.area, entry);
  }
  return [...byArea.values()].sort(
    (a, b) => b.total - a.total || a.area.localeCompare(b.area),
  );
}

function printSummary(result) {
  const decisionQueue =
    (result.stats.ROLE_COVERAGE_REQUIRED ?? 0) +
    (result.stats.UNCLASSIFIED_ROLE_REVIEW_REQUIRED ?? 0);
  console.log(`Widget classes: ${result.total}`);
  console.log(
    [
      `Public already cataloged by name: ${result.mechanicalStats.PUBLIC_ALREADY_CATALOGED_NAME_MATCH ?? 0}`,
      `Private name match: ${result.mechanicalStats.PRIVATE_NAME_MATCH_NEEDS_EXPLICIT_DECISION ?? 0}`,
      `Private without a direct name match: ${result.mechanicalStats.PRIVATE_NEEDS_RENAME_OR_REPLACE ?? 0}`,
      `Public without a direct name match: ${result.mechanicalStats.PUBLIC_NEEDS_CATALOG_OR_REPLACE ?? 0}`,
      `Role-covered: ${result.stats.ROLE_COVERED ?? 0}`,
      `Feature-review owned: ${result.stats.FEATURE_REVIEW_OWNED ?? 0}`,
      `Screen-review owned: ${result.stats.SCREEN_REVIEW_OWNED ?? 0}`,
      `Total decision queue: ${decisionQueue}`,
      `Stale decisions: ${result.staleDecisions.length}`,
    ].join("\n"),
  );
  console.log("\nLargest unresolved areas:");
  for (const area of result.areaStats.slice(0, 12)) {
    const unresolved =
      area.privateNameMatchNeedsDecision +
      area.privateNeedsRenameOrReplace + area.publicNeedsCatalogOrReplace;
    console.log(
      [
        `- ${area.area}: ${unresolved} unresolved`,
        `(${area.publicAlreadyCataloged}/${area.total} public cataloged by name)`,
      ].join(" "),
    );
  }
  if (writePath) {
    console.log(`\nWrote ${relativeToRepo(fromRepo(writePath))}`);
  }
}
