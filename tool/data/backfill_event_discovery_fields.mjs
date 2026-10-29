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

export const discoveryProjectionFields = [
  "discoveryCityName",
  "discoveryMarketId",
  "discoveryActivityKind",
  "discoveryGeoCell",
  "discoveryHasOpenSpots",
  "discoveryAvailability",
  "discoveryOpenCohorts",
  "discoveryWaitlistCohorts",
  "discoveryInviteRequired",
  "discoveryMembershipRequired",
  "discoveryManualApprovalRequired",
  "discoveryMinAge",
  "discoveryMaxAge",
];

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
  const plan = await buildEventDiscoveryProjectionRepairPlan(
    db,
    loadEventDiscoveryProjection()
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

  await applyEventDiscoveryProjectionRepairPlan(db, plan);
  console.log("\nApplied event discovery projection repairs.");
}

export async function buildEventDiscoveryProjectionRepairPlan(
  firestore,
  eventDiscoveryProjection
) {
  const [eventsSnap, clubsSnap] = await Promise.all([
    firestore.collection("events").get(),
    firestore.collection("clubs").get(),
  ]);
  const clubs = new Map(
    clubsSnap.docs.map((doc) => [doc.id, doc.data()])
  );
  const repairs = [];
  const warnings = [];

  for (const eventDoc of eventsSnap.docs) {
    const event = eventDoc.data();
    const {
      clubLocation,
      clubLocationMarketId,
      warning,
    } = citySourceForEvent(eventDoc, event, clubs);
    if (warning) warnings.push(warning);

    const expected = pickDiscoveryProjection(
      eventDiscoveryProjection({event, clubLocation, clubLocationMarketId})
    );
    const current = pickDiscoveryProjection(event);
    if (!isDeepStrictEqual(current, expected)) {
      repairs.push({
        path: eventDoc.ref.path,
        eventId: eventDoc.id,
        clubId: typeof event.clubId === "string" ? event.clubId : null,
        current,
        expected,
      });
    }
  }

  return {
    repairs,
    summary: {
      eventsScanned: eventsSnap.size,
      clubsScanned: clubsSnap.size,
      repairsNeeded: repairs.length,
      warnings,
      repairs,
    },
  };
}

export async function applyEventDiscoveryProjectionRepairPlan(
  firestore,
  plan
) {
  for (let i = 0; i < plan.repairs.length; i += 450) {
    const batch = firestore.batch();
    for (const repair of plan.repairs.slice(i, i + 450)) {
      batch.update(firestore.doc(repair.path), repair.expected);
    }
    await batch.commit();
  }
}

export function pickDiscoveryProjection(data) {
  return Object.fromEntries(
    discoveryProjectionFields.map((field) => [field, data?.[field]])
  );
}

function citySourceForEvent(eventDoc, event, clubs) {
  const clubId = typeof event.clubId === "string" ? event.clubId : null;
  const club = clubId ? clubs.get(clubId) : null;
  const clubLocationMarketId = stringOrNull(club?.locationMarketId);
  const clubLocation = stringOrNull(club?.location);
  if (clubLocationMarketId || clubLocation) {
    return {
      clubLocation,
      clubLocationMarketId,
      warning: null,
    };
  }

  const fallbackMarketId = stringOrNull(event.discoveryMarketId);
  const fallbackCity = stringOrNull(event.discoveryCityName);
  const missingClubWarning = clubId ?
    `${eventDoc.ref.path} references missing clubs/${clubId}; ` +
      "using existing discovery market fallback." :
    `${eventDoc.ref.path} has no clubId; ` +
      "using existing discovery market fallback.";
  if (fallbackMarketId || fallbackCity) {
    return {
      clubLocation: fallbackCity,
      clubLocationMarketId: fallbackMarketId,
      warning: missingClubWarning,
    };
  }

  return {
    clubLocation: null,
    clubLocationMarketId: null,
    warning: `${missingClubWarning} Event will not be discoverable by market ` +
      "until its club link is repaired.",
  };
}

function stringOrNull(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function loadEventDiscoveryProjection() {
  try {
    return requireFromFunctions("./lib/events/eventDiscoveryProjection.js")
      .eventDiscoveryProjection;
  } catch (error) {
    throw new Error(
      "Could not load functions/lib/events/eventDiscoveryProjection.js. " +
      "Run `npm --prefix functions run build` before this repair tool. " +
      `Original error: ${error.message}`
    );
  }
}

function printHelp() {
  console.log(`Usage: node tool/data/backfill_event_discovery_fields.mjs [options]

Backfills callable-owned events/{eventId} discovery projection fields used by
Explore's direct event query. The script is dry-run by default.

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
  const marketlessRepairs = summary.repairs.filter(
    (repair) => repair.expected.discoveryMarketId == null
  ).length;
  return {
    eventsScanned: summary.eventsScanned,
    clubsScanned: summary.clubsScanned,
    repairsNeeded: summary.repairsNeeded,
    marketlessRepairs,
    warningCount: summary.warnings.length,
    warnings: summary.warnings,
  };
}

function printSummary(summary, {summaryOnly = false} = {}) {
  console.log("Event discovery projection repair plan");
  console.log(`Events scanned: ${summary.eventsScanned}`);
  console.log(`Clubs scanned: ${summary.clubsScanned}`);
  console.log(`Repairs needed: ${summary.repairsNeeded}`);

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
