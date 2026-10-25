/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export interface AdminRefreshOrganizerEventsCallableResponse {
  requestId: string;
  /**
   * False when a retry found the request it made before.
   */
  created: boolean;
  status: "queued";
  /**
   * @maxItems 10
   */
  urls: string[];
}
