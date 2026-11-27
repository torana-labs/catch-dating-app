#!/usr/bin/env node
// The three per-screen registries CI checks code against, each split into one
// file per entry (see tool/lib/split_registry.mjs). Node readers import the
// read functions; Dart readers run this file with --json <registry>.
import {fileURLToPath} from "node:url";
import {repoRoot} from "../../lib/repo_paths.mjs";
import {readSplitRegistry, splitInlineEntries, splitRegistryFiles} from "../../lib/split_registry.mjs";

const basename = file => file.split("/").pop().replace(/\.dart$/u, "");

export const screenRegistrySpec = Object.freeze({
  index: "design/screens/catch.screens.json",
  collections: [
    {field: "layoutContracts", dir: "design/screens/registry/layout_contracts", kind: "map"},
    {field: "layoutOnlyRoutes", dir: "design/screens/registry/layout_only_routes", kind: "map"},
    {field: "imperativePageContracts", dir: "design/screens/registry/imperative_pages", kind: "map"},
    {field: "screens", dir: "design/screens/registry/screens", kind: "array",
      key: screen => screen.id, stem: screen => screen.id},
  ],
});

export const topBarRegistrySpec = Object.freeze({
  index: "tool/design/screen_top_bar_contracts.json",
  collections: [
    {field: "rootHeaders", dir: "tool/design/screen_top_bar_contracts/root_headers", kind: "array",
      key: header => header.branchKey, stem: header => header.branchKey},
    // Keyed by source path; the file is named after the Dart file when it is
    // added, and a later screen move rewrites the path without renaming it.
    {field: "contracts", dir: "tool/design/screen_top_bar_contracts/contracts", kind: "array",
      key: contract => contract.path},
    {field: "manualHeaders", dir: "tool/design/screen_top_bar_contracts/manual_headers", kind: "array",
      key: header => `${header.path}#${header.symbol}`},
  ],
});

export const captureCoverageSpec = Object.freeze({
  index: "tool/ui_capture/capture_coverage.json",
  collections: [
    {field: "routes", dir: "tool/ui_capture/capture_coverage", kind: "array",
      key: route => route.routeId, stem: route => route.routeId},
  ],
});

/** File stems the migration gives entries whose spec leaves the name free. */
export const topBarStems = {contracts: contract => basename(contract.path),
  manualHeaders: header => basename(header.path)};

const specs = {screens: screenRegistrySpec, "top-bar": topBarRegistrySpec, "capture-coverage": captureCoverageSpec};

export const readScreenRegistry = (root = repoRoot) => readSplitRegistry(root, screenRegistrySpec);
export const readTopBarRegistry = (root = repoRoot) => readSplitRegistry(root, topBarRegistrySpec);
export const readCaptureCoverage = (root = repoRoot) => readSplitRegistry(root, captureCoverageSpec);
export const screenRegistryFiles = (root = repoRoot) => splitRegistryFiles(root, screenRegistrySpec);

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [flag, name] = process.argv.slice(2);
  try {
    if (flag === "--split" && name === undefined) {
      for (const spec of Object.values(specs)) {
        const written = splitInlineEntries(repoRoot, spec, {stemOf: spec === topBarRegistrySpec ? topBarStems : {}});
        console.log(`${spec.index}: ${written.length} inline entries moved to their own files.`);
      }
    } else if (flag === "--json" && specs[name]) {
      process.stdout.write(`${JSON.stringify(readSplitRegistry(repoRoot, specs[name]))}\n`);
    } else {
      console.error(`Usage: node tool/design/lib/screen_registries.mjs --json ${Object.keys(specs).join("|")} | --split`);
      process.exit(64);
    }
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
