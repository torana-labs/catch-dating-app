#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";

const repoRoot = fileURLToPath(new URL("../../", import.meta.url));
const waiverPath = path.join(
  repoRoot,
  "widgetbook/test/support/golden_coverage_waivers.json",
);
const coreRoots = [
  "lib/core/widgets/",
  "lib/platform/riverpod_ui/",
  "packages/catch_ui/lib/src/primitives/",
  "packages/catch_ui/lib/src/components/",
  "packages/catch_ui/lib/src/patterns/",
];
const waiverLimit = 20;
const simpleType = (value) => value?.replace(/<.*>/u, "");
const annotationKey = (row) =>
  [row.file, row.builder, simpleType(row.type), row.name].join(":");
const classKey = (row) => `${row.file}::${row.name ?? row.class}`;

export function validateGoldenCoverage({
  inventory,
  waivers,
  today,
  maximumWaivers = waiverLimit,
}) {
  const failures = [];
  const registrations = new Map();
  for (const row of inventory.generated ?? []) {
    const id = `${row.path}/${row.name}`;
    const key = annotationKey(row);
    if (registrations.has(key)) {
      failures.push(`${id}: duplicate generated Widgetbook registration`);
    }
    registrations.set(key, {...row, id});
  }

  const registeredCases = [];
  for (const row of inventory.cases ?? []) {
    const registration = registrations.get(annotationKey(row));
    if (registration != null) {
      registeredCases.push({...row, id: registration.id});
    }
  }
  const designatedCases = registeredCases.filter((row) =>
    coreRoots.some((root) => row.typeFile?.startsWith(root))
  );
  if (designatedCases.length === 0) {
    failures.push("No registered shared UI or app-adapter Widgetbook golden ids were found");
  }

  const surfaces = new Map();
  for (const row of inventory.coreSurface ?? []) {
    const key = classKey(row);
    if (surfaces.has(key)) failures.push(`${key}: duplicate core surface class`);
    surfaces.set(key, row);
  }
  if (surfaces.size === 0) {
    failures.push("Public Catch* shared UI and app-adapter surface is empty");
  }

  const waiverRows = new Map();
  for (const row of waivers ?? []) {
    const key = classKey(row);
    if (waiverRows.has(key)) failures.push(`${key}: duplicate golden waiver`);
    waiverRows.set(key, row);
    if (!(row.owner ?? "").trim()) {
      failures.push(`${key}: golden waiver requires an owner`);
    }
    if ((row.reason ?? "").trim().length < 20) {
      failures.push(`${key}: golden waiver requires a specific reason`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/u.test(row.expires ?? "")) {
      failures.push(`${key}: golden waiver expiry must use YYYY-MM-DD`);
    } else if (row.expires < today) {
      failures.push(`${key}: golden waiver expired ${row.expires}`);
    }
    if (!surfaces.has(key)) failures.push(`${key}: stale golden waiver`);
  }
  if (waiverRows.size > maximumWaivers) {
    failures.push(
      `Golden waiver count ${waiverRows.size} exceeds limit ${maximumWaivers}`,
    );
  }

  const rows = [...surfaces.values()]
    .sort((a, b) => classKey(a).localeCompare(classKey(b)))
    .map((surface) => {
      const ids = designatedCases
        .filter((goldenCase) =>
          goldenCase.typeFile === surface.file ||
          (goldenCase.productionReferences ?? []).some((reference) =>
            reference.file === surface.file &&
            reference.symbol === surface.name
          )
        )
        .map((goldenCase) => goldenCase.id)
        .sort();
      const waiver = waiverRows.get(classKey(surface)) ?? null;
      if (ids.length === 0 && waiver === null) {
        failures.push(
          `${classKey(surface)}: missing registered Widgetbook golden id or live waiver`,
        );
      }
      return {
        ...surface,
        status: ids.length > 0
          ? "covered"
          : waiver == null
            ? "uncovered"
            : "waived",
        goldenIds: ids,
        waiver,
      };
    });

  return {
    failures,
    rows,
    surfaceCount: surfaces.size,
    designatedCaseCount: designatedCases.length,
    coveredCount: rows.filter((row) => row.status === "covered").length,
    waiverCount: waiverRows.size,
  };
}

function runInventory() {
  const result = spawnSync(
    "dart",
    ["run", "widgetbook/test/support/triage_inventory.dart"],
    {
      cwd: repoRoot,
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
    },
  );
  if (result.status !== 0) {
    throw new Error(
      result.stderr || result.error?.message || "Widgetbook inventory failed",
    );
  }
  return JSON.parse(result.stdout);
}

function main(args) {
  if (args.includes("--help")) {
    console.log(
      "Usage: node tool/design/check_widgetbook_golden_coverage.mjs [--check|--json]\n" +
      "Compares every public Catch* shared UI and app-adapter class with registered " +
      "core Widgetbook golden ids or a live owner+expiry waiver.",
    );
    return;
  }
  if (args.some((arg) => !["--check", "--json"].includes(arg))) {
    throw new Error("Unknown argument; use --help");
  }
  const inventory = runInventory();
  const policy = JSON.parse(fs.readFileSync(waiverPath, "utf8"));
  const result = validateGoldenCoverage({
    inventory,
    waivers: policy.waivers,
    today: new Date().toISOString().slice(0, 10),
  });
  if (args.includes("--json")) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(
      `Widgetbook golden coverage: ${result.coveredCount}/` +
      `${result.surfaceCount} covered by ${result.designatedCaseCount} golden ids; ` +
      `${result.waiverCount}/${waiverLimit} live waivers.`,
    );
  }
  if (result.failures.length > 0) {
    console.error("Widgetbook golden coverage failed:");
    for (const failure of result.failures) console.error(`- ${failure}`);
    process.exitCode = 1;
  }
}

const isCli = process.argv[1] != null &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main(process.argv.slice(2));
