#!/usr/bin/env node
import {createHash} from "node:crypto";
import {createRequire} from "node:module";
import {readFileSync} from "node:fs";
import {parseCommonArgs, isMain} from "../lib/cli_args.mjs";
import {validateEventDocument} from "../contracts/generated/schema_contract_validators.mjs";

const requireFunctions = createRequire(new URL("../../functions/package.json", import.meta.url));
const owns = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const pageSize = 100;
const historicalNullLocationTypes = new Map([
  ["/startingPointLat", ["#/properties/startingPointLat/type", "number"]],
  ["/startingPointLng", ["#/properties/startingPointLng/type", "number"]],
  ["/discoveryGeoCell", ["#/properties/discoveryGeoCell/type", "string"]],
]);

function isHistoricalLocationDrift(data, errors) {
  if (owns(data, "meetingLocation")) return false;
  const missingMeeting = (error) => error.instancePath === "" &&
    error.schemaPath === "#/allOf/0/else/required" &&
    error.keyword === "required" && error.params?.missingProperty === "meetingLocation";
  const matchingBranch = (error) => error.instancePath === "" &&
    error.schemaPath === "#/allOf/0/if" && error.keyword === "if" &&
    error.params?.failingKeyword === "else";
  const historicalNull = (error) => {
    const expected = historicalNullLocationTypes.get(error.instancePath);
    return expected != null && error.keyword === "type" &&
      error.schemaPath === expected[0] && error.params?.type === expected[1] &&
      data[error.instancePath.slice(1)] === null;
  };
  return errors.some(missingMeeting) && errors.some(matchingBranch) &&
    errors.every((error) => missingMeeting(error) || matchingBranch(error) ||
      historicalNull(error));
}

// This annotates already-public legacy records. It never enables registration,
// changes provenance, initializes counters, or publishes a progressive draft.
export function classifyEventPublication(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return {action: "blocked", reason: "invalid_document"};
  }
  if (owns(data, "publicationState")) {
    return data.publicationState === "published" || data.publicationState === "private" ?
      {action: "skip", reason: data.publicationState} :
      {action: "blocked", reason: "invalid_publication_state"};
  }
  if (owns(data, "setupRevision") || owns(data, "setupDefaults") ||
      owns(data, "eventLocalDate") || owns(data, "publicRegistrationEnabled")) {
    return {action: "blocked", reason: "unlabelled_progressive_event"};
  }
  if (owns(data, "organizerId") && data.organizerId !== data.organizerId) {
    return {action: "blocked", reason: "organizer_mismatch"};
  }
  if (!validateEventDocument(data)) {
    const errors = validateEventDocument.errors ?? [];
    // Include paths and validation keywords, never source field values or PII.
    const validationIssues = [...new Set(errors
      .map((error) => {
        const missing = error.keyword === "required" ? error.params?.missingProperty : null;
        const path = typeof missing === "string" ?
          `${error.instancePath}/${missing.replaceAll("~", "~0").replaceAll("/", "~1")}` :
          error.instancePath || "/";
        return `${path}:${error.keyword}`;
      }))].sort();
    if (isHistoricalLocationDrift(data, errors)) {
      return {action: "publish", reason: "legacy_public_event_location_drift",
        validationIssues};
    }
    return {action: "blocked", reason: "invalid_legacy_event", validationIssues};
  }
  return {action: "publish", reason: "legacy_public_event"};
}

function versionOf(snapshot) {
  const timestamp = snapshot.updateTime;
  if (!timestamp || !Number.isSafeInteger(timestamp.seconds) ||
      !Number.isInteger(timestamp.nanoseconds)) {
    throw new Error(`Missing source update time for ${snapshot.id}`);
  }
  return `${timestamp.seconds}:${timestamp.nanoseconds}`;
}

export async function planEventPublication(db, {projectId, maxEvents = 5000}) {
  if (typeof projectId !== "string" || !projectId.trim()) {
    throw new Error("An explicit projectId is required.");
  }
  if (!Number.isInteger(maxEvents) || maxEvents < 1 || maxEvents > 50000) {
    throw new Error("maxEvents must be between 1 and 50000.");
  }
  const records = [];
  let after;
  for (;;) {
    let query = db.collection("events").orderBy("__name__")
      .limit(Math.min(pageSize, maxEvents - records.length + 1));
    if (after) query = query.startAfter(after);
    const page = await query.get();
    if (!page.docs.length) break;
    for (const doc of page.docs) {
      if (records.length === maxEvents) {
        throw new Error("Event scan bound exceeded; no complete plan or writes produced.");
      }
      records.push({eventId: doc.id, sourceVersion: versionOf(doc),
        ...classifyEventPublication(doc.data())});
    }
    after = page.docs.at(-1);
  }
  const body = {version: 1, projectId, records};
  const digest = createHash("sha256").update(JSON.stringify(body)).digest("hex");
  return {...body, digest, scanned: records.length,
    publish: records.filter((row) => row.action === "publish").length,
    blocked: records.filter((row) => row.action === "blocked").length};
}

export async function applyEventPublication(db, plan, {projectId, expectedDigest}) {
  const digest = createHash("sha256").update(JSON.stringify({version: plan.version,
    projectId: plan.projectId, records: plan.records})).digest("hex");
  if (projectId !== plan.projectId || !/^[a-f0-9]{64}$/.test(expectedDigest ?? "") ||
      expectedDigest !== digest || digest !== plan.digest) {
    throw new Error("Reviewed project/plan digest does not match; run and review a fresh dry run.");
  }
  if (plan.records.some((row) => row.action === "blocked")) {
    throw new Error("Blocked documents must be resolved before applying this plan.");
  }
  let applied = 0;
  // Independent, bounded transactions: an interruption may leave some rows
  // migrated. Rerun/review a new dry run; never reuse a stale digest or rollback.
  for (const row of plan.records.filter((item) => item.action === "publish")) {
    if (!row.eventId || row.eventId.includes("/")) throw new Error("Invalid event ID.");
    await db.runTransaction(async (transaction) => {
      const ref = db.collection("events").doc(row.eventId);
      const current = await transaction.get(ref);
      if (!current.exists || versionOf(current) !== row.sourceVersion ||
          classifyEventPublication(current.data()).action !== "publish") {
        throw new Error(`events/${row.eventId} changed; stop and review a fresh plan.`);
      }
      transaction.update(ref, {publicationState: "published"});
    });
    applied++;
  }
  return {applied};
}

export function parsePublicationArgs(argv) {
  const args = parseCommonArgs(argv, {allowPositionals: false,
    valueFlags: ["--max-events", "--expected-plan"], customFieldCase: "camel"});
  if (args.help) return args;
  if (!args.project || args.env) throw new Error("Use an explicit --project, without --env.");
  const maxEvents = args.maxEvents === undefined ? 5000 : Number(args.maxEvents);
  if (!Number.isInteger(maxEvents) || maxEvents < 1 || maxEvents > 50000) {
    throw new Error("--max-events must be an integer between 1 and 50000.");
  }
  if (args.apply && !/^[a-f0-9]{64}$/.test(args.expectedPlan ?? "")) {
    throw new Error("--apply requires the reviewed dry-run --expected-plan digest.");
  }
  return {...args, maxEvents};
}

export async function main(argv = process.argv.slice(2)) {
  const args = parsePublicationArgs(argv);
  if (args.help) {
    console.log("Usage: node tool/data/backfill_event_publication.mjs --project <id> " +
      "[--max-events 5000] [--emulator-host host:port] " +
      "[--apply --expected-plan <dry-run digest> --allow-prod]\n" +
      "Dry run is the default. Resolve every blocked row before apply. " +
      "After apply, repeat a complete dry run before enabling published-only public queries. " +
      "Concurrent changes stop apply; review a fresh plan to resume. No rollback is performed.");
    return;
  }
  const production = JSON.parse(readFileSync(new URL("../../.firebaserc", import.meta.url), "utf8"))
    .projects?.prod;
  if (args.apply && args.project === production && !args.allowProd) {
    throw new Error("Production apply requires --allow-prod.");
  }
  // An inherited emulator environment must not silently change the reviewed target.
  if (process.env.FIRESTORE_EMULATOR_HOST &&
      process.env.FIRESTORE_EMULATOR_HOST !== args.emulatorHost) {
    throw new Error("Inherited emulator host differs; pass --emulator-host explicitly.");
  }
  if (args.emulatorHost) process.env.FIRESTORE_EMULATOR_HOST = args.emulatorHost;
  const admin = requireFunctions("firebase-admin");
  const app = admin.initializeApp({projectId: args.project});
  try {
    const db = app.firestore();
    const projectId = args.emulatorHost ? `${args.project}@${args.emulatorHost}` : args.project;
    const plan = await planEventPublication(db, {projectId, maxEvents: args.maxEvents});
    console.log(JSON.stringify(plan, null, 2));
    if (args.apply) console.log(JSON.stringify(await applyEventPublication(db, plan,
      {projectId, expectedDigest: args.expectedPlan})));
    else if (plan.blocked) process.exitCode = 2;
  } finally {
    await app.delete();
  }
}

if (isMain(import.meta.url)) await main();
