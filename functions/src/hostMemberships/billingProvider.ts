/**
 * Provider-neutral billing boundary for paid host memberships. Razorpay is
 * the only implementation; a Stripe Connect adapter implements the same
 * contract without reshaping plans, memberships or the state machine.
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
  verifyWebhook(rawBody: Buffer, signature: string): boolean;
  parseWebhook(rawBody: Buffer, providerEventId: string | null):
    ProviderSubscriptionEvent | null;
}

export class HostMembershipProviderError extends Error {
  constructor(message: string,
    readonly disposition: "requestNotSent" | "rejected" | "outcomeUnknown") {
    super(message);
    this.name = "HostMembershipProviderError";
  }
}
