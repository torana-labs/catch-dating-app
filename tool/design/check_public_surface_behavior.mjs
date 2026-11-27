#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import {repoRoot} from "../lib/repo_paths.mjs";
import {readScreenRegistry, screenRegistrySpec} from "./lib/screen_registries.mjs";

const defaultMatrixPath = "design/public_surface_behavior.json";
const defaultSchemaPath = "design/public_surface_behavior.schema.json";

export function validateContractSchema(matrix, schema) {
  let validate;
  try {
    const ajv = new Ajv2020({allErrors: true, strict: false});
    validate = ajv.compile(schema);
  } catch (error) {
    return [`schema could not be compiled: ${error.message}`];
  }
  if (validate(matrix)) return [];
  return (validate.errors ?? []).map((error) => {
    const location = error.instancePath || "/";
    return `${location}: ${error.message}`;
  });
}

export function validatePublicSurfaceBehavior({
  matrix,
  root = repoRoot,
  strict = false,
}) {
  const errors = [];
  const textCache = new Map();
  const jsonCache = new Map();

  const textFor = (repoPath, label) => {
    if (textCache.has(repoPath)) return textCache.get(repoPath);
    // The screen registry is one file per entry. Its index stands for the
    // whole registry, read merged, so evidence and screen ids see every entry.
    if (repoPath === screenRegistrySpec.index) {
      try {
        const source = JSON.stringify(readScreenRegistry(root), null, 2);
        textCache.set(repoPath, source);
        return source;
      } catch (error) {
        errors.push(`${label}: ${repoPath}: ${error.message}`);
        return null;
      }
    }
    const absolutePath = safeRepoPath(root, repoPath);
    if (!absolutePath) {
      errors.push(`${label}: invalid repo-relative path ${repoPath}.`);
      return null;
    }
    if (!fs.existsSync(absolutePath)) {
      errors.push(`${label}: missing evidence file ${repoPath}.`);
      return null;
    }
    const source = fs.readFileSync(absolutePath, "utf8");
    textCache.set(repoPath, source);
    return source;
  };

  const jsonFor = (repoPath, label) => {
    if (jsonCache.has(repoPath)) return jsonCache.get(repoPath);
    const source = textFor(repoPath, label);
    if (source == null) return null;
    try {
      const value = JSON.parse(source);
      jsonCache.set(repoPath, value);
      return value;
    } catch (error) {
      errors.push(`${label}: ${repoPath} is not valid JSON: ${error.message}`);
      return null;
    }
  };

  const inventory = matrix.inventorySources ?? {};
  const routerSource = textFor(inventory.appRoutes, "inventorySources.appRoutes");
  const screenContract = jsonFor(inventory.appScreens, "inventorySources.appScreens");
  const websiteContract = jsonFor(
    inventory.websiteRoutes,
    "inventorySources.websiteRoutes",
  );

  let appRoutes = [];
  let appRouteIds = new Set();
  if (routerSource != null) {
    try {
      appRoutes = extractAppRoutes(routerSource);
      appRouteIds = new Set(appRoutes.map((route) => route.id));
    } catch (error) {
      errors.push(`inventorySources.appRoutes: ${error.message}`);
    }
  }
  const appScreenIds = new Set(
    (screenContract?.screens ?? []).map((screen) => screen.id),
  );
  const websiteRouteIds = new Set(
    (websiteContract?.routes ?? []).map((route) => route.id),
  );

  const dimensions = indexByUniqueId(matrix.dimensions, "dimension", errors);
  const dispositions = indexByUniqueId(
    matrix.dispositions,
    "disposition",
    errors,
  );
  const surfaces = indexByUniqueId(matrix.surfaces, "surface", errors);
  const compositions = indexByUniqueId(
    matrix.compositions,
    "composition",
    errors,
  );
  const proofHarnesses = indexByUniqueId(
    matrix.proofHarnesses,
    "proof harness",
    errors,
  );
  indexByUniqueId(matrix.absentSurfaces, "absent surface", errors);

  for (const dimension of matrix.dimensions ?? []) {
    validateDimensionSource({dimension, errors, jsonFor, textFor});
  }

  for (const composition of matrix.compositions ?? []) {
    validateEvidence(
      composition.evidence,
      `composition ${composition.id}`,
      errors,
      textFor,
    );
    for (const surfaceId of composition.appliesToSurfaceIds ?? []) {
      const surface = surfaces.get(surfaceId);
      if (!surface) {
        errors.push(`${composition.id}: unknown applied surface ${surfaceId}.`);
      } else if (!(surface.compositionIds ?? []).includes(composition.id)) {
        errors.push(
          `${composition.id}: ${surfaceId} must reciprocally declare the composition.`,
        );
      }
    }
  }

  const globalConfigurationIds = new Set();
  for (const surface of matrix.surfaces ?? []) {
    validateSurface({
      surface,
      dimensions,
      dispositions,
      compositions,
      proofHarnesses,
      appRouteIds,
      appScreenIds,
      websiteRouteIds,
      globalConfigurationIds,
      errors,
      textFor,
      strict,
    });
  }

  validateConsumerRouteCoverage({
    appRoutes,
    surfaces: matrix.surfaces ?? [],
    errors,
  });

  for (const harness of matrix.proofHarnesses ?? []) {
    const expectedConfigurationIds = new Set(
      (matrix.surfaces ?? [])
        .filter((surface) => (harness.surfaceIds ?? []).includes(surface.id))
        .flatMap((surface) =>
          (surface.configurations ?? []).map((configuration) => configuration.id),
        ),
    );
    validateExactKeys(
      Object.fromEntries((harness.configurationIds ?? []).map((id) => [id, true])),
      expectedConfigurationIds,
      `${harness.id}.configurationIds`,
      errors,
    );
    for (const surfaceId of harness.surfaceIds ?? []) {
      const surface = surfaces.get(surfaceId);
      if (!surface) {
        errors.push(`${harness.id}: unknown proof surface ${surfaceId}.`);
      } else if (surface.platform !== harness.platform) {
        errors.push(
          `${harness.id}: platform ${harness.platform} does not match ${surfaceId}.`,
        );
      }
    }
    const absolutePath = safeRepoPath(root, harness.path);
    const exists = absolutePath != null && fs.existsSync(absolutePath);
    if (strict && harness.status !== "existing") {
      errors.push(`${harness.id}: strict verification requires an existing proof harness.`);
    }
    if (strict && !exists) {
      errors.push(`${harness.id}: strict verification requires ${harness.path} to exist.`);
    }
    if (harness.status === "existing" || exists) {
      validateEvidence(
        {path: harness.path, contains: harness.contains},
        `proof harness ${harness.id}`,
        errors,
        textFor,
      );
    }
  }

  for (const absence of matrix.absentSurfaces ?? []) {
    if (!surfaces.has(absence.counterpartSurfaceId)) {
      errors.push(
        `${absence.id}: unknown counterpart surface ${absence.counterpartSurfaceId}.`,
      );
    }
    const routeIds = absence.checkedInventory === "appRoutes"
      ? appRouteIds
      : websiteRouteIds;
    const expectedPlatform = absence.checkedInventory === "appRoutes" ? "app" : "web";
    if (absence.platform !== expectedPlatform) {
      errors.push(
        `${absence.id}: platform ${absence.platform} does not match ${absence.checkedInventory}.`,
      );
    }
    for (const routeId of absence.forbiddenRouteIds ?? []) {
      if (routeIds.has(routeId)) {
        errors.push(
          `${absence.id}: route ${routeId} now exists; replace the declared absence with a surface contract.`,
        );
      }
    }
  }

  return errors;
}

function validateDimensionSource({dimension, errors, jsonFor, textFor}) {
  if (!dimension?.source) return;
  const label = `dimension ${dimension.id}`;
  let sourceValues;
  if (dimension.source.kind === "jsonPointer") {
    const source = jsonFor(dimension.source.path, label);
    if (source == null) return;
    sourceValues = jsonPointerValue(source, dimension.source.pointer);
    if (!Array.isArray(sourceValues)) {
      errors.push(
        `${label}: ${dimension.source.pointer} must resolve to an enum array.`,
      );
      return;
    }
  } else if (dimension.source.kind === "dartEnum") {
    const source = textFor(dimension.source.path, label);
    if (source == null) return;
    try {
      sourceValues = extractDartEnumValues(source, dimension.source.symbol);
    } catch (error) {
      errors.push(`${label}: ${error.message}`);
      return;
    }
  } else {
    errors.push(`${label}: unsupported source kind ${dimension.source.kind}.`);
    return;
  }

  if (JSON.stringify(dimension.values) !== JSON.stringify(sourceValues)) {
    errors.push(
      `${label}: values must exactly match ${dimension.source.path} ` +
      `(${sourceValues.join(", ")}).`,
    );
  }
}

function validateSurface({
  surface,
  dimensions,
  dispositions,
  compositions,
  proofHarnesses,
  appRouteIds,
  appScreenIds,
  websiteRouteIds,
  globalConfigurationIds,
  errors,
  textFor,
  strict,
}) {
  const label = `surface ${surface.id}`;
  const routeInventory = surface.platform === "app" ? appRouteIds : websiteRouteIds;
  for (const routeId of surface.routeIds ?? []) {
    if (!routeInventory.has(routeId)) {
      errors.push(`${label}: unknown ${surface.platform} route ${routeId}.`);
    }
  }
  if (surface.platform === "app") {
    if (!Array.isArray(surface.screenIds) || surface.screenIds.length === 0) {
      errors.push(`${label}: app surfaces must declare screenIds.`);
    }
    for (const screenId of surface.screenIds ?? []) {
      if (!appScreenIds.has(screenId)) {
        errors.push(`${label}: unknown app screen ${screenId}.`);
      }
    }
  } else if ((surface.screenIds ?? []).length > 0) {
    errors.push(`${label}: web surfaces must use website route ids, not app screenIds.`);
  }

  const decisionIds = new Set(surface.decisionDimensions ?? []);
  const invariantIds = new Set(surface.invariantDimensions ?? []);
  for (const dimensionId of [...decisionIds, ...invariantIds]) {
    if (!dimensions.has(dimensionId)) {
      errors.push(`${label}: unknown dimension ${dimensionId}.`);
    }
  }
  for (const dimensionId of decisionIds) {
    if (invariantIds.has(dimensionId)) {
      errors.push(`${label}: ${dimensionId} cannot be both decision-driving and invariant.`);
    }
  }
  for (const compositionId of surface.compositionIds ?? []) {
    const composition = compositions.get(compositionId);
    if (!composition) {
      errors.push(`${label}: unknown composition ${compositionId}.`);
    } else if (!(composition.appliesToSurfaceIds ?? []).includes(surface.id)) {
      errors.push(`${label}: composition ${compositionId} does not list this surface.`);
    }
  }
  for (const [index, evidence] of (surface.evidence ?? []).entries()) {
    validateEvidence(evidence, `${label} evidence ${index}`, errors, textFor);
  }

  const elements = indexByUniqueId(surface.elements, `${surface.id} element`, errors);
  if (surface.coverageKind === "routeGuard") {
    for (const element of surface.elements ?? []) {
      if (element.kind !== "routeGuard") {
        errors.push(`${label}: routeGuard surfaces may only declare routeGuard elements.`);
      }
    }
  }

  const tupleKeys = new Set();
  const witnessedDecisionValues = new Map(
    [...decisionIds].map((dimensionId) => [dimensionId, new Set()]),
  );
  let hasActionableOutcome = false;
  const enabledElementIds = new Set();
  for (const configuration of surface.configurations ?? []) {
    const configurationLabel = `${surface.id}.${configuration.id}`;
    if (!configuration.id.startsWith(`${surface.id}.`)) {
      errors.push(`${configurationLabel}: id must start with ${surface.id}.`);
    }
    if (strict && configuration.implementationStatus !== "verified") {
      errors.push(
        `${configurationLabel}: strict verification requires implementationStatus verified.`,
      );
    }
    if (globalConfigurationIds.has(configuration.id)) {
      errors.push(`${configurationLabel}: duplicate global configuration id.`);
    }
    globalConfigurationIds.add(configuration.id);

    validateExactKeys(
      configuration.values,
      decisionIds,
      `${configurationLabel}.values`,
      errors,
    );
    for (const [dimensionId, value] of Object.entries(configuration.values ?? {})) {
      const dimension = dimensions.get(dimensionId);
      if (dimension && !(dimension.values ?? []).includes(value)) {
        errors.push(`${configurationLabel}: invalid ${dimensionId} value ${value}.`);
      }
      witnessedDecisionValues.get(dimensionId)?.add(value);
    }
    validateExactKeys(
      configuration.expectations,
      new Set(elements.keys()),
      `${configurationLabel}.expectations`,
      errors,
    );
    for (const [elementId, expectation] of Object.entries(
      configuration.expectations ?? {},
    )) {
      if (!elements.has(elementId)) continue;
      const disposition = dispositions.get(expectation.disposition);
      if (!disposition) {
        errors.push(
          `${configurationLabel}.${elementId}: unknown disposition ${expectation.disposition}.`,
        );
      } else if (disposition.execution !== "none") {
        hasActionableOutcome = true;
        enabledElementIds.add(elementId);
      }
    }

    const tuple = JSON.stringify(
      (surface.decisionDimensions ?? []).map((dimensionId) => [
        dimensionId,
        configuration.values?.[dimensionId],
      ]),
    );
    if (tupleKeys.has(tuple)) {
      errors.push(`${configurationLabel}: duplicate decision tuple.`);
    }
    tupleKeys.add(tuple);

    for (const harnessId of configuration.proofHarnessIds ?? []) {
      const harness = proofHarnesses.get(harnessId);
      if (!harness) {
        errors.push(`${configurationLabel}: unknown proof harness ${harnessId}.`);
      } else {
        if (!(harness.surfaceIds ?? []).includes(surface.id)) {
          errors.push(`${configurationLabel}: ${harnessId} does not register ${surface.id}.`);
        }
        if (
          (strict || configuration.implementationStatus !== "specified") &&
          harness.status !== "existing"
        ) {
          errors.push(
            `${configurationLabel}: ${configuration.implementationStatus} requires an existing proof harness.`,
          );
        }
      }
    }
  }
  validateDecisionValueCoverage({
    surface,
    decisionIds,
    dimensions,
    witnessedDecisionValues,
    errors,
  });
  if (!hasActionableOutcome) {
    errors.push(`${label}: at least one configuration must have an actionable outcome.`);
  }
  for (const element of surface.elements ?? []) {
    const hasConstantDisposition = element.constantDisposition !== undefined;
    const hasConstantRationale = element.constantRationale !== undefined;
    if (hasConstantDisposition !== hasConstantRationale) {
      errors.push(
        `${label}: element ${element.id} must declare constantDisposition and constantRationale together.`,
      );
    }
    if (hasConstantDisposition) {
      if (!dispositions.has(element.constantDisposition)) {
        errors.push(
          `${label}: element ${element.id} has unknown constant disposition ${element.constantDisposition}.`,
        );
      }
      for (const configuration of surface.configurations ?? []) {
        if (
          configuration.expectations?.[element.id]?.disposition !==
          element.constantDisposition
        ) {
          errors.push(
            `${surface.id}.${configuration.id}.${element.id}: must preserve constant disposition ${element.constantDisposition}.`,
          );
        }
      }
    }
    if (
      element.kind === "action" &&
      !enabledElementIds.has(element.id) &&
      !hasConstantDisposition
    ) {
      errors.push(
        `${label}: action ${element.id} needs at least one enabled execution witness.`,
      );
    }
  }
}

function validateDecisionValueCoverage({
  surface,
  decisionIds,
  dimensions,
  witnessedDecisionValues,
  errors,
}) {
  const exclusions = surface.excludedDecisionValues ?? {};
  validateExactKeys(
    exclusions,
    decisionIds,
    `${surface.id}.excludedDecisionValues`,
    errors,
  );
  for (const dimensionId of decisionIds) {
    const dimension = dimensions.get(dimensionId);
    if (!dimension) continue;
    const witnessed = witnessedDecisionValues.get(dimensionId) ?? new Set();
    const excluded = exclusions[dimensionId] ?? {};
    for (const value of Object.keys(excluded)) {
      if (!(dimension.values ?? []).includes(value)) {
        errors.push(
          `${surface.id}.excludedDecisionValues.${dimensionId}: unknown value ${value}.`,
        );
      }
      if (witnessed.has(value)) {
        errors.push(
          `${surface.id}.excludedDecisionValues.${dimensionId}: ${value} is both witnessed and excluded.`,
        );
      }
    }
    for (const value of dimension.values ?? []) {
      if (!witnessed.has(value) && excluded[value] === undefined) {
        errors.push(
          `${surface.id}.${dimensionId}: ${value} needs a configuration witness or an explicit exclusion rationale.`,
        );
      }
    }
  }
}

function validateConsumerRouteCoverage({appRoutes, surfaces, errors}) {
  const routeOwners = new Map();
  for (const surface of surfaces) {
    if (surface.platform !== "app") continue;
    for (const routeId of surface.routeIds ?? []) {
      const owners = routeOwners.get(routeId) ?? [];
      owners.push(surface.id);
      routeOwners.set(routeId, owners);
    }
  }
  for (const route of appRoutes) {
    if (route.audience !== "consumer") continue;
    const owners = routeOwners.get(route.id) ?? [];
    if (owners.length === 0) {
      errors.push(`app route ${route.id}: consumer route has no behavior surface owner.`);
    } else if (owners.length > 1) {
      errors.push(
        `app route ${route.id}: consumer route has multiple behavior surface owners (${owners.join(", ")}).`,
      );
    }
  }
}

function validateEvidence(evidence, label, errors, textFor) {
  if (!evidence) {
    errors.push(`${label}: evidence is required.`);
    return;
  }
  const source = textFor(evidence.path, label);
  if (source == null) return;
  for (const expected of evidence.contains ?? []) {
    if (!source.includes(expected)) {
      errors.push(`${label}: ${evidence.path} must contain ${JSON.stringify(expected)}.`);
    }
  }
}

function validateExactKeys(value, expectedKeys, label, errors) {
  const actualKeys = new Set(Object.keys(value ?? {}));
  for (const key of expectedKeys) {
    if (!actualKeys.has(key)) errors.push(`${label}: missing ${key}.`);
  }
  for (const key of actualKeys) {
    if (!expectedKeys.has(key)) errors.push(`${label}: unexpected ${key}.`);
  }
}

function indexByUniqueId(entries, label, errors) {
  const result = new Map();
  for (const entry of entries ?? []) {
    if (!entry?.id) continue;
    if (result.has(entry.id)) errors.push(`${label} ${entry.id}: duplicate id.`);
    result.set(entry.id, entry);
  }
  return result;
}

function safeRepoPath(root, repoPath) {
  if (typeof repoPath !== "string" || path.isAbsolute(repoPath)) return null;
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, repoPath);
  return resolved === resolvedRoot || resolved.startsWith(`${resolvedRoot}${path.sep}`)
    ? resolved
    : null;
}

export function jsonPointerValue(value, pointer) {
  if (pointer === "") return value;
  if (typeof pointer !== "string" || !pointer.startsWith("/")) return undefined;
  return pointer
    .slice(1)
    .split("/")
    .map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"))
    .reduce((current, part) => current?.[part], value);
}

export function extractDartEnumValues(source, symbol) {
  const enumPattern = new RegExp(`\\benum\\s+${escapeRegExp(symbol)}\\s*\\{`, "u");
  const match = enumPattern.exec(source);
  if (!match) throw new Error(`could not find Dart enum ${symbol}.`);
  const openIndex = source.indexOf("{", match.index);
  const closeIndex = matchingBraceIndex(source, openIndex);
  const body = source
    .slice(openIndex + 1, closeIndex)
    .split(/\n/u)
    .map((line) => line.replace(/\/\/.*$/u, ""))
    .join("\n")
    .replace(/\/\*[\s\S]*?\*\//gu, "")
    .split(";")[0];
  const values = body
    .split(",")
    .map((entry) => /^\s*([A-Za-z][A-Za-z0-9_]*)/u.exec(entry)?.[1])
    .filter(Boolean);
  if (values.length === 0) throw new Error(`Dart enum ${symbol} has no values.`);
  return values;
}

export function extractAppRouteIds(source) {
  return extractAppRoutes(source).map((route) => route.id);
}

export function extractAppRoutes(source) {
  const enumMatch = /\benum\s+Routes\s*\{/u.exec(source);
  if (!enumMatch) throw new Error("could not find enum Routes.");
  const openIndex = source.indexOf("{", enumMatch.index);
  const closeIndex = matchingBraceIndex(source, openIndex);
  const body = source
    .slice(openIndex + 1, closeIndex)
    .split(/\n/u)
    .map((line) => line.replace(/\/\/.*$/u, ""))
    .join("\n")
    .replace(/\/\*[\s\S]*?\*\//gu, "")
    .split(";")[0];
  const routes = [
    ...body.matchAll(
      /(?:^|\n)\s*([A-Za-z][A-Za-z0-9_]*)\s*\(\s*(['"])([^'"]+)\2\s*,\s*AppRouteAudience\.(shared|consumer|host)\s*,?\s*\)/gmsu,
    ),
  ].map((match) => ({id: match[1], path: match[3], audience: match[4]}));
  if (routes.length === 0) throw new Error("enum Routes has no path entries.");
  return routes;
}

function matchingBraceIndex(source, openIndex) {
  let depth = 0;
  for (let index = openIndex; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  throw new Error("unterminated block.");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function parseArgs(argv) {
  const parsed = {
    matrix: defaultMatrixPath,
    schema: defaultSchemaPath,
    strict: false,
    summary: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--check") continue;
    if (arg === "--summary") parsed.summary = true;
    else if (arg === "--strict") parsed.strict = true;
    else if (arg === "--help" || arg === "-h") parsed.help = true;
    else if (arg === "--matrix") parsed.matrix = requiredValue(argv, ++index, arg);
    else if (arg === "--schema") parsed.schema = requiredValue(argv, ++index, arg);
    else throw new Error(`unknown argument ${arg}.`);
  }
  return parsed;
}

function requiredValue(argv, index, flag) {
  const value = argv[index];
  if (!value || value.startsWith("--")) throw new Error(`${flag} requires a value.`);
  return value;
}

function printHelp() {
  console.log(`Usage: node tool/design/check_public_surface_behavior.mjs [--check] [--strict] [--summary]

Validates the public app and marketing website viewer/provenance behavior
contract, its canonical enum sources, route and screen references, evidence,
configuration tuples, and proof-harness registrations.
`);
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 64;
    return;
  }
  if (args.help) {
    printHelp();
    return;
  }

  const matrix = readJson(path.resolve(repoRoot, args.matrix));
  const schema = readJson(path.resolve(repoRoot, args.schema));
  const schemaErrors = validateContractSchema(matrix, schema);
  const semanticErrors = schemaErrors.length === 0
    ? validatePublicSurfaceBehavior({matrix, root: repoRoot, strict: args.strict})
    : [];
  const errors = [...schemaErrors, ...semanticErrors];

  if (errors.length > 0) {
    console.error("Public surface behavior check failed:");
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }

  const configurationCount = (matrix.surfaces ?? []).reduce(
    (count, surface) => count + (surface.configurations?.length ?? 0),
    0,
  );
  const specifiedCount = (matrix.surfaces ?? []).reduce(
    (count, surface) => count + (surface.configurations ?? []).filter(
      (configuration) => configuration.implementationStatus === "specified",
    ).length,
    0,
  );
  if (args.summary) {
    console.log(
      `Public surface behavior ok: ${matrix.surfaces.length} surfaces, ` +
      `${configurationCount} configurations, ${specifiedCount} awaiting matrix harness proof, ` +
      `${matrix.absentSurfaces.length} declared absences.`,
    );
  }
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    console.error(`Unable to read ${filePath}: ${error.message}`);
    process.exit(1);
  }
}

const isMain = process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) main();
