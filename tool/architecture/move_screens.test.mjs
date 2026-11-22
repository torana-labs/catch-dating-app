import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {execFileSync, spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {loadContextMap} from "./check_context_map.mjs";
import {
  directivePattern,
  packageRoots,
  pruneLegacyEntries,
  resolveUri,
  trackedFiles,
} from "./lib/dart_moves.mjs";
import {createGraph} from "./lib/screen_move_graph.mjs";
import {classify} from "./lib/screen_move_plan.mjs";
import {
  applyGroupPlan,
  buildGroupPlan,
  replayEntries,
  replayImports,
} from "./lib/screen_move_apply.mjs";
import {rewriteMentions, isMentionText, staleFolderMentions} from "./lib/screen_move_rewrite.mjs";
import {fixtureReads, goldenNames} from "./lib/screen_move_tests.mjs";
import {checkRepository, runCli} from "./move_screens.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const baseFiles = {
  "pubspec.yaml": "name: catch_dating_app\n",
  "apps/host/pubspec.yaml": "name: catch_host_app\ndependencies:\n  catch_dating_app:\n    path: ../..\n  flutter:\n    sdk: flutter\ndev_dependencies:\n  flutter_test:\n    sdk: flutter\n",
  "apps/consumer/pubspec.yaml": "name: catch_consumer_app\ndependencies:\n  catch_dating_app:\n    path: ../..\n  flutter:\n    sdk: flutter\ndev_dependencies:\n  flutter_test:\n    sdk: flutter\n",
  "widgetbook/pubspec.yaml": "name: widgetbook_workspace\ndependencies:\n  catch_dating_app:\n    path: ..\n",
  "apps/host/lib/main.dart": "import 'package:catch_dating_app/routing/router.dart';\n\nvoid main() => hostRouter;\n",
  "apps/consumer/lib/main.dart": "import 'package:catch_dating_app/routing/router.dart';\n\nvoid main() => consumerRouter;\n",
  "lib/contexts/events/data/event_repository.dart": "class EventRepository {}\n",
  "lib/contexts/live/data/live_repository.dart": "class LiveRepository {}\n",
  "lib/pages/frame/frame.dart": "class Frame {}\n",
};

function mapSource(legacy) {
  return `${JSON.stringify({
    roots: {
      contexts: "lib/contexts/",
      pages: "lib/pages/",
      kernel: "packages/kernel/lib/",
      platform: "packages/platform/lib/",
    },
    contexts: [{id: "events", owns: "Events."}, {id: "live", owns: "Live."}],
    legacy: [],
  }, null, 2).replace(/"legacy": \[\]/u, `"legacy": [\n${legacy.map((entry) => `    ${JSON.stringify(entry).replace(/":/gu, "\": ").replace(/,"/gu, ", \"")}`).join(",\n")}\n  ]`)}\n`;
}

function git(root, ...args) {
  return execFileSync("git", args, {cwd: root, encoding: "utf8"});
}

function fixtureRepo(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "screen-move-"));
  for (const [file, text] of Object.entries({...baseFiles, ...files})) {
    fs.mkdirSync(path.join(root, path.dirname(file)), {recursive: true});
    fs.writeFileSync(path.join(root, file), text);
  }
  git(root, "init", "-q");
  git(root, "add", "-A");
  git(root, "-c", "user.name=Fixture", "-c", "user.email=fixture@example.com", "commit", "-q", "-m", "fixture");
  return root;
}

// A stand-in for dart_symbol_imports.dart: directives by their text, each
// import using its own target unless `uses` names the declaring libraries
// (a barrel).
function fixtureGraph(root, uses = {}, branches = {}) {
  const files = trackedFiles(root);
  const packages = packageRoots(root, files);
  const graph = {version: 1, files: {}, branches};
  for (const file of files.filter((candidate) => candidate.endsWith(".dart"))) {
    const source = fs.readFileSync(path.join(root, file), "utf8");
    const partOf = /^part of '([^']+)';/mu.exec(source);
    const directives = [];
    for (const match of source.matchAll(directivePattern)) {
      const kind = match[1].replace(/\s+/gu, " ");
      const uri = /['"]([^'"]+)['"]/u.exec(match[2])?.[1];
      const target = uri == null ? null : resolveUri(file, uri, packages);
      directives.push({
        offset: match.index,
        end: match.index + match[0].length,
        kind,
        uri,
        target,
        prefix: /\bas\s+(\w+)/u.exec(match[2])?.[1] ?? null,
        deferred: false,
        show: /\bshow\s+([\w\s,]+)/u.exec(match[2])?.[1].split(",").map((name) => name.trim()) ?? null,
        hide: null,
        configurations: [],
        uses: kind === "import" ? (uses[file]?.[uri] ?? (target == null ? {} : {[target]: ["X"]})) : undefined,
      });
    }
    graph.files[file] = {
      library: partOf == null ? file : path.posix.normalize(path.posix.join(path.posix.dirname(file), partOf[1])),
      directives,
    };
  }
  return {graph: createGraph(graph, packages), packages, files};
}

function planFor(root, group, {uses, branches} = {}) {
  const {graph, packages, files} = fixtureGraph(root, uses, branches);
  const map = loadContextMap(fs.readFileSync(path.join(root, "tool/architecture/context_map.json"), "utf8"));
  return {plan: buildGroupPlan({root, group, graph, files, packages, map}), graph, packages, files, map};
}

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
    "apps/host/pubspec.yaml must depend on go_router (imported by 1 moving file(s), e.g. lib/hosts/today/today_screen.dart).",
    "apps/host/pubspec.yaml must depend on mocktail (imported by 1 moving file(s), e.g. test/hosts/today/today_screen_test.dart).",
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
    "tool/architecture/screen_move_log.json",
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

test("--apply writes one commit and a log entry, and --verify accepts it", () => {
  const {root, result} = applyFixture();
  assert.equal(result.unstaged.length, 0);
  assert.match(git(root, "log", "-1", "--format=%B"), /^refactor\(architecture\): move host-today \(phase 4\)[\s\S]*Screen-Move-Group: host-today/u);
  const log = JSON.parse(fs.readFileSync(path.join(root, "tool/architecture/screen_move_log.json"), "utf8"));
  assert.equal(log.entries[0].group, "host-today");
  assert.equal(log.entries[0].moves["test/hosts/today/today_state_test.dart"], "apps/host/test/today/today_state_test.dart");
  assert.equal(fs.readFileSync(path.join(root, "apps/host/lib/shell.dart"), "utf8"),
    "import 'package:catch_host_app/today/today_screen.dart';\n");
  assert.doesNotMatch(fs.readFileSync(path.join(root, "tool/architecture/context_map.json"), "utf8"), /host-today/u);
  assert.equal(fs.readFileSync(path.join(root, "lib/hosts/hosts.dart"), "utf8"), "export 'door/door_screen.dart';\n");
  assert.equal(result.carried.status, "skipped");
  assert.equal(runCli(["--verify", "--commit", "HEAD", "--root", root]), 0);
  assert.equal(runCli(["--check", "--root", root]), 0);
});

test("--apply refuses a dirty tree, and the carry hook fails closed once lane P2's file exists", () => {
  const root = fixtureRepo({
    "tool/architecture/context_map.json": todayMap,
    "lib/hosts/today/today_screen.dart": "class TodayScreen {}\n",
    "tool/architecture/carried_screens.json": "[]\n",
  });
  const {plan} = planFor(root, "host-today");
  assert.equal(plan.carried.status, "required");
  fs.writeFileSync(path.join(root, "docs.md"), "stray\n");
  assert.throws(() => applyGroupPlan({root, plan, external: false}), /clean working tree apart from/u);
  fs.rmSync(path.join(root, "docs.md"));
  const mapEdit = `${fs.readFileSync(path.join(root, "tool/architecture/context_map.json"), "utf8")}\n`;
  fs.writeFileSync(path.join(root, "tool/architecture/context_map.json"), mapEdit);
  assert.throws(() => applyGroupPlan({root, plan, external: false}), /rolled back:[\s\S]*implement updateCarriedScreens/u);
  assert.equal(git(root, "status", "--porcelain").trim(), "M tool/architecture/context_map.json");
  assert.equal(fs.readFileSync(path.join(root, "tool/architecture/context_map.json"), "utf8"), mapEdit);
  assert.ok(fs.existsSync(path.join(root, "lib/hosts/today/today_screen.dart")));
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

test("--imports-only replays logged moves onto another branch, including files it added under the folder", () => {
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

test("--classify walks each app from its own code and the router by its flag", () => {
  const root = fixtureRepo({
    "tool/architecture/context_map.json": mapSource([
      {path: "lib/hosts/", layer: "app"},
      {path: "lib/routing/", layer: "app"},
      {path: "lib/events/", layer: "app"},
      {path: "lib/home/", layer: "app"},
    ]),
    "lib/routing/go_router.dart": "import 'package:catch_dating_app/hosts/today/today_screen.dart';\nimport 'package:catch_dating_app/home/home_screen.dart';\nimport 'package:catch_dating_app/events/event_screen.dart';\n",
    "lib/routing/router.dart": "import 'package:catch_dating_app/routing/go_router.dart';\n",
    "lib/hosts/today/today_screen.dart": "class TodayScreen {}\n",
    "lib/home/home_screen.dart": "class HomeScreen {}\n",
    "lib/events/event_screen.dart": "class EventScreen {}\n",
    "lib/events/orphan.dart": "class Orphan {}\n",
  });
  const branches = {"lib/routing/go_router.dart": {flag: "isHostApp", declarations: {
    hostRouter: [{target: "#build", when: ["false", "true"]}],
    consumerRouter: [{target: "#build", when: ["false", "true"]}],
    build: [
      {target: "lib/hosts/today/today_screen.dart#TodayScreen", when: ["true"]},
      {target: "lib/home/home_screen.dart#HomeScreen", when: ["false"]},
      {target: "lib/events/event_screen.dart#EventScreen", when: ["false", "true"]},
    ],
  }}};
  const uses = {
    "apps/host/lib/main.dart": {"package:catch_dating_app/routing/router.dart": {"lib/routing/go_router.dart": ["hostRouter"]}},
    "apps/consumer/lib/main.dart": {"package:catch_dating_app/routing/router.dart": {"lib/routing/go_router.dart": ["consumerRouter"]}},
  };
  const {graph, files} = fixtureGraph(root, uses, branches);
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
    write("lib/barrel.dart", "export 'a.dart';\nexport 'b.dart';\n");
    write("lib/io_impl.dart", "String platform() => 'io';\n");
    write("lib/web_impl.dart", "String platform() => 'web';\n");
    write("lib/screen.dart", [
      "import 'package:fixture/barrel.dart';",
      "import 'package:fixture/io_impl.dart' if (dart.library.js_interop) 'package:fixture/web_impl.dart';",
      "",
      "part 'screen_part.dart';",
      "",
      "String show(A a) => 'x'.shout + platform();",
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
    assert.deepEqual(barrel.uses, {"lib/a.dart": ["A"], "lib/b.dart": ["Shout"]});
    assert.equal(conditional.target, "lib/io_impl.dart");
    assert.deepEqual(conditional.configurations.map((c) => [c.target, c.uses]),
      [["lib/web_impl.dart", {"lib/web_impl.dart": ["platform"]}]]);
    assert.equal(part.kind, "part");
    assert.equal(graph.files["lib/screen_part.dart"].library, "lib/screen.dart");
  });
