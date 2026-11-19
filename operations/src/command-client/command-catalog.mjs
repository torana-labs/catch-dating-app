import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import {OperationsError} from "../platform/errors.mjs";
import {collectSchema} from "../platform/schema-dependencies.mjs";
import {EFFECT_CONFIRMATION_POLICY} from "../../../packages/command-client/src/confirmation-policy.mjs";

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultRepoRoot = path.resolve(moduleDirectory, "..", "..", "..");
export const COMMAND_CATALOG_PATH = "contracts/commands/catalog.json";
export const ENVELOPE_FIELDS = Object.freeze(["mode", "idempotencyKey", "surface", "confirm"]);

// Loads the product command catalog and compiles each command's payload and
// response schemas. Read-only: it never reshapes the catalog file, which other
// streams append to.
export async function loadCommandCatalog({
  repoRoot = defaultRepoRoot,
  catalogPath = path.join(repoRoot, COMMAND_CATALOG_PATH),
} = {}) {
  const catalog = JSON.parse(await fs.readFile(catalogPath, "utf8"));
  const ajv = new Ajv({allErrors: true, strict: false, validateSchema: false});
  addFormats(ajv);
  const files = new Map();
  for (const command of catalog.commands) {
    await collectSchema(path.resolve(repoRoot, command.payloadSchema), files);
    await collectSchema(path.resolve(repoRoot, command.responseSchema), files);
  }
  for (const schema of files.values()) ajv.addSchema(schema);
  const compiled = (relative) => {
    const schema = files.get(path.resolve(repoRoot, relative));
    return {schema, validate: schema?.$id ? ajv.getSchema(schema.$id) : null};
  };
  const commandsById = new Map();
  for (const command of catalog.commands) {
    const payload = compiled(command.payloadSchema);
    const response = compiled(command.responseSchema);
    if (!payload.validate || !response.validate) {
      throw new OperationsError(
        "COMMAND_CATALOG_SCHEMA_MISSING",
        `Unable to compile the schemas for ${command.commandId}.`
      );
    }
    commandsById.set(command.commandId, {
      ...command,
      payloadJsonSchema: payload.schema,
      responseJsonSchema: response.schema,
      validatePayload: payload.validate,
      validateResponse: response.validate,
    });
  }
  return {
    schemaVersion: catalog.schemaVersion,
    effectClasses: catalog.effectClasses,
    commands: [...commandsById.values()],
    commandsById,
    schemaFiles: files,
    ajv,
  };
}

export function requireCommand(catalog, commandId, {codePrefix = "COMMAND"} = {}) {
  if (!commandId) {
    throw new OperationsError(`${codePrefix}_ID_REQUIRED`, "A command id is required.",
      {exitCode: 2});
  }
  const command = catalog.commandsById.get(commandId);
  if (!command) {
    throw new OperationsError(`${codePrefix}_UNKNOWN`, `Unknown command: ${commandId}.`,
      {exitCode: 2, details: {known: [...catalog.commandsById.keys()]}});
  }
  return command;
}

export function schemaIssues(validate) {
  return (validate.errors ?? []).map((error) => ({
    instancePath: error.instancePath || "/",
    keyword: error.keyword,
    message: error.message,
  }));
}

// The command's `input` schema with local $refs resolved, so it can be shown
// to a person or handed to a model as a tool's input schema.
export function inputJsonSchema(catalog, command) {
  const payload = command.payloadJsonSchema;
  const input = payload?.properties?.input;
  if (!input) {
    throw new OperationsError("COMMAND_CATALOG_INPUT_MISSING",
      `${command.commandId} has no input property in its payload schema.`);
  }
  const payloadPath = [...catalog.schemaFiles.entries()]
    .find(([, schema]) => schema === payload)?.[0];
  return inlineRefs(input, payloadPath, catalog.schemaFiles);
}

export function publicCommand(command) {
  const policy = EFFECT_CONFIRMATION_POLICY[command.effect] ?? null;
  return {
    commandId: command.commandId,
    version: command.version,
    callable: command.callable,
    effect: command.effect,
    caller: command.caller,
    surfaces: command.surfaces,
    summary: command.summary,
    payloadSchema: command.payloadSchema,
    responseSchema: command.responseSchema,
    applyRequires: policy ? {
      confirmCommandId: policy.confirmCommandId,
      previewHash: policy.previewHash,
    } : null,
  };
}

function inlineRefs(value, filePath, files, depth = 0) {
  if (depth > 32) throw new Error("Schema references nest too deeply.");
  if (Array.isArray(value)) return value.map((entry) => inlineRefs(entry, filePath, files, depth));
  if (!value || typeof value !== "object") return value;
  if (typeof value.$ref === "string") {
    const [relative, fragment = ""] = value.$ref.split("#");
    const targetPath = relative ? path.resolve(path.dirname(filePath), relative) : filePath;
    const target = files.get(targetPath);
    if (!target) throw new Error(`Unresolved schema reference ${value.$ref}.`);
    let resolved = target;
    for (const part of fragment.split("/").filter(Boolean)) {
      resolved = resolved?.[decodeURIComponent(part.replace(/~1/gu, "/").replace(/~0/gu, "~"))];
    }
    if (resolved === undefined) throw new Error(`Unresolved schema reference ${value.$ref}.`);
    const {$ref: _ignored, ...siblings} = value;
    const inlined = inlineRefs(resolved, targetPath, files, depth + 1);
    const merged = {...inlined, ...siblings};
    delete merged.$schema;
    delete merged.$id;
    return merged;
  }
  const result = {};
  for (const [key, entry] of Object.entries(value)) {
    result[key] = inlineRefs(entry, filePath, files, depth);
  }
  return result;
}
