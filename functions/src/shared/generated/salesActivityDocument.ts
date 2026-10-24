/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Private timeline with actor-attested manual outreach and server-confirmed canonical claim and synthetic-demo transitions, and the approval of a listing Supply Intake built.
 */
export type SalesActivityDocument = {
  [k: string]: unknown;
} & {
  schemaVersion: 1;
  classification: "sales_private";
  activityId: string;
  organizerId: string;
  opportunityId: string | null;
  type:
    | "note"
    | "reply"
    | "call"
    | "demo"
    | "pilot"
    | "correction"
    | "outreach_sent_manual"
    | "claim_requested"
    | "claim_approved"
    | "claim_rejected"
    | "demo_started"
    | "demo_completed"
    | "listing_approved";
  channel: ("email" | "whatsapp" | "other") | null;
  outcome: "actor_attested_sent" | null;
  providerConfirmed: false;
  occurredAt: string;
  recordedAt: string;
  note: string;
  actorUid: string;
  source?:
    | {
        kind: "organizer_claim";
        claimRequestId: string;
        transitionId: string;
      }
    | {
        kind: "sales_demo";
        sessionId: string;
        blueprintId: string;
        blueprintRevision: number;
        invitationId: string;
      }
    | {
        kind: "supply_intake";
        requestId: string;
        approvalId: string;
        origin:
          | "admin_nomination"
          | "sales_inbound_intent"
          | "discovery_run"
          | "none";
      };
};
