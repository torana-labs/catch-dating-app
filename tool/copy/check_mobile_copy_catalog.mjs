#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {fromRepo, relativeToRepo} from "../lib/repo_paths.mjs";

const defaultCatalog = fromRepo("packages/l10n/lib/app_en.arb");
const defaultIdentifierAllowlist = fromRepo(
  "tool/copy/mobile_copy_identifier_allowlist.json",
);
const validAudiences = new Set(["consumer", "host", "shared"]);
const validOwners = new Set([
  "engineering",
  "legal",
  "marketing",
  "product",
  "safety",
]);

const isCliEntrypoint =
  process.argv[1] != null &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCliEntrypoint) runCli();

export function validateMobileCopyCatalog(value, options = {}) {
  const errors = [];
  const identifierAllowlist = options.identifierAllowlist ?? new Set();
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return ["Catalog must be a JSON object."];
  }
  if (value["@@locale"] !== "en") {
    errors.push('Catalog must declare "@@locale": "en".');
  }

  const messageKeys = Object.keys(value).filter((key) => !key.startsWith("@"));
  const metadataKeys = Object.keys(value)
    .filter((key) => key.startsWith("@") && !key.startsWith("@@"))
    .map((key) => key.slice(1));
  for (const key of messageKeys) {
    const message = value[key];
    const metadata = value[`@${key}`];
    if (typeof message !== "string" || message.length === 0) {
      errors.push(`${key}: message must be a non-empty string.`);
    }
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
      errors.push(`${key}: missing @${key} metadata.`);
      continue;
    }
    for (const field of ["description", "x-audience", "x-owner", "x-surface"]) {
      if (typeof metadata[field] !== "string" || !metadata[field].trim()) {
        errors.push(`${key}: metadata ${field} must be a non-empty string.`);
      }
    }
    if (!validAudiences.has(metadata["x-audience"])) {
      errors.push(
        `${key}: x-audience must be one of ${[...validAudiences].join(", ")}.`,
      );
    }
    if (!validOwners.has(metadata["x-owner"])) {
      errors.push(`${key}: x-owner must be one of ${[...validOwners].join(", ")}.`);
    }
    if (
      metadata["x-max-chars"] != null &&
      (!Number.isInteger(metadata["x-max-chars"]) || metadata["x-max-chars"] <= 0)
    ) {
      errors.push(`${key}: x-max-chars must be a positive integer when present.`);
    }
    const placeholders = metadata.placeholders;
    if (placeholders != null && (typeof placeholders !== "object" || Array.isArray(placeholders))) {
      errors.push(`${key}: placeholders must be an object when present.`);
    }
  }
  for (const key of metadataKeys) {
    if (!Object.hasOwn(value, key)) errors.push(`@${key}: metadata has no message.`);
  }
  for (const key of messageKeys) {
    const message = value[key];
    if (
      key.includes("Visiblecopy") &&
      typeof message === "string" &&
      /^[a-z][a-zA-Z0-9_]*$/.test(message) &&
      !identifierAllowlist.has(key)
    ) {
      errors.push(
        `${key}: identifier-shaped Visiblecopy value "${message}" must not ` +
        "be stored in ARB or used as a runtime key.",
      );
    }
  }
  return errors;
}

export function catalogRows(value) {
  return Object.keys(value)
    .filter((key) => !key.startsWith("@"))
    .sort((a, b) => a.localeCompare(b))
    .map((key) => {
      const metadata = value[`@${key}`] ?? {};
      return {
        key,
        english: value[key],
        audience: metadata["x-audience"] ?? "",
        owner: metadata["x-owner"] ?? "",
        surface: metadata["x-surface"] ?? "",
        maxChars: metadata["x-max-chars"] ?? "",
        description: metadata.description ?? "",
      };
    });
}

function runCli() {
  const catalogPath = argumentValue("--catalog")
    ? path.resolve(argumentValue("--catalog"))
    : defaultCatalog;
  const allowlistPath = argumentValue("--identifier-allowlist")
    ? path.resolve(argumentValue("--identifier-allowlist"))
    : defaultIdentifierAllowlist;
  const value = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
  const identifierAllowlist = new Set(
    JSON.parse(fs.readFileSync(allowlistPath, "utf8")),
  );
  const errors = validateMobileCopyCatalog(value, {identifierAllowlist});
  if (errors.length > 0) {
    console.error(`Mobile copy catalog is invalid (${errors.length} errors):`);
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }

  const rows = catalogRows(value);
  const exportPath = argumentValue("--export-csv");
  if (exportPath) {
    const resolved = path.resolve(exportPath);
    fs.mkdirSync(path.dirname(resolved), {recursive: true});
    fs.writeFileSync(resolved, toCsv(rows));
    console.log(
      `Exported ${rows.length} messages to ${relativeToRepo(resolved)} for marketing review.`,
    );
  }
  console.log(
    `Mobile copy catalog valid: ${rows.length} typed English messages in ${relativeToRepo(catalogPath)}.`,
  );
}

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

function toCsv(rows) {
  const columns = [
    "key",
    "english",
    "audience",
    "owner",
    "surface",
    "maxChars",
    "description",
  ];
  const lines = [columns.join(",")];
  for (const row of rows) {
    lines.push(columns.map((column) => csvCell(row[column])).join(","));
  }
  return `${lines.join("\n")}\n`;
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}
