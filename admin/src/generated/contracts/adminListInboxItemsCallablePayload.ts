/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * One page of the Admin inbox: items waiting on a person, oldest first, with real totals per scope and type.
 */
export interface AdminListInboxItemsCallablePayload {
  scope: "waiting" | "mine" | "snoozed" | "done" | "working";
  type: ("listing" | "event" | "claim" | "enquiry" | "access" | "stuck") | null;
  city: string | null;
  limit: number;
  cursor: string | null;
}
