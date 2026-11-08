#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {parseArgs} = require("node:util");

const usage = `Usage: node scripts/migrate-crawls-to-route-stops.cjs --project <id> [--apply [--allow-prod]]

Moves future crawl events still saved as freeFormMixer onto the routeStops
interaction model (route with stops, first hello, sweep). Past events and
the Hyderabad demo crawl are left alone, and saved plans are not changed.
A dry run, the default, prints what would change without writing. Build
first: npm --prefix functions run build.
`;

function prodProjectId() {
  try {
    return JSON.parse(fs.readFileSync(
      path.resolve(__dirname, "../../.firebaserc"), "utf8")).projects?.prod ??
      null;
  } catch {
    return null;
  }
}

async function main(argv) {
  const {values} = parseArgs({args: argv, strict: true, options: {
    "project": {type: "string"},
    "apply": {type: "boolean", default: false},
    "allow-prod": {type: "boolean", default: false},
    "help": {type: "boolean", short: "h", default: false},
  }});
  if (values.help) {
    process.stdout.write(usage);
    return;
  }
  if (typeof values.project !== "string" ||
      !/^[a-z0-9-]+$/.test(values.project)) {
    throw new Error("Provide an explicit --project id.");
  }
  if (values.apply && values.project === prodProjectId() &&
      !values["allow-prod"]) {
    throw new Error("--allow-prod is required to apply against prod.");
  }
  const {
    CRAWL_ROUTE_STOPS_PATCH,
    planCrawlRouteStopsMigration,
  } = require("../lib/eventSuccess/crawlRouteStopsMigration");
  const admin = require("firebase-admin");
  admin.initializeApp({projectId: values.project});
  const db = admin.firestore();
  const nowMillis = Date.now();
  const snap = await db.collection("events")
    .where("eventFormat.activityKind", "==", "barCrawl")
    .get();
  const candidates = await Promise.all(snap.docs.map(async (doc) => {
    const data = doc.data();
    const plan = await db.collection("eventSuccessPlans").doc(doc.id).get();
    const modules = plan.exists ? plan.data().selectedModuleIds : [];
    return {
      id: doc.id,
      organizerId: data.organizerId,
      startTimeMillis: typeof data.startTime?.toMillis === "function" ?
        data.startTime.toMillis() : null,
      activityKind: data.eventFormat?.activityKind,
      interactionModel: data.eventFormat?.interactionModel,
      planSelectsGuidedRotations: Array.isArray(modules) &&
        modules.includes("guided_rotations"),
    };
  }));
  const plan = planCrawlRouteStopsMigration(candidates, nowMillis);
  process.stdout.write(JSON.stringify({
    project: values.project,
    mode: values.apply ? "apply" : "dry-run",
    ...plan,
  }, null, 2) + "\n");
  if (!values.apply) return;
  for (const entry of plan.migrate) {
    await db.collection("events").doc(entry.eventId).update({
      ...CRAWL_ROUTE_STOPS_PATCH,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
  process.stdout.write(`Migrated ${plan.migrate.length} event(s).\n`);
}

if (require.main === module) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  });
}

module.exports = {main};
