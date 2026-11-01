/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * The Marketplace from the analytics warehouse's Firestore exports. available is false (with a reason) when the warehouse could not be read; every list is then empty. Rates are whole percentages; null where nothing can be measured (no-shows only count events that checked anyone in).
 */
export interface AdminGetMarketplaceCallableResponse {
  rangeDays: 7 | 30 | 90;
  marketId: string | null;
  available: boolean;
  unavailableReason: string | null;
  generatedAtMillis: number;
  stats: {
    eventsThisWeek: number;
    eventsLastWeek: number;
    filledPercent: number | null;
    noShowPercent: number | null;
    cameBackPercent: number | null;
  };
  /**
   * @maxItems 100
   */
  cities: {
    marketId: string;
    organizersLive: number;
    eventsPerWeek: number;
    filledPercent: number | null;
    noShowPercent: number | null;
    waitlisted: number;
  }[];
  /**
   * @maxItems 24
   */
  guestCohorts: {
    month: string;
    guests: number;
    again30Percent: number | null;
    again60Percent: number | null;
    again90Percent: number | null;
  }[];
  /**
   * @maxItems 13
   */
  bookingsByWeek: {
    weekStart: string;
    bookings: number;
    partial: boolean;
  }[];
  /**
   * @maxItems 50
   */
  goingQuiet: {
    organizerId: string;
    name: string;
    marketId: string | null;
    daysSinceLastEvent: number;
    eventsPerMonthBefore: number;
    salesOwnerUid: string | null;
    salesOwnerName: string | null;
  }[];
}
