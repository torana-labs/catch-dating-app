#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {fromRepo, relativeToRepo} from "./lib/repo_paths.mjs";
import {loadToolsManifest as readToolsManifest, toolsManifestPath} from "./lib/tools_manifest.mjs";

const manifestPath = fromRepo("tool/remote_ops_manifest.json");
const allowedEntryKinds = new Set([
  "tool-id",
  "workflow",
  "doc",
  "config",
  "manual",
]);

const command = process.argv[2] ?? "--check";
if (command === "--help" || command === "-h" || command === "help") {
  printHelp();
} else if (command === "--check" || command === "check") {
  checkManifest();
} else if (command === "--list" || command === "list") {
  listOperations();
} else {
  console.error(`Unknown command: ${command}`);
  printHelp();
  process.exit(64);
}

function checkManifest() {
  const errors = validateManifest(loadManifest());
  if (errors.length > 0) {
    console.error("Remote ops manifest validation failed:");
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }
  console.log("Remote ops manifest validation passed.");
}

function listOperations() {
  const manifest = loadManifest();
  for (const operation of manifest.operations ?? []) {
    console.log(
      [
        operation.id.padEnd(34),
        operation.category.padEnd(14),
        operation.safety,
      ].join(" ")
    );
  }
}

function validateManifest(manifest) {
  const errors = [];
  const toolIds = new Set(
    loadToolsManifest().tools.map((tool) => tool.id).filter(Boolean)
  );
  if (!Number.isInteger(manifest.version)) {
    errors.push("version must be an integer.");
  }
  if (!Array.isArray(manifest.operations)) {
    errors.push("operations must be an array.");
    return errors;
  }

  const ids = new Set();
  for (const operation of manifest.operations) {
    const label = operation?.id ?? "<missing id>";
    if (!operation || typeof operation !== "object") {
      errors.push("Every operation must be an object.");
      continue;
    }
    for (const key of ["id", "category", "status", "safety", "purpose"]) {
      if (typeof operation[key] !== "string" || operation[key].trim() === "") {
        errors.push(`${label}: ${key} is required.`);
      }
    }
    if (ids.has(operation.id)) errors.push(`${label}: duplicate operation id.`);
    ids.add(operation.id);
    validateRemoteSafety({errors, operation, label});
    if (!Array.isArray(operation.entrypoints) || operation.entrypoints.length === 0) {
      errors.push(`${label}: entrypoints must be a non-empty array.`);
      continue;
    }
    for (const [index, entry] of operation.entrypoints.entries()) {
      validateEntrypoint({
        errors,
        toolIds,
        operationId: label,
        index,
        entry,
      });
    }
  }
  return errors;
}

function validateRemoteSafety({errors, operation, label}) {
  const requiredChecks = validateTextArray({
    errors,
    label,
    object: operation,
    key: "requiredChecks",
    required: operation.safety?.startsWith("remote") === true,
  });
  validateTextArray({
    errors,
    label,
    object: operation,
    key: "notes",
    required: operation.safety?.startsWith("remote") === true,
  });
  if (operation.safety === "remote-read-write-apply-guarded") {
    const checksText = requiredChecks.join("\n").toLowerCase();
    if (!checksText.includes("dry run") || !checksText.includes("--apply")) {
      errors.push(
        `${label}: remote read/write operations must document dry-run-before-apply behavior.`
      );
    }
  }
}

function validateTextArray({errors, label, object, key, required = false}) {
  const value = object[key];
  if (value == null) {
    if (required) errors.push(`${label}: ${key} is required.`);
    return [];
  }
  if (!Array.isArray(value)) {
    errors.push(`${label}: ${key} must be an array.`);
    return [];
  }
  for (const [index, item] of value.entries()) {
    if (typeof item !== "string" || item.trim() === "") {
      errors.push(`${label}.${key}[${index}]: must be a non-empty string.`);
    }
  }
  return value;
}

function validateEntrypoint({errors, toolIds, operationId, index, entry}) {
  const label = `${operationId}.entrypoints[${index}]`;
  if (!entry || typeof entry !== "object") {
    errors.push(`${label}: entrypoint must be an object.`);
    return;
  }
  if (!allowedEntryKinds.has(entry.kind)) {
    errors.push(
      `${label}: kind must be one of ${[...allowedEntryKinds].join(", ")}.`
    );
    return;
  }
  if (typeof entry.ref !== "string" || entry.ref.trim() === "") {
    errors.push(`${label}: ref is required.`);
    return;
  }
  if (entry.kind === "tool-id") {
    if (!toolIds.has(entry.ref)) errors.push(`${label}: unknown tool id ${entry.ref}.`);
    return;
  }
  if (entry.kind === "manual") {
    validateManualEntrypoint({errors, label, entry});
    return;
  }

  const absolutePath = fromRepo(entry.ref);
  if (!fs.existsSync(absolutePath)) {
    errors.push(`${label}: missing ${entry.kind} path ${entry.ref}.`);
  }
}

function validateManualEntrypoint({errors, label, entry}) {
  for (const key of ["owner", "ticket", "guardrail"]) {
    if (typeof entry[key] !== "string" || entry[key].trim() === "") {
      errors.push(`${label}: manual entrypoint requires ${key}.`);
    }
  }
}

function loadManifest() {
  return readJson(manifestPath);
}

function loadToolsManifest() {
  try {
    return readToolsManifest();
  } catch (error) {
    throw new Error(`Could not read ${toolsManifestPath}: ${error.message}`);
  }
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`Could not read ${relativeToRepo(filePath)}: ${error.message}`);
  }
}

function printHelp() {
  console.log(`Usage: node tool/check_remote_ops_manifest.mjs [--check|--list]

Validates tool/remote_ops_manifest.json references against tool ids and repo
paths. Manual console entrypoints are allowed but must be explicit.
`);
}
