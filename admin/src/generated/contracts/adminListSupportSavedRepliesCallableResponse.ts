/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export interface AdminListSupportSavedRepliesCallableResponse {
  /**
   * @maxItems 200
   */
  items: {
    replyId: string;
    title: string;
    body: string;
    active: boolean;
    updatedAtMillis: number;
  }[];
}
