#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
export const defaultRepoRoot = path.resolve(moduleDir, "../..");

export function loadAppTargets({root = defaultRepoRoot} = {}) {
  const manifestPath = path.join(root, "tool/app_targets.json");
  return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
}

export function resolveAppTarget({manifest, role, environment}) {
  const target = manifest.targets?.find(
    (candidate) =>
      candidate.role === role && candidate.environment === environment,
  );
  if (!target) {
    throw new Error(`Unknown app target: ${role}/${environment}`);
  }
  return target;
}

export function valueAtPath(value, fieldPath) {
  return fieldPath.split(".").reduce((current, segment) => {
    if (current == null || !(segment in current)) {
      throw new Error(`App target field does not exist: ${fieldPath}`);
    }
    return current[segment];
  }, value);
}

function valueAfter(args, flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : null;
}

function runCli() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    console.log(
      "Usage: node tool/platform/resolve_app_target.mjs --role <consumer|host> --environment <dev|prod> [--field path | --fields a,b,c]",
    );
    return;
  }

  const role = valueAfter(args, "--role");
  const environment = valueAfter(args, "--environment");
  if (!role || !environment) {
    throw new Error("--role and --environment are required.");
  }

  const manifest = loadAppTargets();
  const target = resolveAppTarget({manifest, role, environment});
  const resolvedTarget = {
    ...target,
    roleConfig: manifest.roles[target.role],
    environmentConfig: manifest.environments[target.environment],
  };
  const field = valueAfter(args, "--field");
  const fields = valueAfter(args, "--fields");

  if (field) {
    console.log(formatValue(valueAtPath(resolvedTarget, field)));
    return;
  }
  if (fields) {
    console.log(
      fields
        .split(",")
        .map((item) => formatValue(valueAtPath(resolvedTarget, item)))
        .join("\t"),
    );
    return;
  }
  console.log(JSON.stringify(resolvedTarget, null, 2));
}

function formatValue(value) {
  if (["string", "number", "boolean"].includes(typeof value)) {
    return String(value);
  }
  return JSON.stringify(value);
}

const isMain = process.argv[1]
  ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  : false;
if (isMain) {
  try {
    runCli();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
