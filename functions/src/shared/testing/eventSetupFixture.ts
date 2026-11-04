import type {EventDocument} from "../generated/firestoreAdminTypes";

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
