import {verifyPaymentSignatureWithSecret} from "../razorpay";

export interface FormPaymentOrder {
  id: string;
  amount: number;
  currency: "INR";
  receipt: string;
  status: "created" | "attempted" | "paid";
}

export interface FormProviderPayment {
  id: string;
  orderId: string | null;
  amount: number;
  currency: string;
  status: "created" | "authorized" | "captured" | "refunded" | "failed";
  captured: boolean;
  amountRefunded: number;
  /** Razorpay's fee including tax, and the tax within it; null until known. */
  fee?: number | null;
  tax?: number | null;
}

export interface FormProviderRefund {
  id: string;
  paymentId: string;
  amount: number;
  status: "pending" | "processed" | "failed";
}

export class FormPaymentProviderError extends Error {
  constructor(
    message: string,
    readonly disposition: "requestNotSent" | "rejected" | "outcomeUnknown",
    readonly httpStatus: number | null = null,
  ) {
    super(message);
    this.name = "FormPaymentProviderError";
  }
}

/** Payment transport has no dependency on partner onboarding configuration. */
export class RazorpayPaymentProvider {
  constructor(
    private readonly authority: {authorization: (token: string) => string;
      signatureSecret: string},
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async createOrder(accessToken: string, input: {
    amount: number; receipt: string;
  }): Promise<FormPaymentOrder> {
    assertAmount(input.amount);
    if (!/^[A-Za-z0-9_-]{1,40}$/u.test(input.receipt)) invalidInput();
    const body = await this.api(accessToken, "/v1/orders", "POST", {
      amount: input.amount, currency: "INR", receipt: input.receipt,
      partial_payment: false,
      ...this.orderFields(input.amount),
    });
    const order = parseOrder(body);
    if (order.amount !== input.amount || order.receipt !== input.receipt) {
      invalidResponse();
    }
    return order;
  }

  async fetchOrder(accessToken: string, orderId: string):
    Promise<FormPaymentOrder> {
    providerId(orderId, "order_");
    const order = parseOrder(await this.api(accessToken,
      `/v1/orders/${orderId}`, "GET"));
    if (order.id !== orderId) invalidResponse();
    return order;
  }

  /** Read-only recovery after order creation had an uncertain outcome. */
  async findOrderByReceipt(accessToken: string, receipt: string):
    Promise<FormPaymentOrder | null> {
    if (!/^[A-Za-z0-9_-]{1,40}$/u.test(receipt)) invalidInput();
    const query = new URLSearchParams({receipt, count: "2"});
    const body = await this.api(accessToken, `/v1/orders?${query}`, "GET");
    if (body.entity !== "collection" || !Array.isArray(body.items) ||
        body.count !== body.items.length || body.items.length > 1) {
      invalidResponse();
    }
    if (body.items.length === 0) return null;
    const raw: unknown = body.items[0];
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      invalidResponse();
    }
    const order = parseOrder(raw as Record<string, unknown>);
    if (order.receipt !== receipt) invalidResponse();
    return order;
  }

  async fetchOrderPayments(accessToken: string, orderId: string):
    Promise<FormProviderPayment[]> {
    providerId(orderId, "order_");
    const body = await this.api(accessToken,
      `/v1/orders/${orderId}/payments`, "GET");
    if (body.entity !== "collection" || !Array.isArray(body.items) ||
        body.count !== body.items.length || body.items.length > 100) {
      invalidResponse();
    }
    return body.items.map((raw: unknown) => {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        invalidResponse();
      }
      const payment = parsePayment(raw as Record<string, unknown>);
      if (payment.orderId !== orderId) invalidResponse();
      return payment;
    });
  }

  async fetchPayment(accessToken: string, paymentId: string):
    Promise<FormProviderPayment> {
    providerId(paymentId, "pay_");
    const payment = parsePayment(await this.api(accessToken,
      `/v1/payments/${paymentId}`, "GET"));
    if (payment.id !== paymentId) invalidResponse();
    return payment;
  }

  async capturePayment(accessToken: string, paymentId: string,
    amount: number): Promise<FormProviderPayment> {
    providerId(paymentId, "pay_");
    assertAmount(amount);
    const payment = parsePayment(await this.api(accessToken,
      `/v1/payments/${paymentId}/capture`, "POST", {
        amount, currency: "INR",
      }));
    if (payment.id !== paymentId || payment.amount !== amount) {
      invalidResponse();
    }
    return payment;
  }

  /** Reuses the persisted key and amount after uncertain outcomes. */
  async refundPayment(accessToken: string, input: {
    paymentId: string; amount: number; idempotencyKey: string;
  }): Promise<FormProviderRefund> {
    assertToken(accessToken);
    providerId(input.paymentId, "pay_");
    assertAmount(input.amount);
    if (!/^[A-Za-z0-9_-]{10,100}$/u.test(input.idempotencyKey)) invalidInput();
    const refund = parseRefund(await this.request(
      `https://api.razorpay.com/v1/payments/${input.paymentId}/refund`, {
        method: "POST", headers: {
          "Authorization": this.authority.authorization(accessToken),
          "X-Refund-Idempotency": input.idempotencyKey},
        body: JSON.stringify({amount: input.amount, speed: "normal",
          ...this.refundFields()}),
      }));
    if (refund.paymentId !== input.paymentId ||
        refund.amount !== input.amount) {
      invalidResponse();
    }
    return refund;
  }

  async fetchRefund(accessToken: string, refundId: string):
    Promise<FormProviderRefund> {
    providerId(refundId, "rfnd_");
    const refund = parseRefund(await this.api(accessToken,
      `/v1/refunds/${refundId}`, "GET"));
    if (refund.id !== refundId) invalidResponse();
    return refund;
  }

  verifyCheckout(input: {
    serverOrderId: string; paymentId: string; signature: string;
  }): boolean {
    assertToken(this.authority.signatureSecret);
    return /^order_[A-Za-z0-9]+$/u.test(input.serverOrderId) &&
      /^pay_[A-Za-z0-9]+$/u.test(input.paymentId) &&
      /^[a-fA-F0-9]{64}$/u.test(input.signature) &&
      verifyPaymentSignatureWithSecret({orderId: input.serverOrderId,
        paymentId: input.paymentId, signature: input.signature,
        secret: this.authority.signatureSecret});
  }

  protected orderFields(amount: number): Record<string, unknown> {
    assertAmount(amount);
    return {};
  }

  protected refundFields(): Record<string, unknown> {
    return {};
  }

  protected api(accessToken: string, path: string,
    method: "GET" | "POST" | "PATCH", body?: Record<string, unknown>):
    Promise<Record<string, unknown>> {
    assertToken(accessToken);
    return this.request(`https://api.razorpay.com${path}`, {
      method, headers: {
        Authorization: this.authority.authorization(accessToken)},
      ...(body ? {body: JSON.stringify(body)} : {}),
    });
  }

  protected async request(url: string, init: RequestInit):
    Promise<Record<string, unknown>> {
    let response: Response;
    try {
      response = await this.fetchImpl(url, {...init,
        headers: {"Content-Type": "application/json", ...init.headers},
        redirect: "error", signal: AbortSignal.timeout(15_000),
      });
    } catch {
      throw new FormPaymentProviderError(
        "Razorpay request outcome is unknown.", "outcomeUnknown");
    }
    // Never include provider error bodies (which may echo credentials or PII).
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      throw new FormPaymentProviderError("Razorpay request failed.",
        response.status >= 500 ? "outcomeUnknown" : "rejected",
        response.status);
    }
    try {
      const reader = response.body?.getReader();
      if (!reader) invalidResponse();
      const chunks: Uint8Array[] = [];
      let size = 0;
      try {
        for (;;) {
          const {done, value} = await reader.read();
          if (done) break;
          size += value.length;
          if (size > 64 * 1024) invalidResponse();
          chunks.push(value);
        }
      } finally {
        await reader.cancel().catch(() => undefined);
        reader.releaseLock();
      }
      const body: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      if (!body || typeof body !== "object" || Array.isArray(body)) {
        invalidResponse();
      }
      return body as Record<string, unknown>;
    } catch {
      invalidResponse();
    }
  }
}

/** A signature or an authorized payment alone never completes a submission. */
export function isCapturedFormPayment(payment: FormProviderPayment,
  expected: {orderId: string; amount: number}): boolean {
  return payment.orderId === expected.orderId &&
    payment.amount === expected.amount && payment.currency === "INR" &&
    payment.status === "captured" && payment.captured &&
    payment.amountRefunded === 0;
}

function parseOrder(body: Record<string, unknown>): FormPaymentOrder {
  if (body.entity !== "order" || body.currency !== "INR" ||
      !["created", "attempted", "paid"].includes(String(body.status)) ||
      typeof body.receipt !== "string" || body.receipt.length > 40 ||
      typeof body.amount !== "number" || !Number.isSafeInteger(body.amount) ||
      body.amount < 100) invalidResponse();
  return {id: providerId(body.id, "order_"), amount: body.amount,
    currency: "INR", receipt: body.receipt,
    status: body.status as FormPaymentOrder["status"]};
}

function parsePayment(body: Record<string, unknown>): FormProviderPayment {
  if (body.entity !== "payment" || typeof body.amount !== "number" ||
      !Number.isSafeInteger(body.amount) || body.amount < 0 ||
      typeof body.currency !== "string" ||
      !["created", "authorized", "captured", "refunded", "failed"]
        .includes(String(body.status)) || typeof body.captured !== "boolean" ||
      typeof body.amount_refunded !== "number" ||
      !Number.isSafeInteger(body.amount_refunded) || body.amount_refunded < 0 ||
      body.amount_refunded > body.amount) invalidResponse();
  return {id: providerId(body.id, "pay_"),
    orderId: body.order_id === null ? null : providerId(body.order_id,
      "order_"),
    amount: body.amount,
    currency: body.currency,
    status: body.status as FormProviderPayment["status"],
    captured: body.captured, amountRefunded: body.amount_refunded,
    fee: minorUnits(body.fee), tax: minorUnits(body.tax)};
}

function minorUnits(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) &&
    value >= 0 && value <= 100_000_000 ? value : null;
}

/**
 * The provider fees to store on a captured payment, once Razorpay reports
 * them and the record has none yet.
 * @param {FormProviderPayment} payment Observed provider payment.
 * @param {unknown} stored The record's current providerFees.
 * @return {object} A providerFees update, or nothing.
 */
export function providerFeesUpdate(payment: FormProviderPayment,
  stored: unknown): {providerFees?: {feePaise: number; taxPaise: number}} {
  if (stored || !payment.captured || payment.fee == null) return {};
  return {providerFees: {feePaise: payment.fee, taxPaise: payment.tax ?? 0}};
}

function parseRefund(body: Record<string, unknown>): FormProviderRefund {
  if (body.entity !== "refund" || body.currency !== "INR" ||
      typeof body.amount !== "number" || !Number.isSafeInteger(body.amount) ||
      body.amount < 100 ||
      !["pending", "processed", "failed"].includes(String(body.status))) {
    invalidResponse();
  }
  return {id: providerId(body.id, "rfnd_"),
    paymentId: providerId(body.payment_id, "pay_"), amount: body.amount,
    status: body.status as FormProviderRefund["status"]};
}

export function providerId(value: unknown, prefix: string): string {
  if (typeof value !== "string" || value.length > 128 ||
      !value.startsWith(prefix) ||
      !/^[A-Za-z0-9]+$/u.test(value.slice(prefix.length))) invalidResponse();
  return value;
}

export function assertAmount(amount: number): void {
  if (!Number.isSafeInteger(amount) || amount < 100 || amount > 100_000_000) {
    invalidInput();
  }
}

export function assertHttps(value: string, maxLength: number): void {
  try {
    const url = new URL(value);
    if (value.length > maxLength || url.protocol !== "https:" ||
        url.username || url.password || url.hash) invalidInput();
  } catch {
    invalidInput();
  }
}

export function assertToken(value: string): void {
  if (!value || value.length > 16_384 || /\s/u.test(value)) invalidInput();
}

export function tokenValue(value: unknown): string {
  if (typeof value !== "string" || !value || value.length > 16_384 ||
      /\s/u.test(value)) invalidResponse();
  return value;
}

export function invalidInput(): never {
  throw new FormPaymentProviderError("Invalid Razorpay request.",
    "requestNotSent");
}

export function invalidResponse(): never {
  throw new FormPaymentProviderError("Invalid Razorpay response.",
    "outcomeUnknown");
}
