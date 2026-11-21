import type {
  EventDocument,
  EventParticipationDocument,
  HostEventRequestViewDocument,
} from "../shared/generated/firestoreAdminTypes";
import {isEventPolicyTerms} from "./configuredEvent";
import {eventPolicyFromEvent} from "./eventPolicy";

// Ordering and waitlist rules the hostEventRequestViews read model applies.

type Row = HostEventRequestViewDocument["rows"][number];
type Participation = EventParticipationDocument;

/**
 * Whether a waitlisted person is the host's to offer a spot. An event that
 * approves by hand lists its approved guests here while they pay, and those
 * have already been let in.
 * @param {Participation} participation The waitlisted row.
 * @param {EventDocument} event Their event.
 * @return {boolean} Whether the row belongs on the waitlist view.
 */
export function isOfferableWaitlistRow(participation: Participation,
  event: EventDocument): boolean {
  return participation.status === "waitlisted" &&
    participation.hostApprovalStatus !== "pending" &&
    isEventPolicyTerms(event) &&
    eventPolicyFromEvent(event).admission.manualApprovalRequired !== true;
}

/**
 * Soonest event first, then oldest ask first.
 * @param {Row} left A row.
 * @param {Row} right Another row.
 * @return {number} Sort order.
 */
export function compareRequestRows(left: Row, right: Row): number {
  return left.eventStartMillis - right.eventStartMillis ||
    (left.askedAtMillis ?? 0) - (right.askedAtMillis ?? 0) ||
    left.uid.localeCompare(right.uid);
}
