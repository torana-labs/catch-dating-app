import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {requireAuth} from "../shared/auth";
import {requireAdminRole} from "../admin/adminAuth";
import {writeAdminAuditLog} from "../admin/adminAudit";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import type {
  UserAnalyticsQueryCallablePayload,
} from "../shared/generated/userAnalyticsQueryCallablePayload";
import type {
  UserAnalyticsCallableResponse,
} from "../shared/generated/userAnalyticsCallableResponse";
import {
  validateUserAnalyticsCallableResponse,
} from "../shared/generated/validators/userAnalyticsOutput";
import {
  validateUserAnalyticsQueryCallablePayload,
} from "../shared/generated/validators/userAnalyticsQueryInput";
import {
  defaultUserAnalyticsBigQuerySource,
  UserAnalyticsBigQuerySource,
  UserAnalyticsMartRow,
} from "./userAnalyticsBigQuery";

type AnalyticsGranularity = "day" | "week" | "month";

interface UserAnalyticsDeps {
  firestore: () => FirebaseFirestore.Firestore;
  now: () => Date;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  bigQuerySource: UserAnalyticsBigQuerySource;
  checkRateLimit?: typeof defaultCheckRateLimit;
}

interface AnalyticsRange {
  start: Date;
  endExclusive: Date;
  granularity: AnalyticsGranularity;
  preset: string | null;
}

interface UserAnalyticsRecords {
  uid: string;
  martRows: UserAnalyticsMartRow[];
}

interface UserAnalyticsTotals {
  eventsBooked: number;
  eventsAttended: number;
  outgoingLikes: number;
  incomingLikes: number;
  privateInterestSent: number;
  privateInterestReceived: number;
  matches: number;
  chatsStartedSent: number;
  chatsStartedReceived: number;
  chatMessagesSent: number;
  chatMessagesReceived: number;
  feedbackSubmitted: number;
  profileViews: number;
  uniqueProfileViewers: number;
  profileDwellSeconds: number;
  photoImpressions: number;
  photoDwellSeconds: number;
  topPhotoId: string | null;
  activeMinutes: number;
  appEvents: number;
  dataCompletenessScore: number;
}

const defaultDeps: UserAnalyticsDeps = {
  firestore: () => admin.firestore(),
  now: () => new Date(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  bigQuerySource: defaultUserAnalyticsBigQuerySource,
  checkRateLimit: defaultCheckRateLimit,
};

/**
 * Returns user-safe aggregate analytics for the signed-in user.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {UserAnalyticsDeps} deps Injectable dependencies.
 * @return {Promise<UserAnalyticsCallableResponse>} User analytics payload.
 */
export async function getUserAnalyticsHandler(
  request: CallableRequest<unknown>,
  deps: UserAnalyticsDeps = defaultDeps
): Promise<UserAnalyticsCallableResponse> {
  const uid = requireAuth(request);
  const payload = validateAnalyticsPayload(request);
  if (payload.userId && payload.userId !== uid) {
    throw new HttpsError(
      "permission-denied",
      "User analytics can only be read by that user."
    );
  }
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, uid, "getUserAnalytics", {
    maxRequests: 30, windowMs: 60 * 1000,
  });
  return loadUserAnalytics(uid, payload, deps.now(), deps);
}

/**
 * Returns user-safe aggregate analytics for admin dashboard readers.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {UserAnalyticsDeps} deps Injectable dependencies.
 * @return {Promise<UserAnalyticsCallableResponse>} User analytics payload.
 */
export async function adminGetUserAnalyticsHandler(
  request: CallableRequest<unknown>,
  deps: UserAnalyticsDeps = defaultDeps
): Promise<UserAnalyticsCallableResponse> {
  const adminContext = requireAdminRole(
    request,
    ["adminOwner"]
  );
  const payload = validateAnalyticsPayload(request);
  if (!payload.userId) {
    throw new HttpsError(
      "invalid-argument",
      "adminGetUserAnalytics requires userId."
    );
  }
  const db = deps.firestore();
  await deps.checkRateLimit?.(
    db,
    adminContext.uid,
    "adminGetUserAnalytics",
    {maxRequests: 30, windowMs: 60 * 1000}
  );
  const response = await loadUserAnalytics(
    payload.userId,
    payload,
    deps.now(),
    deps
  );
  await writeAdminAuditLog(db, adminContext, {
    action: "adminGetUserAnalytics",
    targetPath: `users/${payload.userId}/analytics`,
    request,
    serverTimestamp: deps.serverTimestamp,
  });
  return response;
}

export const getUserAnalytics = onCall(appCheckCallableOptions, (request) =>
  getUserAnalyticsHandler(request)
);

export const adminGetUserAnalytics = onCall(
  appCheckCallableOptions,
  (request) => adminGetUserAnalyticsHandler(request)
);

/**
 * Resolves an analytics range from a callable payload.
 * @param {UserAnalyticsQueryCallablePayload} payload Analytics query payload.
 * @param {Date} now Current time.
 * @return {AnalyticsRange} Inclusive start and exclusive end range.
 */
export function resolveUserAnalyticsRange(
  payload: UserAnalyticsQueryCallablePayload,
  now: Date
): AnalyticsRange {
  const preset = payload.rangePreset ?? "30d";
  const today = startOfUtcDay(now);
  let start = new Date(today);
  let endExclusive = addUtcDays(today, 1);

  if (preset === "7d") {
    start = addUtcDays(today, -6);
  } else if (preset === "30d") {
    start = addUtcDays(today, -29);
  } else if (preset === "90d") {
    start = addUtcDays(today, -89);
  } else if (preset === "month") {
    start = new Date(Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      1
    ));
  } else if (preset === "custom") {
    if (!payload.startDate || !payload.endDate) {
      throw new HttpsError(
        "invalid-argument",
        "Custom analytics ranges require startDate and endDate."
      );
    }
    start = parseUtcDate(payload.startDate, "startDate");
    endExclusive = addUtcDays(parseUtcDate(payload.endDate, "endDate"), 1);
  }

  if (endExclusive.getTime() <= start.getTime()) {
    throw new HttpsError(
      "invalid-argument",
      "Analytics endDate must be on or after startDate."
    );
  }

  const rangeDays = Math.ceil(
    (endExclusive.getTime() - start.getTime()) / 86400000
  );
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
  };
}

/**
 * Builds a user-safe aggregate response from BigQuery rows.
 * @param {UserAnalyticsRecords} records Authorized user + rows.
 * @param {AnalyticsRange} range Analytics time range.
 * @param {Date} now Current time.
 * @return {UserAnalyticsCallableResponse} Aggregate response.
 */
export function buildUserAnalyticsFromRecords(
  records: UserAnalyticsRecords,
  range: AnalyticsRange,
  now: Date
): UserAnalyticsCallableResponse {
  const rows = records.martRows.filter((row) => dailyRowInRange(row, range));
  const totals = summarizeRows(rows);
  const sourceStatus = rows.length === 0 ? "missing" : "ready";
  const response: UserAnalyticsCallableResponse = {
    generatedAt: now.toISOString(),
    timezone: "UTC",
    range: {
      startDate: range.start.toISOString(),
      endDate: addUtcMilliseconds(range.endExclusive, -1).toISOString(),
      granularity: range.granularity,
      preset: range.preset,
    },
    scope: {
      userId: records.uid,
    },
    summaryCards: [
      metricCard(
        "profileViews",
        "Profile views",
        totals.profileViews,
        "count",
        exposureStatus(totals, sourceStatus),
        "Post-event profile views captured by Catch."
      ),
      metricCard(
        "caughtYou",
        "Caught you",
        totals.incomingLikes + totals.privateInterestReceived,
        "count",
        sourceStatus,
        "People who showed interest after an event."
      ),
      metricCard(
        "mutualCatches",
        "Mutual catches",
        totals.matches,
        "count",
        sourceStatus
      ),
      metricCard(
        "chatsStarted",
        "Chats started",
        totals.chatsStartedSent + totals.chatsStartedReceived,
        "count",
        sourceStatus
      ),
      metricCard(
        "eventsAttended",
        "Events attended",
        totals.eventsAttended,
        "count",
        sourceStatus
      ),
      metricCard(
        "followThroughRate",
        "Follow-through",
        percentage(
          totals.chatsStartedSent + totals.chatsStartedReceived,
          totals.matches
        ),
        "percent",
        sourceStatus
      ),
    ],
    trend: buildTrend(rows, range),
    connectionSummary: {
      outgoingLikes: totals.outgoingLikes,
      incomingLikes: totals.incomingLikes,
      privateInterestReceived: totals.privateInterestReceived,
      mutualCatches: totals.matches,
      chatsStarted: totals.chatsStartedSent + totals.chatsStartedReceived,
      chatMessagesSent: totals.chatMessagesSent,
      followThroughRate: percentage(
        totals.chatsStartedSent + totals.chatsStartedReceived,
        totals.matches
      ),
      eventsAttended: totals.eventsAttended,
    },
    profileSummary: {
      profileViews: totals.profileViews,
      uniqueViewers: totals.uniqueProfileViewers,
      profileDwellSeconds: totals.profileDwellSeconds,
      photoImpressions: totals.photoImpressions,
      topPhotoId: totals.topPhotoId,
      activeMinutes: totals.activeMinutes,
    },
    coachingTipRefs: coachingTips(totals),
    dataQuality: dataQualityRows(rows, totals),
  };
  assertValidResponse(response);
  return response;
}

async function loadUserAnalytics(
  uid: string,
  payload: UserAnalyticsQueryCallablePayload,
  now: Date,
  deps: UserAnalyticsDeps
): Promise<UserAnalyticsCallableResponse> {
  const range = resolveUserAnalyticsRange(payload, now);
  const martRows = await deps.bigQuerySource.loadRows(
    {
      startDate: dateKey(range.start),
      endDate: dateKey(addUtcMilliseconds(range.endExclusive, -1)),
    },
    {uid},
  );
  return buildUserAnalyticsFromRecords({uid, martRows}, range, now);
}

function validateAnalyticsPayload(
  request: CallableRequest<unknown>
): UserAnalyticsQueryCallablePayload {
  return validateCallableWithAjv<UserAnalyticsQueryCallablePayload>(
    request,
    validateUserAnalyticsQueryCallablePayload,
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
    userId: nullableTrimmedString(input.userId),
    startDate: nullableTrimmedString(input.startDate),
    endDate: nullableTrimmedString(input.endDate),
  };
}

function summarizeRows(rows: UserAnalyticsMartRow[]): UserAnalyticsTotals {
  const topPhoto = rows
    .filter((row) => row.topPhotoId != null)
    .sort((a, b) => b.topPhotoScore - a.topPhotoScore)[0];
  const totals = rows.reduce<UserAnalyticsTotals>((acc, row) => {
    acc.eventsBooked += positiveInt(row.eventsBookedCount);
    acc.eventsAttended += positiveInt(row.eventsAttendedCount);
    acc.outgoingLikes += positiveInt(row.outgoingLikeCount);
    acc.incomingLikes += positiveInt(row.incomingLikeCount);
    acc.privateInterestSent += positiveInt(row.privateInterestSentCount);
    acc.privateInterestReceived += positiveInt(
      row.privateInterestReceivedCount
    );
    acc.matches += positiveInt(row.matchCount);
    acc.chatsStartedSent += positiveInt(row.chatStartedSentCount);
    acc.chatsStartedReceived += positiveInt(row.chatStartedReceivedCount);
    acc.chatMessagesSent += positiveInt(row.chatMessageSentCount);
    acc.chatMessagesReceived += positiveInt(row.chatMessageReceivedCount);
    acc.feedbackSubmitted += positiveInt(row.feedbackSubmittedCount);
    acc.profileViews += positiveInt(row.profileViewCount);
    acc.uniqueProfileViewers += positiveInt(row.uniqueProfileViewerCount);
    acc.profileDwellSeconds += Math.round(
      positiveInt(row.profileDwellMs) / 1000
    );
    acc.photoImpressions += positiveInt(row.photoImpressionCount);
    acc.photoDwellSeconds += Math.round(positiveInt(row.photoDwellMs) / 1000);
    acc.activeMinutes += positiveInt(row.appActiveMinutes);
    acc.appEvents += positiveInt(row.appEventCount);
    acc.dataCompletenessScore = Math.max(
      acc.dataCompletenessScore,
      Math.max(0, row.dataCompletenessScore)
    );
    return acc;
  }, emptyTotals());
  totals.topPhotoId = topPhoto?.topPhotoId ?? null;
  return totals;
}

function emptyTotals(): UserAnalyticsTotals {
  return {
    eventsBooked: 0,
    eventsAttended: 0,
    outgoingLikes: 0,
    incomingLikes: 0,
    privateInterestSent: 0,
    privateInterestReceived: 0,
    matches: 0,
    chatsStartedSent: 0,
    chatsStartedReceived: 0,
    chatMessagesSent: 0,
    chatMessagesReceived: 0,
    feedbackSubmitted: 0,
    profileViews: 0,
    uniqueProfileViewers: 0,
    profileDwellSeconds: 0,
    photoImpressions: 0,
    photoDwellSeconds: 0,
    topPhotoId: null,
    activeMinutes: 0,
    appEvents: 0,
    dataCompletenessScore: 0,
  };
}

function buildTrend(
  rows: UserAnalyticsMartRow[],
  range: AnalyticsRange
): UserAnalyticsCallableResponse["trend"] {
  const buckets = new Map<string, UserAnalyticsTotals>();
  for (const row of rows) {
    const bucketStart = bucketStartDate(parseDailyDate(row.date), range);
    const key = bucketStart.toISOString();
    const totals = buckets.get(key) ?? emptyTotals();
    totals.eventsAttended += positiveInt(row.eventsAttendedCount);
    totals.incomingLikes += positiveInt(row.incomingLikeCount);
    totals.privateInterestReceived += positiveInt(
      row.privateInterestReceivedCount
    );
    totals.matches += positiveInt(row.matchCount);
    totals.chatsStartedSent += positiveInt(row.chatStartedSentCount);
    totals.chatsStartedReceived += positiveInt(row.chatStartedReceivedCount);
    totals.profileViews += positiveInt(row.profileViewCount);
    buckets.set(key, totals);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, totals]) => {
      const start = new Date(key);
      return {
        periodStart: start.toISOString(),
        periodEnd: bucketEndDate(start, range.granularity).toISOString(),
        metrics: {
          profileViews: totals.profileViews,
          caughtYou: totals.incomingLikes + totals.privateInterestReceived,
          mutualCatches: totals.matches,
          chatsStarted:
            totals.chatsStartedSent + totals.chatsStartedReceived,
          eventsAttended: totals.eventsAttended,
        },
      };
    });
}

function coachingTips(
  totals: UserAnalyticsTotals
): UserAnalyticsCallableResponse["coachingTipRefs"] {
  const tips: UserAnalyticsCallableResponse["coachingTipRefs"] = [];
  if (totals.profileViews === 0) {
    tips.push(tip("profileAnalyticsGrowing", 1, ["profileViews"]));
  } else if (totals.incomingLikes + totals.privateInterestReceived === 0) {
    tips.push(tip("refreshProfilePrompts", 1, ["caughtYou", "profileViews"]));
  }
  if (totals.matches > 0 &&
      totals.chatsStartedSent + totals.chatsStartedReceived === 0) {
    tips.push(tip("startFirstChat", 2, ["mutualCatches", "chatsStarted"]));
  }
  if (totals.eventsAttended === 0) {
    tips.push(tip("showUpToEvents", 3, ["eventsAttended"]));
  } else {
    tips.push(tip("keepShowingUp", 3, ["eventsAttended", "mutualCatches"]));
  }
  return tips.slice(0, 4);
}

function tip(
  copyKey: string,
  priority: number,
  metricIds: string[]
): UserAnalyticsCallableResponse["coachingTipRefs"][number] {
  return {
    id: copyKey,
    copyKey,
    priority,
    metricIds,
  };
}

function dataQualityRows(
  rows: UserAnalyticsMartRow[],
  totals: UserAnalyticsTotals
): UserAnalyticsCallableResponse["dataQuality"] {
  if (rows.length === 0) {
    return [
      {
        id: "user-analytics-mart",
        state: "missing",
        detail: "No user analytics rows are available for this range yet.",
      },
    ];
  }
  return [
    {
      id: "participant-signals",
      state: totals.outgoingLikes + totals.incomingLikes + totals.matches +
          totals.chatsStartedSent + totals.chatsStartedReceived > 0 ?
        "ok" :
        "partial",
      detail: "Likes, matches, chats, attendance, and feedback use " +
        "participant signal facts.",
    },
    {
      id: "profile-exposure",
      state: totals.profileViews + totals.photoImpressions > 0 ?
        "ok" :
        "partial",
      detail: "Profile view and photo performance events are available as " +
        "aggregate-only warehouse events.",
    },
    {
      id: "app-engagement",
      state: totals.activeMinutes > 0 ? "ok" : "partial",
      detail: "App active minutes depend on GA4 export rows with Firebase " +
        "user IDs.",
    },
  ];
}

function exposureStatus(
  totals: UserAnalyticsTotals,
  fallback: "ready" | "missing"
): "ready" | "partial" | "missing" {
  if (fallback === "missing") return "missing";
  return totals.profileViews + totals.photoImpressions > 0 ?
    "ready" :
    "partial";
}

function metricCard(
  id: string,
  label: string,
  value: number,
  unit: "count" | "percent" | "duration_seconds",
  status: "ready" | "partial" | "missing",
  caption?: string
): UserAnalyticsCallableResponse["summaryCards"][number] {
  return {
    id,
    label,
    value: round(value),
    unit,
    status,
    ...(caption ? {caption} : {}),
  };
}

function dailyRowInRange(
  row: UserAnalyticsMartRow,
  range: AnalyticsRange
): boolean {
  const date = parseDailyDate(row.date);
  return date.getTime() >= range.start.getTime() &&
    date.getTime() < range.endExclusive.getTime();
}

function bucketStartDate(date: Date, range: AnalyticsRange): Date {
  if (range.granularity === "month") {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  }
  if (range.granularity === "week") {
    const day = date.getUTCDay();
    return addUtcDays(date, day === 0 ? -6 : 1 - day);
  }
  return date;
}

function bucketEndDate(start: Date, granularity: AnalyticsGranularity): Date {
  if (granularity === "month") {
    return new Date(Date.UTC(
      start.getUTCFullYear(),
      start.getUTCMonth() + 1,
      1
    ));
  }
  if (granularity === "week") return addUtcDays(start, 7);
  return addUtcDays(start, 1);
}

function defaultGranularity(rangeDays: number): AnalyticsGranularity {
  if (rangeDays > 90) return "month";
  if (rangeDays > 31) return "week";
  return "day";
}

function parseUtcDate(value: string, field: string): Date {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== value) {
    throw new HttpsError("invalid-argument", `Invalid ${field}.`);
  }
  return parsed;
}

function parseDailyDate(value: string): Date {
  return parseUtcDate(value.slice(0, 10), "date");
}

function startOfUtcDay(value: Date): Date {
  return new Date(Date.UTC(
    value.getUTCFullYear(),
    value.getUTCMonth(),
    value.getUTCDate()
  ));
}

function addUtcDays(value: Date, days: number): Date {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function addUtcMilliseconds(value: Date, ms: number): Date {
  return new Date(value.getTime() + ms);
}

function dateKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function percentage(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return round((numerator / denominator) * 100);
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function positiveInt(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.trunc(value));
}

function nullableTrimmedString(value: unknown): string | null | undefined {
  if (value === null || value === undefined) return value;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function assertValidResponse(response: UserAnalyticsCallableResponse): void {
  if (!validateUserAnalyticsCallableResponse(response)) {
    const detail = (validateUserAnalyticsCallableResponse.errors ?? [])
      .map((error) => `${error.instancePath}: ${error.message}`)
      .join("; ");
    throw new HttpsError(
      "internal",
      `User analytics response failed schema validation. ${detail}`
    );
  }
}
