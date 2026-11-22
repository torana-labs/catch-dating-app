#!/usr/bin/env node
// Every direct client write that firestore.rules allows has a schema in
// contracts/client_writes/, and every such schema still matches a write the
// rules allow. A new `allow create`, `update` or `delete` for clients cannot
// land without its contract, and a contract cannot outlive its rule.
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {
  allowedMethods,
  parseRulesMatchBlocks,
  rulesPathGoverns,
} from "./lib/firestore_rules_blocks.mjs";
import {firestoreContractDir, loadFirestoreContract} from "./lib/firestore_contract.mjs";

const WRITE_METHODS = ["create", "update", "delete"];

const toolDir = path.dirname(fileURLToPath(import.meta.url));

/** Problems with the client-write contracts under `repoRoot`. */
export function checkClientWriteContracts(repoRoot) {
  const errors = [];
  const rules = fs.readFileSync(path.join(repoRoot, "firestore.rules"), "utf8");
  const registry = loadFirestoreContract({root: repoRoot});
  const registeredPaths = new Set((registry.collections ?? []).map((entry) => entry.path));
  const documentSchemas = loadDocumentSchemas(repoRoot);
  const contracts = loadClientWriteContracts(repoRoot, errors);

  const writeBlocks = parseRulesMatchBlocks(rules).map((block) => ({
    block,
    methods: WRITE_METHODS.filter((method) => allowedMethods(block).has(method)),
  })).filter(({methods}) => methods.length > 0);

  for (const {block, methods} of writeBlocks) {
    for (const method of methods) {
      const covered = contracts.some((contract) =>
        contract.operations.includes(method) &&
        rulesPathGoverns(block.path, contract.firestorePath));
      if (!covered) {
        errors.push(
          `firestore.rules:${block.line}: match ${block.path} lets clients ` +
          `${method}, but no contracts/client_writes schema declares ` +
          `x-firestore-operation "${method}" for a path it governs`
        );
      }
    }
  }

  for (const contract of contracts) {
    for (const method of contract.operations) {
      const allowed = writeBlocks.some(({block, methods}) =>
        methods.includes(method) && rulesPathGoverns(block.path, contract.firestorePath));
      if (!allowed) {
        errors.push(
          `${contract.label}: firestore.rules no longer lets clients ${method} ` +
          `${contract.firestorePath}; delete the contract or the operation`
        );
      }
    }
    if (!registeredPaths.has(contract.firestorePath)) {
      errors.push(
        `${contract.label}: ${contract.firestorePath} is not a collection path in ` +
        firestoreContractDir
      );
    }
    validateDataShape(contract, documentSchemas, errors);
  }
  return errors;
}

function validateDataShape(contract, documentSchemas, errors) {
  const {schema, label, operations, firestorePath} = contract;
  const data = schema.properties?.data;
  const writesData = operations.some((method) => method !== "delete");
  if (!writesData) {
    if (data !== undefined) errors.push(`${label}: a delete carries no data`);
    return;
  }
  if (operations.includes("delete")) {
    errors.push(`${label}: declare a delete in its own contract, without data`);
  }
  if (data === undefined) {
    errors.push(`${label}: a ${operations.join("/")} contract needs a data schema`);
    return;
  }
  const document = documentSchemas.get(firestorePath);
  if (!document) {
    errors.push(`${label}: no contracts/firestore schema describes ${firestorePath}`);
    return;
  }
  const ref = typeof data.$ref === "string" ? parseRef(data.$ref) : null;
  if (ref && !ref.pointer) {
    if (ref.file !== document.file) {
      errors.push(`${label}: data refers to ${ref.file}, not ${document.file}, the schema for ${firestorePath}`);
    }
    return;
  }
  const documentFields = new Set(Object.keys(document.schema.properties ?? {}));
  for (const [field, definition] of Object.entries(data.properties ?? {})) {
    const fieldRef = typeof definition?.$ref === "string" ? parseRef(definition.$ref) : null;
    if (fieldRef?.file === document.file && fieldRef.pointer !== `/properties/${field}`) {
      errors.push(`${label}: data.${field} refers to ${fieldRef.pointer} of ${document.file}`);
    }
    if (!documentFields.has(field)) {
      errors.push(`${label}: data.${field} is not a field of ${document.file}`);
    }
  }
}

function loadClientWriteContracts(repoRoot, errors) {
  const directory = path.join(repoRoot, "contracts/client_writes");
  if (!fs.existsSync(directory)) return [];
  const contracts = [];
  for (const name of fs.readdirSync(directory).filter((file) => file.endsWith(".schema.json")).sort()) {
    const label = `contracts/client_writes/${name}`;
    const schema = readJson(path.join(directory, name));
    const firestorePath = schema["x-firestore-path"];
    const declared = schema["x-firestore-operation"];
    const operations = Array.isArray(declared) ? declared : [declared];
    if (typeof firestorePath !== "string" || firestorePath.length === 0) {
      errors.push(`${label}: needs x-firestore-path`);
      continue;
    }
    if (operations.length === 0 || !operations.every((method) => WRITE_METHODS.includes(method)) ||
        new Set(operations).size !== operations.length) {
      errors.push(`${label}: x-firestore-operation must be create, update or delete, or a list of distinct ones`);
      continue;
    }
    if (typeof schema["x-owner"] !== "string" || schema["x-owner"].length === 0) {
      errors.push(`${label}: needs x-owner`);
    }
    contracts.push({label, schema, firestorePath, operations});
  }
  return contracts;
}

function loadDocumentSchemas(repoRoot) {
  const directory = path.join(repoRoot, "contracts/firestore");
  const byPath = new Map();
  for (const name of fs.readdirSync(directory).filter((file) => file.endsWith(".schema.json")).sort()) {
    const schema = readJson(path.join(directory, name));
    const documentPath = schema["x-firestore-path"];
    if (typeof documentPath === "string" && !byPath.has(documentPath)) {
      byPath.set(documentPath, {file: name, schema});
    }
  }
  return byPath;
}

/** `../firestore/users.schema.json#/properties/name` as its file and pointer. */
function parseRef(ref) {
  const [filePart, pointer = ""] = ref.split("#");
  const match = /^\.\.\/firestore\/([a-z0-9_]+\.schema\.json)$/u.exec(filePart);
  return match ? {file: match[1], pointer} : null;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

const modulePath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === modulePath) {
  const args = process.argv.slice(2);
  if (args.length !== 0 && (args.length !== 2 || args[0] !== "--root" || !args[1])) {
    console.error("Usage: node tool/contracts/check_client_write_contracts.mjs [--root <directory>]");
    process.exit(64);
  }
  const repoRoot = args.length ? path.resolve(args[1]) : path.resolve(toolDir, "../..");
  const errors = checkClientWriteContracts(repoRoot);
  if (errors.length > 0) {
    console.error("Client write contract check failed:");
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log("Client write contract check passed.");
}
