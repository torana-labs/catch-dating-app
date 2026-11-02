#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {spawnSync} from "node:child_process";
import {repoRoot} from "../lib/repo_paths.mjs";

const args = process.argv.slice(2);
const command = args[0] ?? "--check";

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();

function main() {
  if (command === "--help" || command === "-h" || command === "help") {
    printHelp();
  } else if (command === "--check" || command === "check") {
    runGate();
  } else {
    console.error(`Unknown command: ${command}`);
    printHelp();
    process.exit(64);
  }
}

export function designParityCommands(manifest) {
  const entry = manifest.tools.find(tool => tool.id === "design:parity-gate");
  if (!entry?.checks?.length) throw new Error("Missing explicit design parity checks.");
  if (entry.checks.some(command => command === "node tool/design/check_design_parity.mjs --check")) {
    throw new Error("Parity checks must be flat to share execution evidence.");
  }
  return [...new Set(entry.checks)];
}

function runGate() {
  const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, "tool/tools_manifest.json"), "utf8"));
  const blocking = designParityCommands(manifest);
  const advisory = args.includes("--reports") ? [
    "node tool/design/build_widget_similarity.mjs",
    "node tool/design/check_screen_coverage.mjs --advisory",
    "node tool/design/check_screen_contract_hygiene.mjs --summary",
    "node tool/design/check_screen_gutters.mjs --summary",
    "node tool/design/check_section_dividers.mjs --summary",
  ] : [];

  for (const commandLine of blocking) {
    run(commandLine, {required: true});
  }
  for (const commandLine of advisory) {
    run(commandLine, {required: false});
  }

  console.log("Design parity checks passed.");
}

function run(commandLine, {required}) {
  console.log(`==> ${commandLine}`);
  const result = spawnSync(commandLine, {
    cwd: repoRoot,
    shell: true,
    stdio: "inherit",
  });
  if (result.status !== 0 && required) {
    process.exit(result.status ?? 1);
  }
  if (result.status !== 0) {
    console.warn(`Advisory command failed: ${commandLine}`);
  }
}

function printHelp() {
  console.log(`Usage:
  node tool/design/check_design_parity.mjs --check [--reports]

Runs the standard local design parity gate. Blocking checks validate component
concept topology, contracts, classification, new-widget inventory policy,
normalized-member-set decision coverage, pattern-family decisions,
focused similarity-generator tests, role-derived Widgetbook
obligations, seeded dedupe probes, route
inventory, capture coverage, Host shell coverage, screen coverage, screen
contracts, screen-chrome ownership, comprehensive todo summaries,
exhaustive cross-surface feature coverage, feature orchestration contracts, and
Widgetbook references. These source and metadata checks do not prove live visual
parity. --reports additionally builds whole-product widget similarity and prints
advisory screen migration reports; reports do not gate product acceptance.`);
}
