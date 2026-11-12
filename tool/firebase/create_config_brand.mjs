#!/usr/bin/env node
// Publishes packages/brand/brand.json to the public Firestore document
// config/brand, which the Flutter apps read at run time (with their generated
// Brand constants as fallback). The document is the brand record itself, so
// the payload can never drift from brand.json; the contract schema
// contracts/firestore/config_brand.schema.json is brand.schema.json in draft-07
// form, and create_config_brand.test.mjs fails when either drifts.
//
// Dry-run by default. --verify reads the live document and fails when it
// differs from brand.json (read-only).
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {brand} from "@catch/brand";
import {
  applyFirestoreEmulatorHost,
  assertProdWriteAllowed,
  readFirebaseProjectAliases,
  resolveFirebaseProjectId,
} from "../lib/firebase_project.mjs";
import {createFunctionsRequire} from "../lib/repo_paths.mjs";
import {parseCommonArgs} from "../lib/cli_args.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const brandSchemaPath = path.join(repoRoot, "packages/brand/brand.schema.json");
export const contractSchemaPath = path.join(repoRoot, "contracts/firestore/config_brand.schema.json");
export const CONFIG_BRAND_PATH = "config/brand";

/** The document written to config/brand: exactly the brand record. */
export function configBrandDocument(record = brand) {
  return JSON.parse(JSON.stringify(record));
}

/** brand.schema.json (2020-12, $defs) as the draft-07 Firestore contract. */
export function configBrandContractSchema(brandSchema) {
  const convert = (node) => {
    if (Array.isArray(node)) return node.map(convert);
    if (node === null || typeof node !== "object") return node;
    return Object.fromEntries(Object.entries(node).map(([key, value]) =>
      key === "$ref" ? [key, value.replace("#/$defs/", "#/definitions/")] : [key, convert(value)]));
  };
  const {$schema: _schema, ...properties} = brandSchema.properties;
  return {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$id": "https://catch.app/contracts/firestore/config_brand.schema.json",
    "title": "ConfigBrandDocument",
    "description": "Public brand record stored at config/brand: packages/brand/brand.json as published by " +
      "tool/firebase/create_config_brand.mjs. The apps read it at run time and fall back to their generated " +
      "Brand constants. Derived from packages/brand/brand.schema.json; do not edit by hand.",
    "type": "object",
    "additionalProperties": false,
    "x-firestore-collection": "config_brand",
    "x-firestore-path": CONFIG_BRAND_PATH,
    "x-document-id-field": "brand",
    "x-owner": "brand config writer (tool/firebase/create_config_brand.mjs)",
    "required": brandSchema.required,
    "properties": convert(properties),
    "definitions": convert(brandSchema.$defs),
  };
}

export function renderContractSchema() {
  const brandSchema = JSON.parse(fs.readFileSync(brandSchemaPath, "utf8"));
  return `${JSON.stringify(configBrandContractSchema(brandSchema), null, 2)}\n`;
}

const sameRecord = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
}

async function main() {
  const args = parseCommonArgs(process.argv.slice(2), {
    booleanFlags: ["--all", "--verify", "--write-schema"], customFieldCase: "camel",
  });
  if (args.help) {
    printHelp();
    return;
  }
  if (args.writeSchema) {
    fs.writeFileSync(contractSchemaPath, renderContractSchema());
    console.log(`Wrote ${path.relative(repoRoot, contractSchemaPath)}`);
    return;
  }
  const doc = configBrandDocument();
  const targets = resolveTargets(args);
  if (args.json) {
    console.log(JSON.stringify({apply: args.apply ?? false, verify: args.verify ?? false, targets, document: doc}, null, 2));
  } else {
    console.log("Config/brand plan");
    console.log(`Mode: ${args.verify ? "verify" : args.apply ? "apply" : "dry-run"}`);
    console.log(`Targets: ${targets.map((target) => target.env).join(", ")}`);
    console.log(`Brand: ${doc.name} (${doc.web.domain})`);
  }
  if (!args.apply && !args.verify) {
    console.log("\nDry run only. Re-run with --apply to write config/brand, or --verify to compare it.");
    return;
  }
  applyFirestoreEmulatorHost(args.emulatorHost);
  const admin = createFunctionsRequire()("firebase-admin");
  let drifted = false;
  for (const target of targets) {
    if (args.apply) {
      assertProdWriteAllowed({
        env: target.env, projectId: target.projectId, apply: args.apply, allowProd: args.allowProd,
        action: "write config/brand to",
      });
    }
    const app = admin.initializeApp({projectId: target.projectId}, `config-brand-${target.env}`);
    const ref = app.firestore().doc(CONFIG_BRAND_PATH);
    if (args.apply) {
      await ref.set(doc);
      console.log(`  OK  ${target.env}: ${target.projectId}`);
    } else {
      const snap = await ref.get();
      const same = snap.exists && sameRecord(snap.data(), doc);
      if (!same) drifted = true;
      const state = same ? "matches" : snap.exists ? "differs from" : "is missing; expected";
      console.log(`  ${same ? "OK" : "DRIFT"}  ${target.env}: config/brand ${state} brand.json`);
    }
    await app.delete();
  }
  if (drifted) {
    console.error("\nconfig/brand differs from packages/brand/brand.json. Run with --apply to publish it.");
    process.exitCode = 1;
  }
}

function resolveTargets(parsed) {
  if (parsed.project) return [{env: parsed.env ?? "custom", projectId: parsed.project}];
  if (parsed.all) {
    const aliases = readFirebaseProjectAliases();
    return ["dev", "staging", "prod"].map((env) => ({env, projectId: aliases[env]}))
      .filter((target) => target.projectId);
  }
  const env = parsed.env ?? "dev";
  return [{env, projectId: resolveFirebaseProjectId({env})}];
}

function printHelp() {
  console.log(`Usage: node tool/firebase/create_config_brand.mjs [options]

Publishes packages/brand/brand.json to config/brand. Dry-run by default.

Options:
  --apply                 Write the document.
  --allow-prod            Required when --apply targets prod.
  --verify                Read the live document and fail if it differs from brand.json.
  --all                   Target dev, staging, and prod.
  --write-schema          Regenerate contracts/firestore/config_brand.schema.json.
  --json                  Print the plan and document as JSON.
  --env <dev|staging|prod> Resolve project id from .firebaserc. Defaults to dev.
  --project <id>          Firebase project id override.
  --emulator              Use Firestore emulator at 127.0.0.1:8080.
  --emulator-host <host>  Use a custom Firestore emulator host.
  -h, --help              Show this help.
`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
