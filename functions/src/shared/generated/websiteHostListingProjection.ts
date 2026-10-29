/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

import type {OrganizerSupplyCapabilities} from "./organizerSupplyCapabilities";

/**
 * Public organizer listing projection consumed by the marketing website and future shared web/app listing surfaces. It is generated from approved organizer, seed, or demo data and is not the canonical organizer document.
 */
export interface WebsiteHostListingProjection {
  id: string;
  listingVariant: "unclaimedScraped" | "appCreatedClub";
  dataOrigin: "scrapedSeed" | "catchDemo" | "organizerIntake";
  name: string;
  slug: string;
  city: string;
  citySlug: string;
  region: string;
  country: string;
  path: string;
  legacyPaths?: string[];
  category: string;
  status: string;
  indexing: "index, follow" | "noindex, follow";
  sourceConfidence:
    | "first_party"
    | "seedOnly"
    | "high"
    | "medium"
    | "low"
    | "ownerVerified";
  headline: string;
  description: string;
  sourceSummary: string;
  logo: {
    mode: "monogram";
    text: string;
    status: string;
  };
  formats: string[];
  facts: {
    label: string;
    value: string;
  }[];
  reviewReadState?: "ready" | "unavailable";
  metrics?: {
    followerCount?: number;
    verifiedReviewCount?: number;
    memberCount?: number;
    rating?: number;
    reviewCount?: number;
    nextEventAt?: string | null;
    nextEventLabel?: string | null;
  };
  host?: {
    name: string;
    role: string;
    avatarUrl: string | null;
  };
  catchEvents?: {
    /**
     * Explicit published declaration of Catch-assisted guest participation. Booking, payments, attendance and logistics alone do not qualify. Omit when not offered.
     *
     * @minItems 1
     * @maxItems 2
     */
    catchExperienceActivities?: ("introductions" | "sharedActivities")[];
    id: string;
    role: string;
    title: string;
    activityKind: string;
    timeline: "upcoming" | "past";
    startTime: string;
    endTime: string | null;
    timezone?: string;
    date: string;
    location: string;
    locationDetails?: string;
    summary: string;
    photoUrl?: string | null;
    /**
     * Canonical meeting location selected from Google Places or a manually pinned map coordinate.
     */
    meetingLocation?: {
      name: string;
      address?: string | null;
      placeId?: string | null;
      latitude: number;
      longitude: number;
      notes?: string | null;
    };
    /**
     * @maxItems 40
     */
    itinerary?: {
      id: string;
      kind: "gather" | "activity" | "stop" | "break" | "transition" | "finish";
      offsetMinutes: number;
      durationMinutes?: number | null;
      title: string;
      description?: string | null;
      location?: {
        name: string;
        address?: string | null;
        placeId?: string | null;
        latitude: number;
        longitude: number;
        notes?: string | null;
      } | null;
      routeDistanceMeters?: number | null;
    }[];
    requirements?: string;
    accessibility?: string;
    included?: string;
    registrationAccess?: "open" | "restricted" | "app";
    /**
     * @maxItems 3
     */
    admissionLabels?: ("approval" | "invitation" | "membership")[];
    waitlistAvailable?: boolean;
    cancellationPolicy?: "notApplicable" | "flexible" | "standard" | "strict";
    capacityLimit: number;
    bookedCount: number;
    checkedInCount: number;
    waitlistedCount: number;
    publicRegistrationEnabled?: boolean;
    registrationMode?: "closed" | "free" | "paid";
    amountPaise?: number;
    currency?: string;
    priceLabel: string;
  }[];
  externalEvents?: {
    id: string;
    title: string;
    activityKind: string;
    availability: "read_only_external";
    startTime: string;
    endTime: string | null;
    timezone?: string;
    date: string;
    location: string;
    locationDetails?: string;
    summary: string;
    requirements?: string;
    accessibility?: string;
    priceLabel: string;
    sourceLabel: string;
    sourceHref: string;
    externalLinkCount: number;
    dedupeKey: string;
  }[];
  eventEvidence: {
    title: string;
    date: string;
    location: string;
    summary: string;
    facts: string[];
    sourceLabel: string;
    sourceHref: string;
  }[];
  reviews: {
    id: string | null;
    eventId: string | null;
    reviewerName: string;
    rating: number;
    comment: string;
    createdAt: string;
    verificationStatus: "verified" | "unverified";
    source: "catchEvent" | "publicListing";
    isAnonymous: boolean;
    ownerResponse: {
      hostName: string;
      hostAvatarUrl: string | null;
      message: string;
      updatedAt: string;
    } | null;
  }[];
  fitNotes: string[];
  missingEvidence: string[];
  sources: {
    type: string;
    label: string;
    detail: string;
    href?: string;
    confidence: "high" | "medium" | "low";
  }[];
  claim: {
    href: string;
    label: string;
  };
  publicApi: {
    state: "enabled" | "disabled";
    reason: string;
    claimTargetSyncStatus:
      | "in_sync"
      | "write_needed"
      | "static_fixture"
      | "unknown";
  };
  authority: {
    ownershipState: "programmatic" | "userCreated" | "claimed" | "transferred";
    claimState:
      | "unclaimed"
      | "claimPending"
      | "claimed"
      | "verified"
      | "suppressed";
    provenanceOrigin: "userCreated" | "scraper" | "adminSeed" | "import";
    sourceConfidence: "seedOnly" | "low" | "medium" | "high" | "ownerVerified";
    verificationStatus: "unverified" | "sourceBacked" | "ownerVerified";
    appVisibility: "discoverable" | "hidden";
    publishStatus: "draft" | "qa" | "published" | "suppressed" | "removed";
    indexStatus: "noindex" | "indexReady" | "indexed";
  };
  capabilities: {
    claimRequest: {
      state: "enabled" | "disabled";
      reason: string;
    };
    publicReviews: {
      targetState: "enabled" | "disabled";
      readState: "enabled" | "disabled";
      writeState: "enabled" | "disabled";
      reason: string;
    };
    supply: OrganizerSupplyCapabilities;
  };
  lastVerifiedAt: string;
  searchText: string;
}
