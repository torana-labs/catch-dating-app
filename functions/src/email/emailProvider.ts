/** Provider-neutral email port. Workflows own consent, budgets and retries. */
export interface TransactionalEmail {
  from: string;
  /** One address, or up to five that share one message (staff alerts). */
  to: string | readonly string[];
  subject: string;
  text: string;
  html?: string;
  /** Stable for exactly one immutable message, never regenerated on retry. */
  idempotencyKey: string;
  deadlineMillis: number;
}

export type EmailSubmission =
  | {kind: "accepted"; providerMessageId: string}
  | {kind: "deferred"; reason: "rateLimited" | "quotaExceeded";
      retryAfterMillis: number}
  | {kind: "rejected"; reason: "invalidRequest" | "senderUnavailable"}
  | {kind: "withheld"; reason: "deadlineExpired"}
  /** No resend/fallback is authorized by a missing or ambiguous response. */
  | {kind: "unknown"};

export interface TransactionalEmailProvider {
  readonly id: string;
  submit(message: TransactionalEmail): Promise<EmailSubmission>;
}

export function assertTransactionalEmail(message: TransactionalEmail): void {
  const address = /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/u;
  const to = typeof message.to === "string" ? [message.to] : message.to;
  if (!Array.isArray(to) || to.length < 1 || to.length > 5 ||
      new Set(to).size !== to.length ||
      ![message.from, ...to].every((v) =>
        typeof v === "string" && v.length <= 254 && address.test(v)) ||
      typeof message.subject !== "string" || !message.subject.trim() ||
      message.subject.length > 200 || /[\r\n]/u.test(message.subject) ||
      typeof message.text !== "string" || !message.text.trim() ||
      message.text.length > 50_000 ||
      message.html !== undefined && (typeof message.html !== "string" ||
        message.html.length > 100_000) ||
      !/^[A-Za-z0-9_-]{8,160}$/u.test(message.idempotencyKey) ||
      !Number.isSafeInteger(message.deadlineMillis)) {
    throw new Error("Invalid transactional email");
  }
}
