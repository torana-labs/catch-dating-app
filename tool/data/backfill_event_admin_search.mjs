#!/usr/bin/env node
import path from "node:path";
import {createRequire} from "node:module";
import {isDeepStrictEqual} from "node:util";
import {fileURLToPath} from "node:url";
import {parseCommonArgs} from "../lib/cli_args.mjs";
import {isFirebaseProductionTarget, resolveFirebaseProjectId} from "../lib/firebase_project.mjs";

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(toolDir, "../..");
const requireFromFunctions = createRequire(
  path.join(repoRoot, "functions/package.json")
);
const firestoreMaintenanceArgOptions = {
  booleanFlags: ["--summary-only"],
  allowPositionals: false,
  customFieldCase: "camel",
};

if (isMain()) {
  await main();
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseCommonArgs(argv, firestoreMaintenanceArgOptions);
  if (args.help) {
    printHelp();
    return;
  }

  const projectId = resolveFirebaseProjectId({env: args.env, project: args.project, defaultEnv: null});
  if (args.apply && isFirebaseProductionTarget({env: args.env, projectId}) && !args.allowProd) {
    throw new Error(
      "Refusing to backfill prod without --allow-prod. " +
      "Run a dry run first, then rerun with --apply --allow-prod."
    );
  }
  if (args.emulatorHost) {
    process.env.FIRESTORE_EMULATOR_HOST = args.emulatorHost;
  }

  const admin = requireFromFunctions("firebase-admin");
  admin.initializeApp({projectId});
  const db = admin.firestore();
  const plan = await buildEventAdminSearchRepairPlan(
    db,
    loadEventAdminSearchProjectionBuilder(),
    {serverTimestamp: admin.firestore.FieldValue.serverTimestamp()}
  );

  if (args.json) {
    const summary = args.summaryOnly ?
      compactSummary(plan.summary) :
      plan.summary;
    console.log(JSON.stringify(summary, null, 2));
  } else {
    printSummary(plan.summary, {summaryOnly: args.summaryOnly});
  }

  if (!args.apply) {
    console.log("\nDry run only. Re-run with --apply to write repairs.");
    return;
  }

  await applyEventAdminSearchRepairPlan(db, plan);
  console.log("\nApplied event admin search repairs.");
}

export async function buildEventAdminSearchRepairPlan(
  firestore,
  buildEventAdminSearchProjection,
  options = {}
) {
  const serverTimestamp = options.serverTimestamp ?? "SERVER_TIMESTAMP";
  const [eventsSnap, organizersSnap] = await Promise.all([
    firestore.collection("events").get(),
    firestore.collection("organizers").get(),
  ]);
  const organizers = new Map(
    organizersSnap.docs.map((doc) => [doc.id, doc.data()])
  );
  const repairs = [];
  const warnings = [];

  for (const eventDoc of eventsSnap.docs) {
    const event = eventDoc.data();
    const organizerId = typeof event.organizerId === "string" ? event.organizerId : null;
    const organizer = organizerId ? organizers.get(organizerId) ?? null : null;
    const warning = warningForEventOrganizer(eventDoc, organizerId, organizer);
    if (warning) warnings.push(warning);

    const expectedAdminSearch = buildEventAdminSearchProjection(
      eventDoc.id,
      event,
      organizer,
      serverTimestamp,
      "adminEventSearchBackfill"
    );
    const current = pickEventAdminSearchComparable(event.adminSearch);
    const expected =
      pickEventAdminSearchComparable(expectedAdminSearch);
    if (!isDeepStrictEqual(current, expected)) {
      repairs.push({
        path: eventDoc.ref.path,
        eventId: eventDoc.id,
        organizerId,
        current,
        expected,
        patch: {adminSearch: expectedAdminSearch},
      });
    }
  }

  const summaryRepairs = repairs.map(({patch: _patch, ...repair}) => repair);
  return {
    repairs,
    summary: {
      eventsScanned: eventsSnap.size,
      organizersScanned: organizersSnap.size,
      repairsNeeded: repairs.length,
      missingSearch: summaryRepairs.filter((repair) =>
        repair.current.tokens.length === 0
      ).length,
      staleSearch: summaryRepairs.filter((repair) =>
        repair.current.tokens.length > 0
      ).length,
      warnings,
      repairs: summaryRepairs,
    },
  };
}

export async function applyEventAdminSearchRepairPlan(firestore, plan) {
  for (let i = 0; i < plan.repairs.length; i += 450) {
    const batch = firestore.batch();
    for (const repair of plan.repairs.slice(i, i + 450)) {
      batch.update(firestore.doc(repair.path), repair.patch);
    }
    await batch.commit();
  }
}

export function pickEventAdminSearchComparable(adminSearch) {
  const tokens = Array.isArray(adminSearch?.tokens) ?
    adminSearch.tokens.filter((token) => typeof token === "string") :
    [];
  const sortKey = typeof adminSearch?.sortKey === "string" ?
    adminSearch.sortKey :
    null;
  return {tokens, sortKey};
}

function warningForEventOrganizer(eventDoc, organizerId, organizer) {
  if (!organizerId) return `${eventDoc.ref.path} has no organizerId.`;
  if (!organizer) {
    return `${eventDoc.ref.path} references missing clubs/${organizerId}.`;
  }
  return null;
}

function loadEventAdminSearchProjectionBuilder() {
  try {
    return requireFromFunctions("./lib/admin/eventAdminSearch.js")
      .buildEventAdminSearchProjection;
  } catch (error) {
    throw new Error(
      "Could not load functions/lib/admin/eventAdminSearch.js. " +
      "Run `npm --prefix functions run build` before this repair tool. " +
      `Original error: ${error.message}`
    );
  }
}

function printHelp() {
  console.log(`Usage: node tool/data/backfill_event_admin_search.mjs [options]

Backfills server-owned events/{eventId}.adminSearch projections used by the
admin Events tab. The script is dry-run by default.

Options:
  --apply                 Write repairs. Default is dry-run.
  --allow-prod            Required with --apply against prod.
  --json                  Print summary as JSON.
  --summary-only          Omit per-document repair details from output.
  --env <dev|staging|prod> Resolve project id from .firebaserc.
  --project <id>          Firebase project id.
  --emulator              Use Firestore emulator at 127.0.0.1:8080.
  --emulator-host <host>  Use a custom Firestore emulator host.
  -h, --help              Show this help.
`);
}

function compactSummary(summary) {
  return {
    eventsScanned: summary.eventsScanned,
    organizersScanned: summary.organizersScanned,
    repairsNeeded: summary.repairsNeeded,
    missingSearch: summary.missingSearch,
    staleSearch: summary.staleSearch,
    warningCount: summary.warnings.length,
    warnings: summary.warnings,
  };
}

function printSummary(summary, {summaryOnly = false} = {}) {
  console.log("Event admin search repair plan");
  console.log(`Events scanned: ${summary.eventsScanned}`);
  console.log(`Clubs scanned: ${summary.organizersScanned}`);
  console.log(`Repairs needed: ${summary.repairsNeeded}`);
  console.log(`Missing search projections: ${summary.missingSearch}`);
  console.log(`Stale search projections: ${summary.staleSearch}`);

  if (!summaryOnly && summary.repairs.length > 0) {
    console.log("\nRepairs:");
    for (const repair of summary.repairs.slice(0, 100)) {
      console.log(`- ${repair.path}: ${JSON.stringify(repair.expected)}`);
    }
    if (summary.repairs.length > 100) {
      console.log(`... ${summary.repairs.length - 100} more repairs`);
    }
  }

  if (summary.warnings.length > 0) {
    console.log("\nWarnings:");
    for (const warning of summary.warnings.slice(0, 100)) {
      console.log(`- ${warning}`);
    }
    if (summary.warnings.length > 100) {
      console.log(`... ${summary.warnings.length - 100} more warnings`);
    }
  }
}

function isMain() {
  return process.argv[1] &&
    path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}
