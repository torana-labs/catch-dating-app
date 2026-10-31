import assert from "node:assert/strict";
import test from "node:test";
import {
  checkFlutterTestSizes,
  lineCount,
  sizeExemption,
} from "./check_flutter_test_size.mjs";

const spec = (path, lines, exemption = null) => ({path, lines, exemption});

test("an oversized spec without a stated exemption fails", () => {
  assert.deepEqual(checkFlutterTestSizes([spec("test/new_feature_test.dart", 1201)]), [
    'test/new_feature_test.dart: 1201 lines exceeds 1200; split it or add "// size-exemption: <reason>" in its first 20 lines',
  ]);
  assert.deepEqual(checkFlutterTestSizes([spec("test/bounded_test.dart", 1200)]), []);
});

test("a stated exemption allows growth and shrinkage up to the ceiling with no bookkeeping", () => {
  for (const lines of [1201, 1800, 2500]) {
    assert.deepEqual(checkFlutterTestSizes([spec("test/big_test.dart", lines, "one screen")]), []);
  }
  assert.deepEqual(checkFlutterTestSizes([spec("test/big_test.dart", 2501, "one screen")]), [
    "test/big_test.dart: 2501 lines exceeds the 2500-line ceiling; split it",
  ]);
});

test("the exemption must be a reasoned comment near the top of the file", () => {
  assert.equal(sizeExemption("// size-exemption: one route table\nimport 'a.dart';\n"), "one route table");
  assert.equal(sizeExemption("import 'a.dart';\n  //size-exemption:   spaced  \n"), "spaced");
  assert.equal(sizeExemption("// size-exemption:\n"), null);
  assert.equal(sizeExemption("// size-exemption: \n"), null);
  assert.equal(sizeExemption(`${"// filler\n".repeat(20)}// size-exemption: too late\n`), null);
  assert.equal(sizeExemption("/* size-exemption: block comments do not count */\n"), null);
});

test("lineCount handles trailing newlines without an extra phantom line", () => {
  assert.equal(lineCount("one\ntwo\n"), 2);
  assert.equal(lineCount("one\ntwo"), 2);
  assert.equal(lineCount(""), 0);
});
