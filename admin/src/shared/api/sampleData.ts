import {
  AdminActionExecutionRecord,
  AdminClubDetails,
  AdminEventDetails,
  AdminExternalEventListRow,
  AdminOverviewResponse,
  HostAnalyticsResponse,
  UserAnalyticsGranularity,
  UserAnalyticsQueryPayload,
  UserAnalyticsRangePreset,
  UserAnalyticsResponse,
} from "../types/adminTypes";

export const sampleAdminActionExecutionRows: AdminActionExecutionRecord[] = [
  {
    schemaVersion: 1,
    executionId: "44ee2154-f136-4ff0-b903-7284732bb197",
    actionId: "events.list",
    callable: "adminListEventDetails",
    actorUid: "agent-release-audit",
    actorRoles: ["admin"],
    status: "succeeded",
    requestHash: "a".repeat(64),
    responseHash: "b".repeat(64),
    target: null,
    errorCode: null,
    errorMessage: null,
    cliVersion: "1.0.0",
    startedAt: "2026-07-23T08:29:42.000Z",
    finishedAt: "2026-07-23T08:29:43.000Z",
    updatedAt: "2026-07-23T08:29:43.000Z",
  },
  {
    schemaVersion: 1,
    executionId: "d84258b1-a59e-4a03-9001-ab1cfd94f189",
    actionId: "access.decide",
    callable: "adminDecideAccessApplication",
    actorUid: "agent-access-review",
    actorRoles: ["support"],
    status: "failed",
    requestHash: "d".repeat(64),
    responseHash: null,
    target: "sample-applicant",
    errorCode: "failed-precondition",
    errorMessage: "Application state changed after review was prepared.",
    cliVersion: "1.0.0",
    startedAt: "2026-07-23T08:20:00.000Z",
    finishedAt: "2026-07-23T08:20:01.000Z",
    updatedAt: "2026-07-23T08:20:01.000Z",
  },
  {
    schemaVersion: 1,
    executionId: "c746501d-2e41-4551-9b55-1c885b045eef",
    actionId: "events.update",
    callable: "adminUpdateEventDetails",
    actorUid: "agent-event-quality",
    actorRoles: ["admin"],
    status: "indeterminate",
    requestHash: "e".repeat(64),
    responseHash: null,
    target: "mumbai-mixer-1",
    errorCode: "ADMIN_CALLABLE_TIMEOUT",
    errorMessage: "The callable result was lost; inspect the event before retry.",
    cliVersion: "1.0.0",
    startedAt: "2026-07-23T08:10:00.000Z",
    finishedAt: "2026-07-23T08:10:30.000Z",
    updatedAt: "2026-07-23T08:10:30.000Z",
  },
];

const sampleMarketsBySlug: Record<
  string,
  {
    cityId: string;
    marketId: string;
    citySlug: string;
    cityName: string;
    regionName: string;
    countryCode: string;
    countryName: string;
  }
> = {
  indore: {
    cityId: "in-mp-indore",
    marketId: "in-mp-indore",
    citySlug: "indore",
    cityName: "Indore",
    regionName: "Madhya Pradesh",
    countryCode: "IN",
    countryName: "India",
  },
  mumbai: {
    cityId: "in-mh-mumbai",
    marketId: "in-mh-mumbai",
    citySlug: "mumbai",
    cityName: "Mumbai",
    regionName: "Maharashtra",
    countryCode: "IN",
    countryName: "India",
  },
};

export const sampleOverview: AdminOverviewResponse = {
  generatedAt: "2026-06-01T08:30:00.000Z",
  timezone: "UTC",
  metrics: [
    {id: "signupsToday", label: "Signups today", value: 18},
    {id: "signupsThisWeek", label: "Signups this week", value: 96},
    {id: "completedProfiles", label: "Completed profiles", value: 714},
    {id: "openReports", label: "Open reports", value: 4},
    {id: "pendingModerationFlags", label: "Pending moderation", value: 7},
    {id: "eventSafetyReports", label: "Event safety reports", value: 2},
    {id: "pendingApplications", label: "Pending applications", value: 41},
    {id: "pendingClubClaims", label: "Pending organizer claims", value: 2},
    {id: "indexReviewPages", label: "Index review pages", value: 2},
    {id: "activeHosts", label: "Active host claims", value: 23},
    {id: "activeEvents", label: "Active events", value: 31},
    {id: "completedPayments", label: "Completed payments", value: 186},
    {id: "failedPayments", label: "Failed payments", value: 3},
    {id: "signupFailedPayments", label: "Signup-failed payments", value: 1},
    {id: "payoutRestrictedHosts", label: "Payout issues", value: 5},
  ],
  queues: {
    safetyReports: [
      {
        id: "reports/report-1",
        title: "harassment",
        detail: "target user_829 - chat",
        status: "open",
        createdAt: "2026-06-01T07:44:00.000Z",
        targetPath: "reports/report-1",
      },
      {
        id: "reports/report-2",
        title: "fake_profile",
        detail: "target user_115 - profile",
        status: "open",
        createdAt: "2026-06-01T05:02:00.000Z",
        targetPath: "reports/report-2",
      },
    ],
    moderationFlags: [
      {
        id: "moderationFlags/flag-1",
        title: "banned_text",
        detail: "target user_322 - chat_message",
        status: "pending",
        createdAt: "2026-06-01T06:16:00.000Z",
        targetPath: "moderationFlags/flag-1",
      },
      {
        id: "moderationFlags/flag-2",
        title: "explicit_photo",
        detail: "target user_667 - profile_photo",
        status: "pending",
        createdAt: "2026-05-31T19:31:00.000Z",
        targetPath: "moderationFlags/flag-2",
      },
    ],
    eventSafetyReports: [
      {
        id: "eventSafetyReports/event-1_user-1",
        title: "Event delhi-mixer-14",
        detail: "club south-delhi-runs - reporter user_441",
        status: "open",
        createdAt: "2026-06-01T03:28:00.000Z",
        targetPath: "eventSafetyReports/event-1_user-1",
      },
    ],
    accessApplications: [
      {
        id: "accessApplications/application-1",
        title: "Maya Shah",
        detail: "delhi - attendee - wants to host",
        status: "pending",
        createdAt: "2026-06-01T02:11:00.000Z",
        targetPath: "accessApplications/application-1",
      },
      {
        id: "accessApplications/application-2",
        title: "Rohan Mehta",
        detail: "mumbai - host",
        status: "pending",
        createdAt: "2026-05-31T22:05:00.000Z",
        targetPath: "accessApplications/application-2",
      },
    ],
    clubClaimRequests: [
      {
        id: "organizerClaimRequests/club_claim_afterfly",
        title: "AFTER FLY owner",
        detail: "club afterfly - founder - hello@afterfly.in - 2 proof links",
        status: "pending",
        createdAt: "2026-06-01T01:48:00.000Z",
        targetPath: "organizerClaimRequests/club_claim_afterfly",
      },
      {
        id: "organizerClaimRequests/club_claim_bhag",
        title: "Bhag Club manager",
        detail: "club bhag - manager - no contact - 1 proof links",
        status: "pending",
        createdAt: "2026-05-31T20:14:00.000Z",
        targetPath: "organizerClaimRequests/club_claim_bhag",
      },
    ],
    clubIndexReviews: [
      {
        id: "organizers/afterfly",
        title: "AFTER FLY",
        detail: "/organizers/afterfly/ - medium - sourceBacked",
        status: "indexed",
        createdAt: "2026-06-01T12:00:00.000Z",
        targetPath: "organizers/afterfly",
      },
      {
        id: "organizers/bhag",
        title: "Bhag Run Club",
        detail: "/organizers/bhag/ - medium - sourceBacked",
        status: "indexed",
        createdAt: "2026-06-01T11:00:00.000Z",
        targetPath: "organizers/bhag",
      },
    ],
    paymentIssues: [
      {
        id: "payments/payment-1",
        title: "INR 150000",
        detail: "event bandra-run-4 - user user_221",
        status: "failed",
        createdAt: "2026-06-01T04:52:00.000Z",
        targetPath: "payments/payment-1",
      },
    ],
  },
  dataQuality: [
    {
      id: "signup-source",
      label: "Signup metric source",
      state: "warning",
      detail: "Using Auth metadata until server-owned profile timestamps exist.",
      owner: "Growth analytics",
      runbook: "docs/data_contracts.md",
      nextAction:
        "Replace proxy metrics when server-owned profile timestamps land.",
    },
    {
      id: "finance-ledger",
      label: "Host settlement ledger",
      state: "blocked",
      detail: "Commission and settlement records are not modeled yet.",
      owner: "Finance ops",
      runbook: "docs/data_contracts.md",
      nextAction:
        "Define the ledger/read-model contract before enabling finance actions.",
    },
    {
      id: "exports",
      label: "BigQuery marts",
      state: "warning",
      detail: "Participant exports exist; users/events/payments exports are next.",
      owner: "Data/platform ops",
      runbook: "docs/release_operations.md",
      nextAction:
        "Check export freshness and backfill only through a documented tool.",
    },
  ],
};

export const sampleHostAnalytics: HostAnalyticsResponse = {
  generatedAt: "2026-06-01T08:30:00.000Z",
  timezone: "UTC",
  range: {
    startDate: "2026-05-03T00:00:00.000Z",
    endDate: "2026-06-01T23:59:59.999Z",
    granularity: "day",
    preset: "30d",
  },
  scope: {
    organizerIds: ["afterfly", "bhag"],
    clubIds: ["afterfly", "bhag"],
    eventIds: ["afterfly-social-run-1", "bhag-sunday-run-1"],
    clubName: null,
    eventTitle: null,
  },
  summaryCards: [
    {
      id: "listingViews",
      label: "Listing views",
      value: 0,
      unit: "count",
      status: "missing",
      caption: "Public listing view tracking is not installed yet.",
    },
    {
      id: "bookings",
      label: "Bookings",
      value: 186,
      unit: "count",
      status: "ready",
    },
    {
      id: "attendanceRate",
      label: "Attendance",
      value: 82,
      unit: "percent",
      status: "ready",
    },
    {
      id: "revenue",
      label: "Revenue",
      value: 2790000,
      unit: "money_minor",
      status: "ready",
    },
    {
      id: "checkoutDropoff",
      label: "Checkout drop-off",
      value: 4,
      unit: "count",
      status: "ready",
    },
    {
      id: "checkoutConversionRate",
      label: "Checkout conversion",
      value: 94,
      unit: "percent",
      status: "ready",
    },
    {
      id: "newReviews",
      label: "New reviews",
      value: 17,
      unit: "count",
      status: "ready",
    },
    {
      id: "connections",
      label: "Connections",
      value: 64,
      unit: "count",
      status: "partial",
    },
  ],
  trend: [
    {
      periodStart: "2026-05-03T00:00:00.000Z",
      periodEnd: "2026-05-09T23:59:59.999Z",
      metrics: {
        bookings: 34,
        demand: 51,
        checkedIn: 27,
        checkoutStarted: 36,
        checkoutDropoff: 2,
        reviews: 2,
      },
    },
    {
      periodStart: "2026-05-10T00:00:00.000Z",
      periodEnd: "2026-05-16T23:59:59.999Z",
      metrics: {
        bookings: 42,
        demand: 66,
        checkedIn: 35,
        checkoutStarted: 44,
        checkoutDropoff: 1,
        reviews: 4,
      },
    },
    {
      periodStart: "2026-05-17T00:00:00.000Z",
      periodEnd: "2026-05-23T23:59:59.999Z",
      metrics: {
        bookings: 49,
        demand: 70,
        checkedIn: 39,
        checkoutStarted: 52,
        checkoutDropoff: 1,
        reviews: 5,
      },
    },
    {
      periodStart: "2026-05-24T00:00:00.000Z",
      periodEnd: "2026-06-01T23:59:59.999Z",
      metrics: {
        bookings: 61,
        demand: 88,
        checkedIn: 52,
        checkoutStarted: 64,
        checkoutDropoff: 0,
        reviews: 6,
      },
    },
  ],
  topEvents: [
    {
      eventId: "afterfly-social-run-1",
      clubId: "afterfly",
      title: "Social run · 2026-05-31",
      startTime: "2026-05-31T01:30:00.000Z",
      status: "active",
      capacityLimit: 60,
      bookedCount: 56,
      checkedInCount: 49,
      waitlistedCount: 12,
      fillRate: 93,
      checkInRate: 88,
      grossRevenueMinor: 840000,
      currency: "INR",
      checkoutStartedCount: 60,
      checkoutDropoffCount: 3,
      paymentCompletedCount: 56,
      paymentFailedCount: 1,
      paymentRefundedCount: 0,
      reviewCount: 7,
      averageRating: 4.8,
      demandCount: 78,
      inviteOpenCount: 121,
      mutualMatchCount: 21,
      chatStartedCount: 15,
      repeatAttendeeCount: 18,
    },
    {
      eventId: "bhag-sunday-run-1",
      clubId: "bhag",
      title: "Running · 2026-05-24",
      startTime: "2026-05-24T02:00:00.000Z",
      status: "active",
      capacityLimit: 45,
      bookedCount: 42,
      checkedInCount: 34,
      waitlistedCount: 8,
      fillRate: 93,
      checkInRate: 81,
      grossRevenueMinor: 630000,
      currency: "INR",
      checkoutStartedCount: 44,
      checkoutDropoffCount: 1,
      paymentCompletedCount: 42,
      paymentFailedCount: 0,
      paymentRefundedCount: 1,
      reviewCount: 5,
      averageRating: 4.6,
      demandCount: 58,
      inviteOpenCount: 88,
      mutualMatchCount: 14,
      chatStartedCount: 9,
      repeatAttendeeCount: 11,
    },
  ],
  reviewSummary: {
    newReviews: 17,
    publishedReviews: 17,
    verifiedReviews: 12,
    publicReviews: 5,
    ownerResponseCount: 4,
    averageRating: 4.7,
  },
  discoverySummary: {
    listingViews: 0,
    searchAppearances: 0,
    eventViews: 0,
    organizerSaves: 0,
    eventSaves: 38,
    contactClicks: 0,
    claimClicks: 0,
    outboundClicks: 0,
    linkClicks: 0,
  },
  linkSummary: {links: [], trafficSources: []},
  dataQuality: [
    {
      id: "canonical-events",
      state: "ok",
      detail: "Bookings, attendance, reviews, and payments are canonical.",
      owner: "Analytics ops",
      runbook: "docs/data_contracts.md",
      nextAction: "No action; server business facts are present in the mart.",
    },
    {
      id: "public-discovery",
      state: "partial",
      detail:
        "Public discovery metrics populate after BigQuery export and mart refresh.",
      owner: "Data/platform ops",
      runbook: "docs/release_operations.md",
      nextAction:
        "Check GA4/direct event export freshness for public discovery signals.",
    },
  ],
};

export function sampleUserAnalyticsReport(
  payload: UserAnalyticsQueryPayload
): UserAnalyticsResponse {
  const range = sampleUserAnalyticsRange(payload);
  const userId = payload.userId?.trim() || "user-1";
  return {
    generatedAt: "2026-06-25T00:00:00.000Z",
    timezone: "UTC",
    range,
    scope: {userId},
    summaryCards: [
      metric("profileViews", "Profile views", 42, "count", "ready",
        "Post-event profile views captured by Catch."),
      metric("caughtYou", "Caught you", 18, "count", "ready",
        "People who showed interest after an event."),
      metric("mutualCatches", "Mutual catches", 7, "count", "ready"),
      metric("chatsStarted", "Chats started", 5, "count", "ready"),
      metric("eventsAttended", "Events attended", 3, "count", "ready"),
      metric("followThroughRate", "Follow-through", 71, "percent", "partial"),
    ],
    trend: sampleUserAnalyticsTrend(range.granularity),
    connectionSummary: {
      outgoingLikes: 23,
      incomingLikes: 15,
      privateInterestReceived: 3,
      mutualCatches: 7,
      chatsStarted: 5,
      chatMessagesSent: 31,
      followThroughRate: 71,
      eventsAttended: 3,
    },
    profileSummary: {
      profileViews: 42,
      uniqueViewers: 27,
      profileDwellSeconds: 384,
      photoImpressions: 96,
      topPhotoId: "photo-hero-2",
      activeMinutes: 218,
    },
    coachingTipRefs: [
      {
        id: "keepShowingUp",
        copyKey: "keepShowingUp",
        priority: 3,
        metricIds: ["eventsAttended", "mutualCatches"],
      },
      {
        id: "startFirstChat",
        copyKey: "startFirstChat",
        priority: 2,
        metricIds: ["mutualCatches", "chatsStarted"],
      },
    ],
    dataQuality: [
      {
        id: "participant-signals",
        state: "ok",
        detail:
          "Likes, matches, chats, attendance, and feedback use participant signal facts.",
      },
      {
        id: "profile-exposure",
        state: "ok",
        detail:
          "Profile view and photo performance events are aggregate-only warehouse events.",
      },
      {
        id: "app-engagement",
        state: "partial",
        detail:
          "App active minutes depend on GA4 export rows with Firebase user IDs.",
      },
    ],
  };
}

export const sampleClubDetails: Record<string, AdminClubDetails> =
  Object.fromEntries([
    sampleOrganizer({
      clubId: "afterfly",
      name: "AFTER FLY",
      description:
        "Source-backed Indore run club used for local canonical-organizer review.",
      citySlug: "indore",
      cityName: "Indore",
      tags: ["Run club", "Social run", "Community"],
      instagramHandle: "afterfly.run",
      entityKind: "club",
      entitySubtypes: ["runClub"],
      displayCategory: "Run club",
      canonicalPath: "/organizers/afterfly/",
      appVisibility: "discoverable",
      claimState: "unclaimed",
      publishStatus: "published",
      indexStatus: "indexed",
      sourceConfidence: "medium",
      verificationStatus: "sourceBacked",
      formats: ["Social run", "Pace pods"],
      ownerLinks: [
        {
          id: "diwali-run",
          label: "Diwali night run tickets",
          subtitle: "Pre-sale closes Friday",
          url: "https://www.district.in/events/afterfly-diwali-run",
          icon: "tickets",
          pinned: true,
          showUntil: "2026-11-14T18:30:00.000Z",
        },
        {
          id: "whatsapp",
          label: "Join the WhatsApp community",
          subtitle: null,
          url: "https://chat.whatsapp.com/afterflyindore",
          icon: "community",
          pinned: false,
          showUntil: null,
        },
      ],
    }),
    sampleOrganizer({
      clubId: "bhag",
      name: "Bhag Run Club",
      description:
        "Mumbai running community with an indexed public organizer profile.",
      citySlug: "mumbai",
      cityName: "Mumbai",
      tags: ["Run club", "Training", "Community"],
      instagramHandle: "bhagrunners",
      entityKind: "club",
      entitySubtypes: ["runClub"],
      displayCategory: "Run club",
      canonicalPath: "/organizers/bhag/",
      appVisibility: "discoverable",
      claimState: "unclaimed",
      publishStatus: "published",
      indexStatus: "indexed",
      sourceConfidence: "medium",
      verificationStatus: "sourceBacked",
      formats: ["Running", "Training run"],
    }),
    sampleOrganizer({
      clubId: "bandra-runners",
      name: "Bandra Runners",
      description:
        "Mumbai organizer that still needs deterministic search backfill.",
      citySlug: "mumbai",
      cityName: "Mumbai",
      tags: ["Run club", "Sunset run", "Bandra"],
      instagramHandle: null,
      entityKind: "club",
      entitySubtypes: ["runClub"],
      displayCategory: "Run club",
      canonicalPath: "/organizers/bandra-runners/",
      appVisibility: "hidden",
      claimState: "unclaimed",
      publishStatus: "qa",
      indexStatus: "noindex",
      sourceConfidence: "low",
      verificationStatus: "unverified",
      formats: ["Running", "Social run"],
    }),
    sampleOrganizer({
      clubId: "mumbai-padel-social",
      name: "Mumbai Padel Social",
      description:
        "Mumbai racket-sport organizer used for non-running event coverage.",
      citySlug: "mumbai",
      cityName: "Mumbai",
      tags: ["Padel", "Mixer", "Racket sport"],
      instagramHandle: "mumbaipadelsocial",
      entityKind: "eventOrganizer",
      entitySubtypes: ["sportsCommunity"],
      displayCategory: "Sports community",
      canonicalPath: "/organizers/mumbai-padel-social/",
      appVisibility: "discoverable",
      claimState: "unclaimed",
      publishStatus: "published",
      indexStatus: "indexed",
      sourceConfidence: "medium",
      verificationStatus: "sourceBacked",
      formats: ["Padel mixer", "Paired rotations"],
    }),
  ].map((club) => [club.clubId, club]));

export const sampleEventDetails: Record<string, AdminEventDetails> =
  Object.fromEntries([
    sampleCanonicalEvent({
      eventId: "afterfly-social-run-1",
      clubId: "afterfly",
      organizerName: sampleClubDetails.afterfly?.name ?? "AFTER FLY",
      title: "Social run",
      startTime: "2026-06-28T01:30:00.000Z",
      meetingPoint: "Nehru Park gate",
      locationDetails: "Host meets attendees by the main park gate.",
      description:
        "A source-backed Indore social run for local canonical-event review.",
      citySlug: "indore",
      activityKind: "socialRun",
      interactionModel: "pacePods",
      distanceKm: 5,
      pace: "easy",
      capacityLimit: 60,
      bookedCount: 56,
      waitlistedCount: 12,
      priceInPaise: 15000,
      searchIndexStatus: "indexed",
    }),
    sampleCanonicalEvent({
      eventId: "bandra-sunset-run-1",
      clubId: "bandra-runners",
      organizerName: "Bandra Runners",
      title: "Sunset run",
      startTime: "2026-06-29T12:30:00.000Z",
      meetingPoint: "Bandra Bandstand",
      locationDetails: "Meet near the promenade entrance.",
      description:
        "A Mumbai community run that needs deterministic search backfill.",
      citySlug: "mumbai",
      activityKind: "running",
      interactionModel: "pacePods",
      distanceKm: 7,
      pace: "moderate",
      capacityLimit: 45,
      bookedCount: 31,
      waitlistedCount: 0,
      priceInPaise: 0,
      searchIndexStatus: "missing",
    }),
    sampleCanonicalEvent({
      eventId: "mumbai-padel-mixer-1",
      clubId: "mumbai-padel-social",
      organizerName: "Mumbai Padel Social",
      title: "Padel mixer",
      startTime: "2026-07-01T13:30:00.000Z",
      meetingPoint: "BKC indoor courts",
      locationDetails: "Court allocation is confirmed at check-in.",
      description:
        "A full Mumbai padel mixer for capacity and waitlist review.",
      citySlug: "mumbai",
      activityKind: "padel",
      interactionModel: "pairedRotations",
      customActivityLabel: "Padel mixer",
      distanceKm: 1,
      pace: "competitive",
      capacityLimit: 32,
      bookedCount: 32,
      waitlistedCount: 9,
      priceInPaise: 120000,
      searchIndexStatus: "indexed",
    }),
  ].map((event) => [event.eventId, event]));

export const sampleExternalEventRows: AdminExternalEventListRow[] = [
  {
    eventId: "ext-afterfly-202503151800-takeoff-run-rave-e99b5e2138",
    targetPath: "externalEvents/ext-afterfly-202503151800-takeoff-run-rave-e99b5e2138",
    canonicalHostId: "afterfly",
    compatibilityClubId: "afterfly",
    title: "Takeoff: Run + Rave",
    startTime: "2026-07-05T12:30:00.000Z",
    endTime: "2026-07-05T15:30:00.000Z",
    timezone: "Asia/Kolkata",
    meetingPoint: "Indore",
    citySlug: "indore",
    countryCode: "IN",
    activityKind: "socialRun",
    interactionModel: "openFormat",
    activitySource: "heuristic",
    priceDisplayText: "0 INR",
    parsedPriceInPaise: 0,
    currency: "INR",
    status: "active",
    publicationStatus: "public",
    availability: "read_only_external",
    platform: "luma",
    sourceEventKey: "luma:event:pxgmph3b",
    candidateId: "2026-06-17-afterfly-luma-events:pxgmph3b",
    eventUrl: "https://luma.com/pxgmph3b",
    sourceUrl: "https://luma.com/pxgmph3b",
    externalLinkCount: 1,
    primaryExternalUrl: "https://luma.com/pxgmph3b",
    normalizedEventKey: "afterfly:2026-07-05T18:00:00+05:30:takeoff-run-rave",
    primaryCandidateId: "2026-06-17-afterfly-luma-events:pxgmph3b",
    duplicateCandidateCount: 0,
    importPolicyAcknowledged: true,
    ownerSafeCopyReviewed: true,
    reviewBatchId: "2026-06-17-afterfly-luma-events",
    reviewer: "admin-1",
    decidedAt: "2026-06-18",
  },
  {
    eventId: "ext-mumbai-editorial-mixer-1",
    targetPath: "externalEvents/ext-mumbai-editorial-mixer-1",
    canonicalHostId: "mumbai-socials",
    compatibilityClubId: "mumbai-socials",
    title: "Mumbai gallery mixer",
    startTime: "2026-07-08T13:30:00.000Z",
    endTime: "2026-07-08T15:30:00.000Z",
    timezone: "Asia/Kolkata",
    meetingPoint: "Kala Ghoda",
    citySlug: "mumbai",
    countryCode: "IN",
    activityKind: "singlesMixer",
    interactionModel: "freeFormMixer",
    activitySource: "admin",
    priceDisplayText: "External ticketing",
    parsedPriceInPaise: null,
    currency: "INR",
    status: "active",
    publicationStatus: "draft",
    availability: "read_only_external",
    platform: "bookMyShow",
    sourceEventKey: "bookMyShow:event:mumbai-gallery-mixer",
    candidateId: "mumbai-editorial-candidate-1",
    eventUrl: "https://example.com/mumbai-gallery-mixer",
    sourceUrl: "https://example.com/mumbai-gallery-mixer",
    externalLinkCount: 2,
    primaryExternalUrl: "https://example.com/mumbai-gallery-mixer",
    normalizedEventKey: "mumbai-socials:2026-07-08T19:00:00+05:30:mumbai-gallery-mixer",
    primaryCandidateId: "mumbai-editorial-candidate-1",
    duplicateCandidateCount: 1,
    importPolicyAcknowledged: false,
    ownerSafeCopyReviewed: false,
    reviewBatchId: null,
    reviewer: null,
    decidedAt: null,
  },
];

interface SampleCanonicalEventConfig {
  eventId: string;
  clubId: string;
  organizerName: string | null;
  title: string;
  startTime: string;
  meetingPoint: string;
  locationDetails: string;
  description: string;
  citySlug: string;
  activityKind: AdminEventDetails["eventFormat"]["activityKind"];
  interactionModel: AdminEventDetails["eventFormat"]["interactionModel"];
  customActivityLabel?: string | null;
  distanceKm: number;
  pace: AdminEventDetails["pace"];
  capacityLimit: number;
  bookedCount: number;
  waitlistedCount: number;
  priceInPaise: number;
  searchIndexStatus: AdminEventDetails["searchIndexStatus"];
}

function sampleCanonicalEvent(
  config: SampleCanonicalEventConfig
): AdminEventDetails {
  const label = config.customActivityLabel ?? config.title;
  const hasOpenSpots = config.bookedCount < config.capacityLimit;
  const market = sampleMarketsBySlug[config.citySlug] ?? {
    marketId: config.citySlug,
  };
  return {
    eventId: config.eventId,
    clubId: config.clubId,
    organizerName: config.organizerName,
    title: label,
    startTime: config.startTime,
    endTime: addHours(config.startTime, 2),
    meetingPoint: config.meetingPoint,
    locationDetails: config.locationDetails,
    description: config.description,
    photoUrl: null,
    eventFormat: {
      version: 1,
      activityKind: config.activityKind,
      interactionModel: config.interactionModel,
      customActivityLabel: config.customActivityLabel ?? null,
      label,
    },
    distanceKm: config.distanceKm,
    pace: config.pace,
    capacityLimit: config.capacityLimit,
    bookedCount: config.bookedCount,
    checkedInCount: 0,
    waitlistedCount: config.waitlistedCount,
    crossPathsDiscoveryEnabled:
      config.eventId === "bandra-sunset-run-1",
    priceInPaise: config.priceInPaise,
    currency: "INR",
    status: "active",
    cancellationReason: null,
    discovery: {
      citySlug: market.marketId,
      activityKind: config.activityKind,
      availability: hasOpenSpots ? "open" : "waitlist",
      hasOpenSpots,
      inviteRequired: false,
      membershipRequired: false,
      manualApprovalRequired: false,
      minAge: 21,
      maxAge: 45,
    },
    searchIndexStatus: config.searchIndexStatus,
  };
}

function sampleUserAnalyticsRange(
  payload: UserAnalyticsQueryPayload
): UserAnalyticsResponse["range"] {
  const preset: UserAnalyticsRangePreset = payload.rangePreset ?? "30d";
  const granularity = payload.granularity ?? sampleGranularityForPreset(preset);
  if (preset === "custom" && payload.startDate && payload.endDate) {
    return {
      startDate: `${payload.startDate}T00:00:00.000Z`,
      endDate: `${payload.endDate}T23:59:59.999Z`,
      granularity,
      preset,
    };
  }
  const startDate = preset === "7d" ? "2026-06-19" :
    preset === "90d" ? "2026-03-28" :
    preset === "month" ? "2026-06-01" :
    "2026-05-27";
  return {
    startDate: `${startDate}T00:00:00.000Z`,
    endDate: "2026-06-25T23:59:59.999Z",
    granularity,
    preset,
  };
}

function sampleGranularityForPreset(
  preset: UserAnalyticsRangePreset
): UserAnalyticsGranularity {
  if (preset === "90d") return "week";
  if (preset === "month") return "week";
  return "day";
}

function sampleUserAnalyticsTrend(
  granularity: UserAnalyticsGranularity
): UserAnalyticsResponse["trend"] {
  const dates = granularity === "month" ?
    ["2026-04-01", "2026-05-01", "2026-06-01"] :
    granularity === "week" ?
    ["2026-06-01", "2026-06-08", "2026-06-15", "2026-06-22"] :
    ["2026-06-19", "2026-06-20", "2026-06-21", "2026-06-22"];
  return dates.map((date, index) => ({
    periodStart: `${date}T00:00:00.000Z`,
    periodEnd: addAnalyticsPeriod(date, granularity),
    metrics: {
      profileViews: [6, 8, 13, 15][index] ?? 4,
      caughtYou: [2, 4, 5, 7][index] ?? 1,
      mutualCatches: [1, 1, 2, 3][index] ?? 0,
      chatsStarted: [0, 1, 2, 2][index] ?? 0,
      eventsAttended: [0, 1, 1, 1][index] ?? 0,
    },
  }));
}

function addAnalyticsPeriod(
  date: string,
  granularity: UserAnalyticsGranularity
): string {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  const days = granularity === "month" ? 31 : granularity === "week" ? 7 : 1;
  return new Date(parsed.getTime() + days * 86400000).toISOString();
}

function metric(
  id: string,
  label: string,
  value: number,
  unit: UserAnalyticsResponse["summaryCards"][number]["unit"],
  status: UserAnalyticsResponse["summaryCards"][number]["status"],
  caption?: string
): UserAnalyticsResponse["summaryCards"][number] {
  return {
    id,
    label,
    value,
    unit,
    status,
    ...(caption ? {caption} : {}),
  };
}

function sampleOrganizer(config: {
  clubId: string;
  name: string;
  description: string;
  citySlug: string;
  cityName: string;
  tags: string[];
  instagramHandle: string | null;
  entityKind: AdminClubDetails["entityKind"];
  entitySubtypes: string[];
  displayCategory: string;
  canonicalPath: string | null;
  appVisibility: AdminClubDetails["appVisibility"];
  claimState: string;
  publishStatus: AdminClubDetails["publicPage"]["publishStatus"];
  indexStatus: string;
  sourceConfidence: AdminClubDetails["provenance"]["sourceConfidence"];
  verificationStatus: AdminClubDetails["provenance"]["verificationStatus"];
  formats: string[];
  ownerLinks?: AdminClubDetails["ownerLinks"];
}): AdminClubDetails {
  const market = sampleMarketsBySlug[config.citySlug] ?? {
    cityId: config.citySlug,
    marketId: config.citySlug,
    cityName: config.cityName,
    regionName: config.cityName,
    countryCode: "IN",
    countryName: "India",
  };
  return {
    clubId: config.clubId,
    name: config.name,
    description: config.description,
    location: market.marketId,
    area: config.cityName,
    tags: config.tags,
    instagramHandle: config.instagramHandle,
    phoneNumber: null,
    email: null,
    imageUrl: null,
    profileImageUrl: null,
    organizerType: config.entityKind === "eventOrganizer" ?
      "eventProducer" :
      config.entityKind === "creatorCommunity" ?
        "community" :
        config.entityKind ?? "club",
    publicCategoryLabel: config.displayCategory,
    entityKind: config.entityKind,
    entitySubtypes: config.entitySubtypes,
    displayCategory: config.displayCategory,
    cityName: market.cityName,
    regionName: market.regionName,
    countryCode: market.countryCode,
    countryName: market.countryName,
    appVisibility: config.appVisibility,
    ownershipState: "programmatic",
    claimState: config.claimState,
    publicPage: {
      slug: config.clubId,
      citySlug: config.citySlug,
      canonicalPath: config.canonicalPath,
      publishStatus: config.publishStatus,
      indexStatus: config.indexStatus,
      robots: config.indexStatus === "indexed" ?
        "index, follow" :
        "noindex, follow",
      seoTitle: `${config.name} organizer profile | Catch`,
      seoDescription:
        `Unclaimed Catch organizer profile for ${config.name} in ` +
        `${config.cityName}.`,
    },
    provenance: {
      origin: "scraper",
      sourceConfidence: config.sourceConfidence,
      verificationStatus: config.verificationStatus,
    },
    publicProfile: {
      headline: `${config.name} organizer profile`,
      summary:
        `${config.name} hosts ${config.formats.join(", ").toLowerCase()} ` +
        `in ${config.cityName}.`,
      sourceSummary: null,
      formats: config.formats,
    },
    ownerLinks: config.ownerLinks ?? [],
  };
}

function addHours(isoString: string, hours: number): string {
  return new Date(
    new Date(isoString).getTime() + hours * 60 * 60 * 1000
  ).toISOString();
}
