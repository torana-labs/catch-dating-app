/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * One page of approved Supply Intake listings, most recently approved first, each with the events it imported and where each stands: published (by the publication policy or staff), withdrawn, ready for staff, needing a resolution, or blocked.
 */
export interface AdminListListingEventImportsCallablePayload {
  limit: number;
  cursor: string | null;
}
