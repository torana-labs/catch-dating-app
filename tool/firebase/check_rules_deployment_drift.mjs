#!/usr/bin/env node
import {createHash} from "node:crypto";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {resolveFirebaseProjectId} from "../lib/firebase_project.mjs";

const apiRoot = "https://firebaserules.googleapis.com/v1";
const projectIdPattern = /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/u;
const defaultCommandTimeoutMs = 15_000;

export class RulesDeploymentDriftUsageError extends Error {
  constructor(message) {
    super(message);
    this.name = "RulesDeploymentDriftUsageError";
    this.exitCode = 64;
  }
}

export function normalizeRulesContent(source) {
  return String(source)
    .replace(/^\uFEFF/u, "")
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n")
    .split("\n")
    .map((line) => line.replace(/[\t ]+$/u, ""))
    .join("\n")
    .replace(/\n+$/u, "") + "\n";
}

export function normalizedRulesHash(source) {
  return createHash("sha256").update(normalizeRulesContent(source)).digest("hex");
}

export function parseArgs(argv) {
  const parsed = {
    environment: null,
    help: false,
    json: false,
    pollSeconds: 10,
    project: null,
    repoRoot: null,
    waitSeconds: 0,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--env") parsed.environment = requireValue(argv, ++index, arg);
    else if (arg === "--project") parsed.project = requireValue(argv, ++index, arg);
    else if (arg === "--repo-root") parsed.repoRoot = requireValue(argv, ++index, arg);
    else if (arg === "--wait-seconds") {
      parsed.waitSeconds = parseNonNegativeInteger(requireValue(argv, ++index, arg), arg);
    } else if (arg === "--poll-seconds") {
      parsed.pollSeconds = parsePositiveInteger(requireValue(argv, ++index, arg), arg);
    } else if (arg === "--json") parsed.json = true;
    else if (arg === "--help" || arg === "-h") parsed.help = true;
    else throw new RulesDeploymentDriftUsageError(`Unknown argument: ${arg}`);
  }
  if (parsed.help) return parsed;
  if (Boolean(parsed.environment) === Boolean(parsed.project)) {
    throw new RulesDeploymentDriftUsageError(
      "Choose exactly one of --env <dev|staging|prod> or --project <project-id>.",
    );
  }
  if (parsed.project && !projectIdPattern.test(parsed.project)) {
    throw new RulesDeploymentDriftUsageError(`Invalid Firebase project id: ${parsed.project}`);
  }
  if (parsed.waitSeconds > 0 && parsed.pollSeconds > parsed.waitSeconds) {
    throw new RulesDeploymentDriftUsageError(
      "--poll-seconds cannot exceed --wait-seconds when waiting is enabled.",
    );
  }
  return parsed;
}

// A Claude Code cloud session sets CLOUDSDK_AUTH_ACCESS_TOKEN for its egress
// proxy, so gcloud prints a token there that cannot read Catch's Firebase
// projects. Sending it would only make a rejected request to a live project.
export function unusableAmbientCredential(environment = process.env) {
  return environment.CLAUDE_CODE_REMOTE === "true" &&
    Boolean(environment.CLOUDSDK_AUTH_ACCESS_TOKEN?.trim()) ?
    "claude-code-cloud-session" :
    null;
}

export function resolveRulesAccessToken({
  environment = process.env,
  runCommand = defaultRunCommand,
} = {}) {
  for (const key of ["FIREBASE_RULES_ACCESS_TOKEN", "GOOGLE_OAUTH_ACCESS_TOKEN"]) {
    const token = environment[key]?.trim();
    if (token) return {source: key, token};
  }
  if (unusableAmbientCredential(environment) != null) return null;
  for (const args of [
    ["auth", "application-default", "print-access-token", "--quiet"],
    ["auth", "print-access-token", "--quiet"],
  ]) {
    const result = runCommand({args, command: "gcloud"});
    const token = result.status === 0 ? result.stdout.trim() : "";
    if (token) return {source: `gcloud ${args.slice(0, -1).join(" ")}`, token};
  }
  return null;
}

export async function fetchProjectReleases({accessToken, fetchJson, projectId}) {
  const releases = [];
  let pageToken = null;
  do {
    const url = new URL(`${apiRoot}/projects/${encodeURIComponent(projectId)}/releases`);
    url.searchParams.set("pageSize", "100");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const payload = await fetchJson(url.toString(), accessToken);
    if (payload.releases != null && !Array.isArray(payload.releases)) {
      throw new Error("Firebase Rules releases response has a malformed releases field.");
    }
    releases.push(...(payload.releases ?? []));
    pageToken = payload.nextPageToken || null;
  } while (pageToken != null);
  return releases;
}

export function selectConfiguredReleases({projectId, releases, targets}) {
  const prefix = `projects/${projectId}/releases/`;
  const selected = [];
  for (const target of targets) {
    const matches = releases.filter((release) => {
      if (typeof release?.name !== "string" || !release.name.startsWith(prefix)) return false;
      const releaseId = release.name.slice(prefix.length);
      if (target.kind === "firestore") {
        const database = target.database ?? "(default)";
        return database === "(default)"
          ? releaseId === "cloud.firestore" || releaseId === "cloud.firestore/(default)"
          : releaseId === `cloud.firestore/${database}`;
      }
      return target.kind === "storage" && releaseId.startsWith("firebase.storage/");
    });
    if (matches.length === 0) {
      selected.push({...target, release: null});
    } else {
      selected.push(...matches.map((release) => ({...target, release})));
    }
  }
  return selected;
}

export function selectRulesetSourceFile({expectedPath, ruleset}) {
  const files = ruleset?.source?.files;
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error(`Ruleset ${ruleset?.name ?? "<unknown>"} has no source files.`);
  }
  const expectedName = path.posix.basename(expectedPath.replaceAll("\\", "/"));
  const exact = files.filter((file) =>
    typeof file?.name === "string" && path.posix.basename(file.name) === expectedName);
  if (exact.length === 1 && typeof exact[0].content === "string") return exact[0];
  if (files.length === 1 && typeof files[0]?.content === "string") return files[0];
  throw new Error(
    `Ruleset ${ruleset?.name ?? "<unknown>"} does not contain one unambiguous ${expectedName} source file.`,
  );
}

export async function checkRulesDeploymentDrift({
  accessToken,
  fetchJson = defaultFetchJson,
  projectId,
  targets,
}) {
  const releases = await fetchProjectReleases({accessToken, fetchJson, projectId});
  const selected = selectConfiguredReleases({projectId, releases, targets});
  const results = [];
  const rulesets = new Map();
  for (const target of selected) {
    if (target.release == null) {
      results.push({
        kind: target.kind,
        localPath: target.localPath,
        status: "missing-release",
      });
      continue;
    }
    const rulesetName = target.release.rulesetName;
    const expectedPrefix = `projects/${projectId}/rulesets/`;
    if (typeof rulesetName !== "string" || !rulesetName.startsWith(expectedPrefix)) {
      throw new Error(`Release ${target.release.name} has an invalid rulesetName.`);
    }
    if (!rulesets.has(rulesetName)) {
      rulesets.set(
        rulesetName,
        await fetchJson(`${apiRoot}/${rulesetName}`, accessToken),
      );
    }
    const remoteFile = selectRulesetSourceFile({
      expectedPath: target.localPath,
      ruleset: rulesets.get(rulesetName),
    });
    const localHash = normalizedRulesHash(target.content);
    const remoteHash = normalizedRulesHash(remoteFile.content);
    results.push({
      kind: target.kind,
      localHash,
      localPath: target.localPath,
      releaseName: target.release.name,
      remoteHash,
      rulesetName,
      status: localHash === remoteHash ? "match" : "drift",
      updateTime: target.release.updateTime ?? null,
    });
  }
  return {
    drift: results.some((result) => result.status !== "match"),
    projectId,
    results,
    status: results.every((result) => result.status === "match") ? "match" : "drift",
  };
}

export function readConfiguredRuleTargets({readFile = fs.readFileSync, repoRoot}) {
  const firebaseConfig = JSON.parse(readFile(path.join(repoRoot, "firebase.json"), "utf8"));
  const configured = [
    {
      database: firebaseConfig.firestore?.database ?? "(default)",
      kind: "firestore",
      localPath: firebaseConfig.firestore?.rules,
    },
    {kind: "storage", localPath: firebaseConfig.storage?.rules},
  ].filter((target) => typeof target.localPath === "string" && target.localPath !== "");
  if (configured.length === 0) {
    throw new Error("firebase.json does not configure Firestore or Storage rules.");
  }
  return configured.map((target) => {
    const absolutePath = path.resolve(repoRoot, target.localPath);
    const relativePath = path.relative(repoRoot, absolutePath);
    if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
      throw new Error(`Configured rules path escapes the repository: ${target.localPath}`);
    }
    return {...target, content: readFile(absolutePath, "utf8")};
  });
}

export async function executeRulesDeploymentDriftCli(argv, dependencies = {}) {
  const args = parseArgs(argv);
  if (args.help) return {exitCode: 0, output: helpText(), report: null};
  const repoRoot = path.resolve(args.repoRoot ?? dependencies.repoRoot ?? defaultRepoRoot());
  const projectId = resolveFirebaseProjectId({
    defaultEnv: null,
    env: args.environment,
    firebaseRcPath: path.join(repoRoot, ".firebaserc"),
    project: args.project,
  });
  const environment = dependencies.environment ?? process.env;
  const credentials = Object.hasOwn(dependencies, "credentials")
    ? dependencies.credentials
    : resolveRulesAccessToken({
      environment,
      runCommand: dependencies.runCommand,
    });
  if (credentials == null) {
    const unusable = unusableAmbientCredential(environment);
    const report = {
      projectId,
      reason: unusable == null ? "missing-credentials" : "unusable-credentials",
      skipped: true,
      status: "skipped",
      ...(unusable == null ? {} : {credentialSource: unusable}),
    };
    return {exitCode: 0, output: formatReport(report, args.json), report};
  }
  const targets = dependencies.targets ?? readConfiguredRuleTargets({
    readFile: dependencies.readFile,
    repoRoot,
  });
  const startedAt = dependencies.now?.() ?? Date.now();
  const deadline = startedAt + args.waitSeconds * 1000;
  let report;
  do {
    report = await checkRulesDeploymentDrift({
      accessToken: credentials.token,
      fetchJson: dependencies.fetchJson,
      projectId,
      targets,
    });
    if (!report.drift || args.waitSeconds === 0) break;
    const current = dependencies.now?.() ?? Date.now();
    if (current >= deadline) break;
    await (dependencies.sleep ?? defaultSleep)(
      Math.min(args.pollSeconds * 1000, deadline - current),
    );
  } while (true);
  return {
    exitCode: report.drift ? 1 : 0,
    output: formatReport({...report, credentialSource: credentials.source}, args.json),
    report,
  };
}

function formatReport(report, json) {
  if (json) return `${JSON.stringify(report, null, 2)}\n`;
  if (report.reason === "unusable-credentials") {
    return "SKIP Firebase rules deployment drift: this Claude Code cloud session's gcloud " +
      "token (CLOUDSDK_AUTH_ACCESS_TOKEN) belongs to its egress proxy and cannot read " +
      "the Firebase Rules API, so it was not sent; no remote comparison ran. " +
      "Set FIREBASE_RULES_ACCESS_TOKEN to compare from here.\n";
  }
  if (report.skipped) {
    return "SKIP Firebase rules deployment drift: no OAuth access token is available. " +
      "Set FIREBASE_RULES_ACCESS_TOKEN or authenticate gcloud; no remote comparison ran.\n";
  }
  const lines = [`Firebase rules deployment drift for ${report.projectId}: ${report.status}`];
  for (const result of report.results) {
    if (result.status === "missing-release") {
      lines.push(`- ${result.kind} (${result.localPath}): active release missing`);
      continue;
    }
    lines.push(
      `- ${result.kind} (${result.localPath}): ${result.status}; ` +
        `local=${result.localHash.slice(0, 12)} remote=${result.remoteHash.slice(0, 12)} ` +
        `ruleset=${result.rulesetName}`,
    );
  }
  return `${lines.join("\n")}\n`;
}

// Local user Application Default Credentials without a quota project are
// rejected by the Rules API. Retry once, billing the read to the inspected
// project; service-account and explicit tokens never take this path.
export async function fetchRulesApiJson(url, accessToken, {fetchImpl = fetch} = {}) {
  let response = await requestRulesApi({accessToken, fetchImpl, url});
  const quotaProject = new URL(url).pathname.match(/\/v1\/projects\/([^/]+)\//u)?.[1];
  if (!response.ok && quotaProject && /quota project/iu.test(response.payload?.error?.message ?? "")) {
    response = await requestRulesApi({accessToken, fetchImpl, quotaProject, url});
  }
  if (!response.ok) {
    const detail = response.payload?.error?.message ?? `HTTP ${response.status}`;
    throw new Error(`Firebase Rules API request failed: ${detail}`);
  }
  return response.payload;
}

async function requestRulesApi({accessToken, fetchImpl, quotaProject = null, url}) {
  const headers = {Authorization: `Bearer ${accessToken}`};
  if (quotaProject) headers["x-goog-user-project"] = decodeURIComponent(quotaProject);
  const response = await fetchImpl(url, {
    headers,
    signal: AbortSignal.timeout(defaultCommandTimeoutMs),
  });
  const body = await response.text();
  try {
    return {ok: response.ok, payload: body === "" ? {} : JSON.parse(body), status: response.status};
  } catch {
    throw new Error(`Firebase Rules API returned non-JSON HTTP ${response.status}.`);
  }
}

function defaultFetchJson(url, accessToken) {
  return fetchRulesApiJson(url, accessToken);
}

function defaultRunCommand(spec) {
  const result = spawnSync(spec.command, spec.args, {
    encoding: "utf8",
    env: {...process.env, CLOUDSDK_CORE_DISABLE_PROMPTS: "1"},
    shell: false,
    timeout: defaultCommandTimeoutMs,
  });
  return {
    status: result.status,
    stderr: result.stderr ?? "",
    stdout: result.stdout ?? "",
  };
}

function defaultRepoRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
}

function defaultSleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function requireValue(argv, index, flag) {
  const value = argv[index];
  if (value == null || value.startsWith("--")) {
    throw new RulesDeploymentDriftUsageError(`${flag} requires a value.`);
  }
  return value;
}

function parseNonNegativeInteger(value, flag) {
  if (!/^(?:0|[1-9][0-9]*)$/u.test(value)) {
    throw new RulesDeploymentDriftUsageError(`${flag} must be a non-negative integer.`);
  }
  return Number(value);
}

function parsePositiveInteger(value, flag) {
  const parsed = parseNonNegativeInteger(value, flag);
  if (parsed === 0) throw new RulesDeploymentDriftUsageError(`${flag} must be positive.`);
  return parsed;
}

function helpText() {
  return `Usage: node tool/firebase/check_rules_deployment_drift.mjs \\
  (--env <dev|staging|prod> | --project <project-id>) [options]

Options:
  --repo-root <path>     Compare rules from another verified checkout/package.
  --wait-seconds <n>     Retry drift until this deployment propagation window ends.
  --poll-seconds <n>     Seconds between retries (default: 10).
  --json                 Print a machine-readable report.

Authentication is read-only. Set FIREBASE_RULES_ACCESS_TOKEN or
GOOGLE_OAUTH_ACCESS_TOKEN, or authenticate gcloud. Missing credentials skip with
exit 0, as does a Claude Code cloud session's proxy gcloud token, which is never
sent; API, authorization, missing-release, and content-drift failures exit 1.
`;
}

async function main() {
  try {
    const execution = await executeRulesDeploymentDriftCli(process.argv.slice(2));
    process.stdout.write(execution.output);
    process.exitCode = execution.exitCode;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = error instanceof RulesDeploymentDriftUsageError ? 64 : 1;
  }
}

if (
  process.argv[1] != null &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
  await main();
}
