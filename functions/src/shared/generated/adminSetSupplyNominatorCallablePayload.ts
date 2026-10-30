/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Adds or updates someone who may nominate organizers by sending links to Catch's WhatsApp number or Instagram account. Exactly one of phoneE164 and instagramHandle names them. Their messages become Supply Intake nominations credited to the uid. The uid must hold a sales role (associate) or a current partner membership (partner). Setting active to false stops new messages counting; nothing is deleted.
 */
export interface AdminSetSupplyNominatorCallablePayload {
  phoneE164?: string;
  instagramHandle?: string;
  uid: string;
  role: "associate" | "partner";
  displayName: string;
  defaultMarket: string | null;
  active: boolean;
}
