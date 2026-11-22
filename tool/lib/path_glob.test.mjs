import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import fs from "node:fs";
import test from "node:test";
import picomatch from "picomatch";
import {
  matchesGlobPath,
  matchesScopePath,
  normalizeGlobPath,
} from "./path_glob.mjs";
import {loadToolsManifest} from "./tools_manifest.mjs";

test("glob matching is normalized, dot-safe, and supports zero-depth globstars", () => {
  assert.equal(normalizeGlobPath("./tool//"), "tool");
  assert.equal(normalizeGlobPath(""), null);
  assert.equal(matchesGlobPath(".github/workflows/ci.yml", "**/*"), true);
  assert.equal(matchesGlobPath("a/b", "a/**/b"), true);
  assert.equal(matchesGlobPath("a/one/b", "a/**/b"), true);
  assert.equal(matchesGlobPath("a/one/c", "a/**/b"), false);
});

test("scope matching retains literal directory ownership", () => {
  assert.equal(matchesScopePath("tool/example.mjs", "tool"), true);
  assert.equal(matchesScopePath("tool", "tool/**"), true);
  assert.equal(matchesScopePath("tool/example.mjs", "tool/**"), true);
  assert.equal(matchesScopePath("docs/example.md", "tool"), false);
});

test("dependency-free bootstrap matching agrees with Picomatch for every active path contract", () => {
  const graph = JSON.parse(fs.readFileSync(
    new URL("../harness/component_graph.json", import.meta.url),
    "utf8",
  ));
  const manifest = loadToolsManifest();
  const patterns = new Set();
  const addPatterns = (values) => {
    for (const value of values ?? []) {
      if (typeof value === "string") patterns.add(value);
    }
  };
  for (const classification of graph.classifications ?? []) {
    addPatterns(classification.paths?.include);
    addPatterns(classification.paths?.exclude);
  }
  for (const component of graph.components ?? []) {
    addPatterns(component.ownedPaths?.include);
    addPatterns(component.ownedPaths?.exclude);
  }
  for (const tool of manifest.tools ?? []) addPatterns(tool.impactPaths);
  addPatterns(manifest.ciImpact?.additionalFullPaths);

  const paths = execFileSync("git", ["ls-files"], {
    encoding: "utf8",
    // Keep the complete repository inventory within the Harness Git budget.
    maxBuffer: 32 * 1024 * 1024,
  })
    .split(/\r?\n/u)
    .filter(Boolean);
  assert.ok(paths.length > 7_000, "the oracle must cover the tracked repository");
  assert.ok(patterns.size > 100, "the oracle must cover active path contracts");

  const differences = [];
  for (const pattern of patterns) {
    const oracle = picomatch(pattern, {dot: true, nonegate: true});
    for (const path of paths) {
      const expected = oracle(path);
      const actual = matchesGlobPath(path, pattern);
      if (actual !== expected) differences.push({path, pattern, expected, actual});
    }
  }
  assert.deepEqual(differences, []);
});
