/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Owner reads or replaces Catch's money settings (GST registered, bill due day, nominator credit rule). A replacement names the revision it reviewed (0 when none is stored yet).
 */
export interface AdminManageMoneySettingsCallablePayload {
  action: "read" | "replace";
  expectedRevision: number | null;
  settings: {
    gstRegistered: boolean;
    gstRateBasisPoints: number;
    /**
     * Bills for a month fall due on this day of the next month.
     */
    billDueDayOfMonth: number;
    nominatorCredit: {
      /**
       * Share of what the organizer paid Catch, before GST.
       */
      rateBasisPoints: number;
      /**
       * Months of credit, counted from the organizer's first paid bill.
       */
      months: number;
      /**
       * A nomination lapses when the organizer has not claimed within this many days.
       */
      lapseDays: number;
      /**
       * Credit below this rolls over to the next payout.
       */
      minimumPayoutMinor: number;
      payoutDayOfMonth: number;
      /**
       * @maxItems 4
       */
      earningRoles: ("partner" | "guest" | "organizer" | "associate")[];
    };
  } | null;
}
