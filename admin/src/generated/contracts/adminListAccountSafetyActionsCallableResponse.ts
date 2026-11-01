/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export interface AdminListAccountSafetyActionsCallableResponse {
  /**
   * @maxItems 200
   */
  items: {
    actionId: string;
    uid: string;
    displayName: string | null;
    kind: "warn" | "restrict" | "suspend" | "ban";
    reasonCode: string;
    reasonLabel: string;
    messageToUser: string;
    durationDays: 7 | 30 | null;
    startsAtMillis: number;
    endsAtMillis: number | null;
    status: "active" | "expired" | "lifted" | "replaced";
    decidedByUid: string;
    decidedByRole: "owner" | "ops" | "system";
    automatic: boolean;
    appealable: boolean;
    /**
     * @maxItems 20
     */
    caseTargetPaths: string[];
    appeal: null | {
      status: "open" | "kept" | "reduced" | "lifted";
      text: string;
      submittedAtMillis: number;
      reviewerUid: string | null;
      decidedAtMillis: number | null;
      decisionNote: string | null;
    };
    bookings: {
      cancelled: number;
      needsOrganizer: number;
      failed: number;
    };
    blockedSignupAttempts: number;
    canReviewAppeal: boolean;
  }[];
}
