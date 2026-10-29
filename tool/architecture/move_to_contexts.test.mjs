import assert from "node:assert/strict";
import test from "node:test";
import {loadContextMap} from "./check_context_map.mjs";
import {
  barrelSource,
  planMoves,
  pruneLegacyEntries,
  rewriteDartDirectives,
  rewritePathMentions,
  verifyMoveDiff,
} from "./move_to_contexts.mjs";

const map = loadContextMap(JSON.stringify({
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
    {path: "lib/events/", context: "events"},
    {path: "lib/events/domain/event_participation", context: "bookings"},
    {path: "lib/hosts/data/crm/", context: "bookings"},
    {path: "lib/auth/", context: "events"},
  ],
}));

test("planMoves keeps the path below domain/ or data/ and sends root files to data/", () => {
  const {moves, collisions} = planMoves([
    "lib/events/domain/event.dart",
    "lib/events/domain/event.g.dart",
    "lib/events/domain/event_participation.dart",
    "lib/hosts/data/crm/host_contacts_repository.dart",
    "lib/auth/require_signed_in_uid.dart",
    "lib/events/events.dart",
    "lib/events/presentation/event_screen.dart",
    "lib/core/app_config.dart",
  ], map);

  assert.deepEqual(Object.fromEntries(moves), {
    "lib/events/domain/event.dart": "lib/contexts/events/domain/event.dart",
    "lib/events/domain/event.g.dart": "lib/contexts/events/domain/event.g.dart",
    "lib/events/domain/event_participation.dart":
      "lib/contexts/bookings/domain/event_participation.dart",
    "lib/hosts/data/crm/host_contacts_repository.dart":
      "lib/contexts/bookings/data/crm/host_contacts_repository.dart",
    "lib/auth/require_signed_in_uid.dart": "lib/contexts/events/data/require_signed_in_uid.dart",
  });
  assert.deepEqual(collisions, []);
});

test("planMoves reports two files landing on one path", () => {
  const {collisions} = planMoves([
    "lib/events/data/repository.dart",
    "lib/auth/data/repository.dart",
  ], map);
  assert.deepEqual(collisions.map(([target]) => target), [
    "lib/contexts/events/data/repository.dart",
  ]);
});

test("rewriteDartDirectives routes cross-context imports through the public API file", () => {
  const moves = new Map([
    ["lib/events/domain/event.dart", "lib/contexts/events/domain/event.dart"],
    ["lib/events/domain/event_participation.dart", "lib/contexts/bookings/domain/event_participation.dart"],
    ["lib/events/domain/event_participation.g.dart", "lib/contexts/bookings/domain/event_participation.g.dart"],
  ]);
  const barrelExports = new Map();
  const result = rewriteDartDirectives({
    file: "lib/events/domain/event_participation.dart",
    source: [
      "import 'package:catch_dating_app/core/app_config.dart';",
      "import 'package:catch_dating_app/events/domain/event.dart';",
      "import 'package:freezed_annotation/freezed_annotation.dart';",
      "",
      "part 'event_participation.g.dart';",
      "",
    ].join("\n"),
    moves,
    map,
    barrelExports,
  });

  assert.equal(result.changed, true);
  assert.match(result.source, /import 'package:catch_dating_app\/contexts\/events\/events\.dart';/u);
  assert.match(result.source, /import 'package:catch_dating_app\/core\/app_config\.dart';/u);
  assert.match(result.source, /part 'event_participation\.g\.dart';/u);
  assert.deepEqual([...barrelExports.get("events")], ["lib/contexts/events/domain/event.dart"]);
});

test("rewriteDartDirectives keeps one import when two files share a public API file", () => {
  const moves = new Map([
    ["lib/events/domain/a.dart", "lib/contexts/events/domain/a.dart"],
    ["lib/events/domain/b.dart", "lib/contexts/events/domain/b.dart"],
    ["lib/events/domain/event_participation.dart", "lib/contexts/bookings/domain/event_participation.dart"],
  ]);
  const result = rewriteDartDirectives({
    file: "lib/events/domain/event_participation.dart",
    source: [
      "import 'package:catch_dating_app/events/domain/a.dart';",
      "import 'package:catch_dating_app/events/domain/b.dart';",
      "",
    ].join("\n"),
    moves,
    map,
    barrelExports: new Map(),
  });
  assert.equal(
    result.source.match(/contexts\/events\/events\.dart/gu).length,
    1,
  );
});

test("rewriteDartDirectives points legacy barrels and tests at moved files", () => {
  const moves = new Map([
    ["lib/events/domain/event.dart", "lib/contexts/events/domain/event.dart"],
  ]);
  const barrel = rewriteDartDirectives({
    file: "lib/events/events.dart",
    source: "export 'domain/event.dart';\nexport 'presentation/event_screen.dart';\n",
    moves,
    map,
    barrelExports: new Map(),
  });
  assert.equal(
    barrel.source,
    "export 'package:catch_dating_app/contexts/events/domain/event.dart';\nexport 'presentation/event_screen.dart';\n",
  );
  const spec = rewriteDartDirectives({
    file: "test/events/event_test.dart",
    source: "import 'package:catch_dating_app/events/domain/event.dart';\nimport 'events_test_helpers.dart';\n",
    moves,
    map,
    barrelExports: new Map(),
  });
  assert.equal(
    spec.source,
    "import 'package:catch_dating_app/contexts/events/domain/event.dart';\nimport 'events_test_helpers.dart';\n",
  );
});

test("barrelSource lists the files other contexts import, relative and sorted", () => {
  const source = barrelSource("events", new Set([
    "lib/contexts/events/domain/event.dart",
    "lib/contexts/events/data/event_repository.dart",
  ]), map);
  assert.match(source, /export 'data\/event_repository\.dart';\nexport 'domain\/event\.dart';/u);
});

test("rewritePathMentions swaps whole moved paths only", () => {
  const moves = new Map([["lib/events/domain/event.dart", "lib/contexts/events/domain/event.dart"]]);
  const {source, count} = rewritePathMentions(
    '"lib/events/domain/event.dart" lib/events/domain/event.dart:12 lib/events/domain/event.dart.bak x/lib/events/domain/event.dart',
    moves,
  );
  assert.equal(count, 3);
  assert.equal(
    source,
    '"lib/contexts/events/domain/event.dart" lib/contexts/events/domain/event.dart:12 lib/contexts/events/domain/event.dart.bak x/lib/events/domain/event.dart',
  );
});

test("rewritePathMentions also swaps package URIs that generators embed", () => {
  const moves = new Map([["lib/events/domain/event.dart", "lib/contexts/events/domain/event.dart"]]);
  const {source, count} = rewritePathMentions(
    `"import 'package:catch_dating_app/events/domain/event.dart';" 'package:catch_dating_app/events/domain/event_draft.dart'`,
    moves,
  );
  assert.equal(count, 1);
  assert.equal(
    source,
    `"import 'package:catch_dating_app/contexts/events/domain/event.dart';" 'package:catch_dating_app/events/domain/event_draft.dart'`,
  );
});

test("pruneLegacyEntries drops entries that no longer place a file", () => {
  const {source, removed} = pruneLegacyEntries([
    "  \"legacy\": [",
    "    {\"path\": \"lib/events/\", \"context\": \"events\"},",
    "    {\"path\": \"lib/hosts/data/crm/\", \"context\": \"bookings\"}",
    "  ]",
  ].join("\n"), ["lib/events/presentation/event_screen.dart"]);
  assert.equal(removed, 1);
  assert.equal(source, [
    "  \"legacy\": [",
    "    {\"path\": \"lib/events/\", \"context\": \"events\"}",
    "  ]",
  ].join("\n"));
});

test("verifyMoveDiff accepts directive and path changes and flags anything else", () => {
  const moves = new Map([["lib/events/domain/event.dart", "lib/contexts/events/domain/event.dart"]]);
  const files = {
    old: {
      "lib/events/domain/event.dart": "import 'package:a/a.dart';\n\nclass Event {}\n",
      "docs/map.md": "See lib/events/domain/event.dart.\n",
      "lib/x.dart": "import 'package:catch_dating_app/events/domain/event.dart';\nvoid f() {}\n",
    },
    new: {
      "lib/contexts/events/domain/event.dart": "import 'package:a/a.dart';\n\n\nclass Event {}\n",
      "docs/map.md": "See lib/contexts/events/domain/event.dart.\n",
      "lib/x.dart": "import 'package:catch_dating_app/contexts/events/domain/event.dart';\nvoid f() => 1;\n",
      "lib/contexts/events/events.dart": "// Public API.\nexport 'domain/event.dart';\n",
    },
  };
  const problems = verifyMoveDiff({
    changes: [
      {status: "D", file: "lib/events/domain/event.dart"},
      {status: "A", file: "lib/contexts/events/domain/event.dart"},
      {status: "A", file: "lib/contexts/events/events.dart"},
      {status: "M", file: "docs/map.md"},
      {status: "M", file: "lib/x.dart"},
    ],
    moves,
    read: (side, file) => files[side][file],
  });
  assert.deepEqual(problems, ["lib/x.dart changed beyond directives and moved paths"]);
});
