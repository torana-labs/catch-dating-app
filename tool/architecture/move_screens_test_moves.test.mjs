// Test-only moves: a group whose entries move root test files into an app
// package's test/ folder, such as the Host capture catalog with the Host
// tests that share its helpers (P6, issue #2373).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {applyGroupPlan} from "./lib/screen_move_apply.mjs";
import {fixtureRepo, git, mapSource, planFor} from "./lib/screen_move_test_fixtures.mjs";
import {runCli} from "./move_screens.mjs";

const hostTestsMap = mapSource([
  {path: "lib/hosts/", layer: "app"},
  {path: "test/hosts/forms/", layer: "app", moveTo: "apps/host/test/forms/", group: "host-tests"},
  {path: "test/ui_captures/host_catalog.dart", layer: "app",
    moveTo: "apps/host/test/ui_captures/host_catalog.dart", group: "host-tests"},
]);

function hostTestsFixture(extra = {}) {
  return fixtureRepo({
    "tool/architecture/context_map.json": hostTestsMap,
    "apps/host/pubspec.yaml": "name: catch_host_app\ndependencies:\n  catch_dating_app:\n    path: ../..\ndev_dependencies:\n  catch_test_support:\n    path: ../../packages/catch_test_support\n",
    "lib/hosts/forms/forms_screen.dart": "class FormsScreen {}\n",
    "test/hosts/forms/forms_captures.dart": [
      "import 'package:catch_dating_app/hosts/forms/forms_screen.dart';",
      "import 'package:catch_test_support/test_pump_helpers.dart';",
      "",
    ].join("\n"),
    "test/hosts/forms/forms_capture_test.dart": "import 'forms_captures.dart';\n",
    "test/ui_captures/host_catalog.dart": "import '../hosts/forms/forms_captures.dart';\n",
    "docs/captures.md": "Form captures live in test/hosts/forms/forms_captures.dart.\n",
    ...extra,
  });
}

test("a test-only group moves root tests into apps/<app>/test and rewrites their relative imports", () => {
  const root = hostTestsFixture();
  const {plan} = planFor(root, "host-tests");
  assert.deepEqual(plan.errors, []);
  assert.deepEqual(Object.fromEntries(plan.moves), {
    "test/hosts/forms/forms_capture_test.dart": "apps/host/test/forms/forms_capture_test.dart",
    "test/hosts/forms/forms_captures.dart": "apps/host/test/forms/forms_captures.dart",
    "test/ui_captures/host_catalog.dart": "apps/host/test/ui_captures/host_catalog.dart",
  });
  // Group-moved tests are placed by their entries, never re-mirrored.
  assert.deepEqual(Object.fromEntries(plan.testMoves), {});
  assert.equal(plan.writes.get("apps/host/test/ui_captures/host_catalog.dart"),
    "import '../forms/forms_captures.dart';\n");
  assert.equal(plan.writes.get("apps/host/test/forms/forms_capture_test.dart") ??
    fs.readFileSync(path.join(root, "test/hosts/forms/forms_capture_test.dart"), "utf8"),
  "import 'forms_captures.dart';\n");

  const result = applyGroupPlan({root, plan, external: false});
  assert.equal(result.unstaged.length, 0);
  assert.ok(fs.existsSync(path.join(root, "apps/host/test/forms/forms_captures.dart")));
  assert.equal(fs.readFileSync(path.join(root, "docs/captures.md"), "utf8"),
    "Form captures live in apps/host/test/forms/forms_captures.dart.\n");
  const record = JSON.parse(fs.readFileSync(path.join(root, "tool/architecture/screen_moves/host-tests.json"), "utf8"));
  assert.equal(record.moves["test/ui_captures/host_catalog.dart"], "apps/host/test/ui_captures/host_catalog.dart");
  assert.doesNotMatch(fs.readFileSync(path.join(root, "tool/architecture/context_map.json"), "utf8"), /host-tests/u);
  assert.match(git(root, "log", "-1", "--format=%B"), /Screen-Move-Group: host-tests/u);
  assert.equal(runCli(["--verify", "--commit", "HEAD", "--root", root]), 0);
  assert.equal(runCli(["--check", "--root", root]), 0);
});

test("a test-only group cannot strand an importer, import a root test that stays, or read root-relative fixtures", () => {
  const root = hostTestsFixture({
    "test/hosts/forms/forms_captures.dart": "import '../../support/pump.dart';\n",
    "test/support/pump.dart": "void pump() {}\n",
    "test/hosts/other_test.dart": "import 'forms/forms_captures.dart';\n",
    "test/hosts/forms/forms_read_test.dart": "final photo = File('test/goldens/fixtures/portrait.jpg');\n",
  });
  const {plan} = planFor(root, "host-tests");
  assert.deepEqual(plan.errors.map((error) => `${error.kind} ${error.file}`).sort(), [
    "fixtureRead test/hosts/forms/forms_read_test.dart",
    "testClosure test/hosts/forms/forms_captures.dart",
    "testClosure test/hosts/other_test.dart",
  ]);
  const messages = plan.errors.map((error) => error.message).join("\n");
  assert.match(messages, /test\/hosts\/other_test\.dart imports test\/hosts\/forms\/forms_captures\.dart, which moves to apps\/host\/test\/forms\/forms_captures\.dart; only apps\/host tests can import it/u);
  assert.match(messages, /forms_captures\.dart moves to apps\/host\/test\/forms\/forms_captures\.dart but imports test\/support\/pump\.dart, which stays in the root package/u);
});

test("a golden test moved by a test-only group takes its baselines along", () => {
  const root = fixtureRepo({
    "tool/architecture/context_map.json": mapSource([
      {path: "lib/hosts/", layer: "app"},
      {path: "test/goldens/host_board_test.dart", layer: "app",
        moveTo: "apps/host/test/goldens/host_board_test.dart", group: "host-goldens"},
    ]),
    "test/goldens/host_board_test.dart": "void main() => matchCatchGolden(tester, 'host_board', builder: null);\n",
    "test/goldens/baseline/host_board.light.png": "png",
  });
  const {plan} = planFor(root, "host-goldens");
  assert.deepEqual(plan.errors, []);
  assert.deepEqual(Object.fromEntries(plan.goldenMoves), {
    "test/goldens/baseline/host_board.light.png": "apps/host/test/goldens/baseline/host_board.light.png",
  });
});
