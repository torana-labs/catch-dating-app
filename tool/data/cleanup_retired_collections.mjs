#!/usr/bin/env node
import path from "node:path";
import {createRequire} from "node:module";
import {fileURLToPath} from "node:url";
import {isMain, parseCommonArgs} from "../lib/cli_args.mjs";
import {
  assertProdWriteAllowed,
  resolveFirebaseProjectId,
} from "../lib/firebase_project.mjs";
import {
  allowlistedCollections,
  applyCleanup,
  discoverBhagTerms,
  planCleanup,
  selectCollections,
  summarizePlans,
  writeAndVerifyBackups,
} from "./lib/retired_collections_cleanup.mjs";

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const requireFromFunctions = createRequire(
  path.join(toolDir, "../../functions/package.json")
);

if (isMain(import.meta.url)) {
  await main();
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseCommonArgs(argv, {
    booleanFlags: ["--confirm-cleanup"],
    valueFlags: ["--backup-dir", "--collections"],
    allowPositionals: false,
    customFieldCase: "camel",
  });
  if (args.help) {
    printHelp();
    return;
  }
  const collections = args.collections ?
    String(args.collections).split(",").map((name) => name.trim()).filter(Boolean) :
    null;
  selectCollections(collections);
  const projectId = resolveFirebaseProjectId({
    env: args.env, project: args.project, defaultEnv: null,
  });
  assertProdWriteAllowed({
    env: args.env, projectId, apply: args.apply,
    allowProd: args.allowProd, confirmProd: false,
    action: "delete retired-collection documents from",
  });
  if (args.apply && (!args.confirmCleanup || !args.backupDir)) {
    throw new Error(
      "--apply requires --confirm-cleanup and --backup-dir <dir>. " +
      "Run a dry run first."
    );
  }
  if (args.emulatorHost) process.env.FIRESTORE_EMULATOR_HOST = args.emulatorHost;

  const admin = requireFromFunctions("firebase-admin");
  admin.initializeApp({projectId});
  const db = admin.firestore();

  const report = await runCleanup(db, {
    collections,
    apply: args.apply,
    backupDir: args.backupDir ? path.resolve(args.backupDir) : null,
  });
  if (args.json) console.log(JSON.stringify(report, null, 2));
  else printReport(projectId, report);
}

export async function runCleanup(db, {collections, apply, backupDir}) {
  const {terms, found} = await discoverBhagTerms(db);
  const plans = await planCleanup(db, {collections, terms});
  const report = {
    apply: Boolean(apply),
    bhagTerms: terms,
    bhagDocumentsFound: found,
    plans: summarizePlans(plans),
    backups: [],
    deleted: [],
  };
  if (!apply) return report;
  report.backups = writeAndVerifyBackups(backupDir, plans);
  report.deleted = await applyCleanup(db, plans);
  return report;
}

function printReport(projectId, report) {
  console.log(`Project: ${projectId}`);
  console.log(`Bhag identifiers (excluded): ${report.bhagTerms.join(", ")}`);
  for (const plan of report.plans) {
    console.log(
      `\n${plan.collection}: scanned ${plan.scanned}, ` +
      `${report.apply ? "to delete" : "would delete"} ${plan.toDelete}`
    );
    printExcluded("kept (Bhag)", plan.excludedBhag);
    printExcluded("kept (replacement missing)", plan.excludedReplacementMissing);
    printExcluded("kept (has subcollections)", plan.excludedHasSubcollections);
  }
  for (const backup of report.backups) {
    console.log(`Backup: ${backup.file} (${backup.count} documents)`);
  }
  for (const result of report.deleted) {
    console.log(
      `Deleted ${result.deleted} from ${result.collection}` +
      (result.changedSinceScan ? ` (${result.changedSinceScan} changed, kept)` : "")
    );
  }
  if (!report.apply) console.log("\nDry run only. Nothing was deleted.");
}

function printExcluded(label, ids) {
  if (ids.length > 0) console.log(`  ${label}: ${ids.join(", ")}`);
}

function printHelp() {
  console.log(`Delete leftover documents in retired Firestore collections.

Dry run by default. Allowlist: ${allowlistedCollections().join(", ")}

  node tool/data/cleanup_retired_collections.mjs --env <dev|prod> [--collections a,b]
  node tool/data/cleanup_retired_collections.mjs --env dev --apply \\
    --confirm-cleanup --backup-dir <dir>
  (prod additionally needs --allow-prod)

Skips any document that mentions Bhag or an identifier found on Bhag's
organizer, page or events, whose replacement is missing, or that has
subcollections. Writes and verifies a JSON backup per collection before deleting.`);
}
