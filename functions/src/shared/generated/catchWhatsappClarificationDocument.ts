/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Catch asked a nominator whether their last message was a nomination or a question, and is waiting for "1" or "2". Keyed by the sender's endpoint hash, so each sender has at most one open question; it names the inbound receipt the answer applies to and expires after 24 hours. Keeps no message text.
 */
export interface CatchWhatsappClarificationDocument {
  schemaVersion: 1;
  endpointHash: string;
  sourceEventId: string;
  askedAtMillis: number;
  /**
   * Serialized Firestore Timestamp fixture shape.
   */
  expiresAt: {
    _seconds: number;
    _nanoseconds: number;
  };
}
