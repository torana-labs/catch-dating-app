/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Rebuildable, explainable organizer-contact CRM traits. Sensitive Event Success answers are excluded by contract.
 */
export interface OrganizerContactTraitDocument {
  organizerId: string;
  contactId: string;
  expectedEventCount: number;
  attendedEventCount: number;
  cancelledEventCount: number;
  noShowCount: number;
  importedEventCount: number;
  referredRegistrationCount: number;
  referredCheckedInCount: number;
  referredCheckedIn365DayCount: number;
  linkedAccount: boolean;
  /**
   * Serialized Firestore Timestamp fixture shape.
   */
  firstSeenAt: {
    _seconds: number;
    _nanoseconds: number;
  };
  /**
   * Serialized Firestore Timestamp fixture shape.
   */
  lastSeenAt: {
    _seconds: number;
    _nanoseconds: number;
  };
  firstAttendedAt: {
    _seconds: number;
    _nanoseconds: number;
  } | null;
  lastAttendedAt: {
    _seconds: number;
    _nanoseconds: number;
  } | null;
  attendanceRate: number | null;
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
  attended30DayCount?: number;
  attended60DayCount?: number;
  definitionVersion: number;
  whatsappStatus: "unknown" | "optedIn" | "optedOut";
  smsStatus: "unknown" | "optedIn" | "optedOut";
  sourceCoverage: "exact" | "partial" | "insufficientData";
  projectionVersion: number;
  /**
   * Serialized Firestore Timestamp fixture shape.
   */
  computedAt: {
    _seconds: number;
    _nanoseconds: number;
  };
}
