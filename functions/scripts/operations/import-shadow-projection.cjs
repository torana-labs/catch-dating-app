#!/usr/bin/env node
"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const {pathToFileURL} = require("node:url");
const admin = require("firebase-admin");
const {
  FirestoreShadowProjectionWriter,
  importShadowProjection,
  prepareShadowProjection,
} = require("../../lib/operations/projectionImporter.js");

if (require.main === module) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${JSON.stringify({
      schemaVersion: 1,
      ok: false,
      error: {
        code: error?.code ?? "internal_error",
        message: error instanceof Error ? error.message : String(error),
      },
    })}\n`);
    process.exitCode = 1;
  });
}

async function main(argv) {
  const flags = parseFlags(argv);
  const file = required(flags, "file");
  const input = JSON.parse(await fs.readFile(path.resolve(file), "utf8"));
  const prepared = prepareShadowProjection(input);
  if (!flags.apply) {
    const result = await importShadowProjection({input});
    writeResult(result, {environment: null, projectId: null});
    return;
  }
  const environment = required(flags, "environment");
  const projectId = required(flags, "project");
  const {
    isFirebaseProductionTarget,
    readFirebaseProjectAliases,
  } = await import(pathToFileURL(path.resolve(
    __dirname,
    "../../../tool/lib/firebase_project.mjs"
  )).href);
  const aliases = readFirebaseProjectAliases();
  validateApplyTarget({
    environment,
    projectId,
    allowProd: flags.allowProd === true,
    aliases,
    productionTarget: isFirebaseProductionTarget({
      env: environment,
      projectId,
    }),
  });
  const confirmedRun = required(flags, "confirmRun");
  if (confirmedRun !== prepared.run.runId) {
    throw argumentError("--confirm-run must match the exported run id");
  }
  if (admin.apps.length === 0) admin.initializeApp({projectId});
  const writer = new FirestoreShadowProjectionWriter(admin.firestore());
  const result = await importShadowProjection({input, apply: true, writer});
  writeResult(result, {environment, projectId});
}

function validateApplyTarget({
  environment,
  projectId,
  allowProd,
  aliases,
  productionTarget,
}) {
  if (!["dev", "prod"].includes(environment)) {
    throw argumentError("--environment must be dev or prod");
  }
  const configuredProject = aliases?.[environment];
  if (!configuredProject) {
    throw argumentError(
      `No Firebase project is configured for environment ${environment}`
    );
  }
  if (projectId !== configuredProject) {
    throw argumentError(
      `--project must match the ${environment} Firebase alias (${configuredProject})`
    );
  }
  if (productionTarget && !allowProd) {
    throw argumentError("Production apply requires --allow-prod");
  }
  return {environment, projectId, productionTarget};
}

function writeResult(result, context) {
  process.stdout.write(`${JSON.stringify({
    schemaVersion: 1,
    ok: true,
    program: "catch-operations-import-shadow-projection",
    context,
    result,
  }, null, 2)}\n`);
}

function parseFlags(argv) {
  const values = new Set(["--file", "--project", "--environment", "--confirm-run"]);
  const booleans = new Set(["--apply", "--allow-prod"]);
  const flags = {};
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (booleans.has(flag)) {
      flags[camel(flag)] = true;
      continue;
    }
    if (!values.has(flag)) throw argumentError(`Unknown argument: ${flag}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw argumentError(`${flag} requires a value`);
    }
    flags[camel(flag)] = value;
    index += 1;
  }
  return flags;
}

function required(flags, name) {
  const value = flags[name];
  if (!value) throw argumentError(`--${kebab(name)} is required`);
  return value;
}

function camel(flag) {
  return flag.slice(2).replace(/-([a-z])/g, (_match, letter) =>
    letter.toUpperCase());
}

function kebab(value) {
  return value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function argumentError(message) {
  const error = new Error(message);
  error.code = "invalid_argument";
  return error;
}

module.exports = {
  main,
  parseFlags,
  validateApplyTarget,
};
