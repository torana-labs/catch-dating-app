import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";
import {designParityCommands} from "./check_design_parity.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const script = path.join(repoRoot, "tool/design/build_widget_similarity.mjs");

test("check mode derives similarity without writing a tracked snapshot", (t) => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "catch-widget-similarity-test-"));
  t.after(() => fs.rmSync(tempRoot, {recursive: true, force: true}));
  const fingerprints = path.join(tempRoot, "fingerprints.json");
  const report = path.join(tempRoot, "similarity.json");
  fs.writeFileSync(fingerprints, `${JSON.stringify({
    version: 1,
    widgets: [
      fingerprint("FixtureAlphaCard", "a"),
      fingerprint("FixtureBetaCard", "b"),
    ],
    failures: [],
  })}\n`);

  const args = [
    script,
    "--fingerprints",
    path.relative(repoRoot, fingerprints),
    "--fingerprints-label",
    "ephemeral:test",
    "--out",
    path.relative(repoRoot, report),
    "--check",
  ];
  const checked = spawnSync(process.execPath, args, {cwd: repoRoot, encoding: "utf8"});
  assert.equal(checked.status, 0, checked.stderr);
  assert.match(checked.stdout, /2 widgets/u);
  assert.equal(fs.existsSync(report), false);

  const generated = spawnSync(process.execPath, args.slice(0, -1), {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(generated.status, 0, generated.stderr);
  const parsed = JSON.parse(fs.readFileSync(report, "utf8"));
  assert.equal(parsed.summary.widgets, 2);
  assert.equal(parsed.sourceOfTruth.fingerprints, "ephemeral:test");
});

function fingerprint(name, marker) {
  return {
    name,
    file: `lib/${name}.dart`,
    role: "composition",
    contractId: null,
    shapeHash: marker.repeat(64),
    coarseShapeHash: marker.repeat(64),
    simhash128: marker.repeat(32),
    tokenStreamLength: 10,
    coarseTokenStreamLength: 10,
    shingles: [`W:${marker}`],
    tokenMultiset: {[`W:${marker}`]: 1},
    constructorParams: [],
    hasWidgetHelpers: false,
  };
}

test("merge parity retains focused similarity and product invariants, with reports opt-in", () => {
  const source = fs.readFileSync(path.join(repoRoot, "tool/design/check_design_parity.mjs"), "utf8");
  const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, "tool/tools_manifest.json"), "utf8"));
  const blocking = designParityCommands(manifest).join("\n");
  assert.match(blocking, /node --test tool\/design\/build_widget_similarity.test.mjs/u);
  assert.match(blocking, /check_widget_dedupe_probes.mjs/u);
  for (const invariant of ["check_component_contracts", "check_widget_classification",
    "check_new_widget_inventory", "check_widget_pattern_families", "check_route_inventory",
    "check_capture_coverage", "check_screen_contracts",
    "check_screen_top_bar_contracts", "check_widgetbook_coverage"]) {
    assert.ok(blocking.includes(invariant), `${invariant} must remain blocking`);
  }
  assert.doesNotMatch(blocking, /extract_fingerprints|build_widget_similarity.mjs --/u);
  assert.match(source, /const advisory = args.includes\("--reports"\) \? \[/u);
  assert.match(source, /"node tool\/design\/build_widget_similarity.mjs"/u);
});

test("similarity check is advisory even for identical widget fingerprints", (t) => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "catch-similarity-advisory-"));
  t.after(() => fs.rmSync(tempRoot, {recursive: true, force: true}));
  const fingerprints = path.join(tempRoot, "fingerprints.json");
  fs.writeFileSync(fingerprints, JSON.stringify({version: 1, widgets: [
    fingerprint("FixtureAlphaCard", "a"), fingerprint("FixtureBetaCard", "a"),
  ], failures: []}));
  const result = spawnSync(process.execPath, [script, "--fingerprints",
    path.relative(repoRoot, fingerprints), "--check", "--json"], {cwd: repoRoot, encoding: "utf8"});
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.summary.widgets, 2);
  assert.ok(report.clusters.some(cluster => cluster.members.includes("FixtureAlphaCard") &&
    cluster.members.includes("FixtureBetaCard")), "known identical widgets must still be detected");
});
