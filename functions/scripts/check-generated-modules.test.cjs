"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {spawnSync} = require("node:child_process");
const {test} = require("node:test");
const {MANIFEST, REMEDY, missingGeneratedModules} =
  require("./check-generated-modules.cjs");

function functionsFixture(t, files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "catch-generated-"));
  t.after(() => fs.rmSync(dir, {recursive: true, force: true}));
  for (const [file, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, file)), {recursive: true});
    fs.writeFileSync(path.join(dir, file), content);
  }
  return dir;
}

const manifest = JSON.stringify({modules: [
  "src/shared/generated/schemaPaths.ts",
  "src/shared/generated/validators/eventDocument.ts",
]});

test("a clone that never generated reports the missing manifest", (t) => {
  const dir = functionsFixture(t, {"src/shared/generated/brand.ts": ""});
  assert.deepEqual(missingGeneratedModules(dir), [MANIFEST]);
});

test("lists each manifest module that is absent", (t) => {
  const dir = functionsFixture(t, {[MANIFEST]: manifest,
    "src/shared/generated/schemaPaths.ts": ""});
  assert.deepEqual(missingGeneratedModules(dir),
    ["src/shared/generated/validators/eventDocument.ts"]);
});

test("passes when every generated module is present", (t) => {
  const dir = functionsFixture(t, {[MANIFEST]: manifest,
    "src/shared/generated/schemaPaths.ts": "",
    "src/shared/generated/validators/eventDocument.ts": ""});
  assert.deepEqual(missingGeneratedModules(dir), []);
});

test("this checkout's generated modules are present and the CLI exits 0", () => {
  const result = spawnSync(process.execPath,
    [path.join(__dirname, "check-generated-modules.cjs")], {encoding: "utf8"});
  assert.equal(result.status, 0, result.stderr);
  assert.ok(!result.stderr.includes(REMEDY));
});
