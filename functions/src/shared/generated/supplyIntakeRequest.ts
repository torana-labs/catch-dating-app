/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * One request to build an organizer listing and collect that organizer's events. Every front door (a sales associate or partner nomination, an organizer's own submission, or an Admin-started discovery run) creates one; Supply Intake gathers, reviews and stages the result for staff.
 */
export type SupplyIntakeRequest = {
  [k: string]: unknown;
} & {
  schemaVersion: 1;
  requestId: string;
  kind: "nomination" | "self_submission" | "discovery";
  market: string;
  seed: {
    [k: string]: unknown;
  };
  submittedBy: {
    role: "associate" | "partner" | "organizer" | "system";
    uid: string | null;
    partnerId: string | null;
  };
  submittedAt: string;
  /**
   * What created the request: an Admin nomination, a sales inbound intent (a website host application or a partner nomination), or a discovery run. Null for requests made by hand.
   */
  origin: null | {
    kind: "admin_nomination" | "sales_inbound_intent" | "discovery_run";
    id: string;
  };
};
