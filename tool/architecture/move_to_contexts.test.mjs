import assert from "node:assert/strict";
import test from "node:test";
import {loadContextMap} from "./check_context_map.mjs";
import {
  barrelSource,
  folderMoves,
  planMoves,
  pruneLegacyEntries,
  rewriteDartDirectives,
  rewritePathMentions,
  verifyMoveDiff,
  withBarrelExports,
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

test("planMoves keeps a generated part beside its source", () => {
  // A file entry places event_attendee.dart in bookings; its parts would
  // otherwise follow lib/events/ to the events context.
  const splitMap = loadContextMap(JSON.stringify({
    roots: map.roots,
    contexts: [{id: "events", owns: "Events."}, {id: "bookings", owns: "Bookings."}],
    legacy: [
      {path: "lib/events/", context: "events"},
      {path: "lib/events/domain/event_attendee.dart", context: "bookings"},
      {path: "lib/hosts/", layer: "app"},
      {path: "lib/hosts/data/host_profile_repository.dart", context: "events"},
    ],
  }));
  const {moves} = planMoves([
    "lib/events/domain/event_attendee.dart",
    "lib/events/domain/event_attendee.freezed.dart",
    "lib/events/domain/event_attendee.g.dart",
    "lib/hosts/data/host_profile_repository.dart",
    "lib/hosts/data/host_profile_repository.g.dart",
  ], splitMap);
  assert.deepEqual(Object.fromEntries(moves), {
    "lib/events/domain/event_attendee.dart": "lib/contexts/bookings/domain/event_attendee.dart",
    "lib/events/domain/event_attendee.freezed.dart": "lib/contexts/bookings/domain/event_attendee.freezed.dart",
    "lib/events/domain/event_attendee.g.dart": "lib/contexts/bookings/domain/event_attendee.g.dart",
    "lib/hosts/data/host_profile_repository.dart": "lib/contexts/events/data/host_profile_repository.dart",
    "lib/hosts/data/host_profile_repository.g.dart": "lib/contexts/events/data/host_profile_repository.g.dart",
  });
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

const sortMap = loadContextMap(JSON.stringify({
  roots: {
    contexts: "lib/contexts/",
    pages: "lib/pages/",
    kernel: "lib/kernel/",
    platform: "lib/platform/",
  },
  contexts: [{id: "events", owns: "Events."}],
  legacy: [
    {path: "lib/core/", layer: "platform"},
    {path: "lib/core/theme/", layer: "platform", moveTo: "lib/platform/theme/"},
    {path: "lib/core/widgets/", layer: "platform", moveTo: "lib/platform/widgets/"},
    {path: "lib/core/widgets/event_card.dart", layer: "platform", moveTo: "lib/contexts/events/parts/event_card.dart"},
    {path: "lib/core/firebase_providers.dart", layer: "platform", moveTo: "lib/platform/firebase/firebase_providers.dart"},
  ],
}));

test("planMoves sends moveTo folders and files, with their generated parts", () => {
  const {moves} = planMoves([
    "lib/core/theme/app_theme.dart",
    "lib/core/theme/README.md",
    "lib/core/widgets/event_card.dart",
    "lib/core/widgets/splash.dart",
    "lib/core/firebase_providers.dart",
    "lib/core/firebase_providers.g.dart",
    "lib/core/firebase_providers_test_fixture.dart",
    "lib/core/app_config.dart",
  ], sortMap);
  assert.deepEqual(Object.fromEntries(moves), {
    "lib/core/theme/app_theme.dart": "lib/platform/theme/app_theme.dart",
    "lib/core/theme/README.md": "lib/platform/theme/README.md",
    "lib/core/widgets/event_card.dart": "lib/contexts/events/parts/event_card.dart",
    "lib/core/widgets/splash.dart": "lib/platform/widgets/splash.dart",
    "lib/core/firebase_providers.dart": "lib/platform/firebase/firebase_providers.dart",
    "lib/core/firebase_providers.g.dart": "lib/platform/firebase/firebase_providers.g.dart",
  });
});

test("folderMoves lists only folders that move whole", () => {
  assert.deepEqual(folderMoves(sortMap), [["lib/core/theme/", "lib/platform/theme/"]]);
});

test("rewritePathMentions moves folder mentions and quoted leading-slash fragments", () => {
  const moves = new Map([["lib/core/fcm_service.dart", "lib/platform/push/fcm_service.dart"]]);
  const folders = [["lib/core/theme/", "lib/platform/theme/"]];
  const {source, count} = rewritePathMentions([
    "path.endsWith('/lib/core/fcm_service.dart')",
    "'/lib/core/theme/' lib/core/theme lib/core/theme/app_theme.dart",
    "'package:catch_dating_app/core/theme/app_theme.dart'",
    "lib/core/theme_extras.dart apps/host/lib/core/theme/x.dart x/lib/core/fcm_service.dart",
    "read('../../../../lib/core/fcm_service.dart')",
  ].join("\n"), moves, folders);
  assert.equal(count, 6);
  assert.equal(source, [
    "path.endsWith('/lib/platform/push/fcm_service.dart')",
    "'/lib/platform/theme/' lib/platform/theme lib/platform/theme/app_theme.dart",
    "'package:catch_dating_app/platform/theme/app_theme.dart'",
    "lib/core/theme_extras.dart apps/host/lib/core/theme/x.dart x/lib/core/fcm_service.dart",
    "read('../../../../lib/platform/push/fcm_service.dart')",
  ].join("\n"));
});

test("rewritePathMentions gives only lib/ folders a package URI form", () => {
  const folders = [["test/clubs/", "test/organizers/"], ["widgetbook/lib/clubs/", "widgetbook/lib/organizers/"]];
  const {source, count} = rewritePathMentions([
    "test/clubs/club_test.dart widgetbook/lib/clubs/catalog",
    "'package:catch_dating_app/clubs/clubs.dart'",
  ].join("\n"), new Map(), folders);
  assert.equal(count, 2);
  assert.equal(source, [
    "test/organizers/club_test.dart widgetbook/lib/organizers/catalog",
    "'package:catch_dating_app/clubs/clubs.dart'",
  ].join("\n"));
});

test("pruneLegacyEntries drops moveTo entries once their files have moved", () => {
  const {source, removed} = pruneLegacyEntries([
    "  \"legacy\": [",
    "    {\"path\": \"lib/core/\", \"layer\": \"platform\"},",
    "    {\"path\": \"lib/core/theme/\", \"layer\": \"platform\", \"moveTo\": \"lib/platform/theme/\"}",
    "  ]",
  ].join("\n"), ["lib/core/app_config.dart", "lib/platform/theme/app_theme.dart"]);
  assert.equal(removed, 1);
  assert.equal(source, [
    "  \"legacy\": [",
    "    {\"path\": \"lib/core/\", \"layer\": \"platform\"}",
    "  ]",
  ].join("\n"));
});

test("withBarrelExports adds only missing exports to an existing public API file", () => {
  const source = "// Public API.\nexport 'domain/event.dart';\n";
  const merged = withBarrelExports(source, "events", new Set([
    "lib/contexts/events/domain/event.dart",
    "lib/contexts/events/parts/event_card.dart",
  ]), sortMap);
  assert.equal(merged, "// Public API.\nexport 'domain/event.dart';\nexport 'parts/event_card.dart';\n");
  assert.equal(withBarrelExports(source, "events", new Set(["lib/contexts/events/domain/event.dart"]), sortMap), source);
});

test("verifyMoveDiff accepts folder mentions that moved with their folder", () => {
  const moves = new Map([["lib/core/theme/app_theme.dart", "lib/platform/theme/app_theme.dart"]]);
  const files = {
    old: {"lib/core/theme/app_theme.dart": "class T {}\n", "tool/lint.dart": "const x = '/lib/core/theme/';\n"},
    new: {"lib/platform/theme/app_theme.dart": "class T {}\n", "tool/lint.dart": "const x = '/lib/platform/theme/';\n"},
  };
  const problems = verifyMoveDiff({
    changes: [
      {status: "D", file: "lib/core/theme/app_theme.dart"},
      {status: "A", file: "lib/platform/theme/app_theme.dart"},
      {status: "M", file: "tool/lint.dart"},
    ],
    moves,
    folders: [["lib/core/theme/", "lib/platform/theme/"]],
    read: (side, file) => files[side][file],
  });
  assert.deepEqual(problems, []);
});
