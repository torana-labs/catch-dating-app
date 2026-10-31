/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * One manual organizer-intake curation operation stored at organizerIntakeCurationDecisions/{operationId}. Candidate evidence remains in operationRuns and operationWorkItems.
 */
export interface OrganizerIntakeCurationDecisionDocument {
  schemaVersion: 1;
  operationId: string;
  operationType:
    | "attach_surface"
    | "create_entity_draft"
    | "merge_entity"
    | "split_surface"
    | "suppress_entity"
    | "surface_decision";
  operationStatus: "active" | "superseded";
  entityId?: string;
  sourceEntityId?: string;
  targetEntityId?: string;
  surfaceId?: string;
  newEntityId?: string;
  sourceCandidateId?: string;
  sourceWorkItemId?: string;
  sourceNormalizedKey?: string;
  /**
   * Public route slug reserved when a candidate becomes an organizer draft. It is intentionally separate from entityId.
   */
  publicSlug?: string;
  /**
   * Source artifact lineage for each field projected into the organizer draft.
   *
   * @maxItems 200
   */
  fieldProvenance?: {
    field: string;
    artifactId: string;
    contentHash: string;
    locator: string | null;
    extractedBy: "deterministic" | "model" | "human";
    extractorVersion: string;
    confidence: number | null;
  }[];
  decision?:
    | "accept_primary"
    | "accept_secondary"
    | "reject_wrong_entity"
    | "mark_ambiguous"
    | "mark_historical";
  surface?: {
    surfaceId: string;
    platform:
      | "bookMyShow"
      | "district"
      | "instagram"
      | "linkedin"
      | "luma"
      | "news"
      | "officialWebsite"
      | "partiful"
      | "sortMyScene"
      | "userReport"
      | "other";
    surfaceKind:
      | "eventListing"
      | "eventCalendar"
      | "organizerProfile"
      | "personProfile"
      | "press"
      | "socialProfile"
      | "website"
      | "wrongEntity";
    url: string | null;
    normalizedKey: string | null;
    role:
      | "primary"
      | "secondary"
      | "backup"
      | "historical"
      | "ambiguous"
      | "rejected";
    status: "active" | "candidate" | "ambiguous" | "historical" | "rejected";
    confidence: {
      entityMatch: "low" | "medium" | "high";
      ownership: "low" | "medium" | "high";
      city: "low" | "medium" | "high";
    };
    crawl: {
      eventDiscoveryStatus: "disabled" | "candidate" | "approved" | "paused";
      policy: "manualOnly" | "blocked" | "apiPreferred";
      supportsEventExtraction: boolean;
    };
    evidenceRefs: {
      type:
        | "hostDiscoveryRun"
        | "seedOrganizer"
        | "userReportedSearchResult"
        | "manualNote";
      ref: string | null;
      description: string;
    }[];
    notes: string;
  };
  reason: string;
  reviewedByUid: string;
  /**
   * Serialized Firestore Timestamp fixture shape.
   */
  reviewedAt: {
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
}
