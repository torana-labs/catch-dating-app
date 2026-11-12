import type {EventDocument} from "../generated/firestoreAdminTypes";
import {initialPolicyFromTerms} from "../../events/eventPolicy";

export type EventSetupFields = Pick<EventDocument, "publicationState" |
  "setupRevision" | "name" | "eventCityId" | "eventMarketId" |
  "eventLocalDate" | "eventLocalStartTime" | "eventTimezone" |
  "setupDefaults">;

/**
 * The setup fields every event document carries, for a test event published
 * at setup revision 1 in Indore. Spread it first into a test event and
 * override what the test is about.
 * @return {EventSetupFields} Publication state, revision and basics.
 */
export function publishedEventSetup(): EventSetupFields {
  return {
    publicationState: "published",
    setupRevision: 1,
    name: "Test event",
    eventCityId: "in-mp-indore",
    eventMarketId: "in-mp-indore",
    eventLocalDate: "2026-05-30",
    eventLocalStartTime: "07:00",
    eventTimezone: "Asia/Kolkata",
    setupDefaults: {
      city: {
        value: {cityId: "in-mp-indore", marketId: "in-mp-indore"},
        source: "organizer",
      },
      timezone: {value: "Asia/Kolkata", source: "event"},
      organizerDefaultsRevision: null,
      organizerDefaultsHash: "0".repeat(64),
    },
  };
}

/**
 * Adds the stored eventPolicy that a configured event carries, derived the
 * way an event gets its first policy, unless the test already set one or the
 * event has no capacity and price terms yet.
 * @param {T} event Test event document.
 * @return {T} The event with eventPolicy.
 */
export function withStoredEventPolicy<T extends Record<string, unknown>>(
  event: T
): T {
  if (event.eventPolicy !== undefined ||
      typeof event.capacityLimit !== "number" ||
      typeof event.priceInPaise !== "number") {
    return event;
  }
  return {
    ...event,
    eventPolicy: initialPolicyFromTerms(event as unknown as EventDocument),
  };
}
