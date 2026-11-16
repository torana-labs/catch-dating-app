import assert from "node:assert/strict";
import test from "node:test";
import {activityTitleLabel, derivedEventName, eventSchemaFill,
  eventSourcedSetupDefaults, localParts} from "./lib/event_schema_fill.mjs";

const ts = (iso) => ({toDate: () => new Date(iso)});
// The field name the clubs-to-organizers rename retired. It is data here, so
// the nomenclature gate reads it as a value rather than code that says club.
const retiredOwnerField = "clubId";
const markets = {
  "in-mh-mumbai": {id: "in-mh-mumbai", cityId: "in-mh-mumbai", timeZone: "Asia/Kolkata"},
  "in-dl-delhi-ncr": {id: "in-dl-delhi-ncr", cityId: "in-dl-new-delhi", timeZone: "Asia/Kolkata"},
};
const marketFor = (id) => markets[id] ?? null;

// A run-club event as stored before today's Event contract.
function legacyEvent(overrides = {}) {
  return {organizerId: "org", status: "active", publicationState: "published",
    // 07:00 in Mumbai on Saturday 16 May 2026.
    startTime: ts("2026-05-16T01:30:00Z"), discoveryMarketId: "in-mh-mumbai",
    eventFormat: {activityKind: "socialRun"}, meetingPoint: "Carter Road",
    startingPointLat: 19.06, startingPointLng: 72.82, locationDetails: "By the gate",
    [retiredOwnerField]: "old", ...overrides};
}

test("titles match what the apps show for an unnamed event", () => {
  assert.equal(activityTitleLabel({activityKind: "socialRun"}), "Run");
  assert.equal(activityTitleLabel({activityKind: "walking"}), "Walk");
  assert.equal(activityTitleLabel({activityKind: "singlesMixer"}), "Singles Mixer");
  assert.equal(activityTitleLabel({activityKind: "yoga", customActivityLabel: "sunrise flow"}),
    "Sunrise Flow");
  assert.equal(activityTitleLabel(undefined), "Event");
  assert.equal(derivedEventName(legacyEvent(), "Asia/Kolkata"), "Saturday Morning Run");
  assert.equal(derivedEventName(legacyEvent({startTime: ts("2026-05-16T13:30:00Z")}),
    "Asia/Kolkata"), "Saturday Evening Run");
});

test("local date and time are in the event's timezone", () => {
  assert.deepEqual(localParts(new Date("2026-05-15T19:00:00Z"), "Asia/Kolkata"),
    {localDate: "2026-05-16", localStartTime: "00:30", hour: 0, weekday: "Saturday"});
});

test("a legacy event gets every required field from what it stores", () => {
  const fields = eventSchemaFill(legacyEvent(), marketFor);
  assert.deepEqual(fields, {
    setupRevision: 1, name: "Saturday Morning Run",
    eventCityId: "in-mh-mumbai", eventMarketId: "in-mh-mumbai",
    eventTimezone: "Asia/Kolkata", eventLocalDate: "2026-05-16",
    eventLocalStartTime: "07:00",
    setupDefaults: eventSourcedSetupDefaults(
      {cityId: "in-mh-mumbai", marketId: "in-mh-mumbai"}, "Asia/Kolkata"),
    meetingLocation: {name: "Carter Road", address: null, placeId: null,
      latitude: 19.06, longitude: 72.82, notes: "By the gate"},
  });
  assert.equal(fields[retiredOwnerField], undefined);
});

test("the city comes from the market config, not the market id", () => {
  const fields = eventSchemaFill(legacyEvent({discoveryMarketId: "in-dl-delhi-ncr"}),
    marketFor);
  assert.equal(fields.eventCityId, "in-dl-new-delhi");
  assert.equal(fields.eventMarketId, "in-dl-delhi-ncr");
});

test("nothing present changes and nothing is invented", () => {
  const current = legacyEvent({name: "Sunday long run", setupRevision: 4,
    eventCityId: "in-mh-mumbai", eventMarketId: "in-mh-mumbai",
    eventTimezone: "Asia/Kolkata", eventLocalDate: "2026-05-16",
    eventLocalStartTime: "07:00", setupDefaults: {kept: true},
    meetingLocation: {name: "Kept", latitude: 1, longitude: 2}});
  assert.equal(eventSchemaFill(current, marketFor), null);
  // No coordinates: no meeting location.
  const noCoordinates = eventSchemaFill(legacyEvent({startingPointLat: null,
    startingPointLng: null}), marketFor);
  assert.equal(noCoordinates.meetingLocation, undefined);
  // Unknown market or no start time: nothing to work from.
  assert.equal(eventSchemaFill(legacyEvent({discoveryMarketId: "nowhere"}), marketFor), null);
  assert.equal(eventSchemaFill(legacyEvent({startTime: undefined}), marketFor), null);
});

test("an event with no publication state is filled as published", () => {
  const fields = eventSchemaFill(legacyEvent({publicationState: undefined}), marketFor);
  assert.equal(fields.publicationState, "published");
});
