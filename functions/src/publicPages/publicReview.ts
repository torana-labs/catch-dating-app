import type {HostListing} from "./publicOrganizer";
import {
  object,
  publicDocumentId,
  publicHttpsUrl,
  synthetic,
} from "./publicReadPolicy";

/**
 * One published review. This mirrors projectPublicReview in
 * website/src/server/publicReviewProjection.ts; the shared parity fixtures
 * in contracts/fixtures/public_pages hold both to the same output. Call it
 * only after the organizer's public review capability is checked.
 */
export type PublicReview = HostListing["reviews"][number];

const text = (value: unknown, max: number): string | null =>
  typeof value === "string" && value.trim().length > 0 &&
    value.length <= max ? value.trim() : null;

function date(value: unknown): string | null {
  try {
    const stamp = object(value);
    if (typeof stamp?.toMillis !== "function") return null;
    const millis: unknown = (stamp.toMillis as () => unknown)();
    return typeof millis === "number" && Number.isFinite(millis) ?
      new Date(millis).toISOString() : null;
  } catch {
    return null;
  }
}

export function projectPublicReview(
  id: string, raw: unknown, organizerId: string
): PublicReview | null {
  const data = object(raw);
  if (!data || synthetic(data) || data.organizerId !== organizerId ||
      (data.moderationStatus != null &&
        data.moderationStatus !== "published") ||
      !text(id, 400) || id.includes("/")) return null;
  const createdAt = date(data.createdAt);
  const comment = typeof data.comment === "string" &&
    data.comment.length <= 1000 ? data.comment : null;
  const reviewerName = data.isAnonymous === true ?
    "Anonymous guest" : text(data.reviewerName, 120);
  if (!createdAt || !reviewerName || comment === null ||
      typeof data.rating !== "number" || !Number.isFinite(data.rating) ||
      data.rating < 1 || data.rating > 5) return null;
  const eventId = publicDocumentId(data.eventId) ? data.eventId : null;
  const verified = Boolean(eventId && data.source !== "publicListing" &&
    (data.verificationStatus === "verified" ||
      data.verificationStatus == null));
  const response = object(data.ownerResponse);
  const hostName = text(response?.hostName, 120);
  const message = text(response?.message, 1000);
  const updatedAt = date(response?.updatedAt);
  return {id, eventId, reviewerName, rating: data.rating, comment, createdAt,
    verificationStatus: verified ? "verified" : "unverified",
    source: eventId && data.source !== "publicListing" ?
      "catchEvent" : "publicListing",
    isAnonymous: data.isAnonymous === true,
    ownerResponse: hostName && message && updatedAt ? {hostName, message,
      updatedAt, hostAvatarUrl: publicHttpsUrl(response?.hostAvatarUrl)} :
      null};
}
