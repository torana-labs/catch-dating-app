/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

import type {WebsiteHostListingProjection} from "./websiteHostListingProjection";

/**
 * Read model holding exactly what one public event page shows, stored at eventPublicPage/{eventId} for a published Catch event or a public imported event. Functions rebuild it with its organizer's page, using the website publication and suppression rules. An event that fails those rules, or whose organizer page is withheld, has no document. It never holds contact details, owner identities, rosters or dating fields. Only the Admin SDK reads it.
 */
export interface EventPublicPageDocument {
  schemaVersion: 1;
  eventId: string;
  organizerId: string;
  path: string;
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
  /**
   * Every public field of the event, including the optional photo, itinerary, meeting location, included, requirements, accessibility, cancellation policy, waitlist and Catch experience activities, with its source and where a guest books it.
   */
  item:
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
      };
  /**
   * Capacity when the page was built. Booking rechecks it live.
   */
  capacity: {
    state: "open" | "full" | "external";
    capacityLimit: number | null;
    bookedCount: number | null;
    waitlistedCount: number | null;
    spotsLeft: number | null;
    waitlistAvailable: boolean;
  };
  /**
   * The organizer as an event page shows it.
   */
  organizer: {
    organizerId: string;
    name: string;
    path: string;
    category: string;
    city: string;
    logo: {
      mode: "monogram";
      text: string;
      status: string;
    };
    verified: boolean;
    followerCount: number;
    rating: number | null;
    reviewCount: number;
    verifiedReviewCount: number;
    upcomingEventCount: number;
  };
  /**
   * The organizer's two newest published reviews. Empty when public reviews are not readable.
   *
   * @maxItems 2
   */
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
  /**
   * Up to three other upcoming events from the same organizer, soonest first.
   *
   * @maxItems 3
   */
  moreEvents: {
    source: "catch" | "external";
    eventId: string;
    path: string;
    title: string;
    activityKind: string;
    startTime: string;
    endTime: string | null;
    date: string;
    location: string;
    priceLabel: string;
    photoUrl: string | null;
    booking:
      | {
          kind: "catch";
          path: string;
        }
      | {
          kind: "external";
          url: string;
          label: string;
        };
  }[];
  /**
   * Today's organizer listing for this event, with this event's own published reviews, so the current event page renders unchanged. The event is attached at read time.
   */
  listing: WebsiteHostListingProjection;
}
