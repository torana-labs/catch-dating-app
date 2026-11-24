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
 * One-off move of booking cohorts out of the documents organisers read
 * (issue #2493).
 *
 * A booking cohort (menInterestedInWomen, queerOrOpen, ...) encodes the
 * guest's gender and who they are interested in: their sexual orientation.
 * Organisers read eventBookings, its legacy mirror eventParticipations and
 * eventWaitlistOffers. Since #2493 no write stores a cohort there; the seat
 * counters read it from the server-only eventBookingPrivateFacts instead.
 *
 * This tool finishes the job for documents written before then:
 * 1. eventBookings.cohortAtSignup is copied to
 *    eventBookingPrivateFacts/{bookingId}.cohortAtSignup (unless a newer
 *    write already recorded one there) and removed from the booking.
 * 2. eventWaitlistOffers.cohortAtOffer is copied to the guest's
 *    eventBookingPrivateFacts document as cohortAtOffer (same rule) and
 *    removed from the offer.
 * 3. eventParticipations.cohortAtSignup is removed. The mirror trigger also
 *    rewrites it from the booking when step 1 updates the booking.
 *
 * Every removal is preconditioned on the document's last update time, so a
 * booking changed while the tool runs is left for a rerun. Dry run by default.
 */

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const requireFromFunctions = createRequire(
  path.join(toolDir, "../../functions/package.json")
);

const PAGE_SIZE = 500;
const WRITE_BATCH = 400;
const PRIVATE_FACTS = "eventBookingPrivateFacts";

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
    action: "move booking cohorts in",
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
    console.log("\nDry run only. Nothing was written. Re-run with --apply to move the cohorts.");
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

/** Reads every document that still carries a cohort, and what to do with it. */
export async function buildPlan(db) {
  const records = [];
  const invalid = [];
  for await (const doc of pagedDocs(db.collection("eventBookings"))) {
    const data = doc.data();
    if (!Object.hasOwn(data, "cohortAtSignup")) continue;
    records.push(await planRecord(db, doc, data, {
      kind: "booking", field: "cohortAtSignup", target: "cohortAtSignup",
      identity: bookingIdentity(doc.id, data), invalid}));
  }
  for await (const doc of pagedDocs(db.collection("eventWaitlistOffers"))) {
    const data = doc.data();
    if (!Object.hasOwn(data, "cohortAtOffer")) continue;
    records.push(await planRecord(db, doc, data, {
      kind: "offer", field: "cohortAtOffer", target: "cohortAtOffer",
      identity: bookingIdentity(null, data), invalid}));
  }
  for await (const doc of pagedDocs(db.collection("eventParticipations"))) {
    const data = doc.data();
    if (!Object.hasOwn(data, "cohortAtSignup")) continue;
    records.push({kind: "legacyMirror", path: doc.ref.path, field: "cohortAtSignup",
      updateTime: doc.updateTime ?? null, copy: null});
  }
  const summary = {
    bookings: records.filter((record) => record.kind === "booking").length,
    offers: records.filter((record) => record.kind === "offer").length,
    legacyMirrors: records.filter((record) => record.kind === "legacyMirror").length,
    copies: records.filter((record) => record.copy).length,
    keptNewerPrivateCopy: records.filter((record) => record.keptNewer).length,
    invalid: invalid.length,
  };
  return {records, invalid, summary};
}

async function planRecord(db, doc, data, {kind, field, target, identity, invalid}) {
  const value = data[field];
  const record = {kind, path: doc.ref.path, field, updateTime: doc.updateTime ?? null,
    copy: null, keptNewer: false};
  if (typeof value !== "string" || value === "") return record;
  if (!identity) {
    invalid.push({path: doc.ref.path, reason: "no event and guest identity"});
    return record;
  }
  const factsPath = `${PRIVATE_FACTS}/${identity.eventId}_${identity.uid}`;
  const existing = (await db.doc(factsPath).get()).data();
  if (existing && typeof existing[target] === "string" && existing[target]) {
    record.keptNewer = true;
    return record;
  }
  record.copy = {path: factsPath, data: {eventId: identity.eventId,
    uid: identity.uid, [target]: value}};
  return record;
}

function bookingIdentity(id, data) {
  const eventId = typeof data.eventId === "string" ? data.eventId : null;
  const uid = typeof data.uid === "string" ? data.uid : null;
  if (!eventId || !uid) return null;
  if (id !== null && id !== `${eventId}_${uid}`) return null;
  return {eventId, uid};
}

/** Copies each cohort privately, then removes it from the readable document. */
export async function applyPlan(db, plan, fieldValues) {
  let batches = 0;
  let writes = 0;
  // A record's copy and removal share a batch, so a removal never lands
  // without its copy.
  for (let i = 0; i < plan.records.length; i += WRITE_BATCH / 2) {
    const batch = db.batch();
    let size = 0;
    for (const record of plan.records.slice(i, i + WRITE_BATCH / 2)) {
      if (record.copy) {
        batch.set(db.doc(record.copy.path), {...record.copy.data,
          updatedAt: fieldValues.serverTimestamp()}, {merge: true});
        size += 1;
      }
      batch.update(db.doc(record.path), {[record.field]: fieldValues.delete()},
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
    console.log(JSON.stringify({projectId, summary: plan.summary, invalid: plan.invalid}, null, 2));
    return;
  }
  console.log(`Booking cohorts in ${projectId}:`);
  for (const [key, value] of Object.entries(plan.summary)) console.log(`  ${key}: ${value}`);
  for (const item of plan.invalid) console.log(`  invalid ${item.path}: ${item.reason}`);
}

function printHelp() {
  console.log(`Usage: node tool/data/move_booking_cohorts.mjs (--env <name> | --project <id> | --emulator) [options]

Moves booking cohorts (a guest's orientation) out of eventBookings,
eventParticipations and eventWaitlistOffers into the server-only
eventBookingPrivateFacts (issue #2493). Dry run by default.

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
