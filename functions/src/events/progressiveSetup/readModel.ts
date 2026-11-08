import {Timestamp} from "firebase-admin/firestore";
import {HttpsError} from "firebase-functions/v2/https";
import {validateEventDocument} from
  "../../shared/generated/validators/eventDocument";
import {validateOrganizerDocument} from
  "../../shared/generated/validators/organizerDocument";
import type {EventDocument, HostEventSetupViewDocument, OrganizerDocument} from
  "../../shared/generated/firestoreAdminTypes";
import {eventPolicyFromEvent} from "../eventPolicy";
import {isEventPolicyTerms} from "../configuredEvent";
import {eventPublicationReadiness} from "./publicationReadiness";
import {projectEventPreferences} from "./preferences";

export type PrivateEventSetupSummary =
  NonNullable<HostEventSetupViewDocument["summary"]>;

/** The source documents one setup view is evaluated from. */
export type EventSetupViewSource = "events" | "eventSetupPreferences" |
  "organizers";

/**
 * A source document that cannot produce a manager projection. The evaluator
 * records it on the view instead of throwing, so a trigger never retries
 * forever on data only a new write can fix.
 */
export class EventSetupSourceInvalidError extends Error {
  constructor(readonly source: EventSetupViewSource, readonly detail: string) {
    super(`Event setup source ${source} is invalid: ${detail}`);
    this.name = "EventSetupSourceInvalidError";
  }
}

const documentIdPattern = /^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/;
const localDatePattern = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
const localTimePattern = /^[0-9]{2}:[0-9]{2}$/;

const invalidEvent = (detail: string) =>
  new EventSetupSourceInvalidError("events", detail);

/**
 * The manager projection of one event, as the retired getPrivateEventSetup
 * callable returned it, except that publication readiness leaves time to the
 * phone: every requirement is checked as if the event started one millisecond
 * from now. Pure; the caller reads the sources in one transaction. Actor
 * checks (deleted account, manager authority, active organizer) are not part
 * of the projection: rules carry them on every read.
 */
export function projectPrivateEventSetupSummary(params: {
  eventId: string;
  event: Record<string, unknown>;
  organizer: Record<string, unknown> | undefined;
  preferences: FirebaseFirestore.DocumentData | undefined;
  canEditBasics: boolean;
}): PrivateEventSetupSummary {
  const {eventId, canEditBasics} = params;
  const event = params.event as Record<string, any>; // eslint-disable-line
  const organizerId = event.organizerId;
  if (typeof organizerId !== "string" || !documentIdPattern.test(organizerId)) {
    throw invalidEvent("organizerId is not a document id");
  }
  if (event.publicationState !== "private" &&
      (event.publicationState !== "published" ||
        !validateEventDocument(event))) {
    throw invalidEvent("publication state needs review");
  }
  const setupRevision = event.setupRevision;
  if (!Number.isSafeInteger(setupRevision) || setupRevision < 1) {
    throw invalidEvent("setupRevision is not a positive integer");
  }
  const startTimeMillis = event.startTime?.toMillis?.();
  if (!Number.isSafeInteger(startTimeMillis)) {
    throw invalidEvent("startTime is missing");
  }
  const endTimeMillis = event.endTime?.toMillis?.() ?? null;
  if (event.endTime !== undefined &&
      (!Number.isSafeInteger(endTimeMillis) ||
        endTimeMillis <= startTimeMillis)) {
    throw invalidEvent("duration is invalid");
  }
  if (typeof event.name !== "string" || event.name.length < 1 ||
      event.name.length > 120 ||
      typeof event.eventCityId !== "string" ||
      !documentIdPattern.test(event.eventCityId) ||
      typeof event.eventMarketId !== "string" ||
      !documentIdPattern.test(event.eventMarketId) ||
      typeof event.eventLocalDate !== "string" ||
      !localDatePattern.test(event.eventLocalDate) ||
      typeof event.eventLocalStartTime !== "string" ||
      !localTimePattern.test(event.eventLocalStartTime) ||
      typeof event.eventTimezone !== "string" ||
      event.eventTimezone.length < 1 || event.eventTimezone.length > 100 ||
      !["active", "cancelled"].includes(event.status) ||
      typeof event.setupDefaults !== "object" || event.setupDefaults === null) {
    throw invalidEvent("basics are incomplete");
  }
  if (params.organizer === undefined) {
    throw new EventSetupSourceInvalidError("organizers", "missing");
  }
  if (!validateOrganizerDocument(params.organizer)) {
    throw new EventSetupSourceInvalidError("organizers",
      "fails the organizer contract");
  }
  const organizer = params.organizer as unknown as OrganizerDocument;
  let eventPreferences: PrivateEventSetupSummary["eventPreferences"];
  try {
    eventPreferences = projectEventPreferences(params.preferences,
      organizerId, eventId) as PrivateEventSetupSummary["eventPreferences"];
  } catch (error) {
    if (error instanceof HttpsError && error.code === "failed-precondition") {
      throw new EventSetupSourceInvalidError("eventSetupPreferences",
        error.message);
    }
    throw error;
  }
  return {
    eventId,
    organizerId,
    setupRevision,
    name: event.name,
    city: {cityId: event.eventCityId, marketId: event.eventMarketId},
    localDate: event.eventLocalDate,
    localStartTime: event.eventLocalStartTime,
    timezone: event.eventTimezone,
    startTimeMillis,
    publicationState: event.publicationState,
    status: event.status,
    setupDefaults: event.setupDefaults,
    detailsConfigured: event.endTime !== undefined ||
      event.meetingLocation !== undefined ||
      event.meetingPoint !== undefined ||
      event.eventFormat !== undefined ||
      event.eventSuccessPlanId !== undefined ||
      event.description !== undefined || event.capacityLimit !== undefined,
    eventPreferences,
    eventDetails: {
      endTimeMillis,
      venueName: event.meetingLocation?.name ?? event.meetingPoint ?? null,
      meetingLocation: event.meetingLocation ?? null,
      description: event.description ?? null,
      itinerary: event.itinerary ?? [],
      eventPhotos: event.eventPhotos ?? [],
      distanceKm: event.distanceKm ?? null,
      pace: event.pace ?? null,
      admissionTerms: isEventPolicyTerms(event as EventDocument) ? {
        capacityLimit: event.capacityLimit, priceInPaise: event.priceInPaise,
        currency: event.currency ?? "INR",
        cancellationPolicyId: eventPolicyFromEvent(event as EventDocument)
          .cancellation.policyId,
      } : null,
      sourceVenueId: event.sourceVenueId ?? null,
      eventFormat: event.eventFormat ?? null,
    },
    canEditBasics,
    canChangeCity: canEditBasics && event.meetingLocation === undefined &&
      event.meetingPoint === undefined && event.sourceVenueId === undefined,
    publicationReadiness: readinessWhenFuture(event as EventDocument,
      organizer, startTimeMillis),
    eventSettings: projectEventSettings(event),
  };
}

/** Event-level guest settings with their read-time defaults applied. */
export function projectEventSettings(
  event: Record<string, unknown>
): NonNullable<PrivateEventSetupSummary["eventSettings"]> {
  return {
    listing: event.listing === "link" ? "link" : "listed",
    showGuestList: event.showGuestList !== false,
    priceHiddenUntilBookingOpens: event.priceHiddenUntilBookingOpens === true,
    planVisibleToGuests: event.planVisibleToGuests !== false,
    externalBooking: (event.externalBooking ?? null) as NonNullable<
      PrivateEventSetupSummary["eventSettings"]>["externalBooking"],
  };
}

/**
 * Every requirement except time: the readiness the event would have if it
 * started one millisecond from now. The phone applies the clock.
 */
function readinessWhenFuture(event: EventDocument,
  organizer: OrganizerDocument, startTimeMillis: number
): PrivateEventSetupSummary["publicationReadiness"] {
  const readiness = eventPublicationReadiness({event, organizer,
    nowMillis: startTimeMillis - 1,
    timestampFromMillis: Timestamp.fromMillis});
  return {
    canPublishWhenFuture: readiness.canPublish,
    missing: readiness.missing.filter((requirement) =>
      requirement !== "futureActive") as NonNullable<
        PrivateEventSetupSummary["publicationReadiness"]>["missing"],
  };
}
