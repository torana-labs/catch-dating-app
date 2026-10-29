#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {fromRepo, relativeToRepo} from "../lib/repo_paths.mjs";

const defaultBaselinePath = fromRepo("tool/audit/fn_readme_inventory_baseline.json");
// The README rows --write maintains sit between these markers.
export const INVENTORY_START_MARKER =
  "<!-- fn-inventory:start (generated rows: node tool/audit/check_fn_readme_inventory.mjs --write) -->";
export const INVENTORY_END_MARKER = "<!-- fn-inventory:end -->";
export const UNDESCRIBED_HEADING = "### Not yet described";
const UNDESCRIBED_PURPOSE = "Not yet described.";

const isCliEntrypoint =
  process.argv[1] != null &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCliEntrypoint) runCli();

export function scanFunctionReadmeInventory({
  root,
  baseline = emptyBaseline(),
}) {
  const indexPath = path.join(root, "functions/src/index.ts");
  const readmePath = path.join(root, "functions/README.md");
  const indexSource = fs.existsSync(indexPath)
    ? fs.readFileSync(indexPath, "utf8")
    : "";
  const readmeSource = fs.existsSync(readmePath)
    ? fs.readFileSync(readmePath, "utf8")
    : "";
  const exports = extractFunctionExports(indexSource);
  const documented = extractDocumentedFunctionNames(readmeSource);
  const exportNames = new Set(exports);
  const baselineKeys = new Set(
    (baseline.allowedFindings ?? []).map((finding) => findingKey(finding)),
  );

  const allFindings = exports
    .filter((name) => !documented.has(name))
    .map((name) => ({
      rule: "missingReadmeFunction",
      function: name,
      reason: "functions/README.md must list every exported function",
    })).concat([...documented]
      .filter((name) => !exportNames.has(name))
      .map((name) => ({
        rule: "staleReadmeFunction",
        function: name,
        reason: "Current functions/README.md inventory row has no index.ts export",
      })));
  const findings = [];
  const baselineFindings = [];
  for (const finding of allFindings) {
    if (baselineKeys.has(findingKey(finding))) {
      baselineFindings.push(finding);
    } else {
      findings.push(finding);
    }
  }
  const liveKeys = new Set(allFindings.map(findingKey));
  for (const allowance of baseline.allowedFindings ?? []) {
    if (liveKeys.has(findingKey(allowance))) continue;
    findings.push({
      rule: "staleBaselineAllowance",
      function: allowance.function,
      reason: `Remove obsolete baseline allowance: ${findingKey(allowance)}`,
    });
  }

  return {
    exports,
    documented: [...documented].sort(),
    baselinePath: baseline.path ?? null,
    findings,
    baselineFindings,
    allFindings,
    summary: {
      newFindings: findings.length,
      baselineFindings: baselineFindings.length,
    },
  };
}

export function extractFunctionExports(source) {
  const names = new Set();
  for (const match of source.matchAll(/export\s+(?:const|function)\s+(\w+)/gu)) {
    names.add(match[1]);
  }
  for (const match of source.matchAll(/export\s*\{([^}]*)\}/gsu)) {
    for (const rawPart of match[1].split(",")) {
      const part = rawPart.replace(/\/\/.*$/gmu, "").trim();
      if (!part) continue;
      const alias = /\bas\s+(\w+)$/u.exec(part);
      if (alias) {
        names.add(alias[1]);
        continue;
      }
      const name = /^(\w+)/u.exec(part)?.[1];
      if (name) names.add(name);
    }
  }
  return [...names].sort();
}

export function extractDocumentedFunctionNames(source) {
  const names = new Set();
  const region = inventoryRegion(source);
  if (!region) return names;
  for (const line of source.slice(region.start, region.end).split(/\r?\n/u)) {
    for (const name of rowFunctionNames(line)) names.add(name);
  }
  return names;
}

/**
 * The current inventory rows: the text between the generated-section markers
 * when the README has them, otherwise the "## Function inventory" section.
 */
function inventoryRegion(source) {
  const start = source.indexOf(INVENTORY_START_MARKER);
  const end = source.indexOf(INVENTORY_END_MARKER);
  if (start >= 0 && end > start) {
    return {start: start + INVENTORY_START_MARKER.length, end, marked: true};
  }
  const inventory = /^## Function inventory\s*$/gmu.exec(source);
  if (!inventory) return null;
  const sectionStart = inventory.index + inventory[0].length;
  const nextSection = /^## /gmu.exec(source.slice(sectionStart));
  return {
    start: sectionStart,
    end: nextSection ? sectionStart + nextSection.index : source.length,
    marked: false,
  };
}

function rowFunctionNames(line) {
  const firstCell = /^\|\s*([^|]+)\s*\|/u.exec(line)?.[1];
  if (!firstCell) return [];
  return [...firstCell.matchAll(/`([A-Za-z_$][\w$]*)`/gu)].map((match) => match[1]);
}

/** Maps each re-exported function name to the module index.ts exports it from. */
export function extractFunctionExportModules(source) {
  const modules = new Map();
  for (const match of source.matchAll(/export\s+(?:const|function)\s+(\w+)/gu)) {
    modules.set(match[1], null);
  }
  for (const match of source.matchAll(/export\s*\{([^}]*)\}\s*from\s*["']([^"']+)["']/gsu)) {
    for (const rawPart of match[1].split(",")) {
      const part = rawPart.replace(/\/\/.*$/gmu, "").trim();
      const name = /\bas\s+(\w+)$/u.exec(part)?.[1] ?? /^(\w+)/u.exec(part)?.[1];
      if (name) modules.set(name, match[2]);
    }
  }
  return modules;
}

/**
 * Rewrites the inventory rows between the README markers so they match
 * index.ts: a removed export leaves its row (or just its name in a shared
 * row), and an export with no row gets one under "Not yet described" with its
 * source file. Every other row, description and section stays as written.
 * Baseline-acknowledged findings are left for the baseline to track.
 */
export function writeFunctionReadmeInventory({root, baseline = emptyBaseline()}) {
  const readmePath = path.join(root, "functions/README.md");
  const indexSource = fs.readFileSync(path.join(root, "functions/src/index.ts"), "utf8");
  const readmeSource = fs.readFileSync(readmePath, "utf8");
  const region = inventoryRegion(readmeSource);
  if (!region?.marked) {
    throw new Error(`functions/README.md needs the ${INVENTORY_START_MARKER} and ${INVENTORY_END_MARKER} ` +
      "markers around its inventory rows before --write can maintain them.");
  }
  const result = scanFunctionReadmeInventory({root, baseline});
  const stale = new Set(result.findings
    .filter((finding) => finding.rule === "staleReadmeFunction").map((finding) => finding.function));
  const missing = result.findings
    .filter((finding) => finding.rule === "missingReadmeFunction").map((finding) => finding.function);

  const body = readmeSource.slice(region.start, region.end);
  const headingAt = body.search(new RegExp(`^${UNDESCRIBED_HEADING}\\s*$`, "mu"));
  const described = headingAt < 0 ? body : body.slice(0, headingAt);
  const undescribedRows = headingAt < 0 ? [] :
    body.slice(headingAt).split(/\r?\n/u).filter((line) => rowFunctionNames(line).length > 0);

  const pruned = described.split("\n").flatMap((line) => pruneRow(line, stale)).join("\n");
  const modules = extractFunctionExportModules(indexSource);
  const rows = [
    ...undescribedRows.flatMap((line) => pruneRow(line, stale)),
    ...missing.map((name) => `| \`${name}\` | \`${sourceFileFor(root, modules.get(name))}\` | ${UNDESCRIBED_PURPOSE} |`),
  ].sort((left, right) => rowFunctionNames(left)[0].localeCompare(rowFunctionNames(right)[0]));
  const nextBody = rows.length === 0 ? `${pruned.replace(/\n+$/u, "")}\n` :
    `${pruned.replace(/\n+$/u, "")}\n\n${undescribedSection(rows)}`;
  const nextReadme = readmeSource.slice(0, region.start) + nextBody + readmeSource.slice(region.end);
  const changed = nextReadme !== readmeSource;
  if (changed) fs.writeFileSync(readmePath, nextReadme);
  return {changed, added: missing, removed: [...stale].sort(), result};
}

// A shared row loses only the removed names; a row naming nothing current goes.
function pruneRow(line, stale) {
  const names = rowFunctionNames(line);
  if (names.length === 0 || !names.some((name) => stale.has(name))) return [line];
  const kept = names.filter((name) => !stale.has(name));
  if (kept.length === 0) return [];
  const firstCell = /^\|\s*([^|]+?)\s*\|/u.exec(line);
  const separator = firstCell[1].includes(" / ") ? " / " : ", ";
  return [`| ${kept.map((name) => `\`${name}\``).join(separator)} |${line.slice(firstCell[0].length)}`];
}

function undescribedSection(rows) {
  return [
    UNDESCRIBED_HEADING,
    "",
    "`--write` adds each export missing from this inventory here; move its row to its section and describe it.",
    "",
    "| Function | File | Purpose |",
    "|----------|------|---------|",
    ...rows,
    "",
  ].join("\n");
}

function sourceFileFor(root, specifier) {
  if (!specifier) return "src/index.ts";
  const relative = path.posix.join("src", specifier.replace(/^\.\//u, "").replace(/\.js$/u, ""));
  for (const candidate of [`${relative}.ts`, `${relative}/index.ts`]) {
    if (fs.existsSync(path.join(root, "functions", candidate))) return candidate;
  }
  return relative;
}

function baselineFromFindings(findings) {
  return {
    owner: "backend_operation_catalog",
    targetPhase: "docs/plans/ui_system_blueprint_and_conformance_audit.md#phase-6--continuous-conformance-folds-into-existing-lanes",
    version: 1,
    updated: new Date().toISOString().slice(0, 10),
    description:
      "Current functions README inventory debt baseline. Normal scanner runs fail on exported functions not listed here.",
    allowedFindings: findings
      .map(({rule, function: functionName}) => ({
        rule,
        function: functionName,
      }))
      .sort((a, b) => findingKey(a).localeCompare(findingKey(b))),
  };
}

function findingKey(finding) {
  return `${finding.rule}|${finding.function}`;
}

function readBaseline(file) {
  if (!fs.existsSync(file)) return emptyBaseline(file);
  try {
    return {
      ...JSON.parse(fs.readFileSync(file, "utf8")),
      path: relativeToRepo(file),
    };
  } catch (error) {
    console.error(`Failed to parse ${file}: ${error.message}`);
    process.exit(1);
  }
}

function emptyBaseline(file = null) {
  return {path: file == null ? null : relativeToRepo(file), allowedFindings: []};
}

function parseArgs(rawArgs) {
  const parsed = {
    baseline: null,
    help: false,
    json: false,
    root: null,
    write: false,
    writeBaseline: false,
  };
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (arg === "--help" || arg === "-h") {
      parsed.help = true;
    } else if (arg === "--json") {
      parsed.json = true;
    } else if (arg === "--check") {
      // The default mode, accepted explicitly.
    } else if (arg === "--write") {
      parsed.write = true;
    } else if (arg === "--write-baseline") {
      parsed.writeBaseline = true;
    } else if (arg === "--baseline") {
      parsed.baseline = path.resolve(requireValue(rawArgs, (index += 1), arg));
    } else if (arg === "--root") {
      parsed.root = path.resolve(requireValue(rawArgs, (index += 1), arg));
    } else {
      console.error(`Unknown argument: ${arg}`);
      process.exit(2);
    }
  }
  return parsed;
}

function requireValue(argsList, index, flag) {
  const value = argsList[index];
  if (value == null || value.startsWith("--")) {
    console.error(`Missing value for ${flag}`);
    process.exit(2);
  }
  return value;
}

function printFindings(result) {
  console.error(
    `Functions README inventory check failed (${result.findings.length} finding(s); ${result.baselineFindings.length} baseline finding(s) acknowledged).`,
  );
  for (const finding of result.findings) {
    console.error(`- ${finding.function}: ${finding.reason}`);
  }
  if (result.findings.some((finding) => finding.rule !== "staleBaselineAllowance")) {
    console.error("Run `node tool/audit/check_fn_readme_inventory.mjs --write` to add missing rows and drop removed ones.");
  }
}

function runCli() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(`Usage:
  node tool/audit/check_fn_readme_inventory.mjs
  node tool/audit/check_fn_readme_inventory.mjs --json
  node tool/audit/check_fn_readme_inventory.mjs --check
  node tool/audit/check_fn_readme_inventory.mjs --write
  node tool/audit/check_fn_readme_inventory.mjs --write-baseline

Diffs functions/src/index.ts exports against current Function inventory rows in
functions/README.md in both directions (--check, the default, fails on drift).
Historical mentions outside those rows are ignored. --write rewrites the rows
between the README's fn-inventory markers: removed exports leave, missing
exports gain a row under "Not yet described", and every other row and
description is kept. Existing omissions are ratcheted through
tool/audit/fn_readme_inventory_baseline.json; obsolete allowances fail the check.`);
    return;
  }
  if (args.write && args.writeBaseline) {
    console.error("Use --write or --write-baseline, not both.");
    process.exit(2);
  }

  const baselinePath = args.baseline ?? defaultBaselinePath;
  const root = args.root ?? fromRepo();
  const baseline = args.writeBaseline
    ? emptyBaseline(baselinePath)
    : readBaseline(baselinePath);
  const result = scanFunctionReadmeInventory({root, baseline});

  if (args.writeBaseline) {
    const nextBaseline = baselineFromFindings(result.allFindings);
    fs.mkdirSync(path.dirname(baselinePath), {recursive: true});
    fs.writeFileSync(
      baselinePath,
      `${JSON.stringify(nextBaseline, null, 2)}\n`,
    );
    if (!args.json) {
      console.log(
        `Wrote functions README inventory baseline with ${nextBaseline.allowedFindings.length} finding(s): ${normalizePath(path.relative(root, baselinePath))}`,
      );
    }
    if (args.json) {
      console.log(JSON.stringify({...result, writtenBaseline: nextBaseline}, null, 2));
    }
    return;
  }

  if (args.write) {
    let written;
    try {
      written = writeFunctionReadmeInventory({root, baseline});
    } catch (error) {
      console.error(error.message);
      process.exit(1);
    }
    const after = scanFunctionReadmeInventory({root, baseline});
    if (args.json) console.log(JSON.stringify({...after, written: {changed: written.changed, added: written.added, removed: written.removed}}, null, 2));
    else {
      console.log(written.changed ?
        `Updated functions/README.md inventory (${written.added.length} row(s) added, ${written.removed.length} removed export(s) dropped).` :
        "functions/README.md inventory is already current.");
    }
    if (after.findings.length > 0) {
      if (!args.json) printFindings(after);
      process.exit(1);
    }
    return;
  }

  if (args.json) console.log(JSON.stringify(result, null, 2));
  if (result.findings.length > 0) {
    if (!args.json) printFindings(result);
    process.exit(1);
  }
  if (!args.json) {
    console.log(
      `Functions README inventory check passed (${result.exports.length} export(s) checked; ${result.baselineFindings.length} baseline finding(s) acknowledged).`,
    );
  }
}

function normalizePath(filePath) {
  return filePath.split(path.sep).join("/");
}
