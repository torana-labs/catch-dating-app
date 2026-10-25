#!/usr/bin/env node
import fs from "node:fs";
import {fromRepo, relativeToRepo} from "../lib/repo_paths.mjs";

const routeInventoryPath = fromRepo("tool/ui_capture/route_inventory.json");
const coveragePath = fromRepo("tool/ui_capture/capture_coverage.json");
const catalogPath = fromRepo("test/ui_captures/catalog/screen_capture_catalog.dart");
const marketingManifestPath = fromRepo("tool/marketing/capture_manifest.json");
const args = process.argv.slice(2);
const command = args[0] ?? "--help";
const allowedStatuses = new Set(["captured", "alias", "planned", "excluded"]);
const allowedPriorities = new Set(["P1", "P2", "P3", "P4"]);

if (command === "--help" || command === "-h" || command === "help") {
  printHelp();
} else if (command === "--check" || command === "check") {
  checkCoverage({summary: args.includes("--summary")});
} else if (command === "--summary" || command === "summary") {
  checkCoverage({summary: true});
} else {
  console.error(`Unknown command: ${command}`);
  printHelp();
  process.exit(64);
}

function checkCoverage({summary = false} = {}) {
  const routeInventory = readJson(routeInventoryPath);
  const coverage = readJson(coveragePath);
  const catalog = parseCaptureCatalog(fs.readFileSync(catalogPath, "utf8"));
  const marketingManifest = readJson(marketingManifestPath);
  const errors = validateCoverage({
    routeInventory,
    coverage,
    catalog,
    marketingManifest,
  });

  if (summary || errors.length === 0) {
    printSummary(routeInventory, coverage, catalog);
  }

  if (errors.length > 0) {
    fail(errors);
  }
}

function validateCoverage({
  routeInventory,
  coverage,
  catalog,
  marketingManifest,
}) {
  const errors = [];
  if (!Array.isArray(routeInventory.routes)) {
    errors.push(`${relativeToRepo(routeInventoryPath)} must contain routes.`);
    return errors;
  }
  if (!Array.isArray(coverage.routes)) {
    errors.push(`${relativeToRepo(coveragePath)} must contain routes.`);
    return errors;
  }

  const routeIds = new Set(routeInventory.routes.map((route) => route.id));
  const coverageByRoute = new Map();
  const captureIds = new Set(catalog.map((entry) => entry.id));
  const catalogRouteIds = new Map();

  for (const entry of catalog) {
    if (catalogRouteIds.has(entry.id)) {
      errors.push(`${entry.id}: duplicate capture id in Dart catalog.`);
    }
    catalogRouteIds.set(entry.id, entry.routeIds);
    for (const routeId of entry.routeIds) {
      if (!routeIds.has(routeId)) {
        errors.push(`${entry.id}: unknown catalog route id ${routeId}.`);
      }
    }
  }

  for (const entry of coverage.routes) {
    const label = entry.routeId ?? "<missing routeId>";
    if (coverageByRoute.has(entry.routeId)) {
      errors.push(`${label}: duplicate coverage entry.`);
    }
    coverageByRoute.set(entry.routeId, entry);

    if (!routeIds.has(entry.routeId)) {
      errors.push(`${label}: unknown route id.`);
    }
    if (!allowedStatuses.has(entry.status)) {
      errors.push(`${label}: status must be one of ${[...allowedStatuses].join(", ")}.`);
    }
    if (!allowedPriorities.has(entry.priority)) {
      errors.push(`${label}: priority must be one of ${[...allowedPriorities].join(", ")}.`);
    }
    if (typeof entry.reason !== "string" || entry.reason.trim() === "") {
      errors.push(`${label}: reason is required.`);
    }

    if (entry.status === "captured") {
      validateCaptureIds(errors, label, entry, captureIds, catalogRouteIds);
    }

    if (entry.status === "alias") {
      if (typeof entry.canonicalRouteId !== "string" || entry.canonicalRouteId.trim() === "") {
        errors.push(`${label}: alias entries require canonicalRouteId.`);
      } else if (!routeIds.has(entry.canonicalRouteId)) {
        errors.push(`${label}: unknown canonicalRouteId ${entry.canonicalRouteId}.`);
      } else if (entry.canonicalRouteId === entry.routeId) {
        errors.push(`${label}: canonicalRouteId cannot point to itself.`);
      }
      if (entry.captureIds !== undefined) {
        validateCaptureIds(errors, label, entry, captureIds, catalogRouteIds);
      }
    }

    if ((entry.status === "planned" || entry.status === "excluded") && entry.captureIds) {
      errors.push(`${label}: ${entry.status} entries must not declare captureIds.`);
    }
  }

  for (const routeId of routeIds) {
    if (!coverageByRoute.has(routeId)) {
      errors.push(`${routeId}: missing capture coverage entry.`);
    }
  }

  for (const routeId of coverageByRoute.keys()) {
    if (!routeIds.has(routeId)) continue;
    const route = routeInventory.routes.find((entry) => entry.id === routeId);
    const entry = coverageByRoute.get(routeId);
    if (route.gated && entry.status !== "excluded" && entry.status !== "planned") {
      errors.push(`${routeId}: dev-gated routes should be planned or excluded by default.`);
    }
  }

  for (const capture of catalog) {
    for (const routeId of capture.routeIds) {
      const entry = coverageByRoute.get(routeId);
      if (!entry) continue;
      if (entry.status !== "captured" && entry.status !== "alias") {
        errors.push(
          `${capture.id}: catalog route ${routeId} is marked ${entry.status}; mark it captured or alias.`
        );
      }
      if (entry.status === "captured" && !entry.captureIds.includes(capture.id)) {
        errors.push(`${routeId}: captured route does not list ${capture.id}.`);
      }
    }
  }

  const activeMarketingFixtureKeys = new Set(
    (marketingManifest.captures ?? [])
      // Web captures name website stories; their recipes are validated by the
      // marketing exporter, not the Flutter screen capture catalog.
      .filter((capture) => capture.status === "active" && capture.kind !== "web-capture")
      .map((capture) => capture.fixtureKey)
  );
  const catalogMarketingFixtureKeys = new Set(
    catalog.flatMap((entry) => entry.marketingFixtureKeys)
  );
  for (const fixtureKey of activeMarketingFixtureKeys) {
    if (!catalogMarketingFixtureKeys.has(fixtureKey)) {
      errors.push(`${fixtureKey}: active marketing fixture has no capture catalog entry.`);
    }
  }

  return errors;
}

function validateCaptureIds(errors, label, entry, captureIds, catalogRouteIds) {
  if (!Array.isArray(entry.captureIds) || entry.captureIds.length === 0) {
    errors.push(`${label}: captured entries require captureIds.`);
    return;
  }

  for (const captureId of entry.captureIds) {
    if (!captureIds.has(captureId)) {
      errors.push(`${label}: unknown capture id ${captureId}.`);
      continue;
    }
    const routeIds = catalogRouteIds.get(captureId) ?? [];
    if (!routeIds.includes(entry.routeId)) {
      errors.push(`${label}: capture ${captureId} does not list this route in the Dart catalog.`);
    }
  }
}

function parseCaptureCatalog(source) {
  const entries = [];
  for (const block of extractCallBlocks(source, "ScreenCaptureEntry")) {
    const id = matchString(block, /\bid:\s*'([^']+)'/u);
    const routeIdsBlock = matchString(block, /\brouteIds:\s*const\s*<String>\s*\[([\s\S]*?)\]/u);
    const marketingBlock = matchString(
      block,
      /\bmarketingFixtureKeys:\s*const\s*<String>\s*\[([\s\S]*?)\]/u
    );
    if (!id) continue;
    entries.push({
      id,
      routeIds: parseStringList(routeIdsBlock),
      marketingFixtureKeys: parseStringList(marketingBlock),
    });
  }
  return entries;
}

function extractCallBlocks(source, callName) {
  const blocks = [];
  let searchIndex = 0;
  while (searchIndex < source.length) {
    const callIndex = source.indexOf(`${callName}(`, searchIndex);
    if (callIndex === -1) break;
    const openIndex = source.indexOf("(", callIndex);
    const endIndex = findBalancedEnd(source, openIndex, "(", ")");
    blocks.push(source.slice(callIndex, endIndex + 1));
    searchIndex = endIndex + 1;
  }
  return blocks;
}

function findBalancedEnd(source, openIndex, openChar, closeChar) {
  let depth = 0;
  let stringQuote = null;
  let escaped = false;
  for (let index = openIndex; index < source.length; index += 1) {
    const char = source[index];
    if (stringQuote) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === stringQuote) {
        stringQuote = null;
      }
      continue;
    }
    if (char === "'" || char === '"') {
      stringQuote = char;
      continue;
    }
    if (char === openChar) depth += 1;
    if (char === closeChar) {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  throw new Error(`Could not parse balanced call block starting at ${openIndex}.`);
}

function matchString(value, pattern) {
  return value.match(pattern)?.[1] ?? null;
}

function parseStringList(value) {
  if (!value) return [];
  return [...value.matchAll(/'([^']+)'/gu)].map((match) => match[1]);
}

function printSummary(routeInventory, coverage, catalog) {
  const counts = new Map();
  for (const entry of coverage.routes ?? []) {
    counts.set(entry.status, (counts.get(entry.status) ?? 0) + 1);
  }
  console.log(
    [
      `Routes: ${routeInventory.routes.length}`,
      `Captures: ${catalog.length}`,
      `Captured routes: ${counts.get("captured") ?? 0}`,
      `Aliases: ${counts.get("alias") ?? 0}`,
      `Planned: ${counts.get("planned") ?? 0}`,
      `Excluded: ${counts.get("excluded") ?? 0}`,
    ].join(" | ")
  );
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function fail(errors) {
  console.error("UI capture coverage check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

function printHelp() {
  console.log(`Usage: node tool/ui_capture/check_capture_coverage.mjs <command>

Commands:
  --check      Validate route coverage policy against route inventory and Dart catalog.
  --summary    Print coverage counts and validate the policy.
`);
}
