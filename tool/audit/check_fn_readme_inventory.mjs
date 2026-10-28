#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {fromRepo, relativeToRepo} from "../lib/repo_paths.mjs";

const defaultBaselinePath = fromRepo("tool/audit/fn_readme_inventory_baseline.json");

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
  const inventory = /^## Function inventory\s*$/gmu.exec(source);
  if (!inventory) return names;
  const remainder = source.slice(inventory.index + inventory[0].length);
  const nextSection = /^## /gmu.exec(remainder);
  const section = nextSection ? remainder.slice(0, nextSection.index) : remainder;
  for (const line of section.split(/\r?\n/u)) {
    const firstCell = /^\|\s*([^|]+)\s*\|/u.exec(line)?.[1];
    if (!firstCell) continue;
    for (const match of firstCell.matchAll(/`([A-Za-z_$][\w$]*)`/gu)) {
      names.add(match[1]);
    }
  }
  return names;
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
    writeBaseline: false,
  };
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (arg === "--help" || arg === "-h") {
      parsed.help = true;
    } else if (arg === "--json") {
      parsed.json = true;
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
}

function runCli() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(`Usage:
  node tool/audit/check_fn_readme_inventory.mjs
  node tool/audit/check_fn_readme_inventory.mjs --json
  node tool/audit/check_fn_readme_inventory.mjs --write-baseline

Diffs functions/src/index.ts exports against current Function inventory rows in
functions/README.md in both directions. Historical mentions outside those rows
are ignored. Existing omissions are ratcheted through
tool/audit/fn_readme_inventory_baseline.json; obsolete allowances fail the check.`);
    return;
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
