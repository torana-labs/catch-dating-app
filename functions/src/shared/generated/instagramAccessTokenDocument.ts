/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Server-only pointer to the renewed Instagram Login access token for Catch's Instagram account, stored at instagramAccessTokens/{accountId}. The token itself stays in Secret Manager: secretVersion names the exact CATCH_INSTAGRAM_ACCESS_TOKEN version that holds it. refreshInstagramAccessToken writes it; instagramClaimWebhook reads that version while it is unexpired and otherwise uses the version pinned at deploy.
 */
export interface InstagramAccessTokenDocument {
  /**
   * Catch's Instagram professional account id, the webhook's entry.id.
   */
  accountId: string;
  /**
   * Exact Secret Manager version holding the renewed token, or null when no renewed token is usable.
   */
  secretVersion: string | null;
  /**
   * When Meta said the renewed token expires.
   */
  expiresAt: {
    _seconds: number;
    _nanoseconds: number;
  } | null;
  refreshedAt: {
    _seconds: number;
    _nanoseconds: number;
  } | null;
  /**
   * Serialized Firestore Timestamp fixture shape.
   */
  lastAttemptAt: {
    _seconds: number;
    _nanoseconds: number;
  };
  /**
   * Why the last renewal failed, or null after a success.
   */
  lastErrorCode:
    | (
        | "refreshRejected"
        | "refreshFailed"
        | "accountMismatch"
        | "secretWriteFailed"
      )
    | null;
  revision: number;
}
