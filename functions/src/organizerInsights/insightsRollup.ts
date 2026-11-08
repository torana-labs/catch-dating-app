import * as admin from "firebase-admin";
import {logger} from "firebase-functions/v2";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {
  defaultHostAnalyticsBigQuerySource,
  type HostAnalyticsBigQuerySource,
  type HostAnalyticsLinkRow,
  type HostAnalyticsMartRow,
} from "../analytics/hostAnalyticsBigQuery";
import type {
  OrganizerInsightsDocument,
} from "../shared/generated/organizerInsightsDocument";
import {
  validateOrganizerInsightsDocument,
} from "../shared/generated/validators/organizerInsightsDocument";

/**
 * The nightly organizerInsights roll-up (#1109). For one UTC day it reads
 * the host analytics marts the Host app's insights already read (page
 * visits, owner link clicks by link and traffic source, booking clicks) and
 * the day's new follow edges, and writes one server-only document per
 * organiser with any activity: organizerInsights/{organizerId}_{yyyymmdd}.
 * The website owner view reads 30 of them; a missing day reads as zero.
 */

export const organizerInsightsCollection = "organizerInsights";
const organizerPageSize = 200;
const maxNewFollowEdges = 20_000;
const trafficSources = ["instagram", "whatsapp", "facebook", "google", "qr",
  "email", "direct", "other"] as const;
type TrafficSource = typeof trafficSources[number];

export interface InsightsRollupDeps {
  firestore: () => FirebaseFirestore.Firestore;
  analytics: HostAnalyticsBigQuerySource;
  now: () => Date;
}

const defaultDeps: InsightsRollupDeps = {
  firestore: () => admin.firestore(),
  analytics: defaultHostAnalyticsBigQuerySource,
  now: () => new Date(),
};

/**
 * Document id for one organiser-day.
 * @param {string} organizerId Organiser id.
 * @param {string} date UTC day as YYYY-MM-DD.
 * @return {string} The organizerInsights document id.
 */
export function organizerInsightsId(organizerId: string, date: string) {
  return `${organizerId}_${date.replace(/-/gu, "")}`;
}

/**
 * The UTC day `days` before `at`, as YYYY-MM-DD.
 * @param {Date} at Reference time.
 * @param {number} days Days back.
 * @return {string} Day key.
 */
export function utcDayKey(at: Date, days = 0): string {
  return new Date(at.getTime() - days * 86_400_000).toISOString().slice(0, 10);
}

/**
 * Folds one day's mart rows, link rows and follow counts into documents.
 * Organisers with no activity that day get no document.
 * @param {object} input The day's source rows.
 * @return {OrganizerInsightsDocument[]} One document per active organiser.
 */
export function buildOrganizerInsights(input: {
  date: string;
  martRows: readonly HostAnalyticsMartRow[];
  linkRows: readonly HostAnalyticsLinkRow[];
  newFollowers: ReadonlyMap<string, number>;
  computedAtMillis: number;
}): OrganizerInsightsDocument[] {
  const byOrganizer = new Map<string, {
    visits: number; linkClicks: number; bookingClicks: number;
    sources: Map<TrafficSource, number>; links: Map<string, number>;
  }>();
  const entry = (organizerId: string) => {
    let value = byOrganizer.get(organizerId);
    if (!value) {
      value = {visits: 0, linkClicks: 0, bookingClicks: 0,
        sources: new Map(), links: new Map()};
      byOrganizer.set(organizerId, value);
    }
    return value;
  };
  for (const row of input.martRows) {
    if (row.date !== input.date) continue;
    const value = entry(row.organizerId);
    value.visits += count(row.listingViews);
    value.bookingClicks += count(row.outboundBookingClicks ?? 0);
  }
  for (const row of input.linkRows) {
    const clicks = count(row.linkClicks);
    if (!clicks) continue;
    const value = entry(row.organizerId);
    value.linkClicks += clicks;
    value.links.set(row.linkId, (value.links.get(row.linkId) ?? 0) + clicks);
    const source = (trafficSources as readonly string[])
      .includes(row.trafficSource ?? "") ?
      row.trafficSource as TrafficSource : "other";
    value.sources.set(source, (value.sources.get(source) ?? 0) + clicks);
  }
  for (const [organizerId, followers] of input.newFollowers) {
    if (followers > 0) entry(organizerId);
  }
  const documents: OrganizerInsightsDocument[] = [];
  for (const [organizerId, value] of byOrganizer) {
    const newFollowers = count(input.newFollowers.get(organizerId) ?? 0);
    if (!value.visits && !value.linkClicks && !value.bookingClicks &&
        !newFollowers) continue;
    const document: OrganizerInsightsDocument = {
      organizerId,
      date: input.date,
      visits: value.visits,
      linkClicks: value.linkClicks,
      bookingClicks: value.bookingClicks,
      newFollowers,
      sources: [...value.sources]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([source, clicks]) => ({source, clicks})),
      links: [...value.links]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 40)
        .map(([linkId, clicks]) => ({linkId, clicks})),
      computedAtMillis: input.computedAtMillis,
    };
    if (!validateOrganizerInsightsDocument(document)) {
      logger.warn("Skipped an organizer insights day that fails its schema.",
        {organizerId, date: input.date});
      continue;
    }
    documents.push(document);
  }
  return documents;
}

/**
 * Rolls up one UTC day for every organiser with an owner and writes the
 * documents. Rewriting a day replaces it, so reruns and backfills are safe.
 * @param {string} date UTC day as YYYY-MM-DD.
 * @param {InsightsRollupDeps} deps Injectable dependencies.
 * @param {boolean} apply False reports without writing.
 * @return {Promise<object>} Counts for the log.
 */
export async function rollupOrganizerInsightsDay(
  date: string,
  deps: InsightsRollupDeps = defaultDeps,
  apply = true
): Promise<{date: string; organizers: number; written: number}> {
  const db = deps.firestore();
  const organizerIds = await ownedOrganizerIds(db);
  const range = {startDate: date, endDate: date};
  const martRows: HostAnalyticsMartRow[] = [];
  const linkRows: HostAnalyticsLinkRow[] = [];
  for (let index = 0; index < organizerIds.length;
    index += organizerPageSize) {
    const page = organizerIds.slice(index, index + organizerPageSize);
    const [rows, links] = await Promise.all([
      deps.analytics.loadRows(range, {organizerIds: page, eventId: null}),
      deps.analytics.loadLinkRows(range, page),
    ]);
    martRows.push(...rows);
    linkRows.push(...links);
  }
  const owned = new Set(organizerIds);
  const newFollowers = await newFollowersOn(db, date, owned);
  const documents = buildOrganizerInsights({
    date, martRows, linkRows, newFollowers,
    computedAtMillis: deps.now().getTime(),
  });
  if (apply) {
    for (let index = 0; index < documents.length; index += 400) {
      const batch = db.batch();
      for (const document of documents.slice(index, index + 400)) {
        batch.set(db.collection(organizerInsightsCollection).doc(
          organizerInsightsId(document.organizerId, date)), document);
      }
      await batch.commit();
    }
  }
  return {date, organizers: organizerIds.length, written: documents.length};
}

/**
 * Rolls up the last `days` complete UTC days, oldest first (the backfill).
 * @param {number} days How many days back, 1 to 30.
 * @param {InsightsRollupDeps} deps Injectable dependencies.
 * @param {boolean} apply False reports without writing.
 * @return {Promise<object[]>} One count per day.
 */
export async function backfillOrganizerInsights(
  days: number,
  deps: InsightsRollupDeps = defaultDeps,
  apply = false
) {
  if (!Number.isInteger(days) || days < 1 || days > 30) {
    throw new Error("Backfill 1 to 30 days.");
  }
  const now = deps.now();
  const results = [];
  for (let back = days; back >= 1; back--) {
    results.push(await rollupOrganizerInsightsDay(utcDayKey(now, back), deps,
      apply));
  }
  return results;
}

async function ownedOrganizerIds(
  db: FirebaseFirestore.Firestore
): Promise<string[]> {
  const ids: string[] = [];
  let cursor: FirebaseFirestore.QueryDocumentSnapshot | null = null;
  for (;;) {
    let query = db.collection("organizers")
      .where("ownerUserId", ">", "")
      .orderBy("ownerUserId")
      .select("ownerUserId")
      .limit(500);
    if (cursor) query = query.startAfter(cursor);
    const snapshot = await query.get();
    ids.push(...snapshot.docs.map((doc) => doc.id));
    if (snapshot.docs.length < 500) return ids;
    cursor = snapshot.docs[snapshot.docs.length - 1];
  }
}

async function newFollowersOn(
  db: FirebaseFirestore.Firestore,
  date: string,
  owned: ReadonlySet<string>
): Promise<Map<string, number>> {
  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(start.getTime() + 86_400_000);
  const snapshot = await db.collection("organizerFollows")
    .where("followedAt", ">=", admin.firestore.Timestamp.fromDate(start))
    .where("followedAt", "<", admin.firestore.Timestamp.fromDate(end))
    .select("organizerId")
    .limit(maxNewFollowEdges)
    .get();
  if (snapshot.docs.length >= maxNewFollowEdges) {
    logger.warn("New follow edges hit the roll-up cap.", {date});
  }
  const counts = new Map<string, number>();
  for (const doc of snapshot.docs) {
    const organizerId = doc.get("organizerId");
    if (typeof organizerId !== "string" || !owned.has(organizerId)) continue;
    counts.set(organizerId, (counts.get(organizerId) ?? 0) + 1);
  }
  return counts;
}

function count(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ?
    Math.trunc(value) : 0;
}

/**
 * Nightly at 03:30 IST, after the marts refresh, for the UTC day that ended
 * at 05:30 IST the day before.
 */
export const rollupOrganizerInsightsDaily = onSchedule({
  schedule: "30 3 * * *", timeZone: "Asia/Kolkata", region: "asia-south1",
  maxInstances: 1, timeoutSeconds: 540, memory: "512MiB",
}, async () => {
  const summary = await rollupOrganizerInsightsDay(
    utcDayKey(defaultDeps.now(), 1));
  logger.info("Organizer insights rolled up.", summary);
});
