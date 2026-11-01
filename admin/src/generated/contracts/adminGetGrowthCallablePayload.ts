/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Owner reads Growth for a range: organizer cohorts by the month they were listed, channels and ad spend, nominators and their credit, and the best organizers.
 */
export interface AdminGetGrowthCallablePayload {
  range: "90d" | "12m" | "all";
}
