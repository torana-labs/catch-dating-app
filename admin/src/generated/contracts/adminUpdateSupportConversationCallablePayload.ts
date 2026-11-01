/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Sets a support conversation's owner, status and links (to a booking, payment or safety case). Links replace the previous set; each linked document must exist.
 */
export interface AdminUpdateSupportConversationCallablePayload {
  conversationId: string;
  ownerUid: string | null;
  status: "open" | "waitingOnThem" | "closed";
  /**
   * @maxItems 10
   */
  links: {
    kind: "booking" | "payment" | "safetyCase";
    path: string;
    label: string;
  }[];
}
