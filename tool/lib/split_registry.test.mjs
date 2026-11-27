import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {readSplitRegistry, splitInlineEntries, splitRegistryFiles, SplitRegistryError} from "./split_registry.mjs";

const spec = {
  index: "registry.json",
  collections: [
    {field: "routes", dir: "registry/routes", kind: "map"},
    {field: "screens", dir: "registry/screens", kind: "array", key: entry => entry.id, stem: entry => entry.id},
    {field: "contracts", dir: "registry/contracts", kind: "array", key: entry => entry.path},
  ],
};

function fixture(t, files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-split-registry-"));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  for (const [file, value] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, file)), {recursive: true});
    fs.writeFileSync(path.join(root, file), typeof value === "string" ? value : JSON.stringify(value));
  }
  return root;
}

const monolith = {
  version: 1,
  routes: {b: {reason: "two"}, a: {reason: "one"}},
  screens: [{id: "screen.b"}, {id: "screen.a"}],
  contracts: [{path: "lib/x/one_screen.dart"}],
};

test("splitting and reading back gives the single file's content, in file-name order", t => {
  const root = fixture(t, {"registry.json": monolith});
  const written = splitInlineEntries(root, spec, {stemOf: {contracts: entry => path.basename(entry.path, ".dart")}});
  assert.equal(written.length, 5);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, "registry.json"), "utf8")), {version: 1});
  assert.deepEqual(readSplitRegistry(root, spec), {
    version: 1,
    routes: {a: {reason: "one"}, b: {reason: "two"}},
    screens: [{id: "screen.a"}, {id: "screen.b"}],
    contracts: [{path: "lib/x/one_screen.dart"}],
  });
  assert.deepEqual(splitRegistryFiles(root, spec), ["registry.json", "registry/routes/a.json", "registry/routes/b.json",
    "registry/screens/screen.a.json", "registry/screens/screen.b.json", "registry/contracts/one_screen.json"]);
  // Splitting again finds nothing inline.
  assert.deepEqual(splitInlineEntries(root, spec), []);
});

test("the registry stays as strict as the single file was", t => {
  const base = {"registry.json": {version: 1}, "registry/screens/screen.a.json": {id: "screen.a"}};
  const refuses = (files, pattern) => assert.throws(() => readSplitRegistry(fixture(t, {...base, ...files}), spec),
    error => error instanceof SplitRegistryError && pattern.test(error.message));
  refuses({"registry.json": {version: 1, screens: []}}, /lives in registry\/screens/u);
  refuses({"registry/screens/other.json": {id: "screen.b"}}, /name the file screen\.b\.json/u);
  refuses({"registry/contracts/a.json": {path: "lib/a.dart"}, "registry/contracts/b.json": {path: "lib/a.dart"}},
    /already declared/u);
  refuses({"registry/contracts/a.json": {}}, /no contracts key/u);
  refuses({"registry/screens/notes.txt": "x"}, /only \.json entry files/u);
  refuses({"registry/routes/a.json": "{not json"}, /registry\/routes\/a\.json/u);
});

test("a merge that brings an entry back inline splits cleanly unless it differs from the file", t => {
  const root = fixture(t, {
    "registry.json": {version: 1, screens: [{id: "screen.a"}, {id: "screen.new"}]},
    "registry/screens/screen.a.json": `${JSON.stringify({id: "screen.a"}, null, 2)}\n`,
  });
  assert.deepEqual(splitInlineEntries(root, spec), ["registry/screens/screen.new.json"]);
  fs.writeFileSync(path.join(root, "registry.json"), JSON.stringify({version: 1, screens: [{id: "screen.a", changed: true}]}));
  assert.throws(() => splitInlineEntries(root, spec), /screen\.a\.json/u);
  // A refused split writes nothing and leaves the index for a hand merge.
  assert.match(fs.readFileSync(path.join(root, "registry.json"), "utf8"), /changed/u);
});
