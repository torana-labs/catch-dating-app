/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export interface AdminListInboxItemsCallableResponse {
  generatedAt: string;
  scope: "waiting" | "mine" | "snoozed" | "done" | "working";
  type: ("listing" | "event" | "claim" | "enquiry" | "access" | "stuck") | null;
  city: string | null;
  /**
   * @maxItems 100
   */
  items: {
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
  }[];
  nextCursor: string | null;
  totals: {
    scopes: {
      waiting: number;
      mine: number;
      snoozed: number;
      working: number;
    };
    types: {
      all: number;
      listing: number;
      event: number;
      claim: number;
      enquiry: number;
      access: number;
      stuck: number;
    };
  };
  oldestWaitingSince: string | null;
}
