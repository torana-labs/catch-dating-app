"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");
const {spawnSync} = require("node:child_process");
const {test} = require("node:test");
const {makeEntryLazy} = require("./lazy-entry.cjs");

const compiled = [
  "\"use strict\";",
  "Object.defineProperty(exports, \"__esModule\", { value: true });",
  "exports.second = exports.first = void 0;",
  "const firebase_functions_1 = require(\"firebase-functions\");",
  "(0, firebase_functions_1.setGlobalOptions)({ region: \"asia-south1\" });",
  "var alpha_1 = require(\"./alpha\");",
  "Object.defineProperty(exports, \"first\", { enumerable: true, get: function () { return alpha_1.first; } });",
  "var beta_1 = require(\"./nested/beta\");",
  "Object.defineProperty(exports, \"second\", { enumerable: true, get: function () { return beta_1.second; } });",
  "//# sourceMappingURL=index.js.map",
].join("\n");

test("defers each relative re-export into its getter and keeps the bootstrap", () => {
  const result = makeEntryLazy(compiled);
  const lines = result.source.split("\n");
  assert.equal(lines.length, compiled.split("\n").length);
  assert.equal(result.modules, 2);
  assert.equal(result.exports, 2);
  assert.ok(lines.includes("const firebase_functions_1 = require(\"firebase-functions\");"));
  assert.ok(lines.includes("(0, firebase_functions_1.setGlobalOptions)({ region: \"asia-south1\" });"));
  assert.ok(!lines.some((line) => /^var \w+ = require\("\./.test(line)));
  assert.ok(lines.includes("Object.defineProperty(exports, \"second\", { enumerable: true, " +
    "get: function () { return require(\"./nested/beta\").second; } });"));
});

test("refuses entry points it cannot make fully lazy", () => {
  assert.throws(() => makeEntryLazy(makeEntryLazy(compiled).source), /already lazy/);
  assert.throws(() => makeEntryLazy(`${compiled}\nalpha_1.first.extra = true;`),
    /uses alpha_1 outside an export getter/);
  assert.throws(() => makeEntryLazy(compiled.replace(
    "Object.defineProperty(exports, \"second\", { enumerable: true, get: function () { return beta_1.second; } });",
    "")), /exports nothing/);
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
  const one = load("listOrganizerForms");
  assert.deepEqual(one.regions, [["asia-south1"]]);
  assert.ok(one.modules * 2 < all.modules,
    `one Function loaded ${one.modules} of ${all.modules} modules`);
});
