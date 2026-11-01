/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export interface AdminListSupportConversationsCallableResponse {
  /**
   * @maxItems 200
   */
  items: {
    conversationId: string;
    channel: "whatsapp" | "instagram" | "email";
    contactLabel: string;
    displayName: string | null;
    audience: "guest" | "organizer" | "unknown";
    subject: string;
    status: "open" | "waitingOnThem" | "closed";
    ownerUid: string | null;
    waitingSinceMillis: number | null;
    lastMessageAtMillis: number;
    lastMessagePreview: string;
    linkCount: number;
  }[];
  counts: {
    open: number;
    mine: number;
    waitingOnThem: number;
  };
}
