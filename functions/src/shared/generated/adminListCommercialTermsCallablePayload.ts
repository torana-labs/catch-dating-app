/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Finance/Admin Owner read of commercial terms for the Admin console: the platform defaults, one scope's stored record and recent revisions (organizerId null for the platform), every organizer override, and an optional organizer name search for adding an override. Read-only; writes go through manageCommercialTerms.
 */
export interface AdminListCommercialTermsCallablePayload {
  organizerId: string | null;
  organizerQuery: string | null;
}
