#!/usr/bin/env node
import fs from "node:fs";
import {fromRepo, relativeToRepo} from "../lib/repo_paths.mjs";
import {buildInventory} from "../ui_capture/check_route_inventory.mjs";
import {readCaptureCoverage, readScreenRegistry} from "./lib/screen_registries.mjs";

const coveragePath = fromRepo("design/screens/screen_coverage.json");

const args = process.argv.slice(2);
const command = args[0] ?? "--help";
const allowedStatuses = new Set(["contracted", "alias", "planned", "excluded"]);
const allowedPriorities = new Set(["P1", "P2", "P3", "P4"]);

if (command === "--help" || command === "-h" || command === "help") {
  printHelp();
} else if (command === "--check" || command === "check") {
  checkCoverage({summary: args.includes("--summary")});
} else if (command === "--summary" || command === "summary") {
  checkCoverage({summary: true});
} else if (command === "--advisory" || command === "advisory") {
  printAdvisory();
} else {
  console.error(`Unknown command: ${command}`);
  printHelp();
  process.exit(64);
}

function checkCoverage({summary = false} = {}) {
  const coverage = readJson(coveragePath);
  const routeInventory = buildInventory();
  const screenContracts = readScreenRegistry();
  const captureCoverage = readCaptureCoverage();

  const errors = validateCoverage({
    coverage,
    routeInventory,
    screenContracts,
    captureCoverage,
  });

  if (summary || errors.length === 0) {
    printSummary(coverage, screenContracts);
  }

  if (errors.length > 0) {
    console.error("Screen coverage check failed:");
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
}

function validateCoverage({coverage, routeInventory, screenContracts, captureCoverage}) {
  const errors = [];
  const inventoryRoutes = routeInventory.routes ?? [];
  const routeIds = new Set(inventoryRoutes.map((route) => route.id));
  const renderKindByRoute = new Map(
    inventoryRoutes.map((route) => [route.id, route.renderKind]),
  );
  const captureCoverageRouteIds = new Set((captureCoverage.routes ?? []).map((route) => route.routeId));
  const screenIds = new Set();
  const screenRouteBindings = new Map();

  if (coverage.version !== 1) errors.push("version must be 1.");
  if (!isDate(coverage.updated)) errors.push("updated must be YYYY-MM-DD.");
  if (coverage.generatedAgainst !== "tool/ui_capture/check_route_inventory.mjs") {
    errors.push("generatedAgainst must be tool/ui_capture/check_route_inventory.mjs.");
  }
  if (typeof coverage.description !== "string" || coverage.description.trim() === "") {
    errors.push("description is required.");
  }
  if (!Array.isArray(coverage.routes) || coverage.routes.length === 0) {
    errors.push("routes must be a non-empty array.");
    return errors;
  }

  for (const screen of screenContracts.screens ?? []) {
    if (screenIds.has(screen.id)) errors.push(`${screen.id}: duplicate screen contract id.`);
    screenIds.add(screen.id);
    for (const route of screen.routes ?? []) {
      if (screenRouteBindings.has(route.id)) {
        const previous = screenRouteBindings.get(route.id);
        errors.push(`${route.id}: route is bound to both ${previous.screenId} and ${screen.id}.`);
      }
      screenRouteBindings.set(route.id, {
        screenId: screen.id,
        screenName: screen.name,
        screenPriority: screen.priority,
        role: route.role,
      });
    }
  }

  const coverageByRoute = new Map();
  const actualOrder = coverage.routes.map((entry) => entry.routeId);
  const expectedOrder = inventoryRoutes.map((route) => route.id);
  for (let index = 0; index < Math.max(actualOrder.length, expectedOrder.length); index += 1) {
    if (actualOrder[index] !== expectedOrder[index]) {
      errors.push(
        `routes[${index}]: expected ${expectedOrder[index] ?? "<none>"} from route inventory, found ${
          actualOrder[index] ?? "<none>"
        }.`
      );
      break;
    }
  }

  for (const entry of coverage.routes) {
    validateEntry(errors, {
      entry,
      routeIds,
      screenIds,
      screenRouteBindings,
      coverageByRoute,
    });
  }

  for (const route of inventoryRoutes) {
    if (!coverageByRoute.has(route.id)) {
      errors.push(`${route.id}: missing screen coverage entry.`);
    }
    if (!captureCoverageRouteIds.has(route.id)) {
      errors.push(`${route.id}: missing capture coverage entry; screen coverage depends on the same route inventory.`);
    }
  }

  for (const [routeId, binding] of screenRouteBindings.entries()) {
    const entry = coverageByRoute.get(routeId);
    if (!entry) continue;
    if (renderKindByRoute.get(routeId) === "redirect") {
      if (entry.status !== "alias") {
        errors.push(
          `${routeId}: route is redirect-only; mark screen coverage status as alias.`,
        );
      }
      if (entry.screenId !== undefined && entry.screenId !== binding.screenId) {
        errors.push(`${routeId}: optional alias screenId must be ${binding.screenId}.`);
      }
      continue;
    }
    if (entry.status !== "contracted") {
      errors.push(`${routeId}: route is listed in ${binding.screenId}; mark screen coverage status as contracted.`);
    }
    if (entry.screenId !== binding.screenId) {
      errors.push(`${routeId}: screenId must be ${binding.screenId}.`);
    }
  }

  for (const entry of coverage.routes) {
    if (entry.status !== "alias") continue;
    const canonical = coverageByRoute.get(entry.canonicalRouteId);
    if (!canonical) continue;
    if (canonical.status === "alias") {
      errors.push(`${entry.routeId}: canonicalRouteId ${entry.canonicalRouteId} must not point to another alias.`);
    }
    if (canonical.status === "excluded") {
      errors.push(`${entry.routeId}: canonicalRouteId ${entry.canonicalRouteId} cannot be excluded.`);
    }
  }

  return errors;
}

function validateEntry(
  errors,
  {entry, routeIds, screenIds, screenRouteBindings, coverageByRoute}
) {
  const label = entry?.routeId ?? "<missing routeId>";
  if (coverageByRoute.has(entry?.routeId)) {
    errors.push(`${label}: duplicate screen coverage entry.`);
  }
  coverageByRoute.set(entry?.routeId, entry);

  if (!routeIds.has(entry?.routeId)) errors.push(`${label}: unknown route id.`);
  if (!allowedStatuses.has(entry?.status)) {
    errors.push(`${label}: status must be one of ${[...allowedStatuses].join(", ")}.`);
  }
  if (!allowedPriorities.has(entry?.priority)) {
    errors.push(`${label}: priority must be one of ${[...allowedPriorities].join(", ")}.`);
  }
  if (typeof entry?.reason !== "string" || entry.reason.trim() === "") {
    errors.push(`${label}: reason is required.`);
  }

  if (entry?.status === "contracted") {
    if (typeof entry.screenId !== "string" || entry.screenId.trim() === "") {
      errors.push(`${label}: contracted entries require screenId.`);
    } else if (!screenIds.has(entry.screenId)) {
      errors.push(`${label}: unknown screenId ${entry.screenId}.`);
    }
    if (entry.canonicalRouteId !== undefined) {
      errors.push(`${label}: contracted entries must not declare canonicalRouteId.`);
    }
    const binding = screenRouteBindings.get(entry.routeId);
    if (!binding) {
      errors.push(`${label}: contracted route must be listed in design/screens/registry/.`);
    }
  }

  if (entry?.status === "alias") {
    if (typeof entry.canonicalRouteId !== "string" || entry.canonicalRouteId.trim() === "") {
      errors.push(`${label}: alias entries require canonicalRouteId.`);
    } else if (!routeIds.has(entry.canonicalRouteId)) {
      errors.push(`${label}: unknown canonicalRouteId ${entry.canonicalRouteId}.`);
    } else if (entry.canonicalRouteId === entry.routeId) {
      errors.push(`${label}: canonicalRouteId cannot point to itself.`);
    }
    if (entry.screenId !== undefined && !screenIds.has(entry.screenId)) {
      errors.push(`${label}: unknown screenId ${entry.screenId}.`);
    }
  }

  if (entry?.status === "planned" || entry?.status === "excluded") {
    if (entry.screenId !== undefined) {
      errors.push(`${label}: ${entry.status} entries must not declare screenId.`);
    }
    if (entry.canonicalRouteId !== undefined) {
      errors.push(`${label}: ${entry.status} entries must not declare canonicalRouteId.`);
    }
  }
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    console.error(`Failed to parse ${relativeToRepo(file)}: ${error.message}`);
    process.exit(1);
  }
}

function isDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/u.test(value ?? "");
}

function printSummary(coverage, screenContracts) {
  const counts = new Map();
  for (const entry of coverage.routes ?? []) {
    counts.set(entry.status, (counts.get(entry.status) ?? 0) + 1);
  }
  const screenCount = (screenContracts.screens ?? []).length;
  console.log(
    [
      `Screen coverage: ${relativeToRepo(coveragePath)}`,
      `Routes: ${(coverage.routes ?? []).length}`,
      `Contracted: ${counts.get("contracted") ?? 0}`,
      `Aliases: ${counts.get("alias") ?? 0}`,
      `Planned: ${counts.get("planned") ?? 0}`,
      `Excluded: ${counts.get("excluded") ?? 0}`,
      `Screen contracts: ${screenCount}`,
    ].join("\n")
  );
}

function printAdvisory() {
  const coverage = readJson(coveragePath);
  const p1Planned = (coverage.routes ?? [])
    .filter((entry) => entry.status === "planned" && entry.priority === "P1")
    .sort((a, b) => a.routeId.localeCompare(b.routeId));

  console.log(
    [
      "Screen coverage advisory:",
      `P1 planned routes awaiting contracts: ${p1Planned.length}`,
    ].join("\n")
  );

  for (const entry of p1Planned) {
    console.log(`- ${entry.routeId}: ${entry.reason}`);
  }
}

function printHelp() {
  console.log(`Usage:
  node tool/design/check_screen_coverage.mjs --check
  node tool/design/check_screen_coverage.mjs --summary
  node tool/design/check_screen_coverage.mjs --advisory

Validates design/screens/screen_coverage.json against the generated route
inventory, screen contracts, and capture coverage. Every route must be
contracted, aliased, planned, or excluded. Advisory mode lists P1 planned routes
that still need screen contracts.`);
}
