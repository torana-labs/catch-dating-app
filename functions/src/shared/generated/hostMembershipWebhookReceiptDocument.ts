/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Server-only create-once dedupe receipt for one verified membership provider webhook delivery. Stores ids and outcome only, never the raw payload.
 */
export interface HostMembershipWebhookReceiptDocument {
  schemaVersion: 1;
  provider: "razorpay";
  providerEventId: string | null;
  eventType: string;
  subscriptionId: string | null;
  paymentId: string | null;
  outcome: "applied" | "ignored" | "stale";
  receivedAtMillis: number;
}
