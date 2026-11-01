import type {CallableRequest} from "firebase-functions/v2/https";
import {HttpsError} from "firebase-functions/v2/https";
import {cancelEventSignUpHandler, safetyCancelSignUpDeps} from
  "../events/cancelEventSignUp";
import {leaveEventWaitlistHandler, safetyLeaveWaitlistDeps} from
  "../events/joinEventWaitlist";
import type {AccountSafetyActionDocument} from
  "../shared/generated/firestoreAdminTypes";
import {millisOf} from "./safetyPolicy";

export type SafetyBookingOutcome = AccountSafetyActionDocument["bookings"];

export interface SafetyBookingDeps {
  cancelSignUp: (uid: string, eventId: string) => Promise<void>;
  leaveWaitlist: (uid: string, eventId: string) => Promise<void>;
}

/**
 * Builds the request a guest would send to cancel their own seat. Suspension
 * and ban reuse that path so seats, waitlists and refunds stay consistent.
 * @param {string} uid Guest.
 * @param {string} eventId Event.
 * @return {CallableRequest<unknown>} Request.
 */
function guestRequest(uid: string, eventId: string): CallableRequest<unknown> {
  return {
    auth: {uid, token: {} as never, rawToken: ""},
    data: {eventId},
    rawRequest: {headers: {}} as never,
    acceptsStreaming: false,
  } as CallableRequest<unknown>;
}

export const defaultSafetyBookingDeps: SafetyBookingDeps = {
  cancelSignUp: async (uid, eventId) => {
    await cancelEventSignUpHandler(guestRequest(uid, eventId),
      safetyCancelSignUpDeps);
  },
  leaveWaitlist: async (uid, eventId) => {
    await leaveEventWaitlistHandler(guestRequest(uid, eventId),
      safetyLeaveWaitlistDeps);
  },
};

/**
 * Cancels a suspended or banned account's future bookings. Bookings paid
 * through the organizer's own checkout (website registrations) cannot be
 * released by Catch; those are listed so the organizer can be asked to
 * cancel and refund them.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {string} uid Account.
 * @param {number} nowMillis Current time.
 * @param {SafetyBookingDeps} deps Cancellation paths.
 * @return {Promise<SafetyBookingOutcome>} What happened to each booking.
 */
export async function cancelFutureBookingsForSafety(
  db: FirebaseFirestore.Firestore,
  uid: string,
  nowMillis: number,
  deps: SafetyBookingDeps = defaultSafetyBookingDeps
): Promise<SafetyBookingOutcome> {
  const outcome: SafetyBookingOutcome = {
    cancelledEventIds: [],
    needsOrganizerEventIds: [],
    failedEventIds: [],
  };
  const [participations, attendees] = await Promise.all([
    db.collection("eventParticipations").where("uid", "==", uid).get(),
    db.collection("eventAttendees").where("linkedUid", "==", uid).get(),
  ]);
  const handled = new Set<string>();
  for (const doc of participations.docs) {
    const data = doc.data();
    const eventId = typeof data.eventId === "string" ? data.eventId : null;
    const status = data.status;
    if (!eventId || (status !== "signedUp" && status !== "waitlisted")) {
      continue;
    }
    if (!await isFutureEvent(db, eventId, nowMillis)) continue;
    handled.add(eventId);
    try {
      if (status === "signedUp") {
        await deps.cancelSignUp(uid, eventId);
      } else {
        await deps.leaveWaitlist(uid, eventId);
      }
      outcome.cancelledEventIds.push(eventId);
    } catch (error) {
      if (error instanceof HttpsError &&
          error.code === "failed-precondition" &&
          /payment details/u.test(error.message)) {
        outcome.needsOrganizerEventIds.push(eventId);
      } else {
        outcome.failedEventIds.push(eventId);
      }
    }
  }
  for (const doc of attendees.docs) {
    const data = doc.data();
    const eventId = typeof data.eventId === "string" ? data.eventId : null;
    if (!eventId || handled.has(eventId)) continue;
    if (data.status !== "registered") continue;
    if (!await isFutureEvent(db, eventId, nowMillis)) continue;
    handled.add(eventId);
    outcome.needsOrganizerEventIds.push(eventId);
  }
  return {
    cancelledEventIds: outcome.cancelledEventIds.slice(0, 200),
    needsOrganizerEventIds: outcome.needsOrganizerEventIds.slice(0, 200),
    failedEventIds: outcome.failedEventIds.slice(0, 200),
  };
}

async function isFutureEvent(
  db: FirebaseFirestore.Firestore,
  eventId: string,
  nowMillis: number
): Promise<boolean> {
  const event = await db.collection("events").doc(eventId).get();
  const start = millisOf(event.data()?.startTime);
  return event.exists && event.data()?.status !== "cancelled" &&
    start !== null && start > nowMillis;
}
