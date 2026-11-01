#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {spawnSync} from "node:child_process";
import {changedPathsSince} from "../harness/lib/git_changes.mjs";
import {matchesGlobPath as matchesGlob} from "../lib/path_glob.mjs";
import {repoRoot} from "../lib/repo_paths.mjs";

const args = process.argv.slice(2);
const command = args[0] ?? "--check";

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();

function main() {
  if (command === "--help" || command === "-h" || command === "help") {
    printHelp();
  } else if (command === "--check" || command === "check") {
    runGate();
  } else if (command === "--check-handoff") {
    runAffectedHandoff();
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

export function selectedHandoffChecks(manifest, changedPaths, {full = false} = {}) {
  const ids = ["design:figma-library-snapshot", "design:sync-manifest"];
  const control = changedPaths.some(file => [".github/**", "tool/lib/**", "tool/harness/**",
    "tool/tools_manifest.json", "tool/design/check_design_parity.mjs"].some(pattern => matchesGlob(file, pattern)));
  return ids.flatMap(id => {
    const entry = manifest.tools.find(tool => tool.id === id && tool.status === "active");
    if (!entry?.checks?.length || !entry.impactPaths?.length) throw new Error(`Missing scoped handoff owner: ${id}`);
    return full || control || changedPaths.some(file => file === entry.path ||
      entry.impactPaths.some(pattern => matchesGlob(file, pattern))) ? entry.checks : [];
  }).filter((command, index, commands) => commands.indexOf(command) === index);
}

function runAffectedHandoff() {
  const option = flag => args[args.indexOf(flag) + 1];
  const base = option("--base"), head = option("--head");
  if (!/^[a-f0-9]{40}$/u.test(base ?? "") || !/^[a-f0-9]{40}$/u.test(head ?? "") ||
      !["true", "false"].includes(option("--full")) || !["true", "false"].includes(option("--commit-window"))) {
    throw new Error("Handoff selection requires exact base/head and explicit full/commit-window flags.");
  }
  const changedPaths = changedPathsSince({base, head, committedOnly: true,
    commitWindow: option("--commit-window") === "true"});
  const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, "tool/tools_manifest.json"), "utf8"));
  const commands = selectedHandoffChecks(manifest, changedPaths, {full: option("--full") === "true"});
  console.log(JSON.stringify({sourceSha: head, baseSha: base, changedPaths, selectedCommands: commands}));
  for (const command of commands) run(command, {required: true});
}

function runGate() {
  const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, "tool/tools_manifest.json"), "utf8"));
  const blocking = designParityCommands(manifest);
  if (args.includes("--handoff")) blocking.push(
    "node tool/design/import_figma_library_snapshot.mjs --check",
    "node tool/design/build_design_sync_manifest.mjs --check",
  );
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
  node tool/design/check_design_parity.mjs --check [--reports] [--handoff]
  node tool/design/check_design_parity.mjs --check-handoff --base <sha> --head <sha> --full <true|false> --commit-window <true|false>

Runs the standard local design parity gate. Blocking checks validate component
concept topology, contracts, classification, new-widget inventory policy,
normalized-member-set decision coverage, pattern-family decisions,
focused similarity-generator tests, role-derived Widgetbook
obligations, seeded dedupe probes, route
inventory, capture coverage, Host shell coverage, screen coverage, screen
contracts, screen-chrome ownership, comprehensive todo summaries,
exhaustive cross-surface feature coverage, feature orchestration contracts, and
Widgetbook references. These source and metadata checks do not prove live visual
parity. --handoff checks Figma/Claude snapshot metadata and portable export
freshness; normal CI selects those checks from their actual inputs. --reports additionally builds whole-product widget similarity and prints
advisory screen migration reports; reports do not gate product acceptance.`);
}
