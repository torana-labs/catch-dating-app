#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {repoRoot} from "../lib/repo_paths.mjs";
import {systemComponents} from "./lib/system_components.mjs";

// Generates the redesign programme's component matrix: every system component,
// its registry record, what each framework's public API exports today and what
// is left to do, so the table cannot go stale.

const registryPath = "design/components/catch.components.json";
const reactBarrel = "packages/web-ui/src/index.ts";
const dartBarrel = "packages/catch_ui/lib/catch_ui.dart";
export const matrixPath = "design/components/component_matrix.md";

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) runCli();

function runCli() {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== "--check")) {
    console.error("Usage: node tool/design/component_matrix.mjs [--check]");
    process.exit(64);
  }
  const expected = generateMatrix(repoRoot);
  const file = path.join(repoRoot, matrixPath);
  if (args.includes("--check")) {
    if (!fs.existsSync(file) || fs.readFileSync(file, "utf8") !== expected) {
      console.error(`${matrixPath} is stale. Run: node tool/design/component_matrix.mjs`);
      process.exit(1);
    }
    console.log(`Component matrix is current (${expected.split("\n").filter((line) => line.startsWith("| ")).length - 1} records).`);
    return;
  }
  fs.writeFileSync(file, expected);
  console.log(`Wrote ${matrixPath}.`);
}

export function generateMatrix(root, table = systemComponents) {
  const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
  const registry = JSON.parse(read(registryPath));
  return renderMatrix(buildRows({
    components: registry.components,
    reactExports: reactBarrelExports(read(reactBarrel)),
    dartExports: dartBarrelExports(root, dartBarrel),
    table,
  }));
}

/** Value exports of the React barrel; `export type` names no component. */
export function reactBarrelExports(source) {
  const names = new Set();
  for (const match of source.matchAll(/^export\s*\{([^}]*)\}/gmu)) {
    for (const entry of match[1].split(",")) {
      const name = entry.trim().split(/\s+as\s+/u).at(-1);
      if (name) names.add(name);
    }
  }
  for (const match of source.matchAll(/^export\s+(?:async\s+)?(?:function|class|const)\s+([A-Za-z_$][\w$]*)/gmu)) {
    names.add(match[1]);
  }
  return names;
}

/** Public declarations the Dart barrel exports, through nested exports, parts, `show` and `hide`. */
export function dartBarrelExports(root, barrel) {
  const seen = new Set();
  const visit = (relative) => {
    const names = new Set();
    if (seen.has(relative)) return names;
    seen.add(relative);
    const file = path.join(root, relative);
    if (!fs.existsSync(file)) return names;
    const source = fs.readFileSync(file, "utf8");
    for (const match of source.matchAll(/^(?:(?:abstract|base|final|interface|mixin|sealed)\s+)*(?:class|enum|typedef|mixin|extension\s+type)\s+([A-Z]\w*)/gmu)) {
      names.add(match[1]);
    }
    for (const match of source.matchAll(/^part\s+'([^']+)'\s*;/gmu)) {
      for (const name of visit(path.posix.join(path.posix.dirname(relative), match[1]))) names.add(name);
    }
    for (const match of source.matchAll(/^export\s+'([^']+)'([^;]*);/gmu)) {
      const exported = visit(path.posix.join(path.posix.dirname(relative), match[1]));
      const list = (keyword) => new RegExp(`\\b${keyword}\\s+([^;]*?)(?:\\b(?:show|hide)\\b|$)`, "u").exec(match[2])?.[1]
        .split(",").map((name) => name.trim()).filter(Boolean);
      const show = list("show");
      const hide = new Set(list("hide") ?? []);
      for (const name of exported) {
        if ((show ? show.includes(name) : true) && !hide.has(name)) names.add(name);
      }
    }
    return names;
  };
  return visit(barrel);
}

export function buildRows({components, reactExports, dartExports, table = systemComponents}) {
  const byId = new Map(components.map((component) => [component.id, component]));
  const rows = [];
  for (const [name, entry] of Object.entries(table)) {
    const system = [name, ...(entry.parts ?? [])].join(" + ");
    for (const id of entry.records) {
      const component = byId.get(id);
      if (!component) throw new Error(`${id}: the system table assigns ${name} to a record that does not exist`);
      const flutter = flutterToday(component, dartExports);
      const react = reactToday(component, reactExports);
      const absorbs = [...(component.aliases ?? []), ...(component.absorbs ?? [])]
        .filter((symbol) => (dartExports.has(symbol) || reactExports.has(symbol)) && symbol !== react);
      rows.push({
        system,
        id,
        tier: component.tier,
        flutter,
        react,
        action: actionFor(flutter, react),
        absorbs: [...new Set(absorbs)],
      });
    }
  }
  return rows;
}

/** A symbol that lives in the app, not the library, is named but marked. */
function flutterToday(component, dartExports) {
  const symbol = component.dart?.symbol;
  if (symbol) return dartExports.has(symbol) ? symbol : `${symbol} (app)`;
  return dartExports.has(component.name) ? component.name : null;
}

/** D9: the styled implementation shares the Flutter symbol, so it wins over a headless record. */
function reactToday(component, reactExports) {
  for (const symbol of [component.dart?.symbol, component.name, component.react?.symbol]) {
    if (symbol && reactExports.has(symbol)) return symbol;
  }
  return null;
}

function actionFor(flutter, react) {
  if (flutter && react) return "align";
  if (flutter) return "port react";
  if (react) return "port flutter";
  return "port both";
}

export function renderMatrix(rows) {
  const code = (value) => value == null ? "—" : value.replace(/^(\S+)( \(app\))?$/u, "`$1`$2");
  const lines = [
    "<!-- Generated by tool/design/component_matrix.mjs. Do not edit; run it after changing the registry or a barrel. -->",
    "",
    "# Component matrix",
    "",
    "Every design system component, the registry record that carries it, what each",
    "framework's public API exports today, and what is left to do. `align` means both",
    "exist; `port` means one is missing; `absorbs` lists the record's aliases and",
    "absorbed symbols that are still exported. An absorption happens when the",
    "absorbing component's first redesigned consumer lands. `(app)` marks a Flutter",
    "symbol outside `catch_ui`.",
    "",
    "| System | Registry | Tier | Flutter today | React today | Action |",
    "|---|---|---|---|---|---|",
  ];
  for (const row of rows) {
    const action = row.absorbs.length > 0
      ? `${row.action}; absorbs: ${row.absorbs.map((symbol) => `\`${symbol}\``).join(", ")}`
      : row.action;
    lines.push(`| ${row.system} | \`${row.id}\` | ${row.tier} | ${code(row.flutter)} | ${code(row.react)} | ${action} |`);
  }
  return `${lines.join("\n")}\n`;
}
