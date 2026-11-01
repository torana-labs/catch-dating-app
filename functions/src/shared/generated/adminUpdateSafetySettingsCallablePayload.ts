/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Owner-only. Replaces the report reasons and the safety rules. Reason codes already used on reports keep their meaning, so a reason is switched off (active false) rather than removed.
 */
export interface AdminUpdateSafetySettingsCallablePayload {
  /**
   * @minItems 1
   * @maxItems 40
   */
  reasons: {
    code: string;
    label: string;
    severe: boolean;
    takedown: boolean;
    active: boolean;
  }[];
  restrictOnSevereReport: boolean;
  organizerBlockLists: boolean;
  organizerReports: boolean;
}
