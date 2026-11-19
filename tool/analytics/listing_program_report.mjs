#!/usr/bin/env node
// Read-only cohort report for the programmatic organiser listings program
// (listings plan B10, owner decisions of 19 Nov 2026). It reads Firestore
// with Application Default Credentials and prints counts only: never an
// organiser name, id, handle, requester or link. Cohorts are the staff-chosen
// `organizers.listingProgram.cohortId` labels; cities are public market slugs.
//
//   node tool/analytics/listing_program_report.mjs --env prod [--json] [--no-pilot]
//
// Pause thresholds (owner decision 8): any legal notice, any impersonation
// claim, 2 or more removals in 7 days during the pilot, or more than 3%
// removals over 30 days. When one triggers it prints PAUSE RECOMMENDED; it
// pauses nothing itself.
import path from "node:path";
import {createRequire} from "node:module";
import {fileURLToPath} from "node:url";
import {isMain, parseCommonArgs} from "../lib/cli_args.mjs";
import {resolveFirebaseProjectId} from "../lib/firebase_project.mjs";

const day = 24 * 60 * 60 * 1000;

export const REQUEST_TYPES = Object.freeze(["claim", "correctFact", "removeAndDoNotList", "trademark",
  "copyright", "privacy", "impersonation", "legalOrder"]);
export const CLAIM_STATUSES = Object.freeze(["pending", "approved", "rejected", "withdrawn", "superseded"]);

export const PAUSE_THRESHOLDS = Object.freeze({
  /** Request types that are a legal notice: an order, or a rights holder's trademark or copyright notice. */
  legalNoticeTypes: Object.freeze(["legalOrder", "trademark", "copyright"]),
  impersonationTypes: Object.freeze(["impersonation"]),
  /** A removal is a remove-and-don't-list request, counted once per organiser. */
  removalTypes: Object.freeze(["removeAndDoNotList"]),
  pilotRemovalsIn7Days: 2,
  removalShareOver30Days: 0.03,
});

// Firestore `in` filters take at most 30 values.
const IN_CHUNK = 30;
// Past this many cohort organisers the report stops rather than undercount.
export const ORGANIZER_READ_BOUND = 5000;
const ALL_COHORTS = "all cohorts";

/** Milliseconds from a Firestore Timestamp, Date, ISO string or number; null otherwise. */
export function millis(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  if (value instanceof Date) return value.getTime();
  if (typeof value.toMillis === "function") return value.toMillis();
  return null;
}

const zeroes = (keys) => Object.fromEntries(keys.map((key) => [key, 0]));

function chunks(values, size = IN_CHUNK) {
  const out = [];
  for (let index = 0; index < values.length; index += size) out.push(values.slice(index, index + size));
  return out;
}

/**
 * Reads only the fields the counts need, through field masks, so no name or
 * contact detail is ever fetched.
 */
export async function readListingProgramSources(db) {
  const organizerSnap = await db.collection("organizers")
    .where("listingProgram.cohortId", ">", "")
    .select("listingProgram", "publicPage.publishStatus", "publicPage.citySlug")
    .limit(ORGANIZER_READ_BOUND + 1)
    .get();
  if (organizerSnap.size > ORGANIZER_READ_BOUND) {
    throw new Error(`More than ${ORGANIZER_READ_BOUND} cohort organisers; the report would undercount.`);
  }
  const organizers = organizerSnap.docs.map((doc) => {
    const data = doc.data();
    return {id: doc.id, cohortId: data.listingProgram?.cohortId ?? null,
      publishStatus: data.publicPage?.publishStatus ?? null, citySlug: data.publicPage?.citySlug ?? null};
  }).filter((organizer) => typeof organizer.cohortId === "string" && organizer.cohortId);
  const ids = organizers.map((organizer) => organizer.id);
  const byOrganizer = async (collection, field, fields) => {
    const rows = [];
    for (const chunk of chunks(ids)) {
      const snap = await db.collection(collection).where(field, "in", chunk).select(...fields).get();
      rows.push(...snap.docs.map((doc) => doc.data()));
    }
    return rows;
  };
  const takedownRequests = (await byOrganizer("takedownRequests", "target.id",
    ["requestType", "status", "target", "createdAt"]))
    .filter((row) => row.target?.kind === "organizer")
    .map((row) => ({organizerId: row.target.id, requestType: row.requestType, status: row.status,
      createdAt: millis(row.createdAt)}));
  const claimRequests = (await byOrganizer("organizerClaimRequests", "organizerId", ["organizerId", "status"]))
    .map((row) => ({organizerId: row.organizerId, status: row.status}));
  const fieldCorrections = (await byOrganizer("organizerIntakeFieldCorrections", "organizerId", ["organizerId"]))
    .map((row) => ({organizerId: row.organizerId}));
  const suppressionSnap = await db.collection("listingSuppressions")
    .select("active", "blockedIntakeCount", "lastBlockedAtMillis").get();
  const listingSuppressions = suppressionSnap.docs.map((doc) => {
    const data = doc.data();
    return {active: data.active === true, blockedIntakeCount: Number(data.blockedIntakeCount ?? 0) || 0,
      lastBlockedAt: millis(data.lastBlockedAtMillis)};
  });
  const citySnap = await db.collection("cityPlans").select("citySlug", "formatPages").get();
  const cityPlans = citySnap.docs.map((doc) => {
    const data = doc.data();
    return {citySlug: data.citySlug ?? doc.id,
      indexedFormatPages: Object.values(data.formatPages ?? {})
        .filter((page) => page?.indexing === "index, follow").length};
  });
  return {organizers, takedownRequests, claimRequests, fieldCorrections, listingSuppressions, cityPlans};
}

function cohortCounts(organizers, sources, cityIndexed, now) {
  const ids = new Set(organizers.map((organizer) => organizer.id));
  const mine = (rows) => rows.filter((row) => ids.has(row.organizerId));
  const requests = mine(sources.takedownRequests);
  const requestsByType = zeroes(REQUEST_TYPES);
  for (const request of requests) {
    if (Object.hasOwn(requestsByType, request.requestType)) requestsByType[request.requestType] += 1;
  }
  const claimsByStatus = zeroes(CLAIM_STATUSES);
  for (const claim of mine(sources.claimRequests)) {
    if (Object.hasOwn(claimsByStatus, claim.status)) claimsByStatus[claim.status] += 1;
  }
  // Each organiser counts once per window, from its first removal request in it.
  const removedWithin = (windowMs) => new Set(requests
    .filter((request) => PAUSE_THRESHOLDS.removalTypes.includes(request.requestType) &&
      request.createdAt !== null && request.createdAt <= now && now - request.createdAt <= windowMs)
    .map((request) => request.organizerId)).size;
  const cities = [...new Set(organizers.map((organizer) => organizer.citySlug).filter(Boolean))].sort();
  return {
    organizers: organizers.length,
    live: organizers.filter((organizer) => organizer.publishStatus === "published").length,
    suspended: organizers.filter((organizer) => organizer.publishStatus === "suppressed").length,
    removed: organizers.filter((organizer) => organizer.publishStatus === "removed").length,
    claimsByStatus,
    takedownRequestsByType: requestsByType,
    corrections: {requested: requestsByType.correctFact, staff: mine(sources.fieldCorrections).length},
    legalNotices: PAUSE_THRESHOLDS.legalNoticeTypes.reduce((sum, type) => sum + requestsByType[type], 0),
    impersonationClaims: PAUSE_THRESHOLDS.impersonationTypes.reduce((sum, type) => sum + requestsByType[type], 0),
    removals7d: removedWithin(7 * day),
    removals30d: removedWithin(30 * day),
    cities: cities.length,
    indexedFormatPagesInCities: cities.reduce((sum, city) => sum + (cityIndexed.get(city) ?? 0), 0),
  };
}

/** The pause triggers one cohort's counts set off (owner decision 8). Pure. */
export function evaluatePause(counts, {pilot = true} = {}) {
  const triggers = [];
  if (counts.legalNotices > 0) triggers.push({code: "legal_notice", detail: `${counts.legalNotices} legal notice(s)`});
  if (counts.impersonationClaims > 0) {
    triggers.push({code: "impersonation", detail: `${counts.impersonationClaims} impersonation claim(s)`});
  }
  if (pilot && counts.removals7d >= PAUSE_THRESHOLDS.pilotRemovalsIn7Days) {
    triggers.push({code: "pilot_removals_7d", detail: `${counts.removals7d} removals in 7 days (pilot limit ` +
      `${PAUSE_THRESHOLDS.pilotRemovalsIn7Days})`});
  }
  const share = counts.organizers > 0 ? counts.removals30d / counts.organizers : 0;
  if (share > PAUSE_THRESHOLDS.removalShareOver30Days) {
    triggers.push({code: "removal_share_30d", detail: `${(share * 100).toFixed(1)}% removals over 30 days ` +
      `(${counts.removals30d} of ${counts.organizers}; limit ${PAUSE_THRESHOLDS.removalShareOver30Days * 100}%)`});
  }
  return {pause: triggers.length > 0, triggers};
}

/** Counts per cohort, all cohorts together, and the program-wide signals. Pure. */
export function buildListingProgramReport(sources, {now, pilot = true, projectId = null} = {}) {
  const cityIndexed = new Map(sources.cityPlans.map((city) => [city.citySlug, city.indexedFormatPages]));
  const byCohort = new Map();
  for (const organizer of sources.organizers) {
    if (!byCohort.has(organizer.cohortId)) byCohort.set(organizer.cohortId, []);
    byCohort.get(organizer.cohortId).push(organizer);
  }
  const row = (cohortId, organizers) => {
    const counts = cohortCounts(organizers, sources, cityIndexed, now);
    return {cohortId, ...counts, pause: evaluatePause(counts, {pilot})};
  };
  const cohorts = [...byCohort.keys()].sort().map((cohortId) => row(cohortId, byCohort.get(cohortId)));
  const total = row(ALL_COHORTS, sources.organizers);
  const active = sources.listingSuppressions.filter((entry) => entry.active);
  return {
    generatedAt: new Date(now).toISOString(),
    projectId,
    pilot,
    cohorts,
    total,
    relisting: {
      activeSuppressions: active.length,
      blockedAttempts: active.reduce((sum, entry) => sum + entry.blockedIntakeCount, 0),
      suppressionsBlockedIn30d: active.filter((entry) =>
        entry.lastBlockedAt !== null && now - entry.lastBlockedAt <= 30 * day).length,
    },
    indexedFormatPages: {
      total: sources.cityPlans.reduce((sum, city) => sum + city.indexedFormatPages, 0),
      byCity: Object.fromEntries([...sources.cityPlans].sort((a, b) => a.citySlug.localeCompare(b.citySlug))
        .map((city) => [city.citySlug, city.indexedFormatPages])),
    },
    pauseRecommended: total.pause.pause || cohorts.some((cohort) => cohort.pause.pause),
  };
}

const counted = (record) => Object.entries(record).map(([key, value]) => `${key} ${value}`).join(", ");

/** The report as plain text: counts, cohort labels and city slugs only. */
export function renderListingProgramReport(report) {
  const lines = [`Listing program report · ${report.generatedAt}${report.projectId ? ` · ${report.projectId}` : ""}`,
    `Pilot thresholds ${report.pilot ? "on" : "off"}.`, ""];
  if (report.pauseRecommended) {
    lines.push("PAUSE RECOMMENDED");
    for (const cohort of [...report.cohorts, report.total]) {
      for (const trigger of cohort.pause.triggers) lines.push(`  ${cohort.cohortId}: ${trigger.detail}`);
    }
    lines.push("");
  }
  if (report.cohorts.length === 0) lines.push("No organiser carries a listing program cohort yet.", "");
  for (const cohort of [...report.cohorts, report.total]) {
    lines.push(`${cohort.cohortId}`,
      `  organisers ${cohort.organizers} · live ${cohort.live} · suspended ${cohort.suspended} · removed ${cohort.removed}`,
      `  claims: ${counted(cohort.claimsByStatus)}`,
      `  takedown requests: ${counted(cohort.takedownRequestsByType)}`,
      `  corrections: requested ${cohort.corrections.requested}, staff ${cohort.corrections.staff}`,
      `  removals: 7 days ${cohort.removals7d}, 30 days ${cohort.removals30d}`,
      `  indexed format pages in its ${cohort.cities} cities: ${cohort.indexedFormatPagesInCities}`,
      `  pause: ${cohort.pause.pause ? "RECOMMENDED" : "no trigger"}`, "");
  }
  lines.push(`Re-listing attempts: ${report.relisting.blockedAttempts} blocked across ` +
    `${report.relisting.activeSuppressions} active do-not-list cases ` +
    `(${report.relisting.suppressionsBlockedIn30d} blocked one in the last 30 days)`,
  `Indexed format pages: ${report.indexedFormatPages.total} (${counted(report.indexedFormatPages.byCity) || "none"})`);
  return `${lines.join("\n")}\n`;
}

function printHelp() {
  process.stdout.write(`Usage: node tool/analytics/listing_program_report.mjs (--env <dev|prod> | --project <id>) [--json] [--no-pilot]

Read-only. Prints counts per listing program cohort and PAUSE RECOMMENDED when
an owner pause threshold triggers. Uses Application Default Credentials
(gcloud auth application-default login).
`);
}

export async function main(argv, {firestore, now = Date.now(), stdout = process.stdout} = {}) {
  const args = parseCommonArgs(argv, {booleanFlags: ["--no-pilot"], allowPositionals: false, customFieldCase: "camel"});
  if (args.help) {
    printHelp();
    return null;
  }
  let db = firestore;
  let app = null;
  let projectId = null;
  if (!db) {
    if (!args.env && !args.project) throw new Error("Name the project: --env <dev|prod> or --project <id>.");
    projectId = resolveFirebaseProjectId({env: args.env, project: args.project, defaultEnv: null});
    const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
    const admin = createRequire(path.join(repoRoot, "functions/package.json"))("firebase-admin");
    app = admin.initializeApp({projectId}, `listing-program-report-${now}`);
    db = app.firestore();
  }
  try {
    const report = buildListingProgramReport(await readListingProgramSources(db),
      {now, pilot: args.noPilot !== true, projectId});
    stdout.write(args.json ? `${JSON.stringify(report, null, 2)}\n` : renderListingProgramReport(report));
    return report;
  } finally {
    if (app) await app.delete();
  }
}

if (isMain(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
