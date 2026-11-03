import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";

import {
  candidateFiles,
  countReferences,
  isRenamed,
  legacySymbolsIn,
  migrate,
  plan,
  renameSource,
  sortImportRuns,
  usesLegacy,
  withLegacyIgnore,
} from "./rename_legacy_library_symbols.mjs";

const legacy = ["CatchKickerText", "CatchLegacySurface", "CatchLegacyText", "CatchLegacyTextVariant"];

test("whole words move to the legacy names; longer names and the system's other symbols stay", () => {
  const source = [
    "import 'package:catch_ui/catch_ui.dart';",
    "final a = CatchSurface(tone: CatchSurfaceTone.raised, child: x);",
    "final b = CatchSurface.card(child: CatchText('Hi', variant: CatchTextVariant.bodyM));",
    "final c = ui.CatchSurface.tinted(child: CatchTextInput());",
    "final d = CatchTextStyles.bodyM(context);",
    "// CatchText renders a CatchTextVariant role.",
    "final e = find.byType(CatchText);",
    "final f = 'CatchSurface';",
    "final g = MyCatchSurface(); final h = CatchSurfaces(); final i = \$CatchText;",
  ].join("\n");
  assert.equal(renameSource(source), [
    "import 'package:catch_ui/catch_ui.dart';",
    "final a = CatchLegacySurface(tone: CatchSurfaceTone.raised, child: x);",
    "final b = CatchLegacySurface.card(child: CatchLegacyText('Hi', variant: CatchLegacyTextVariant.bodyM));",
    "final c = ui.CatchLegacySurface.tinted(child: CatchTextInput());",
    "final d = CatchTextStyles.bodyM(context);",
    "// CatchLegacyText renders a CatchLegacyTextVariant role.",
    "final e = find.byType(CatchLegacyText);",
    "final f = 'CatchLegacySurface';",
    "final g = MyCatchSurface(); final h = CatchSurfaces(); final i = \$CatchText;",
  ].join("\n"));
});

test("the paths of the moved files follow them, in imports and fixtures alike", () => {
  assert.equal(
    renameSource([
      "import 'package:catch_ui/src/primitives/catch_surface.dart';",
      "import 'package:catch_ui/src/primitives/catch_text.dart';",
      "import 'package:catch_ui/src/primitives/catch_text_variant.dart';",
      "import 'package:catch_ui/src/primitives/catch_text_input.dart';",
      "import 'package:catch_ui/src/components/catch_section_surface.dart';",
      "const fixture = 'packages/catch_ui/lib/src/primitives/catch_text_variant.dart';",
    ].join("\n")),
    [
      "import 'package:catch_ui/src/components/catch_section_surface.dart';",
      "import 'package:catch_ui/src/primitives/catch_legacy_surface.dart';",
      "import 'package:catch_ui/src/primitives/catch_legacy_text.dart';",
      "import 'package:catch_ui/src/primitives/catch_legacy_text_variant.dart';",
      "import 'package:catch_ui/src/primitives/catch_text_input.dart';",
      "const fixture = 'packages/catch_ui/lib/src/primitives/catch_legacy_text_variant.dart';",
    ].join("\n"),
  );
});

test("a moved path re-sorts the imports it displaces, and nothing else", () => {
  assert.equal(renameSource([
    "import 'package:catch_ui/src/primitives/catch_row_press_surface.dart';",
    "import 'package:catch_ui/src/primitives/catch_surface.dart';",
    "import 'package:catch_ui/src/primitives/catch_icon.dart';",
    "import 'package:flutter/material.dart';",
    "",
    "final a = CatchSurface();",
  ].join("\n")), [
    "import 'package:catch_ui/src/primitives/catch_icon.dart';",
    "import 'package:catch_ui/src/primitives/catch_legacy_surface.dart';",
    "import 'package:catch_ui/src/primitives/catch_row_press_surface.dart';",
    "import 'package:flutter/material.dart';",
    "",
    "final a = CatchLegacySurface();",
  ].join("\n"));
  const unsorted = "import 'package:b/b.dart';\nimport 'package:a/a.dart';\nfinal a = CatchSurface();";
  assert.equal(renameSource(unsorted), unsorted.replace("CatchSurface", "CatchLegacySurface"));
  assert.equal(sortImportRuns("import 'package:b/b.dart';\nimport 'dart:io';\nimport 'a.dart';\nimport 'package:a/a.dart' as a;"),
    "import 'dart:io';\nimport 'package:a/a.dart' as a;\nimport 'package:b/b.dart';\nimport 'a.dart';");
});

test("a second run changes nothing", () => {
  const once = migrate("lib/a.dart", "final a = CatchSurface.card(child: CatchText('x', variant: CatchTextVariant.bodyM));", legacy);
  assert.equal(migrate("lib/a.dart", once, legacy), once);
  assert.equal(once.split("\n")[0], "// ignore_for_file: deprecated_member_use");
});

test("outside catch_ui a caller of a legacy component carries the deprecated ignore once", () => {
  assert.equal(migrate("lib/a.dart", "final a = CatchKickerText(label: 'x');", legacy),
    "// ignore_for_file: deprecated_member_use\nfinal a = CatchKickerText(label: 'x');");
  assert.equal(migrate("packages/catch_ui/lib/src/a.dart", "final a = CatchText('x', variant: CatchTextVariant.bodyM);", legacy),
    "final a = CatchLegacyText('x', variant: CatchLegacyTextVariant.bodyM);");
  for (const existing of [
    "// ignore_for_file: deprecated_member_use\n",
    "// ignore_for_file: unused_import, deprecated_member_use\n",
  ]) {
    const source = `${existing}final a = CatchKickerText(label: 'x');`;
    assert.equal(withLegacyIgnore(source), source);
  }
  const sameOnly = "// ignore_for_file: deprecated_member_use_from_same_package\nfinal a = CatchKickerText();";
  assert.equal(withLegacyIgnore(sameOnly), `// ignore_for_file: deprecated_member_use\n${sameOnly}`);
});

test("a legacy name only in a comment or a string is no use", () => {
  assert.equal(usesLegacy("// CatchKickerText\nfinal a = 'CatchLegacyText';\n/// [CatchLegacySurface]\nclass A {}", legacy), false);
  assert.equal(usesLegacy("final a = MyCatchKickerText();", legacy), false);
  assert.equal(usesLegacy("final a = ui.CatchKickerText();", legacy), true);
  assert.equal(usesLegacy("final a = CatchKickerText();", []), false);
});

test("generated files, the hand-written system and legacy files, the lint package and design stay", () => {
  for (const relative of [
    "lib/a.g.dart",
    "lib/a.freezed.dart",
    "widgetbook/lib/main.directories.g.dart",
    "packages/catch_ui/lib/catch_ui.dart",
    "packages/catch_ui/lib/src/foundations/catch_root.dart",
    "packages/catch_ui/lib/src/primitives/catch_surface.dart",
    "packages/catch_ui/lib/src/primitives/catch_legacy_text.dart",
    "packages/catch_ui/test/goldens/surface_family_test.dart",
    "widgetbook/lib/primitives/contracts/text.dart",
    "packages/catch_ui_lints/lib/src/catch_ui_rules.dart",
    "design/components/fixture.dart",
    "lib/notes.md",
  ]) {
    assert.equal(isRenamed(relative), false, relative);
  }
  for (const relative of [
    "lib/a.dart",
    "packages/catch_ui/lib/src/components/catch_banner.dart",
    "packages/catch_ui/test/goldens/banner_family_test.dart",
    "widgetbook/lib/primitives/contracts/legacy_text.dart",
  ]) {
    assert.equal(isRenamed(relative), true, relative);
  }
});

function seedRepository(files) {
  // A real path: macOS links its temp folder, and the CLI compares its own path.
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "catch-legacy-rename-")));
  const write = (file, text) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), {recursive: true});
    fs.writeFileSync(path.join(root, file), text);
  };
  write("packages/catch_ui/lib/catch_ui.dart", [
    "export 'src/primitives/catch_legacy_surface.dart';",
    "export 'src/primitives/catch_surface.dart';",
  ].join("\n"));
  write("packages/catch_ui/lib/src/primitives/catch_legacy_surface.dart",
    "@Deprecated('Legacy: use CatchSurface with a block; deleted in P7')\nclass CatchLegacySurface {}");
  write("packages/catch_ui/lib/src/primitives/catch_surface.dart", "class CatchSurface {}");
  for (const [file, text] of Object.entries(files)) write(file, text);
  return root;
}

test("a repository plan renames callers, counts them, and skips what it must", (t) => {
  const root = seedRepository({
    "lib/screen.dart": "import 'package:catch_ui/catch_ui.dart';\nfinal a = CatchSurface.card(child: CatchText('x'));\n",
    "lib/screen.g.dart": "final a = CatchSurface();\n",
    "packages/catch_ui/lib/src/components/banner.dart":
      "import 'package:catch_ui/src/primitives/catch_surface.dart';\nfinal a = CatchSurface();\n",
    "apps/host/lib/today.dart": "final a = 1;\n",
    "widgetbook/lib/primitives/contracts/surface.dart": "final a = CatchSurface();\n",
    "tool/other/thing.dart": "final a = CatchSurface();\n",
  });
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  assert.deepEqual(legacySymbolsIn(root), ["CatchLegacySurface"]);
  assert.deepEqual(candidateFiles(root), [
    "apps/host/lib/today.dart",
    "lib/screen.dart",
    "packages/catch_ui/lib/src/components/banner.dart",
  ]);
  const changes = plan(root);
  assert.deepEqual(changes.map((change) => change.relative), [
    "lib/screen.dart",
    "packages/catch_ui/lib/src/components/banner.dart",
  ]);
  assert.equal(changes[0].next,
    "// ignore_for_file: deprecated_member_use\nimport 'package:catch_ui/catch_ui.dart';\nfinal a = CatchLegacySurface.card(child: CatchLegacyText('x'));\n");
  assert.equal(changes[1].next,
    "import 'package:catch_ui/src/primitives/catch_legacy_surface.dart';\nfinal a = CatchLegacySurface();\n");
  assert.deepEqual(countReferences(changes), {
    files: 2,
    references: {CatchTextVariant: 0, CatchSurface: 2, CatchText: 1},
    calls: {CatchSurface: 2, CatchText: 1},
    paths: 1,
    ignores: 1,
  });
});

test("--check fails while a caller still names an old symbol, and passes once none does", (t) => {
  const root = seedRepository({"lib/screen.dart": "final a = CatchSurface();\n"});
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  // The CLI reads the repository it sits in, so copy it into the seeded one.
  const here = path.dirname(fileURLToPath(import.meta.url));
  for (const file of ["rename_legacy_library_symbols.mjs", "check_library_shims.mjs"]) {
    fs.mkdirSync(path.join(root, "tool/design"), {recursive: true});
    fs.copyFileSync(path.join(here, file), path.join(root, "tool/design", file));
  }
  fs.mkdirSync(path.join(root, "tool/lib"), {recursive: true});
  for (const helper of ["flutter_source_roots.mjs", "repo_paths.mjs"]) {
    fs.copyFileSync(path.join(here, "../lib", helper), path.join(root, "tool/lib", helper));
  }
  const check = () => spawnSync(process.execPath, [path.join(root, "tool/design/rename_legacy_library_symbols.mjs"), "--check"],
    {encoding: "utf8"});
  const before = check();
  assert.equal(before.status, 1);
  assert.match(before.stderr, /lib\/screen\.dart/u);
  fs.writeFileSync(path.join(root, "lib/screen.dart"),
    "// ignore_for_file: deprecated_member_use\nfinal a = CatchLegacySurface();\n");
  assert.equal(check().status, 0);
});
