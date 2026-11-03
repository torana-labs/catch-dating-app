#!/usr/bin/env node
/**
 * Read-only "what's live where" report. Compares this checkout (main) with
 * live Firebase environments across every place that decides which features
 * exist, then applies tool/firebase/environment_difference_policy.json: a
 * feature gate may differ between environments only through an unexpired,
 * owned allowedDifferences entry.
 *
 * Live reads are metadata-only: firebase functions:list / firestore:indexes /
 * remoteconfig:get, gh variable list, the GitHub environments API and the
 * Firebase Rules API. Nothing is written locally or remotely. Identity values
 * are fingerprinted; only feature gates and release state print literally.
 *
 *   node tool/firebase/report_environment_parity.mjs
 *   node tool/firebase/report_environment_parity.mjs --env dev,staging,prod --json
 *   node tool/firebase/report_environment_parity.mjs --surfaces functions,rules
 *   node tool/firebase/report_environment_parity.mjs --policy-only
 */

import {spawn} from "node:child_process";
import {createHash} from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {fileURLToPath} from "node:url";

import {parseCommonArgs} from "../lib/cli_args.mjs";
import {readFirebaseProjectAliases} from "../lib/firebase_project.mjs";
import {
  buildFunctionsListCommand,
  parseDeployedFunctionNames,
} from "./check_deploy_parity.mjs";
import {
  fetchProjectReleases,
  fetchRulesApiJson,
  normalizeRulesContent,
  normalizedRulesHash,
  readConfiguredRuleTargets,
  resolveRulesAccessToken,
  selectConfiguredReleases,
  selectRulesetSourceFile,
} from "./check_rules_deployment_drift.mjs";
import {
  listFirebaseFunctionExports,
  readDormantFirebaseFunctionTargets,
} from "./list_firebase_function_targets.mjs";
import {materializedNonSecretParams} from
  "./prepare_functions_params_for_deploy.mjs";
import {sanitizeFirestoreIndexesForDeploy} from
  "./sanitize_firestore_indexes_for_deploy.mjs";
import {indexSignature} from "./wait_firestore_indexes_ready.mjs";

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const defaultRepoRoot = path.resolve(toolDir, "../..");
const commandTimeoutMs = 180_000;
const policyPath = "tool/firebase/environment_difference_policy.json";
const policyClasses = new Set(["identity", "feature-gate", "release-state"]);
const discoverySources = new Set(["functions-param", "materialized-param",
  "github-variable", "dart-define", "remote-config-template"]);
const environments = ["dev", "staging", "prod"];
// GitHub environments whose variables feed each Firebase environment's builds
// and deploys. Production promotion may approve through either backend env.
const githubEnvironmentsFor = Object.freeze({
  dev: ["dev"],
  staging: ["staging"],
  prod: ["prod", "prod-backend", "prod-hosting", "prod-mobile"],
});

export const surfaceIds = Object.freeze([
  "functions",
  "function-params",
  "github-variables",
  "firestore-indexes",
  "rules",
  "dormant-policy",
  "client-callable-gates",
  "remote-config",
  "build-modes",
  "source-gates",
]);

export class EnvironmentParityUsageError extends Error {
  constructor(message) {
    super(message);
    this.name = "EnvironmentParityUsageError";
    this.exitCode = 64;
  }
}

export function parseArgs(argv) {
  let parsed;
  try {
    parsed = parseCommonArgs(argv, {
      allowPositionals: false,
      booleanFlags: ["--policy-only"],
      customFieldCase: "camel",
      valueFlags: ["--surfaces", "--repo-root"],
    });
  } catch (error) {
    throw new EnvironmentParityUsageError(error.message);
  }
  if (parsed.project || parsed.apply || parsed.allowProd || parsed.confirmProd ||
      parsed.emulatorHost) {
    throw new EnvironmentParityUsageError(
      "This report is read-only and accepts only --env, --surfaces, " +
        "--policy-only, --repo-root and --json.",
    );
  }
  const selectedEnvironments = splitList(parsed.env ?? "dev,prod");
  for (const environment of selectedEnvironments) {
    if (!environments.includes(environment)) {
      throw new EnvironmentParityUsageError(`Unknown environment: ${environment}`);
    }
  }
  const surfaces = splitList(parsed.surfaces ?? surfaceIds.join(","));
  for (const surface of surfaces) {
    if (!surfaceIds.includes(surface)) {
      throw new EnvironmentParityUsageError(`Unknown surface: ${surface}`);
    }
  }
  return {
    environments: selectedEnvironments,
    help: parsed.help,
    json: parsed.json,
    policyOnly: parsed.policyOnly === true,
    repoRoot: path.resolve(parsed.repoRoot ?? defaultRepoRoot),
    surfaces,
  };
}

function splitList(value) {
  const items = String(value).split(",").map((item) => item.trim());
  if (items.length === 0 || items.some((item) => item === "")) {
    throw new EnvironmentParityUsageError(`Invalid comma-separated list: ${value}`);
  }
  if (new Set(items).size !== items.length) {
    throw new EnvironmentParityUsageError(`Duplicate list entry in: ${value}`);
  }
  return items;
}

// ---------------------------------------------------------------------------
// Repository inventory (offline).

function readJson(repoRoot, relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf8"));
}

function listFiles(directory, predicate, files = []) {
  for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && entry.name !== "generated") {
        listFiles(entryPath, predicate, files);
      }
    } else if (entry.isFile() && predicate(entryPath)) {
      files.push(entryPath);
    }
  }
  return files;
}

// Records each `vars.NAME` read with its workflow-level `|| 'default'` and
// the GitHub environment of the reading job: a literal name, "*" for an
// expression-selected environment, or "" for a job without one.
export function scanWorkflowVariables(workflowSources) {
  const variables = new Map();
  for (const {file, contents} of workflowSources) {
    let inJobs = false;
    let jobEnvironment = "";
    const lines = contents.split("\n");
    const jobEnvironmentAt = (start) => {
      for (let index = start + 1; index < lines.length; index += 1) {
        if (/^ {2}\S/u.test(lines[index]) || /^\S/u.test(lines[index])) break;
        const match = lines[index].match(/^ {4}environment:\s*(.*)$/u);
        if (!match) continue;
        const value = match[1].trim() ||
          (lines[index + 1]?.match(/^ {6}name:\s*(.+)$/u)?.[1] ?? "").trim();
        return value.includes("${{") ? "*" : value.replace(/^["']|["']$/gu, "");
      }
      return "";
    };
    lines.forEach((line, index) => {
      if (/^jobs:\s*$/u.test(line)) inJobs = true;
      else if (/^\S/u.test(line)) inJobs = false;
      else if (inJobs && /^ {2}[A-Za-z0-9_-]+:\s*$/u.test(line)) {
        jobEnvironment = jobEnvironmentAt(index);
      }
      for (const match of line.matchAll(
        /vars\.([A-Z][A-Z0-9_]*)(?:\s*\|\|\s*'([^']*)')?/gu,
      )) {
        const entry = variables.get(match[1]) ??
          {defaults: new Set(), environments: new Set(), files: new Set()};
        entry.files.add(file);
        entry.environments.add(inJobs ? jobEnvironment : "");
        if (match[2] !== undefined) entry.defaults.add(match[2]);
        variables.set(match[1], entry);
      }
    });
  }
  return variables;
}

export function scanFunctionParamNames(sources) {
  const names = new Set();
  for (const {contents} of sources) {
    for (const match of contents.matchAll(
      /define(?:String|Boolean|Int|Float|List)\(\s*["']([A-Z][A-Z0-9_]*)["']/gu,
    )) {
      names.add(match[1]);
    }
  }
  return names;
}

// Hard-coded release holds are identical in every environment by
// construction; listing them keeps them visible next to runtime gates.
export function scanSourceGates(sources) {
  const gates = [];
  for (const {file, contents} of sources) {
    const lines = contents.split("\n");
    lines.forEach((line, index) => {
      const constant = line.match(
        /\bconst\s+([A-Za-z_]\w*(?:Enabled|Ready|Hold|Released))\s*(?::\s*boolean\s*)?=\s*(true|false)\s*;/u,
      );
      if (constant) {
        gates.push({file, line: index + 1, name: constant[1], value: constant[2]});
      }
      const nativeAnalytics = line.match(
        /(FIREBASE_ANALYTICS_COLLECTION_(?:DEACTIVATED|ENABLED)|firebase_analytics_collection_(?:deactivated|enabled))/u,
      );
      if (nativeAnalytics) {
        const valueLine = `${line}\n${lines[index + 1] ?? ""}`;
        const value = valueLine.match(/<(true|false)\s*\/>|android:value="(true|false)"/u);
        gates.push({
          file,
          line: index + 1,
          name: nativeAnalytics[1],
          value: value?.[1] ?? value?.[2] ?? "unknown",
        });
      }
    });
  }
  return gates.sort((left, right) =>
    left.file.localeCompare(right.file) || left.line - right.line);
}

// A retired switch must not come back as a quoted key in app or Functions
// source, whatever API reads it.
export function scanRetiredReferences(sources, names) {
  const references = [];
  for (const {file, contents} of sources) {
    for (const name of names) {
      if (contents.includes(`"${name}"`) || contents.includes(`'${name}'`)) {
        references.push({file, name});
      }
    }
  }
  return references;
}

function readSources(repoRoot, directory, predicate) {
  const root = path.join(repoRoot, directory);
  if (!fs.existsSync(root)) return [];
  return listFiles(root, predicate).map((file) => ({
    contents: fs.readFileSync(file, "utf8"),
    file: path.relative(repoRoot, file),
  }));
}

export function loadRepositoryState(repoRoot = defaultRepoRoot) {
  const functionExports = listFirebaseFunctionExports(repoRoot)
    .map((target) => target.slice("functions:".length));
  const dormant = readDormantFirebaseFunctionTargets(repoRoot)
    .map((target) => target.slice("functions:".length));
  const dormantSet = new Set(dormant);
  const functionSources = readSources(repoRoot, "functions/src", (file) =>
    file.endsWith(".ts") && !file.endsWith(".test.ts"));
  const dartDefinesDir = path.join(repoRoot, "tool/env/dart_defines");
  const dartDefines = Object.fromEntries(
    fs.readdirSync(dartDefinesDir)
      .filter((file) => file.endsWith(".json"))
      .sort()
      .map((file) => [file.slice(0, -".json".length),
        JSON.parse(fs.readFileSync(path.join(dartDefinesDir, file), "utf8"))]),
  );
  const dartSources = ["lib", "packages/platform/lib"].flatMap((root) => readSources(repoRoot, root, (file) =>
    file.endsWith(".dart") && !file.endsWith(".g.dart")));
  const policy = readJson(repoRoot, policyPath);
  const gateSources = [
    ...functionSources,
    ...dartSources,
    ...["apps/host/ios/Runner/Info.plist",
      "apps/host/android/app/src/main/AndroidManifest.xml",
      "apps/consumer/ios/Runner/Info.plist",
      "apps/consumer/android/app/src/main/AndroidManifest.xml"]
      .filter((file) => fs.existsSync(path.join(repoRoot, file)))
      .map((file) => ({
        contents: fs.readFileSync(path.join(repoRoot, file), "utf8"),
        file,
      })),
  ];
  return {
    aliases: readFirebaseProjectAliases(path.join(repoRoot, ".firebaserc")),
    callableDependencies: readJson(repoRoot,
      "tool/firebase/client_callable_dependencies.json").dependencies,
    dartDefines,
    deployableFunctions: functionExports.filter((name) => !dormantSet.has(name)),
    dormantFunctions: dormant,
    functionExports,
    functionParamNames: scanFunctionParamNames(functionSources),
    indexes: readJson(repoRoot, "firestore.indexes.json"),
    materializedParams: [...materializedNonSecretParams],
    policy,
    readinessTtl: (readJson(repoRoot, "tool/firebase/environment_readiness.json").requirements ?? [])
      .filter((requirement) => requirement.kind === "firestore-ttl")
      .map((requirement) => ({
        environments: requirement.environments ?? [],
        key: `${requirement.collectionGroup}.${requirement.field}`,
      })),
    remoteConfigTemplate: readJson(repoRoot, "firebase/remote_config.template.json"),
    ruleTargets: readConfiguredRuleTargets({repoRoot}),
    retiredReferences: scanRetiredReferences([...functionSources, ...dartSources],
      Object.keys(policy.retired ?? {})),
    sourceGates: scanSourceGates(gateSources),
    workflowVariables: scanWorkflowVariables(
      readSources(repoRoot, ".github/workflows", (file) => /\.ya?ml$/u.test(file)),
    ),
  };
}

// ---------------------------------------------------------------------------
// Policy (offline CI guard).

function isoDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/u.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

export function discoverSwitchNames(state) {
  const discovered = new Map();
  const add = (name, source) => {
    const sources = discovered.get(name) ?? new Set();
    sources.add(source);
    discovered.set(name, sources);
  };
  for (const name of state.materializedParams) add(name, "materialized-param");
  for (const name of state.functionParamNames) add(name, "functions-param");
  for (const name of state.workflowVariables.keys()) add(name, "github-variable");
  for (const defines of Object.values(state.dartDefines)) {
    for (const name of Object.keys(defines)) add(name, "dart-define");
  }
  for (const name of Object.keys(state.remoteConfigTemplate.parameters ?? {})) {
    add(name, "remote-config-template");
  }
  return discovered;
}

export function allowedDifferenceFor(policy, name) {
  return (policy.allowedDifferences ?? []).find((entry) => entry.switch === name) ?? null;
}

export function evaluatePolicy(state, {now = new Date()} = {}) {
  const violations = [];
  const policy = state.policy;
  if (policy?.version !== 1 || typeof policy.switches !== "object" ||
      !Array.isArray(policy.allowedDifferences)) {
    return {ok: false, violations: [`${policyPath} must be version 1 with switches and allowedDifferences.`]};
  }
  for (const [name, entry] of Object.entries(policy.switches)) {
    if (!policyClasses.has(entry?.class)) {
      violations.push(`${name}: unknown class ${JSON.stringify(entry?.class)}.`);
    }
    if (entry?.discovery !== undefined && entry.discovery !== "live") {
      violations.push(`${name}: discovery may only be "live".`);
    }
    if (entry?.discovery === "live" && typeof entry.note !== "string") {
      violations.push(`${name}: live-only switches need a note naming their reader.`);
    }
  }
  const retired = policy.retired ?? {};
  for (const [name, entry] of Object.entries(retired)) {
    if (policy.switches[name]) {
      violations.push(`${name}: listed as both a switch and retired.`);
    }
    const allowedIn = entry?.allowedIn;
    if (!Array.isArray(allowedIn) ||
        allowedIn.some((source) => !discoverySources.has(source))) {
      violations.push(`${name}: retired allowedIn must list discovery sources.`);
    } else if (allowedIn.length > 0 &&
        (!/^CAT-[1-9][0-9]*$/u.test(entry.ticket ?? "") ||
         typeof entry.note !== "string")) {
      violations.push(`${name}: a retired switch still allowed somewhere needs a CAT ticket and note.`);
    }
    const hold = entry?.liveHold;
    if (hold !== undefined && (!Array.isArray(hold?.environments) ||
        hold.environments.length === 0 ||
        hold.environments.some((env) => !environments.includes(env)) ||
        typeof hold.value !== "string" ||
        [hold.reason, hold.until].some((text) => typeof text !== "string" || !text.trim()))) {
      violations.push(`${name}: a live hold needs environments, a value, a reason and an until condition.`);
    }
  }
  for (const {file, name} of state.retiredReferences ?? []) {
    violations.push(`${name}: retired switch is referenced again in ${file}.`);
  }
  const discovered = discoverSwitchNames(state);
  for (const [name, sources] of [...discovered].sort(([a], [b]) => a.localeCompare(b))) {
    if (retired[name]) {
      const allowed = new Set(retired[name].allowedIn ?? []);
      const reappeared = [...sources].filter((source) => !allowed.has(source)).sort();
      if (reappeared.length) {
        violations.push(`${name}: retired switch reappeared as ${reappeared.join("/")}.`);
      }
    } else if (!policy.switches[name]) {
      violations.push(
        `${name}: environment-conditional ${[...sources].sort().join("/")} is not ` +
          `classified in ${policyPath}.`,
      );
    }
  }
  for (const [name, entry] of Object.entries(policy.switches)) {
    if (entry?.discovery !== "live" && !discovered.has(name)) {
      violations.push(`${name}: no longer read anywhere; remove it from ${policyPath}.`);
    }
    if (entry?.discovery === "live" && discovered.has(name)) {
      violations.push(`${name}: now discovered in source; drop its "live" discovery marker.`);
    }
  }
  const today = now.toISOString().slice(0, 10);
  const seen = new Set();
  for (const entry of policy.allowedDifferences) {
    const label = `allowedDifferences ${entry?.switch ?? "<missing switch>"}`;
    if (seen.has(entry?.switch)) violations.push(`${label}: duplicate entry.`);
    seen.add(entry?.switch);
    if (policy.switches[entry?.switch]?.class !== "feature-gate") {
      violations.push(`${label}: only classified feature gates may differ.`);
    }
    for (const field of ["owner", "reason"]) {
      if (typeof entry?.[field] !== "string" || entry[field].trim() === "") {
        violations.push(`${label}: ${field} is required.`);
      }
    }
    if (!/^CAT-[1-9][0-9]*$/u.test(entry?.ticket ?? "")) {
      violations.push(`${label}: ticket must be a CAT Linear issue id.`);
    }
    if (!isoDate(entry?.expires)) {
      violations.push(`${label}: expires must be a YYYY-MM-DD date.`);
    } else if (entry.expires < today) {
      violations.push(`${label}: expired on ${entry.expires}; flip the gate or renew it.`);
    }
  }
  const gateDefines = ["dev", "staging", "prod"].filter((env) => state.dartDefines[env]);
  for (const name of new Set(gateDefines.flatMap((env) => Object.keys(state.dartDefines[env])))) {
    if (policy.switches[name]?.class !== "feature-gate") continue;
    const values = new Set(gateDefines.map((env) => String(state.dartDefines[env][name] ?? "")));
    if (values.size > 1 && !allowedDifferenceFor(policy, name)) {
      violations.push(
        `${name}: tool/env/dart_defines gives this feature gate different values ` +
          `(${gateDefines.map((env) => `${env}=${state.dartDefines[env][name] ?? "unset"}`).join(", ")}).`,
      );
    }
  }
  return {ok: violations.length === 0, discoveredCount: discovered.size, violations};
}

// ---------------------------------------------------------------------------
// Value presentation and comparison helpers.

export function fingerprint(value) {
  return createHash("sha256").update(String(value)).digest("hex").slice(0, 8);
}

function normalizedValue(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed === "" ? null : trimmed;
}

export function displayValue(policy, name, value) {
  if (value === MISSING) return "absent";
  if (value === UNAVAILABLE) return "n/a";
  const normalized = normalizedValue(value);
  if (normalized === null) return "unset";
  const switchClass = policy.switches?.[name]?.class;
  if (switchClass === "feature-gate" || switchClass === "release-state" ||
      policy.retired?.[name] || isBooleanText(normalized)) {
    return normalized.length > 48 ? `${normalized.slice(0, 45)}...` : normalized;
  }
  return `set#${fingerprint(normalized)}`;
}

const MISSING = Symbol("missing");
const UNAVAILABLE = Symbol("unavailable");

function isBooleanText(value) {
  return /^(?:true|false)$/iu.test(value);
}

function comparableValue(value) {
  if (value === UNAVAILABLE) return UNAVAILABLE;
  if (value === MISSING) return null;
  return normalizedValue(value);
}

/**
 * Classify one switch row. `columns` maps column -> raw value; `compared`
 * names the environment columns whose agreement the policy governs.
 */
export function classifySwitchRow({policy, name, columns, compared,
  retiredCompatible = false}) {
  if (policy.retired?.[name]) {
    // A live hold keeps a retired key at its old value for builds that still
    // read it; anywhere else a remaining value is cleanup.
    const hold = policy.retired[name].liveHold;
    const held = new Set(hold?.environments ?? []);
    const live = Object.entries(columns).some(([column, value]) => !held.has(column) &&
      value !== UNAVAILABLE && comparableValue(value) !== null);
    const flags = live ? [retiredCompatible ? "RETIRED-COMPAT" : "RETIRED-STILL-LIVE"] : [];
    for (const env of held) {
      if (!(env in columns) || columns[env] === UNAVAILABLE) continue;
      flags.push(comparableValue(columns[env]) === hold.value ?
        `RETIRED-LIVE-HOLD:${env}` : `RETIRED-HOLD-BROKEN:${env}`);
    }
    return {
      class: "retired",
      differs: flags.length > 0,
      flags,
      name,
      values: Object.fromEntries(Object.entries(columns)
        .map(([column, value]) => [column, displayValue(policy, name, value)])),
    };
  }
  const switchClass = policy.switches?.[name]?.class ?? null;
  const comparable = compared
    .map((column) => comparableValue(columns[column]))
    .filter((value) => value !== UNAVAILABLE);
  const differs = new Set(comparable).size > 1;
  const flags = [];
  if (!switchClass) flags.push("UNCLASSIFIED");
  if (differs && switchClass === "feature-gate") {
    flags.push(allowedDifferenceFor(policy, name) ? "ALLOWED-DIFFERENCE" : "UNDECLARED-DIFFERENCE");
  }
  if (switchClass === "identity" && comparable.length > 1 && !differs &&
      comparable[0] !== null && !isBooleanText(comparable[0])) {
    flags.push("SHARED-IDENTITY");
  }
  return {
    class: switchClass,
    differs,
    flags,
    name,
    values: Object.fromEntries(Object.entries(columns)
      .map(([column, value]) => [column, displayValue(policy, name, value)])),
  };
}

function lineDelta(left, right) {
  const count = (text) => {
    const counts = new Map();
    for (const line of normalizeRulesContent(text).split("\n")) {
      counts.set(line, (counts.get(line) ?? 0) + 1);
    }
    return counts;
  };
  const leftCounts = count(left);
  const rightCounts = count(right);
  let added = 0;
  let removed = 0;
  for (const [line, total] of rightCounts) added += Math.max(0, total - (leftCounts.get(line) ?? 0));
  for (const [line, total] of leftCounts) removed += Math.max(0, total - (rightCounts.get(line) ?? 0));
  return {added, removed};
}

// ---------------------------------------------------------------------------
// Comparators (pure).

export function compareFunctions({repo, live}) {
  const envs = Object.keys(live);
  const deployable = new Set(repo.deployableFunctions);
  const dormant = new Set(repo.dormantFunctions);
  const names = new Set(repo.deployableFunctions);
  const extensions = {};
  for (const env of envs) {
    if (!live[env]) continue;
    extensions[env] = [...live[env]].filter((name) => name.startsWith("ext-")).length;
    for (const name of live[env]) if (!name.startsWith("ext-")) names.add(name);
  }
  const rows = [];
  const counts = {liveOnly: {}, missing: {}, missingEverywhere: 0};
  for (const env of envs) {
    counts.missing[env] = 0;
    counts.liveOnly[env] = 0;
  }
  for (const name of [...names].sort()) {
    const main = deployable.has(name) ? "deployable" : dormant.has(name) ? "dormant" : "absent";
    const values = {main};
    let differs = false;
    let presentSomewhere = false;
    for (const env of envs) {
      if (!live[env]) {
        values[env] = "n/a";
        continue;
      }
      const present = live[env].has(name);
      presentSomewhere ||= present;
      values[env] = present ? "live" : "absent";
      if (main === "deployable" && !present) {
        counts.missing[env] += 1;
        differs = true;
      }
      if (main !== "deployable" && present) {
        counts.liveOnly[env] += 1;
        differs = true;
      }
    }
    if (main === "deployable" && !presentSomewhere &&
        envs.some((env) => live[env])) {
      counts.missingEverywhere += 1;
    }
    if (differs) rows.push({differs, flags: [], name, values});
  }
  return {
    columns: ["main", ...envs],
    counts: {...counts, deployable: deployable.size, extensions, exports: repo.functionExports.length},
    rows,
  };
}

export function parseFunctionEnvironment(functionsListStdout) {
  const parsed = JSON.parse(functionsListStdout);
  const params = new Map();
  for (const entry of parsed.result ?? []) {
    if (typeof entry?.id !== "string" || entry.id.startsWith("ext-")) continue;
    for (const [name, value] of Object.entries(entry.environmentVariables ?? {})) {
      const values = params.get(name) ?? new Map();
      const normalized = normalizedValue(value) ?? "";
      values.set(normalized, (values.get(normalized) ?? 0) + 1);
      params.set(name, values);
    }
  }
  return params;
}

export function compareFunctionParams({repo, policy, liveParams, githubVariables, envs}) {
  const rows = [];
  for (const name of repo.materializedParams) {
    const columns = {};
    const mixed = [];
    for (const env of envs) {
      const values = liveParams[env];
      if (values === undefined) {
        columns[`${env}:live`] = UNAVAILABLE;
      } else {
        const observed = values.get(name);
        if (!observed) {
          columns[`${env}:live`] = MISSING;
        } else {
          const ranked = [...observed].sort((left, right) => right[1] - left[1]);
          columns[`${env}:live`] = ranked[0][0];
          if (ranked.length > 1) mixed.push(env);
        }
      }
      const github = githubVariables?.byEnvironment;
      const sourceEnv = env === "prod" ? "prod-backend" : env;
      columns[`${env}:next`] = github?.[sourceEnv] === undefined ?
        UNAVAILABLE : github[sourceEnv][name] ?? MISSING;
    }
    const row = classifySwitchRow({
      columns,
      compared: envs.map((env) => `${env}:live`),
      name,
      policy,
      retiredCompatible:
        policy.retired?.[name]?.allowedIn?.includes("materialized-param") === true,
    });
    for (const env of mixed) row.flags.push(`MIXED-VALUES-IN-${env.toUpperCase()}`);
    for (const env of envs) {
      // An unset variable deploys the materializer's source default, which
      // this report does not re-derive; only explicit values can be pending.
      const live = comparableValue(columns[`${env}:live`]);
      const next = comparableValue(columns[`${env}:next`]);
      if (columns[`${env}:next`] === MISSING) row.values[`${env}:next`] = "default";
      if (live !== UNAVAILABLE && next !== UNAVAILABLE && next !== null &&
          String(live).toLowerCase() !== next.toLowerCase()) {
        row.flags.push(`PENDING-DEPLOY-${env.toUpperCase()}`);
      }
    }
    rows.push(row);
  }
  return {
    columns: envs.flatMap((env) => [`${env}:live`, `${env}:next`]),
    rows,
  };
}

export function compareGithubVariables({policy, githubVariables, workflowVariables}) {
  const envNames = Object.keys(githubVariables.byEnvironment).sort();
  const names = new Set(workflowVariables.keys());
  for (const values of Object.values(githubVariables.byEnvironment)) {
    for (const name of Object.keys(values)) names.add(name);
  }
  const prodFamily = envNames.filter((env) => env === "prod" || env.startsWith("prod-"));
  const rows = [];
  // Inventory and hygiene only: dev/prod agreement of deployed values is
  // judged by function-params (live) and build-modes (effective defaults).
  for (const name of [...names].sort()) {
    const columns = Object.fromEntries(envNames.map((env) => [
      env, githubVariables.byEnvironment[env][name] ?? MISSING]));
    const row = classifySwitchRow({columns, compared: [], name, policy});
    const readers = workflowVariables.get(name)?.environments;
    const read = (env) => readers?.has("*") || readers?.has(env);
    const prodDefined = prodFamily.filter((env) => columns[env] !== MISSING);
    const prodValues = new Set(prodDefined.map((env) => normalizedValue(columns[env])));
    // Separate credentials per delivery lane are by design; a gate or
    // release value that two read lanes disagree on is not.
    const readProdValues = new Set(prodDefined.filter(read)
      .map((env) => normalizedValue(columns[env])));
    if (row.class !== "identity" && readProdValues.size > 1) {
      row.flags.push("PROD-ENVIRONMENTS-DISAGREE");
    }
    const devValue = normalizedValue(columns.dev === MISSING ? null : columns.dev);
    if (row.class === "identity" && devValue !== null && prodValues.has(devValue) &&
        !isBooleanText(devValue)) {
      row.flags.push("SHARED-IDENTITY");
    }
    if (!readers) {
      row.flags.push("UNREFERENCED-BY-WORKFLOWS");
    } else if (!readers.has("*")) {
      const unread = envNames.filter((env) => columns[env] !== MISSING && !readers.has(env));
      if (unread.length) row.flags.push(`UNREAD-IN:${unread.join(",")}`);
    }
    const defaults = [...(workflowVariables.get(name)?.defaults ?? [])];
    if (defaults.length) row.workflowDefault = defaults.join(" | ");
    row.differs = readProdValues.size > 1;
    rows.push(row);
  }
  return {columns: envNames, rows};
}

function normalizeFieldOverrides(document) {
  const overrides = new Map();
  for (const override of document.fieldOverrides ?? []) {
    const key = `${override.collectionGroup}.${override.fieldPath}`;
    const indexes = (override.indexes ?? []).map((index) =>
      `${String(index.queryScope ?? "COLLECTION").toUpperCase()}:` +
      `${String(index.order ?? index.mode ?? index.arrayConfig ?? "?").toUpperCase()}`).sort();
    overrides.set(key, JSON.stringify({indexes, ttl: override.ttl === true}));
  }
  return overrides;
}

export function compareFirestoreIndexes({repoDocument, live, readinessTtl = []}) {
  const envs = Object.keys(live);
  const composite = new Map();
  const fields = new Map();
  const counts = {};
  const repoOverrides = normalizeFieldOverrides(repoDocument);
  for (const env of envs) {
    if (!live[env]) continue;
    const desired = sanitizeFirestoreIndexesForDeploy({
      current: {indexes: live[env].indexes ?? []},
      packaged: {indexes: repoDocument.indexes, fieldOverrides: repoDocument.fieldOverrides},
    }).document.indexes;
    const desiredSignatures = new Map(desired.map((index) =>
      [indexSignature(index, {desired: true}), index]));
    const liveSignatures = new Map((live[env].indexes ?? []).map((index) =>
      [indexSignature(index), index]));
    counts[env] = {
      compositeMissing: 0,
      compositeLiveOnly: 0,
      fieldOverridesDiffer: 0,
    };
    for (const [signature, index] of desiredSignatures) {
      const entry = composite.get(signature) ?? {collectionGroup: index.collectionGroup, values: {}};
      entry.values.main = "declared";
      if (!liveSignatures.has(signature)) {
        entry.values[env] = "absent";
        counts[env].compositeMissing += 1;
      } else {
        entry.values[env] = "live";
      }
      composite.set(signature, entry);
    }
    for (const [signature, index] of liveSignatures) {
      if (desiredSignatures.has(signature)) continue;
      const entry = composite.get(signature) ??
        {collectionGroup: String(index.collectionGroup), values: {main: "absent"}};
      entry.values[env] = "live";
      counts[env].compositeLiveOnly += 1;
      composite.set(signature, entry);
    }
    const liveOverrides = normalizeFieldOverrides(live[env]);
    // TTL policies owned by environment_readiness.json are applied out of
    // band; they are declared state, not drift, when the live TTL is on.
    const readinessKeys = readinessTtl
      .filter((requirement) => requirement.environments.includes(env))
      .map((requirement) => requirement.key);
    for (const key of new Set([...repoOverrides.keys(), ...liveOverrides.keys(), ...readinessKeys])) {
      const main = repoOverrides.get(key) ?? null;
      const current = liveOverrides.get(key) ?? null;
      if (main === null && readinessKeys.includes(key)) {
        const entry = fields.get(key) ?? {values: {main: "readiness TTL"}};
        const ttlLive = current !== null && JSON.parse(current).ttl;
        entry.values[env] = ttlLive ? "match" : "ttl absent";
        if (!ttlLive) counts[env].fieldOverridesDiffer += 1;
        fields.set(key, entry);
        continue;
      }
      const entry = fields.get(key) ?? {values: {main: main ? "declared" : "absent"}};
      entry.values[env] = current === null ? "absent" : main === null ? "live-only" :
        current === main ? "match" : "differs";
      if (current !== main) counts[env].fieldOverridesDiffer += 1;
      fields.set(key, entry);
    }
  }
  const rows = [];
  for (const [signature, entry] of composite) {
    const states = envs.map((env) => entry.values[env] ?? (live[env] ? "absent" : "n/a"));
    if (entry.values.main === "declared" && states.every((state) => state === "live")) continue;
    rows.push({
      differs: true,
      flags: [],
      name: `${entry.collectionGroup} ${summarizeSignature(signature)}`,
      values: {main: entry.values.main, ...Object.fromEntries(envs.map((env, i) => [env, states[i]]))},
    });
  }
  for (const [key, entry] of fields) {
    const states = envs.map((env) => entry.values[env] ?? (live[env] ? "absent" : "n/a"));
    if (states.every((state) => state === "match")) continue;
    rows.push({
      differs: true,
      flags: [],
      name: `fieldOverride ${key}`,
      values: {main: entry.values.main, ...Object.fromEntries(envs.map((env, i) => [env, states[i]]))},
    });
  }
  rows.sort((left, right) => left.name.localeCompare(right.name));
  return {columns: ["main", ...envs], counts, rows};
}

function summarizeSignature(signature) {
  const parsed = JSON.parse(signature);
  const fieldsText = parsed.fields
    .filter((field) => field.fieldPath !== "__name__")
    .map((field) => `${field.fieldPath}:${(field.order ?? field.arrayConfig ?? "vector").slice(0, 4)}`)
    .join(",");
  return `[${parsed.queryScope === "COLLECTION_GROUP" ? "group " : ""}${fieldsText}]`;
}

export function compareRules({targets, live}) {
  const envs = Object.keys(live);
  const rows = [];
  for (const target of targets) {
    const values = {main: normalizedRulesHash(target.content).slice(0, 12)};
    const remoteHashes = [];
    let differs = false;
    for (const env of envs) {
      const remote = live[env]?.find((entry) => entry.kind === target.kind);
      if (!live[env]) {
        values[env] = "n/a";
      } else if (!remote) {
        values[env] = "no active release";
        differs = true;
      } else {
        const remoteHash = normalizedRulesHash(remote.content);
        remoteHashes.push(remoteHash);
        if (remoteHash === normalizedRulesHash(target.content)) {
          values[env] = "match";
        } else {
          const delta = lineDelta(target.content, remote.content);
          values[env] = `drift +${delta.added}/-${delta.removed} lines vs main`;
          differs = true;
        }
      }
    }
    const flags = [];
    if (new Set(remoteHashes).size > 1) flags.push("ENVIRONMENTS-DISAGREE");
    rows.push({differs, flags, name: `${target.kind} (${target.localPath})`, values});
  }
  return {columns: ["main", ...envs], rows};
}

export function compareDormantPolicy({repo, live}) {
  const envs = Object.keys(live);
  const rows = repo.dormantFunctions.map((name) => {
    const values = {main: repo.functionExports.includes(name) ? "dormant" : "not exported"};
    const flags = [];
    for (const env of envs) {
      values[env] = !live[env] ? "n/a" : live[env].has(name) ? "live" : "absent";
      if (values[env] === "live") flags.push(`DORMANT-BUT-LIVE-IN-${env.toUpperCase()}`);
    }
    if (values.main === "not exported") flags.push("STALE-DORMANT-ENTRY");
    return {differs: flags.length > 0, flags, name, values};
  });
  return {columns: ["main", ...envs], rows};
}

export function compareCallableGates({repo, live}) {
  const envs = Object.keys(live);
  const rows = repo.callableDependencies.map((entry) => {
    const values = {scope: `${entry.appRole}@${entry.environment}`};
    for (const env of envs) {
      values[env] = !live[env] ? "n/a" : live[env].has(entry.callable) ? "live" : "absent";
    }
    const flags = ["ENVIRONMENT-SCOPED"];
    for (const env of envs) {
      if (env === entry.environment && values[env] === "absent") flags.push("REQUIRED-CALLABLE-ABSENT");
    }
    return {differs: true, flags, name: `${entry.id} -> ${entry.callable}`, values};
  });
  return {columns: ["scope", ...envs], rows};
}

function remoteConfigParameters(template) {
  const parameters = {...(template?.parameters ?? {})};
  for (const group of Object.values(template?.parameterGroups ?? {})) {
    Object.assign(parameters, group.parameters ?? {});
  }
  return parameters;
}

export function compareRemoteConfig({policy, template, live}) {
  const envs = Object.keys(live);
  const templateParameters = remoteConfigParameters(template);
  const liveParameters = Object.fromEntries(envs.map((env) =>
    [env, live[env] ? remoteConfigParameters(live[env]) : null]));
  const names = new Set(Object.keys(templateParameters));
  for (const parameters of Object.values(liveParameters)) {
    for (const name of Object.keys(parameters ?? {})) names.add(name);
  }
  // A held key must stay live, so its absence is reported too.
  for (const [name, entry] of Object.entries(policy.retired ?? {})) {
    if (entry?.liveHold) names.add(name);
  }
  const rows = [];
  for (const name of [...names].sort()) {
    const valueOf = (parameter) =>
      parameter === undefined ? MISSING : parameter.defaultValue?.value ??
        (parameter.defaultValue?.useInAppDefault ? "<in-app default>" : MISSING);
    const columns = {main: valueOf(templateParameters[name])};
    for (const env of envs) {
      columns[env] = liveParameters[env] ? valueOf(liveParameters[env][name]) : UNAVAILABLE;
    }
    const row = classifySwitchRow({columns, compared: envs, name, policy});
    if (!(name in templateParameters) && !policy.retired?.[name]) {
      row.flags.push("NOT-IN-TEMPLATE");
    }
    for (const env of envs) {
      if (Object.keys(liveParameters[env]?.[name]?.conditionalValues ?? {}).length) {
        row.flags.push(`CONDITIONAL-IN-${env.toUpperCase()}`);
      }
    }
    const templateValue = comparableValue(columns.main);
    const differsFromTemplate = envs.some((env) => {
      const value = comparableValue(columns[env]);
      return value !== UNAVAILABLE && value !== templateValue;
    });
    row.differs ||= differsFromTemplate;
    rows.push(row);
  }
  return {
    columns: ["main", ...envs],
    rows,
    versions: Object.fromEntries(envs.map((env) =>
      [env, live[env]?.version?.versionNumber ?? null])),
  };
}

export function compareBuildModes({policy, repo, githubVariables, envs}) {
  const rows = [];
  for (const [name, entry] of [...repo.workflowVariables].sort(([a], [b]) => a.localeCompare(b))) {
    if (entry.defaults.size === 0) continue;
    const fallback = [...entry.defaults].join(" | ");
    const columns = {"workflow-default": fallback};
    for (const env of envs) {
      const sources = githubEnvironmentsFor[env]
        .map((githubEnv) => githubVariables?.byEnvironment?.[githubEnv]?.[name])
        .filter((value) => value !== undefined);
      columns[env] = githubVariables ? sources[0] ?? fallback : UNAVAILABLE;
    }
    const row = classifySwitchRow({columns, compared: envs, name, policy});
    row.name = `web:${name}`;
    const defaulted = envs.filter((env) => githubVariables && githubEnvironmentsFor[env]
      .every((githubEnv) => githubVariables.byEnvironment?.[githubEnv]?.[name] === undefined));
    if (defaulted.length) row.flags.push(`FROM-WORKFLOW-DEFAULT:${defaulted.join(",")}`);
    rows.push(row);
  }
  const defineEnvs = Object.keys(repo.dartDefines).filter((env) => envs.includes(env));
  const defineNames = new Set(defineEnvs.flatMap((env) => Object.keys(repo.dartDefines[env])));
  for (const name of [...defineNames].sort()) {
    const columns = Object.fromEntries(defineEnvs.map((env) =>
      [env, repo.dartDefines[env][name] ?? MISSING]));
    const row = classifySwitchRow({columns, compared: defineEnvs, name, policy});
    row.name = `dart:${name}`;
    rows.push(row);
  }
  return {columns: ["workflow-default", ...envs], rows};
}

// ---------------------------------------------------------------------------
// Live collection (read-only commands only).

const readOnlyCommandPrefixes = Object.freeze([
  ["firebase", "functions:list"],
  ["firebase", "firestore:indexes"],
  ["firebase", "remoteconfig:get"],
  ["gh", "variable", "list"],
  ["gh", "api"],
  ["git", "rev-parse"],
]);

export function assertReadOnlyCommand({command, args}) {
  const prefix = readOnlyCommandPrefixes.find((candidate) =>
    candidate[0] === command && candidate.slice(1).every((part, index) => args[index] === part));
  const mutatingFlag = args.find((arg) =>
    /^(?:-X|--method|-f|-F|--field|--raw-field|--input|-o|--output|--force|--set|--delete)(?:=|$)/u.test(arg));
  if (!prefix || mutatingFlag) {
    throw new Error(`Refusing non-read-only command: ${command} ${args.join(" ")}`);
  }
  if (command === "gh" && args[0] === "api" &&
      !/^repos\/\{owner\}\/\{repo\}\/environments(?:\?.*)?$/u.test(args[1] ?? "")) {
    throw new Error(`Refusing unexpected GitHub API path: ${args[1]}`);
  }
}

function defaultRunCommand({command, args, cwd}) {
  assertReadOnlyCommand({args, command});
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      env: {...process.env, CLOUDSDK_CORE_DISABLE_PROMPTS: "1", NO_UPDATE_NOTIFIER: "1"},
      shell: false,
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => child.kill("SIGTERM"), commandTimeoutMs);
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", (error) => {
      clearTimeout(timer);
      resolve({error, status: null, stderr, stdout});
    });
    child.on("close", (status) => {
      clearTimeout(timer);
      resolve({status, stderr, stdout});
    });
  });
}

async function runReadOnly(runCommand, spec, label) {
  assertReadOnlyCommand(spec);
  const result = await runCommand(spec);
  if (result?.status === 0 && !result.error) return result.stdout;
  const detail = result?.error?.message ||
    result?.stderr?.trim().split("\n").find(Boolean) ||
    `exit ${result?.status ?? "unknown"}`;
  throw new Error(`${label} failed: ${detail}`);
}

function parseFirebaseJson(stdout, label) {
  const parsed = JSON.parse(stdout);
  if (parsed?.status !== "success") throw new Error(`${label} did not succeed.`);
  return parsed.result;
}

async function settle(promise) {
  try {
    return {ok: true, value: await promise};
  } catch (error) {
    return {error: error instanceof Error ? error.message : String(error), ok: false};
  }
}

export async function collectLiveState({
  envs,
  needs,
  repo,
  repoRoot,
  runCommand = defaultRunCommand,
  fetchJson = fetchRulesApiJson,
  rulesCredentials = undefined,
}) {
  const run = (args, label, command = "firebase") =>
    runReadOnly(runCommand, {args, command, cwd: repoRoot}, label);
  const perEnvironment = {};
  const credentials = needs.has("rules") ?
    rulesCredentials === undefined ? resolveRulesAccessToken() : rulesCredentials :
    null;
  await Promise.all(envs.map(async (env) => {
    const projectId = repo.aliases[env];
    const tasks = {};
    if (needs.has("functions")) {
      const {args} = buildFunctionsListCommand(projectId);
      tasks.functions = settle(run(args, `firebase functions:list (${env})`).then((stdout) => ({
        names: parseDeployedFunctionNames(stdout),
        params: parseFunctionEnvironment(stdout),
      })));
    }
    if (needs.has("firestore-indexes")) {
      tasks.indexes = settle(run(
        ["firestore:indexes", "--project", projectId, "--json"],
        `firebase firestore:indexes (${env})`,
      ).then((stdout) => parseFirebaseJson(stdout, "firestore:indexes")));
    }
    if (needs.has("remote-config")) {
      tasks.remoteConfig = settle(run(
        ["remoteconfig:get", "--project", projectId, "--json"],
        `firebase remoteconfig:get (${env})`,
      ).then((stdout) => parseFirebaseJson(stdout, "remoteconfig:get")));
    }
    if (needs.has("rules")) {
      tasks.rules = settle((async () => {
        if (!credentials) throw new Error("no Rules API credential (authenticate gcloud)");
        const releases = await fetchProjectReleases({
          accessToken: credentials.token, fetchJson, projectId,
        });
        const selected = selectConfiguredReleases({
          projectId, releases, targets: repo.ruleTargets,
        });
        const rulesets = new Map();
        const results = [];
        for (const target of selected) {
          if (!target.release) continue;
          const name = target.release.rulesetName;
          if (!rulesets.has(name)) {
            rulesets.set(name, await fetchJson(
              `https://firebaserules.googleapis.com/v1/${name}`, credentials.token));
          }
          results.push({
            content: selectRulesetSourceFile({
              expectedPath: target.localPath, ruleset: rulesets.get(name),
            }).content,
            kind: target.kind,
          });
        }
        return results;
      })());
    }
    const settled = {};
    for (const [key, task] of Object.entries(tasks)) settled[key] = await task;
    perEnvironment[env] = {projectId, ...settled};
  }));
  let githubVariables = null;
  if (needs.has("github")) {
    githubVariables = await settle((async () => {
      const listing = JSON.parse(await run(
        ["api", "repos/{owner}/{repo}/environments"], "GitHub environments", "gh"));
      const names = (listing.environments ?? []).map((environment) => environment.name).sort();
      const byEnvironment = {};
      await Promise.all(names.map(async (name) => {
        const variables = JSON.parse(await run(
          ["variable", "list", "--env", name, "--json", "name,value"],
          `gh variable list (${name})`, "gh"));
        byEnvironment[name] = Object.fromEntries(
          variables.map((variable) => [variable.name, variable.value]));
      }));
      return {byEnvironment};
    })());
  }
  return {githubVariables, perEnvironment};
}

// ---------------------------------------------------------------------------
// Report assembly.

function surfaceNeeds(surfaces) {
  const needs = new Set();
  for (const surface of surfaces) {
    if (["functions", "function-params", "dormant-policy", "client-callable-gates"].includes(surface)) {
      needs.add("functions");
    }
    if (["function-params", "github-variables", "build-modes"].includes(surface)) needs.add("github");
    if (surface === "firestore-indexes") needs.add("firestore-indexes");
    if (surface === "remote-config") needs.add("remote-config");
    if (surface === "rules") needs.add("rules");
  }
  return needs;
}

function liveFor(live, envs, key, project = (value) => value) {
  const errors = {};
  const values = {};
  for (const env of envs) {
    const entry = live.perEnvironment[env]?.[key];
    if (entry?.ok) values[env] = project(entry.value);
    else {
      values[env] = null;
      if (entry) errors[env] = entry.error;
    }
  }
  return {errors, values};
}

export function buildReport({envs, live, now = new Date(), repo, sourceSha, surfaces}) {
  const policy = repo.policy;
  const report = {
    environments: Object.fromEntries(envs.map((env) => [env, repo.aliases[env]])),
    generatedAt: now.toISOString(),
    policy: evaluatePolicy(repo, {now}),
    sourceSha,
    surfaces: {},
  };
  const githubOk = live.githubVariables?.ok ? live.githubVariables.value : null;
  const githubError = live.githubVariables && !live.githubVariables.ok ?
    {github: live.githubVariables.error} : {};
  const functionsLive = liveFor(live, envs, "functions", (value) => value.names);
  for (const surface of surfaces) {
    let result;
    let errors = {};
    if (surface === "functions") {
      result = compareFunctions({live: functionsLive.values, repo});
      errors = functionsLive.errors;
    } else if (surface === "function-params") {
      const params = liveFor(live, envs, "functions", (value) => value.params);
      result = compareFunctionParams({
        envs,
        githubVariables: githubOk,
        liveParams: Object.fromEntries(Object.entries(params.values)
          .filter(([, value]) => value !== null)),
        policy,
        repo,
      });
      errors = {...params.errors, ...githubError};
    } else if (surface === "github-variables") {
      result = githubOk ? compareGithubVariables({
        githubVariables: githubOk, policy, workflowVariables: repo.workflowVariables,
      }) : {columns: [], rows: []};
      errors = githubError;
    } else if (surface === "firestore-indexes") {
      const indexes = liveFor(live, envs, "indexes");
      result = compareFirestoreIndexes({
        live: indexes.values, readinessTtl: repo.readinessTtl ?? [], repoDocument: repo.indexes,
      });
      errors = indexes.errors;
    } else if (surface === "rules") {
      const rules = liveFor(live, envs, "rules");
      result = compareRules({live: rules.values, targets: repo.ruleTargets});
      errors = rules.errors;
    } else if (surface === "dormant-policy") {
      result = compareDormantPolicy({live: functionsLive.values, repo});
      errors = functionsLive.errors;
    } else if (surface === "client-callable-gates") {
      result = compareCallableGates({live: functionsLive.values, repo});
      errors = functionsLive.errors;
    } else if (surface === "remote-config") {
      const remoteConfig = liveFor(live, envs, "remoteConfig");
      result = compareRemoteConfig({
        live: remoteConfig.values, policy, template: repo.remoteConfigTemplate,
      });
      errors = remoteConfig.errors;
    } else if (surface === "build-modes") {
      result = compareBuildModes({envs, githubVariables: githubOk, policy, repo});
      errors = githubError;
    } else if (surface === "source-gates") {
      result = {
        columns: ["value"],
        rows: repo.sourceGates.map((gate) => ({
          differs: false,
          flags: ["SAME-IN-EVERY-ENVIRONMENT"],
          name: `${gate.name} (${gate.file}:${gate.line})`,
          values: {value: gate.value},
        })),
      };
    }
    report.surfaces[surface] = {...result, errors};
  }
  report.undeclaredDifferences = Object.entries(report.surfaces).flatMap(([surface, result]) =>
    result.rows.filter((row) => row.flags.includes("UNDECLARED-DIFFERENCE"))
      .map((row) => ({name: row.name, surface, values: row.values})));
  report.liveHolds = Object.entries(report.surfaces).flatMap(([surface, result]) =>
    result.rows.filter((row) => row.flags.some((flag) => flag.startsWith("RETIRED-LIVE-HOLD:")))
      .map((row) => ({name: row.name, surface,
        until: policy.retired?.[row.name]?.liveHold?.until ?? null, values: row.values})));
  report.attention = Object.entries(report.surfaces).flatMap(([surface, result]) =>
    result.rows.map((row) => ({
      flags: row.flags.filter((flag) => attentionFlag.test(flag)),
      name: row.name,
      surface,
    })).filter((row) => row.flags.length > 0));
  return report;
}

const attentionFlag = new RegExp(
  "^(?:SHARED-IDENTITY|PROD-ENVIRONMENTS-DISAGREE|UNREFERENCED-BY-WORKFLOWS|UNREAD-IN:.*|" +
    "DORMANT-BUT-LIVE-IN-.*|MIXED-VALUES-IN-.*|PENDING-DEPLOY-.*|NOT-IN-TEMPLATE|" +
    "STALE-DORMANT-ENTRY|REQUIRED-CALLABLE-ABSENT|UNCLASSIFIED|ENVIRONMENTS-DISAGREE|" +
    "RETIRED-STILL-LIVE|RETIRED-HOLD-BROKEN:.*)$",
  "u",
);

// ---------------------------------------------------------------------------
// Formatting.

function formatTable(columns, rows) {
  const header = ["switch", ...columns, "flags"];
  const body = rows.map((row) => [
    row.name,
    ...columns.map((column) => row.values[column] ?? ""),
    [...row.flags, ...(row.workflowDefault ? [`default=${row.workflowDefault}`] : [])].join(" "),
  ]);
  const widths = header.map((title, index) =>
    Math.min(64, Math.max(title.length, ...body.map((cells) => String(cells[index]).length))));
  const render = (cells) => cells.map((cell, index) => {
    const text = String(cell);
    const clipped = text.length > widths[index] && index < cells.length - 1 ?
      `${text.slice(0, widths[index] - 1)}~` : text;
    return clipped.padEnd(index < cells.length - 1 ? widths[index] : 0);
  }).join("  ").trimEnd();
  return [render(header), ...body.map(render)].map((line) => `    ${line}`);
}

const surfaceTitles = Object.freeze({
  "build-modes": "Build modes (workflow defaults resolved per environment, Dart defines)",
  "client-callable-gates": "Client callable gates (tool/firebase/client_callable_dependencies.json)",
  "dormant-policy": "Dormant deploy policy (tool/firebase/list_firebase_function_targets.mjs)",
  "firestore-indexes": "Firestore composite indexes and field overrides",
  "function-params": "Functions params (live = deployed, next = GitHub variable for next deploy)",
  "functions": "Functions (deployable exports vs deployed)",
  "github-variables": "GitHub environment variables",
  "remote-config": "Remote Config (firebase/remote_config.template.json vs live)",
  "rules": "Firestore and Storage rules (active release vs main)",
  "source-gates": "Source-level release holds (identical everywhere by construction)",
});

export function formatReport(report) {
  const lines = [
    `What's live where — main ${report.sourceSha?.slice(0, 12) ?? "unknown"} vs ` +
      Object.entries(report.environments).map(([env, project]) => `${env} (${project})`).join(", "),
    `Generated ${report.generatedAt}. Identity values are fingerprinted (set#xxxxxxxx).`,
    "",
    `Policy: ${report.policy.ok ? "OK" : "FAIL"} (${report.policy.discoveredCount ?? 0} switches discovered in source)`,
    ...report.policy.violations.map((violation) => `  - ${violation}`),
    "",
    report.undeclaredDifferences.length === 0 ?
      "No undeclared feature-gate differences." :
      `${report.undeclaredDifferences.length} feature gate(s) differ between environments ` +
        `without an allowedDifferences entry in ${policyPath}:`,
    ...report.undeclaredDifferences.map((entry) =>
      `  - [${entry.surface}] ${entry.name}: ${Object.entries(entry.values)
        .map(([column, value]) => `${column}=${value}`).join(", ")}`),
  ];
  if (report.liveHolds.length) {
    lines.push("", `${report.liveHolds.length} retired gate(s) still live for old builds ` +
      "(hold; do not delete the live value or publish the template over it):");
    for (const entry of report.liveHolds) {
      lines.push(`  - [${entry.surface}] ${entry.name}: ${Object.entries(entry.values)
        .map(([column, value]) => `${column}=${value}`).join(", ")}; until ${entry.until}`);
    }
  }
  if (report.attention.length) {
    lines.push("", `${report.attention.length} other row(s) need attention:`);
    for (const entry of report.attention) {
      lines.push(`  - [${entry.surface}] ${entry.name}: ${entry.flags.join(" ")}`);
    }
  }
  for (const [surface, result] of Object.entries(report.surfaces)) {
    lines.push("", `## ${surfaceTitles[surface]}`);
    for (const [env, error] of Object.entries(result.errors ?? {})) {
      lines.push(`  UNAVAILABLE ${env}: ${error}`);
    }
    if (surface === "functions" && result.counts) {
      const counts = result.counts;
      lines.push(
        `  ${counts.exports} exports, ${counts.deployable} deployable after the dormant policy; ` +
          `${counts.missingEverywhere} deployable but absent in every listed environment.`,
        ...Object.keys(counts.missing).map((env) =>
          `  ${env}: ${counts.missing[env]} deployable missing, ${counts.liveOnly[env]} live but ` +
            `not deployable from main, ${counts.extensions[env] ?? 0} extension functions ignored.`),
      );
    }
    if (surface === "firestore-indexes" && result.counts) {
      for (const [env, counts] of Object.entries(result.counts)) {
        lines.push(`  ${env}: ${counts.compositeMissing} composite missing, ` +
          `${counts.compositeLiveOnly} live-only, ${counts.fieldOverridesDiffer} field overrides differ.`);
      }
    }
    if (surface === "remote-config" && result.versions) {
      lines.push(`  Live template versions: ${Object.entries(result.versions)
        .map(([env, version]) => `${env}=${version ?? "n/a"}`).join(", ")}`);
    }
    const shown = result.rows.filter((row) => row.differs || row.flags.length);
    if (shown.length === 0) {
      lines.push("  No differences.");
    } else {
      lines.push(...formatTable(result.columns, shown));
    }
  }
  return `${lines.join("\n")}\n`;
}

function jsonReplacer(_key, value) {
  if (value instanceof Set) return [...value].sort();
  if (value instanceof Map) return Object.fromEntries(value);
  return value;
}

function usage() {
  return [
    "Usage: node tool/firebase/report_environment_parity.mjs [options]",
    "",
    "Read-only report of what is live where: main vs each Firebase environment",
    "across Functions, params, GitHub variables, indexes, rules, dormant policy,",
    "client callable gates, Remote Config, build modes and source release holds.",
    "",
    "Options:",
    "  --env <csv>        Environments to compare (dev,staging,prod; default dev,prod).",
    `  --surfaces <csv>   Subset of: ${surfaceIds.join(", ")}.`,
    "  --policy-only      Offline CI guard: every environment-conditional switch is",
    `                     classified in ${policyPath} and allowed`,
    "                     differences carry an owner, ticket and unexpired date.",
    "  --repo-root <path> Read main from another checkout.",
    "  --json             Machine-readable output.",
    "",
    "Exit codes: 0 report produced (or policy OK); 1 policy violation; 64 usage.",
  ].join("\n");
}

export async function executeEnvironmentParityCli(argv, dependencies = {}) {
  const options = parseArgs(argv);
  if (options.help) return {exitCode: 0, output: `${usage()}\n`};
  const repo = dependencies.repo ?? loadRepositoryState(options.repoRoot);
  const now = dependencies.now ?? new Date();
  if (options.policyOnly) {
    const policy = evaluatePolicy(repo, {now});
    const output = options.json ? `${JSON.stringify(policy, null, 2)}\n` :
      `${policy.ok ? "PASS" : "FAIL"} environment difference policy: ` +
        `${policy.discoveredCount ?? 0} environment-conditional switches discovered.\n` +
        policy.violations.map((violation) => `  - ${violation}\n`).join("");
    return {exitCode: policy.ok ? 0 : 1, output, report: policy};
  }
  for (const env of options.environments) {
    if (!repo.aliases[env]) {
      throw new EnvironmentParityUsageError(`.firebaserc has no project alias for ${env}.`);
    }
  }
  const runCommand = dependencies.runCommand ?? defaultRunCommand;
  const live = await collectLiveState({
    envs: options.environments,
    fetchJson: dependencies.fetchJson,
    needs: surfaceNeeds(options.surfaces),
    repo,
    repoRoot: options.repoRoot,
    rulesCredentials: dependencies.rulesCredentials,
    runCommand,
  });
  const sourceSha = dependencies.sourceSha ?? (await settle(runReadOnly(runCommand, {
    args: ["rev-parse", "HEAD"], command: "git", cwd: options.repoRoot,
  }, "git rev-parse"))).value?.trim() ?? null;
  const report = buildReport({
    envs: options.environments, live, now, repo, sourceSha, surfaces: options.surfaces,
  });
  return {
    exitCode: report.policy.ok ? 0 : 1,
    output: options.json ? `${JSON.stringify(report, jsonReplacer, 2)}\n` : formatReport(report),
    report,
  };
}

async function main() {
  try {
    const execution = await executeEnvironmentParityCli(process.argv.slice(2));
    process.stdout.write(execution.output);
    process.exitCode = execution.exitCode;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = error instanceof EnvironmentParityUsageError ? 64 : 2;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
