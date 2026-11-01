/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export interface AdminTakeAccountSafetyActionCallableResponse {
  actionId: string;
  kind: "warn" | "restrict" | "suspend" | "ban";
  status: "active";
  endsAtMillis: number | null;
  bookings: {
    cancelled: number;
    needsOrganizer: number;
    failed: number;
  };
}
