/**
 * A rate limit for small reads, counted in this instance's memory.
 *
 * `checkRateLimit` runs a Firestore transaction before the read: about 25 ms
 * and one write per call. That accuracy earns its cost on writes, on reads that
 * return other people's data or scan a list, and on anything that costs money.
 * A read of a few known documents, such as the caller's own access or one
 * organizer's settings, only needs a ceiling against a runaway client, and this
 * limit gives it one with no database call.
 *
 * Each instance counts on its own, so the true ceiling is `maxRequests` per
 * running instance, and a new instance starts at zero. One client's calls
 * mostly share an instance, because an instance takes up to 80 calls at once.
 * See functions/README.md#rate-limiting for which limit a callable uses.
 */

import {HttpsError} from "firebase-functions/v2/https";
import type {RateLimitConfig} from "./rateLimit";

const windows = new Map<string, {
  windowKey: number;
  counts: Map<string, number>;
}>();

/**
 * Counts one call by [uid] against [limit] for [action].
 *
 * Only the current window's counts are kept for each action, so memory is
 * bounded by the callers seen in one window.
 *
 * @param {string} uid Authenticated user ID.
 * @param {string} action Action name, the counter key.
 * @param {RateLimitConfig} limit The caller's own limit for [action].
 * @param {number} nowMillis The current time.
 * @throws {HttpsError} `resource-exhausted` when limit exceeded.
 */
export function checkInstanceRateLimit(
  uid: string,
  action: string,
  limit: RateLimitConfig,
  nowMillis: number = Date.now()
): void {
  const windowKey = Math.floor(nowMillis / limit.windowMs);
  let window = windows.get(action);
  if (window?.windowKey !== windowKey) {
    window = {windowKey, counts: new Map()};
    windows.set(action, window);
  }
  const count = window.counts.get(uid) ?? 0;
  if (count >= limit.maxRequests) {
    const windowSeconds = Math.round(limit.windowMs / 1000);
    throw new HttpsError(
      "resource-exhausted",
      `Rate limit exceeded for ${action}. ` +
      `Limit: ${limit.maxRequests} per ${windowSeconds}s. ` +
      "Please wait and try again."
    );
  }
  window.counts.set(uid, count + 1);
}
