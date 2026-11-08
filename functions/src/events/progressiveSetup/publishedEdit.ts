import {HttpsError} from "firebase-functions/v2/https";
import type {EventDocument} from "../../shared/generated/firestoreAdminTypes";
import {localDateTimeAt} from "./basics";
import {isEventPolicyTerms, requireConfiguredEvent} from "../configuredEvent";
import {eventPolicyFromEvent} from "../eventPolicy";
import {eventDiscoveryProjection} from "../eventDiscoveryProjection";
import {followersFirstChoice, followersFirstUntilMs} from "../followersFirst";
import type {BookingMode} from "../eventSetupPreferences/types";
import {admissionChoicesPatch} from "./admissionChoices";

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

/** Who can book, as a published event's admission carries it: askFirst when
 * hosts approve each guest, followersFirst while followersFirstUntilMs is
 * set, otherwise anyone.
 */
export function publishedBookingMode(event: EventDocument): BookingMode {
  if (isEventPolicyTerms(event) &&
      eventPolicyFromEvent(event).admission.manualApprovalRequired) {
    return "askFirst";
  }
  return followersFirstUntilMs(event) !== null ? "followersFirst" : "anyone";
}

/**
 * Changes who can book on a published event, under the same rules as the
 * other published edits: the caller has fenced the setup revision, and the
 * admission change goes through the seat ledger, which refuses while places
 * are reserved. Returns the event patch (admission, its discovery
 * projection and followersFirstUntilMs, with a removal named in `remove`),
 * or null when the event already books that way.
 */
export function publishedBookingModePatch(event: EventDocument,
  mode: BookingMode
): {patch: Partial<EventDocument>; admissionChanged: boolean;
  remove: string[]} | null {
  if (event.publicationState !== "published") {
    throw new HttpsError("failed-precondition",
      "Save who can book in the event's preferences until it is published.");
  }
  if (event.status !== "active") {
    throw new HttpsError("failed-precondition",
      "Cancelled events cannot change who can book.");
  }
  if (!isEventPolicyTerms(event)) {
    throw new HttpsError("failed-precondition",
      "This event's tickets are sold elsewhere.");
  }
  if (publishedBookingMode(event) === mode) return null;
  const admission = admissionChoicesPatch(event,
    {bookingMode: mode, waitlistEnabled: null});
  const followers = followersFirstChoice(event, mode);
  const patch: Partial<EventDocument> = {...(admission ?? {})};
  if (admission) {
    Object.assign(patch, eventDiscoveryProjection({
      event: requireConfiguredEvent({...event, ...admission,
        description: event.description ?? ""}),
      organizerLocationMarketId: event.eventMarketId}));
  }
  if (followers && "set" in followers) {
    (patch as Record<string, unknown>).followersFirstUntilMs = followers.set;
  }
  return {patch, admissionChanged: admission !== null,
    remove: followers && "remove" in followers ?
      ["followersFirstUntilMs"] : []};
}
