/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export interface AdminGetSafetySettingsCallableResponse {
  settings: {
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
    updatedAtMillis: number | null;
    updatedByUid: string | null;
  };
  deadlines: {
    acknowledge: "immediately";
    firstLookHours: number;
    resolveDays: number;
    takedownHours: number;
  };
  stepRoles: {
    warn: "ops" | "owner";
    restrict: "ops" | "owner";
    suspend: "ops" | "owner";
    ban: "ops" | "owner";
  };
  retentionDaysAfterDeletion: number;
}
