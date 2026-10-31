import {onCall, CallableRequest} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {appCheckCallableOptions} from "../shared/callableOptions";
import type {ExternalEventDocument} from
  "../shared/generated/firestoreAdminTypes";
import type {AdminListExternalEventDetailsCallablePayload} from
  "../shared/generated/adminListExternalEventDetailsCallablePayload";
import {
  validateAdminListExternalEventDetailsCallablePayload,
} from
  "../shared/generated/validators/adminListExternalEventDetailsInput";
import {requireDoc, validateCallableWithAjv} from "../shared/validation";
import {requireAdminRole} from "./adminAuth";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";

const externalEventDetailsRoles = ["admin", "adminOwner", "support"] as const;
type EventListTimeWindow = "upcoming" | "past" | "all";

interface ExternalEventDetailsDeps {
  firestore: () => FirebaseFirestore.Firestore;
  now?: () => Date;
  checkRateLimit?: typeof defaultCheckRateLimit;
}

const defaultDeps: ExternalEventDetailsDeps = {
  firestore: () => admin.firestore(),
  now: () => new Date(),
  checkRateLimit: defaultCheckRateLimit,
};

export interface AdminExternalEventListRow {
  eventId: string;
  targetPath: string;
  canonicalHostId: string;
  title: string;
  startTime: string | null;
  endTime: string | null;
  timezone: string | null;
  meetingPoint: string;
  citySlug: string | null;
  countryCode: string | null;
  activityKind: ExternalEventDocument["activity"]["activityKind"];
  interactionModel: ExternalEventDocument["activity"]["interactionModel"];
  activitySource: ExternalEventDocument["activity"]["source"];
  priceDisplayText: string | null;
  parsedPriceInPaise: number | null;
  currency: string;
  status: ExternalEventDocument["status"];
  publicationStatus: ExternalEventDocument["publicationStatus"];
  availability: ExternalEventDocument["discovery"]["availability"];
  platform: ExternalEventDocument["externalSource"]["platform"];
  sourceEventKey: string;
  candidateId: string;
  eventUrl: string | null;
  sourceUrl: string | null;
  externalLinkCount: number;
  primaryExternalUrl: string | null;
  normalizedEventKey: string;
  primaryCandidateId: string;
  duplicateCandidateCount: number;
  importPolicyAcknowledged: boolean;
  ownerSafeCopyReviewed: boolean;
  reviewBatchId: string | null;
  reviewer: string | null;
  decidedAt: string | null;
}

export interface AdminListExternalEventDetailsResponse {
  generatedAt: string;
  rows: AdminExternalEventListRow[];
}

/**
 * Lists read-only external event supply from externalEvents/{eventId}.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {ExternalEventDetailsDeps} deps Injectable dependencies.
 * @return {Promise<AdminListExternalEventDetailsResponse>} External rows.
 */
export async function adminListExternalEventDetailsHandler(
  request: CallableRequest<unknown>,
  deps: ExternalEventDetailsDeps = defaultDeps
): Promise<AdminListExternalEventDetailsResponse> {
  const adminContext = requireAdminRole(request, externalEventDetailsRoles);
  const data =
    validateCallableWithAjv<AdminListExternalEventDetailsCallablePayload>(
      request,
      validateAdminListExternalEventDetailsCallablePayload,
      normalizeAdminListExternalEventDetailsPayload
    );
  const db = deps.firestore();
  await deps.checkRateLimit?.(
    db,
    adminContext.uid,
    "adminListExternalEventDetails",
    {maxRequests: 60, windowMs: 60 * 1000}
  );

  const limit = clampLimit(data.limit);
  const queryText = normalizeSearchText(data.query);
  const timeWindow = normalizeTimeWindow(data.timeWindow);
  const now = deps.now?.() ?? new Date();
  let query: FirebaseFirestore.Query = db.collection("externalEvents");
  if (data.citySlug) {
    query = query.where("discovery.citySlug", "==", data.citySlug);
  } else if (data.citySlugs && data.citySlugs.length > 0) {
    query = query.where("discovery.citySlug", "in", data.citySlugs);
  }
  if (data.publicationStatus) {
    query = query.where("publicationStatus", "==", data.publicationStatus);
  }
  if (data.status) query = query.where("status", "==", data.status);
  query = applyTimeWindow(query, timeWindow, now);

  const snapshot = await query
    .limit(queryLimitForSearch(limit, queryText.length > 0))
    .get();
  const rows = snapshot.docs
    .map((doc) => publicExternalEventListRow(
      doc.id,
      requireDoc<ExternalEventDocument>(doc, "ExternalEventDocument")
    ))
    .filter((row) => externalEventListRowMatchesQuery(row, queryText))
    .sort((a, b) => compareExternalEventRows(a, b, timeWindow))
    .slice(0, limit);

  return {
    generatedAt: now.toISOString(),
    rows,
  };
}

/**
 * Builds a compact external event row from ExternalEventDocument.
 * @param {string} docId Firestore document id.
 * @param {ExternalEventDocument} event External event document.
 * @return {AdminExternalEventListRow} List row.
 */
function publicExternalEventListRow(
  docId: string,
  event: ExternalEventDocument
): AdminExternalEventListRow {
  const primaryLink =
    event.booking.externalLinks.find((link) => link.primary) ??
    event.booking.externalLinks[0] ??
    null;
  return {
    eventId: event.eventId || docId,
    targetPath: `externalEvents/${docId}`,
    canonicalHostId: event.canonicalHostId,
    title: event.title,
    startTime: timestampIso(event.startTime),
    endTime: timestampIso(event.endTime),
    timezone: event.timezone,
    meetingPoint: event.meetingPoint,
    citySlug: event.discovery.citySlug ?? null,
    countryCode: event.discovery.countryCode,
    activityKind: event.activity.activityKind,
    interactionModel: event.activity.interactionModel,
    activitySource: event.activity.source,
    priceDisplayText: event.price.displayText,
    parsedPriceInPaise: event.price.parsedPriceInPaise,
    currency: event.price.currency,
    status: event.status,
    publicationStatus: event.publicationStatus,
    availability: event.discovery.availability,
    platform: event.externalSource.platform,
    sourceEventKey: event.externalSource.sourceEventKey,
    candidateId: event.externalSource.candidateId,
    eventUrl: event.externalSource.eventUrl,
    sourceUrl: event.externalSource.sourceUrl,
    externalLinkCount: event.booking.externalLinks.length,
    primaryExternalUrl: primaryLink?.url ?? null,
    normalizedEventKey: event.dedupe.normalizedEventKey,
    primaryCandidateId: event.dedupe.primaryCandidateId,
    duplicateCandidateCount: event.dedupe.duplicateCandidateIds.length,
    importPolicyAcknowledged: event.review.importPolicyAcknowledged,
    ownerSafeCopyReviewed: event.review.ownerSafeCopyReviewed,
    reviewBatchId: event.review.eventReviewBatchId,
    reviewer: event.review.reviewer,
    decidedAt: event.review.decidedAt,
  };
}

/**
 * Normalizes external event list filters before schema validation.
 * @param {unknown} value Raw payload.
 * @return {unknown} Normalized payload.
 */
function normalizeAdminListExternalEventDetailsPayload(
  value: unknown
): unknown {
  if (value === undefined || value === null) return {};
  if (typeof value !== "object" || Array.isArray(value)) return value;
  const data = value as Record<string, unknown>;
  return {
    ...data,
    query: normalizeNullableString(data.query),
    citySlug: normalizeNullableString(data.citySlug),
    citySlugs: normalizeCitySlugs(data.citySlugs),
    publicationStatus: normalizeNullableString(data.publicationStatus),
    status: normalizeNullableString(data.status),
    timeWindow: normalizeNullableString(data.timeWindow),
  };
}

/**
 * Trims nullable strings and converts blanks to null.
 * @param {unknown} value Raw value.
 * @return {unknown} Normalized nullable string.
 */
function normalizeNullableString(value: unknown): unknown {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

/**
 * Normalizes bounded multi-city list filters.
 * @param {unknown} value Raw citySlugs payload.
 * @return {unknown} Unique normalized city slugs or validation passthrough.
 */
function normalizeCitySlugs(value: unknown): unknown {
  if (value === undefined || value === null) return null;
  if (!Array.isArray(value)) return value;
  return Array.from(new Set(
    value
      .map((item) => normalizeNullableString(item))
      .filter((item): item is string => typeof item === "string")
  ));
}

/**
 * Bounds list limit.
 * @param {number | undefined} value Raw limit.
 * @return {number} Safe limit.
 */
function clampLimit(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 50;
  return Math.max(1, Math.min(100, Math.trunc(value)));
}

/**
 * Returns query limit for normal and text-filtered list calls.
 * @param {number} limit Requested limit.
 * @param {boolean} hasSearchQuery Whether text search is active.
 * @return {number} Firestore limit.
 */
function queryLimitForSearch(limit: number, hasSearchQuery: boolean): number {
  if (hasSearchQuery) return Math.min(500, Math.max(limit * 10, limit));
  return Math.min(250, Math.max(limit * 4, limit));
}

/**
 * Normalizes free-text search.
 * @param {string | null | undefined} value Raw query.
 * @return {string} Query.
 */
function normalizeSearchText(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

/**
 * Returns a stable time window default.
 * @param {string | null | undefined} value Raw time window.
 * @return {EventListTimeWindow} Time window.
 */
function normalizeTimeWindow(
  value: string | null | undefined
): EventListTimeWindow {
  if (value === "upcoming" || value === "past") return value;
  return "all";
}

/**
 * Applies server-side external event time ordering/windowing.
 * @param {FirebaseFirestore.Query} query Query.
 * @param {EventListTimeWindow} timeWindow Time window.
 * @param {Date} now Stable callable clock for windowing and snapshot metadata.
 * @return {FirebaseFirestore.Query} Query.
 */
function applyTimeWindow(
  query: FirebaseFirestore.Query,
  timeWindow: EventListTimeWindow,
  now: Date
): FirebaseFirestore.Query {
  if (timeWindow === "upcoming") {
    return query
      .where("startTime", ">=", now)
      .orderBy("startTime", "asc");
  }
  if (timeWindow === "past") {
    return query
      .where("startTime", "<", now)
      .orderBy("startTime", "desc");
  }
  return query.orderBy("startTime", "asc");
}

/**
 * Compares external rows with the same ordering as the server query.
 * @param {AdminExternalEventListRow} a First row.
 * @param {AdminExternalEventListRow} b Second row.
 * @param {EventListTimeWindow} timeWindow Time window.
 * @return {number} Sort result.
 */
function compareExternalEventRows(
  a: AdminExternalEventListRow,
  b: AdminExternalEventListRow,
  timeWindow: EventListTimeWindow
): number {
  const aTime = a.startTime ?? "";
  const bTime = b.startTime ?? "";
  const timeCompare = aTime.localeCompare(bTime);
  if (timeCompare !== 0) {
    return timeWindow === "past" ? -timeCompare : timeCompare;
  }
  return a.title.localeCompare(b.title);
}

/**
 * Applies deterministic text matching after Firestore candidate retrieval.
 * @param {AdminExternalEventListRow} row External event row.
 * @param {string} query Query text.
 * @return {boolean} Whether row matches.
 */
function externalEventListRowMatchesQuery(
  row: AdminExternalEventListRow,
  query: string
): boolean {
  if (!query) return true;
  const haystack = [
    row.eventId,
    row.targetPath,
    row.canonicalHostId,
    row.canonicalHostId,
    row.title,
    row.citySlug,
    row.countryCode,
    row.meetingPoint,
    row.activityKind,
    row.interactionModel,
    row.publicationStatus,
    row.status,
    row.platform,
    row.sourceEventKey,
    row.candidateId,
    row.normalizedEventKey,
  ]
    .filter((item): item is string => typeof item === "string")
    .join(" ")
    .toLowerCase();
  return query
    .split(/\s+/u)
    .filter(Boolean)
    .every((token) => haystack.includes(token));
}

/**
 * Serializes Firestore timestamps for admin UI transport.
 * @param {unknown} value Timestamp-like value.
 * @return {string | null} ISO string.
 */
function timestampIso(value: unknown): string | null {
  if (!value) return null;
  const timestamp = value as {
    toDate?: () => Date;
    toMillis?: () => number;
  };
  if (typeof timestamp.toDate === "function") {
    return timestamp.toDate().toISOString();
  }
  if (typeof timestamp.toMillis === "function") {
    return new Date(timestamp.toMillis()).toISOString();
  }
  if (value instanceof Date) return value.toISOString();
  return null;
}

export const adminListExternalEventDetails = onCall(
  appCheckCallableOptions,
  (request) => adminListExternalEventDetailsHandler(request)
);
