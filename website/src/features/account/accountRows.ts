/**
 * The account page's plans, follows and reviews, composed from the guest's
 * own Firestore rows (guestEventStatuses with their event card,
 * organizerFollows, reviews), which rules let only that guest read, plus the
 * organizers' public copies (publicOrganizers) for names and page links.
 * The listeners deliver raw documents; these functions read them field by
 * field, so a malformed row is left out instead of breaking the page.
 */

export interface AccountPlan {
  eventId: string;
  eventName: string;
  organizerId: string;
  organizerName: string;
  startsAt: string | null;
  endsAt: string | null;
  venue: string | null;
  status: "signedUp" | "waitlisted" | "attended" | "cancelled";
  timing: "upcoming" | "past";
  passAvailable: boolean;
}

export interface AccountFollow {
  organizerId: string;
  organizerName: string;
  path: string | null;
  followedAt: string | null;
}

export interface AccountReview {
  reviewId: string;
  organizerId: string;
  organizerName: string;
  eventId: string | null;
  rating: number;
  comment: string;
  verified: boolean;
  moderationStatus: "published" | "pending" | "rejected";
  createdAt: string | null;
  ownerResponse: string | null;
}

/** One document a listener delivered: its id and raw data. */
export interface AccountRow {
  id: string;
  data: Record<string, unknown>;
}

/** The public organizer copies by id; an organizer without one reads as unnamed. */
export type PublicOrganizerNames = ReadonlyMap<string, Record<string, unknown>>;

const limits = {plans: 50, follows: 100, reviews: 50} as const;
const planStatuses = new Set(["signedUp", "waitlisted", "attended", "cancelled"]);

/** Every organizer the rows name, for one publicOrganizers read each. */
export function organizerIdsOf(plans: readonly AccountRow[], follows: readonly AccountRow[],
  reviews: readonly AccountRow[]): string[] {
  const ids = [
    ...plans.map(({data}) => (record(data.eventCard)?.organizerId ?? data.organizerId)),
    ...follows.map(({data}) => data.organizerId),
    ...reviews.map(({data}) => data.organizerId),
  ];
  return [...new Set(ids.filter((id): id is string => typeof id === "string" && id.length > 0))].sort();
}

/** The guest's plans, newest first: each booked event their own status row carries a card for. */
export function accountPlans(rows: readonly AccountRow[], organizers: PublicOrganizerNames, uid: string,
  now: number): AccountPlan[] {
  return rows.flatMap(({data}): AccountPlan[] => {
    const card = record(data.eventCard);
    const status = data.participationStatus;
    if (data.uid !== uid || !card || typeof status !== "string" || !planStatuses.has(status)) return [];
    const eventId = typeof data.eventId === "string" ? data.eventId : null;
    const organizerId = typeof card.organizerId === "string" ? card.organizerId : null;
    if (!eventId || !organizerId) return [];
    const startsAt = integer(card.startTimeMillis);
    const endsAt = integer(card.endTimeMillis) ?? startsAt;
    const past = endsAt !== null && endsAt < now;
    return [{
      eventId,
      eventName: text(card.name, 240),
      organizerId,
      organizerName: organizerName(organizers, organizerId),
      startsAt: iso(startsAt),
      endsAt: iso(integer(card.endTimeMillis)),
      venue: text(card.meetingPoint, 240) || null,
      status: status as AccountPlan["status"],
      timing: past ? "past" : "upcoming",
      passAvailable: status === "signedUp" && !past && card.status !== "cancelled",
    }];
  }).sort((a, b) => (b.startsAt ?? "").localeCompare(a.startsAt ?? "")).slice(0, limits.plans);
}

/** The organizers the guest follows, most recent first, each linked to its published page. */
export function accountFollows(rows: readonly AccountRow[], organizers: PublicOrganizerNames,
  uid: string): AccountFollow[] {
  return rows.flatMap(({data}): AccountFollow[] => {
    if (data.uid !== uid || data.status !== "active" || typeof data.organizerId !== "string") return [];
    const organizerId = data.organizerId;
    const path = organizers.get(organizerId)?.publicPagePath;
    return [{organizerId, organizerName: organizerName(organizers, organizerId),
      path: typeof path === "string" ? path.slice(0, 240) : null, followedAt: iso(millis(data.followedAt))}];
  }).sort((a, b) => (b.followedAt ?? "").localeCompare(a.followedAt ?? "")).slice(0, limits.follows);
}

/** The guest's reviews, newest first, with their moderation state and the organizer's reply. */
export function accountReviews(rows: readonly AccountRow[], organizers: PublicOrganizerNames,
  uid: string): AccountReview[] {
  return rows.flatMap(({id, data}): AccountReview[] => {
    const rating = data.rating;
    if (data.reviewerUserId !== uid || typeof data.organizerId !== "string" || typeof rating !== "number" ||
        !Number.isInteger(rating) || rating < 1 || rating > 5) return [];
    const moderation = data.moderationStatus;
    const response = record(data.ownerResponse);
    return [{
      reviewId: id,
      organizerId: data.organizerId,
      organizerName: organizerName(organizers, data.organizerId),
      eventId: typeof data.eventId === "string" ? data.eventId : null,
      rating,
      comment: text(data.comment, 4000),
      verified: data.verificationStatus === "verified",
      moderationStatus: moderation === "pending" || moderation === "rejected" ? moderation : "published",
      createdAt: iso(millis(data.createdAt)),
      ownerResponse: response && typeof response.message === "string" ? response.message.slice(0, 4000) : null,
    }];
  }).sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? "")).slice(0, limits.reviews);
}

function organizerName(organizers: PublicOrganizerNames, organizerId: string): string {
  return text(organizers.get(organizerId)?.name, 240);
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function integer(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** A Firestore timestamp's milliseconds, or null. */
function millis(value: unknown): number | null {
  const stamp = record(value) as {toMillis?: () => number} | null;
  if (stamp && typeof stamp.toMillis === "function") return stamp.toMillis();
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function iso(value: number | null): string | null {
  return value === null ? null : new Date(value).toISOString();
}
