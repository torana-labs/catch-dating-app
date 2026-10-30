import {brand} from "./brand.ts";

export const organizerListingCopy = {
  badges: {
    crawledUnclaimed: {compact: "Unclaimed", label: "Unclaimed listing"},
    sourceBacked: {compact: "Source-backed", label: "Source-backed listing"},
    claimPending: {compact: "In review", label: "Claim under review"},
    claimedUnverified: {compact: "Claimed", label: "Claimed"},
    firstParty: {compact: brand.name, label: `${brand.name} organizer`},
    ownerVerified: {compact: "Verified", label: "Owner verified"},
    suppressed: {compact: "Unavailable", label: "Listing unavailable"},
    unknown: {compact: "Unknown", label: "Status unavailable"},
  },
  eventActions: {
    readOrganizerReviews: "Read organizer reviews",
  },
  claims: {
    runtimeUnavailable: "Claim submission needs the website Firebase/App Check config.",
    introEyebrow: "For organisers",
    introTitle: "Help guests find the right details.",
    introBody: `${brand.name} builds unclaimed profiles from public sources. The organiser can claim this page to manage what appears here.`,
  },
  detail: {
    aboutTitle: (name: string) => `About ${name}`,
    /** Public summary for a listing whose owner has not written one. */
    sourcedSummary: (name: string, category: string, city: string) => {
      const kind = category.charAt(0).toLowerCase() + category.slice(1);
      const article = /^[aeiou]/iu.test(kind) ? "an" : "a";
      return `${name} is ${article} ${kind} in ${city}. This profile is built from public sources and hasn’t been confirmed by the organiser yet.`;
    },
    claimStateLabel: "Claim state",
    eventsEyebrow: "Events",
    formatsLabel: "What they do",
    freshnessLabel: "Freshness",
    organizerEyebrow: "Organizer",
    ownershipLabel: "Ownership",
    railAriaLabel: (name: string) => `${name} listing actions`,
    shareAction: "Share",
    sourceCountLabel: "Source count",
    sourcesEyebrow: "Sources",
    viewEventsAction: "View events",
    viewSourcesAction: "View sources",
  },
  reviews: {
    unavailableLabel: "Reviews unavailable",
    unavailableTitle: "Public reviews are not available for this listing.",
    pendingAcknowledgement: "Review submitted for moderation.",
    runtimeUnavailable: "Review submission is unavailable in this website build.",
  },
} as const;
