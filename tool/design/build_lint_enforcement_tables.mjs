#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

import {fromRepo, repoRoot} from "../lib/repo_paths.mjs";
import {registryLegacyMembers} from "./check_library_shims.mjs";

const registryPath = fromRepo("design/components/catch.components.json");
const outputs = {
  tables: fromRepo("packages/catch_ui_lints/lib/src/catch_ui_rules_tables.g.dart"),
  expectations: fromRepo("tool/design/generated/enforcement_expectations.json"),
  probes: fromRepo("packages/catch_ui_lints/probes/catch_ui_lint_probes.dart"),
};

const isCli = process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCli) runCli();

export function buildLintEnforcementOutputs(registry) {
  const controlReplacements = new Map();
  const buttonConstructors = new Set();
  const codeToComponents = new Map();
  const probeCounts = new Map();
  const probeSeeds = [];

  for (const component of registry.components ?? []) {
    const enforcement = component.enforcement;
    if (!enforcement) continue;
    for (const code of new Set([enforcement.code, ...(enforcement.codes ?? [])])) {
      if (!codeToComponents.has(code)) codeToComponents.set(code, []);
      codeToComponents.get(code).push(component.id);
    }
    for (const constructor of enforcement.replaces ?? []) {
      if (enforcement.steeringGroup === "control") {
        const replacement = enforcement.replacementMap?.[constructor] ??
          enforcement.replacement ?? component.dart.symbol;
        controlReplacements.set(constructor, replacement);
      } else if (enforcement.steeringGroup === "button") {
        buttonConstructors.add(constructor);
      }
    }
    if (enforcement.replaces?.length && enforcement.probeSeed) {
      const code = enforcement.steeringCode ?? enforcement.code;
      probeCounts.set(code, (probeCounts.get(code) ?? 0) + 1);
      probeSeeds.push({component: component.id, code, seed: enforcement.probeSeed});
    }
  }

  const controls = [...controlReplacements].sort(([a], [b]) => a.localeCompare(b));
  const buttons = [...buttonConstructors].sort();
  const expectations = {
    version: 1,
    generatedFrom: "design/components/catch.components.json",
    registryUpdated: registry.updated,
    codeToComponents: Object.fromEntries(
      [...codeToComponents]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([code, ids]) => [code, [...new Set(ids)].sort()]),
    ),
    generatedProbeMinimums: Object.fromEntries([...probeCounts].sort()),
    generatedProbeComponents: probeSeeds.map(({component, code}) => ({component, code})),
  };

  return {
    tables: renderTables(controls, buttons, legacySymbols(registry)),
    expectations: `${JSON.stringify(expectations, null, 2)}\n`,
    probes: renderProbes(probeSeeds),
  };
}

// The Dart symbols of the registry's legacy members: what
// check_library_shims.mjs refuses under the new roots, and what keeps a
// carried file from being stale (catch_arch_stale_carry).
function legacySymbols(registry) {
  return [...new Set(registryLegacyMembers(registry).map((member) => member.name).filter(Boolean))].sort();
}

function renderTables(controls, buttons, legacy) {
  const controlSet = controls.map(([name]) => `  '${name}',`).join("\n");
  const replacementMap = controls
    .map(([name, replacement]) => `  '${name}': '${escapeDart(replacement)}',`)
    .join("\n");
  const buttonSet = buttons.map((name) => `  '${name}',`).join("\n");
  const legacySet = legacy.map((name) => `  '${escapeDart(name)}',`).join("\n");
  return `// GENERATED CODE - DO NOT MODIFY BY HAND.
//
// Regenerate with:
//   node tool/design/build_lint_enforcement_tables.mjs

// Source: design/components/catch.components.json

// This file is deliberately dependency-free so the analyzer plugin can load it
// in a fresh isolate without importing application code.

const catchRawControlConstructors = <String>{
${controlSet}
};

const catchRawControlReplacements = <String, String>{
${replacementMap}
};

const catchRawButtonControlConstructors = <String>{
${buttonSet}
};

const catchLegacyComponentSymbols = <String>{
${legacySet}
};
`;
}

function renderProbes(probeSeeds) {
  const children = probeSeeds
    .map(({component, code, seed}) => `        // ${component}: ${code}\n        ${seed},`)
    .join("\n");
  return `// GENERATED CODE - DO NOT MODIFY BY HAND.
// Copied into tool/catch_ui_lints_probe by check_catch_ui_lints.sh.
import 'package:flutter/material.dart';

class GeneratedCatchUiLintProbe extends StatelessWidget {
  const GeneratedCatchUiLintProbe({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: <Widget>[
${children}
      ],
    );
  }
}
`;
}

function escapeDart(value) {
  return value.replaceAll("\\", "\\\\").replaceAll("'", "\\'");
}

function runCli() {
  const check = process.argv.slice(2).includes("--check");
  const unknown = process.argv.slice(2).filter((argument) => argument !== "--check");
  if (unknown.length) {
    console.error(`Unknown argument: ${unknown[0]}`);
    process.exit(64);
  }
  const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
  const generated = buildLintEnforcementOutputs(registry);
  const failures = [];

  for (const [key, outputPath] of Object.entries(outputs)) {
    const expected = generated[key];
    if (check) {
      const actual = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, "utf8") : "";
      if (actual !== expected) failures.push(path.relative(repoRoot, outputPath));
      continue;
    }
    fs.mkdirSync(path.dirname(outputPath), {recursive: true});
    fs.writeFileSync(outputPath, expected);
  }

  if (failures.length) {
    console.error("Catch UI enforcement generated outputs are stale:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(
    check
      ? "Catch UI enforcement generated outputs are current."
      : "Generated Catch UI lint tables, expectations, and steering probes.",
  );
}
