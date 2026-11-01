/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * The Overview tab of an Admin organizer page: its facts, who owns it in Sales, its terms and payments, its journey from nomination to claim, its next events from Catch and from the platforms Catch imports, and where it came from (its acquisition channel and first nominator, from organizerGrowthFacts). The journey is read from the records each step left (the intake request, the approval, claim requests, ownership and events), oldest first; nextStep names what the organizer is waiting on.
 */
export interface AdminGetOrganizerOverviewCallableResponse {
  generatedAt: string;
  organizer: {
    organizerId: string;
    name: string;
    kindLabel: string | null;
    citySlug: string | null;
    cityLabel: string | null;
    area: string | null;
    pageState:
      | "live"
      | "hiddenFromSearch"
      | "hiddenInApp"
      | "draft"
      | "suppressed"
      | "removed";
    publishStatus:
      | "draft"
      | "qa"
      | "published"
      | "suppressed"
      | "removed"
      | null;
    indexStatus: "noindex" | "indexReady" | "indexed" | null;
    canonicalPath: string | null;
    appVisibility: "discoverable" | "hidden" | null;
    claimState:
      | "unclaimed"
      | "claimPending"
      | "claimed"
      | "verified"
      | "suppressed";
    claimedByName: string | null;
    listedAt: string | null;
    /**
     * Whether the page has a cover or profile image; without one it shows a lettermark.
     */
    hasImage: boolean;
    origin: "userCreated" | "scraper" | "adminSeed" | "import" | null;
  };
  salesOwner: {
    uid: string;
    name: string | null;
  } | null;
  nextAction: string | null;
  nextTask: null | {
    taskId: string;
    title: string;
    dueAt: string | null;
    ownerName: string | null;
  };
  terms: {
    /**
     * organizer when the organizer has its own terms, platform when it follows Catch's, unset while Catch's are not configured.
     */
    source: "platform" | "organizer" | "unset";
    rateBasisPoints: number | null;
    capMinor: number | null;
  };
  payments: {
    state: "notConnected" | "connected" | "needsAttention";
    webhookVerified: boolean;
  };
  pendingClaim: null | {
    requestId: string;
    requesterName: string | null;
    requesterRole: string | null;
    createdAt: string | null;
  };
  /**
   * Where the organizer came from, from organizerGrowthFacts/{organizerId}. Null when no facts were recorded for it yet.
   */
  growth: null | {
    channel:
      | "imported"
      | "sales_associate"
      | "partner"
      | "guest"
      | "organizer"
      | "came_to_us"
      | "ads";
    nominator: null | {
      uid: string;
      name: string | null;
      role: "associate" | "partner" | "guest" | "organizer";
    };
    firstPaidBookingAt: string | null;
  };
  /**
   * @maxItems 40
   */
  journey: {
    /**
     * nominated (a person or a run sent Catch a link; detail is the first link), listingBuilt (Catch read the pages; detail is how many events it found), approved (staff approved the listing), listed (the organizer record was made), claimRequested (detail is the requester's role), claimApproved, claimRejected, claimed, firstEvent (detail is its title), firstPaidBooking (its first paid booking was captured).
     */
    kind:
      | "nominated"
      | "listingBuilt"
      | "approved"
      | "listed"
      | "claimRequested"
      | "claimApproved"
      | "claimRejected"
      | "claimed"
      | "firstEvent"
      | "firstPaidBooking";
    at: string | null;
    actorName: string | null;
    detail: string | null;
  }[];
  /**
   * What the organizer is waiting on: the organizer claiming it, staff deciding a claim, or its first event. Null once it has run one.
   */
  nextStep: "claim" | "decideClaim" | "firstEvent" | null;
  /**
   * @maxItems 10
   */
  upcomingEvents: {
    key: string;
    eventId: string;
    source: "catch" | "imported";
    platform:
      | "bookMyShow"
      | "district"
      | "luma"
      | "partiful"
      | "sortMyScene"
      | null;
    title: string;
    startTime: string | null;
    status: "live" | "full" | "draft" | "needsCheck" | "cancelled" | "removed";
  }[];
  upcomingEventCount: number;
}
