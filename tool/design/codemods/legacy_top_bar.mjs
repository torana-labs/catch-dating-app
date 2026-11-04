#!/usr/bin/env node
// The system CatchTopBar takes the six app variants, so the pre-redesign top
// bar (its route, screen, primaryRail, brand and identity recipes) keeps its
// code as CatchLegacyTopBar in catch_legacy_top_bar.dart, and this codemod moves
// its callers there. Its enums (CatchTopBarNavigation, CatchTopBarTone,
// CatchTopBarEmphasis, CatchTopBarSearch) keep their names: no system symbol
// claims them. See lib/legacy_rename.mjs for what it touches and leaves alone.
import path from "node:path";
import {fileURLToPath} from "node:url";

import {repoRoot} from "../../lib/repo_paths.mjs";
import {legacyCodemod} from "./lib/legacy_rename.mjs";

const library = "packages/catch_ui";

/** Written by hand: the system and legacy top bars, the frames that name the system one, and their tests and pages. */
export const handWrittenFiles = new Set([
  `${library}/lib/catch_ui.dart`,
  ...["catch_top_bar", "catch_legacy_top_bar", "catch_legacy_top_bar_workspace_geometry"]
    .map((name) => `${library}/lib/src/components/${name}.dart`),
  ...["catch_app_shell", "catch_screen"].map((name) => `${library}/lib/src/patterns/${name}.dart`),
  ...["catch_top_bar", "catch_screen", "catch_app_shell"].map((name) => `${library}/test/${name}_test.dart`),
  ...["top_bar_family", "app_shell_family"].map((name) => `${library}/test/goldens/${name}_test.dart`),
  ...["top_bar", "screen", "app_shell"].map((name) => `widgetbook/lib/primitives/contracts/${name}.dart`),
]);

export const codemod = legacyCodemod({
  renames: new Map([["CatchTopBar", "CatchLegacyTopBar"]]),
  fileRenames: new Map([["src/components/catch_top_bar.dart", "src/components/catch_legacy_top_bar.dart"]]),
  handWrittenFiles,
  callPatterns: {
    CatchTopBar: /(?<![\w$])CatchTopBar(?:\s*\.\s*(?:route|screen|primaryRail|brand|identity))?\s*\(/u,
  },
});

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  process.exitCode = codemod.runCli({
    argv: process.argv.slice(2),
    root: repoRoot,
    script: "tool/design/codemods/legacy_top_bar.mjs",
  });
}
