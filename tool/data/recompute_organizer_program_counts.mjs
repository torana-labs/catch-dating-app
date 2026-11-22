#!/usr/bin/env node
import {isMain, parseCommonArgs} from "../lib/cli_args.mjs";
import {createFunctionsRequire} from "../lib/repo_paths.mjs";
import {
  assertProdWriteAllowed,
  resolveFirebaseProjectId,
} from "../lib/firebase_project.mjs";

if (isMain(import.meta.url)) {
  await main();
}

/**
 * Recounts the planner list counts (guestCount, repliedGuestCount,
 * flyingInCount and their fences) on every organizerProgramViews document
 * with the nightly recount's own code, compiled from functions/src.
 */
export async function main(argv = process.argv.slice(2), deps = {}) {
  const args = parseCommonArgs(argv, {allowPositionals: false});
  if (args.help) {
    printHelp();
    return;
  }
  const projectId = resolveFirebaseProjectId({
    env: args.env, project: args.project, defaultEnv: null,
  });
  assertProdWriteAllowed({
    env: args.env, projectId, apply: args.apply, allowProd: args.allowProd,
    confirmProd: args.confirmProd, action: "write programme counts to",
  });
  if (args.emulatorHost) process.env.FIRESTORE_EMULATOR_HOST = args.emulatorHost;
  const requireFromFunctions = createFunctionsRequire();
  const db = deps.firestore ?? (() => {
    const admin = requireFromFunctions("firebase-admin");
    admin.initializeApp({projectId});
    return admin.firestore();
  })();
  const recountAll = deps.recountAll ?? loadRecount(requireFromFunctions);
  const summary = await recountAll(db, {dryRun: !args.apply});
  if (args.json) {
    console.log(JSON.stringify({projectId, apply: args.apply, ...summary},
      null, 2));
  } else {
    printSummary(projectId, summary, args.apply);
  }
  if (!args.apply) {
    console.log("\nDry run only. Re-run with --apply to write the counts.");
  }
  return summary;
}

function loadRecount(requireFromFunctions) {
  try {
    return requireFromFunctions("./lib/programs/organizerProgramCounts.js")
      .recountAllOrganizerPrograms;
  } catch (error) {
    throw new Error(
      "Recounting programmes needs compiled Functions; run " +
      `\`npm --prefix functions run build\` first (${error.message}).`,
    );
  }
}

function printHelp() {
  console.log(`Usage: node tool/data/recompute_organizer_program_counts.mjs [options]

Recounts organizerProgramViews/{programId} guestCount, repliedGuestCount and
flyingInCount from programGuests and programTravelLegs, with the code of the
nightly recount (reconcileOrganizerProgramCountsSweep). Views whose counts
match are left alone; a view a trigger moves during its recount is left to the
next run. Build Functions first: npm --prefix functions run build.

Options:
  --apply                 Write the counts. Default is a dry run.
  --allow-prod            Required with --apply against prod.
  --json                  Print the summary as JSON.
  --env <dev|prod>        Resolve the project id from .firebaserc.
  --project <id>          Firebase project id.
  --emulator              Use the Firestore emulator at 127.0.0.1:8080.
  --emulator-host <host>  Use a custom Firestore emulator host.
  -h, --help              Show this help.
`);
}

function printSummary(projectId, summary, apply) {
  console.log(`Programme count recount (${projectId})`);
  console.log(`Views scanned: ${summary.scanned}`);
  console.log(`${apply ? "Written" : "Would write"}: ` +
    `${apply ? summary.written : summary.drift}`);
  console.log(`Already current: ${summary.current}`);
  console.log(`Kept (over 5,000 guests or journeys): ${summary.tooLarge}`);
  console.log(`Left for the next run (view kept changing): ${summary.busy}`);
  for (const change of summary.changes.slice(0, 100)) {
    console.log(`- ${change.programId}: ${JSON.stringify(change.before)} -> ` +
      JSON.stringify(change.counts));
  }
  if (summary.changes.length > 100) {
    console.log(`... ${summary.changes.length - 100} more`);
  }
}
