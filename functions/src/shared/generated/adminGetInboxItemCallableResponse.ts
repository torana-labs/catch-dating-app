/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export interface AdminGetInboxItemCallableResponse {
  item: {
    itemId: string;
    type: "listing" | "event" | "claim" | "enquiry" | "access" | "stuck";
    sourceKind:
      | "supplyIntakeRequest"
      | "organizerClaimRequest"
      | "salesInboundIntent"
      | "accessApplication"
      | "externalEvent";
    sourceId: string;
    sourcePath: string;
    title: string;
    subtitle: string | null;
    cameFrom: string;
    nominatorUid: string | null;
    city: string | null;
    state: {
      code: string;
      label: string;
      tone: "neutral" | "info" | "success" | "warning" | "danger";
    };
    status: "working" | "waiting" | "snoozed" | "done";
    waitingSince: string;
    doneAt: string | null;
    assigneeUid: string | null;
    snoozedUntil: string | null;
    recommendation: {
      decision: "approve" | "reject";
      byUid: string;
      at: string;
      note: string;
    } | null;
    listingEvent: {
      intakeRequestId: string;
      eventWorkItemId: string;
    } | null;
  };
  /**
   * @maxItems 200
   */
  journey: {
    stepId: string;
    occurredAt: string;
    title: string;
    detail: string | null;
    actorUid: string | null;
    tone: "ink" | "success" | "warning" | "danger" | "muted";
  }[];
  canWork: boolean;
  canDecideClaim: boolean;
}
