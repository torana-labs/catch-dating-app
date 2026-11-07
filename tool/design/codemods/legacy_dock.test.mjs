import assert from "node:assert/strict";
import test from "node:test";

import {codemod, handWrittenFiles} from "./legacy_dock.mjs";

test("every pre-redesign recipe moves to the legacy name; the system's dock symbols stay", () => {
  const source = [
    "final a = CatchDock(child: const Text('Filters'));",
    "final b = CatchDock.primary(label: 'Join', onPressed: join);",
    "final c = CatchDock.primaryContent(label: 'Next', onPressed: next);",
    "final d = CatchDock.pageAction(label: 'Save', onPressed: save);",
    "final e = find.byType(CatchDock); final f = CatchDockVariant.utility;",
    "final g = CatchDockPlacement.bar; final h = CatchDockAction(label: 'Go');",
  ].join("\n");
  assert.equal(codemod.renameSource(source), [
    "final a = CatchLegacyDock(child: const Text('Filters'));",
    "final b = CatchLegacyDock.primary(label: 'Join', onPressed: join);",
    "final c = CatchLegacyDock.primaryContent(label: 'Next', onPressed: next);",
    "final d = CatchLegacyDock.pageAction(label: 'Save', onPressed: save);",
    "final e = find.byType(CatchLegacyDock); final f = CatchDockVariant.utility;",
    "final g = CatchDockPlacement.bar; final h = CatchDockAction(label: 'Go');",
  ].join("\n"));
  assert.equal(codemod.renameSource(codemod.renameSource(source)), codemod.renameSource(source));
});

test("the moved file's path follows it", () => {
  assert.equal(
    codemod.renameSource("import 'package:catch_ui/src/components/catch_dock.dart';"),
    "import 'package:catch_ui/src/components/catch_legacy_dock.dart';",
  );
});

test("the hand-written system files stay", () => {
  for (const file of handWrittenFiles) assert.equal(codemod.isRenamed(file), false, file);
  assert.ok(handWrittenFiles.has("packages/catch_ui/lib/src/components/catch_dock.dart"));
  assert.ok(handWrittenFiles.has("packages/catch_ui/lib/src/patterns/catch_screen.dart"));
  assert.equal(codemod.isRenamed("lib/swipes/presentation/filters_screen.dart"), true);
});
