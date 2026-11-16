import crypto from "node:crypto";

// Fills the fields today's Event contract requires on events created before
// it. Every value is worked out from fields the event already stores, the
// same way the server writes them today, and nothing present is replaced.

// What the apps show for an event with no authored name
// (lib/contexts/events/domain/event_extensions.dart legacyDerivedTitle and
// packages/kernel/lib/activity_taxonomy.dart eventTitleLabel).
const ACTIVITY_LABELS = {
  socialRun: "Social run", running: "Running", walking: "Walking",
  pickleball: "Pickleball", padel: "Padel", tennis: "Tennis",
  badminton: "Badminton", cycling: "Cycling", spinClass: "Spin class",
  yoga: "Yoga", strengthTraining: "Strength training", pubQuiz: "Pub quiz",
  barCrawl: "Bar crawl", dinner: "Dinner", singlesMixer: "Singles mixer",
  openActivity: "Open activity",
};

function titleCaseWords(value) {
  return value.trim().split(/\s+/u).filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1)).join(" ");
}

/** The activity word in a derived title: "Run", "Walk", "Ride" or the label. */
export function activityTitleLabel(eventFormat) {
  const custom = eventFormat?.customActivityLabel?.trim();
  if (custom) return titleCaseWords(custom);
  const kind = eventFormat?.activityKind;
  if (kind === "socialRun" || kind === "running") return "Run";
  if (kind === "walking") return "Walk";
  if (kind === "cycling") return "Ride";
  return titleCaseWords(ACTIVITY_LABELS[kind] ?? "Event");
}

/** Local calendar parts of an instant in a timezone. */
export function localParts(date, timeZone) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "long",
  }).formatToParts(date).map((part) => [part.type, part.value]));
  return {
    localDate: `${parts.year}-${parts.month}-${parts.day}`,
    localStartTime: `${parts.hour}:${parts.minute}`,
    hour: Number(parts.hour),
    weekday: parts.weekday,
  };
}

/** "Saturday Morning Run": the title the apps already show for the event. */
export function derivedEventName(event, timeZone) {
  const {weekday, hour} = localParts(event.startTime.toDate(), timeZone);
  const period = hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening";
  return `${weekday} ${period} ${activityTitleLabel(event.eventFormat)}`;
}

/** Setup defaults for an event that set its own city and timezone. */
export function eventSourcedSetupDefaults(city, timeZone) {
  return {
    city: {value: city, source: "event"},
    timezone: {value: timeZone, source: "event"},
    organizerDefaultsRevision: null,
    // The same hash resolveProgressiveSetupDefaults stores with no organizer
    // defaults (functions/src/events/progressiveSetup/defaults.ts).
    organizerDefaultsHash: crypto.createHash("sha256")
      .update(JSON.stringify({city: null, timezone: null, revision: null}))
      .digest("hex"),
  };
}

const absent = (value) => value === undefined || value === null;
const finite = (value) => typeof value === "number" && Number.isFinite(value);

/**
 * The fields to add to one event, or null. `marketFor` maps a market id to
 * {id, cityId, timeZone} (the Functions market config).
 */
export function eventSchemaFill(event, marketFor) {
  const market = marketFor(event.eventMarketId ?? event.discoveryMarketId);
  if (!market || !event.startTime?.toDate) return null;
  const timeZone = event.eventTimezone ?? market.timeZone;
  const {localDate, localStartTime} = localParts(event.startTime.toDate(), timeZone);
  const city = {cityId: event.eventCityId ?? market.cityId ?? market.id,
    marketId: event.eventMarketId ?? market.id};
  const fields = {};
  if (absent(event.publicationState)) fields.publicationState = "published";
  if (absent(event.setupRevision)) fields.setupRevision = 1;
  if (absent(event.name) || !String(event.name).trim()) {
    fields.name = derivedEventName(event, timeZone);
  }
  if (absent(event.eventCityId)) fields.eventCityId = city.cityId;
  if (absent(event.eventMarketId)) fields.eventMarketId = city.marketId;
  if (absent(event.eventTimezone)) fields.eventTimezone = timeZone;
  if (absent(event.eventLocalDate)) fields.eventLocalDate = localDate;
  if (absent(event.eventLocalStartTime)) fields.eventLocalStartTime = localStartTime;
  if (absent(event.setupDefaults)) {
    fields.setupDefaults = eventSourcedSetupDefaults(city, timeZone);
  }
  // The meeting location the apps already show (eventMeetingLocationFromLegacy):
  // only with real coordinates, never invented.
  if (absent(event.meetingLocation) && finite(event.startingPointLat) &&
      finite(event.startingPointLng) && typeof event.meetingPoint === "string" &&
      event.meetingPoint.trim()) {
    fields.meetingLocation = {
      name: event.meetingPoint.trim().slice(0, 240), address: null, placeId: null,
      latitude: event.startingPointLat, longitude: event.startingPointLng,
      notes: typeof event.locationDetails === "string" && event.locationDetails.trim() ?
        event.locationDetails.trim().slice(0, 1000) : null,
    };
  }
  return Object.keys(fields).length > 0 ? fields : null;
}
