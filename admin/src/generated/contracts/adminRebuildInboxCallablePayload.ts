/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Owner-only: re-project one page of an inbox source collection, or of users into the people index.
 */
export interface AdminRebuildInboxCallablePayload {
  source:
    | "supplyIntakeRequest"
    | "organizerClaimRequest"
    | "salesInboundIntent"
    | "accessApplication"
    | "externalEvent"
    | "people";
  limit: number;
  cursor: string | null;
}
