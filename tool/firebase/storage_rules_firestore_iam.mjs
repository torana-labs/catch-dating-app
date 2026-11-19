#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {pathToFileURL} from "node:url";
import {
  createFunctionsRequire,
  fromRepo,
} from "../lib/repo_paths.mjs";
import {
  readFirebaseProjectAliases,
} from "../lib/firebase_project.mjs";

export const storageRulesFirestoreRole =
  "roles/firebaserules.firestoreServiceAgent";

export function storageServiceAgentMember(projectNumber) {
  if (!/^\d+$/u.test(String(projectNumber))) {
    throw new Error(`Invalid Firebase project number: ${projectNumber}`);
  }
  return (
    `serviceAccount:service-${projectNumber}` +
    "@gcp-sa-firebasestorage.iam.gserviceaccount.com"
  );
}

export function functionsDependencyDirectory({
  env = process.env,
  cwd = process.cwd(),
} = {}) {
  const configured = env.CATCH_DELIVERY_FUNCTIONS_DIR?.trim();
  return configured ? path.resolve(cwd, configured) : fromRepo("functions");
}

export function parseFirebaseWebConfig(contents) {
  const read = (key) => {
    const match = contents.match(
      new RegExp(`${key}:\\s*['\"]([^'\"]+)['\"]`, "u")
    );
    if (!match) throw new Error(`Firebase web config is missing ${key}.`);
    return match[1];
  };

  return {
    appId: read("appId"),
    apiKey: read("apiKey"),
    projectId: read("projectId"),
    projectNumber: read("messagingSenderId"),
    storageBucket: read("storageBucket"),
  };
}

export function targetForEnvironment({env, aliases, readFile = fs.readFileSync}) {
  const projectId = aliases[env];
  if (!projectId) throw new Error(`Missing Firebase project alias: ${env}`);
  const configPath = fromRepo(
    "firebase",
    env,
    "web",
    "firebase-messaging-sw.js"
  );
  const config = parseFirebaseWebConfig(readFile(configPath, "utf8"));
  if (config.projectId !== projectId) {
    throw new Error(
      `Firebase ${env} config targets ${config.projectId}, expected ${projectId}.`
    );
  }
  return {
    env,
    projectId,
    projectNumber: config.projectNumber,
    member: storageServiceAgentMember(config.projectNumber),
  };
}

export function policyHasStorageRulesBinding(policy, member) {
  return (policy.bindings ?? []).some(
    (binding) =>
      binding.role === storageRulesFirestoreRole &&
      binding.condition == null &&
      (binding.members ?? []).includes(member)
  );
}

export function ensureStorageRulesBinding(policy, member) {
  if (policyHasStorageRulesBinding(policy, member)) {
    return {changed: false, policy};
  }

  const bindings = (policy.bindings ?? []).map((binding) => ({
    ...binding,
    members: [...(binding.members ?? [])],
  }));
  const unconditional = bindings.find(
    (binding) =>
      binding.role === storageRulesFirestoreRole && binding.condition == null
  );
  if (unconditional) {
    unconditional.members = [...new Set([...unconditional.members, member])]
      .sort();
  } else {
    bindings.push({role: storageRulesFirestoreRole, members: [member]});
  }

  return {
    changed: true,
    policy: {
      ...policy,
      version: Math.max(policy.version ?? 1, 3),
      bindings,
    },
  };
}

export async function getProjectIamPolicy({request, projectId}) {
  const response = await request({
    method: "POST",
    url:
      "https://cloudresourcemanager.googleapis.com/v1/projects/" +
      `${encodeURIComponent(projectId)}:getIamPolicy`,
    headers: {"X-Goog-User-Project": projectId},
    data: {options: {requestedPolicyVersion: 3}},
  });
  return response.data ?? response;
}

export async function setProjectIamPolicy({request, projectId, policy}) {
  const response = await request({
    method: "POST",
    url:
      "https://cloudresourcemanager.googleapis.com/v1/projects/" +
      `${encodeURIComponent(projectId)}:setIamPolicy`,
    headers: {"X-Goog-User-Project": projectId},
    data: {
      policy,
      updateMask: "bindings,etag,version",
    },
  });
  return response.data ?? response;
}

export async function reconcileTarget({target, request, apply = false}) {
  const current = await getProjectIamPolicy({
    request,
    projectId: target.projectId,
  });
  const planned = ensureStorageRulesBinding(current, target.member);
  if (!planned.changed || !apply) {
    return {changed: planned.changed, ready: !planned.changed, applied: false};
  }

  await setProjectIamPolicy({
    request,
    projectId: target.projectId,
    policy: planned.policy,
  });
  const verified = await getProjectIamPolicy({
    request,
    projectId: target.projectId,
  });
  if (!policyHasStorageRulesBinding(verified, target.member)) {
    throw new Error(
      `IAM update for ${target.projectId} did not retain the required binding.`
    );
  }
  return {changed: true, ready: true, applied: true};
}

export function parseArgs(argv) {
  const args = {
    allowProd: false,
    apply: false,
    env: null,
    help: false,
    json: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--allow-prod") args.allowProd = true;
    else if (arg === "--apply") args.apply = true;
    else if (arg === "--all") args.env = null;
    else if (arg === "--env") args.env = requireValue(argv, ++i, arg);
    else if (arg === "--json") args.json = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (args.env != null && !["dev", "prod"].includes(args.env)) {
    throw new Error(`Unsupported Firebase environment: ${args.env}`);
  }
  if (args.apply && (args.env == null || args.env === "prod") && !args.allowProd) {
    throw new Error(
      "Applying IAM to prod requires --allow-prod after reviewing check output."
    );
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }
  const aliases = readFirebaseProjectAliases();
  const environments = args.env == null
    ? ["dev", "prod"]
    : [args.env];
  const targets = environments.map((env) =>
    targetForEnvironment({env, aliases})
  );
  const request = await googleRequest();
  const results = [];

  for (const target of targets) {
    const result = await reconcileTarget({target, request, apply: args.apply});
    results.push({...target, ...result});
  }

  if (args.json) {
    console.log(JSON.stringify({apply: args.apply, results}, null, 2));
  } else {
    for (const result of results) {
      const status = result.applied
        ? "APPLIED"
        : result.ready
          ? "READY"
          : "MISSING";
      console.log(`${status.padEnd(8)} ${result.env}: ${result.projectId}`);
    }
  }

  if (results.some((result) => !result.ready)) process.exitCode = 1;
}

async function googleRequest() {
  const requireFromFunctions = createFunctionsRequire(
    functionsDependencyDirectory(),
  );
  const {GoogleAuth} = requireFromFunctions("google-auth-library");
  const client = await new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  }).getClient();
  return (options) => client.request(options);
}

function requireValue(argv, index, flag) {
  const value = argv[index];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value.`);
  }
  return value;
}

function printHelp() {
  console.log(`Check or provision Firebase Storage-to-Firestore Rules IAM.

Usage:
  node tool/firebase/storage_rules_firestore_iam.mjs [options]

Options:
  --all                         Check dev and prod (default).
  --env <dev|prod>      Check one environment.
  --apply                       Add only missing bindings.
  --allow-prod                  Required when apply includes prod.
  --json                        Emit machine-readable output.
  -h, --help                    Show this help.

Check mode is read-only and exits nonzero when any binding is missing. Apply
preserves the policy etag, conditions, unrelated roles, and members.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error?.message ?? String(error));
    process.exitCode = 1;
  });
}
