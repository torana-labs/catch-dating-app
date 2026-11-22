#!/usr/bin/env node
// Every Firestore-to-BigQuery export reads a collection that still exists.
// Each extensions/*.env COLLECTION_PATH must name a collection in the live
// Firestore registry (tool/contracts/firestore_contract.json), every env file
// must be an extension instance in firebase.json and the reverse, and the
// host analytics contract must pin the same paths the env files deploy.
// A retired collection's export otherwise keeps deploying and passes its own
// pinned expectations while BigQuery stops receiving rows.
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";
import {normalizeFirestorePath} from "./lib/firestore_rules_blocks.mjs";

const EXPORT_EXTENSION = "firebase/firestore-bigquery-export";
const toolDir = path.dirname(fileURLToPath(import.meta.url));

/** Problems with the BigQuery export configuration under `repoRoot`. */
export async function checkBigQueryExportPaths(repoRoot) {
  const errors = [];
  const registry = JSON.parse(fs.readFileSync(
    path.join(repoRoot, "tool/contracts/firestore_contract.json"), "utf8"));
  const registered = new Map();
  for (const entry of registry.collections ?? []) {
    if (typeof entry.path !== "string") continue;
    registered.set(normalizeFirestorePath(collectionPathOf(entry.path)), entry.id);
  }

  const firebaseJson = JSON.parse(fs.readFileSync(path.join(repoRoot, "firebase.json"), "utf8"));
  const instances = Object.entries(firebaseJson.extensions ?? {})
    .filter(([, source]) => String(source).split("@")[0] === EXPORT_EXTENSION)
    .map(([instanceId]) => instanceId);

  const extensionsDir = path.join(repoRoot, "extensions");
  const envFiles = fs.existsSync(extensionsDir) ?
    fs.readdirSync(extensionsDir).filter((name) => name.endsWith(".env")).sort() :
    [];
  const exportsByInstance = new Map();
  for (const name of envFiles) {
    const label = `extensions/${name}`;
    const instanceId = name.slice(0, -".env".length);
    const params = parseEnv(fs.readFileSync(path.join(extensionsDir, name), "utf8"));
    if (!instances.includes(instanceId)) {
      errors.push(`${label}: firebase.json lists no ${EXPORT_EXTENSION} instance "${instanceId}"`);
    }
    const collectionPath = params.COLLECTION_PATH;
    if (!collectionPath) {
      errors.push(`${label}: COLLECTION_PATH is missing`);
      continue;
    }
    exportsByInstance.set(instanceId, {collectionPath, tableId: params.TABLE_ID});
    if (!registered.has(normalizeFirestorePath(collectionPath))) {
      errors.push(
        `${label}: COLLECTION_PATH=${collectionPath} is not a collection in ` +
        `tool/contracts/firestore_contract.json; point the export at the live ` +
        `collection or retire the export with its collection`
      );
    }
  }
  for (const instanceId of instances) {
    if (!envFiles.includes(`${instanceId}.env`)) {
      errors.push(`firebase.json: extension instance ${instanceId} has no extensions/${instanceId}.env`);
    }
  }

  for (const {instanceId, collectionPath, tableId} of await hostAnalyticsExports(repoRoot)) {
    const label = `tool/analytics/host_analytics_contract.mjs (${instanceId})`;
    const deployed = exportsByInstance.get(instanceId);
    if (!deployed) {
      errors.push(`${label}: no extensions/${instanceId}.env deploys this export`);
      continue;
    }
    if (deployed.collectionPath !== collectionPath) {
      errors.push(`${label}: pins collectionPath ${collectionPath}, but the env file deploys ${deployed.collectionPath}`);
    }
    if (deployed.tableId !== tableId) {
      errors.push(`${label}: pins tableId ${tableId}, but the env file deploys ${deployed.tableId}`);
    }
  }
  return errors;
}

/** `users/{uid}/items/{itemId}` is exported from `users/{uid}/items`. */
function collectionPathOf(documentPath) {
  const segments = documentPath.split("/");
  return segments.length % 2 === 0 ? segments.slice(0, -1).join("/") : documentPath;
}

function parseEnv(source) {
  const params = {};
  for (const line of source.split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    params[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim().replace(/^(["'])(.*)\1$/u, "$2");
  }
  return params;
}

async function hostAnalyticsExports(repoRoot) {
  const file = path.join(repoRoot, "tool/analytics/host_analytics_contract.mjs");
  if (!fs.existsSync(file)) return [];
  const {hostExports = {}} = await import(pathToFileURL(file).href);
  return Object.entries(hostExports).map(([instanceId, expected]) => ({
    instanceId, collectionPath: expected.collectionPath, tableId: expected.tableId,
  }));
}

const modulePath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === modulePath) {
  const args = process.argv.slice(2);
  if (args.length !== 0 && (args.length !== 2 || args[0] !== "--root" || !args[1])) {
    console.error("Usage: node tool/contracts/check_bigquery_export_paths.mjs [--root <directory>]");
    process.exit(64);
  }
  const repoRoot = args.length ? path.resolve(args[1]) : path.resolve(toolDir, "../..");
  const errors = await checkBigQueryExportPaths(repoRoot);
  if (errors.length > 0) {
    console.error("BigQuery export path check failed:");
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log("BigQuery export path check passed.");
}
