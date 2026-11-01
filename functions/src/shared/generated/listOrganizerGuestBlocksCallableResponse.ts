/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export interface ListOrganizerGuestBlocksCallableResponse {
  /**
   * @maxItems 500
   */
  items: {
    uid: string;
    displayName: string | null;
    blockedByUid: string;
    createdAtMillis: number;
  }[];
}
