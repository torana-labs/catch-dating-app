import {organizerTrackingEventPolicyReason, organizerTrackingPublicationPolicy,
  type OrganizerTrackingPublicationPolicy} from
  "./organizerTrackingPublicationPolicy";

/**
 * How an organiser profile is classified for Catch's own tags (owner
 * decision, 19 Nov 2026, #2063). Classification lives on events, so the
 * profile takes it from the organiser's published, active events:
 *
 * - `unknown` when it has no published, active native event, when any such
 *   event has no canonical classification, when the read was truncated, or
 *   (while the policy says so) when it has any public external listing;
 * - `sensitive` when any such event is in an excluded class of the current
 *   publication policy version;
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

export function classifyOrganizerProfile(
  events: OrganizerProfileEvents,
  policy: OrganizerTrackingPublicationPolicy =
  organizerTrackingPublicationPolicy
): OrganizerProfileClassification {
  if (events.truncated) return "unknown";
  const native = events.native.filter(publishedNative);
  const external = events.external.filter(publicExternal);
  const reasons = native.map((event) =>
    organizerTrackingEventPolicyReason(event, policy));
  if (reasons.includes("sensitiveEvent")) return "sensitive";
  if (native.length === 0) return "unknown";
  if (reasons.includes("eventClassificationUnavailable")) return "unknown";
  // Separate branch on purpose: external listings have no reviewed
  // canonical classification. The owner may narrow this for scraped
  // organisers; change it only through a new policy version.
  if (policy.externalListingsCountAsUnknown && external.length > 0) {
    return "unknown";
  }
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
