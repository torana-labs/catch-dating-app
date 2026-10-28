import {createHmac} from "node:crypto";
import type {CallableRequest} from "firebase-functions/v2/https";
import type {
  HostMembershipPlanDocument,
  HostMembershipProgramDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {RazorpayPlatformPaymentConfig} from
  "../payments/razorpayPlatformPaymentConfig";
import {FakeDocRef, FakeFirestore} from "../shared/testing/programFirestore";
import type {
  HostMembershipBillingProvider,
  ProviderSubscriptionSnapshot,
} from "./billingProvider";
import type {HostMembershipCallableDeps} from "./callableDeps";
import {RazorpaySubscriptionProvider} from "./razorpaySubscriptionProvider";

// The shared fake has no DocumentReference.create; Admin SDK refs do.
const fakeRefPrototype = FakeDocRef.prototype as unknown as {
  create?: (this: FakeDocRef, data: Record<string, unknown>) => Promise<void>;
};
fakeRefPrototype.create ??= async function(data) {
  this.firestore.createDoc(this.path, data);
};

export const catchProject = "catch-test";
export const organizerId = "organizer-1";
export const planId = "hmp_AbCdEfGhIjKlMnOpQrSt";
export const webhookSecret = "membership-webhook-secret";
export const now = 1_761_600_000_000;
export const dayMillis = 24 * 60 * 60 * 1000;

export const testConfig: RazorpayPlatformPaymentConfig = {
  schema: "catch.razorpay-platform-payments/v1", mode: "test",
  platformAccountId: "acc_CatchPlatform", keyId: "rzp_test_platform",
  keySecret: "key-secret", webhookSecret,
  feeBasisPoints: {formFee: 0, eventAdmission: 0, hostMembership: 1000},
};

export function program(overrides: Partial<HostMembershipProgramDocument> =
{}): HostMembershipProgramDocument {
  return {schemaVersion: 1, organizerId, state: "enabled",
    payment: {provider: "razorpay", providerAccountId: "acc_HostRoute1",
      bindingId: "owner-1_razorpay", mode: "test"},
    billingPause: {state: "active", requestedAtMillis: null,
      requestedBy: null, processedCount: 0, cursor: null},
    memberCount: 0, revision: 1, createdAtMillis: now, updatedAtMillis: now,
    ...overrides};
}

export function plan(overrides: Partial<HostMembershipPlanDocument> = {}):
  HostMembershipPlanDocument {
  return {schemaVersion: 1, organizerId, name: "Sunday Runners",
    description: "", status: "published",
    prices: {monthly: {amountPaise: 49900,
      providerPriceIds: {razorpay: "plan_TestMonthly1"}, revision: 1}},
    memberCap: null, trialDays: 0,
    benefits: [{type: "eventDiscount", percentOff: 100}],
    perks: [], limits: {maxUpcomingMemberPricedBookings: null},
    activeMemberCount: 0, sortOrder: 0, revision: 1, createdAtMillis: now,
    updatedAtMillis: now, publishedAtMillis: now, ...overrides};
}

export function seedStore(extra: Record<string, Record<string, unknown>> =
{}): FakeFirestore {
  return new FakeFirestore({
    [`hostMembershipPrograms/${organizerId}`]:
      program() as unknown as Record<string, unknown>,
    [`hostMembershipPlans/${planId}`]:
      plan() as unknown as Record<string, unknown>,
    ...extra,
  });
}

export function subscription(overrides: Partial<ProviderSubscriptionSnapshot>
= {}): ProviderSubscriptionSnapshot {
  return {id: "sub_TestSub1", status: "active", planId: "plan_TestMonthly1",
    currentStartMillis: now, currentEndMillis: now + 30 * dayMillis,
    startAtMillis: now, endedAtMillis: null, paidCount: 1,
    notes: {catchProject, catchCheckoutId: "hmc_AbCdEfGhIjKlMnOpQrSt",
      organizerId, planId, uid: "member-1"}, ...overrides};
}

export function rawSubscription(snapshot: ProviderSubscriptionSnapshot) {
  const seconds = (value: number | null) =>
    value === null ? null : Math.floor(value / 1000);
  return {id: snapshot.id, entity: "subscription", plan_id: snapshot.planId,
    status: snapshot.status,
    current_start: seconds(snapshot.currentStartMillis),
    current_end: seconds(snapshot.currentEndMillis),
    start_at: seconds(snapshot.startAtMillis),
    ended_at: seconds(snapshot.endedAtMillis), paid_count: snapshot.paidCount,
    notes: snapshot.notes, short_url: "https://rzp.io/i/test"};
}

/** Scripted provider double that records every call. */
export class FakeBillingProvider implements HostMembershipBillingProvider {
  readonly provider = "razorpay" as const;
  calls: Array<{method: string; input: unknown}> = [];
  next: ProviderSubscriptionSnapshot = subscription();
  transfers = new Map<string, string>();
  private readonly verifier = new RazorpaySubscriptionProvider({
    keyId: testConfig.keyId, keySecret: testConfig.keySecret, webhookSecret,
    mode: "test"}, async () => {
    throw new Error("network disabled");
  });

  private record(method: string, input: unknown) {
    this.calls.push({method, input});
  }
  async createPrice(input: Parameters<
    HostMembershipBillingProvider["createPrice"]>[0]) {
    this.record("createPrice", input);
    return {providerPriceId: `plan_Created${input.interval}`};
  }
  async createSubscription(input: Parameters<
    HostMembershipBillingProvider["createSubscription"]>[0]) {
    this.record("createSubscription", input);
    const snapshot = {...this.next, status: "created" as const,
      notes: input.notes};
    return {providerSubscriptionId: snapshot.id,
      authorizationUrl: "https://rzp.io/i/test", snapshot};
  }
  async fetchSubscription(id: string) {
    this.record("fetchSubscription", id);
    return this.next;
  }
  async pause(id: string) {
    this.record("pause", id);
    return {...this.next, status: "paused" as const};
  }
  async resume(id: string) {
    this.record("resume", id);
    return {...this.next, status: "active" as const};
  }
  async cancelAtPeriodEnd(id: string) {
    this.record("cancelAtPeriodEnd", id);
    return {...this.next, status: "active" as const};
  }
  async cancelImmediately(id: string) {
    this.record("cancelImmediately", id);
    return {...this.next, status: "cancelled" as const};
  }
  async splitCharge(input: Parameters<
    HostMembershipBillingProvider["splitCharge"]>[0]) {
    this.record("splitCharge", input);
    const transferId = `trf_Test${this.transfers.size + 1}`;
    this.transfers.set(input.paymentId, transferId);
    return {transferId};
  }
  async findChargeTransfer(input: Parameters<
    HostMembershipBillingProvider["findChargeTransfer"]>[0]) {
    this.record("findChargeTransfer", input);
    const transferId = this.transfers.get(input.paymentId);
    return transferId ? {transferId} : null;
  }
  verifyWebhook(rawBody: Buffer, signature: string) {
    return this.verifier.verifyWebhook(rawBody, signature);
  }
  parseWebhook(rawBody: Buffer, providerEventId: string | null) {
    return this.verifier.parseWebhook(rawBody, providerEventId);
  }
}

export function testDeps(db: FakeFirestore,
  provider = new FakeBillingProvider(),
  overrides: Partial<HostMembershipCallableDeps> = {}):
  HostMembershipCallableDeps & {provider: () => FakeBillingProvider} {
  let clock = now;
  return {
    db: () => db as unknown as FirebaseFirestore.Firestore,
    nowMillis: () => clock++,
    catchProject: () => catchProject,
    config: async () => testConfig,
    provider: () => provider,
    readyRouteAccount: (async () => ({bindingId: "owner-1_razorpay",
      account: {providerAccountId: "acc_HostRoute1"}})) as unknown as
      HostMembershipCallableDeps["readyRouteAccount"],
    checkRateLimit: async () => undefined,
    requireManager: async ({actorUid}) => {
      if (actorUid !== "host-1") throw new Error("permission-denied");
    },
    ...overrides,
  } as HostMembershipCallableDeps & {provider: () => FakeBillingProvider};
}

export function callable(uid: string, data: unknown):
  CallableRequest<unknown> {
  return {data, auth: {uid, token: {}}} as unknown as CallableRequest<unknown>;
}

export function signedWebhook(body: unknown): {rawBody: Buffer;
  signature: string} {
  const rawBody = Buffer.from(JSON.stringify(body));
  return {rawBody, signature: createHmac("sha256", webhookSecret)
    .update(rawBody).digest("hex")};
}

export function webhookBody(event: string,
  snapshot: ProviderSubscriptionSnapshot, createdAtMillis: number,
  payment?: {id: string; amount: number; status?: string}) {
  return {entity: "event", account_id: testConfig.platformAccountId, event,
    contains: payment ? ["subscription", "payment"] : ["subscription"],
    payload: {subscription: {entity: rawSubscription(snapshot)},
      ...(payment ? {payment: {entity: {id: payment.id, entity: "payment",
        amount: payment.amount, currency: "INR",
        status: payment.status ?? "captured"}}} : {})},
    created_at: Math.floor(createdAtMillis / 1000)};
}
