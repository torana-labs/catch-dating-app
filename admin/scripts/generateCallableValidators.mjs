#!/usr/bin/env node
import {adminCallableNames, readAdminCallableSources} from
  "../../tool/admin/callable_inventory.mjs";
import {readAdminActionCatalog} from "../../tool/lib/admin_registries.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const adminRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(adminRoot, "..");
const contractsRoot = path.join(repoRoot, "contracts");
const validatorsDir = path.join(adminRoot, "src/generated/validators");
const facadePath = path.join(validatorsDir, "adminCallableValidators.ts");
const groupsDir = path.join(validatorsDir, "groups");
const adminActionCatalogPath = path.join(
  contractsRoot,
  "admin",
  "admin_action_catalog.json"
);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function snakeToCamel(value) {
  return value.replace(/_([a-z0-9])/gu, (_, character) => character.toUpperCase());
}

function callableNames() {
  return adminCallableNames(readAdminCallableSources(repoRoot));
}

function referencedSchemaFiles(filePath, schema) {
  const files = [];
  const visit = (value) => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!value || typeof value !== "object") return;
    if (typeof value.$ref === "string" && !value.$ref.startsWith("#")) {
      const relative = value.$ref.split("#", 1)[0];
      files.push(path.resolve(path.dirname(filePath), relative));
    }
    Object.values(value).forEach(visit);
  };
  visit(schema);
  return files;
}

// Words for people, not rules: the browser never needs them to validate, so the
// runtime pools leave them out and each area's lazily loaded chunk stays small.
const annotationKeywords = new Set(["description", "title", "examples", "$comment", "markdownDescription"]);
// Keywords whose value is a map of names to schemas: the names are data.
const schemaMapKeywords = new Set(["properties", "patternProperties", "$defs", "definitions", "dependentSchemas"]);
// Keywords whose value is data, never a schema.
const dataKeywords = new Set(["enum", "const", "default", "required"]);

function withoutAnnotations(schema) {
  if (Array.isArray(schema)) return schema.map(withoutAnnotations);
  if (!schema || typeof schema !== "object") return schema;
  const result = {};
  for (const [key, value] of Object.entries(schema)) {
    if (annotationKeywords.has(key) || key.startsWith("x-")) continue;
    if (dataKeywords.has(key)) {
      result[key] = value;
    } else if (schemaMapKeywords.has(key) && value && typeof value === "object" && !Array.isArray(value)) {
      result[key] = Object.fromEntries(Object.entries(value).map(([name, child]) => [name, withoutAnnotations(child)]));
    } else {
      result[key] = withoutAnnotations(value);
    }
  }
  return result;
}

function collectSchemas(entryPaths) {
  const schemas = new Map();
  const visit = (filePath) => {
    const resolved = path.resolve(filePath);
    if (schemas.has(resolved)) return;
    const schema = readJson(resolved);
    if (!schema.$id) throw new Error(`Schema ${resolved} is missing $id.`);
    schemas.set(resolved, schema);
    referencedSchemaFiles(resolved, schema).forEach(visit);
  };
  entryPaths.forEach(visit);
  return schemas;
}

function buildModel() {
  const names = callableNames();
  const requestPaths = new Map();
  const strictRequests = new Set();
  const callableDir = path.join(contractsRoot, "callables");
  for (const filename of fs.readdirSync(callableDir).filter((name) => name.endsWith(".schema.json"))) {
    const filePath = path.join(callableDir, filename);
    const schema = readJson(filePath);
    const base = filename.replace(/_payload\.schema\.json$/u, "");
    const inferred = snakeToCamel(base);
    const aliases = Array.isArray(schema["x-callable-aliases"]) ?
      schema["x-callable-aliases"] : [];
    for (const name of [inferred, ...aliases]) {
      if (!names.includes(name)) continue;
      requestPaths.set(name, filePath);
      strictRequests.add(name);
    }
  }
  const adminActions = readAdminActionCatalog(adminActionCatalogPath).actions;
  const groups = {};
  for (const action of adminActions) {
    if (!names.includes(action.callable) || groups[action.callable]) continue;
    groups[action.callable] = groupFor(action.guiPath);
  }
  for (const name of names) groups[name] ??= "shared";
  for (const action of adminActions) {
    if (!names.includes(action.callable) || typeof action.requestSchema !== "string") {
      continue;
    }
    const filePath = path.resolve(repoRoot, action.requestSchema);
    if (!fs.existsSync(filePath)) continue;
    requestPaths.set(action.callable, filePath);
    strictRequests.add(action.callable);
  }

  const responsePaths = new Map();
  const responseDir = path.join(contractsRoot, "callable_responses");
  for (const filename of fs.readdirSync(responseDir).filter((name) => name.endsWith(".schema.json"))) {
    const filePath = path.join(responseDir, filename);
    const schema = readJson(filePath);
    const base = filename.replace(/_response\.schema\.json$/u, "");
    const inferred = snakeToCamel(base);
    const aliases = Array.isArray(schema["x-callable-aliases"]) ?
      schema["x-callable-aliases"] : [];
    for (const name of [inferred, ...aliases]) {
      if (names.includes(name)) responsePaths.set(name, filePath);
    }
  }
  responsePaths.set(
    "adminGetHostAnalytics",
    path.join(responseDir, "host_analytics_response.schema.json")
  );
  responsePaths.set(
    "adminGetUserAnalytics",
    path.join(responseDir, "user_analytics_response.schema.json")
  );
  const strictResponses = new Set(responsePaths.keys());
  const groupModels = new Map();
  for (const name of names) {
    const group = groups[name];
    if (!groupModels.has(group)) {
      groupModels.set(group, {entryPaths: [], runtimeSchemas: [],
        requestSchemaIds: {}, responseSchemaIds: {}});
    }
    const model = groupModels.get(group);
    for (const [direction, paths, ids] of [
      ["payload", requestPaths, model.requestSchemaIds],
      ["response", responsePaths, model.responseSchemaIds],
    ]) {
      const schemaPath = paths.get(name);
      if (schemaPath) {
        model.entryPaths.push(schemaPath);
        ids[name] = readJson(schemaPath).$id;
      } else {
        // Callables without an authored schema still accept only objects.
        const schema = {
          $id: `https://catch.app/contracts/admin_runtime/${name}_${direction}.schema.json`,
          type: "object",
          additionalProperties: true,
        };
        model.runtimeSchemas.push(schema);
        ids[name] = schema.$id;
      }
    }
  }

  return {
    names,
    strictRequests: [...strictRequests].sort(),
    strictResponses: [...strictResponses].sort(),
    groups,
    groupModels: [...groupModels.entries()].sort(([a], [b]) => a.localeCompare(b))
      .map(([group, model]) => ({
        group,
        schemas: [...collectSchemas(model.entryPaths).values(), ...model.runtimeSchemas].map(withoutAnnotations),
        requestSchemaIds: model.requestSchemaIds,
        responseSchemaIds: model.responseSchemaIds,
      })),
  };
}

// One validator module per Admin area, named by the first segment of its
// catalog guiPath, so an area loads only the schemas its own callables use.
function groupFor(guiPath) {
  const segment = String(guiPath ?? "").split("/").find(Boolean) ?? "shared";
  return segment.replace(/[^a-z0-9]+([a-z0-9])/giu,
    (_, character) => character.toUpperCase()).replace(/[^A-Za-z0-9]/gu, "");
}

// Share identical immutable schema fragments without weakening validation or
// loading a second validator system. Dependencies are emitted before parents.
function renderSchemaPool(schemas) {
  const counts = new Map();
  const visit = value => {
    if (!value || !["object", "string"].includes(typeof value)) return;
    const key = JSON.stringify(value);
    const threshold = typeof value === "string" ? 32 : 80;
    if (key.length >= threshold) counts.set(key, (counts.get(key) ?? 0) + 1);
    if (typeof value === "object") Object.values(value).forEach(visit);
  };
  schemas.forEach(visit);
  const emitted = new Map();
  const declarations = [];
  const literal = value => {
    if (!value || !["object", "string"].includes(typeof value)) {
      return JSON.stringify(value);
    }
    const key = JSON.stringify(value);
    const pooled = (counts.get(key) ?? 0) > 1;
    if (pooled && emitted.has(key)) return emitted.get(key);
    const source = typeof value === "string" ? key : Array.isArray(value) ?
      `[${value.map(literal).join(",")}]` :
      `{${Object.entries(value).map(([name, child]) =>
        `${JSON.stringify(name)}:${literal(child)}`).join(",")}}`;
    if (!pooled) return source;
    const name = `schemaPart${emitted.size}`;
    emitted.set(key, name);
    declarations.push(`const ${name} = ${source};`);
    return name;
  };
  const expression = `[${schemas.map(literal).join(",\n")}]`;
  return {declarations: declarations.join("\n"), expression};
}

const header = "// GENERATED FILE. Run: npm --workspace catch-admin run generate\n";

function renderValidation() {
  return header +
`import type {ErrorObject} from "ajv";\n\n` +
`export class AdminCallableValidationError extends Error {\n` +
`  constructor(\n` +
`    readonly callable: string,\n` +
`    readonly direction: "request" | "response",\n` +
`    readonly instancePath: string,\n` +
`    readonly validationErrors: ErrorObject[]\n` +
`  ) {\n` +
`    const first = validationErrors[0];\n` +
`    super(\`Invalid \${direction} for \${callable} at \${instancePath}: \${first?.message ?? "schema validation failed"}\`);\n` +
`    this.name = "AdminCallableValidationError";\n` +
`  }\n` +
`}\n\n` +
`export type AdminCallableValidators = {\n` +
`  validateAdminCallableRequest(callable: string, value: unknown): void;\n` +
`  validateAdminCallableResponse(callable: string, value: unknown): void;\n` +
`};\n\n` +
`export function missingAdminCallableValidator(\n` +
`  callable: string,\n` +
`  direction: "request" | "response"\n` +
`): AdminCallableValidationError {\n` +
`  return new AdminCallableValidationError(callable, direction, "/", [{\n` +
`    instancePath: "", schemaPath: "", keyword: "missing-validator", params: {}, message: "validator is not generated",\n` +
`  }]);\n` +
`}\n\n` +
`export const missingAdminCallableValidators: AdminCallableValidators = {\n` +
`  validateAdminCallableRequest(callable) {\n` +
`    throw missingAdminCallableValidator(callable, "request");\n` +
`  },\n` +
`  validateAdminCallableResponse(callable) {\n` +
`    throw missingAdminCallableValidator(callable, "response");\n` +
`  },\n` +
`};\n`;
}

function renderRuntime() {
  return header +
`import Ajv, {type ValidateFunction} from "ajv";\n` +
`import addFormats from "ajv-formats";\n` +
`import {\n` +
`  AdminCallableValidationError,\n` +
`  type AdminCallableValidators,\n` +
`  missingAdminCallableValidator,\n` +
`} from "./adminCallableValidation";\n\n` +
`export function createAdminCallableValidators(\n` +
`  schemas: object[],\n` +
`  requestSchemaIds: Record<string, string>,\n` +
`  responseSchemaIds: Record<string, string>\n` +
`): AdminCallableValidators {\n` +
`  const ajv = new Ajv({allErrors: true, strict: false, validateSchema: false});\n` +
`  addFormats(ajv);\n` +
`  for (const schema of schemas) ajv.addSchema(schema);\n` +
`  const validators = (ids: Record<string, string>): Record<string, ValidateFunction> =>\n` +
`    Object.fromEntries(Object.entries(ids).map(([name, id]) => {\n` +
`      const validate = ajv.getSchema(id);\n` +
`      if (!validate) throw new Error(\`Missing generated validator for \${name}.\`);\n` +
`      return [name, validate];\n` +
`    }));\n` +
`  const requestValidators = validators(requestSchemaIds);\n` +
`  const responseValidators = validators(responseSchemaIds);\n` +
`  const validate = (direction: "request" | "response", callable: string, value: unknown) => {\n` +
`    const validateFunction = direction === "request" ?\n` +
`      requestValidators[callable] : responseValidators[callable];\n` +
`    if (!validateFunction) throw missingAdminCallableValidator(callable, direction);\n` +
`    if (validateFunction(value)) return;\n` +
`    const errors = validateFunction.errors ?? [];\n` +
`    const instancePath = errors[0]?.instancePath || "/";\n` +
`    throw new AdminCallableValidationError(callable, direction, instancePath, [...errors]);\n` +
`  };\n` +
`  return {\n` +
`    validateAdminCallableRequest: (callable, value) => validate("request", callable, value),\n` +
`    validateAdminCallableResponse: (callable, value) => validate("response", callable, value),\n` +
`  };\n` +
`}\n`;
}

function renderGroup(groupModel) {
  const pool = renderSchemaPool(groupModel.schemas);
  const ids = JSON.stringify({
    requestSchemaIds: groupModel.requestSchemaIds,
    responseSchemaIds: groupModel.responseSchemaIds,
  }, null, 2);
  return header +
`import {createAdminCallableValidators} from "../adminCallableValidatorRuntime";\n\n` +
`const ids = ${ids};\n` +
`${pool.declarations}\nconst schemas = ${pool.expression};\n\n` +
`export const {validateAdminCallableRequest, validateAdminCallableResponse} =\n` +
`  createAdminCallableValidators(schemas, ids.requestSchemaIds, ids.responseSchemaIds);\n`;
}

function renderFacade(model) {
  const data = JSON.stringify({
    names: model.names,
    strictRequests: model.strictRequests,
    strictResponses: model.strictResponses,
    groups: model.groups,
  }, null, 2);
  const loaders = model.groupModels.map(({group}) =>
    `  ${JSON.stringify(group)}: () => import("./groups/${group}"),`).join("\n");
  return header +
`// Each Admin area's validators load on that area's first call, so no single\n` +
`// chunk carries every callable's schemas.\n` +
`import {\n` +
`  type AdminCallableValidators,\n` +
`  missingAdminCallableValidators,\n` +
`} from "./adminCallableValidation";\n\n` +
`export {\n` +
`  AdminCallableValidationError,\n` +
`  type AdminCallableValidators,\n` +
`} from "./adminCallableValidation";\n\n` +
`const model = ${data} as const;\n\n` +
`const loaders: Record<string, () => Promise<AdminCallableValidators>> = {\n${loaders}\n};\n\n` +
`export const adminCallableValidationCoverage = {\n` +
`  callables: model.names,\n` +
`  strictRequests: model.strictRequests,\n` +
`  strictResponses: model.strictResponses,\n` +
`} as const;\n\n` +
`/** Loads the validators of the Admin area that owns this callable. */\n` +
`export async function loadAdminCallableValidators(\n` +
`  callable: string\n` +
`): Promise<AdminCallableValidators> {\n` +
`  const group = (model.groups as Record<string, string>)[callable];\n` +
`  const load = group === undefined ? undefined : loaders[group];\n` +
`  return load ? load() : missingAdminCallableValidators;\n` +
`}\n`;
}

function render(model) {
  const files = new Map([
    [facadePath, renderFacade(model)],
    [path.join(validatorsDir, "adminCallableValidation.ts"), renderValidation()],
    [path.join(validatorsDir, "adminCallableValidatorRuntime.ts"), renderRuntime()],
  ]);
  for (const groupModel of model.groupModels) {
    files.set(path.join(groupsDir, `${groupModel.group}.ts`), renderGroup(groupModel));
  }
  return files;
}

function staleGroupFiles(files) {
  if (!fs.existsSync(groupsDir)) return [];
  return fs.readdirSync(groupsDir).map((name) => path.join(groupsDir, name))
    .filter((filePath) => !files.has(filePath));
}

/**
 * The registry source for readers that compare against its coverage, so a
 * check needs neither a generated file on disk nor a generate step of its own.
 */
export function adminCallableValidatorRegistrySource() {
  return render(buildModel()).get(facadePath);
}

function selfTest(model, output) {
  assert.deepEqual(withoutAnnotations({
    title: "Event", description: "Words", "x-callable-aliases": ["a"],
    properties: {description: {type: "string", description: "A field named description stays."}},
    enum: [{title: "data"}], required: ["description"],
  }), {
    properties: {description: {type: "string"}},
    enum: [{title: "data"}], required: ["description"],
  }, "Annotations go; rules, data and property names stay.");
  for (const groupModel of model.groupModels) {
    const pool = renderSchemaPool(groupModel.schemas);
    const reconstructed = Function(`${pool.declarations}\nreturn ${pool.expression};`)();
    assert.deepEqual(reconstructed, groupModel.schemas,
      `Pooling must preserve every schema keyword and value (${groupModel.group}).`);
  }
  const largest = model.groupModels.reduce((a, b) =>
    JSON.stringify(a.schemas).length > JSON.stringify(b.schemas).length ? a : b);
  const pool = renderSchemaPool(largest.schemas);
  assert.ok(pool.declarations.length + pool.expression.length <
    JSON.stringify(largest.schemas).length,
  "Repeated schema fragments must reduce the generated payload.");
  assert.deepEqual(Object.keys(model.groups).sort(), [...model.names].sort(),
    "Every callable must belong to exactly one validator group.");
  const changed = structuredClone(model);
  changed.groupModels[0].schemas[0] = {
    ...changed.groupModels[0].schemas[0], title: "simulated schema drift",
  };
  const changedFile = path.join(groupsDir, `${changed.groupModels[0].group}.ts`);
  assert.notEqual(render(changed).get(changedFile), output.get(changedFile));
  console.log("Admin callable validator self-test passed.");
}

function main() {
  const model = buildModel();
  const output = render(model);
  if (process.argv.includes("--self-test")) {
    selfTest(model, output);
    return;
  }
  fs.mkdirSync(groupsDir, {recursive: true});
  for (const filePath of staleGroupFiles(output)) fs.rmSync(filePath);
  for (const [filePath, source] of output) {
    // Rewriting identical bytes would invalidate every compiler and bundler cache.
    if (fs.existsSync(filePath) && fs.readFileSync(filePath, "utf8") === source) continue;
    fs.writeFileSync(filePath, source);
  }
  console.log(`Generated admin callable validators (${model.names.length} callables in ` +
    `${model.groupModels.length} groups, ${model.strictRequests.length} strict request schemas, ` +
    `${model.strictResponses.length} strict response schemas).`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
