#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

import {fromRepo} from "../lib/repo_paths.mjs";
import {buildLintEnforcementOutputs} from "./build_lint_enforcement_tables.mjs";
import {isPlannedWithoutDart} from "./component_concepts.mjs";

const isCli = process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCli) runCli();

export function checkComponentEnforcementCoverage({
  registry,
  pluginCodes,
  checkerCodes,
  harnessSource,
  generatedProbeMinimums,
  widgetbookNames = new Set(),
  today,
}) {
  const failures = [];
  const codeToComponents = new Map();
  let enforcementCount = 0;
  let verificationCount = 0;
  let waiverCount = 0;

  for (const component of registry.components ?? []) {
    const hasEnforcement = component.enforcement != null;
    const hasVerification = component.verification != null;
    const hasWaiver = component.waiver != null;
    if ([hasEnforcement, hasVerification, hasWaiver].filter(Boolean).length !== 1) {
      failures.push(
        `${component.id}: exactly one of enforcement, verification, or waiver is required`,
      );
      continue;
    }
    if (hasVerification) {
      verificationCount += 1;
      if (component.verification.vehicle !== "widgetbook-contract") {
        failures.push(
          `${component.id}: unsupported verification vehicle ${component.verification.vehicle}`,
        );
      }
      // The Widgetbook contract arrives with the planned component's first code.
      if (isPlannedWithoutDart(component)) continue;
      const symbol = component.dart?.symbol;
      if (!symbol || !widgetbookNames.has(symbol)) {
        failures.push(
          `${component.id}: verification requires generated Widgetbook contract ${symbol ?? "<missing Dart symbol>"}`,
        );
      }
      continue;
    }
    if (hasWaiver) {
      waiverCount += 1;
      if ((component.waiver.reason ?? "").trim().length < 12) {
        failures.push(`${component.id}: enforcement waiver requires a specific reason`);
      }
      if (!(component.waiver.owner ?? "").trim()) {
        failures.push(`${component.id}: enforcement waiver requires an owner`);
      }
      if (!/^\d{4}-\d{2}-\d{2}$/u.test(component.waiver.expires ?? "") ||
          component.waiver.expires < today) {
        failures.push(`${component.id}: enforcement waiver expired ${component.waiver.expires}`);
      }
      continue;
    }

    enforcementCount += 1;
    const enforcement = component.enforcement;
    const primaryImplementation = enforcement.vehicle === "plugin"
      ? pluginCodes
      : enforcement.vehicle === "checker"
        ? checkerCodes
        : null;
    if (primaryImplementation != null &&
        !primaryImplementation.has(enforcement.code)) {
      failures.push(
        `${component.id}: primary code ${enforcement.code} is not implemented by declared ${enforcement.vehicle} vehicle`,
      );
    }
    const codes = new Set([enforcement.code, ...(enforcement.codes ?? [])]);
    for (const code of codes) {
      if (!/^catch_[a-z0-9_]+$/u.test(code ?? "")) {
        failures.push(`${component.id}: invalid enforcement code ${code}`);
        continue;
      }
      if (!codeToComponents.has(code)) codeToComponents.set(code, []);
      codeToComponents.get(code).push(component.id);
    }
    if (enforcement.replaces?.length) {
      if (!enforcement.steeringCode || !enforcement.probeSeed) {
        failures.push(`${component.id}: steering entries require steeringCode and probeSeed`);
      }
      for (const constructor of enforcement.replaces) {
        const replacement = enforcement.replacementMap?.[constructor] ?? enforcement.replacement;
        if (!replacement) failures.push(`${component.id}: no replacement for ${constructor}`);
      }
    }
  }

  const implementedCodes = new Set([...pluginCodes, ...checkerCodes]);
  const catalogCodes = new Set(codeToComponents.keys());
  for (const code of [...implementedCodes].sort()) {
    if (!catalogCodes.has(code)) failures.push(`${code}: implemented code has no catalog owner`);
  }
  for (const code of [...catalogCodes].sort()) {
    if (!implementedCodes.has(code)) failures.push(`${code}: catalog code has no implementation`);
  }
  for (const code of [...pluginCodes].sort()) {
    if (!harnessSource.includes(`"${code}"`) &&
        !harnessSource.includes(`'${code}'`) &&
        !(generatedProbeMinimums[code] > 0)) {
      failures.push(`${code}: no manual or generated anti-vacuity expectation`);
    }
  }

  return {
    failures,
    metrics: {
      components: registry.components?.length ?? 0,
      enforcementCount,
      verificationCount,
      waiverCount,
      implementedCodes: implementedCodes.size,
      mappedCodes: catalogCodes.size,
      componentsWithoutDecision: failures.filter((failure) =>
        failure.includes("exactly one of enforcement, verification, or waiver")
      ).length,
      orphanLintCodes: [...implementedCodes].filter((code) => !catalogCodes.has(code)).length,
      expiredWaivers: failures.filter((failure) => failure.includes("waiver expired")).length,
    },
  };
}

function runCli() {
  if (process.argv.length > 2) {
    console.error("Usage: node tool/design/check_component_enforcement_coverage.mjs");
    process.exit(64);
  }
  const registry = readJson("design/components/catch.components.json");
  const pluginSource = [
    read("packages/catch_ui_lints/lib/src/catch_ui_rules.dart"),
    read("packages/catch_ui_lints/lib/src/catch_ui_feedback_rules.dart"),
    read("packages/catch_ui_lints/lib/src/catch_row_ownership_rules.dart"),
  ].join("\n");
  const checkerSource = read("tool/architecture/check_ui_composition_contracts.dart");
  const harnessSource = read("tool/check_catch_ui_lints.sh");
  const widgetbookSource = read("widgetbook/lib/main.directories.g.dart");
  const expectations = readJson("tool/design/generated/enforcement_expectations.json");
  const generated = buildLintEnforcementOutputs(registry);
  const generatedFiles = {
    "packages/catch_ui_lints/lib/src/catch_ui_rules_tables.g.dart": generated.tables,
    "tool/design/generated/enforcement_expectations.json": generated.expectations,
    "packages/catch_ui_lints/probes/catch_ui_lint_probes.dart": generated.probes,
  };
  const stale = Object.entries(generatedFiles)
    .filter(([relative, expected]) => read(relative) !== expected)
    .map(([relative]) => relative);
  const result = checkComponentEnforcementCoverage({
    registry,
    pluginCodes: extractPluginCodes(pluginSource),
    checkerCodes: extractCheckerCodes(checkerSource),
    harnessSource,
    generatedProbeMinimums: expectations.generatedProbeMinimums ?? {},
    widgetbookNames: extractWidgetbookNames(widgetbookSource),
    today: new Date().toISOString().slice(0, 10),
  });
  for (const relative of stale) {
    result.failures.push(`${relative}: generated output is stale`);
  }

  if (result.failures.length) {
    console.error("Catch component enforcement coverage failed:");
    for (const failure of result.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  const metrics = result.metrics;
  console.log(
    `Catch component enforcement coverage passed (${metrics.components} components; ` +
      `${metrics.enforcementCount} statically enforced; ${metrics.verificationCount} contract-verified; ` +
      `${metrics.waiverCount} temporary waivers; ${metrics.componentsWithoutDecision} without decisions; ` +
      `${metrics.orphanLintCodes} orphan codes; ${metrics.mappedCodes} mapped codes).`,
  );
}

export function extractWidgetbookNames(source) {
  return new Set(
    [...source.matchAll(/WidgetbookComponent\(\s*name:\s*'([^']+)'/gu)].map(
      (match) => match[1],
    ),
  );
}

export function extractPluginCodes(source) {
  return new Set(
    [...source.matchAll(/LintCode\(\s*'(catch_[a-z0-9_]+)'/gu)].map((match) => match[1]),
  );
}

export function extractCheckerCodes(source) {
  return new Set(
    [...source.matchAll(/const\s+\w+\s*=\s*'(catch_[a-z0-9_]+)'/gu)].map(
      (match) => match[1],
    ),
  );
}

function read(relative) {
  return fs.readFileSync(fromRepo(relative), "utf8");
}

function readJson(relative) {
  return JSON.parse(read(relative));
}
