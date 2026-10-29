/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * A person staff have allowed to nominate organizers by messaging Catch. A WhatsApp nominator is keyed by the hash of their number, which is the same endpoint hash the WhatsApp receipts use, so the number itself is never stored; only its last four digits are kept so staff can tell entries apart. Each message from an active nominator becomes Supply Intake nominations credited to their Catch account. Their authority (a sales role, or a current partner membership) is checked again on every message.
 */
export interface SupplyNominatorDocument {
  schemaVersion: 1;
  nominatorId: string;
  channel: "whatsapp";
  endpointHash: string;
  phoneLast4: string;
  role: "associate" | "partner";
  uid: string;
  displayName: string;
  defaultMarket: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  updatedByUid: string;
}
