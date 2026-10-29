/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * One automatic reply from Catch's WhatsApp number to someone who just messaged it, claimed before sending so a redelivered message never sends twice. Keeps no message text, only which reply it was, the inbound receipt it answers, the sender's endpoint hash and the outcome. An uncertain send stays consumed. Expires after 30 days.
 */
export interface CatchWhatsappAutoReplyDocument {
  schemaVersion: 1;
  replyId: string;
  kind:
    | "nomination_queued"
    | "nomination_without_links"
    | "nomination_rate_limited"
    | "clarification_question"
    | "support_acknowledged"
    | "listing_ready";
  sourceEventId: string;
  endpointHash: string;
  state:
    | "claimed"
    | "sent"
    | "unknown"
    | "skipped_stop"
    | "skipped_unavailable";
  providerMessageId: string | null;
  createdAtMillis: number;
  updatedAtMillis: number;
  /**
   * Serialized Firestore Timestamp fixture shape.
   */
  expiresAt: {
    _seconds: number;
    _nanoseconds: number;
  };
}
