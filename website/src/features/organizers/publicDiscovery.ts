import {activityKindFromValue, type CatchActivityKind} from "@catch/web-ui";
import {websiteCopy} from "@content/generated";
import {organizerListingCopy} from "@content/organizer";
import type {
  EventActionCardModel,
  PublicEventCardModel,
  PublicSearchSuggestion,
} from "../../shared/ui/primitives";
import {activityMeta, type ActivityMeta} from "@content/marketing";
import {eligibleHomeCatchEvents} from "./homeEventEligibility";
import {isFutureCatchEvent} from "./selectors";
import {isPubliclyReadableListing} from "./selectors";
import {organizerPolicyForListing} from "./organizerPolicy";
import {eventDetailCopy} from "../../content/events";
import {eventDetailPath} from "../events/eventDetailModel";
import type {HostListing, HostListingCatchEvent, HostListingExternalEvent} from "./types";

export interface OrganizerEventHighlight {
  id: string;
  title: string;
  kind: string;
  detail: string;
  href: string;
  activityToken: string;
}

export function buildPublicEventSummaries(
  listings: HostListing[],
  options: {
    now: number;
    cities: ReadonlyArray<{
      id: string;
      label: string;
      aliases: readonly string[];
      status: "live" | "waitlist";
    }>;
  }
): PublicEventCardModel[] {
  return eligibleHomeCatchEvents<HostListingCatchEvent, HostListing>(
    listings.filter(isPubliclyReadableListing),
    options
  ).map(({event, listing}) => {
    const activity = activityForKind(event.activityKind);
    return {
      id: `${listing.id}-${event.id}`,
      title: event.title,
      href: eventDeepLinkForListing(listing, event),
      hostName: listing.name,
      activityLabel: activity.label,
      activityToken: activity.token,
      city: listing.city,
      date: event.date,
      location: event.location,
      priceLabel: event.priceLabel,
      bookedCount: event.bookedCount,
      capacityLimit: event.capacityLimit,
      waitlistedCount: event.waitlistedCount,
      summary: event.summary || listing.description,
    };
  });
}

export function buildPublicSearchSuggestions(
  listings: HostListing[],
  events: PublicEventCardModel[]
): PublicSearchSuggestion[] {
  const publicListings = listings.filter(isPubliclyReadableListing);
  const formatSuggestions = new Map<string, PublicSearchSuggestion>();
  for (const listing of publicListings) {
    for (const format of listing.formats) {
      const key = format.toLowerCase();
      if (formatSuggestions.has(key)) continue;
      const activity = activityForListing(listing);
      formatSuggestions.set(key, {
        id: `format-${key.replace(/[^a-z0-9]+/g, "-")}`,
        href: `/organizers/?q=${encodeURIComponent(format)}`,
        label: format,
        meta: `Browse ${format.toLowerCase()} organizers`,
        type: "format",
        activityToken: activity.token,
      });
    }
  }

  return [
    ...events.map((event) => ({
      id: `event-${event.id}`,
      href: event.href,
      label: event.title,
      meta: `${event.hostName} · ${event.city} · ${event.date}`,
      type: "event" as const,
      activityToken: event.activityToken,
    })),
    ...publicListings.map((listing) => {
      const activity = activityForListing(listing);
      return {
        id: `organizer-${listing.id}`,
        href: listing.path,
        label: listing.name,
        meta: `${listing.category} · ${listing.city} · ${organizerPolicyForListing(listing).badge.label}`,
        type: "organizer" as const,
        activityToken: activity.token,
      };
    }),
    ...formatSuggestions.values(),
  ];
}

export function eventHighlightsForListing(
  listing: HostListing,
  queryTerms: string[]
): OrganizerEventHighlight[] {
  const highlights: Array<OrganizerEventHighlight & {searchText: string}> = [
    ...(listing.catchEvents ?? []).map((event) => {
      const activity = activityForKind(event.activityKind);
      const isFuture = isFutureCatchEvent(event);
      const detail = [
        event.date,
        event.location,
        event.priceLabel,
        event.capacityLimit ? `${event.bookedCount}/${event.capacityLimit} booked` : null,
      ].filter(Boolean).join(" · ");
      return {
        id: `catch-${event.id}`,
        title: event.title,
        kind: isFuture ? "Future Catch event" : event.timeline === "past" ? "Past Catch event" : "Catch event",
        detail,
        href: eventDeepLinkForListing(listing, event),
        activityToken: activity.token,
        searchText: [
          event.title,
          event.role,
          event.activityKind,
          event.timeline,
          event.date,
          event.location,
          event.summary,
          event.priceLabel,
        ].filter(Boolean).join(" ").toLowerCase(),
      };
    }),
    ...(listing.externalEvents ?? []).map((event) => {
      const activity = activityForKind(event.activityKind);
      const isFuture = isFutureExternalEvent(event);
      const detail = [
        event.date,
        event.location,
        event.priceLabel,
        event.sourceLabel,
      ].filter(Boolean).join(" · ");
      return {
        id: `external-${event.id}`,
        title: event.title,
        kind: isFuture ? "Upcoming external event" : "Read-only external event",
        detail,
        href: externalEventDeepLinkForListing(listing, event),
        activityToken: activity.token,
        searchText: [
          event.title,
          event.activityKind,
          event.date,
          event.location,
          event.summary,
          event.priceLabel,
          event.sourceLabel,
          event.dedupeKey,
        ].filter(Boolean).join(" ").toLowerCase(),
      };
    }),
    ...(listing.eventEvidence ?? []).map((event, index) => {
      const activity = activityForListing(listing);
      const detail = [event.date, event.location, event.sourceLabel].filter(Boolean).join(" · ");
      return {
        id: `source-${listing.id}-${index}`,
        title: event.title,
        kind: "Source event",
        detail,
        href: listing.path,
        activityToken: activity.token,
        searchText: [
          event.title,
          event.date,
          event.location,
          event.summary,
          event.sourceLabel,
          ...(event.facts ?? []),
        ].filter(Boolean).join(" ").toLowerCase(),
      };
    }),
  ];

  const matched = queryTerms.length
    ? highlights.filter((event) => queryTerms.every((term) => event.searchText.includes(term)))
    : [];
  return (matched.length ? matched : highlights)
    .slice(0, 2)
    .map(({searchText: _searchText, ...event}) => event);
}

export function activityForListing(listing: HostListing): ActivityMeta {
  const text = [
    listing.category,
    ...listing.formats,
    ...(listing.catchEvents ?? []).map((event) => event.activityKind),
    ...(listing.externalEvents ?? []).map((event) => event.activityKind),
  ].join(" ").toLowerCase();
  if (text.includes("dinner") || text.includes("table")) return activityMeta.dinner;
  if (text.includes("mixer") || text.includes("singles")) return activityMeta.singlesMixer;
  if (text.includes("run")) return activityMeta.socialRun;
  if (text.includes("quiz") || text.includes("trivia")) return activityMeta.pubQuiz;
  if (text.includes("padel") || text.includes("pickle") || text.includes("tennis") || text.includes("racket")) {
    return activityMeta.racket;
  }
  return activityMeta.open;
}

/**
 * The activity an organiser cover draws: its events' kind first, then its
 * category and formats. Organisers without either draw the open format.
 */
export function activityKindForListing(listing: HostListing): CatchActivityKind {
  const eventKind = [...(listing.catchEvents ?? []), ...(listing.externalEvents ?? [])]
    .map((event) => activityKindFromValue(event.activityKind))
    .find((kind) => kind !== "openActivity");
  if (eventKind) return eventKind;
  const text = [listing.category, ...listing.formats].join(" ").toLowerCase();
  return listingActivityWords.find(([pattern]) => pattern.test(text))?.[1] ?? "openActivity";
}

const listingActivityWords: ReadonlyArray<readonly [RegExp, CatchActivityKind]> = [
  [/dinner|supper|table/, "dinner"],
  [/mixer|singles/, "singlesMixer"],
  [/quiz|trivia/, "pubQuiz"],
  [/crawl/, "barCrawl"],
  [/pickle/, "pickleball"],
  [/padel/, "padel"],
  [/tennis/, "tennis"],
  [/badminton/, "badminton"],
  [/\brun/, "socialRun"],
  [/walk|hike/, "walking"],
  [/cycl|\bbike|\bride/, "cycling"],
  [/spin/, "spinClass"],
  [/yoga/, "yoga"],
  [/strength|\bgym|lifting/, "strengthTraining"],
];

/** The organiser's own imagery: today, its first published event photo. */
export function coverPhotoForListing(listing: HostListing): string | null {
  return listing.catchEvents?.find((event) => event.photoUrl?.trim())?.photoUrl ?? null;
}

export function activityForKind(kind: string): ActivityMeta {
  const normalized = kind.replace(/[^a-z0-9]+/gi, "").toLowerCase();
  if (normalized === "socialrun") return activityMeta.socialRun;
  if (normalized === "singlesmixer") return activityMeta.singlesMixer;
  if (normalized === "pubquiz") return activityMeta.pubQuiz;
  if (normalized === "running") return activityMeta.running;
  if (normalized === "dinner") return activityMeta.dinner;
  if (normalized === "racket" || normalized === "tennis" || normalized === "padel" || normalized === "pickleball") {
    return activityMeta.racket;
  }
  return activityMeta.open;
}

export function absoluteListingUrl(listing: HostListing) {
  return `${window.location.origin}${listing.path}`;
}

export function eventAnchorId(event: HostListingCatchEvent) {
  return `event-${event.id}`;
}

export function eventDeepLinkForListing(
  _listing: HostListing,
  event: HostListingCatchEvent
) {
  return eventDetailPath(event.id);
}

export function externalEventAnchorId(event: HostListingExternalEvent) {
  return `external-event-${event.id}`;
}

export function externalEventDeepLinkForListing(
  _listing: HostListing,
  event: HostListingExternalEvent
) {
  return eventDetailPath(event.id);
}

export function isFutureExternalEvent(event: HostListingExternalEvent) {
  const startTime = Date.parse(event.startTime);
  return Number.isFinite(startTime) && startTime >= Date.now();
}

export function eventActionCardForListing(
  listing: HostListing,
  event: HostListingCatchEvent
): EventActionCardModel {
  const isFuture = isFutureCatchEvent(event);
  const activity = activityForKind(event.activityKind);
  const actions: EventActionCardModel["actions"] = [{
    href: eventDetailPath(event.id),
    label: eventDetailCopy.hero.viewDetailsAction,
    trackingLabel: "listing_event_open_details",
  }];

  if (event.scorecard) {
    actions.push({
      href: "#event-success",
      label: websiteCopy["publicdiscovery_0361"],
      variant: "secondary",
      trackingLabel: "listing_event_success",
    });
  } else if (organizerPolicyForListing(listing).canReadPublicReviews) {
    actions.push({
      href: "#reviews",
      label: organizerListingCopy.eventActions.readOrganizerReviews,
      variant: "secondary",
      trackingLabel: "listing_organizer_reviews",
    });
  }

  return {
    id: eventAnchorId(event),
    eyebrow: isFuture ? "Upcoming Catch event" : "Past Catch event",
    title: event.title,
    body: event.summary,
    activityToken: activity.token,
    meta: [
      {label: websiteCopy["publicdiscovery_0357"], value: event.date},
      {label: websiteCopy["publicdiscovery_0358"], value: event.location},
      {label: websiteCopy["publicdiscovery_0360"], value: event.priceLabel},
      {label: websiteCopy["publicdiscovery_0354"], value: `${event.capacityLimit} spots`},
    ],
    counts: [
      {label: websiteCopy["publicdiscovery_0353"], value: event.bookedCount},
      {label: websiteCopy["publicdiscovery_0355"], value: event.checkedInCount},
      {label: websiteCopy["publicdiscovery_0363"], value: event.waitlistedCount},
    ],
    actions,
  };
}

export function externalEventActionCardForListing(
  listing: HostListing,
  event: HostListingExternalEvent
): EventActionCardModel {
  const isFuture = isFutureExternalEvent(event);
  const activity = activityForKind(event.activityKind);
  const actions: EventActionCardModel["actions"] = [
    {
      href: eventDetailPath(event.id),
      label: eventDetailCopy.hero.viewDetailsAction,
      trackingLabel: "external_event_open_details",
    },
    {
      href: event.sourceHref,
      label: websiteCopy["publicdiscovery_0359"],
      target: "_blank",
      rel: "noreferrer",
      variant: "secondary",
      trackingLabel: "external_event_source",
    },
  ];
  if (organizerPolicyForListing(listing).canRequestClaim) {
    actions.push({
      href: "#claim",
      label: websiteCopy["publicdiscovery_0356"],
      variant: "secondary",
      trackingLabel: "external_event_claim",
    });
  }
  return {
    id: externalEventAnchorId(event),
    eyebrow: isFuture ? "Upcoming external event" : "Read-only external event",
    title: event.title,
    body: event.summary,
    activityToken: activity.token,
    meta: [
      {label: websiteCopy["publicdiscovery_0357"], value: event.date},
      {label: websiteCopy["publicdiscovery_0358"], value: event.location},
      {label: websiteCopy["publicdiscovery_0360"], value: event.priceLabel},
      {label: websiteCopy["publicdiscovery_0362"], value: event.sourceLabel},
    ],
    counts: [
      {
        label: event.externalLinkCount === 1 ? "external link" : "external links",
        value: event.externalLinkCount,
      },
    ],
    actions,
  };
}
