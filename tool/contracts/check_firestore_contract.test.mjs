import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {spawnSync} from "node:child_process";
import test from "node:test";

const checker = fileURLToPath(new URL("./check_firestore_contract.mjs", import.meta.url));
const repository = path.resolve(path.dirname(checker), "../..");

function snapshot(root) {
  return Object.fromEntries(fs.readdirSync(root, {recursive: true}).sort()
    .filter(file => fs.statSync(path.join(root, file)).isFile())
    .map(file => [file, fs.readFileSync(path.join(root, file), "utf8")]));
}

function fixture(t, source, name = "publicName", consumer = "dart", coverage = "listed") {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-firestore-contract-"));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const write = (file, value) => {
    const target = path.join(root, file);
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, typeof value === "string" ? value : JSON.stringify(value));
  };
  const collection = {id: "items", path: "items/{id}", rulesMatch: "/items/{id}",
    owner: "server", read: "server", write: "server"};
  if (consumer === "exportedFunctions") collection.exportedFunctions = [name];
  if (consumer === "operation") collection.operations = [
    {id: "read", type: "callable", owner: "server", function: name},
  ];
  const gap = {issue: "https://example.test/issues/1", collections: []};
  if (coverage === "listed" || coverage === "both") gap.collections.push({id: "items", reason: "Server only."});
  if (coverage === "tested" || coverage === "both") {
    collection.rulesTestFile = "functions/test/rules/items.rules.test.cjs";
    write(collection.rulesTestFile, "");
  }
  if (coverage === "unknown") gap.collections.push({id: "items", reason: "x"}, {id: "gone", reason: "x"});
  write("tool/contracts/firestore_contract.json", {
    schemaVersion: 2, collectionsWithoutRulesTests: gap, collections: [collection],
  });
  write("firestore.rules", "match /items/{id} {}");
  write("functions/src/shared/generated/firestoreAdminTypes.ts", "");
  // Neither the entrypoint nor its references may execute during discovery.
  write("functions/src/index.ts", `throw new Error('ENTRYPOINT_EXECUTED');\n${source}`);
  write("functions/src/handler.ts", "throw new Error('HANDLER_EXECUTED');");
  fs.mkdirSync(path.join(root, "contracts/firestore"), {recursive: true});
  if (consumer === "dart") {
    write("lib/caller.dart", `void call() { functions.httpsCallable('${name}'); }`);
    write("contracts/callables/call.schema.json", {
      title: `${name[0].toUpperCase()}${name.slice(1)}CallablePayload`,
    });
  }
  if (consumer === "alias") write("contracts/callables/call.schema.json", {
    title: "UnrelatedCallablePayload", "x-callable-aliases": [name],
  });
  return root;
}

function check(root) {
  const before = snapshot(root);
  const result = spawnSync(process.execPath, [checker, "--root", root], {
    cwd: os.tmpdir(), encoding: "utf8", timeout: 15_000,
  });
  assert.equal(result.error, undefined);
  assert.equal(result.signal, null);
  assert.deepEqual(snapshot(root), before, "the checker must not mutate fixture inputs");
  assert.doesNotMatch(result.stderr, /ENTRYPOINT_EXECUTED|HANDLER_EXECUTED/);
  return result;
}

function accepted(result) {
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Firestore contract check passed/);
}

function missing(result, name) {
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /functions\/src\/index\.ts does not export/);
  assert.match(result.stderr, new RegExp(name));
}

for (const consumer of ["dart", "alias", "exportedFunctions", "operation"]) {
  test(`${consumer} accepts the public alias and rejects the local export name`, t => {
    const source = "export {localName /* implementation */ as publicName} from './handler';";
    accepted(check(fixture(t, source, "publicName", consumer)));
    missing(check(fixture(t, source, "localName", consumer)), "localName");
  });
}

test("local named exports also expose only their public alias", t => {
  const source = "const localName = () => {}; export {localName as publicName};";
  accepted(check(fixture(t, source)));
  missing(check(fixture(t, source, "localName")), "localName");
});

for (const [kind, source] of Object.entries({
  "line comment": "// export {publicName} from './handler';",
  "block comment": "/* export {publicName} from './handler'; */",
  "string": 'const sample = "export {publicName} from module";',
  "type reexport": "export type {publicName} from './handler';",
  "inline type reexport": "export {type publicName} from './handler';",
  "type declaration": "export type publicName = string;",
  "removed export": "export {another} from './handler';",
})) {
  test(`${kind} cannot satisfy a callable export`, t => {
    missing(check(fixture(t, source)), "publicName");
  });
}

for (const [kind, source] of Object.entries({
  "direct const": "export const publicName = () => {};",
  "direct function": "export function publicName() {}",
  "direct async function": "export async function publicName() {}",
  "grouped reexports": "export {publicName, another} from './handler';",
  "local export": "const publicName = () => {}; export {publicName};",
})) {
  test(`${kind} satisfies the authored export contract without evaluation`, t => {
    accepted(check(fixture(t, source)));
  });
}

for (const [kind, source] of Object.entries({
  "wildcard": "export * from './handler';",
  "default": "export default function publicName() {}",
  "malformed": "export {publicName from './handler';",
  "duplicate": "export {publicName}; export {publicName};",
})) {
  test(`${kind} export syntax fails closed`, t => {
    const result = check(fixture(t, source));
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Function binding intent is unresolved/);
  });
}

test("default CLI checks its own repository from another working directory", () => {
  const result = spawnSync(process.execPath, [checker], {
    cwd: os.tmpdir(), encoding: "utf8", timeout: 30_000,
  });
  assert.equal(result.error, undefined);
  accepted(result);
});

test("CLI rejects malformed options rather than silently checking another scope", () => {
  for (const args of [["--root"], ["--root", ""], ["--root", "--unknown"],
    ["--unknown", repository], ["--root", repository, "--root", repository]]) {
    const result = spawnSync(process.execPath, [checker, ...args], {encoding: "utf8"});
    assert.equal(result.status, 64, JSON.stringify(args));
    assert.match(result.stderr, /Usage:/);
  }
});

test("every collection names its rules test or is listed as untested, never both", t => {
  const source = "export const publicName = () => {};";
  accepted(check(fixture(t, source, "publicName", "dart", "listed")));
  accepted(check(fixture(t, source, "publicName", "dart", "tested")));
  for (const [coverage, message] of [
    ["none", /items: needs a rulesTestFile, or an entry with a reason in collectionsWithoutRulesTests/u],
    ["both", /items: has a rulesTestFile, so remove it from collectionsWithoutRulesTests/u],
    ["unknown", /collectionsWithoutRulesTests: gone is not a collection/u],
  ]) {
    const result = check(fixture(t, source, "publicName", "dart", coverage));
    assert.equal(result.status, 1, coverage);
    assert.match(result.stderr, message);
  }
});
