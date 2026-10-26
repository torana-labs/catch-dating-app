import {buildPublicEventDetailRecords, type EventDetailRecord} from "../../features/events/eventDetailModel";
import {projectLivePublicCatchEvent} from "../../features/organizers/publicCatchEventProjection";
import type {HostListing} from "../../features/organizers/types";
import {
  cityLabel,
  eventStateAt,
  eventTimesMillis,
  momentMillis,
  requireVenue,
  world,
  type DemoMoment,
  type DemoWorldEvent,
} from "./demoWorld";
import {hostListings} from "./hostListings";

// The demo world read through the website's public listing and event models.
// These read the generated organiser listings, which the production website
// build replaces, so web captures import demoWorld.ts instead
// (docs/marketing_app_media_pipeline.md).

/**
 * The organiser's public listing at a moment. Identity and events come from
 * the world; publication policy comes from the generated Catch demo listing.
 */
export function organizerListingAt(moment: DemoMoment): HostListing {
  const policy = hostListings.find((listing) => listing.dataOrigin === "catchDemo");
  if (!policy) throw new Error("Missing generated Catch demo listing.");
  const {organizer} = world;
  const city = cityLabel();
  const slug = organizer.name.toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "");
  const path = `/organizers/${organizer.city}/${slug}/`;
  const events = world.events.map((event) => catchEventAt(event, moment));
  const next = events.find((event) => event.timeline === "upcoming");
  const formats = organizer.tags.map((tag) => `${tag[0].toUpperCase()}${tag.slice(1)}`);
  return {
    ...policy,
    id: organizer.id,
    name: organizer.name,
    slug,
    city,
    citySlug: organizer.city,
    region: city,
    country: new Intl.DisplayNames(["en"], {type: "region"}).of(world.locale.split("-")[1]) ?? "",
    path,
    headline: `${organizer.name} in ${city}`,
    description: organizer.description,
    sourceSummary: `${organizer.name} is a first-party Catch demo organiser with app-created events.`,
    logo: {...policy.logo, text: organizer.name.split(/\s+/u).map((word) => word[0]).join("").slice(0, 2)},
    formats,
    facts: [
      {label: "Location", value: `${organizer.area}, ${city}`},
      {label: "Host", value: world.host.displayName},
      ...(next ? [{label: "Next event", value: next.date}] : []),
      {label: "Built in Catch", value: "App-created club"},
    ],
    metrics: {nextEventAt: next?.startTime ?? null, nextEventLabel: next?.title ?? null},
    host: {name: world.host.displayName, role: "Owner", avatarUrl: null},
    catchEvents: events,
    externalEvents: [],
    eventSuccessSummary: null,
    eventEvidence: [],
    reviews: [],
    sources: [{type: "catch_demo", label: "Catch demo world", detail: `Demo world ${world.id}.`, confidence: "high"}],
    claim: {href: `${path}#events`, label: "View events"},
    searchText: [organizer.name, city, organizer.area, world.host.displayName, ...formats,
      ...events.map((event) => event.title)].join(" ").toLowerCase(),
  };
}

/** An event's public detail record as a visitor would see it at a moment. */
export function eventDetailAt(eventId: string, moment: DemoMoment): EventDetailRecord {
  const record = buildPublicEventDetailRecords([organizerListingAt(moment)], momentMillis(moment))
    .find((candidate) => candidate.eventId === eventId);
  if (!record) throw new Error(`${world.id} event ${eventId} is not publicly readable.`);
  return record;
}

// The website reads Catch events through the same projection it applies to
// published Firestore documents, so the labels match production.
function catchEventAt(event: DemoWorldEvent, moment: DemoMoment) {
  const venue = requireVenue(event);
  const {startMillis, endMillis} = eventTimesMillis(event.id);
  const timestamp = (millis: number) => ({toMillis: () => millis});
  const projected = projectLivePublicCatchEvent(event.id, {
    publicationState: "published", status: "active", organizerId: world.organizer.id,
    name: event.name, description: event.description,
    startTime: timestamp(startMillis), endTime: timestamp(endMillis), eventTimezone: world.timeZone,
    meetingLocation: {name: venue.name, address: `${venue.area}, ${cityLabel()}`,
      latitude: venue.lat, longitude: venue.lng, notes: venue.directions},
    eventFormat: {activityKind: event.activityKind, customActivityLabel: event.customActivityLabel},
    capacityLimit: event.capacity, bookedCount: eventStateAt(event.id, moment).booked,
    checkedInCount: eventStateAt(event.id, moment).checkedIn,
    priceInPaise: event.priceInPaise, currency: world.currency,
    publicRegistrationEnabled: true, publicRegistrationMode: event.priceInPaise ? "paid" : "free",
  }, momentMillis(moment));
  if (!projected) throw new Error(`${world.id} event ${event.id} fails the public event projection.`);
  return projected.event;
}
