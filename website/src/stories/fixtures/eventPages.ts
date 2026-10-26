import type {EventPageData} from "../../features/events/eventPageModel";

// Event page read models for stories and tests: the fictional Salt Air Run
// Club from the run-club-bandra demo world, set to the approved WebEventV2
// board (design/reference_screens/screen.website.event). Never imported by
// the public catalogue.

type CatchItem = Extract<EventPageData["item"], {source: "catch"}>;
type CatchEvent = CatchItem["event"];
type ExternalItem = Extract<EventPageData["item"], {source: "external"}>;

/** Fixture clock: a week before the 15K. */
export const eventPageFixtureNow = Date.parse("2026-11-15T06:30:00.000Z");

const organizer: EventPageData["organizer"] = {
  organizerId: "salt-air-run-club",
  name: "Salt Air Run Club",
  path: "/organizers/mumbai/salt-air-run-club/",
  category: "Run club",
  city: "Mumbai",
  logo: {mode: "monogram", text: "SA", status: "Verified"},
  verified: true,
  followerCount: 2140,
  rating: 4.8,
  reviewCount: 186,
  verifiedReviewCount: 142,
  upcomingEventCount: 4,
};

const fullEvent: CatchEvent = {
  id: "salt-air-15k-training",
  role: "host",
  title: "Half-marathon training: 15K",
  activityKind: "running",
  timeline: "upcoming",
  startTime: "2026-11-22T00:15:00.000Z",
  endTime: "2026-11-22T03:00:00.000Z",
  timezone: "Asia/Kolkata",
  date: "Sun, 22 Nov 2026, 5:45 AM-8:30 AM",
  location: "Bandra West, Mumbai",
  summary: "A long, steady Sunday for anyone training for a half marathon. Three pace groups, water every 5K, and breakfast by the sea after.",
  photoUrl: "/assets/events/social-run-music-hero-960.jpg",
  meetingLocation: {
    name: "Seaface Steps",
    address: "Bandra West",
    placeId: null,
    latitude: 19.0668,
    longitude: 72.8231,
    notes: "Meet by the orange club flag at the north end of the promenade. Bag drop opens at 5:45.",
  },
  itinerary: [
    {id: "meet", kind: "gather", offsetMinutes: 0, title: "Meet at the steps", description: "Bag drop opens. Find your pace group’s flag."},
    {id: "warm-up", kind: "activity", offsetMinutes: 15, durationMinutes: 10, title: "Warm-up", description: "Ten minutes, led by Pooja."},
    {id: "run", kind: "activity", offsetMinutes: 25, durationMinutes: 100, title: "15K in three pace groups",
      description: "6:00, 6:45 and 7:30 per km, along the promenade and back twice.", routeDistanceMeters: 15000},
    {id: "breakfast", kind: "finish", offsetMinutes: 125, title: "Stretch and breakfast", description: "Poha and coffee by the steps, included."},
  ],
  requirements: "Running shoes, and a bottle if you like your own water. You should already be comfortable running 10K.",
  accessibility: "Flat promenade the whole way. Two road crossings, both with marshals. Toilets at the turn.",
  included: "Pace leaders, water and gels at 5K and 10K, bag drop, and breakfast after.",
  registrationAccess: "open",
  catchExperienceActivities: ["introductions", "sharedActivities"],
  waitlistAvailable: false,
  cancellationPolicy: "standard",
  capacityLimit: 40,
  bookedCount: 27,
  checkedInCount: 0,
  waitlistedCount: 0,
  publicRegistrationEnabled: true,
  registrationMode: "paid",
  amountPaise: 29_900,
  currency: "INR",
  priceLabel: "₹299",
};

const catchItem = (event: CatchEvent): CatchItem => ({
  source: "catch",
  eventId: event.id,
  path: `/events/${event.id}/`,
  event,
  booking: {kind: "catch", path: `/events/${event.id}/`, registrationAccess: "open",
    spotsLeft: Math.max(0, event.capacityLimit - event.bookedCount)},
});

const capacityOf = (event: CatchEvent): EventPageData["capacity"] => {
  const spotsLeft = Math.max(0, event.capacityLimit - event.bookedCount);
  return {state: spotsLeft > 0 ? "open" : "full", capacityLimit: event.capacityLimit, bookedCount: event.bookedCount,
    waitlistedCount: event.waitlistedCount, spotsLeft, waitlistAvailable: event.waitlistAvailable === true};
};

const verifiedReviews: EventPageData["reviews"] = [
  {id: "salt-air-review-1", eventId: "salt-air-sunday-5k", reviewerName: "Ananya K.", rating: 5,
    comment: "Came on my own, left with a pace group and a coffee plan. Pooja does a round of names before the start, which made it easy.",
    createdAt: "2026-11-02T04:10:00.000Z", verificationStatus: "verified", source: "catchEvent", isAnonymous: false, ownerResponse: null},
  {id: "salt-air-review-2", eventId: "salt-air-sunday-5k", reviewerName: "Nikhil J.", rating: 4,
    comment: "Lovely crowd. The 6:00 per km group was a bit fast for a first-timer, but the leader waited for me at the turn.",
    createdAt: "2026-10-19T04:30:00.000Z", verificationStatus: "verified", source: "catchEvent", isAnonymous: false, ownerResponse: null},
];

const moreEvents: EventPageData["moreEvents"] = [
  {source: "catch", eventId: "salt-air-sunday-5k", path: "/events/salt-air-sunday-5k/", title: "Sunday Seaface 5K",
    activityKind: "socialRun", startTime: "2026-11-29T01:00:00.000Z", endTime: "2026-11-29T02:15:00.000Z",
    date: "Sun, 29 Nov 2026, 6:30 AM-7:45 AM", location: "Bandra West, Mumbai", priceLabel: "Free", photoUrl: null,
    booking: {kind: "catch", path: "/events/salt-air-sunday-5k/"}},
  {source: "external", eventId: "salt-air-sunset-run-social", path: "/events/salt-air-sunset-run-social/",
    title: "Sunset Run & Social", activityKind: "socialRun", startTime: "2026-12-05T12:00:00.000Z", endTime: null,
    date: "Sat, 5 Dec 2026, 5:30 PM", location: "Worli Sea Face, Mumbai", priceLabel: "₹799", photoUrl: null,
    booking: {kind: "external", url: "https://lu.ma/salt-air-sunset-run-social", label: "Luma"}},
  {source: "catch", eventId: "salt-air-tempo-6k", path: "/events/salt-air-tempo-6k/", title: "Wednesday Tempo 6K",
    activityKind: "running", startTime: "2026-12-09T13:30:00.000Z", endTime: "2026-12-09T14:30:00.000Z",
    date: "Wed, 9 Dec 2026, 7:00 PM-8:00 PM", location: "Bandra West, Mumbai", priceLabel: "Free", photoUrl: null,
    booking: {kind: "catch", path: "/events/salt-air-tempo-6k/"}},
];

const page = (item: EventPageData["item"], rest: Partial<EventPageData> = {}): EventPageData => ({
  schemaVersion: 1,
  eventId: item.eventId,
  organizerId: organizer.organizerId,
  path: item.path,
  item,
  capacity: item.source === "catch" ? capacityOf(item.event) : {state: "external", capacityLimit: null,
    bookedCount: null, waitlistedCount: null, spotsLeft: null, waitlistAvailable: false},
  organizer,
  reviews: verifiedReviews,
  moreEvents,
  ...rest,
});

/** A Catch event with all ten optional fields: the board's catch_full. */
export const fullEventPage: EventPageData = page(catchItem(fullEvent));

/** The ten optional fields, as the board's prototype toggles them. */
export const optionalEventFields = [
  "photo", "moments", "itinerary", "map", "included", "bring", "accessibility", "cancellation", "capacity", "reviews",
] as const;
export type OptionalEventField = (typeof optionalEventFields)[number];

/** The full event with the named optional fields switched off. */
export function eventPageWithout(fields: readonly OptionalEventField[]): EventPageData {
  const off = new Set(fields);
  const event: CatchEvent = {
    ...fullEvent,
    ...(off.has("photo") ? {photoUrl: null} : {}),
    ...(off.has("capacity") ? {bookedCount: 0} : {}),
  };
  const removed: Partial<Record<OptionalEventField, keyof CatchEvent>> = {
    moments: "catchExperienceActivities", itinerary: "itinerary", map: "meetingLocation", included: "included",
    bring: "requirements", accessibility: "accessibility", cancellation: "cancellationPolicy",
  };
  for (const field of off) {
    const key = removed[field];
    if (key) delete event[key];
  }
  return page(catchItem(event), off.has("reviews") ? {reviews: []} : {});
}

/** Every optional field off: the board's catch_bare. */
export const bareEventPage: EventPageData = eventPageWithout(optionalEventFields);

const importedEvent: ExternalItem["event"] = {
  id: "salt-air-sunset-run-social",
  title: "Sunset Run & Social",
  activityKind: "socialRun",
  availability: "read_only_external",
  startTime: "2026-12-05T12:00:00.000Z",
  endTime: null,
  timezone: "Asia/Kolkata",
  date: "Sat, 5 Dec 2026, 5:30 PM",
  location: "Worli Sea Face, Mumbai",
  summary: "A 5K social run along Worli Sea Face at sunset, then music at a rooftop nearby. Walkers welcome.",
  priceLabel: "₹799",
  sourceLabel: "Luma",
  sourceHref: "https://lu.ma/salt-air-sunset-run-social",
  externalLinkCount: 1,
  dedupeKey: "salt-air-sunset-run-social-2026-12-05",
};

/**
 * An imported Luma event: title, time, place, price and description only,
 * with the organiser's unverified page reviews. The board's luma_import.
 */
export const importedEventPage: EventPageData = page({
  source: "external",
  eventId: importedEvent.id,
  path: `/events/${importedEvent.id}/`,
  event: importedEvent,
  booking: {kind: "external", url: importedEvent.sourceHref, label: importedEvent.sourceLabel},
}, {
  reviews: [
    {id: "salt-air-review-3", eventId: null, reviewerName: "Arjun M.", rating: 5,
      comment: "Best organised run and party I’ve been to. Bag drop, water at the halfway point, and the playlist kept everyone going.",
      createdAt: "2026-10-12T15:00:00.000Z", verificationStatus: "unverified", source: "publicListing", isAnonymous: false, ownerResponse: null},
    {id: "salt-air-review-4", eventId: null, reviewerName: "Ishaan V.", rating: 5,
      comment: "The sunset stretch along the sea face is worth it on its own. Easy pace, very friendly.",
      createdAt: "2026-09-21T15:00:00.000Z", verificationStatus: "unverified", source: "publicListing", isAnonymous: false, ownerResponse: null},
  ],
  moreEvents: [moreEvents[0], {source: "catch", eventId: fullEvent.id, path: `/events/${fullEvent.id}/`, title: fullEvent.title,
    activityKind: fullEvent.activityKind, startTime: fullEvent.startTime, endTime: fullEvent.endTime, date: fullEvent.date,
    location: fullEvent.location, priceLabel: fullEvent.priceLabel, photoUrl: null,
    booking: {kind: "catch", path: `/events/${fullEvent.id}/`}}, moreEvents[2]],
});
