import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {repoRoot} from "../../lib/repo_paths.mjs";
import {
  captureCoverageSpec,
  readCaptureCoverage,
  readScreenRegistry,
  readTopBarRegistry,
  screenRegistrySpec,
  topBarRegistrySpec,
} from "./screen_registries.mjs";

test("the committed registries read back whole, one file per entry and nothing inline", () => {
  const screens = readScreenRegistry();
  assert.ok(screens.screens.length > 0 && Object.keys(screens.layoutContracts).length > 0);
  assert.ok(readTopBarRegistry().contracts.length > 0);
  assert.ok(readCaptureCoverage().routes.length > 0);
  for (const spec of [screenRegistrySpec, topBarRegistrySpec, captureCoverageSpec]) {
    const index = JSON.parse(fs.readFileSync(path.join(repoRoot, spec.index), "utf8"));
    for (const {field, dir} of spec.collections) {
      assert.equal(field in index, false, `${spec.index} keeps ${field} inline`);
      assert.ok(fs.statSync(path.join(repoRoot, dir)).isDirectory(), dir);
    }
  }
});

test("a capture route file is named by its route id", () => {
  const routes = readCaptureCoverage().routes;
  const files = fs.readdirSync(path.join(repoRoot, captureCoverageSpec.collections[0].dir)).sort();
  assert.deepEqual(files, routes.map(route => `${route.routeId}.json`).sort());
});
