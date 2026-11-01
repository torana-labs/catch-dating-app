/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Owner reads Money's open or resolved issues (payments with no booking, refunds not sent, payments needing review, overdue bills) or acts on one. confirmBooking re-checks a website or offer checkout with Razorpay now and admits the guest when there is still room. close records that the issue was handled outside Admin.
 */
export interface AdminManagePaymentIssuesCallablePayload {
  action: "list" | "confirmBooking" | "close";
  view: "open" | "resolved";
  issueId: string | null;
  note: string | null;
}
