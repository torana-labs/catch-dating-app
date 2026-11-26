"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");
const {spawnSync} = require("node:child_process");
const {test} = require("node:test");
const {lazyEntrySource} = require("./lazy-entry.cjs");

const entry = [
  "import {setGlobalOptions} from \"firebase-functions\";",
  "setGlobalOptions({region: \"asia-south1\"});",
  "export {first} from \"./alpha\";",
  "// A comment between exports is not setup.",
  "export {second, third as renamed} from \"./nested/beta\";",
  "export type {Shape} from \"./nested/beta\";",
].join("\n");

test("runs the compiled setup first, then defers each export's module into its getter", () => {
  const result = lazyEntrySource(entry);
  assert.equal(result.modules, 2);
  assert.equal(result.exports, 3);
  const lines = result.source.trimEnd().split("\n");
  assert.ok(lines.includes("const firebase_functions_1 = require(\"firebase-functions\");"));
  assert.ok(lines.indexOf("(0, firebase_functions_1.setGlobalOptions)({ region: \"asia-south1\" });") <
    lines.findIndex((line) => line.startsWith("Object.defineProperty(exports, \"first\"")));
  assert.deepEqual(lines.slice(-3), [
    "Object.defineProperty(exports, \"first\", { enumerable: true, get: function () { return require(\"./alpha\").first; } });",
    "Object.defineProperty(exports, \"second\", { enumerable: true, get: function () { return require(\"./nested/beta\").second; } });",
    "Object.defineProperty(exports, \"renamed\", { enumerable: true, get: function () { return require(\"./nested/beta\").third; } });",
  ]);
  assert.ok(!lines.some((line) => /^(?:var|const) \w+ = require\("\./.test(line)), "no module loads at startup");
});

test("expands each starred area entry in place, loading the defining module directly", () => {
  const result = lazyEntrySource([
    "import {setGlobalOptions} from \"firebase-functions\";",
    "setGlobalOptions({region: \"asia-south1\"});",
    "export * from \"./alpha/functions\";",
  ].join("\n"), {readText: (file) => file === "src/alpha/functions.ts" ?
    "export {first, second as renamed} from \"./one\";\n" : undefined});
  assert.equal(result.exports, 2);
  assert.deepEqual(result.source.trimEnd().split("\n").slice(-2), [
    "Object.defineProperty(exports, \"first\", { enumerable: true, get: function () { return require(\"./alpha/one\").first; } });",
    "Object.defineProperty(exports, \"renamed\", { enumerable: true, get: function () { return require(\"./alpha/one\").second; } });",
  ]);
});

test("refuses entry points the resolver rejects instead of writing a partly lazy one", () => {
  for (const [source, rule] of [
    [`${entry}\nexport * from "./gamma";`, /export \* only as export \* from/u],
    [`${entry}\nexport * from "./gamma/functions";`, /src\/gamma\/functions\.ts is missing/u],
    [`${entry}\nexport const local = 1;`, /must not declare/u],
    [`import "./local";\n${entry}`, /setup may import packages only/u],
    [`${entry}\nexport {first} from "./delta";`, /already exports/u],
  ]) assert.throws(() => lazyEntrySource(source), rule);
});

test("the built entry loads one Function without loading every Function", () => {
  const entry = path.resolve(__dirname, "..", "lib", "index.js");
  const load = (target) => {
    const run = spawnSync(process.execPath, ["-e", `
      const entry = require(${JSON.stringify(entry)});
      const names = ${JSON.stringify(target)} ? [${JSON.stringify(target)}] : Object.keys(entry);
      const regions = names.map((name) => entry[name].__endpoint?.region);
      process.stdout.write(JSON.stringify({modules: Object.keys(require.cache).length, regions}));
    `], {encoding: "utf8", env: {...process.env, GCLOUD_PROJECT: "demo-catch"}});
    assert.equal(run.status, 0, run.stderr);
    return JSON.parse(run.stdout);
  };
  const all = load(null);
  const one = load("createOrganizerForm");
  assert.deepEqual(one.regions, [["asia-south1"]]);
  assert.ok(one.modules * 2 < all.modules,
    `one Function loaded ${one.modules} of ${all.modules} modules`);
});
