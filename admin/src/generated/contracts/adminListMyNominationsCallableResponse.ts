/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export interface AdminListMyNominationsCallableResponse {
  generatedAt: string;
  filter: "all" | "published" | "waiting" | "stuck";
  /**
   * @maxItems 100
   */
  nominations: {
    itemId: string;
    type: "listing" | "event" | "claim" | "enquiry" | "access" | "stuck";
    title: string;
    subtitle: string | null;
    city: string | null;
    state: {
      code: string;
      label: string;
      tone: "neutral" | "info" | "success" | "warning" | "danger";
    };
    status: "working" | "waiting" | "snoozed" | "done";
    sentAt: string;
    updatedAt: string;
    doneAt: string | null;
  }[];
  nextCursor: string | null;
  totals: {
    all: number;
    published: number;
    waiting: number;
    stuck: number;
  };
}
