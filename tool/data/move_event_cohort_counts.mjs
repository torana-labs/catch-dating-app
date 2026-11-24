#!/usr/bin/env node
import {pathToFileURL, fileURLToPath} from "node:url";
import path from "node:path";
import {createRequire} from "node:module";
import {parseCommonArgs} from "../lib/cli_args.mjs";
import {
  assertProdWriteAllowed,
  resolveFirebaseProjectId,
} from "../lib/firebase_project.mjs";

/**
 * One-off move of per-cohort booking totals off the event document organisers
 * read (issue #2493).
 *
 * A cohort encodes gender and who a guest is interested in, and on a small
 * event a per-cohort total can point to one person's orientation. Since
 * #2493 the counter writes keep cohortCounts, waitlistedCohortCounts and
 * crossPathsPairHeldCohortCounts in the server-only eventCohortCounts/{eventId}
 * and remove the event's copy of each map they write. This tool moves the
 * maps no write has touched yet: each one is copied to eventCohortCounts
 * unless that document already holds the map (a newer write), then removed
 * from the event. Every event update is preconditioned on its last update
 * time. Dry run by default.
 */

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const requireFromFunctions = createRequire(
  path.join(toolDir, "../../functions/package.json")
);

const PAGE_SIZE = 500;
const WRITE_BATCH = 400;
const FIELDS = ["cohortCounts", "waitlistedCohortCounts", "crossPathsPairHeldCohortCounts"];

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}

export async function main(argv = process.argv.slice(2), {admin: injected = null} = {}) {
  const args = parseCommonArgs(argv, {
    booleanFlags: [],
    valueFlags: [],
    allowPositionals: false,
    customFieldCase: "camel",
  });
  if (args.help) {
    printHelp();
    return null;
  }
  if (!args.env && !args.project && !args.emulatorHost) {
    throw new Error(
      "Name the target explicitly with --env <dev|prod>, --project <id> " +
      "or --emulator. This tool never falls back to an ambient project."
    );
  }
  const projectId = resolveFirebaseProjectId({
    env: args.env, project: args.project, defaultEnv: null,
  });
  assertProdWriteAllowed({
    env: args.env, projectId, apply: args.apply,
    allowProd: args.allowProd, confirmProd: args.confirmProd,
    action: "move event cohort counts in",
  });
  if (args.emulatorHost) process.env.FIRESTORE_EMULATOR_HOST = args.emulatorHost;

  const admin = injected ?? requireFromFunctions("firebase-admin");
  admin.initializeApp({projectId});
  const db = admin.firestore();
  const fieldValues = {
    delete: () => admin.firestore.FieldValue.delete(),
    serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  };

  const plan = await buildPlan(db);
  printPlan(plan, {json: args.json, projectId});
  if (!args.apply) {
    console.log("\nDry run only. Nothing was written. Re-run with --apply to move the totals.");
    return plan;
  }
  const result = await applyPlan(db, plan, fieldValues);
  const after = await buildPlan(db);
  if (args.json) {
    console.log(JSON.stringify({applied: result, after: after.summary}, null, 2));
  } else {
    console.log(`\nApplied: ${result.batches} batch(es), ${result.writes} write(s).`);
    console.log(`Left after apply: ${JSON.stringify(after.summary)}`);
  }
  return plan;
}

/** Reads every event that still carries a cohort map, and what to move. */
export async function buildPlan(db) {
  const records = [];
  for await (const doc of pagedDocs(db.collection("events"))) {
    const data = doc.data();
    const present = FIELDS.filter((field) => Object.hasOwn(data, field));
    if (present.length === 0) continue;
    const existing = (await db.doc(`eventCohortCounts/${doc.id}`).get()).data() ?? {};
    const copy = {};
    let keptNewer = 0;
    for (const field of present) {
      if (isMap(existing[field])) {
        keptNewer += 1;
      } else if (isMap(data[field])) {
        copy[field] = data[field];
      }
    }
    records.push({eventId: doc.id, path: doc.ref.path, remove: present,
      copy, keptNewer, updateTime: doc.updateTime ?? null});
  }
  return {records, summary: {
    events: records.length,
    mapsRemoved: records.reduce((sum, record) => sum + record.remove.length, 0),
    mapsCopied: records.reduce((sum, record) => sum + Object.keys(record.copy).length, 0),
    keptNewerPrivateCopy: records.reduce((sum, record) => sum + record.keptNewer, 0),
  }};
}

/** Copies each map privately, then removes it from the event, per batch. */
export async function applyPlan(db, plan, fieldValues) {
  let batches = 0;
  let writes = 0;
  for (let i = 0; i < plan.records.length; i += WRITE_BATCH / 2) {
    const batch = db.batch();
    let size = 0;
    for (const record of plan.records.slice(i, i + WRITE_BATCH / 2)) {
      const fields = Object.keys(record.copy);
      if (fields.length > 0) {
        batch.set(db.doc(`eventCohortCounts/${record.eventId}`), {
          eventId: record.eventId, ...record.copy,
          updatedAt: fieldValues.serverTimestamp()},
        {mergeFields: ["eventId", ...fields, "updatedAt"]});
        size += 1;
      }
      batch.update(db.doc(record.path),
        Object.fromEntries(record.remove.map((field) => [field, fieldValues.delete()])),
        ...(record.updateTime ? [{lastUpdateTime: record.updateTime}] : []));
      size += 1;
    }
    if (size === 0) continue;
    await batch.commit();
    batches += 1;
    writes += size;
  }
  return {batches, writes};
}

function isMap(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

async function* pagedDocs(collectionRef) {
  let last = null;
  for (;;) {
    let query = collectionRef.orderBy("__name__").limit(PAGE_SIZE);
    if (last) query = query.startAfter(last);
    const snap = await query.get();
    for (const doc of snap.docs) yield doc;
    if (snap.docs.length < PAGE_SIZE) return;
    last = snap.docs[snap.docs.length - 1];
  }
}

function printPlan(plan, {json, projectId}) {
  if (json) {
    console.log(JSON.stringify({projectId, summary: plan.summary}, null, 2));
    return;
  }
  console.log(`Event cohort totals in ${projectId}:`);
  for (const [key, value] of Object.entries(plan.summary)) console.log(`  ${key}: ${value}`);
}

function printHelp() {
  console.log(`Usage: node tool/data/move_event_cohort_counts.mjs (--env <name> | --project <id> | --emulator) [options]

Moves per-cohort booking totals (which can point to a guest's orientation)
off events/{eventId} into the server-only eventCohortCounts/{eventId}
(issue #2493). Dry run by default.

Options:
  --env <dev|prod>          Resolve the project id from .firebaserc.
  --project <id>            Use an explicit Firebase project id.
  --emulator                Use the Firestore emulator at 127.0.0.1:8080.
  --emulator-host <host>    Use a custom Firestore emulator host.
  --apply                   Write the moves.
  --allow-prod              Required with --apply when the target is prod.
  --json                    Machine-readable plan.
`);
}
