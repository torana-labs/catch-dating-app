/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

import type {PlatformCostDocument} from "./platformCostDocument";

/**
 * One month's costs: what is stored, the WhatsApp estimate used while no WhatsApp invoice total is stored, messages sent, and the month's total.
 */
export interface AdminManagePlatformCostsCallableResponse {
  month: string;
  /**
   * @maxItems 20
   */
  costs: PlatformCostDocument[];
  whatsapp: {
    estimateMinor: number;
    messageCount: number;
    usesEstimate: boolean;
  };
  totalMinor: number;
  adSpend: {
    metaConnected: boolean;
    googleConnected: boolean;
  };
}
