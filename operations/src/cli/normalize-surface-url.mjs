#!/usr/bin/env node
// Classify one organizer surface URL with the Supply Intake surface rules,
// offline, before adding it to a capture or curation decision.
import path from "node:path";
import {fileURLToPath} from "node:url";
import {asOperationsError, OperationsError} from "../platform/errors.mjs";
import {normalizeOrganizerSurfaceUrl} from
  "../workflows/supply-intake/sources/surfaces.mjs";

const COMMAND = "normalize-surface-url";
const VALUE_FLAGS = new Map([["--role", "role"], ["--status", "status"],
  ["--expect-platform", "platform"], ["--expect-kind", "surfaceKind"],
  ["--expect-key", "normalizedKey"]]);

export function normalizeSurfaceUrl(argv) {
  const options = {};
  const expected = {};
  let url = null;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (VALUE_FLAGS.has(arg)) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new OperationsError("INVALID_ARGUMENT", `${arg} requires a value.`, {exitCode: 2});
      }
      const target = arg.startsWith("--expect-") ? expected : options;
      target[VALUE_FLAGS.get(arg)] = value;
      index += 1;
    } else if (!arg.startsWith("--") && url === null) url = arg;
    else throw new OperationsError("INVALID_ARGUMENT", `Unknown argument: ${arg}.`, {exitCode: 2});
  }
  if (!url) throw new OperationsError("MISSING_ARGUMENT", "A surface URL is required.", {exitCode: 2});
  const surface = normalizeOrganizerSurfaceUrl(url, options);
  for (const [field, value] of Object.entries(expected)) {
    if (surface[field] !== value) {
      throw new OperationsError("SURFACE_MISMATCH",
        `Expected ${field}=${value}; received ${surface[field] ?? "null"}.`);
    }
  }
  return {schemaVersion: 1, program: "catch-operations", command: COMMAND,
    ok: true, data: {surface}, warnings: []};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.stdout.write(`${JSON.stringify(normalizeSurfaceUrl(process.argv.slice(2)), null, 2)}\n`);
  } catch (error) {
    const normalized = asOperationsError(error);
    process.stderr.write(`${JSON.stringify({schemaVersion: 1, program: "catch-operations",
      command: COMMAND, ok: false, error: {code: normalized.code,
        message: normalized.message, details: normalized.details}})}\n`);
    process.exitCode = normalized.exitCode;
  }
}
