/**
 * Event-day messaging consent and spend live in one collection per record
 * type for every channel. Each document's `channel` (`sms`, `rcs` or
 * `whatsapp`) says which channel it belongs to; document ids already carry a
 * channel prefix, so a point read never crosses channels, and every query
 * filters on `channel` first.
 */
export const EVENT_ASSISTANCE_PERMISSIONS = "eventAssistancePermissions";
export const EVENT_ASSISTANCE_CONSENT_RECEIPTS =
  "eventAssistanceConsentReceipts";
export const EVENT_ASSISTANCE_WITHDRAWAL_GRANTS =
  "eventAssistanceWithdrawalGrants";
export const EVENT_ASSISTANCE_BUDGETS = "eventAssistanceBudgets";

export type MessageConsentChannel = "sms" | "rcs" | "whatsapp";

/**
 * A withdrawal grant's document id. Grants are found by the guest link id;
 * the channel prefix keeps one link's grants on different channels apart in
 * the shared collection.
 */
export function withdrawalGrantId(channel: MessageConsentChannel,
  linkId: string): string {
  return `${channel}:${linkId}`;
}
