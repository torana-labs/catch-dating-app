/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export interface AdminListActivityLogCallableResponse {
  generatedAt: string;
  filter: "all" | "problems" | "decisions" | "agents";
  /**
   * @maxItems 100
   */
  entries: {
    entryId: string;
    kind: "decision" | "agent";
    at: string;
    actorUid: string | null;
    /**
     * @maxItems 10
     */
    actorRoles: string[];
    action: string;
    target: string | null;
    outcome: "done" | "started" | "failed" | "indeterminate";
    detail: string | null;
    problem: boolean;
  }[];
  nextCursor: string | null;
}
