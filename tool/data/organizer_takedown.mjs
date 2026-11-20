#!/usr/bin/env node
import {execFile} from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {createRequire} from "node:module";
import {fileURLToPath, pathToFileURL} from "node:url";
import {parseCommonArgs} from "../lib/cli_args.mjs";
import {assertProdWriteAllowed, isFirebaseProductionTarget, resolveFirebaseProjectId} from "../lib/firebase_project.mjs";
import {isSuppressionCaseId} from "./lib/organizer_takedown/suppression.mjs";
import {readSchemaInventory} from "./lib/organizer_takedown/inventory.mjs";
import {TakedownError, buildTakedownPlan, outstanding, parseCaseFile, summarizePlan} from "./lib/organizer_takedown/plan.mjs";
import {
  apply,
  assertPreserved,
  caseRoot,
  preserve,
  publicPaths,
  readLatestApplyManifest,
  readLatestPreserveManifest,
  suppress,
  verify,
} from "./lib/organizer_takedown/actions.mjs";
import {cleanBigQuery} from "./lib/organizer_takedown/bigquery.mjs";

/**
 * Organiser takedown: preserve, then delete, then block (docs/release_operations.md,
 * "Organiser takedown"). The only inputs are an environment, a mode and an
 * opaque case id (TD-nnnn). Which organisers the case covers comes from the
 * case file in the restricted preservation bucket,
 * gs://<project>-takedown-preservation/cases/<caseId>/case.json (or a later
 * correction, case-NN.json), never from the
 * command line, because GitHub shows workflow inputs and logs publicly.
 * Output is counts only: no ids, paths, names, handles or URLs. Build Functions
 * first (npm --prefix functions run build): the do-not-list key derivation is
 * loaded from functions/lib/listingSuppressions/registry.js.
 *
 * Modes, in order:
 *   plan      dry run: what each store holds for the case (counts)
 *   preserve  copy every matching document, subcollection and Storage object to
 *             cases/<caseId>/preserve/<time>/ with a SHA-256 manifest
 *   apply     delete across every store (requires a preserve run covering the
 *             plan), redact admin audit logs, patch peers' recommendation rails,
 *             delete Storage objects; derived stores rebuild from the deletes
 *   suppress  write listingSuppressions/<caseId> (keyed hashes only)
 *   verify    nothing left anywhere, the public paths are gone and out of the
 *             sitemap, the suppression covers every key; prints backup expiry
 *   bigquery  after the streaming-buffer wait, export then delete matching rows
 *             from the export changelogs and streamed analytics tables
 */

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(toolDir, "../..");
const requireFromFunctions = createRequire(path.join(repoRoot, "functions/package.json"));
const MODES = ["plan", "preserve", "apply", "suppress", "verify", "bigquery"];
const WRITE_MODES = new Set(["apply", "suppress", "bigquery"]);
const SECRET_NAME = "LISTING_SUPPRESSION_HMAC_KEY";

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await main();
  } catch (error) {
    // Firestore and Storage errors can carry document paths, which can carry
    // an organiser's slug, so only our own messages and error codes print.
    console.error(error instanceof TakedownError ? `Error: ${error.message}` :
      `Error: the run failed (${String(error?.code ?? error?.name ?? "unknown")}). Rerun locally with --debug for details.`);
    if (process.argv.includes("--debug")) console.error(error);
    process.exitCode = 1;
  }
}

export function preservationBucketName(projectId) {
  return `${projectId}-takedown-preservation`;
}

export function parseTakedownArgs(argv) {
  const args = parseCommonArgs(argv, {
    booleanFlags: ["--debug"],
    valueFlags: ["--case-id", "--mode", "--bucket", "--storage-bucket", "--site-origin", "--created-by"],
    allowPositionals: false,
    customFieldCase: "camel",
  });
  if (args.help) return args;
  if (!args.env && !args.project && !args.emulatorHost) {
    throw new TakedownError("Name the target with --env <dev|prod>, --project <id> or --emulator. " +
      "This tool never falls back to an ambient project.");
  }
  if (!MODES.includes(args.mode)) throw new TakedownError(`--mode must be one of ${MODES.join(", ")}.`);
  if (!isSuppressionCaseId(args.caseId)) throw new TakedownError("--case-id must look like TD-0001.");
  if (args.apply) throw new TakedownError("Choose a write with --mode, not --apply.");
  return args;
}

/** Real dependencies; tests pass fakes for each. */
async function realDeps({projectId, args}) {
  const admin = requireFromFunctions("firebase-admin");
  const app = admin.initializeApp({projectId, storageBucket: args.storageBucket ?? `${projectId}.firebasestorage.app`},
    `organizer-takedown-${Date.now()}`);
  return {
    db: app.firestore(),
    appBucket: app.storage().bucket(),
    store: app.storage().bucket(args.bucket ?? preservationBucketName(projectId)),
    fieldValues: {delete: () => admin.firestore.FieldValue.delete()},
    readSecret: async () => {
      if (process.env[SECRET_NAME]) return process.env[SECRET_NAME];
      const {SecretManagerServiceClient} = requireFromFunctions("@google-cloud/secret-manager");
      const [version] = await new SecretManagerServiceClient().accessSecretVersion({
        name: `projects/${projectId}/secrets/${SECRET_NAME}/versions/latest`});
      return version.payload?.data?.toString("utf8") ?? "";
    },
    fetchImpl: globalThis.fetch,
    runBq: (bqArgs) => new Promise((resolve, reject) => execFile("bq", bqArgs, {maxBuffer: 512 * 1024 * 1024},
      (error, stdout) => (error ? reject(Object.assign(error, {stdout})) : resolve(stdout)))),
    now: () => new Date(),
    close: () => app.delete(),
  };
}

function defaultSiteOrigin(args, projectId) {
  if (args.siteOrigin) return args.siteOrigin;
  if (!isFirebaseProductionTarget({env: args.env, projectId})) return null;
  return JSON.parse(fs.readFileSync(path.join(repoRoot, "packages/brand/brand.json"), "utf8")).web.origin;
}

export async function main(argv = process.argv.slice(2), injected = null) {
  const args = parseTakedownArgs(argv);
  if (args.help) {
    printHelp();
    return;
  }
  const projectId = resolveFirebaseProjectId({env: args.env, project: args.project, defaultEnv: null});
  assertProdWriteAllowed({env: args.env, projectId, apply: WRITE_MODES.has(args.mode), allowProd: args.allowProd,
    confirmProd: args.confirmProd, action: `run takedown ${args.mode} in`});
  if (args.emulatorHost) process.env.FIRESTORE_EMULATOR_HOST = args.emulatorHost;
  const deps = injected ?? await realDeps({projectId, args});
  try {
    return await run({args, projectId, deps});
  } finally {
    await deps.close?.();
  }
}

/**
 * The case file: cases/<caseId>/case.json, or the highest-numbered correction
 * case-NN.json. The bucket's retention policy forbids overwriting, so a
 * correction is a new file.
 */
export async function readCase(store, caseId) {
  const [files] = await store.getFiles({prefix: `${caseRoot(caseId)}case`});
  const names = files.map((file) => file.name.slice(caseRoot(caseId).length))
    .filter((name) => /^case(?:-[0-9]{2})?\.json$/u.test(name));
  if (names.length === 0) throw new TakedownError("No case file in the preservation bucket for this case. Write it first (runbook).");
  const latest = names.filter((name) => name !== "case.json").sort().at(-1) ?? "case.json";
  const [bytes] = await store.file(`${caseRoot(caseId)}${latest}`).download();
  return parseCaseFile(bytes.toString("utf8"), caseId);
}

function print(lines) {
  for (const line of lines) console.log(line);
}

function printPlanSummary(summary) {
  print([
    `Organisers: ${summary.organizers}`,
    `Supply Intake requests: ${summary.supplyIntakeRequests}`,
    `External events: ${summary.externalEvents}`,
    `Documents: ${summary.documents} ${JSON.stringify(summary.byDisposition)}`,
    "By collection:",
    ...Object.entries(summary.byCollection).map(([collection, counts]) => `  ${collection}: ${JSON.stringify(counts)}`),
    `Peer recommendation rails to patch: ${summary.peerRecommendationRails}`,
    `Storage objects: ${summary.storageObjects}`,
    `Organisers matching only by name (not included; add ids to the case file if they belong): ${summary.possibleNameOnlyOrganizers}`,
    `Scan errors: ${summary.scanErrors}${summary.scanErrors ? ` (${summary.scanErrorStores.join(", ")})` : ""}`,
  ]);
}

async function run({args, projectId, deps}) {
  const {db, appBucket, store} = deps;
  const caseFile = await readCase(store, args.caseId);
  const inventory = readSchemaInventory(path.join(repoRoot, "contracts/firestore"));
  const preserved = await readLatestPreserveManifest(store, args.caseId);
  const plan = async () => buildTakedownPlan({db, bucket: appBucket, caseFile, inventory,
    extraOrganizerIds: preserved?.value.organizerIds ?? []});
  console.log(`Organiser takedown ${args.caseId}: ${args.mode} (${isFirebaseProductionTarget({env: args.env, projectId}) ? "prod" : projectId})`);

  if (args.mode === "plan" || args.mode === "preserve") {
    const current = await plan();
    printPlanSummary(summarizePlan(current));
    if (args.mode === "plan") {
      console.log("Dry run only. Nothing was copied, changed or deleted.");
      return {summary: summarizePlan(current)};
    }
    if (current.errors.length > 0) throw new TakedownError("Some stores could not be scanned; nothing was preserved.");
    const result = await preserve({plan: current, appBucket, store, now: deps.now()});
    print([`Preserved: ${result.documents} document(s), ${result.storageObjects} Storage object(s), ` +
      `${result.files} file(s) with SHA-256 manifest.`]);
    return {summary: summarizePlan(current), preserved: result};
  }

  if (args.mode === "apply") {
    const current = await plan();
    printPlanSummary(summarizePlan(current));
    if (current.errors.length > 0) throw new TakedownError("Some stores could not be scanned; nothing was deleted.");
    assertPreserved(current, preserved?.value);
    const counts = await apply({plan: current, db, appBucket, store, now: deps.now, fieldValues: deps.fieldValues});
    print([`Applied: ${counts.deleted} deleted, ${counts.redacted} audit log(s) redacted, ` +
      `${counts.peerRailsPatched} peer rail(s) patched, ${counts.storageObjectsDeleted} Storage object(s) deleted, ` +
      `${counts.retained} retained, ${counts.batches} batch(es).`,
    "Derived stores rebuild from these deletes: public pages and city plans (page triggers), publicOrganizers and " +
      "Algolia (organizer triggers), the admin inbox (nightly reconcile; matching items were deleted now)."]);
    const after = outstanding(await plan());
    print([`Re-checked after apply: ${JSON.stringify(after)}`]);
    return {counts, after};
  }

  if (args.mode === "suppress") {
    const secret = await deps.readSecret();
    const result = await suppress({db, caseFile, preserveManifest: preserved?.value, secret, now: deps.now,
      createdBy: args.createdBy ?? "workflow:organizer-takedown"});
    print([`Suppression ${result.created ? "written" : "updated"}: ${result.hashes} hash(es) ` +
      `(${result.newHashes} new) ${JSON.stringify(result.keyCounts)}.`]);
    return result;
  }

  if (args.mode === "verify") {
    const current = await plan();
    let secret = "";
    try {
      secret = await deps.readSecret();
    } catch {
      secret = "";
    }
    const applied = await readLatestApplyManifest(store, args.caseId);
    const documents = [];
    for (const file of preserved?.value.files ?? []) {
      if (file.name !== "firestore.ndjson") continue;
      const folder = preserved.name.replace(/manifest\.json$/u, "");
      const [bytes] = await store.file(`${folder}${file.name}`).download();
      for (const line of bytes.toString("utf8").split("\n").filter(Boolean)) documents.push(JSON.parse(line));
    }
    const result = await verify({plan: current, db, caseFile, preserveManifest: preserved?.value,
      applyManifest: applied?.value, secret, fetchImpl: deps.fetchImpl, siteOrigin: defaultSiteOrigin(args, projectId),
      paths: publicPaths(preserved?.value, documents)});
    print([
      `Outstanding: ${JSON.stringify(result.outstanding)}`,
      `Scan errors: ${result.scanErrors}`,
      `City plans naming a case organiser: ${result.cityPlansNaming}`,
      `Suppression: present ${result.suppression.present}, active ${result.suppression.active}, ` +
        `missing keys ${result.suppression.missingKeys ?? "not checked (key unavailable)"}`,
      `Public paths: ${result.web.checked} checked, ${result.web.gone410} gone (410), ${result.web.gone404} not found (404), ` +
        `${result.web.stillServed} still served, ${result.web.inSitemap} in sitemap` +
        (result.web.checked ? "" : " (no site origin for this environment)"),
      "Search: Algolia objects are deleted by the organizer trigger; confirm in the Algolia console (not checked here).",
      result.backups ? `Backups: restorable until ${result.backups.pointInTimeRecoveryUntil} (point-in-time recovery) and ` +
        `${result.backups.dailyBackupsUntil} (daily backups); gone from every backup after the later date.` :
        "Backups: no apply run recorded yet.",
      `Verify: ${result.passed ? "passed" : "FAILED"}`,
    ]);
    if (!result.passed) throw new TakedownError("Verification found records, pages or gaps left. See the counts above.");
    return result;
  }

  // bigquery
  const applied = await readLatestApplyManifest(store, args.caseId);
  let rows;
  try {
    rows = await cleanBigQuery({applyManifest: applied?.value, projectId, store, runBq: deps.runBq, now: deps.now,
      caseId: args.caseId});
  } catch (error) {
    if (error.rows) printBigQuery(error.rows);
    throw error;
  }
  printBigQuery(rows);
  return {rows};
}

function printBigQuery(rows) {
  print(["| Table | Ids | Before | Preserved | After |", "|---|---|---|---|---|",
    ...rows.map((row) => row.ids === 0 ? `| ${row.table} | 0 | not touched | - | not touched |` :
      `| ${row.table} | ${row.ids} | ${row.before} rows | ${row.preserved} rows | ${row.after} rows |`)]);
}

function printHelp() {
  console.log(`Usage: node tool/data/organizer_takedown.mjs (--env <name> | --project <id> | --emulator) \\
  --case-id TD-nnnn --mode <${MODES.join("|")}> [options]

Preserve-then-delete takedown of one organiser case. The case file is read from
gs://<project>-takedown-preservation/cases/<caseId>/case.json. Output is counts only.

Options:
  --allow-prod             Required for apply, suppress and bigquery in prod.
  --bucket <name>          Preservation bucket (default <project>-takedown-preservation).
  --storage-bucket <name>  App Storage bucket (default <project>.firebasestorage.app).
  --site-origin <url>      Website origin verify checks (default: the brand origin in prod).
  --created-by <label>     Suppression createdBy (default workflow:organizer-takedown).
  --debug                  Print full errors (may include paths; never in CI).
  -h, --help               Show this help.
`);
}
