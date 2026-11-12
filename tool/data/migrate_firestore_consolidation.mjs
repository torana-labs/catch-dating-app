#!/usr/bin/env node
import path from "node:path";
import {createRequire} from "node:module";
import {fileURLToPath, pathToFileURL} from "node:url";
import {parseCommonArgs} from "../lib/cli_args.mjs";
import {
  assertProdWriteAllowed,
  resolveFirebaseProjectId,
} from "../lib/firebase_project.mjs";
import {migrationsByName} from "./lib/firestore_consolidation_migrations.mjs";
import {
  applyMigrationPlan,
  planMigration,
  summarizePlan,
  writePlanBackup,
} from "./lib/copy_forward.mjs";

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const requireFromFunctions = createRequire(
  path.join(toolDir, "../../functions/package.json")
);

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseCommonArgs(argv, {
    booleanFlags: ["--confirm-migration"],
    valueFlags: ["--migration", "--backup-file"],
    allowPositionals: false,
    customFieldCase: "camel",
  });
  if (args.help || !args.migration) {
    printHelp();
    return;
  }
  const migrations = migrationsByName(String(args.migration).split(","));
  const projectId = resolveFirebaseProjectId({
    env: args.env, project: args.project, defaultEnv: null,
  });
  assertProdWriteAllowed({
    env: args.env, projectId, apply: args.apply,
    allowProd: args.allowProd, confirmProd: false,
    action: "copy migration documents into",
  });
  if (args.apply && (!args.confirmMigration || !args.backupFile)) {
    throw new Error(
      "--apply requires --confirm-migration and --backup-file <path>. " +
      "Run a dry run first."
    );
  }
  if (args.emulatorHost) process.env.FIRESTORE_EMULATOR_HOST = args.emulatorHost;

  const admin = requireFromFunctions("firebase-admin");
  admin.initializeApp({projectId});
  const db = admin.firestore();

  const plans = [];
  for (const migration of migrations) plans.push(await planMigration(db, migration));
  const summaries = plans.map(summarizePlan);
  if (args.json) console.log(JSON.stringify(summaries, null, 2));
  else for (const summary of summaries) printSummary(summary);

  if (!args.apply) {
    console.log("\nDry run only. Nothing was written.");
    return;
  }
  writePlanBackup(args.backupFile, plans);
  for (const plan of plans) {
    const result = await applyMigrationPlan(db, plan);
    console.log(`Applied ${result.migration}: created ${result.created} document(s).`);
  }
}

function printSummary(summary) {
  console.log(`\n${summary.migration}`);
  for (const step of summary.steps) {
    console.log(
      `  ${step.source} -> ${step.target}: scanned ${step.scanned}, ` +
      `to create ${step.toCreate}, already copied ${step.alreadyCopied}, ` +
      `conflicts ${step.conflicts.length}, skipped ${step.skipped}`
    );
    for (const conflict of step.conflicts) {
      console.log(`    conflict: ${conflict.sourcePath} -> ${conflict.targetPath}`);
    }
  }
}

function printHelp() {
  console.log(`Usage: node tool/data/migrate_firestore_consolidation.mjs --migration <name[,name]|all> [options]

Copies documents from retired collections into their replacements. Never
deletes or updates a source document and never overwrites a target.

Options:
  --migration <names>       Registered migration names, comma-separated, or all.
  --apply                   Write the planned documents. Default is a dry run.
  --confirm-migration       Required with --apply.
  --backup-file <path>      Required with --apply: saves the planned writes first.
  --allow-prod              Required with --apply when the target is prod.
  --json                    Print plan summaries as JSON.
  --env <dev|staging|prod>  Resolve the project id from .firebaserc.
  --project <id>            Firebase project id.
  --emulator                Use the Firestore emulator at 127.0.0.1:8080.
  --emulator-host <host>    Use a custom Firestore emulator host.
  -h, --help                Show this help.
`);
}
