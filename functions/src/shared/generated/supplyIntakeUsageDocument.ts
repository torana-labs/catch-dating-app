/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Durable monthly page-fetch usage for Supply Intake. The worker reserves an intake's allowance here in a transaction before any request leaves the process and releases what it did not use; the monthly cap in acquisition_policy.json is enforced against this count, never against process memory.
 */
export interface SupplyIntakeUsageDocument {
  schemaVersion: 1;
  monthKey: string;
  networkRequests: number;
  updatedAt: string;
}
