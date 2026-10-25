import {createHash} from "node:crypto";
import type {
  EventPublicPageDocument,
} from "../shared/generated/eventPublicPageDocument";
import type {
  OrganizerPublicPageDocument,
} from "../shared/generated/organizerPublicPageDocument";
import {
  projectLivePublicCatchEvent,
  type PublicCatchEvent,
} from "./publicCatchEvent";
import {
  publicExternalEvent,
  type PublicExternalEvent,
} from "./publicExternalEvent";
import {projectPublicOrganizer, type HostListing} from "./publicOrganizer";
import {publicEventAuthorized} from "./publicReadPolicy";
import {projectPublicReview, type PublicReview} from "./publicReview";

/**
 * Assembles the organizer and event public page read models from one
 * organizer's source documents. Pure: the caller reads the sources and
 * writes the result. Publication, suppression and every public field come
 * from the projectors that mirror the website reader; this module only
 * arranges their output into pages and removes dating framing.
 */
export type OrganizerPage =
  Omit<OrganizerPublicPageDocument, "builtAt" | "contentHash">;
export type EventPage =
  Omit<EventPublicPageDocument, "builtAt" | "contentHash">;
export type PageEvent = OrganizerPage["upcomingEvents"][number];
type EventCard = EventPage["moreEvents"][number];
type ReviewSummary = OrganizerPage["reviewSummary"];
type CompatListing = OrganizerPage["listing"];

export interface SourceDocument {
  id: string;
  data: unknown;
}

export interface ReviewCounts {
  count: number;
  verifiedCount: number;
  verifiedAverage: number | null;
  distribution: ReviewSummary["distribution"];
}

export interface OrganizerScopeSources {
  organizerId: string;
  organizer: SourceDocument | null;
  /** Other organizers published at the same canonical path. */
  pathConflict: boolean;
  catchEvents: readonly SourceDocument[];
  externalEvents: readonly SourceDocument[];
  /** Event ids published in both the Catch and imported collections. */
  ambiguousEventIds: ReadonlySet<string>;
  /** The organizer's reviews, newest first. */
  reviews: readonly SourceDocument[];
  reviewCounts: ReviewCounts;
  /** Recommendable organizers in id order, this one included or not. */
  recommendationCandidates: readonly CompatListing[];
  liveMarkets: ReadonlySet<string>;
  now: number;
}

export interface OrganizerScopePages {
  organizerPage: OrganizerPage | null;
  eventPages: EventPage[];
}

export const pageLimits = {
  upcomingEvents: 50,
  pastMoments: 24,
  latestReviews: 50,
  eventReviews: 50,
  eventPageReviews: 2,
  moreEvents: 3,
  recommendedOrganizers: 3,
} as const;

const emptyDistribution = (): ReviewSummary["distribution"] =>
  ({"1": 0, "2": 0, "3": 0, "4": 0, "5": 0});

export function buildOrganizerScope(
  sources: OrganizerScopeSources
): OrganizerScopePages {
  const {organizerId, organizer, now} = sources;
  if (!organizer || organizer.id !== organizerId || sources.pathConflict) {
    return {organizerPage: null, eventPages: []};
  }
  const projected = projectPublicOrganizer(
    organizerId, organizer.data, sources.liveMarkets);
  // Listings that claim the same path are all withheld, never guessed.
  if (!projected) return {organizerPage: null, eventPages: []};
  const listing = compatListing(projected);
  const reviewsReadable =
    listing.capabilities.publicReviews.readState === "enabled";

  const events: PageEvent[] = [
    ...sortById(sources.catchEvents).flatMap((doc) => {
      if (!publicEventAuthorized(doc.id, doc.data)) return [];
      const row = projectLivePublicCatchEvent(doc.id, doc.data, now);
      return row && row.organizerId === organizerId ?
        [catchPageEvent(withoutDatingFraming(row.event))] : [];
    }),
    ...sortById(sources.externalEvents).flatMap((doc) => {
      const row = publicExternalEvent(doc.id,
        (doc.data ?? {}) as Record<string, unknown>);
      return row && row.organizerId === organizerId ?
        [externalPageEvent(withoutExternalDatingFraming(row.event))] : [];
    }),
  ];
  const upcoming = events.filter((item) => isUpcoming(item, now))
    .sort((a, b) => startMillis(a) - startMillis(b) ||
      compareIds(a.eventId, b.eventId));
  const past = events.filter((item) => !isUpcoming(item, now))
    .sort((a, b) => startMillis(b) - startMillis(a) ||
      compareIds(a.eventId, b.eventId));

  const projectReviews = (docs: readonly SourceDocument[]) =>
    docs.flatMap((doc) => {
      const review = projectPublicReview(doc.id, doc.data, organizerId);
      return review ? [review] : [];
    });
  // The website reader takes the newest documents first, then projects.
  const organizerReviews = reviewsReadable ?
    projectReviews(sources.reviews.slice(0, pageLimits.latestReviews)) : [];
  const followerCount = listing.metrics?.followerCount ?? 0;
  const reviewSummary = summaryFor(reviewsReadable, sources.reviewCounts);
  const verified = isVerifiedListing(listing);
  const recommendable = isPubliclyReadable(listing) && verified;

  const organizerPage: OrganizerPage = {
    schemaVersion: 1,
    organizerId,
    path: listing.path,
    legacyPaths: listing.legacyPaths ?? [],
    identity: {
      name: listing.name,
      headline: listing.headline,
      description: listing.description,
      category: listing.category,
      city: listing.city,
      citySlug: listing.citySlug,
      region: listing.region,
      country: listing.country,
      logo: listing.logo,
      formats: listing.formats,
      verified,
      indexing: listing.indexing,
    },
    links: [],
    upcomingEvents: upcoming.slice(0, pageLimits.upcomingEvents),
    pastMoments: past.slice(0, pageLimits.pastMoments),
    reviewSummary,
    latestReviews: organizerReviews,
    followerCount,
    claim: {
      state: listing.authority.claimState as OrganizerPage["claim"]["state"],
      claimable: listing.capabilities.claimRequest.state === "enabled",
      href: listing.claim.href,
      label: listing.claim.label,
    },
    capabilities: listing.capabilities,
    recommendable,
    recommendedOrganizers: sources.recommendationCandidates
      .filter((candidate) => candidate.id !== organizerId)
      .slice(0, pageLimits.recommendedOrganizers),
    listing: {...listing, ...(reviewsReadable ?
      {reviewReadState: "ready" as const} : {})},
  };

  const card = {
    organizerId,
    name: listing.name,
    path: listing.path,
    category: listing.category,
    city: listing.city,
    logo: listing.logo,
    verified,
    followerCount,
    rating: reviewSummary.rating,
    reviewCount: reviewSummary.count,
    verifiedReviewCount: reviewSummary.verifiedCount,
    upcomingEventCount: upcoming.length,
  };
  const eventPages = events
    .filter((item) => !sources.ambiguousEventIds.has(item.eventId))
    .map((item): EventPage => {
      const eventReviews = reviewsReadable ? projectReviews(sources.reviews
        .filter((doc) => (doc.data as {eventId?: unknown} | null)?.eventId ===
          item.eventId)
        .slice(0, pageLimits.eventReviews)) : [];
      return {
        schemaVersion: 1,
        eventId: item.eventId,
        organizerId,
        path: item.path,
        item,
        capacity: capacityFor(item),
        organizer: card,
        reviews: organizerReviews.slice(0, pageLimits.eventPageReviews),
        moreEvents: upcoming.filter((other) => other.eventId !== item.eventId)
          .slice(0, pageLimits.moreEvents).map(eventCard),
        listing: {...listing, ...(reviewsReadable ? {
          reviewReadState: "ready" as const,
          reviews: newestFirst([...organizerReviews, ...eventReviews]),
        } : {})},
      };
    });
  return {organizerPage, eventPages};
}

/** A copy of the value without the named keys. */
export function without<T extends object, K extends string>(
  value: T, keys: readonly K[]
): Omit<T, K> {
  const copy = {...value} as Record<string, unknown>;
  for (const key of keys) delete copy[key];
  return copy as Omit<T, K>;
}

/** Today's listing without events; pages hold the events in sections. */
function compatListing(listing: HostListing): CompatListing {
  return {
    ...without(listing,
      ["catchEvents", "externalEvents", "eventSuccessSummary"]),
    catchEvents: [],
    reviews: [],
  } as CompatListing;
}

/**
 * Catch is not a dating product (CAT-247): public pages never carry the
 * balanced admission label, the rotations experience, the singlesMixer
 * activity or an Event Success scorecard.
 */
export function withoutDatingFraming(
  event: PublicCatchEvent
): PublicCatchEvent {
  const {admissionLabels, catchExperienceActivities} = event;
  const rest = without(event,
    ["admissionLabels", "catchExperienceActivities", "scorecard"]);
  const labels = (admissionLabels ?? [])
    .filter((label) => label !== "balanced");
  const experience = (catchExperienceActivities ?? [])
    .filter((activity) => activity !== "rotations");
  const mixer = rest.activityKind === "singlesMixer";
  return {
    ...rest,
    ...(mixer ? {activityKind: "openActivity"} : {}),
    ...(mixer && rest.title === "Singles mixer" ?
      {title: "Hosted event"} : {}),
    ...(labels.length ? {admissionLabels: labels} : {}),
    ...(experience.length ? {catchExperienceActivities: experience} : {}),
  };
}

function withoutExternalDatingFraming(
  event: PublicExternalEvent
): PublicExternalEvent {
  return event.activityKind === "singlesMixer" ?
    {...event, activityKind: "openActivity"} : event;
}

export function eventPath(eventId: string): string {
  return `/events/${encodeURIComponent(eventId)}/`;
}

function catchPageEvent(event: PublicCatchEvent): PageEvent {
  const registrationAccess = event.registrationAccess ?? "app";
  return {
    source: "catch",
    eventId: event.id,
    path: eventPath(event.id),
    event,
    booking: {
      kind: "catch",
      path: eventPath(event.id),
      registrationAccess,
      spotsLeft: Math.max(0, event.capacityLimit - event.bookedCount),
    },
  };
}

function externalPageEvent(event: PublicExternalEvent): PageEvent {
  return {
    source: "external",
    eventId: event.id,
    path: eventPath(event.id),
    event,
    booking: {kind: "external", url: event.sourceHref,
      label: event.sourceLabel},
  };
}

function eventCard(item: PageEvent): EventCard {
  const {event} = item;
  return {
    source: item.source,
    eventId: item.eventId,
    path: item.path,
    title: event.title,
    activityKind: event.activityKind,
    startTime: event.startTime,
    endTime: event.endTime,
    date: event.date,
    location: event.location,
    priceLabel: event.priceLabel,
    photoUrl: item.source === "catch" ? item.event.photoUrl ?? null : null,
    booking: item.booking.kind === "catch" ?
      {kind: "catch", path: item.booking.path} : item.booking,
  };
}

function capacityFor(item: PageEvent): EventPage["capacity"] {
  if (item.source === "external") {
    return {state: "external", capacityLimit: null, bookedCount: null,
      waitlistedCount: null, spotsLeft: null, waitlistAvailable: false};
  }
  const {event} = item;
  const spotsLeft = Math.max(0, event.capacityLimit - event.bookedCount);
  return {
    state: spotsLeft > 0 ? "open" : "full",
    capacityLimit: event.capacityLimit,
    bookedCount: event.bookedCount,
    waitlistedCount: event.waitlistedCount,
    spotsLeft,
    waitlistAvailable: event.waitlistAvailable === true,
  };
}

function summaryFor(readable: boolean, counts: ReviewCounts): ReviewSummary {
  if (!readable) {
    return {readState: "disabled", rating: null, count: 0, verifiedCount: 0,
      distribution: emptyDistribution()};
  }
  const average = counts.verifiedAverage;
  return {
    readState: "enabled",
    // The canonical score averages verified reviews only.
    rating: counts.verifiedCount > 0 && average !== null && average > 0 &&
      average <= 5 ? average : null,
    count: counts.count,
    verifiedCount: counts.verifiedCount,
    distribution: counts.distribution,
  };
}

/** website/src/features/events/eventDetailModel.ts upcoming rule. */
export function isUpcoming(item: PageEvent, now: number): boolean {
  if (item.source === "catch") {
    const end = Date.parse(item.event.endTime ?? item.event.startTime);
    return item.event.timeline === "upcoming" &&
      (!Number.isFinite(end) || end >= now);
  }
  const end = Date.parse(item.event.endTime ?? item.event.startTime);
  return !Number.isFinite(end) || end >= now;
}

function startMillis(item: PageEvent): number {
  return Date.parse(item.event.startTime);
}

function compareIds(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function sortById(docs: readonly SourceDocument[]): SourceDocument[] {
  return [...docs].sort((a, b) => compareIds(a.id, b.id));
}

function newestFirst(reviews: PublicReview[]): PublicReview[] {
  return [...new Map(reviews.map((review) => [review.id, review])).values()]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

/**
 * website/src/features/organizers/organizerPolicy.ts: published and not
 * suppressed.
 */
function isPubliclyReadable(listing: CompatListing): boolean {
  return listing.authority.publishStatus === "published" &&
    listing.authority.claimState !== "suppressed";
}

/** organizerPolicy.ts trust state firstParty or ownerVerified. */
export function isVerifiedListing(listing: CompatListing): boolean {
  const {authority} = listing;
  if (authority.claimState === "suppressed" ||
      ["suppressed", "removed"].includes(authority.publishStatus)) {
    return false;
  }
  return authority.ownershipState === "userCreated" ||
    authority.claimState === "verified" ||
    authority.verificationStatus === "ownerVerified";
}

/** Recommendable listings as today's rail shows them: no events, reviews. */
export function recommendationCard(
  page: Pick<OrganizerPage, "listing">
): CompatListing {
  return {...without(page.listing, ["reviewReadState"]), reviews: []} as
    CompatListing;
}

/** Hash of page content without builtAt, so unchanged rebuilds skip writes. */
export function contentHash(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => compareIds(a, b));
    return `{${entries.map(([key, item]) =>
      `${JSON.stringify(key)}:${canonicalJson(item)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
