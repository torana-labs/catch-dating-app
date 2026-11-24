import assert from "node:assert/strict";
import test from "node:test";
import {
  checkMappedPaths,
  checkMoveTargets,
  checkSpecTable,
  loadContextMap,
  placePath,
  scanContextMap,
} from "./check_context_map.mjs";

const fixtureMapSource = JSON.stringify({
  roots: {
    contexts: "lib/contexts/",
    pages: "lib/pages/",
    kernel: "packages/kernel/lib/",
    platform: "packages/platform/lib/",
  },
  contexts: [
    {id: "events", owns: "Events."},
    {id: "bookings", owns: "Bookings."},
  ],
  legacy: [
    {path: "lib/core/", layer: "platform"},
    {path: "lib/routing/", layer: "app"},
    {path: "lib/activity/", layer: "kernel"},
    {path: "lib/events/", context: "events"},
    {path: "lib/events/domain/event_participation.dart", context: "bookings"},
    {path: "lib/tickets/", context: "bookings"},
  ],
});
const map = loadContextMap(fixtureMapSource);
const fixtureSpec = [
  "# Spec",
  "",
  "## Bounded Context Contract",
  "",
  "| # | Context | Owns |",
  "|---|---|---|",
  "| 1 | `events` | Events. |",
  "| 2 | `bookings` | Bookings. |",
  "",
  "## Dependency Direction",
  "",
  "| 3 | `ignored` | Outside the section. |",
  "",
].join("\n");

test("placePath puts legacy UI in the app layer and legacy data in its context", () => {
  assert.deepEqual(placePath("lib/events/presentation/event_screen.dart", map),
    {layer: "app", context: "events", legacy: true});
  assert.deepEqual(placePath("lib/events/shared/event_tile.dart", map),
    {layer: "app", context: "events", legacy: true});
  assert.deepEqual(placePath("lib/events/data/event_repository.dart", map),
    {layer: "context", context: "events", legacy: true});
  assert.deepEqual(placePath("lib/events/domain/event_participation.dart", map),
    {layer: "context", context: "bookings", legacy: true});
  assert.deepEqual(placePath("lib/contexts/bookings/data/booking_repository.dart", map),
    {layer: "context", context: "bookings", legacy: false});
  assert.equal(placePath("lib/unknown/thing.dart", map), null);
});

test("loadContextMap rejects undeclared contexts and duplicate placements", () => {
  const base = JSON.parse(fixtureMapSource);
  assert.throws(() => loadContextMap(JSON.stringify({...base,
    legacy: [{path: "lib/x/", context: "weddings"}]})), /undeclared context weddings/u);
  assert.throws(() => loadContextMap(JSON.stringify({...base,
    legacy: [{path: "lib/x/", layer: "app"}, {path: "lib/x/", layer: "app"}]})),
  /places lib\/x\/ twice/u);
  assert.throws(() => loadContextMap(JSON.stringify({...base,
    contexts: [{id: "events", owns: "Events."}, {id: "events", owns: "Again."}]})),
  /declares events twice/u);
  assert.throws(() => loadContextMap(JSON.stringify({...base,
    contexts: [{id: "events", owns: ""}]})), /must say what it owns/u);
});

test("checkSpecTable fails when the spec's context table drifts from the map", () => {
  assert.deepEqual(checkSpecTable({source: fixtureSpec, map}), []);
  const reordered = fixtureSpec.replace("| 1 | `events`", "| 9 | `events`");
  assert.deepEqual(checkSpecTable({source: reordered, map}).map((f) => f.rule),
    ["specOutOfSync"]);
  const reworded = fixtureSpec.replace("Bookings. |", "Tickets. |");
  assert.match(checkSpecTable({source: reworded, map})[0].reason,
    /expected 2 bookings: Bookings\./u);
  assert.deepEqual(checkSpecTable({source: null, map}).map((f) => f.rule),
    ["specOutOfSync"]);
});

const fixtureFiles = [
  "lib/contexts/events/data/event_repository.dart",
  "lib/pages/home.dart",
  "packages/kernel/lib/kernel.dart",
  "packages/platform/lib/platform.dart",
  "lib/core/core.dart",
  "lib/routing/router.dart",
  "lib/activity/activity.dart",
  "lib/events/data/event_repository.dart",
  "lib/events/domain/event_participation.dart",
  "lib/tickets/ticket.dart",
];

test("checkMappedPaths fails on a root or legacy path that places no file", () => {
  assert.deepEqual(checkMappedPaths({map, files: fixtureFiles}), []);
  const withoutTickets = fixtureFiles.filter((file) => !file.startsWith("lib/tickets/"));
  const findings = checkMappedPaths({map, files: withoutTickets});
  assert.deepEqual(findings.map((finding) => finding.rule), ["mappedPathMissing"]);
  assert.match(findings[0].reason, /legacy entry lib\/tickets\/ matches no tracked file/u);
  const withoutPages = fixtureFiles.filter((file) => !file.startsWith("lib/pages/"));
  assert.match(checkMappedPaths({map, files: withoutPages})[0].reason,
    /root pages lib\/pages\//u);
  // A folder entry does not match a sibling that merely shares its prefix.
  const lookalike = [...withoutTickets, "lib/tickets_archive/old.dart"];
  assert.equal(checkMappedPaths({map, files: lookalike}).length, 1);
});

test("scanContextMap reports a spec table that drifts from the map", () => {
  const snapshot = (spec) => ({
    files: fixtureFiles,
    readTexts: (paths) => new Map([...paths].map((relativePath) => [relativePath,
      relativePath.endsWith(".json") ? fixtureMapSource : spec])),
  });
  assert.deepEqual(scanContextMap({snapshot: snapshot(fixtureSpec)}).findings, []);
  assert.deepEqual(scanContextMap({snapshot: snapshot("# no table\n")}).findings
    .map((finding) => finding.rule), ["specOutOfSync"]);
});

test("loadContextMap accepts moveTo and group and rejects malformed ones", () => {
  const base = JSON.parse(fixtureMapSource);
  const withEntry = (entry) => JSON.stringify({...base, legacy: [...base.legacy, entry]});
  const loaded = loadContextMap(withEntry({path: "lib/hosts/today/", layer: "app",
    moveTo: "apps/host/lib/today/", group: "host-today"}));
  assert.deepEqual(loaded.legacy.find((entry) => entry.group != null),
    {path: "lib/hosts/today/", layer: "app", moveTo: "apps/host/lib/today/", group: "host-today"});
  assert.throws(() => loadContextMap(withEntry({path: "lib/x/", layer: "app", group: "x"})),
    /has a group but no moveTo/u);
  assert.throws(() => loadContextMap(withEntry({path: "lib/x/", layer: "app",
    moveTo: "apps/host/lib/x/", group: "Host Today"})), /kebab-case group/u);
  assert.throws(() => loadContextMap(withEntry({path: "lib/x/", layer: "app",
    moveTo: "apps/host/lib/x.dart"})), /must move to a folder ending in \//u);
  assert.throws(() => loadContextMap(withEntry({path: "lib/x/y.dart", layer: "app",
    moveTo: "apps/host/lib/x/"})), /must move to a Dart file/u);
  assert.throws(() => loadContextMap(withEntry({path: "lib/firebase_options", layer: "platform",
    moveTo: "packages/platform/lib/firebase/"})), /must name a folder or a Dart file/u);
  assert.throws(() => loadContextMap(withEntry({path: "lib/x/", layer: "app",
    moveTo: "apps/host/lib/x/", owner: "me"})), /unknown field\(s\): owner/u);
});

test("checkMoveTargets allows only the screen-move destinations", () => {
  const base = JSON.parse(fixtureMapSource);
  const targets = [
    ["lib/a/", "apps/host/lib/a/"],
    ["lib/b/", "apps/kiosk/lib/b/"],
    ["lib/c/", "lib/pages/event/"],
    ["lib/d/", "lib/pages/startup/"],
    ["lib/e/", "lib/contexts/events/actions/"],
    ["lib/f/", "lib/contexts/events/parts/"],
    ["lib/g/", "lib/contexts/weddings/data/"],
    ["lib/h/", "packages/platform/lib/firebase/"],
    ["lib/i/", "packages/catch_test_support/lib/design_fixtures/"],
    ["lib/j/", "packages/catch_ui/lib/j/"],
    ["lib/k/", "lib/routing/k/"],
    ["test/l/", "apps/host/test/l/"],
    ["integration_test/m/", "apps/host/integration_test/m/"],
    ["lib/n/", "apps/host/test/n/"],
    ["test/o/", "apps/kiosk/test/o/"],
  ];
  const fixture = loadContextMap(JSON.stringify({...base, legacy: [...base.legacy,
    ...targets.map(([path, moveTo]) => ({path, layer: "app", moveTo, group: "g"}))]}));
  const findings = checkMoveTargets({map: fixture, files: ["apps/host/pubspec.yaml"]});
  assert.deepEqual(findings.map((finding) => finding.reason.split(" ")[0]).sort(),
    ["lib/b/", "lib/d/", "lib/f/", "lib/g/", "lib/j/", "lib/k/", "lib/n/", "test/o/"]);
  assert.ok(findings.every((finding) => finding.rule === "moveToInvalid"));
  assert.match(findings.find((f) => f.reason.startsWith("lib/d/")).reason, /Widgetbook corpus source/u);
  assert.match(findings.find((f) => f.reason.startsWith("lib/b/")).reason, /apps\/kiosk has no pubspec/u);
  assert.match(findings.find((f) => f.reason.startsWith("lib/n/")).reason, /only a root test file may move into an app's test/u);
  assert.match(findings.find((f) => f.reason.startsWith("test/o/")).reason, /apps\/kiosk has no pubspec/u);
});
