/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Shared aggregate analytics response returned by host and admin analytics callables. Values are aggregate-only and host-safe.
 */
export interface HostAnalyticsCallableResponse {
  generatedAt: string;
  timezone: string;
  range: {
    startDate: string;
    endDate: string;
    granularity: "day" | "week" | "month";
    preset?: string | null;
  };
  scope: {
    organizerIds: string[];
    eventIds: string[];
    organizerName?: string | null;
    eventTitle?: string | null;
  };
  summaryCards: {
    id: string;
    label: string;
    value: number;
    unit: "count" | "percent" | "money_minor" | "rating";
    status: "ready" | "partial" | "missing";
    caption?: string | null;
    previousValue?: number | null;
  }[];
  trend: {
    periodStart: string;
    periodEnd: string;
    metrics: {
      [k: string]: number;
    };
  }[];
  /**
   * @maxItems 25
   */
  topEvents: {
    eventId: string;
    organizerId: string;
    title: string;
    startTime: string;
    status: string;
    capacityLimit: number;
    bookedCount: number;
    checkedInCount: number;
    waitlistedCount: number;
    fillRate: number;
    checkInRate: number;
    grossRevenueMinor: number;
    currency: string;
    checkoutStartedCount: number;
    checkoutDropoffCount: number;
    paymentCompletedCount: number;
    paymentFailedCount: number;
    paymentRefundedCount: number;
    reviewCount: number;
    averageRating: number;
    demandCount: number;
    inviteOpenCount: number;
    mutualMatchCount: number;
    chatStartedCount: number;
    repeatAttendeeCount: number;
    operationalAttendeeCount?: number;
    operationalCheckedInCount?: number;
    attendeeSources?: {
      catchBooking: number;
      hostImport: number;
      hostManual: number;
      webOtp: number;
      providerSync: number;
    };
  }[];
  reviewSummary: {
    newReviews: number;
    publishedReviews: number;
    verifiedReviews: number;
    publicReviews: number;
    ownerResponseCount: number;
    averageRating: number;
  };
  discoverySummary: {
    listingViews: number;
    searchAppearances: number;
    eventViews: number;
    organizerSaves: number;
    eventSaves: number;
    contactClicks: number;
    claimClicks: number;
    outboundClicks: number;
    linkClicks: number;
  };
  /**
   * Owner link clicks in the range (CAT-254): each link's total, most clicked first, and where the clicking visitors came from. Event-scoped reports have none.
   */
  linkSummary: {
    /**
     * @maxItems 50
     */
    links: {
      organizerId: string;
      linkId: string;
      /**
       * The link's current label; null once the owner has removed it.
       */
      label: string | null;
      clicks: number;
    }[];
    /**
     * @maxItems 8
     */
    trafficSources: {
      source:
        | "instagram"
        | "whatsapp"
        | "facebook"
        | "google"
        | "qr"
        | "email"
        | "direct"
        | "other";
      clicks: number;
    }[];
  };
  dataQuality: {
    id: string;
    state: "ok" | "partial" | "missing";
    detail: string;
    owner: string;
    runbook: string;
    nextAction: string;
  }[];
}
