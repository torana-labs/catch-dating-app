#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {createRequire} from "node:module";
import {fileURLToPath, pathToFileURL} from "node:url";
import {parseCommonArgs} from "../lib/cli_args.mjs";
import {assertProdWriteAllowed, isFirebaseProductionTarget, resolveFirebaseProjectId} from "../lib/firebase_project.mjs";
import {
  CITY_SLUG_PATTERN,
  COHORT_ID_PATTERN,
  WithdrawError,
  applyPlan,
  assertApprovedHash,
  buildPlan,
  summarizePlan,
} from "./lib/listing_cohort_withdraw/withdraw.mjs";

/**
 * Listing cohort withdraw (docs/release_operations.md, "Listing cohort
 * withdraw"): take every public, unclaimed organiser page in one listing
 * cohort (organizers.listingProgram.cohortId) off the site in one
 * owner-approved run. It runs through the dispatch-only `Listing cohort
 * withdraw` workflow; GitHub shows workflow inputs and logs publicly, so the
 * only inputs are the environment, the mode, the cohort id, an optional city
 * slug and the approved manifest hash, and output is counts only: no organiser
 * ids, paths, names, handles or URLs.
 *
 * Modes:
 *   plan    dry run (default): counts, and the manifest SHA-256 to approve
 *   apply   requires --manifest-sha256 equal to the approved plan's; re-reads
 *           the cohort and refuses if it changed, then suppresses each page
 *           (publishStatus suppressed, noindex) with one admin audit row each
 *   verify  passes when nothing in the cohort is left to withdraw
 */

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(toolDir, "../..");
const requireFromFunctions = createRequire(path.join(repoRoot, "functions/package.json"));
const MODES = ["plan", "apply", "verify"];

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await main();
  } catch (error) {
    // Firestore errors can carry document paths, and older organiser ids carry
    // the organiser's name, so only our own messages and error codes print.
    console.error(error instanceof WithdrawError ? `Error: ${error.message}` :
      `Error: the run failed (${String(error?.code ?? error?.name ?? "unknown")}). Rerun locally with --debug for details.`);
    if (process.argv.includes("--debug")) console.error(error);
    process.exitCode = 1;
  }
}

export function parseWithdrawArgs(argv) {
  const args = parseCommonArgs(argv, {
    booleanFlags: ["--debug"],
    valueFlags: ["--cohort-id", "--mode", "--city", "--manifest-sha256", "--manifest-out", "--request-id"],
    allowPositionals: false,
    customFieldCase: "camel",
  });
  if (args.help) return args;
  if (!args.env && !args.project && !args.emulatorHost) {
    throw new WithdrawError("Name the target with --env <dev|prod>, --project <id> or --emulator. " +
      "This tool never falls back to an ambient project.");
  }
  args.mode = args.mode ?? "plan";
  if (!MODES.includes(args.mode)) throw new WithdrawError(`--mode must be one of ${MODES.join(", ")}.`);
  if (!COHORT_ID_PATTERN.test(args.cohortId ?? "")) {
    throw new WithdrawError("--cohort-id must be a listing cohort id such as pilot-indore-1.");
  }
  args.city = args.city ? args.city : null;
  if (args.city !== null && !CITY_SLUG_PATTERN.test(args.city)) {
    throw new WithdrawError("--city must be a city slug: lowercase letters, digits and hyphens.");
  }
  if (args.apply) throw new WithdrawError("Choose a write with --mode apply, not --apply.");
  if (args.mode !== "apply" && args.manifestSha256) {
    throw new WithdrawError("--manifest-sha256 is for --mode apply only.");
  }
  if (args.mode === "apply" && !args.manifestSha256) {
    throw new WithdrawError("apply needs --manifest-sha256: the 64-character SHA-256 the approved plan printed.");
  }
  if (args.requestId != null && !/^[A-Za-z0-9_-]{1,80}$/u.test(args.requestId)) {
    throw new WithdrawError("--request-id must be letters, digits, hyphens or underscores.");
  }
  return args;
}

/** Real dependencies; tests pass fakes. */
function realDeps(projectId) {
  const admin = requireFromFunctions("firebase-admin");
  const app = admin.initializeApp({projectId}, `listing-cohort-withdraw-${Date.now()}`);
  return {
    db: app.firestore(),
    serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
    close: () => app.delete(),
  };
}

export async function main(argv = process.argv.slice(2), injected = null) {
  const args = parseWithdrawArgs(argv);
  if (args.help) {
    printHelp();
    return undefined;
  }
  const projectId = resolveFirebaseProjectId({env: args.env, project: args.project, defaultEnv: null});
  assertProdWriteAllowed({env: args.env, projectId, apply: args.mode === "apply", allowProd: args.allowProd,
    confirmProd: args.confirmProd, action: "withdraw a listing cohort in"});
  if (args.emulatorHost) process.env.FIRESTORE_EMULATOR_HOST = args.emulatorHost;
  const deps = injected ?? realDeps(projectId);
  try {
    return await run({args, projectId, deps});
  } finally {
    await deps.close?.();
  }
}

function print(lines) {
  for (const line of lines) console.log(line);
}

function printSummary(summary, {withHash}) {
  print([
    `City filter: ${summary.city ?? "all cities"}`,
    `Matched in cohort: ${summary.matched}`,
    `Would withdraw: ${summary.withdraw}`,
    `  of which with a claim pending (withdrawn too): ${summary.claimPending}`,
    `Already withdrawn by this cohort withdrawal: ${summary.alreadyWithdrawn}`,
    `Skipped, already suppressed or removed: ${summary.alreadyOff}`,
    `Skipped, claimed by their owner: ${summary.claimed}`,
    `Skipped, not published (draft, qa or no page): ${summary.notPublished}`,
    "By city:",
    ...(Object.keys(summary.byCity).length === 0 ? ["  (none)"] :
      Object.entries(summary.byCity).map(([city, counts]) =>
        `  ${city}: matched ${counts.matched}, would withdraw ${counts.withdraw}`)),
    withHash ? `Manifest: ${summary.manifestOrganizers} organiser(s), SHA-256 ${summary.sha256}` :
      `Manifest: ${summary.manifestOrganizers} organiser(s)`,
  ]);
}

async function run({args, projectId, deps}) {
  const {db} = deps;
  const target = isFirebaseProductionTarget({env: args.env, projectId}) ? "prod" : projectId;
  console.log(`Listing cohort withdraw ${args.cohortId}: ${args.mode} (${target})`);
  const plan = await buildPlan({db, cohortId: args.cohortId, city: args.city});
  const summary = summarizePlan(plan);

  if (args.mode === "plan") {
    printSummary(summary, {withHash: true});
    if (args.manifestOut) {
      // Local runs only: the manifest lists organiser ids, which can carry a
      // name, so the workflow never writes or uploads it.
      fs.mkdirSync(path.dirname(path.resolve(args.manifestOut)), {recursive: true});
      fs.writeFileSync(args.manifestOut, `${JSON.stringify({...plan.manifest, sha256: plan.sha256}, null, 2)}\n`);
      console.log("Manifest written to the local file named by --manifest-out.");
    }
    print(["Dry run only. Nothing was changed.",
      summary.withdraw === 0 ? "Nothing to withdraw." :
        `To withdraw, run apply with manifest SHA-256 ${summary.sha256} once the owner approves these counts.`]);
    return {summary};
  }

  if (args.mode === "apply") {
    // The hash is not printed here: a changed cohort needs a new plan run the
    // owner reviews, not a copy of a hash from a refused apply.
    printSummary(summary, {withHash: false});
    assertApprovedHash(plan, args.manifestSha256);
    console.log("Manifest SHA-256 matches the approved plan.");
    const result = await applyPlan({db, plan, serverTimestamp: deps.serverTimestamp, requestId: args.requestId ?? null});
    const after = summarizePlan(await buildPlan({db, cohortId: args.cohortId, city: args.city}));
    print([
      `Applied: ${result.withdrawn} withdrawn, ${result.changedSincePlan} skipped (changed since the plan), ` +
        `${result.transactions} transaction(s), ${result.withdrawn} audit row(s).`,
      "Derived stores rebuild from these writes: public pages, city plans, publicOrganizers and search (organizer triggers).",
      `Re-checked after apply: would withdraw ${after.withdraw}, already withdrawn ${after.alreadyWithdrawn}.`,
    ]);
    return {summary, result, after};
  }

  // verify
  printSummary(summary, {withHash: true});
  const passed = summary.withdraw === 0;
  console.log(`Verify: ${passed ? "passed" : "FAILED"}`);
  if (!passed) throw new WithdrawError("Public, unclaimed organisers are still in this cohort. Run plan, then apply.");
  return {summary};
}

function printHelp() {
  console.log(`Usage: node tool/data/listing_cohort_withdraw.mjs (--env <name> | --project <id> | --emulator) \\
  --cohort-id <cohort> [--mode plan|apply|verify] [options]

Takes every public, unclaimed organiser page in one listing cohort off the site.
Output is counts only. plan (the default) prints the manifest SHA-256 the owner
approves; apply needs that hash and refuses if the cohort changed since.

Options:
  --city <slug>              Only organisers whose page is in this city.
  --manifest-sha256 <hash>   apply only: the approved plan's manifest SHA-256.
  --allow-prod               Required for apply in prod.
  --request-id <id>          apply only: recorded on each audit row (the workflow passes its run id).
  --manifest-out <file>      plan only, local runs: write the manifest (organiser ids) to this file.
  --debug                    Print full errors (may include paths; never in CI).
  -h, --help                 Show this help.
`);
}
