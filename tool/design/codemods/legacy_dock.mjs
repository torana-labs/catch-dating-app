#!/usr/bin/env node
// The system CatchDock takes the four placements (auto, bar, card, pane) and a
// primary action, so the pre-redesign dock keeps its code as CatchLegacyDock in
// catch_legacy_dock.dart, and this codemod moves its callers there. Every
// pre-redesign recipe goes: the utility dock hosts arbitrary content, primary
// and primaryContent carry the catch line, footnote, accent and Cupertino
// floating chrome, and pageAction draws borderless on the page background, none
// of which the system API draws. CatchDockVariant keeps its name: no system
// symbol claims it. See legacy_rename.mjs for what it touches and leaves alone.
import path from "node:path";
import {fileURLToPath} from "node:url";

import {repoRoot} from "../../lib/repo_paths.mjs";
import {legacyCodemod} from "./legacy_rename.mjs";

const library = "packages/catch_ui";

/** Written by hand: the system and legacy docks, the frame that names the system one, and their tests and pages. */
export const handWrittenFiles = new Set([
  `${library}/lib/catch_ui.dart`,
  ...["catch_dock", "catch_legacy_dock"].map((name) => `${library}/lib/src/components/${name}.dart`),
  `${library}/lib/src/patterns/catch_screen.dart`,
  ...["catch_dock", "catch_screen", "catch_app_shell"].map((name) => `${library}/test/${name}_test.dart`),
  ...["dock_family", "app_shell_family"].map((name) => `${library}/test/goldens/${name}_test.dart`),
  ...["dock", "screen", "app_shell"].map((name) => `widgetbook/lib/primitives/contracts/${name}.dart`),
]);

export const codemod = legacyCodemod({
  renames: new Map([["CatchDock", "CatchLegacyDock"]]),
  fileRenames: new Map([["src/components/catch_dock.dart", "src/components/catch_legacy_dock.dart"]]),
  handWrittenFiles,
  callPatterns: {
    CatchDock: /(?<![\w$])CatchDock(?:\s*\.\s*(?:primary|primaryContent|pageAction))?\s*\(/u,
  },
});

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  process.exitCode = codemod.runCli({
    argv: process.argv.slice(2),
    root: repoRoot,
    script: "tool/design/codemods/legacy_dock.mjs",
  });
}
