/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Callable payload accepted by adminRecordOrganizerCuration. This records one durable low-volume manual organizer-intake curation operation in Firestore.
 */
export interface AdminRecordOrganizerCurationCallablePayload {
  operationId?: string;
  operationType:
    | "attach_surface"
    | "merge_entity"
    | "split_surface"
    | "suppress_entity"
    | "surface_decision";
  entityId?: string;
  sourceEntityId?: string;
  targetEntityId?: string;
  surfaceId?: string;
  newEntityId?: string;
  sourceCandidateId?: string;
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
}
