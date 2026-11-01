/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Assign, unassign, snooze, wake, dismiss or reopen one Admin inbox item; audited and recorded in its journey.
 */
export interface AdminUpdateInboxItemCallablePayload {
  itemId: string;
  action: "assign" | "unassign" | "snooze" | "wake" | "dismiss" | "reopen";
  assigneeUid: string | null;
  snoozedUntil: string | null;
  note: string | null;
}
