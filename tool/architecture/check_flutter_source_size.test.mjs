import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {execFileSync, spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import test from "node:test";
import {
  checkFlutterSourceSizes,
  discoverFlutterSources,
  isHandwrittenSource,
} from "./check_flutter_source_size.mjs";

const row = (file, lines, exemption = null) => ({path: file, lines, exemption});
const checker = fileURLToPath(new URL("./check_flutter_source_size.mjs", import.meta.url));

test("a new source at 801 lines fails in every owned source root unless it states an exemption", () => {
  for (const file of ["lib/feature/new_screen.dart", "packages/example/lib/new.dart", "widgetbook/lib/new_use_cases.dart"]) {
    assert.match(checkFlutterSourceSizes([row(file, 801)]).join("\n"), /801 lines exceeds 800; split it or add/u);
    assert.deepEqual(checkFlutterSourceSizes([row(file, 800)]), []);
    assert.deepEqual(checkFlutterSourceSizes([row(file, 801, "single route table")]), []);
  }
});

test("no source passes the ceiling, exemption or not", () => {
  assert.match(checkFlutterSourceSizes([row("lib/huge.dart", 2501, "reason")]).join("\n"),
    /2501 lines exceeds the 2500-line ceiling/u);
});

test("an empty scan cannot pass", () => {
  assert.deepEqual(checkFlutterSourceSizes([]), ["source-size check cannot pass without handwritten source files"]);
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

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-source-size-"));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  execFileSync("git", ["init", "-q"], {cwd: root});
  const write = (file, source) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), {recursive: true});
    fs.writeFileSync(path.join(root, file), source);
  };
  const writeLines = (file, lines, header = "") => write(file, header + "// source line\n".repeat(lines));
  const commit = (files) => {
    execFileSync("git", ["add", "--", ...files], {cwd: root});
    execFileSync("git", ["-c", "user.name=Source Size Fixture", "-c", "user.email=fixture@example.invalid", "commit", "-qm", "fixture"], {cwd: root});
  };
  const run = (...args) => spawnSync(process.execPath, [checker, "--root", root, ...args], {encoding: "utf8"});
  return {root, write, writeLines, commit, run};
}

test("CLI reads the exemption from the file itself, including untracked source", (t) => {
  const f = fixture(t);
  f.writeLines("lib/legacy.dart", 900, "// size-exemption: one dense rule table\n");
  f.commit(["lib/legacy.dart"]);
  assert.equal(f.run("--check").status, 0);
  f.writeLines("lib/split.dart", 801);
  assert.match(f.run("--check").stderr, /split.dart: 801 lines exceeds 800/u);
  f.writeLines("lib/split.dart", 400);
  f.writeLines("lib/legacy.dart", 1200, "// size-exemption: one dense rule table\n");
  assert.equal(f.run("--check").status, 0);
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
