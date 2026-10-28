/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Manager-only bounded organizer audience export request.
 */
export interface ExportOrganizerContactsCallablePayload {
  organizerId: string;
  segmentId?:
    | (
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
      )
    | null;
  /**
   * OR within attendance, reliability, advocacy and reachable categories; AND across selected categories.
   *
   * @maxItems 12
   */
  segmentIds?: (
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
   * Match any selected manual tag, combined with all selected segment categories.
   *
   * @maxItems 20
   */
  manualTagIds?: string[];
  query?: string | null;
  manualTagId?: string | null;
}
