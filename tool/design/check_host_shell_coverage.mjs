#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {fromRepo, relativeToRepo} from "../lib/repo_paths.mjs";

const manifestPath = fromRepo(
  "design/source_packs/host-v2/host-coverage-manifest.json",
);
const shellPath = fromRepo("lib/routing/shell/host_app_shell.dart");
const routeInventoryPath = fromRepo("tool/ui_capture/route_inventory.json");
const captureCoveragePath = fromRepo("tool/ui_capture/capture_coverage.json");
const isCliEntrypoint =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

export function extractHostNavigationDestinations(source) {
  const marker = "List<AppShellNavigationItem> _hostNavigationItems";
  const start = source.indexOf(marker);
  if (start === -1) return [];
  return [
    ...source
      .slice(start)
      .matchAll(
        /destination:\s*AppShellNavigationDestination\.(host[A-Za-z0-9_]+)/gu,
      ),
  ].map((match) => match[1]);
}

export function validateHostShellCoverage({
  manifest,
  shellSource,
  routeInventory,
  captureCoverage,
  sourceExists = () => true,
}) {
  const errors = [];
  if (manifest?.$schema !== "catch.host-shell-coverage/v2") {
    errors.push("manifest schema must be catch.host-shell-coverage/v2");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(manifest?.updated ?? "")) {
    errors.push("manifest updated must be YYYY-MM-DD");
  }
  const routes = Array.isArray(manifest?.primaryRoutes)
    ? manifest.primaryRoutes
    : [];
  const shellDestinations = extractHostNavigationDestinations(shellSource);
  const declaredDestinations = routes.map((route) => route.destination);
  if (JSON.stringify(declaredDestinations) !== JSON.stringify(shellDestinations)) {
    errors.push(
      `primary destination order ${JSON.stringify(declaredDestinations)} does not match HostAppShell ${JSON.stringify(shellDestinations)}`,
    );
  }
  if (routes.length !== 5) {
    errors.push(`expected five primary Host routes, found ${routes.length}`);
  }
  const informationArchitecture = manifest?.informationArchitectureDecision;
  if (
    informationArchitecture?.selectedOption !==
    "today-events-audience-inbox-organizer"
  ) {
    errors.push(
      "information architecture must remain Today, Events, Audience, Inbox, Organizer",
    );
  }
  const declaredLabels = routes.map((route) => route.label);
  if (
    JSON.stringify(informationArchitecture?.primaryLabels) !==
    JSON.stringify(declaredLabels)
  ) {
    errors.push(
      `primary labels ${JSON.stringify(declaredLabels)} do not match the information architecture decision`,
    );
  }
  for (const [ownerKey, expectedRouteId] of Object.entries({
    todayOwnerRouteId: "hostTodayScreen",
    formsOwnerRouteId: "hostAudienceScreen",
    audiencesOwnerRouteId: "hostAudienceScreen",
    inboxWorkspaceOwnerRouteId: "hostInboxScreen",
  })) {
    if (informationArchitecture?.[ownerKey] !== expectedRouteId) {
      errors.push(`${ownerKey} must remain ${expectedRouteId}`);
    }
  }

  const routeIds = new Set();
  const inventoryById = new Map(
    (routeInventory?.routes ?? []).map((route) => [route.id, route]),
  );
  const coverageById = new Map(
    (captureCoverage?.routes ?? []).map((route) => [route.routeId, route]),
  );
  for (const route of routes) {
    if (routeIds.has(route.routeId)) {
      errors.push(`duplicate primary route ${route.routeId}`);
    }
    routeIds.add(route.routeId);
    const inventory = inventoryById.get(route.routeId);
    if (!inventory) {
      errors.push(`${route.routeId}: missing from route inventory`);
    } else if (inventory.runtimePath !== route.path) {
      errors.push(
        `${route.routeId}: manifest path ${route.path} does not match runtime path ${inventory.runtimePath}`,
      );
    }
    const coverage = coverageById.get(route.routeId);
    if (coverage?.status !== "captured") {
      errors.push(`${route.routeId}: capture coverage must be captured`);
    } else if (!(coverage.captureIds ?? []).includes(route.captureId)) {
      errors.push(
        `${route.routeId}: capture coverage does not own ${route.captureId}`,
      );
    }
    if (typeof route.source !== "string" || !sourceExists(route.source)) {
      errors.push(`${route.routeId}: missing production source ${route.source}`);
    }
  }

  if (routeIds.has("hostHomeScreen")) {
    errors.push("retired hostHomeScreen cannot be a primary destination");
  }
  const legacyHome = (manifest?.legacyRoutes ?? []).find(
    (route) => route.routeId === "hostHomeScreen",
  );
  if (
    legacyHome?.status !== "redirect" ||
    legacyHome?.canonicalRouteId !== "hostTodayScreen"
  ) {
    errors.push("hostHomeScreen must remain a redirect to hostTodayScreen");
  }
  for (const [legacyRouteId, canonicalRouteId] of Object.entries({
    hostCustomersLegacyScreen: "hostAudienceScreen",
    hostFormsLegacyScreen: "hostAudienceScreen",
  })) {
    const legacyRoute = (manifest?.legacyRoutes ?? []).find(
      (route) => route.routeId === legacyRouteId,
    );
    if (
      legacyRoute?.status !== "redirect" ||
      legacyRoute?.canonicalRouteId !== canonicalRouteId
    ) {
      errors.push(`${legacyRouteId} must remain a redirect to ${canonicalRouteId}`);
    }
  }
  return errors;
}

function checkHostShellCoverage() {
  const manifest = readJson(manifestPath);
  const routeInventory = readJson(routeInventoryPath);
  const captureCoverage = readJson(captureCoveragePath);
  const shellSource = fs.readFileSync(shellPath, "utf8");
  const errors = validateHostShellCoverage({
    manifest,
    shellSource,
    routeInventory,
    captureCoverage,
    sourceExists: (source) => fs.existsSync(fromRepo(source)),
  });
  if (errors.length > 0) {
    console.error("Host shell coverage check failed:");
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }
  console.log(
    `Host shell coverage is current: ${manifest.primaryRoutes.length} ordered destinations, information-architecture owners, routes, sources, and canonical captures.`,
  );
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`Could not read ${relativeToRepo(filePath)}: ${error.message}`);
  }
}

if (isCliEntrypoint) checkHostShellCoverage();
