import {onCall, CallableRequest, HttpsError} from
  "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {appCheckCallableOptions} from "../shared/callableOptions";
import type {
  OrganizerDocument,
  EventDocument,
  EventFormatSnapshot,
} from "../shared/generated/firestoreAdminTypes";
import type {AdminGetEventDetailsCallablePayload} from
  "../shared/generated/adminGetEventDetailsCallablePayload";
import type {AdminListEventDetailsCallablePayload} from
  "../shared/generated/adminListEventDetailsCallablePayload";
import type {AdminUpdateEventDetailsCallablePayload} from
  "../shared/generated/adminUpdateEventDetailsCallablePayload";
import {
  validateAdminGetEventDetailsCallablePayload,
} from "../shared/generated/validators/adminGetEventDetailsInput";
import {
  validateAdminListEventDetailsCallablePayload,
} from "../shared/generated/validators/adminListEventDetailsInput";
import {
  validateAdminUpdateEventDetailsCallablePayload,
} from "../shared/generated/validators/adminUpdateEventDetailsInput";
import {requireDoc, validateCallableWithAjv} from "../shared/validation";
import {requireAdminRole} from "./adminAuth";
import {setAdminAuditLogInTransaction} from "./adminAudit";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {eventDiscoveryProjection} from "../events/eventDiscoveryProjection";
import {isConfiguredEvent,
  type ConfiguredEventDocument} from "../events/configuredEvent";
import {
  buildEventAdminSearchProjection,
  eventAdminSearchQueryTokens,
  eventFormatLabel,
  eventTitleLabel,
  eventWithAdminFieldsForSearch,
} from "./eventAdminSearch";
import {
  crossPathsPilotEventEnabled,
  crossPathsPilotMarketId,
  crossPathsPilotMaximumEvents,
  crossPathsPilotMinimumEventLeadMillis,
} from "../crossPaths/pilotPolicy";

import {HOST_PILOT_REVIEWS, HOST_ACTIVATIONS, nextPilotReview} from
  "../acquisition/pilotActivation";
import type {HostPilotEventReviewDocument} from
  "../shared/generated/hostPilotEventReviewDocument";

const eventDetailsRoles = ["admin", "adminOwner", "support"] as const;
type EventListTimeWindow = "upcoming" | "past" | "all";

interface EventDetailsDeps {
  firestore: () => FirebaseFirestore.Firestore;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  now?: () => Date;
  checkRateLimit?: typeof defaultCheckRateLimit;
}

const defaultDeps: EventDetailsDeps = {
  firestore: () => admin.firestore(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  now: () => new Date(),
  checkRateLimit: defaultCheckRateLimit,
};

type EventDetailsPatch = AdminUpdateEventDetailsCallablePayload["fields"];
type AdminRichEventDocument = ConfiguredEventDocument &
  Required<Pick<EventDocument, "description" | "distanceKm" | "pace">>;

function isAdminRichEvent(
  event: EventDocument
): event is AdminRichEventDocument {
  return isConfiguredEvent(event) &&
    typeof event.description === "string" &&
    Number.isFinite(event.distanceKm) &&
    typeof event.pace === "string";
}

function requireAdminRichEvent(event: EventDocument): AdminRichEventDocument {
  if (!isAdminRichEvent(event)) {
    throw new HttpsError("failed-precondition",
      "Complete event setup before using admin event details.");
  }
  return event;
}

export interface AdminEventDetailsSnapshot {
  hostActivation?: {activatedAt: number; eventId: string} | null;
  hostPilotReview?: {realEvent: boolean; revision: number;
    reviewedAt: number} | null;
  eventId: string;
  organizerId: string;
  organizerName: string | null;
  title: string;
  startTime: string | null;
  endTime: string | null;
  meetingPoint: string;
  locationDetails: string | null;
  description: string;
  photoUrl: string | null;
  eventFormat: {
    version: number;
    activityKind: EventFormatSnapshot["activityKind"];
    interactionModel: EventFormatSnapshot["interactionModel"];
    customActivityLabel: string | null;
    label: string;
  };
  distanceKm: number;
  pace: EventDocument["pace"];
  capacityLimit: number;
  bookedCount: number;
  checkedInCount: number;
  waitlistedCount: number;
  crossPathsDiscoveryEnabled: boolean;
  priceInPaise: number;
  currency: string;
  status: EventDocument["status"];
  cancellationReason: string | null;
  discovery: {
    citySlug: string | null;
    activityKind: string | null;
    availability: string | null;
    hasOpenSpots: boolean | null;
    inviteRequired: boolean | null;
    membershipRequired: boolean | null;
    manualApprovalRequired: boolean | null;
    minAge: number | null;
    maxAge: number | null;
  };
  searchIndexStatus: "missing" | "indexed";
}

export interface AdminEventListRow {
  eventId: string;
  organizerId: string;
  organizerName: string | null;
  title: string;
  activityKind: EventFormatSnapshot["activityKind"];
  activityLabel: string;
  startTime: string | null;
  citySlug: string | null;
  meetingPoint: string;
  status: EventDocument["status"];
  availability: string | null;
  crossPathsDiscoveryEnabled: boolean;
  bookedCount: number;
  capacityLimit: number;
  priceInPaise: number;
  currency: string;
  searchIndexStatus: "missing" | "indexed";
}

export interface AdminGetEventDetailsResponse {
  event: AdminEventDetailsSnapshot;
}

export interface AdminListEventDetailsResponse {
  generatedAt: string;
  rows: AdminEventListRow[];
}

export interface AdminUpdateEventDetailsResponse {
  eventId: string;
  updatedFieldCount: number;
}

/**
 * Lists canonical app events from events/{eventId}.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {EventDetailsDeps} deps Injectable dependencies.
 * @return {Promise<AdminListEventDetailsResponse>} Event rows.
 */
export async function adminListEventDetailsHandler(
  request: CallableRequest<unknown>,
  deps: EventDetailsDeps = defaultDeps
): Promise<AdminListEventDetailsResponse> {
  const adminContext = requireAdminRole(request, eventDetailsRoles);
  const data = validateCallableWithAjv<AdminListEventDetailsCallablePayload>(
    request,
    validateAdminListEventDetailsCallablePayload,
    normalizeAdminListEventDetailsPayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, adminContext.uid, "adminListEventDetails", {
    maxRequests: 60, windowMs: 60 * 1000,
  });

  const limit = clampLimit(data.limit);
  const queryText = normalizeSearchText(data.query);
  const searchTokens = eventAdminSearchQueryTokens(queryText);
  const hasSearchQuery = searchTokens.length > 0;
  const timeWindow = normalizeTimeWindow(data.timeWindow);
  const now = deps.now?.() ?? new Date();
  let query: FirebaseFirestore.Query = db.collection("events");
  if (hasSearchQuery) {
    query = query.where(
      "adminSearch.tokens",
      "array-contains-any",
      searchTokens
    );
  }
  const organizerId = data.organizerId;
  if (organizerId) query = query.where("organizerId", "==", organizerId);
  if (data.citySlug) {
    query = query.where("discoveryMarketId", "==", data.citySlug);
  } else if (data.citySlugs && data.citySlugs.length > 0) {
    query = query.where("discoveryMarketId", "in", data.citySlugs);
  }
  if (data.activityKind) {
    query = query.where("discoveryActivityKind", "==", data.activityKind);
  }
  if (data.status) query = query.where("status", "==", data.status);
  query = applyTimeWindow(query, timeWindow, now);
  const snapshot = await query
    .limit(queryLimitForSearch(limit, hasSearchQuery))
    .get();
  const events = snapshot.docs.map((doc) => ({
    eventId: doc.id,
    event: requireDoc<EventDocument>(doc, "EventDocument"),
  })).filter((row): row is {eventId: string;
    event: AdminRichEventDocument} => isAdminRichEvent(row.event));
  const organizerNames = await loadOrganizerNames(
    db,
    events.map((row) => row.event.organizerId)
  );
  const rows = events
    .map(({eventId, event}) =>
      publicEventListRow(
        eventId,
        event,
        organizerNames.get(event.organizerId) ?? null
      ))
    .filter((row) => eventListRowMatchesQuery(row, queryText))
    .sort((a, b) => compareEventRows(a, b, timeWindow))
    .slice(0, limit);
  return {
    generatedAt: now.toISOString(),
    rows,
  };
}

/**
 * Loads an admin-safe canonical event snapshot.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {EventDetailsDeps} deps Injectable dependencies.
 * @return {Promise<AdminGetEventDetailsResponse>} Event snapshot.
 */
export async function adminGetEventDetailsHandler(
  request: CallableRequest<unknown>,
  deps: EventDetailsDeps = defaultDeps
): Promise<AdminGetEventDetailsResponse> {
  const adminContext = requireAdminRole(request, eventDetailsRoles);
  const data = validateCallableWithAjv<AdminGetEventDetailsCallablePayload>(
    request,
    validateAdminGetEventDetailsCallablePayload,
    normalizeAdminGetEventDetailsPayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, adminContext.uid, "adminGetEventDetails", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  const eventSnap = await db.collection("events").doc(data.eventId).get();
  if (!eventSnap.exists) {
    throw new HttpsError("not-found", "Event not found.");
  }
  const event = requireAdminRichEvent(
    requireDoc<EventDocument>(eventSnap, "EventDocument"));
  const organizer = await loadOrganizer(db, event.organizerId);
  const review = (await db.collection(HOST_PILOT_REVIEWS)
    .doc(data.eventId).get()).data() as
      HostPilotEventReviewDocument | undefined;
  const activation = (await db.collection(HOST_ACTIVATIONS)
    .doc(event.organizerId).get()).data();
  return {
    event: {...publicEventDetails(data.eventId, event, organizer?.name ?? null),
      hostActivation: activation ? {activatedAt: activation.activatedAt,
        eventId: activation.eventId} : null,
      hostPilotReview: review ? {realEvent: review.realEvent,
        revision: review.revision, reviewedAt: review.reviewedAt} : null},
  };
}

/**
 * Applies audited low-risk admin edits to a canonical event.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {EventDetailsDeps} deps Injectable dependencies.
 * @return {Promise<AdminUpdateEventDetailsResponse>} Save summary.
 */
export async function adminUpdateEventDetailsHandler(
  request: CallableRequest<unknown>,
  deps: EventDetailsDeps = defaultDeps
): Promise<AdminUpdateEventDetailsResponse> {
  const adminContext = requireAdminRole(request, eventDetailsRoles);
  const data =
    validateCallableWithAjv<AdminUpdateEventDetailsCallablePayload>(
      request,
      validateAdminUpdateEventDetailsCallablePayload,
      normalizeAdminUpdateEventDetailsPayload
    );
  const rawPatch = buildFirestorePatch(data.fields);
  const pilotReview = data.fields.hostPilotReview;
  const editableFieldCount = Object.keys(rawPatch).length +
    (pilotReview ? 1 : 0);
  if (pilotReview && !adminContext.roles.some((role) =>
    role === "admin" || role === "adminOwner")) {
    throw new HttpsError("permission-denied",
      "Admin or Admin Owner access is required to review a real pilot event.");
  }
  if (editableFieldCount === 0) {
    throw new HttpsError("invalid-argument", "No editable fields supplied.");
  }
  if (!data.reviewNote) {
    throw new HttpsError(
      "invalid-argument",
      "A review note is required for audited event edits."
    );
  }
  if (
    rawPatch.crossPathsDiscoveryEnabled !== undefined &&
    !adminContext.roles.some((role) =>
      role === "admin" || role === "adminOwner"
    )
  ) {
    throw new HttpsError(
      "permission-denied",
      "Admin or Admin Owner access is required to change the Cross Paths pilot."
    );
  }

  const db = deps.firestore();
  await deps.checkRateLimit?.(db, adminContext.uid, "adminUpdateEventDetails", {
    maxRequests: 30, windowMs: 60 * 1000,
  });
  const eventRef = db.collection("events").doc(data.eventId);
  await db.runTransaction(async (tx) => {
    const eventSnap = await tx.get(eventRef);
    if (!eventSnap.exists) {
      throw new HttpsError("not-found", "Event not found.");
    }
    const before = requireAdminRichEvent(
      requireDoc<EventDocument>(eventSnap, "EventDocument"));
    if (before.status === "cancelled") {
      throw new HttpsError(
        "failed-precondition",
        "Cancelled events cannot be edited from admin details."
      );
    }
    const organizerRef = db.collection("organizers")
      .doc(before.organizerId);
    const selectedPilotEventsSnap =
      rawPatch.crossPathsDiscoveryEnabled === true ?
        await tx.get(db.collection("events")
          .where("crossPathsDiscoveryEnabled", "==", true)
          .limit(crossPathsPilotMaximumEvents + 1)) :
        null;
    const organizerSnap = await tx.get(organizerRef);
    const organizer = organizerSnap.exists ?
      requireDoc<OrganizerDocument>(organizerSnap, "OrganizerDocument") :
      null;
    if (rawPatch.crossPathsDiscoveryEnabled === true) {
      assertCrossPathsPilotEventCanBeEnabled({
        eventId: data.eventId,
        event: before,
        selectedEvents: selectedPilotEventsSnap?.docs ?? [],
        nowMillis: (deps.now?.() ?? new Date()).getTime(),
      });
    }
    const reviewRef = db.collection(HOST_PILOT_REVIEWS).doc(data.eventId);
    const previousReview = pilotReview ? await tx.get(reviewRef) : null;
    let reviewed: HostPilotEventReviewDocument | undefined;
    if (pilotReview) {
      const restriction = await tx.get(db.collection("salesPrivacyRestrictions")
        .doc(before.organizerId));
      if (restriction.exists) {
        throw new HttpsError("failed-precondition",
          "This organiser is restricted for private Sales processing.");
      }
      try {
        reviewed = nextPilotReview({eventId: data.eventId,
          organizerId: before.organizerId,
          realEvent: pilotReview.realEvent,
          expectedRevision: pilotReview.expectedRevision,
          current: previousReview?.data() as
            HostPilotEventReviewDocument | undefined,
          actorUid: adminContext.uid,
          now: (deps.now?.() ?? new Date()).getTime()});
      } catch {
        throw new HttpsError("failed-precondition",
          "Pilot review changed. Reload the event before reviewing.");
      }
    }
    const patch = mergeEventDetailsPatch(before, rawPatch);
    const nextEvent = eventWithAdminFieldsForSearch(before, patch);
    const fullPatch: Record<string, unknown> = {
      ...patch,
      ...eventDiscoveryProjection({
        event: nextEvent,
        organizerLocation: organizer?.location,
        organizerLocationMarketId: organizer?.locationMarketId,
      }),
      adminSearch: buildEventAdminSearchProjection(
        data.eventId,
        nextEvent,
        organizer,
        deps.serverTimestamp(),
        "adminUpdateEventDetails"
      ),
    };
    if (reviewed) tx.set(reviewRef, reviewed);
    if (Object.keys(rawPatch).length > 0) tx.update(eventRef, fullPatch);
    setAdminAuditLogInTransaction(tx, db, adminContext, {
      action: "adminUpdateEventDetails",
      targetPath: eventRef.path,
      request,
      before: {
        event: publicEventDetails(data.eventId, before, organizer?.name ??
            null),
      },
      after: {
        eventId: data.eventId,
        updatedFields: Object.keys(rawPatch).sort(),
        ...(reviewed ? {hostPilotReview: {realEvent: reviewed.realEvent,
          revision: reviewed.revision}} : {}),
      },
      note: data.reviewNote,
      serverTimestamp: deps.serverTimestamp,
    });
  });

  return {eventId: data.eventId, updatedFieldCount: editableFieldCount};
}

/**
 * Builds a compact event row from EventDocument.
 * @param {string} eventId Firestore document id.
 * @param {EventDocument} event Canonical event.
 * @param {string | null} organizerName Organizer name.
 * @return {AdminEventListRow} List row.
 */
function publicEventListRow(
  eventId: string,
  event: AdminRichEventDocument,
  organizerName: string | null
): AdminEventListRow {
  return {
    eventId,
    organizerId: event.organizerId,
    organizerName,
    title: eventTitleLabel(event),
    activityKind: event.eventFormat.activityKind,
    activityLabel: eventFormatLabel(event.eventFormat),
    startTime: timestampIso(event.startTime),
    citySlug: event.discoveryMarketId ?? null,
    meetingPoint: event.meetingPoint,
    status: event.status,
    availability: event.discoveryAvailability ?? null,
    crossPathsDiscoveryEnabled: event.crossPathsDiscoveryEnabled === true,
    bookedCount: event.bookedCount ?? 0,
    capacityLimit: event.capacityLimit,
    priceInPaise: event.priceInPaise,
    currency: event.currency ?? "INR",
    searchIndexStatus: (event.adminSearch?.tokens?.length ?? 0) > 0 ?
      "indexed" :
      "missing",
  };
}

/**
 * Builds the admin UI snapshot from EventDocument.
 * @param {string} eventId Firestore document id.
 * @param {EventDocument} event Canonical event.
 * @param {string | null} organizerName Organizer name.
 * @return {AdminEventDetailsSnapshot} Event details.
 */
function publicEventDetails(
  eventId: string,
  event: AdminRichEventDocument,
  organizerName: string | null
): AdminEventDetailsSnapshot {
  return {
    eventId,
    organizerId: event.organizerId,
    organizerName,
    title: eventTitleLabel(event),
    startTime: timestampIso(event.startTime),
    endTime: timestampIso(event.endTime),
    meetingPoint: event.meetingPoint,
    locationDetails: event.locationDetails ?? null,
    description: event.description,
    photoUrl: event.photoUrl ?? null,
    eventFormat: {
      version: event.eventFormat.version,
      activityKind: event.eventFormat.activityKind,
      interactionModel: event.eventFormat.interactionModel,
      customActivityLabel: event.eventFormat.customActivityLabel ?? null,
      label: eventFormatLabel(event.eventFormat),
    },
    distanceKm: event.distanceKm,
    pace: event.pace,
    capacityLimit: event.capacityLimit,
    bookedCount: event.bookedCount ?? 0,
    checkedInCount: event.checkedInCount ?? 0,
    waitlistedCount: event.waitlistedCount ?? 0,
    crossPathsDiscoveryEnabled: event.crossPathsDiscoveryEnabled === true,
    priceInPaise: event.priceInPaise,
    currency: event.currency ?? "INR",
    status: event.status,
    cancellationReason: event.cancellationReason ?? null,
    discovery: {
      citySlug: event.discoveryMarketId ?? null,
      activityKind: event.discoveryActivityKind ?? null,
      availability: event.discoveryAvailability ?? null,
      hasOpenSpots: event.discoveryHasOpenSpots ?? null,
      inviteRequired: event.discoveryInviteRequired ?? null,
      membershipRequired: event.discoveryMembershipRequired ?? null,
      manualApprovalRequired: event.discoveryManualApprovalRequired ?? null,
      minAge: event.discoveryMinAge ?? null,
      maxAge: event.discoveryMaxAge ?? null,
    },
    searchIndexStatus: (event.adminSearch?.tokens?.length ?? 0) > 0 ?
      "indexed" :
      "missing",
  };
}

/**
 * Converts safe admin event fields into a Firestore update patch.
 * @param {EventDetailsPatch} fields Validated fields.
 * @return {Record<string, unknown>} Firestore patch.
 */
function buildFirestorePatch(
  fields: EventDetailsPatch
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  copyDefined(patch, fields, [
    "description",
    "photoUrl",
    "distanceKm",
    "pace",
    "crossPathsDiscoveryEnabled",
    "eventFormat",
  ]);
  return patch;
}

function assertCrossPathsPilotEventCanBeEnabled(params: {
  eventId: string;
  event: EventDocument;
  selectedEvents: FirebaseFirestore.QueryDocumentSnapshot[];
  nowMillis: number;
}) {
  const {eventId, event, selectedEvents, nowMillis} = params;
  const eventStartMillis = timestampMillis(event.startTime);
  if (
    event.status !== "active" ||
    eventStartMillis === null ||
    eventStartMillis <= nowMillis + crossPathsPilotMinimumEventLeadMillis
  ) {
    throw new HttpsError(
      "failed-precondition",
      "Select only active Cross Paths pilot events at least six hours ahead."
    );
  }
  if (event.discoveryMarketId !== crossPathsPilotMarketId) {
    throw new HttpsError(
      "failed-precondition",
      "The initial Cross Paths pilot is limited to Mumbai events."
    );
  }
  const otherActivePilotEvents = selectedEvents.filter((snapshot) => {
    if (snapshot.id === eventId) return false;
    const selected = snapshot.data() as EventDocument;
    const selectedStartMillis = timestampMillis(selected.startTime);
    return selected.status === "active" &&
      selectedStartMillis !== null &&
      selectedStartMillis > nowMillis &&
      crossPathsPilotEventEnabled(selected);
  });
  if (otherActivePilotEvents.length >= crossPathsPilotMaximumEvents) {
    throw new HttpsError(
      "resource-exhausted",
      `The Mumbai pilot is limited to ${crossPathsPilotMaximumEvents} ` +
        "upcoming selected events."
    );
  }
}

/**
 * Merges admin event edits with fields the admin form does not own.
 * @param {EventDocument} before Existing canonical event.
 * @param {Record<string, unknown>} rawPatch Validated admin patch.
 * @return {Record<string, unknown>} Firestore patch.
 */
function mergeEventDetailsPatch(
  before: EventDocument,
  rawPatch: Record<string, unknown>
): Record<string, unknown> {
  const patch = {...rawPatch};
  const eventFormat = rawPatch.eventFormat;
  if (eventFormat && typeof eventFormat === "object") {
    const mergedFormat = {
      ...before.eventFormat,
      ...(eventFormat as Record<string, unknown>),
    };
    if (
      !Object.prototype.hasOwnProperty.call(
        eventFormat,
        "customActivityLabel"
      )
    ) {
      delete (mergedFormat as Record<string, unknown>).customActivityLabel;
    }
    patch.eventFormat = mergedFormat;
  }
  return patch;
}

/**
 * Copies defined fields into the patch.
 * @param {Record<string, unknown>} patch Output patch.
 * @param {Record<string, unknown>} source Source object.
 * @param {string[]} keys Keys to copy.
 */
function copyDefined(
  patch: Record<string, unknown>,
  source: Record<string, unknown>,
  keys: string[]
) {
  for (const key of keys) {
    if (source[key] !== undefined) patch[key] = source[key];
  }
}

/**
 * Loads a club document if present.
 * @param {FirebaseFirestore.Firestore} db Firestore database.
 * @param {string} organizerId Club id.
 * @return {Promise<OrganizerDocument | null>} Club or null.
 */
async function loadOrganizer(
  db: FirebaseFirestore.Firestore,
  organizerId: string
): Promise<OrganizerDocument | null> {
  const snap = await db.collection("organizers").doc(organizerId).get();
  return snap.exists ? requireDoc<OrganizerDocument>(snap,
    "OrganizerDocument") : null;
}

/**
 * Loads organizer names for list rows.
 * @param {FirebaseFirestore.Firestore} db Firestore database.
 * @param {string[]} organizerIds Club ids.
 * @return {Promise<Map<string, string>>} Club id to name.
 */
async function loadOrganizerNames(
  db: FirebaseFirestore.Firestore,
  organizerIds: string[]
): Promise<Map<string, string>> {
  const uniqueIds = Array.from(new Set(organizerIds.filter(Boolean))).slice(0,
    100);
  const entries = await Promise.all(uniqueIds.map(async (organizerId) => {
    const organizer = await loadOrganizer(db, organizerId);
    return [organizerId, organizer?.name ?? null] as const;
  }));
  return new Map(entries.flatMap(([organizerId, name]) =>
    name ? [[organizerId, name] as const] : []
  ));
}

/**
 * Normalizes the get payload before schema validation.
 * @param {unknown} value Raw payload.
 * @return {unknown} Normalized payload.
 */
function normalizeAdminGetEventDetailsPayload(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const data = value as Record<string, unknown>;
  return {...data, eventId: normalizeString(data.eventId)};
}

/**
 * Normalizes event list filters before schema validation.
 * @param {unknown} value Raw payload.
 * @return {unknown} Normalized payload.
 */
function normalizeAdminListEventDetailsPayload(value: unknown): unknown {
  if (value === undefined || value === null) return {};
  if (typeof value !== "object" || Array.isArray(value)) return value;
  const data = value as Record<string, unknown>;
  return {
    ...data,
    query: normalizeNullableString(data.query),
    organizerId: normalizeNullableString(data.organizerId),
    citySlug: normalizeNullableMarketId(data.citySlug),
    citySlugs: normalizeCityMarketIds(data.citySlugs),
    activityKind: normalizeNullableString(data.activityKind),
    status: normalizeNullableString(data.status),
    timeWindow: normalizeNullableString(data.timeWindow),
  };
}

/**
 * Normalizes admin event edit payloads before schema validation.
 * @param {unknown} value Raw payload.
 * @return {unknown} Normalized payload.
 */
function normalizeAdminUpdateEventDetailsPayload(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const data = value as Record<string, unknown>;
  const fields = data.fields && typeof data.fields === "object" ?
    data.fields as Record<string, unknown> :
    data.fields;
  return {
    ...data,
    eventId: normalizeString(data.eventId),
    reviewNote: normalizeNullableString(data.reviewNote),
    fields: fields && typeof fields === "object" ?
      normalizeEventDetailsFields(fields as Record<string, unknown>) :
      fields,
  };
}

/**
 * Normalizes editable event fields.
 * @param {Record<string, unknown>} fields Raw fields.
 * @return {Record<string, unknown>} Normalized fields.
 */
function normalizeEventDetailsFields(
  fields: Record<string, unknown>
): Record<string, unknown> {
  return {
    ...fields,
    description: normalizeString(fields.description),
    photoUrl: normalizeOptionalNullableString(fields.photoUrl),
    eventFormat: fields.eventFormat &&
      typeof fields.eventFormat === "object" ?
      normalizeEventFormat(fields.eventFormat as Record<string, unknown>) :
      fields.eventFormat,
  };
}

/**
 * Normalizes event format text fields.
 * @param {Record<string, unknown>} format Event format payload.
 * @return {Record<string, unknown>} Normalized format.
 */
function normalizeEventFormat(
  format: Record<string, unknown>
): Record<string, unknown> {
  const customActivityLabel =
    normalizeNullableString(format.customActivityLabel);
  return {
    ...format,
    activityKind: normalizeString(format.activityKind),
    interactionModel: normalizeString(format.interactionModel),
    customActivityLabel: customActivityLabel === null ?
      undefined :
      customActivityLabel,
  };
}

/**
 * Trims a string field.
 * @param {unknown} value Raw value.
 * @return {unknown} Trimmed value.
 */
function normalizeString(value: unknown): unknown {
  return typeof value === "string" ? value.trim() : value;
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
 * Trims optional nullable strings without inventing absent fields.
 * @param {unknown} value Raw value.
 * @return {unknown} Normalized optional nullable string.
 */
function normalizeOptionalNullableString(value: unknown): unknown {
  if (value === undefined) return undefined;
  return normalizeNullableString(value);
}

/**
 * Normalizes a canonical market id while preserving schema failures.
 * @param {unknown} value Raw market id.
 * @return {unknown} Normalized market id, null, or validation passthrough.
 */
function normalizeNullableMarketId(value: unknown): unknown {
  const normalized = normalizeNullableString(value);
  return typeof normalized === "string" ? normalized.toLowerCase() : normalized;
}

/**
 * Normalizes bounded multi-market list filters.
 * @param {unknown} value Raw citySlugs payload containing market ids.
 * @return {unknown} Unique normalized market ids or validation passthrough.
 */
function normalizeCityMarketIds(value: unknown): unknown {
  if (value === undefined || value === null) return null;
  if (!Array.isArray(value)) return value;
  return Array.from(new Set(
    value
      .map((item) => normalizeNullableMarketId(item))
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
 * Returns query limit for normal and token-search list calls.
 * @param {number} limit Requested limit.
 * @param {boolean} hasSearchQuery Whether token search is active.
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
 * Applies server-side event time ordering/windowing.
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
 * Compares event rows with the same ordering as the server query.
 * @param {AdminEventListRow} a First row.
 * @param {AdminEventListRow} b Second row.
 * @param {EventListTimeWindow} timeWindow Time window.
 * @return {number} Sort result.
 */
function compareEventRows(
  a: AdminEventListRow,
  b: AdminEventListRow,
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
 * @param {AdminEventListRow} row Event row.
 * @param {string} query Query text.
 * @return {boolean} Whether row matches.
 */
function eventListRowMatchesQuery(
  row: AdminEventListRow,
  query: string
): boolean {
  if (!query) return true;
  const haystack = [
    row.eventId,
    row.organizerId,
    row.organizerName,
    row.title,
    row.activityKind,
    row.activityLabel,
    row.citySlug,
    row.meetingPoint,
    row.status,
    row.availability,
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

function timestampMillis(value: unknown): number | null {
  if (value instanceof Date) return value.getTime();
  const toMillis = (value as {toMillis?: unknown} | null)?.toMillis;
  return typeof toMillis === "function" ?
    (toMillis as () => number).call(value) : null;
}

export const adminListEventDetails = onCall(
  appCheckCallableOptions,
  (request) => adminListEventDetailsHandler(request)
);

export const adminGetEventDetails = onCall(
  appCheckCallableOptions,
  (request) => adminGetEventDetailsHandler(request)
);

export const adminUpdateEventDetails = onCall(
  appCheckCallableOptions,
  (request) => adminUpdateEventDetailsHandler(request)
);
