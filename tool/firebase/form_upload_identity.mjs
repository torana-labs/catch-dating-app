#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {pathToFileURL} from "node:url";
import {fromRepo} from "../lib/repo_paths.mjs";
import {readFirebaseProjectAliases} from "../lib/firebase_project.mjs";
import {parseFirebaseWebConfig} from "./storage_rules_firestore_iam.mjs";

export const accountId = "catch-form-upload";
export const signerRoleId = "catchFormUploadSigner";
export const inspectorRoleId = "catchFormUploadIamInspector";
export const inspectorPermissions = [
  "iam.roles.get", "iam.serviceAccounts.getIamPolicy",
];
export const signingPermission = "iam.serviceAccounts.signBlob";

export function uploadIdentityTarget(environment, projectId, purpose = "upload") {
  if (!["upload", "review"].includes(purpose)) throw new Error("Invalid asset purpose.");
  const account = purpose === "upload" ? accountId : "catch-form-review";
  if (!["dev", "staging", "prod"].includes(environment) ||
      !/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/u.test(projectId ?? "")) {
    throw new Error("An explicit Catch environment and project are required.");
  }
  const config = parseFirebaseWebConfig(fs.readFileSync(fromRepo(
    "firebase", environment, "web", "firebase-messaging-sw.js"
  ), "utf8"));
  if (config.projectId !== projectId) throw new Error("Firebase project mismatch.");
  return {
    environment, projectId, purpose, accountId: account, bucket: config.storageBucket,
    storageRole: purpose === "upload" ? "roles/storage.objectCreator" : "roles/storage.objectViewer",
    origins: environment === "prod"
      ? ["https://catchdates.com", "https://www.catchdates.com"]
      : [`https://${projectId}.web.app`, `https://${projectId}.firebaseapp.com`],
    email: `${account}@${projectId}.iam.gserviceaccount.com`,
    deployer: `github-actions-deploy@${projectId}.iam.gserviceaccount.com`,
    role: `projects/${projectId}/roles/${signerRoleId}`,
    inspectorRole: `projects/${projectId}/roles/${inspectorRoleId}`,
  };
}

export function identityReadCommands(target) {
  const project = `--project=${target.projectId}`;
  return {
    signingApi: ["services", "list", "--enabled", project,
      "--filter=config.name=iamcredentials.googleapis.com"],
    account: ["iam", "service-accounts", "describe", target.email, project],
    role: ["iam", "roles", "describe", signerRoleId, project],
    inspectorRole: ["iam", "roles", "describe", inspectorRoleId, project],
    projectPolicy: ["projects", "get-iam-policy", target.projectId],
    accountPolicy: ["iam", "service-accounts", "get-iam-policy", target.email, project],
    bucket: ["storage", "buckets", "describe", `gs://${target.bucket}`, "--raw"],
    bucketPolicy: ["storage", "buckets", "get-iam-policy", `gs://${target.bucket}`],
  };
}

function bindingsFor(policy, member) {
  return (policy?.bindings ?? []).filter((b) => b.members?.includes(member));
}
function hasBinding(policy, member, role) {
  return bindingsFor(policy, member).some((b) => b.role === role && !b.condition);
}

export function mergeUploadCors(target, existing = []) {
  const missingOrigins = target.origins.filter((origin) => !existing.some((rule) =>
    rule.origin?.includes(origin) && rule.method?.includes("POST")));
  return missingOrigins.length === 0 ? existing : [...existing, {
    origin: missingOrigins, method: ["POST"],
    responseHeader: ["Content-Type"], maxAgeSeconds: 3600,
  }];
}

export function evaluateUploadIdentity(target, state) {
  const member = `serviceAccount:${target.email}`;
  const deployer = `serviceAccount:${target.deployer}`;
  const missing = [];
  const unsafe = [];
  const currentCors = state.bucket?.cors ?? [];
  const cors = mergeUploadCors(target, currentCors);
  if (target.purpose === "upload" && cors !== currentCors) missing.push("browser-upload-cors");
  if (!state.signingApi?.some((s) =>
    s.config?.name === "iamcredentials.googleapis.com")) missing.push("signing-api");
  if (!state.account) missing.push("account");
  else if (state.account.disabled || state.account.email !== target.email) {
    unsafe.push("disabled-or-wrong-account");
  }
  if (!state.role) missing.push("role");
  else if (state.role.deleted || state.role.stage !== "GA" ||
      JSON.stringify([...(state.role.includedPermissions ?? [])].sort()) !==
      JSON.stringify([signingPermission])) unsafe.push("signer-role-permissions");
  if (!state.inspectorRole) missing.push("inspector-role");
  else if (state.inspectorRole.deleted || state.inspectorRole.stage !== "GA" ||
      JSON.stringify([...(state.inspectorRole.includedPermissions ?? [])].sort()) !==
      JSON.stringify(inspectorPermissions)) unsafe.push("inspector-role-permissions");
  if (!hasBinding(state.projectPolicy, deployer, target.inspectorRole)) {
    missing.push("deployer-inspection");
  }
  if (!hasBinding(state.projectPolicy, member, "roles/datastore.user")) {
    missing.push("database-access");
  }
  if (bindingsFor(state.projectPolicy, member).some((b) =>
    b.role !== "roles/datastore.user" || b.condition)) unsafe.push("extra-project-access");
  if (!hasBinding(state.bucketPolicy, member, target.storageRole)) {
    missing.push("upload-access");
  }
  if (bindingsFor(state.bucketPolicy, member).some((b) =>
    b.role !== target.storageRole || b.condition)) unsafe.push("extra-bucket-access");
  if (!hasBinding(state.accountPolicy, member, target.role)) missing.push("self-signing");
  if (!hasBinding(state.accountPolicy, deployer, "roles/iam.serviceAccountUser")) {
    missing.push("deployer-act-as");
  }
  for (const b of state.accountPolicy?.bindings ?? []) {
    const expected = b.role === target.role ? member :
      b.role === "roles/iam.serviceAccountUser" ? deployer : null;
    if (!expected || b.condition || b.members.some((m) => m !== expected)) {
      unsafe.push("unexpected-account-delegation");
    }
  }
  return {ready: missing.length === 0 && unsafe.length === 0, missing, unsafe, cors};
}

export function provisioningCommands(target, assessment) {
  if (assessment.unsafe.length) throw new Error(
    `Refusing to modify an unexpected IAM state: ${assessment.unsafe.join(", ")}`
  );
  const commands = [];
  const project = `--project=${target.projectId}`;
  const member = `--member=serviceAccount:${target.email}`;
  const missing = new Set(assessment.missing);
  if (missing.has("signing-api")) commands.push([
    "services", "enable", "iamcredentials.googleapis.com", project,
  ]);
  if (missing.has("account")) commands.push([
    "iam", "service-accounts", "create", target.accountId, project,
    `--display-name=Catch form ${target.purpose} runtime`,
  ]);
  if (missing.has("role")) commands.push([
    "iam", "roles", "create", signerRoleId, project,
    "--title=Catch form upload signer", `--permissions=${signingPermission}`, "--stage=GA",
  ]);
  if (missing.has("inspector-role")) commands.push([
    "iam", "roles", "create", inspectorRoleId, project,
    "--title=Catch form upload IAM inspector",
    `--permissions=${inspectorPermissions.join(",")}`, "--stage=GA",
  ]);
  if (missing.has("deployer-inspection")) commands.push([
    "projects", "add-iam-policy-binding", target.projectId,
    `--member=serviceAccount:${target.deployer}`,
    `--role=${target.inspectorRole}`, "--condition=None",
  ]);
  if (missing.has("database-access")) commands.push([
    "projects", "add-iam-policy-binding", target.projectId, member,
    "--role=roles/datastore.user", "--condition=None",
  ]);
  if (missing.has("upload-access")) commands.push([
    "storage", "buckets", "add-iam-policy-binding", `gs://${target.bucket}`,
    member, `--role=${target.storageRole}`, "--condition=None",
  ]);
  if (missing.has("self-signing")) commands.push([
    "iam", "service-accounts", "add-iam-policy-binding", target.email, project,
    member, `--role=${target.role}`, "--condition=None",
  ]);
  if (missing.has("deployer-act-as")) commands.push([
    "iam", "service-accounts", "add-iam-policy-binding", target.email, project,
    `--member=serviceAccount:${target.deployer}`,
    "--role=roles/iam.serviceAccountUser", "--condition=None",
  ]);
  if (missing.has("browser-upload-cors")) commands.push([
    "storage", "buckets", "update", `gs://${target.bucket}`,
    "--cors-file=<generated-on-apply>",
  ]);
  return commands;
}

export function runGcloud(args) {
  return spawnSync("gcloud", [...args, "--format=json", "--quiet"], {
    encoding: "utf8", shell: false, timeout: 30000,
  });
}

export function inspectUploadIdentity(target, run = runGcloud) {
  const state = {};
  for (const [key, args] of Object.entries(identityReadCommands(target))) {
    const result = run(args);
    if (result.error || result.status !== 0) {
      if (["account", "accountPolicy", "role", "inspectorRole"].includes(key) &&
          /NOT_FOUND|not found|does not exist/iu.test(result.stderr ?? "")) {
        state[key] = null;
        continue;
      }
      throw new Error(`Could not read ${key}: ${result.error?.message ?? result.stderr}`);
    }
    const value = JSON.parse(result.stdout);
    if (key === "signingApi" ? !Array.isArray(value) :
      !value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error(`Invalid ${key} metadata.`);
    }
    state[key] = value;
  }
  return evaluateUploadIdentity(target, state);
}

export function parseArgs(argv) {
  const args = {environment: null, purpose: "upload", apply: false, allowProd: false};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--env") args.environment = argv[++i];
    else if (argv[i] === "--purpose") args.purpose = argv[++i];
    else if (argv[i] === "--apply") args.apply = true;
    else if (argv[i] === "--allow-prod") args.allowProd = true;
    else throw new Error(`Unknown argument: ${argv[i]}`);
  }
  if (!["dev", "staging", "prod"].includes(args.environment)) {
    throw new Error("Use --env dev|staging|prod. Default mode is read-only.");
  }
  if (args.apply && args.environment === "prod" && !args.allowProd) {
    throw new Error("Production provisioning requires --allow-prod.");
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const target = uploadIdentityTarget(args.environment,
    readFirebaseProjectAliases()[args.environment], args.purpose);
  const before = inspectUploadIdentity(target);
  const commands = provisioningCommands(target, before);
  console.log(JSON.stringify({target, ...before, commands}, null, 2));
  if (!args.apply) { process.exitCode = before.ready ? 0 : 1; return; }
  for (const planned of commands) {
    let command = planned;
    let tempDirectory;
    if (planned.includes("--cors-file=<generated-on-apply>")) {
      // Re-read immediately before update and preserve unrelated CORS entries.
      const current = runGcloud(identityReadCommands(target).bucket);
      if (current.error || current.status !== 0) throw new Error("Cannot re-read bucket CORS.");
      const cors = mergeUploadCors(target, JSON.parse(current.stdout).cors ?? []);
      tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "catch-upload-cors-"));
      const corsFile = path.join(tempDirectory, "cors.json");
      fs.writeFileSync(corsFile, JSON.stringify(cors));
      command = planned.map((arg) => arg === "--cors-file=<generated-on-apply>"
        ? `--cors-file=${corsFile}` : arg);
    }
    const result = runGcloud(command);
    if (tempDirectory) fs.rmSync(tempDirectory, {recursive: true});
    if (result.error || result.status !== 0) {
      throw new Error(`Provisioning failed: ${result.error?.message ?? result.stderr}`);
    }
  }
  const after = inspectUploadIdentity(target);
  console.log(JSON.stringify(after, null, 2));
  if (!after.ready) throw new Error("Upload identity is not ready after provisioning.");
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 2; }
}
