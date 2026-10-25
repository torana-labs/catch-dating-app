import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import test from "node:test";

import {compare, countByKind, scanDart, scanFiles, scanReact} from "./check_icon_family_usage.mjs";

const legacy = new Set(["chatBubbleOutlineRounded"]);

test("the repository is within its recorded icon-family counts", () => {
  const result = spawnSync(process.execPath, ["tool/design/check_icon_family_usage.mjs", "--check"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
});

test("Dart references to Material, Cupertino and Phosphor glyphs are counted", () => {
  const findings = scanDart([
    "import 'package:phosphor_flutter/phosphor_flutter.dart';",
    "final a = Icon(Icons.close_rounded);",
    "final b = CupertinoIcons.house;",
    "final c = PhosphorIconsRegular.house;",
    "final d = CatchIcons.close;",
    "// Icons.add in a comment is not a reference.",
  ].join("\n"), legacy);
  assert.deepEqual(findings.map((finding) => finding.kind),
    ["dartFamilyImport", "materialGlyph", "cupertinoGlyph", "phosphorGlyph"]);
});

test("pre-Lucide CatchIcons names count until call sites use roles", () => {
  const findings = scanDart("Icon(CatchIcons.chatBubbleOutlineRounded); Icon(CatchIcons.chat);", legacy);
  assert.deepEqual(findings.map((finding) => finding.text), ["CatchIcons.chatBubbleOutlineRounded"]);
});

test("each glyph imported from an icon-family package is counted in React", () => {
  const findings = scanReact([
    "import {ArrowLeft, Search as SearchIcon} from \"lucide-react\";",
    "import type {LucideIcon} from \"lucide-react\";",
    "import {House} from \"@phosphor-icons/react\";",
    "import {CatchButton} from \"@catch/web-ui\";",
  ].join("\n"));
  assert.deepEqual(findings.map((finding) => finding.text), [
    "ArrowLeft from lucide-react",
    "Search as SearchIcon from lucide-react",
    "LucideIcon from lucide-react",
    "House from @phosphor-icons/react",
  ]);
});

test("the icon layer itself and files outside the scanned roots are exempt", () => {
  const findings = scanFiles([
    {path: "packages/catch_ui/lib/src/foundations/catch_icons.dart", text: "Icons.close"},
    {path: "packages/web-ui/src/icons/catchIconGlyphs.generated.ts", text: "import {X} from \"lucide-react\";"},
    {path: "functions/src/index.ts", text: "import {X} from \"lucide-react\";"},
    {path: "lib/feature/widget.dart", text: "Icons.close"},
    {path: "admin/src/features/a.tsx", text: "import {X} from \"lucide-react\";"},
  ], legacy);
  assert.deepEqual(findings.map((finding) => finding.file), ["lib/feature/widget.dart", "admin/src/features/a.tsx"]);
});

test("a count may only fall, and a fall must be recorded", () => {
  const counts = countByKind([{kind: "materialGlyph"}, {kind: "materialGlyph"}, {kind: "reactFamilyImport"}]);
  assert.deepEqual(compare(counts, {...counts}), {grown: [], fallen: []});

  const grown = compare(counts, {...counts, materialGlyph: 1});
  assert.deepEqual(grown.grown, ["materialGlyph: 2 (recorded 1)"]);

  const fallen = compare(counts, {...counts, reactFamilyImport: 4});
  assert.deepEqual(fallen.fallen, ["reactFamilyImport: 1 (recorded 4)"]);
});
