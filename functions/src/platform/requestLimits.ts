import {createHash} from "node:crypto";
import type {CallableRequest} from "firebase-functions/v2/https";

// Rate-limit keys for the try-it commands' public budgets. They came from the
// retired instant-draft tool (Nov 2026); the `idraft-` prefix stays so the
// live counters carry on under the same ids.

/**
 * A short, salted key for rate limits, so no number or address is stored in
 * a counter id.
 * @param {string} kind What the value is: a phone number or an address.
 * @param {string} value The phone number or network address.
 * @return {string} The counter id.
 */
export function limiterKey(kind: "phone" | "ip", value: string): string {
  const digest = createHash("sha256").update(`${kind}:${value}`)
    .digest("hex").slice(0, 32);
  return `idraft-${kind}-${digest}`;
}

/**
 * The caller's network address, for a hashed rate-limit key only.
 * @param {CallableRequest<unknown>} request The callable request.
 * @return {string} The first forwarded address, the socket address, or
 *   "unknown".
 */
export function clientAddress(request: CallableRequest<unknown>): string {
  const raw = request.rawRequest;
  const forwarded = raw?.headers?.["x-forwarded-for"];
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)
    ?.split(",")[0]?.trim();
  return first || raw?.ip || "unknown";
}
