#!/usr/bin/env node
/**
 * Consolidation done-gates: one read-only scorecard for the program that makes
 * every screen a composition of shared, token-only components on every surface.
 * Gate definitions, owners and starting values live in
 * design/components/consolidation_gates.json. This report blocks nothing; each
 * gate names the ratchet that blocks its regressions, or says none exists yet.
 */
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {fromRepo, repoRoot} from "../lib/repo_paths.mjs";
import {collectPrimitiveContractUseCases} from "./check_widgetbook_contract_refs.mjs";

const gatesPath = "design/components/consolidation_gates.json";
const registryPath = "design/components/catch.components.json";
const similarityOutput = "build/reports/consolidation_widget_similarity.json";

const bareElementPattern =
  /<(?:div|span|p|h[1-6]|section|article|header|footer|nav|main|aside|ul|ol|li|button|input|select|textarea|label|a|form|table|img|strong|small)[\s>/]/gu;
const inlineTextStylePattern = /\bText\((?:(?!\bText\()[\s\S]){0,200}?\bstyle:/gu;
const rawChromePattern =
  /\b(?:BoxDecoration|DecoratedBox|Container|ClipRRect|Material|InkWell|GestureDetector)\(/gu;

/** Bare HTML elements in React source; library components start with a capital. */
export function countBareMarkup(source) {
  return source.match(bareElementPattern)?.length ?? 0;
}

/** `Text(..., style: ...)` call sites: text styled in place instead of by a text role. */
export function countInlineTextStyles(source) {
  return source.match(inlineTextStylePattern)?.length ?? 0;
}

/** Hand-built decoration, clipping and tap targets in Flutter feature code. */
export function countRawChrome(source) {
  return source.match(rawChromePattern)?.length ?? 0;
}

/** Stylelint and ESLint bulk suppressions share the {file: {rule: {count}}} shape. */
export function sumSuppressions(suppressions, onlyRule = null) {
  let total = 0;
  for (const rules of Object.values(suppressions)) {
    for (const [rule, entry] of Object.entries(rules)) {
      if (onlyRule == null || rule === onlyRule) total += entry.count ?? 0;
    }
  }
  return total;
}

export function parseRawColorDebt(source) {
  const list = /export const rawColorDebt = \[([^\]]*)\]/u.exec(source);
  if (!list) throw new Error("rawColorDebt export not found");
  return [...list[1].matchAll(/"([^"]+)"/gu)].map((match) => match[1]);
}

/**
 * Catalog parity, state-coverage half: a T1 contract counts only when it has a
 * styled React component whose ready Storybook story exists and declares every
 * state its Widgetbook contract preview renders. Screenshot baselines for both
 * frameworks join the rule when Phase 7f lands them.
 */
function hasCatalogParity(contract, widgetbookStates, storyExports) {
  const story = contract.react?.storybook;
  const flutterStates = widgetbookStates.get(contract.id) ?? [];
  return contract.react?.api === "styled" && story?.status === "ready" &&
    storyExports(story.story, story.exportName) && flutterStates.length > 0 &&
    flutterStates.every((state) => story.states?.includes(state));
}

export function registryMeasures(registry, priorityIds, {widgetbookStates = new Map(), storyExports = () => false} = {}) {
  const contracts = Object.entries(registry.components ?? registry)
    .map(([id, contract]) => ({id, ...contract}));
  const styled = (contract) => contract.react?.api === "styled";
  const t1 = contracts.filter((contract) => contract.tier === "T1");
  const byId = new Map(contracts.map((contract) => [contract.id, contract]));
  const unknown = priorityIds.filter((id) => !byId.has(id));
  if (unknown.length) throw new Error(`Unknown priority registry ids: ${unknown.join(", ")}`);
  return {
    t1WithoutStyledReact: t1.filter((contract) => !styled(contract)).map((contract) => contract.id),
    priorityWithoutStyledReact: priorityIds.filter((id) => !styled(byId.get(id))),
    headlessControls: contracts.filter((contract) => contract.react?.api === "headless-control")
      .map((contract) => contract.id),
    t1WithoutCatalogParity: t1.filter((contract) => !hasCatalogParity(contract, widgetbookStates, storyExports))
      .map((contract) => contract.id),
  };
}

function listFiles(root, directory, extension, skip = () => false) {
  const start = path.join(root, directory);
  if (!fs.existsSync(start)) return [];
  const files = [];
  const visit = (current) => {
    for (const entry of fs.readdirSync(current, {withFileTypes: true})) {
      const absolute = path.join(current, entry.name);
      const relative = path.relative(root, absolute).split(path.sep).join("/");
      if (entry.isDirectory()) {
        if (entry.name !== "node_modules" && !skip(`${relative}/`)) visit(absolute);
      } else if (entry.name.endsWith(extension) && !skip(relative)) {
        files.push(relative);
      }
    }
  };
  visit(start);
  return files.sort();
}

function sumOver(root, files, count) {
  return files.reduce((total, file) => total + count(fs.readFileSync(path.join(root, file), "utf8")), 0);
}

const reactSkip = (file) => /\.(?:test|stories)\.tsx$/u.test(file) || file.includes("/generated/");
const flutterSkip = (file) => /\.(?:g|freezed|mocks)\.dart$/u.test(file) ||
  ["lib/core/theme/", "lib/l10n/", "lib/design_fixtures/"].some((prefix) => file.startsWith(prefix)) ||
  /^lib\/firebase_options/u.test(file);
const sharedStylesheets = new Set(["website/src/styles/base.css", "website/src/styles/catch-language.css"]);

const bareElementRule = "react/forbid-elements";

/** The 7g ESLint rule's recorded suppressions once they exist; a source scan until then. */
function bareMarkup(root, surface) {
  const suppressions = path.join(root, surface, "eslint-suppressions.json");
  if (fs.existsSync(suppressions)) {
    return sumSuppressions(JSON.parse(fs.readFileSync(suppressions, "utf8")), bareElementRule);
  }
  return sumOver(root, listFiles(root, `${surface}/src`, ".tsx", reactSkip), countBareMarkup);
}

const unusedCodeBaseline = "tool/audit/unused_code_baseline.json";
const webWorkspaces = {website: "website/", admin: "admin/", "web-ui": "packages/web-ui/"};

/** Unused exports and whole unused files per web workspace, from knip's shrink-only baseline. */
export function knipUnusedByWorkspace(baseline) {
  const counts = Object.fromEntries(Object.keys(webWorkspaces).map((name) => [name, 0]));
  for (const key of baseline.findings ?? []) {
    const [kind, file] = key.split(" ");
    if (kind !== "export" && kind !== "file") continue;
    const workspace = Object.entries(webWorkspaces).find(([, prefix]) => file?.startsWith(prefix))?.[0];
    if (workspace) counts[workspace] += 1;
  }
  return counts;
}

function bySurface(values) {
  return {value: Object.values(values).reduce((total, value) => total + value, 0), bySurface: values};
}

/**
 * The inventory exits non-zero for registry findings but still prints its full
 * JSON, and its counts stand. It calls process.exit straight after writing, so
 * a pipe would truncate the output at 64 KiB; a file receives all of it.
 */
function runJson(root, args) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "catch-consolidation-gates-"));
  const output = path.join(directory, "out.json");
  try {
    const descriptor = fs.openSync(output, "w");
    const result = spawnSync(process.execPath, args, {cwd: root, encoding: "utf8", stdio: ["ignore", descriptor, "pipe"]});
    fs.closeSync(descriptor);
    try {
      return JSON.parse(fs.readFileSync(output, "utf8"));
    } catch {
      throw new Error(`${args.join(" ")} failed: ${result.stderr}`);
    }
  } finally {
    fs.rmSync(directory, {recursive: true, force: true});
  }
}

/** Every measure the gate file can name. Values are counts; zero is the target. */
export function measureAll({root = repoRoot, priorityIds = [], similarity = false} = {}) {
  const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
  const storyExports = (file, exportName) => fs.existsSync(path.join(root, file)) &&
    new RegExp(`export const ${exportName}\\b`, "u").test(read(file));
  const registry = registryMeasures(JSON.parse(read(registryPath)), priorityIds, {
    widgetbookStates: collectPrimitiveContractUseCases({root}).statesByContractId,
    storyExports,
  });
  const inventory = runJson(root, ["tool/web/check_shared_web_ui_adoption.mjs", "--json"]).summary;
  const inventoryCount = (kind) => bySurface({
    website: inventory.website?.[kind] ?? 0,
    admin: inventory.admin?.[kind] ?? 0,
    "web-ui": inventory["web-ui"]?.[kind] ?? 0,
  });
  const flutterFiles = listFiles(root, "lib", ".dart", flutterSkip);
  const hostFiles = flutterFiles.filter((file) => file.startsWith("lib/hosts/"));
  const otherFiles = flutterFiles.filter((file) => !file.startsWith("lib/hosts/"));
  const cssLines = (files) => sumOver(root, files, (source) => source.split("\n").length - 1);
  const measures = {
    flutterTokenLints: {enforced: true, note: "flutter analyze --fatal-infos fails CI on any catch_ui_lints finding"},
    rawColorDebt: bySurface({website: parseRawColorDebt(read("website/stylelint.config.mjs")).length}),
    rawValueSuppressions: bySurface({
      website: sumSuppressions(JSON.parse(read("website/stylelint-suppressions.json"))),
      admin: sumSuppressions(JSON.parse(read("admin/stylelint-suppressions.json"))),
    }),
    t1WithoutStyledReact: {value: registry.t1WithoutStyledReact.length, ids: registry.t1WithoutStyledReact},
    priorityWithoutStyledReact: {value: registry.priorityWithoutStyledReact.length, ids: registry.priorityWithoutStyledReact},
    headlessControls: {value: registry.headlessControls.length, ids: registry.headlessControls},
    t1WithoutCatalogParity: {value: registry.t1WithoutCatalogParity.length, ids: registry.t1WithoutCatalogParity},
    webAdapters: inventoryCount("adapter"),
    webDeadExports: fs.existsSync(path.join(root, unusedCodeBaseline))
      ? {...bySurface(knipUnusedByWorkspace(JSON.parse(read(unusedCodeBaseline)))), source: "knip"}
      : {...inventoryCount("delete"), source: "react-inventory"},
    webSingleUseShared: inventoryCount("t4-move"),
    webBareMarkup: bySurface({website: bareMarkup(root, "website"), admin: bareMarkup(root, "admin")}),
    webPageCssLines: bySurface({
      website: cssLines(listFiles(root, "website/src", ".css", (file) => sharedStylesheets.has(file))),
      admin: cssLines(listFiles(root, "admin/src", ".css")),
    }),
    flutterInlineTextStyles: bySurface({
      host: sumOver(root, hostFiles, countInlineTextStyles),
      "consumer and shared": sumOver(root, otherFiles, countInlineTextStyles),
    }),
    flutterRawChrome: bySurface({
      host: sumOver(root, hostFiles, countRawChrome),
      "consumer and shared": sumOver(root, otherFiles, countRawChrome),
    }),
  };
  if (similarity) {
    const result = spawnSync(process.execPath, ["tool/design/build_widget_similarity.mjs", "--out", similarityOutput],
      {cwd: root, encoding: "utf8"});
    if (result.status !== 0) throw new Error(`widget similarity failed: ${result.stderr || result.stdout}`);
    const {summary} = JSON.parse(read(similarityOutput));
    measures.flutterDuplicateClusters = {value: summary.clusters};
    measures.flutterAbsorbCandidates = {value: summary.absorbCandidates};
  }
  return measures;
}

export function validateGates(definition) {
  const problems = [];
  const ids = new Set();
  for (const gate of definition.gates ?? []) {
    for (const field of ["id", "layer", "title", "measure", "owner", "enforcement"]) {
      if (typeof gate[field] !== "string" || !gate[field].trim()) problems.push(`${gate.id ?? "?"}: missing ${field}`);
    }
    if (gate.target !== 0) problems.push(`${gate.id}: target must be 0`);
    if (ids.has(gate.id)) problems.push(`${gate.id}: duplicate id`);
    ids.add(gate.id);
  }
  if (!ids.size) problems.push("no gates defined");
  return problems;
}

export function evaluate(definition, measures) {
  return definition.gates.map((gate) => {
    const measure = measures[gate.measure];
    if (!measure && gate.requiresSimilarity) return {gate, status: "not measured"};
    if (!measure) throw new Error(`${gate.id}: unknown measure ${gate.measure}`);
    if (measure.enforced) return {gate, measure, status: "at target"};
    return {gate, measure, status: measure.value === gate.target ? "at target" : "open"};
  });
}

function formatRow({gate, measure, status}) {
  const now = measure?.enforced ? "0 (enforced)" : measure ? String(measure.value) : "-";
  const split = measure?.bySurface && Object.keys(measure.bySurface).length > 1
    ? ` (${Object.entries(measure.bySurface).map(([surface, value]) => `${surface} ${value}`).join(", ")})`
    : "";
  const start = gate.baseline?.value ?? "-";
  return `${status === "at target" ? "done" : status === "open" ? "open" : "----"}  ${gate.id.padEnd(36)} now ${now}${split}; start ${start}`;
}

function runCli() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`Usage: node tool/design/consolidation_gates.mjs [--json] [--similarity] [--check]

Measures every consolidation done-gate in ${gatesPath}. --similarity also runs
the Flutter widget similarity build, which needs Dart and tool/widget_dedupe's
packages. --check validates the gate definitions and that every measure runs;
it never fails on the measured values.`);
    return;
  }
  const definition = JSON.parse(fs.readFileSync(fromRepo(gatesPath), "utf8"));
  const problems = validateGates(definition);
  if (problems.length) {
    console.error(problems.join("\n"));
    process.exit(1);
  }
  const measures = measureAll({priorityIds: definition.priorityT2 ?? [], similarity: args.includes("--similarity")});
  const rows = evaluate(definition, measures);
  if (args.includes("--json")) {
    console.log(JSON.stringify({rows: rows.map(({gate, measure, status}) =>
      ({id: gate.id, status, target: gate.target, baseline: gate.baseline ?? null, linear: gate.linear ?? [], ...measure}))}, null, 2));
    return;
  }
  for (const row of rows) console.log(formatRow(row));
  const measured = rows.filter((row) => row.status !== "not measured");
  const done = measured.filter((row) => row.status === "at target").length;
  console.log(`\nConsolidation done-gates: ${done} of ${measured.length} measured gates at target` +
    (measured.length < rows.length ? ` (${rows.length - measured.length} need --similarity).` : "."));
}

const isCliEntrypoint = process.argv[1] != null && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCliEntrypoint) runCli();
