/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * One month of Finance from organizer bills (ticket sales paid into organizers' own accounts and Catch's commission), costs and nominator credit paid. leftOverMinor is earned less costs, before salaries.
 */
export interface AdminGetFinanceMonthCallableResponse {
  month: string;
  sales: {
    grossMinor: number;
    refundedMinor: number;
    netMinor: number;
    events: number;
    organizers: number;
    payments: number;
  };
  earned: {
    /**
     * Commission before caps, for organizers past their free trial.
     */
    uncappedMinor: number;
    /**
     * What caps took off (a positive number).
     */
    capsAndTermsMinor: number;
    trialWaivedMinor: number;
    billedMinor: number;
    billedOrganizers: number;
    cappedOrganizers: number;
    ownTermsOrganizers: number;
    freeOrganizers: number;
    paidMinor: number;
    writtenOffMinor: number;
  };
  costs: {
    /**
     * @maxItems 20
     */
    lines: {
      category:
        | "whatsapp"
        | "ai"
        | "cloud"
        | "sms"
        | "ads_meta"
        | "ads_google"
        | "other";
      amountMinor: number;
      source: "manual" | "meta_api" | "google_ads_api" | "estimate";
      note: string | null;
    }[];
    nominatorCreditPaidMinor: number;
    totalMinor: number;
    whatsappIsEstimate: boolean;
    whatsappMessages: number;
  };
  notCatch: {
    providerFeeMinor: number;
    providerTaxMinor: number;
    gstRegistered: boolean;
    gstMinor: number;
  };
  leftOverMinor: number;
  /**
   * @maxItems 7
   */
  series: {
    month: string;
    salesMinor: number;
    earnedMinor: number;
    partial: boolean;
  }[];
}
