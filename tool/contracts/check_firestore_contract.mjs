#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {discoverFunctionExportNames} from "../firebase/function_binding_intent.mjs";

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
if (args.length !== 0 && (args.length !== 2 || args[0] !== "--root" ||
    !args[1] || args[1].startsWith("--"))) {
  console.error("Usage: node tool/contracts/check_firestore_contract.mjs [--root <directory>]");
  process.exit(64);
}
const repoRoot = args.length ? path.resolve(args[1]) : path.resolve(toolDir, "../..");

const contractPath = path.join(repoRoot, "tool/contracts/firestore_contract.json");
const rulesPath = path.join(repoRoot, "firestore.rules");
const generatedTypesPath = path.join(
  repoRoot,
  "functions/src/shared/generated/firestoreAdminTypes.ts"
);
const functionsIndexPath = path.join(repoRoot, "functions/src/index.ts");
const contractRoot = path.join(repoRoot, "contracts");

const OWNERSHIP_TAGS = new Set([
  "client-writable",
  "client-runtime-writable",
  "callable-owned",
  "trigger-owned",
  "server-only",
]);

const contract = readJson(contractPath);
const rules = readText(rulesPath);
const generatedTypes = readText(generatedTypesPath);
const functionsIndex = readText(functionsIndexPath);
const functionExports = new Set(discoverFunctionExportNames(functionsIndex));
const schemaByCollectionId = loadFirestoreSchemas();

const errors = [];

assert(contract.schemaVersion === 2, "schemaVersion must be 2");
assert(Array.isArray(contract.collections), "collections must be an array");

const seenIds = new Set();
const seenPaths = new Set();

for (const collection of contract.collections ?? []) {
  const label = collection.id ?? collection.path ?? "<unknown>";

  requireString(collection.id, `${label}.id`);
  requireString(collection.path, `${label}.path`);
  requireString(collection.rulesMatch, `${label}.rulesMatch`);
  requireString(collection.owner, `${label}.owner`);
  requireString(collection.read, `${label}.read`);
  requireString(collection.write, `${label}.write`);

  assertUnique(seenIds, collection.id, `collection id ${collection.id}`);
  assertUnique(seenPaths, collection.path, `collection path ${collection.path}`);

  if (!rules.includes(`match ${collection.rulesMatch}`)) {
    errors.push(`${label}: Firestore rules are missing match ${collection.rulesMatch}`);
  }

  if (collection.dartModel) {
    requireExistingRepoPath(collection.dartModel, `${label}.dartModel`);
  }

  if (collection.rulesTestFile) {
    requireExistingRepoPath(collection.rulesTestFile, `${label}.rulesTestFile`);
  }

  validateOwnershipTags(collection, label);
  validateTypeContract(collection, label);
  validateSchemaFieldProjection(collection, label);
  validateRulesFieldAllowList(collection, label);
  validateExportedFunctions(collection, label);
  validateOperations(collection, label);

  for (const embeddedType of collection.embeddedTypes ?? []) {
    validateEmbeddedType(
      collection,
      embeddedType,
      `${label}.${embeddedType.typescriptInterface}`
    );
  }
}

validateCallableAliases();
validateDartCallableRoutes();

validateRulesTestCoverage();

if (errors.length > 0) {
  console.error("Firestore contract check failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Firestore contract check passed.");

function validateCallableAliases() {
  for (const {dir, labelPrefix} of callableSchemaDirs()) {
    if (!fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir)) {
      if (!entry.endsWith(".schema.json")) continue;
      const schema = readJson(path.join(dir, entry));
      const aliases = schema["x-callable-aliases"];
      if (aliases === undefined) continue;
      const label = `${labelPrefix}/${entry}`;
      if (!Array.isArray(aliases)) {
        errors.push(`${label}: x-callable-aliases must be an array when present`);
        continue;
      }
      const seen = new Set();
      for (const name of aliases) {
        if (typeof name !== "string" || name.length === 0) {
          errors.push(`${label}: x-callable-aliases contains a non-string value`);
          continue;
        }
        assertUnique(seen, name, `${label}.x-callable-aliases.${name}`);
        if (!hasNamedExport(name)) {
          errors.push(
            `${label}: x-callable-aliases lists "${name}" but ` +
            `functions/src/index.ts does not export it`
          );
        }
      }
    }
  }
}

function validateDartCallableRoutes() {
  const callableContracts = collectCallableContractNames();
  const uses = collectDartHttpsCallableUses();
  for (const use of uses) {
    if (!callableContracts.has(use.name)) {
      errors.push(
        `${use.location}: httpsCallable("${use.name}") is not declared by ` +
        `a callable schema title, x-callable-aliases, or Firestore contract ` +
        `operation.function`
      );
      continue;
    }
    if (!hasNamedExport(use.name)) {
      errors.push(
        `${use.location}: httpsCallable("${use.name}") has a contract ` +
        `declaration but functions/src/index.ts does not export it`
      );
    }
  }
}

function collectCallableContractNames() {
  const names = new Map();
  for (const collection of contract.collections ?? []) {
    for (const operation of collection.operations ?? []) {
      if (typeof operation.function === "string" && operation.function.length > 0) {
        names.set(operation.function, `${collection.id}.${operation.id}`);
      }
    }
  }

  for (const {dir, labelPrefix} of callableSchemaDirs()) {
    if (!fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir)) {
      if (!entry.endsWith(".schema.json")) continue;
      const schema = readJson(path.join(dir, entry));
      const label = `${labelPrefix}/${entry}`;
      const canonicalName = canonicalCallableName(schema.title);
      if (canonicalName) names.set(canonicalName, label);
      for (const alias of schema["x-callable-aliases"] ?? []) {
        if (typeof alias === "string" && alias.length > 0) {
          names.set(alias, `${label}.x-callable-aliases`);
        }
      }
    }
  }

  return names;
}

function callableSchemaDirs() {
  return [
    {
      dir: path.join(contractRoot, "callables"),
      labelPrefix: "contracts/callables",
    },
    {
      dir: path.join(contractRoot, "callable_responses"),
      labelPrefix: "contracts/callable_responses",
    },
  ];
}

function canonicalCallableName(title) {
  if (typeof title !== "string" || title.length === 0) return null;
  for (const suffix of ["CallablePayload", "CallableResponse"]) {
    if (!title.endsWith(suffix)) continue;
    const base = title.slice(0, -suffix.length);
    if (base.length === 0) return null;
    return `${base[0].toLowerCase()}${base.slice(1)}`;
  }
  return null;
}

function collectDartHttpsCallableUses() {
  const libDir = path.join(repoRoot, "lib");
  if (!fs.existsSync(libDir)) return [];
  const uses = [];
  const pattern = /httpsCallable\(\s*['"]([^'"]+)['"]/g;
  const platformDir = path.join(repoRoot, "packages/platform/lib");
  for (const file of [...walkFiles(libDir), ...(fs.existsSync(platformDir) ? walkFiles(platformDir) : [])]) {
    if (!file.endsWith(".dart") ||
        file.endsWith(".g.dart") ||
        file.endsWith(".freezed.dart")) {
      continue;
    }
    const source = readText(file);
    for (const match of source.matchAll(pattern)) {
      uses.push({
        name: match[1],
        location: `${relative(file)}:${lineNumber(source, match.index ?? 0)}`,
      });
    }
  }
  return uses;
}

function walkFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

function lineNumber(source, index) {
  return source.slice(0, index).split(/\r\n|\r|\n/).length;
}

function readJson(filePath) {
  return JSON.parse(readText(filePath));
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function relative(filePath) {
  return path.relative(repoRoot, filePath);
}

function loadFirestoreSchemas() {
  const schemas = new Map();
  const firestoreSchemaDir = path.join(contractRoot, "firestore");
  for (const entry of fs.readdirSync(firestoreSchemaDir, {withFileTypes: true})) {
    if (!entry.isFile() || !entry.name.endsWith(".schema.json")) continue;
    const filePath = path.join(firestoreSchemaDir, entry.name);
    const schema = readJson(filePath);
    const collectionId = schema["x-firestore-collection"];
    if (typeof collectionId === "string" && collectionId.length > 0) {
      schemas.set(collectionId, {schema, filePath});
    }
  }
  return schemas;
}

function resolveRef(ref, fromFilePath) {
  const [filePart, pointerPart] = ref.split("#");
  let target;
  if (filePart) {
    const targetPath = path.resolve(path.dirname(fromFilePath), filePart);
    target = readJson(targetPath);
  } else {
    return null;
  }
  if (pointerPart) {
    const segments = pointerPart.split("/").filter(Boolean);
    for (const seg of segments) {
      if (target == null) return null;
      target = target[seg];
    }
  }
  return target ?? null;
}

function resolveNestedProperty(parentSchema, parentFilePath, propertyPath) {
  const segments = propertyPath.split(".");
  let current = parentSchema;
  let currentFilePath = parentFilePath;
  for (const segment of segments) {
    if (!current || !current.properties) return null;
    let next = current.properties[segment];
    if (!next) return null;
    if (typeof next.$ref === "string") {
      const refStr = next.$ref;
      const [filePart] = refStr.split("#");
      const nextFilePath = filePart
        ? path.resolve(path.dirname(currentFilePath), filePart)
        : currentFilePath;
      next = resolveRef(refStr, currentFilePath);
      if (!next) return null;
      currentFilePath = nextFilePath;
    }
    current = next;
  }
  return current;
}

function requireString(value, label) {
  assert(typeof value === "string" && value.length > 0, `${label} is required`);
}

function requireExistingRepoPath(relativePath, label) {
  const absolutePath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    errors.push(`${label} points at missing file: ${relativePath}`);
  }
}

function assert(condition, message) {
  if (!condition) {
    errors.push(message);
  }
}

function assertUnique(seen, value, label) {
  if (seen.has(value)) {
    errors.push(`duplicate ${label}`);
    return;
  }
  seen.add(value);
}

function validateOwnershipTags(collection, label) {
  const legacyGroups = [
    "clientWritableFields",
    "clientRuntimeWritableFields",
    "callableOwnedFields",
    "triggerOwnedFields",
    "serverOwnedFields",
  ];
  for (const groupName of legacyGroups) {
    if (collection[groupName] !== undefined) {
      errors.push(
        `${label}.${groupName} is no longer carried in firestore_contract.json. ` +
        `Move ownership to per-property "x-catch-ownership" annotations on ` +
        `the corresponding schema in contracts/firestore/.`
      );
    }
  }

  if (collection.allFields !== undefined) {
    errors.push(
      `${label}.allFields is no longer carried in firestore_contract.json. ` +
      `Schema properties are the source of truth.`
    );
  }

  if (collection.internalDemoFields !== undefined) {
    errors.push(
      `${label}.internalDemoFields is no longer carried in firestore_contract.json. ` +
      `Use the schema's "x-internal-demo-fields" root array.`
    );
  }

  const entry = schemaByCollectionId.get(collection.id);
  if (!entry) return;
  const {schema} = entry;

  for (const [field, def] of Object.entries(schema.properties ?? {})) {
    const ownership = def["x-catch-ownership"];
    if (ownership === undefined) continue;
    if (typeof ownership !== "string" || !OWNERSHIP_TAGS.has(ownership)) {
      errors.push(
        `${label}: property "${field}" has unrecognized x-catch-ownership ` +
        `"${ownership}". Valid: ${[...OWNERSHIP_TAGS].join(", ")}.`
      );
    }
  }
}


function validateSchemaFieldProjection(collection, label) {
  // Allowable schema metadata is enforced by node tool/contracts/validate_schema_contracts.mjs.
  // Field-shape drift between schema and contract is no longer possible: schemas are the
  // single source of truth for field names and internal-demo markers.
  return;
}

function validateRulesFieldAllowList(collection, label) {
  if (collection.id !== "users") return;

  const rulesFields = extractFirstHasOnlyFields(
    rules,
    "function hasValidUserShape(data)"
  );
  if (!rulesFields) {
    errors.push(`${label}: could not find hasValidUserShape hasOnly fields.`);
    return;
  }
  const expected = [...effectiveAllFields(collection)].sort();
  const actual = [...rulesFields].sort();
  if (expected.join("\n") !== actual.join("\n")) {
    errors.push(
      `${label}: firestore.rules hasValidUserShape fields differ from ` +
      `ownership contract. expected [${expected.join(", ")}], actual ` +
      `[${actual.join(", ")}]`
    );
  }
}

function validateTypeContract(collection, label) {
  if (!collection.typescriptInterface) {
    return;
  }

  const generatedFields = extractInterfaceFields(
    generatedTypes,
    collection.typescriptInterface
  );
  if (!generatedFields) {
    errors.push(`${label}: generated TS interface not found: ${collection.typescriptInterface}`);
    return;
  }

  const fields = effectiveAllFields(collection);
  if (fields.length > 0) {
    const expected = [...fields].sort();
    const actual = [...generatedFields].sort();
    if (expected.join("\n") !== actual.join("\n")) {
      errors.push(
        `${label}: allFields differ from ${collection.typescriptInterface}. ` +
        `expected [${expected.join(", ")}], actual [${actual.join(", ")}]`
      );
    }
  }
}

function effectiveAllFields(collection) {
  const entry = schemaByCollectionId.get(collection.id);
  return entry ? schemaModelFields(entry.schema) : [];
}

function validateEmbeddedType(parentCollection, embeddedType, label) {
  if (!embeddedType.typescriptInterface) return;

  const generatedFields = extractInterfaceFields(
    generatedTypes,
    embeddedType.typescriptInterface
  );
  if (!generatedFields) {
    errors.push(`${label}: generated TS interface not found: ${embeddedType.typescriptInterface}`);
    return;
  }

  let sourceFields = null;
  if (typeof embeddedType.propertyPath === "string") {
    const parentEntry = schemaByCollectionId.get(parentCollection.id);
    if (!parentEntry) {
      errors.push(`${label}: parent collection has no schema entry to resolve propertyPath`);
      return;
    }
    const resolved = resolveNestedProperty(
      parentEntry.schema,
      parentEntry.filePath,
      embeddedType.propertyPath
    );
    if (!resolved || !resolved.properties) {
      errors.push(
        `${label}: propertyPath "${embeddedType.propertyPath}" did not resolve to a ` +
        `schema with properties`
      );
      return;
    }
    sourceFields = Object.keys(resolved.properties);
  } else if (Array.isArray(embeddedType.allFields)) {
    sourceFields = embeddedType.allFields;
  }

  if (sourceFields === null) {
    errors.push(
      `${label}: embedded type needs either "propertyPath" (preferred) or "allFields"`
    );
    return;
  }

  const expected = [...sourceFields].sort();
  const actual = [...generatedFields].sort();
  if (expected.join("\n") !== actual.join("\n")) {
    errors.push(
      `${label}: fields differ from ${embeddedType.typescriptInterface}. ` +
      `expected [${expected.join(", ")}], actual [${actual.join(", ")}]`
    );
  }
}

function schemaModelFields(schema) {
  const schemaFields = new Set(Object.keys(schema.properties ?? {}));
  const internalDemoFields = new Set(schema["x-internal-demo-fields"] ?? []);
  return [...schemaFields]
    .filter((field) => !internalDemoFields.has(field))
    .sort();
}

function extractInterfaceFields(source, interfaceName) {
  const escapedName = interfaceName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const headerMatch = new RegExp(
    `export interface ${escapedName}\\s*\\{`,
    "m"
  ).exec(source);
  if (!headerMatch || headerMatch.index === undefined) {
    return null;
  }

  const openBraceIndex = source.indexOf("{", headerMatch.index);
  const closeBraceIndex = matchingBraceIndex(source, openBraceIndex);
  if (openBraceIndex === -1 || closeBraceIndex === -1) {
    return null;
  }

  const body = source.slice(openBraceIndex + 1, closeBraceIndex);
  const fields = new Set();
  let depth = 1;
  for (const line of body.split("\n")) {
    const fieldMatch = depth === 1 ?
      /^\s*([A-Za-z_$][A-Za-z0-9_$]*)\??:/.exec(line) :
      null;
    if (fieldMatch) {
      fields.add(fieldMatch[1]);
    }
    depth += braceDelta(line);
  }
  return fields;
}

function matchingBraceIndex(source, openBraceIndex) {
  if (openBraceIndex === -1) return -1;
  let depth = 0;
  for (let index = openBraceIndex; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function braceDelta(line) {
  let delta = 0;
  for (const char of line) {
    if (char === "{") delta += 1;
    if (char === "}") delta -= 1;
  }
  return delta;
}

function extractFirstHasOnlyFields(source, functionHeader) {
  const functionIndex = source.indexOf(functionHeader);
  if (functionIndex === -1) return null;
  const hasOnlyIndex = source.indexOf(".hasOnly([", functionIndex);
  if (hasOnlyIndex === -1) return null;
  const arrayStart = source.indexOf("[", hasOnlyIndex);
  const arrayEnd = source.indexOf("]", arrayStart);
  if (arrayStart === -1 || arrayEnd === -1) return null;
  const body = source.slice(arrayStart + 1, arrayEnd);
  const fields = new Set();
  for (const match of body.matchAll(/'([^']+)'/g)) {
    fields.add(match[1]);
  }
  return fields;
}

function validateExportedFunctions(collection, label) {
  const exportedFunctions = collection.exportedFunctions ?? [];
  if (!Array.isArray(exportedFunctions)) {
    errors.push(`${label}.exportedFunctions must be an array when present`);
    return;
  }

  for (const functionName of exportedFunctions) {
    if (typeof functionName !== "string" || functionName.length === 0) {
      errors.push(`${label}.exportedFunctions contains a non-string value`);
      continue;
    }
    if (!hasNamedExport(functionName)) {
      errors.push(`${label}: functions/src/index.ts does not export ${functionName}`);
    }
  }
}

function validateOperations(collection, label) {
  const operations = collection.operations ?? [];
  if (!Array.isArray(operations)) {
    errors.push(`${label}.operations must be an array when present`);
    return;
  }

  const allFields = new Set(effectiveAllFields(collection));
  const rulesTestSource = collection.rulesTestFile ?
    readText(path.join(repoRoot, collection.rulesTestFile)) :
    null;
  const seenOperationIds = new Set();

  for (const operation of operations) {
    const operationLabel = `${label}.operations.${operation.id ?? "<unknown>"}`;
    requireString(operation.id, `${operationLabel}.id`);
    requireString(operation.type, `${operationLabel}.type`);
    requireString(operation.owner, `${operationLabel}.owner`);
    assertUnique(
      seenOperationIds,
      operation.id,
      `${label}.operations.${operation.id}`
    );

    if (operation.function && !hasNamedExport(operation.function)) {
      errors.push(
        `${operationLabel}: functions/src/index.ts does not export ` +
        operation.function
      );
    }

    validatePayloadSchemaRef(operation, operationLabel);

    for (const fieldGroup of [
      "allowedFields",
      "deniedFields",
      "pathDataFields",
      "serverOwnedFields",
    ]) {
      validateOperationFieldGroup(
        operation[fieldGroup],
        allFields,
        `${operationLabel}.${fieldGroup}`
      );
    }

    validateRequiredStrings(
      operation.rulesMustContain,
      rules,
      `${operationLabel}.rulesMustContain`,
      "firestore.rules"
    );

    if (operation.rulesTestNames && !rulesTestSource) {
      errors.push(`${operationLabel}.rulesTestNames requires rulesTestFile`);
    }
    validateRequiredStrings(
      operation.rulesTestNames,
      rulesTestSource,
      `${operationLabel}.rulesTestNames`,
      collection.rulesTestFile
    );
  }
}

function validatePayloadSchemaRef(operation, operationLabel) {
  const ref = operation.payloadSchemaRef;
  if (ref === undefined) return;
  if (typeof ref !== "string" || ref.length === 0) {
    errors.push(`${operationLabel}.payloadSchemaRef must be a non-empty string`);
    return;
  }

  const schemaPath = path.join(repoRoot, ref);
  if (!fs.existsSync(schemaPath)) {
    errors.push(`${operationLabel}.payloadSchemaRef points at missing schema: ${ref}`);
    return;
  }

  // Field-by-field cross-check is intentionally not done here: callable input
  // field names (e.g. startTimeMillis) commonly differ from the document field
  // names they map to (e.g. startTime). Catching that requires an explicit
  // input→doc mapping declaration, which the contract does not carry today.
  // The link is still useful: it makes the operation→schema relationship
  // explicit and catches stale references when schemas are renamed or deleted.

  if (operation.strictAllowedFieldsMatch === true && Array.isArray(operation.allowedFields)) {
    const payloadSchema = readJson(schemaPath);
    const patchProps = payloadSchema.properties?.fields?.properties;
    const inputProps = patchProps && typeof patchProps === "object"
      ? patchProps
      : payloadSchema.properties;
    if (inputProps && typeof inputProps === "object") {
      const inputSet = new Set(Object.keys(inputProps));
      for (const field of operation.allowedFields) {
        if (!inputSet.has(field)) {
          errors.push(
            `${operationLabel}.allowedFields.${field} is not in ${ref} ` +
            `(strictAllowedFieldsMatch: true)`
          );
        }
      }
    }
  }
}

function validateOperationFieldGroup(fields, allFields, label) {
  if (fields === undefined) return;
  if (!Array.isArray(fields)) {
    errors.push(`${label} must be an array when present`);
    return;
  }
  const seen = new Set();
  for (const field of fields) {
    if (typeof field !== "string" || field.length === 0) {
      errors.push(`${label} contains a non-string field`);
      continue;
    }
    assertUnique(seen, field, `${label}.${field}`);
    if (allFields.size > 0 && !allFields.has(field)) {
      errors.push(`${label}.${field} is missing from allFields`);
    }
  }
}

function validateRequiredStrings(values, source, label, sourceLabel) {
  if (values === undefined) return;
  if (!Array.isArray(values)) {
    errors.push(`${label} must be an array when present`);
    return;
  }
  if (source === null) return;
  for (const value of values) {
    if (typeof value !== "string" || value.length === 0) {
      errors.push(`${label} contains a non-string value`);
      continue;
    }
    if (!source.includes(value)) {
      errors.push(`${label}: ${sourceLabel} does not contain "${value}"`);
    }
  }
}

function hasNamedExport(functionName) {
  return functionExports.has(functionName);
}

// Every collection either names the rules test that covers it or appears in
// collectionsWithoutRulesTests with a reason and the issue tracking its tests,
// so a new collection cannot go untested without anyone noticing.
function validateRulesTestCoverage() {
  const gap = contract.collectionsWithoutRulesTests ?? {collections: []};
  const label = "collectionsWithoutRulesTests";
  if (!Array.isArray(gap.collections)) {
    errors.push(`${label}.collections must be an array`);
    return;
  }
  if (gap.collections.length > 0) requireString(gap.issue, `${label}.issue`);
  const listed = new Map();
  for (const entry of gap.collections) {
    requireString(entry?.id, `${label} entry id`);
    requireString(entry?.reason, `${label}.${entry?.id}.reason`);
    if (listed.has(entry?.id)) errors.push(`${label}: duplicate entry ${entry.id}`);
    listed.set(entry?.id, entry);
  }
  const ids = new Set((contract.collections ?? []).map((collection) => collection.id));
  for (const id of listed.keys()) {
    if (!ids.has(id)) errors.push(`${label}: ${id} is not a collection in this contract`);
  }
  for (const collection of contract.collections ?? []) {
    if (collection.rulesTestFile && listed.has(collection.id)) {
      errors.push(`${collection.id}: has a rulesTestFile, so remove it from ${label}`);
    }
    if (!collection.rulesTestFile && !listed.has(collection.id)) {
      errors.push(`${collection.id}: needs a rulesTestFile, or an entry with a reason in ${label}`);
    }
  }
}
