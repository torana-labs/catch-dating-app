/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Read current account-scoped event facts using an Auth-derived subject; never reserve or grant admission.
 */
export interface GetEventViewerStateCallablePayload {
  eventId: string;
  inviteCode?: string | null;
  publicPaymentId?: string | null;
  /**
   * Defaults to native. Guest entry observes app-free roster, application and checkout sources without requiring a consumer profile.
   */
  surface?: "native" | "guest";
  /**
   * Opt-in for paid host membership facts (hostMembership object and the paidMembershipRequired/memberEarlyAccess restrictions). Older clients omit it and receive the original shape.
   */
  includeHostMembership?: boolean;
}
