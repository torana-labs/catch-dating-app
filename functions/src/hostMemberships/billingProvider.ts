/**
 * Provider-neutral billing boundary for paid host memberships. Razorpay is
 * the only implementation. One instance acts on one account: the organizer's
 * own merchant account (hostCollected, OAuth bearer token) or Catch's
 * platform account (platformSplit, key credentials). A Stripe Connect adapter
 * implements the same contract without reshaping plans, memberships or the
 * state machine.
 */
export type HostMembershipProviderName = "razorpay";

export type ProviderSubscriptionStatus =
  | "created"
  | "authenticated"
  | "active"
  | "pending"
  | "halted"
  | "paused"
  | "cancelled"
  | "completed"
  | "expired";

export interface ProviderSubscriptionSnapshot {
  id: string;
  status: ProviderSubscriptionStatus;
  planId: string;
  currentStartMillis: number | null;
  currentEndMillis: number | null;
  startAtMillis: number | null;
  endedAtMillis: number | null;
  paidCount: number;
  notes: Record<string, string>;
}

export interface ProviderCharge {
  id: string;
  amount: number;
  status: "captured" | "failed" | "other";
}

export type ProviderSubscriptionEvent = {
  providerEventId: string | null;
  type: string;
  accountId: string;
  createdAtMillis: number;
  subscription: ProviderSubscriptionSnapshot | null;
  payment: ProviderCharge | null;
};

export interface HostMembershipBillingProvider {
  readonly provider: HostMembershipProviderName;
  createPrice(input: {
    catchPlanId: string; organizerId: string; name: string;
    interval: "monthly" | "annual"; amountPaise: number; revision: number;
    catchProject: string;
  }): Promise<{providerPriceId: string}>;
  createSubscription(input: {
    providerPriceId: string; interval: "monthly" | "annual";
    startAtMillis: number | null; notes: Record<string, string>;
  }): Promise<{providerSubscriptionId: string; authorizationUrl: string;
    snapshot: ProviderSubscriptionSnapshot}>;
  fetchSubscription(id: string): Promise<ProviderSubscriptionSnapshot>;
  pause(id: string): Promise<ProviderSubscriptionSnapshot>;
  resume(id: string): Promise<ProviderSubscriptionSnapshot>;
  cancelAtPeriodEnd(id: string): Promise<ProviderSubscriptionSnapshot>;
  /** Ends billing now; used only when the member's account is deleted. */
  cancelImmediately(id: string): Promise<ProviderSubscriptionSnapshot>;
  splitCharge(input: {paymentId: string; destinationAccountId: string;
    amountPaise: number; chargeId: string}): Promise<{transferId: string}>;
  findChargeTransfer(input: {paymentId: string; destinationAccountId: string}):
    Promise<{transferId: string} | null>;
  /**
   * A read that succeeds only when the account can use Subscriptions. It
   * answers "notEnabled" when the provider refuses the product for this
   * account, and throws when the provider cannot be reached.
   */
  probeSubscriptions(): Promise<"enabled" | "notEnabled">;
  /**
   * hostCollected only: makes sure the organizer's merchant account sends
   * its subscription events to Catch's membership webhook. Reuses a matching
   * webhook instead of creating a second one.
   */
  ensureMerchantWebhook(input: {url: string}): Promise<{webhookId: string}>;
  verifyWebhook(rawBody: Buffer, signature: string): boolean;
  parseWebhook(rawBody: Buffer, providerEventId: string | null):
    ProviderSubscriptionEvent | null;
}

export class HostMembershipProviderError extends Error {
  constructor(message: string,
    readonly disposition: "requestNotSent" | "rejected" | "outcomeUnknown",
    readonly httpStatus: number | null = null) {
    super(message);
    this.name = "HostMembershipProviderError";
  }
}
