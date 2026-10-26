/**
 * Per-user rate limiting for callable Cloud Functions.
 *
 * Uses Firestore transactions to atomically read-and-increment a counter
 * for each (uid, action, timeWindow) tuple. If the counter exceeds the
 * caller's limit for that action, the request is rejected with a
 * `resource-exhausted` HttpsError.
 *
 * Each callable declares its own limit where it calls `checkRateLimit`.
 * Keep per-action limits out of this module: nearly every Function imports
 * it, so editing it here would redeploy them all.
 *
 * ## Usage
 *
 * ```ts
 * import {checkRateLimit} from "../shared/rateLimit";
 *
 * // Inside a callable handler:
 * await checkRateLimit(
 *   admin.firestore(),
 *   request.auth!.uid,
 *   "createOrganizer",
 *   {maxRequests: 5, windowMs: 60 * 60 * 1000}  // 5 per hour
 * );
 * ```
 *
 * ## Data model
 *
 * Rate-limit counters are stored in `rateLimits/{key}` where `key` is
 * `${uid}_${action}_${windowKey}`. Documents auto-expire via TTL
 * (`expiresAt` field) so they don't accumulate. You must create a
 * Firestore TTL policy on the `expiresAt` field in the `rateLimits`
 * collection (Firebase Console → Firestore → TTL Policies).
 *
 * ## Trade-offs
 *
 * - **Transaction-based:** Each rate-limited request incurs one Firestore
 *   transaction read + write (~10-20ms). This is fast enough for callable
 *   functions but adds latency proportional to Firestore load.
 * - **Window alignment:** The `windowKey` is `Math.floor(now / windowMs)`,
 *   so a 1-minute window starts at wall-clock minute boundaries (e.g.,
 *   12:34:00–12:34:59). This is simpler than a sliding window and avoids
 *   the need for per-second precision.
 * - **Not a hard guarantee:** Firestore transactions can retry under
 *   contention. At extremely high throughput (>200 req/s for a single
 *   user), counters may slightly exceed limits. For a dating app, this is
 *   acceptable — the goal is abuse prevention, not billing precision.
 */

import {HttpsError} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

// ── Types ──────────────────────────────────────────────────────────────────

export interface RateLimitConfig {
  /** Maximum allowed requests in the window. */
  maxRequests: number;
  /** Window duration in milliseconds. */
  windowMs: number;
}

// ── Frozen legacy limits ───────────────────────────────────────────────────

/**
 * Limits for callers whose own module cannot be edited yet. Frozen: rows may
 * only be removed, never added (audit:fn-rate-limits enforces this).
 */
const LEGACY_RATE_LIMITS = {
  // Remove once the cat106 claim releases organizerCampaignDispatcher.ts and
  // its call passes this limit itself.
  dispatchOrganizerCampaign: {maxRequests: 3, windowMs: 60 * 60 * 1000},
} as const satisfies Record<string, RateLimitConfig>;

type LegacyRateLimitAction = keyof typeof LEGACY_RATE_LIMITS;

// ── Implementation ─────────────────────────────────────────────────────────

/**
 * Checks whether [uid] has exceeded [limit] for [action].
 *
 * Reads and increments a counter inside a Firestore transaction, which
 * guarantees atomicity — two concurrent requests for the same user/action
 * cannot both pass the limit.
 *
 * @param {FirebaseFirestore.Firestore} db Firestore instance.
 * @param {string} uid Authenticated user ID.
 * @param {string} action Action name, the counter key.
 * @param {RateLimitConfig} limit The caller's own limit for [action].
 * @throws {HttpsError} `resource-exhausted` when limit exceeded.
 */
export function checkRateLimit(
  db: FirebaseFirestore.Firestore,
  uid: string,
  action: string,
  limit: RateLimitConfig
): Promise<void>;
/**
 * Legacy form for the frozen LEGACY_RATE_LIMITS actions only.
 * @deprecated Pass the action's own limit.
 */
export function checkRateLimit(
  db: FirebaseFirestore.Firestore,
  uid: string,
  action: LegacyRateLimitAction
): Promise<void>;
/**
 * Implementation shared by both forms.
 * @param {FirebaseFirestore.Firestore} db Firestore instance.
 * @param {string} uid Authenticated user ID.
 * @param {string} action Action name, the counter key.
 * @param {RateLimitConfig=} ownLimit The caller's limit, absent only for a
 *     legacy action.
 */
export async function checkRateLimit(
  db: FirebaseFirestore.Firestore,
  uid: string,
  action: string,
  ownLimit?: RateLimitConfig
): Promise<void> {
  const limit: RateLimitConfig | undefined = ownLimit ??
    (LEGACY_RATE_LIMITS as Record<string, RateLimitConfig>)[action];
  if (limit === undefined) {
    throw new Error(`checkRateLimit: ${action} needs its own limit.`);
  }
  const windowKey = Math.floor(Date.now() / limit.windowMs);
  const docId = `${uid}_${action}_${windowKey}`;

  const docRef = db.collection("rateLimits").doc(docId);

  const allowed = await db.runTransaction(async (tx) => {
    const doc = await tx.get(docRef);
    const currentCount: number = doc.exists ? (doc.data()?.count ?? 0) : 0;

    if (currentCount >= limit.maxRequests) {
      return false;
    }

    tx.set(docRef, {
      count: currentCount + 1,
      uid,
      action,
      windowKey,
      expiresAt: admin.firestore.Timestamp.fromMillis(
        Date.now() + limit.windowMs
      ),
    }, {merge: true});

    return true;
  });

  if (!allowed) {
    const windowSeconds = Math.round(limit.windowMs / 1000);
    throw new HttpsError(
      "resource-exhausted",
      `Rate limit exceeded for ${action}. ` +
      `Limit: ${limit.maxRequests} per ${windowSeconds}s. ` +
      "Please wait and try again."
    );
  }
}

// ── In-memory rate limiter for unauthenticated endpoints ────────────────────

/**
 * Simple in-memory rate limiter for the public `joinWaitlist` HTTP endpoint.
 *
 * Tracks request counts per IP address in a `Map`. Entries expire after
 * `windowMs`. This is intentionally simple — it does not survive function
 * cold starts (the map resets on each new instance) and does not coordinate
 * across instances. For a low-volume waitlist endpoint, this is sufficient
 * to stop scripted spam.
 */
const ipCounters = new Map<string, {count: number; resetAt: number}>();

/**
 * Checks whether [ip] has exceeded the in-memory rate limit.
 * @param {string} ip Client IP address.
 * @param {number} maxRequests Max requests per window.
 * @param {number} windowMs Window duration in milliseconds.
 * @return {boolean} `true` if the request is allowed.
 */
export function checkIpRateLimit(
  ip: string,
  maxRequests = 3,
  windowMs: number = 60 * 60 * 1000 // 3 per hour
): boolean {
  const now = Date.now();
  const entry = ipCounters.get(ip);

  if (!entry || now > entry.resetAt) {
    ipCounters.set(ip, {count: 1, resetAt: now + windowMs});
    return true;
  }

  if (entry.count >= maxRequests) {
    return false;
  }

  entry.count++;
  return true;
}
