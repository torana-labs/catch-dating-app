#!/usr/bin/env node
/**
 * Compare the repository's deployment-eligible Firebase Functions and declared
 * secrets with one live Firebase environment. Environment-only Functions are
 * intentionally ignored because installed Firebase Extensions own legitimate
 * extra exports.
 *
 * This command is metadata-only. It never reads secret payloads.
 *
 *   node tool/firebase/check_deploy_parity.mjs --env prod
 *   node tool/firebase/check_deploy_parity.mjs --env prod \
 *     --targets functions:firstCallable,functions:secondCallable
 *   node tool/firebase/check_deploy_parity.mjs --env dev --json
 *   node tool/firebase/check_deploy_parity.mjs --env prod \
 *     --client-callables website --client-root .
 *
 * `--client-callables` checks the Functions that client source references
 * (derived by check_client_callable_dependencies.mjs) instead of the deploy
 * plan, so a client checkout newer than the deployed source fails when it
 * calls a Function the environment does not serve.
 */

import {spawnSync} from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {fileURLToPath} from "node:url";

import {
  discoverDefineSecretNames,
  parseFirebaseProjectAliases,
  resolveFirebaseProjectId,
} from "./check_environment_readiness.mjs";
import {listFirebaseFunctionTargets} from
  "./list_firebase_function_targets.mjs";

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const defaultRepoRoot = path.resolve(toolDir, "../..");
const commandTimeoutMs = 120_000;

export class DeployParityUsageError extends Error {
  constructor(message) {
    super(message);
    this.name = "DeployParityUsageError";
    this.exitCode = 64;
  }
}

export class DeployParityMetadataError extends Error {
  constructor(message) {
    super(message);
    this.name = "DeployParityMetadataError";
    this.exitCode = 2;
  }
}

function requireValue(argv, index, option) {
  const value = argv[index];
  if (!value || value.startsWith("--")) {
    throw new DeployParityUsageError(`${option} requires a value.`);
  }
  return value;
}

export function parseArgs(argv) {
  const parsed = {
    clientRoot: null,
    clientSurfaces: null,
    environment: null,
    help: false,
    json: false,
    repoRoot: defaultRepoRoot,
    selectedFunctionTargets: null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--env") {
      parsed.environment = requireValue(argv, ++index, arg);
    } else if (arg === "--repo-root") {
      parsed.repoRoot = path.resolve(requireValue(argv, ++index, arg));
    } else if (arg === "--targets") {
      parsed.selectedFunctionTargets = parseSelectedFunctionTargets(
        requireValue(argv, ++index, arg),
      );
    } else if (arg === "--client-callables") {
      parsed.clientSurfaces = parseClientSurfaceRequest(
        requireValue(argv, ++index, arg),
      );
    } else if (arg === "--client-root") {
      parsed.clientRoot = path.resolve(requireValue(argv, ++index, arg));
    } else if (arg === "--json") {
      parsed.json = true;
    } else if (arg === "--help" || arg === "-h") {
      parsed.help = true;
    } else {
      throw new DeployParityUsageError(`Unknown argument: ${arg}`);
    }
  }
  if (!parsed.help && !parsed.environment) {
    throw new DeployParityUsageError("--env <environment> is required.");
  }
  if (parsed.clientSurfaces && parsed.selectedFunctionTargets) {
    throw new DeployParityUsageError(
      "--client-callables and --targets select different scopes; pass one.",
    );
  }
  if (parsed.clientRoot && !parsed.clientSurfaces) {
    throw new DeployParityUsageError(
      "--client-root requires --client-callables.",
    );
  }
  return parsed;
}

export function parseClientSurfaceRequest(value) {
  if (value === "all") return value;
  const surfaces = String(value).split(",");
  if (surfaces.some((surface) => !/^[a-z]+$/u.test(surface)) ||
      new Set(surfaces).size !== surfaces.length) {
    throw new DeployParityUsageError(
      "--client-callables accepts all or unique comma-separated surfaces.",
    );
  }
  return surfaces;
}

export function resolveClientSurfaces(request, knownSurfaces) {
  const surfaces = request === "all" ? [...knownSurfaces] : request;
  const unknown = surfaces.filter((surface) => !knownSurfaces.includes(surface));
  if (unknown.length > 0) {
    throw new DeployParityUsageError(
      `--client-callables accepts all or surfaces from ${knownSurfaces.join(",")}.`,
    );
  }
  return surfaces;
}

/**
 * Client source scanning loads only for --client-callables, so the deploy
 * executor's import of loadRepositoryInventory keeps its dependency closure.
 */
export async function loadClientCallableTools() {
  const tools = await import("./check_client_callable_dependencies.mjs");
  return {
    surfaces: Object.keys(tools.clientCallableSurfaces),
    derive: tools.deriveClientCallables,
    format: tools.formatClientCallableReport,
  };
}

export function parseSelectedFunctionTargets(value) {
  const rawTargets = String(value).split(",");
  if (rawTargets.length === 0 || rawTargets.some((target) => !target)) {
    throw new DeployParityUsageError(
      "--targets requires exact comma-separated Function targets.",
    );
  }
  const targets = rawTargets.map((target) => target.trim());
  if (targets.some((target) =>
    !/^functions:[A-Za-z][A-Za-z0-9_-]*$/u.test(target))) {
    throw new DeployParityUsageError(
      "--targets accepts only exact functions:<name> selectors.",
    );
  }
  if (new Set(targets).size !== targets.length) {
    throw new DeployParityUsageError(
      "--targets requires unique Function selectors.",
    );
  }
  return targets;
}

function readUtf8(filePath, label) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (error) {
    throw new DeployParityUsageError(
      `Could not read ${label}: ${error.message}`,
    );
  }
}

function collectTypeScriptSources(directory, repoRoot, sources = []) {
  let entries;
  try {
    entries = fs.readdirSync(directory, {withFileTypes: true});
  } catch (error) {
    throw new DeployParityUsageError(
      `Could not inspect ${path.relative(repoRoot, directory)}: ${error.message}`,
    );
  }
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      collectTypeScriptSources(entryPath, repoRoot, sources);
    } else if (entry.isFile() && entry.name.endsWith(".ts")) {
      sources.push({
        contents: readUtf8(entryPath, path.relative(repoRoot, entryPath)),
        path: path.relative(repoRoot, entryPath),
      });
    }
  }
  return sources;
}

export function loadRepositoryInventory(repoRoot) {
  const functionsSourceRoot = path.join(repoRoot, "functions/src");
  const functionTargets = listFirebaseFunctionTargets(repoRoot);
  const discovery = discoverDefineSecretNames(
    collectTypeScriptSources(functionsSourceRoot, repoRoot),
  );
  if (discovery.unsupported.length > 0) {
    throw new DeployParityUsageError(
      "Every defineSecret declaration must use a literal name; unsupported " +
      `declarations: ${discovery.unsupported.sort().join(", ")}.`,
    );
  }
  return {
    functionNames: new Set(
      functionTargets.map((target) => target.replace(/^functions:/u, "")),
    ),
    secretNames: discovery.names,
  };
}

export function buildFunctionsListCommand(projectId) {
  return {
    command: "firebase",
    args: ["functions:list", "--project", projectId, "--json"],
  };
}

export function buildSecretsListCommand(projectId) {
  return {
    command: "gcloud",
    args: [
      "secrets",
      "list",
      `--project=${projectId}`,
      "--format=json(name)",
      "--quiet",
    ],
  };
}

function defaultRunCommand({command, args}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    env: {...process.env, NO_UPDATE_NOTIFIER: "1"},
    maxBuffer: 32 * 1024 * 1024,
    timeout: commandTimeoutMs,
  });
  return {
    error: result.error,
    status: result.status,
    stderr: result.stderr ?? "",
    stdout: result.stdout ?? "",
  };
}

function requireSuccessfulCommand(result, label) {
  if (result?.status === 0 && !result.error) return result.stdout;
  const detail = result?.error?.message ||
    result?.stderr?.trim().split("\n")[0] ||
    `exit ${result?.status ?? "unknown"}`;
  throw new DeployParityMetadataError(`${label} failed: ${detail}`);
}

function parseJson(contents, label) {
  try {
    return JSON.parse(contents);
  } catch {
    throw new DeployParityMetadataError(`${label} returned malformed JSON.`);
  }
}

export function parseDeployedFunctionNames(contents) {
  const parsed = parseJson(contents, "firebase functions:list");
  if (parsed?.status !== "success" || !Array.isArray(parsed.result)) {
    throw new DeployParityMetadataError(
      "firebase functions:list did not return a successful function inventory.",
    );
  }
  const names = new Set();
  for (const entry of parsed.result) {
    if (typeof entry?.id !== "string" || entry.id.trim() === "") {
      throw new DeployParityMetadataError(
        "firebase functions:list returned a function without an id.",
      );
    }
    names.add(entry.id);
  }
  return names;
}

export function parseLiveSecretNames(contents) {
  const parsed = parseJson(contents, "gcloud secrets list");
  if (!Array.isArray(parsed)) {
    throw new DeployParityMetadataError(
      "gcloud secrets list did not return a secret inventory.",
    );
  }
  const names = new Set();
  for (const entry of parsed) {
    const match = typeof entry?.name === "string" ?
      entry.name.match(/\/secrets\/([A-Z][A-Z0-9_]*)$/u) : null;
    if (!match) {
      throw new DeployParityMetadataError(
        "gcloud secrets list returned an invalid secret resource name.",
      );
    }
    names.add(match[1]);
  }
  return names;
}

export function compareDeployParity({
  declaredSecretNames,
  deployedFunctionNames,
  liveSecretNames,
  repoFunctionNames,
  selectedFunctionNames = null,
}) {
  if (selectedFunctionNames !== null &&
      (!(selectedFunctionNames instanceof Set) ||
       selectedFunctionNames.size === 0)) {
    throw new DeployParityUsageError(
      "Selected parity requires a non-empty Set of Function names.",
    );
  }
  const expectedFunctionNames = selectedFunctionNames ?? repoFunctionNames;
  const unknownSelectedFunctions = [...expectedFunctionNames]
    .filter((name) => !repoFunctionNames.has(name))
    .sort();
  if (unknownSelectedFunctions.length > 0) {
    throw new DeployParityUsageError(
      "Selected Functions are not deployment-eligible source exports: " +
      `${unknownSelectedFunctions.join(", ")}.`,
    );
  }
  const missingFunctions = [...expectedFunctionNames]
    .filter((name) => !deployedFunctionNames.has(name))
    .sort();
  const missingSecrets = [...declaredSecretNames]
    .filter((name) => !liveSecretNames.has(name))
    .sort();
  const environmentOnlyFunctionCount = [...deployedFunctionNames]
    .filter((name) => !repoFunctionNames.has(name)).length;
  return {
    ok: missingFunctions.length === 0 && missingSecrets.length === 0,
    missingFunctions,
    missingSecrets,
    parityScope: selectedFunctionNames === null ? "full" : "selected",
    checkedFunctionCount: expectedFunctionNames.size,
    repoFunctionCount: repoFunctionNames.size,
    deployedFunctionCount: deployedFunctionNames.size,
    declaredSecretCount: declaredSecretNames.size,
    liveSecretCount: liveSecretNames.size,
    environmentOnlyFunctionCount,
  };
}

/**
 * Client parity: every Function the client source references is deployed.
 * Unlike selected parity, a referenced name need not exist in the deployed
 * source; a newer client calling it is exactly the failure to report.
 */
export function compareClientCallableParity({
  clientReferences,
  deployedFunctionNames,
  declaredSecretNames,
  liveSecretNames,
}) {
  const missingFunctions = [...clientReferences.keys()]
    .filter((name) => !deployedFunctionNames.has(name))
    .sort();
  const missingSecrets = [...declaredSecretNames]
    .filter((name) => !liveSecretNames.has(name))
    .sort();
  return {
    ok: missingFunctions.length === 0 && missingSecrets.length === 0,
    missingFunctions,
    missingFunctionSurfaces: Object.fromEntries(missingFunctions.map(
      (name) => [name, [...clientReferences.get(name)].sort()],
    )),
    missingSecrets,
    parityScope: "client",
    checkedFunctionCount: clientReferences.size,
    deployedFunctionCount: deployedFunctionNames.size,
    declaredSecretCount: declaredSecretNames.size,
    liveSecretCount: liveSecretNames.size,
  };
}

export function runDeployParity({
  environment,
  repoRoot = defaultRepoRoot,
  runCommand = defaultRunCommand,
  selectedFunctionTargets = null,
  clientSurfaces = null,
  clientRoot = null,
  clientCallableTools = null,
}) {
  if (clientSurfaces !== null && clientCallableTools === null) {
    throw new DeployParityUsageError(
      "Client parity requires loadClientCallableTools().",
    );
  }
  const aliases = parseFirebaseProjectAliases(
    readUtf8(path.join(repoRoot, ".firebaserc"), ".firebaserc"),
  );
  const projectId = resolveFirebaseProjectId({environment, aliases});
  const repository = loadRepositoryInventory(repoRoot);
  const deployedFunctionNames = parseDeployedFunctionNames(
    requireSuccessfulCommand(
      runCommand(buildFunctionsListCommand(projectId)),
      "Firebase Function inventory",
    ),
  );
  const liveSecretNames = parseLiveSecretNames(
    requireSuccessfulCommand(
      runCommand(buildSecretsListCommand(projectId)),
      "Secret Manager inventory",
    ),
  );
  if (clientSurfaces !== null) {
    const derived = clientCallableTools.derive({
      root: clientRoot ?? repoRoot,
      surfaces: clientSurfaces,
    });
    if (!derived.ok) {
      throw new DeployParityUsageError(
        clientCallableTools.format(derived, clientSurfaces),
      );
    }
    return {
      environment,
      projectId,
      clientSurfaces,
      repoFunctionCount: repository.functionNames.size,
      ...compareClientCallableParity({
        clientReferences: new Map(derived.callables.map((name) => [
          name,
          derived.references.get(name).surfaces,
        ])),
        deployedFunctionNames,
        declaredSecretNames: repository.secretNames,
        liveSecretNames,
      }),
    };
  }
  const validatedSelectedTargets = selectedFunctionTargets === null ? null :
    parseSelectedFunctionTargets(selectedFunctionTargets.join(","));
  const selectedFunctionNames = validatedSelectedTargets === null ? null :
    new Set(validatedSelectedTargets.map((target) =>
      target.slice("functions:".length)));
  return {
    environment,
    projectId,
    ...compareDeployParity({
      declaredSecretNames: repository.secretNames,
      deployedFunctionNames,
      liveSecretNames,
      repoFunctionNames: repository.functionNames,
      selectedFunctionNames,
    }),
  };
}

export function formatReport(report) {
  const checked = report.parityScope === "client" ?
    `client-referenced Function(s) from ${report.clientSurfaces.join(", ")}` :
    `${report.parityScope === "selected" ? "selected " : ""}` +
      "deployable source export(s)";
  const lines = [
    `${report.ok ? "PASS" : "FAIL"} deploy parity for ` +
      `${report.environment}: ${report.projectId}`,
    `  Functions: ${report.checkedFunctionCount} ${checked}, ` +
      `${report.deployedFunctionCount} deployed` +
      (report.parityScope === "client" ? "" :
        `, ${report.environmentOnlyFunctionCount} environment-only ignored`),
    `  Secrets: ${report.declaredSecretCount} defineSecret name(s), ` +
      `${report.liveSecretCount} present`,
  ];
  if (report.missingFunctions.length > 0) {
    const surfaces = report.missingFunctionSurfaces ?? {};
    lines.push(`  Missing Functions: ${report.missingFunctions.map((name) =>
      surfaces[name] ? `${name} (${surfaces[name].join(", ")})` : name,
    ).join(", ")}`);
  }
  if (report.missingSecrets.length > 0) {
    lines.push(`  Missing secrets: ${report.missingSecrets.join(", ")}`);
  }
  return lines.join("\n");
}

function usage() {
  return [
    "Usage: node tool/firebase/check_deploy_parity.mjs " +
      "--env <dev|prod> [options]",
    "",
    "Options:",
    "  --repo-root <path>  Read exports and defineSecret declarations here.",
    "  --targets <csv>      Check exact selected functions:<name> targets.",
    "  --client-callables <all|app,website,admin>",
    "                      Check Functions referenced by client source.",
    "  --client-root <path> Read client source here (default: --repo-root).",
    "  --json              Emit a machine-readable report.",
    "  --help              Show this help.",
  ].join("\n");
}

async function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      console.log(usage());
      return;
    }
    if (options.clientSurfaces !== null) {
      options.clientCallableTools = await loadClientCallableTools();
      options.clientSurfaces = resolveClientSurfaces(
        options.clientSurfaces,
        options.clientCallableTools.surfaces,
      );
    }
    const report = runDeployParity(options);
    console.log(
      options.json ? JSON.stringify(report, null, 2) : formatReport(report),
    );
    if (!report.ok) process.exitCode = 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = error.exitCode ?? 2;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
