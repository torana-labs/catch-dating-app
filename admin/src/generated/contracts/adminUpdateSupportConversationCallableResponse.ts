/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export interface AdminUpdateSupportConversationCallableResponse {
  conversationId: string;
  status: "open" | "waitingOnThem" | "closed";
  ownerUid: string | null;
  linkCount: number;
}
