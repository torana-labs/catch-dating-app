/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Organizer-manager request for event-relative CRM labels on one operational roster.
 */
export interface GetEventRosterInsightsCallablePayload {
  eventId: string;
  /**
   * Opt-in for the paid-membership "member" signal; older clients omit it.
   */
  includeHostMembership?: boolean;
}
