#!/usr/bin/env node
// The Firestore contract lives as one file per collection, so concurrent PRs
// that register or edit different collections never touch the same file:
//
//   tool/contracts/firestore_contract/contract.json        schemaVersion,
//       description and collectionsWithoutRulesTests
//   tool/contracts/firestore_contract/collections/<id>.json  one collection
//
// Every reader goes through this loader, which returns the combined view
// readers had before the split: the header's fields, then `collections`
// sorted by id. Run this file to print that view (it is never committed).
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

export const firestoreContractDir = "tool/contracts/firestore_contract";
export const firestoreContractHeaderPath = `${firestoreContractDir}/contract.json`;
export const firestoreCollectionsDir = `${firestoreContractDir}/collections`;

const collectionIdPattern = /^[A-Za-z][A-Za-z0-9_]*$/u;

// Paths are repository-relative with forward slashes.
export function firestoreCollectionPath(id) {
  return `${firestoreCollectionsDir}/${id}.json`;
}

// The file layout's rules, checked against a list of repository paths.
export function firestoreContractLayoutProblems(paths) {
  const problems = [];
  const all = [...paths].filter((file) => file.startsWith(`${firestoreContractDir}/`)).sort();
  if (!all.includes(firestoreContractHeaderPath)) {
    problems.push(`${firestoreContractHeaderPath}: missing`);
  }
  let collections = 0;
  for (const file of all) {
    if (file === firestoreContractHeaderPath) continue;
    const name = file.startsWith(`${firestoreCollectionsDir}/`)
      ? file.slice(firestoreCollectionsDir.length + 1)
      : null;
    const id = name?.endsWith(".json") ? name.slice(0, -".json".length) : null;
    if (id == null || !collectionIdPattern.test(id)) {
      problems.push(`${file}: not a contract file; the directory holds only contract.json ` +
        "and collections/<id>.json, where <id> is a letter followed by letters, digits or _");
    } else {
      collections += 1;
    }
  }
  if (collections === 0) problems.push(`${firestoreCollectionsDir}: no collection files`);
  return problems;
}

// Builds the combined contract from repository-relative paths and a reader
// for their text. Throws one Error listing every problem, so a malformed
// fragment fails every reader closed.
export function firestoreContractFromFiles(paths, readText) {
  const files = [...paths].filter((file) => file.startsWith(`${firestoreContractDir}/`)).sort();
  const problems = firestoreContractLayoutProblems(files);
  if (problems.length > 0) throw contractError(problems);

  const header = parseObject(firestoreContractHeaderPath, readText(firestoreContractHeaderPath),
    problems);
  if (header && Object.hasOwn(header, "collections")) {
    problems.push(`${firestoreContractHeaderPath}: collections live in ` +
      `${firestoreCollectionsDir}/<id>.json, not in the header`);
  }
  const collections = [];
  for (const file of files) {
    if (file === firestoreContractHeaderPath) continue;
    const collection = parseObject(file, readText(file), problems);
    if (!collection) continue;
    const id = path.posix.basename(file, ".json");
    if (collection.id !== id) {
      problems.push(`${file}: id must be "${id}", the file name`);
      continue;
    }
    collections.push(collection);
  }
  if (problems.length > 0) throw contractError(problems);
  collections.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return {...header, collections};
}

// Reads the contract from a checkout (or a fixture root).
export function loadFirestoreContract({root}) {
  const directory = path.join(root, firestoreContractDir);
  const paths = [];
  const walk = (relative) => {
    const absolute = path.join(root, relative);
    for (const entry of fs.readdirSync(absolute, {withFileTypes: true})) {
      const child = `${relative}/${entry.name}`;
      if (entry.isDirectory()) walk(child);
      else paths.push(child);
    }
  };
  if (fs.existsSync(directory)) walk(firestoreContractDir);
  return firestoreContractFromFiles(paths,
    (file) => fs.readFileSync(path.join(root, file), "utf8"));
}

// Reads the contract through a repository snapshot (tool/lib/repository_snapshot.mjs).
export function loadFirestoreContractFromSnapshot(snapshot) {
  const paths = snapshot.listFiles({prefix: `${firestoreContractDir}/`});
  const texts = snapshot.readTexts(paths, {required: true});
  return firestoreContractFromFiles(paths, (file) => texts.get(file));
}

// The inverse of the loader: the files a combined contract splits into, as a
// Map of repository-relative path to text. Fixtures and tests use it.
export function splitFirestoreContract(contract) {
  const {collections = [], ...header} = contract;
  const files = new Map([[firestoreContractHeaderPath, formatJson(header)]]);
  for (const collection of collections) {
    files.set(firestoreCollectionPath(collection.id), formatJson(collection));
  }
  return files;
}

// Writes a combined contract into a fixture root as split files.
export function writeFirestoreContract(root, contract) {
  for (const [file, text] of splitFirestoreContract(contract)) {
    const target = path.join(root, file);
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, text);
  }
}

function formatJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function parseObject(file, text, problems) {
  let value;
  try {
    value = JSON.parse(text);
  } catch (error) {
    problems.push(`${file}: invalid JSON (${error.message})`);
    return null;
  }
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    problems.push(`${file}: must hold a JSON object`);
    return null;
  }
  return value;
}

function contractError(problems) {
  return new Error(`Firestore contract files are malformed:\n- ${problems.join("\n- ")}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
  process.stdout.write(formatJson(loadFirestoreContract({root})));
}
