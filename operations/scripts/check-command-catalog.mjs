#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {
  COMMAND_CATALOG_PATH,
  ENVELOPE_FIELDS,
  inputJsonSchema,
  loadCommandCatalog,
} from "../src/command-client/command-catalog.mjs";
import {EFFECT_CONFIRMATION_POLICY} from "../src/command-client/confirmation-policy.mjs";
import {isMainModule} from "../src/command-client/argv.mjs";

// Client-side parity for contracts/commands/catalog.json. Functions'
// catalog.test.ts keeps the catalog in step with the callables; this keeps it
// in step with the clients: every command must load, carry the shared
// envelope, have an input object a CLI or model can fill, and an effect class
// every client knows how to confirm.

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultRepoRoot = path.resolve(scriptDirectory, "..", "..");
const ENVELOPE_REF = "../shared/command_envelope.schema.json#/definitions/";
const RESPONSE_REQUIRED = ["commandId", "status", "previewHash", "summary", "effects", "next",
  "receiptId"];

if (isMainModule(import.meta.url)) {
  const repoRoot = path.resolve(process.argv[2] ?? defaultRepoRoot);
  const result = await checkCommandCatalog({repoRoot});
  const stream = result.ok ? process.stdout : process.stderr;
  stream.write(`${JSON.stringify(result, null, result.ok ? 0 : 2)}\n`);
  if (!result.ok) process.exitCode = 1;
}

export async function checkCommandCatalog({repoRoot = defaultRepoRoot, catalogPath} = {}) {
  const findings = [];
  const raw = JSON.parse(await fs.readFile(catalogPath ??
    path.join(repoRoot, COMMAND_CATALOG_PATH), "utf8"));
  const envelope = JSON.parse(await fs.readFile(
    path.join(repoRoot, "contracts/shared/command_envelope.schema.json"), "utf8"));
  const surfaces = new Set(envelope.definitions.surface.enum);
  const declaredEffects = Object.keys(raw.effectClasses ?? {});
  for (const effect of declaredEffects) {
    if (!EFFECT_CONFIRMATION_POLICY[effect]) {
      findings.push({id: "effect-class-without-client-policy", effect,
        message: "Add this effect class to operations/src/command-client/confirmation-policy.mjs."});
    }
  }
  for (const effect of Object.keys(EFFECT_CONFIRMATION_POLICY)) {
    if (!declaredEffects.includes(effect)) {
      findings.push({id: "client-policy-without-effect-class", effect,
        message: "The confirmation policy names an effect class the catalog no longer declares."});
    }
  }
  const seen = new Set();
  for (const command of raw.commands ?? []) {
    const at = command.commandId ?? "(missing commandId)";
    if (seen.has(at)) findings.push({id: "duplicate-command", commandId: at});
    seen.add(at);
    if (!declaredEffects.includes(command.effect)) {
      findings.push({id: "unknown-effect", commandId: at, effect: command.effect});
    }
    for (const surface of command.surfaces ?? []) {
      if (!surfaces.has(surface)) findings.push({id: "unknown-surface", commandId: at, surface});
    }
  }
  let catalog = null;
  try {
    catalog = await loadCommandCatalog({repoRoot, catalogPath});
  } catch (error) {
    findings.push({id: "catalog-does-not-load", message: error.message});
  }
  for (const command of catalog?.commands ?? []) {
    const at = command.commandId;
    const payload = command.payloadJsonSchema;
    for (const field of ENVELOPE_FIELDS) {
      const ref = payload?.properties?.[field]?.$ref;
      if (ref !== `${ENVELOPE_REF}${field}`) {
        findings.push({id: "payload-envelope-field", commandId: at, field,
          message: `payload.properties.${field} must be {"$ref": "${ENVELOPE_REF}${field}"}.`});
      }
    }
    for (const field of ["mode", "idempotencyKey", "surface", "input"]) {
      if (!payload?.required?.includes(field)) {
        findings.push({id: "payload-required-field", commandId: at, field});
      }
    }
    if (payload?.additionalProperties !== false) {
      findings.push({id: "payload-not-closed", commandId: at});
    }
    try {
      const input = inputJsonSchema(catalog, command);
      if (input.type !== "object" || input.additionalProperties !== false) {
        findings.push({id: "input-not-closed-object", commandId: at,
          message: "input must be an object with additionalProperties false."});
      }
    } catch (error) {
      findings.push({id: "input-schema-unresolvable", commandId: at, message: error.message});
    }
    const response = command.responseJsonSchema;
    for (const field of RESPONSE_REQUIRED) {
      if (!response?.required?.includes(field)) {
        findings.push({id: "response-required-field", commandId: at, field});
      }
    }
    if (response?.properties?.commandId?.const !== at) {
      findings.push({id: "response-command-id", commandId: at,
        message: "response.properties.commandId must be {\"const\": <commandId>}."});
    }
  }
  return {ok: findings.length === 0, commands: catalog?.commands.length ?? 0, findings};
}
