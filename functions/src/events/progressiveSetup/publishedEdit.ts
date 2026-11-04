import {HttpsError} from "firebase-functions/v2/https";
import type {EventDocument} from "../../shared/generated/firestoreAdminTypes";
import {localDateTimeAt} from "./basics";

/** Private drafts stay on their manager-only editor; published events can use
 * the rich editor with optimistic concurrency against every setup command.
 */
export function publishedEventEditPatch(event: EventDocument,
  expectedRevision: number | undefined, startTimeMillis: number
): Partial<EventDocument> {
  if (event.publicationState !== "published") {
    throw new HttpsError("failed-precondition",
      "Use private event setup for this event.");
  }
  if (!Number.isSafeInteger(event.setupRevision) || event.setupRevision < 1 ||
      event.setupRevision >= 2147483647) {
    throw new HttpsError("failed-precondition", "Invalid setup revision.");
  }
  if (expectedRevision !== event.setupRevision) {
    throw new HttpsError("aborted",
      "Event details changed. Reload before saving.");
  }
  const patch: Partial<EventDocument> = {
    setupRevision: event.setupRevision + 1};
  if (startTimeMillis === event.startTime.toMillis()) return patch;
  if (!event.eventTimezone) {
    throw new HttpsError("failed-precondition", "Event timezone is missing.");
  }
  // The private editor also rejects ambiguous civil times. Preserve that
  // invariant so reopening after unpublish cannot move the event silently.
  const {localDate, localStartTime} =
    localDateTimeAt(startTimeMillis, event.eventTimezone);
  return {...patch, eventLocalDate: localDate,
    eventLocalStartTime: localStartTime};
}
