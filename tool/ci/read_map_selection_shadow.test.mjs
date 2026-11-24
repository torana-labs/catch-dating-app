import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";
import {changedSincePreviousMap, classifyReads, formatSummary, isAsset, previousDay, readMatches,
  shadowReport} from "./read_map_selection_shadow.mjs";

const script = fileURLToPath(new URL("./read_map_selection_shadow.mjs", import.meta.url));
const runtime = (opened = [], {listed = [], probed = [], missing = []} = {}) => ({opened, listed, probed, missing});
const FONT = "packages/catch_ui/assets/fonts/IBMPlexMono-Regular.ttf";

test("reads split into font, asset and engine files, fixture and data files, and listings", () => {
  for (const file of [FONT, "NativeAssetsManifest.json", "shaders/ink_sparkle.frag", "assets/images/a.png",
    "packages/catch_ui/assets/icons/x.svg"]) {
    assert.equal(isAsset(file), true, file);
  }
  for (const file of ["contracts/firestore/user.json", "lib/a.dart", "test/fixtures/x.json"]) assert.equal(isAsset(file), false, file);
  const reads = classifyReads(runtime([FONT, "test/fixtures/x.json"], {listed: ["lib/pages"], probed: ["pubspec.yaml"]}));
  assert.deepEqual(reads.assets, [FONT]);
  assert.deepEqual(reads.fixtures, ["pubspec.yaml", "test/fixtures/x.json"]);
  assert.deepEqual(reads.listing, ["lib/pages"]);
  assert.equal(reads.enumerable, false);
});

test("enumerable means named paths only; the engine's ICU lookup never counts against a test", () => {
  const assetOnly = classifyReads(runtime([FONT, "NativeAssetsManifest.json"], {missing: ["icudtl.dat"]}));
  assert.deepEqual([assetOnly.enumerable, assetOnly.assetOnly, assetOnly.missing], [true, true, []]);
  const fixtures = classifyReads(runtime([FONT, "contracts/a.json"]));
  assert.deepEqual([fixtures.enumerable, fixtures.assetOnly], [true, false]);
  // A probe of a path that does not exist could be created by any later change.
  const probing = classifyReads(runtime([FONT], {missing: ["admin/.dart_tool/package_config.json"]}));
  assert.deepEqual([probing.enumerable, probing.assetOnly], [false, false]);
});

test("reads select a test on a named path, a missing path or anything under a listed directory", () => {
  const reads = classifyReads(runtime(["contracts/a.json"], {listed: ["lib/pages"], missing: ["design/new.json"]}));
  assert.deepEqual(readMatches(reads, ["contracts/a.json", "lib/pages/x/y.dart", "lib/pagesx.dart", "design/new.json",
    "lib/other.dart"]), ["contracts/a.json", "design/new.json", "lib/pages/x/y.dart"]);
  assert.deepEqual(readMatches(reads, ["lib/other.dart"]), []);
});

test("the report covers every always-run test, traced or not, with counts and a summary", () => {
  const rows = [
    {test: "test/assets_test.dart", exit: 0, runtime: runtime([FONT], {missing: ["icudtl.dat"]})},
    {test: "test/fixture_test.dart", exit: 0, runtime: runtime([FONT, "contracts/a.json"])},
    {test: "test/scan_test.dart", exit: 0, runtime: runtime([], {listed: ["lib"]})},
    {test: "test/not_always_test.dart", exit: 0, runtime: runtime(["x"])},
  ];
  const probes = ["test/assets_test.dart", "test/fixture_test.dart", "test/scan_test.dart", "test/helper_only_test.dart"]
    .map((test) => ({test, why: "probe"}));
  const report = shadowReport({rows, probes, changed: ["contracts/a.json", "lib/core/x.dart"]});
  assert.deepEqual([report.alwaysRun, report.traced, report.untraced, report.enumerable, report.assetOnly, report.listing,
    report.changedPaths, report.selectedByReads], [4, 3, 1, 2, 1, 1, 2, 2]);
  assert.deepEqual(report.tests.map((entry) => [entry.test, entry.traced, entry.wouldSelect ?? null]), [
    ["test/assets_test.dart", true, []],
    ["test/fixture_test.dart", true, ["contracts/a.json"]],
    ["test/scan_test.dart", true, ["lib/core/x.dart"]],
    ["test/helper_only_test.dart", false, null],
  ]);
  const text = formatSummary(report);
  assert.match(text, /^### Read-map selection shadow \(report-only\)/u);
  assert.match(text, /4 always-run tests; 3 traced, 1 not in the read map\./u);
  assert.match(text, /2 read only named paths \(enumerable\): 1 of them only font, asset and engine files\. 1 list directories\./u);
  assert.match(text, /reads alone would have selected 2 of the 3 traced always-run tests/u);
  assert.match(text, /\| `test\/assets_test\.dart` \| probe \| assets only \| 1 \| 0 \| 0 \| 0 \| no \|/u);
  assert.match(text, /\| `test\/helper_only_test\.dart` \| probe \| not traced \|/u);
  // Without a change window the verdict column is left empty, not "no".
  assert.equal(shadowReport({rows, probes}).selectedByReads, null);
  assert.doesNotMatch(formatSummary(shadowReport({rows, probes})), /reads alone/u);
});

test("the change window runs from the previous day's map to this commit", () => {
  assert.equal(previousDay("2026-12-01"), "2026-11-30");
  const calls = [];
  const api = (endpoint, options = {}) => {
    calls.push([endpoint, Boolean(options.paginate)]);
    if (endpoint.includes("/artifacts?")) {
      return {artifacts: [{name: "test-read-map-day-2026-11-23-x", expired: false, workflow_run: {head_sha: "wrong"}},
        {name: "test-read-map-day-2026-11-23", expired: false, workflow_run: {head_sha: "aaa"}}]};
    }
    return [{files: [{filename: "lib/a.dart"}, {filename: "lib/new.dart", previous_filename: "lib/old.dart"}]},
      {files: [{filename: "lib/a.dart"}]}];
  };
  assert.deepEqual(changedSincePreviousMap({repository: "example-org/example-repo", day: "2026-11-24", head: "bbb", api}),
    {base: "aaa", changed: ["lib/a.dart", "lib/new.dart", "lib/old.dart"], note: null});
  assert.deepEqual(calls, [["repos/example-org/example-repo/actions/artifacts?name=test-read-map-day-2026-11-23&per_page=100", false],
    ["repos/example-org/example-repo/compare/aaa...bbb?per_page=100", true]]);
  assert.deepEqual(changedSincePreviousMap({repository: "o/r", day: "2026-11-24", head: "bbb", api: () => ({artifacts: []})}),
    {base: null, changed: null, note: "no test-read-map-day-2026-11-23 artifact"});
  const same = changedSincePreviousMap({repository: "o/r", day: "2026-11-24", head: "aaa",
    api: () => ({artifacts: [{name: "test-read-map-day-2026-11-23", expired: false, workflow_run: {head_sha: "aaa"}}]})});
  assert.deepEqual(same.changed, []);
});

test("end to end: the CLI reads the map and the selector's always-run set and writes both outputs", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "read-map-shadow-"));
  try {
    const map = path.join(dir, "map.jsonl");
    fs.writeFileSync(map, `${JSON.stringify({test: "test/a_test.dart", exit: 0, runtime: runtime([FONT])})}\n`);
    const probes = path.join(dir, "probes.json");
    fs.writeFileSync(probes, JSON.stringify({sourceSha: "x", probesRetained: [{test: "test/a_test.dart", why: "probe"}]}));
    const changed = path.join(dir, "changed.txt");
    fs.writeFileSync(changed, `${FONT}\n`);
    const out = path.join(dir, "report.json");
    const summary = path.join(dir, "summary.md");
    const result = spawnSync(process.execPath, [script, "--read-map", map, "--probes", probes, "--changed", changed,
      "--out", out, "--summary", summary], {encoding: "utf8"});
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(fs.readFileSync(out, "utf8")).tests[0].wouldSelect[0], FONT);
    assert.match(fs.readFileSync(summary, "utf8"), /1 always-run tests; 1 traced/u);
    const bad = spawnSync(process.execPath, [script, "--read-map", map, "--probes", probes, "--day", "2026-11-24"],
      {encoding: "utf8"});
    assert.notEqual(bad.status, 0);
  } finally {
    fs.rmSync(dir, {recursive: true, force: true});
  }
});
