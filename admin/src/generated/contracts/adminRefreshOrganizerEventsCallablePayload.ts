/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Staff read new events for an unclaimed organizer Catch already lists: Supply Intake reads the given links, or the event-calendar links on the organizer's page, and its events go through the event publication policy like an approved listing's.
 */
export interface AdminRefreshOrganizerEventsCallablePayload {
  /**
   * The caller's idempotency key; a retry with the same content finds its own request.
   */
  requestId: string;
  organizerId: string;
  /**
   * Pages to read. Empty reads the event-calendar links on the organizer's page.
   *
   * @maxItems 10
   */
  urls: string[];
}
