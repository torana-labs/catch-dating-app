#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {fromRepo} from "../lib/repo_paths.mjs";
import {createRepositorySnapshot} from "../lib/repository_snapshot.mjs";
import {lineCount} from "../test/check_flutter_test_size.mjs";

export const sourceSizeBaselinePath = "tool/architecture/flutter_source_size_baseline.json";
export const sourceSizeLimit = 800;
export const fieldFacadePath = "packages/catch_ui/lib/src/components/catch_field.dart";
export const fieldFacadeLimit = 1150;
// lib/routing/go_router.dart is the mandated single home of the route table:
// tool/ui_capture/check_route_inventory.mjs rejects GoRoute constructions in
// every other file, so its length is a function of route count, not
// decomposition debt. Route inventory and the new-widget inventory already
// bound what the file may contain; a line ratchet can only force cosmetic
// compression, so the file is exempt from the source-size budget entirely.
export const lineBudgetExemptPaths = new Set(["lib/routing/go_router.dart"]);
const owner = "app_architecture";
const targetPhase = "docs/plans/ui_system_blueprint_and_conformance_audit.md#phase-5--budgets-splits-and-estate-shrink";
const sourceRoots = /^(?:lib\/|packages\/|widgetbook\/lib\/)/u;

export function isHandwrittenSource(file) {
  if (!sourceRoots.test(file) || !file.endsWith(".dart")) return false;
  if (/\.(?:g|freezed|mocks|gr)\.dart$/u.test(file)) return false;
  // gen_l10n emits no generated-file header. This is its configured output home.
  if (/^lib\/l10n\/generated\/app_localizations(?:_[a-zA-Z_]+)?\.dart$/u.test(file)) return false;
  return true;
}

export function discoverFlutterSources({root = fromRepo(), snapshot = createRepositorySnapshot({root})} = {}) {
  const files = snapshot.listFiles().filter(file => sourceRoots.test(file) && file.endsWith(".dart"));
  const sources = snapshot.readTexts(files, {required: true});
  return files.filter(file => isHandwrittenSource(file))
    .map(file => ({path: file, lines: lineCount(sources.get(file))}))
    .sort((a, b) => a.path.localeCompare(b.path));
}

export function checkFlutterSourceSizes(rows, baseline) {
  const findings = [];
  if (baseline.schemaVersion !== 1 || baseline.maxLines !== sourceSizeLimit) {
    findings.push("source baseline must use schemaVersion 1 and the ratified 800-line ceiling");
  }
  if (baseline.owner !== owner || baseline.targetPhase !== targetPhase) {
    findings.push("source baseline must name its architecture owner and Phase 5 target");
  }
  if (!Array.isArray(baseline.allowedFindings)) {
    return [...findings, "source baseline allowedFindings must be an array"];
  }
  if (rows.length === 0) findings.push("source-size check cannot pass without handwritten source files");
  const rowsByPath = new Map(rows.map(row => [row.path, row]));
  const allowedByPath = new Map();
  for (const entry of baseline.allowedFindings) {
    if (typeof entry?.path !== "string" || !sourceRoots.test(entry.path) ||
        !Number.isInteger(entry.maxLines) || entry.maxLines <= sourceSizeLimit) {
      findings.push(`${entry?.path ?? "<missing path>"}: invalid source-size baseline entry`);
      continue;
    }
    if (allowedByPath.has(entry.path)) {
      findings.push(`${entry.path}: duplicate baseline entry`);
      continue;
    }
    allowedByPath.set(entry.path, entry);
  }
  for (const row of rows) {
    const allowed = allowedByPath.get(row.path);
    if (row.path === fieldFacadePath && row.lines > fieldFacadeLimit) {
      findings.push(`${row.path}: ${row.lines} lines exceeds its exact ${fieldFacadeLimit}-line facade exception`);
    }
    if (lineBudgetExemptPaths.has(row.path)) {
      if (allowed) findings.push(`${row.path}: exempt from the source-size budget; remove its baseline entry`);
      continue;
    }
    if (row.lines <= sourceSizeLimit) {
      if (allowed) findings.push(`${row.path}: baseline is stale at ${allowed.maxLines}; current ${row.lines} is within ${sourceSizeLimit}`);
    } else if (!allowed) {
      findings.push(`${row.path}: ${row.lines} lines exceeds ${sourceSizeLimit} without a baseline entry`);
    } else if (row.lines > allowed.maxLines) {
      findings.push(`${row.path}: grew from ${allowed.maxLines} to ${row.lines} lines`);
    } else if (row.lines < allowed.maxLines) {
      findings.push(`${row.path}: improved from ${allowed.maxLines} to ${row.lines}; refresh the baseline to lock in the reduction`);
    }
  }
  for (const allowed of allowedByPath.values()) {
    if (!rowsByPath.has(allowed.path)) findings.push(`${allowed.path}: baseline entry points to missing or generated source`);
  }
  return findings.sort();
}

export function buildFlutterSourceSizeBaseline(rows) {
  return {
    schemaVersion: 1,
    owner,
    targetPhase,
    maxLines: sourceSizeLimit,
    policy: "new_or_split_handwritten_sources_stay_bounded_existing_debt_cannot_grow",
    allowedFindings: rows.filter(row => row.lines > sourceSizeLimit && !lineBudgetExemptPaths.has(row.path))
      .map(row => ({path: row.path, maxLines: row.lines}))
      .sort((a, b) => a.path.localeCompare(b.path)),
  };
}

// Updating the JSON must not turn a newly oversized/split file into old debt.
// On first adoption, only files already oversized at the merge base may enter.
export function checkSourceBaselineHistory({baseline, previousBaseline, baseRows}) {
  const findings = [];
  const previous = new Map((previousBaseline?.allowedFindings ?? []).map(row => [row.path, row.maxLines]));
  const initial = new Map(baseRows.map(row => [row.path, row.lines]));
  for (const row of baseline.allowedFindings ?? []) {
    const ceiling = previousBaseline == null ? initial.get(row.path) : previous.get(row.path);
    if (ceiling == null || ceiling <= sourceSizeLimit) {
      findings.push(`${row.path}: new or split source cannot enter the legacy baseline`);
    } else if (row.maxLines > ceiling) {
      findings.push(`${row.path}: baseline ceiling grew from ${ceiling} to ${row.maxLines}`);
    }
  }
  return findings.sort();
}

function git(root, args) {
  const result = spawnSync("git", args, {cwd: root, encoding: "utf8", maxBuffer: 32 * 1024 * 1024,
    env: {...process.env, GIT_OPTIONAL_LOCKS: "0", GIT_NO_LAZY_FETCH: "1"}});
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `git ${args.join(" ")} failed`);
  }
  return result.stdout;
}

function readHistory(root, base, candidate) {
  const mergeBase = git(root, ["merge-base", base, "HEAD"]).trim();
  const paths = new Set(git(root, ["ls-tree", "-rz", "--name-only", mergeBase, "--",
    sourceSizeBaselinePath, ...candidate.allowedFindings.map(row => row.path)]).split("\0").filter(Boolean));
  const baselineSource = paths.has(sourceSizeBaselinePath)
    ? git(root, ["show", `${mergeBase}:${sourceSizeBaselinePath}`]) : null;
  const previousBaseline = baselineSource == null ? null : JSON.parse(baselineSource);
  const baseRows = [];
  if (previousBaseline == null) {
    for (const row of candidate.allowedFindings) {
      const source = paths.has(row.path) ? git(root, ["show", `${mergeBase}:${row.path}`]) : null;
      if (source != null && isHandwrittenSource(row.path)) {
        baseRows.push({path: row.path, lines: lineCount(source)});
      }
    }
  }
  return {previousBaseline, baseRows};
}

function parseArgs(argv) {
  const args = {root: fromRepo(), base: "origin/main", writeBaseline: false, json: false};
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--check") continue;
    if (arg === "--json") args.json = true;
    else if (arg === "--write-baseline") args.writeBaseline = true;
    else if (arg === "--base" || arg === "--root") {
      const value = argv[++index];
      if (!value || value.startsWith("--")) throw new Error(`${arg} requires a value`);
      args[arg.slice(2)] = value;
    } else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function main(argv) {
  if (argv.includes("--help")) {
    console.log("Usage: node tool/architecture/check_flutter_source_size.mjs [--check|--write-baseline] [--base origin/main] [--json] [--root path]");
    return;
  }
  const args = parseArgs(argv);
  const rows = discoverFlutterSources({root: args.root});
  const file = path.join(args.root, sourceSizeBaselinePath);
  const baseline = args.writeBaseline ? buildFlutterSourceSizeBaseline(rows) : JSON.parse(fs.readFileSync(file, "utf8"));
  const errors = checkFlutterSourceSizes(rows, baseline);
  if (errors.length === 0) errors.push(...checkSourceBaselineHistory({baseline, ...readHistory(args.root, args.base, baseline)}));
  const result = {checkedFiles: rows.length, oversizedFiles: baseline.allowedFindings?.length ?? 0,
    fieldFacade: rows.find(row => row.path === fieldFacadePath) ?? null, errors};
  if (errors.length > 0) {
    if (args.json) console.log(JSON.stringify(result, null, 2));
    else console.error(`Flutter source size check failed:\n${errors.map(error => `- ${error}`).join("\n")}`);
    process.exitCode = 1;
    return;
  }
  if (args.writeBaseline) {
    fs.mkdirSync(path.dirname(file), {recursive: true});
    fs.writeFileSync(file, `${JSON.stringify(baseline, null, 2)}\n`);
  }
  if (args.json) console.log(JSON.stringify(result, null, 2));
  else console.log(`Flutter source size check passed: ${rows.length} handwritten files; ${result.oversizedFiles} ratcheted entries${args.writeBaseline ? " (baseline refreshed)" : ""}.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
