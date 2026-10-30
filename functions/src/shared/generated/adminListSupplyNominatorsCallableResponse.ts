/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export interface AdminListSupplyNominatorsCallableResponse {
  /**
   * @maxItems 200
   */
  nominators: {
    nominatorId: string;
    channel: "whatsapp" | "instagram";
    phoneLast4: string | null;
    instagramHandle: string | null;
    role: "associate" | "partner";
    uid: string;
    displayName: string;
    defaultMarket: string | null;
    active: boolean;
    updatedAt: string;
  }[];
}
