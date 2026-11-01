#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

import Ajv2020 from "ajv/dist/2020.js";

import {fromRepo, repoRoot} from "../lib/repo_paths.mjs";
import {adminValidatorCoverageSource, adminValidatorFacadePath, readDesignRegistry} from "../lib/admin_registries.mjs";

const featureRoot = fromRepo("design/features");
const generatedRoot = fromRepo("design/features/generated");
const schemaPath = path.join(featureRoot, "feature_contract.schema.json");
const authorityRegistryPaths = {
  flutter_screens: "design/screens/catch.screens.json",
  marketing_routes: "design/website/routes.json",
  admin_routes: "design/admin/components.json",
};
const componentRegistryPaths = {
  flutter: "design/components/catch.components.json",
  react_marketing: "design/website/components.json",
  react_admin: "design/admin/components.json",
};
const runtimeForAuthority = {
  flutter_screens: "flutter",
  marketing_routes: "react_marketing",
  admin_routes: "react_admin",
};
const isCli = process.argv[1] != null &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

export class FeatureContractError extends Error {
  constructor(errors) {
    super(errors.join("\n"));
    this.name = "FeatureContractError";
    this.errors = errors;
  }
}

if (isCli) {
  runCli().catch((error) => {
    if (error instanceof FeatureContractError) {
      console.error("Feature contract generation failed:");
      for (const message of error.errors) console.error(`- ${message}`);
    } else {
      console.error(error instanceof Error ? error.stack : String(error));
    }
    process.exitCode = 1;
  });
}

async function runCli() {
  const args = process.argv.slice(2);
  const checkOnly = args.includes("--check");
  const summaryOnly = args.includes("--summary");
  const unknown = args.filter((arg) => arg !== "--check" && arg !== "--summary");
  if (unknown.length > 0) {
    console.error(`Unknown argument: ${unknown[0]}`);
    printHelp();
    process.exitCode = 64;
    return;
  }

  const schema = readJson(schemaPath);
  const ajv = new Ajv2020({allErrors: true, strict: false});
  const validate = ajv.compile(schema);
  const authorityRegistries = Object.fromEntries(
    Object.entries(authorityRegistryPaths).map(([id, filePath]) => [
      id,
      readDesignRegistry(filePath),
    ]),
  );
  const componentRegistries = Object.fromEntries(
    Object.entries(componentRegistryPaths).map(([runtime, filePath]) => [
      runtime,
      readDesignRegistry(filePath),
    ]),
  );
  const sources = fs.readdirSync(featureRoot)
    .filter((name) => name.endsWith(".feature.json"))
    .sort();
  if (sources.length === 0) {
    throw new FeatureContractError([
      "design/features must contain at least one *.feature.json source contract.",
    ]);
  }

  const outputs = [];
  for (const name of sources) {
    const sourcePath = path.join(featureRoot, name);
    const source = readJson(sourcePath);
    if (!validate(source)) {
      const schemaErrors = (validate.errors ?? []).map((error) =>
        `${name}${error.instancePath || "/"}: ${error.message}`
      );
      throw new FeatureContractError(schemaErrors);
    }
    const artifact = compileFeatureContract({
      source,
      sourcePath: relative(sourcePath),
      authorityRegistries,
      componentRegistries,
      pathExists: (filePath) => fs.existsSync(fromRepo(filePath)),
      readPath: (filePath) => filePath === adminValidatorFacadePath ?
        adminValidatorCoverageSource() : fs.readFileSync(fromRepo(filePath), "utf8"),
    });
    outputs.push({
      path: path.join(
        generatedRoot,
        name.replace(/\.feature\.json$/u, ".feature_contract.json"),
      ),
      artifact,
    });
  }

  if (summaryOnly) {
    for (const output of outputs) printSummary(output.artifact);
    return;
  }

  const expectedPaths = new Set(outputs.map((output) => path.resolve(output.path)));
  const existingGenerated = fs.existsSync(generatedRoot)
    ? fs.readdirSync(generatedRoot)
      .filter((name) => name.endsWith(".feature_contract.json"))
      .map((name) => path.join(generatedRoot, name))
    : [];
  const stale = [];
  for (const output of outputs) {
    const content = `${JSON.stringify(output.artifact, null, 2)}\n`;
    if (checkOnly) {
      const current = fs.existsSync(output.path)
        ? fs.readFileSync(output.path, "utf8")
        : null;
      if (current !== content) stale.push(relative(output.path));
    } else {
      fs.mkdirSync(path.dirname(output.path), {recursive: true});
      fs.writeFileSync(output.path, content);
    }
  }
  for (const existing of existingGenerated) {
    if (expectedPaths.has(path.resolve(existing))) continue;
    if (checkOnly) {
      stale.push(`${relative(existing)} (orphaned)`);
    } else {
      fs.rmSync(existing);
    }
  }

  if (stale.length > 0) {
    console.error("Generated feature contract outputs are stale:");
    for (const filePath of stale) console.error(`- ${filePath}`);
    console.error("Run: node tool/design/build_feature_contracts.mjs");
    process.exitCode = 1;
    return;
  }

  for (const output of outputs) printSummary(output.artifact);
  console.log(
    checkOnly
      ? "Generated feature contract outputs are current."
      : `Generated ${outputs.length} feature contract artifact(s).`,
  );
}

export function compileFeatureContract({
  source,
  sourcePath,
  authorityRegistries,
  componentRegistries,
  pathExists,
  readPath,
}) {
  const errors = [];
  const surfaceIds = new Set();
  const authorityKeys = new Set();
  const compiledSurfaces = [];

  for (const surface of source.surfaces ?? []) {
    const label = `${source.id}.surfaces.${surface.id}`;
    if (surfaceIds.has(surface.id)) errors.push(`${source.id}: duplicate surface ${surface.id}.`);
    surfaceIds.add(surface.id);
    const authorityKey = `${surface.authority.registry}:${surface.authority.id}`;
    if (authorityKeys.has(authorityKey)) {
      errors.push(`${source.id}: authority ${authorityKey} is bound by more than one surface.`);
    }
    authorityKeys.add(authorityKey);

    const compiled = compileSurfaceContract({
      featureId: source.id,
      surface,
      label,
      authorityRegistries,
      componentRegistries,
      pathExists,
      readPath,
      errors,
    });
    if (compiled != null) compiledSurfaces.push(compiled);
  }

  if (errors.length > 0) throw new FeatureContractError(errors);

  const resolvedProjection = compiledSurfaces.map((surface) => ({
    id: surface.id,
    runtime: surface.runtime,
    authority: surface.authority,
    states: surface.scenarios.map((scenario) => ({
      id: scenario.stateId,
      kind: scenario.kind,
      status: scenario.status,
      evidence: scenario.evidence,
    })),
    components: surface.resolved.components,
    previews: surface.resolved.previews,
    evidenceExceptions: surface.evidenceExceptions,
  }));
  const coverage = aggregateCoverage(compiledSurfaces);

  return {
    notice: "GENERATED CODE - DO NOT MODIFY BY HAND.",
    version: 2,
    generatedFrom: sourcePath,
    generatedFor: source.updated,
    sourceDigest: digest(source),
    resolvedDigest: digest(resolvedProjection),
    feature: {
      id: source.id,
      name: source.name,
      owner: source.owner,
      status: source.status,
      description: source.description,
    },
    coverage,
    surfaces: compiledSurfaces,
  };
}

function compileSurfaceContract({
  featureId,
  surface,
  label,
  authorityRegistries,
  componentRegistries,
  pathExists,
  readPath,
  errors,
}) {
  const authority = resolveAuthority({
    surface,
    label,
    authorityRegistries,
    errors,
  });
  if (authority == null) return null;

  const components = validateBindings({
    surface,
    label,
    authority,
    componentRegistry: componentRegistries[surface.runtime],
    pathExists,
    readPath,
    errors,
  });
  const states = new Map(authority.states.map((state) => [state.id, state]));
  const dimensionDefaults = {};
  for (const [id, dimension] of Object.entries(surface.dimensions ?? {})) {
    if (!(dimension.values ?? []).includes(dimension.default)) {
      errors.push(`${label}.dimensions.${id}: default must be one of values.`);
    }
    dimensionDefaults[id] = dimension.default;
  }

  const evidenceExceptions = compileEvidenceExceptions({
    label,
    surface,
    states,
    errors,
  });
  const evidenceExceptionMap = new Map();
  for (const exception of evidenceExceptions) {
    for (const stateId of exception.stateIds) {
      for (const evidenceKind of exception.evidence) {
        const key = evidenceExceptionKey(stateId, evidenceKind);
        if (evidenceExceptionMap.has(key)) {
          errors.push(
            `${label}.evidenceExceptions: duplicate exception for ` +
            `${stateId} ${evidenceKind}.`,
          );
        } else {
          evidenceExceptionMap.set(key, exception);
        }
      }
    }
  }
  const usedEvidenceExceptions = new Set();
  const actionOwners = resolveActionOwners({surface, label, pathExists, readPath, errors});
  const actionIds = new Set();
  const knownGapActionIds = new Set();
  const actions = [];
  for (const action of surface.actions ?? []) {
    if (actionIds.has(action.id)) errors.push(`${label}: duplicate action ${action.id}.`);
    actionIds.add(action.id);
    const owner = actionOwners.get(action.owner);
    if (owner == null) {
      errors.push(`${label}.actions.${action.id}: unknown action owner ${action.owner}.`);
    } else if (owner.source != null && !hasWord(owner.source, action.codeValue)) {
      errors.push(
        `${label}.actions.${action.id}: codeValue ${action.codeValue} is missing from ` +
        `${owner.binding.file}.`,
      );
    }
    for (const outcome of action.outcomes ?? []) {
      if (outcome.kind === "surface_state") {
        for (const stateId of outcome.stateIds ?? []) {
          if (!states.has(stateId)) {
            errors.push(
              `${label}.actions.${action.id}: unknown outcome surface state ${stateId}.`,
            );
          }
        }
      } else if (outcome.kind === "route" &&
          !authorityItemExists(outcome.authority, authorityRegistries)) {
        errors.push(
          `${label}.actions.${action.id}: unknown outcome route ` +
          `${outcome.authority.registry}:${outcome.authority.id}.`,
        );
      }
    }
    const implementationStatus = action.implementationStatus ?? "implemented";
    if (implementationStatus === "known_gap") knownGapActionIds.add(action.id);
    actions.push({...action, implementationStatus});
  }

  const mappedStateIds = new Set();
  const scenarioIds = new Set();
  const referencedActionIds = new Set();
  const compiledScenarios = [];
  const sourceScenarios = expandSurfaceScenarios({surface, authority, label, errors});
  for (const scenario of sourceScenarios) {
    if (scenarioIds.has(scenario.id)) errors.push(`${label}: duplicate scenario ${scenario.id}.`);
    scenarioIds.add(scenario.id);
    if (mappedStateIds.has(scenario.stateId)) {
      errors.push(`${label}: state ${scenario.stateId} is mapped by more than one scenario.`);
    }
    mappedStateIds.add(scenario.stateId);
    const state = states.get(scenario.stateId);
    if (state == null) {
      errors.push(`${label}.scenarios.${scenario.id}: unknown stateId ${scenario.stateId}.`);
      continue;
    }

    validateDimensionSelection({
      label: `${label}.scenarios.${scenario.id}.dimensions`,
      selection: scenario.dimensions,
      dimensions: surface.dimensions,
      errors,
    });
    const actionCaseIds = new Set();
    const actionCases = [];
    for (const actionCase of scenario.actionCases ?? []) {
      if (actionCaseIds.has(actionCase.id)) {
        errors.push(`${label}.scenarios.${scenario.id}: duplicate action case ${actionCase.id}.`);
      }
      actionCaseIds.add(actionCase.id);
      validateDimensionSelection({
        label: `${label}.scenarios.${scenario.id}.actionCases.${actionCase.id}.dimensions`,
        selection: actionCase.dimensions,
        dimensions: surface.dimensions,
        errors,
      });
      const enabled = actionCase.enabledActions ?? [];
      const disabled = actionCase.disabledActions ?? [];
      const overlap = enabled.filter((id) => disabled.includes(id));
      if (overlap.length > 0) {
        errors.push(
          `${label}.scenarios.${scenario.id}.actionCases.${actionCase.id}: ` +
          `actions cannot be both enabled and disabled: ${overlap.join(", ")}.`,
        );
      }
      for (const actionId of [...enabled, ...disabled]) {
        if (!actionIds.has(actionId)) {
          errors.push(
            `${label}.scenarios.${scenario.id}.actionCases.${actionCase.id}: ` +
            `unknown action ${actionId}.`,
          );
        }
        referencedActionIds.add(actionId);
      }
      const enabledKnownGaps = enabled.filter((id) => knownGapActionIds.has(id));
      if (enabledKnownGaps.length > 0) {
        errors.push(
          `${label}.scenarios.${scenario.id}.actionCases.${actionCase.id}: ` +
          `known-gap actions cannot be enabled: ${enabledKnownGaps.join(", ")}.`,
        );
      }
      actionCases.push({
        id: actionCase.id,
        dimensions: {
          ...dimensionDefaults,
          ...(scenario.dimensions ?? {}),
          ...(actionCase.dimensions ?? {}),
        },
        actions: {
          enabled: [...enabled],
          disabled: [...disabled],
          notAllowed: actions
            .map((action) => action.id)
            .filter((id) => !enabled.includes(id) && !disabled.includes(id)),
        },
      });
    }

    const evidence = resolveStateEvidence({
      surface,
      authority,
      state,
      components,
      readPath,
      errors,
      label: `${label}.scenarios.${scenario.id}`,
    });
    validateEvidence({
      label: `${label}.scenarios.${scenario.id}`,
      stateId: scenario.stateId,
      evidence,
      authority,
      pathExists,
      requiredEvidence: surface.requiredEvidence,
      evidenceExceptionMap,
      usedEvidenceExceptions,
      errors,
    });
    compiledScenarios.push({
      id: scenario.id,
      stateId: scenario.stateId,
      kind: state.kind,
      status: state.status,
      dimensions: {...dimensionDefaults, ...(scenario.dimensions ?? {})},
      evidence,
      actionCases,
    });
  }

  const missingStates = [...states.keys()].filter((id) => !mappedStateIds.has(id));
  const unknownMappedStates = [...mappedStateIds].filter((id) => !states.has(id));
  if (missingStates.length > 0) {
    errors.push(`${label}: unmapped authority states: ${missingStates.join(", ")}.`);
  }
  if (unknownMappedStates.length > 0) {
    errors.push(`${label}: mapped unknown authority states: ${unknownMappedStates.join(", ")}.`);
  }
  const orphanActions = [...actionIds].filter((id) => !referencedActionIds.has(id));
  if (orphanActions.length > 0) {
    errors.push(`${label}: actions are never classified by a scenario: ${orphanActions.join(", ")}.`);
  }
  for (const key of evidenceExceptionMap.keys()) {
    if (!usedEvidenceExceptions.has(key)) {
      const [stateId, evidenceKind] = key.split(":");
      errors.push(
        `${label}.evidenceExceptions: unused exception for ${stateId} ${evidenceKind}.`,
      );
    }
  }

  const uniqueCaptures = uniqueSorted(compiledScenarios.flatMap(
    (scenario) => scenario.evidence.captureIds,
  ));
  const uniquePreviews = uniqueSorted(compiledScenarios.flatMap(
    (scenario) => scenario.evidence.previewIds,
  ));
  const uniqueTests = uniqueSorted(compiledScenarios.flatMap(
    (scenario) => scenario.evidence.tests,
  ));

  return {
    id: surface.id,
    runtime: surface.runtime,
    authority: surface.authority,
    actionScope: surface.actionScope,
    bindings: surface.bindings,
    coverage: {
      states: states.size,
      scenarios: compiledScenarios.length,
      actionCases: compiledScenarios.reduce(
        (total, scenario) => total + scenario.actionCases.length,
        0,
      ),
      actions: actions.length,
      captures: uniqueCaptures.length,
      previews: uniquePreviews.length,
      testFiles: uniqueTests.length,
      evidenceExceptions: usedEvidenceExceptions.size,
    },
    dimensions: surface.dimensions,
    actions,
    evidenceExceptions,
    scenarios: compiledScenarios,
    resolved: {
      authority: authority.summary,
      components: components.map(componentProjection),
      previews: uniquePreviews,
    },
  };
}

function expandSurfaceScenarios({surface, authority, label, errors}) {
  const hasExplicitScenarios = surface.scenarios != null;
  const hasCompactMatrix = surface.stateIds != null ||
    surface.scenarioDefaults != null ||
    surface.scenarioOverrides != null;
  if (hasExplicitScenarios && hasCompactMatrix) {
    errors.push(`${label}: use either scenarios or the compact state matrix, not both.`);
    return surface.scenarios;
  }
  if (hasExplicitScenarios) return surface.scenarios;

  if (surface.stateIds == null || surface.scenarioDefaults == null ||
      surface.scenarioOverrides == null) {
    errors.push(
      `${label}: compact state matrices require stateIds, scenarioDefaults, ` +
      "and scenarioOverrides.",
    );
    return [];
  }

  const declaredStateIds = surface.stateIds;
  const declaredStateIdSet = new Set(declaredStateIds);
  if (declaredStateIds.length !== declaredStateIdSet.size) {
    errors.push(`${label}.stateIds: duplicate authority state ids are not allowed.`);
  }
  const authorityStateIds = new Set(authority.states.map((state) => state.id));
  const missingStateIds = [...authorityStateIds].filter((id) => !declaredStateIdSet.has(id));
  const unknownStateIds = [...declaredStateIdSet].filter((id) => !authorityStateIds.has(id));
  if (missingStateIds.length > 0) {
    errors.push(`${label}.stateIds: missing authority states: ${missingStateIds.join(", ")}.`);
  }
  if (unknownStateIds.length > 0) {
    errors.push(`${label}.stateIds: unknown authority states: ${unknownStateIds.join(", ")}.`);
  }

  for (const stateId of Object.keys(surface.scenarioOverrides)) {
    if (!declaredStateIdSet.has(stateId)) {
      errors.push(`${label}.scenarioOverrides: ${stateId} is not declared in stateIds.`);
    }
  }

  return declaredStateIds.map((stateId) => {
    const override = surface.scenarioOverrides[stateId] ?? {};
    return {
      id: stateId,
      stateId,
      dimensions: {
        ...(surface.scenarioDefaults.dimensions ?? {}),
        ...(override.dimensions ?? {}),
      },
      actionCases: override.actionCases ?? surface.scenarioDefaults.actionCases ?? [],
    };
  });
}

function resolveAuthority({surface, label, authorityRegistries, errors}) {
  const {registry: registryId, id: authorityId} = surface.authority;
  const expectedRuntime = runtimeForAuthority[registryId];
  if (expectedRuntime !== surface.runtime) {
    errors.push(
      `${label}: ${registryId} requires runtime ${expectedRuntime}, got ${surface.runtime}.`,
    );
  }
  const registry = authorityRegistries[registryId];
  if (registry == null) {
    errors.push(`${label}: missing authority registry ${registryId}.`);
    return null;
  }

  if (registryId === "flutter_screens") {
    const screen = (registry.screens ?? []).find((item) => item.id === authorityId);
    if (screen == null) {
      errors.push(`${label}: unknown Flutter screen ${authorityId}.`);
      return null;
    }
    return {
      id: authorityId,
      registry: registryId,
      raw: screen,
      states: (screen.states ?? []).map((state) => ({
        id: state.id,
        kind: state.kind,
        status: state.status,
        captureIds: [...(state.captureIds ?? [])],
        previewIds: [...(state.previewIds ?? [])],
        tests: [...(state.tests ?? [])],
      })),
      captureIds: new Set([
        ...(screen.captures ?? []).map((capture) => capture.id),
        ...(screen.states ?? []).flatMap((state) => state.captureIds ?? []),
      ]),
      summary: {id: screen.id, owner: screen.owner, routes: screen.routes},
    };
  }

  if (registryId === "marketing_routes") {
    const route = (registry.routes ?? []).find((item) => item.id === authorityId);
    if (route == null) {
      errors.push(`${label}: unknown marketing route ${authorityId}.`);
      return null;
    }
    const reviewStates = route.review?.states ?? [];
    const storybookStates = new Set(route.review?.stateCoverage?.storybook ?? []);
    const manualStates = new Set(route.review?.stateCoverage?.manual ?? []);
    for (const stateId of reviewStates) {
      if (!storybookStates.has(stateId) && !manualStates.has(stateId)) {
        errors.push(`${label}: marketing route state ${stateId} lacks review coverage.`);
      }
    }
    return {
      id: authorityId,
      registry: registryId,
      raw: route,
      states: reviewStates.map((stateId) => ({
        id: stateId,
        kind: "route_state",
        status: storybookStates.has(stateId) ? "previewed" : "manual",
        captureIds: [],
        previewIds: [],
        tests: [],
      })),
      captureIds: new Set(),
      summary: {
        id: route.id,
        kind: route.kind,
        path: route.path,
        pathPattern: route.pathPattern,
        pathPatterns: route.pathPatterns,
      },
    };
  }

  const routeComponent = (registry.components ?? [])
    .find((item) => item.id === authorityId && item.kind === "route");
  if (routeComponent == null) {
    errors.push(`${label}: unknown admin route component ${authorityId}.`);
    return null;
  }
  return {
    id: authorityId,
    registry: registryId,
    raw: routeComponent,
    states: (componentPreview(routeComponent)?.states ?? []).map((stateId) => ({
      id: stateId,
      kind: "route_state",
      status: componentPreview(routeComponent)?.status ?? "registered",
      captureIds: [],
      previewIds: [],
      tests: [],
    })),
    captureIds: new Set(),
    summary: {
      id: routeComponent.id,
      source: routeComponent.source,
      exportName: routeComponent.exportName,
    },
  };
}

function validateBindings({
  surface,
  label,
  authority,
  componentRegistry,
  pathExists,
  readPath,
  errors,
}) {
  const componentsById = new Map(
    (componentRegistry?.components ?? []).map((component) => [component.id, component]),
  );
  const selectedComponents = [];
  for (const componentId of surface.bindings.componentContracts ?? []) {
    const component = componentsById.get(componentId);
    if (component == null) {
      errors.push(`${label}.bindings.componentContracts: unknown ${componentId}.`);
    } else {
      selectedComponents.push(component);
    }
  }
  for (const filePath of [
    ...(surface.bindings.previewSources ?? []),
    ...(surface.bindings.dataContracts ?? []),
    ...(surface.bindings.runtimeContracts ?? []).map((binding) => binding.registry),
    ...Object.values(surface.bindings.testEvidence ?? {}).flat(),
  ]) {
    if (!pathExists(filePath)) errors.push(`${label}.bindings: missing path ${filePath}.`);
  }
  for (const previewSource of surface.bindings.previewSources ?? []) {
    if (pathExists(previewSource)) safeRead(previewSource, readPath, errors);
  }
  const stateIds = new Set(authority.states.map((state) => state.id));
  for (const evidenceKind of ["testEvidence", "previewEvidence"]) {
    for (const stateId of Object.keys(surface.bindings[evidenceKind] ?? {})) {
      if (!stateIds.has(stateId)) {
        errors.push(`${label}.bindings.${evidenceKind}: unknown authority state ${stateId}.`);
      }
    }
  }
  validateExplicitPreviewEvidence({
    surface,
    label,
    authority,
    components: selectedComponents,
    errors,
  });
  validateRuntimeContracts({surface, label, pathExists, readPath, errors});
  return selectedComponents;
}

function validateExplicitPreviewEvidence({surface, label, authority, components, errors}) {
  const previewSourceSet = new Set(surface.bindings.previewSources ?? []);
  const registeredPreviews = new Map();
  for (const component of components) {
    const preview = componentPreview(component);
    if (!componentAppliesToRoute(component, authority.id) ||
        preview == null || preview.status === "not-required" ||
        !preview.story || !preview.exportName) {
      continue;
    }
    registeredPreviews.set(
      `${component.id}/${preview.exportName}`,
      component,
    );
  }
  for (const [stateId, previewIds] of Object.entries(
    surface.bindings.previewEvidence ?? {},
  )) {
    for (const previewId of previewIds) {
      const component = registeredPreviews.get(previewId);
      if (component == null) {
        errors.push(
          `${label}.bindings.previewEvidence.${stateId}: ` +
          `${previewId} is not a selected preview for ${authority.id}.`,
        );
      } else if (!previewSourceSet.has(componentPreview(component).story)) {
        errors.push(
          `${label}.bindings.previewEvidence.${stateId}: preview source ` +
          `${componentPreview(component).story} is not declared in bindings.previewSources.`,
        );
      }
    }
  }
}

function validateRuntimeContracts({surface, label, pathExists, readPath, errors}) {
  const contracts = surface.bindings.runtimeContracts ?? [];
  if (contracts.length === 0) return;
  if (surface.runtime !== "react_admin") {
    errors.push(`${label}.bindings.runtimeContracts: admin callable evidence requires react_admin.`);
    return;
  }
  const registries = new Map();
  for (const binding of contracts) {
    if (!pathExists(binding.registry)) continue;
    if (!registries.has(binding.registry)) {
      const source = safeRead(binding.registry, readPath, errors);
      registries.set(
        binding.registry,
        source == null ? null : parseAdminCallableValidationCoverage(source),
      );
    }
    const coverage = registries.get(binding.registry);
    if (coverage == null) {
      errors.push(
        `${label}.bindings.runtimeContracts: cannot parse validation coverage from ` +
        `${binding.registry}.`,
      );
      continue;
    }
    if (!coverage.callables.has(binding.callable)) {
      errors.push(
        `${label}.bindings.runtimeContracts: unknown admin callable ${binding.callable}.`,
      );
      continue;
    }
    for (const [field, strictSet] of [
      ["requestValidation", coverage.strictRequests],
      ["responseValidation", coverage.strictResponses],
    ]) {
      const expected = strictSet.has(binding.callable)
        ? "strict_schema"
        : "structural_object";
      if (binding[field] !== expected) {
        errors.push(
          `${label}.bindings.runtimeContracts.${binding.callable}.${field}: ` +
          `expected ${expected}, got ${binding[field]}.`,
        );
      }
    }
  }
}

function resolveActionOwners({surface, label, pathExists, readPath, errors}) {
  const owners = new Map();
  const expectedLanguage = surface.runtime === "flutter" ? "dart" : "typescript";
  for (const binding of surface.bindings.actionOwners ?? []) {
    if (owners.has(binding.id)) {
      errors.push(`${label}.bindings.actionOwners: duplicate owner ${binding.id}.`);
      continue;
    }
    if (binding.language !== expectedLanguage) {
      errors.push(
        `${label}.bindings.actionOwners.${binding.id}: ${surface.runtime} requires ` +
        `${expectedLanguage}, got ${binding.language}.`,
      );
    }
    if (!pathExists(binding.file)) {
      errors.push(`${label}.bindings.actionOwners: missing path ${binding.file}.`);
      owners.set(binding.id, {binding, source: null});
      continue;
    }
    const source = safeRead(binding.file, readPath, errors);
    if (source != null && !hasDeclaredSymbol(source, binding.symbol)) {
      errors.push(
        `${label}.bindings.actionOwners.${binding.id}: ${binding.symbol} is missing from ` +
        `${binding.file}.`,
      );
    }
    owners.set(binding.id, {binding, source});
  }
  return owners;
}

function resolveStateEvidence({
  surface,
  authority,
  state,
  components,
  readPath,
  errors,
  label,
}) {
  if (surface.runtime === "flutter") {
    const availablePreviews = new Set();
    for (const previewSource of surface.bindings.previewSources ?? []) {
      const source = safeRead(
        previewSource,
        readPath,
        errors,
      );
      if (source == null) continue;
      for (const previewId of parseWidgetbookPreviewIds(source)) {
        availablePreviews.add(previewId);
      }
    }
    for (const previewId of state.previewIds) {
      if (!availablePreviews.has(previewId)) {
        errors.push(`${label}: Widgetbook preview ${previewId} is not declared.`);
      }
    }
    return {
      captureIds: [...state.captureIds],
      previewIds: [...state.previewIds],
      tests: [...state.tests],
    };
  }

  const previewSourceSet = new Set(surface.bindings.previewSources ?? []);
  const previewIds = [...(surface.bindings.previewEvidence?.[state.id] ?? [])];
  for (const component of components) {
    const preview = componentPreview(component);
    if (!componentAppliesToRoute(component, authority.id)) continue;
    if (!(preview?.states ?? []).includes(state.id)) continue;
    if (preview.status === "not-required" || !preview.story || !preview.exportName) continue;
    if (!previewSourceSet.has(preview.story)) {
      errors.push(
        `${label}: preview source ${preview.story} for ${component.id} ` +
        "is not declared in bindings.previewSources.",
      );
      continue;
    }
    previewIds.push(`${component.id}/${preview.exportName}`);
  }
  return {
    captureIds: [],
    previewIds: uniqueSorted(previewIds),
    tests: [...(surface.bindings.testEvidence?.[state.id] ?? [])],
  };
}

function compileEvidenceExceptions({label, surface, states, errors}) {
  const exceptions = [];
  for (const [index, exception] of (surface.evidenceExceptions ?? []).entries()) {
    for (const stateId of exception.stateIds ?? []) {
      if (!states.has(stateId)) {
        errors.push(
          `${label}.evidenceExceptions.${index}: unknown authority state ${stateId}.`,
        );
      }
    }
    exceptions.push({
      stateIds: [...(exception.stateIds ?? [])],
      evidence: [...(exception.evidence ?? [])],
      debtId: exception.debtId,
      reason: exception.reason,
    });
  }
  return exceptions;
}

function validateDimensionSelection({label, selection = {}, dimensions, errors}) {
  for (const [id, value] of Object.entries(selection ?? {})) {
    const dimension = dimensions[id];
    if (dimension == null) {
      errors.push(`${label}: unknown dimension ${id}.`);
      continue;
    }
    if (!dimension.values.includes(value)) {
      errors.push(`${label}: ${value} is not valid for ${id}.`);
    }
  }
}

function validateEvidence({
  label,
  stateId,
  evidence,
  authority,
  pathExists,
  requiredEvidence,
  evidenceExceptionMap,
  usedEvidenceExceptions,
  errors,
}) {
  validateRequiredEvidence({
    label,
    stateId,
    evidenceKind: "captures",
    isRequired: requiredEvidence.captures,
    hasEvidence: evidence.captureIds.length > 0,
    evidenceExceptionMap,
    usedEvidenceExceptions,
    errors,
  });
  for (const captureId of evidence.captureIds) {
    if (!authority.captureIds.has(captureId)) {
      errors.push(
        `${label}: capture ${captureId} is not registered on ${authority.registry}:${authority.id}.`,
      );
    }
  }
  validateRequiredEvidence({
    label,
    stateId,
    evidenceKind: "previews",
    isRequired: requiredEvidence.previews,
    hasEvidence: evidence.previewIds.length > 0,
    evidenceExceptionMap,
    usedEvidenceExceptions,
    errors,
  });
  validateRequiredEvidence({
    label,
    stateId,
    evidenceKind: "tests",
    isRequired: requiredEvidence.tests,
    hasEvidence: evidence.tests.length > 0,
    evidenceExceptionMap,
    usedEvidenceExceptions,
    errors,
  });
  for (const testPath of evidence.tests) {
    if (!pathExists(testPath)) errors.push(`${label}: test path does not exist: ${testPath}.`);
  }
}

function validateRequiredEvidence({
  label,
  stateId,
  evidenceKind,
  isRequired,
  hasEvidence,
  evidenceExceptionMap,
  usedEvidenceExceptions,
  errors,
}) {
  const key = evidenceExceptionKey(stateId, evidenceKind);
  const hasException = evidenceExceptionMap.has(key);
  if (hasEvidence) return;
  if (isRequired && hasException) {
    usedEvidenceExceptions.add(key);
    return;
  }
  if (!isRequired) return;
  const labelByKind = {
    captures: "capture evidence",
    previews: "preview evidence",
    tests: "test evidence",
  };
  errors.push(`${label}: ${labelByKind[evidenceKind]} is required.`);
}

function authorityItemExists(authority, authorityRegistries) {
  const registry = authorityRegistries[authority.registry];
  if (registry == null) return false;
  if (authority.registry === "flutter_screens") {
    return (registry.screens ?? []).some((item) => item.id === authority.id);
  }
  if (authority.registry === "marketing_routes") {
    return (registry.routes ?? []).some((item) => item.id === authority.id);
  }
  return (registry.components ?? [])
    .some((item) => item.id === authority.id && item.kind === "route");
}

function aggregateCoverage(surfaces) {
  const totals = {
    surfaces: surfaces.length,
    states: 0,
    scenarios: 0,
    actionCases: 0,
    actions: 0,
    captures: 0,
    previews: 0,
    testFiles: 0,
    evidenceExceptions: 0,
  };
  const captures = new Set();
  const previews = new Set();
  const tests = new Set();
  for (const surface of surfaces) {
    totals.states += surface.coverage.states;
    totals.scenarios += surface.coverage.scenarios;
    totals.actionCases += surface.coverage.actionCases;
    totals.actions += surface.coverage.actions;
    totals.evidenceExceptions += surface.coverage.evidenceExceptions;
    for (const scenario of surface.scenarios) {
      for (const id of scenario.evidence.captureIds) captures.add(id);
      for (const id of scenario.evidence.previewIds) previews.add(`${surface.id}:${id}`);
      for (const filePath of scenario.evidence.tests) tests.add(filePath);
    }
  }
  totals.captures = captures.size;
  totals.previews = previews.size;
  totals.testFiles = tests.size;
  return totals;
}

function componentProjection(component) {
  const preview = componentPreview(component);
  return Object.fromEntries(Object.entries({
    id: component.id,
    kind: component.kind,
    source: component.source,
    exportName: component.exportName,
    dart: component.dart,
    storybook: preview == null ? undefined : {
      status: preview.status,
      story: preview.story,
      exportName: preview.exportName,
      states: preview.states,
    },
  }).filter(([, value]) => value !== undefined));
}

function componentPreview(component) {
  return component.storybook ?? component.preview ?? null;
}

function componentAppliesToRoute(component, authorityId) {
  return component.id === authorityId || (component.routeIds ?? []).includes(authorityId);
}

function parseAdminCallableValidationCoverage(source) {
  const readArray = (property) => {
    const match = source.match(new RegExp(
      `"${property}"\\s*:\\s*(\\[[\\s\\S]*?\\])`,
      "u",
    ));
    if (match == null) return null;
    try {
      const value = JSON.parse(match[1]);
      return Array.isArray(value) && value.every((item) => typeof item === "string")
        ? new Set(value)
        : null;
    } catch {
      return null;
    }
  };
  const callables = readArray("names");
  const strictRequests = readArray("strictRequests");
  const strictResponses = readArray("strictResponses");
  return callables != null && strictRequests != null && strictResponses != null
    ? {callables, strictRequests, strictResponses}
    : null;
}

function evidenceExceptionKey(stateId, evidenceKind) {
  return `${stateId}:${evidenceKind}`;
}

export function parseWidgetbookPreviewIds(source) {
  const ids = new Set();
  const annotation = /@widgetbook\.UseCase\(([\s\S]*?)\n\)/gu;
  for (const match of source.matchAll(annotation)) {
    const body = match[1];
    const name = body.match(/\bname:\s*(['"])(.*?)\1/u)?.[2];
    const type = body.match(/\btype:\s*([A-Za-z_][A-Za-z0-9_]*)/u)?.[1];
    if (name != null && type != null) ids.add(`${type}/${name}`);
  }
  const annotatedBuilder =
    /@widgetbook\.UseCase\(([\s\S]*?)\n\)\s*Widget\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/gu;
  for (const match of source.matchAll(annotatedBuilder)) {
    ids.add(match[2]);
  }
  return ids;
}

function safeRead(filePath, readPath, errors) {
  try {
    return readPath(filePath);
  } catch (error) {
    errors.push(`${filePath}: unable to read (${error instanceof Error ? error.message : error}).`);
    return null;
  }
}

function hasDeclaredSymbol(source, symbol) {
  const keywordDeclaration = new RegExp(
    `\\b(?:class|enum|mixin|typedef|function|interface|type|const|let|var)\\s+` +
    `${escapeRegExp(symbol)}\\b`,
    "u",
  );
  const dartFunctionDeclaration = new RegExp(
    `(?:^|\\n)\\s*(?:[A-Za-z_]\\w*(?:<[^;\\n{}()]+>)?\\??)\\s+` +
    `${escapeRegExp(symbol)}\\s*(?:<[^;\\n{}()]+>)?\\(`,
    "u",
  );
  return keywordDeclaration.test(source) || dartFunctionDeclaration.test(source);
}

function hasWord(source, value) {
  return new RegExp(`\\b${escapeRegExp(value)}\\b`, "u").test(source);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function digest(value) {
  return `sha256:${crypto.createHash("sha256").update(canonicalJson(value)).digest("hex")}`;
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value != null && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${canonicalJson(value[key])}`
    ).join(",")}}`;
  }
  return JSON.stringify(value);
}

function uniqueSorted(values) {
  return [...new Set(values)].sort();
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function relative(filePath) {
  return path.relative(repoRoot, filePath).replaceAll(path.sep, "/");
}

function printSummary(artifact) {
  const coverage = artifact.coverage;
  console.log(
    `${artifact.feature.id}: ${coverage.surfaces} surface(s), ` +
    `${coverage.scenarios}/${coverage.states} states, ` +
    `${coverage.actionCases} action cases, ${coverage.actions} actions, ` +
    `${coverage.captures} captures, ${coverage.previews} previews, ` +
    `${coverage.testFiles} test files, ` +
    `${coverage.evidenceExceptions} evidence exceptions.`,
  );
}

function printHelp() {
  console.log(`Usage:
  node tool/design/build_feature_contracts.mjs
  node tool/design/build_feature_contracts.mjs --check
  node tool/design/build_feature_contracts.mjs --summary

Compiles design/features/*.feature.json multi-surface orchestration contracts
against the authoritative Flutter screen, marketing route, admin route,
component, preview, test, capture, action-owner, and data-contract sources. The
default command writes deterministic generated artifacts; --check fails when
those artifacts or their referenced evidence are stale.`);
}
