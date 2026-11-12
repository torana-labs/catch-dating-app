import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {discoverableFunctionsTests} from "./functions_module_graph.mjs";

test("Functions tests are named from their sources as run-tests.cjs discovers them", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-functions-sources-"));
  try {
    for (const file of ["src/a/one.test.ts", "src/a/one.ts", "test/two.test.cjs",
      "test/firestore.rules.test.cjs", "test/rules/users.rules.test.cjs", "scripts/three.test.cjs"]) {
      fs.mkdirSync(path.dirname(path.join(root, file)), {recursive: true});
      fs.writeFileSync(path.join(root, file), "");
    }
    assert.deepEqual(discoverableFunctionsTests(root),
      ["lib/a/one.test.js", "scripts/three.test.cjs", "test/two.test.cjs"]);
  } finally {
    fs.rmSync(root, {recursive: true, force: true});
  }
});

test("only pull requests narrow the Functions lane, through the runner's selection variable", () => {
  const source = fs.readFileSync(new URL("../../.github/workflows/functions-ci.yml", import.meta.url), "utf8");
  const select = source.slice(source.indexOf("      - name: Select the Functions tests this pull request can affect"),
    source.indexOf("      - name: Functions tests\n"));
  assert.match(select, /if: \$\{\{ inputs\.mode == 'pr' && inputs\.base_sha != '' \}\}/u);
  assert.match(select, /node tool\/impact\/functions_unit_test_selection\.mjs --paths-file build\/ci\/changed-paths\.txt/u);
  const run = source.slice(source.indexOf("      - name: Functions tests\n"));
  assert.match(run, /CATCH_UNIT_TEST_SELECTION: \$\{\{ steps\.selection\.outcome == 'success' && format\('\{0\}\/build\/ci\/functions-test-selection\.json', github\.workspace\) \|\| '' \}\}/u);
  assert.match(run, /run: npm --prefix functions test/u);
  const ci = fs.readFileSync(new URL("../../.github/workflows/ci.yml", import.meta.url), "utf8");
  const job = ci.slice(ci.indexOf("\n  functions:")).split(/\n  [a-z-]+:/u)[1];
  assert.match(job, /uses: \.\/\.github\/workflows\/functions-ci\.yml\n    with:\n      base_sha: \$\{\{ needs\.plan\.outputs\.base_sha \}\}\n      mode: \$\{\{ needs\.plan\.outputs\.mode \}\}/u);
});
