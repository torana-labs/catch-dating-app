import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {spawnSync} from "node:child_process";
import test from "node:test";
import {
  loadFirestoreContract,
  writeFirestoreContract,
} from "./lib/firestore_contract.mjs";

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
    write(collection.rulesTestFile, "it('denies items', () => doc(db, \"items\", \"one\"));");
  }
  if (coverage === "unknown") gap.collections.push({id: "items", reason: "x"}, {id: "gone", reason: "x"});
  writeFirestoreContract(root, {
    schemaVersion: 2, collectionsWithoutRulesTests: gap,
    collectionsPredatingNewCollectionRule: {collections: ["items"]}, collections: [collection],
  });
  write("firestore.rules", "match /items/{id} {}");
  write("functions/src/shared/generated/firestoreAdminTypes.ts", "");
  // Neither the entrypoint nor its references may execute during discovery.
  write("functions/src/index.ts", `throw new Error('ENTRYPOINT_EXECUTED');\n${source}`);
  write("functions/src/handler.ts", "throw new Error('HANDLER_EXECUTED');");
  write("contracts/firestore/items.schema.json", {
    "x-firestore-collection": "items", "x-firestore-path": "items/{id}",
  });
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
  "grouped reexports": "export {publicName, another} from './handler';",
  "multi-line reexports": "export {\n  another,\n  publicName,\n} from './handler';",
})) {
  test(`${kind} satisfies the authored export contract without evaluation`, t => {
    accepted(check(fixture(t, source)));
  });
}

for (const [kind, source] of Object.entries({
  "wildcard": "export * from './handler';",
  "default": "export default function publicName() {}",
  "malformed": "export {publicName from './handler';",
  "duplicate": "export {publicName} from './handler'; export {publicName} from './other';",
  // The entry point only re-exports Functions from their modules
  // (functions/scripts/functionExports.cjs).
  "direct const": "export const publicName = () => {};",
  "direct function": "export function publicName() {}",
  "direct async function": "export async function publicName() {}",
  "local export": "const publicName = () => {}; export {publicName};",
  "local named alias": "const localName = () => {}; export {localName as publicName};",
})) {
  test(`${kind} export syntax fails closed`, t => {
    const result = check(fixture(t, source));
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Function binding intent is unresolved/);
  });
}

const documents = (body) =>
  `service cloud.firestore { match /databases/{d}/documents {\n${body}\n} }`;

function editRegistry(root, edit) {
  const registry = loadFirestoreContract({root});
  edit(registry);
  fs.rmSync(path.join(root, "tool/contracts/firestore_contract"), {recursive: true});
  writeFirestoreContract(root, registry);
}

function registerOrphans(root, rulesMatch = "/orphans/{privateDocument=**}") {
  editRegistry(root, (registry) => {
    registry.collections.push({id: "orphans", path: "orphans/{id}", rulesMatch,
      owner: "server", read: "server", write: "server"});
    registry.collectionsWithoutRulesTests.collections.push({id: "orphans", reason: "Server only."});
    registry.collectionsPredatingNewCollectionRule.collections.push("orphans");
  });
}

test("a schema needs a top-level rules match for its root collection", t => {
  const root = fixture(t, "export {publicName} from './handler';");
  fs.writeFileSync(path.join(root, "contracts/firestore/orphan.schema.json"), JSON.stringify({
    "x-firestore-collection": "orphans", "x-firestore-path": "orphans/{id}",
  }));
  registerOrphans(root);
  const rulesFile = path.join(root, "firestore.rules");
  for (const rules of ["match /items/{id} {}", "match /items/{id} { match /orphans/{o} {} }"]) {
    fs.writeFileSync(rulesFile, documents(rules));
    const result = check(root);
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /no top-level match \/orphans\//);
  }
  fs.writeFileSync(rulesFile, documents(
    "  // match /orphans/{id} in a comment does not count\n" +
    "  match /items/{id} {}\n  match /orphans/{privateDocument=**} { allow read, write: if false; }"));
  accepted(check(root));
});

test("every rules match block needs a registry entry", t => {
  const root = fixture(t, "export {publicName} from './handler';");
  fs.writeFileSync(path.join(root, "firestore.rules"), documents(
    "  match /items/{id} {}\n" +
    "  match /users/{uid} {\n    match /pushInstallations/{installationId} { allow read: if true; }\n  }"));
  const result = check(root);
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /firestore\.rules:3: match \/users\/\{uid\} has no entry/u);
  assert.match(result.stderr,
    /firestore\.rules:4: match \/users\/\{uid\}\/pushInstallations\/\{installationId\} has no entry/u);
});

test("a registry rulesMatch must be a whole match path that governs the entry path", t => {
  const root = fixture(t, "export {publicName} from './handler';");
  fs.writeFileSync(path.join(root, "firestore.rules"), documents(
    "  match /items/{id} {\n    match /orphans/{o} {}\n  }"));
  fs.writeFileSync(path.join(root, "contracts/firestore/orphan.schema.json"), JSON.stringify({
    "x-firestore-collection": "orphans", "x-firestore-path": "orphans/{id}",
  }));
  registerOrphans(root, "/orphans/{o}");
  let result = check(root);
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /orphans: Firestore rules are missing match \/orphans\/\{o\}/u);

  registerOrphans(root, "/items/{id}/orphans/{o}");
  editRegistry(root, (registry) => {
    registry.collections = registry.collections.filter((c) =>
      c.id !== "orphans" || c.rulesMatch === "/items/{id}/orphans/{o}");
    registry.collectionsWithoutRulesTests.collections = [
      {id: "items", reason: "Server only."}, {id: "orphans", reason: "Server only."}];
  });
  result = check(root);
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /rulesMatch \/items\/\{id\}\/orphans\/\{o\} does not govern path orphans\/\{id\}/u);
});

test("a split contract fails closed on a duplicate collection, an orphan or an unparseable fragment", t => {
  const root = fixture(t, "export {publicName} from './handler';");
  const collections = path.join(root, "tool/contracts/firestore_contract/collections");
  const items = fs.readFileSync(path.join(collections, "items.json"), "utf8");
  accepted(check(root));

  // The same collection registered again under another file and id.
  editRegistry(root, (registry) => {
    registry.collections.push({...registry.collections[0], id: "itemsAgain"});
    registry.collectionsWithoutRulesTests.collections.push({id: "itemsAgain", reason: "Server only."});
  });
  let result = check(root);
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /duplicate collection path items\/\{id\}/u);
  fs.rmSync(path.join(collections, "itemsAgain.json"));
  editRegistry(root, (registry) => {
    registry.collectionsWithoutRulesTests.collections =
      registry.collectionsWithoutRulesTests.collections.filter(({id}) => id !== "itemsAgain");
  });
  accepted(check(root));

  // A collection file left outside collections/.
  const orphan = path.join(root, "tool/contracts/firestore_contract/items.json");
  fs.writeFileSync(orphan, items);
  result = check(root);
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /tool\/contracts\/firestore_contract\/items\.json: not a contract file/u);
  fs.rmSync(orphan);

  // A fragment that isn't JSON.
  fs.writeFileSync(path.join(collections, "items.json"), items.slice(0, -3));
  result = check(root);
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /collections\/items\.json: invalid JSON/u);
  fs.writeFileSync(path.join(collections, "items.json"), items);
  accepted(check(root));
});

test("every registry entry has a schema contract, at its path or named explicitly", t => {
  const root = fixture(t, "export {publicName} from './handler';");
  fs.rmSync(path.join(root, "contracts/firestore/items.schema.json"));
  let result = check(root);
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /items: no contracts\/firestore schema has x-firestore-path items\/\{id\}/u);

  fs.mkdirSync(path.join(root, "contracts/operations"), {recursive: true});
  fs.writeFileSync(path.join(root, "contracts/operations/item.schema.json"), "{}");
  editRegistry(root, (registry) => {
    registry.collections[0].schemaContract = "contracts/operations/item.schema.json";
  });
  accepted(check(root));

  editRegistry(root, (registry) => {
    registry.collections[0].schemaContract = "contracts/operations/missing.schema.json";
  });
  result = check(root);
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /schemaContract points at missing file/u);

  fs.writeFileSync(path.join(root, "contracts/firestore/items.schema.json"), JSON.stringify({
    "x-firestore-collection": "items", "x-firestore-path": "items/{id}",
  }));
  result = check(root);
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /already describes items\/\{id\}; remove schemaContract/u);
});

test("every contracts/firestore schema describes a registered path", t => {
  const root = fixture(t, "export {publicName} from './handler';");
  fs.writeFileSync(path.join(root, "firestore.rules"), documents(
    "  match /items/{id} {}\n  match /orphans/{privateDocument=**} { allow read, write: if false; }"));
  fs.writeFileSync(path.join(root, "contracts/firestore/orphan.schema.json"), JSON.stringify({
    "x-firestore-collection": "orphans", "x-firestore-path": "orphans/{id}/notes/{noteId}",
  }));
  registerOrphans(root);
  const result = check(root);
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr,
    /contracts\/firestore\/orphan\.schema\.json: orphans\/\{id\}\/notes\/\{noteId\} has no entry/u);
});

test("a rules test file must name the collection it covers", t => {
  const root = fixture(t, "export {publicName} from './handler';", "publicName", "dart", "tested");
  accepted(check(root));
  fs.writeFileSync(path.join(root, "functions/test/rules/items.rules.test.cjs"),
    "it('denies itemsArchive', () => {});");
  const result = check(root);
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /rulesTestFile functions\/test\/rules\/items\.rules\.test\.cjs never names "items"/u);
});

test("a schema without x-firestore-path is rejected", t => {
  const root = fixture(t, "export {publicName} from './handler';");
  fs.writeFileSync(path.join(root, "contracts/firestore/orphan.schema.json"),
    JSON.stringify({"x-firestore-collection": "orphans"}));
  const result = check(root);
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /orphans needs x-firestore-path/);
});

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
  const source = "export {publicName} from './handler';";
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

// STR-11: a new collection records why an existing one cannot hold its data
// and names its readers; the grandfather list only shrinks.
function addNewCollection(root, rationale) {
  editRegistry(root, (registry) => {
    registry.collections.push({id: "notes", path: "notes/{id}", rulesMatch: "/notes/{id}",
      owner: "server", read: "server", write: "server",
      ...(rationale === undefined ? {} : {newCollectionRationale: rationale})});
    registry.collectionsWithoutRulesTests.collections.push({id: "notes", reason: "Server only."});
  });
  fs.writeFileSync(path.join(root, "firestore.rules"),
    "match /items/{id} {}\nmatch /notes/{id} {}");
  fs.writeFileSync(path.join(root, "contracts/firestore/notes.schema.json"), JSON.stringify({
    "x-firestore-collection": "notes", "x-firestore-path": "notes/{id}",
  }));
}

const why = "Notes are per-guest and outlive the event, so neither a field on the event " +
  "nor a document type in an existing collection fits.";

test("a new collection needs a reason an existing one cannot hold it and a named reader", t => {
  const source = "export {publicName} from './handler';";
  for (const [rationale, message] of [
    [undefined, /notes: a new collection needs newCollectionRationale/u],
    [{whyNotAnExistingCollection: "Too short.", readers: ["publicName"]},
      /notes\.newCollectionRationale\.whyNotAnExistingCollection must say/u],
    [{whyNotAnExistingCollection: why}, /notes\.newCollectionRationale\.readers must name at least one reader/u],
    [{whyNotAnExistingCollection: why, readers: []}, /readers must name at least one reader/u],
    [{whyNotAnExistingCollection: why, readers: ["someone"]},
      /"someone" is neither an exported Function nor a repository file/u],
    [{whyNotAnExistingCollection: why, readers: ["lib/missing.dart"]},
      /"lib\/missing\.dart" is neither an exported Function nor a repository file/u],
    [{whyNotAnExistingCollection: why, readers: ["publicName"], owner: "x"},
      /notes\.newCollectionRationale: unknown field owner/u],
  ]) {
    const root = fixture(t, source);
    addNewCollection(root, rationale);
    const result = check(root);
    assert.equal(result.status, 1, JSON.stringify(rationale));
    assert.match(result.stderr, message);
  }
  for (const readers of [["publicName"], ["lib/caller.dart"], ["publicName", "lib/caller.dart"]]) {
    const root = fixture(t, source);
    addNewCollection(root, {whyNotAnExistingCollection: why, readers});
    accepted(check(root));
  }
});

test("the grandfather list names only real collections without a rationale", t => {
  const source = "export {publicName} from './handler';";
  let root = fixture(t, source);
  addNewCollection(root, {whyNotAnExistingCollection: why, readers: ["publicName"]});
  editRegistry(root, (registry) => {
    registry.collectionsPredatingNewCollectionRule.collections.push("notes", "gone");
  });
  const result = check(root);
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /notes: has a newCollectionRationale, so remove it from collectionsPredatingNewCollectionRule/u);
  assert.match(result.stderr, /collectionsPredatingNewCollectionRule: gone is not a collection in this contract/u);

  root = fixture(t, source);
  editRegistry(root, (registry) => {
    delete registry.collectionsPredatingNewCollectionRule;
  });
  assert.match(check(root).stderr, /collectionsPredatingNewCollectionRule\.collections must be an array/u);
});

test("the grandfather list only shrinks against origin/main", t => {
  const root = fixture(t, "export {publicName} from './handler';");
  const git = (...args) => spawnSync("git", args, {cwd: root, encoding: "utf8"});
  assert.equal(git("init", "-q").status, 0);
  assert.equal(git("add", "-A").status, 0);
  assert.equal(git("-c", "user.name=Test", "-c", "user.email=test@example.test",
    "commit", "-qm", "base").status, 0);
  assert.equal(git("update-ref", "refs/remotes/origin/main", "HEAD").status, 0);
  accepted(check(root));

  // Listing a new collection instead of giving it a rationale fails.
  addNewCollection(root, undefined);
  editRegistry(root, (registry) => {
    registry.collectionsPredatingNewCollectionRule.collections.push("notes");
  });
  const result = check(root);
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /notes is not on origin\/main's list, and the list only shrinks/u);
});
