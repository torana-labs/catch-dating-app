import {HttpsError} from "firebase-functions/v2/https";

/**
 * The event's source revision for offer review and admission: its
 * `setupRevision`, which every event carries and every setup change raises.
 * A missing or malformed revision is an invalid event, never a fallback.
 */
export function eventSourceRevision(event: {setupRevision?: unknown}): number {
  const revision = event.setupRevision;
  if (!Number.isSafeInteger(revision) || (revision as number) < 1) {
    throw new HttpsError("failed-precondition",
      "Event has no setup revision.");
  }
  return revision as number;
}
