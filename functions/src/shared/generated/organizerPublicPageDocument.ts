/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

import type {OrganizerSupplyCapabilities} from "./organizerSupplyCapabilities";
import type {WebsiteHostListingProjection} from "./websiteHostListingProjection";

/**
 * Read model holding exactly what one public organizer page shows, stored at organizerPublicPage/{organizerId}. Functions rebuild it whenever the organizer, its events, its imported events or its reviews change, using the website publication and suppression rules. A page that fails those rules has no document. It never holds contact details, owner identities, rosters or dating fields. Only the Admin SDK reads it.
 */
export interface OrganizerPublicPageDocument {
  schemaVersion: 1;
  organizerId: string;
  path: string;
  /**
   * @maxItems 20
   */
  legacyPaths: string[];
  /**
   * Serialized Firestore Timestamp fixture shape.
   */
  builtAt: {
    _seconds: number;
    _nanoseconds: number;
  };
  /**
   * SHA-256 of the page content without builtAt, so unchanged rebuilds skip the write.
   */
  contentHash: string;
  identity: {
    name: string;
    headline: string;
    description: string;
    category: string;
    city: string;
    citySlug: string;
    region: string;
    country: string;
    logo: {
      mode: "monogram";
      text: string;
      status: string;
    };
    /**
     * @maxItems 40
     */
    formats: string[];
    verified: boolean;
    indexing: "index, follow" | "noindex, follow";
  };
  /**
   * Owner links in display order. Empty until owner link editing ships (CAT-254).
   *
   * @maxItems 20
   */
  links: {
    id: string;
    label: string;
    url: string;
    pinned: boolean;
    showUntil: {
      _seconds: number;
      _nanoseconds: number;
    } | null;
  }[];
  /**
   * Events from every source that had not ended when the page was built, soonest first. Readers move events that have since ended into past moments.
   *
   * @maxItems 50
   */
  upcomingEvents: (
    | {
        source: "catch";
        eventId: string;
        path: string;
        /**
         * The public Catch event projection with the dating framing removed: no balanced admission label, no rotations experience, no singlesMixer activity and no Event Success scorecard.
         */
        event: {
          /**
           * Explicit published declaration of Catch-assisted guest participation. Booking, payments, attendance and logistics alone do not qualify. Omit when not offered.
           *
           * @minItems 1
           * @maxItems 3
           */
          catchExperienceActivities?: (
            | "introductions"
            | "sharedActivities"
            | "rotations"
          )[];
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
            kind:
              | "gather"
              | "activity"
              | "stop"
              | "break"
              | "transition"
              | "finish";
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
           * @maxItems 4
           */
          admissionLabels?: (
            | "approval"
            | "invitation"
            | "membership"
            | "balanced"
          )[];
          waitlistAvailable?: boolean;
          cancellationPolicy?:
            | "notApplicable"
            | "flexible"
            | "standard"
            | "strict";
          capacityLimit: number;
          bookedCount: number;
          checkedInCount: number;
          waitlistedCount: number;
          publicRegistrationEnabled?: boolean;
          registrationMode?: "closed" | "free" | "paid";
          amountPaise?: number;
          currency?: string;
          priceLabel: string;
          scorecard?: {
            [k: string]: unknown;
          } | null;
        };
        /**
         * A Catch-native event books on its Catch event page. Live terms are rechecked by the booking callables, never trusted from this snapshot.
         */
        booking: {
          kind: "catch";
          path: string;
          registrationAccess: "open" | "app" | "restricted";
          spotsLeft: number;
        };
      }
    | {
        source: "external";
        eventId: string;
        path: string;
        /**
         * The public imported event projection. Booking stays on the source platform.
         */
        event: {
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
        };
        /**
         * An imported event books on its source platform.
         */
        booking: {
          kind: "external";
          url: string;
          label: string;
        };
      }
  )[];
  /**
   * Ended events from every source, most recent first.
   *
   * @maxItems 24
   */
  pastMoments: (
    | {
        source: "catch";
        eventId: string;
        path: string;
        /**
         * The public Catch event projection with the dating framing removed: no balanced admission label, no rotations experience, no singlesMixer activity and no Event Success scorecard.
         */
        event: {
          /**
           * Explicit published declaration of Catch-assisted guest participation. Booking, payments, attendance and logistics alone do not qualify. Omit when not offered.
           *
           * @minItems 1
           * @maxItems 3
           */
          catchExperienceActivities?: (
            | "introductions"
            | "sharedActivities"
            | "rotations"
          )[];
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
            kind:
              | "gather"
              | "activity"
              | "stop"
              | "break"
              | "transition"
              | "finish";
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
           * @maxItems 4
           */
          admissionLabels?: (
            | "approval"
            | "invitation"
            | "membership"
            | "balanced"
          )[];
          waitlistAvailable?: boolean;
          cancellationPolicy?:
            | "notApplicable"
            | "flexible"
            | "standard"
            | "strict";
          capacityLimit: number;
          bookedCount: number;
          checkedInCount: number;
          waitlistedCount: number;
          publicRegistrationEnabled?: boolean;
          registrationMode?: "closed" | "free" | "paid";
          amountPaise?: number;
          currency?: string;
          priceLabel: string;
          scorecard?: {
            [k: string]: unknown;
          } | null;
        };
        /**
         * A Catch-native event books on its Catch event page. Live terms are rechecked by the booking callables, never trusted from this snapshot.
         */
        booking: {
          kind: "catch";
          path: string;
          registrationAccess: "open" | "app" | "restricted";
          spotsLeft: number;
        };
      }
    | {
        source: "external";
        eventId: string;
        path: string;
        /**
         * The public imported event projection. Booking stays on the source platform.
         */
        event: {
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
        };
        /**
         * An imported event books on its source platform.
         */
        booking: {
          kind: "external";
          url: string;
          label: string;
        };
      }
  )[];
  /**
   * Published reviews for the organizer. The rating averages verified reviews only, as the organizer rating does; the count and distribution cover every published review, verified or not. Absent values mean public reviews are not readable for this page.
   */
  reviewSummary: {
    readState: "enabled" | "disabled";
    rating: number | null;
    count: number;
    verifiedCount: number;
    distribution: {
      "1": number;
      "2": number;
      "3": number;
      "4": number;
      "5": number;
    };
  };
  /**
   * Published reviews, newest first, each marked verified or unverified. Empty when public reviews are not readable.
   *
   * @maxItems 50
   */
  latestReviews: {
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
  /**
   * Refreshed in batches, not on every follow.
   */
  followerCount: number;
  claim: {
    state: "unclaimed" | "claimPending" | "claimed" | "verified";
    claimable: boolean;
    href: string;
    label: string;
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
  /**
   * Whether this organizer is verified and publicly readable, so other pages may recommend it.
   */
  recommendable: boolean;
  /**
   * Today's recommendation rail: up to three other recommendable organizers in id order. Retires with the v2 organizer page (CAT-251).
   *
   * @maxItems 3
   */
  recommendedOrganizers: WebsiteHostListingProjection[];
  /**
   * Today's organizer listing projection without its events, so the current pages render from the read model unchanged. Events live in the page sections and are attached at read time.
   */
  listing: WebsiteHostListingProjection;
}
