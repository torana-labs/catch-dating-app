/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * One member's paid membership with one organizer, keyed hm_<sha256([organizerId, uid])> so a rejoining member keeps tenure. Written only by the membership state machine from verified provider evidence and member/host intents. Distinct from organizerCommunityMemberships (unpaid approval grants).
 */
export interface HostMembershipDocument {
  schemaVersion: 1;
  organizerId: string;
  uid: string;
  planId: string;
  planName: string;
  interval: "monthly" | "annual";
  status:
    | "trialing"
    | "active"
    | "past_due"
    | "paused"
    | "canceling"
    | "expired";
  statusReason:
    | null
    | "memberPaused"
    | "hostPaused"
    | "paymentFailed"
    | "memberCanceled"
    | "planCompleted"
    | "providerCanceled";
  /**
   * INR paise. The ceiling keeps every renewal inside the RBI e-mandate auto-debit limit without re-authentication.
   */
  priceInPaise: number;
  currency: "INR";
  currentPeriodStartMillis: number | null;
  currentPeriodEndMillis: number | null;
  trialEndsAtMillis: number | null;
  cancelAtPeriodEnd: boolean;
  pause: null | {
    initiator: "member" | "host";
    pausedAtMillis: number;
  };
  pastDueSinceMillis: number | null;
  memberSinceMillis: number | null;
  tenure: {
    accumulatedMillis: number;
    stretchStartedAtMillis: number | null;
  };
  provider: "razorpay";
  providerSubscriptionId: string;
  providerPlanId: string;
  /**
   * The account that owns this subscription, copied from the checkout that created it. Absent on memberships created under the original platform-account model.
   */
  payment?: {
    provider: "razorpay";
    /**
     * hostCollected: the guest pays the organizer's own merchant account and the organizer is merchant of record; Catch bills its commission afterwards. platformSplit: Catch's platform account collects and transfers the organizer's share (Razorpay Route), deducting any at-source fee.
     */
    moneyFlow: "hostCollected" | "platformSplit";
    providerAccountId: string;
    bindingId: string;
    mode: "test" | "live";
  };
  providerEventAtMillis: number;
  lastCheckoutId: string;
  revision: number;
  createdAtMillis: number;
  updatedAtMillis: number;
}
