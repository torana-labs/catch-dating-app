import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {onCall, HttpsError, type CallableRequest} from
  "firebase-functions/v2/https";
import {requireAdminRole} from "../admin/adminAuth";
import {
  type BigQueryClient,
  defaultBigQueryClient,
  intParam,
  stringParam,
} from "../shared/bigQuery";
import {appCheckCallableOptionsWithLimits} from "../shared/callableOptions";
import {checkRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import type {AdminGetMarketplaceCallablePayload as Payload} from
  "../shared/generated/adminGetMarketplaceCallablePayload";
import type {AdminGetMarketplaceCallableResponse as Result} from
  "../shared/generated/adminGetMarketplaceCallableResponse";
import {validateAdminGetMarketplaceCallablePayload} from
  "../shared/generated/validators/adminGetMarketplaceInput";
import {validateAdminGetMarketplaceCallableResponse} from
  "../shared/generated/validators/adminGetMarketplaceOutput";

/**
 * The Marketplace from the warehouse's Firestore exports (events, bookings,
 * organizers): are guests finding full nights in each city, do they come
 * back, and which organizers are going quiet. India time throughout.
 */
const marketplaceRoles = ["admin", "adminOwner"] as const;

/**
 * The warehouse dataset the raw Firestore export views live in.
 * @return {string} project.dataset.
 */
export function warehouseDataset(): string {
  const project = process.env.HOST_ANALYTICS_BIGQUERY_PROJECT_ID ||
    process.env.BIGQUERY_PROJECT_ID || process.env.GCLOUD_PROJECT ||
    process.env.GCP_PROJECT || "catch-dating-app-64e51";
  const dataset = process.env.HOST_ANALYTICS_BIGQUERY_DATASET ||
    "catch_analytics";
  return `${project}.${dataset}`;
}

const ts = (path: string) => "TIMESTAMP_SECONDS(SAFE_CAST(JSON_VALUE(data, " +
  `'$.${path}._seconds') AS INT64))`;

/**
 * Shared CTEs: events with their organizer's market, and bookings.
 * @param {string} dataset project.dataset.
 * @return {string} SQL WITH clause.
 */
export function marketplaceBase(dataset: string): string {
  return `
WITH organizers AS (
  SELECT document_id AS organizer_id,
    COALESCE(JSON_VALUE(data, '$.locationMarketId'),
      JSON_VALUE(data, '$.location')) AS market_id,
    JSON_VALUE(data, '$.name') AS name,
    JSON_VALUE(data, '$.publicPage.publishStatus') = 'published' AND
      COALESCE(JSON_VALUE(data, '$.status'), 'active') = 'active' AS live
  FROM \`${dataset}.organizers_raw_latest\`
),
events AS (
  SELECT e.document_id AS event_id,
    COALESCE(JSON_VALUE(e.data, '$.organizerId'),
      JSON_VALUE(e.data, '$.clubId')) AS organizer_id,
    ${ts("startTime").replace(/data/gu, "e.data")} AS start_time,
    JSON_VALUE(e.data, '$.status') AS status,
    COALESCE(SAFE_CAST(JSON_VALUE(e.data, '$.capacityLimit') AS INT64), 0)
      AS capacity
  FROM \`${dataset}.events_raw_latest\` e
),
bookings AS (
  SELECT JSON_VALUE(data, '$.eventId') AS event_id,
    JSON_VALUE(data, '$.uid') AS uid,
    JSON_VALUE(data, '$.status') AS status,
    COALESCE(${ts("signedUpAt")}, ${ts("createdAt")}) AS booked_at
  FROM \`${dataset}.event_participations_raw_latest\`
),
scoped AS (
  SELECT ev.*, o.market_id, o.name AS organizer_name
  FROM events ev LEFT JOIN organizers o USING (organizer_id)
  WHERE ev.status IS DISTINCT FROM 'cancelled'
    AND (@market_id IS NULL OR o.market_id = @market_id)
)`;
}

/**
 * Per city over the range: live organizers, events a week, places filled,
 * no-shows (only events that checked anyone in) and waitlisted guests.
 * @param {string} dataset project.dataset.
 * @return {string} SQL.
 */
export function citiesSql(dataset: string): string {
  return `${marketplaceBase(dataset)},
per_event AS (
  SELECT s.event_id, s.market_id, s.capacity,
    COUNTIF(b.status IN ('signedUp', 'attended')) AS booked,
    COUNTIF(b.status = 'attended') AS attended,
    COUNTIF(b.status = 'waitlisted') AS waitlisted
  FROM scoped s LEFT JOIN bookings b USING (event_id)
  WHERE s.start_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(),
      INTERVAL @range_days DAY)
    AND s.start_time < CURRENT_TIMESTAMP()
  GROUP BY s.event_id, s.market_id, s.capacity
),
live AS (
  SELECT market_id, COUNTIF(live) AS organizers_live
  FROM organizers WHERE market_id IS NOT NULL GROUP BY market_id
)
SELECT l.market_id AS marketId,
  l.organizers_live AS organizersLive,
  COUNT(p.event_id) AS events,
  SUM(IF(p.capacity > 0, p.booked, 0)) AS bookedWithCapacity,
  SUM(IF(p.capacity > 0, p.capacity, 0)) AS capacity,
  SUM(IF(p.attended > 0, p.booked, 0)) AS bookedCheckedEvents,
  SUM(IF(p.attended > 0, p.attended, 0)) AS attended,
  SUM(COALESCE(p.waitlisted, 0)) AS waitlisted
FROM live l LEFT JOIN per_event p USING (market_id)
WHERE @market_id IS NULL OR l.market_id = @market_id
GROUP BY l.market_id, l.organizers_live
ORDER BY events DESC, organizersLive DESC
LIMIT 100`;
}

/**
 * Guests by the India-time month of their first booking, over the last
 * twelve months, and how many booked again within 30, 60 and 90 days.
 * @param {string} dataset project.dataset.
 * @return {string} SQL.
 */
export function guestCohortsSql(dataset: string): string {
  return `${marketplaceBase(dataset)},
guest_bookings AS (
  SELECT b.uid, b.booked_at
  FROM bookings b JOIN scoped s USING (event_id)
  WHERE b.status IN ('signedUp', 'attended') AND b.uid IS NOT NULL
    AND b.booked_at IS NOT NULL
),
firsts AS (
  SELECT uid, MIN(booked_at) AS first_at FROM guest_bookings GROUP BY uid
),
returns AS (
  SELECT f.uid, f.first_at,
    MIN(IF(g.booked_at > f.first_at, g.booked_at, NULL)) AS next_at
  FROM firsts f JOIN guest_bookings g USING (uid)
  GROUP BY f.uid, f.first_at
)
SELECT FORMAT_TIMESTAMP('%Y-%m', first_at, 'Asia/Kolkata') AS month,
  COUNT(*) AS guests,
  COUNTIF(TIMESTAMP_DIFF(next_at, first_at, DAY) <= 30) AS again30,
  COUNTIF(TIMESTAMP_DIFF(next_at, first_at, DAY) <= 60) AS again60,
  COUNTIF(TIMESTAMP_DIFF(next_at, first_at, DAY) <= 90) AS again90,
  MAX(TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), first_at, DAY)) AS oldestDays,
  MIN(TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), first_at, DAY)) AS newestDays
FROM returns
WHERE first_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 365 DAY)
GROUP BY month ORDER BY month LIMIT 24`;
}

/**
 * Bookings per India-time week (weeks start Monday) for the last six weeks,
 * and the events this week and last.
 * @param {string} dataset project.dataset.
 * @return {string} SQL.
 */
export function weeksSql(dataset: string): string {
  return `${marketplaceBase(dataset)},
weeks AS (
  SELECT DATE_TRUNC(DATE(b.booked_at, 'Asia/Kolkata'), WEEK(MONDAY)) AS week,
    COUNT(*) AS bookings
  FROM bookings b JOIN scoped s USING (event_id)
  WHERE b.status IN ('signedUp', 'attended')
    AND b.booked_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 49 DAY)
  GROUP BY week
),
this_week AS (
  SELECT DATE_TRUNC(CURRENT_DATE('Asia/Kolkata'), WEEK(MONDAY)) AS week
)
SELECT CAST(w.week AS STRING) AS weekStart, w.bookings,
  w.week = t.week AS partial,
  (SELECT COUNT(*) FROM scoped s, this_week t2 WHERE DATE_TRUNC(
    DATE(s.start_time, 'Asia/Kolkata'), WEEK(MONDAY)) = t2.week)
    AS eventsThisWeek,
  (SELECT COUNT(*) FROM scoped s, this_week t2 WHERE DATE_TRUNC(
    DATE(s.start_time, 'Asia/Kolkata'), WEEK(MONDAY)) =
      DATE_SUB(t2.week, INTERVAL 7 DAY)) AS eventsLastWeek
FROM weeks w, this_week t
WHERE w.week >= DATE_SUB(t.week, INTERVAL 35 DAY)
ORDER BY w.week LIMIT 13`;
}

/**
 * Organizers with no event in the last five weeks and none coming, that ran
 * at least two in the three months before.
 * @param {string} dataset project.dataset.
 * @return {string} SQL.
 */
export function goingQuietSql(dataset: string): string {
  return `${marketplaceBase(dataset)}
SELECT organizer_id AS organizerId, ANY_VALUE(organizer_name) AS name,
  ANY_VALUE(market_id) AS marketId,
  TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), MAX(IF(start_time < CURRENT_TIMESTAMP(),
    start_time, NULL)), DAY) AS daysSinceLastEvent,
  COUNTIF(start_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 125 DAY)
    AND start_time < TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 35 DAY)) / 3
    AS eventsPerMonthBefore
FROM scoped
WHERE organizer_id IS NOT NULL
GROUP BY organizer_id
HAVING COUNTIF(start_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(),
    INTERVAL 35 DAY)) = 0
  AND eventsPerMonthBefore * 3 >= 2
ORDER BY eventsPerMonthBefore DESC
LIMIT @limit`;
}

const count = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : 0;
};
const percent = (part: number, whole: number) =>
  whole > 0 ? Math.min(100, Math.round(part * 100 / whole)) : null;

type Row = Record<string, unknown>;

/**
 * Turns the four queries' rows into the response.
 * @param {object} input Range, market, rows and sales owner names.
 * @return {Result} Marketplace.
 */
export function buildMarketplace(input: {
  rangeDays: Payload["rangeDays"]; marketId: string | null; nowMillis: number;
  cities: Row[]; cohorts: Row[]; weeks: Row[]; quiet: Row[];
  owners: Map<string, {uid: string; name: string | null}>;
}): Result {
  const cities = input.cities.map((row) => ({
    marketId: String(row.marketId),
    organizersLive: count(row.organizersLive),
    eventsPerWeek: Math.round(count(row.events) * 70 / input.rangeDays) / 10,
    filledPercent: percent(count(row.bookedWithCapacity), count(row.capacity)),
    noShowPercent: percent(count(row.bookedCheckedEvents) -
      count(row.attended), count(row.bookedCheckedEvents)),
    waitlisted: count(row.waitlisted)}));
  const totals = input.cities.reduce((sum: Record<string, number>, row) => {
    for (const key of ["bookedWithCapacity", "capacity",
      "bookedCheckedEvents", "attended"]) {
      sum[key] = (sum[key] ?? 0) + count(row[key]);
    }
    return sum;
  }, {});
  // A window not yet over for every guest in a cohort reads as unknown.
  const ratio = (row: Row, key: string, days: number) =>
    count(row.newestDays) >= days ?
      percent(count(row[key]), count(row.guests)) : null;
  const guestCohorts = input.cohorts.map((row) => ({month: String(row.month),
    guests: count(row.guests), again30Percent: ratio(row, "again30", 30),
    again60Percent: ratio(row, "again60", 60),
    again90Percent: ratio(row, "again90", 90)}));
  const ripe = input.cohorts.filter((row) => count(row.newestDays) >= 30);
  const cameBack = percent(ripe.reduce((sum, row) => sum + count(row.again30),
    0), ripe.reduce((sum, row) => sum + count(row.guests), 0));
  return {rangeDays: input.rangeDays, marketId: input.marketId,
    available: true, unavailableReason: null,
    generatedAtMillis: input.nowMillis,
    stats: {eventsThisWeek: count(input.weeks[0]?.eventsThisWeek),
      eventsLastWeek: count(input.weeks[0]?.eventsLastWeek),
      filledPercent: percent(totals.bookedWithCapacity ?? 0,
        totals.capacity ?? 0),
      noShowPercent: percent((totals.bookedCheckedEvents ?? 0) -
        (totals.attended ?? 0), totals.bookedCheckedEvents ?? 0),
      cameBackPercent: cameBack},
    cities, guestCohorts,
    bookingsByWeek: input.weeks.map((row) => ({weekStart:
      String(row.weekStart), bookings: count(row.bookings),
    partial: row.partial === true || row.partial === "true"})),
    goingQuiet: input.quiet.map((row) => {
      const id = String(row.organizerId);
      const owner = input.owners.get(id);
      return {organizerId: id,
        name: String(row.name ?? id).slice(0, 160),
        marketId: typeof row.marketId === "string" ? row.marketId : null,
        daysSinceLastEvent: count(row.daysSinceLastEvent),
        eventsPerMonthBefore: Math.round(Number(row.eventsPerMonthBefore) *
          10) / 10 || 0,
        salesOwnerUid: owner?.uid ?? null, salesOwnerName: owner?.name ?? null};
    })};
}

/**
 * The owner reads the Marketplace.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {BigQueryClient} bigQuery Warehouse client.
 * @return {Promise<Result>} Marketplace.
 */
export async function adminGetMarketplaceHandler(
  request: CallableRequest<unknown>,
  bigQuery: BigQueryClient = defaultBigQueryClient): Promise<Result> {
  const actor = requireAdminRole(request, marketplaceRoles);
  const data = validateCallableWithAjv<Payload>(request,
    validateAdminGetMarketplaceCallablePayload);
  const db = admin.firestore();
  await checkRateLimit(db, actor.uid, "adminGetMarketplace",
    {maxRequests: 20, windowMs: 60 * 1000});
  const nowMillis = Date.now();
  const dataset = warehouseDataset();
  const params = [stringParam("market_id", data.marketId),
    intParam("range_days", data.rangeDays), intParam("limit", 50)];
  let result: Result;
  try {
    const [cities, cohorts, weeks, quiet] = await Promise.all([
      citiesSql(dataset), guestCohortsSql(dataset), weeksSql(dataset),
      goingQuietSql(dataset)].map((sql) => bigQuery.query<Row>(sql,
        params.filter((param) => sql.includes(`@${param.name}`)))));
    const ownerRefs = quiet.map((row) => db.collection("organizerSalesAccounts")
      .doc(String(row.organizerId)));
    const accounts = ownerRefs.length ? await db.getAll(...ownerRefs) : [];
    const ownerUids = [...new Set(accounts.map((snap) =>
      snap.get("ownerUid")).filter((uid): uid is string =>
      typeof uid === "string"))];
    const users = ownerUids.length ? await db.getAll(...ownerUids.map((uid) =>
      db.collection("users").doc(uid))) : [];
    const userNames = new Map(users.map((snap) => [snap.id,
      String(snap.get("displayName") ?? snap.get("name") ?? "") || null]));
    const owners = new Map(accounts.filter((snap) =>
      typeof snap.get("ownerUid") === "string").map((snap) => [snap.id,
      {uid: snap.get("ownerUid") as string,
        name: userNames.get(snap.get("ownerUid")) ?? null}]));
    result = buildMarketplace({rangeDays: data.rangeDays,
      marketId: data.marketId, nowMillis, cities, cohorts, weeks, quiet,
      owners});
  } catch (error) {
    logger.warn("Marketplace warehouse read failed.", {
      error: error instanceof Error ? error.message : String(error)});
    result = {rangeDays: data.rangeDays, marketId: data.marketId,
      available: false, unavailableReason: "The analytics warehouse could " +
        "not be read. Its Firestore exports may not be installed here.",
      generatedAtMillis: nowMillis,
      stats: {eventsThisWeek: 0, eventsLastWeek: 0, filledPercent: null,
        noShowPercent: null, cameBackPercent: null},
      cities: [], guestCohorts: [], bookingsByWeek: [], goingQuiet: []};
  }
  if (!validateAdminGetMarketplaceCallableResponse(result)) {
    throw new HttpsError("internal", "The Marketplace could not be read.");
  }
  return result;
}

export const adminGetMarketplace = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 120, maxInstances: 5}),
  (request) => adminGetMarketplaceHandler(request));
