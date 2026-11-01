/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Growth for one range, computed from organizerGrowthFacts, organizer bills, nominator credit and costs. Cohorts group organizers by the India-time month they were listed; days are medians counted from listing. Ticket sales are what organizers sold into their own accounts, from their monthly bills. Catch earned is what organizers' bills came to (paid or not, excluding free months).
 */
export interface AdminGetGrowthCallableResponse {
  range: "90d" | "12m" | "all";
  generatedAtMillis: number;
  summary: {
    listed: number;
    claimed: number;
    claimMedianDays: number | null;
    ranEvent: number;
    ranEventMedianDays: number | null;
    paying: number;
    sinceMonth: string | null;
  };
  /**
   * @maxItems 120
   */
  cohorts: {
    month: string;
    listed: number;
    claimed: number;
    claimMedianDays: number | null;
    ranEvent: number;
    ranEventMedianDays: number | null;
    /**
     * Listed under 30 days ago, so most of its organizers have not had time to run an event.
     */
    tooEarly: boolean;
  }[];
  /**
   * @maxItems 5
   */
  claimDays: {
    label: "0–3" | "4–7" | "8–14" | "15–30" | "31+";
    count: number;
  }[];
  /**
   * @maxItems 120
   */
  salesByMonthOnCatch: {
    month: string;
    organizers: number;
    /**
     * Average ticket sales per organizer in their 1st to 6th month on Catch, counted from the month of their first event; null where the month has not come yet.
     *
     * @maxItems 6
     */
    salesPerOrganizerMinor: (number | null)[];
  }[];
  /**
   * @maxItems 7
   */
  channels: {
    /**
     * Where the organizer first came from. imported: Catch found it (discovery or an import). sales_associate: a Catch sales associate nominated it. partner, guest, organizer: someone outside Catch nominated it. came_to_us: the organizer applied or set itself up. ads: the organizer applied after a paid campaign.
     */
    channel:
      | "imported"
      | "sales_associate"
      | "partner"
      | "guest"
      | "organizer"
      | "came_to_us"
      | "ads";
    listed: number;
    claimed: number;
    paying: number;
    earnedMinor: number;
    costMinor: number | null;
    costKind: "ads" | "credit" | "salaries" | "none";
    detail: string;
  }[];
  /**
   * @maxItems 120
   */
  claimsByMonth: {
    month: string;
    count: number;
  }[];
  adSpend: {
    month: string;
    metaMinor: number | null;
    metaConnected: boolean;
    googleConnected: boolean;
    adClaims: number;
  };
  /**
   * @maxItems 1000
   */
  nominators: {
    uid: string;
    name: string;
    role: "associate" | "partner" | "guest" | "organizer";
    nominated: number;
    claimed: number;
    paying: number;
    paidToCatchMinor: number;
    creditOwedMinor: number;
    creditApprovedMinor: number;
    creditPaidMinor: number;
    firstNominatedAtMillis: number | null;
    /**
     * @maxItems 50
     */
    organizers: {
      organizerId: string;
      name: string;
      claimed: boolean;
      latestBill: null | {
        billId: string;
        month: string;
        totalMinor: number;
        /**
         * toSend: made, not sent. sent: sent with its invoice number and due date; overdue is sent past its due date. paid, writtenOff: closed. free: nothing due because every sale fell in the free trial.
         */
        status: "toSend" | "sent" | "paid" | "writtenOff" | "free";
        creditMinor: number | null;
      };
      creditMonthIndex: number | null;
    }[];
  }[];
  /**
   * @maxItems 200
   */
  best: {
    organizerId: string;
    name: string;
    marketId: string | null;
    salesMinor: number;
    earnedMinor: number;
    events: number;
    /**
     * Ticket sales in the last three billed months against the three before; null when there is nothing to compare.
     */
    trendPercent: number | null;
    /**
     * Where the organizer first came from. imported: Catch found it (discovery or an import). sales_associate: a Catch sales associate nominated it. partner, guest, organizer: someone outside Catch nominated it. came_to_us: the organizer applied or set itself up. ads: the organizer applied after a paid campaign.
     */
    channel:
      | "imported"
      | "sales_associate"
      | "partner"
      | "guest"
      | "organizer"
      | "came_to_us"
      | "ads";
    payingSinceMonth: string | null;
    inTrial: boolean;
    ownTerms: boolean;
  }[];
}
