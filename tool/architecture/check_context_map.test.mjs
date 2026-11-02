import assert from "node:assert/strict";
import test from "node:test";
import {
  checkSpecTable,
  loadContextMap,
  placePath,
  scanContextMap,
} from "./check_context_map.mjs";

const fixtureMapSource = JSON.stringify({
  roots: {
    contexts: "lib/contexts/",
    pages: "lib/pages/",
    kernel: "lib/kernel/",
    platform: "lib/platform/",
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

test("scanContextMap reports a spec table that drifts from the map", () => {
  const snapshot = (spec) => ({
    readTexts: (paths) => new Map([...paths].map((relativePath) => [relativePath,
      relativePath.endsWith(".json") ? fixtureMapSource : spec])),
  });
  assert.deepEqual(scanContextMap({snapshot: snapshot(fixtureSpec)}).findings, []);
  assert.deepEqual(scanContextMap({snapshot: snapshot("# no table\n")}).findings
    .map((finding) => finding.rule), ["specOutOfSync"]);
});
