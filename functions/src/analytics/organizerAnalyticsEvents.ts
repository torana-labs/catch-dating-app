import crypto from "node:crypto";
import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {BigQueryClient, defaultBigQueryClient} from "../shared/bigQuery";
import {checkIpRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import type {OrganizerDocument} from "../shared/generated/firestoreAdminTypes";
import type {
  RecordOrganizerAnalyticsEventCallablePayload,
} from "../shared/generated/recordOrganizerAnalyticsEventCallablePayload";
import type {
  RecordOrganizerAnalyticsEventCallableResponse,
} from "../shared/generated/recordOrganizerAnalyticsEventCallableResponse";
import {
  validateRecordOrganizerAnalyticsEventCallablePayload,
} from
  "../shared/generated/validators/recordOrganizerAnalyticsEventInput";
import {
  assertPublicOrganizerPageEligible,
  normalizePublicWebsitePath,
} from "../shared/publicOrganizerPage";

interface OrganizerAnalyticsDeps {
  firestore: () => FirebaseFirestore.Firestore;
  bigQuery: BigQueryClient;
  now: () => Date;
  randomId: () => string;
  checkIpRateLimit: (
    ip: string,
    maxRequests?: number,
    windowMs?: number
  ) => boolean;
}

const defaultDeps: OrganizerAnalyticsDeps = {
  firestore: () => admin.firestore(),
  bigQuery: defaultBigQueryClient,
  now: () => new Date(),
  randomId: () => crypto.randomUUID(),
  checkIpRateLimit,
};

/**
 * Records one public organizer analytics event into BigQuery.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {OrganizerAnalyticsDeps} deps Injectable dependencies.
 * @return {Promise<RecordOrganizerAnalyticsEventCallableResponse>}
 * Accepted marker.
 */
export async function recordOrganizerAnalyticsEventHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerAnalyticsDeps = defaultDeps
): Promise<RecordOrganizerAnalyticsEventCallableResponse> {
  const payload = validateCallableWithAjv<
    RecordOrganizerAnalyticsEventCallablePayload
  >(
    request,
    validateRecordOrganizerAnalyticsEventCallablePayload,
    normalizePayload
  );
  if (!isPublicId(payload.organizerId) ||
      (payload.eventId && !isPublicId(payload.eventId)) ||
      (payload.clubId && payload.clubId !== payload.organizerId)) {
    throw new HttpsError("invalid-argument", "Invalid analytics scope.");
  }
  const clientIp = clientIpFromRequest(request);
  if (!deps.checkIpRateLimit(clientIp, 120, 60 * 1000)) {
    throw new HttpsError(
      "resource-exhausted",
      "Too many analytics events. Please try again later."
    );
  }

  const db = deps.firestore();
  const organizer = await assertOrganizerScope(db, payload);
  assertLinkScope(organizer, payload);
  // Preview by authenticated canonical staff is never visitor activity.
  if (request.auth && await isOrganizerPreview(db, organizer,
    payload.organizerId, request.auth.uid)) {
    return {accepted: true};
  }
  const organizerId = payload.organizerId;

  const occurredAt = deps.now();
  const scopedSessionHash = sessionHash(
    payload.sessionId ?? null, organizerId, utcDateKey(occurredAt)
  );
  // BigQuery streaming insertId is best effort; the mart must also deduplicate
  // analytics_event_id. Counts are observations, never a purchase authority.
  const isPresenceView = payload.eventName === "listingView" ||
    payload.eventName === "eventView";
  const analyticsEventId = isPresenceView && scopedSessionHash ?
    crypto.createHash("sha256").update(JSON.stringify([
      organizerId, payload.eventId ?? "organizer", payload.eventName,
      utcDateKey(occurredAt), scopedSessionHash,
    ])).digest("hex") : [
      organizerId,
      payload.eventId ?? "organizer",
      payload.eventName,
      occurredAt.getTime(),
      deps.randomId(),
    ].join("_");
  await deps.bigQuery.insertRows(
    hostAnalyticsDataset(),
    hostAnalyticsEventsTable(),
    [{
      insertId: analyticsEventId,
      json: {
        analytics_event_id: analyticsEventId,
        occurred_at: occurredAt.toISOString(),
        event_date: utcDateKey(occurredAt),
        event_name: payload.eventName,
        club_id: organizerId,
        target_event_id: payload.eventId ?? null,
        page_path: normalizePublicWebsitePath(payload.pagePath),
        source: boundedSource(payload.source),
        session_hash: scopedSessionHash,
        platform: ["web", "android", "ios"].includes(payload.platform ?? "") ?
          payload.platform : "web",
        link_id: payload.linkId ?? null,
        traffic_source: payload.trafficSource ?? null,
        ingested_at: occurredAt.toISOString(),
      },
    }]
  );

  return {accepted: true};
}

export const recordOrganizerAnalyticsEvent = onCall(
  appCheckCallableOptions,
  (request) => recordOrganizerAnalyticsEventHandler(request)
);

async function assertOrganizerScope(
  db: FirebaseFirestore.Firestore,
  payload: RecordOrganizerAnalyticsEventCallablePayload
): Promise<OrganizerDocument> {
  const organizerId = payload.organizerId;
  const organizerRef = db.collection("organizers").doc(organizerId);
  const eventRef = payload.eventId ?
    db.collection("events").doc(payload.eventId) :
    null;
  const [organizerSnapshot, eventSnapshot] = await Promise.all([
    organizerRef.get(),
    eventRef ? eventRef.get() : Promise.resolve(null),
  ]);
  if (!organizerSnapshot.exists) {
    throw new HttpsError("not-found", "Organizer not found.");
  }
  const organizer = organizerSnapshot.data() as OrganizerDocument;
  const eventPage = payload.eventId ?
    `/events/${encodeURIComponent(payload.eventId)}/` : null;
  const isEventPage = eventPage !== null &&
    normalizePublicWebsitePath(payload.pagePath) === eventPage;
  assertPublicOrganizerPageEligible(
    organizer,
    {
      allowDirectorySearchPath: payload.eventName === "searchAppearance",
      pagePath: isEventPage ? undefined : payload.pagePath,
    }
  );
  if ((payload.eventName === "eventView" ||
       payload.eventName === "eventSave") && !payload.eventId) {
    throw new HttpsError("invalid-argument", "Event activity needs an event.");
  }
  if (eventSnapshot) {
    const externalSnapshot = !eventSnapshot.exists ?
      await db.collection("externalEvents").doc(payload.eventId!).get() : null;
    const snapshot = eventSnapshot.exists ? eventSnapshot : externalSnapshot!;
    if (!snapshot.exists) {
      throw new HttpsError("not-found", "Event not found.");
    }
    const ownerId = eventSnapshot.exists ?
      snapshot.get("organizerId") ?? snapshot.get("clubId") :
      snapshot.get("canonicalHostId");
    if (ownerId !== organizerId ||
        (eventSnapshot.exists && snapshot.get("organizerId") &&
         snapshot.get("clubId") &&
         snapshot.get("organizerId") !== snapshot.get("clubId"))) {
      throw new HttpsError(
        "invalid-argument", "Event does not belong to that organizer."
      );
    }
    const published = eventSnapshot.exists ?
      snapshot.get("publicationState") === "published" :
      snapshot.get("publicationStatus") === "public";
    if (!published || snapshot.get("status") !== "active") {
      throw new HttpsError(
        "failed-precondition", "This event is not accepting public activity."
      );
    }
  }
  return organizer;
}

/**
 * A link click names one of the organizer's own links (CAT-254), and only
 * link clicks carry a link or a traffic source. The traffic source is the
 * contract's fixed list, so no referrer or campaign text reaches BigQuery.
 * @param {OrganizerDocument} organizer The organizer the event is for.
 * @param {RecordOrganizerAnalyticsEventCallablePayload} payload Event.
 */
function assertLinkScope(
  organizer: OrganizerDocument,
  payload: RecordOrganizerAnalyticsEventCallablePayload
): void {
  if (payload.eventName !== "linkClick") {
    if (payload.linkId || payload.trafficSource) {
      throw new HttpsError("invalid-argument",
        "Only link clicks carry a link or traffic source.");
    }
    return;
  }
  const linkIds = (organizer.ownerLinks ?? []).map((link) => link.id);
  if (!payload.linkId || !linkIds.includes(payload.linkId)) {
    throw new HttpsError("invalid-argument",
      "A link click needs one of the organizer's links.");
  }
}

function normalizePayload(data: unknown): unknown {
  if (data == null || typeof data !== "object" || Array.isArray(data)) {
    return data;
  }
  const input = data as Record<string, unknown>;
  const organizerId = input.organizerId ?? input.clubId;
  return {
    ...input,
    clubId: trimmedString(input.clubId),
    organizerId: trimmedString(organizerId),
    eventId: nullableTrimmedString(input.eventId),
    pagePath: trimmedString(input.pagePath),
    source: nullableTrimmedString(input.source),
    sessionId: nullableTrimmedString(input.sessionId),
    platform: nullableTrimmedString(input.platform),
    linkId: nullableTrimmedString(input.linkId),
    trafficSource: nullableTrimmedString(input.trafficSource),
  };
}

function sessionHash(
  value: string | null, organizerId: string, date: string
): string | null {
  if (!value) return null;
  return crypto.createHash("sha256")
    .update(JSON.stringify([organizerId, date, value])).digest("hex");
}

function utcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function clientIpFromRequest(request: CallableRequest<unknown>): string {
  const forwarded = request.rawRequest.get("x-forwarded-for");
  const firstForwarded = forwarded?.split(",")[0]?.trim();
  return firstForwarded ||
    request.rawRequest.ip ||
    request.rawRequest.socket.remoteAddress ||
    "unknown";
}

function trimmedString(value: unknown): unknown {
  return typeof value === "string" ? value.trim() : value;
}

function nullableTrimmedString(value: unknown): unknown {
  if (value == null) return null;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function hostAnalyticsDataset(): string {
  return process.env.HOST_ANALYTICS_BIGQUERY_DATASET || "catch_analytics";
}

function hostAnalyticsEventsTable(): string {
  return process.env.HOST_ANALYTICS_EVENTS_TABLE || "host_analytics_events";
}

// Do not persist caller supplied URLs, search text, campaign values or PII.
const publicSources = new Set([
  "directory_result", "organizer_page", "organizer_rail", "listing_page",
  "claim_unlocks_panel", "event_success_panel", "catch_event_card",
  "external_event_card", "event_evidence", "event_detail",
  "external_event_source",
  "event_detail_booking", "external_event_booking", "source_socialProfile",
  "source_bookingPlatform",
  "source_website", "source_eventListing", "source_eventPlatform",
]);

function boundedSource(value: string | null | undefined): string | null {
  return value && publicSources.has(value) ? value : null;
}

function organizerManagerIds(organizer: OrganizerDocument): string[] {
  return [organizer.ownerUserId, organizer.hostUserId,
    ...(organizer.hostUserIds ?? []),
    ...(organizer.hostProfiles ?? []).map((host) => host.uid)]
    .filter((uid): uid is string => typeof uid === "string");
}

function isPublicId(value: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9_-]{0,179}$/u.test(value);
}

async function isOrganizerPreview(
  db: FirebaseFirestore.Firestore, organizer: OrganizerDocument,
  organizerId: string, uid: string
): Promise<boolean> {
  if (organizerManagerIds(organizer).includes(uid)) return true;
  const membership = await db.collection("organizerTeamMemberships")
    .doc(`${organizerId}_${uid}`).get();
  return membership.exists && membership.get("organizerId") === organizerId &&
    membership.get("uid") === uid && membership.get("status") === "active" &&
    ["owner", "manager"].includes(membership.get("role"));
}
