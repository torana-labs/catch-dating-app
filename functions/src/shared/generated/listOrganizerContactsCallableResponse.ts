/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Safe manager-only organizer contact rows and opaque pagination state.
 */
export interface ListOrganizerContactsCallableResponse {
  organizerId: string;
  /**
   * @maxItems 100
   */
  contacts: {
    contactId: string;
    displayName: string;
    phoneE164: string | null;
    email: string | null;
    identityState: "unlinked" | "verified" | "ambiguous";
    identityConfidence: "eventOnly" | "proposed" | "verified";
    ambiguousCandidateCount: number;
    attendedEventCount: number;
    expectedEventCount: number;
    lastAttendedAtMillis: number | null;
    /**
     * @maxItems 16
     */
    segmentIds: (
      | "new_to_organizer"
      | "past_attendee"
      | "first_time_attendee"
      | "repeat_attendee"
      | "regular"
      | "lapsed_regular"
      | "reliable_attendee"
      | "needs_confirmation"
      | "advocate"
      | "high_impact_advocate"
      | "whatsapp_reachable"
      | "sms_reachable"
      | "active_member"
      | "lapsed_member"
      | "member_no_recent_attendance"
      | "frequent_non_member"
    )[];
    /**
     * @maxItems 5
     */
    manualTags?: {
      tagId: string;
      label: string;
    }[];
    whatsappStatus: "unknown" | "optedIn" | "optedOut";
    whatsappAdminSuppressed: boolean;
    smsStatus: "unknown" | "optedIn" | "optedOut";
    sourceCoverage: "exact" | "partial" | "insufficientData";
    revision: number;
    /**
     * CRM projection of one contact's paid membership with the organizer, through the contact's linked account.
     */
    membership?: {
      planId: string;
      planName: string;
      status:
        | "trialing"
        | "active"
        | "past_due"
        | "paused"
        | "canceling"
        | "expired";
      memberSinceMillis: number | null;
      entitled: boolean;
    } | null;
  }[];
  nextCursor: string | null;
  matchCount: number;
  matchCountCoverage: "exact" | "atLeast";
  /**
   * @maxItems 20
   */
  manualTagVocabulary?: {
    tagId: string;
    label: string;
  }[];
  sourceCoverage: "exact" | "partial";
  projectionVersion: number;
}
