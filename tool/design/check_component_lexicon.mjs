#!/usr/bin/env node
import fs from "node:fs";
import {fromRepo, repoRoot} from "../lib/repo_paths.mjs";
import {collectComponentApi, componentApiProblems} from "./lib/component_api.mjs";
import {reactSymbolFiles} from "./component_concepts.mjs";

const knownBad = process.argv.includes("--known-bad");
const knownBadWebsite = process.argv.includes("--known-bad-website");
const knownBadAdapter = process.argv.includes("--known-bad-adapter");
const knownBadApi = process.argv.includes("--known-bad-api");
const surfacesOnly = process.argv.includes("--surfaces-only");
const allowedArgs = new Set(["--known-bad", "--known-bad-website", "--known-bad-adapter", "--known-bad-api", "--surfaces-only"]);
if (process.argv.slice(2).some((arg) => !allowedArgs.has(arg)) ||
    (surfacesOnly && knownBadApi)) {
  console.error("Use --surfaces-only for the Node-only cross-stack symbol check; API probes require the full default check.");
  process.exit(64);
}

// The registry assigns component identity. Its dart and react records name
// each framework's implementation, and the surface registries point their
// adapters at it by componentId (blueprint Phase 7c).
const registry = readJson("design/components/catch.components.json");
const surfaceRegistries = {
  website: "design/website/components.json",
  admin: "design/admin/components.json",
};
const webUiBarrel = "packages/web-ui/src/index.ts";
const failures = [];
const componentById = new Map(
  (registry.components ?? []).map((component) => [component.id, component])
);

if (knownBad) {
  const component = registry.components.find((entry) => entry.react);
  component.react = {...component.react, symbol: "__KnownMissingReactSymbol__"};
}

const declarationCache = new Map();
const barrelExports = typeScriptExports(webUiBarrel);
let reactLinks = 0;
for (const component of registry.components ?? []) {
  if (!dartClasses(component.dart?.file).has(component.dart?.symbol)) {
    failures.push(`${component.id}: dart.symbol '${component.dart?.symbol}' is not declared in ${component.dart?.file}`);
  }
  const react = component.react;
  if (!react) continue;
  for (const [symbol, file] of reactSymbolFiles(react)) {
    reactLinks += 1;
    if (!typeScriptExports(file).has(symbol)) {
      failures.push(`${component.id}: react symbol '${symbol}' was not found in ${file}`);
    } else if (!barrelExports.has(symbol)) {
      failures.push(`${component.id}: react symbol '${symbol}' is not exported from ${webUiBarrel}`);
    }
  }
  const story = react.storybook;
  if (story && !typeScriptExports(story.story).has(story.exportName)) {
    failures.push(`${component.id}: story '${story.exportName}' was not found in ${story.story}`);
  }
}

let adapterLinks = 0;
const adapterComponentIds = new Map();
for (const [surface, relativePath] of Object.entries(surfaceRegistries)) {
  const document = readJson(relativePath);
  if (knownBadWebsite && surface === "website") {
    document.components.push({
      id: "known_bad_website_adapter",
      source: "website/src/shared/ui/primitives/feedback.tsx",
      exportName: "__KnownMissingWebsiteSymbol__",
      componentId: "catch.badge",
    });
  }
  if (knownBadAdapter && surface === "website") {
    document.components.push({
      id: "known_bad_adapter",
      source: "website/src/shared/ui/primitives/feedback.tsx",
      exportName: "BadgeRow",
      componentId: "catch.distance_ring",
    });
  }
  for (const entry of document.components ?? []) {
    if (entry.componentId === undefined) continue;
    adapterLinks += 1;
    adapterComponentIds.set(`${surface}:${entry.exportName}`, entry.componentId);
    const contract = componentById.get(entry.componentId);
    if (!contract) {
      failures.push(`${relativePath}:${entry.id}: unknown componentId '${entry.componentId}'`);
      continue;
    }
    if (!["T1", "T2"].includes(contract.tier)) {
      failures.push(
        `${relativePath}:${entry.id}: ${entry.exportName} points at ${entry.componentId}, ` +
        `a ${contract.tier} contract that React does not implement`
      );
    }
    if (!typeScriptExports(entry.source).has(entry.exportName)) {
      failures.push(`${relativePath}:${entry.id}: ${entry.exportName} was not found in ${entry.source}`);
    }
  }
}

// Structural labels and status badges look alike in markup; keep them bound
// to distinct contracts on every stack. Both surfaces render the library
// CatchBadge directly, so no surface adapter may claim catch.badge.
const semanticDistinctions = [
  ["webui", "UiLabel", "catch.typography"],
  ["website", "UiLabel", "catch.typography"],
  ["admin", "AdminEyebrow", "catch.typography"],
  ["webui", "CatchBadge", "catch.badge"],
];
for (const [surface, symbol, expected] of semanticDistinctions) {
  const actual = surface === "webui"
    ? registry.components.find((component) => component.react?.symbol === symbol)?.id
    : adapterComponentIds.get(`${surface}:${symbol}`);
  if (actual !== expected) {
    failures.push(`${surface} ${symbol} must implement ${expected}, received '${actual ?? "missing"}'`);
  }
}
for (const [key, componentId] of adapterComponentIds) {
  if (componentId === "catch.badge") {
    failures.push(`${key.replace(":", " ")} wraps catch.badge; render the library CatchBadge instead`);
  }
}

if (!surfacesOnly) {
  const apiInventory = collectComponentApi({repoRoot});
  if (knownBadApi) {
    const input = apiInventory.classes?.find((row) => row.name === "CatchField")
      ?.constructors.find((row) => row.name === "input");
    if (!input) failures.push("API probe could not find the production Field.input constructor");
    else input.parameters.push({name: "unreviewedFlag", type: "bool", kind: "value", named: true});
  }
  const apiProblems = componentApiProblems(apiInventory);
  failures.push(...apiProblems.map((problem) =>
    `${problem.file ?? "component API"}:${problem.line ?? 0}: ${problem.message}`));
}

if (failures.length > 0) {
  console.error("Component lexicon check failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(
  `Component lexicon check passed (${componentById.size} contracts; ` +
  `${reactLinks} React symbols; ${adapterLinks} surface adapters` +
  (surfacesOnly ? "; surface symbols only)." : "; 0 shared API grammar violations).")
);

function dartClasses(relativePath) {
  return declarations(relativePath, /\bclass\s+([A-Za-z_][A-Za-z0-9_]*)/gu);
}

function typeScriptExports(relativePath) {
  return declarations(
    relativePath,
    /\bexport\s+(?:async\s+)?(?:function|class|const)\s+([A-Za-z_$][A-Za-z0-9_$]*)|^export\s*\{([^}]+)\}/gmu,
  );
}

function declarations(relativePath, pattern) {
  const key = `${relativePath}::${pattern.source}`;
  if (declarationCache.has(key)) return declarationCache.get(key);
  const symbols = new Set();
  const file = relativePath ? fromRepo(relativePath) : null;
  if (file && fs.existsSync(file) && fs.statSync(file).isFile()) {
    for (const match of fs.readFileSync(file, "utf8").matchAll(pattern)) {
      if (match[1]) symbols.add(match[1]);
      for (const name of (match[2] ?? "").split(",")) {
        const exported = name.trim().split(/\s+as\s+/u).at(-1);
        if (exported) symbols.add(exported);
      }
    }
  }
  declarationCache.set(key, symbols);
  return symbols;
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(fromRepo(relativePath), "utf8"));
}
