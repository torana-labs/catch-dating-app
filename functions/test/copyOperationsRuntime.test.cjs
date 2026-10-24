"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const {replaceIfChanged} = require("../scripts/copy-operations-runtime.cjs");

// Functions test files run in parallel and each refreshes the copied runtime
// while the others import it, so a module must never be seen half written.
test("a runtime file is replaced whole and an unchanged one is left alone", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-operations-runtime-"));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const source = path.join(root, "source", "engine.mjs");
  const target = path.join(root, "lib", "operations", "engine.mjs");
  fs.mkdirSync(path.dirname(source), {recursive: true});
  fs.writeFileSync(source, "export const version = 1;\n");

  assert.equal(replaceIfChanged(source, target), true, "a missing copy is created");
  assert.equal(fs.readFileSync(target, "utf8"), "export const version = 1;\n");
  const first = fs.statSync(target).ino;
  assert.equal(replaceIfChanged(source, target), false, "an identical copy is not rewritten");
  assert.equal(fs.statSync(target).ino, first);

  // A reader that opened the old copy still reads all of it after the
  // replacement; truncating and rewriting in place would hand it the new
  // bytes or none.
  const reader = fs.openSync(target, "r");
  t.after(() => fs.closeSync(reader));
  fs.writeFileSync(source, "export const version = 2;\n");
  assert.equal(replaceIfChanged(source, target), true);
  const buffer = Buffer.alloc(64);
  assert.equal(buffer.toString("utf8", 0, fs.readSync(reader, buffer, 0, buffer.length, 0)),
    "export const version = 1;\n");
  assert.equal(fs.readFileSync(target, "utf8"), "export const version = 2;\n");
  assert.notEqual(fs.statSync(target).ino, first);
  assert.deepEqual(fs.readdirSync(path.dirname(target)), ["engine.mjs"], "no temporary file is left behind");
});
