import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {createHash} from "node:crypto";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {requireAuth} from "../shared/auth";
import {requireAdminRole} from "../admin/adminAuth";
import {writeAdminAuditLog} from "../admin/adminAudit";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import type {
  OrganizerDocument,
  EventAttendeeDocument,
  EventDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {
  HostAnalyticsQueryCallablePayload,
} from "../shared/generated/hostAnalyticsQueryCallablePayload";
import type {
  HostAnalyticsCallableResponse,
} from "../shared/generated/hostAnalyticsCallableResponse";
import {
  validateHostAnalyticsCallableResponse,
} from "../shared/generated/validators/hostAnalyticsOutput";
import {
  validateHostAnalyticsQueryCallablePayload,
} from "../shared/generated/validators/hostAnalyticsQueryInput";
import {isOrganizerManager} from "../shared/organizerHosts";
import {loadHostRegistrationAnalytics} from "./hostRegistrationAnalytics";
import {
  defaultHostAnalyticsBigQuerySource,
  HostAnalyticsBigQuerySource,
  HostAnalyticsLinkRow,
  HostAnalyticsMartRow,
} from "./hostAnalyticsBigQuery";

type AnalyticsGranularity = "day" | "week" | "month";
type QueryScope = "host" | "admin";

interface HostAnalyticsDeps {
  firestore: () => FirebaseFirestore.Firestore;
  now: () => Date;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  timestampFromDate: (date: Date) => FirebaseFirestore.Timestamp;
  bigQuerySource: HostAnalyticsBigQuerySource;
  checkRateLimit?: typeof defaultCheckRateLimit;
}

interface AnalyticsRange {
  start: Date;
  endExclusive: Date;
  granularity: AnalyticsGranularity;
  preset: string | null;
  timezone: string;
}

interface OrganizerRecord {
  id: string;
  data: OrganizerDocument;
}

interface EventRecord {
  id: string;
  data: EventDocument;
}

interface AnalyticsRecords {
  organizers: OrganizerRecord[];
  events: EventRecord[];
  martRows: HostAnalyticsMartRow[];
  operationalAttendees?: EventAttendeeRecord[];
  /**
   * Owner link clicks in the range, by link and traffic source; null when the
   * link mart could not be read.
   */
  linkRows?: HostAnalyticsLinkRow[] | null;
}

interface EventAttendeeRecord {
  id: string;
  data: EventAttendeeDocument;
}

interface EventMetricAccumulator {
  eventId: string;
  organizerId: string;
  title: string;
  startTime: Date;
  status: string;
  capacityLimit: number;
  bookedCount: number;
  checkedInCount: number;
  waitlistedCount: number;
  grossRevenueMinor: number;
  currency: string;
  checkoutStartedCount: number;
  checkoutDropoffCount: number;
  paymentCompletedCount: number;
  paymentFailedCount: number;
  paymentRefundedCount: number;
  reviewCount: number;
  ratingTotal: number;
  verifiedReviewCount: number;
  publicReviewCount: number;
  ownerResponseCount: number;
  demandCount: number;
  inviteOpenCount: number;
  mutualMatchCount: number;
  chatStartedCount: number;
  repeatAttendeeCount: number;
  eventSaveCount: number;
  operationalAttendeeCount: number;
  operationalCheckedInCount: number;
  attendeeSources: Record<EventAttendeeDocument["source"], number>;
}

const maxHostOrganizers = 25;
const maxHostEventsPerOrganizer = 500;
const maxAdminOrganizers = 100;
const maxAdminEvents = 1000;
const hostAnalyticsSnapshotCollection = "hostAnalyticsSnapshots";
export const hostAnalyticsSnapshotTtlMs = 15 * 60 * 1000;

const defaultDeps: HostAnalyticsDeps = {
  firestore: () => admin.firestore(),
  now: () => new Date(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  timestampFromDate: (date) => admin.firestore.Timestamp.fromDate(date),
  bigQuerySource: defaultHostAnalyticsBigQuerySource,
  checkRateLimit: defaultCheckRateLimit,
};

/**
 * Returns aggregate analytics for organizers hosted by the signed-in user.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {HostAnalyticsDeps} deps Injectable dependencies.
 * @return {Promise<HostAnalyticsCallableResponse>} Host analytics payload.
 */
export async function getHostAnalyticsHandler(
  request: CallableRequest<unknown>,
  deps: HostAnalyticsDeps = defaultDeps
): Promise<HostAnalyticsCallableResponse> {
  const uid = requireAuth(request);
  const payload = validateAnalyticsPayload(request);
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, uid, "getHostAnalytics", {
    maxRequests: 30, windowMs: 60 * 1000,
  });
  return loadHostAnalytics(db, payload, deps.now(), "host", uid, deps);
}

/**
 * Returns aggregate analytics for admin dashboard readers.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {HostAnalyticsDeps} deps Injectable dependencies.
 * @return {Promise<HostAnalyticsCallableResponse>} Admin analytics payload.
 */
export async function adminGetHostAnalyticsHandler(
  request: CallableRequest<unknown>,
  deps: HostAnalyticsDeps = defaultDeps
): Promise<HostAnalyticsCallableResponse> {
  const adminContext = requireAdminRole(
    request,
    ["adminOwner"]
  );
  const payload = validateAnalyticsPayload(request);
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, adminContext.uid, "adminGetHostAnalytics", {
    maxRequests: 30, windowMs: 60 * 1000,
  });
  const response = await loadHostAnalytics(
    db,
    payload,
    deps.now(),
    "admin",
    adminContext.uid,
    deps
  );
  await writeAdminAuditLog(db, adminContext, {
    action: "adminGetHostAnalytics",
    targetPath: adminAnalyticsTargetPath(payload),
    request,
    serverTimestamp: deps.serverTimestamp,
  });
  return response;
}

export const getHostAnalytics = onCall(appCheckCallableOptions, (request) =>
  getHostAnalyticsHandler(request)
);

export const adminGetHostAnalytics = onCall(
  appCheckCallableOptions,
  (request) => adminGetHostAnalyticsHandler(request)
);

/**
 * Resolves an analytics range from a callable payload.
 * @param {HostAnalyticsQueryCallablePayload} payload Analytics query payload.
 * @param {Date} now Current time.
 * @return {AnalyticsRange} Inclusive start and exclusive end range.
 */
export function resolveAnalyticsRange(
  payload: HostAnalyticsQueryCallablePayload,
  now: Date
): AnalyticsRange {
  const preset = payload.rangePreset ?? "30d";
  const timezone = resolveTimezone(payload.timezone);
  const today = startOfZonedDay(now, timezone);
  let start = new Date(today);
  let endExclusive = addZonedDays(today, 1, timezone);

  if (preset === "7d") {
    start = addZonedDays(today, -6, timezone);
  } else if (preset === "30d") {
    start = addZonedDays(today, -29, timezone);
  } else if (preset === "90d") {
    start = addZonedDays(today, -89, timezone);
  } else if (preset === "12m") {
    start = addZonedDays(today, -364, timezone);
  } else if (preset === "month") {
    const parts = zonedDateParts(today, timezone);
    start = zonedMidnight(parts.year, parts.month, 1, timezone);
  } else if (preset === "custom") {
    if (!payload.startDate || !payload.endDate) {
      throw new HttpsError(
        "invalid-argument",
        "Custom analytics ranges require startDate and endDate."
      );
    }
    start = parseZonedDate(payload.startDate, "startDate", timezone);
    endExclusive = addZonedDays(
      parseZonedDate(payload.endDate, "endDate", timezone),
      1,
      timezone
    );
  }

  if (endExclusive.getTime() <= start.getTime()) {
    throw new HttpsError(
      "invalid-argument",
      "Analytics endDate must be on or after startDate."
    );
  }

  const rangeDays = calendarDaysBetween(start, endExclusive, timezone);
  if (rangeDays > 366) {
    throw new HttpsError(
      "invalid-argument",
      "Analytics ranges cannot exceed 366 days."
    );
  }

  return {
    start,
    endExclusive,
    granularity: payload.granularity ?? defaultGranularity(rangeDays),
    preset,
    timezone,
  };
}

/**
 * Builds a host-safe aggregate response from authorized scope and
 * BigQuery rows.
 * @param {AnalyticsRecords} records Authorized Firestore scope + BigQuery rows.
 * @param {AnalyticsRange} range Analytics time range.
 * @param {Date} now Current time.
 * @return {HostAnalyticsCallableResponse} Aggregate response.
 */
export function buildHostAnalyticsFromRecords(
  records: AnalyticsRecords,
  range: AnalyticsRange,
  now: Date
): HostAnalyticsCallableResponse {
  const rows = records.martRows.filter((row) =>
    dailyRowInRange(row, range)
  );
  const previousRange = comparisonRange(range);
  const previousRows = records.martRows.filter((row) =>
    dailyRowInRange(row, previousRange)
  );
  const organizerIds = uniqueStrings(records.organizers.map((
    organizer) => organizer.id));
  const eventIds = resolveScopeEventIds(records, rows);
  const eventMetrics = eventMetricsFromRows(
    rows,
    records.events,
    range.timezone
  );
  applyOperationalAttendees(
    eventMetrics,
    records.events,
    records.operationalAttendees ?? []
  );
  // Event-report links target native management. External listing observations
  // remain in presence totals, but must not produce an unsupported route.
  const nativeEventIds = new Set(records.events.map((event) => event.id));
  const topEvents = eventMetrics.filter((event) =>
    nativeEventIds.has(event.eventId))
    .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
    .slice(0, 25);
  const totals = summarizeEventMetrics(eventMetrics);
  const discoverySummary = summarizeDiscovery(rows);
  const reviewSummary = summarizeReviews(rows);
  const previousEventMetrics = eventMetricsFromRows(
    previousRows,
    [],
    range.timezone
  );
  const previousTotals = summarizeEventMetrics(previousEventMetrics);
  const previousDiscovery = summarizeDiscovery(previousRows);
  const previousReviews = summarizeReviews(previousRows);
  const currencies = uniqueStrings(eventMetrics.map((event) => event.currency));
  const mixedCurrency = currencies.length > 1;
  const previousCurrencies = uniqueStrings(
    previousEventMetrics.map((event) => event.currency)
  );
  const previousRevenueComparable =
    previousCurrencies.length <= 1 &&
    (currencies.length === 0 ||
      previousCurrencies.length === 0 ||
      currencies[0] === previousCurrencies[0]);
  const sourceStatus = rows.length === 0 ? "missing" : "ready";
  const operationsSourceStatus = records.events.length === 0 ?
    "missing" : "ready";
  const response: HostAnalyticsCallableResponse = {
    generatedAt: now.toISOString(),
    timezone: range.timezone,
    range: {
      startDate: range.start.toISOString(),
      endDate: addUtcMilliseconds(range.endExclusive, -1).toISOString(),
      granularity: range.granularity,
      preset: range.preset,
    },
    scope: {
      organizerIds: organizerIds,
      eventIds,
      organizerName: resolveOrganizerName(records, rows),
      eventTitle: resolveEventTitle(records, eventMetrics),
    },
    summaryCards: [
      metricCard("outboundBookingClicks", "Provider booking clicks",
        rows.reduce((sum, row) => sum + Math.max(0,
          Math.trunc(row.outboundBookingClicks ?? 0)), 0), "count",
        rows.length === 0 || rows.every((row) =>
          row.outboundBookingClicks === undefined) ? "missing" :
          rows.some((row) => row.outboundBookingClicks === undefined) ?
            "partial" : sourceStatus,
        "Outbound provider handoffs; " +
          "Catch does not observe external purchases."),
      metricCard(
        "rosterGuests",
        "Guests on roster",
        totals.operationalAttendees,
        "count",
        operationsSourceStatus,
        "Includes Catch, spreadsheet, manual, and web registrations."
      ),
      metricCard(
        "rosterAttendanceRate",
        "Roster attendance",
        percentage(
          totals.operationalCheckedIn,
          totals.operationalAttendees
        ),
        "percent",
        operationsSourceStatus,
        "Uses the unified operational roster, independent of ticketing source."
      ),
      metricCard(
        "listingViews",
        "Listing views",
        discoverySummary.listingViews,
        "count",
        sourceStatus,
        "From BigQuery host analytics events and marts.",
        previousDiscovery.listingViews
      ),
      metricCard(
        "eventViews",
        "Event views",
        discoverySummary.eventViews,
        "count",
        sourceStatus,
        "From BigQuery host analytics events and marts.",
        previousDiscovery.eventViews
      ),
      metricCard(
        "bookings",
        "Bookings",
        totals.booked,
        "count",
        sourceStatus,
        null,
        previousTotals.booked
      ),
      metricCard(
        "attendanceRate",
        "Attendance",
        percentage(totals.checkedIn, totals.booked),
        "percent",
        sourceStatus,
        null,
        percentage(previousTotals.checkedIn, previousTotals.booked)
      ),
      metricCard(
        "revenue",
        "Revenue",
        mixedCurrency ? 0 : totals.revenue,
        "money_minor",
        mixedCurrency ? "partial" : sourceStatus,
        mixedCurrency ? "Mixed currencies cannot be combined safely." : null,
        mixedCurrency || !previousRevenueComparable ?
          null :
          previousTotals.revenue
      ),
      metricCard(
        "checkoutDropoff",
        "Checkout drop-off",
        totals.checkoutDropoff,
        "count",
        sourceStatus,
        null,
        previousTotals.checkoutDropoff
      ),
      metricCard(
        "checkoutConversionRate",
        "Checkout conversion",
        percentage(totals.paymentCompleted, totals.checkoutStarted),
        "percent",
        sourceStatus,
        null,
        percentage(
          previousTotals.paymentCompleted,
          previousTotals.checkoutStarted
        )
      ),
      metricCard(
        "newReviews",
        "New reviews",
        reviewSummary.newReviews,
        "count",
        sourceStatus,
        null,
        previousReviews.newReviews
      ),
      metricCard(
        "connections",
        "Connections",
        totals.matches,
        "count",
        sourceStatus,
        null,
        previousTotals.matches
      ),
      metricCard(
        "chats",
        "Chats started",
        totals.chats,
        "count",
        sourceStatus,
        null,
        previousTotals.chats
      ),
    ],
    trend: buildTrend(rows, range),
    topEvents: topEvents.map((event) => ({
      eventId: event.eventId,
      organizerId: event.organizerId,
      title: event.title,
      startTime: event.startTime.toISOString(),
      status: event.status,
      capacityLimit: event.capacityLimit,
      bookedCount: event.bookedCount,
      checkedInCount: event.checkedInCount,
      waitlistedCount: event.waitlistedCount,
      fillRate: percentage(event.bookedCount, event.capacityLimit),
      checkInRate: percentage(event.checkedInCount, event.bookedCount),
      grossRevenueMinor: event.grossRevenueMinor,
      currency: event.currency,
      checkoutStartedCount: event.checkoutStartedCount,
      checkoutDropoffCount: event.checkoutDropoffCount,
      paymentCompletedCount: event.paymentCompletedCount,
      paymentFailedCount: event.paymentFailedCount,
      paymentRefundedCount: event.paymentRefundedCount,
      reviewCount: event.reviewCount,
      averageRating: event.reviewCount === 0 ?
        0 :
        round(event.ratingTotal / event.reviewCount),
      demandCount: event.demandCount,
      inviteOpenCount: event.inviteOpenCount,
      mutualMatchCount: event.mutualMatchCount,
      chatStartedCount: event.chatStartedCount,
      repeatAttendeeCount: event.repeatAttendeeCount,
      operationalAttendeeCount: event.operationalAttendeeCount,
      operationalCheckedInCount: event.operationalCheckedInCount,
      attendeeSources: event.attendeeSources,
    })),
    reviewSummary,
    discoverySummary,
    linkSummary: summarizeLinks(records.organizers, records.linkRows ?? []),
    dataQuality: [
      ...dataQualityRows(
        rows,
        records.events,
        records.operationalAttendees ?? []
      ),
      ...(records.linkRows === null ? [linkClicksUnavailable] : []),
    ],
  };
  assertValidResponse(response);
  return response;
}

async function loadHostAnalytics(
  db: FirebaseFirestore.Firestore,
  payload: HostAnalyticsQueryCallablePayload,
  now: Date,
  scope: QueryScope,
  uid: string,
  deps: HostAnalyticsDeps
): Promise<HostAnalyticsCallableResponse> {
  const range = resolveAnalyticsRange(payload, now);
  const previousRange = comparisonRange(range);
  const organizers = await resolveOrganizers(db, payload, scope, uid);
  const snapshotId = hostAnalyticsSnapshotId(uid, payload, range, organizers);
  if (scope === "host") {
    const cached = await readHostAnalyticsSnapshot(db, snapshotId, now);
    if (cached !== null) return cached;
  }
  const events = await resolveEvents(db, payload, organizers, range, scope);
  const [martRows, operationalAttendees, registrationAnalytics, linkRows] =
    await Promise.all([
      deps.bigQuerySource.loadRows(
        {
          startDate: zonedDateKey(previousRange.start, range.timezone),
          endDate: zonedDateKey(
            addUtcMilliseconds(range.endExclusive, -1),
            range.timezone
          ),
        },
        {
          organizerIds: organizers.map((organizer) => organizer.id),
          eventId: payload.eventId ?? null,
        },
      ),
      loadOperationalAttendees(db, events),
      loadHostRegistrationAnalytics(db, organizers.map((
        organizer) => organizer.id),
      payload.eventId ?? null, range),
      // Links belong to the organizer page, so event reports have none.
      payload.eventId ? Promise.resolve([]) : deps.bigQuerySource.loadLinkRows(
        {
          startDate: zonedDateKey(range.start, range.timezone),
          endDate: zonedDateKey(
            addUtcMilliseconds(range.endExclusive, -1),
            range.timezone
          ),
        },
        organizers.map((organizer) => organizer.id),
      ).catch((error) => {
        console.warn("Owner link click rows unavailable.", error);
        return null;
      }),
    ]);
  const response = buildHostAnalyticsFromRecords(
    {organizers, events, martRows, operationalAttendees, linkRows},
    range,
    now
  );
  response.summaryCards.push(...registrationAnalytics.summaryCards);
  response.dataQuality.push(...registrationAnalytics.dataQuality);
  if (scope === "host") {
    await writeHostAnalyticsSnapshot(db, snapshotId, uid, response, now, deps);
  }
  return response;
}

/**
 * Returns the stable uid-scoped Firestore document id for a host query.
 * Resolved organizer ids and absolute range bounds prevent stale authorization
 * or a local-midnight rollover from reusing a snapshot for a different scope.
 * @param {string} uid Authenticated host uid.
 * @param {HostAnalyticsQueryCallablePayload} payload Normalized query.
 * @param {AnalyticsRange} range Resolved absolute range.
 * @param {OrganizerRecord[]} organizers Currently authorized organizers.
 * @return {string} Snapshot document id.
 */
export function hostAnalyticsSnapshotId(
  uid: string,
  payload: HostAnalyticsQueryCallablePayload,
  range: AnalyticsRange,
  organizers: OrganizerRecord[]
): string {
  const scopeHash = createHash("sha256").update(JSON.stringify({
    registrationReadoutVersion: 2,
    organizerId: payload.organizerId ?? null,
    eventId: payload.eventId ?? null,
    organizerIds: organizers.map((organizer) => organizer.id).sort(),
    start: range.start.toISOString(),
    endExclusive: range.endExclusive.toISOString(),
    granularity: range.granularity,
    preset: range.preset,
    timezone: range.timezone,
  })).digest("hex");
  return `${uid}_${scopeHash}`;
}

export async function readHostAnalyticsSnapshot(
  db: FirebaseFirestore.Firestore,
  snapshotId: string,
  now: Date
): Promise<HostAnalyticsCallableResponse | null> {
  try {
    const snapshot = await db.collection(hostAnalyticsSnapshotCollection)
      .doc(snapshotId)
      .get();
    if (!snapshot.exists) return null;
    const data = snapshot.data();
    if (!isHostAnalyticsSnapshotFresh(data?.expiresAt, now)) return null;
    const response = data?.response;
    if (!validateHostAnalyticsCallableResponse(response)) return null;
    return response as HostAnalyticsCallableResponse;
  } catch (error) {
    console.warn("Host analytics snapshot read failed; rebuilding.", error);
    return null;
  }
}

export async function writeHostAnalyticsSnapshot(
  db: FirebaseFirestore.Firestore,
  snapshotId: string,
  uid: string,
  response: HostAnalyticsCallableResponse,
  now: Date,
  deps: Pick<HostAnalyticsDeps, "serverTimestamp" | "timestampFromDate">
): Promise<void> {
  try {
    await db.collection(hostAnalyticsSnapshotCollection).doc(snapshotId).set({
      uid,
      scopeHash: snapshotId.slice(uid.length + 1),
      response,
      createdAt: deps.serverTimestamp(),
      expiresAt: deps.timestampFromDate(
        new Date(now.getTime() + hostAnalyticsSnapshotTtlMs)
      ),
    });
  } catch (error) {
    console.warn(
      "Host analytics snapshot write failed; serving live data.",
      error
    );
  }
}

function timestampLikeMillis(value: unknown): number | null {
  if (value instanceof Date) return value.getTime();
  if (value !== null && typeof value === "object") {
    const candidate = value as {
      toMillis?: () => number;
      seconds?: number;
      _seconds?: number;
    };
    if (typeof candidate.toMillis === "function") {
      const millis = candidate.toMillis();
      return Number.isFinite(millis) ? millis : null;
    }
    const seconds = candidate.seconds ?? candidate._seconds;
    if (typeof seconds === "number" && Number.isFinite(seconds)) {
      return seconds * 1000;
    }
  }
  return null;
}

/** Returns whether a stored snapshot can be served at the supplied time. */
export function isHostAnalyticsSnapshotFresh(
  expiresAt: unknown,
  now: Date
): boolean {
  const expiresAtMillis = timestampLikeMillis(expiresAt);
  return expiresAtMillis !== null && expiresAtMillis > now.getTime();
}

function validateAnalyticsPayload(
  request: CallableRequest<unknown>
): HostAnalyticsQueryCallablePayload {
  return validateCallableWithAjv<HostAnalyticsQueryCallablePayload>(
    request,
    validateHostAnalyticsQueryCallablePayload,
    normalizeAnalyticsPayload
  );
}

function normalizeAnalyticsPayload(data: unknown): unknown {
  if (data == null || typeof data !== "object" || Array.isArray(data)) {
    return {};
  }
  const input = data as Record<string, unknown>;
  return {
    ...input,
    organizerId: nullableTrimmedString(input.organizerId),
    eventId: nullableTrimmedString(input.eventId),
    startDate: nullableTrimmedString(input.startDate),
    endDate: nullableTrimmedString(input.endDate),
    timezone: nullableTrimmedString(input.timezone) ?? undefined,
  };
}

async function resolveOrganizers(
  db: FirebaseFirestore.Firestore,
  payload: HostAnalyticsQueryCallablePayload,
  scope: QueryScope,
  uid: string
): Promise<OrganizerRecord[]> {
  if (payload.eventId) {
    const eventSnap = await db.collection("events").doc(payload.eventId).get();
    if (!eventSnap.exists) {
      throw new HttpsError("not-found", "Event not found.");
    }
    const event = eventSnap.data() as EventDocument;
    const eventOwnerId = event.organizerId;
    const requestedOwnerId = payload.organizerId;
    if (requestedOwnerId && requestedOwnerId !== eventOwnerId) {
      throw new HttpsError("permission-denied",
        "Event scope does not match organizer.");
    }
    const organizer = await getOrganizerRecord(db, eventOwnerId);
    assertCanReadOrganizer(organizer, scope, uid);
    return [organizer];
  }

  const requestedOrganizerId = payload.organizerId;
  if (requestedOrganizerId) {
    const organizer = await getOrganizerRecord(db, requestedOrganizerId);
    assertCanReadOrganizer(organizer, scope, uid);
    return [organizer];
  }

  if (scope === "admin") {
    const snap = await db.collection("organizers").limit(
      maxAdminOrganizers).get();
    return snap.docs.map((doc) => ({
      id: doc.id,
      data: doc.data() as OrganizerDocument,
    }));
  }

  const snapshots = await Promise.all([
    db.collection("organizers")
      .where("hostUserIds", "array-contains", uid)
      .limit(maxHostOrganizers)
      .get(),
    db.collection("organizers")
      .where("ownerUserId", "==", uid)
      .limit(maxHostOrganizers)
      .get(),
    db.collection("organizers")
      .where("hostUserId", "==", uid)
      .limit(maxHostOrganizers)
      .get(),
  ]);
  const byId = new Map<string, OrganizerRecord>();
  for (const snapshot of snapshots) {
    for (const doc of snapshot.docs) {
      byId.set(doc.id, {id: doc.id, data: doc.data() as OrganizerDocument});
    }
  }
  return [...byId.values()].slice(0, maxHostOrganizers);
}

async function resolveEvents(
  db: FirebaseFirestore.Firestore,
  payload: HostAnalyticsQueryCallablePayload,
  organizers: OrganizerRecord[],
  range: AnalyticsRange,
  scope: QueryScope
): Promise<EventRecord[]> {
  if (payload.eventId) {
    const snap = await db.collection("events").doc(payload.eventId).get();
    if (!snap.exists) throw new HttpsError("not-found", "Event not found.");
    const event = snap.data() as EventDocument;
    if (!organizers.some((organizer) =>
      organizer.id === (event.organizerId))) {
      throw new HttpsError("permission-denied", "Event scope changed.");
    }
    return [{id: snap.id, data: event}];
  }

  if (scope === "admin" && !payload.organizerId) {
    const snap = await db.collection("events")
      .where("startTime", ">=", admin.firestore.Timestamp.fromDate(
        range.start
      ))
      .where("startTime", "<", admin.firestore.Timestamp.fromDate(
        range.endExclusive
      ))
      .limit(maxAdminEvents)
      .get();
    return snap.docs.map((doc) => ({
      id: doc.id,
      data: doc.data() as EventDocument,
    }));
  }

  const eventSnapshots = await Promise.all(
    organizers.map((organizer) => db.collection("events")
      .where("organizerId", "==", organizer.id)
      .limit(maxHostEventsPerOrganizer)
      .get())
  );
  return eventSnapshots.flatMap((snapshot) => snapshot.docs.map((doc) => ({
    id: doc.id,
    data: doc.data() as EventDocument,
  }))).filter((event) => {
    const startTime = timestampToDate(event.data.startTime);
    return startTime !== null && inRange(startTime, range);
  });
}

async function loadOperationalAttendees(
  db: FirebaseFirestore.Firestore,
  events: EventRecord[]
): Promise<EventAttendeeRecord[]> {
  const eventIds = uniqueStrings(events.map((event) => event.id));
  if (eventIds.length === 0) return [];
  const snapshots = await Promise.all(
    chunkStrings(eventIds, 30).map((chunk) => db
      .collection("eventAttendees")
      .where("eventId", "in", chunk)
      .get())
  );
  return snapshots.flatMap((snapshot) => snapshot.docs.map((doc) => ({
    id: doc.id,
    data: doc.data() as EventAttendeeDocument,
  })));
}

async function getOrganizerRecord(
  db: FirebaseFirestore.Firestore,
  organizerId: string
): Promise<OrganizerRecord> {
  const organizerSnap = await db.collection("organizers").doc(
    organizerId).get();
  if (!organizerSnap.exists) {
    throw new HttpsError("not-found", "Organizer not found.");
  }
  return {id: organizerSnap.id,
    data: organizerSnap.data() as OrganizerDocument};
}

function assertCanReadOrganizer(
  organizer: OrganizerRecord,
  scope: QueryScope,
  uid: string
): void {
  if (scope === "admin") return;
  if (isOrganizerManager(organizer.data, uid)) return;
  throw new HttpsError(
    "permission-denied",
    "Only this organizer's host team can read host analytics."
  );
}

function eventMetricsFromRows(
  rows: HostAnalyticsMartRow[],
  events: EventRecord[],
  timezone = "UTC"
): EventMetricAccumulator[] {
  const eventMap = new Map(events.map((event) => [event.id, event]));
  const byEvent = new Map<string, EventMetricAccumulator>();
  for (const row of rows) {
    if (!row.eventId) continue;
    const existing = byEvent.get(row.eventId);
    const fallbackEvent = eventMap.get(row.eventId) ?? null;
    if (!existing) {
      byEvent.set(row.eventId, {
        eventId: row.eventId,
        organizerId: fallbackEvent?.data.organizerId ?? row.organizerId,
        title: row.eventTitle ?? fallbackEventTitle(fallbackEvent),
        startTime: parseDate(row.eventStartTime) ??
          timestampToDate(fallbackEvent?.data.startTime) ??
          parseDailyDate(row.date, timezone),
        status: row.eventStatus ?? fallbackEvent?.data.status ?? "unknown",
        capacityLimit: Math.max(0, Math.trunc(row.capacityLimit)),
        bookedCount: Math.max(0, Math.trunc(row.bookedCount)),
        checkedInCount: Math.max(0, Math.trunc(row.checkedInCount)),
        waitlistedCount: Math.max(0, Math.trunc(row.waitlistedCount)),
        grossRevenueMinor: Math.max(0, Math.trunc(row.grossRevenueMinor)),
        currency: row.currency ?? fallbackEvent?.data.currency ?? "INR",
        checkoutStartedCount: Math.max(
          0,
          Math.trunc(row.checkoutStartedCount)
        ),
        checkoutDropoffCount: Math.max(
          0,
          Math.trunc(row.checkoutDropoffCount)
        ),
        paymentCompletedCount: Math.max(
          0,
          Math.trunc(row.paymentCompletedCount)
        ),
        paymentFailedCount: Math.max(0, Math.trunc(row.paymentFailedCount)),
        paymentRefundedCount: Math.max(0, Math.trunc(row.paymentRefundedCount)),
        reviewCount: Math.max(0, Math.trunc(row.reviewCount)),
        ratingTotal: Math.max(0, row.ratingTotal),
        verifiedReviewCount: Math.max(0, Math.trunc(
          row.verifiedReviewCount ?? 0
        )),
        publicReviewCount: Math.max(
          0,
          Math.trunc(row.publicReviewCount ?? 0)
        ),
        ownerResponseCount: Math.max(
          0,
          Math.trunc(row.ownerResponseCount ?? 0)
        ),
        demandCount: Math.max(0, Math.trunc(row.demandCount)),
        inviteOpenCount: Math.max(0, Math.trunc(row.inviteOpenCount)),
        mutualMatchCount: Math.max(0, Math.trunc(row.mutualMatchCount)),
        chatStartedCount: Math.max(0, Math.trunc(row.chatStartedCount)),
        repeatAttendeeCount: Math.max(0, Math.trunc(row.repeatAttendeeCount)),
        eventSaveCount: Math.max(0, Math.trunc(row.eventSaves)),
        operationalAttendeeCount: 0,
        operationalCheckedInCount: 0,
        attendeeSources: emptyAttendeeSources(),
      });
      continue;
    }
    existing.capacityLimit = Math.max(
      existing.capacityLimit,
      row.capacityLimit
    );
    existing.bookedCount += Math.max(0, Math.trunc(row.bookedCount));
    existing.checkedInCount += Math.max(0, Math.trunc(row.checkedInCount));
    existing.waitlistedCount += Math.max(0, Math.trunc(row.waitlistedCount));
    existing.grossRevenueMinor += Math.max(
      0,
      Math.trunc(row.grossRevenueMinor)
    );
    existing.checkoutStartedCount += Math.max(
      0,
      Math.trunc(row.checkoutStartedCount)
    );
    existing.checkoutDropoffCount += Math.max(
      0,
      Math.trunc(row.checkoutDropoffCount)
    );
    existing.paymentCompletedCount += Math.max(
      0,
      Math.trunc(row.paymentCompletedCount)
    );
    existing.paymentFailedCount += Math.max(
      0,
      Math.trunc(row.paymentFailedCount)
    );
    existing.paymentRefundedCount += Math.max(
      0,
      Math.trunc(row.paymentRefundedCount)
    );
    existing.reviewCount += Math.max(0, Math.trunc(row.reviewCount));
    existing.ratingTotal += Math.max(0, row.ratingTotal);
    existing.verifiedReviewCount += Math.max(
      0,
      Math.trunc(row.verifiedReviewCount ?? 0)
    );
    existing.publicReviewCount += Math.max(
      0,
      Math.trunc(row.publicReviewCount ?? 0)
    );
    existing.ownerResponseCount += Math.max(
      0,
      Math.trunc(row.ownerResponseCount ?? 0)
    );
    existing.demandCount += Math.max(0, Math.trunc(row.demandCount));
    existing.inviteOpenCount += Math.max(0, Math.trunc(row.inviteOpenCount));
    existing.mutualMatchCount += Math.max(0, Math.trunc(row.mutualMatchCount));
    existing.chatStartedCount += Math.max(0, Math.trunc(row.chatStartedCount));
    existing.repeatAttendeeCount += Math.max(
      0,
      Math.trunc(row.repeatAttendeeCount)
    );
    existing.eventSaveCount += Math.max(0, Math.trunc(row.eventSaves));
  }
  return [...byEvent.values()];
}

function applyOperationalAttendees(
  metrics: EventMetricAccumulator[],
  events: EventRecord[],
  attendees: EventAttendeeRecord[]
): void {
  const byEvent = new Map(metrics.map((metric) => [metric.eventId, metric]));
  const eventMap = new Map(events.map((event) => [event.id, event]));
  for (const attendee of attendees) {
    if (attendee.data.status === "cancelled") continue;
    let metric = byEvent.get(attendee.data.eventId);
    if (!metric) {
      const event = eventMap.get(attendee.data.eventId);
      if (!event) continue;
      metric = eventMetricFromEvent(event);
      if (!metric) continue;
      metrics.push(metric);
      byEvent.set(metric.eventId, metric);
    }
    metric.operationalAttendeeCount += 1;
    if (attendee.data.status === "checkedIn") {
      metric.operationalCheckedInCount += 1;
    }
    metric.attendeeSources[attendee.data.source] += 1;
  }
}

function eventMetricFromEvent(
  event: EventRecord
): EventMetricAccumulator | undefined {
  const capacityLimit = event.data.capacityLimit;
  // An unfinished private event has no honest capacity or rate denominator.
  if (typeof capacityLimit !== "number" ||
      !Number.isInteger(capacityLimit) || capacityLimit < 1) return undefined;
  return {
    eventId: event.id,
    organizerId: event.data.organizerId,
    title: fallbackEventTitle(event),
    startTime: timestampToDate(event.data.startTime) ?? new Date(0),
    status: event.data.status,
    capacityLimit,
    bookedCount: Math.max(0, event.data.bookedCount ?? 0),
    checkedInCount: Math.max(0, event.data.checkedInCount ?? 0),
    waitlistedCount: Math.max(0, event.data.waitlistedCount ?? 0),
    grossRevenueMinor: 0,
    currency: event.data.currency ?? "INR",
    checkoutStartedCount: 0,
    checkoutDropoffCount: 0,
    paymentCompletedCount: 0,
    paymentFailedCount: 0,
    paymentRefundedCount: 0,
    reviewCount: 0,
    ratingTotal: 0,
    verifiedReviewCount: 0,
    publicReviewCount: 0,
    ownerResponseCount: 0,
    demandCount: 0,
    inviteOpenCount: 0,
    mutualMatchCount: 0,
    chatStartedCount: 0,
    repeatAttendeeCount: 0,
    eventSaveCount: 0,
    operationalAttendeeCount: 0,
    operationalCheckedInCount: 0,
    attendeeSources: emptyAttendeeSources(),
  };
}

function emptyAttendeeSources(): Record<
  EventAttendeeDocument["source"], number
  > {
  return {
    catchBooking: 0,
    hostImport: 0,
    hostManual: 0,
    webOtp: 0,
    providerSync: 0,
  };
}

function summarizeEventMetrics(events: EventMetricAccumulator[]) {
  return events.reduce((sum, event) => ({
    booked: sum.booked + event.bookedCount,
    checkedIn: sum.checkedIn + event.checkedInCount,
    revenue: sum.revenue + event.grossRevenueMinor,
    checkoutStarted: sum.checkoutStarted + event.checkoutStartedCount,
    checkoutDropoff: sum.checkoutDropoff + event.checkoutDropoffCount,
    paymentCompleted: sum.paymentCompleted + event.paymentCompletedCount,
    matches: sum.matches + event.mutualMatchCount,
    chats: sum.chats + event.chatStartedCount,
    operationalAttendees:
      sum.operationalAttendees + event.operationalAttendeeCount,
    operationalCheckedIn:
      sum.operationalCheckedIn + event.operationalCheckedInCount,
  }), {
    booked: 0,
    checkedIn: 0,
    revenue: 0,
    checkoutStarted: 0,
    checkoutDropoff: 0,
    paymentCompleted: 0,
    matches: 0,
    chats: 0,
    operationalAttendees: 0,
    operationalCheckedIn: 0,
  });
}

function summarizeReviews(
  rows: HostAnalyticsMartRow[]
): HostAnalyticsCallableResponse["reviewSummary"] {
  const totals = rows.reduce((sum, row) => ({
    reviews: sum.reviews + intValue(row.reviewCount),
    ratingTotal: sum.ratingTotal + Math.max(0, row.ratingTotal),
    verifiedReviews: sum.verifiedReviews + intValue(row.verifiedReviewCount),
    publicReviews: sum.publicReviews + intValue(row.publicReviewCount),
    ownerResponses: sum.ownerResponses + intValue(row.ownerResponseCount),
  }), {
    reviews: 0,
    ratingTotal: 0,
    verifiedReviews: 0,
    publicReviews: 0,
    ownerResponses: 0,
  });

  return {
    newReviews: totals.reviews,
    publishedReviews: totals.reviews,
    verifiedReviews: totals.verifiedReviews,
    publicReviews: totals.publicReviews,
    ownerResponseCount: totals.ownerResponses,
    averageRating: totals.reviews === 0 ?
      0 :
      round(totals.ratingTotal / totals.reviews),
  };
}

function summarizeDiscovery(
  rows: HostAnalyticsMartRow[]
): HostAnalyticsCallableResponse["discoverySummary"] {
  return rows.reduce((sum, row) => ({
    listingViews: sum.listingViews + intValue(row.listingViews),
    searchAppearances: sum.searchAppearances + intValue(row.searchAppearances),
    eventViews: sum.eventViews + intValue(row.eventViews),
    organizerSaves: sum.organizerSaves + intValue(row.organizerSaves),
    eventSaves: sum.eventSaves + intValue(row.eventSaves),
    contactClicks: sum.contactClicks + intValue(row.contactClicks),
    claimClicks: sum.claimClicks + intValue(row.claimClicks),
    outboundClicks: sum.outboundClicks + intValue(row.outboundClicks),
    linkClicks: sum.linkClicks + intValue(row.linkClicks),
  }), {
    listingViews: 0,
    searchAppearances: 0,
    eventViews: 0,
    organizerSaves: 0,
    eventSaves: 0,
    contactClicks: 0,
    claimClicks: 0,
    outboundClicks: 0,
    linkClicks: 0,
  });
}

const trafficSources = ["instagram", "whatsapp", "facebook", "google", "qr",
  "email", "direct", "other"] as const;
type TrafficSource = typeof trafficSources[number];

const linkClicksUnavailable:
  HostAnalyticsCallableResponse["dataQuality"][number] = {
    id: "owner-link-clicks",
    state: "missing",
    detail: "Owner link clicks could not be read from the BigQuery link mart.",
    owner: "Analytics ops",
    runbook: "docs/release_operations.md",
    nextAction: "Deploy the host analytics DDL and refresh the link mart.",
  };

/**
 * Owner link clicks (CAT-254): each link's total, most clicked first, with
 * its current label, and the clicks by where visitors came from.
 * @param {OrganizerRecord[]} organizers Organizers in scope, for current link
 *     labels.
 * @param {HostAnalyticsLinkRow[]} rows Clicks by link and traffic source.
 * @return {HostAnalyticsCallableResponse["linkSummary"]} The roll-up.
 */
function summarizeLinks(
  organizers: OrganizerRecord[],
  rows: HostAnalyticsLinkRow[]
): HostAnalyticsCallableResponse["linkSummary"] {
  // Organizers are read as OrganizerDocument here; ownerLinks is
  // organizer-only.
  const labels = new Map(organizers.flatMap((organizer) =>
    ((organizer.data as Pick<OrganizerDocument, "ownerLinks">).ownerLinks ?? [])
      .map((link): [string, string] => [`${organizer.id}/${link.id}`,
        link.label])));
  const links = new Map<string, {organizerId: string; linkId: string;
    clicks: number}>();
  const sources = new Map<TrafficSource, number>();
  for (const row of rows) {
    const clicks = intValue(row.linkClicks);
    if (clicks === 0) continue;
    const key = `${row.organizerId}/${row.linkId}`;
    const link = links.get(key) ??
      {organizerId: row.organizerId, linkId: row.linkId, clicks: 0};
    link.clicks += clicks;
    links.set(key, link);
    const source = trafficSources.find((name) => name === row.trafficSource) ??
      "other";
    sources.set(source, (sources.get(source) ?? 0) + clicks);
  }
  return {
    links: [...links.entries()]
      .sort(([keyA, a], [keyB, b]) => b.clicks - a.clicks ||
        (keyA < keyB ? -1 : 1))
      .slice(0, 50)
      .map(([key, link]) => ({...link, label: labels.get(key) ?? null})),
    trafficSources: trafficSources
      .filter((source) => sources.has(source))
      .map((source) => ({source, clicks: sources.get(source) ?? 0}))
      .sort((a, b) => b.clicks - a.clicks),
  };
}

function buildTrend(
  rows: HostAnalyticsMartRow[],
  range: AnalyticsRange
): HostAnalyticsCallableResponse["trend"] {
  const buckets = trendBuckets(range);
  for (const row of rows) {
    const rowDate = parseDailyDate(row.date, range.timezone);
    const bucket = bucketFor(buckets, rowDate);
    if (!bucket) continue;
    bucket.metrics.eventCount += row.eventId ? 1 : 0;
    bucket.metrics.bookings += intValue(row.bookedCount);
    bucket.metrics.checkedIn += intValue(row.checkedInCount);
    bucket.metrics.revenueMinor += intValue(row.grossRevenueMinor);
    bucket.metrics.checkoutStarted += intValue(row.checkoutStartedCount);
    bucket.metrics.checkoutDropoff += intValue(row.checkoutDropoffCount);
    bucket.metrics.demand += intValue(row.demandCount);
    bucket.metrics.reviews += intValue(row.reviewCount);
    bucket.metrics.matches += intValue(row.mutualMatchCount);
    bucket.metrics.chats += intValue(row.chatStartedCount);
    bucket.metrics.eventSaves += intValue(row.eventSaves);
    bucket.metrics.listingViews += intValue(row.listingViews);
    bucket.metrics.eventViews += intValue(row.eventViews);
    bucket.metrics.organizerSaves += intValue(row.organizerSaves);
  }
  return buckets.map((bucket) => ({
    periodStart: bucket.periodStart.toISOString(),
    periodEnd: addUtcMilliseconds(bucket.periodEndExclusive, -1)
      .toISOString(),
    metrics: bucket.metrics,
  }));
}

function dataQualityRows(
  rows: HostAnalyticsMartRow[],
  events: EventRecord[],
  operationalAttendees: EventAttendeeRecord[]
): HostAnalyticsCallableResponse["dataQuality"] {
  const discoveryRows = rows.filter((row) =>
    row.listingViews > 0 ||
    row.searchAppearances > 0 ||
    row.eventViews > 0 ||
    row.organizerSaves > 0 ||
    row.eventSaves > 0
  ).length;
  const businessRows = rows.filter((row) =>
    row.bookedCount > 0 ||
    row.checkedInCount > 0 ||
    row.checkoutStartedCount > 0 ||
    row.paymentCompletedCount > 0 ||
    row.reviewCount > 0
  ).length;
  return [
    {
      id: "operational-attendee-roster",
      state: events.length === 0 ? "missing" : "ok",
      detail: operationalAttendees.length === 0 ?
        "The event scope has no operational attendee rows yet." :
        "Roster and attendance counts include every operational source.",
      owner: "Host platform",
      runbook: "docs/data_contracts.md",
      nextAction: operationalAttendees.length === 0 ?
        "Import guests or enable Catch/web registration for this event." :
        "No action; operational roster facts are available.",
    },
    {
      id: "bigquery-host-mart",
      state: rows.length === 0 ? "missing" : "ok",
      detail: rows.length === 0 ?
        "No BigQuery host analytics mart rows were returned for this scope." :
        "Host analytics are served from BigQuery mart rows.",
      owner: "Analytics ops",
      runbook: "docs/release_operations.md",
      nextAction: rows.length === 0 ?
        "Check host analytics export freshness before trusting this scope." :
        "No action; mart rows are available for this scope.",
    },
    {
      id: "client-behavior-events",
      state: discoveryRows === 0 ? "missing" : "ok",
      detail:
        "Listing views, search appearances, event views, saves, and clicks " +
        "come from GA4/direct BigQuery host analytics events.",
      owner: "Data/platform ops",
      runbook: "docs/release_operations.md",
      nextAction: discoveryRows === 0 ?
        "Check GA4/direct event export freshness for public discovery " +
        "signals." :
        "No action; client behavior events are present in the mart.",
    },
    {
      id: "server-business-facts",
      state: businessRows === 0 ? "missing" : "ok",
      detail:
        "Bookings, payments, attendance, reviews, matches, and chats come " +
        "from BigQuery marts derived from server-owned business facts.",
      owner: "Analytics ops",
      runbook: "docs/data_contracts.md",
      nextAction: businessRows === 0 ?
        "Check server fact exports before using business performance metrics." :
        "No action; server business facts are present in the mart.",
    },
    {
      id: "firestore-cache",
      state: "ok",
      detail:
        "Firestore owns authorization, roster, bounded current registration " +
        "outcomes and snapshots; BigQuery owns historical mart aggregates.",
      owner: "Admin platform",
      runbook: "functions/src/analytics/hostAnalytics.ts",
      nextAction:
        "Keep registration reads projected and bounded; distinguish current " +
        "outcomes from historical mart aggregates.",
    },
  ];
}

function metricCard(
  id: string,
  label: string,
  value: number,
  unit: HostAnalyticsCallableResponse["summaryCards"][number]["unit"],
  status: HostAnalyticsCallableResponse["summaryCards"][number]["status"],
  caption: string | null = null,
  previousValue: number | null = null
): HostAnalyticsCallableResponse["summaryCards"][number] {
  return {id, label, value, unit, status, caption, previousValue};
}

function trendBuckets(range: AnalyticsRange): Array<{
  periodStart: Date;
  periodEndExclusive: Date;
  metrics: Record<string, number>;
}> {
  const buckets: Array<{
    periodStart: Date;
    periodEndExclusive: Date;
    metrics: Record<string, number>;
  }> = [];
  let cursor = startOfBucket(
    range.start,
    range.granularity,
    range.timezone
  );
  while (cursor.getTime() < range.endExclusive.getTime()) {
    const next = nextBucket(cursor, range.granularity, range.timezone);
    buckets.push({
      periodStart: maxDate(cursor, range.start),
      periodEndExclusive: minDate(next, range.endExclusive),
      metrics: {
        eventCount: 0,
        bookings: 0,
        checkedIn: 0,
        revenueMinor: 0,
        checkoutStarted: 0,
        checkoutDropoff: 0,
        demand: 0,
        reviews: 0,
        matches: 0,
        chats: 0,
        eventSaves: 0,
        listingViews: 0,
        eventViews: 0,
        organizerSaves: 0,
      },
    });
    cursor = next;
  }
  return buckets;
}

function bucketFor(
  buckets: Array<{
    periodStart: Date;
    periodEndExclusive: Date;
    metrics: Record<string, number>;
  }>,
  date: Date
): {
  periodStart: Date;
  periodEndExclusive: Date;
  metrics: Record<string, number>;
} | null {
  return buckets.find((bucket) =>
    date.getTime() >= bucket.periodStart.getTime() &&
    date.getTime() < bucket.periodEndExclusive.getTime()
  ) ?? null;
}

function resolveScopeEventIds(
  records: AnalyticsRecords,
  rows: HostAnalyticsMartRow[]
): string[] {
  const authorized = records.events.map((event) => event.id);
  if (authorized.length > 0) return uniqueStrings(authorized);
  return uniqueStrings(rows.flatMap((row) =>
    row.eventId ? [row.eventId] : []
  ));
}

function resolveOrganizerName(
  records: AnalyticsRecords,
  rows: HostAnalyticsMartRow[]
): string | null {
  if (records.organizers.length === 1) {
    return records.organizers[0].data.name;
  }
  const rowNames = uniqueStrings(rows.flatMap((row) =>
    row.organizerName ? [row.organizerName] : []
  ));
  return rowNames.length === 1 ? rowNames[0] : null;
}

function resolveEventTitle(
  records: AnalyticsRecords,
  events: EventMetricAccumulator[]
): string | null {
  if (events.length === 1) return events[0].title;
  if (records.events.length === 1) return fallbackEventTitle(records.events[0]);
  return null;
}

function fallbackEventTitle(event: EventRecord | null): string {
  if (!event) return "Event";
  const name = event.data.name?.trim();
  if (name) return name;
  const format = event.data.eventFormat;
  if (!format) return "Event";
  const activity = format.customActivityLabel?.trim() ||
    activityLabel(format.activityKind);
  const date = timestampToDate(event.data.startTime);
  if (!date) return activity;
  return `${activity} · ${date.toISOString().slice(0, 10)}`;
}

function activityLabel(kind: string): string {
  return kind
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (value) => value.toUpperCase());
}

function startOfBucket(
  date: Date,
  granularity: AnalyticsGranularity,
  timezone: string
): Date {
  const parts = zonedDateParts(date, timezone);
  if (granularity === "month") {
    return zonedMidnight(parts.year, parts.month, 1, timezone);
  }
  const start = zonedMidnight(parts.year, parts.month, parts.day, timezone);
  if (granularity === "week") {
    const day = new Date(Date.UTC(parts.year, parts.month - 1, parts.day))
      .getUTCDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    return addZonedDays(start, mondayOffset, timezone);
  }
  return start;
}

function nextBucket(
  date: Date,
  granularity: AnalyticsGranularity,
  timezone: string
): Date {
  if (granularity === "month") {
    const parts = zonedDateParts(date, timezone);
    const nextMonth = new Date(Date.UTC(parts.year, parts.month, 1));
    return zonedMidnight(
      nextMonth.getUTCFullYear(),
      nextMonth.getUTCMonth() + 1,
      1,
      timezone
    );
  }
  return addZonedDays(date, granularity === "week" ? 7 : 1, timezone);
}

function inRange(date: Date, range: AnalyticsRange): boolean {
  return date.getTime() >= range.start.getTime() &&
    date.getTime() < range.endExclusive.getTime();
}

function dailyRowInRange(
  row: HostAnalyticsMartRow,
  range: AnalyticsRange
): boolean {
  return inRange(parseDailyDate(row.date, range.timezone), range);
}

function parseDailyDate(value: string, timezone = "UTC"): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return new Date(0);
  return zonedMidnight(
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
    timezone
  );
}

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const millis = Date.parse(value);
  return Number.isFinite(millis) ? new Date(millis) : null;
}

function percentage(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return round((numerator / denominator) * 100);
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function intValue(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.trunc(value));
}

function timestampToDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const millis = Date.parse(value);
    return Number.isFinite(millis) ? new Date(millis) : null;
  }
  const maybeTimestamp = value as {toDate?: unknown} | null | undefined;
  if (typeof maybeTimestamp?.toDate === "function") {
    const date = maybeTimestamp.toDate() as unknown;
    return date instanceof Date ? date : null;
  }
  return null;
}

function comparisonRange(range: AnalyticsRange): AnalyticsRange {
  const days = calendarDaysBetween(
    range.start,
    range.endExclusive,
    range.timezone
  );
  return {
    start: addZonedDays(range.start, -days, range.timezone),
    endExclusive: range.start,
    granularity: range.granularity,
    preset: null,
    timezone: range.timezone,
  };
}

function resolveTimezone(value: string | undefined): string {
  const timezone = value?.trim() || "UTC";
  try {
    new Intl.DateTimeFormat("en-US", {timeZone: timezone}).format(new Date());
    return timezone;
  } catch {
    throw new HttpsError(
      "invalid-argument",
      "timezone must be a valid IANA zone.",
    );
  }
}

interface ZonedDateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const zonedFormatters = new Map<string, Intl.DateTimeFormat>();

function zonedDateParts(date: Date, timezone: string): ZonedDateParts {
  let formatter = zonedFormatters.get(timezone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      calendar: "gregory",
      numberingSystem: "latn",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    zonedFormatters.set(timezone, formatter);
  }
  const values = Object.fromEntries(
    formatter.formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)])
  );
  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  };
}

function zonedMidnight(
  year: number,
  month: number,
  day: number,
  timezone: string
): Date {
  const targetWallTime = Date.UTC(year, month - 1, day);
  let instant = targetWallTime;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const actual = zonedDateParts(new Date(instant), timezone);
    const actualWallTime = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
      actual.second
    );
    const correction = targetWallTime - actualWallTime;
    instant += correction;
    if (correction === 0) break;
  }
  return new Date(instant);
}

function startOfZonedDay(reference: Date, timezone: string): Date {
  const parts = zonedDateParts(reference, timezone);
  return zonedMidnight(parts.year, parts.month, parts.day, timezone);
}

function addZonedDays(date: Date, days: number, timezone: string): Date {
  const parts = zonedDateParts(date, timezone);
  const target = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  target.setUTCDate(target.getUTCDate() + days);
  return zonedMidnight(
    target.getUTCFullYear(),
    target.getUTCMonth() + 1,
    target.getUTCDate(),
    timezone
  );
}

function parseZonedDate(
  value: string,
  fieldName: string,
  timezone: string
): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    throw new HttpsError("invalid-argument", `${fieldName} is invalid.`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() + 1 !== month ||
    probe.getUTCDate() !== day
  ) {
    throw new HttpsError("invalid-argument", `${fieldName} is invalid.`);
  }
  return zonedMidnight(year, month, day, timezone);
}

function zonedDateKey(date: Date, timezone: string): string {
  const parts = zonedDateParts(date, timezone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-` +
    String(parts.day).padStart(2, "0");
}

function calendarDaysBetween(
  start: Date,
  endExclusive: Date,
  timezone: string
): number {
  const startParts = zonedDateParts(start, timezone);
  const endParts = zonedDateParts(endExclusive, timezone);
  return Math.round((
    Date.UTC(endParts.year, endParts.month - 1, endParts.day) -
    Date.UTC(startParts.year, startParts.month - 1, startParts.day)
  ) / 86400000);
}

function addUtcMilliseconds(date: Date, millis: number): Date {
  return new Date(date.getTime() + millis);
}

function maxDate(a: Date, b: Date): Date {
  return a.getTime() >= b.getTime() ? a : b;
}

function minDate(a: Date, b: Date): Date {
  return a.getTime() <= b.getTime() ? a : b;
}

function defaultGranularity(days: number): AnalyticsGranularity {
  if (days > 120) return "month";
  if (days > 45) return "week";
  return "day";
}

function nullableTrimmedString(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (value === undefined) return undefined;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.length > 0))];
}

function chunkStrings(values: string[], size: number): string[][] {
  const chunks: string[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function adminAnalyticsTargetPath(
  payload: HostAnalyticsQueryCallablePayload
): string {
  if (payload.eventId) return `events/${payload.eventId}/analytics`;
  const organizerId = payload.organizerId;
  if (organizerId) return `organizers/${organizerId}/analytics`;
  return "admin/hostAnalytics";
}

function assertValidResponse(response: HostAnalyticsCallableResponse): void {
  if (validateHostAnalyticsCallableResponse(response)) return;
  const message = (validateHostAnalyticsCallableResponse.errors ?? [])
    .map((error) => `${error.instancePath}: ${error.message}`)
    .join("; ");
  throw new HttpsError(
    "internal",
    `Generated host analytics response failed validation: ${message}`
  );
}
