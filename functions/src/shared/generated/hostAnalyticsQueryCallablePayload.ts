/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Callable payload accepted by getHostAnalytics and adminGetHostAnalytics.
 */
export interface HostAnalyticsQueryCallablePayload {
  organizerId?: string | null;
  eventId?: string | null;
  rangePreset?: "7d" | "30d" | "90d" | "12m" | "month" | "custom";
  startDate?: string | null;
  endDate?: string | null;
  granularity?: "day" | "week" | "month";
  timezone?: string;
}
