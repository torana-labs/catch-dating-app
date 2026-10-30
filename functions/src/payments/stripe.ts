import * as crypto from "crypto";
import {HttpsError} from "firebase-functions/v2/https";
import {defineSecret} from "firebase-functions/params";
import {brandWebUrl} from "../shared/generated/brand";

export const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");
export const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");

const defaultStripeConnectUrl = brandWebUrl("/you");
const defaultStripeCheckoutSuccessUrl =
  brandWebUrl("/payment-confirmation") +
  "?session_id={CHECKOUT_SESSION_ID}";
const defaultStripeCheckoutCancelUrl =
  brandWebUrl("/payment-history");

const stripeApiVersion = "2026-02-25.clover";
const stripeApiBaseUrl = "https://api.stripe.com";

export interface StripeRequirementSnapshot {
  currentlyDue: string[];
  pastDue: string[];
  pendingVerification: string[];
  disabledReason: string | null;
}

export interface StripeAccountSnapshot {
  id: string;
  country: string;
  defaultCurrency: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  requirements: StripeRequirementSnapshot;
}

export interface StripeAccountCreateInput {
  contactEmail: string;
  displayName: string;
  country: string;
  defaultCurrency: string;
}

export interface StripeAccountLinkInput {
  accountId: string;
  returnUrl: string;
  refreshUrl: string;
}

export interface StripeAccountLinkSnapshot {
  url: string;
}

export interface StripeCheckoutSessionCreateInput {
  paymentId: string;
  eventId: string;
  clubId: string;
  organizerId?: string;
  userId: string;
  hostUserId: string;
  stripeAccountId: string;
  eventTitle: string;
  amountMinor: number;
  currency: string;
  inviteVerified: boolean;
  inviteLinkId?: string | null;
  inviteSource?: string | null;
  crossPathsPairHoldId?: string | null;
  applicationFeeAmount: number;
  successUrl: string;
  cancelUrl: string;
}

export interface StripeCheckoutSessionSnapshot {
  id: string;
  url: string | null;
  paymentStatus: string;
  amountTotal: number | null;
  currency: string | null;
  paymentIntentId: string | null;
  metadata: Record<string, string>;
}

export interface StripeClient {
  createConnectedAccount(
    input: StripeAccountCreateInput
  ): Promise<StripeAccountSnapshot>;
  retrieveConnectedAccount(
    accountId: string
  ): Promise<StripeAccountSnapshot>;
  createAccountLink(
    input: StripeAccountLinkInput
  ): Promise<StripeAccountLinkSnapshot>;
  createCheckoutSession(
    input: StripeCheckoutSessionCreateInput
  ): Promise<StripeCheckoutSessionSnapshot>;
  retrieveCheckoutSession(
    sessionId: string
  ): Promise<StripeCheckoutSessionSnapshot>;
  createRefund(input: {
    paymentIntentId: string;
    amountMinor: number;
  }): Promise<void>;
}

export function createStripeClient(): StripeClient {
  return new StripeRestClient(stripeSecretKey.value());
}

export function stripeConnectRefreshUrlValue(): string {
  return stringParamOrDefault(
    process.env.STRIPE_CONNECT_REFRESH_URL,
    defaultStripeConnectUrl
  );
}

export function stripeConnectReturnUrlValue(): string {
  return stringParamOrDefault(
    process.env.STRIPE_CONNECT_RETURN_URL,
    defaultStripeConnectUrl
  );
}

export function stripeCheckoutSuccessUrlValue(): string {
  return stringParamOrDefault(
    process.env.STRIPE_CHECKOUT_SUCCESS_URL,
    defaultStripeCheckoutSuccessUrl
  );
}

export function stripeCheckoutCancelUrlValue(): string {
  return stringParamOrDefault(
    process.env.STRIPE_CHECKOUT_CANCEL_URL,
    defaultStripeCheckoutCancelUrl
  );
}

export function stripeFeeAmountMinor(amountMinor: number): number {
  const basisPoints = Number(process.env.STRIPE_APPLICATION_FEE_BPS ?? "0");
  if (!Number.isInteger(basisPoints) || basisPoints <= 0) return 0;
  return Math.floor((amountMinor * basisPoints) / 10000);
}

function stringParamOrDefault(
  value: string | undefined,
  fallback: string
): string {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : fallback;
}

export function verifyStripeWebhookSignature({
  payload,
  signatureHeader,
  secret,
  toleranceSeconds = 300,
  nowSeconds = Math.floor(Date.now() / 1000),
}: {
  payload: Buffer | string;
  signatureHeader: string | undefined;
  secret: string;
  toleranceSeconds?: number;
  nowSeconds?: number;
}): boolean {
  if (!signatureHeader) return false;
  const parsed = parseStripeSignatureHeader(signatureHeader);
  if (parsed.timestamp === null || parsed.signatures.length === 0) {
    return false;
  }
  if (Math.abs(nowSeconds - parsed.timestamp) > toleranceSeconds) {
    return false;
  }

  const rawPayload = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);
  const signedPayload = Buffer.concat([
    Buffer.from(`${parsed.timestamp}.`),
    rawPayload,
  ]);
  const expected = crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");

  return parsed.signatures.some((signature) =>
    timingSafeHexEqual(signature, expected)
  );
}

class StripeRestClient implements StripeClient {
  constructor(private readonly secretKey: string) {}

  async createConnectedAccount(
    input: StripeAccountCreateInput
  ): Promise<StripeAccountSnapshot> {
    const body = {
      contact_email: input.contactEmail,
      display_name: input.displayName,
      dashboard: "full",
      identity: {
        country: input.country.toLowerCase(),
      },
      configuration: {
        merchant: {
          capabilities: {
            card_payments: {requested: true},
          },
        },
      },
      defaults: {
        currency: input.defaultCurrency.toLowerCase(),
        responsibilities: {
          fees_collector: "stripe",
          losses_collector: "stripe",
        },
      },
      include: [
        "configuration.merchant",
        "identity",
        "requirements",
      ],
    };
    return normalizeStripeAccount(
      await this.requestJson("POST", "/v2/core/accounts", body)
    );
  }

  async retrieveConnectedAccount(
    accountId: string
  ): Promise<StripeAccountSnapshot> {
    const params = new URLSearchParams();
    params.append("include[]", "configuration.merchant");
    params.append("include[]", "identity");
    params.append("include[]", "requirements");
    return normalizeStripeAccount(
      await this.requestJson(
        "GET",
        `/v2/core/accounts/${encodeURIComponent(accountId)}?${params}`
      )
    );
  }

  async createAccountLink(
    input: StripeAccountLinkInput
  ): Promise<StripeAccountLinkSnapshot> {
    const body = {
      account: input.accountId,
      use_case: {
        type: "account_onboarding",
        account_onboarding: {
          collection_options: {fields: "eventually_due"},
          configurations: ["merchant"],
          return_url: input.returnUrl,
          refresh_url: input.refreshUrl,
        },
      },
    };
    const response = await this.requestJson(
      "POST",
      "/v2/core/account_links",
      body
    ) as Record<string, unknown>;
    const url = response.url;
    if (typeof url !== "string" || url.length === 0) {
      throw new HttpsError(
        "internal",
        "Stripe did not return an onboarding URL."
      );
    }
    return {url};
  }

  async createCheckoutSession(
    input: StripeCheckoutSessionCreateInput
  ): Promise<StripeCheckoutSessionSnapshot> {
    const body = new URLSearchParams();
    body.append("mode", "payment");
    body.append("client_reference_id", input.paymentId);
    body.append("success_url", input.successUrl);
    body.append("cancel_url", input.cancelUrl);
    body.append("line_items[0][quantity]", "1");
    body.append(
      "line_items[0][price_data][currency]",
      input.currency.toLowerCase()
    );
    body.append(
      "line_items[0][price_data][unit_amount]",
      String(input.amountMinor)
    );
    body.append(
      "line_items[0][price_data][product_data][name]",
      input.eventTitle
    );
    body.append(
      "payment_intent_data[transfer_data][destination]",
      input.stripeAccountId
    );
    body.append(
      "payment_intent_data[on_behalf_of]",
      input.stripeAccountId
    );
    if (input.applicationFeeAmount > 0) {
      body.append(
        "payment_intent_data[application_fee_amount]",
        String(input.applicationFeeAmount)
      );
    }
    for (const [key, value] of Object.entries(stripeMetadata(input))) {
      body.append(`metadata[${key}]`, value);
      body.append(`payment_intent_data[metadata][${key}]`, value);
    }

    return normalizeStripeCheckoutSession(
      await this.requestForm("POST", "/v1/checkout/sessions", body)
    );
  }

  async retrieveCheckoutSession(
    sessionId: string
  ): Promise<StripeCheckoutSessionSnapshot> {
    return normalizeStripeCheckoutSession(
      await this.requestJson(
        "GET",
        `/v1/checkout/sessions/${encodeURIComponent(sessionId)}`
      )
    );
  }

  async createRefund(input: {
    paymentIntentId: string;
    amountMinor: number;
  }): Promise<void> {
    const body = new URLSearchParams();
    body.append("payment_intent", input.paymentIntentId);
    body.append("amount", String(input.amountMinor));
    await this.requestForm("POST", "/v1/refunds", body);
  }

  private async requestJson(
    method: "GET" | "POST",
    path: string,
    body?: Record<string, unknown>
  ): Promise<unknown> {
    const response = await fetch(`${stripeApiBaseUrl}${path}`, {
      method,
      headers: {
        "Authorization": `Bearer ${this.secretKey}`,
        "Content-Type": "application/json",
        "Stripe-Version": stripeApiVersion,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return parseStripeResponse(response);
  }

  private async requestForm(
    method: "POST",
    path: string,
    body: URLSearchParams
  ): Promise<unknown> {
    const response = await fetch(`${stripeApiBaseUrl}${path}`, {
      method,
      headers: {
        "Authorization": `Bearer ${this.secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Stripe-Version": stripeApiVersion,
      },
      body,
    });
    return parseStripeResponse(response);
  }
}

async function parseStripeResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  const body = text.length === 0 ? null : JSON.parse(text);
  if (response.ok) return body;

  const message = stripeErrorMessage(body) ?? "Stripe request failed.";
  throw new HttpsError("failed-precondition", message);
}

export function normalizeStripeAccount(raw: unknown): StripeAccountSnapshot {
  const object = requireObject(raw, "Stripe account");
  const id = requireString(object.id, "Stripe account id");
  const requirements = normalizeStripeRequirements(object.requirements);
  const country =
    stringOrNull(object.country) ??
    stringOrNull((object.identity as Record<string, unknown> | undefined)
      ?.country) ??
    "US";
  const defaultCurrency =
    stringOrNull(object.default_currency) ??
    stringOrNull((object.defaults as Record<string, unknown> | undefined)
      ?.currency) ??
    "usd";

  return {
    id,
    country: country.toUpperCase(),
    defaultCurrency: defaultCurrency.toUpperCase(),
    chargesEnabled: boolish(object.charges_enabled) ||
      capabilityRequestedOrActive(object, "card_payments"),
    payoutsEnabled: boolish(object.payouts_enabled) ||
      capabilityRequestedOrActive(object, "transfers"),
    detailsSubmitted: boolish(object.details_submitted) ||
      requirements.currentlyDue.length === 0,
    requirements,
  };
}

function normalizeStripeCheckoutSession(
  raw: unknown
): StripeCheckoutSessionSnapshot {
  const object = requireObject(raw, "Stripe Checkout Session");
  return {
    id: requireString(object.id, "Stripe Checkout Session id"),
    url: stringOrNull(object.url),
    paymentStatus: requireString(
      object.payment_status,
      "Stripe Checkout Session payment status"
    ),
    amountTotal: integerOrNull(object.amount_total),
    currency: stringOrNull(object.currency)?.toUpperCase() ?? null,
    paymentIntentId: typeof object.payment_intent === "string" ?
      object.payment_intent :
      stringOrNull(
        (object.payment_intent as Record<string, unknown> | undefined)?.id
      ),
    metadata: normalizeStringRecord(object.metadata),
  };
}

function normalizeStripeRequirements(raw: unknown): StripeRequirementSnapshot {
  const requirements = raw && typeof raw === "object" ?
    raw as Record<string, unknown> :
    {};
  const entries = Array.isArray(requirements.entries) ?
    requirements.entries.filter((entry): entry is Record<string, unknown> =>
      entry !== null && typeof entry === "object"
    ) :
    [];
  return {
    currentlyDue: normalizeStringList(requirements.currently_due)
      .concat(entriesForStatus(entries, "currently_due")),
    pastDue: normalizeStringList(requirements.past_due)
      .concat(entriesForStatus(entries, "past_due")),
    pendingVerification:
      normalizeStringList(requirements.pending_verification)
        .concat(entriesForStatus(entries, "pending_verification")),
    disabledReason: stringOrNull(requirements.disabled_reason),
  };
}

function entriesForStatus(
  entries: Record<string, unknown>[],
  status: string
): string[] {
  return entries
    .filter((entry) => entry.status === status)
    .map((entry) => stringOrNull(entry.field) ?? stringOrNull(entry.id))
    .filter((value): value is string => value !== null);
}

function capabilityRequestedOrActive(
  account: Record<string, unknown>,
  capability: string
): boolean {
  const configuration = account.configuration as
    Record<string, unknown> | undefined;
  const merchant = configuration?.merchant as Record<string, unknown> |
    undefined;
  const capabilities = merchant?.capabilities as Record<string, unknown> |
    undefined;
  const entry = capabilities?.[capability] as Record<string, unknown> |
    undefined;
  return entry?.status === "active" || entry?.requested === true;
}

function stripeMetadata(
  input: StripeCheckoutSessionCreateInput
): Record<string, string> {
  return {
    paymentId: input.paymentId,
    eventId: input.eventId,
    clubId: input.clubId,
    ...(input.organizerId ? {organizerId: input.organizerId} : {}),
    userId: input.userId,
    hostUserId: input.hostUserId,
    stripeAccountId: input.stripeAccountId,
    amountMinor: String(input.amountMinor),
    currency: input.currency.toUpperCase(),
    inviteVerified: input.inviteVerified ? "true" : "false",
    ...(input.inviteLinkId ? {inviteLinkId: input.inviteLinkId} : {}),
    ...(input.inviteSource ? {inviteSource: input.inviteSource} : {}),
    ...(input.crossPathsPairHoldId ?
      {crossPathsPairHoldId: input.crossPathsPairHoldId} : {}),
  };
}

function parseStripeSignatureHeader(header: string): {
  timestamp: number | null;
  signatures: string[];
} {
  let timestamp: number | null = null;
  const signatures: string[] = [];
  for (const part of header.split(",")) {
    const [key, value] = part.split("=", 2);
    if (key === "t") {
      const parsed = Number(value);
      timestamp = Number.isInteger(parsed) ? parsed : null;
    }
    if (key === "v1" && /^[a-f0-9]+$/i.test(value)) {
      signatures.push(value);
    }
  }
  return {timestamp, signatures};
}

function timingSafeHexEqual(actualHex: string, expectedHex: string): boolean {
  if (!/^[a-f0-9]+$/i.test(actualHex)) return false;
  const actual = Buffer.from(actualHex, "hex");
  const expected = Buffer.from(expectedHex, "hex");
  return actual.length === expected.length &&
    crypto.timingSafeEqual(actual, expected);
}

function requireObject(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object") {
    throw new HttpsError("internal", `${label} response was malformed.`);
  }
  return value as Record<string, unknown>;
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new HttpsError("internal", `${label} response was malformed.`);
  }
  return value;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function integerOrNull(value: unknown): number | null {
  return Number.isInteger(value) ? value as number : null;
}

function boolish(value: unknown): boolean {
  return value === true;
}

function normalizeStringList(value: unknown): string[] {
  return Array.isArray(value) ?
    value.filter((item): item is string => typeof item === "string") :
    [];
}

function normalizeStringRecord(value: unknown): Record<string, string> {
  if (value === null || typeof value !== "object") return {};
  const entries = Object.entries(value as Record<string, unknown>)
    .filter((entry): entry is [string, string] =>
      typeof entry[1] === "string"
    );
  return Object.fromEntries(entries);
}

function stripeErrorMessage(body: unknown): string | null {
  if (body === null || typeof body !== "object") return null;
  const error = (body as Record<string, unknown>).error;
  if (error === null || typeof error !== "object") return null;
  const message = (error as Record<string, unknown>).message;
  return typeof message === "string" && message.length > 0 ? message : null;
}
