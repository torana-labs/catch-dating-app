import {assertTransactionalEmail} from "./emailProvider";
import type {EmailSubmission, TransactionalEmail,
  TransactionalEmailProvider} from "./emailProvider";

/**
 * Resend is a transport adapter, not a workflow or contact repository.
 * No SDK/global client, implicit retry, subscription or account provisioning.
 * The composition root injects a pinned server credential after authorization.
 */
export class ResendEmailProvider implements TransactionalEmailProvider {
  readonly id = "resend";
  constructor(private readonly apiKey: string,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly now: () => number = Date.now) {
    if (!/^re_[A-Za-z0-9_-]{8,200}$/u.test(apiKey)) {
      throw new Error("Email sender credential unavailable");
    }
  }

  async submit(message: TransactionalEmail): Promise<EmailSubmission> {
    assertTransactionalEmail(message);
    const now = this.now();
    if (!Number.isSafeInteger(now) || now >= message.deadlineMillis) {
      return {kind: "withheld", reason: "deadlineExpired"};
    }
    try {
      const response = await this.fetchImpl("https://api.resend.com/emails", {
        method: "POST", redirect: "error",
        headers: {"Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": message.idempotencyKey},
        body: JSON.stringify({from: message.from,
          to: typeof message.to === "string" ? [message.to] : message.to,
          subject: message.subject, text: message.text,
          ...(message.html ? {html: message.html} : {})}),
        signal: AbortSignal.timeout(Math.min(10_000,
          message.deadlineMillis - now)),
      });
      const body = await boundedJson(response);
      if (response.ok && typeof body?.id === "string" &&
          /^[A-Za-z0-9_-]{1,128}$/u.test(body.id)) {
        return {kind: "accepted", providerMessageId: body.id};
      }
      if (response.status === 429) {
        const quota = body?.name === "daily_quota_exceeded" ||
          body?.name === "monthly_quota_exceeded";
        const seconds = Number(response.headers.get("retry-after"));
        return {kind: "deferred", reason: quota ?
          "quotaExceeded" : "rateLimited", retryAfterMillis:
          Number.isFinite(seconds) && seconds > 0 ?
            Math.min(86_400_000, Math.max(1000, seconds * 1000)) :
            quota ? 3_600_000 : 60_000};
      }
      if ([401, 403].includes(response.status)) {
        return {kind: "rejected", reason: "senderUnavailable"};
      }
      if ([400, 422].includes(response.status)) {
        return {kind: "rejected", reason: "invalidRequest"};
      }
      return {kind: "unknown"};
    } catch {
      // Never expose provider bodies/headers: they may contain recipient data.
      return {kind: "unknown"};
    }
  }
}

async function boundedJson(response: Response):
  Promise<Record<string, unknown> | null> {
  const reader = response.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    for (;;) {
      const {done, value} = await reader.read();
      if (done) break;
      bytes += value.length;
      if (bytes > 8192) return null;
      chunks.push(value);
    }
    const result = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    return result && typeof result === "object" && !Array.isArray(result) ?
      result : null;
  } catch {
    return null;
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
