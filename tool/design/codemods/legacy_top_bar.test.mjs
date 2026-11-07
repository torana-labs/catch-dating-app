import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {codemod, handWrittenFiles} from "./legacy_top_bar.mjs";

test("whole words move to the legacy name; the enums and the system's other symbols stay", () => {
  const source = [
    "final a = CatchTopBar.route(title: 'Edit', navigation: const CatchTopBarNavigation());",
    "final b = CatchTopBar.screen(title: 'Today', tone: CatchTopBarTone.page, emphasis: CatchTopBarEmphasis.plain);",
    "final c = ui.CatchTopBar.identity(identityName: 'Mira', identitySemanticLabel: 'Mira');",
    "final d = CatchTopBarActionRow(actions: const []);",
    "// CatchTopBar.brand draws the wordmark; find.byType(CatchTopBar) finds it.",
    "final e = 'CatchTopBar'; final f = MyCatchTopBar(); final g = \$CatchTopBar;",
    "final h = CatchTopBarVariant.tool; final i = CatchTopBarSearch(enabled: true);",
  ].join("\n");
  assert.equal(codemod.renameSource(source), [
    "final a = CatchLegacyTopBar.route(title: 'Edit', navigation: const CatchTopBarNavigation());",
    "final b = CatchLegacyTopBar.screen(title: 'Today', tone: CatchTopBarTone.page, emphasis: CatchTopBarEmphasis.plain);",
    "final c = ui.CatchLegacyTopBar.identity(identityName: 'Mira', identitySemanticLabel: 'Mira');",
    "final d = CatchTopBarActionRow(actions: const []);",
    "// CatchLegacyTopBar.brand draws the wordmark; find.byType(CatchLegacyTopBar) finds it.",
    "final e = 'CatchLegacyTopBar'; final f = MyCatchTopBar(); final g = \$CatchTopBar;",
    "final h = CatchTopBarVariant.tool; final i = CatchTopBarSearch(enabled: true);",
  ].join("\n"));
});

test("the moved file's path follows it and the import run is re-sorted", () => {
  assert.equal(
    codemod.renameSource([
      "import 'package:catch_ui/src/components/catch_step_header.dart';",
      "import 'package:catch_ui/src/components/catch_top_bar.dart';",
      "import 'package:catch_ui/src/components/catch_top_bar_tone.dart';",
      "import 'package:catch_ui/src/components/catch_icon_action.dart';",
      "const fixture = 'packages/catch_ui/lib/src/components/catch_top_bar.dart';",
    ].join("\n")),
    [
      "import 'package:catch_ui/src/components/catch_icon_action.dart';",
      "import 'package:catch_ui/src/components/catch_legacy_top_bar.dart';",
      "import 'package:catch_ui/src/components/catch_step_header.dart';",
      "import 'package:catch_ui/src/components/catch_top_bar_tone.dart';",
      "const fixture = 'packages/catch_ui/lib/src/components/catch_legacy_top_bar.dart';",
    ].join("\n"),
  );
});

test("it is idempotent", () => {
  const once = codemod.renameSource("final bar = CatchTopBar.route(title: 'A');");
  assert.equal(codemod.renameSource(once), once);
});

test("generated files, the hand-written system files, the lint package and design/ stay", () => {
  assert.equal(codemod.isRenamed("lib/hosts/host_screen.dart"), true);
  assert.equal(codemod.isRenamed("lib/hosts/host_screen.g.dart"), false);
  assert.equal(codemod.isRenamed("lib/hosts/host_state.freezed.dart"), false);
  assert.equal(codemod.isRenamed("packages/catch_ui_lints/lib/src/catch_ui_rules.dart"), false);
  assert.equal(codemod.isRenamed("design/components/catch.components.json"), false);
  assert.equal(codemod.isRenamed("tool/design/check_screen_top_bar_contracts.mjs"), false);
  for (const file of handWrittenFiles) assert.equal(codemod.isRenamed(file), false, file);
  assert.ok(handWrittenFiles.has("packages/catch_ui/lib/src/components/catch_top_bar.dart"));
  assert.ok(handWrittenFiles.has("packages/catch_ui/lib/catch_ui.dart"));
});

test("a plan renames the callers under the roots and counts what it renamed", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "legacy-top-bar-"));
  try {
    const write = (relative, text) => {
      fs.mkdirSync(path.dirname(path.join(root, relative)), {recursive: true});
      fs.writeFileSync(path.join(root, relative), text);
    };
    write("lib/a.dart", "final a = CatchTopBar.route(title: 'A');\nfinal b = CatchTopBar.screen(title: 'B');\n");
    write("lib/b.dart", "final c = CatchTopBarTone.page;\n");
    write("lib/c.g.dart", "final d = CatchTopBar.route(title: 'D');\n");
    write("packages/catch_ui/lib/src/components/catch_top_bar.dart", "class CatchTopBar {}\n");
    write("docs/notes.dart", "final e = CatchTopBar.route(title: 'E');\n");
    const changes = codemod.plan(root);
    assert.deepEqual(changes.map((change) => change.relative), ["lib/a.dart"]);
    assert.deepEqual(codemod.countReferences(changes),
      {files: 1, references: {CatchTopBar: 2}, calls: {CatchTopBar: 2}, paths: 0});
  } finally {
    fs.rmSync(root, {recursive: true, force: true});
  }
});
