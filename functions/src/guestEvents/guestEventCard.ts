import type {EventDocument} from "../shared/generated/firestoreAdminTypes";
import type {GuestEventCard} from "../shared/generated/guestEventCard";

export type {GuestEventCard};

/** The guest's saved-event edges, keyed `{uid}_{eventId}`. */
export const savedEvents = "savedEvents";

const millis = (value: unknown): number | null => {
  if (!value || typeof value !== "object" ||
      typeof (value as {toMillis?: unknown}).toMillis !== "function") {
    return null;
  }
  const result = (value as FirebaseFirestore.Timestamp).toMillis();
  return Number.isSafeInteger(result) && result >= 0 ? result : null;
};

const text = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

const finite = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const count = (value: unknown): number | null =>
  Number.isSafeInteger(value) && (value as number) >= 0 ?
    value as number : null;

/**
 * The fields a guest's own event lists show, from one event. No live booking
 * counts: a booking must never rewrite other guests' cards. Null when the
 * event cannot be listed (no organizer, start time or format).
 * @param {string} eventId The event id.
 * @param {EventDocument | undefined} event The event.
 * @return {GuestEventCard | null} The card.
 */
export function guestEventCard(
  eventId: string,
  event: EventDocument | undefined,
): GuestEventCard | null {
  if (!event) return null;
  const startTimeMillis = millis(event.startTime);
  const format = event.eventFormat;
  if (typeof event.organizerId !== "string" || startTimeMillis === null ||
      !format?.activityKind || !format.interactionModel) {
    return null;
  }
  const endTimeMillis = millis(event.endTime);
  return {
    eventId,
    organizerId: event.organizerId,
    name: typeof event.name === "string" ? event.name.slice(0, 120) : "",
    publicationState: event.publicationState === "private" ?
      "private" : "published",
    status: event.status === "cancelled" ? "cancelled" : "active",
    startTimeMillis,
    endTimeMillis: endTimeMillis !== null && endTimeMillis > startTimeMillis ?
      endTimeMillis : null,
    eventTimezone: text(event.eventTimezone),
    eventFormat: {
      version: 1,
      activityKind: format.activityKind,
      interactionModel: format.interactionModel,
      ...(text(format.customActivityLabel) ?
        {customActivityLabel: format.customActivityLabel} : {}),
    },
    distanceKm: finite(event.distanceKm),
    pace: event.pace ?? null,
    meetingPoint: text(event.meetingPoint),
    meetingLocation: event.meetingLocation ?? null,
    startingPointLat: finite(event.startingPointLat),
    startingPointLng: finite(event.startingPointLng),
    locationDetails: text(event.locationDetails),
    description: text(event.description),
    capacityLimit: count(event.capacityLimit),
    priceInPaise: count(event.priceInPaise),
    currency: text(event.currency),
    priceHiddenUntilBookingOpens: event.priceHiddenUntilBookingOpens === true,
    publicRegistrationEnabled: event.publicRegistrationEnabled === true,
    demandPricing:
      (event.eventPolicy?.pricing?.demandPricingRules?.length ?? 0) > 0,
    synthetic: (event as {synthetic?: unknown}).synthetic === true,
  };
}
