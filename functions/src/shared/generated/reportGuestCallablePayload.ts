/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * An organizer, their manager or the event's team reports a guest, including what happened at an event. It lands in the Safety queue like any report.
 */
export interface ReportGuestCallablePayload {
  organizerId: string;
  eventId: string | null;
  targetUserId: string;
  reasonCode: string;
  notes: string | null;
}
