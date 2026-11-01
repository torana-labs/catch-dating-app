/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export interface AdminRebuildInboxCallableResponse {
  source:
    | "supplyIntakeRequest"
    | "organizerClaimRequest"
    | "salesInboundIntent"
    | "accessApplication"
    | "externalEvent"
    | "people";
  scanned: number;
  written: number;
  nextCursor: string | null;
}
