import assert from "node:assert/strict";
import test from "node:test";
import {
  checkMappedPaths,
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
