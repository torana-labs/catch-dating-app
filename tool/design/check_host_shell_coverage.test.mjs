import assert from "node:assert/strict";
import test from "node:test";
import {
  extractHostNavigationDestinations,
  validateHostShellCoverage,
} from "./check_host_shell_coverage.mjs";

const shellIds = ["today", "events", "people", "organizer"];
const destinations = ["hostToday", "hostEvents", "hostPeople", "hostOrganizer"];
const labels = ["Today", "Events", "People", "Organizer"];
const primaryRoutes = destinations.map((destination, index) => ({
  destination,
  routeId: `${destination}Screen`,
  path: `/host/${shellIds[index]}`,
  label: labels[index],
  source: `lib/${destination}.dart`,
  captureId: `capture-${index}`,
}));
const shellSource = `CatchTabBar<HostShellDestination> hostShellNavigation({}) {
  return CatchTabBar<HostShellDestination>(
    items: [
${shellIds
  .map((id) => `CatchTabBarItem(id: HostShellDestination.${id}),`)
  .join("\n")}
    ],
  );
}`;

function fixture() {
  return {
    manifest: {
      $schema: "catch.host-shell-coverage/v2",
      updated: "2026-08-29",
      informationArchitectureDecision: {
        selectedOption: "today-events-people-organizer",
        primaryLabels: primaryRoutes.map((route) => route.label),
        todayOwnerRouteId: "hostTodayScreen",
        formsOwnerRouteId: "hostAudienceScreen",
        audiencesOwnerRouteId: "hostAudienceScreen",
        inboxWorkspaceOwnerRouteId: "hostInboxScreen",
      },
      primaryRoutes,
      legacyRoutes: [
        {
          routeId: "hostHomeScreen",
          status: "redirect",
          canonicalRouteId: "hostTodayScreen",
        },
        {
          routeId: "hostCustomersLegacyScreen",
          status: "redirect",
          canonicalRouteId: "hostAudienceScreen",
        },
        {
          routeId: "hostFormsLegacyScreen",
          status: "redirect",
          canonicalRouteId: "hostAudienceScreen",
        },
      ],
    },
    shellSource,
    routeInventory: {
      routes: primaryRoutes.map((route) => ({
        id: route.routeId,
        runtimePath: route.path,
      })),
    },
    captureCoverage: {
      routes: primaryRoutes.map((route) => ({
        routeId: route.routeId,
        status: "captured",
        captureIds: [route.captureId],
      })),
    },
    sourceExists: () => true,
  };
}

test("extracts the ordered Host shell destination contract", () => {
  assert.deepEqual(extractHostNavigationDestinations(shellSource), destinations);
});

test("accepts four routes backed by runtime routes, sources, and captures", () => {
  assert.deepEqual(validateHostShellCoverage(fixture()), []);
});

test("rejects a retired primary route and missing canonical capture", () => {
  const input = fixture();
  input.manifest.primaryRoutes = [
    {
      destination: "hostHome",
      routeId: "hostHomeScreen",
      path: "/host",
      source: "lib/home.dart",
      captureId: "host-home",
    },
    ...input.manifest.primaryRoutes.slice(1),
  ];
  input.captureCoverage.routes[1].captureIds = [];
  const errors = validateHostShellCoverage(input);
  assert.ok(errors.some((error) => error.includes("destination order")));
  assert.ok(errors.some((error) => error.includes("retired hostHomeScreen")));
  assert.ok(errors.some((error) => error.includes("does not own capture-1")));
});

test("rejects the retired shell IA and its split Forms owner", () => {
  const input = fixture();
  input.manifest.informationArchitectureDecision = {
    ...input.manifest.informationArchitectureDecision,
    selectedOption: "forms-global-today-within-events",
    todayOwnerRouteId: "hostEventsScreen",
    formsOwnerRouteId: "hostFormsScreen",
  };
  const errors = validateHostShellCoverage(input);
  assert.ok(
    errors.some((error) =>
      error.includes("remain Today, Events, People, Organizer"),
    ),
  );
  assert.ok(
    errors.some((error) =>
      error.includes("todayOwnerRouteId must remain hostTodayScreen"),
    ),
  );
  assert.ok(
    errors.some((error) =>
      error.includes("formsOwnerRouteId must remain hostAudienceScreen"),
    ),
  );
});
