/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Lists support conversations for the Support inbox: open, mine, waiting on them, or closed, optionally only guests or organizers. Open lists the longest-waiting first.
 */
export interface AdminListSupportConversationsCallablePayload {
  view: "open" | "mine" | "waitingOnThem" | "closed";
  audience: "guest" | "organizer" | null;
  limit: number;
}
