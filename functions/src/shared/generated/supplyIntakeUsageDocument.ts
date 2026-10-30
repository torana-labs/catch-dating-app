/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Durable monthly network usage for Supply Intake: page fetches at {monthKey}, handle web searches at web-search-{monthKey}. The worker reserves an intake's allowance here in a transaction before any request leaves the process (and releases unused page fetches); the monthly caps in acquisition_policy.json are enforced against these counts, never against process memory.
 */
export interface SupplyIntakeUsageDocument {
  schemaVersion: 1;
  monthKey: string;
  networkRequests: number;
  updatedAt: string;
}
