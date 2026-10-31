/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Records a message in a support conversation: a reply staff sent (outbound; the conversation then waits on them), an email that came in (inbound, starting the conversation when conversationId is null), or an internal note. Replies are recorded, not sent: staff send them from WhatsApp, Instagram or email until replies go out through the provider.
 */
export interface AdminRecordSupportMessageCallablePayload {
  conversationId: string | null;
  channel: "whatsapp" | "instagram" | "email";
  contactAddress: string | null;
  displayName: string | null;
  direction: "inbound" | "outbound" | "note";
  text: string;
  savedReplyId: string | null;
}
