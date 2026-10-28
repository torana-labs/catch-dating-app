import type {
  HostListing,
  HostListingCatchEvent,
  HostListingExternalEvent,
  HostListingReview,
  OrganizerPublicPageDocument,
} from "./types";

type PageDocument = OrganizerPublicPageDocument;
export type OrganizerPageEvent = PageDocument["upcomingEvents"][number];
export type OrganizerPageReview = PageDocument["latestReviews"][number];
/** An owner link; `showUntil` is an ISO time once it leaves the server. */
export type OrganizerPageLink = Omit<PageDocument["links"][number], "showUntil"> & {showUntil: string | null};

/**
 * What the organiser page renders: the `organizerPublicPage` read model's
 * sections, plus the facts, sources and host that only its listing payload
 * carries so far. Pages are built ahead of the read, so a reader moves events
 * that have since ended from upcoming to past (`atReadTime`).
 */
export interface OrganizerPageRecord {
  organizerId: string;
  path: string;
  identity: PageDocument["identity"];
  links: OrganizerPageLink[];
  upcomingEvents: OrganizerPageEvent[];
  pastMoments: OrganizerPageEvent[];
  reviewSummary: PageDocument["reviewSummary"];
  latestReviews: OrganizerPageReview[];
  followerCount: number;
  claim: PageDocument["claim"];
  capabilities: PageDocument["capabilities"];
  profile: Pick<HostListing, "listingVariant" | "facts" | "sources" | "host">;
}

const pastLimit = 24;

/** The server's copy of a read-model document, safe to hand to the client. */
export function organizerPageRecord(page: PageDocument, readAt: number): OrganizerPageRecord {
  const {listing} = page;
  return atReadTime({
    organizerId: page.organizerId,
    path: page.path,
    identity: page.identity,
    links: page.links.map((link) => ({...link, showUntil: link.showUntil ? isoTime(link.showUntil) : null})),
    upcomingEvents: page.upcomingEvents,
    pastMoments: page.pastMoments,
    reviewSummary: page.reviewSummary,
    latestReviews: page.latestReviews,
    followerCount: page.followerCount,
    claim: page.claim,
    capabilities: page.capabilities,
    profile: {listingVariant: listing.listingVariant, facts: listing.facts, sources: listing.sources,
      ...(listing.host ? {host: listing.host} : {})},
  }, readAt);
}

/**
 * The same record from a listing, for pages assembled from their sources
 * until every environment has read models, and for the static build. It
 * follows the read model's rules in functions/src/publicPages/pageModel.ts.
 */
export function organizerPageFromListing(listing: HostListing, readAt: number): OrganizerPageRecord {
  const events = [
    ...(listing.catchEvents ?? []).map(catchPageEvent),
    ...(listing.externalEvents ?? []).map(externalPageEvent),
  ];
  const policy = listing as HostListing & {authority?: {claimState?: string; ownershipState?: string; verificationStatus?: string}};
  const claimState = policy.authority?.claimState;
  const readable = listing.capabilities.publicReviews.readState === "enabled";
  const reviews = readable ? [...listing.reviews].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)) : [];
  return atReadTime({
    organizerId: listing.id,
    path: listing.path,
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
      verified: policy.authority?.ownershipState === "userCreated" || claimState === "verified" ||
        policy.authority?.verificationStatus === "ownerVerified",
      indexing: listing.indexing,
    },
    links: [],
    upcomingEvents: events,
    pastMoments: [],
    reviewSummary: reviewSummaryOf(readable, reviews),
    latestReviews: reviews,
    followerCount: listing.metrics?.followerCount ?? 0,
    claim: {
      state: claimState === "claimPending" || claimState === "claimed" || claimState === "verified" ? claimState : "unclaimed",
      claimable: listing.capabilities.claimRequest.state === "enabled",
      href: listing.claim.href,
      label: listing.claim.label,
    },
    capabilities: listing.capabilities,
    profile: {listingVariant: listing.listingVariant, facts: listing.facts, sources: listing.sources,
      ...(listing.host ? {host: listing.host} : {})},
  }, readAt);
}

/** Upcoming soonest first and past most recent first, split at the read time. */
export function atReadTime(record: OrganizerPageRecord, readAt: number): OrganizerPageRecord {
  const all = [...record.upcomingEvents, ...record.pastMoments];
  const upcoming = all.filter((item) => isUpcoming(item, readAt)).sort((a, b) => startOf(a) - startOf(b));
  const past = all.filter((item) => !isUpcoming(item, readAt)).sort((a, b) => startOf(b) - startOf(a));
  return {...record, upcomingEvents: upcoming, pastMoments: past.slice(0, pastLimit)};
}

function isUpcoming(item: OrganizerPageEvent, readAt: number) {
  const end = Date.parse(item.event.endTime ?? item.event.startTime);
  const open = !Number.isFinite(end) || end >= readAt;
  return item.source === "catch" ? item.event.timeline === "upcoming" && open : open;
}

const startOf = (item: OrganizerPageEvent) => Date.parse(item.event.startTime) || 0;
const eventPath = (eventId: string) => `/events/${encodeURIComponent(eventId)}/`;

function catchPageEvent(event: HostListingCatchEvent): OrganizerPageEvent {
  return {
    source: "catch", eventId: event.id, path: eventPath(event.id), event,
    booking: {kind: "catch", path: eventPath(event.id), registrationAccess: event.registrationAccess ?? "app",
      spotsLeft: Math.max(0, event.capacityLimit - event.bookedCount)},
  };
}

function externalPageEvent(event: HostListingExternalEvent): OrganizerPageEvent {
  return {
    source: "external", eventId: event.id, path: eventPath(event.id), event,
    booking: {kind: "external", url: event.sourceHref, label: event.sourceLabel},
  };
}

function reviewSummaryOf(readable: boolean, reviews: readonly HostListingReview[]): OrganizerPageRecord["reviewSummary"] {
  const distribution = {"1": 0, "2": 0, "3": 0, "4": 0, "5": 0};
  for (const review of reviews) {
    const stars = String(Math.min(5, Math.max(1, Math.round(review.rating)))) as keyof typeof distribution;
    distribution[stars] += 1;
  }
  const verified = reviews.filter((review) => review.verificationStatus === "verified");
  // The canonical score averages verified reviews only.
  const rating = verified.length ? verified.reduce((sum, review) => sum + review.rating, 0) / verified.length : null;
  return readable ?
    {readState: "enabled", rating, count: reviews.length, verifiedCount: verified.length, distribution} :
    {readState: "disabled", rating: null, count: 0, verifiedCount: 0, distribution};
}

function isoTime(value: {_seconds: number; _nanoseconds: number}) {
  return new Date(value._seconds * 1000 + Math.floor(value._nanoseconds / 1e6)).toISOString();
}
