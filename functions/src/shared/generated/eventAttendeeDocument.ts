/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Private event-scoped operational attendee stored at eventAttendees/{attendeeId}.
 */
export interface EventAttendeeDocument {
  eventId: string;
  organizerId: string;
  displayName: string;
  searchName: string;
  source:
    | "catchBooking"
    | "hostImport"
    | "hostManual"
    | "webOtp"
    | "providerSync";
  status: "invited" | "registered" | "waitlisted" | "checkedIn" | "cancelled";
  linkedUid: string | null;
  phoneE164: string | null;
  email: string | null;
  /**
   * Private organizer-reported roster city; never a verified participant profile or eligibility input.
   */
  cityMarketId?: string | null;
  citySource?: "hostImport" | "hostManual" | null;
  externalReference: string | null;
  /**
   * Provider or import-supplied booking/arrival group shared by guests who are expected to arrive together.
   */
  arrivalGroup: string | null;
  ticketType: string | null;
  /**
   * Revenue allocated to this attendee in minor currency units. Organizer-reported and estimated values are not payment verification.
   */
  revenueAmountMinor?: number | null;
  revenueCurrency?: string | null;
  revenueSource?:
    | "hostImport"
    | "hostEstimate"
    | "providerOrder"
    | "hostAttested"
    | null;
  revenueAllocation?: "perAttendee" | "sharedOrder" | null;
  revenueOrderReference?: string | null;
  /**
   * Original shared-order total before deterministic attendee allocation.
   */
  revenueOrderAmountMinor?: number | null;
  importId: string | null;
  sourceRowId: string | null;
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
  registeredAt: {
    _seconds: number;
    _nanoseconds: number;
  } | null;
  waitlistedAt: {
    _seconds: number;
    _nanoseconds: number;
  } | null;
  checkedInAt: {
    _seconds: number;
    _nanoseconds: number;
  } | null;
  cancelledAt: {
    _seconds: number;
    _nanoseconds: number;
  } | null;
  checkedInBy: string | null;
  linkedAt: {
    _seconds: number;
    _nanoseconds: number;
  } | null;
  /**
   * First eligible opaque invitation link preserved on this operational attendee.
   */
  inviteLinkId?: string | null;
  inviteCapturedAt?: {
    _seconds: number;
    _nanoseconds: number;
  } | null;
  /**
   * Monotonic revision shared by all accountability writers. Missing legacy values read as zero.
   */
  accountabilityRevision?: number;
  /**
   * Monotonic revision for absolute Host attendance operations. Missing legacy values read as zero.
   */
  attendanceRevision?: number;
  /**
   * Operational status restored by an absolute undo. Null outside checked-in state.
   */
  preCheckInStatus?: "invited" | "registered" | "waitlisted" | null;
  /**
   * Host-recorded sweep result. It is current only when accountabilityResolvedForCheckInAt equals checkedInAt.
   */
  accountabilityResolution?: "returned" | "departed" | null;
  accountabilityResolvedForCheckInAt?: {
    _seconds: number;
    _nanoseconds: number;
  } | null;
  accountabilityResolvedAt?: {
    _seconds: number;
    _nanoseconds: number;
  } | null;
  accountabilityResolvedBy?: string | null;
  /**
   * External source that most recently supplied provider-authoritative fields, independent of row creation source.
   */
  provider?:
    | "luma"
    | "eventbrite"
    | "partiful"
    | "posh"
    | "bookmyshow"
    | "district"
    | "sortmyscene"
    | "airbnb"
    | null;
  providerConnectionId?: string | null;
  providerGuestId?: string | null;
  providerSyncedAt?: {
    _seconds: number;
    _nanoseconds: number;
  } | null;
  providerDataRevision?: number;
}
