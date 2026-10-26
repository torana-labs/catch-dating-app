import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {execFileSync, spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import test from "node:test";
import {
  buildFlutterSourceSizeBaseline,
  checkFlutterSourceSizes,
  checkSourceBaselineHistory,
  discoverFlutterSources,
  fieldFacadePath,
  isHandwrittenSource,
  lineBudgetExemptPaths,
  sourceSizeBaselinePath,
} from "./check_flutter_source_size.mjs";

const row = (file, lines) => ({path: file, lines});
const checker = fileURLToPath(new URL("./check_flutter_source_size.mjs", import.meta.url));
const emptyBaseline = () => buildFlutterSourceSizeBaseline([]);

test("known-bad new source at 801 lines fails in every owned source root", () => {
  for (const file of ["lib/feature/new_screen.dart", "packages/example/lib/new.dart", "widgetbook/lib/new_use_cases.dart"]) {
    assert.match(checkFlutterSourceSizes([row(file, 801)], emptyBaseline()).join("\n"), /exceeds 800 without a baseline/u);
    assert.deepEqual(checkFlutterSourceSizes([row(file, 800)], emptyBaseline()), []);
  }
});

test("source ratchet rejects growth, unrecorded reductions, stale and deleted entries", () => {
  const baseline = buildFlutterSourceSizeBaseline([
    row("lib/growing.dart", 900), row("lib/shrinking.dart", 900),
    row("lib/bounded.dart", 900), row("lib/deleted.dart", 900),
  ]);
  const errors = checkFlutterSourceSizes([
    row("lib/growing.dart", 901), row("lib/shrinking.dart", 850), row("lib/bounded.dart", 800),
  ], baseline).join("\n");
  assert.match(errors, /grew from 900 to 901/u);
  assert.match(errors, /improved from 900 to 850/u);
  assert.match(errors, /baseline is stale at 900/u);
  assert.match(errors, /deleted.dart: baseline entry points to missing or generated source/u);
});

test("line-budget-exempt files ignore the ratchet and cannot hold baseline entries", () => {
  for (const file of lineBudgetExemptPaths) {
    assert.deepEqual(checkFlutterSourceSizes([row(file, 5000)], emptyBaseline()), []);
    const baseline = emptyBaseline();
    baseline.allowedFindings.push({path: file, maxLines: 5000});
    assert.match(checkFlutterSourceSizes([row(file, 5000)], baseline).join("\n"), /exempt from the source-size budget/u);
    assert.equal(buildFlutterSourceSizeBaseline([row(file, 5000)]).allowedFindings.length, 0);
  }
});

test("the exact Field facade exception remains decrease-only and rejects 1151 lines", () => {
  const source = row(fieldFacadePath, 1100);
  const baseline = buildFlutterSourceSizeBaseline([source]);
  assert.deepEqual(checkFlutterSourceSizes([source], baseline), []);
  assert.match(checkFlutterSourceSizes([row(fieldFacadePath, 1101)], baseline).join("\n"), /grew from 1100 to 1101/u);
  const overCap = [row(fieldFacadePath, 1151)];
  assert.match(checkFlutterSourceSizes(overCap, buildFlutterSourceSizeBaseline(overCap)).join("\n"), /exceeds its exact 1150-line facade exception/u);
  assert.match(checkFlutterSourceSizes([row(fieldFacadePath.replace("catch_field.dart", "catch_field_state.dart"), 801)], emptyBaseline()).join("\n"), /exceeds 800/u);
});

test("baseline metadata, duplicate entries, and an empty scan cannot pass", () => {
  const rows = [row("lib/large.dart", 900)];
  const baseline = buildFlutterSourceSizeBaseline(rows);
  baseline.maxLines = 900;
  baseline.owner = "";
  baseline.allowedFindings.push({...baseline.allowedFindings[0]});
  const errors = checkFlutterSourceSizes(rows, baseline).join("\n");
  assert.match(errors, /ratified 800-line ceiling/u);
  assert.match(errors, /architecture owner and Phase 5 target/u);
  assert.match(errors, /duplicate baseline entry/u);
  assert.match(checkFlutterSourceSizes([], emptyBaseline()).join("\n"), /cannot pass without handwritten/u);
});

test("generated exclusions follow known producer identities, not arbitrary generated directories or comments", () => {
  for (const file of ["lib/data/value.g.dart", "lib/data/value.freezed.dart", "lib/l10n/generated/app_localizations_en.dart"]) {
    assert.equal(isHandwrittenSource(file), false);
  }
  for (const file of ["lib/generated/handwritten.dart", "lib/example.dart", "packages/catch_ui/lib/src/handwritten.dart"]) {
    assert.equal(isHandwrittenSource(file), true);
  }
  assert.equal(isHandwrittenSource("test/example_test.dart"), false);
});

test("baseline generation is deterministic, includes the ratcheted facade, and excludes bounded files", () => {
  const rows = [row("lib/z.dart", 900), row(fieldFacadePath, 1100), row("lib/a.dart", 800)];
  assert.deepEqual(buildFlutterSourceSizeBaseline(rows), buildFlutterSourceSizeBaseline([...rows].reverse()));
  assert.deepEqual(buildFlutterSourceSizeBaseline(rows).allowedFindings, [
    {path: "lib/z.dart", maxLines: 900}, {path: fieldFacadePath, maxLines: 1100},
  ]);
});

test("editing the baseline cannot authorize a new split file or increase established debt", () => {
  const previousBaseline = buildFlutterSourceSizeBaseline([row("lib/legacy.dart", 900)]);
  const baseline = buildFlutterSourceSizeBaseline([row("lib/legacy.dart", 950), row("lib/split.dart", 801)]);
  const errors = checkSourceBaselineHistory({baseline, previousBaseline, baseRows: []}).join("\n");
  assert.match(errors, /baseline ceiling grew from 900 to 950/u);
  assert.match(errors, /split.dart: new or split source cannot enter/u);
});

test("initial adoption only baselines handwritten files already oversized at the Git base", () => {
  const baseline = buildFlutterSourceSizeBaseline([row("lib/legacy.dart", 850), row("lib/new.dart", 801)]);
  assert.deepEqual(checkSourceBaselineHistory({baseline, previousBaseline: null,
    baseRows: [row("lib/legacy.dart", 900)]}), ["lib/new.dart: new or split source cannot enter the legacy baseline"]);
});

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-source-size-"));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  execFileSync("git", ["init", "-q"], {cwd: root});
  const write = (file, source) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), {recursive: true});
    fs.writeFileSync(path.join(root, file), source);
  };
  const writeLines = (file, lines) => write(file, "// source line\n".repeat(lines));
  const commit = (files) => {
    execFileSync("git", ["add", "--", ...files], {cwd: root});
    execFileSync("git", ["-c", "user.name=Source Size Fixture", "-c", "user.email=fixture@example.invalid", "commit", "-qm", "fixture"], {cwd: root});
    return execFileSync("git", ["rev-parse", "HEAD"], {cwd: root, encoding: "utf8"}).trim();
  };
  const run = (base, ...args) => spawnSync(process.execPath, [checker, "--root", root, "--base", base, ...args], {encoding: "utf8"});
  return {root, write, writeLines, commit, run};
}

test("CLI sees untracked source, permits reductions, and rejects a hand-broadened baseline", (t) => {
  const f = fixture(t);
  f.writeLines("lib/legacy.dart", 900);
  const original = f.commit(["lib/legacy.dart"]);
  assert.equal(f.run(original, "--write-baseline").status, 0);
  const base = f.commit([sourceSizeBaselinePath]);
  assert.equal(f.run(base, "--check").status, 0);
  f.writeLines("lib/split.dart", 801);
  assert.match(f.run(base, "--check").stderr, /split.dart: 801 lines exceeds 800/u);
  const manuallyBroadened = buildFlutterSourceSizeBaseline([row("lib/legacy.dart", 900), row("lib/split.dart", 801)]);
  f.write(sourceSizeBaselinePath, JSON.stringify(manuallyBroadened));
  assert.match(f.run(base, "--check").stderr, /split.dart: new or split source cannot enter/u);
  f.writeLines("lib/split.dart", 400);
  f.writeLines("lib/legacy.dart", 850);
  assert.equal(f.run(base, "--write-baseline").status, 0);
  assert.equal(f.run(base, "--check").status, 0);
  const refreshed = JSON.parse(fs.readFileSync(path.join(f.root, sourceSizeBaselinePath), "utf8"));
  assert.deepEqual(refreshed.allowedFindings, [{path: "lib/legacy.dart", maxLines: 850}]);
});

test("CLI known-bad Field over-cap fails even when a baseline records the same size", (t) => {
  const f = fixture(t);
  f.writeLines(fieldFacadePath, 1100);
  const base = f.commit([fieldFacadePath]);
  assert.equal(f.run(base, "--write-baseline").status, 0);
  f.writeLines(fieldFacadePath, 1151);
  f.write(sourceSizeBaselinePath, JSON.stringify(buildFlutterSourceSizeBaseline([row(fieldFacadePath, 1151)])));
  assert.match(f.run(base, "--check").stderr, /exceeds its exact 1150-line facade exception/u);
});

test("discovery includes package and Widgetbook source but excludes ignored build outputs", (t) => {
  const f = fixture(t);
  f.write(".gitignore", "build/\n");
  f.writeLines("lib/production.dart", 1);
  f.commit([".gitignore", "lib/production.dart"]);
  f.writeLines("packages/ui/lib/source.dart", 2);
  f.writeLines("widgetbook/lib/cases.dart", 3);
  f.writeLines("packages/ui/build/cached.dart", 900);
  assert.deepEqual(discoverFlutterSources({root: f.root}), [
    row("lib/production.dart", 1), row("packages/ui/lib/source.dart", 2), row("widgetbook/lib/cases.dart", 3),
  ]);
});

test("CLI cannot pass without a resolvable comparison base", (t) => {
  const f = fixture(t);
  f.writeLines("lib/source.dart", 1);
  f.commit(["lib/source.dart"]);
  assert.notEqual(f.run("missing-base", "--write-baseline").status, 0);
  assert.equal(fs.existsSync(path.join(f.root, sourceSizeBaselinePath)), false);
});
