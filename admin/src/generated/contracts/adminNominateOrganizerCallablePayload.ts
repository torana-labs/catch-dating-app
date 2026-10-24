/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * A Catch sales associate nominates an organizer. Supply Intake builds the listing from the name and links; nothing is published until staff review it.
 */
export type AdminNominateOrganizerCallablePayload = {
  [k: string]: unknown;
} & {
  requestId: string;
  name: string | null;
  market: string;
  /**
   * @maxItems 10
   */
  urls: string[];
  notes: string | null;
  /**
   * @maxItems 8
   */
  categories: string[];
};
