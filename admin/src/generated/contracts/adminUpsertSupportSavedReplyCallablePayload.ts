/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Adds or edits a saved reply; switch one off with active false.
 */
export interface AdminUpsertSupportSavedReplyCallablePayload {
  replyId: string | null;
  title: string;
  body: string;
  active: boolean;
}
