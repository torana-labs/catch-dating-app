import {matchesGlobPath} from "../../lib/path_glob.mjs";

const operationKeys = [
  "ciTargets",
  "checkIds",
  "codegenIds",
  "buildTargets",
];
const ciCheckoutKeys = ["planner", "default", "targetOverrides"];
const checkoutRequirementKeys = [
  "mode",
  "fetchDepth",
  "coneMode",
  "timeoutMinutes",
  "paths",
];

export function matchesGlob(value, pattern) {
  return matchesGlobPath(value, pattern);
}

export function validateComponentGraph(graph, {knownCheckIds} = {}) {
  const errors = [];
  if (!graph || typeof graph !== "object" || Array.isArray(graph)) {
    return ["Component graph must be a JSON object."];
  }

  const modes = uniqueStringSet(graph.modes, "modes", errors, {required: true});
  const targets = uniqueStringSet(graph.targets, "targets", errors, {required: true});
  const profiles = graph.operationProfiles;
  const components = Array.isArray(graph.components) ? graph.components : [];
  const classifications = Array.isArray(graph.classifications)
    ? graph.classifications
    : [];
  const generators = Array.isArray(graph.compileCodegen) ? graph.compileCodegen : [];
  validateCiCheckout(graph.ciCheckout, targets, errors);

  if (!profiles || typeof profiles !== "object" || Array.isArray(profiles)) {
    errors.push("operationProfiles must be an object.");
  }
  if (!Array.isArray(graph.components) || components.length === 0) {
    errors.push("components must be a non-empty array.");
  }
  if (!Array.isArray(graph.classifications)) {
    errors.push("classifications must be an array.");
  }
  if (!Array.isArray(graph.compileCodegen)) {
    errors.push("compileCodegen must be an array.");
  }

  const componentIds = collectUniqueIds(components, "component", errors);
  const classificationIds = collectUniqueIds(
    classifications,
    "classification",
    errors,
  );
  const generatorIds = collectUniqueIds(generators, "compileCodegen entry", errors);
  void classificationIds;

  for (const [profileId, profile] of Object.entries(profiles ?? {})) {
    if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
      errors.push(`Operation profile ${profileId} must be an object.`);
      continue;
    }
    for (const relationship of ["direct", "affected"]) {
      const modeOperations = profile[relationship];
      if (!modeOperations || typeof modeOperations !== "object" || Array.isArray(modeOperations)) {
        errors.push(`${profileId}.${relationship} must be an object.`);
        continue;
      }
      for (const [mode, operation] of Object.entries(modeOperations)) {
        if (!modes.has(mode)) {
          errors.push(`${profileId}.${relationship} uses unknown mode "${mode}".`);
        }
        validateOperation({
          operation,
          location: `${profileId}.${relationship}.${mode}`,
          targets,
          generatorIds,
          knownCheckIds,
          errors,
        });
      }
    }
  }

  const referencedProfiles = new Set();
  for (const component of components) {
    if (!component || typeof component !== "object" || Array.isArray(component)) continue;
    const location = component.id ?? "<missing component>";
    if (!component.owner) errors.push(`${location} must declare owner.`);
    if (!["low", "standard", "high"].includes(component.risk)) {
      errors.push(`${location} has invalid risk "${component.risk}".`);
    }
    if (!["terminal", "component", "consumer"].includes(component.pathType)) {
      errors.push(`${location} has invalid pathType "${component.pathType}".`);
    }
    if (!Object.hasOwn(profiles ?? {}, component.operationProfile)) {
      errors.push(`${location} references unknown operation profile "${component.operationProfile}".`);
    } else {
      referencedProfiles.add(component.operationProfile);
    }
    validateReferences(component.dependsOn, `${location}.dependsOn`, componentIds, errors);
    validateReferences(component.alsoAffects, `${location}.alsoAffects`, componentIds, errors);
    if (component.pathType === "component") {
      validatePathSet(component.ownedPaths, `${location}.ownedPaths`, errors);
    } else if (component.ownedPaths !== undefined) {
      errors.push(`${location} is ${component.pathType} and must not own paths.`);
    }
  }

  for (const profileId of Object.keys(profiles ?? {})) {
    if (!referencedProfiles.has(profileId)) {
      errors.push(`Operation profile "${profileId}" is not used by any component.`);
    }
  }

  const classifiedTerminalComponents = new Set();
  for (const classification of classifications) {
    if (!classification || typeof classification !== "object" || Array.isArray(classification)) {
      continue;
    }
    const location = classification.id ?? "<missing classification>";
    validatePathSet(classification.paths, `${location}.paths`, errors);
    if (classification.terminal !== true) {
      errors.push(`${location}.terminal must be true.`);
    }
    const references = uniqueStringSet(
      classification.components,
      `${location}.components`,
      errors,
      {required: true},
    );
    if (references.size !== 1) {
      errors.push(`${location} must resolve to exactly one terminal component.`);
    }
    for (const componentId of references) {
      if (!componentIds.has(componentId)) {
        errors.push(`${location} references unknown component "${componentId}".`);
        continue;
      }
      const component = components.find((candidate) => candidate.id === componentId);
      if (component?.pathType !== "terminal") {
        errors.push(`${location} references non-terminal component "${componentId}".`);
      } else {
        classifiedTerminalComponents.add(componentId);
      }
    }
  }

  for (const component of components) {
    if (component?.pathType === "terminal" && !classifiedTerminalComponents.has(component.id)) {
      errors.push(`Terminal component "${component.id}" has no classification.`);
    }
  }

  for (const generator of generators) {
    validateCodegen(generator, errors);
  }
  errors.push(...findPropagationCycles(components));
  return [...new Set(errors)];
}

export function resolveTargetCheckout({graph, target}) {
  const errors = [];
  const targets = uniqueStringSet(graph?.targets, "targets", errors, {required: true});
  validateCiCheckout(graph?.ciCheckout, targets, errors);
  if (!targets.has(target)) {
    errors.push(`Cannot resolve checkout for unknown CI target "${target}".`);
  }
  if (errors.length > 0) throw new Error([...new Set(errors)].join("\n"));
  const requirement = graph.ciCheckout.targetOverrides[target] ??
    graph.ciCheckout.default;
  return cloneCheckoutRequirement(requirement);
}

export function classifyPaths({changedPaths, graph}) {
  const componentById = new Map(graph.components.map((component) => [component.id, component]));
  const directComponents = new Set();
  const pathMatches = {};
  const unknownPaths = [];
  const ambiguousPaths = [];

  for (const changedPath of [...new Set(changedPaths.map(normalizePath))].sort()) {
    const classifications = graph.classifications.filter((classification) =>
      matchesPathSet(changedPath, classification.paths)
    );
    if (classifications.length > 1) {
      ambiguousPaths.push({
        path: changedPath,
        kind: "classification",
        matches: classifications.map((classification) => classification.id).sort(),
      });
      continue;
    }
    if (classifications.length === 1) {
      const classification = classifications[0];
      const components = [...classification.components].sort();
      for (const component of components) directComponents.add(component);
      pathMatches[changedPath] = {
        kind: "classification",
        owner: classification.id,
        components,
      };
      continue;
    }

    const owners = graph.components.filter((component) =>
      component.pathType === "component" &&
      matchesPathSet(changedPath, component.ownedPaths)
    );
    if (owners.length === 0) {
      unknownPaths.push(changedPath);
      continue;
    }
    if (owners.length > 1) {
      ambiguousPaths.push({
        path: changedPath,
        kind: "component",
        matches: owners.map((component) => component.id).sort(),
      });
      continue;
    }
    const owner = owners[0];
    if (!componentById.has(owner.id)) {
      unknownPaths.push(changedPath);
      continue;
    }
    directComponents.add(owner.id);
    pathMatches[changedPath] = {
      kind: "component",
      owner: owner.id,
      components: [owner.id],
    };
  }

  return {
    pathMatches,
    directComponents: [...directComponents].sort(),
    unknownPaths,
    ambiguousPaths,
  };
}

export function summarizeCoverage({paths, graph, sampleLimit = 25}) {
  const classification = classifyPaths({changedPaths: paths, graph});
  const totalPaths = [...new Set(paths.map(normalizePath))].length;
  const mappedPaths = Object.keys(classification.pathMatches).length;
  const unknownByRoot = {};
  for (const unknownPath of classification.unknownPaths) {
    const root = unknownPath.includes("/") ? unknownPath.split("/")[0] : "<root>";
    unknownByRoot[root] = (unknownByRoot[root] ?? 0) + 1;
  }
  return {
    totalPaths,
    mappedPaths,
    unknownPathCount: classification.unknownPaths.length,
    ambiguousPathCount: classification.ambiguousPaths.length,
    coveragePercent: totalPaths === 0
      ? 100
      : Number(((mappedPaths / totalPaths) * 100).toFixed(1)),
    unknownByRoot: Object.fromEntries(
      Object.entries(unknownByRoot).sort((left, right) =>
        right[1] - left[1] || left[0].localeCompare(right[0])
      ),
    ),
    unknownPathSample: classification.unknownPaths.slice(0, sampleLimit),
    ambiguousPathSample: classification.ambiguousPaths.slice(0, sampleLimit),
  };
}

export function planAffected({changedPaths, graph, mode = "pr", full = false}) {
  const validationErrors = validateComponentGraph(graph);
  if (validationErrors.length > 0) throw new Error(validationErrors.join("\n"));
  if (!graph.modes.includes(mode)) throw new Error(`Unknown harness mode "${mode}".`);
  if (full && mode !== "nightly") {
    throw new Error("Full component selection is validation-only and requires nightly mode.");
  }

  const classification = full
    ? {
        pathMatches: {},
        directComponents: graph.components.map((component) => component.id).sort(),
        unknownPaths: [],
        ambiguousPaths: [],
      }
    : classifyPaths({changedPaths, graph});
  const componentById = new Map(graph.components.map((component) => [component.id, component]));
  const direct = new Set(classification.directComponents);
  const selected = new Set(direct);
  const dependents = buildDependents(graph.components);
  const explanationEdges = [];
  const seenEdges = new Set();
  const queue = [...direct].sort();

  while (queue.length > 0) {
    const source = queue.shift();
    const component = componentById.get(source);
    const edges = [
      ...(dependents.get(source) ?? []).map((target) => ({target, kind: "dependsOn"})),
      ...(component.alsoAffects ?? []).map((target) => ({target, kind: "alsoAffects"})),
    ].sort((left, right) =>
      left.target.localeCompare(right.target) || left.kind.localeCompare(right.kind)
    );
    for (const edge of edges) {
      const key = `${source}\u0000${edge.target}\u0000${edge.kind}`;
      if (!seenEdges.has(key)) {
        seenEdges.add(key);
        explanationEdges.push({from: source, to: edge.target, kind: edge.kind});
      }
      if (selected.has(edge.target)) continue;
      selected.add(edge.target);
      queue.push(edge.target);
      queue.sort();
    }
  }

  const operations = Object.fromEntries(operationKeys.map((key) => [key, []]));
  const operationSources = Object.fromEntries(operationKeys.map((key) => [key, []]));
  for (const componentId of [...selected].sort()) {
    const component = componentById.get(componentId);
    const relationship = direct.has(componentId) ? "direct" : "affected";
    const profile = graph.operationProfiles[component.operationProfile];
    const operation = profile[relationship][mode] ?? {};
    for (const key of operationKeys) {
      for (const value of operation[key] ?? []) {
        if (!operations[key].includes(value)) operations[key].push(value);
        operationSources[key].push({component: componentId, relationship, value});
      }
    }
  }
  const normalizedChangedPaths = [...new Set(changedPaths.map(normalizePath))].sort();
  for (const entry of graph.compileCodegen) {
    const matchedPath = full
      ? "<nightly-full>"
      : normalizedChangedPaths.find((changedPath) =>
          matchesCodegenInput(changedPath, entry) ||
          entry.outputs.some((pattern) => matchesGlob(changedPath, pattern))
        );
    if (!matchedPath) continue;
    if (!operations.codegenIds.includes(entry.id)) operations.codegenIds.push(entry.id);
    operationSources.codegenIds.push({
      component: `compile-codegen:${entry.owner}`,
      relationship: "input-output",
      value: entry.id,
      path: matchedPath,
    });
  }
  for (const values of Object.values(operations)) values.sort();
  for (const values of Object.values(operationSources)) {
    values.sort((left, right) =>
      left.value.localeCompare(right.value) || left.component.localeCompare(right.component)
    );
  }

  const affectedComponents = [...selected].filter((componentId) => !direct.has(componentId)).sort();
  const highRiskDirectComponents = [...direct]
    .filter((componentId) => componentById.get(componentId).risk === "high")
    .sort();

  return {
    schemaVersion: graph.version,
    graphStatus: graph.status,
    mode,
    full,
    changedPaths: normalizedChangedPaths,
    pathMatches: classification.pathMatches,
    directComponents: [...direct].sort(),
    affectedComponents,
    selectedComponents: [...selected].sort(),
    explanationEdges,
    operations,
    operationSources,
    highRiskDirectComponents,
    unknownPaths: classification.unknownPaths,
    ambiguousPaths: classification.ambiguousPaths,
    complete: classification.unknownPaths.length === 0 &&
      classification.ambiguousPaths.length === 0,
  };
}

// The merge queue validates each group's exact combined source in merge_group
// mode before main moves. Pull requests defer the slow macOS and app-build
// lanes to that run instead of executing them twice.
export const queueOnlyCiTargets = Object.freeze([
  "flutter_build_android",
  "flutter_build_ios",
  "flutter_build_web",
  "flutter_web_smoke",
  "visual_integration",
]);

/** Returns a pull request plan without queue-only lanes, recording each one it deferred. */
export function deferQueueOnlyTargets(plan) {
  if (plan.mode !== "pr") return plan;
  const queueOnly = (target) => queueOnlyCiTargets.includes(target);
  return {
    ...plan,
    operations: {...plan.operations, ciTargets: plan.operations.ciTargets.filter((target) => !queueOnly(target))},
    operationSources: {
      ...plan.operationSources,
      ciTargets: (plan.operationSources?.ciTargets ?? []).filter((source) => !queueOnly(source.value)),
    },
    queueDeferredCiTargets: plan.operations.ciTargets.filter(queueOnly),
  };
}

export function deriveAppRoles(plan) {
  const roles = new Set();
  for (const target of plan.operations.buildTargets ?? []) {
    if (target.startsWith("consumer-")) roles.add("consumer");
    if (target.startsWith("host-")) roles.add("host");
  }
  const selectsPlatformBuild = (plan.operations.ciTargets ?? []).some((target) =>
    [
      "flutter_build_android",
      "flutter_build_ios",
      "flutter_build_web",
      "flutter_web_smoke",
    ].includes(target)
  );
  if (roles.size === 0 && selectsPlatformBuild) {
    roles.add("consumer");
    roles.add("host");
  }
  return [...roles].sort();
}

function validateOperation({
  operation,
  location,
  targets,
  generatorIds,
  knownCheckIds,
  errors,
}) {
  if (!operation || typeof operation !== "object" || Array.isArray(operation)) {
    errors.push(`${location} must be an object.`);
    return;
  }
  for (const key of Object.keys(operation)) {
    if (!operationKeys.includes(key)) errors.push(`${location} uses unknown key "${key}".`);
  }
  for (const key of operationKeys) {
    uniqueStringSet(operation[key], `${location}.${key}`, errors);
  }
  for (const target of operation.ciTargets ?? []) {
    if (!targets.has(target)) errors.push(`${location} references unknown CI target "${target}".`);
  }
  for (const generatorId of operation.codegenIds ?? []) {
    if (!generatorIds.has(generatorId)) {
      errors.push(`${location} references unknown compile-codegen id "${generatorId}".`);
    }
  }
  for (const checkId of operation.checkIds ?? []) {
    if (knownCheckIds && !knownCheckIds.has(checkId)) {
      errors.push(`${location} references unknown tool check id "${checkId}".`);
    }
  }
}

function validateCiCheckout(ciCheckout, targets, errors) {
  if (!ciCheckout || typeof ciCheckout !== "object" || Array.isArray(ciCheckout)) {
    errors.push("ciCheckout must be an object.");
    return;
  }
  for (const key of Object.keys(ciCheckout)) {
    if (!ciCheckoutKeys.includes(key)) errors.push(`ciCheckout uses unknown key "${key}".`);
  }
  validateCheckoutRequirement(ciCheckout.planner, "ciCheckout.planner", errors);
  validateCheckoutRequirement(ciCheckout.default, "ciCheckout.default", errors);
  if (ciCheckout.default?.mode !== "full") {
    errors.push("ciCheckout.default.mode must be \"full\" so undeclared targets widen safely.");
  }
  const overrides = ciCheckout.targetOverrides;
  if (!overrides || typeof overrides !== "object" || Array.isArray(overrides)) {
    errors.push("ciCheckout.targetOverrides must be an object.");
    return;
  }
  for (const [target, requirement] of Object.entries(overrides)) {
    if (!targets.has(target)) {
      errors.push(`ciCheckout.targetOverrides references unknown CI target "${target}".`);
    }
    validateCheckoutRequirement(
      requirement,
      `ciCheckout.targetOverrides.${target}`,
      errors,
    );
  }
}

function validateCheckoutRequirement(requirement, location, errors) {
  if (!requirement || typeof requirement !== "object" || Array.isArray(requirement)) {
    errors.push(`${location} must be an object.`);
    return;
  }
  for (const key of Object.keys(requirement)) {
    if (!checkoutRequirementKeys.includes(key)) {
      errors.push(`${location} uses unknown key "${key}".`);
    }
  }
  if (!["full", "sparse"].includes(requirement.mode)) {
    errors.push(`${location}.mode must be "full" or "sparse".`);
  }
  if (
    !Number.isInteger(requirement.fetchDepth) ||
    requirement.fetchDepth < 0 ||
    requirement.fetchDepth > 1000
  ) {
    errors.push(`${location}.fetchDepth must be an integer from 0 through 1000.`);
  }
  if (
    !Number.isInteger(requirement.timeoutMinutes) ||
    requirement.timeoutMinutes < 1 ||
    requirement.timeoutMinutes > 10
  ) {
    errors.push(`${location}.timeoutMinutes must be an integer from 1 through 10.`);
  }
  if (requirement.mode === "sparse") {
    if (typeof requirement.coneMode !== "boolean") {
      errors.push(`${location}.coneMode must be a boolean for sparse checkout.`);
    }
    const paths = uniqueStringSet(
      requirement.paths,
      `${location}.paths`,
      errors,
      {required: true},
    );
    for (const checkoutPath of paths) {
      validateCheckoutPath(checkoutPath, `${location}.paths`, errors);
    }
  } else {
    if (requirement.coneMode !== undefined) {
      errors.push(`${location}.coneMode is only valid for sparse checkout.`);
    }
    if (requirement.paths !== undefined) {
      errors.push(`${location}.paths is only valid for sparse checkout.`);
    }
  }
}

function validateCheckoutPath(checkoutPath, location, errors) {
  const repoPath = checkoutPath.startsWith("/") ? checkoutPath.slice(1) : "";
  const segments = repoPath.split("/");
  if (
    !checkoutPath.startsWith("/") ||
    repoPath !== normalizePath(repoPath) ||
    repoPath.startsWith("!") ||
    repoPath.endsWith("/") ||
    segments.some((segment) => segment === "" || segment === "." || segment === "..") ||
    /[\u0000-\u001f*?\[\]]/u.test(repoPath)
  ) {
    errors.push(
      `${location} contains unsafe or non-canonical root pattern ${JSON.stringify(checkoutPath)}.`,
    );
  }
}

function cloneCheckoutRequirement(requirement) {
  return {
    mode: requirement.mode,
    fetchDepth: requirement.fetchDepth,
    ...(requirement.coneMode === undefined ? {} : {coneMode: requirement.coneMode}),
    timeoutMinutes: requirement.timeoutMinutes,
    ...(requirement.paths === undefined ? {} : {paths: [...requirement.paths]}),
  };
}

export function matchesCodegenInput(changedPath, entry) {
  return entry.inputs.some((pattern) => matchesGlob(changedPath, pattern)) &&
    !(entry.inputExcludes ?? []).some((pattern) => matchesGlob(changedPath, pattern));
}

function validateCodegenRequirements(entry, errors) {
  const location = `${entry.id}.checkRequirements`;
  const requirements = entry.checkRequirements;
  if (!requirements || typeof requirements !== "object" || Array.isArray(requirements)) {
    errors.push(`${location} must declare executables and packages.`);
    return;
  }
  for (const key of Object.keys(requirements)) {
    if (!["executables", "packages"].includes(key)) errors.push(`${location} uses unknown key "${key}".`);
  }
  const executables = uniqueStringSet(requirements.executables,
    `${location}.executables`, errors, {required: true});
  for (const executable of executables) {
    if (!["node", "npm", "dart", "flutter", "bash"].includes(executable)) {
      errors.push(`${location} uses unsupported executable "${executable}".`);
    }
  }
  if (typeof entry.checkCommand === "string" &&
      !executables.has(entry.checkCommand.trim().split(/\s+/u)[0])) {
    errors.push(`${location} must include the checkCommand executable.`);
  }
  if (!Array.isArray(requirements.packages)) {
    errors.push(`${location}.packages must be an array, including when empty.`);
    return;
  }
  const seen = new Set();
  for (const dependency of requirements.packages) {
    if (!dependency || typeof dependency !== "object" || Array.isArray(dependency) ||
        !["node", "dart"].includes(dependency.kind) ||
        typeof dependency.name !== "string" ||
        !/^(?:@[a-z0-9._-]+\/)?[a-zA-Z0-9._-]+$/u.test(dependency.name) ||
        typeof dependency.from !== "string" ||
        dependency.from.startsWith("/") || dependency.from !== normalizePath(dependency.from) ||
        dependency.from.split("/").some((segment) => ["", ".", "..", ".git"].includes(segment)) ||
        /[\u0000-\u001f*?\[\]]/u.test(dependency.from) ||
        Object.keys(dependency).some((key) => !["kind", "name", "from"].includes(key))) {
      errors.push(`${location}.packages contains an invalid package dependency.`);
      continue;
    }
    if (!executables.has(dependency.kind)) {
      errors.push(`${location} must include executable "${dependency.kind}" for ${dependency.name}.`);
    }
    const key = JSON.stringify([dependency.kind, dependency.name, dependency.from]);
    if (seen.has(key)) errors.push(`${location}.packages contains duplicate ${dependency.name}.`);
    seen.add(key);
  }
}

function validateCodegen(entry, errors) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return;
  const location = entry.id ?? "<missing compileCodegen entry>";
  if (!entry.owner) errors.push(`${location} must declare owner.`);
  uniqueStringSet(entry.inputs, `${location}.inputs`, errors, {required: true});
  uniqueStringSet(entry.outputs, `${location}.outputs`, errors, {required: true});
  uniqueStringSet(entry.inputExcludes, `${location}.inputExcludes`, errors);
  validateCodegenRequirements(entry, errors);
  uniqueStringSet(entry.platforms, `${location}.platforms`, errors, {required: true});
  if (entry.deterministic !== true) errors.push(`${location}.deterministic must be true.`);
  if (entry.network !== false) errors.push(`${location}.network must be false.`);
  if (!Number.isInteger(entry.timeoutSeconds) || entry.timeoutSeconds < 1 || entry.timeoutSeconds > 600) {
    errors.push(`${location}.timeoutSeconds must be an integer from 1 through 600.`);
  }
  if (!entry.checkCommand || !entry.writeCommand) {
    errors.push(`${location} must declare checkCommand and writeCommand.`);
    return;
  }
  if (entry.checkCommand === entry.writeCommand) {
    errors.push(`${location} checkCommand and writeCommand must differ.`);
  }
  for (const [kind, command] of [
    ["checkCommand", entry.checkCommand],
    ["writeCommand", entry.writeCommand],
  ]) {
    try {
      parseCommand(command);
    } catch (error) {
      errors.push(`${location}.${kind}: ${error.message}`);
    }
  }
  const check = entry.checkCommand.toLowerCase();
  if (!/(--check|check:|:check|--self-test|\btest\b)/.test(check)) {
    errors.push(`${location}.checkCommand must use an explicit check or test mode.`);
  }
  if (/\b(firebase|gcloud|curl|wget)\b/.test(check)) {
    errors.push(`${location}.checkCommand may not invoke a network or deployment CLI.`);
  }
  if (/(deploy|secrets?\s+versions?\s+access|--apply|\bbackfill\b|\brepair\b|\bmigrate\b|\bseed\b)/.test(check)) {
    errors.push(`${location}.checkCommand contains a forbidden mutation token.`);
  }
}

function parseCommand(command) {
  if (typeof command !== "string" || command.trim() === "") {
    throw new Error("command must be a non-empty string.");
  }
  if (/[;&|><`\n\r$()]/.test(command)) {
    throw new Error("shell operators, substitutions, and redirections are forbidden.");
  }
  const tokens = command.trim().split(/\s+/);
  if (!["node", "npm", "dart", "flutter", "bash"].includes(tokens[0])) {
    throw new Error(`unsupported executable "${tokens[0]}".`);
  }
  return tokens;
}

function validatePathSet(pathSet, location, errors) {
  if (!pathSet || typeof pathSet !== "object" || Array.isArray(pathSet)) {
    errors.push(`${location} must be an object.`);
    return;
  }
  uniqueStringSet(pathSet.include, `${location}.include`, errors, {required: true});
  uniqueStringSet(pathSet.exclude, `${location}.exclude`, errors);
}

function matchesPathSet(changedPath, pathSet) {
  if (!pathSet) return false;
  const included = (pathSet.include ?? []).some((pattern) => matchesGlob(changedPath, pattern));
  if (!included) return false;
  return !(pathSet.exclude ?? []).some((pattern) => matchesGlob(changedPath, pattern));
}

function collectUniqueIds(entries, label, errors) {
  const ids = new Set();
  for (const entry of entries) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry) || !entry.id) {
      errors.push(`${label} is missing id.`);
      continue;
    }
    if (ids.has(entry.id)) errors.push(`Duplicate ${label} id "${entry.id}".`);
    ids.add(entry.id);
  }
  return ids;
}

function uniqueStringSet(value, location, errors, {required = false} = {}) {
  if (value === undefined && !required) return new Set();
  if (!Array.isArray(value)) {
    errors.push(`${location} must be an array.`);
    return new Set();
  }
  if (required && value.length === 0) errors.push(`${location} must not be empty.`);
  const result = new Set();
  for (const item of value) {
    if (typeof item !== "string" || item.length === 0) {
      errors.push(`${location} entries must be non-empty strings.`);
      continue;
    }
    if (result.has(item)) errors.push(`${location} contains duplicate "${item}".`);
    result.add(item);
  }
  return result;
}

function validateReferences(values, location, componentIds, errors) {
  if (!Array.isArray(values)) {
    errors.push(`${location} must be an array.`);
    return;
  }
  const references = uniqueStringSet(values, location, errors);
  for (const reference of references) {
    if (!componentIds.has(reference)) errors.push(`${location} references unknown "${reference}".`);
  }
}

function buildDependents(components) {
  const dependents = new Map(components.map((component) => [component.id, []]));
  for (const component of components) {
    for (const dependency of component.dependsOn ?? []) {
      dependents.get(dependency)?.push(component.id);
    }
  }
  for (const entries of dependents.values()) entries.sort();
  return dependents;
}

function findPropagationCycles(components) {
  const adjacency = new Map(components.map((component) => [component.id, new Set()]));
  for (const component of components) {
    for (const dependency of component.dependsOn ?? []) {
      adjacency.get(dependency)?.add(component.id);
    }
    for (const target of component.alsoAffects ?? []) adjacency.get(component.id)?.add(target);
  }
  const visiting = new Set();
  const visited = new Set();
  const errors = [];

  function visit(node, stack) {
    if (visiting.has(node)) {
      const start = stack.indexOf(node);
      errors.push(`Propagation cycle: ${[...stack.slice(start), node].join(" -> ")}.`);
      return;
    }
    if (visited.has(node)) return;
    visiting.add(node);
    stack.push(node);
    for (const next of adjacency.get(node) ?? []) visit(next, stack);
    stack.pop();
    visiting.delete(node);
    visited.add(node);
  }
  for (const component of components) visit(component.id, []);
  return errors;
}

function normalizePath(value) {
  return String(value).replaceAll("\\", "/").replace(/^\.\//, "");
}
