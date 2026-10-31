import {assertValidEventItinerary} from "../event_itinerary";
import {HttpsError} from "firebase-functions/v2/https";
import type {EventDocument, OrganizerDocument} from
  "../../shared/generated/firestoreAdminTypes";
import {validateEventDocument} from
  "../../shared/generated/validators/eventDocument";
import {isEventPolicyTerms, isEventTimeRange, isRuntimeVenueEvent,
  requireConfiguredEvent} from "../configuredEvent";
import {eventDiscoveryProjection} from "../eventDiscoveryProjection";

export const publicationRequirementIds = ["futureActive", "organizerVisibility",
  "duration", "venue", "format", "description", "admissionTerms",
  "distancePace", "contract"] as const;
export type PublicationRequirement = typeof publicationRequirementIds[number];

/** Visibility changes close registration and invalidate stale enables. */
export function publicationRegistrationPatch(event: EventDocument):
  Partial<EventDocument> {
  const revision = event.publicRegistrationRevision ?? 0;
  if (!Number.isSafeInteger(revision) || revision < 0 ||
      revision >= Number.MAX_SAFE_INTEGER) {
    throw new HttpsError("failed-precondition",
      "Event registration needs review.");
  }
  return {publicRegistrationEnabled: false, publicRegistrationMode: "closed",
    publicRegistrationRevision: revision + 1};
}

/** Same candidate projection and validation for manager preview and commit. */
export function preparePublishedEventPatch(params: {
  event: EventDocument;
  organizer: OrganizerDocument;
  nowMillis: number;
  timestampFromMillis: (value: number) => FirebaseFirestore.Timestamp;
}): Partial<EventDocument> {
  const {event, organizer, nowMillis, timestampFromMillis} = params;
  if (!Number.isSafeInteger(nowMillis) || event.status !== "active" ||
      !Number.isFinite(event.startTime?.toMillis?.()) ||
      event.startTime.toMillis() <= nowMillis ||
      organizer.appVisibility !== "discoverable") {
    throw new HttpsError("failed-precondition",
      "Publishing needs a future active event and visible organizer.");
  }
  const configured = requireConfiguredEvent({
    ...event, description: event.description ?? "",
  });
  assertValidEventItinerary({itinerary: configured.itinerary,
    startTimeMillis: configured.startTime.toMillis(),
    endTimeMillis: configured.endTime.toMillis(),
    eventFormat: configured.eventFormat});
  const patch: Partial<EventDocument> = {
    ...publicationRegistrationPatch(event),
    ...(event.description === undefined ? {description: ""} : {}),
    ...eventDiscoveryProjection({event: configured,
      organizerLocationMarketId: event.eventMarketId}),
    ...(event.firstPublishedAt === undefined ?
      {firstPublishedAt: timestampFromMillis(nowMillis)} : {}),
  };
  if (!validateEventDocument({...event, ...patch,
    publicationState: "published", publicRegistrationEnabled: false,
    publicRegistrationMode: "closed"})) {
    throw new HttpsError("failed-precondition",
      "Complete the event details and admission terms before publishing.");
  }
  return patch;
}

/** Current readiness is advisory: commit rechecks authority and schedule. */
export function eventPublicationReadiness(params:
  Parameters<typeof preparePublishedEventPatch>[0]
): {canPublish: boolean; missing: PublicationRequirement[]} {
  const {event, organizer, nowMillis} = params;
  if (event.publicationState === "published") {
    return {canPublish: false, missing: []};
  }
  const missing: PublicationRequirement[] = [];
  if (event.status !== "active" ||
      !Number.isFinite(event.startTime?.toMillis?.()) ||
      event.startTime.toMillis() <= nowMillis) missing.push("futureActive");
  if (organizer.appVisibility !== "discoverable") {
    missing.push("organizerVisibility");
  }
  if (!isEventTimeRange(event)) missing.push("duration");
  if (!event.meetingLocation || !event.meetingPoint) missing.push("venue");
  if (!event.eventFormat) missing.push("format");
  if (!isEventPolicyTerms(event)) missing.push("admissionTerms");
  if (event.distanceKm === undefined || event.pace === undefined) {
    missing.push("distancePace");
  }
  if (missing.length > 0) return {canPublish: false, missing};
  try {
    preparePublishedEventPatch(params);
    if (!isRuntimeVenueEvent(event)) {
      return {canPublish: false,
        missing: ["venue"]};
    }
    return {canPublish: true, missing: []};
  } catch (error) {
    if (!(error instanceof HttpsError) ||
        !["failed-precondition", "invalid-argument"].includes(error.code)) {
      throw error;
    }
    return {canPublish: false, missing: ["contract"]};
  }
}
