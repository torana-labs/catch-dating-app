/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * An organizer's owner or manager stops someone booking their events, or lets them back. No reason or review; it affects no other organizer.
 */
export interface ManageOrganizerGuestBlockCallablePayload {
  organizerId: string;
  uid: string;
  blocked: boolean;
}
