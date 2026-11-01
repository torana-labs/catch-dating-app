/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Assign, unassign, snooze or wake one Admin inbox item; audited and recorded in its journey.
 */
export interface AdminUpdateInboxItemCallablePayload {
  itemId: string;
  action: "assign" | "unassign" | "snooze" | "wake";
  assigneeUid: string | null;
  snoozedUntil: string | null;
  note: string | null;
}
