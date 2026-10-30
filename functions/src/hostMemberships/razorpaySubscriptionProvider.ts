import {verifyRazorpayWebhookSignature} from "../payments/razorpay";
import {
  FormPaymentProviderError,
  RazorpayPaymentProvider,
  assertToken,
  providerId,
} from "../payments/formPayments/razorpayPaymentProvider";
import {
  HostMembershipProviderError,
  type HostMembershipBillingProvider,
  type ProviderCharge,
  type ProviderSubscriptionEvent,
  type ProviderSubscriptionSnapshot,
  type ProviderSubscriptionStatus,
} from "./billingProvider";

/** Renewal counts large enough to behave as "until cancelled". */
export const subscriptionTotalCounts = {monthly: 120, annual: 10} as const;

const subscriptionStatuses: readonly ProviderSubscriptionStatus[] = [
  "created", "authenticated", "active", "pending", "halted", "paused",
  "cancelled", "completed", "expired",
];

type Json = Record<string, unknown>;

function invalid(): never {
  throw new HostMembershipProviderError("Invalid Razorpay response.",
    "outcomeUnknown");
}

function record(value: unknown): Json {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid();
  return value as Json;
}

function secondsToMillis(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    invalid();
  }
  return value * 1000;
}

function notesOf(value: unknown): Record<string, string> {
  // Razorpay returns an empty array for absent notes.
  if (Array.isArray(value) && value.length === 0) return {};
  const raw = record(value);
  const notes: Record<string, string> = {};
  for (const [key, entry] of Object.entries(raw)) {
    if (typeof entry === "string" && entry.length <= 256 && key.length <= 64) {
      notes[key] = entry;
    }
  }
  return notes;
}

export function parseSubscription(body: unknown):
  ProviderSubscriptionSnapshot {
  const raw = record(body);
  if (raw.entity !== "subscription" ||
      !subscriptionStatuses.includes(
        raw.status as ProviderSubscriptionStatus)) {
    invalid();
  }
  const paidCount = raw.paid_count ?? 0;
  if (typeof paidCount !== "number" || !Number.isSafeInteger(paidCount) ||
      paidCount < 0) invalid();
  return {
    id: wrapId(raw.id, "sub_"),
    status: raw.status as ProviderSubscriptionStatus,
    planId: wrapId(raw.plan_id, "plan_"),
    currentStartMillis: secondsToMillis(raw.current_start),
    currentEndMillis: secondsToMillis(raw.current_end),
    startAtMillis: secondsToMillis(raw.start_at),
    endedAtMillis: secondsToMillis(raw.ended_at),
    paidCount,
    notes: notesOf(raw.notes ?? {}),
  };
}

function parseCharge(body: unknown): ProviderCharge {
  const raw = record(body);
  if (raw.entity !== "payment" || typeof raw.amount !== "number" ||
      !Number.isSafeInteger(raw.amount) || raw.amount < 0 ||
      raw.currency !== "INR") invalid();
  return {id: wrapId(raw.id, "pay_"), amount: raw.amount,
    status: raw.status === "captured" ? "captured" :
      raw.status === "failed" ? "failed" : "other"};
}

function wrapId(value: unknown, prefix: string): string {
  try {
    return providerId(value, prefix);
  } catch {
    invalid();
  }
}

function transferItems(body: Json): Json[] {
  if (body.entity !== "collection" || !Array.isArray(body.items) ||
      body.items.length > 50) invalid();
  return body.items.map(record);
}

/** Thin access to the shared hardened Razorpay transport. */
class SubscriptionTransport extends RazorpayPaymentProvider {
  call(handle: string, path: string, method: "GET" | "POST",
    body?: Record<string, unknown>): Promise<Json> {
    return this.api(handle, path, method, body);
  }
}

/**
 * Razorpay Subscriptions on the Catch platform account, with Route transfers
 * of each captured charge to the host linked account. Requests reuse the
 * hardened transport (timeout, body cap, no error-body echo).
 */
export class RazorpaySubscriptionProvider
implements HostMembershipBillingProvider {
  readonly provider = "razorpay" as const;
  private readonly transport: SubscriptionTransport;
  private readonly keyId: string;
  private readonly webhookSecret: string;

  constructor(input: {keyId: string; keySecret: string; webhookSecret: string;
    mode: "test" | "live"}, fetchImpl: typeof fetch = fetch) {
    if (!new RegExp(`^rzp_${input.mode}_[A-Za-z0-9]+$`, "u")
      .test(input.keyId)) {
      throw new HostMembershipProviderError("Invalid Razorpay key.",
        "requestNotSent");
    }
    assertToken(input.keySecret);
    assertToken(input.webhookSecret);
    const {keyId, keySecret} = input;
    this.keyId = keyId;
    this.webhookSecret = input.webhookSecret;
    this.transport = new SubscriptionTransport({signatureSecret: keySecret,
      authorization: (handle) => {
        if (handle !== keyId) {
          throw new HostMembershipProviderError("Invalid Razorpay key.",
            "requestNotSent");
        }
        return "Basic " +
          Buffer.from(`${keyId}:${keySecret}`).toString("base64");
      }}, fetchImpl);
  }

  private async call(path: string, method: "GET" | "POST",
    body?: Record<string, unknown>): Promise<Json> {
    try {
      return await this.transport.call(this.keyId, path, method, body);
    } catch (error) {
      if (error instanceof FormPaymentProviderError) {
        throw new HostMembershipProviderError(error.message,
          error.disposition);
      }
      throw error;
    }
  }

  async createPrice(input: Parameters<
    HostMembershipBillingProvider["createPrice"]>[0]):
    Promise<{providerPriceId: string}> {
    const body = record(await this.call("/v1/plans", "POST", {
      period: input.interval === "annual" ? "yearly" : "monthly",
      interval: 1,
      item: {name: input.name.slice(0, 60), amount: input.amountPaise,
        currency: "INR"},
      notes: {catchProject: input.catchProject, catchPlanId: input.catchPlanId,
        organizerId: input.organizerId, interval: input.interval,
        priceRevision: String(input.revision)},
    }));
    const item = record(body.item);
    if (body.entity !== "plan" || item.amount !== input.amountPaise ||
        item.currency !== "INR") invalid();
    return {providerPriceId: wrapId(body.id, "plan_")};
  }

  async createSubscription(input: Parameters<
    HostMembershipBillingProvider["createSubscription"]>[0]) {
    providerId(input.providerPriceId, "plan_");
    const startAt = input.startAtMillis === null ? {} :
      {start_at: Math.floor(input.startAtMillis / 1000)};
    const body = await this.call("/v1/subscriptions", "POST", {
      plan_id: input.providerPriceId,
      total_count: subscriptionTotalCounts[input.interval],
      quantity: 1,
      customer_notify: 1,
      ...startAt,
      notes: input.notes,
    });
    const snapshot = parseSubscription(body);
    const url = body.short_url;
    if (snapshot.planId !== input.providerPriceId ||
        typeof url !== "string" || url.length > 500 ||
        !url.startsWith("https://")) invalid();
    return {providerSubscriptionId: snapshot.id, authorizationUrl: url,
      snapshot};
  }

  async fetchSubscription(id: string): Promise<ProviderSubscriptionSnapshot> {
    providerId(id, "sub_");
    const snapshot = parseSubscription(
      await this.call(`/v1/subscriptions/${id}`, "GET"));
    if (snapshot.id !== id) invalid();
    return snapshot;
  }

  private async act(id: string, action: string, body: Json):
    Promise<ProviderSubscriptionSnapshot> {
    providerId(id, "sub_");
    const snapshot = parseSubscription(
      await this.call(`/v1/subscriptions/${id}/${action}`, "POST", body));
    if (snapshot.id !== id) invalid();
    return snapshot;
  }

  pause(id: string) {
    return this.act(id, "pause", {pause_at: "now"});
  }

  resume(id: string) {
    return this.act(id, "resume", {resume_at: "now"});
  }

  cancelAtPeriodEnd(id: string) {
    return this.act(id, "cancel", {cancel_at_cycle_end: 1});
  }

  cancelImmediately(id: string) {
    return this.act(id, "cancel", {cancel_at_cycle_end: 0});
  }

  async splitCharge(input: Parameters<
    HostMembershipBillingProvider["splitCharge"]>[0]):
    Promise<{transferId: string}> {
    providerId(input.paymentId, "pay_");
    providerId(input.destinationAccountId, "acc_");
    if (!Number.isSafeInteger(input.amountPaise) || input.amountPaise < 100) {
      throw new HostMembershipProviderError("Invalid transfer amount.",
        "requestNotSent");
    }
    const body = await this.call(`/v1/payments/${input.paymentId}/transfers`,
      "POST", {transfers: [{account: input.destinationAccountId,
        amount: input.amountPaise, currency: "INR", on_hold: 0,
        notes: {catchMembershipChargeId: input.chargeId}}]});
    const items = transferItems(body);
    const match = items.find((item) =>
      item.recipient === input.destinationAccountId &&
      item.amount === input.amountPaise);
    if (!match) invalid();
    return {transferId: wrapId(match.id, "trf_")};
  }

  async findChargeTransfer(input: Parameters<
    HostMembershipBillingProvider["findChargeTransfer"]>[0]):
    Promise<{transferId: string} | null> {
    providerId(input.paymentId, "pay_");
    const items = transferItems(await this.call(
      `/v1/payments/${input.paymentId}/transfers`, "GET"));
    const match = items.find((item) =>
      item.recipient === input.destinationAccountId);
    return match ? {transferId: wrapId(match.id, "trf_")} : null;
  }

  verifyWebhook(rawBody: Buffer, signature: string): boolean {
    return verifyRazorpayWebhookSignature(rawBody, signature,
      this.webhookSecret);
  }

  parseWebhook(rawBody: Buffer, providerEventId: string | null):
    ProviderSubscriptionEvent | null {
    let raw: Json;
    try {
      raw = record(JSON.parse(rawBody.toString("utf8")));
    } catch {
      return null;
    }
    if (raw.entity !== "event" || typeof raw.event !== "string" ||
        typeof raw.account_id !== "string" || raw.event.length > 80) {
      return null;
    }
    const createdAtMillis = secondsToMillis(raw.created_at);
    if (createdAtMillis === null) return null;
    const payload = raw.payload && typeof raw.payload === "object" ?
      raw.payload as Json : {};
    const entity = (key: string): unknown => {
      const wrapper = payload[key];
      return wrapper && typeof wrapper === "object" ?
        (wrapper as Json).entity : undefined;
    };
    try {
      const subscription = entity("subscription");
      const payment = entity("payment");
      return {
        providerEventId,
        type: raw.event,
        accountId: raw.account_id,
        createdAtMillis,
        subscription: subscription === undefined ? null :
          parseSubscription(subscription),
        payment: payment === undefined ? null : parseCharge(payment),
      };
    } catch {
      return null;
    }
  }
}
