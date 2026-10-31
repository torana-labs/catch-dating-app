/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Callable payload accepted by adminListEventDetails. This lists canonical events/{eventId} rows for the admin event publishing workspace.
 */
export interface AdminListEventDetailsCallablePayload {
  query?: string | null;
  organizerId?: string | null;
  citySlug?: string | null;
  citySlugs?: string[] | null;
  activityKind?:
    | "socialRun"
    | "running"
    | "walking"
    | "pickleball"
    | "padel"
    | "tennis"
    | "badminton"
    | "cycling"
    | "spinClass"
    | "yoga"
    | "strengthTraining"
    | "pubQuiz"
    | "barCrawl"
    | "dinner"
    | "singlesMixer"
    | "openActivity"
    | null;
  status?: "active" | "cancelled" | null;
  /**
   * Optional server-side startTime window used by admin event lists. Upcoming and past are evaluated against callable server time.
   */
  timeWindow?: "upcoming" | "past" | "all" | null;
  limit?: number;
}
