#!/usr/bin/env node
// Every collection that can hold a person's uid says what account deletion
// does with it. A registered Firestore collection whose schema has a
// uid-like field (or whose path is keyed by {uid}) needs an entry in
// functions/src/safety/accountDeletionErasure.json: deleted, anonymised,
// kept with a reason, or not personal with a reason. A deleted or anonymised
// entry must name a file of the deletion flow that writes the collection.
// Without this, a new collection holding a uid silently survives deletion,
// the way participantSignalFacts and the event-success records did (#2444).
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {firestoreContractDir, loadFirestoreContract} from "./lib/firestore_contract.mjs";

export const erasurePath = "functions/src/safety/accountDeletionErasure.json";
export const handlingValues = ["deleted", "anonymised", "kept", "notPersonal"];

// Derived from every property name in contracts/firestore: a uid is stored
// as uid/uids/userId/userIds or as a role prefix on those (actorUid,
// peerUid, selectedUids, reporterUserId, hostUserIds, ...). participantIds
// is the one uid array named for its role without the suffix (matches and
// the Cross Paths pair records). Look-alikes such as uidCount or
// perUidDailyReads are counters, not uids, and do not match.
export const uidFieldPattern = /^(?:uid|uids|userId|userIds)$|(?:Uid|Uids|UserId|UserIds)$/u;
export const uidFieldNames = new Set(["participantIds"]);
const uidPathPattern = /\{(?:uid|userId)\}/u;

const toolDir = path.dirname(fileURLToPath(import.meta.url));

/** The uid-like field paths a schema declares, nested and $ref'd included. */
export function uidFieldsOf(schema, {root, schemaFile}) {
  const fields = new Set();
  const seen = new Set();
  const visit = (node, prefix, file, document, depth) => {
    if (!node || typeof node !== "object" || depth > 8) return;
    if (typeof node.$ref === "string") {
      const target = resolveRef(node.$ref, file, document, root);
      if (!target) return;
      const key = `${target.file}#${node.$ref.split("#")[1] ?? ""}|${prefix}`;
      if (seen.has(key)) return;
      seen.add(key);
      visit(target.node, prefix, target.file, target.document, depth + 1);
      return;
    }
    for (const [name, child] of Object.entries(node.properties ?? {})) {
      const fieldPath = prefix ? `${prefix}.${name}` : name;
      if (uidFieldPattern.test(name) || uidFieldNames.has(name)) fields.add(fieldPath);
      visit(child, fieldPath, file, document, depth + 1);
    }
    if (node.items) visit(node.items, `${prefix}[]`, file, document, depth + 1);
    for (const key of ["oneOf", "anyOf", "allOf"]) {
      for (const branch of node[key] ?? []) visit(branch, prefix, file, document, depth + 1);
    }
    for (const key of ["then", "else"]) visit(node[key], prefix, file, document, depth + 1);
  };
  visit(schema, "", schemaFile, schema, 0);
  return [...fields].sort();
}

function resolveRef(ref, file, document, root) {
  const [target, pointer = ""] = ref.split("#");
  let targetFile = file;
  let targetDocument = document;
  if (target) {
    targetFile = path.join(path.dirname(file), target);
    if (!fs.existsSync(targetFile)) return null;
    targetDocument = JSON.parse(fs.readFileSync(targetFile, "utf8"));
  }
  let node = targetDocument;
  for (const segment of pointer.split("/").filter(Boolean)) {
    node = node?.[segment.replace(/~1/gu, "/").replace(/~0/gu, "~")];
  }
  if (!node || path.relative(root, targetFile).startsWith("..")) return null;
  return {node, file: targetFile, document: targetDocument};
}

/** Firestore schemas by document path, plus explicit schemaContract files. */
function schemasFor(collection, schemasByPath, root) {
  if (typeof collection.schemaContract === "string") {
    const file = path.join(root, collection.schemaContract);
    return fs.existsSync(file) ? [{file, schema: JSON.parse(fs.readFileSync(file, "utf8"))}] : [];
  }
  return schemasByPath.get(collection.path) ?? [];
}

function loadSchemasByPath(root) {
  const byPath = new Map();
  const directory = path.join(root, "contracts/firestore");
  if (!fs.existsSync(directory)) return byPath;
  for (const name of fs.readdirSync(directory).sort()) {
    if (!name.endsWith(".json")) continue;
    const file = path.join(directory, name);
    const schema = JSON.parse(fs.readFileSync(file, "utf8"));
    const documentPath = schema["x-firestore-path"];
    if (typeof documentPath !== "string") continue;
    if (!byPath.has(documentPath)) byPath.set(documentPath, []);
    byPath.get(documentPath).push({file, schema});
  }
  return byPath;
}

/** Collections whose stored documents can carry a person's uid. */
export function uidBearingCollections(root) {
  const registry = loadFirestoreContract({root});
  const schemasByPath = loadSchemasByPath(root);
  const result = [];
  for (const collection of registry.collections ?? []) {
    const fields = new Set();
    for (const {file, schema} of schemasFor(collection, schemasByPath, root)) {
      for (const field of uidFieldsOf(schema, {root, schemaFile: file})) fields.add(field);
      const idField = schema["x-document-id-field"];
      if (typeof idField === "string" && uidFieldPattern.test(idField)) fields.add(`(document id ${idField})`);
    }
    if (typeof collection.path === "string" && uidPathPattern.test(collection.path)) {
      fields.add("(path {uid})");
    }
    if (fields.size > 0) result.push({id: collection.id, path: collection.path, fields: [...fields].sort()});
  }
  return {registry, collections: result};
}

/** The collection a document path's documents live in: items for notifications/{uid}/items/{id}. */
function collectionIdOf(documentPath) {
  const segments = documentPath.split("/");
  return segments[segments.length % 2 === 0 ? segments.length - 2 : segments.length - 1];
}

/**
 * Problems with the account-deletion erasure entries under `root`, and the
 * coverage rows the table prints.
 */
export function checkAccountDeletionErasure(root) {
  const errors = [];
  const {registry, collections} = uidBearingCollections(root);
  const file = path.join(root, erasurePath);
  if (!fs.existsSync(file)) {
    return {errors: [`${erasurePath} is missing`], rows: []};
  }
  const erasure = JSON.parse(fs.readFileSync(file, "utf8"));
  const entries = erasure.collections ?? {};
  const handlers = Array.isArray(erasure.handlers) ? erasure.handlers : [];
  if (handlers.length === 0) errors.push(`${erasurePath}: handlers must list the deletion flow's source files`);
  const sources = new Map();
  const sourceOf = (relative, label) => {
    if (!sources.has(relative)) {
      const absolute = path.join(root, relative);
      if (!fs.existsSync(absolute)) {
        errors.push(`${label}: ${relative} does not exist`);
        sources.set(relative, "");
      } else {
        sources.set(relative, fs.readFileSync(absolute, "utf8"));
      }
    }
    return sources.get(relative);
  };
  for (const handler of handlers) sourceOf(handler, `${erasurePath} handlers`);

  const ids = Object.keys(entries);
  const sorted = [...ids].sort();
  if (ids.some((id, index) => id !== sorted[index])) {
    errors.push(`${erasurePath}: keep collections in alphabetical order`);
  }
  const registered = new Map((registry.collections ?? []).map((entry) => [entry.id, entry]));
  for (const id of ids) {
    if (!registered.has(id)) {
      errors.push(`${erasurePath}: ${id} is not a collection in ${firestoreContractDir}; remove its entry`);
    }
  }

  const rows = [];
  for (const collection of collections) {
    const label = `${erasurePath} ${collection.id}`;
    const entry = entries[collection.id];
    if (!entry) {
      errors.push(
        `${collection.id} (${collection.path}) holds ${collection.fields.join(", ")} but has no erasure ` +
        `entry; add one to ${erasurePath}: deleted, anonymised, kept with a reason, or notPersonal with a reason`
      );
      rows.push({...collection, handling: "MISSING", note: ""});
      continue;
    }
    rows.push({...collection, handling: entry.handling, needsDecision: entry.needsDecision === true,
      note: entry.how ?? entry.reason ?? ""});
    if (!handlingValues.includes(entry.handling)) {
      errors.push(`${label}: handling must be one of ${handlingValues.join(", ")}`);
      continue;
    }
    if (entry.needsDecision !== undefined &&
        (entry.needsDecision !== true || entry.handling !== "kept")) {
      errors.push(`${label}: needsDecision is only "true" on a kept entry`);
    }
    if (entry.handling === "deleted" || entry.handling === "anonymised") {
      if (!nonEmpty(entry.how)) errors.push(`${label}: a ${entry.handling} entry says how in "how"`);
      const files = entry.handledBy ?? handlers;
      if (!Array.isArray(files) || files.length === 0) {
        errors.push(`${label}: handledBy must list files`);
        continue;
      }
      const text = files.map((relative) => sourceOf(relative, label)).join("\n");
      // A collection query, collectionGroup query or subcollection path names
      // the collection id as a string literal or a path segment.
      const segment = collectionIdOf(collection.path);
      if (!new RegExp(`["'\`/]${escapeRegExp(segment)}["'\`/]`, "u").test(text)) {
        errors.push(
          `${label}: marked ${entry.handling}, but ${files.join(", ")} never name "${segment}"; ` +
          `write the deletion in the flow, or say why it is kept`
        );
      }
    } else if (!nonEmpty(entry.reason)) {
      errors.push(`${label}: a ${entry.handling} entry gives its reason in "reason"`);
    }
  }
  return {errors, rows};
}

function nonEmpty(value) {
  return typeof value === "string" && value.trim().length >= 12;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

/** A Markdown table cell: backslashes first, then pipes, so `\|` stays literal. */
export function markdownCell(text) {
  return text.replace(/\\/gu, "\\\\").replace(/\|/gu, "\\|").replace(/\r?\n/gu, " ");
}

/** The coverage table, one row per uid-bearing collection. */
export function coverageTable(rows) {
  const counts = new Map();
  for (const row of rows) {
    const key = row.needsDecision ? "kept, needs decision" : row.handling;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const lines = [
    `Account deletion erasure coverage: ${rows.length} collections hold a uid-like field.`,
    [...counts].sort().map(([key, count]) => `${key}: ${count}`).join("; "),
    "",
    "| Collection | uid-like fields | Handling | How / reason |",
    "| --- | --- | --- | --- |",
  ];
  for (const row of rows) {
    const handling = row.needsDecision ? "kept, needs decision" : row.handling;
    lines.push(`| ${row.id} | ${row.fields.join(", ")} | ${handling} | ${markdownCell(row.note)} |`);
  }
  return lines.join("\n");
}

const modulePath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === modulePath) {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`Usage: node tool/contracts/check_account_deletion_erasure.mjs [--root <directory>] [--quiet]

Fails when a registered Firestore collection with a uid-like field has no
entry in ${erasurePath}, when an entry is malformed or stale, or when a
deleted or anonymised entry names a collection the deletion flow never
writes. Prints the coverage table unless --quiet.`);
    process.exit(0);
  }
  const rootIndex = args.indexOf("--root");
  const quiet = args.includes("--quiet");
  const known = args.filter((arg, index) => arg !== "--quiet" &&
    !(rootIndex >= 0 && (index === rootIndex || index === rootIndex + 1)));
  if (known.length > 0 || (rootIndex >= 0 && !args[rootIndex + 1])) {
    console.error("Usage: node tool/contracts/check_account_deletion_erasure.mjs [--root <directory>] [--quiet]");
    process.exit(64);
  }
  const repoRoot = rootIndex >= 0 ? path.resolve(args[rootIndex + 1]) : path.resolve(toolDir, "../..");
  const {errors, rows} = checkAccountDeletionErasure(repoRoot);
  if (!quiet) console.log(coverageTable(rows));
  if (errors.length > 0) {
    console.error("Account deletion erasure check failed:");
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log("Account deletion erasure check passed.");
}
