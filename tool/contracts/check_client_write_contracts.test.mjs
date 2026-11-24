import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import test from "node:test";
import {checkClientWriteContracts} from "./check_client_write_contracts.mjs";
import {writeFirestoreContract} from "./lib/firestore_contract.mjs";

const checker = fileURLToPath(new URL("./check_client_write_contracts.mjs", import.meta.url));

const RULES = `service cloud.firestore {
  match /databases/{database}/documents {
    match /items/{itemId} {
      allow read: if true;
      allow create, update: if request.auth != null;
      allow delete: if false;
    }
    match /owners/{uid} {
      allow read, write: if false;
      match /tokens/{tokenId} {
        allow delete: if request.auth.uid == uid;
      }
    }
  }
}`;

function fixture(t, {rules = RULES, contracts} = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-client-writes-"));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const write = (file, value) => {
    const target = path.join(root, file);
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, typeof value === "string" ? value : JSON.stringify(value));
  };
  write("firestore.rules", rules);
  writeFirestoreContract(root, {collections: [
    {id: "items", path: "items/{itemId}"},
    {id: "tokens", path: "owners/{uid}/tokens/{tokenId}"},
  ]});
  write("contracts/firestore/items.schema.json", {
    "x-firestore-path": "items/{itemId}",
    properties: {name: {type: "string"}, updatedAt: {type: "string"}},
  });
  write("contracts/firestore/tokens.schema.json", {
    "x-firestore-path": "owners/{uid}/tokens/{tokenId}", properties: {},
  });
  const defaults = {
    "upsert_item.schema.json": contract("items/{itemId}", ["create", "update"], {
      properties: {name: {$ref: "../firestore/items.schema.json#/properties/name"}},
    }),
    "delete_token.schema.json": contract("owners/{uid}/tokens/{tokenId}", "delete"),
  };
  for (const [name, value] of Object.entries(contracts ?? defaults)) {
    if (value !== null) write(`contracts/client_writes/${name}`, value);
  }
  return root;
}

function contract(firestorePath, operation, data) {
  return {
    "x-firestore-path": firestorePath,
    "x-firestore-operation": operation,
    "x-owner": "owner direct write",
    properties: {path: {type: "object"}, ...(data ? {data} : {})},
  };
}

test("accepts a contract for every client write the rules allow", t => {
  assert.deepEqual(checkClientWriteContracts(fixture(t)), []);
});

test("an allowed client write with no contract fails, nested matches included", t => {
  const errors = checkClientWriteContracts(fixture(t, {contracts: {}}));
  assert.deepEqual(errors, [
    "firestore.rules:3: match /items/{itemId} lets clients create, but no contracts/client_writes schema declares x-firestore-operation \"create\" for a path it governs",
    "firestore.rules:3: match /items/{itemId} lets clients update, but no contracts/client_writes schema declares x-firestore-operation \"update\" for a path it governs",
    "firestore.rules:10: match /owners/{uid}/tokens/{tokenId} lets clients delete, but no contracts/client_writes schema declares x-firestore-operation \"delete\" for a path it governs",
  ]);
});

test("a contract for a write the rules deny is stale", t => {
  const root = fixture(t, {contracts: {
    "upsert_item.schema.json": contract("items/{itemId}", ["create", "update"], {properties: {}}),
    "delete_token.schema.json": contract("owners/{uid}/tokens/{tokenId}", "delete"),
    "delete_item.schema.json": contract("items/{itemId}", "delete"),
  }});
  assert.deepEqual(checkClientWriteContracts(root), [
    "contracts/client_writes/delete_item.schema.json: firestore.rules no longer lets clients delete items/{itemId}; delete the contract or the operation",
  ]);
});

test("contract metadata, registry path and data shape are checked", t => {
  const root = fixture(t, {contracts: {
    "upsert_item.schema.json": contract("items/{itemId}", ["create", "update"], {
      properties: {
        name: {$ref: "../firestore/items.schema.json#/properties/updatedAt"},
        colour: {type: "string"},
      },
    }),
    "delete_token.schema.json": contract("owners/{uid}/tokens/{tokenId}", "delete", {properties: {}}),
    "bad_operation.schema.json": contract("items/{itemId}", "upsert"),
    "unregistered.schema.json": contract("owners/{uid}/tokens/{tokenId}/extra/{x}", "delete"),
  }});
  const errors = checkClientWriteContracts(root);
  assert.ok(errors.includes(
    "contracts/client_writes/bad_operation.schema.json: x-firestore-operation must be create, update or delete, or a list of distinct ones"));
  assert.ok(errors.includes(
    "contracts/client_writes/upsert_item.schema.json: data.name refers to /properties/updatedAt of items.schema.json"));
  assert.ok(errors.includes(
    "contracts/client_writes/upsert_item.schema.json: data.colour is not a field of items.schema.json"));
  assert.ok(errors.includes("contracts/client_writes/delete_token.schema.json: a delete carries no data"));
  assert.ok(errors.includes(
    "contracts/client_writes/unregistered.schema.json: owners/{uid}/tokens/{tokenId}/extra/{x} is not a collection path in tool/contracts/firestore_contract"));
});

test("a whole-document data ref must name the schema for the same path", t => {
  const root = fixture(t, {contracts: {
    "upsert_item.schema.json": contract("items/{itemId}", ["create", "update"],
      {$ref: "../firestore/tokens.schema.json"}),
    "delete_token.schema.json": contract("owners/{uid}/tokens/{tokenId}", "delete"),
  }});
  assert.deepEqual(checkClientWriteContracts(root), [
    "contracts/client_writes/upsert_item.schema.json: data refers to tokens.schema.json, not items.schema.json, the schema for items/{itemId}",
  ]);
});

test("the CLI checks this repository and rejects malformed options", () => {
  const passed = spawnSync(process.execPath, [checker], {cwd: os.tmpdir(), encoding: "utf8"});
  assert.equal(passed.status, 0, passed.stderr);
  assert.match(passed.stdout, /Client write contract check passed/u);
  const refused = spawnSync(process.execPath, [checker, "--root"], {encoding: "utf8"});
  assert.equal(refused.status, 64);
});
