#!/usr/bin/env node
// One-time fold of the retired organizerFormDomains registry into
// customDomains (#1110). The dry run is the read-only per-environment count
// the plan requires before folding; --apply copies, --retire-legacy also
// deletes each legacy document whose exact copy exists. The conversion lives
// in functions/src/customDomains/legacyFormDomainMigration.ts, so build
// Functions first.
import {isMain, parseCommonArgs} from "../lib/cli_args.mjs";
import {createFunctionsRequire} from "../lib/repo_paths.mjs";
import {
  applyFirestoreEmulatorHost, assertProdWriteAllowed, resolveFirebaseProjectId,
} from "../lib/firebase_project.mjs";

export function parseMigrationArgs(argv) {
  const args = parseCommonArgs(argv, {booleanFlags: ["--retire-legacy"],
    allowPositionals: false, customFieldCase: "camel"});
  const retireLegacy = args.retireLegacy === true;
  if (retireLegacy && !args.apply) {
    throw new Error("--retire-legacy deletes legacy documents; it requires --apply.");
  }
  if (!args.help && !args.env && !args.project && !args.emulatorHost) {
    throw new Error("Choose an explicit --env dev|staging|prod, --project or --emulator.");
  }
  return {...args, retireLegacy};
}

export function summarizePlan(plan) {
  return {
    legacyCount: plan.legacyCount,
    ...plan.summary,
    rows: plan.rows.map((row) => row.action === "create" ?
      {hostname: row.hostname, action: row.action, status: row.record.status,
        generation: row.record.generation} : row),
  };
}

export async function runMigration(args, {db, migration, now = Date.now, log = console.log}) {
  const plan = await migration.planLegacyFormDomainMigration(db, now());
  const summary = summarizePlan(plan);
  log(JSON.stringify(summary, null, 2));
  if (plan.legacyCount === 0) {
    log("organizerFormDomains is empty: nothing to migrate.");
    return {summary, applied: null};
  }
  if (!args.apply) {
    log("Dry run only. Re-run with --apply to copy, then --apply --retire-legacy.");
    return {summary, applied: null};
  }
  const applied = await migration.applyLegacyFormDomainMigration(db, now(),
    {retireLegacy: args.retireLegacy});
  log(JSON.stringify(applied, null, 2));
  return {summary, applied};
}

async function main(argv = process.argv.slice(2)) {
  const args = parseMigrationArgs(argv);
  if (args.help) {
    console.log(`Usage: node tool/data/migrate_form_domains_to_custom_domains.mjs \\
  (--env <dev|staging|prod> | --project <id> | --emulator) [--apply [--retire-legacy]] [--allow-prod]

Counts organizerFormDomains and plans each document's customDomains record.
Default is a read-only dry run. Production writes also need --allow-prod.`);
    return;
  }
  applyFirestoreEmulatorHost(args.emulatorHost);
  const projectId = resolveFirebaseProjectId({...args, defaultEnv: null});
  assertProdWriteAllowed({env: args.env, projectId, apply: args.apply,
    allowProd: args.allowProd, confirmProd: args.confirmProd,
    action: "migrate organizerFormDomains"});
  const require = createFunctionsRequire();
  const admin = require("firebase-admin");
  const migration = require("./lib/customDomains/legacyFormDomainMigration.js");
  const app = admin.initializeApp({projectId}, "form-domain-migration");
  try {
    await runMigration(args, {db: app.firestore(), migration});
  } finally {
    await app.delete();
  }
}

if (isMain(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`Form domain migration failed: ${error.message}\n`);
    process.exitCode = 1;
  });
}
