import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  buildRows,
  dartBarrelExports,
  generateMatrix,
  matrixPath,
  reactBarrelExports,
  renderMatrix,
} from "./component_matrix.mjs";

const table = {
  Both: {records: ["catch.both"]},
  Web: {records: ["catch.web", "catch.web_two"], parts: ["WebPart"]},
  App: {records: ["catch.app"]},
  Neither: {records: ["catch.neither"]},
};
const components = [
  {id: "catch.both", tier: "T1", name: "CatchBoth", dart: {symbol: "CatchBoth"}, react: {symbol: "CatchBoth"}, aliases: ["CatchOldBoth", "NotExported"], absorbs: ["CatchAbsorbed"]},
  {id: "catch.web", tier: "T2", name: "CatchWeb", status: "planned"},
  {id: "catch.web_two", tier: "T2", name: "CatchWebTwo", dart: {symbol: "CatchMissingInLibrary"}},
  {id: "catch.app", tier: "T3", name: "AppThing", dart: {symbol: "AppThing"}},
  {id: "catch.neither", tier: "T1", name: "CatchNeither", status: "planned"},
];

test("the React barrel's value exports exclude types", () => {
  const names = reactBarrelExports([
    'export {CatchOne, catchHelper} from "./one";',
    'export type {CatchOneProps} from "./one";',
    'export {Original as CatchRenamed} from "./two";',
    "export const CatchThree = 1;",
    'export type {Ground as CatchGround} from "./palette";',
  ].join("\n"));
  assert.deepEqual([...names], ["CatchOne", "catchHelper", "CatchRenamed", "CatchThree"]);
});

test("the Dart barrel follows exports, parts, show and hide", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "component-matrix-"));
  const write = (relative, text) => {
    fs.mkdirSync(path.dirname(path.join(root, relative)), {recursive: true});
    fs.writeFileSync(path.join(root, relative), text);
  };
  write("lib/barrel.dart", [
    "library;",
    "export 'src/one.dart';",
    "export 'src/two.dart' show CatchTwo;",
    "export 'src/three.dart' hide CatchHidden;",
  ].join("\n"));
  write("lib/src/one.dart", "part 'one_part.dart';\nabstract interface class CatchOne {}\nclass _Private {}\nenum CatchOneMode {a}\n");
  write("lib/src/one_part.dart", "final class CatchOnePart {}\n");
  write("lib/src/two.dart", "class CatchTwo {}\nclass CatchTwoNotShown {}\n");
  write("lib/src/three.dart", "export 'four.dart';\nclass CatchHidden {}\nclass CatchThree {}\n");
  write("lib/src/four.dart", "typedef CatchFour = int;\n");
  assert.deepEqual([...dartBarrelExports(root, "lib/barrel.dart")].sort(),
    ["CatchFour", "CatchOne", "CatchOneMode", "CatchOnePart", "CatchThree", "CatchTwo"]);
});

test("the action says what is left: align, port one or port both, plus live absorptions", () => {
  const rows = buildRows({
    components,
    reactExports: new Set(["CatchBoth", "CatchWeb", "CatchOldBoth"]),
    dartExports: new Set(["CatchBoth", "CatchAbsorbed"]),
    table,
  });
  assert.deepEqual(rows.map((row) => [row.id, row.flutter, row.react, row.action]), [
    ["catch.both", "CatchBoth", "CatchBoth", "align"],
    ["catch.web", null, "CatchWeb", "port flutter"],
    ["catch.web_two", "CatchMissingInLibrary (app)", null, "port react"],
    ["catch.app", "AppThing (app)", null, "port react"],
    ["catch.neither", null, null, "port both"],
  ]);
  assert.deepEqual(rows[0].absorbs, ["CatchOldBoth", "CatchAbsorbed"]);
  assert.equal(rows[1].system, "Web + WebPart");
});

test("the styled symbol wins over a headless record, and is not its own absorption", () => {
  const rows = buildRows({
    components: [{id: "catch.both", tier: "T1", name: "CatchBoth", dart: {symbol: "CatchBoth"}, react: {symbol: "BothControl"}, aliases: ["BothControl"]}],
    reactExports: new Set(["CatchBoth", "BothControl"]),
    dartExports: new Set(["CatchBoth"]),
    table: {Both: {records: ["catch.both"]}},
  });
  assert.equal(rows[0].react, "CatchBoth");
  assert.deepEqual(rows[0].absorbs, ["BothControl"]);
  const headless = buildRows({
    components: [{id: "catch.both", tier: "T1", name: "CatchBoth", dart: {symbol: "CatchBoth"}, react: {symbol: "BothControl"}, aliases: ["BothControl"]}],
    reactExports: new Set(["BothControl"]),
    dartExports: new Set(["CatchBoth"]),
    table: {Both: {records: ["catch.both"]}},
  });
  assert.equal(headless[0].react, "BothControl");
  assert.deepEqual(headless[0].absorbs, []);
});

test("the table renders the plan's columns with a dash for what is missing", () => {
  const text = renderMatrix(buildRows({
    components,
    reactExports: new Set(["CatchBoth", "CatchOldBoth"]),
    dartExports: new Set(["CatchBoth"]),
    table,
  }));
  assert.match(text, /\| System \| Registry \| Tier \| Flutter today \| React today \| Action \|/u);
  assert.match(text, /\| Both \| `catch\.both` \| T1 \| `CatchBoth` \| `CatchBoth` \| align; absorbs: `CatchOldBoth` \|/u);
  assert.match(text, /\| App \| `catch\.app` \| T3 \| `AppThing` \(app\) \| — \| port react \|/u);
  assert.match(text, /\| Neither \| `catch\.neither` \| T1 \| — \| — \| port both \|/u);
});

test("the committed matrix is what the registry and barrels generate", () => {
  assert.equal(fs.readFileSync(matrixPath, "utf8"), generateMatrix(process.cwd()));
  const result = spawnSync(process.execPath, ["tool/design/component_matrix.mjs", "--check"], {encoding: "utf8"});
  assert.equal(result.status, 0, result.stderr);
});

test("the command line rejects unknown flags", () => {
  const result = spawnSync(process.execPath, ["tool/design/component_matrix.mjs", "--nope"], {encoding: "utf8"});
  assert.equal(result.status, 64);
});

test("a table entry naming a missing record fails rather than dropping a row", () => {
  assert.throws(() => buildRows({
    components: [],
    reactExports: new Set(),
    dartExports: new Set(),
    table: {Gone: {records: ["catch.gone"]}},
  }), /catch\.gone/u);
});
