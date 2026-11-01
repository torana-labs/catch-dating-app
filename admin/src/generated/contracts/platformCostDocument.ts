/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * What one kind of cost came to in one India-time calendar month, platformCosts/{YYYY-MM}_{category}. The owner enters AI, Cloud, SMS and any invoice total by hand; WhatsApp falls back to an estimate from reserved dispatch costs while no invoice total is entered; ad spend arrives from the ad platform once its account is connected.
 */
export interface PlatformCostDocument {
  schemaVersion: 1;
  costId: string;
  month: string;
  category:
    | "whatsapp"
    | "ai"
    | "cloud"
    | "sms"
    | "ads_meta"
    | "ads_google"
    | "other";
  amountMinor: number;
  source: "manual" | "meta_api" | "google_ads_api";
  note: string | null;
  updatedAtMillis: number;
  updatedByUid: string | null;
}
