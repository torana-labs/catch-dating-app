/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Owner reads one month's costs, sets one kind of cost for the month by hand, or clears a hand-entered cost.
 */
export interface AdminManagePlatformCostsCallablePayload {
  action: "list" | "set" | "clear";
  month: string;
  category:
    | (
        | "whatsapp"
        | "ai"
        | "cloud"
        | "sms"
        | "ads_meta"
        | "ads_google"
        | "other"
      )
    | null;
  amountMinor: number | null;
  note: string | null;
}
