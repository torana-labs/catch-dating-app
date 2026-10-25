/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export interface AdminListSupplyIntakePoliciesCallableResponse {
  /**
   * @maxItems 12
   */
  policies: {
    gapId: string;
    label: string;
    enables: string;
    configPath: string;
    decisionId: string;
    decision: null | {
      decision: "accept" | "hold" | "reject";
      decisionStatus: "accepted" | "held" | "rejected";
      note: string;
      reviewedAt: string | null;
    };
    /**
     * Whether the policy file switches the capability on.
     */
    enabled: boolean;
    /**
     * Whether the policy file cites this decision, as switching it on requires.
     */
    configCitesDecision: boolean;
    /**
     * @maxItems 6
     */
    limits: {
      label: string;
      value: number;
    }[];
  }[];
}
