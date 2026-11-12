#!/usr/bin/env node
import {createHash} from "node:crypto";
import path from "node:path";
import {createRequire} from "node:module";
import {fileURLToPath} from "node:url";
import {parseCommonArgs} from "../lib/cli_args.mjs";
import {isFirebaseProductionTarget, resolveFirebaseProjectId} from "../lib/firebase_project.mjs";
import {readMarketCatalog, slugifyLocationKey} from "../lib/market_catalog.mjs";

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(toolDir, "../..");
const requireFromFunctions = createRequire(path.join(repoRoot, "functions/package.json"));

// Mirrors functions/src/cityInterest/cityInterest.ts; both tests pin the same marker id.
export const cityInterestKey = (cityId, countryIsoCode) =>
  cityId ?? `other-${(countryIsoCode ?? "xx").toLowerCase()}`;
export const cityInterestMarkerId = (personKey, key) =>
  createHash("sha256").update(`${personKey}|${key}`).digest("hex");
const utcDay = (date) => date.toISOString().slice(0, 10);

/**
 * Every spelling that names a catalog city, slugified, mapped to the
 * cities it could mean. A spelling two cities share is ambiguous.
 */
export function cityNameIndex(catalog) {
  const index = new Map();
  for (const city of catalog.cities) {
    const names = [city.marketId, city.cityId, city.slug, city.label, city.cityLabel,
      ...(city.aliases ?? []), ...(city.legacyIds ?? [])];
    for (const name of new Set(names.map(slugifyLocationKey).filter(Boolean))) {
      index.set(name, [...new Set([...(index.get(name) ?? []), city])]);
    }
  }
  return index;
}

/** The one catalog city a free-text city names, or null when none or several do. */
export function matchCity(text, index) {
  const matches = index.get(slugifyLocationKey(text ?? "")) ?? [];
  return matches.length === 1 ? matches[0] : null;
}

const memberRoles = new Set(["member", "runner"]);

/**
 * Plans the backfill from launchWaitlist rows: which rows gain a cityId,
 * which person-and-city pairs are counted (skipping markers that exist),
 * and the free-text cities nothing matched.
 */
export function buildCityInterestBackfillPlan({rows, existingMarkerIds, catalog, now = new Date()}) {
  const index = cityNameIndex(catalog);
  const updates = [];
  const counted = new Map();
  const unmatched = new Map();
  const seen = new Set(existingMarkerIds);
  for (const {id, data} of rows) {
    if (!memberRoles.has(String(data.role ?? "").toLowerCase())) continue;
    let cityId = typeof data.cityId === "string" ? data.cityId : null;
    let country = typeof data.countryIsoCode === "string" ? data.countryIsoCode : null;
    if (data.cityId === undefined) {
      const city = matchCity(data.city, index);
      if (!city) {
        const text = String(data.city ?? "").trim() || "(blank)";
        unmatched.set(text, (unmatched.get(text) ?? 0) + 1);
        continue;
      }
      cityId = city.marketId;
      country = city.countryIsoCode;
      updates.push({id, cityId, countryIsoCode: country});
    }
    const personKey = data.phone || data.email;
    if (!personKey) continue;
    const key = cityInterestKey(cityId, country);
    const markerId = cityInterestMarkerId(String(personKey).toLowerCase(), key);
    if (seen.has(markerId)) continue;
    seen.add(markerId);
    const created = typeof data.createdAt?.toDate === "function" ? data.createdAt.toDate() : now;
    const entry = counted.get(key) ?? {cityKey: key, cityId, countryIsoCode: country, markers: []};
    entry.markers.push({markerId, day: utcDay(created), createdAt: created});
    counted.set(key, entry);
  }
  return {
    updates,
    counters: [...counted.values()],
    unmatched: [...unmatched.entries()].map(([city, rows]) => ({city, rows}))
      .sort((left, right) => right.rows - left.rows || left.city.localeCompare(right.city)),
    summary: {
      rowsRead: rows.length,
      rowsGainingCityId: updates.length,
      peopleCounted: [...counted.values()].reduce((sum, entry) => sum + entry.markers.length, 0),
      unmatchedRows: [...unmatched.values()].reduce((sum, value) => sum + value, 0),
    },
  };
}

/** Writes the plan. Each marker is created in a transaction, so a rerun never counts twice. */
export async function applyCityInterestBackfillPlan(db, plan, admin) {
  const {FieldValue, Timestamp} = admin.firestore;
  for (const update of plan.updates) {
    await db.collection("launchWaitlist").doc(update.id).update({
      cityId: update.cityId, countryIsoCode: update.countryIsoCode,
      cityBackfilledAt: FieldValue.serverTimestamp(),
    });
  }
  for (const entry of plan.counters) {
    for (const marker of entry.markers) {
      const markerRef = db.collection("cityInterestMarkers").doc(marker.markerId);
      await db.runTransaction(async (transaction) => {
        if ((await transaction.get(markerRef)).exists) return;
        const createdAt = Timestamp.fromDate(marker.createdAt);
        transaction.create(markerRef, {schemaVersion: 1, cityKey: entry.cityKey, createdAt});
        transaction.set(db.collection("cityInterest").doc(entry.cityKey), {
          schemaVersion: 1, cityKey: entry.cityKey, cityId: entry.cityId,
          countryIsoCode: entry.countryIsoCode, total: FieldValue.increment(1),
          daily: {[marker.day]: FieldValue.increment(1)}, updatedAt: Timestamp.now(),
        }, {merge: true});
      });
    }
  }
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseCommonArgs(argv, {booleanFlags: [], allowPositionals: false, customFieldCase: "camel"});
  if (args.help) {
    printHelp();
    return;
  }
  const projectId = resolveFirebaseProjectId({env: args.env, project: args.project, defaultEnv: null});
  if (args.apply && isFirebaseProductionTarget({env: args.env, projectId}) && !args.allowProd) {
    throw new Error("Refusing to backfill prod without --allow-prod. Run a dry run first, then rerun with --apply --allow-prod.");
  }
  if (args.emulatorHost) process.env.FIRESTORE_EMULATOR_HOST = args.emulatorHost;
  const admin = requireFromFunctions("firebase-admin");
  admin.initializeApp({projectId});
  const db = admin.firestore();
  const [rows, markers] = await Promise.all([
    db.collection("launchWaitlist").get(),
    db.collection("cityInterestMarkers").select().get(),
  ]);
  const plan = buildCityInterestBackfillPlan({
    rows: rows.docs.map((doc) => ({id: doc.id, data: doc.data()})),
    existingMarkerIds: markers.docs.map((doc) => doc.id),
    catalog: readMarketCatalog(repoRoot),
  });
  // Contacts never print: only cities and counts.
  const report = {summary: plan.summary,
    counters: plan.counters.map((entry) => ({cityKey: entry.cityKey, people: entry.markers.length})),
    unmatched: plan.unmatched};
  if (args.json) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(`Read ${report.summary.rowsRead} launchWaitlist rows; ${report.summary.rowsGainingCityId} gain a cityId; ` +
      `${report.summary.peopleCounted} person-city pairs to count.`);
    for (const row of report.counters) console.log(`  ${row.cityKey}: ${row.people}`);
    if (plan.unmatched.length) {
      console.log(`Not matched to one catalog city (${report.summary.unmatchedRows} rows):`);
      for (const row of plan.unmatched) console.log(`  ${row.city}: ${row.rows}`);
    }
  }
  if (!args.apply) {
    console.log("\nDry run only. Re-run with --apply to write.");
    return;
  }
  await applyCityInterestBackfillPlan(db, plan, admin);
  console.log("Backfill written.");
}

function printHelp() {
  console.log(`Usage: node tool/data/backfill_city_interest.mjs [options]

Gives existing website launch-notice rows (launchWaitlist, member role) the
catalog cityId their free-text city names, when exactly one catalog city
matches by id, label or alias, and counts each person once per city in
cityInterest. Rows that match no city, or several, are reported and left as
they are. Dry-run by default; only cities and counts are printed.

Options:
  --apply                  Write. Default is dry-run.
  --allow-prod             Required with --apply against prod.
  --json                   Print the report as JSON.
  --env <dev|staging|prod> Resolve project id from .firebaserc.
  --project <id>           Firebase project id.
  --emulator-host <host>   Use the Firestore emulator.
`);
}

function isMain() {
  return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isMain()) await main();
