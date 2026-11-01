/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * How a money issue in Admin Money was resolved, keyed by the issue id (source collection and record id joined by a colon, encoded). A resolved issue leaves the open queue even while its record still matches; a new issue on the same record needs the record to change state.
 */
export interface MoneyIssueResolutionDocument {
  schemaVersion: 1;
  resolutionId: string;
  issueId: string;
  kind: "payment" | "refund" | "review" | "bill";
  statusAtResolution: string;
  action: "confirmedBooking" | "closed";
  note: string | null;
  resolvedAtMillis: number;
  resolvedByUid: string;
  title: string;
  organizerName: string | null;
}
