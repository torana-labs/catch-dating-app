import assert from "node:assert/strict";
import {execFileSync, spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";
import {buildGraph, chokepoints, closure, measure, parseArgs, parseDirectives, readRepository, report, resolveUri} from "./dart_blast_radius.mjs";

const script = fileURLToPath(new URL("./dart_blast_radius.mjs", import.meta.url));
const packages = new Map([["example_app", "lib"], ["example_kit", "packages/kit/lib"]]);

// A small app: a router that imports every screen, a screen that imports the
// router back, a barrel, a part file and a test helper.
const files = {
  "lib/router.dart": "import 'package:example_app/home_screen.dart';\nimport 'package:example_app/detail_screen.dart';\nimport 'package:example_app/settings_screen.dart';\n",
  "lib/home_screen.dart": "import 'package:example_app/router.dart';\nimport 'package:example_app/models.dart';\n",
  "lib/detail_screen.dart": "import 'package:example_app/models.dart';\n",
  "lib/settings_screen.dart": "import 'package:flutter/material.dart';\nimport 'dart:async';\n",
  "lib/models.dart": "export 'models/event.dart';\nexport 'models/profile.dart';\nexport 'package:example_kit/kit.dart';\n",
  "lib/models/event.dart": "part 'event.g.dart';\n",
  "lib/models/event.g.dart": "part of 'event.dart';\n",
  "lib/models/profile.dart": "import 'stub.dart' if (dart.library.io) 'io.dart';\n",
  "lib/models/stub.dart": "",
  "lib/models/io.dart": "",
  "packages/kit/lib/kit.dart": "",
  "test/helpers.dart": "import 'package:example_app/home_screen.dart';\n",
  "test/home_test.dart": "import 'helpers.dart';\n",
  "test/detail_test.dart": "import 'package:example_app/detail_screen.dart';\n",
  "test/profile_test.dart": "import 'package:example_app/models/profile.dart';\n",
};

test("directives: import, export, part and every conditional URI; part of is not an edge", () => {
  assert.deepEqual(parseDirectives("import 'a.dart';\nexport \"b.dart\";\npart 'c.g.dart';\npart of 'd.dart';\n" +
    "import 'stub.dart'\n    if (dart.library.io) 'io.dart'\n    if (dart.library.js_interop) 'web.dart';\n"), [
    {kind: "import", uris: ["a.dart"]},
    {kind: "export", uris: ["b.dart"]},
    {kind: "part", uris: ["c.g.dart"]},
    {kind: "import", uris: ["stub.dart", "io.dart", "web.dart"]},
  ]);
  assert.equal(resolveUri("lib/a/b.dart", "../c.dart", packages), "lib/c.dart");
  assert.equal(resolveUri("test/x_test.dart", "package:example_kit/kit.dart", packages), "packages/kit/lib/kit.dart");
  assert.equal(resolveUri("lib/a.dart", "package:flutter/material.dart", packages), null);
  assert.equal(resolveUri("lib/a.dart", "dart:io", packages), null);
});

test("closure follows the router back-edge to every screen; parts fold into their library", () => {
  const graph = buildGraph({files, packages});
  assert.deepEqual(graph.tests, ["test/detail_test.dart", "test/home_test.dart", "test/profile_test.dart"]);
  assert.equal(graph.partOf.get("lib/models/event.g.dart"), "lib/models/event.dart");
  const home = closure(graph, "test/home_test.dart");
  assert.ok(home.has("lib/settings_screen.dart"), "home_screen -> router -> settings_screen");
  assert.ok(home.has("lib/models/io.dart") && home.has("lib/models/stub.dart"));
  const {tests, reach, librariesPerTest, pairs} = measure(graph);
  assert.equal(tests, 3);
  assert.equal(reach.get("lib/models/event.g.dart"), undefined, "part files are not counted as libraries");
  assert.equal(reach.get("lib/settings_screen.dart"), 1);
  assert.equal(reach.get("lib/models/profile.dart"), 3);
  // home: 9 lib libraries (event.g.dart is a part, kit is outside lib/); detail: 6; profile: 3.
  assert.equal(pairs, 9 + 6 + 3);
  assert.equal(librariesPerTest, 6);
});

test("cutting the screen's back-edge to the router shrinks the home test's closure", () => {
  const graph = buildGraph({files, packages});
  const cuts = new Set(["lib/home_screen.dart:lib/router.dart"]);
  const home = closure(graph, "test/home_test.dart", cuts);
  assert.equal(home.has("lib/router.dart"), false);
  assert.equal(home.has("lib/settings_screen.dart"), false);
  assert.equal(measure(graph, cuts).pairs, 18 - 3, "router, detail_screen and settings_screen leave the home test");
});

test("chokepoints rank barrels and hubs by the reach they carry", () => {
  const many = {...files};
  // Five importers make the barrel a candidate; 60 imports make the router a hub.
  for (let index = 0; index < 57; index += 1) {
    many[`lib/screens/screen_${index}.dart`] = "";
  }
  many["lib/router.dart"] += Array.from({length: 57}, (_, index) => `import 'screens/screen_${index}.dart';\n`).join("");
  for (let index = 0; index < 5; index += 1) {
    many[`lib/feature_${index}.dart`] = "import 'package:example_app/models.dart';\nimport 'package:example_app/router.dart';\n";
    many[`test/feature_${index}_test.dart`] = `import 'package:example_app/feature_${index}.dart';\n`;
  }
  const graph = buildGraph({files: many, packages});
  const rows = chokepoints(graph, {top: 5});
  assert.deepEqual(rows.map(row => row.file), ["lib/router.dart", "lib/models.dart"]);
  assert.ok(rows[0].share > rows[1].share);
  assert.equal(rows[1].importers, 7);
});

test("report gives the average, the top libraries and reach with and without cuts", () => {
  const graph = buildGraph({files, packages});
  const result = report(graph, parseArgs(["--top", "2", "--reach", "lib/settings_screen.dart",
    "--cut", "lib/home_screen.dart:lib/router.dart"]));
  assert.equal(result.librariesPerTest, 6);
  assert.equal(result.top.length, 2);
  assert.deepEqual(result.reach, {"lib/settings_screen.dart": 1});
  assert.deepEqual(result.withCuts.reach, {"lib/settings_screen.dart": 0});
  assert.equal(result.withCuts.removedShare, +(3 / 18).toFixed(3));
});

test("arguments are checked", () => {
  assert.throws(() => parseArgs(["--cut", "lib/a.dart"]), /<from\.dart>:<to\.dart>/u);
  assert.throws(() => parseArgs(["--top", "0"]), /positive/u);
  assert.throws(() => parseArgs(["--reach"]), /needs a value/u);
  assert.throws(() => parseArgs(["--bogus"]), /Unknown option/u);
});

test("end to end on a git repository: only tracked Dart files count", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dart-blast-radius-"));
  try {
    const write = (file, text) => {
      fs.mkdirSync(path.dirname(path.join(root, file)), {recursive: true});
      fs.writeFileSync(path.join(root, file), text);
    };
    write("pubspec.yaml", "name: example_app\n");
    write("packages/kit/pubspec.yaml", "name: example_kit\n");
    for (const [file, text] of Object.entries(files)) write(file, text);
    execFileSync("git", ["init", "-q"], {cwd: root});
    execFileSync("git", ["add", "."], {cwd: root});
    write("lib/untracked.dart", "");
    const repository = readRepository(root);
    assert.equal(repository.packages.get("example_kit"), "packages/kit/lib");
    assert.equal("lib/untracked.dart" in repository.files, false);
    const result = spawnSync(process.execPath, [script, "--root", root, "--json", "--reach", "lib/router.dart"], {encoding: "utf8"});
    assert.equal(result.status, 0, result.stderr);
    const json = JSON.parse(result.stdout);
    assert.equal(json.tests, 3);
    assert.deepEqual(json.reach, {"lib/router.dart": 1});
  } finally {
    fs.rmSync(root, {recursive: true, force: true});
  }
});
