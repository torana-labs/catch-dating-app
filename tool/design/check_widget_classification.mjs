#!/usr/bin/env node
import fs from "node:fs";
import {fileURLToPath} from "node:url";

import {fromRepo, repoRoot} from "../lib/repo_paths.mjs";
import {
  buildWidgetClassification,
  collectProductionWidgetClassificationDeclarations,
} from "./generate_widget_classification.mjs";
import {publicWidgetNamingProblems} from "./component_concepts.mjs";
import {sharedWidgetNamingProblems} from "./lib/component_naming.mjs";
import {
  isProductionWidgetDartPath,
  productionWidgetGlobs,
} from "./lib/production_widget_roots.mjs";

const widgetKeys = [
  "name", "file", "classKind", "baseClass", "visibility", "role",
  "canonicalFamily", "publicApi", "catalogStatus", "contractId",
  "conceptRole", "conceptId", "parentConceptId", "qualifier", "collisionKey",
  "decisionRef", "allowedDependencyLevel", "stateOwnership", "asyncOwnership",
  "layoutOwnership", "actionOwnership", "decision", "remediationOptions", "flags",
];
const roles = new Set([
  "atom", "composition", "pattern", "feature-adapter", "screen", "widget-state",
]);
const conceptRoles = new Set(["concept", "member", "composition", "screen", "unclassified"]);
const qualifiers = new Set(["variant", "anatomy", "adapter", "recipe", "layout", "legacy"]);
const catalogStatuses = new Set([
  "contracted", "cataloged", "route-covered", "uncataloged", "not-applicable",
]);
const dependencyLevels = new Set([
  "tokens-and-primitives", "primitives-and-slots", "feature-display-models",
  "route-boundary", "owning-widget-state",
]);
const stateOwners = new Set([
  "none", "local-ui-only", "slot-state-only", "feature-display-state",
  "screen-owned", "owning-widget-state",
]);
const asyncOwners = new Set([
  "none", "display-state-only", "screen-owned", "owning-widget-state",
]);
const layoutOwners = new Set([
  "internal-only", "slot-layout", "feature-section-layout", "page-safe-area-sliver",
  "owning-widget-state",
]);
const actionOwners = new Set([
  "none", "callbacks-only", "feature-callbacks", "navigation-and-controller-calls",
  "owning-widget-state",
]);
const decisions = new Set([
  "keep-canonical-contract", "keep-public-cataloged", "review-catalog-coverage",
  "review-promote-or-consolidate", "review-promote-or-inline",
  "review-screen-boundary", "keep-widget-state",
]);
const remediations = new Set([
  "keepPublicCataloged", "mergeIntoCanonical", "promoteToCanonicalContract",
  "promoteToPublicCatalog", "inlineDelete", "moveStateToController",
  "routeThroughScreenState",
]);

export function validateWidgetClassification(
  registry,
  {contracts = [], widgetbookNames = new Set(), sourceDeclarations = []} = {},
) {
  const failures = [];
  requireObject(registry, "registry", failures);
  if (failures.length > 0) return failures;
  requireExactKeys(
    registry,
    ["sourceOfTruth", "summary", "updated", "version", "widgets"],
    "registry",
    failures,
  );
  if (registry.version !== 2) failures.push("registry.version must be 2");
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(registry.updated ?? "")) {
    failures.push("registry.updated must be YYYY-MM-DD");
  }
  validateSourceOfTruth(registry.sourceOfTruth, failures);
  if (!Array.isArray(registry.widgets)) {
    failures.push("registry.widgets must be an array");
    return failures;
  }

  const contractEntries = collectContractEntries(contracts);
  const contractsById = new Map(contractEntries.map((entry) => [entry.id, entry]));
  const contractsBySymbol = new Map(contractEntries.map((entry) => [entry.symbol, entry]));
  const registryKeys = new Set();
  for (const [index, widget] of registry.widgets.entries()) {
    validateWidget(widget, {
      contractsById,
      contractsBySymbol,
      failures,
      index,
      registryKeys,
      widgetbookNames,
    });
  }
  validateSummary(registry.summary, registry.widgets, widgetbookNames, failures);
  validateSourceClosure(sourceDeclarations, registry.widgets, registryKeys, failures);
  for (const widget of registry.widgets) {
    if (widget.visibility === "public" && widget.classKind === "widget" &&
        widget.conceptRole === "unclassified") {
      failures.push(
        `${widget.file}:${widget.name}: public widget cannot remain unclassified`,
      );
    }
  }
  failures.push(...publicWidgetNamingProblems(registry.widgets));
  failures.push(...sharedWidgetNamingProblems({
    components: contracts, declarations: registry.widgets,
  }));
  return [...new Set(failures)].sort();
}

function validateSourceOfTruth(value, failures) {
  requireObject(value, "sourceOfTruth", failures);
  if (!isObject(value)) return;
  const keys = ["scope", "canonicalContracts", "catalog", "privateHelperPolicy", "generator"];
  requireExactKeys(value, keys, "sourceOfTruth", failures);
  for (const key of keys) requireNonemptyString(value[key], `sourceOfTruth.${key}`, failures);
  for (const rootGlob of productionWidgetGlobs) {
    if (!String(value.scope ?? "").includes(rootGlob)) {
      failures.push(`sourceOfTruth.scope must include ${rootGlob}`);
    }
  }
  if (!String(value.privateHelperPolicy ?? "").includes("not an allowed destination")) {
    failures.push("sourceOfTruth.privateHelperPolicy must explicitly ban private-helper destinations");
  }
}

function validateWidget(widget, context) {
  const {contractsById, contractsBySymbol, failures, index, registryKeys, widgetbookNames} = context;
  const prefix = `widgets[${index}]`;
  requireObject(widget, prefix, failures);
  if (!isObject(widget)) return;
  requireExactKeys(widget, widgetKeys, prefix, failures);
  requireNonemptyString(widget.name, `${prefix}.name`, failures);
  if (!isProductionWidgetDartPath(widget.file)) {
    failures.push(
      `${prefix}.file must be a Dart source under ${productionWidgetGlobs.join(", ")}`,
    );
  }
  requireEnum(widget.classKind, new Set(["widget", "widget-state"]), `${prefix}.classKind`, failures);
  requireNonemptyString(widget.baseClass, `${prefix}.baseClass`, failures);
  requireEnum(widget.visibility, new Set(["public", "private"]), `${prefix}.visibility`, failures);
  requireEnum(widget.role, roles, `${prefix}.role`, failures);
  if (typeof widget.canonicalFamily !== "string" ||
      !/^(catch|screen|feature|state)\.[a-z0-9_.-]+$/u.test(widget.canonicalFamily)) {
    failures.push(`${prefix}.canonicalFamily is invalid`);
  }
  if (typeof widget.publicApi !== "boolean") failures.push(`${prefix}.publicApi must be boolean`);
  requireEnum(widget.catalogStatus, catalogStatuses, `${prefix}.catalogStatus`, failures);
  requireNullableCatchId(widget.contractId, `${prefix}.contractId`, failures);
  requireNullableEnum(widget.conceptRole, conceptRoles, `${prefix}.conceptRole`, failures);
  requireNullableCatchId(widget.conceptId, `${prefix}.conceptId`, failures);
  requireNullableCatchId(widget.parentConceptId, `${prefix}.parentConceptId`, failures);
  requireNullableEnum(widget.qualifier, qualifiers, `${prefix}.qualifier`, failures);
  requireNullableString(widget.collisionKey, `${prefix}.collisionKey`, failures);
  requireNullableString(widget.decisionRef, `${prefix}.decisionRef`, failures);
  requireEnum(widget.allowedDependencyLevel, dependencyLevels, `${prefix}.allowedDependencyLevel`, failures);
  requireEnum(widget.stateOwnership, stateOwners, `${prefix}.stateOwnership`, failures);
  requireEnum(widget.asyncOwnership, asyncOwners, `${prefix}.asyncOwnership`, failures);
  requireEnum(widget.layoutOwnership, layoutOwners, `${prefix}.layoutOwnership`, failures);
  requireEnum(widget.actionOwnership, actionOwners, `${prefix}.actionOwnership`, failures);
  requireEnum(widget.decision, decisions, `${prefix}.decision`, failures);
  requireUniqueEnumArray(widget.remediationOptions, remediations, `${prefix}.remediationOptions`, failures);
  requireUniqueStringArray(widget.flags, `${prefix}.flags`, failures);

  const label = `${widget.file}:${widget.name}`;
  const key = `${widget.file}|${widget.name}|${widget.baseClass}`;
  if (registryKeys.has(key)) failures.push(`${label}: duplicate classification`);
  registryKeys.add(key);
  if (widget.classKind === "widget" && !conceptRoles.has(widget.conceptRole)) {
    failures.push(`${label}: widget requires a valid conceptRole`);
  }
  if (widget.classKind === "widget-state" && widget.conceptRole !== null) {
    failures.push(`${label}: widget-state conceptRole must be null`);
  }
  if (widget.conceptRole === "concept" && widget.conceptId !== widget.contractId) {
    failures.push(`${label}: primary conceptId must equal contractId`);
  }
  if (widget.conceptRole === "member") {
    if (!widget.conceptId || widget.conceptId !== widget.parentConceptId) {
      failures.push(`${label}: members require matching conceptId and parentConceptId`);
    }
    if (!widget.qualifier) failures.push(`${label}: members require qualifier`);
  }
  if (["composition", "screen", "unclassified"].includes(widget.conceptRole) &&
      (widget.conceptId !== null || widget.parentConceptId !== null || widget.qualifier !== null)) {
    failures.push(`${label}: ${widget.conceptRole} cannot claim concept identity`);
  }
  if (/private[-_ ]?helper|convert.*private|demote.*private/iu.test(JSON.stringify(widget))) {
    failures.push(`${label}: private-helper remediation wording is forbidden`);
  }
  validateVisibilityAndState(widget, label, failures);

  if (widget.contractId !== null) {
    const contract = contractsById.get(widget.contractId);
    if (!contract) failures.push(`${label}: unknown contractId '${widget.contractId}'`);
    if (contract && contractsBySymbol.get(widget.name)?.id !== widget.contractId) {
      failures.push(`${label}: contractId does not match contract dart symbol`);
    }
    if (contract && widget.canonicalFamily !== contract.parentId) {
      failures.push(`${label}: canonicalFamily must equal contract parent ${contract.parentId}`);
    }
    if (contract && widget.conceptRole !== contract.governance?.conceptRole) {
      failures.push(`${label}: conceptRole does not match component contract`);
    }
    if (widget.catalogStatus !== "contracted") {
      failures.push(`${label}: contractId entries must use catalogStatus=contracted`);
    }
    if (contract?.primary && !widgetbookNames.has(widget.name)) {
      failures.push(`${label}: contracted widget must have a Widgetbook listing`);
    }
  }
}

function validateVisibilityAndState(widget, label, failures) {
  if (widget.classKind === "widget-state" && widget.role !== "widget-state") {
    failures.push(`${label}: widget-state class must use widget-state role`);
  }
  if (widget.classKind === "widget-state" && widget.visibility !== "private") {
    failures.push(`${label}: widget-state classes must remain private`);
  }
  if (widget.classKind === "widget-state" && widget.publicApi) {
    failures.push(`${label}: widget-state classes cannot be publicApi=true`);
  }
  if (widget.classKind === "widget" && widget.role === "widget-state") {
    failures.push(`${label}: widget class cannot use widget-state role`);
  }
  if (widget.visibility === "private" && widget.classKind === "widget") {
    if (widget.decision !== "review-promote-or-inline") {
      failures.push(`${label}: private widget classes must be review-promote-or-inline`);
    }
    for (const required of ["promoteToPublicCatalog", "mergeIntoCanonical", "inlineDelete"]) {
      if (!widget.remediationOptions?.includes(required)) {
        failures.push(`${label}: private widget remediation must include ${required}`);
      }
    }
  }
  if (widget.visibility === "private" && widget.publicApi) {
    failures.push(`${label}: private classes cannot be publicApi=true`);
  }
}

function validateSummary(summary, widgets, widgetbookNames, failures) {
  requireObject(summary, "summary", failures);
  if (!isObject(summary)) return;
  const keys = [
    "total", "widgetClasses", "stateClasses", "publicClasses", "privateClasses",
    "byRole", "byDecision", "byCatalogStatus", "conceptCount", "memberClassCount",
    "compositionClassCount", "screenClassCount", "unclassifiedCount", "byConceptRole",
    "collisionGroupCount", "collisions", "widgetbookCoverage",
  ];
  requireExactKeys(summary, keys, "summary", failures);
  const publicWidgets = widgets.filter(
    (row) => row.classKind === "widget" && row.visibility === "public",
  );
  const counts = {
    total: widgets.length,
    widgetClasses: widgets.filter((row) => row.classKind === "widget").length,
    stateClasses: widgets.filter((row) => row.classKind === "widget-state").length,
    publicClasses: widgets.filter((row) => row.visibility === "public").length,
    privateClasses: widgets.filter((row) => row.visibility === "private").length,
    conceptCount: new Set(
      publicWidgets
        .filter((row) => row.conceptRole === "concept")
        .map((row) => row.conceptId),
    ).size,
    memberClassCount: publicWidgets.filter((row) => row.conceptRole === "member").length,
    compositionClassCount: publicWidgets.filter((row) => row.conceptRole === "composition").length,
    screenClassCount: publicWidgets.filter((row) => row.conceptRole === "screen").length,
    unclassifiedCount: publicWidgets.filter((row) => row.conceptRole === "unclassified").length,
  };
  for (const [key, expected] of Object.entries(counts)) {
    if (summary[key] !== expected) failures.push(`summary.${key} must equal ${expected}`);
  }
  const expectedMaps = {
    byRole: countBy(widgets, "role"),
    byDecision: countBy(widgets, "decision"),
    byCatalogStatus: countBy(widgets, "catalogStatus"),
    byConceptRole: countBy(publicWidgets, "conceptRole"),
  };
  for (const [key, expected] of Object.entries(expectedMaps)) {
    requireCountMap(summary[key], `summary.${key}`, failures);
    if (!sameJson(summary[key], expected)) failures.push(`summary.${key} does not match widgets`);
  }
  const expectedCollisions = collisionGroups(publicWidgets);
  validateCollisions(summary.collisions, failures);
  if (!sameJson(summary.collisions, expectedCollisions)) {
    failures.push("summary.collisions does not match widgets");
  }
  if (summary.collisionGroupCount !== expectedCollisions.length) {
    failures.push(`summary.collisionGroupCount must equal ${expectedCollisions.length}`);
  }
  const coverage = {
    conceptPrimaries: publicWidgets.filter((row) => row.conceptRole === "concept").length,
    conceptPrimariesCataloged: publicWidgets.filter(
      (row) => row.conceptRole === "concept" && widgetbookNames.has(row.name),
    ).length,
    memberClasses: publicWidgets.filter((row) => row.conceptRole === "member").length,
    memberClassesCataloged: publicWidgets.filter(
      (row) => row.conceptRole === "member" && widgetbookNames.has(row.name),
    ).length,
    compositionsCataloged: publicWidgets.filter(
      (row) => row.conceptRole === "composition" && widgetbookNames.has(row.name),
    ).length,
    screensCataloged: publicWidgets.filter(
      (row) => row.conceptRole === "screen" && widgetbookNames.has(row.name),
    ).length,
  };
  requireExactKeys(summary.widgetbookCoverage, Object.keys(coverage), "summary.widgetbookCoverage", failures);
  requireCountMap(summary.widgetbookCoverage, "summary.widgetbookCoverage", failures);
  if (!sameJson(summary.widgetbookCoverage, coverage)) {
    failures.push("summary.widgetbookCoverage does not match widgets and Widgetbook");
  }
}

function validateCollisions(value, failures) {
  if (!Array.isArray(value)) {
    failures.push("summary.collisions must be an array");
    return;
  }
  for (const [index, collision] of value.entries()) {
    const prefix = `summary.collisions[${index}]`;
    requireObject(collision, prefix, failures);
    if (!isObject(collision)) continue;
    requireExactKeys(collision, ["key", "names"], prefix, failures);
    requireNonemptyString(collision.key, `${prefix}.key`, failures);
    requireUniqueStringArray(collision.names, `${prefix}.names`, failures);
    if (Array.isArray(collision.names) && collision.names.length < 2) {
      failures.push(`${prefix}.names must contain at least two entries`);
    }
  }
}

function collisionGroups(rows) {
  const groups = new Map();
  for (const row of rows) {
    if (!row.collisionKey) continue;
    const names = groups.get(row.collisionKey) ?? [];
    names.push(row.name);
    groups.set(row.collisionKey, names);
  }
  return [...groups.entries()]
    .map(([key, names]) => ({key, names: [...new Set(names)].sort()}))
    .filter((entry) => entry.names.length > 1)
    .sort((left, right) => left.key.localeCompare(right.key));
}

function countBy(rows, field) {
  return Object.fromEntries(
    [...rows.reduce(
      (counts, row) => counts.set(row[field], (counts.get(row[field]) ?? 0) + 1),
      new Map(),
    )].sort(([left], [right]) => left.localeCompare(right)),
  );
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function validateSourceClosure(sourceDeclarations, widgets, registryKeys, failures) {
  if (!Array.isArray(sourceDeclarations) || sourceDeclarations.length === 0) return;
  const current = new Set(
    sourceDeclarations.map((entry) => `${entry.file}|${entry.name}|${entry.baseClass}`),
  );
  for (const entry of sourceDeclarations) {
    const key = `${entry.file}|${entry.name}|${entry.baseClass}`;
    if (!registryKeys.has(key)) failures.push(`${entry.file}:${entry.name}: missing classification`);
  }
  for (const widget of widgets) {
    const key = `${widget.file}|${widget.name}|${widget.baseClass}`;
    if (!current.has(key)) failures.push(`${widget.file}:${widget.name}: stale classification`);
  }
}

function collectContractEntries(components) {
  return components.flatMap((component) => [
    {
      id: component.id,
      parentId: component.id,
      symbol: component.dart?.symbol,
      primary: true,
      governance: component.governance,
    },
    ...(component.contract?.members ?? []).map((member) => ({
      id: member.id,
      parentId: component.id,
      symbol: member.symbol,
      primary: false,
      governance: member.governance,
    })),
  ]);
}

function requireExactKeys(value, expected, label, failures) {
  if (!isObject(value)) return;
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    failures.push(`${label} must contain exactly: ${wanted.join(", ")}`);
  }
}

function requireObject(value, label, failures) {
  if (!isObject(value)) failures.push(`${label} must be an object`);
}

function requireNonemptyString(value, label, failures) {
  if (typeof value !== "string" || value.trim() === "") failures.push(`${label} must be nonempty`);
}

function requireNullableString(value, label, failures) {
  if (value !== null && typeof value !== "string") failures.push(`${label} must be string or null`);
}

function requireNullableCatchId(value, label, failures) {
  if (value !== null && (typeof value !== "string" || !/^catch\.[a-z0-9_.-]+$/u.test(value))) {
    failures.push(`${label} must be a catch.* id or null`);
  }
}

function requireEnum(value, allowed, label, failures) {
  if (!allowed.has(value)) failures.push(`${label} has invalid value '${value}'`);
}

function requireNullableEnum(value, allowed, label, failures) {
  if (value !== null) requireEnum(value, allowed, label, failures);
}

function requireUniqueEnumArray(value, allowed, label, failures) {
  if (!Array.isArray(value)) return failures.push(`${label} must be an array`);
  if (new Set(value).size !== value.length) failures.push(`${label} must be unique`);
  for (const entry of value) requireEnum(entry, allowed, label, failures);
}

function requireUniqueStringArray(value, label, failures) {
  if (!Array.isArray(value)) return failures.push(`${label} must be an array`);
  if (new Set(value).size !== value.length) failures.push(`${label} must be unique`);
  if (value.some((entry) => typeof entry !== "string")) failures.push(`${label} must contain strings`);
}

function requireNonnegativeInteger(value, label, failures) {
  if (!Number.isInteger(value) || value < 0) failures.push(`${label} must be a nonnegative integer`);
}

function requireCountMap(value, label, failures) {
  if (!isObject(value)) return failures.push(`${label} must be an object`);
  for (const [key, count] of Object.entries(value)) {
    requireNonnegativeInteger(count, `${label}.${key}`, failures);
  }
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function readWidgetbookNames() {
  const file = fromRepo("widgetbook/lib/main.directories.g.dart");
  if (!fs.existsSync(file)) return new Set();
  const names = new Set();
  for (const match of fs.readFileSync(file, "utf8").matchAll(
    /WidgetbookComponent\(\s*name: '([^']+)'/gu,
  )) {
    names.add(match[1]);
    names.add(match[1].replace(/<.*>$/u, ""));
  }
  return names;
}

function collectSourceDeclarations() {
  return collectProductionWidgetClassificationDeclarations({repoRoot}).map(
    ({file, name, baseClass}) => ({file, name, baseClass}),
  );
}

function runCli() {
  const registry = buildWidgetClassification({repoRoot});
  const failures = validateWidgetClassification(registry, {
    contracts: readJson(fromRepo("design/components/catch.components.json")).components ?? [],
    widgetbookNames: readWidgetbookNames(),
    sourceDeclarations: collectSourceDeclarations(),
  });
  if (failures.length > 0) {
    console.error("Widget classification check failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
    return;
  }
  const publicReviewCount = registry.widgets.filter((widget) =>
    widget.visibility === "public" &&
    String(widget.decision ?? "").startsWith("review-"),
  ).length;
  const privateWidgetCount = registry.widgets.filter(
    (widget) => widget.visibility === "private" && widget.classKind === "widget",
  ).length;
  const featureNamingReviewCount = registry.widgets.filter((widget) =>
    widget.flags.some((flag) => /^(reserved|noncanonical)-feature-widget-/u.test(flag))).length;
  console.log(
    `Widget classification check passed (${registry.widgets.length} entries, ` +
      `0 unclassified public widgets, 0 ungoverned public name collisions, ` +
      `${registry.summary.collisionGroupCount} governed concept families; ` +
      `${publicReviewCount} public catalog/consolidation candidates and ` +
      `${privateWidgetCount} private widget classes and ${featureNamingReviewCount} existing feature naming candidates flagged for review).`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) runCli();
