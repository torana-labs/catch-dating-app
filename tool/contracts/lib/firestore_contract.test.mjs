import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import test from "node:test";
import {fileURLToPath} from "node:url";
import {createRepositorySnapshot} from "../../lib/repository_snapshot.mjs";
import {
  firestoreCollectionPath,
  firestoreContractFromFiles,
  firestoreContractHeaderPath,
  firestoreContractLayoutProblems,
  loadFirestoreContract,
  loadFirestoreContractFromSnapshot,
  splitFirestoreContract,
  writeFirestoreContract,
} from "./firestore_contract.mjs";

const loader = fileURLToPath(new URL("./firestore_contract.mjs", import.meta.url));
const repository = path.resolve(path.dirname(loader), "../../..");

const contract = {
  schemaVersion: 2,
  description: "Fixture contract.",
  collectionsWithoutRulesTests: {issue: "https://example.test/issues/1",
    collections: [{id: "items", reason: "Server only."}]},
  collections: [
    {id: "items", path: "items/{id}", writerContext: "platform"},
    {id: "events", path: "events/{eventId}", writerContext: "events"},
    {id: "Ab_9", path: "Ab_9/{id}"},
  ],
};

function fixture(t, value = contract) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-firestore-contract-lib-"));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  writeFirestoreContract(root, value);
  return root;
}

function fromMap(files) {
  return firestoreContractFromFiles(files.keys(), (file) => files.get(file));
}

test("splits into a header plus one file per collection, and loads back sorted by id", (t) => {
  const files = splitFirestoreContract(contract);
  assert.deepEqual([...files.keys()], [
    "tool/contracts/firestore_contract/contract.json",
    "tool/contracts/firestore_contract/collections/items.json",
    "tool/contracts/firestore_contract/collections/events.json",
    "tool/contracts/firestore_contract/collections/Ab_9.json",
  ]);
  assert.equal(files.get(firestoreCollectionPath("events")),
    `${JSON.stringify(contract.collections[1], null, 2)}\n`);
  assert.equal(JSON.parse(files.get(firestoreContractHeaderPath)).collections, undefined);

  const loaded = loadFirestoreContract({root: fixture(t)});
  assert.deepEqual(Object.keys(loaded),
    ["schemaVersion", "description", "collectionsWithoutRulesTests", "collections"]);
  assert.deepEqual(loaded.collections.map(({id}) => id), ["Ab_9", "events", "items"]);
  assert.deepEqual({...loaded, collections: undefined}, {...contract, collections: undefined});
});

test("the snapshot loader reads the same contract as the checkout loader", (t) => {
  const root = fixture(t);
  const git = (...args) => spawnSync("git", args, {cwd: root, encoding: "utf8"});
  assert.equal(git("init", "-q").status, 0);
  assert.equal(git("add", "-A").status, 0);
  const snapshot = createRepositorySnapshot({root});
  assert.deepEqual(loadFirestoreContractFromSnapshot(snapshot), loadFirestoreContract({root}));
});

test("fails closed on every malformed layout, naming each file", () => {
  const good = splitFirestoreContract(contract);
  const cases = [
    ["missing header", (files) => files.delete(firestoreContractHeaderPath),
      /contract\.json: missing/u],
    ["no collections", (files) => {
      for (const file of [...files.keys()]) if (file !== firestoreContractHeaderPath) files.delete(file);
    }, /collections: no collection files/u],
    ["stray file", (files) => files.set("tool/contracts/firestore_contract/notes.md", "x"),
      /firestore_contract\/notes\.md: not a contract file/u],
    ["nested file", (files) => files.set(
      "tool/contracts/firestore_contract/collections/old/items.json", "{}"),
    /collections\/old\/items\.json: not a contract file/u],
    ["bad name", (files) => files.set(
      "tool/contracts/firestore_contract/collections/my-items.json", "{}"),
    /my-items\.json: not a contract file/u],
    ["invalid JSON", (files) => files.set(firestoreCollectionPath("items"), "{"),
      /collections\/items\.json: invalid JSON/u],
    ["not an object", (files) => files.set(firestoreCollectionPath("items"), "[]"),
      /collections\/items\.json: must hold a JSON object/u],
    ["id differs from file name", (files) => files.set(firestoreCollectionPath("items"),
      JSON.stringify({id: "events"})), /collections\/items\.json: id must be "items"/u],
    ["collections in header", (files) => files.set(firestoreContractHeaderPath,
      JSON.stringify({schemaVersion: 2, collections: []})),
    /contract\.json: collections live in .*collections\/<id>\.json/u],
  ];
  for (const [name, edit, pattern] of cases) {
    const files = new Map(good);
    edit(files);
    assert.throws(() => fromMap(files), pattern, name);
  }
  assert.deepEqual(firestoreContractLayoutProblems(good.keys()), []);
  // Paths outside the contract directory are ignored.
  const withOthers = new Map([...good, ["tool/contracts/other.json", "{"]]);
  assert.equal(fromMap(withOthers).collections.length, 3);
});

test("this repository's contract loads, and running the loader prints the combined view", () => {
  const result = spawnSync(process.execPath, [loader], {cwd: os.tmpdir(), encoding: "utf8"});
  assert.equal(result.status, 0, result.stderr);
  const printed = JSON.parse(result.stdout);
  assert.deepEqual(printed, loadFirestoreContract({root: repository}));
  assert.equal(printed.schemaVersion, 2);
  const ids = printed.collections.map(({id}) => id);
  assert.deepEqual(ids, [...ids].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)));
  assert.equal(fs.existsSync(path.join(repository, "tool/contracts/firestore_contract.json")), false,
    "the combined contract is printed on demand, never committed");
});
