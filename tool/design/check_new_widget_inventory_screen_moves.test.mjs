// A Phase 4 screen move relocates legacy widgets unchanged; the new-widget
// gate treats the widgets a recorded move carried as moved legacy UI, not new UI.
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("widgets a recorded screen move carried leave the gate; an unrecorded move does not", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-new-widget-screen-move-"));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  for (const file of [
    "tool/lib/repo_paths.mjs",
    "tool/design/check_new_widget_inventory.mjs",
    "tool/design/component_concepts.mjs",
    "tool/design/lib/component_naming.mjs",
    "design/components/catch.components.schema.json",
    "tool/design/lib/new_widget_inventory_declarations.mjs",
    "tool/design/lib/owned_composition_renderers.mjs",
    "tool/design/lib/production_widget_roots.mjs",
    "tool/design/lib/widgetbook_use_cases.mjs",
  ]) {
    fs.mkdirSync(path.dirname(path.join(root, file)), {recursive: true});
    fs.copyFileSync(path.join(repoRoot, file), path.join(root, file));
  }
  const write = (file, text) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), {recursive: true});
    fs.writeFileSync(path.join(root, file), text);
  };
  const git = (...args) => {
    const result = spawnSync("git", args, {cwd: root, encoding: "utf8"});
    assert.equal(result.status, 0, result.stderr);
  };
  const legacy = "lib/rooms/presentation/room_map.dart";
  const moved = "lib/pages/live_room/room_map.dart";
  const source = [
    "class RoomMap extends StatelessWidget {",
    "  Widget build(BuildContext context) => _Legend();",
    "  Widget legend() => _Legend();",
    "}",
    "class _Legend extends StatelessWidget {}",
    "",
  ].join("\n");
  write(legacy, source);
  write("design/components/catch.components.json", JSON.stringify({components: []}));
  git("init", "--quiet");
  git("add", "-A");
  git("-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid",
    "-c", "commit.gpgsign=false", "commit", "--quiet", "-m", "Fixture base");
  fs.rmSync(path.join(root, legacy));
  write(moved, source);
  const run = () => spawnSync(process.execPath,
    ["tool/design/check_new_widget_inventory.mjs", "--base", "HEAD", "--check", "--json", "--no-write"],
    {cwd: root, encoding: "utf8"});

  // Without a record the private class, the helper and the uncovered public
  // widget are blocked, as for any other move.
  const unrecorded = run();
  assert.equal(unrecorded.status, 1);
  assert.ok(JSON.parse(unrecorded.stdout).summary.unresolved > 0);

  write("tool/architecture/screen_moves/page-live-room.json", JSON.stringify({
    version: 1, group: "page-live-room", sequence: 1, entries: [], moves: {[legacy]: moved}, folders: {},
  }));
  const recorded = run();
  assert.equal(recorded.status, 0, recorded.stdout + recorded.stderr);
  const report = JSON.parse(recorded.stdout);
  assert.equal(report.summary.unresolved, 0);
  assert.equal(report.summary.screenMovedWidgetClasses, 2);
  assert.equal(report.summary.screenMovedWidgetReturningHelpers, 1);
  assert.deepEqual(report.screenMovedWidgets.map(({name, from}) => [name, from]),
    [["RoomMap", legacy], ["_Legend", legacy]].sort());

  // A widget added beside the moved ones is still new.
  write(moved, `${source}class _Badge extends StatelessWidget {}\n`);
  const added = run();
  assert.equal(added.status, 1);
  assert.deepEqual(JSON.parse(added.stdout).addedWidgets.map(({name}) => name), ["_Badge"]);
});
