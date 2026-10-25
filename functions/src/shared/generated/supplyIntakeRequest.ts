/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * One request to build an organizer listing and collect that organizer's events. Every front door (a sales associate or partner nomination, an organizer's own submission, an Admin-started discovery run, or staff reading new events for an organizer Catch already lists) creates one; Supply Intake gathers, reviews and stages the result for staff.
 */
export type SupplyIntakeRequest = {
  [k: string]: unknown;
} & {
  schemaVersion: 1;
  requestId: string;
  kind: "nomination" | "self_submission" | "discovery" | "event_refresh";
  /**
   * The organizer Catch already lists that an event_refresh reads new events for. Only event_refresh requests carry it.
   */
  target?: {
    organizerId: string;
  };
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
   * What created the request: an Admin nomination, a sales inbound intent (a website host application or a partner nomination), a discovery run, or staff refreshing a listed organizer's events. Null for requests made by hand.
   */
  origin: null | {
    kind:
      | "admin_nomination"
      | "sales_inbound_intent"
      | "discovery_run"
      | "admin_event_refresh";
    id: string;
  };
};
