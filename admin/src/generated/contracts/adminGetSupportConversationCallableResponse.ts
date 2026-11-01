/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export interface AdminGetSupportConversationCallableResponse {
  conversation: {
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
    contactAddress: string;
    uid: string | null;
    organizerId: string | null;
    /**
     * @maxItems 10
     */
    links: {
      kind: "booking" | "payment" | "safetyCase";
      path: string;
      label: string;
    }[];
  };
  /**
   * @maxItems 200
   */
  messages: {
    messageId: string;
    direction: "inbound" | "outbound" | "note";
    text: string;
    authorUid: string | null;
    atMillis: number;
    deliveryState: "received" | "recorded";
  }[];
}
