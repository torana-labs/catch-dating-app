/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Server-owned reservation for a public website route. Stored at publicRouteReservations/{routeKey}; routeKey is derived from the normalized route path so route allocation is deterministic and transactionally claimable.
 */
export interface PublicRouteReservationDocument {
  /**
   * Deterministic document id derived from routePath by removing leading/trailing slash and replacing route separators with double underscores.
   */
  routeKey: string;
  routePath: string;
  routeKind: "organizerCanonical";
  /**
   * @minItems 2
   * @maxItems 3
   */
  routeSegments: string[];
  status: "active" | "released";
  ownerType: "club" | "organizer";
  ownerCollection: "clubs" | "organizers";
  ownerId: string;
  targetPath: string;
  slug: string;
  citySlug: string | null;
  /**
   * Serialized Firestore Timestamp fixture shape.
   */
  createdAt: {
    _seconds: number;
    _nanoseconds: number;
  };
  /**
   * Serialized Firestore Timestamp fixture shape.
   */
  updatedAt: {
    _seconds: number;
    _nanoseconds: number;
  };
  /**
   * Serialized Firestore Timestamp fixture shape.
   */
  lastVerifiedAt: {
    _seconds: number;
    _nanoseconds: number;
  };
  lastVerifiedByUid: string;
  lastVerifiedSource:
    | "adminUpdateClubDetails"
    | "adminSetClubIndexStatus"
    | "adminUpdateOrganizerDetails"
    | "adminSetOrganizerIndexStatus"
    | "adminCreateOrganizerDraftFromCandidate"
    | "adminApproveOrganizerListing"
    | "createOrganizer"
    | "clubsToOrganizersMigration";
  releasedAt?: {
    _seconds: number;
    _nanoseconds: number;
  } | null;
  releasedByUid?: string | null;
  replacementRoutePath?: string | null;
}
