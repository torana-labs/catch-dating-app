/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Manager-only, event-relative attendance and Catch-payment labels for an operational roster. Private Event Success, dating, feedback, and safety data are excluded.
 */
export interface GetEventRosterInsightsCallableResponse {
  eventId: string;
  organizerId: string;
  cutoffAtMillis: number;
  sourceCoverage: "exact" | "partial";
  spendCoverage: "catchPaymentsOnly" | "insufficientData";
  /**
   * @maxItems 1000
   */
  rows: {
    attendeeId: string;
    contactId: string | null;
    availability:
      | "ready"
      | "projectionPending"
      | "ambiguousIdentity"
      | "insufficientHistory";
    /**
     * @maxItems 11
     */
    signals: (
      | "first_time"
      | "returning"
      | "regular"
      | "re_engaging"
      | "reliable"
      | "needs_confirmation"
      | "advocate"
      | "high_impact_advocate"
      | "known_catch_spender"
      | "top_catch_spender"
      | "member"
    )[];
    priorAttendedEventCount: number;
    priorExpectedEventCount: number;
    priorNoShowCount: number;
    lastAttendedAtMillis: number | null;
    attendanceRate: number | null;
    /**
     * @maxItems 12
     */
    catchSpend: {
      currency: string;
      amountMinor: number;
      paidOrderCount: number;
    }[];
  }[];
  computedAtMillis: number;
}
