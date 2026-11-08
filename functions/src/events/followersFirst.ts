import {HttpsError} from "firebase-functions/v2/https";
import {organizerRelationshipId} from "../shared/relationshipDocuments";

/**
 * Followers first: until `followersFirstUntilMs`, only the organiser's
 * followers can book. Publishing with the followersFirst booking choice sets
 * it to the event's start less 24 hours; any other choice removes it. A
 * missing field (every event before the choice) is open to everyone.
 */
export const FOLLOWERS_FIRST_LEAD_MILLIS = 24 * 60 * 60 * 1000;

/** When booking opens to everyone, or null when the event is not
 * followers first.
 */
export function followersFirstUntilMs(event: object): number | null {
  const until = (event as {followersFirstUntilMs?: unknown})
    .followersFirstUntilMs;
  return Number.isSafeInteger(until) && (until as number) >= 0 ?
    until as number : null;
}

/** The time booking opens to everyone for an event starting at
 * [startMillis].
 */
export function defaultFollowersFirstUntilMs(startMillis: number): number {
  return Math.max(0, startMillis - FOLLOWERS_FIRST_LEAD_MILLIS);
}

/** Whether the followers-only window is still open at [nowMillis]. */
export function followersFirstActive(event: object, nowMillis: number):
  boolean {
  const until = followersFirstUntilMs(event);
  return until !== null && nowMillis < until;
}

/** The refusal a non-follower gets; the guest screen reads the reason and
 * the time booking opens to everyone.
 */
export function followersFirstRefusal(event: object): HttpsError {
  return new HttpsError("failed-precondition",
    "This event opens to the organiser's followers first. Follow them to " +
    "book now, or book once it opens to everyone.",
    {reason: "followersFirst", opensAtMs: followersFirstUntilMs(event)});
}

/**
 * Refuses a non-follower while the followers-only window is open. Reads the
 * guest's follow in the caller's transaction, so call it before any write.
 * [bypass] covers admission the host already granted (an invitation, an
 * approved request, a Cross Paths hold or an imported guest seat).
 */
export async function assertFollowersFirstAllows(params: {
  db: FirebaseFirestore.Firestore;
  tx: FirebaseFirestore.Transaction;
  event: {organizerId: string};
  userId: string;
  nowMillis: number;
  bypass: boolean;
}): Promise<void> {
  const {db, tx, event, userId, nowMillis, bypass} = params;
  if (bypass || !followersFirstActive(event, nowMillis)) return;
  const follow = await tx.get(db.collection("organizerFollows")
    .doc(organizerRelationshipId(event.organizerId, userId)));
  if (follow.data()?.status === "active") return;
  throw followersFirstRefusal(event);
}

/** How a booking choice changes `followersFirstUntilMs`: followersFirst sets
 * the default open time when none is set; another choice removes it; no
 * choice (null) leaves the event as it is.
 */
export function followersFirstChoice(
  event: {startTime?: {toMillis?: () => number}},
  bookingMode: string | null
): {set: number} | {remove: true} | null {
  if (bookingMode === null) return null;
  const current = followersFirstUntilMs(event);
  if (bookingMode !== "followersFirst") {
    return current === null ? null : {remove: true};
  }
  if (current !== null) return null;
  const start = event.startTime?.toMillis?.();
  return typeof start === "number" && Number.isSafeInteger(start) ?
    {set: defaultFollowersFirstUntilMs(start)} : null;
}
