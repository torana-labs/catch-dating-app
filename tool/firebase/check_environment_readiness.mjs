#!/usr/bin/env node
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";

import {materializedNonSecretParams} from "./prepare_functions_params_for_deploy.mjs";
import {collectFunctionBindingIntent, discoverFunctionExportNames} from "./function_binding_intent.mjs";

import {inspectUploadIdentity, uploadIdentityTarget} from "./form_upload_identity.mjs";

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const defaultRepoRoot = path.resolve(toolDir, "../..");
const supportedRequirementKinds = new Set([
  "secret-version",
  "secret-reference",
  "firestore-ttl",
  "form-upload-identity",
]);
const deployTargetPattern = /^[A-Za-z0-9_.-]+(?::[A-Za-z0-9_.-]+)*$/u;
const capabilityPattern = /^[a-z][a-z0-9-]*$/u;
const secretNamePattern = /^[A-Z][A-Z0-9_]*$/u;
const supportedSecretRuntimeRoles = new Set([
  "roles/secretmanager.secretAccessor",
  "roles/secretmanager.secretVersionManager",
]);
const resourceNamePattern = /^[A-Za-z][A-Za-z0-9_-]*$/u;
const projectIdPattern = /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/u;
const projectNumberPattern = /^[1-9][0-9]*$/u;
const serviceAccountPattern = /^[a-zA-Z0-9][a-zA-Z0-9._-]*@[a-zA-Z0-9.-]+\.gserviceaccount\.com$/u;
const numericReferencePattern = /^projects\/([a-z0-9-]+)\/secrets\/([A-Za-z0-9_-]{1,255})\/versions\/([1-9][0-9]*)$/u;
const metadataCommandTimeoutMs = 15_000;
// Listing every v2 function in one call grows with the function count: prod
// took about 27 s for 704 functions on 2026-10-29, past the per-call limit,
// which made every secret binding unknown and blocked the deploy.
export const functionListingTimeoutMs = 120_000;

export class ReadinessUsageError extends Error {
  constructor(message) {
    super(message);
    this.name = "ReadinessUsageError";
    this.exitCode = 64;
  }
}

export function parseArgs(argv) {
  const parsed = {
    all: false,
    candidate: null,
    sourceRoot: null,
    sourceSha: null,
    paramsProvenance: null,
    writeCandidate: null,
    phase: "deployed",
    capabilities: [],
    environment: null,
    help: false,
    json: false,
    manifestOnly: false,
    targets: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--all") parsed.all = true;
    else if (arg === "--env") {
      parsed.environment = requireValue(argv, ++index, arg);
    } else if (arg === "--targets") {
      parsed.targets.push(...parseCsv(requireValue(argv, ++index, arg), arg));
    } else if (arg === "--capability" || arg === "--capabilities") {
      parsed.capabilities.push(
        ...parseCsv(requireValue(argv, ++index, arg), arg),
      );
    } else if (arg === "--candidate") parsed.candidate = requireValue(argv, ++index, arg);
    else if (arg === "--source-root") parsed.sourceRoot = requireValue(argv, ++index, arg);
    else if (arg === "--source-sha") parsed.sourceSha = requireValue(argv, ++index, arg);
    else if (arg === "--params-provenance") parsed.paramsProvenance = requireValue(argv, ++index, arg);
    else if (arg === "--write-candidate") parsed.writeCandidate = requireValue(argv, ++index, arg);
    else if (arg === "--phase") parsed.phase = requireValue(argv, ++index, arg);
    else if (arg === "--manifest-only") parsed.manifestOnly = true;
    else if (arg === "--json") parsed.json = true;
    else if (arg === "--help" || arg === "-h") parsed.help = true;
    else throw new ReadinessUsageError(`Unknown argument: ${arg}`);
  }

  parsed.targets = [...new Set(parsed.targets)].sort();
  parsed.capabilities = [...new Set(parsed.capabilities)].sort();
  if (parsed.help) return parsed;
  if (!["candidate", "deployed"].includes(parsed.phase) ||
      (parsed.phase === "candidate" && !parsed.candidate && !parsed.writeCandidate)) {
    throw new ReadinessUsageError("Candidate phase requires --candidate metadata; phase must be candidate or deployed.");
  }

  if (parsed.writeCandidate && (parsed.phase !== "candidate" || parsed.candidate || parsed.all ||
      !parsed.paramsProvenance || !parsed.sourceRoot || !parsed.sourceSha) ||
      parsed.paramsProvenance && !parsed.writeCandidate ||
      parsed.sourceSha && !/^[a-f0-9]{40}$/u.test(parsed.sourceSha)) {
    throw new ReadinessUsageError("Candidate generation requires one environment, approved source root/SHA and parameter provenance.");
  }

  for (const target of parsed.targets) {
    if (!deployTargetPattern.test(target)) {
      throw new ReadinessUsageError(`Invalid deploy target: ${target}`);
    }
  }
  for (const capability of parsed.capabilities) {
    if (!capabilityPattern.test(capability)) {
      throw new ReadinessUsageError(`Invalid capability: ${capability}`);
    }
  }

  if (parsed.manifestOnly) {
    if (parsed.all || parsed.environment || parsed.targets.length > 0 ||
        parsed.capabilities.length > 0 || parsed.candidate) {
      throw new ReadinessUsageError(
        "--manifest-only cannot be combined with live environment selectors.",
      );
    }
    return parsed;
  }
  if (parsed.all === Boolean(parsed.environment)) {
    throw new ReadinessUsageError(
      "Choose exactly one of --env <environment> or --all.",
    );
  }
  if (parsed.targets.length === 0 && parsed.capabilities.length === 0) {
    throw new ReadinessUsageError(
      "Live readiness requires --targets and/or --capabilities.",
    );
  }
  return parsed;
}

export function validateEnvironmentReadinessManifest(
  manifest,
  {
    discoveredSecrets,
    directReaderPaths,
    functionTargets,
    sourcePathExists,
    unsupportedSecretDeclarations = [],
  } = {},
) {
  const errors = [];
  const manifestEnvironments = Array.isArray(manifest?.environments)
    ? manifest.environments
    : [];
  const requirements = Array.isArray(manifest?.requirements)
    ? manifest.requirements
    : [];
  const selectorDeployTargets = manifest?.selectors?.deployTargets;
  const selectorCapabilities = manifest?.selectors?.capabilities;
  if (manifest?.version !== 1) {
    errors.push("version must be 1.");
  }
  if (manifestEnvironments.length === 0) {
    errors.push("environments must be a non-empty array.");
  }
  const environments = new Set(manifestEnvironments);
  if (environments.size !== manifestEnvironments.length) {
    errors.push("environments must not contain duplicates.");
  }
  for (const environment of environments) {
    if (typeof environment !== "string" ||
        !capabilityPattern.test(environment)) {
      errors.push(`invalid environment: ${environment}.`);
    }
  }
  if (requirements.length === 0) {
    errors.push("requirements must be a non-empty array.");
  }
  validateStringArray({
    errors,
    key: "selectors.deployTargets",
    label: "manifest",
    value: selectorDeployTargets,
  });
  validateStringArray({
    errors,
    key: "selectors.capabilities",
    label: "manifest",
    value: selectorCapabilities,
  });
  const knownDeployTargets = new Set(selectorDeployTargets ?? []);
  const knownCapabilities = new Set(selectorCapabilities ?? []);
  for (const target of knownDeployTargets) {
    if (!deployTargetPattern.test(target)) {
      errors.push(`manifest: invalid deploy selector ${target}.`);
    }
  }
  for (const capability of knownCapabilities) {
    if (!capabilityPattern.test(capability)) {
      errors.push(`manifest: invalid capability selector ${capability}.`);
    }
  }

  const ids = new Set();
  const manifestSecrets = new Set();
  for (const requirement of requirements) {
    const label = requirement?.id ?? "<missing id>";
    if (!requirement || typeof requirement !== "object") {
      errors.push("every requirement must be an object.");
      continue;
    }
    if (typeof requirement.id !== "string" || requirement.id.trim() === "") {
      errors.push(`${label}: id is required.`);
    } else if (ids.has(requirement.id)) {
      errors.push(`${label}: duplicate id.`);
    }
    ids.add(requirement.id);
    if (!supportedRequirementKinds.has(requirement.kind)) {
      errors.push(`${label}: unsupported kind ${requirement.kind}.`);
    }
    const requirementEnvironments = Array.isArray(requirement.environments)
      ? requirement.environments
      : [];
    const acceptedStates = Array.isArray(requirement.acceptedStates)
      ? requirement.acceptedStates
      : [];
    const sourcePaths = Array.isArray(requirement.sourcePaths)
      ? requirement.sourcePaths
      : [];
    validateStringArray({
      errors,
      key: "environments",
      label,
      value: requirement.environments,
    });
    for (const environment of requirementEnvironments) {
      if (!environments.has(environment)) {
        errors.push(`${label}: unknown environment ${environment}.`);
      }
    }
    validateStringArray({
      errors,
      key: "acceptedStates",
      label,
      value: requirement.acceptedStates,
    });
    validateStringArray({
      errors,
      key: "sourcePaths",
      label,
      value: requirement.sourcePaths,
    });
    if (typeof requirement.owner !== "string" ||
        requirement.owner.trim() === "") {
      errors.push(`${label}: owner is required.`);
    }
    for (const sourcePath of sourcePaths) {
      if (typeof sourcePath !== "string") continue;
      if (path.isAbsolute(sourcePath) || sourcePath.split(/[\\/]/u).includes("..")) {
        errors.push(`${label}: source path must stay inside the repo: ${sourcePath}.`);
      } else if (sourcePathExists && !sourcePathExists(sourcePath)) {
        errors.push(`${label}: source path does not exist: ${sourcePath}.`);
      }
    }

    const requiredWhen = requirement.requiredWhen;
    if (!requiredWhen || typeof requiredWhen !== "object") {
      errors.push(`${label}: requiredWhen is required.`);
    } else {
      const deployTargets = Array.isArray(requiredWhen.anyDeployTarget)
        ? requiredWhen.anyDeployTarget
        : [];
      const capabilities = Array.isArray(requiredWhen.anyCapability)
        ? requiredWhen.anyCapability
        : [];
      if (requiredWhen.anyDeployTarget != null) {
        validateStringArray({
          errors,
          key: "requiredWhen.anyDeployTarget",
          label,
          value: deployTargets,
        });
      }
      if (requiredWhen.anyCapability != null) {
        validateStringArray({
          errors,
          key: "requiredWhen.anyCapability",
          label,
          value: capabilities,
        });
      }
      if (deployTargets.length === 0 && capabilities.length === 0) {
        errors.push(`${label}: requiredWhen must select a target or capability.`);
      }
      for (const target of deployTargets) {
        if (typeof target !== "string" || !deployTargetPattern.test(target)) {
          errors.push(`${label}: invalid deploy target ${target}.`);
        } else if (target.startsWith("functions:") &&
            functionTargets && !functionTargets.has(target)) {
          errors.push(`${label}: Function target is not exported: ${target}.`);
        } else if (!target.startsWith("functions:") &&
            !knownDeployTargets.has(target)) {
          errors.push(`${label}: undeclared deploy selector ${target}.`);
        }
      }
      for (const capability of capabilities) {
        if (typeof capability !== "string" ||
            !capabilityPattern.test(capability)) {
          errors.push(`${label}: invalid capability ${capability}.`);
        } else if (!knownCapabilities.has(capability)) {
          errors.push(`${label}: undeclared capability selector ${capability}.`);
        }
      }
    }

    if (requirement.kind === "secret-version") {
      if (!secretNamePattern.test(requirement.name ?? "")) {
        errors.push(`${label}: invalid secret name.`);
      } else if (manifestSecrets.has(requirement.name)) {
        errors.push(`${label}: duplicate secret ${requirement.name}.`);
      }
      manifestSecrets.add(requirement.name);
      if (acceptedStates.length !== 1 || acceptedStates[0] !== "ENABLED") {
        errors.push(`${label}: secret versions must accept only ENABLED.`);
      }
      if (requirement.runtimeRoles != null) {
        validateStringArray({
          errors,
          key: "runtimeRoles",
          label,
          value: requirement.runtimeRoles,
        });
        for (const role of requirement.runtimeRoles ?? []) {
          if (!supportedSecretRuntimeRoles.has(role)) {
            errors.push(`${label}: unsupported runtime role ${role}.`);
          }
        }
        if (!(requirement.runtimeRoles ?? []).includes(
          "roles/secretmanager.secretAccessor"
        )) {
          errors.push(`${label}: runtimeRoles must include secretAccessor.`);
        }
      }
    } else if (requirement.kind === "form-upload-identity") {
      if (!["upload", "review"].includes(requirement.purpose)) {
        errors.push(`${label}: form asset purpose must be upload or review.`);
      }
      if (acceptedStates.length !== 1 || acceptedStates[0] !== "READY") {
        errors.push(`${label}: upload identity must accept only READY.`);
      }
    } else if (requirement.kind === "firestore-ttl") {
      if (!resourceNamePattern.test(requirement.collectionGroup ?? "")) {
        errors.push(`${label}: invalid collectionGroup.`);
      }
      if (!resourceNamePattern.test(requirement.field ?? "")) {
        errors.push(`${label}: invalid TTL field.`);
      }
      if (acceptedStates.length !== 1 || acceptedStates[0] !== "ACTIVE") {
        errors.push(`${label}: Firestore TTL must accept only ACTIVE.`);
      }
    }
  }

  for (const sourcePath of unsupportedSecretDeclarations) {
    errors.push(
      `defineSecret must use a literal name for offline discovery: ${sourcePath}.`,
    );
  }
  if (discoveredSecrets) {
    for (const secret of [...discoveredSecrets].sort()) {
      if (!manifestSecrets.has(secret)) {
        errors.push(`defineSecret is missing from the manifest: ${secret}.`);
      }
    }
    for (const secret of [...manifestSecrets].sort()) {
      if (!discoveredSecrets.has(secret)) {
        errors.push(`manifest secret is not declared with defineSecret: ${secret}.`);
      }
    }
  }

  const readerPaths = new Set();
  for (const reader of manifest.directReaders ?? []) {
    const label = reader?.id ?? "<direct reader>";
    if (ids.has(label)) errors.push(`${label}: duplicate id.`);
    ids.add(label);
    if (!Array.isArray(reader.sourcePaths) || !reader.sourcePaths.length ||
        !Array.isArray(reader.consumers) || !reader.consumers.length ||
        !reader.owner || !reader.credentialClass || !reader.rotationCompatibility ||
        !reader.activationPolicy || typeof reader.recordReferences !== "boolean" ||
        !["parameter", "record"].includes(reader.binding?.kind) ||
        reader.binding?.exactReference !== "same-project-numeric" ||
        reader.binding?.identity !== "observed-function-service-account") {
      errors.push(`${label}: incomplete direct-reader contract.`);
      continue;
    }
    if (reader.binding.kind === "parameter" &&
        (!secretNamePattern.test(reader.binding.parameter ?? "") ||
          typeof reader.binding.optional !== "boolean" ||
          reader.binding.enabledParameter && !secretNamePattern.test(reader.binding.enabledParameter))) {
      errors.push(`${label}: invalid reference/activation parameter.`);
    }
    for (const consumer of reader.consumers) {
      if (!/^[A-Za-z][A-Za-z0-9_]*$/u.test(consumer) ||
          functionTargets && !functionTargets.has(`functions:${consumer}`)) {
        errors.push(`${label}: unsupported direct-reader consumer.`);
      }
    }
    for (const source of reader.sourcePaths) {
      if (readerPaths.has(source)) errors.push(`${label}: duplicate reader source.`);
      readerPaths.add(source);
      if (!source.startsWith("functions/src/") || source.includes("..") ||
          sourcePathExists && !sourcePathExists(source)) errors.push(`${label}: invalid reader source.`);
    }
  }
  if (directReaderPaths) {
    for (const source of directReaderPaths) {
      if (!readerPaths.has(source)) errors.push(`Direct secret reader is missing from manifest: ${source}.`);
    }
    for (const source of readerPaths) {
      if (!directReaderPaths.has(source)) errors.push(`Manifest direct reader is not found in source: ${source}.`);
    }
  }
  for (const requirement of requirements.filter((item) => item.kind === "secret-version")) {
    if (!requirement.credentialClass || !requirement.rotationCompatibility ||
        requirement.binding?.kind !== "firebase-secret-param" ||
        requirement.binding?.exactReference !== "observed-numeric-version" ||
        requirement.binding?.identity !== "observed-function-service-account") {
      errors.push(`${requirement.id}: incomplete secret binding contract.`);
    }
    for (const [consumer, roles] of Object.entries(requirement.runtimeRolesByConsumer ?? {})) {
      if (!requirement.requiredWhen.anyDeployTarget.includes(`functions:${consumer}`) ||
          !Array.isArray(roles) || !roles.includes("roles/secretmanager.secretAccessor") ||
          roles.some((role) => !supportedSecretRuntimeRoles.has(role))) {
        errors.push(`${requirement.id}: invalid consumer runtime roles.`);
      }
    }
  }

  if (errors.length > 0) {
    throw new ReadinessUsageError(
      `Environment readiness manifest is invalid:\n- ${errors.join("\n- ")}`,
    );
  }
  return manifest;
}

export function discoverDefineSecretNames(sources) {
  const names = new Set();
  const unsupported = [];
  for (const source of sources) {
    const allCalls = [...source.contents.matchAll(/\bdefineSecret\s*\(/gu)];
    const literalCalls = [
      ...source.contents.matchAll(
        /\bdefineSecret\s*\(\s*(["'])([A-Z][A-Z0-9_]*)\1\s*\)/gu,
      ),
    ];
    if (allCalls.length !== literalCalls.length) unsupported.push(source.path);
    for (const match of literalCalls) names.add(match[2]);
  }
  return {names, unsupported};
}

export function discoverDirectSecretReaders(sources) {
  return new Set(sources.filter((source) =>
    /\.accessSecretVersion\s*\(/u.test(source.contents) ||
    /\breadRcsSecret\s*\(/u.test(source.contents) && !source.path.endsWith("rcsCredentialStore.ts"))
    .map((source) => source.path));
}

function bindingRequirements(manifest) {
  return [...manifest.requirements, ...(manifest.directReaders ?? [])
    .filter((reader) => reader.binding.kind === "parameter")
    .map((reader) => ({...reader, kind: "secret-reference", name: reader.binding.secret,
      environments: manifest.environments, acceptedStates: ["ENABLED"],
      requiredWhen: {anyDeployTarget: reader.consumers.map((name) => `functions:${name}`)}}))];
}

export function parseFirebaseFunctionTargets(indexSource) {
  try {
    return new Set(discoverFunctionExportNames(indexSource).map((name) => `functions:${name}`));
  } catch {
    throw new ReadinessUsageError("Firebase Function exports require statically resolved explicit names.");
  }
}

export function parseFirebaseProjectAliases(contents) {
  let parsed;
  try {
    parsed = JSON.parse(contents);
  } catch {
    throw new ReadinessUsageError(".firebaserc is not valid JSON.");
  }
  if (!parsed.projects || typeof parsed.projects !== "object") {
    throw new ReadinessUsageError(".firebaserc does not declare projects.");
  }
  return parsed.projects;
}

export function resolveFirebaseProjectId({environment, aliases}) {
  const projectId = aliases[environment];
  if (typeof projectId !== "string" || !projectIdPattern.test(projectId)) {
    throw new ReadinessUsageError(
      `No valid Firebase project alias found for environment: ${environment}.`,
    );
  }
  return projectId;
}

export function selectReadinessRequirements({
  capabilities = [],
  environment,
  manifest,
  targets = [],
}) {
  const selectedTargets = new Set(targets);
  const selectedCapabilities = new Set(capabilities);
  return bindingRequirements(manifest)
    .filter((requirement) => requirement.environments.includes(environment))
    .filter((requirement) => {
      const targetMatch = (requirement.requiredWhen.anyDeployTarget ?? [])
        .some((target) => targetMatches(target, selectedTargets));
      const capabilityMatch = (requirement.requiredWhen.anyCapability ?? [])
        .some((capability) => selectedCapabilities.has(capability));
      return targetMatch || capabilityMatch;
    })
    .sort((left, right) => left.id.localeCompare(right.id));
}

export function validateReadinessSelectors({
  capabilities = [],
  functionTargets,
  manifest,
  targets = [],
}) {
  const knownTargets = new Set(manifest.selectors.deployTargets);
  const knownCapabilities = new Set(manifest.selectors.capabilities);
  for (const target of targets) {
    if (target.startsWith("functions:")) {
      if (!functionTargets.has(target)) {
        throw new ReadinessUsageError(
          `Unknown Firebase Function deploy target: ${target}.`,
        );
      }
    } else if (!knownTargets.has(target)) {
      throw new ReadinessUsageError(
        `Unknown Firebase deploy target: ${target}.`,
      );
    }
  }
  for (const capability of capabilities) {
    if (!knownCapabilities.has(capability)) {
      throw new ReadinessUsageError(
        `Unknown environment capability: ${capability}.`,
      );
    }
  }
}

export function buildProjectIdentityCommand(projectId) {
  validateProjectId(projectId);
  return metadataOnlyCommand([
    "projects",
    "describe",
    projectId,
    "--format=json(projectId,projectNumber,lifecycleState)",
    "--quiet",
  ]);
}

export function buildSecretRuntimeAccessCommand({
  projectId,
  projectNumber,
  requirement,
}) {
  validateProjectId(projectId);
  if (!["secret-version", "secret-reference"].includes(requirement?.kind) ||
      !/^[A-Za-z0-9_-]{1,255}$/u.test(requirement.name ?? "")) {
    throw new ReadinessUsageError(
      "Secret runtime access probes require a valid secret-version requirement.",
    );
  }
  return metadataOnlyCommand([
    "secrets",
    "get-iam-policy",
    requirement.name,
    `--project=${projectId}`,
    "--format=json(bindings)",
    "--quiet",
  ]);
}

export function buildRequirementCommand({projectId, requirement, reference}) {
  validateProjectId(projectId);
  let args;
  if (["secret-version", "secret-reference"].includes(requirement.kind)) {
    const selected = parseSecretReference(reference, projectId);
    if (!selected || (requirement.name && selected.secret !== requirement.name)) {
      throw new ReadinessUsageError("An exact same-project numeric secret reference is required.");
    }
    args = ["secrets", "versions", "describe", selected.version,
      `--secret=${selected.secret}`, `--project=${projectId}`,
      "--format=json(name,state)", "--quiet"];
  } else if (requirement.kind === "firestore-ttl") {
    args = [
      "firestore",
      "fields",
      "ttls",
      "list",
      `--project=${projectId}`,
      "--database=(default)",
      `--collection-group=${requirement.collectionGroup}`,
      "--format=json(name,ttlConfig)",
      "--quiet",
    ];
  } else {
    throw new ReadinessUsageError(
      `Cannot build probe for requirement kind: ${requirement.kind}.`,
    );
  }
  return metadataOnlyCommand(args);
}

export function assertMetadataOnlyCommand(spec) {
  if (spec?.command !== "gcloud" || !Array.isArray(spec.args)) {
    throw new ReadinessUsageError("Readiness probes must use gcloud argv.");
  }
  const words = spec.args.map((arg) => String(arg).toLowerCase());
  for (let index = 0; index <= words.length - 3; index += 1) {
    if (words[index] === "secrets" && words[index + 1] === "versions" &&
        words[index + 2] === "access") {
      throw new ReadinessUsageError(
        "Secret payload access is forbidden in environment readiness.",
      );
    }
  }
  const allowed = (words[0] === "projects" && words[1] === "describe") ||
    words.slice(0, 3).join(" ") === "secrets versions describe" ||
    words.slice(0, 2).join(" ") === "functions list" ||
    words.slice(0, 2).join(" ") === "secrets get-iam-policy" ||
    words.slice(0, 4).join(" ") === "firestore fields ttls list";
  if (!allowed) {
    throw new ReadinessUsageError(
      `Unsupported readiness metadata command: ${words.slice(0, 4).join(" ")}.`,
    );
  }
  return spec;
}

export function classifyProjectIdentity({projectId, result}) {
  const failure = classifyCommandFailure(result);
  if (failure) {
    return readinessResult({
      id: "environment.project-identity",
      kind: "project-identity",
      resource: projectId,
      ...failure,
    });
  }
  const payload = parseJsonOutput(result.stdout);
  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return readinessResult({
      id: "environment.project-identity",
      kind: "project-identity",
      reason: "invalid-metadata-response",
      resource: projectId,
      status: "unknown",
    });
  }
  const projectNumberValid = projectNumberPattern.test(
    String(payload.projectNumber ?? ""),
  );
  if (payload.projectId !== projectId || payload.lifecycleState !== "ACTIVE" ||
      !projectNumberValid) {
    return readinessResult({
      id: "environment.project-identity",
      kind: "project-identity",
      metadata: {
        lifecycleState: ["ACTIVE", "DELETE_REQUESTED", "DELETE_IN_PROGRESS"].includes(payload.lifecycleState) ? payload.lifecycleState : null,
        projectIdMatches: payload.projectId === projectId,
        projectNumberPresent: projectNumberValid,
      },
      reason: "project-identity-not-active",
      resource: projectId,
      status: "not-ready",
    });
  }
  return readinessResult({
    id: "environment.project-identity",
    kind: "project-identity",
    metadata: {
      lifecycleState: payload.lifecycleState,
      projectNumber: String(payload.projectNumber),
    },
    reason: "project-active",
    resource: projectId,
    status: "ready",
  });
}

export function classifySecretRuntimeAccess({
  serviceAccount,
  requirement,
  result,
}) {
  if (!serviceAccountPattern.test(serviceAccount ?? "")) {
    return readinessResult({id: `${requirement.id}.runtime-access`,
      kind: "secret-runtime-access", resource: requirement.name,
      status: "unknown", reason: "runtime-identity-unobserved"});
  }
  const resource = `${requirement.name}:${serviceAccount}`;
  const failure = classifyCommandFailure(result);
  if (failure) {
    return readinessResult({
      id: `${requirement.id}.runtime-access`,
      kind: "secret-runtime-access",
      resource,
      ...failure,
    });
  }
  const payload = parseJsonOutput(result.stdout);
  if (!payload || Array.isArray(payload) || typeof payload !== "object" ||
      !Array.isArray(payload.bindings ?? [])) {
    return readinessResult({
      id: `${requirement.id}.runtime-access`,
      kind: "secret-runtime-access",
      reason: "invalid-metadata-response",
      resource,
      status: "unknown",
    });
  }
  const member = `serviceAccount:${serviceAccount}`;
  const requiredRoles = requirement.runtimeRoles ?? [
    "roles/secretmanager.secretAccessor",
  ];
  const presentRoles = requiredRoles.filter((role) =>
    (payload.bindings ?? []).some((binding) =>
      binding?.role === role &&
      binding.condition == null &&
      Array.isArray(binding.members) && binding.members.includes(member)));
  const excessiveRoles = [...supportedSecretRuntimeRoles, "roles/secretmanager.admin", "roles/editor", "roles/owner"].filter((role) =>
    !requiredRoles.includes(role) && (payload.bindings ?? []).some((binding) =>
      binding?.role === role && Array.isArray(binding.members) &&
      binding.members.includes(member)));
  if (excessiveRoles.length) {
    return readinessResult({id: `${requirement.id}.runtime-access`,
      kind: "secret-runtime-access", resource, status: "not-ready",
      reason: "runtime-secret-permission-leakage",
      metadata: {serviceAccount, excessiveRoles, evidenceScope: "secret-policy-only"}});
  }
  const missingRoles = requiredRoles.filter((role) =>
    !presentRoles.includes(role));
  if (missingRoles.length > 0) {
    return readinessResult({
      id: `${requirement.id}.runtime-access`,
      kind: "secret-runtime-access",
      metadata: {missingRoles, serviceAccount, evidenceScope: "secret-policy-only"},
      reason: "runtime-secret-access-unproven",
      resource,
      status: "not-ready",
    });
  }
  return readinessResult({
    id: `${requirement.id}.runtime-access`,
    kind: "secret-runtime-access",
    metadata: {
      roles: presentRoles,
      serviceAccount,
      evidenceScope: "secret-policy-only",
    },
    reason: "runtime-secret-access-present",
    resource,
    status: "ready",
  });
}

export function classifyRequirementResult({requirement, result, reference, projectId, projectNumber}) {
  const resource = ["secret-version", "secret-reference"].includes(requirement.kind)
    ? requirement.name
    : `${requirement.collectionGroup}.${requirement.field}`;
  const failure = classifyCommandFailure(result);
  if (failure) {
    return readinessResult({
      id: requirement.id,
      kind: requirement.kind,
      resource,
      ...failure,
    });
  }
  const payload = parseJsonOutput(result.stdout);
  if (["secret-version", "secret-reference"].includes(requirement.kind)) {
    const selected = parseSecretReference(reference, projectId, projectNumber);
    const observed = parseSecretReference(payload?.name, projectId, projectNumber);
    if (!selected || !observed || selected.reference !== observed.reference) {
      return readinessResult({id: requirement.id, kind: requirement.kind, resource,
        status: "unknown", reason: "selected-version-metadata-mismatch"});
    }
    const enabled = payload.state === "ENABLED";
    return readinessResult({id: requirement.id, kind: requirement.kind, resource,
      status: enabled ? "ready" : "not-ready",
      reason: enabled ? "selected-version-enabled" : "selected-version-not-enabled",
      metadata: {reference: selected.reference,
        state: ["ENABLED", "DISABLED", "DESTROYED"].includes(payload.state)
          ? payload.state : "UNKNOWN"}});
  }
  if (!Array.isArray(payload)) {
    return readinessResult({id: requirement.id, kind: requirement.kind, resource,
      status: "unknown", reason: "invalid-metadata-response"});
  }

  const ttl = payload.find((entry) =>
    resourceFieldName(entry?.name) === requirement.field);
  const rawState = ttl?.ttlConfig?.state;
  const state = ["ACTIVE", "CREATING", "NEEDS_REPAIR", "STATE_UNSPECIFIED"].includes(rawState) ? rawState : null;
  if (!ttl || !requirement.acceptedStates.includes(state)) {
    return readinessResult({
      id: requirement.id,
      kind: requirement.kind,
      metadata: {state: state ?? null},
      reason: ttl ? "ttl-not-active" : "ttl-policy-missing",
      resource,
      status: "not-ready",
    });
  }
  return readinessResult({
    id: requirement.id,
    kind: requirement.kind,
    metadata: {state},
    reason: "ttl-active",
    resource,
    status: "ready",
  });
}

// Project numbers are accepted only when independently resolved from the selected
// .firebaserc project. Direct parameter contracts remain project-ID pinned.
export function parseSecretReference(value, projectId, projectNumber) {
  if (typeof value !== "string") return null;
  const match = numericReferencePattern.exec(value);
  if (!match || !projectId || ![projectId, projectNumber].includes(match[1])) return null;
  return {secret: match[2], version: match[3],
    reference: `projects/${projectId}/secrets/${match[2]}/versions/${match[3]}`};
}

export function buildFunctionBindingsCommand({projectId, requirements}) {
  validateProjectId(projectId);
  const params = [...new Set(requirements.flatMap((entry) =>
    [entry.binding?.parameter, entry.binding?.enabledParameter, entry.binding?.policyParameter].filter(Boolean)))].sort();
  if (params.some((name) => !secretNamePattern.test(name))) {
    throw new ReadinessUsageError("Invalid binding metadata parameter name.");
  }
  const fields = ["name", "state", "serviceConfig.serviceAccountEmail",
    "serviceConfig.secretEnvironmentVariables", "serviceConfig.environmentVariables.CATCH_DEPLOY_CONFIG_SHA256", ...params.map((name) =>
      `serviceConfig.environmentVariables.${name}`)];
  return {...metadataOnlyCommand(["functions", "list", "--v2", "--regions=-",
    `--project=${projectId}`, `--format=json(${fields.join(",")})`, "--quiet"]),
  timeoutMs: functionListingTimeoutMs};
}

// Receipts contain references and identities, never dotenv values. Strict shape
// checks reject accidental raw environment/Secret Manager responses before use.
export function validateCandidateBindings(candidate, {environment, projectId, sourceSha, manifest}) {
  const invalid = () => { throw new ReadinessUsageError("Invalid candidate binding metadata; use names/references only for the exact source and environment."); };
  const keys = (value, expected) => value && typeof value === "object" && !Array.isArray(value) &&
    Object.keys(value).sort().join(",") === [...expected].sort().join(",");
  if (!keys(candidate, ["version", "sourceSha", "environment", "projectId", "bindings", "paramsSha256", "functions"]) ||
      candidate.version !== 1 || candidate.environment !== environment ||
      candidate.projectId !== projectId || !/^[a-f0-9]{40}$/u.test(candidate.sourceSha ?? "") ||
      !sourceSha || candidate.sourceSha !== sourceSha || !Array.isArray(candidate.bindings) ||
      !/^[a-f0-9]{64}$/u.test(candidate.paramsSha256 ?? "") || !Array.isArray(candidate.functions)) invalid();
  const functionNames = new Set();
  for (const fn of candidate.functions) {
    if (!keys(fn, ["consumer", "serviceAccount"]) || !/^[A-Za-z][A-Za-z0-9_]*$/u.test(fn.consumer ?? "") ||
        !serviceAccountPattern.test(fn.serviceAccount ?? "") || functionNames.has(fn.consumer)) invalid();
    functionNames.add(fn.consumer);
  }
  const seen = new Set();
  for (const entry of candidate.bindings) {
    if (!keys(entry, ["requirementId", "consumer", "serviceAccount", "reference", "active"])) invalid();
    const requirement = bindingRequirements(manifest).find((item) => item.id === entry.requirementId);
    if (!requirement || !["secret-version", "secret-reference"].includes(requirement.kind) ||
        !(requirement.requiredWhen.anyDeployTarget ?? []).includes(`functions:${entry.consumer}`) ||
        !serviceAccountPattern.test(entry.serviceAccount ?? "") || typeof entry.active !== "boolean") invalid();
    if (!candidate.functions.some((fn) => fn.consumer === entry.consumer && fn.serviceAccount === entry.serviceAccount)) invalid();
    const selected = parseSecretReference(entry.reference, projectId);
    if (selected && requirement.name && selected.secret !== requirement.name) invalid();
    if (entry.active ? !selected || requirement.name && selected.secret !== requirement.name :
      (entry.reference !== null && !selected) || requirement.binding?.optional !== true ||
        entry.reference !== null && !requirement.binding.enabledParameter && !requirement.binding.policyParameter) invalid();
    const key = `${entry.requirementId}:${entry.consumer}`;
    if (seen.has(key)) invalid();
    seen.add(key);
  }
  return candidate;
}

export function observeFunctionBinding({requirement, consumer, functions, projectId, projectNumber}) {
  const matches = functions.filter((entry) => {
    const match = /^projects\/([^/]+)\/locations\/[^/]+\/functions\/([^/]+)$/u.exec(entry?.name ?? "");
    return match && [projectId, projectNumber].includes(match[1]) && match[2] === consumer;
  });
  const fail = (reason, status = "not-ready") => ({status, reason});
  if (matches.length !== 1) return fail(matches.length ? "ambiguous-function-binding" : "function-binding-missing");
  const fn = matches[0];
  if (fn.state !== "ACTIVE") return fail("function-not-active");
  const serviceAccount = fn.serviceConfig?.serviceAccountEmail;
  if (!serviceAccountPattern.test(serviceAccount ?? "")) return fail("runtime-identity-unobserved", "unknown");
  let reference;
  let active = true;
  if (requirement.kind === "secret-version") {
    const entries = fn.serviceConfig?.secretEnvironmentVariables;
    const bindings = Array.isArray(entries) ? entries.filter((entry) => entry?.key === requirement.name) : [];
    if (bindings.length !== 1) return fail("selected-secret-binding-missing");
    const binding = bindings[0];
    reference = `projects/${binding.projectId}/secrets/${binding.secret}/versions/${binding.version}`;
    const selected = parseSecretReference(reference, projectId, projectNumber);
    if (!selected || selected.secret !== requirement.name) return fail("invalid-selected-secret-reference");
    reference = selected.reference;
  } else {
    const params = fn.serviceConfig?.environmentVariables ?? {};
    const raw = params[requirement.binding.parameter];
    if (raw != null && typeof raw !== "string") return fail("invalid-selected-secret-reference");
    const enabledName = requirement.binding.enabledParameter;
    const policyName = requirement.binding.policyParameter;
    const policy = policyName ? params[policyName] : null;
    if (policy != null && typeof policy !== "string") return fail("invalid-activation-state");
    const enabled = policyName ? (policy?.trim() ? "true" : "false") : enabledName ? params[enabledName] : null;
    if (enabledName && enabled != null && !["true", "false"].includes(enabled)) return fail("invalid-activation-state");
    if (!raw?.trim()) {
      if (requirement.binding.optional && enabled !== "true") {
        return {status: "inactive", reason: "optional-reference-unconfigured", serviceAccount,
          reference: null, active: false};
      }
      return fail("active-reference-missing");
    }
    const selected = parseSecretReference(raw.trim(), projectId);
    if (!selected || requirement.name && selected.secret !== requirement.name) return fail("invalid-selected-secret-reference");
    reference = selected.reference;
    active = enabledName || policyName ? enabled === "true" : true;
  }
  return {status: active ? "ready" : "inactive", reason: active ? "binding-observed" : "consumer-disabled", serviceAccount, reference, active};
}

// firebase-tools 15.20 resolves SecretParam bindings through latest metadata,
// then deploys the returned numeric version. This is resolution, not an SDK pin.
export function buildCandidateBindings({environment, projectId, projectNumber, sourceSha,
  requirements, targets, intent, paramsProvenance, runCommand = defaultRunCommand}) {
  const invalid = () => { throw new ReadinessUsageError("Invalid source intent or names-only parameter provenance."); };
  const exactKeys = (value, keys) => value && typeof value === "object" && !Array.isArray(value) &&
    Object.keys(value).sort().join(",") === [...keys].sort().join(",");
  const refs = ["FORM_RAZORPAY_PARTNER_CONFIG_VERSION", "RAZORPAY_PLATFORM_PAYMENT_CONFIG_VERSION",
    "FLIGHT_PROVIDER_CONFIG_VERSION", "CATCH_WHATSAPP_REPLY_CREDENTIAL_VERSION",
    "EVENT_ASSISTANCE_GUEST_KEY_VERSION", "EVENT_ASSISTANCE_RCS_WEBHOOK_KEY_VERSION"];
  const flags = ["CATCH_WHATSAPP_REPLIES_ENABLED", "EVENT_ASSISTANCE_RCS_WEBHOOK_ENABLED", "FLIGHT_PROVIDER_POLICY"];
  if (!exactKeys(paramsProvenance, ["version", "projectId", "sourceSha", "paramsSha256", "names", "references", "activation"]) ||
      paramsProvenance.version !== 1 || paramsProvenance.projectId !== projectId || paramsProvenance.sourceSha !== sourceSha ||
      !/^[a-f0-9]{64}$/u.test(paramsProvenance.paramsSha256 ?? "") ||
      !exactKeys(paramsProvenance.references, refs) || !exactKeys(paramsProvenance.activation, flags) ||
      !Array.isArray(paramsProvenance.names) || paramsProvenance.names.length !== materializedNonSecretParams.length ||
      paramsProvenance.names.some((entry, index) => !exactKeys(entry, ["name", "source"]) || entry.name !== materializedNonSecretParams[index] ||
        !["source-disabled", "deployment-environment", "source-default"].includes(entry.source)) ||
      refs.some((name) => paramsProvenance.references[name] !== null && !parseSecretReference(paramsProvenance.references[name], projectId)) ||
      flags.some((name) => typeof paramsProvenance.activation[name] !== "boolean") ||
      intent?.sourceSha !== sourceSha || intent?.projectId !== projectId || intent?.environment !== environment ||
      String(intent?.projectNumber) !== String(projectNumber) || !Array.isArray(intent?.functions)) invalid();
  const bindings = [];
  const resolved = new Map();
  const selected = new Set(targets);
  for (const requirement of requirements) {
    if (!["secret-version", "secret-reference"].includes(requirement.kind)) continue;
    for (const target of requirement.requiredWhen.anyDeployTarget.filter((target) => targetMatches(target, selected))) {
      const consumer = target.slice("functions:".length);
      const functions = intent.functions.filter((entry) => entry.consumer === consumer);
      if (functions.length !== 1 || functions[0].platform !== "gcfv2" ||
          !serviceAccountPattern.test(functions[0].serviceAccount ?? "")) invalid();
      const fn = functions[0];
      let reference, active;
      if (requirement.kind === "secret-version") {
        if (!fn.secretNames.includes(requirement.name)) invalid();
        if (!resolved.has(requirement.name)) {
          const response = executeMetadataCommand(metadataOnlyCommand(["secrets", "versions", "describe", "latest",
            `--secret=${requirement.name}`, `--project=${projectId}`, "--format=json(name,state)", "--quiet"]), runCommand);
          const metadata = parseJsonOutput(response.stdout);
          const version = parseSecretReference(metadata?.name, projectId, projectNumber);
          const failure = classifyCommandFailure(response) ??
            (!version || version.secret !== requirement.name ? {status: "unknown", reason: "invalid-metadata-response"} :
              metadata?.state !== "ENABLED" ? {status: "not-ready", reason: "selected-secret-version-not-enabled"} : null);
          if (failure) {
            const error = new Error("Candidate SecretParam latest version is missing, disabled or unobservable; no payload was read.");
            error.probeResult = {id: requirement.id, kind: requirement.kind, resource: requirement.name, ...failure};
            throw error;
          }
          resolved.set(requirement.name, version.reference);
        }
        reference = resolved.get(requirement.name); active = true;
      } else {
        reference = paramsProvenance.references[requirement.binding.parameter] ?? null;
        const flag = requirement.binding.enabledParameter ?? requirement.binding.policyParameter;
        active = flag ? paramsProvenance.activation[flag] === true : Boolean(reference);
        if (active && !reference || !reference && !requirement.binding.optional ||
            reference && requirement.name && parseSecretReference(reference, projectId).secret !== requirement.name) invalid();
      }
      bindings.push({requirementId: requirement.id, consumer, serviceAccount: fn.serviceAccount, reference, active});
    }
  }
  // Also reject source-bound SDK secrets absent from the contract for a consumer.
  for (const fn of intent.functions) {
    const contracted = requirements.filter((entry) => entry.kind === "secret-version" &&
      entry.requiredWhen.anyDeployTarget.includes(`functions:${fn.consumer}`)).map((entry) => entry.name).sort();
    if (JSON.stringify([...fn.secretNames].sort()) !== JSON.stringify(contracted)) invalid();
  }
  return {version: 1, sourceSha, environment, projectId, paramsSha256: paramsProvenance.paramsSha256,
    functions: intent.functions.map(({consumer, serviceAccount}) => ({consumer, serviceAccount})), bindings};
}

export function classifyForbiddenSecretAccess({serviceAccount, secret, result}) {
  const base = {id: `identity.unrelated-secret:${secret}`, kind: "identity-isolation", resource: secret};
  const failure = classifyCommandFailure(result);
  if (failure) return readinessResult({...base, ...failure});
  const policy = parseJsonOutput(result.stdout);
  if (!Array.isArray(policy?.bindings)) return readinessResult({...base, status: "unknown", reason: "invalid-metadata-response"});
  const member = `serviceAccount:${serviceAccount}`;
  const prohibited = new Set(["roles/secretmanager.secretAccessor", "roles/secretmanager.secretVersionManager",
    "roles/secretmanager.admin", "roles/editor", "roles/owner"]);
  const grants = [...new Set(policy.bindings.filter((entry) => !entry.condition &&
    entry.members?.includes(member) && prohibited.has(entry.role)).map((entry) => entry.role))].sort();
  return readinessResult({...base, status: grants.length ? "not-ready" : "ready",
    reason: grants.length ? "unrelated-secret-permission-leakage" : "no-explicit-unrelated-secret-grant",
    metadata: {serviceAccount, grants, evidenceScope: "secret-policy-only", effectiveAccessVerified: false}});
}

function assessSecretBindings({requirement, targets, projectId, projectNumber,
  functionsResult, candidate, phase, runCommand}) {
  const failure = classifyCommandFailure(functionsResult);
  const functions = parseJsonOutput(functionsResult.stdout);
  const consumers = (requirement.requiredWhen.anyDeployTarget ?? [])
    .filter((target) => targetMatches(target, new Set(targets)))
    .map((target) => target.slice("functions:".length));
  const results = [];
  for (const consumer of consumers) {
    const id = `${requirement.id}:${consumer}`;
    const base = {id, kind: requirement.kind, resource: requirement.name ?? requirement.binding.parameter};
    const proposed = candidate?.bindings.find((entry) =>
      entry.requirementId === requirement.id && entry.consumer === consumer);
    const observed = failure ?? (!Array.isArray(functions)
      ? {status: "unknown", reason: "invalid-metadata-response"}
      : observeFunctionBinding({requirement, consumer, functions, projectId, projectNumber}));
    if (candidate && !proposed) {
      results.push(readinessResult({...base, status: "unknown", reason: "candidate-binding-missing"}));
      continue;
    }
    const binding = phase === "candidate" ? proposed : observed;
    if (phase === "deployed" && !["ready", "inactive"].includes(observed.status)) {
      results.push(readinessResult({...base, ...observed}));
      continue;
    }
    const matches = proposed && observed.reference === proposed.reference &&
      observed.serviceAccount === proposed.serviceAccount && observed.active === proposed.active;
    const metadata = {consumer, phase, serviceAccount: binding.serviceAccount,
      reference: binding.reference, source: phase === "candidate" ? "candidate-receipt" : "cloud-functions-v2",
      ...(candidate ? {sourceSha: candidate.sourceSha, deployedMatchesCandidate: Boolean(matches)} : {})};
    if (phase === "deployed" && proposed && !matches) {
      results.push(readinessResult({...base, metadata, status: "not-ready", reason: "deployed-binding-outdated"}));
      continue;
    }
    if (!binding.active) {
      results.push(readinessResult({...base, metadata, status: "inactive", reason: binding.reference ? "consumer-disabled" : "optional-reference-unconfigured"}));
      continue;
    }
    for (const secret of requirement.binding?.forbiddenSecretAccess ?? []) {
      if (!secretNamePattern.test(secret)) throw new ReadinessUsageError("Invalid unrelated-secret identity boundary.");
      results.push(classifyForbiddenSecretAccess({serviceAccount: binding.serviceAccount, secret,
        result: executeMetadataCommand(buildSecretRuntimeAccessCommand({projectId,
          requirement: {kind: "secret-version", name: secret}}), runCommand)}));
    }
    const selected = parseSecretReference(binding.reference, projectId);
    const selectedRequirement = {...requirement, id, name: selected.secret,
      runtimeRoles: requirement.runtimeRolesByConsumer?.[consumer] ??
        requirement.runtimeRoles ?? ["roles/secretmanager.secretAccessor"]};
    const state = classifyRequirementResult({requirement: selectedRequirement, reference: binding.reference,
      projectId, projectNumber, result: executeMetadataCommand(buildRequirementCommand({projectId,
        requirement: selectedRequirement, reference: binding.reference}), runCommand)});
    results.push({...state, metadata: {...metadata, ...state.metadata}});
    results.push(classifySecretRuntimeAccess({serviceAccount: binding.serviceAccount,
      requirement: selectedRequirement, result: executeMetadataCommand(buildSecretRuntimeAccessCommand({
        projectId, requirement: selectedRequirement}), runCommand)}));
  }
  return results;
}

export function exitCodeForResults(results) {
  if (results.some((result) => result.status === "unknown")) return 2;
  if (results.some((result) => result.status === "not-ready")) return 1;
  return 0;
}

export function runEnvironmentReadiness({
  aliases,
  candidate,
  candidateFactory,
  sourceSha,
  phase = "deployed",
  capabilities = [],
  environments,
  manifest,
  runCommand = defaultRunCommand,
  targets = [],
}) {
  const environmentReports = [];
  for (const environment of environments) {
    if (!manifest.environments.includes(environment)) {
      throw new ReadinessUsageError(
        `Environment is not declared in the manifest: ${environment}.`,
      );
    }
    const projectId = resolveFirebaseProjectId({environment, aliases});
    if (candidate !== undefined) validateCandidateBindings(candidate, {environment, projectId, sourceSha, manifest});
    const requirements = selectReadinessRequirements({
      capabilities,
      environment,
      manifest,
      targets,
    });
    const identityCommand = buildProjectIdentityCommand(projectId);
    const identityResult = classifyProjectIdentity({
      projectId,
      result: executeMetadataCommand(identityCommand, runCommand),
    });
    const results = [identityResult];
    let candidateProbeFailed = false;
    if (candidateFactory && identityResult.status === "ready") {
      try {
        candidate = candidateFactory({environment, projectId, projectNumber: identityResult.metadata.projectNumber, requirements});
        validateCandidateBindings(candidate, {environment, projectId, sourceSha, manifest});
      } catch (error) {
        if (!error.probeResult) throw error;
        results.push(error.probeResult); candidateProbeFailed = true;
      }
    }
    const secretRequirements = requirements.filter((entry) =>
      ["secret-version", "secret-reference"].includes(entry.kind));
    const functionsResult = (secretRequirements.length || candidate?.functions.length) && identityResult.status === "ready" && !candidateProbeFailed
      ? executeMetadataCommand(buildFunctionBindingsCommand({projectId, requirements: secretRequirements}), runCommand)
      : {status: null, stdout: "", stderr: ""};
    if (candidate && phase === "deployed" && !candidateProbeFailed && identityResult.status === "ready") {
      const functions = parseJsonOutput(functionsResult.stdout);
      for (const intended of candidate.functions) {
        const matches = Array.isArray(functions) ? functions.filter((fn) =>
          [projectId, identityResult.metadata.projectNumber].some((project) =>
            fn.name === `projects/${project}/locations/asia-south1/functions/${intended.consumer}`)) : [];
        const observed = matches.length === 1 ? matches[0] : null;
        const matchesReceipt = observed?.state === "ACTIVE" && observed?.serviceConfig?.serviceAccountEmail === intended.serviceAccount &&
          observed?.serviceConfig?.environmentVariables?.CATCH_DEPLOY_CONFIG_SHA256 === candidate.paramsSha256;
        results.push(readinessResult({id: `configuration:${intended.consumer}`, kind: "configuration-provenance", resource: intended.consumer,
          ...(classifyCommandFailure(functionsResult) ?? {status: matchesReceipt ? "ready" : "not-ready",
            reason: matchesReceipt ? "deployed-configuration-matches" : "deployed-configuration-outdated"}),
          metadata: {sourceSha: candidate.sourceSha, paramsSha256: candidate.paramsSha256, serviceAccount: intended.serviceAccount}}));
      }
    }
    for (const requirement of requirements) {
      if (["secret-version", "secret-reference"].includes(requirement.kind)) {
        if (identityResult.status === "ready" && !candidateProbeFailed) results.push(...assessSecretBindings({
          requirement, targets, projectId, projectNumber: identityResult.metadata.projectNumber,
          functionsResult, candidate, phase, runCommand}));
        continue;
      }
      if (requirement.kind === "form-upload-identity") {
        try {
          const target = uploadIdentityTarget(environment, projectId, requirement.purpose);
          const assessed = inspectUploadIdentity(target, (args) =>
            runCommand({command: "gcloud", args: [...args, "--format=json", "--quiet"]}));
          results.push(readinessResult({
            id: requirement.id, kind: requirement.kind, resource: target.email,
            status: assessed.ready ? "ready" : "not-ready",
            reason: assessed.ready ? "upload-identity-ready" : "upload-identity-missing-or-unsafe",
            metadata: assessed,
          }));
        } catch {
          results.push(readinessResult({
            id: requirement.id, kind: requirement.kind, resource: projectId,
            status: "unknown", reason: "upload-identity-metadata-unavailable",
          }));
        }
        continue;
      }
      const command = buildRequirementCommand({projectId, requirement});
      results.push(classifyRequirementResult({
        requirement,
        result: executeMetadataCommand(command, runCommand),
      }));

    }
    const exitCode = exitCodeForResults(results);
    environmentReports.push({
      environment,
      exitCode,
      projectId,
      ready: exitCode === 0,
      results,
      selectedRequirementCount: requirements.length,
      unverifiedRecordReaders: (manifest.directReaders ?? []).filter((reader) =>
        reader.recordReferences && reader.consumers.some((name) =>
          targetMatches(`functions:${name}`, new Set(targets)))).map((reader) => reader.id),
      status: statusForExitCode(exitCode),
    });
  }

  const results = environmentReports.flatMap((report) => report.results);
  const exitCode = exitCodeForResults(results);
  return {
    capabilities: [...capabilities],
    environments: environmentReports,
    exitCode,
    mode: "live",
    phase,
    evidenceScope: "configured-function-bindings-and-explicit-secret-policy",
    providerUsabilityVerified: false,
    identityIsolationVerified: false,
    ready: exitCode === 0,
    status: statusForExitCode(exitCode),
    targets: [...targets],
    version: 1,
  };
}

export function executeReadinessCli(argv, dependencies = {}) {
  const args = parseArgs(argv);
  if (args.help) {
    return {exitCode: 0, output: helpText()};
  }
  const repoRoot = args.sourceRoot ? path.resolve(args.sourceRoot) : dependencies.repoRoot ?? defaultRepoRoot;
  const sourceSha = args.sourceSha ?? dependencies.sourceSha ?? spawnSync("git", ["rev-parse", "HEAD"],
    {cwd: repoRoot, encoding: "utf8"}).stdout?.trim();
  if (args.sourceRoot && (spawnSync("git", ["rev-parse", "HEAD"],
    {cwd: repoRoot, encoding: "utf8"}).stdout?.trim() !== sourceSha ||
    spawnSync("git", ["diff", "HEAD", "--quiet", "--", "functions/src", "functions/package-lock.json", "tool/firebase/environment_readiness.json", ".firebaserc"],
      {cwd: repoRoot}).status !== 0)) {
    throw new ReadinessUsageError("Approved source checkout does not match the receipt SHA.");
  }
  const readFile = dependencies.readFile ?? fs.readFileSync;
  const pathExists = dependencies.pathExists ?? fs.existsSync;
  const manifestPath = dependencies.manifestPath ?? path.join(
    repoRoot,
    "tool/firebase/environment_readiness.json",
  );
  const manifest = dependencies.manifest ?? readJsonFile(manifestPath, readFile);

  let validationOptions = {};
  let functionTargets = dependencies.functionTargets ?? new Set();
  if (dependencies.repositoryValidation !== false) {
    const sourceRoot = path.join(repoRoot, "functions/src");
    const sources = dependencies.sources ?? readTypescriptSources({
      repoRoot,
      sourceRoot,
      readFile,
    });
    const declarations = discoverDefineSecretNames(sources);
    const indexSource = dependencies.indexSource ?? readFile(
      path.join(sourceRoot, "index.ts"),
      "utf8",
    );
    functionTargets = parseFirebaseFunctionTargets(indexSource);
    validationOptions = {
      discoveredSecrets: declarations.names,
      directReaderPaths: discoverDirectSecretReaders(sources),
      functionTargets,
      sourcePathExists: (sourcePath) => pathExists(path.join(repoRoot, sourcePath)),
      unsupportedSecretDeclarations: declarations.unsupported,
    };
  }
  validateEnvironmentReadinessManifest(manifest, validationOptions);

  if (args.manifestOnly) {
    const report = {
      mode: "manifest-only",
      ready: true,
      requirementCount: manifest.requirements.length,
      directReaderCount: (manifest.directReaders ?? []).length,
      secretCount: manifest.requirements.filter(
        (requirement) => requirement.kind === "secret-version",
      ).length,
      status: "ready",
      version: manifest.version,
    };
    return {
      exitCode: 0,
      output: formatReport(report, args.json),
      report,
    };
  }

  validateReadinessSelectors({
    capabilities: args.capabilities,
    functionTargets,
    manifest,
    targets: args.targets,
  });

  const firebaseRcPath = dependencies.firebaseRcPath ?? path.join(
    repoRoot,
    ".firebaserc",
  );
  const aliases = dependencies.aliases ?? parseFirebaseProjectAliases(
    readFile(firebaseRcPath, "utf8"),
  );
  const environments = args.all
    ? [...manifest.environments]
    : [args.environment];
  const candidate = args.candidate ? readJsonFile(args.candidate, readFile) : undefined;
  if (args.candidate) {
    validateCandidateBindings(candidate, {environment: args.environment,
      projectId: resolveFirebaseProjectId({environment: args.environment, aliases}), sourceSha, manifest});
    const expectedConsumers = [...functionTargets].filter((target) => targetMatches(target, new Set(args.targets)))
      .map((target) => target.slice("functions:".length)).sort();
    if (JSON.stringify(candidate.functions.map((fn) => fn.consumer).sort()) !== JSON.stringify(expectedConsumers)) {
      throw new ReadinessUsageError("Candidate function set differs from the approved deployment targets.");
    }
  }
  let generatedCandidate;
  const paramsProvenance = args.paramsProvenance ? readJsonFile(args.paramsProvenance, readFile) : null;
  const candidateFactory = args.writeCandidate ? ({environment, projectId, projectNumber, requirements}) => {
    const consumers = [...functionTargets].filter((target) => targetMatches(target, new Set(args.targets)))
      .map((target) => target.slice("functions:".length));
    const intent = consumers.length ? collectFunctionBindingIntent({sourceRoot: repoRoot,
      environment, projectId, projectNumber, sourceSha, consumers}) : {schemaVersion: 1, sourceSha, environment, projectId, projectNumber, functions: []};
    generatedCandidate = buildCandidateBindings({environment, projectId, projectNumber, sourceSha,
      requirements, targets: args.targets, intent, paramsProvenance, runCommand: dependencies.runCommand});
    return generatedCandidate;
  } : undefined;
  const report = runEnvironmentReadiness({
    aliases, candidate, candidateFactory, sourceSha, phase: args.phase,
    capabilities: args.capabilities,
    environments,
    manifest,
    runCommand: dependencies.runCommand,
    targets: args.targets,
  });
  if (args.writeCandidate && report.exitCode === 0 && generatedCandidate) {
    // Exclusive create prevents accidental replacement of an approved receipt.
    fs.writeFileSync(args.writeCandidate, JSON.stringify(generatedCandidate, null, 2) + "\n", {flag: "wx", mode: 0o600});
  }
  return {
    exitCode: report.exitCode,
    output: formatReport(report, args.json),
    report,
  };
}

function targetMatches(requiredTarget, selectedTargets) {
  if (selectedTargets.has("all")) return true;
  if (selectedTargets.has(requiredTarget)) return true;
  return requiredTarget.startsWith("functions:") &&
    selectedTargets.has("functions");
}

function metadataOnlyCommand(args) {
  return assertMetadataOnlyCommand({command: "gcloud", args});
}

function executeMetadataCommand(spec, runCommand) {
  assertMetadataOnlyCommand(spec);
  try {
    return normalizeCommandResult(runCommand(spec));
  } catch (error) {
    return {
      error: {code: error?.code ?? "COMMAND_EXCEPTION"},
      status: null,
      stderr: "",
      stdout: "",
    };
  }
}

function defaultRunCommand(spec) {
  const result = spawnSync(spec.command, spec.args, {
    encoding: "utf8",
    env: {
      ...process.env,
      CLOUDSDK_CORE_DISABLE_PROMPTS: "1",
    },
    shell: false,
    timeout: Number.isSafeInteger(spec.timeoutMs) && spec.timeoutMs > 0 &&
      spec.timeoutMs <= functionListingTimeoutMs ? spec.timeoutMs : metadataCommandTimeoutMs,
  });
  return normalizeCommandResult(result);
}

function normalizeCommandResult(result = {}) {
  return {
    error: result.error
      ? {code: result.error.code ?? "COMMAND_ERROR"}
      : null,
    status: Number.isInteger(result.status) ? result.status : null,
    stderr: typeof result.stderr === "string" ? result.stderr : "",
    stdout: typeof result.stdout === "string" ? result.stdout : "",
  };
}

function classifyCommandFailure(result) {
  if (result?.error) {
    return {
      reason: result.error.code === "ENOENT"
        ? "gcloud-unavailable"
        : result.error.code === "ETIMEDOUT"
          ? "metadata-command-timeout"
          : "metadata-command-error",
      status: "unknown",
    };
  }
  if (result?.status === 0) return null;
  const diagnostic = String(result?.stderr ?? "").toUpperCase();
  if (diagnostic.includes("NOT_FOUND")) {
    return {reason: "resource-not-found", status: "not-ready"};
  }
  if (diagnostic.includes("PERMISSION_DENIED")) {
    return {reason: "permission-denied", status: "unknown"};
  }
  if (diagnostic.includes("UNAUTHENTICATED") ||
      diagnostic.includes("LOGIN REQUIRED") ||
      diagnostic.includes("REAUTHENTICATE")) {
    return {reason: "authentication-failed", status: "unknown"};
  }
  return {reason: "metadata-command-failed", status: "unknown"};
}

function readinessResult({
  id,
  kind,
  metadata,
  reason,
  resource,
  status,
}) {
  return compactObject({id, kind, metadata, reason, resource, status});
}

function resourceFieldName(resourceName) {
  if (typeof resourceName !== "string") return null;
  const encoded = resourceName.split("/fields/").at(-1);
  if (!encoded) return null;
  try {
    return decodeURIComponent(encoded);
  } catch {
    return encoded;
  }
}

function parseJsonOutput(stdout) {
  try {
    return JSON.parse(String(stdout ?? ""));
  } catch {
    return null;
  }
}

function compactObject(object) {
  return Object.fromEntries(
    Object.entries(object).filter(([, value]) => value !== undefined),
  );
}

function statusForExitCode(exitCode) {
  if (exitCode === 0) return "ready";
  if (exitCode === 1) return "not-ready";
  return "unknown";
}

function validateStringArray({errors, key, label, value}) {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(`${label}: ${key} must be a non-empty array.`);
    return;
  }
  if (new Set(value).size !== value.length) {
    errors.push(`${label}: ${key} must not contain duplicates.`);
  }
  for (const item of value) {
    if (typeof item !== "string" || item.trim() === "") {
      errors.push(`${label}: ${key} must contain non-empty strings.`);
    }
  }
}

function validateProjectId(projectId) {
  if (!projectIdPattern.test(projectId ?? "")) {
    throw new ReadinessUsageError(`Invalid Firebase project id: ${projectId}.`);
  }
}

function validateProjectNumber(projectNumber) {
  if (!projectNumberPattern.test(String(projectNumber ?? ""))) {
    throw new ReadinessUsageError(
      `Invalid Google Cloud project number: ${projectNumber}.`,
    );
  }
}

function requireValue(argv, index, flag) {
  const value = argv[index];
  if (!value || value.startsWith("--")) {
    throw new ReadinessUsageError(`${flag} requires a value.`);
  }
  return value;
}

function parseCsv(value, flag) {
  const values = value.split(",").map((item) => item.trim()).filter(Boolean);
  if (values.length === 0) {
    throw new ReadinessUsageError(`${flag} requires a non-empty value.`);
  }
  return values;
}

function readJsonFile(filePath, readFile) {
  try {
    return JSON.parse(readFile(filePath, "utf8"));
  } catch (error) {
    throw new ReadinessUsageError(
      "Could not read readiness JSON metadata.",
    );
  }
}

function readTypescriptSources({repoRoot, sourceRoot, readFile}) {
  const files = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
      if (entry.isDirectory()) {
        if (entry.name !== "generated" && entry.name !== "node_modules") {
          visit(path.join(directory, entry.name));
        }
      } else if (entry.isFile() && entry.name.endsWith(".ts") &&
          !entry.name.endsWith(".test.ts")) {
        const filePath = path.join(directory, entry.name);
        files.push({
          contents: readFile(filePath, "utf8"),
          path: path.relative(repoRoot, filePath),
        });
      }
    }
  };
  visit(sourceRoot);
  return files;
}

function formatReport(report, json) {
  if (json) return `${JSON.stringify(report, null, 2)}\n`;
  if (report.mode === "manifest-only") {
    return (
      `READY environment readiness manifest: ${report.requirementCount} ` +
      `requirements (${report.secretCount} secrets).\n`
    );
  }
  const lines = [];
  for (const environment of report.environments) {
    lines.push(
      `${environment.status.toUpperCase().padEnd(9)} ` +
      `${environment.environment}: ${environment.projectId} ` +
      `(${environment.selectedRequirementCount} prerequisite(s))`,
    );
    for (const result of environment.results) {
      lines.push(
        `  ${result.status.toUpperCase().padEnd(9)} ${result.id} ` +
        `(${result.reason})`,
      );
    }
  }
  return `${lines.join("\n")}\n`;
}

function helpText() {
  return `Check Firebase/GCP environment prerequisites without reading secrets.

Usage:
  node tool/firebase/check_environment_readiness.mjs --manifest-only [--json]
  node tool/firebase/check_environment_readiness.mjs \\
    (--env <dev|staging|prod> | --all) \\
    [--targets <csv>] [--capabilities <csv>] [--json]
    [--candidate <names-only-receipt.json>] [--phase deployed|candidate]
    [--source-root <approved-checkout> --source-sha <sha>]
    [--params-provenance <receipt.json> --write-candidate <new-receipt.json>]

The live checker resolves projects only from .firebaserc and uses metadata-only
gcloud commands. It has no apply mode and never accesses secret payloads.
`;
}

function main() {
  try {
    const execution = executeReadinessCli(process.argv.slice(2));
    process.stdout.write(execution.output);
    process.exitCode = execution.exitCode;
  } catch (error) {
    process.stderr.write(`${error?.message ?? String(error)}\n`);
    process.exitCode = error?.exitCode ?? 2;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
