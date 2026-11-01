#!/usr/bin/env node
import {adminCallableNames, readAdminCallableSources} from
  "../../tool/admin/callable_inventory.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const adminRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(adminRoot, "..");
const contractsRoot = path.join(repoRoot, "contracts");
const outputPath = path.join(
  adminRoot,
  "src/generated/validators/adminCallableValidators.ts"
);
const adminActionCatalogPath = path.join(
  contractsRoot,
  "admin",
  "admin_action_catalog.json"
);
const checkOnly = process.argv.includes("--check");
const selfTest = process.argv.includes("--self-test");

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
// runtime pool leaves them out and the lazily loaded chunk stays small.
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
  const adminActions = readJson(adminActionCatalogPath).actions ?? [];
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
  const entryPaths = [...requestPaths.values(), ...responsePaths.values()];
  const schemas = collectSchemas(entryPaths);
  const requestSchemaIds = {};
  const responseSchemaIds = {};

  for (const name of names) {
    const requestPath = requestPaths.get(name);
    if (requestPath) {
      requestSchemaIds[name] = schemas.get(path.resolve(requestPath)).$id;
    } else {
      const schema = {
        $id: `https://catch.app/contracts/admin_runtime/${name}_payload.schema.json`,
        type: "object",
        additionalProperties: true,
      };
      schemas.set(schema.$id, schema);
      requestSchemaIds[name] = schema.$id;
    }

    const responsePath = responsePaths.get(name);
    if (responsePath) {
      responseSchemaIds[name] = schemas.get(path.resolve(responsePath)).$id;
    } else {
      const schema = {
        $id: `https://catch.app/contracts/admin_runtime/${name}_response.schema.json`,
        type: "object",
        additionalProperties: true,
      };
      schemas.set(schema.$id, schema);
      responseSchemaIds[name] = schema.$id;
    }
  }

  return {
    names,
    schemas: [...schemas.values()].map(withoutAnnotations),
    requestSchemaIds,
    responseSchemaIds,
    strictRequests: [...strictRequests].sort(),
    strictResponses: [...strictResponses].sort(),
  };
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

function render(model) {
  const {schemas, ...metadata} = model;
  const data = JSON.stringify(metadata, null, 2);
  const pool = renderSchemaPool(schemas);
  return `// GENERATED FILE. Run: npm --workspace catch-admin run generate:callable-validators\n` +
`import Ajv, {type ErrorObject, type ValidateFunction} from "ajv";\n` +
`import addFormats from "ajv-formats";\n\n` +
`const model = ${data} as const;\n` +
`${pool.declarations}\nconst schemas = ${pool.expression};\n` +
`const ajv = new Ajv({allErrors: true, strict: false, validateSchema: false});\n` +
`addFormats(ajv);\n` +
`for (const schema of schemas) ajv.addSchema(schema);\n\n` +
`function validators(ids: Record<string, string>): Record<string, ValidateFunction> {\n` +
`  return Object.fromEntries(Object.entries(ids).map(([name, id]) => {\n` +
`    const validate = ajv.getSchema(id);\n` +
`    if (!validate) throw new Error(\`Missing generated validator for \${name}.\`);\n` +
`    return [name, validate];\n` +
`  }));\n` +
`}\n\n` +
`const requestValidators = validators(model.requestSchemaIds);\n` +
`const responseValidators = validators(model.responseSchemaIds);\n\n` +
`export const adminCallableValidationCoverage = {\n` +
`  callables: model.names,\n` +
`  strictRequests: model.strictRequests,\n` +
`  strictResponses: model.strictResponses,\n` +
`} as const;\n\n` +
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
`function validate(\n` +
`  direction: "request" | "response",\n` +
`  callable: string,\n` +
`  value: unknown\n` +
`) {\n` +
`  const validateFunction = direction === "request" ? requestValidators[callable] : responseValidators[callable];\n` +
`  if (!validateFunction) {\n` +
`    throw new AdminCallableValidationError(callable, direction, "/", [{\n` +
`      instancePath: "", schemaPath: "", keyword: "missing-validator", params: {}, message: "validator is not generated",\n` +
`    }]);\n` +
`  }\n` +
`  if (validateFunction(value)) return;\n` +
`  const errors = validateFunction.errors ?? [];\n` +
`  const instancePath = errors[0]?.instancePath || "/";\n` +
`  throw new AdminCallableValidationError(callable, direction, instancePath, [...errors]);\n` +
`}\n\n` +
`export function validateAdminCallableRequest(callable: string, value: unknown) {\n` +
`  validate("request", callable, value);\n` +
`}\n\n` +
`export function validateAdminCallableResponse(callable: string, value: unknown) {\n` +
`  validate("response", callable, value);\n` +
`}\n`;
}

const model = buildModel();
const output = render(model);
if (selfTest) {
  assert.deepEqual(withoutAnnotations({
    title: "Event", description: "Words", "x-callable-aliases": ["a"],
    properties: {description: {type: "string", description: "A field named description stays."}},
    enum: [{title: "data"}], required: ["description"],
  }), {
    properties: {description: {type: "string"}},
    enum: [{title: "data"}], required: ["description"],
  }, "Annotations go; rules, data and property names stay.");
  const pool = renderSchemaPool(model.schemas);
  const reconstructed = Function(`${pool.declarations}\nreturn ${pool.expression};`)();
  assert.deepEqual(reconstructed, model.schemas,
    "Pooling must preserve every schema keyword and value.");
  assert.ok(pool.declarations.length + pool.expression.length <
    JSON.stringify(model.schemas).length,
  "Repeated schema fragments must reduce the generated payload.");
  const changed = structuredClone(model);
  changed.schemas[0] = {...changed.schemas[0], title: "simulated schema drift"};
  assert.notEqual(render(changed), output);
  console.log("Admin callable validator drift self-test passed.");
  process.exit(0);
}
if (checkOnly) {
  const current = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, "utf8") : "";
  if (current !== output) {
    console.error("Admin callable validators are stale. Run npm --workspace catch-admin run generate:callable-validators.");
    process.exit(1);
  }
  console.log(`Admin callable validators are current (${model.names.length} callables, ${model.strictRequests.length} strict request schemas, ${model.strictResponses.length} strict response schemas).`);
  process.exit(0);
}
fs.mkdirSync(path.dirname(outputPath), {recursive: true});
fs.writeFileSync(outputPath, output);
console.log(`Generated validators for ${model.names.length} admin callables (${model.strictRequests.length} strict requests, ${model.strictResponses.length} strict responses).`);
