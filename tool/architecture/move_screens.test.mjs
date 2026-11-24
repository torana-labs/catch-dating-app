import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {execFileSync, spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {loadContextMap} from "./check_context_map.mjs";
import {packageRoots, pruneLegacyEntries, trackedFiles} from "./lib/dart_moves.mjs";
import {classify} from "./lib/screen_move_plan.mjs";
import {applyGroupPlan, replayEntries, replayImports} from "./lib/screen_move_apply.mjs";
import {rewriteMentions, isMentionText, staleFolderMentions} from "./lib/screen_move_rewrite.mjs";
import {fixtureReads, goldenNames} from "./lib/screen_move_tests.mjs";
import {carriedAfterMove, dropStaleCarries, newRootMatcher} from "./lib/screen_move_outputs.mjs";
import {fixtureGraph, fixtureRepo, git, mapSource, planFor} from "./lib/screen_move_test_fixtures.mjs";
import {checkRepository, runCli} from "./move_screens.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const todayMap = mapSource([
  {path: "lib/hosts/", layer: "app"},
  {path: "lib/routing/", layer: "app"},
  {path: "lib/hosts/today/", layer: "app", moveTo: "apps/host/lib/today/", group: "host-today"},
]);

test("a library moves with its handwritten, cross-folder and generated parts, and directives cross packages", () => {
  const root = fixtureRepo({
    "tool/architecture/context_map.json": todayMap,
    "lib/hosts/today/today_screen.dart": [
      "import 'package:catch_dating_app/contexts/events/data/event_repository.dart';",
      "import 'today_state.dart';",
      "",
      "part 'sections/today_header.dart';",
      "part '../shared/today_footer.dart';",
      "part 'today_screen.g.dart';",
      "",
      "class TodayScreen {}",
      "",
    ].join("\n"),
    "lib/hosts/today/sections/today_header.dart": "part of '../today_screen.dart';\n",
    "lib/hosts/shared/today_footer.dart": "part of '../today/today_screen.dart';\n",
    "lib/hosts/today/today_screen.g.dart": "part of 'today_screen.dart';\n",
    "lib/hosts/today/today_state.dart": "class TodayState {}\n",
    "lib/hosts/today/README.md": "# Today\n",
    "apps/host/lib/shell.dart": "import 'package:catch_dating_app/hosts/today/today_screen.dart';\n\nclass Shell {}\n",
  });
  const {plan} = planFor(root, "host-today");
  assert.deepEqual(plan.errors, []);
  assert.deepEqual(Object.fromEntries(plan.sourceMoves), {
    "lib/hosts/today/README.md": "apps/host/lib/today/README.md",
    "lib/hosts/today/sections/today_header.dart": "apps/host/lib/today/sections/today_header.dart",
    "lib/hosts/shared/today_footer.dart": "apps/host/lib/shared/today_footer.dart",
    "lib/hosts/today/today_screen.g.dart": "apps/host/lib/today/today_screen.g.dart",
    "lib/hosts/today/today_screen.dart": "apps/host/lib/today/today_screen.dart",
    "lib/hosts/today/today_state.dart": "apps/host/lib/today/today_state.dart",
  });
  const screen = plan.writes.get("apps/host/lib/today/today_screen.dart");
  assert.match(screen, /^import 'package:catch_dating_app\/contexts\/events\/data\/event_repository\.dart';$/mu);
  assert.match(screen, /^import 'package:catch_host_app\/today\/today_state\.dart';$/mu);
  assert.match(screen, /^part 'sections\/today_header\.dart';$/mu);
  assert.match(screen, /^part '\.\.\/shared\/today_footer\.dart';$/mu);
  assert.equal(plan.writes.get("apps/host/lib/shell.dart"),
    "import 'package:catch_host_app/today/today_screen.dart';\n\nclass Shell {}\n");
});

test("a part an entry would place apart from its library is an error", () => {
  const root = fixtureRepo({
    "tool/architecture/context_map.json": mapSource([
      {path: "lib/hosts/", layer: "app"},
      {path: "lib/hosts/today/sections/", layer: "app", moveTo: "apps/host/lib/today/sections/", group: "split"},
    ]),
    "lib/hosts/today/today_screen.dart": "part 'sections/today_header.dart';\n",
    "lib/hosts/today/sections/today_header.dart": "part of '../today_screen.dart';\n",
  });
  const {plan} = planFor(root, "split");
  assert.deepEqual(plan.errors.map((error) => error.kind), ["part"]);
  assert.match(plan.errors[0].message, /is a part of lib\/hosts\/today\/today_screen\.dart, which does not move/u);
});

test("closure, cross-app, pages-forward and context-order errors block a move", () => {
  const root = fixtureRepo({
    "tool/architecture/context_map.json": mapSource([
      {path: "lib/hosts/", layer: "app"},
      {path: "lib/routing/", layer: "app"},
      {path: "lib/hosts/today/", layer: "app", moveTo: "apps/host/lib/today/", group: "host-today"},
      {path: "lib/hosts/door/door_screen.dart", layer: "app", moveTo: "lib/pages/door/door_screen.dart", group: "door-page"},
      {path: "lib/hosts/live/live_query.dart", layer: "app", moveTo: "lib/contexts/events/data/live_query.dart", group: "live-query"},
    ]),
    "lib/hosts/today/today_screen.dart": "class TodayScreen {}\n",
    "lib/routing/router.dart": "import 'package:catch_dating_app/hosts/today/today_screen.dart';\n\nfinal hostRouter = 1;\nfinal consumerRouter = 2;\n",
    "apps/consumer/lib/peek.dart": "import 'package:catch_dating_app/hosts/today/today_screen.dart';\n",
    "lib/hosts/door/door_screen.dart": "import 'package:catch_dating_app/hosts/today/today_screen.dart';\n",
    "lib/hosts/live/live_query.dart": "import 'package:catch_dating_app/contexts/live/data/live_repository.dart';\n",
  });
  const today = planFor(root, "host-today").plan;
  const kinds = today.errors.map((error) => `${error.kind} ${error.file}`).sort();
  assert.deepEqual(kinds, [
    "closure lib/hosts/door/door_screen.dart",
    "closure lib/routing/router.dart",
    "crossApp apps/consumer/lib/peek.dart",
  ]);
  assert.deepEqual(today.suggestion.additions, ["lib/hosts/door/door_screen.dart"]);
  assert.deepEqual(today.suggestion.blockers, ["lib/routing/router.dart"]);
  const door = planFor(root, "door-page").plan;
  assert.deepEqual(door.errors.map((error) => error.kind), ["upwardLayerImport"]);
  assert.match(door.errors[0].message, /moves into lib\/pages but imports lib\/hosts\/today\/today_screen\.dart \(app layer\)/u);
  const live = planFor(root, "live-query").plan;
  assert.deepEqual(live.errors.map((error) => error.kind), ["contextOrderImport"]);
  assert.match(live.errors[0].message, /moves into the events context but imports .* from live/u);
});

test("missing package dependencies of moved files are reported", () => {
  const root = fixtureRepo({
    "tool/architecture/context_map.json": todayMap,
    "lib/hosts/today/today_screen.dart": "import 'package:go_router/go_router.dart';\nimport 'package:flutter/widgets.dart';\n",
    "test/hosts/today/today_screen_test.dart": "import 'package:catch_dating_app/hosts/today/today_screen.dart';\nimport 'package:mocktail/mocktail.dart';\nimport 'package:flutter_test/flutter_test.dart';\n",
  });
  const {plan} = planFor(root, "host-today");
  assert.deepEqual(plan.errors.map((error) => error.message), [
    "apps/host/pubspec.yaml does not declare go_router, which 1 moving file(s) import (e.g. lib/hosts/today/today_screen.dart); add go_router to apps/host/pubspec.yaml in a separate PR first, since a move commit may not edit a pubspec.",
    "apps/host/pubspec.yaml does not declare mocktail, which 1 moving file(s) import (e.g. test/hosts/today/today_screen_test.dart); add mocktail to apps/host/pubspec.yaml in a separate PR first, since a move commit may not edit a pubspec.",
  ]);
});

test("tests follow their imports: mirror, folder mapping, destination, support files and goldens", () => {
  const root = fixtureRepo({
    "tool/architecture/context_map.json": mapSource([
      {path: "lib/hosts/", layer: "app"},
      {path: "lib/events/", layer: "app"},
      {path: "lib/hosts/today/", layer: "app", moveTo: "apps/host/lib/today/", group: "wave"},
      {path: "lib/hosts/door/", layer: "app", moveTo: "apps/host/lib/door/", group: "wave"},
      {path: "lib/events/presentation/event_tile.dart", layer: "app", moveTo: "lib/pages/event/event_tile.dart", group: "wave"},
    ]),
    "lib/hosts/today/today_screen.dart": "class TodayScreen {}\n",
    "lib/hosts/door/door_screen.dart": "class DoorScreen {}\n",
    "lib/hosts/today/today_state.dart": "class TodayState {}\n",
    "lib/events/presentation/event_tile.dart": "class EventTile {}\n",
    // 1. named after its subject, filed elsewhere
    "test/legacy/today_screen_test.dart": "import 'package:catch_dating_app/hosts/today/today_screen.dart';\nimport 'today_fixtures.dart';\n",
    // support used only by moving tests
    "test/legacy/today_fixtures.dart": "class TodayFixtures {}\n",
    // 2. its folder maps the way lib/hosts/door/ moved
    "test/hosts/door/door_flow_test.dart": "import 'package:catch_dating_app/hosts/door/door_screen.dart';\n",
    // 3. neither: the destination it imports most
    "test/journeys/host_journey_test.dart": [
      "import 'package:catch_dating_app/hosts/door/door_screen.dart';",
      "import 'package:catch_dating_app/hosts/today/today_screen.dart';",
      "import 'package:catch_dating_app/hosts/today/today_state.dart' as state;",
      "",
    ].join("\n"),
    // a golden companion
    "test/goldens/today_golden_test.dart": "import 'package:catch_dating_app/hosts/today/today_screen.dart';\n\nvoid main() => matchCatchGolden(tester, 'today_board', builder: null);\n",
    "test/goldens/baseline/today_board.light.png": "png",
    "test/goldens/baseline/today_board@2.0.dark.png": "png",
    "test/goldens/baseline/today_board_wide.light.png": "png",
    // re-mirrored inside the root package
    "test/events/event_tile_test.dart": "import 'package:catch_dating_app/events/presentation/event_tile.dart';\n",
  });
  const {plan} = planFor(root, "wave");
  assert.deepEqual(plan.errors, []);
  assert.deepEqual(Object.fromEntries(plan.testMoves), {
    "test/events/event_tile_test.dart": "test/pages/event/event_tile_test.dart",
    "test/goldens/today_golden_test.dart": "apps/host/test/goldens/today_golden_test.dart",
    "test/hosts/door/door_flow_test.dart": "apps/host/test/door/door_flow_test.dart",
    "test/journeys/host_journey_test.dart": "apps/host/test/today/host_journey_test.dart",
    "test/legacy/today_fixtures.dart": "apps/host/test/legacy/today_fixtures.dart",
    "test/legacy/today_screen_test.dart": "apps/host/test/today/today_screen_test.dart",
  });
  assert.deepEqual(Object.fromEntries(plan.goldenMoves), {
    "test/goldens/baseline/today_board.light.png": "apps/host/test/goldens/baseline/today_board.light.png",
    "test/goldens/baseline/today_board@2.0.dark.png": "apps/host/test/goldens/baseline/today_board@2.0.dark.png",
  });
  assert.match(plan.writes.get("apps/host/test/today/today_screen_test.dart"),
    /import '\.\.\/legacy\/today_fixtures\.dart';/u);
});

test("tests reaching two apps, shared support and fixture reads are errors", () => {
  const root = fixtureRepo({
    "tool/architecture/context_map.json": mapSource([
      {path: "lib/hosts/", layer: "app"},
      {path: "lib/home/", layer: "app"},
      {path: "lib/hosts/today/", layer: "app", moveTo: "apps/host/lib/today/", group: "both"},
      {path: "lib/home/", layer: "app", moveTo: "apps/consumer/lib/home/", group: "both"},
    ].filter((entry, index) => index !== 1)),
    "lib/hosts/today/today_screen.dart": "class TodayScreen {}\n",
    "lib/home/home_screen.dart": "class HomeScreen {}\n",
    "test/mixed_test.dart": "import 'package:catch_dating_app/hosts/today/today_screen.dart';\nimport 'package:catch_dating_app/home/home_screen.dart';\n",
    "test/hosts/today/today_screen_test.dart": "import 'package:catch_dating_app/hosts/today/today_screen.dart';\nimport '../../pump.dart';\n\nfinal photo = File('test/goldens/fixtures/portrait.jpg');\nfinal temp = File('/tmp/x.jpg');\n",
    "test/pump.dart": "void pump() {}\n",
    "test/other_test.dart": "import 'pump.dart';\n",
  });
  const {plan} = planFor(root, "both");
  assert.deepEqual(plan.errors.map((error) => `${error.kind} ${error.file}`).sort(), [
    "fixtureRead test/hosts/today/today_screen_test.dart",
    "testSupport test/pump.dart",
    "testTwoApps test/mixed_test.dart",
  ]);
  assert.deepEqual(fixtureReads("File('lib/x.dart') File('/abs') File('event-a.jpg') Directory('lib')", ["lib/a.dart"]), ["lib/x.dart", "lib"]);
  assert.deepEqual(goldenNames("await matchCatchGolden(\n  tester,\n  'profile_redesign',\n)"), ["profile_redesign"]);
});

test("barrel imports in moving files become direct imports; barrel exports of files leaving lib/ are deleted", () => {
  const root = fixtureRepo({
    "tool/architecture/context_map.json": todayMap,
    "lib/hosts/hosts.dart": "export 'presentation/host_card.dart';\nexport 'today/today_screen.dart'; // public-api: route entry\nexport 'presentation/host_badge.dart';\n",
    "lib/hosts/presentation/host_card.dart": "class HostCard {}\n",
    "lib/hosts/presentation/host_badge.dart": "class HostBadge {}\n",
    "lib/hosts/today/today_screen.dart": "import 'package:catch_dating_app/hosts/hosts.dart' as hosts show HostCard, HostBadge;\n\nclass TodayScreen {}\n",
    "lib/hosts/elsewhere.dart": "import 'package:catch_dating_app/hosts/hosts.dart';\n",
  });
  const {plan} = planFor(root, "host-today", {uses: {
    "lib/hosts/today/today_screen.dart": {"package:catch_dating_app/hosts/hosts.dart": {
      "lib/hosts/presentation/host_badge.dart": ["HostBadge"],
      "lib/hosts/presentation/host_card.dart": ["HostCard"],
    }},
    "lib/hosts/elsewhere.dart": {"package:catch_dating_app/hosts/hosts.dart": {
      "lib/hosts/presentation/host_card.dart": ["HostCard"],
    }},
  }});
  assert.deepEqual(plan.errors, []);
  assert.equal(plan.writes.get("apps/host/lib/today/today_screen.dart"), [
    "import 'package:catch_dating_app/hosts/presentation/host_badge.dart' as hosts show HostBadge;",
    "import 'package:catch_dating_app/hosts/presentation/host_card.dart' as hosts show HostCard;",
    "",
    "class TodayScreen {}",
    "",
  ].join("\n"));
  assert.equal(plan.writes.get("lib/hosts/hosts.dart"),
    "export 'presentation/host_card.dart';\nexport 'presentation/host_badge.dart';\n");
  // A staying file keeps its barrel import: un-barrelling legacy files would
  // trip catch_arch_cross_feature_presentation_import.
  assert.equal(plan.writes.has("lib/hosts/elsewhere.dart"), false);
});

test("a feature barrel stops exporting files that move into lib/pages or a later context, and its importers import them directly", () => {
  const root = fixtureRepo({
    "tool/architecture/context_map.json": mapSource([
      {path: "lib/reviews/", context: "events"},
      {path: "lib/hosts/", layer: "app"},
      {path: "lib/reviews/shared/", context: "events", moveTo: "lib/pages/reviews/", group: "page-reviews"},
      {path: "lib/reviews/presentation/review_actions.dart", context: "events",
        moveTo: "lib/contexts/live/actions/review_actions.dart", group: "page-reviews"},
    ]),
    "lib/reviews/reviews.dart": [
      "export 'package:catch_dating_app/contexts/events/data/event_repository.dart';",
      "export 'shared/reviews_section.dart'; // public-api: event page reviews",
      "export 'presentation/review_badge.dart';",
      "export 'presentation/review_actions.dart';",
      "",
    ].join("\n"),
    "lib/reviews/presentation/review_badge.dart": "class ReviewBadge {}\n",
    "lib/reviews/presentation/review_actions.dart": "class ReviewActions {}\n",
    "lib/reviews/shared/reviews_section.dart": "class ReviewsSection {}\n",
    "lib/hosts/mixed.dart": "import 'package:catch_dating_app/reviews/reviews.dart';\n\nclass Mixed {}\n",
    "lib/hosts/shown.dart": "import 'package:catch_dating_app/reviews/reviews.dart' as r show ReviewsSection, ReviewBadge;\n\nclass Shown {}\n",
    "lib/hosts/only.dart": "import 'package:catch_dating_app/reviews/reviews.dart';\n\nclass Only {}\n",
    "lib/hosts/untouched.dart": "import 'package:catch_dating_app/reviews/reviews.dart';\n\nclass Untouched {}\n",
  });
  const barrel = "package:catch_dating_app/reviews/reviews.dart";
  const {plan} = planFor(root, "page-reviews", {uses: {
    "lib/hosts/mixed.dart": {[barrel]: {
      "lib/contexts/events/data/event_repository.dart": ["EventRepository"],
      "lib/reviews/shared/reviews_section.dart": ["ReviewsSection"],
    }},
    "lib/hosts/shown.dart": {[barrel]: {
      "lib/reviews/presentation/review_badge.dart": ["ReviewBadge"],
      "lib/reviews/shared/reviews_section.dart": ["ReviewsSection"],
    }},
    "lib/hosts/only.dart": {[barrel]: {
      "lib/reviews/presentation/review_actions.dart": ["ReviewActions"],
      "lib/reviews/shared/reviews_section.dart": ["ReviewsSection"],
    }},
    "lib/hosts/untouched.dart": {[barrel]: {"lib/reviews/presentation/review_badge.dart": ["ReviewBadge"]}},
  }});
  assert.deepEqual(plan.errors, []);
  // The barrel sits in the events context, below lib/pages and before live:
  // both exports would point the wrong way, so they go, comments and all.
  assert.equal(plan.writes.get("lib/reviews/reviews.dart"), [
    "export 'package:catch_dating_app/contexts/events/data/event_repository.dart';",
    "export 'presentation/review_badge.dart';",
    "",
  ].join("\n"));
  assert.deepEqual(plan.deletedExports.map(({target}) => target).sort(),
    ["lib/reviews/presentation/review_actions.dart", "lib/reviews/shared/reviews_section.dart"]);
  assert.equal(plan.writes.get("lib/hosts/mixed.dart"), [
    "import 'package:catch_dating_app/reviews/reviews.dart';",
    "import 'package:catch_dating_app/pages/reviews/reviews_section.dart';",
    "",
    "class Mixed {}",
    "",
  ].join("\n"));
  assert.equal(plan.writes.get("lib/hosts/shown.dart"), [
    "import 'package:catch_dating_app/reviews/reviews.dart' as r show ReviewBadge;",
    "import 'package:catch_dating_app/pages/reviews/reviews_section.dart' as r show ReviewsSection;",
    "",
    "class Shown {}",
    "",
  ].join("\n"));
  // Nothing else comes through the barrel, so the barrel import goes.
  assert.equal(plan.writes.get("lib/hosts/only.dart"), [
    "import 'package:catch_dating_app/contexts/live/actions/review_actions.dart';",
    "import 'package:catch_dating_app/pages/reviews/reviews_section.dart';",
    "",
    "class Only {}",
    "",
  ].join("\n"));
  assert.equal(plan.writes.has("lib/hosts/untouched.dart"), false);
  assert.equal(plan.splitBarrels, 3);
});

test("path mentions move as repo paths and package URIs, honour the exclusions, and stale folders fail", () => {
  const moves = new Map([["lib/hosts/today/today_screen.dart", "apps/host/lib/today/today_screen.dart"]]);
  const folders = [["lib/hosts/today/", "apps/host/lib/today/"]];
  const packages = [
    {name: "catch_host_app", dir: "apps/host/", lib: "apps/host/lib/"},
    {name: "catch_dating_app", dir: "", lib: "lib/"},
  ];
  const texts = new Map([
    ["docs/today.md", "See lib/hosts/today/today_screen.dart and the lib/hosts/today folder.\n`package:catch_dating_app/hosts/today/today_screen.dart`\n"],
    ["packages/catch_ui_lints/lib/src/rules.dart", "const owner = '/lib/hosts/today/';\n"],
  ]);
  const written = rewriteMentions({texts, moves, folders, packages});
  assert.equal(written.get("docs/today.md"),
    "See apps/host/lib/today/today_screen.dart and the apps/host/lib/today folder.\n`package:catch_host_app/today/today_screen.dart`\n");
  assert.equal(written.get("packages/catch_ui_lints/lib/src/rules.dart"), "const owner = '/apps/host/lib/today/';\n");
  for (const excluded of [
    "tool/check_catch_ui_lints.sh",
    "tool/catch_ui_lints_probe/run/1/lib/hosts/today/x.dart",
    "tool/architecture/screen_moves/host-today.json",
    "tool/architecture/context_map.json",
    "tool/x/scanner.test.mjs",
    "lib/hosts/today/today_screen.g.dart",
    "tool/ui_capture/route_inventory.json",
  ]) {
    assert.equal(isMentionText(excluded, new Set(["tool/ui_capture/route_inventory.json"])), false, excluded);
  }
  assert.equal(isMentionText("packages/l10n/lib/app_en.arb"), true);
  assert.deepEqual(staleFolderMentions({
    texts: new Map([["tool/check_crm.mjs", "const roots = ['lib/hosts/presentation'];\nconst other = 'lib/hosts/presentation_extra';\n"]]),
    folders: ["lib/hosts/presentation/"],
  }), [{file: "tool/check_crm.mjs", line: 1, folder: "lib/hosts/presentation/"}]);
});

test("workflow paths that change package need a hand edit; same-package ones are rewritten", () => {
  const root = fixtureRepo({
    "tool/architecture/context_map.json": mapSource([
      {path: "lib/hosts/", layer: "app"},
      {path: "lib/events/", layer: "app"},
      {path: "lib/hosts/today/", layer: "app", moveTo: "apps/host/lib/today/", group: "wave"},
      {path: "lib/events/presentation/event_tile.dart", layer: "app", moveTo: "lib/pages/event/event_tile.dart", group: "wave"},
    ]),
    "lib/hosts/hosts.dart": "// stays\n",
    "lib/events/events.dart": "// stays\n",
    "lib/hosts/today/today_screen.dart": "class TodayScreen {}\n",
    "lib/events/presentation/event_tile.dart": "class EventTile {}\n",
    "test/hosts/today/today_screen_test.dart": "import 'package:catch_dating_app/hosts/today/today_screen.dart';\n",
    ".github/workflows/ci.yml": "steps:\n  - run: flutter test test/hosts/today/today_screen_test.dart\n",
    ".github/workflows/tiles.yml": "steps:\n  - run: echo lib/events/presentation/event_tile.dart\n",
  });
  const {plan} = planFor(root, "wave");
  // The emptied test/hosts/ folder is still named there too.
  assert.deepEqual(plan.errors.map((error) => `${error.kind} ${error.file}`),
    ["workflowPath .github/workflows/ci.yml", "staleFolder .github/workflows/ci.yml"]);
  assert.equal(plan.writes.has(".github/workflows/ci.yml"), false);
  assert.equal(plan.writes.get(".github/workflows/tiles.yml"), "steps:\n  - run: echo lib/pages/event/event_tile.dart\n");
});

test("pruneLegacyEntries drops moveTo and group entries once their files have moved", () => {
  const {source, removed} = pruneLegacyEntries([
    "  \"legacy\": [",
    "    {\"path\": \"lib/hosts/\", \"layer\": \"app\"},",
    "    {\"path\": \"lib/hosts/today/\", \"layer\": \"app\", \"moveTo\": \"apps/host/lib/today/\", \"group\": \"host-today\"}",
    "  ]",
  ].join("\n"), ["lib/hosts/door/door_screen.dart", "apps/host/lib/today/today_screen.dart"]);
  assert.equal(removed, 1);
  assert.equal(source, "  \"legacy\": [\n    {\"path\": \"lib/hosts/\", \"layer\": \"app\"}\n  ]");
});

function applyFixture() {
  const root = fixtureRepo({
    "tool/architecture/context_map.json": todayMap,
    "lib/hosts/door/door_screen.dart": "class DoorScreen {}\n",
    "lib/hosts/today/today_screen.dart": "import 'package:catch_dating_app/hosts/today/today_state.dart';\n\nclass TodayScreen {}\n",
    "lib/hosts/today/today_state.dart": "class TodayState {}\n",
    "lib/hosts/today/today_state.g.dart": "part of 'today_state.dart';\n",
    "apps/host/lib/shell.dart": "import 'package:catch_dating_app/hosts/today/today_screen.dart';\n",
    "test/hosts/today/today_state_test.dart": "import 'package:catch_dating_app/hosts/today/today_state.dart';\n",
    "docs/today.md": "Today lives in lib/hosts/today/today_screen.dart.\n",
    "lib/hosts/hosts.dart": "export 'door/door_screen.dart';\nexport 'today/today_screen.dart'; // public-api: route entry\n",
  });
  const {plan} = planFor(root, "host-today");
  assert.deepEqual(plan.errors, []);
  const result = applyGroupPlan({root, plan, external: false});
  return {root, result};
}

test("--apply writes one commit and the group's move record, and --verify accepts it", () => {
  const {root, result} = applyFixture();
  assert.equal(result.unstaged.length, 0);
  assert.match(git(root, "log", "-1", "--format=%B"), /^refactor\(architecture\): move host-today \(phase 4\)[\s\S]*Screen-Move-Group: host-today/u);
  const record = JSON.parse(fs.readFileSync(path.join(root, "tool/architecture/screen_moves/host-today.json"), "utf8"));
  assert.equal(record.group, "host-today");
  assert.ok(Number.isSafeInteger(record.sequence));
  assert.equal(record.moves["test/hosts/today/today_state_test.dart"], "apps/host/test/today/today_state_test.dart");
  assert.equal(fs.readFileSync(path.join(root, "apps/host/lib/shell.dart"), "utf8"),
    "import 'package:catch_host_app/today/today_screen.dart';\n");
  assert.doesNotMatch(fs.readFileSync(path.join(root, "tool/architecture/context_map.json"), "utf8"), /host-today/u);
  assert.equal(fs.readFileSync(path.join(root, "lib/hosts/hosts.dart"), "utf8"), "export 'door/door_screen.dart';\n");
  assert.equal(result.carried.status, "skipped");
  assert.equal(runCli(["--verify", "--commit", "HEAD", "--root", root]), 0);
  assert.equal(runCli(["--check", "--root", root]), 0);
});

const migrationScope = "final _newRoot = RegExp(\n  r'^(?:apps/[^/]+/lib|lib/pages|lib/hosts/(?:today|create|insights|live|onboarding|door|organizer|forms|people|programmes|events(?!/presentation/)))/',\n);\n";

function carriedFixture(carried) {
  return fixtureRepo({
    "tool/architecture/context_map.json": mapSource([
      {path: "lib/hosts/", layer: "app"},
      {path: "lib/events/", layer: "app"},
      {path: "lib/hosts/presentation/", layer: "app", moveTo: "apps/host/lib/events/manage/", group: "manage"},
      {path: "lib/hosts/today/", layer: "app", moveTo: "apps/host/lib/today/", group: "manage"},
      {path: "lib/events/presentation/event_query.dart", layer: "app", moveTo: "lib/contexts/events/data/event_query.dart", group: "manage"},
    ]),
    "packages/catch_ui_lints/lib/src/migration_scope.dart": migrationScope,
    "tool/architecture/carried_screens.json": carried,
    "lib/hosts/presentation/host_event_screen.dart": "part 'host_event_screen.g.dart';\n\nclass HostEventScreen {}\n",
    "lib/hosts/presentation/host_event_screen.g.dart": "part of 'host_event_screen.dart';\n",
    "lib/hosts/presentation/README.md": "# Manage\n",
    "lib/hosts/today/today_screen.dart": "class TodayScreen {}\n",
    "lib/hosts/hosts.dart": "// The host barrel stays.\n",
    "lib/events/presentation/event_query.dart": "class EventQuery {}\n",
    "lib/events/events.dart": "// The events barrel stays.\n",
    "tool/nx/markdown_inputs.test.mjs": "export const markdownReaders = {};\n",
  });
}

test("--apply carries moved files from legacy paths, never generated files or context moves, and --verify accepts it", () => {
  const description = "Files that keep the rules of their legacy path.";
  const root = carriedFixture(`${JSON.stringify({description, carried: []}, null, 2)}\n`);
  const {plan} = planFor(root, "manage");
  assert.deepEqual(plan.errors.map((error) => error.kind), ["readmeInputs"]);
  assert.deepEqual(plan.carried.entries, ["apps/host/lib/events/manage/host_event_screen.dart"]);
  fs.mkdirSync(path.join(root, "tool/nx"), {recursive: true});
  fs.writeFileSync(path.join(root, "tool/nx/markdown_inputs.test.mjs"),
    "export const markdownReaders = {\"tool/design/build_host_feature_responsibilities.mjs\": {\"apps/host/lib/**/README.md\": [\"tools\"]}};\n");
  git(root, "add", "-A");
  git(root, "-c", "user.name=Fixture", "-c", "user.email=fixture@example.com", "commit", "-q", "-m", "readme input");
  const replanned = planFor(root, "manage").plan;
  assert.deepEqual(replanned.errors.map((error) => error.message), []);
  const result = applyGroupPlan({root, plan: replanned, external: false});
  assert.equal(result.carried.status, "written");
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, "tool/architecture/carried_screens.json"), "utf8")), {
    description,
    carried: [{path: "apps/host/lib/events/manage/host_event_screen.dart", from: "lib/hosts/presentation/host_event_screen.dart"}],
  });
  assert.equal(runCli(["--verify", "--commit", "HEAD", "--root", root]), 0);
  // A carried entry for a file this move did not place is a hand edit.
  const carried = JSON.parse(fs.readFileSync(path.join(root, "tool/architecture/carried_screens.json"), "utf8"));
  carried.carried.push({path: "apps/host/lib/elsewhere.dart", from: "lib/hosts/elsewhere.dart"});
  fs.writeFileSync(path.join(root, "tool/architecture/carried_screens.json"), `${JSON.stringify(carried, null, 2)}\n`);
  git(root, "add", "-A");
  git(root, "-c", "user.name=Fixture", "-c", "user.email=fixture@example.com", "commit", "-q", "--amend", "--no-edit");
  const errors = [];
  const original = console.error;
  console.error = (line) => errors.push(line);
  try {
    assert.equal(runCli(["--verify", "--commit", "HEAD", "--root", root]), 1);
  } finally {
    console.error = original;
  }
  assert.ok(errors.some((line) => line.includes("carries apps/host/lib/elsewhere.dart, which this move did not place")), errors.join("\n"));
});

test("a carried file that moves again keeps its from; stale carries are dropped", () => {
  const isNewRoot = newRootMatcher(migrationScope);
  const {json, added} = carriedAfterMove({
    json: {description: "d", carried: [{path: "apps/host/lib/events/manage/x.dart", from: "lib/hosts/presentation/x.dart"}]},
    moves: new Map([
      ["apps/host/lib/events/manage/x.dart", "apps/host/lib/events/roster/x.dart"],
      ["lib/hosts/today/y.dart", "apps/host/lib/today/y.dart"],
      ["lib/hosts/presentation/z.g.dart", "apps/host/lib/events/manage/z.g.dart"],
    ]),
    isNewRoot,
  });
  assert.deepEqual(added, []);
  assert.deepEqual(json.carried, [{path: "apps/host/lib/events/roster/x.dart", from: "lib/hosts/presentation/x.dart"}]);
  const root = carriedFixture(`${JSON.stringify({description: "d", carried: [
    {path: "lib/pages/a.dart", from: "lib/pages/a.dart"},
    {path: "lib/pages/b.dart", from: "lib/old/b.dart"},
  ]}, null, 2)}\n`);
  assert.deepEqual(dropStaleCarries({root, findings: [
    {code: "CATCH_ARCH_STALE_CARRY", file: "lib/pages/b.dart", line: 1, message: "stale"},
    {code: "CATCH_ARCH_INVALID_IGNORE", file: "lib/pages/a.dart", line: 1, message: "other"},
  ]}), ["lib/pages/b.dart"]);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, "tool/architecture/carried_screens.json"), "utf8")).carried,
    [{path: "lib/pages/a.dart", from: "lib/pages/a.dart"}]);
});

test("a stale carry stays, with its library's parts, while check_library_shims would flag the library", () => {
  const root = carriedFixture(`${JSON.stringify({description: "d", carried: [
    {path: "lib/pages/sheet.dart", from: "lib/old/sheet.dart"},
    {path: "lib/pages/sheet_part.dart", from: "lib/old/sheet_part.dart"},
    {path: "lib/pages/clean.dart", from: "lib/old/clean.dart"},
  ]}, null, 2)}\n`);
  fs.mkdirSync(path.join(root, "packages/catch_ui/lib/src"), {recursive: true});
  fs.writeFileSync(path.join(root, "packages/catch_ui/lib/catch_ui.dart"), "export 'src/text.dart';\n");
  fs.writeFileSync(path.join(root, "packages/catch_ui/lib/src/text.dart"),
    "class CatchText {}\n\n@Deprecated('Use CatchText.')\nclass CatchOldText extends CatchText {}\n");
  fs.mkdirSync(path.join(root, "lib/pages"), {recursive: true});
  fs.writeFileSync(path.join(root, "lib/pages/sheet.dart"),
    "import 'package:catch_ui/catch_ui.dart';\n\npart 'sheet_part.dart';\n\nfinal text = CatchOldText();\n");
  fs.writeFileSync(path.join(root, "lib/pages/sheet_part.dart"), "part of 'sheet.dart';\n\nfinal other = text;\n");
  fs.writeFileSync(path.join(root, "lib/pages/clean.dart"), "import 'package:catch_ui/catch_ui.dart';\n\nfinal text = CatchText();\n");
  const stale = (file) => ({code: "CATCH_ARCH_STALE_CARRY", file, line: 1, message: "stale"});
  // The library names a deprecated catch_ui class, which the lints leave to
  // deprecated_member_use and the shims gate reports; its clean part stays too.
  assert.deepEqual(dropStaleCarries({root, findings: [
    stale("lib/pages/sheet.dart"), stale("lib/pages/sheet_part.dart"), stale("lib/pages/clean.dart"),
  ]}), ["lib/pages/clean.dart"]);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, "tool/architecture/carried_screens.json"), "utf8")).carried
    .map((entry) => entry.path).sort(), ["lib/pages/sheet.dart", "lib/pages/sheet_part.dart"]);
});

test("--apply refuses a dirty tree and rolls back its own work when a step fails", () => {
  const root = carriedFixture("{not json\n");
  fs.mkdirSync(path.join(root, "tool/nx"), {recursive: true});
  const {plan} = planFor(root, "manage");
  assert.ok(plan.errors.some((error) => error.kind === "carried"));
  const applicable = {...plan, errors: []};
  fs.writeFileSync(path.join(root, "docs.md"), "stray\n");
  assert.throws(() => applyGroupPlan({root, plan: applicable, external: false}), /clean working tree apart from/u);
  fs.rmSync(path.join(root, "docs.md"));
  const mapEdit = `${fs.readFileSync(path.join(root, "tool/architecture/context_map.json"), "utf8")}\n`;
  fs.writeFileSync(path.join(root, "tool/architecture/context_map.json"), mapEdit);
  assert.throws(() => applyGroupPlan({root, plan: applicable, external: false}), /rolled back:/u);
  assert.equal(git(root, "status", "--porcelain").trim(), "M tool/architecture/context_map.json");
  assert.equal(fs.readFileSync(path.join(root, "tool/architecture/context_map.json"), "utf8"), mapEdit);
  assert.ok(fs.existsSync(path.join(root, "lib/hosts/presentation/host_event_screen.dart")));
});

test("--verify rejects a hand edit in a move commit", () => {
  const {root} = applyFixture();
  fs.appendFileSync(path.join(root, "apps/host/lib/today/today_screen.dart"), "void extra() {}\n");
  fs.writeFileSync(path.join(root, "docs/today.md"), "Rewritten by hand.\n");
  git(root, "add", "-A");
  git(root, "-c", "user.name=Fixture", "-c", "user.email=fixture@example.com", "commit", "-q", "--amend", "--no-edit");
  const errors = [];
  const original = console.error;
  console.error = (line) => errors.push(line);
  try {
    assert.equal(runCli(["--verify", "--commit", "HEAD", "--root", root]), 1);
  } finally {
    console.error = original;
  }
  assert.ok(errors.includes("- apps/host/lib/today/today_screen.dart changed beyond directives and moved paths"), errors.join("\n"));
  assert.ok(errors.includes("- docs/today.md changed beyond moved paths"), errors.join("\n"));
});

test("--imports-only replays recorded moves onto another branch, including files it added under the folder", () => {
  const {root} = applyFixture();
  const moveCommit = git(root, "rev-parse", "HEAD").trim();
  git(root, "branch", "-q", "main-after-move");
  git(root, "checkout", "-q", "-b", "feature", "HEAD~1");
  fs.writeFileSync(path.join(root, "lib/hosts/today/today_banner.dart"),
    "import 'package:catch_dating_app/hosts/today/today_state.dart';\n");
  fs.writeFileSync(path.join(root, "apps/host/lib/banner_host.dart"),
    "import 'package:catch_dating_app/hosts/today/today_banner.dart';\n");
  git(root, "add", "-A");
  git(root, "-c", "user.name=Fixture", "-c", "user.email=fixture@example.com", "commit", "-q", "-m", "feature");
  assert.deepEqual(replayEntries({root, from: moveCommit}).map((entry) => entry.group), ["host-today"]);
  const entries = replayEntries({root, since: "main-after-move"});
  assert.deepEqual(entries.map((entry) => entry.group), ["host-today"]);
  const packages = packageRoots(root);
  const map = loadContextMap(fs.readFileSync(path.join(root, "tool/architecture/context_map.json"), "utf8"));
  const result = replayImports({root, entries, packages, map, external: false});
  assert.equal(result.branchMoves, 5);
  assert.equal(fs.readFileSync(path.join(root, "apps/host/lib/today/today_banner.dart"), "utf8"),
    "import 'package:catch_host_app/today/today_state.dart';\n");
  assert.equal(fs.readFileSync(path.join(root, "apps/host/lib/banner_host.dart"), "utf8"),
    "import 'package:catch_host_app/today/today_banner.dart';\n");
  assert.equal(fs.readFileSync(path.join(root, "apps/host/lib/shell.dart"), "utf8"),
    "import 'package:catch_host_app/today/today_screen.dart';\n");
  assert.equal(fs.readFileSync(path.join(root, "docs/today.md"), "utf8"),
    "Today lives in apps/host/lib/today/today_screen.dart.\n");
  // After the replay the branch merges the move without conflicts.
  git(root, "add", "-A");
  git(root, "-c", "user.name=Fixture", "-c", "user.email=fixture@example.com", "commit", "-q", "-m", "replay");
  git(root, "-c", "user.name=Fixture", "-c", "user.email=fixture@example.com", "merge", "-q", "--no-edit", moveCommit);
  assert.deepEqual(replayEntries({root, since: "main-after-move"}), []);
});

test("--classify walks each app from its own code through its own router", () => {
  const root = fixtureRepo({
    "tool/architecture/context_map.json": mapSource([
      {path: "lib/hosts/", layer: "app"},
      {path: "lib/routing/", layer: "app"},
      {path: "lib/events/", layer: "app"},
      {path: "lib/home/", layer: "app"},
    ]),
    "apps/host/lib/main.dart": "import 'package:catch_dating_app/routing/host_router.dart';\n\nvoid main() => hostRouter;\n",
    "apps/consumer/lib/main.dart": "import 'package:catch_dating_app/routing/consumer_router.dart';\n\nvoid main() => consumerRouter;\n",
    "lib/routing/host_router.dart": "import 'package:catch_dating_app/hosts/today/today_screen.dart';\nimport 'package:catch_dating_app/events/event_screen.dart';\n",
    "lib/routing/consumer_router.dart": "import 'package:catch_dating_app/home/home_screen.dart';\nimport 'package:catch_dating_app/events/event_screen.dart';\n",
    "lib/hosts/today/today_screen.dart": "class TodayScreen {}\n",
    "lib/home/home_screen.dart": "class HomeScreen {}\n",
    "lib/events/event_screen.dart": "class EventScreen {}\n",
    "lib/events/orphan.dart": "class Orphan {}\n",
  });
  const uses = {
    "apps/host/lib/main.dart": {"package:catch_dating_app/routing/host_router.dart": {"lib/routing/host_router.dart": ["hostRouter"]}},
    "apps/consumer/lib/main.dart": {"package:catch_dating_app/routing/consumer_router.dart": {"lib/routing/consumer_router.dart": ["consumerRouter"]}},
  };
  const {graph, files} = fixtureGraph(root, uses);
  const map = loadContextMap(fs.readFileSync(path.join(root, "tool/architecture/context_map.json"), "utf8"));
  const result = classify({graph, files, map});
  const labels = Object.fromEntries(result.files.map((row) => [row.path, row.label]));
  assert.equal(labels["lib/hosts/today/today_screen.dart"], "host");
  assert.equal(labels["lib/home/home_screen.dart"], "consumer");
  assert.equal(labels["lib/events/event_screen.dart"], "shared");
  assert.equal(labels["lib/events/orphan.dart"], "unreached");
  assert.equal(result.files.find((row) => row.path === "lib/hosts/today/today_screen.dart").suggestedTarget,
    "apps/host/lib/today/today_screen.dart");
});

test("--check fails when lib/ imports an app package or a moveTo is invalid", () => {
  const root = fixtureRepo({
    "tool/architecture/context_map.json": mapSource([
      {path: "lib/hosts/", layer: "app"},
      {path: "lib/hosts/door/", layer: "app", moveTo: "lib/contexts/events/parts/door/", group: "bad"},
    ]),
    "lib/hosts/door/door_screen.dart": "class DoorScreen {}\n",
    "lib/hosts/leak.dart": "import 'package:catch_host_app/shell.dart';\n",
    "apps/consumer/lib/leak.dart": "import 'package:catch_host_app/shell.dart';\n",
  });
  const files = trackedFiles(root);
  const map = loadContextMap(fs.readFileSync(path.join(root, "tool/architecture/context_map.json"), "utf8"));
  const problems = checkRepository({root, files, map});
  assert.deepEqual(problems, [
    "apps/consumer/lib/leak.dart (apps/consumer) imports package:catch_host_app (apps/host).",
    "lib/hosts/leak.dart imports package:catch_host_app; lib/ and the shared packages never import an app.",
    "lib/hosts/door/ moves to lib/contexts/events/parts/door/, but a move into a context goes to its actions/ or data/ folder",
  ]);
});

const dart = spawnSync("dart", ["--version"], {encoding: "utf8"});
const dartReady = dart.status === 0 &&
  fs.existsSync(path.join(repoRoot, ".dart_tool/package_config.json"));

test("dart_symbol_imports.dart resolves the names each directive uses, through barrels and conditional imports",
  {skip: dartReady ? false : "needs the Dart SDK and fetched packages (bootstrap --target flutter)"}, () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "symbol-graph-"));
    const write = (file, text) => {
      fs.mkdirSync(path.join(root, path.dirname(file)), {recursive: true});
      fs.writeFileSync(path.join(root, file), text);
    };
    write("pubspec.yaml", "name: fixture\nenvironment:\n  sdk: ^3.0.0\n");
    write(".dart_tool/package_config.json", JSON.stringify({configVersion: 2, packages: [
      {name: "fixture", rootUri: "../", packageUri: "lib/", languageVersion: "3.0"},
    ]}));
    write("lib/a.dart", "class A {}\nclass Unused {}\n");
    write("lib/b.dart", "extension Shout on String {\n  String get shout => toUpperCase();\n}\n");
    // A member reached through a value names no import: Box stays unrecorded.
    write("lib/c.dart", "class Box {\n  int get size => 1;\n}\nBox makeBox() => Box();\n");
    write("lib/barrel.dart", "export 'a.dart';\nexport 'b.dart';\nexport 'c.dart';\n");
    write("lib/io_impl.dart", "String platform() => 'io';\n");
    write("lib/web_impl.dart", "String platform() => 'web';\n");
    write("lib/screen.dart", [
      "import 'package:fixture/barrel.dart';",
      "import 'package:fixture/io_impl.dart' if (dart.library.js_interop) 'package:fixture/web_impl.dart';",
      "",
      "part 'screen_part.dart';",
      "",
      "String show(A a) => 'x'.shout + platform() + '${makeBox().size}';",
      "",
    ].join("\n"));
    write("lib/screen_part.dart", "part of 'screen.dart';\n");
    const out = path.join(root, "graph.json");
    execFileSync("dart", ["run", "tool/architecture/dart_symbol_imports.dart", "--root", root, "--include", "lib", "--out", out],
      {cwd: repoRoot, stdio: ["ignore", "ignore", "pipe"]});
    const graph = JSON.parse(fs.readFileSync(out, "utf8"));
    const screen = graph.files["lib/screen.dart"];
    const [barrel, conditional, part] = screen.directives;
    assert.equal(barrel.target, "lib/barrel.dart");
    assert.deepEqual(barrel.uses, {"lib/a.dart": ["A"], "lib/b.dart": ["Shout"], "lib/c.dart": ["makeBox"]});
    assert.equal(conditional.target, "lib/io_impl.dart");
    assert.deepEqual(conditional.configurations.map((c) => [c.target, c.uses]),
      [["lib/web_impl.dart", {"lib/web_impl.dart": ["platform"]}]]);
    assert.equal(part.kind, "part");
    assert.equal(graph.files["lib/screen_part.dart"].library, "lib/screen.dart");
  });
