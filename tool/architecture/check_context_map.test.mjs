import assert from "node:assert/strict";
import test from "node:test";
import {
  checkSpecTable,
  legacyContextFileFinding,
  loadContextMap,
  placePath,
  scanContextMap,
  scanFile,
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

function rules(relativePath, source) {
  return scanFile({relativePath, source, map}).map((finding) => finding.rule);
}

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

test("scanFile flags a context importing a context declared after it", () => {
  assert.deepEqual(rules("lib/events/domain/event.dart",
    "import 'package:catch_dating_app/events/domain/event_participation.dart';\n"),
  ["contextOrderImport"]);
  assert.deepEqual(rules("lib/tickets/data/ticket_repository.dart",
    "import 'package:catch_dating_app/events/domain/event.dart';\n"), []);
});

test("scanFile flags upward layer imports", () => {
  assert.deepEqual(rules("lib/core/widgets/event_thumbnail.dart",
    "import 'package:catch_dating_app/events/domain/event.dart';\n"),
  ["upwardLayerImport"]);
  assert.deepEqual(rules("lib/events/data/event_launcher.dart",
    "import 'package:catch_dating_app/routing/go_router.dart';\n"),
  ["upwardLayerImport"]);
  assert.deepEqual(rules("lib/pages/event_page/event_page.dart",
    "import 'package:catch_dating_app/routing/go_router.dart';\n"),
  ["upwardLayerImport"]);
  assert.deepEqual(rules("lib/activity/domain/activity_taxonomy.dart",
    "import 'package:catch_dating_app/core/labelled.dart';\n"),
  ["upwardLayerImport"]);
  assert.deepEqual(rules("lib/platform/firebase.dart",
    "import 'package:catch_dating_app/activity/domain/activity_taxonomy.dart';\n"), []);
});

test("scanFile lets app screens import anything", () => {
  assert.deepEqual(rules("lib/events/presentation/event_screen.dart", [
    "import 'package:catch_dating_app/routing/go_router.dart';",
    "import 'package:catch_dating_app/contexts/bookings/data/booking_repository.dart';",
  ].join("\n")), []);
});

test("scanFile flags new contexts that bypass the public API file", () => {
  assert.deepEqual(rules("lib/contexts/bookings/domain/booking.dart",
    "import 'package:catch_dating_app/contexts/events/domain/event.dart';\n"),
  ["contextBarrelBypass"]);
  assert.deepEqual(rules("lib/contexts/bookings/domain/booking.dart",
    "import 'package:catch_dating_app/contexts/events/events.dart';\n"), []);
  assert.deepEqual(rules("lib/contexts/bookings/domain/booking.dart",
    "import '../data/booking_repository.dart';\n"), []);
});

test("scanFile flags unmapped files and undeclared contexts", () => {
  assert.deepEqual(rules("lib/weddings/domain/wedding.dart", ""), ["unmappedFile"]);
  assert.deepEqual(rules("lib/contexts/weddings/domain/wedding.dart", ""),
    ["unknownContext"]);
});

test("legacy barrels may re-export their own screens but not another feature's", () => {
  assert.deepEqual(rules("lib/events/events.dart",
    "export 'presentation/event_screen.dart';\n"), []);
  assert.deepEqual(rules("lib/tickets/tickets.dart",
    "export 'package:catch_dating_app/events/presentation/event_screen.dart';\n"),
  ["upwardLayerImport"]);
});

test("relative imports resolve like package imports", () => {
  for (const uri of [
    "../domain/event_participation.dart",
    "package:catch_dating_app/events/domain/event_participation.dart",
  ]) {
    const findings = scanFile({relativePath: "lib/events/data/event_repository.dart",
      source: `import '${uri}';\n`, map});
    assert.deepEqual(findings.map(({rule, line}) => ({rule, line})),
      [{rule: "contextOrderImport", line: 1}], uri);
    assert.equal(findings[0].import, uri);
  }
});

test("scanContextMap ratchets legacy debt but never baselines new roots", () => {
  const snapshot = createFixtureSnapshot({
    "lib/events/domain/event.dart":
      "import 'package:catch_dating_app/events/domain/event_participation.dart';\n",
    "lib/contexts/events/domain/event.dart":
      "import 'package:catch_dating_app/contexts/bookings/bookings.dart';\n",
    "lib/core/widgets/event_thumbnail.dart":
      "import 'package:catch_dating_app/events/domain/event.dart';\n",
  });
  const allowedFindings = [
    {
      rule: "contextOrderImport",
      path: "lib/events/domain/event.dart",
      import: "package:catch_dating_app/events/domain/event_participation.dart",
    },
    {
      rule: "contextOrderImport",
      path: "lib/contexts/events/domain/event.dart",
      import: "package:catch_dating_app/contexts/bookings/bookings.dart",
    },
  ];

  const result = scanContextMap({snapshot, baseline: {allowedFindings}});

  assert.deepEqual(result.baselineFindings.map((finding) => finding.path),
    ["lib/events/domain/event.dart"]);
  assert.deepEqual(result.findings.map(({rule, path}) => ({rule, path})), [
    {rule: "contextOrderImport", path: "lib/contexts/events/domain/event.dart"},
    {rule: "upwardLayerImport", path: "lib/core/widgets/event_thumbnail.dart"},
  ]);
});

test("scanContextMap reports obsolete baseline allowances", () => {
  const snapshot = createFixtureSnapshot({
    "lib/events/domain/event.dart": "class Event {}\n",
  });
  const result = scanContextMap({snapshot, baseline: {allowedFindings: [{
    rule: "contextOrderImport",
    path: "lib/events/domain/event.dart",
    import: "package:catch_dating_app/events/domain/event_participation.dart",
  }]}});

  assert.deepEqual(result.findings.map((finding) => finding.rule),
    ["staleBaselineAllowance"]);
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

test("legacyContextFileFinding keeps legacy folders to screens and barrels once forbidden", () => {
  const strict = loadContextMap(JSON.stringify({
    ...JSON.parse(fixtureMapSource),
    forbidLegacyContextFiles: true,
  }));
  assert.equal(strict.forbidLegacyContextFiles, true);
  assert.deepEqual(
    legacyContextFileFinding("lib/events/domain/event.dart", strict).map((f) => f.rule),
    ["legacyContextFile"],
  );
  assert.deepEqual(legacyContextFileFinding("lib/events/events.dart", strict), []);
  assert.deepEqual(legacyContextFileFinding("lib/events/presentation/event_screen.dart", strict), []);
  assert.deepEqual(legacyContextFileFinding("lib/contexts/events/domain/event.dart", strict), []);
  assert.equal(map.forbidLegacyContextFiles, false);
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

function createFixtureSnapshot(files) {
  const sources = new Map(Object.entries({
    ...files,
    "tool/architecture/context_map.json": fixtureMapSource,
    "docs/app_architecture.md": fixtureSpec,
  }));
  return {
    listFiles({prefix = ""} = {}) {
      return [...sources.keys()]
        .filter((relativePath) => relativePath.startsWith(prefix))
        .sort();
    },
    readTexts(relativePaths) {
      return new Map([...relativePaths].map((relativePath) => [
        relativePath,
        sources.get(relativePath) ?? null,
      ]));
    },
  };
}
