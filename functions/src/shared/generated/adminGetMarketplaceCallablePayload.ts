/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Owner reads the Marketplace: events, places filled, no-shows and waitlists by city over the last 7, 30 or 90 days; guests by the month they first booked and whether they came back; bookings each week; organizers going quiet. marketId narrows to one city.
 */
export interface AdminGetMarketplaceCallablePayload {
  rangeDays: 7 | 30 | 90;
  marketId: string | null;
}
