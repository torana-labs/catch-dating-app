/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Catch's money settings (Settings → Payments): whether Catch is GST registered (off until the accountant says so; bills carry no GST while off), when bills fall due, and the nominator credit rule. One document, moneySettings/platform; absent means the defaults the owner decided on 1 Nov 2026. Every write bumps revision.
 */
export interface MoneySettingsDocument {
  schemaVersion: 1;
  settingsId: "platform";
  revision: number;
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
  };
  updatedAtMillis: number;
  updatedByUid: string;
}
