import {organizerTrackingEventPolicyReason, organizerTrackingPublicationPolicy,
  type OrganizerTrackingPublicationPolicy} from
  "./organizerTrackingPublicationPolicy";

/**
 * How an organiser profile is classified for Catch's own tags (owner
 * decision, 19 Nov 2026, #2063). Classification lives on events, so the
 * profile takes it from the organiser's published, active events:
 *
 * - `sensitive` when a published, active native event is in an excluded class
 *   of the current publication policy version, or a captured upcoming
 *   external listing mentions a blocked word;
 * - `unknown` when the read was truncated, a native event has no canonical
 *   classification, any captured upcoming external listing carries a supply
 *   intake label outside the policy's allowance (`openActivity` included), or
 *   there is nothing to classify by (no native event and no upcoming
 *   listing); and, while the policy says so, whenever any public external
 *   listing exists;
 * - `eligible` otherwise.
 *
 * Only `eligible` lets Catch's tags run on the profile. Callers expose a
 * yes/no answer, never which of the other two applies, because public pages
 * deliberately do not reveal dating classification (CAT-247).
 */
export type OrganizerProfileClassification = "eligible" | "sensitive" |
  "unknown";

/** The most events read per collection; more than this fails closed. */
export const organizerProfileClassificationReadLimit = 200;

export interface OrganizerProfileEvents {
  /** The organiser's native events (`events` where `organizerId` matches). */
  native: readonly Record<string, unknown>[];
  /** Its external listings (`externalEvents` by `canonicalHostId`). */
  external: readonly Record<string, unknown>[];
  /** Whether either read hit the limit. */
  truncated: boolean;
}

const publishedNative = (event: Record<string, unknown>) =>
  event.publicationState === "published" && event.status === "active";
const publicExternal = (event: Record<string, unknown>) =>
  event.publicationStatus === "public" && event.status === "active";

/** Epoch milliseconds of a stored timestamp, or NaN. */
function millis(value: unknown): number {
  if (typeof value === "number") return value;
  if (value instanceof Date) return value.getTime();
  const stamp = value as {toMillis?: () => number; seconds?: number} | null;
  if (stamp && typeof stamp.toMillis === "function") return stamp.toMillis();
  if (stamp && typeof stamp.seconds === "number") return stamp.seconds * 1000;
  return Number.NaN;
}

/**
 * How one captured upcoming external listing reads under the allowance:
 * a blocked word makes it `sensitive`; a label outside the allowed supply
 * intake activities (including `openActivity`) or a missing label is
 * `unknown`.
 */
function externalListingReason(event: Record<string, unknown>,
  policy: OrganizerTrackingPublicationPolicy) {
  const text = `${String(event.title ?? "")} ${String(event.description ?? "")}`
    .toLowerCase();
  // Blocked words are plain lowercase letters and spaces (policy test).
  if (policy.externalListingAllowance.blockedWords.some((word) =>
    new RegExp(`\\b${word}\\b`, "u").test(text))) return "sensitive" as const;
  const activity = event.activity as Record<string, unknown> | undefined;
  if (!activity || activity.version !== 1 ||
      typeof activity.activityKind !== "string" ||
      !policy.externalListingAllowance.activityKinds.includes(
        activity.activityKind)) return "unknown" as const;
  return "allowed" as const;
}

export function classifyOrganizerProfile(
  events: OrganizerProfileEvents,
  policy: OrganizerTrackingPublicationPolicy =
  organizerTrackingPublicationPolicy,
  now: number = Date.now()
): OrganizerProfileClassification {
  if (events.truncated) return "unknown";
  const native = events.native.filter(publishedNative);
  const external = events.external.filter(publicExternal);
  const reasons = native.map((event) =>
    organizerTrackingEventPolicyReason(event, policy));
  if (reasons.includes("sensitiveEvent")) return "sensitive";
  if (reasons.includes("eventClassificationUnavailable")) return "unknown";
  // Separate branch on purpose: external listings have no reviewed
  // canonical classification. Either they all count as unknown, or the
  // narrow allowance for scraped organisers applies.
  if (policy.externalListingsCountAsUnknown && external.length > 0) {
    return "unknown";
  }
  const upcoming = external.filter((event) => millis(event.startTime) > now);
  const externalReasons = upcoming.map((event) =>
    externalListingReason(event, policy));
  if (externalReasons.includes("sensitive")) return "sensitive";
  if (externalReasons.includes("unknown")) return "unknown";
  // Something to classify by: a published native event, or for a scraped
  // organiser at least one captured upcoming listing.
  if (native.length === 0 && upcoming.length === 0) return "unknown";
  return "eligible";
}

/** Reads the organiser's events within the limit and classifies the profile. */
export async function readOrganizerProfileClassification(
  db: FirebaseFirestore.Firestore, organizerId: string,
  policy: OrganizerTrackingPublicationPolicy =
  organizerTrackingPublicationPolicy
): Promise<OrganizerProfileClassification> {
  const limit = organizerProfileClassificationReadLimit;
  const [native, external] = await Promise.all([
    db.collection("events").where("organizerId", "==", organizerId)
      .limit(limit + 1).get(),
    db.collection("externalEvents")
      .where("canonicalHostId", "==", organizerId).limit(limit + 1).get(),
  ]);
  return classifyOrganizerProfile({
    native: native.docs.map((doc) => doc.data()),
    external: external.docs.map((doc) => doc.data()),
    truncated: native.size > limit || external.size > limit,
  }, policy);
}
