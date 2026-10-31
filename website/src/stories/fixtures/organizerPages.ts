import type {OrganizerPageEvent, OrganizerPageRecord, OrganizerPageReview} from "../../features/organizers/organizerPage";
import type {HostListing} from "../../features/organizers/types";
import {hostListings} from "./hostListings";

/**
 * Organiser page fixtures for the Website v2 board's states. The organisers,
 * people and places are fictional. Times are fixed against `organizerPageReadAt`
 * so countdowns and "2 weeks ago" read the same in every capture.
 */
export const organizerPageReadAt = Date.parse("2026-10-30T09:00:00+05:30");

const photo = "/assets/events/social-run-music-hero-960.jpg";
const day = 86_400_000;
const at = (iso: string) => `${iso}+05:30`;
const ago = (days: number) => new Date(organizerPageReadAt - days * day).toISOString();

const catchBase = {
  role: "host", activityKind: "socialRun", timezone: "Asia/Kolkata", summary: "", checkedInCount: 0, waitlistedCount: 0,
  registrationAccess: "open" as const, registrationMode: "free" as const, publicRegistrationEnabled: true, priceLabel: "Free",
};

function catchEvent(id: string, title: string, start: string, location: string, options: {
  capacity?: number; booked?: number; checkedIn?: number; price?: string; photo?: string; past?: boolean; closed?: boolean;
} = {}): OrganizerPageEvent {
  const startTime = at(start);
  const capacityLimit = options.capacity ?? 60;
  const bookedCount = options.booked ?? 0;
  return {
    source: "catch", eventId: id, path: `/events/${id}/`,
    event: {...catchBase, id, title, location, startTime, endTime: null, date: startTime.slice(0, 10),
      timeline: options.past ? "past" : "upcoming", capacityLimit, bookedCount, checkedInCount: options.checkedIn ?? 0,
      priceLabel: options.price ?? "Free", registrationMode: options.closed ? "closed" : options.price ? "paid" : "free",
      ...(options.photo ? {photoUrl: options.photo} : {})},
    booking: {kind: "catch", path: `/events/${id}/`, registrationAccess: "open", spotsLeft: Math.max(0, capacityLimit - bookedCount)},
  };
}

function lumaEvent(id: string, title: string, start: string, location: string, price: string): OrganizerPageEvent {
  const startTime = at(start);
  const url = `https://luma.com/lantern-${id}`;
  return {
    source: "external", eventId: id, path: `/events/${id}/`,
    event: {id, title, activityKind: "socialRun", availability: "read_only_external", startTime, endTime: null,
      timezone: "Asia/Kolkata", date: startTime.slice(0, 10), location, summary: "", priceLabel: price,
      sourceLabel: "Luma", sourceHref: url, externalLinkCount: 1, dedupeKey: id},
    booking: {kind: "external", url, label: "Luma"},
  };
}

function review(id: string, name: string, rating: number, days: number, comment: string, options: {
  eventId?: string; verified?: boolean; reply?: [string, string];
} = {}): OrganizerPageReview {
  return {
    id, eventId: options.eventId ?? null, reviewerName: name, rating, comment, createdAt: ago(days),
    verificationStatus: options.verified ? "verified" : "unverified", source: options.verified ? "catchEvent" : "publicListing",
    isAnonymous: false,
    ownerResponse: options.reply ? {hostName: options.reply[0], hostAvatarUrl: null, message: options.reply[1], updatedAt: ago(days - 1)} : null,
  };
}

const demo = hostListings.find((listing) => listing.listingVariant === "appCreatedOrganizer") ?? hostListings[0];
const unclaimedDemo = hostListings.find((listing) => listing.listingVariant === "unclaimedScraped") ?? hostListings[0];

/** The listing a page story routes and tracks with; its id matches the page's. */
export function organizerStoryListing(page: OrganizerPageRecord): HostListing {
  const base = page.profile.listingVariant === "appCreatedOrganizer" ? demo : unclaimedDemo;
  return {...base, id: page.organizerId, name: page.identity.name, slug: page.path.split("/")[2] ?? base.slug,
    path: page.path, legacyPaths: [], city: page.identity.city, citySlug: page.identity.citySlug, headline: page.identity.headline,
    description: page.identity.description, facts: page.profile.facts, sources: page.profile.sources};
}

const capabilities = demo.capabilities;
const identity = {
  name: "Lantern Lane Runners", headline: "Social runs along the sea face, Sundays at 6:30 and Wednesdays at 7. Coffee after, always.",
  description: "We started in 2024 with eleven people and a speaker. Now it’s around fifty runners most Sundays, in pace groups from 5:30 to 7:30 per km, and walkers are welcome on the 3K loop. Every run ends with coffee by the jetty. Once a month we run into the evening for Lantern Night.",
  category: "Run club", city: "Mumbai", citySlug: "mumbai", region: "Maharashtra", country: "India",
  logo: {mode: "monogram" as const, text: "LL", status: "ready"},
  formats: ["Social runs", "Tempo runs", "Lantern Night", "Half-marathon training"],
  verified: true, indexing: "index, follow" as const,
};

const upcoming: OrganizerPageEvent[] = [
  catchEvent("lantern-sun-1", "Sunday Social Run", "2026-11-01T06:30:00", "Lantern Lane jetty, Bandra West", {booked: 29}),
  catchEvent("lantern-wed-4", "Wednesday Tempo 6K", "2026-11-04T19:00:00", "Lantern Lane promenade", {capacity: 40, booked: 22}),
  lumaEvent("lantern-night-14", "Lantern Night: Sunset Edition", "2026-11-14T17:30:00", "Worli Sea Face, then a rooftop", "₹799"),
  catchEvent("lantern-15k-22", "Half-marathon training: 15K", "2026-11-22T06:00:00", "Bandstand to Worli and back", {price: "₹299", capacity: 30, booked: 12}),
  catchEvent("lantern-sun-29", "Sunday Social Run", "2026-11-29T06:30:00", "Lantern Lane jetty", {closed: true}),
];

const past: OrganizerPageEvent[] = [
  catchEvent("lantern-night-oct", "Lantern Night", "2026-10-17T17:30:00", "Worli Sea Face", {checkedIn: 212, photo, past: true}),
  catchEvent("lantern-sun-oct-25", "Sunday Social Run", "2026-10-25T06:30:00", "Lantern Lane jetty", {checkedIn: 51, past: true}),
  catchEvent("lantern-night-5k", "Night 5K", "2026-09-20T20:00:00", "Worli Sea Face", {checkedIn: 64, photo, past: true}),
  ...["2024-01-07", "2024-02-04", "2024-03-03", "2024-04-07", "2024-05-05", "2024-06-02", "2024-07-07", "2024-08-04", "2024-09-01"]
    .map((date, index) => catchEvent(`lantern-sun-${date}`, "Sunday Social Run", `${date}T06:30:00`, "Lantern Lane jetty",
      {checkedIn: 30 + index * 3, past: true})),
];

/** The claimed page as an Instagram visitor sees it. */
export const claimedOrganizerPage: OrganizerPageRecord = {
  organizerId: "lantern-lane-runners",
  path: "/organizers/lantern-lane-runners/",
  identity,
  links: [
    {id: "night", label: "Lantern Night · Sat 14 Nov", subtitle: null, url: "https://luma.com/lantern-night-14", icon: null,
      pinned: true, showUntil: "2026-11-14T12:00:00.000Z"},
    {id: "whatsapp", label: "Join the WhatsApp community", subtitle: null, url: "https://chat.whatsapp.com/lantern-lane",
      icon: null, pinned: false, showUntil: null},
    {id: "strava", label: "Strava club", subtitle: "Every run, logged", url: "https://www.strava.com/clubs/lantern-lane",
      icon: null, pinned: false, showUntil: null},
    {id: "shop", label: "Club tees and caps", subtitle: "Ships across India", url: "https://shop.example.com/lantern-lane",
      icon: "shop", pinned: false, showUntil: null},
  ],
  upcomingEvents: upcoming,
  pastMoments: past,
  reviewSummary: {readState: "enabled", rating: 4.8, count: 186, verifiedCount: 120, distribution: {"1": 1, "2": 3, "3": 8, "4": 32, "5": 142}},
  latestReviews: [
    review("r1", "Riya S.", 5, 14, "Came on my own, left with a pace group and a coffee plan. Kabir does a round of names before the start, which made it easy.",
      {eventId: "lantern-sun-oct-25", verified: true, reply: ["Kabir", "See you Sunday, Riya!"]}),
    review("r2", "Arjun M.", 5, 31, "Best organised run-and-party I’ve been to. Bag drop, water at the halfway point, and the playlist kept everyone going.",
      {eventId: "lantern-night-oct"}),
    review("r3", "Neha K.", 4, 33, "Lovely crowd. The 6:00 per km group was a bit fast for a first-timer, but the leader waited for me at the turn.",
      {eventId: "lantern-sun-oct-25", verified: true, reply: ["Meera", "Thanks Neha. From this Sunday there’s a 7:30 per km group too."]}),
  ],
  followerCount: 2140,
  claim: {state: "verified", claimable: false, href: "/claim/lantern-lane-runners/", label: "Claimed"},
  capabilities,
  profile: {
    listingVariant: "appCreatedOrganizer",
    facts: [
      {label: "Location", value: "Bandra West, Mumbai"},
      {label: "When", value: "Sundays 6:30 AM, Wednesdays 7:00 PM"},
      {label: "Where we meet", value: "Lantern Lane jetty, Bandra West"},
      {label: "Who it suits", value: "First-timers to sub-25 5K runners. Come on your own, most people do."},
    ],
    sources: [],
    host: {name: "Kabir Rao", role: "Founder · pace lead", avatarUrl: null},
  },
};

/** The page Catch built from public Luma and Instagram pages, before the club claims it. */
export const generatedOrganizerPage: OrganizerPageRecord = {
  organizerId: "harbour-line-run-club",
  path: "/organizers/harbour-line-run-club/",
  identity: {
    ...identity, name: "Harbour Line Run Club", verified: false, indexing: "noindex, follow",
    logo: {mode: "monogram", text: "HL", status: "ready"},
    headline: "Run club in Colaba hosting weekly social runs and monthly sunset runs.",
    description: "Harbour Line Run Club lists social runs along the harbour and sunset runs on its public Luma calendar. This summary comes from those pages. The club hasn’t checked it yet.",
    formats: ["Social runs", "Sunset runs"],
  },
  links: [],
  upcomingEvents: [
    lumaEvent("harbour-sun-1", "Sunday Social Run", "2026-11-01T06:30:00", "Harbour walk, Colaba", "Free"),
    lumaEvent("harbour-sunset-14", "Sunset Run: Harbour Edition", "2026-11-14T17:30:00", "Gateway promenade", "₹799"),
  ],
  pastMoments: [
    lumaEvent("harbour-sep", "Sunday Social Run", "2026-09-06T06:30:00", "Harbour walk, Colaba", "Free"),
    lumaEvent("harbour-jul", "Sunday Social Run", "2026-07-05T06:30:00", "Harbour walk, Colaba", "Free"),
    lumaEvent("harbour-may", "Sunset Run", "2026-05-16T17:30:00", "Gateway promenade", "₹599"),
    lumaEvent("harbour-mar", "Sunday Social Run", "2025-03-09T06:30:00", "Harbour walk, Colaba", "Free"),
  ],
  reviewSummary: {readState: "enabled", rating: null, count: 2, verifiedCount: 0, distribution: {"1": 0, "2": 0, "3": 0, "4": 1, "5": 1}},
  latestReviews: [
    review("g1", "Sana P.", 5, 21, "Great energy and a really mixed crowd. The run part is short, so anyone can do it.", {eventId: "harbour-may"}),
    review("g2", "Dev T.", 4, 60, "Friendly and well paced. I’d love a clearer start time on Instagram.", {eventId: "harbour-sep"}),
  ],
  followerCount: 38,
  claim: {state: "unclaimed", claimable: true, href: "/claim/harbour-line-run-club/", label: "Claim this page"},
  capabilities: unclaimedDemo.capabilities,
  profile: {
    listingVariant: "unclaimedScraped",
    facts: [
      {label: "Location", value: "Colaba, Mumbai"},
      {label: "Usual meeting point", value: "Harbour walk, Colaba"},
      {label: "Instagram", value: "@harbourlineruns"},
      {label: "Claim state", value: "Unclaimed seed listing"},
    ],
    sources: [
      {type: "eventPlatform", label: "Luma calendar", detail: "Public calendar", href: "https://luma.com/harbour-line", confidence: "high"},
      {type: "socialProfile", label: "Instagram", detail: "@harbourlineruns", href: "https://www.instagram.com/harbourlineruns/", confidence: "high"},
      {type: "user_supplied", label: "User seed input", detail: "Seeded by an operator", confidence: "low"},
    ],
  },
};

/** A claimed page between plans: nothing upcoming yet. */
export const emptyCalendarOrganizerPage: OrganizerPageRecord = {
  ...claimedOrganizerPage,
  links: claimedOrganizerPage.links.filter((link) => !link.pinned),
  upcomingEvents: [],
};

/** A claimed page nobody has reviewed yet. */
export const noReviewsOrganizerPage: OrganizerPageRecord = {
  ...claimedOrganizerPage,
  reviewSummary: {readState: "enabled", rating: null, count: 0, verifiedCount: 0, distribution: {"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}},
  latestReviews: [],
};
